package public

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/go-chi/chi/v5"
)

type stubCatalogRepo struct {
	domain.CatalogRepository
	products []domain.Product
	addons   []domain.ProductAddon
	cats     []domain.Category
}

func (r *stubCatalogRepo) ListProducts(_ context.Context, _ domain.ProductListFilter) ([]domain.Product, int64, error) {
	return r.products, int64(len(r.products)), nil
}

func (r *stubCatalogRepo) GetProductByIDOrSlug(_ context.Context, _ *int64, slug string) (*domain.Product, error) {
	for _, p := range r.products {
		if p.Slug == slug {
			cp := p
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *stubCatalogRepo) ListAddons(_ context.Context, _ string, _, _ int) ([]domain.ProductAddon, int64, error) {
	return r.addons, int64(len(r.addons)), nil
}

func (r *stubCatalogRepo) ListCategories(_ context.Context, kind, _ string) ([]domain.Category, error) {
	var out []domain.Category
	for _, c := range r.cats {
		if kind == "" || c.Kind == kind {
			out = append(out, c)
		}
	}
	return out, nil
}

type stubPhase2Repo struct {
	domain.Phase2Repository
	coupons []domain.Coupon
	presets []domain.Preset
}

func (r *stubPhase2Repo) ListCoupons(_ context.Context, _ string) ([]domain.Coupon, error) {
	return r.coupons, nil
}

func (r *stubPhase2Repo) ListPresets(_ context.Context, presetType, _ string) ([]domain.Preset, error) {
	var out []domain.Preset
	for _, p := range r.presets {
		if presetType == "" || p.PresetType == presetType {
			out = append(out, p)
		}
	}
	return out, nil
}

func (r *stubPhase2Repo) ListTimeSlots(_ context.Context, _ bool) ([]domain.TimeSlotTemplate, error) {
	return []domain.TimeSlotTemplate{
		{ID: 1, Label: "09:00 AM - 11:00 AM", StartTime: "09:00", EndTime: "11:00", DefaultCapacity: 10, IsActive: true},
		{ID: 2, Label: "11:00 PM - 12:00 AM", StartTime: "23:00", EndTime: "00:00", IsMidnight: true, ExtraChargePaise: 14900, DefaultCapacity: 5, IsActive: true},
	}, nil
}

func (r *stubPhase2Repo) ListSlotLedger(_ context.Context, cityID int64, date string) ([]domain.SlotCapacityOverride, error) {
	return []domain.SlotCapacityOverride{
		{CityID: cityID, ServiceDate: date, SlotTemplateID: 1, SlotLabel: "09:00 AM - 11:00 AM", MaxCapacity: 10, ReservedCount: 2},
		{CityID: cityID, ServiceDate: date, SlotTemplateID: 2, SlotLabel: "11:00 PM - 12:00 AM", MaxCapacity: 5, ReservedCount: 0},
	}, nil
}

func (r *stubPhase2Repo) ListCities(_ context.Context, _ string, _ bool) ([]domain.City, error) {
	return []domain.City{{ID: 1, Name: "Kolkata", Slug: "kolkata", IsActive: true}}, nil
}

type stubPhase3Repo struct {
	domain.Phase3Repository
	pages     []domain.CMSPage
	redirects []domain.SEORedirect
	settings  []domain.SiteSetting
	blogs     []domain.BlogPost
	blogCats  []domain.BlogCategory
}

func (r *stubPhase3Repo) ListCMSPages(_ context.Context, pageType string) ([]domain.CMSPage, error) {
	return r.pages, nil
}
func (r *stubPhase3Repo) ListSEORedirects(_ context.Context) ([]domain.SEORedirect, error) {
	return r.redirects, nil
}
func (r *stubPhase3Repo) ListSiteSettings(_ context.Context, _ string) ([]domain.SiteSetting, error) {
	return r.settings, nil
}
func (r *stubPhase3Repo) ListReviews(_ context.Context, _ string, _, _ int) ([]domain.Review, int64, error) {
	return nil, 0, nil
}
func (r *stubPhase3Repo) ListFAQs(_ context.Context, _ string) ([]domain.FAQ, error) {
	return nil, nil
}
func (r *stubPhase3Repo) ListBlogPosts(_ context.Context, _ string) ([]domain.BlogPost, error) {
	return r.blogs, nil
}
func (r *stubPhase3Repo) ListBlogCategories(_ context.Context) ([]domain.BlogCategory, error) {
	return r.blogCats, nil
}

type stubOrderRepo struct {
	domain.OrderRepository
	orders map[int64]*domain.Order
}

func (r *stubOrderRepo) GetOrderByIDOrNumber(_ context.Context, id *int64, _ string) (*domain.Order, error) {
	if id != nil {
		if o, ok := r.orders[*id]; ok {
			cp := *o
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *stubOrderRepo) UpdateOrderStatusTx(_ context.Context, orderID int64, toStatus, _ string, _ *int64, _ string, _, _ int) (*domain.Order, error) {
	o, ok := r.orders[orderID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	o.Status = toStatus
	cp := *o
	return &cp, nil
}

func TestStorefrontPublicAddonsCouponsPresetsAndSimilar(t *testing.T) {
	catID := int64(109)
	limitOne := 1
	maxCap := int64(40000)
	now := time.Now()

	catSvc := service.NewCatalogService(&stubCatalogRepo{
		products: []domain.Product{
			{ID: 1, Slug: "yellow-roses-with-cake", Name: "Yellow Roses with Cake", Status: "published", ProductType: "combo", CategoryIDs: []int64{10}, AddonIDs: []int64{11}},
			{ID: 2, Slug: "mixed-flowers-truffle", Name: "Mixed Flowers Truffle", Status: "published", ProductType: "combo", CategoryIDs: []int64{10}},
			{ID: 3, Slug: "red-velvet-bouquet", Name: "Red Velvet Bouquet", Status: "published", ProductType: "combo", CategoryIDs: []int64{10}},
		},
		addons: []domain.ProductAddon{
			{ID: 11, AddonCategoryID: &catID, Name: "Love Bento Cake", PricePaise: 99900, IsActive: true},
			{ID: 12, AddonCategoryID: &catID, Name: "Disabled Addon", PricePaise: 49900, IsActive: false},
		},
		cats: []domain.Category{
			{ID: 10, Name: "Birthday Decoration", Slug: "birthday-decoration", Kind: "decoration", IsActive: true},
			{ID: 109, Name: "Bento Cakes", Slug: "addon-bento-cakes", Kind: "addon", IsActive: true},
			{ID: 110, Name: "Hidden Cat", Slug: "addon-hidden", Kind: "addon", IsActive: false},
		},
	}, nil)

	p2Svc := service.NewPhase2Service(&stubPhase2Repo{
		coupons: []domain.Coupon{
			{ID: 1, Code: "NEWUSER", DiscountType: "flat", DiscountValue: 100, MinCartPaise: 199900, ValidFrom: now.Add(-time.Hour), ValidUntil: now.Add(time.Hour), IsActive: true},
			{ID: 2, Code: "FESTIVE400", DiscountType: "percent", DiscountValue: 4, MaxDiscountPaise: &maxCap, MinCartPaise: 250000, ValidFrom: now.Add(-time.Hour), ValidUntil: now.Add(time.Hour), IsActive: true},
			{ID: 3, Code: "MAXEDOUT", DiscountType: "flat", DiscountValue: 50, MinCartPaise: 10000, TotalUsageLimit: &limitOne, UsedCount: 1, ValidFrom: now.Add(-time.Hour), ValidUntil: now.Add(time.Hour), IsActive: true},
			{ID: 4, Code: "KOLKATAONLY", DiscountType: "flat", DiscountValue: 150, MinCartPaise: 10000, ApplicableCityIDs: []int64{1}, ValidFrom: now.Add(-time.Hour), ValidUntil: now.Add(time.Hour), IsActive: true},
		},
		presets: []domain.Preset{
			{ID: 1, PresetType: "processing-time", Name: "2 Hours", Slug: "2-hours-ready", IsActive: true},
			{ID: 2, PresetType: "processing-time", Name: "Inactive", Slug: "inactive", IsActive: false},
		},
	}, nil, "")

	ordSvc := service.NewOrderService(&stubOrderRepo{
		orders: map[int64]*domain.Order{
			55: {ID: 55, OrderNumber: "GL-2026-550055", RecipientPhone: "+919830011223", Status: domain.OrderStatusPlaced},
		},
	}, nil, nil, nil, nil)

	p3Svc := service.NewPhase3Service(&stubPhase3Repo{
		pages: []domain.CMSPage{
			{ID: 1, Slug: "terms-and-conditions", Title: "Terms & Conditions", BodyHTML: "<p>Terms</p>", IsPublished: true},
			{ID: 2, Slug: "draft-page", Title: "Draft", BodyHTML: "<p>Hidden</p>", IsPublished: false},
		},
		redirects: []domain.SEORedirect{
			{ID: 1, FromPath: "/old-decor", ToPath: "/balloon-decorations", StatusCode: 301},
		},
		settings: []domain.SiteSetting{
			{Key: "home_tiles_config", ValueJSON: json.RawMessage(`{"shop-by-category":[{"title":"Birthday","href":"/birthday-decoration"}]}`)},
		},
		blogCats: []domain.BlogCategory{
			{ID: 1, Name: "Birthday Guides", Slug: "birthday-guides"},
		},
		blogs: []domain.BlogPost{
			{ID: 1, Title: "Top 10 Themes", Slug: "top-10-themes", Status: "published"},
		},
	}, nil, nil, nil)

	h := NewStorefrontHandler(nil, catSvc, ordSvc, p2Svc, p3Svc, nil, nil)
	r := chi.NewRouter()
	r.Get("/addons", h.ListAddonsPublic)
	r.Get("/coupons", h.ListCouponsPublic)
	r.Post("/coupons/validate", h.ValidateCoupon)
	r.Get("/presets", h.ListPresetsPublic)
	r.Get("/products/{slug}", h.GetProductBySlug)
	r.Get("/categories/*", h.GetCategoryBySlug)
	r.Get("/pages/{slug}", h.GetPageBySlug)
	r.Get("/redirects", h.ListSEORedirectsPublic)
	r.Get("/sitemap/{type}", h.GetSitemapByType)
	r.Post("/orders/{id}/cancel", h.CancelCustomerOrder)
	r.Get("/slots", h.GetAvailableSlots)

	// 1. Addons filters active addons & categories + returns popular_ids
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/addons?product_slug=yellow-roses-with-cake", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /addons failed: %d", rec.Code)
	}
	var addOut struct {
		Addons     []domain.ProductAddon `json:"addons"`
		Categories []domain.Category     `json:"categories"`
		PopularIDs []int64               `json:"popular_ids"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &addOut)
	if len(addOut.Addons) != 1 || len(addOut.Categories) != 1 || len(addOut.PopularIDs) != 1 || addOut.PopularIDs[0] != 11 {
		t.Fatalf("unexpected /addons payload: %+v", addOut)
	}

	// 2. Presets returns only active entries matching type
	recP := httptest.NewRecorder()
	r.ServeHTTP(recP, httptest.NewRequest(http.MethodGet, "/presets?type=processing-time", nil))
	if recP.Code != http.StatusOK {
		t.Fatalf("GET /presets failed: %d", recP.Code)
	}
	var presets []domain.Preset
	_ = json.Unmarshal(recP.Body.Bytes(), &presets)
	if len(presets) != 1 || presets[0].Name != "2 Hours" {
		t.Fatalf("unexpected /presets payload: %+v", presets)
	}

	// 3. ValidateCoupon checks NEWUSER, FESTIVE400 cap, MAXEDOUT usage limit, and city restriction
	validateCall := func(payload map[string]any) *httptest.ResponseRecorder {
		b, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/coupons/validate", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	if w := validateCall(map[string]any{"code": "NEWUSER", "subtotal_paise": 250000}); w.Code != http.StatusOK {
		t.Fatalf("expected NEWUSER valid, got %d %s", w.Code, w.Body.String())
	} else {
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		if int64(out["discount_paise"].(float64)) != 10000 {
			t.Fatalf("expected 10000 paise discount, got %v", out["discount_paise"])
		}
	}
	if w := validateCall(map[string]any{"code": "FESTIVE400", "subtotal_paise": 1500000}); w.Code != http.StatusOK {
		t.Fatalf("expected FESTIVE400 valid, got %d", w.Code)
	} else {
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		if int64(out["discount_paise"].(float64)) != 40000 {
			t.Fatalf("expected capped 40000 paise discount, got %v", out["discount_paise"])
		}
	}
	if w := validateCall(map[string]any{"code": "MAXEDOUT", "subtotal_paise": 200000}); w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for exhausted coupon, got %d", w.Code)
	}
	if w := validateCall(map[string]any{"code": "KOLKATAONLY", "subtotal_paise": 200000, "city_id": 2}); w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for non-matching city coupon, got %d", w.Code)
	}

	// 4. GetProductBySlug attaches similar_products excluding self
	recProd := httptest.NewRecorder()
	r.ServeHTTP(recProd, httptest.NewRequest(http.MethodGet, "/products/yellow-roses-with-cake", nil))
	if recProd.Code != http.StatusOK {
		t.Fatalf("GET /products/yellow-roses-with-cake failed: %d", recProd.Code)
	}
	var prodOut domain.Product
	_ = json.Unmarshal(recProd.Body.Bytes(), &prodOut)
	if len(prodOut.SimilarProducts) != 2 {
		t.Fatalf("expected 2 similar products (excluding self), got %d", len(prodOut.SimilarProducts))
	}

	// 5. CancelCustomerOrder blocks unverified callers (403) and permits verified phone/order_number (200)
	unauthBody, _ := json.Marshal(map[string]any{"reason": "spoof", "phone": "9999999999"})
	recCancelDenied := httptest.NewRecorder()
	reqDenied := httptest.NewRequest(http.MethodPost, "/orders/55/cancel", bytes.NewReader(unauthBody))
	reqDenied.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(recCancelDenied, reqDenied)
	if recCancelDenied.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for unverified cancel, got %d", recCancelDenied.Code)
	}

	authBody, _ := json.Marshal(map[string]any{"reason": "changed plan", "phone": "9830011223"})
	recCancelOK := httptest.NewRecorder()
	reqOK := httptest.NewRequest(http.MethodPost, "/orders/55/cancel", bytes.NewReader(authBody))
	reqOK.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(recCancelOK, reqOK)
	if recCancelOK.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for verified cancel, got %d %s", recCancelOK.Code, recCancelOK.Body.String())
	}

	// 6. GetAvailableSlots returns future slots with start/end times and extra_charge_paise
	futureDate := time.Now().AddDate(0, 0, 2).Format("2006-01-02")
	recSlots := httptest.NewRecorder()
	r.ServeHTTP(recSlots, httptest.NewRequest(http.MethodGet, "/slots?date="+futureDate, nil))
	if recSlots.Code != http.StatusOK {
		t.Fatalf("GET /slots failed: %d %s", recSlots.Code, recSlots.Body.String())
	}
	var slotsOut struct {
		Slots []struct {
			Label            string `json:"label"`
			StartTime        string `json:"start_time"`
			EndTime          string `json:"end_time"`
			ExtraChargePaise int    `json:"extra_charge_paise"`
			IsAvailable      bool   `json:"is_available"`
			IsMidnight       bool   `json:"is_midnight"`
		} `json:"slots"`
	}
	_ = json.Unmarshal(recSlots.Body.Bytes(), &slotsOut)
	if len(slotsOut.Slots) != 2 || slotsOut.Slots[1].ExtraChargePaise != 14900 || slotsOut.Slots[0].StartTime != "09:00" || !slotsOut.Slots[1].IsAvailable {
		t.Fatalf("unexpected /slots payload: %+v", slotsOut)
	}

	// 7. GetCategoryBySlug resolves city-scoped routes (/birthday-decoration/kolkata),
	// 3-segment locality routes (/birthday-decoration/kolkata/salt-lake), and multi-hop ancestor product inheritance
	recCat := httptest.NewRecorder()
	r.ServeHTTP(recCat, httptest.NewRequest(http.MethodGet, "/categories/birthday-decoration/kolkata", nil))
	if recCat.Code != http.StatusOK {
		t.Fatalf("GET /categories/birthday-decoration/kolkata failed: %d %s", recCat.Code, recCat.Body.String())
	}
	var catOut struct {
		Category domain.Category `json:"category"`
		City     *domain.City    `json:"city"`
		Locality string          `json:"locality"`
		Products []domain.Product `json:"products"`
	}
	_ = json.Unmarshal(recCat.Body.Bytes(), &catOut)
	if catOut.Category.Slug != "birthday-decoration" || catOut.City == nil || catOut.City.Slug != "kolkata" {
		t.Fatalf("unexpected city category payload: %+v", catOut)
	}

	recLoc := httptest.NewRecorder()
	r.ServeHTTP(recLoc, httptest.NewRequest(http.MethodGet, "/categories/birthday-decoration/kolkata/salt-lake", nil))
	if recLoc.Code != http.StatusOK {
		t.Fatalf("GET /categories/birthday-decoration/kolkata/salt-lake failed: %d %s", recLoc.Code, recLoc.Body.String())
	}
	var locOut struct {
		Category domain.Category `json:"category"`
		City     *domain.City    `json:"city"`
		Locality string          `json:"locality"`
		Products []domain.Product `json:"products"`
	}
	_ = json.Unmarshal(recLoc.Body.Bytes(), &locOut)
	if locOut.Category.Slug != "birthday-decoration" || locOut.City == nil || locOut.City.Slug != "kolkata" || locOut.Locality != "salt-lake" || len(locOut.Products) == 0 {
		t.Fatalf("unexpected locality category payload: %+v", locOut)
	}

	// 8. GetPageBySlug resolves published pages & aliases, blocks unpublished drafts; ListSEORedirectsPublic exposes 301s
	recPg := httptest.NewRecorder()
	r.ServeHTTP(recPg, httptest.NewRequest(http.MethodGet, "/pages/terms-conditions", nil))
	if recPg.Code != http.StatusOK {
		t.Fatalf("expected 200 for aliased published CMS page, got %d", recPg.Code)
	}
	recDraft := httptest.NewRecorder()
	r.ServeHTTP(recDraft, httptest.NewRequest(http.MethodGet, "/pages/draft-page", nil))
	if recDraft.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unpublished CMS page, got %d", recDraft.Code)
	}
	recRed := httptest.NewRecorder()
	r.ServeHTTP(recRed, httptest.NewRequest(http.MethodGet, "/redirects", nil))
	if recRed.Code != http.StatusOK || !bytes.Contains(recRed.Body.Bytes(), []byte("/old-decor")) {
		t.Fatalf("expected redirects list, got %d %s", recRed.Code, recRed.Body.String())
	}

	// 9. GetCategoryBySlug resolves homepage tile groups from home_tiles_config
	recTiles := httptest.NewRecorder()
	r.ServeHTTP(recTiles, httptest.NewRequest(http.MethodGet, "/categories/shop-by-category", nil))
	if recTiles.Code != http.StatusOK || !bytes.Contains(recTiles.Body.Bytes(), []byte("Birthday")) {
		t.Fatalf("expected 200 tile array for /categories/shop-by-category, got %d %s", recTiles.Code, recTiles.Body.String())
	}

	// 10. GetSitemapByType returns typed entries and 404 on unknown types
	recSmProd := httptest.NewRecorder()
	r.ServeHTTP(recSmProd, httptest.NewRequest(http.MethodGet, "/sitemap/product", nil))
	if recSmProd.Code != http.StatusOK || !bytes.Contains(recSmProd.Body.Bytes(), []byte("/p/yellow-roses-with-cake")) {
		t.Fatalf("expected /sitemap/product entries, got %d %s", recSmProd.Code, recSmProd.Body.String())
	}
	recSmBlog := httptest.NewRecorder()
	r.ServeHTTP(recSmBlog, httptest.NewRequest(http.MethodGet, "/sitemap/blog", nil))
	if recSmBlog.Code != http.StatusOK || !bytes.Contains(recSmBlog.Body.Bytes(), []byte("/blog/top-10-themes")) {
		t.Fatalf("expected /sitemap/blog entries, got %d %s", recSmBlog.Code, recSmBlog.Body.String())
	}
	recSmInvalid := httptest.NewRecorder()
	r.ServeHTTP(recSmInvalid, httptest.NewRequest(http.MethodGet, "/sitemap/unknown", nil))
	if recSmInvalid.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown sitemap type, got %d", recSmInvalid.Code)
	}
}

