package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Phase3Repo struct {
	pool *pgxpool.Pool
}

func NewPhase3Repo(pool *pgxpool.Pool) *Phase3Repo {
	return &Phase3Repo{pool: pool}
}

// ---------- Reviews ----------

func (r *Phase3Repo) ListReviews(ctx context.Context, status string, page, limit int) ([]domain.Review, int64, error) {
	where := "1=1"
	args := []any{}
	if status != "" {
		where = "rv.status = $1"
		args = append(args, status)
	}
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM reviews rv WHERE `+where, args...).Scan(&total)

	orderBy := "rv.id DESC"
	if status == "approved" {
		orderBy = "rv.is_featured_home DESC, rv.id ASC"
	}
	offset := (page - 1) * limit
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, `
		SELECT rv.id, rv.product_id, COALESCE(p.name,''), rv.category_id, rv.customer_id,
		       rv.reviewer_name, rv.city_name, rv.rating, rv.comment, rv.status, rv.admin_reply, rv.is_featured_home, rv.created_at
		FROM reviews rv LEFT JOIN products p ON p.id = rv.product_id
		WHERE `+where+` ORDER BY `+orderBy+` LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Review{}
	for rows.Next() {
		var rv domain.Review
		if err := rows.Scan(&rv.ID, &rv.ProductID, &rv.ProductName, &rv.CategoryID, &rv.CustomerID,
			&rv.ReviewerName, &rv.CityName, &rv.Rating, &rv.Comment, &rv.Status, &rv.AdminReply, &rv.IsFeaturedHome, &rv.CreatedAt); err != nil {
			return nil, 0, mapErr(err)
		}
		out = append(out, rv)
	}
	return out, total, nil
}

