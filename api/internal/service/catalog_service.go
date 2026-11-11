package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

var nonSlugRe = regexp.MustCompile(`[^a-z0-9]+`)

type CatalogService struct {
	repo     domain.CatalogRepository
	auditSvc *AuditService
}

func NewCatalogService(repo domain.CatalogRepository, auditSvc *AuditService) *CatalogService {
	return &CatalogService{repo: repo, auditSvc: auditSvc}
}

func ComputeDiscountPercent(mrpPaise, sellingPaise int64) int {
	if mrpPaise <= 0 || sellingPaise >= mrpPaise {
		return 0
	}
	pct := int(((mrpPaise - sellingPaise) * 100) / mrpPaise)
	if pct < 0 {
		return 0
	}
	if pct > 100 {
		return 100
	}
	return pct
}

func Slugify(input string) string {
	s := strings.ToLower(strings.TrimSpace(input))
	s = nonSlugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func SlugifyPath(input string) string {
	parts := strings.Split(strings.TrimSpace(input), "/")
	clean := make([]string, 0, len(parts))
	for _, p := range parts {
		if sp := Slugify(p); sp != "" {
			clean = append(clean, sp)
		}
	}
	return strings.Join(clean, "/")
}

func vendorScopeSellerID(admin *domain.AdminProfile) *int64 {
	if admin != nil && admin.SellerID != nil {
		id := *admin.SellerID
		return &id
	}
	return nil
}

func assertProductVendorAccess(p *domain.Product, admin *domain.AdminProfile) error {
	if admin != nil && admin.SellerID != nil {
		if p.SellerID == nil || *p.SellerID != *admin.SellerID {
			return domain.ErrForbidden
		}
	}
	return nil
}

// ---------- Products ----------

func (s *CatalogService) ListProducts(ctx context.Context, f domain.ProductListFilter, admin *domain.AdminProfile) ([]domain.Product, int64, error) {
	if sid := vendorScopeSellerID(admin); sid != nil {
		f.SellerID = sid
	}
	return s.repo.ListProducts(ctx, f)
}

func (s *CatalogService) GetProduct(ctx context.Context, id *int64, slug string, admin *domain.AdminProfile) (*domain.Product, error) {
	p, err := s.repo.GetProductByIDOrSlug(ctx, id, slug)
	if err != nil {
		return nil, err
	}
	if err := assertProductVendorAccess(p, admin); err != nil {
		return nil, err
	}
	return p, nil
}

func isValidProductType(pt string) bool {
	switch pt {
	case "flower", "cake", "plant", "chocolate", "personalised", "hamper", "decoration_package", "combo":
		return true
	}
	return false
}

func isValidProductStatus(st string) bool {
	switch st {
	case "draft", "pending_approval", "published", "archived":
		return true
	}
	return false
}

func (s *CatalogService) CreateProduct(ctx context.Context, p *domain.Product, admin *domain.AdminProfile, reqID, ip string) (*domain.Product, error) {
	if p.Name == "" || p.SKU == "" {
		return nil, fmt.Errorf("%w: product name and sku are required", domain.ErrValidation)
	}
	if p.ProductType == "" {
		p.ProductType = "personalised"
	} else if !isValidProductType(p.ProductType) {
		return nil, fmt.Errorf("%w: invalid product_type %q", domain.ErrValidation, p.ProductType)
	}
	if p.Slug == "" {
		p.Slug = Slugify(p.Name)
	} else {
		p.Slug = Slugify(p.Slug)
	}
	if p.Status == "" {
		p.Status = "draft"
	} else if !isValidProductStatus(p.Status) {
		return nil, fmt.Errorf("%w: invalid status %q", domain.ErrValidation, p.Status)
	}
	if sid := vendorScopeSellerID(admin); sid != nil {
		p.SellerID = sid
	}
	if p.MRPPaise < p.SellingPricePaise {
		p.MRPPaise = p.SellingPricePaise
	}
	p.DiscountPercent = ComputeDiscountPercent(p.MRPPaise, p.SellingPricePaise)

	created, err := s.repo.CreateProduct(ctx, p)
	if err != nil {
		return nil, err
	}
	if s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "product.create", "product", created.ID, reqID, ip, nil, map[string]any{
			"name": created.Name, "sku": created.SKU, "price_paise": created.SellingPricePaise,
		})
	}
	return created, nil
}

