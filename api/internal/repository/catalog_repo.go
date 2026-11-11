package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CatalogRepo struct {
	pool *pgxpool.Pool
}

func NewCatalogRepo(pool *pgxpool.Pool) *CatalogRepo {
	return &CatalogRepo{pool: pool}
}

func (r *CatalogRepo) ListProducts(ctx context.Context, f domain.ProductListFilter) ([]domain.Product, int64, error) {
	where := []string{"p.deleted_at IS NULL"}
	args := []any{}
	idx := 1

	if f.Search != "" {
		where = append(where, fmt.Sprintf("(p.name ILIKE $%d OR p.sku ILIKE $%d OR p.slug ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+f.Search+"%")
		idx++
	}
	if f.ProductType != "" {
		where = append(where, fmt.Sprintf("p.product_type = $%d", idx))
		args = append(args, f.ProductType)
		idx++
	}
	if f.Status != "" {
		where = append(where, fmt.Sprintf("p.status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.SellerID != nil {
		where = append(where, fmt.Sprintf("p.seller_id = $%d", idx))
		args = append(args, *f.SellerID)
		idx++
	}
	if f.Trending != nil {
		where = append(where, fmt.Sprintf("p.is_trending = $%d", idx))
		args = append(args, *f.Trending)
		idx++
	}
	if f.Featured != nil {
		where = append(where, fmt.Sprintf("p.is_featured = $%d", idx))
		args = append(args, *f.Featured)
		idx++
	}
	if f.CategoryID != nil {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND (pc.category_id = $%d OR pc.category_id IN (SELECT id FROM categories WHERE parent_id = $%d AND deleted_at IS NULL)))", idx, idx))
		args = append(args, *f.CategoryID)
		idx++
	}
	if f.CityID != nil {
		where = append(where, fmt.Sprintf("(p.available_all_cities = TRUE OR EXISTS (SELECT 1 FROM city_product_overrides cpo WHERE cpo.product_id = p.id AND cpo.city_id = $%d AND cpo.is_available = TRUE))", idx))
		args = append(args, *f.CityID)
		idx++
	}

	whereSQL := strings.Join(where, " AND ")

	var total int64
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*)::BIGINT FROM products p WHERE "+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, mapErr(err)
	}

	orderBy := "p.created_at DESC, p.id DESC"
	switch f.SortBy {
	case "popular":
		orderBy = "p.id ASC"
	case "newest":
		orderBy = "p.created_at DESC, p.id DESC"
	case "price_asc", "price-asc":
		orderBy = "p.selling_price_paise ASC, p.id DESC"
	case "price_desc", "price-desc":
		orderBy = "p.selling_price_paise DESC, p.id DESC"
	case "rating":
		orderBy = "p.rating_avg DESC, p.ratings_count DESC, p.id DESC"
	case "discount":
		orderBy = "p.discount_percent DESC, p.id DESC"
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 20
	} else if limit > 1000 {
		limit = 1000
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	query := fmt.Sprintf(`
		SELECT
			p.id, p.seller_id, p.product_type, p.name, p.slug, p.sku, p.description,
			p.mrp_paise, p.selling_price_paise, p.discount_percent, p.stock_qty, p.track_stock,
			p.is_eggless, p.has_veg_nonveg, p.veg_delta_paise, p.nonveg_delta_paise,
			p.delivery_type_id, COALESCE(dt.slug, 'slot'), p.lead_time_days,
			CASE WHEN p.cutoff_time IS NOT NULL THEN TO_CHAR(p.cutoff_time, 'HH24:MI') ELSE NULL END,
			p.gst_rate_percent::FLOAT8, p.available_all_cities, p.is_featured, p.is_trending,
			p.status, p.seo_title, p.seo_description, p.rating_avg::FLOAT8, p.ratings_count,
			COALESCE((SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC LIMIT 1), ''),
			p.created_at, p.updated_at
		FROM products p
		LEFT JOIN delivery_types dt ON dt.id = p.delivery_type_id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereSQL, orderBy, idx, idx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()

	out := make([]domain.Product, 0)
	for rows.Next() {
		var p domain.Product
		if scanErr := rows.Scan(
			&p.ID, &p.SellerID, &p.ProductType, &p.Name, &p.Slug, &p.SKU, &p.Description,
			&p.MRPPaise, &p.SellingPricePaise, &p.DiscountPercent, &p.StockQty, &p.TrackStock,
			&p.IsEggless, &p.HasVegNonVeg, &p.VegDeltaPaise, &p.NonVegDeltaPaise,
			&p.DeliveryTypeID, &p.DeliveryTypeSlug, &p.LeadTimeDays, &p.CutoffTime,
			&p.GSTRatePercent, &p.AvailableAllCities, &p.IsFeatured, &p.IsTrending,
			&p.Status, &p.SEOTitle, &p.SEODescription, &p.RatingAvg, &p.RatingsCount,
			&p.PrimaryImageURL, &p.CreatedAt, &p.UpdatedAt,
		); scanErr != nil {
			return nil, 0, mapErr(scanErr)
		}
		out = append(out, p)
	}
	return out, total, nil
}

func (r *CatalogRepo) GetProductByIDOrSlug(ctx context.Context, id *int64, slug string) (*domain.Product, error) {
	cond := "p.slug = $1"
	arg := any(slug)
	if id != nil {
		cond = "p.id = $1"
		arg = *id
	}

	var p domain.Product
	err := r.pool.QueryRow(ctx, `
		SELECT
			p.id, p.seller_id, p.product_type, p.name, p.slug, p.sku, p.description,
			p.mrp_paise, p.selling_price_paise, p.discount_percent, p.stock_qty, p.track_stock,
			p.is_eggless, p.has_veg_nonveg, p.veg_delta_paise, p.nonveg_delta_paise,
			p.delivery_type_id, COALESCE(dt.slug, 'slot'), p.cancellation_policy_preset_id, p.lead_time_days,
			CASE WHEN p.cutoff_time IS NOT NULL THEN TO_CHAR(p.cutoff_time, 'HH24:MI') ELSE NULL END,
			p.gst_rate_percent::FLOAT8, p.available_all_cities, p.is_featured, p.is_trending,
			p.status, p.seo_title, p.seo_description, p.rating_avg::FLOAT8, p.ratings_count,
			p.created_at, p.updated_at
		FROM products p
		LEFT JOIN delivery_types dt ON dt.id = p.delivery_type_id
		WHERE `+cond+` AND p.deleted_at IS NULL
		LIMIT 1
	`, arg).Scan(
		&p.ID, &p.SellerID, &p.ProductType, &p.Name, &p.Slug, &p.SKU, &p.Description,
		&p.MRPPaise, &p.SellingPricePaise, &p.DiscountPercent, &p.StockQty, &p.TrackStock,
		&p.IsEggless, &p.HasVegNonVeg, &p.VegDeltaPaise, &p.NonVegDeltaPaise,
		&p.DeliveryTypeID, &p.DeliveryTypeSlug, &p.CancellationPolicyPresetID, &p.LeadTimeDays, &p.CutoffTime,
		&p.GSTRatePercent, &p.AvailableAllCities, &p.IsFeatured, &p.IsTrending,
		&p.Status, &p.SEOTitle, &p.SEODescription, &p.RatingAvg, &p.RatingsCount,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, mapErr(err)
	}

	p.Images = r.loadProductImages(ctx, p.ID)
	if len(p.Images) > 0 {
		p.PrimaryImageURL = p.Images[0].URL
	}
	p.Variants = r.loadProductVariants(ctx, p.ID)
	p.CategoryIDs = r.loadIDList(ctx, `SELECT category_id FROM product_categories WHERE product_id = $1`, p.ID)
	p.PresetIDs = r.loadIDList(ctx, `SELECT preset_id FROM product_presets WHERE product_id = $1`, p.ID)
	p.AddonIDs = r.loadIDList(ctx, `SELECT addon_id FROM product_addon_links WHERE product_id = $1`, p.ID)
	p.Addons = r.loadLinkedAddons(ctx, p.ID)
	p.Reviews = r.loadProductReviews(ctx, p.ID)
	p.OptionGroups = r.loadOptionGroups(ctx, p.ID)
	p.Personalization = r.loadPersonalizationFields(ctx, p.ID)
	p.DecorationInclusions = r.loadDecorInclusions(ctx, p.ID)
	p.CityOverrides = r.loadCityOverrides(ctx, p.ID)
	return &p, nil
}

func (r *CatalogRepo) CreateProduct(ctx context.Context, p *domain.Product) (*domain.Product, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var newID int64
	ratingAvg := p.RatingAvg
	if ratingAvg <= 0 {
		ratingAvg = 4.8
	}
	ratingsCnt := p.RatingsCount
	if ratingsCnt < 0 {
		ratingsCnt = 0
	}
	err = tx.QueryRow(ctx, `
		INSERT INTO products (
			seller_id, product_type, name, slug, sku, description, mrp_paise, selling_price_paise,
			stock_qty, track_stock, is_eggless, has_veg_nonveg, veg_delta_paise, nonveg_delta_paise,
			delivery_type_id, cancellation_policy_preset_id, lead_time_days, cutoff_time, gst_rate_percent, available_all_cities,
			is_featured, is_trending, status, seo_title, seo_description, rating_avg, ratings_count
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18::TIME, $19, $20,
			$21, $22, $23, $24, $25, $26, $27
		)
		RETURNING id
	`,
		p.SellerID, p.ProductType, p.Name, p.Slug, p.SKU, p.Description, p.MRPPaise, p.SellingPricePaise,
		p.StockQty, p.TrackStock, p.IsEggless, p.HasVegNonVeg, p.VegDeltaPaise, p.NonVegDeltaPaise,
		p.DeliveryTypeID, p.CancellationPolicyPresetID, p.LeadTimeDays, p.CutoffTime, p.GSTRatePercent, p.AvailableAllCities,
		p.IsFeatured, p.IsTrending, p.Status, p.SEOTitle, p.SEODescription, ratingAvg, ratingsCnt,
	).Scan(&newID)
	if err != nil {
		return nil, mapErr(err)
	}

	if err := r.replaceProductChildren(ctx, tx, newID, p); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetProductByIDOrSlug(ctx, &newID, "")
}

func (r *CatalogRepo) UpdateProduct(ctx context.Context, p *domain.Product) (*domain.Product, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE products SET
			seller_id = $2, product_type = $3, name = $4, slug = $5, sku = $6, description = $7,
			mrp_paise = $8, selling_price_paise = $9, stock_qty = $10, track_stock = $11,
			is_eggless = $12, has_veg_nonveg = $13, veg_delta_paise = $14, nonveg_delta_paise = $15,
			delivery_type_id = $16, cancellation_policy_preset_id = $17, lead_time_days = $18, cutoff_time = $19::TIME,
			gst_rate_percent = $20, available_all_cities = $21, is_featured = $22,
			is_trending = $23, status = $24, seo_title = $25, seo_description = $26,
			rating_avg = CASE WHEN $27::NUMERIC > 0 THEN $27::NUMERIC ELSE rating_avg END,
			ratings_count = CASE WHEN $28::INTEGER > 0 THEN $28::INTEGER ELSE ratings_count END
		WHERE id = $1 AND deleted_at IS NULL
	`,
		p.ID, p.SellerID, p.ProductType, p.Name, p.Slug, p.SKU, p.Description,
		p.MRPPaise, p.SellingPricePaise, p.StockQty, p.TrackStock,
		p.IsEggless, p.HasVegNonVeg, p.VegDeltaPaise, p.NonVegDeltaPaise,
		p.DeliveryTypeID, p.CancellationPolicyPresetID, p.LeadTimeDays, p.CutoffTime,
		p.GSTRatePercent, p.AvailableAllCities, p.IsFeatured,
		p.IsTrending, p.Status, p.SEOTitle, p.SEODescription, p.RatingAvg, p.RatingsCount,
	)
	if err != nil {
		return nil, mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrNotFound
	}
	if err := r.replaceProductChildren(ctx, tx, p.ID, p); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetProductByIDOrSlug(ctx, &p.ID, "")
}

func (r *CatalogRepo) replaceProductChildren(ctx context.Context, tx pgx.Tx, productID int64, p *domain.Product) error {
	for _, tbl := range []string{
		"product_images", "product_variants", "product_categories",
		"product_presets", "product_addon_links", "product_option_groups",
		"product_personalization_fields", "decoration_inclusions", "city_product_overrides",
	} {
		if _, err := tx.Exec(ctx, "DELETE FROM "+tbl+" WHERE product_id = $1", productID); err != nil {
			return mapErr(err)
		}
	}

	for i, img := range p.Images {
		if _, err := tx.Exec(ctx, `
			INSERT INTO product_images (product_id, media_id, url, alt_text, sort_order, is_primary)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, productID, img.MediaID, img.URL, img.AltText, i, img.IsPrimary || i == 0); err != nil {
			return mapErr(err)
		}
	}
	for i, v := range p.Variants {
		if _, err := tx.Exec(ctx, `
			INSERT INTO product_variants (product_id, label, sku_suffix, mrp_paise, price_paise, stock_qty, sort_order, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, productID, v.Label, v.SKUSuffix, v.MRPPaise, v.PricePaise, v.StockQty, i, v.IsActive); err != nil {
			return mapErr(err)
		}
	}
	for _, cid := range p.CategoryIDs {
		if _, err := tx.Exec(ctx, `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, productID, cid); err != nil {
			return mapErr(err)
		}
	}
	for _, pid := range p.PresetIDs {
		if _, err := tx.Exec(ctx, `INSERT INTO product_presets (product_id, preset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, productID, pid); err != nil {
			return mapErr(err)
		}
	}
	for _, aid := range p.AddonIDs {
		if _, err := tx.Exec(ctx, `INSERT INTO product_addon_links (product_id, addon_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, productID, aid); err != nil {
			return mapErr(err)
		}
	}
	for i, og := range p.OptionGroups {
		opts := og.OptionsJSON
		if len(opts) == 0 {
			opts = json.RawMessage("[]")
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO product_option_groups (product_id, name, selection_type, options_json, is_required, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, productID, og.Name, og.SelectionType, opts, og.IsRequired, i); err != nil {
			return mapErr(err)
		}
	}
	for i, pf := range p.Personalization {
		opts := pf.OptionsJSON
		if len(opts) == 0 {
			opts = json.RawMessage("[]")
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO product_personalization_fields (product_id, field_key, label, field_type, placeholder, options_json, extra_price_paise, is_required, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`, productID, pf.FieldKey, pf.Label, pf.FieldType, pf.Placeholder, opts, pf.ExtraPricePaise, pf.IsRequired, i); err != nil {
			return mapErr(err)
		}
	}
	for i, di := range p.DecorationInclusions {
		if _, err := tx.Exec(ctx, `
			INSERT INTO decoration_inclusions (product_id, kind, item_text, sort_order)
			VALUES ($1, $2, $3, $4)
		`, productID, di.Kind, di.ItemText, i); err != nil {
			return mapErr(err)
		}
	}
	for _, co := range p.CityOverrides {
		if _, err := tx.Exec(ctx, `
			INSERT INTO city_product_overrides (product_id, city_id, is_available, price_override_paise, delivery_charge_paise, cutoff_override)
			VALUES ($1, $2, $3, $4, $5, $6::TIME)
		`, productID, co.CityID, co.IsAvailable, co.PriceOverridePaise, co.DeliveryChargePaise, co.CutoffOverride); err != nil {
			return mapErr(err)
		}
	}
	return nil
}

func (r *CatalogRepo) SoftDeleteProduct(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `UPDATE products SET deleted_at = NOW(), status = 'archived' WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *CatalogRepo) DuplicateProduct(ctx context.Context, id int64) (*domain.Product, error) {
	orig, err := r.GetProductByIDOrSlug(ctx, &id, "")
	if err != nil {
		return nil, err
	}
	suffix := fmt.Sprintf("%d", time.Now().UnixNano()%1000000)
	orig.ID = 0
	orig.Name = orig.Name + " (Copy)"
	orig.Slug = orig.Slug + "-copy-" + suffix
	orig.SKU = orig.SKU + "-COPY-" + suffix
	orig.Status = "draft"
	return r.CreateProduct(ctx, orig)
}

func (r *CatalogRepo) BulkUpdateProducts(ctx context.Context, items []domain.BulkProductUpdateItem) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, it := range items {
		_, err := tx.Exec(ctx, `
			UPDATE products SET
				mrp_paise = COALESCE($2, mrp_paise),
				selling_price_paise = COALESCE($3, selling_price_paise),
				stock_qty = COALESCE($4, stock_qty),
				status = COALESCE(NULLIF($5, ''), status)
			WHERE id = $1 AND deleted_at IS NULL
		`, it.ProductID, it.MRPPaise, it.SellingPricePaise, it.StockQty, it.Status)
		if err != nil {
			return mapErr(err)
		}
	}
	return tx.Commit(ctx)
}

// ---------- Addons ----------

func (r *CatalogRepo) ListAddons(ctx context.Context, search string, page, limit int) ([]domain.ProductAddon, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*)::BIGINT FROM product_addons WHERE ($1 = '' OR name ILIKE '%' || $1 || '%')`, search).Scan(&total)
	rows, err := r.pool.Query(ctx, `
		SELECT id, addon_category_id, name, slug, image_url, price_paise, is_active, created_at
		FROM product_addons
		WHERE ($1 = '' OR name ILIKE '%' || $1 || '%')
		ORDER BY id DESC LIMIT $2 OFFSET $3
	`, search, limit, offset)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.ProductAddon{}
	for rows.Next() {
		var a domain.ProductAddon
		if err := rows.Scan(&a.ID, &a.AddonCategoryID, &a.Name, &a.Slug, &a.ImageURL, &a.PricePaise, &a.IsActive, &a.CreatedAt); err == nil {
			out = append(out, a)
		}
	}
	return out, total, nil
}

func (r *CatalogRepo) CreateAddon(ctx context.Context, a *domain.ProductAddon) (*domain.ProductAddon, error) {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO product_addons (addon_category_id, name, slug, image_url, price_paise, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`, a.AddonCategoryID, a.Name, a.Slug, a.ImageURL, a.PricePaise, a.IsActive).Scan(&a.ID, &a.CreatedAt)
	return a, mapErr(err)
}

func (r *CatalogRepo) UpdateAddon(ctx context.Context, a *domain.ProductAddon) (*domain.ProductAddon, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE product_addons SET addon_category_id = $2, name = $3, slug = $4, image_url = $5, price_paise = $6, is_active = $7
		WHERE id = $1
	`, a.ID, a.AddonCategoryID, a.Name, a.Slug, a.ImageURL, a.PricePaise, a.IsActive)
	if err != nil {
		return nil, mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrNotFound
	}
	return a, nil
}

func (r *CatalogRepo) DeleteAddon(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM product_addons WHERE id = $1`, id)
	return mapErr(err)
}

// ---------- Categories & Navigation ----------

func (r *CatalogRepo) ListCategories(ctx context.Context, kind, search string) ([]domain.Category, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			c.id, c.parent_id, c.name, c.slug, c.kind, c.image_url,
			c.seo_title, c.seo_description, c.robots_index, c.seo_content_html,
			c.sort_order, c.is_active, c.created_at, c.updated_at,
			(SELECT COUNT(*)::BIGINT FROM product_categories pc WHERE pc.category_id = c.id)
		FROM categories c
		WHERE c.deleted_at IS NULL
		  AND ($1 = '' OR c.kind = $1)
		  AND ($2 = '' OR c.name ILIKE '%' || $2 || '%' OR c.slug ILIKE '%' || $2 || '%')
		ORDER BY c.sort_order ASC, c.name ASC
	`, kind, search)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Category{}
	for rows.Next() {
		var c domain.Category
		if err := rows.Scan(
			&c.ID, &c.ParentID, &c.Name, &c.Slug, &c.Kind, &c.ImageURL,
			&c.SEOTitle, &c.SEODescription, &c.RobotsIndex, &c.SEOContentHTML,
			&c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt, &c.ProductCount,
		); err == nil {
			out = append(out, c)
		}
	}
	return out, nil
}

func (r *CatalogRepo) GetCategoryByIDOrSlug(ctx context.Context, id *int64, slug string) (*domain.Category, error) {
	cond := "slug = $1"
	arg := any(slug)
	if id != nil {
		cond = "id = $1"
		arg = *id
	}
	var c domain.Category
	err := r.pool.QueryRow(ctx, `
		SELECT id, parent_id, name, slug, kind, image_url, seo_title, seo_description, robots_index, seo_content_html, sort_order, is_active, created_at, updated_at
		FROM categories WHERE `+cond+` AND deleted_at IS NULL LIMIT 1
	`, arg).Scan(
		&c.ID, &c.ParentID, &c.Name, &c.Slug, &c.Kind, &c.ImageURL,
		&c.SEOTitle, &c.SEODescription, &c.RobotsIndex, &c.SEOContentHTML,
		&c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, mapErr(err)
	}
	return &c, nil
}

func (r *CatalogRepo) CreateCategory(ctx context.Context, c *domain.Category) (*domain.Category, error) {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO categories (parent_id, name, slug, kind, image_url, seo_title, seo_description, robots_index, seo_content_html, sort_order, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at
	`, c.ParentID, c.Name, c.Slug, c.Kind, c.ImageURL, c.SEOTitle, c.SEODescription, c.RobotsIndex, c.SEOContentHTML, c.SortOrder, c.IsActive).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	return c, mapErr(err)
}

func (r *CatalogRepo) UpdateCategory(ctx context.Context, c *domain.Category) (*domain.Category, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE categories SET parent_id = $2, name = $3, slug = $4, kind = $5, image_url = $6,
		seo_title = $7, seo_description = $8, robots_index = $9, seo_content_html = $10, sort_order = $11, is_active = $12
		WHERE id = $1 AND deleted_at IS NULL
	`, c.ID, c.ParentID, c.Name, c.Slug, c.Kind, c.ImageURL, c.SEOTitle, c.SEODescription, c.RobotsIndex, c.SEOContentHTML, c.SortOrder, c.IsActive)
	if err != nil {
		return nil, mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrNotFound
	}
	return r.GetCategoryByIDOrSlug(ctx, &c.ID, "")
}

func (r *CatalogRepo) SoftDeleteCategory(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `UPDATE categories SET deleted_at = NOW(), is_active = FALSE WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *CatalogRepo) ListNavigation(ctx context.Context) ([]domain.NavigationItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, parent_id, column_title, label, href, badge, category_id, sort_order, is_active
		FROM navigation_items
		ORDER BY sort_order ASC, id ASC
	`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.NavigationItem{}
	for rows.Next() {
		var n domain.NavigationItem
		if err := rows.Scan(&n.ID, &n.ParentID, &n.ColumnTitle, &n.Label, &n.Href, &n.Badge, &n.CategoryID, &n.SortOrder, &n.IsActive); err == nil {
			out = append(out, n)
		}
	}
	return out, nil
}

func (r *CatalogRepo) CreateNavigationItem(ctx context.Context, n *domain.NavigationItem) (*domain.NavigationItem, error) {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO navigation_items (parent_id, column_title, label, href, badge, category_id, sort_order, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, n.ParentID, n.ColumnTitle, n.Label, n.Href, n.Badge, n.CategoryID, n.SortOrder, n.IsActive).Scan(&n.ID)
	return n, mapErr(err)
}

func (r *CatalogRepo) UpdateNavigationItem(ctx context.Context, n *domain.NavigationItem) (*domain.NavigationItem, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE navigation_items SET parent_id = $2, column_title = $3, label = $4, href = $5, badge = $6, category_id = $7, sort_order = $8, is_active = $9
		WHERE id = $1
	`, n.ID, n.ParentID, n.ColumnTitle, n.Label, n.Href, n.Badge, n.CategoryID, n.SortOrder, n.IsActive)
	if err != nil {
		return nil, mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.ErrNotFound
	}
	return n, nil
}

func (r *CatalogRepo) DeleteNavigationItem(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM navigation_items WHERE id = $1`, id)
	return mapErr(err)
}

// ---------- Helpers ----------

func (r *CatalogRepo) loadProductImages(ctx context.Context, pid int64) []domain.ProductImage {
	rows, err := r.pool.Query(ctx, `SELECT id, product_id, media_id, url, alt_text, sort_order, is_primary FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC, id ASC`, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []domain.ProductImage{}
	for rows.Next() {
		var x domain.ProductImage
		if rows.Scan(&x.ID, &x.ProductID, &x.MediaID, &x.URL, &x.AltText, &x.SortOrder, &x.IsPrimary) == nil {
			out = append(out, x)
		}
	}
	return out
}

func (r *CatalogRepo) loadProductVariants(ctx context.Context, pid int64) []domain.ProductVariant {
	rows, err := r.pool.Query(ctx, `SELECT id, product_id, label, sku_suffix, mrp_paise, price_paise, stock_qty, sort_order, is_active FROM product_variants WHERE product_id = $1 ORDER BY sort_order ASC, id ASC`, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []domain.ProductVariant{}
	for rows.Next() {
		var x domain.ProductVariant
		if rows.Scan(&x.ID, &x.ProductID, &x.Label, &x.SKUSuffix, &x.MRPPaise, &x.PricePaise, &x.StockQty, &x.SortOrder, &x.IsActive) == nil {
			out = append(out, x)
		}
	}
	return out
}

func (r *CatalogRepo) loadIDList(ctx context.Context, q string, pid int64) []int64 {
	rows, err := r.pool.Query(ctx, q, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []int64{}
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil {
			out = append(out, id)
		}
	}
	return out
}

func (r *CatalogRepo) loadOptionGroups(ctx context.Context, pid int64) []domain.ProductOptionGroup {
	rows, err := r.pool.Query(ctx, `SELECT id, product_id, name, selection_type, options_json, is_required, sort_order FROM product_option_groups WHERE product_id = $1 ORDER BY sort_order ASC`, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []domain.ProductOptionGroup{}
	for rows.Next() {
		var x domain.ProductOptionGroup
		if rows.Scan(&x.ID, &x.ProductID, &x.Name, &x.SelectionType, &x.OptionsJSON, &x.IsRequired, &x.SortOrder) == nil {
			out = append(out, x)
		}
	}
	return out
}

func (r *CatalogRepo) loadPersonalizationFields(ctx context.Context, pid int64) []domain.PersonalizationField {
	rows, err := r.pool.Query(ctx, `SELECT id, product_id, field_key, label, field_type, placeholder, options_json, extra_price_paise, is_required, sort_order FROM product_personalization_fields WHERE product_id = $1 ORDER BY sort_order ASC`, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []domain.PersonalizationField{}
	for rows.Next() {
		var x domain.PersonalizationField
		if rows.Scan(&x.ID, &x.ProductID, &x.FieldKey, &x.Label, &x.FieldType, &x.Placeholder, &x.OptionsJSON, &x.ExtraPricePaise, &x.IsRequired, &x.SortOrder) == nil {
			out = append(out, x)
		}
	}
	return out
}

func (r *CatalogRepo) loadDecorInclusions(ctx context.Context, pid int64) []domain.DecorationInclusion {
	rows, err := r.pool.Query(ctx, `SELECT id, product_id, kind, item_text, sort_order FROM decoration_inclusions WHERE product_id = $1 ORDER BY sort_order ASC`, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []domain.DecorationInclusion{}
	for rows.Next() {
		var x domain.DecorationInclusion
		if rows.Scan(&x.ID, &x.ProductID, &x.Kind, &x.ItemText, &x.SortOrder) == nil {
			out = append(out, x)
		}
	}
	return out
}

func (r *CatalogRepo) loadCityOverrides(ctx context.Context, pid int64) []domain.ProductCityOverride {
	rows, err := r.pool.Query(ctx, `SELECT product_id, city_id, is_available, price_override_paise, delivery_charge_paise, CASE WHEN cutoff_override IS NOT NULL THEN TO_CHAR(cutoff_override, 'HH24:MI') ELSE NULL END FROM city_product_overrides WHERE product_id = $1`, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []domain.ProductCityOverride{}
	for rows.Next() {
		var x domain.ProductCityOverride
		if rows.Scan(&x.ProductID, &x.CityID, &x.IsAvailable, &x.PriceOverridePaise, &x.DeliveryChargePaise, &x.CutoffOverride) == nil {
			out = append(out, x)
		}
	}
	return out
}

func (r *CatalogRepo) loadLinkedAddons(ctx context.Context, pid int64) []domain.ProductAddon {
	rows, err := r.pool.Query(ctx, `
		SELECT pa.id, pa.addon_category_id, pa.name, pa.slug, pa.image_url, pa.price_paise, pa.is_active, pa.created_at
		FROM product_addon_links pal
		JOIN product_addons pa ON pa.id = pal.addon_id
		WHERE pal.product_id = $1 AND pa.is_active = TRUE
		ORDER BY pa.id ASC
	`, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []domain.ProductAddon{}
	for rows.Next() {
		var a domain.ProductAddon
		if rows.Scan(&a.ID, &a.AddonCategoryID, &a.Name, &a.Slug, &a.ImageURL, &a.PricePaise, &a.IsActive, &a.CreatedAt) == nil {
			out = append(out, a)
		}
	}
	return out
}

func (r *CatalogRepo) loadProductReviews(ctx context.Context, pid int64) []domain.Review {
	rows, err := r.pool.Query(ctx, `
		SELECT id, product_id, category_id, customer_id, reviewer_name, city_name, rating, comment, status, admin_reply, is_featured_home, created_at
		FROM reviews
		WHERE product_id = $1 AND status = 'approved'
		ORDER BY id DESC LIMIT 20
	`, pid)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := []domain.Review{}
	for rows.Next() {
		var rv domain.Review
		if rows.Scan(&rv.ID, &rv.ProductID, &rv.CategoryID, &rv.CustomerID, &rv.ReviewerName, &rv.CityName, &rv.Rating, &rv.Comment, &rv.Status, &rv.AdminReply, &rv.IsFeaturedHome, &rv.CreatedAt) == nil {
			out = append(out, rv)
		}
	}
	return out
}