func (r *Phase3Repo) SaveReview(ctx context.Context, rv *domain.Review) (*domain.Review, error) {
	status := rv.Status
	if status == "" {
		status = "approved"
	}
	var out domain.Review
	err := r.pool.QueryRow(ctx, `
		INSERT INTO reviews (product_id, category_id, customer_id, reviewer_name, city_name, rating, comment, status, admin_reply, is_featured_home)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id, product_id, '', category_id, customer_id, reviewer_name, city_name, rating, comment, status, admin_reply, is_featured_home, created_at
	`, rv.ProductID, rv.CategoryID, rv.CustomerID, rv.ReviewerName, rv.CityName, rv.Rating, rv.Comment, status, rv.AdminReply, rv.IsFeaturedHome).Scan(
		&out.ID, &out.ProductID, &out.ProductName, &out.CategoryID, &out.CustomerID,
		&out.ReviewerName, &out.CityName, &out.Rating, &out.Comment, &out.Status, &out.AdminReply, &out.IsFeaturedHome, &out.CreatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ModerateReview(ctx context.Context, id int64, status, reply string, featured bool) (*domain.Review, error) {
	var out domain.Review
	err := r.pool.QueryRow(ctx, `
		UPDATE reviews SET status=$2, admin_reply=$3, is_featured_home=$4 WHERE id=$1
		RETURNING id, product_id, '', category_id, customer_id, reviewer_name, city_name, rating, comment, status, admin_reply, is_featured_home, created_at
	`, id, status, reply, featured).Scan(
		&out.ID, &out.ProductID, &out.ProductName, &out.CategoryID, &out.CustomerID,
		&out.ReviewerName, &out.CityName, &out.Rating, &out.Comment, &out.Status, &out.AdminReply, &out.IsFeaturedHome, &out.CreatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) DeleteReview(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM reviews WHERE id=$1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// ---------- Sellers & Payouts ----------

func (r *Phase3Repo) ListSellers(ctx context.Context, kycStatus string, sellerID *int64) ([]domain.Seller, error) {
	where := []string{"s.deleted_at IS NULL"}
	args := []any{}
	if kycStatus != "" {
		args = append(args, kycStatus)
		where = append(where, fmt.Sprintf("s.kyc_status = $%d", len(args)))
	}
	if sellerID != nil {
		args = append(args, *sellerID)
		where = append(where, fmt.Sprintf("s.id = $%d", len(args)))
	}
	rows, err := r.pool.Query(ctx, `
		SELECT s.id, s.business_name, s.slug, s.contact_name, s.phone, s.email, s.city_id, COALESCE(c.name,''),
		       s.commission_percent::FLOAT8, s.kyc_status, s.kyc_docs_json, s.bank_details_json, s.is_active, s.created_at
		FROM sellers s LEFT JOIN cities c ON c.id = s.city_id
		WHERE `+strings.Join(where, " AND ")+` ORDER BY s.id DESC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.Seller{}
	for rows.Next() {
		var s domain.Seller
		if err := rows.Scan(&s.ID, &s.BusinessName, &s.Slug, &s.ContactName, &s.Phone, &s.Email, &s.CityID, &s.CityName,
			&s.CommissionPercent, &s.KYCStatus, &s.KYCDocsJSON, &s.BankDetailsJSON, &s.IsActive, &s.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, s)
	}
	return out, nil
}

func (r *Phase3Repo) SaveSeller(ctx context.Context, s *domain.Seller) (*domain.Seller, error) {
	kycDocs := s.KYCDocsJSON
	if len(kycDocs) == 0 {
		kycDocs = json.RawMessage("{}")
	}
	bank := s.BankDetailsJSON
	if len(bank) == 0 {
		bank = json.RawMessage("{}")
	}
	kyc := s.KYCStatus
	if kyc == "" {
		kyc = "pending"
	}
	comm := s.CommissionPercent
	if comm <= 0 {
		comm = 15
	}
	var out domain.Seller
	var err error
	if s.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE sellers SET business_name=$2, slug=$3, contact_name=$4, phone=$5, email=$6, city_id=$7,
			  commission_percent=$8, kyc_status=$9, kyc_docs_json=$10, bank_details_json=$11, is_active=$12
			WHERE id=$1 AND deleted_at IS NULL
			RETURNING id, business_name, slug, contact_name, phone, email, city_id, '', commission_percent::FLOAT8, kyc_status, kyc_docs_json, bank_details_json, is_active, created_at
		`, s.ID, s.BusinessName, s.Slug, s.ContactName, s.Phone, s.Email, s.CityID, comm, kyc, kycDocs, bank, s.IsActive).Scan(
			&out.ID, &out.BusinessName, &out.Slug, &out.ContactName, &out.Phone, &out.Email, &out.CityID, &out.CityName,
			&out.CommissionPercent, &out.KYCStatus, &out.KYCDocsJSON, &out.BankDetailsJSON, &out.IsActive, &out.CreatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO sellers (business_name, slug, contact_name, phone, email, city_id, commission_percent, kyc_status, kyc_docs_json, bank_details_json, is_active)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			RETURNING id, business_name, slug, contact_name, phone, email, city_id, '', commission_percent::FLOAT8, kyc_status, kyc_docs_json, bank_details_json, is_active, created_at
		`, s.BusinessName, s.Slug, s.ContactName, s.Phone, s.Email, s.CityID, comm, kyc, kycDocs, bank, s.IsActive).Scan(
			&out.ID, &out.BusinessName, &out.Slug, &out.ContactName, &out.Phone, &out.Email, &out.CityID, &out.CityName,
			&out.CommissionPercent, &out.KYCStatus, &out.KYCDocsJSON, &out.BankDetailsJSON, &out.IsActive, &out.CreatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase3Repo) UpdateSellerKYC(ctx context.Context, id int64, status string, commission float64) (*domain.Seller, error) {
	var out domain.Seller
	err := r.pool.QueryRow(ctx, `
		UPDATE sellers SET kyc_status=$2, commission_percent=CASE WHEN $3 > 0 THEN $3 ELSE commission_percent END
		WHERE id=$1 AND deleted_at IS NULL
		RETURNING id, business_name, slug, contact_name, phone, email, city_id, '', commission_percent::FLOAT8, kyc_status, kyc_docs_json, bank_details_json, is_active, created_at
	`, id, status, commission).Scan(
		&out.ID, &out.BusinessName, &out.Slug, &out.ContactName, &out.Phone, &out.Email, &out.CityID, &out.CityName,
		&out.CommissionPercent, &out.KYCStatus, &out.KYCDocsJSON, &out.BankDetailsJSON, &out.IsActive, &out.CreatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ListSellerPayouts(ctx context.Context, sellerID *int64) ([]domain.SellerPayout, error) {
	where := "1=1"
	args := []any{}
	if sellerID != nil {
		where = "sp.seller_id = $1"
		args = append(args, *sellerID)
	}
	rows, err := r.pool.Query(ctx, `
		SELECT sp.id, sp.seller_id, s.business_name, TO_CHAR(sp.period_start,'YYYY-MM-DD'), TO_CHAR(sp.period_end,'YYYY-MM-DD'),
		       sp.gross_paise, sp.commission_paise, sp.net_payout_paise, sp.status, sp.utr_number, sp.paid_at, sp.created_by_admin_id, sp.created_at
		FROM seller_payouts sp JOIN sellers s ON s.id = sp.seller_id
		WHERE `+where+` ORDER BY sp.id DESC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.SellerPayout{}
	for rows.Next() {
		var p domain.SellerPayout
		if err := rows.Scan(&p.ID, &p.SellerID, &p.SellerName, &p.PeriodStart, &p.PeriodEnd,
			&p.GrossPaise, &p.CommissionPaise, &p.NetPayoutPaise, &p.Status, &p.UTRNumber, &p.PaidAt, &p.CreatedByAdminID, &p.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, p)
	}
	return out, nil
}

func (r *Phase3Repo) CreateSellerPayout(ctx context.Context, p *domain.SellerPayout) (*domain.SellerPayout, error) {
	// Calculate gross/commission directly from seller's delivered order_items in period if omitted
	if p.GrossPaise == 0 {
		_ = r.pool.QueryRow(ctx, `
			SELECT COALESCE(SUM(oi.line_total_paise), 0)::BIGINT, COALESCE(SUM(oi.seller_payout_paise), 0)::BIGINT
			FROM order_items oi JOIN orders o ON o.id = oi.order_id
			WHERE oi.seller_id = $1 AND o.status = 'delivered' AND o.payment_status <> 'refunded'
			  AND o.placed_at >= $2::DATE AND o.placed_at < ($3::DATE + INTERVAL '1 day')
		`, p.SellerID, p.PeriodStart, p.PeriodEnd).Scan(&p.GrossPaise, &p.NetPayoutPaise)
		p.CommissionPaise = p.GrossPaise - p.NetPayoutPaise
	}
	var out domain.SellerPayout
	err := r.pool.QueryRow(ctx, `
		INSERT INTO seller_payouts (seller_id, period_start, period_end, gross_paise, commission_paise, net_payout_paise, status, created_by_admin_id)
		VALUES ($1,$2::DATE,$3::DATE,$4,$5,$6,'pending',$7)
		RETURNING id, seller_id, '', TO_CHAR(period_start,'YYYY-MM-DD'), TO_CHAR(period_end,'YYYY-MM-DD'), gross_paise, commission_paise, net_payout_paise, status, utr_number, paid_at, created_by_admin_id, created_at
	`, p.SellerID, p.PeriodStart, p.PeriodEnd, p.GrossPaise, p.CommissionPaise, p.NetPayoutPaise, p.CreatedByAdminID).Scan(
		&out.ID, &out.SellerID, &out.SellerName, &out.PeriodStart, &out.PeriodEnd,
		&out.GrossPaise, &out.CommissionPaise, &out.NetPayoutPaise, &out.Status, &out.UTRNumber, &out.PaidAt, &out.CreatedByAdminID, &out.CreatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) MarkPayoutPaid(ctx context.Context, id int64, utr string) (*domain.SellerPayout, error) {
	var out domain.SellerPayout
	err := r.pool.QueryRow(ctx, `
		UPDATE seller_payouts SET status='paid', utr_number=$2, paid_at=NOW() WHERE id=$1 AND status='pending'
		RETURNING id, seller_id, '', TO_CHAR(period_start,'YYYY-MM-DD'), TO_CHAR(period_end,'YYYY-MM-DD'), gross_paise, commission_paise, net_payout_paise, status, utr_number, paid_at, created_by_admin_id, created_at
	`, id, utr).Scan(
		&out.ID, &out.SellerID, &out.SellerName, &out.PeriodStart, &out.PeriodEnd,
		&out.GrossPaise, &out.CommissionPaise, &out.NetPayoutPaise, &out.Status, &out.UTRNumber, &out.PaidAt, &out.CreatedByAdminID, &out.CreatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ApproveSellerProduct(ctx context.Context, productID int64, status string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE products SET status=$2 WHERE id=$1 AND deleted_at IS NULL`, productID, status)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// ---------- Content, Blog, Recent Work, FAQs, Redirects ----------

func (r *Phase3Repo) ListCMSPages(ctx context.Context, pageType string) ([]domain.CMSPage, error) {
	where := "deleted_at IS NULL"
	args := []any{}
	if pageType != "" {
		where += " AND page_type = $1"
		args = append(args, pageType)
	}
	rows, err := r.pool.Query(ctx, `SELECT id, slug, page_type, title, body_html, sections_json, seo_title, seo_description, robots_index, is_published, created_at, updated_at FROM cms_pages WHERE `+where+` ORDER BY id DESC`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.CMSPage{}
	for rows.Next() {
		var p domain.CMSPage
		if err := rows.Scan(&p.ID, &p.Slug, &p.PageType, &p.Title, &p.BodyHTML, &p.SectionsJSON, &p.SEOTitle, &p.SEODescription, &p.RobotsIndex, &p.IsPublished, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, p)
	}
	return out, nil
}

func (r *Phase3Repo) GetCMSPageBySlug(ctx context.Context, slug string) (*domain.CMSPage, error) {
	var p domain.CMSPage
	err := r.pool.QueryRow(ctx, `
		SELECT id, slug, page_type, title, body_html, sections_json, seo_title, seo_description, robots_index, is_published, created_at, updated_at
		FROM cms_pages WHERE slug=$1 AND deleted_at IS NULL AND is_published = TRUE
	`, slug).Scan(&p.ID, &p.Slug, &p.PageType, &p.Title, &p.BodyHTML, &p.SectionsJSON, &p.SEOTitle, &p.SEODescription, &p.RobotsIndex, &p.IsPublished, &p.CreatedAt, &p.UpdatedAt)
	return &p, mapErr(err)
}

func (r *Phase3Repo) SaveCMSPage(ctx context.Context, p *domain.CMSPage) (*domain.CMSPage, error) {
	sec := p.SectionsJSON
	if len(sec) == 0 {
		sec = json.RawMessage("[]")
	}
	pt := p.PageType
	if pt == "" {
		pt = "static"
	}
	var out domain.CMSPage
	var err error
	if p.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE cms_pages SET slug=$2, page_type=$3, title=$4, body_html=$5, sections_json=$6, seo_title=$7, seo_description=$8, robots_index=$9, is_published=$10
			WHERE id=$1 AND deleted_at IS NULL
			RETURNING id, slug, page_type, title, body_html, sections_json, seo_title, seo_description, robots_index, is_published, created_at, updated_at
		`, p.ID, p.Slug, pt, p.Title, p.BodyHTML, sec, p.SEOTitle, p.SEODescription, p.RobotsIndex, p.IsPublished).Scan(
			&out.ID, &out.Slug, &out.PageType, &out.Title, &out.BodyHTML, &out.SectionsJSON, &out.SEOTitle, &out.SEODescription, &out.RobotsIndex, &out.IsPublished, &out.CreatedAt, &out.UpdatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO cms_pages (slug, page_type, title, body_html, sections_json, seo_title, seo_description, robots_index, is_published)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
			ON CONFLICT (slug) DO UPDATE SET deleted_at=NULL, page_type=EXCLUDED.page_type, title=EXCLUDED.title, body_html=EXCLUDED.body_html, sections_json=EXCLUDED.sections_json, seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description, robots_index=EXCLUDED.robots_index, is_published=EXCLUDED.is_published
			RETURNING id, slug, page_type, title, body_html, sections_json, seo_title, seo_description, robots_index, is_published, created_at, updated_at
		`, p.Slug, pt, p.Title, p.BodyHTML, sec, p.SEOTitle, p.SEODescription, p.RobotsIndex, p.IsPublished).Scan(
			&out.ID, &out.Slug, &out.PageType, &out.Title, &out.BodyHTML, &out.SectionsJSON, &out.SEOTitle, &out.SEODescription, &out.RobotsIndex, &out.IsPublished, &out.CreatedAt, &out.UpdatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase3Repo) DeleteCMSPage(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `UPDATE cms_pages SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase3Repo) ListFAQs(ctx context.Context, scopeType string) ([]domain.FAQ, error) {
	where := "1=1"
	args := []any{}
	if scopeType != "" {
		where = "scope_type = $1"
		args = append(args, scopeType)
	}
	rows, err := r.pool.Query(ctx, `SELECT id, scope_type, scope_id, question, answer, sort_order, is_active, created_at FROM faqs WHERE `+where+` ORDER BY sort_order ASC, id ASC`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.FAQ{}
	for rows.Next() {
		var f domain.FAQ
		if err := rows.Scan(&f.ID, &f.ScopeType, &f.ScopeID, &f.Question, &f.Answer, &f.SortOrder, &f.IsActive, &f.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, f)
	}
	return out, nil
}

func (r *Phase3Repo) SaveFAQ(ctx context.Context, f *domain.FAQ) (*domain.FAQ, error) {
	scope := f.ScopeType
	if scope == "" {
		scope = "home"
	}
	var out domain.FAQ
	var err error
	if f.ID > 0 {
		err = r.pool.QueryRow(ctx, `UPDATE faqs SET scope_type=$2, scope_id=$3, question=$4, answer=$5, sort_order=$6, is_active=$7 WHERE id=$1 RETURNING id, scope_type, scope_id, question, answer, sort_order, is_active, created_at`,
			f.ID, scope, f.ScopeID, f.Question, f.Answer, f.SortOrder, f.IsActive).Scan(&out.ID, &out.ScopeType, &out.ScopeID, &out.Question, &out.Answer, &out.SortOrder, &out.IsActive, &out.CreatedAt)
	} else {
		err = r.pool.QueryRow(ctx, `INSERT INTO faqs (scope_type, scope_id, question, answer, sort_order, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, scope_type, scope_id, question, answer, sort_order, is_active, created_at`,
			scope, f.ScopeID, f.Question, f.Answer, f.SortOrder, f.IsActive).Scan(&out.ID, &out.ScopeType, &out.ScopeID, &out.Question, &out.Answer, &out.SortOrder, &out.IsActive, &out.CreatedAt)
	}
	return &out, mapErr(err)
}

func (r *Phase3Repo) DeleteFAQ(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM faqs WHERE id=$1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase3Repo) ListBlogCategories(ctx context.Context) ([]domain.BlogCategory, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, slug, image_url, seo_title, seo_description, created_at FROM blog_categories ORDER BY name ASC`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.BlogCategory{}
	for rows.Next() {
		var c domain.BlogCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.ImageURL, &c.SEOTitle, &c.SEODescription, &c.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, c)
	}
	return out, nil
}

func (r *Phase3Repo) SaveBlogCategory(ctx context.Context, c *domain.BlogCategory) (*domain.BlogCategory, error) {
	var out domain.BlogCategory
	err := r.pool.QueryRow(ctx, `
		INSERT INTO blog_categories (name, slug, image_url, seo_title, seo_description)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, image_url=EXCLUDED.image_url, seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description
		RETURNING id, name, slug, image_url, seo_title, seo_description, created_at
	`, c.Name, c.Slug, c.ImageURL, c.SEOTitle, c.SEODescription).Scan(&out.ID, &out.Name, &out.Slug, &out.ImageURL, &out.SEOTitle, &out.SEODescription, &out.CreatedAt)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ListBlogPosts(ctx context.Context, status string) ([]domain.BlogPost, error) {
	where := "bp.deleted_at IS NULL"
	args := []any{}
	if status != "" {
		where += " AND bp.status = $1"
		args = append(args, status)
	}
	rows, err := r.pool.Query(ctx, `
		SELECT bp.id, bp.category_id, COALESCE(bc.name,''), bp.title, bp.slug, bp.excerpt, bp.content_html,
		       bp.sections_json, bp.featured_image_url, bp.author_name, bp.read_time, bp.is_featured, bp.status, bp.published_at,
		       bp.seo_title, bp.seo_description, bp.created_at, bp.updated_at
		FROM blog_posts bp LEFT JOIN blog_categories bc ON bc.id = bp.category_id
		WHERE `+where+` ORDER BY bp.is_featured DESC, bp.id ASC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.BlogPost{}
	for rows.Next() {
		var b domain.BlogPost
		if err := rows.Scan(&b.ID, &b.CategoryID, &b.CategoryName, &b.Title, &b.Slug, &b.Excerpt, &b.ContentHTML,
			&b.SectionsJSON, &b.FeaturedImageURL, &b.AuthorName, &b.ReadTime, &b.IsFeatured, &b.Status, &b.PublishedAt,
			&b.SEOTitle, &b.SEODescription, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, b)
	}
	return out, nil
}

func (r *Phase3Repo) SaveBlogPost(ctx context.Context, b *domain.BlogPost) (*domain.BlogPost, error) {
	sec := b.SectionsJSON
	if len(sec) == 0 {
		sec = json.RawMessage("[]")
	}
	st := b.Status
	if st == "" {
		st = "draft"
	}
	var pubAt *time.Time
	if st == "published" {
		now := time.Now()
		pubAt = &now
	}
	var out domain.BlogPost
	var err error
	if b.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE blog_posts SET category_id=$2, title=$3, slug=$4, excerpt=$5, content_html=$6, sections_json=$7,
			  featured_image_url=$8, author_name=$9, read_time=$10, is_featured=$11, status=$12, published_at=COALESCE(published_at, $13),
			  seo_title=$14, seo_description=$15
			WHERE id=$1 AND deleted_at IS NULL
			RETURNING id, category_id, '', title, slug, excerpt, content_html, sections_json, featured_image_url, author_name, read_time, is_featured, status, published_at, seo_title, seo_description, created_at, updated_at
		`, b.ID, b.CategoryID, b.Title, b.Slug, b.Excerpt, b.ContentHTML, sec, b.FeaturedImageURL, b.AuthorName, b.ReadTime, b.IsFeatured, st, pubAt, b.SEOTitle, b.SEODescription).Scan(
			&out.ID, &out.CategoryID, &out.CategoryName, &out.Title, &out.Slug, &out.Excerpt, &out.ContentHTML,
			&out.SectionsJSON, &out.FeaturedImageURL, &out.AuthorName, &out.ReadTime, &out.IsFeatured, &out.Status, &out.PublishedAt,
			&out.SEOTitle, &out.SEODescription, &out.CreatedAt, &out.UpdatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO blog_posts (category_id, title, slug, excerpt, content_html, sections_json, featured_image_url, author_name, read_time, is_featured, status, published_at, seo_title, seo_description)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
			RETURNING id, category_id, '', title, slug, excerpt, content_html, sections_json, featured_image_url, author_name, read_time, is_featured, status, published_at, seo_title, seo_description, created_at, updated_at
		`, b.CategoryID, b.Title, b.Slug, b.Excerpt, b.ContentHTML, sec, b.FeaturedImageURL, b.AuthorName, b.ReadTime, b.IsFeatured, st, pubAt, b.SEOTitle, b.SEODescription).Scan(
			&out.ID, &out.CategoryID, &out.CategoryName, &out.Title, &out.Slug, &out.Excerpt, &out.ContentHTML,
			&out.SectionsJSON, &out.FeaturedImageURL, &out.AuthorName, &out.ReadTime, &out.IsFeatured, &out.Status, &out.PublishedAt,
			&out.SEOTitle, &out.SEODescription, &out.CreatedAt, &out.UpdatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase3Repo) DeleteBlogPost(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `UPDATE blog_posts SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase3Repo) ListRecentWorks(ctx context.Context, categorySlug string) ([]domain.RecentWork, error) {
	where := "1=1"
	args := []any{}
	if categorySlug != "" {
		where = "rw.category_slug = $1"
		args = append(args, categorySlug)
	}
	rows, err := r.pool.Query(ctx, `
		SELECT rw.id, rw.category_slug, rw.title, rw.city_id, COALESCE(c.name,''), rw.image_url, rw.description, rw.sort_order, rw.is_published, rw.created_at
		FROM recent_works rw LEFT JOIN cities c ON c.id = rw.city_id WHERE `+where+` ORDER BY rw.sort_order ASC, rw.id DESC
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.RecentWork{}
	for rows.Next() {
		var w domain.RecentWork
		if err := rows.Scan(&w.ID, &w.CategorySlug, &w.Title, &w.CityID, &w.CityName, &w.ImageURL, &w.Description, &w.SortOrder, &w.IsPublished, &w.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, w)
	}
	return out, nil
}

func (r *Phase3Repo) SaveRecentWork(ctx context.Context, rw *domain.RecentWork) (*domain.RecentWork, error) {
	var out domain.RecentWork
	var err error
	if rw.ID > 0 {
		err = r.pool.QueryRow(ctx, `
			UPDATE recent_works SET category_slug=$2, title=$3, city_id=$4, image_url=$5, description=$6, sort_order=$7, is_published=$8
			WHERE id=$1
			RETURNING id, category_slug, title, city_id, '', image_url, description, sort_order, is_published, created_at
		`, rw.ID, rw.CategorySlug, rw.Title, rw.CityID, rw.ImageURL, rw.Description, rw.SortOrder, rw.IsPublished).Scan(
			&out.ID, &out.CategorySlug, &out.Title, &out.CityID, &out.CityName, &out.ImageURL, &out.Description, &out.SortOrder, &out.IsPublished, &out.CreatedAt,
		)
	} else {
		err = r.pool.QueryRow(ctx, `
			INSERT INTO recent_works (category_slug, title, city_id, image_url, description, sort_order, is_published)
			VALUES ($1,$2,$3,$4,$5,$6,$7)
			RETURNING id, category_slug, title, city_id, '', image_url, description, sort_order, is_published, created_at
		`, rw.CategorySlug, rw.Title, rw.CityID, rw.ImageURL, rw.Description, rw.SortOrder, rw.IsPublished).Scan(
			&out.ID, &out.CategorySlug, &out.Title, &out.CityID, &out.CityName, &out.ImageURL, &out.Description, &out.SortOrder, &out.IsPublished, &out.CreatedAt,
		)
	}
	return &out, mapErr(err)
}

func (r *Phase3Repo) DeleteRecentWork(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM recent_works WHERE id=$1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase3Repo) ListSEORedirects(ctx context.Context) ([]domain.SEORedirect, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, from_path, to_path, status_code, is_active, created_at FROM seo_redirects ORDER BY id DESC`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.SEORedirect{}
	for rows.Next() {
		var rd domain.SEORedirect
		if err := rows.Scan(&rd.ID, &rd.FromPath, &rd.ToPath, &rd.StatusCode, &rd.IsActive, &rd.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, rd)
	}
	return out, nil
}

func (r *Phase3Repo) SaveSEORedirect(ctx context.Context, rd *domain.SEORedirect) (*domain.SEORedirect, error) {
	code := rd.StatusCode
	if code == 0 {
		code = 301
	}
	var out domain.SEORedirect
	err := r.pool.QueryRow(ctx, `
		INSERT INTO seo_redirects (from_path, to_path, status_code, is_active)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (from_path) DO UPDATE SET to_path=EXCLUDED.to_path, status_code=EXCLUDED.status_code, is_active=EXCLUDED.is_active
		RETURNING id, from_path, to_path, status_code, is_active, created_at
	`, rd.FromPath, rd.ToPath, code, rd.IsActive).Scan(&out.ID, &out.FromPath, &out.ToPath, &out.StatusCode, &out.IsActive, &out.CreatedAt)
	return &out, mapErr(err)
}

func (r *Phase3Repo) DeleteSEORedirect(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM seo_redirects WHERE id=$1`, id)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase3Repo) ListSitemapSlugs(ctx context.Context) (products, categories, blogs, pages []string, err error) {
	readCol := func(q string) []string {
		rows, qErr := r.pool.Query(ctx, q)
		if qErr != nil {
			return nil
		}
		defer rows.Close()
		var list []string
		for rows.Next() {
			var s string
			if rows.Scan(&s) == nil {
				list = append(list, s)
			}
		}
		return list
	}
	products = readCol(`SELECT CASE WHEN product_type = 'decoration_package' THEN 's/' || slug ELSE 'p/' || slug END FROM products WHERE deleted_at IS NULL AND status='published' ORDER BY id DESC LIMIT 1000`)
	categories = readCol(`SELECT slug FROM categories WHERE deleted_at IS NULL AND is_active=TRUE AND kind <> 'addon' ORDER BY sort_order ASC`)
	blogs = readCol(`SELECT slug FROM blog_posts WHERE deleted_at IS NULL AND status='published' ORDER BY id DESC`)
	pages = readCol(`SELECT CASE WHEN page_type = 'footer_policy' THEN 'pages/' || slug ELSE slug END FROM cms_pages WHERE deleted_at IS NULL AND is_published=TRUE`)
	return products, categories, blogs, pages, nil
}

// ---------- Media Library ----------

func (r *Phase3Repo) ListMediaFolders(ctx context.Context) ([]domain.MediaFolder, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, parent_id, name, slug, created_at FROM media_folders ORDER BY name ASC`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.MediaFolder{}
	for rows.Next() {
		var f domain.MediaFolder
		if err := rows.Scan(&f.ID, &f.ParentID, &f.Name, &f.Slug, &f.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, f)
	}
	return out, nil
}

func (r *Phase3Repo) CreateMediaFolder(ctx context.Context, f *domain.MediaFolder) (*domain.MediaFolder, error) {
	var out domain.MediaFolder
	err := r.pool.QueryRow(ctx, `INSERT INTO media_folders (parent_id, name, slug) VALUES ($1,$2,$3) RETURNING id, parent_id, name, slug, created_at`,
		f.ParentID, f.Name, f.Slug).Scan(&out.ID, &out.ParentID, &out.Name, &out.Slug, &out.CreatedAt)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ListMediaAssets(ctx context.Context, folderID *int64, search string, page, limit int) ([]domain.MediaAsset, int64, error) {
	where := []string{"1=1"}
	args := []any{}
	if folderID != nil {
		args = append(args, *folderID)
		where = append(where, fmt.Sprintf("folder_id = $%d", len(args)))
	}
	if search != "" {
		args = append(args, "%"+search+"%")
		where = append(where, fmt.Sprintf("(file_key ILIKE $%d OR alt_text ILIKE $%d)", len(args), len(args)))
	}
	wSQL := strings.Join(where, " AND ")
	var total int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_assets WHERE `+wSQL, args...).Scan(&total)
	offset := (page - 1) * limit
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, `
		SELECT id, folder_id, file_key, cdn_url, webp_url, alt_text, width, height, size_bytes, mime_type, uploaded_by_admin_id, created_at
		FROM media_assets WHERE `+wSQL+` ORDER BY id DESC LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	defer rows.Close()
	out := []domain.MediaAsset{}
	for rows.Next() {
		var a domain.MediaAsset
		if err := rows.Scan(&a.ID, &a.FolderID, &a.FileKey, &a.CDNURL, &a.WebPURL, &a.AltText, &a.Width, &a.Height, &a.SizeBytes, &a.MimeType, &a.UploadedByAdminID, &a.CreatedAt); err != nil {
			return nil, 0, mapErr(err)
		}
		out = append(out, a)
	}
	return out, total, nil
}

func (r *Phase3Repo) CreateMediaAsset(ctx context.Context, a *domain.MediaAsset) (*domain.MediaAsset, error) {
	var out domain.MediaAsset
	err := r.pool.QueryRow(ctx, `
		INSERT INTO media_assets (folder_id, file_key, cdn_url, webp_url, alt_text, width, height, size_bytes, mime_type, uploaded_by_admin_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id, folder_id, file_key, cdn_url, webp_url, alt_text, width, height, size_bytes, mime_type, uploaded_by_admin_id, created_at
	`, a.FolderID, a.FileKey, a.CDNURL, a.WebPURL, a.AltText, a.Width, a.Height, a.SizeBytes, a.MimeType, a.UploadedByAdminID).Scan(
		&out.ID, &out.FolderID, &out.FileKey, &out.CDNURL, &out.WebPURL, &out.AltText, &out.Width, &out.Height, &out.SizeBytes, &out.MimeType, &out.UploadedByAdminID, &out.CreatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) UpdateMediaAltText(ctx context.Context, id int64, alt string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE media_assets SET alt_text=$2 WHERE id=$1`, id, alt)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase3Repo) DeleteMediaAsset(ctx context.Context, id int64) (string, error) {
	var key string
	err := r.pool.QueryRow(ctx, `DELETE FROM media_assets WHERE id=$1 RETURNING file_key`, id).Scan(&key)
	return key, mapErr(err)
}

// ---------- Inquiries, Support, WhatsApp, Notification Templates, Meta Ads, Settings ----------

func (r *Phase3Repo) ListContactInquiries(ctx context.Context, inquiryType, status string) ([]domain.ContactInquiry, error) {
	where := []string{"1=1"}
	args := []any{}
	if inquiryType != "" {
		args = append(args, inquiryType)
		where = append(where, fmt.Sprintf("inquiry_type = $%d", len(args)))
	}
	if status != "" {
		args = append(args, status)
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, inquiry_type, name, phone, email, city, subject, message, metadata, status, assigned_admin_id, created_at
		FROM contact_inquiries WHERE `+strings.Join(where, " AND ")+` ORDER BY id DESC LIMIT 200
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.ContactInquiry{}
	for rows.Next() {
		var c domain.ContactInquiry
		if err := rows.Scan(&c.ID, &c.InquiryType, &c.Name, &c.Phone, &c.Email, &c.City, &c.Subject, &c.Message, &c.Metadata, &c.Status, &c.AssignedAdminID, &c.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, c)
	}
	return out, nil
}

func (r *Phase3Repo) CreateContactInquiry(ctx context.Context, c *domain.ContactInquiry) (*domain.ContactInquiry, error) {
	meta := c.Metadata
	if len(meta) == 0 {
		meta = json.RawMessage("{}")
	}
	it := c.InquiryType
	if it == "" {
		it = "contact"
	}
	var out domain.ContactInquiry
	err := r.pool.QueryRow(ctx, `
		INSERT INTO contact_inquiries (inquiry_type, name, phone, email, city, subject, message, metadata, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new')
		RETURNING id, inquiry_type, name, phone, email, city, subject, message, metadata, status, assigned_admin_id, created_at
	`, it, c.Name, c.Phone, c.Email, c.City, c.Subject, c.Message, meta).Scan(
		&out.ID, &out.InquiryType, &out.Name, &out.Phone, &out.Email, &out.City, &out.Subject, &out.Message, &out.Metadata, &out.Status, &out.AssignedAdminID, &out.CreatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) UpdateInquiryStatus(ctx context.Context, id int64, status string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE contact_inquiries SET status=$2 WHERE id=$1`, id, status)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Phase3Repo) ListSupportTickets(ctx context.Context, sellerID *int64, status string) ([]domain.SupportTicket, error) {
	where := []string{"1=1"}
	args := []any{}
	if sellerID != nil {
		args = append(args, *sellerID)
		where = append(where, fmt.Sprintf("seller_id = $%d", len(args)))
	}
	if status != "" {
		args = append(args, status)
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, ticket_number, source_type, customer_id, seller_id, order_id, subject, status, priority, messages_json, created_at, updated_at
		FROM support_tickets WHERE `+strings.Join(where, " AND ")+` ORDER BY id DESC LIMIT 100
	`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.SupportTicket{}
	for rows.Next() {
		var tk domain.SupportTicket
		if err := rows.Scan(&tk.ID, &tk.TicketNumber, &tk.SourceType, &tk.CustomerID, &tk.SellerID, &tk.OrderID, &tk.Subject, &tk.Status, &tk.Priority, &tk.MessagesJSON, &tk.CreatedAt, &tk.UpdatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, tk)
	}
	return out, nil
}

func (r *Phase3Repo) ReplySupportTicket(ctx context.Context, id int64, sender, text, nextStatus string) (*domain.SupportTicket, error) {
	if nextStatus == "" {
		nextStatus = "in_progress"
	}
	entryBytes, _ := json.Marshal([]map[string]any{{
		"sender": sender, "body": text, "sent_at": time.Now().Format(time.RFC3339),
	}})
	var out domain.SupportTicket
	err := r.pool.QueryRow(ctx, `
		UPDATE support_tickets SET messages_json = messages_json || $2::jsonb, status = $3, updated_at = NOW() WHERE id = $1
		RETURNING id, ticket_number, source_type, customer_id, seller_id, order_id, subject, status, priority, messages_json, created_at, updated_at
	`, id, entryBytes, nextStatus).Scan(&out.ID, &out.TicketNumber, &out.SourceType, &out.CustomerID, &out.SellerID, &out.OrderID, &out.Subject, &out.Status, &out.Priority, &out.MessagesJSON, &out.CreatedAt, &out.UpdatedAt)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ListWhatsappContacts(ctx context.Context) ([]domain.WhatsappContact, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, phone, name, customer_id, unread_count, last_message_at FROM whatsapp_contacts ORDER BY COALESCE(last_message_at, created_at) DESC LIMIT 100`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.WhatsappContact{}
	for rows.Next() {
		var c domain.WhatsappContact
		if err := rows.Scan(&c.ID, &c.Phone, &c.Name, &c.CustomerID, &c.UnreadCount, &c.LastMessageAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, c)
	}
	return out, nil
}

func (r *Phase3Repo) SaveWhatsappContact(ctx context.Context, c *domain.WhatsappContact) (*domain.WhatsappContact, error) {
	var out domain.WhatsappContact
	err := r.pool.QueryRow(ctx, `
		INSERT INTO whatsapp_contacts (phone, name, customer_id, unread_count)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (phone) DO UPDATE SET name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE whatsapp_contacts.name END
		RETURNING id, phone, name, customer_id, unread_count, last_message_at
	`, strings.TrimSpace(c.Phone), strings.TrimSpace(c.Name), c.CustomerID, c.UnreadCount).Scan(
		&out.ID, &out.Phone, &out.Name, &out.CustomerID, &out.UnreadCount, &out.LastMessageAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ListWhatsappMessages(ctx context.Context, contactID int64) ([]domain.WhatsappMessage, error) {
	_, _ = r.pool.Exec(ctx, `UPDATE whatsapp_contacts SET unread_count = 0 WHERE id=$1`, contactID)
	rows, err := r.pool.Query(ctx, `SELECT id, contact_id, direction, body, media_url, status, created_at FROM whatsapp_messages WHERE contact_id=$1 ORDER BY id ASC LIMIT 200`, contactID)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.WhatsappMessage{}
	for rows.Next() {
		var m domain.WhatsappMessage
		if err := rows.Scan(&m.ID, &m.ContactID, &m.Direction, &m.Body, &m.MediaURL, &m.Status, &m.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, m)
	}
	return out, nil
}

func (r *Phase3Repo) SendWhatsappMessage(ctx context.Context, contactID int64, body string) (*domain.WhatsappMessage, error) {
	var out domain.WhatsappMessage
	err := r.pool.QueryRow(ctx, `
		INSERT INTO whatsapp_messages (contact_id, direction, body, status) VALUES ($1, 'out', $2, 'sent')
		RETURNING id, contact_id, direction, body, media_url, status, created_at
	`, contactID, body).Scan(&out.ID, &out.ContactID, &out.Direction, &out.Body, &out.MediaURL, &out.Status, &out.CreatedAt)
	if err == nil {
		_, _ = r.pool.Exec(ctx, `UPDATE whatsapp_contacts SET last_message_at=NOW() WHERE id=$1`, contactID)
	}
	return &out, mapErr(err)
}

func (r *Phase3Repo) ListNotificationTemplates(ctx context.Context) ([]domain.NotificationTemplate, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, event_key, channel, subject, body_template, is_active, updated_at FROM notification_templates ORDER BY event_key ASC, channel ASC`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.NotificationTemplate{}
	for rows.Next() {
		var nt domain.NotificationTemplate
		if err := rows.Scan(&nt.ID, &nt.EventKey, &nt.Channel, &nt.Subject, &nt.BodyTemplate, &nt.IsActive, &nt.UpdatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, nt)
	}
	return out, nil
}

func (r *Phase3Repo) SaveNotificationTemplate(ctx context.Context, t *domain.NotificationTemplate) (*domain.NotificationTemplate, error) {
	var out domain.NotificationTemplate
	err := r.pool.QueryRow(ctx, `
		INSERT INTO notification_templates (event_key, channel, subject, body_template, is_active)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (event_key, channel) DO UPDATE SET subject=EXCLUDED.subject, body_template=EXCLUDED.body_template, is_active=EXCLUDED.is_active
		RETURNING id, event_key, channel, subject, body_template, is_active, updated_at
	`, t.EventKey, t.Channel, t.Subject, t.BodyTemplate, t.IsActive).Scan(
		&out.ID, &out.EventKey, &out.Channel, &out.Subject, &out.BodyTemplate, &out.IsActive, &out.UpdatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ListMetaAdsCampaigns(ctx context.Context) ([]domain.MetaAdsCampaign, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, external_campaign_id, name, objective, status, daily_budget_paise, rules_json, metrics_json, updated_at FROM meta_ads_campaigns ORDER BY id DESC`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.MetaAdsCampaign{}
	for rows.Next() {
		var m domain.MetaAdsCampaign
		if err := rows.Scan(&m.ID, &m.ExternalCampaignID, &m.Name, &m.Objective, &m.Status, &m.DailyBudgetPaise, &m.RulesJSON, &m.MetricsJSON, &m.UpdatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, m)
	}
	return out, nil
}

func (r *Phase3Repo) SaveMetaAdsCampaign(ctx context.Context, m *domain.MetaAdsCampaign) (*domain.MetaAdsCampaign, error) {
	rules := m.RulesJSON
	if len(rules) == 0 {
		rules = json.RawMessage("{}")
	}
	metrics := m.MetricsJSON
	if len(metrics) == 0 {
		metrics = json.RawMessage("{}")
	}
	var out domain.MetaAdsCampaign
	err := r.pool.QueryRow(ctx, `
		INSERT INTO meta_ads_campaigns (external_campaign_id, name, objective, status, daily_budget_paise, rules_json, metrics_json)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (external_campaign_id) DO UPDATE SET name=EXCLUDED.name, status=EXCLUDED.status, daily_budget_paise=EXCLUDED.daily_budget_paise, rules_json=EXCLUDED.rules_json
		RETURNING id, external_campaign_id, name, objective, status, daily_budget_paise, rules_json, metrics_json, updated_at
	`, m.ExternalCampaignID, m.Name, m.Objective, m.Status, m.DailyBudgetPaise, rules, metrics).Scan(
		&out.ID, &out.ExternalCampaignID, &out.Name, &out.Objective, &out.Status, &out.DailyBudgetPaise, &out.RulesJSON, &out.MetricsJSON, &out.UpdatedAt,
	)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ListSiteSettings(ctx context.Context, group string) ([]domain.SiteSetting, error) {
	where := "1=1"
	args := []any{}
	if group != "" {
		where = "group_name = $1"
		args = append(args, group)
	}
	rows, err := r.pool.Query(ctx, `SELECT key, group_name, value_json, updated_by_admin_id, updated_at FROM site_settings WHERE `+where+` ORDER BY group_name ASC, key ASC`, args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()
	out := []domain.SiteSetting{}
	for rows.Next() {
		var st domain.SiteSetting
		if err := rows.Scan(&st.Key, &st.GroupName, &st.ValueJSON, &st.UpdatedByAdminID, &st.UpdatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, st)
	}
	return out, nil
}

func (r *Phase3Repo) UpsertSiteSetting(ctx context.Context, s *domain.SiteSetting) (*domain.SiteSetting, error) {
	val := s.ValueJSON
	if len(val) == 0 {
		val = json.RawMessage("{}")
	}
	grp := s.GroupName
	if grp == "" {
		grp = "general"
	}
	var out domain.SiteSetting
	err := r.pool.QueryRow(ctx, `
		INSERT INTO site_settings (key, group_name, value_json, updated_by_admin_id, updated_at)
		VALUES ($1,$2,$3,$4,NOW())
		ON CONFLICT (key) DO UPDATE SET group_name=EXCLUDED.group_name, value_json=EXCLUDED.value_json, updated_by_admin_id=EXCLUDED.updated_by_admin_id, updated_at=NOW()
		RETURNING key, group_name, value_json, updated_by_admin_id, updated_at
	`, s.Key, grp, val, s.UpdatedByAdminID).Scan(&out.Key, &out.GroupName, &out.ValueJSON, &out.UpdatedByAdminID, &out.UpdatedAt)
	return &out, mapErr(err)
}

func (r *Phase3Repo) ExportDatabaseBackupJSON(ctx context.Context) (map[string]any, error) {
	settings, _ := r.ListSiteSettings(ctx, "")
	redirects, _ := r.ListSEORedirects(ctx)
	templates, _ := r.ListNotificationTemplates(ctx)
	pages, _ := r.ListCMSPages(ctx, "")
	faqs, _ := r.ListFAQs(ctx, "")
	var prodCount, orderCount, custCount int64
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM products WHERE deleted_at IS NULL`).Scan(&prodCount)
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM orders WHERE deleted_at IS NULL`).Scan(&orderCount)
	_ = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL`).Scan(&custCount)
	return map[string]any{
		"exported_at":            time.Now().UTC().Format(time.RFC3339),
		"counts":                 map[string]int64{"products": prodCount, "orders": orderCount, "customers": custCount},
		"site_settings":          settings,
		"cms_pages":              pages,
		"faqs":                   faqs,
		"seo_redirects":          redirects,
		"notification_templates": templates,
	}, nil
}