func (s *CatalogService) UpdateProduct(ctx context.Context, id int64, p *domain.Product, admin *domain.AdminProfile, reqID, ip string) (*domain.Product, error) {
	existing, err := s.repo.GetProductByIDOrSlug(ctx, &id, "")
	if err != nil {
		return nil, err
	}
	if err := assertProductVendorAccess(existing, admin); err != nil {
		return nil, err
	}
	p.ID = id
	if p.Name == "" {
		p.Name = existing.Name
	}
	if p.ProductType == "" {
		p.ProductType = existing.ProductType
	} else if !isValidProductType(p.ProductType) {
		return nil, fmt.Errorf("%w: invalid product_type %q", domain.ErrValidation, p.ProductType)
	}
	if p.Status == "" {
		p.Status = existing.Status
	} else if !isValidProductStatus(p.Status) {
		return nil, fmt.Errorf("%w: invalid status %q", domain.ErrValidation, p.Status)
	}
	if p.Slug == "" {
		p.Slug = existing.Slug
	} else {
		p.Slug = Slugify(p.Slug)
	}
	if sid := vendorScopeSellerID(admin); sid != nil {
		p.SellerID = sid
	}
	if p.MRPPaise < p.SellingPricePaise {
		p.MRPPaise = p.SellingPricePaise
	}
	p.DiscountPercent = ComputeDiscountPercent(p.MRPPaise, p.SellingPricePaise)

	updated, err := s.repo.UpdateProduct(ctx, p)
	if err != nil {
		return nil, err
	}
	if s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "product.update", "product", id, reqID, ip, map[string]any{
			"name": existing.Name, "price_paise": existing.SellingPricePaise, "stock": existing.StockQty, "status": existing.Status,
		}, map[string]any{
			"name": updated.Name, "price_paise": updated.SellingPricePaise, "stock": updated.StockQty, "status": updated.Status,
		})
	}
	return updated, nil
}

func (s *CatalogService) DeleteProduct(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	existing, err := s.repo.GetProductByIDOrSlug(ctx, &id, "")
	if err != nil {
		return err
	}
	if err := assertProductVendorAccess(existing, admin); err != nil {
		return err
	}
	if err := s.repo.SoftDeleteProduct(ctx, id); err != nil {
		return err
	}
	if s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "product.delete", "product", id, reqID, ip, map[string]any{"sku": existing.SKU}, nil)
	}
	return nil
}

func (s *CatalogService) DuplicateProduct(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) (*domain.Product, error) {
	existing, err := s.repo.GetProductByIDOrSlug(ctx, &id, "")
	if err != nil {
		return nil, err
	}
	if err := assertProductVendorAccess(existing, admin); err != nil {
		return nil, err
	}
	dup, err := s.repo.DuplicateProduct(ctx, id)
	if err != nil {
		return nil, err
	}
	if s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "product.duplicate", "product", dup.ID, reqID, ip, map[string]any{"source_id": id}, map[string]any{"new_id": dup.ID, "sku": dup.SKU})
	}
	return dup, nil
}

func (s *CatalogService) BulkUpdateProducts(ctx context.Context, items []domain.BulkProductUpdateItem, admin *domain.AdminProfile, reqID, ip string) error {
	if len(items) == 0 {
		return fmt.Errorf("%w: items list cannot be empty", domain.ErrValidation)
	}
	if sid := vendorScopeSellerID(admin); sid != nil {
		for _, it := range items {
			p, err := s.repo.GetProductByIDOrSlug(ctx, &it.ProductID, "")
			if err != nil {
				return err
			}
			if p.SellerID == nil || *p.SellerID != *sid {
				return domain.ErrForbidden
			}
		}
	}
	if err := s.repo.BulkUpdateProducts(ctx, items); err != nil {
		return err
	}
	if s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "product.bulk_update", "product", len(items), reqID, ip, nil, items)
	}
	return nil
}

func (s *CatalogService) ExportProductsCSV(ctx context.Context, f domain.ProductListFilter, admin *domain.AdminProfile) ([]byte, error) {
	f.Page = 1
	f.Limit = 2000
	items, _, err := s.ListProducts(ctx, f, admin)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{
		"ID", "SKU", "Name", "Slug", "Type", "MRP (INR)", "Selling Price (INR)", "Discount %", "Stock", "Eggless", "Status",
	})
	for _, p := range items {
		_ = w.Write([]string{
			strconv.FormatInt(p.ID, 10),
			p.SKU,
			p.Name,
			p.Slug,
			p.ProductType,
			fmt.Sprintf("%.2f", float64(p.MRPPaise)/100),
			fmt.Sprintf("%.2f", float64(p.SellingPricePaise)/100),
			strconv.Itoa(p.DiscountPercent),
			strconv.Itoa(p.StockQty),
			strconv.FormatBool(p.IsEggless),
			p.Status,
		})
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

type CSVImportSummary struct {
	Imported int      `json:"imported"`
	Errors   []string `json:"errors,omitempty"`
}

func (s *CatalogService) ImportProductsCSV(ctx context.Context, csvBytes []byte, admin *domain.AdminProfile, reqID, ip string) (*CSVImportSummary, error) {
	r := csv.NewReader(bytes.NewReader(csvBytes))
	r.TrimLeadingSpace = true
	headers, err := r.Read()
	if err != nil {
		return nil, fmt.Errorf("%w: invalid csv header", domain.ErrValidation)
	}
	colIdx := map[string]int{}
	for i, h := range headers {
		colIdx[strings.ToLower(strings.TrimSpace(h))] = i
	}
	getCol := func(row []string, keys ...string) string {
		for _, k := range keys {
			if idx, ok := colIdx[k]; ok && idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
		}
		return ""
	}

	summary := &CSVImportSummary{}
	rowNum := 1
	for {
		row, err := r.Read()
		if err == io.EOF {
			break
		}
		rowNum++
		if err != nil {
			summary.Errors = append(summary.Errors, fmt.Sprintf("row %d: %v", rowNum, err))
			continue
		}
		name := getCol(row, "name", "title")
		sku := getCol(row, "sku")
		if name == "" || sku == "" {
			summary.Errors = append(summary.Errors, fmt.Sprintf("row %d: missing name or sku", rowNum))
			continue
		}
		ptype := getCol(row, "product_type", "type")
		if ptype == "" {
			ptype = "flower"
		}
		mrpInr, _ := strconv.ParseFloat(getCol(row, "mrp_rupees", "mrp", "mrp (inr)"), 64)
		priceInr, _ := strconv.ParseFloat(getCol(row, "selling_price_rupees", "price", "selling price (inr)"), 64)
		stock, _ := strconv.Atoi(getCol(row, "stock_qty", "stock"))
		status := getCol(row, "status")
		if status == "" {
			status = "draft"
		}
		isEggless := strings.EqualFold(getCol(row, "is_eggless", "eggless"), "true")

		p := &domain.Product{
			ProductType:        ptype,
			Name:               name,
			Slug:               Slugify(name + "-" + sku),
			SKU:                sku,
			Description:        getCol(row, "description"),
			MRPPaise:           int64(mrpInr * 100),
			SellingPricePaise:  int64(priceInr * 100),
			StockQty:           stock,
			TrackStock:         true,
			IsEggless:          isEggless,
			AvailableAllCities: true,
			GSTRatePercent:     18,
			Status:             status,
		}
		if _, err := s.CreateProduct(ctx, p, admin, reqID, ip); err != nil {
			summary.Errors = append(summary.Errors, fmt.Sprintf("row %d (%s): %v", rowNum, sku, err))
			continue
		}
		summary.Imported++
	}
	return summary, nil
}

// ---------- Addons ----------

func (s *CatalogService) ListAddons(ctx context.Context, search string, page, limit int) ([]domain.ProductAddon, int64, error) {
	return s.repo.ListAddons(ctx, search, page, limit)
}

func (s *CatalogService) CreateAddon(ctx context.Context, a *domain.ProductAddon, admin *domain.AdminProfile, reqID, ip string) (*domain.ProductAddon, error) {
	if a.Slug == "" {
		a.Slug = Slugify(a.Name)
	}
	out, err := s.repo.CreateAddon(ctx, a)
	if err == nil && s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "addon.create", "addon", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *CatalogService) UpdateAddon(ctx context.Context, id int64, a *domain.ProductAddon, admin *domain.AdminProfile, reqID, ip string) (*domain.ProductAddon, error) {
	a.ID = id
	if a.Slug == "" {
		a.Slug = Slugify(a.Name)
	}
	out, err := s.repo.UpdateAddon(ctx, a)
	if err == nil && s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "addon.update", "addon", id, reqID, ip, nil, out)
	}
	return out, err
}

func (s *CatalogService) DeleteAddon(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.DeleteAddon(ctx, id); err != nil {
		return err
	}
	if s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "addon.delete", "addon", id, reqID, ip, nil, nil)
	}
	return nil
}

// ---------- Categories & Nested Tree ----------

func BuildCategoryTree(flat []domain.Category) []domain.Category {
	byID := make(map[int64]domain.Category, len(flat))
	childrenMap := make(map[int64][]int64)
	var rootIDs []int64

	for _, c := range flat {
		c.Children = nil
		byID[c.ID] = c
		if c.ParentID == nil {
			rootIDs = append(rootIDs, c.ID)
		} else {
			childrenMap[*c.ParentID] = append(childrenMap[*c.ParentID], c.ID)
		}
	}

	var attach func(id int64) domain.Category
	attach = func(id int64) domain.Category {
		node := byID[id]
		for _, cid := range childrenMap[id] {
			node.Children = append(node.Children, attach(cid))
		}
		return node
	}

	roots := make([]domain.Category, 0, len(rootIDs))
	for _, rid := range rootIDs {
		roots = append(roots, attach(rid))
	}
	return roots
}

func (s *CatalogService) ListCategories(ctx context.Context, kind, search string, asTree bool) ([]domain.Category, error) {
	flat, err := s.repo.ListCategories(ctx, kind, search)
	if err != nil {
		return nil, err
	}
	if asTree {
		return BuildCategoryTree(flat), nil
	}
	return flat, nil
}

func (s *CatalogService) GetCategory(ctx context.Context, id int64) (*domain.Category, error) {
	return s.repo.GetCategoryByIDOrSlug(ctx, &id, "")
}

func (s *CatalogService) CreateCategory(ctx context.Context, c *domain.Category, admin *domain.AdminProfile, reqID, ip string) (*domain.Category, error) {
	if c.Name == "" {
		return nil, fmt.Errorf("%w: category name required", domain.ErrValidation)
	}
	if c.Slug == "" {
		c.Slug = Slugify(c.Name)
	} else {
		c.Slug = SlugifyPath(c.Slug)
	}
	if c.Kind != "product" && c.Kind != "decoration" && c.Kind != "addon" {
		c.Kind = "product"
	}
	out, err := s.repo.CreateCategory(ctx, c)
	if err == nil && s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "category", "category.create", "category", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *CatalogService) UpdateCategory(ctx context.Context, id int64, c *domain.Category, admin *domain.AdminProfile, reqID, ip string) (*domain.Category, error) {
	existing, err := s.repo.GetCategoryByIDOrSlug(ctx, &id, "")
	if err != nil {
		return nil, err
	}
	c.ID = id
	if c.Name == "" {
		c.Name = existing.Name
	}
	if c.Slug == "" {
		c.Slug = existing.Slug
	} else {
		c.Slug = SlugifyPath(c.Slug)
	}
	if c.Kind == "" {
		c.Kind = existing.Kind
	} else if c.Kind != "product" && c.Kind != "decoration" && c.Kind != "addon" {
		return nil, fmt.Errorf("%w: category kind must be product, decoration, or addon", domain.ErrValidation)
	}
	out, err := s.repo.UpdateCategory(ctx, c)
	if err == nil && s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "category", "category.update", "category", id, reqID, ip, existing, out)
	}
	return out, err
}

func (s *CatalogService) DeleteCategory(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.SoftDeleteCategory(ctx, id); err != nil {
		return err
	}
	if s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "category", "category.delete", "category", id, reqID, ip, nil, nil)
	}
	return nil
}

// ---------- Mega-Menu / Navigation Builder ----------

func BuildNavigationTree(flat []domain.NavigationItem) []domain.NavigationItem {
	byID := make(map[int64]domain.NavigationItem, len(flat))
	childrenMap := make(map[int64][]int64)
	var rootIDs []int64

	for _, n := range flat {
		n.Children = nil
		byID[n.ID] = n
		if n.ParentID == nil {
			rootIDs = append(rootIDs, n.ID)
		} else {
			childrenMap[*n.ParentID] = append(childrenMap[*n.ParentID], n.ID)
		}
	}

	var attach func(id int64) domain.NavigationItem
	attach = func(id int64) domain.NavigationItem {
		node := byID[id]
		for _, cid := range childrenMap[id] {
			node.Children = append(node.Children, attach(cid))
		}
		return node
	}

	roots := make([]domain.NavigationItem, 0, len(rootIDs))
	for _, rid := range rootIDs {
		roots = append(roots, attach(rid))
	}
	return roots
}

func (s *CatalogService) ListNavigation(ctx context.Context, asTree bool) ([]domain.NavigationItem, error) {
	flat, err := s.repo.ListNavigation(ctx)
	if err != nil {
		return nil, err
	}
	if asTree {
		return BuildNavigationTree(flat), nil
	}
	return flat, nil
}

func (s *CatalogService) CreateNavigationItem(ctx context.Context, n *domain.NavigationItem, admin *domain.AdminProfile, reqID, ip string) (*domain.NavigationItem, error) {
	out, err := s.repo.CreateNavigationItem(ctx, n)
	if err == nil && s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "category", "navigation.create", "navigation_item", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *CatalogService) UpdateNavigationItem(ctx context.Context, id int64, n *domain.NavigationItem, admin *domain.AdminProfile, reqID, ip string) (*domain.NavigationItem, error) {
	n.ID = id
	out, err := s.repo.UpdateNavigationItem(ctx, n)
	if err == nil && s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "category", "navigation.update", "navigation_item", id, reqID, ip, nil, out)
	}
	return out, err
}

func (s *CatalogService) DeleteNavigationItem(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.DeleteNavigationItem(ctx, id); err != nil {
		return err
	}
	if s.auditSvc != nil && admin != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "category", "navigation.delete", "navigation_item", id, reqID, ip, nil, nil)
	}
	return nil
}
