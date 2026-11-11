package public

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/handler"
	"github.com/giftlaya/giftlaya-api/internal/notify"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StorefrontHandler struct {
	pool       *pgxpool.Pool
	catalogSvc *service.CatalogService
	orderSvc   *service.OrderService
	phase2Svc  *service.Phase2Service
	phase3Svc  *service.Phase3Service
	tokens     *service.TokenManager
	notifier   notify.Notifier
}

func NewStorefrontHandler(
	pool *pgxpool.Pool,
	catalogSvc *service.CatalogService,
	orderSvc *service.OrderService,
	phase2Svc *service.Phase2Service,
	phase3Svc *service.Phase3Service,
	tokens *service.TokenManager,
	notifier notify.Notifier,
) *StorefrontHandler {
	return &StorefrontHandler{
		pool:       pool,
		catalogSvc: catalogSvc,
		orderSvc:   orderSvc,
		phase2Svc:  phase2Svc,
		phase3Svc:  phase3Svc,
		tokens:     tokens,
		notifier:   notifier,
	}
}

type HydratedHomeSection struct {
	domain.HomepageSection
	Products []domain.Product `json:"products,omitempty"`
}

// GetHome godoc
// @Summary Public Storefront Home payload (banners, ordered sections w/ slider_enabled, products, cities, FAQs, reviews)
// @Tags Public Storefront
// @Produce json
// @Param city_id query int false "Optional selected city ID"
// @Success 200 {object} map[string]any
// @Router /api/v1/public/home [get]
func (h *StorefrontHandler) GetHome(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	banners, _ := h.phase2Svc.ListHeroBanners(ctx, true)
	sections, _ := h.phase2Svc.ListHomepageSections(ctx, true)
	cities, _ := h.phase2Svc.ListCities(ctx, "", true)
	faqs, _ := h.phase3Svc.ListFAQs(ctx, "home")
	allApprovedReviews, _, _ := h.phase3Svc.ListReviews(ctx, "approved", 1, 100)
	reviews := make([]domain.Review, 0, len(allApprovedReviews))
	for _, rv := range allApprovedReviews {
		if rv.IsFeaturedHome {
			reviews = append(reviews, rv)
		}
	}
	if len(reviews) == 0 {
		for i := 0; i < len(allApprovedReviews) && i < 12; i++ {
			reviews = append(reviews, allApprovedReviews[i])
		}
	}
	allCats, _ := h.catalogSvc.ListCategories(ctx, "", "", false)

	catBySlug := map[string]int64{}
	for _, c := range allCats {
		catBySlug[c.Slug] = c.ID
	}

	var cityPtr *int64
	if cid, err := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64); err == nil && cid > 0 {
		cityPtr = &cid
	}

	hydrated := make([]HydratedHomeSection, 0, len(sections))
	for _, sec := range sections {
		hs := HydratedHomeSection{HomepageSection: sec}
		var cfg struct {
			Mode         string  `json:"mode"`
			CategorySlug string  `json:"category_slug"`
			ProductIDs   []int64 `json:"product_ids"`
			Limit        int     `json:"limit"`
		}
		_ = json.Unmarshal(sec.RuleConfigJSON, &cfg)
		lim := cfg.Limit
		if lim <= 0 || lim > 24 {
			lim = 12
		}

		if cfg.Mode == "manual" && len(cfg.ProductIDs) > 0 {
			for _, pid := range cfg.ProductIDs {
				id := pid
				if p, err := h.catalogSvc.GetProduct(ctx, &id, "", nil); err == nil && p.Status == "published" {
					hs.Products = append(hs.Products, *p)
				}
			}
		} else if cfg.CategorySlug != "" {
			if cid, ok := catBySlug[cfg.CategorySlug]; ok {
				prods, _, err := h.catalogSvc.ListProducts(ctx, domain.ProductListFilter{
					CategoryID: &cid,
					CityID:     cityPtr,
					Status:     "published",
					SortBy:     "popular",
					Page:       1,
					Limit:      lim,
				}, nil)
				if err == nil {
					hs.Products = prods
				}
			}
		}
		if len(hs.Products) == 0 && (sec.SectionType == "product_row" || sec.SectionType == "decor_grid") {
			bTrue := true
			prods, _, err := h.catalogSvc.ListProducts(ctx, domain.ProductListFilter{
				CityID: cityPtr,
				Status: "published",
				SortBy: "popular",
				Featured: func() *bool {
					if sec.SectionKey == "best_sellers" || sec.SectionKey == "featured" {
						return &bTrue
					}
					return nil
				}(),
				Page:  1,
				Limit: lim,
			}, nil)
			if err == nil {
				hs.Products = prods
			}
		}
		hydrated = append(hydrated, hs)
	}

	settingsRows, _ := h.phase3Svc.ListSiteSettings(ctx, "")
	settingsMap := map[string]json.RawMessage{}
	for _, st := range settingsRows {
		settingsMap[st.Key] = st.ValueJSON
	}

	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"banners":    banners,
		"sections":   hydrated,
		"cities":     cities,
		"categories": allCats,
		"reviews":    reviews,
		"faqs":       faqs,
		"settings":   settingsMap,
	})
}

func (h *StorefrontHandler) GetNavigation(w http.ResponseWriter, r *http.Request) {
	items, err := h.catalogSvc.ListNavigation(r.Context(), true)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

func (h *StorefrontHandler) ListCities(w http.ResponseWriter, r *http.Request) {
	cities, err := h.phase2Svc.ListCities(r.Context(), r.URL.Query().Get("search"), true)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, cities)
}

func (h *StorefrontHandler) CheckPincodeServiceability(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimSpace(chi.URLParam(r, "code"))
	var cityID int64
	var cityName, areaName string
	var baseFee, extraFee int
	var cutoff string
	var express, serviceable bool

	err := h.pool.QueryRow(r.Context(), `
		SELECT p.city_id, c.name, p.area_name, c.base_delivery_charge_paise, p.extra_charge_paise,
		       TO_CHAR(c.same_day_cutoff_time,'HH24:MI'), p.is_express_available, p.is_serviceable
		FROM pincodes p JOIN cities c ON c.id = p.city_id
		WHERE p.code = $1 AND c.is_active = TRUE
	`, code).Scan(&cityID, &cityName, &areaName, &baseFee, &extraFee, &cutoff, &express, &serviceable)
	if err != nil {
		handler.WriteJSON(w, http.StatusOK, map[string]any{"serviceable": false, "pincode": code})
		return
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"serviceable":        serviceable,
		"pincode":            code,
		"city_id":            cityID,
		"city_name":          cityName,
		"area_name":          areaName,
		"delivery_fee_paise": baseFee + extraFee,
		"cutoff_time":        cutoff,
		"express_available":  express,
	})
}

func (h *StorefrontHandler) GetAvailableSlots(w http.ResponseWriter, r *http.Request) {
	cityID, err := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64)
	date := strings.TrimSpace(r.URL.Query().Get("date"))
	cityLookup := strings.TrimSpace(r.URL.Query().Get("city_slug"))
	if cityLookup == "" {
		cityLookup = strings.TrimSpace(r.URL.Query().Get("city"))
	}
	if (err != nil || cityID <= 0) && cityLookup != "" && h.pool != nil {
		_ = h.pool.QueryRow(r.Context(), `
			SELECT id FROM cities
			WHERE is_active = TRUE AND (LOWER(slug) = LOWER($1) OR LOWER(name) = LOWER($1))
			LIMIT 1
		`, cityLookup).Scan(&cityID)
	}
	if cityID <= 0 {
		cityID = 1
	}

	ist, tzErr := time.LoadLocation("Asia/Kolkata")
	if tzErr != nil {
		ist = time.FixedZone("IST", 5*3600+30*60)
	}
	now := time.Now().In(ist)
	if date == "" {
		date = now.Format("2006-01-02")
	}

	var blockReason string
	var blockSameDay bool
	var surge int
	if h.pool != nil {
		_ = h.pool.QueryRow(r.Context(), `
			SELECT reason, block_same_day, extra_surge_paise
			FROM blackout_dates WHERE blackout_date=$1::DATE AND (city_id=$2 OR city_id IS NULL) LIMIT 1
		`, date, cityID).Scan(&blockReason, &blockSameDay, &surge)
	}

	var cityCutoff string
	cityMidnight := true
	if h.pool != nil {
		_ = h.pool.QueryRow(r.Context(), `
			SELECT TO_CHAR(same_day_cutoff_time,'HH24:MI'), midnight_available
			FROM cities WHERE id = $1
		`, cityID).Scan(&cityCutoff, &cityMidnight)
	}

	ledger, err := h.phase2Svc.ListSlotLedger(r.Context(), cityID, date)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	templates, _ := h.phase2Svc.ListTimeSlots(r.Context(), true)
	chargeByID := map[int64]int{}
	midnightByID := map[int64]bool{}
	startByID := map[int64]string{}
	endByID := map[int64]string{}
	for _, ts := range templates {
		chargeByID[ts.ID] = ts.ExtraChargePaise
		midnightByID[ts.ID] = ts.IsMidnight
		startByID[ts.ID] = ts.StartTime
		endByID[ts.ID] = ts.EndTime
	}

	isToday := date == now.Format("2006-01-02")
	cutoffPassed := false
	if isToday && cityCutoff != "" {
		if ct, pErr := time.Parse("15:04", cityCutoff); pErr == nil {
			cutTime := time.Date(now.Year(), now.Month(), now.Day(), ct.Hour(), ct.Minute(), 0, 0, ist)
			cutoffPassed = now.After(cutTime)
		}
	}

	out := make([]map[string]any, 0, len(ledger))
	for _, s := range ledger {
		remaining := s.MaxCapacity - s.ReservedCount
		isMid := midnightByID[s.SlotTemplateID]
		avail := !s.IsBlocked && remaining > 0 && !(isMid && !cityMidnight)
		if isToday && avail {
			if blockSameDay || cutoffPassed {
				avail = false
			} else if stStr := startByID[s.SlotTemplateID]; stStr != "" {
				if stParsed, pErr := time.Parse("15:04", stStr); pErr == nil {
					slotStart := time.Date(now.Year(), now.Month(), now.Day(), stParsed.Hour(), stParsed.Minute(), 0, 0, ist)
					if now.After(slotStart) {
						avail = false
					}
				}
			}
		}
		out = append(out, map[string]any{
			"slot_template_id":   s.SlotTemplateID,
			"label":              s.SlotLabel,
			"start_time":         startByID[s.SlotTemplateID],
			"end_time":           endByID[s.SlotTemplateID],
			"service_date":       s.ServiceDate,
			"remaining_capacity": remaining,
			"is_available":       avail,
			"is_midnight":        isMid,
			"extra_charge_paise": chargeByID[s.SlotTemplateID],
		})
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"city_id":            cityID,
		"date":               date,
		"cutoff_time":        cityCutoff,
		"midnight_available": cityMidnight,
		"blackout_reason":    blockReason,
		"block_same_day":     blockSameDay,
		"peak_surge_paise":   surge,
		"slots":              out,
	})
}

func (h *StorefrontHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	items, err := h.catalogSvc.ListCategories(r.Context(), r.URL.Query().Get("kind"), "", r.URL.Query().Get("tree") == "true")
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

func (h *StorefrontHandler) GetCategoryBySlug(w http.ResponseWriter, r *http.Request) {
	rawPath := strings.Trim(chi.URLParam(r, "*"), "/")
	if rawPath == "" {
		handler.WriteError(w, http.StatusBadRequest, "category slug required")
		return
	}
	ctx := r.Context()
	allCats, err := h.catalogSvc.ListCategories(ctx, "", "", false)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	byID := make(map[int64]domain.Category, len(allCats))
	bySlug := make(map[string]domain.Category, len(allCats))
	for _, c := range allCats {
		if c.IsActive {
			byID[c.ID] = c
			bySlug[strings.ToLower(c.Slug)] = c
		}
	}
	parts := strings.Split(strings.ToLower(rawPath), "/")
	lastSeg := parts[len(parts)-1]
	normalizeCitySlug := func(s string) string {
		if s == "bhubaneshwar" {
			return "bhubaneswar"
		}
		return s
	}
	var matchedCity *domain.City
	var cityIDPtr *int64
	var localitySlug string
	if cid, cidErr := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64); cidErr == nil && cid > 0 {
		cityIDPtr = &cid
	}

	cat, ok := bySlug[strings.ToLower(rawPath)]
	if !ok && len(parts) >= 2 && h.phase2Svc != nil {
		if cities, cErr := h.phase2Svc.ListCities(ctx, "", true); cErr == nil {
			findCity := func(seg string) *domain.City {
				norm := normalizeCitySlug(seg)
				for i := range cities {
					if strings.EqualFold(cities[i].Slug, norm) {
						cCopy := cities[i]
						return &cCopy
					}
				}
				return nil
			}
			if mc := findCity(lastSeg); mc != nil {
				matchedCity = mc
				if cityIDPtr == nil {
					id := mc.ID
					cityIDPtr = &id
				}
				prefixParts := parts[:len(parts)-1]
				prefixSlug := strings.Join(prefixParts, "/")
				if cFound, fOk := bySlug[prefixSlug]; fOk {
					cat, ok = cFound, true
				} else if len(prefixParts) > 0 {
					if cFound, fOk := bySlug[prefixParts[len(prefixParts)-1]]; fOk {
						cat, ok = cFound, true
					}
				}
			} else if len(parts) >= 3 {
				if mc := findCity(parts[len(parts)-2]); mc != nil {
					matchedCity = mc
					localitySlug = lastSeg
					if cityIDPtr == nil {
						id := mc.ID
						cityIDPtr = &id
					}
					prefixParts := parts[:len(parts)-2]
					prefixSlug := strings.Join(prefixParts, "/")
					if cFound, fOk := bySlug[prefixSlug]; fOk {
						cat, ok = cFound, true
					} else if len(prefixParts) > 0 {
						if cFound, fOk := bySlug[prefixParts[len(prefixParts)-1]]; fOk {
							cat, ok = cFound, true
						}
					}
				}
			}
		}
	}
	if !ok {
		for idx := len(parts) - 1; idx >= 0; idx-- {
			cand := strings.Join(parts[:idx+1], "/")
			if cFound, fOk := bySlug[cand]; fOk {
				cat, ok = cFound, true
				break
			}
			if cFound, fOk := bySlug[parts[idx]]; fOk {
				cat, ok = cFound, true
				break
			}
		}
	}
	if !ok && h.phase3Svc != nil {
		if settings, sErr := h.phase3Svc.ListSiteSettings(ctx, ""); sErr == nil {
			for _, st := range settings {
				if st.Key == "home_tiles_config" && len(st.ValueJSON) > 0 {
					var tilesMap map[string]json.RawMessage
					if json.Unmarshal(st.ValueJSON, &tilesMap) == nil {
						if rawTiles, found := tilesMap[strings.ToLower(rawPath)]; found && len(rawTiles) > 0 {
							var arr []any
							if json.Unmarshal(rawTiles, &arr) == nil {
								handler.WriteJSON(w, http.StatusOK, arr)
								return
							}
						}
					}
					break
				}
			}
		}
	}
	if !ok {
		handler.WriteError(w, http.StatusNotFound, "category not found")
		return
	}

	sortBy := r.URL.Query().Get("sort_by")
	var catPageCfg json.RawMessage
	if sortBy == "" {
		sortBy = "popular"
	}
	if h.phase3Svc != nil {
		cfgSettings, _ := h.phase3Svc.ListSiteSettings(ctx, "content")
		for _, st := range cfgSettings {
			if st.Key == "category_page_config" {
				catPageCfg = st.ValueJSON
				var parsed struct {
					DefaultSort string `json:"default_sort"`
				}
				if json.Unmarshal(st.ValueJSON, &parsed) == nil && parsed.DefaultSort != "" && r.URL.Query().Get("sort_by") == "" {
					sortBy = parsed.DefaultSort
				}
			}
		}
	}

	prods, _, err := h.catalogSvc.ListProducts(ctx, domain.ProductListFilter{
		CategoryID: &cat.ID,
		CityID:     cityIDPtr,
		Status:     "published",
		SortBy:     sortBy,
		Page:       1,
		Limit:      60,
	}, nil)
	if err != nil {
		prods = []domain.Product{}
	}
	if len(prods) == 0 {
		visited := map[int64]bool{cat.ID: true}
		curParent := cat.ParentID
		for hops := 0; hops < 5 && curParent != nil && !visited[*curParent]; hops++ {
			visited[*curParent] = true
			if parentProds, _, perr := h.catalogSvc.ListProducts(ctx, domain.ProductListFilter{
				CategoryID: curParent,
				CityID:     cityIDPtr,
				Status:     "published",
				SortBy:     sortBy,
				Page:       1,
				Limit:      60,
			}, nil); perr == nil && len(parentProds) > 0 {
				prods = parentProds
				break
			}
			if pc, found := byID[*curParent]; found {
				curParent = pc.ParentID
			} else {
				break
			}
		}
	}
	if len(prods) == 0 {
		fallbackType := ""
		if cat.Kind == "decoration" {
			fallbackType = "decoration_package"
		}
		if typeProds, _, ferr := h.catalogSvc.ListProducts(ctx, domain.ProductListFilter{
			ProductType: fallbackType,
			CityID:      cityIDPtr,
			Status:      "published",
			SortBy:      sortBy,
			Page:        1,
			Limit:       24,
		}, nil); ferr == nil {
			prods = typeProds
		}
	}

	related := []domain.Category{}
	for _, c := range allCats {
		if !c.IsActive || c.ID == cat.ID {
			continue
		}
		if c.ParentID != nil && *c.ParentID == cat.ID {
			related = append(related, c)
		}
	}
	if len(related) == 0 {
		for _, c := range allCats {
			if c.IsActive && c.ID != cat.ID && c.Kind == cat.Kind && c.ParentID == cat.ParentID {
				related = append(related, c)
			}
		}
	}

	var parentCat *domain.Category
	if cat.ParentID != nil {
		if pc, found := byID[*cat.ParentID]; found {
			parentCat = &pc
		}
	}

	var reviews []domain.Review
	var faqs []domain.FAQ
	if h.phase3Svc != nil {
		reviews, _, _ = h.phase3Svc.ListReviews(ctx, "approved", 1, 12)
		faqs, _ = h.phase3Svc.ListFAQs(ctx, "home")
	}
	if reviews == nil {
		reviews = []domain.Review{}
	}
	if faqs == nil {
		faqs = []domain.FAQ{}
	}

	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"category":    cat,
		"city":        matchedCity,
		"locality":    localitySlug,
		"parent":      parentCat,
		"related":     related,
		"products":    prods,
		"reviews":     reviews,
		"faqs":        faqs,
		"page_config": catPageCfg,
	})
}

func (h *StorefrontHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 24
	}
	sortBy := q.Get("sort_by")
	if sortBy == "" {
		sortBy = "popular"
	}
	f := domain.ProductListFilter{
		Search:      q.Get("search"),
		ProductType: q.Get("product_type"),
		Status:      "published",
		SortBy:      sortBy,
		Page:        page,
		Limit:       limit,
	}
	if cid, err := strconv.ParseInt(q.Get("category_id"), 10, 64); err == nil && cid > 0 {
		f.CategoryID = &cid
	} else if catSlug := q.Get("category_slug"); catSlug != "" {
		var catID int64
		if err := h.pool.QueryRow(r.Context(), `SELECT id FROM categories WHERE slug=$1 AND deleted_at IS NULL`, catSlug).Scan(&catID); err == nil {
			f.CategoryID = &catID
		}
	}
	if cityID, err := strconv.ParseInt(q.Get("city_id"), 10, 64); err == nil && cityID > 0 {
		f.CityID = &cityID
	}

	items, total, err := h.catalogSvc.ListProducts(r.Context(), f, nil)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *StorefrontHandler) GetProductBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	p, err := h.catalogSvc.GetProduct(r.Context(), nil, slug, nil)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	if p.Status != "published" {
		handler.WriteError(w, http.StatusNotFound, "product not found")
		return
	}
	if cid, err := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64); err == nil && cid > 0 {
		for _, ov := range p.CityOverrides {
			if ov.CityID == cid {
				if ov.PriceOverridePaise != nil && *ov.PriceOverridePaise > 0 {
					p.SellingPricePaise = *ov.PriceOverridePaise
					if p.MRPPaise > p.SellingPricePaise {
						p.DiscountPercent = int(((p.MRPPaise - p.SellingPricePaise) * 100) / p.MRPPaise)
					} else {
						p.DiscountPercent = 0
					}
				}
				break
			}
		}
	}
	if len(p.CategoryIDs) > 0 {
		if rel, _, relErr := h.catalogSvc.ListProducts(r.Context(), domain.ProductListFilter{
			CategoryID: &p.CategoryIDs[0], Status: "published", SortBy: "popular", Page: 1, Limit: 12,
		}, nil); relErr == nil {
			for _, item := range rel {
				if item.ID != p.ID && len(p.SimilarProducts) < 8 {
					p.SimilarProducts = append(p.SimilarProducts, item)
				}
			}
		}
	}
	if len(p.SimilarProducts) < 4 {
		if relType, _, relErr := h.catalogSvc.ListProducts(r.Context(), domain.ProductListFilter{
			ProductType: p.ProductType, Status: "published", SortBy: "popular", Page: 1, Limit: 12,
		}, nil); relErr == nil {
			seen := map[int64]bool{p.ID: true}
			for _, sp := range p.SimilarProducts {
				seen[sp.ID] = true
			}
			for _, item := range relType {
				if !seen[item.ID] && len(p.SimilarProducts) < 8 {
					seen[item.ID] = true
					p.SimilarProducts = append(p.SimilarProducts, item)
				}
			}
		}
	}
	if alsoPool, _, alsoErr := h.catalogSvc.ListProducts(r.Context(), domain.ProductListFilter{
		Status: "published", SortBy: "popular", Page: 1, Limit: 32,
	}, nil); alsoErr == nil {
		excluded := map[int64]bool{p.ID: true}
		for _, sp := range p.SimilarProducts {
			excluded[sp.ID] = true
		}
		for _, item := range alsoPool {
			if !excluded[item.ID] && item.ProductType != p.ProductType && len(p.YouMayAlsoLike) < 8 {
				excluded[item.ID] = true
				p.YouMayAlsoLike = append(p.YouMayAlsoLike, item)
			}
		}
		for _, item := range alsoPool {
			if !excluded[item.ID] && len(p.YouMayAlsoLike) < 8 {
				excluded[item.ID] = true
				p.YouMayAlsoLike = append(p.YouMayAlsoLike, item)
			}
		}
	}
	if len(p.YouMayAlsoLike) == 0 && len(p.SimilarProducts) > 0 {
		p.YouMayAlsoLike = p.SimilarProducts
	}
	handler.WriteJSON(w, http.StatusOK, p)
}

// ValidateCoupon godoc
// @Summary Validate promo code against cart subtotal & city
// @Tags Public Storefront
// @Accept json
// @Produce json
// @Success 200 {object} map[string]any
// @Router /api/v1/public/coupons/validate [post]
func (h *StorefrontHandler) ValidateCoupon(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code          string `json:"code" validate:"required"`
		SubtotalPaise int64  `json:"subtotal_paise" validate:"required,min=1"`
		CityID        *int64 `json:"city_id"`
	}
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	coupons, err := h.phase2Svc.ListCoupons(r.Context(), strings.ToUpper(req.Code))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	now := time.Now()
	for _, c := range coupons {
		if strings.EqualFold(c.Code, req.Code) && c.IsActive && !now.Before(c.ValidFrom) && !now.After(c.ValidUntil) {
			if c.TotalUsageLimit != nil && c.UsedCount >= *c.TotalUsageLimit {
				break
			}
			if len(c.ApplicableCityIDs) > 0 && req.CityID != nil {
				allowed := false
				for _, cid := range c.ApplicableCityIDs {
					if cid == *req.CityID {
						allowed = true
						break
					}
				}
				if !allowed {
					break
				}
			}
			if req.SubtotalPaise < c.MinCartPaise {
				handler.WriteError(w, http.StatusUnprocessableEntity, fmt.Sprintf("Minimum order Rs %.0f required", float64(c.MinCartPaise)/100))
				return
			}
			var disc int64
			if c.DiscountType == "flat" {
				disc = int64(c.DiscountValue) * 100
			} else {
				disc = (req.SubtotalPaise * int64(c.DiscountValue)) / 100
				if c.MaxDiscountPaise != nil && disc > *c.MaxDiscountPaise {
					disc = *c.MaxDiscountPaise
				}
			}
			if disc > req.SubtotalPaise {
				disc = req.SubtotalPaise
			}
			handler.WriteJSON(w, http.StatusOK, map[string]any{
				"valid":          true,
				"code":           c.Code,
				"discount_paise": disc,
				"description":    c.Description,
			})
			return
		}
	}
	handler.WriteError(w, http.StatusUnprocessableEntity, domain.ErrInvalidCoupon.Error())
}

// CreateOrder godoc
// @Summary Place public storefront order inside DB transaction with FOR UPDATE inventory & slot locking
// @Tags Public Storefront
// @Accept json
// @Produce json
// @Param payload body domain.CreateOrderInput true "Order payload"
// @Success 201 {object} domain.Order
// @Router /api/v1/public/orders [post]
func (h *StorefrontHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var in domain.CreateOrderInput
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	in.IsManual = false
	o, err := h.orderSvc.CreateOrder(r.Context(), in, nil, "", "")
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, o)
}

func (h *StorefrontHandler) GetOrderByNumber(w http.ResponseWriter, r *http.Request) {
	num := chi.URLParam(r, "orderNumber")
	o, err := h.orderSvc.GetOrder(r.Context(), nil, num, nil)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, o)
}

func normalizeOTPTarget(channel, raw string) string {
	trimmed := strings.TrimSpace(raw)
	if channel == "email" {
		return strings.ToLower(trimmed)
	}
	var digits strings.Builder
	for _, ch := range trimmed {
		if ch >= '0' && ch <= '9' {
			digits.WriteRune(ch)
		}
	}
	s := digits.String()
	if len(s) >= 10 {
		return s[len(s)-10:]
	}
	return trimmed
}

func (h *StorefrontHandler) RequestOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Channel string `json:"channel" validate:"required,oneof=sms whatsapp email"`
		Target  string `json:"target" validate:"required"`
	}
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	target := normalizeOTPTarget(req.Channel, req.Target)
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	otp := fmt.Sprintf("%06d", n.Int64()+100000)
	sum := sha256.Sum256([]byte(otp))
	hash := hex.EncodeToString(sum[:])

	_, err := h.pool.Exec(r.Context(), `
		INSERT INTO customer_otps (channel, target, otp_hash, expires_at)
		VALUES ($1, $2, $3, $4)
	`, req.Channel, target, hash, time.Now().Add(10*time.Minute))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	if h.notifier != nil {
		_ = h.notifier.Send(r.Context(), notify.Message{
			Channel: req.Channel, To: target, Subject: "Giftlaya OTP", Body: "Your Giftlaya login OTP is " + otp,
		})
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"message": "OTP sent",
		"dev_otp": otp, // Exposed only in local dev helper; remove/suppress in production
	})
}

func (h *StorefrontHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Channel string `json:"channel" validate:"required,oneof=sms whatsapp email"`
		Target  string `json:"target" validate:"required"`
		OTP     string `json:"otp" validate:"required"`
		Name    string `json:"name"`
	}
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	target := normalizeOTPTarget(req.Channel, req.Target)
	sum := sha256.Sum256([]byte(strings.TrimSpace(req.OTP)))
	hash := hex.EncodeToString(sum[:])

	var otpID int64
	err := h.pool.QueryRow(r.Context(), `
		SELECT id FROM customer_otps
		WHERE channel=$1 AND target=$2 AND otp_hash=$3 AND verified_at IS NULL AND expires_at > NOW()
		ORDER BY id DESC LIMIT 1
	`, req.Channel, target, hash).Scan(&otpID)
	if err != nil {
		handler.WriteError(w, http.StatusUnauthorized, "invalid or expired OTP")
		return
	}
	_, _ = h.pool.Exec(r.Context(), `UPDATE customer_otps SET verified_at=NOW() WHERE id=$1`, otpID)

	var custID int64
	var custName string
	var custPhone, custEmail string
	var custCreatedAt time.Time
	var isBlocked bool
	if req.Channel == "email" {
		err = h.pool.QueryRow(r.Context(), `
			INSERT INTO customers (email, name) VALUES ($1, $2)
			ON CONFLICT (email) DO UPDATE SET name=COALESCE(NULLIF($2, ''), customers.name), updated_at=NOW()
			RETURNING id, name, COALESCE(phone,''), COALESCE(email,''), created_at, is_blocked
		`, target, strings.TrimSpace(req.Name)).Scan(&custID, &custName, &custPhone, &custEmail, &custCreatedAt, &isBlocked)
	} else {
		err = h.pool.QueryRow(r.Context(), `
			INSERT INTO customers (phone, name) VALUES ($1, $2)
			ON CONFLICT (phone) DO UPDATE SET name=COALESCE(NULLIF($2, ''), customers.name), updated_at=NOW()
			RETURNING id, name, COALESCE(phone,''), COALESCE(email,''), created_at, is_blocked
		`, target, strings.TrimSpace(req.Name)).Scan(&custID, &custName, &custPhone, &custEmail, &custCreatedAt, &isBlocked)
	}
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	if isBlocked {
		handler.WriteError(w, http.StatusForbidden, "customer account is suspended")
		return
	}
	var hasWelcome bool
	_ = h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM coin_transactions WHERE customer_id=$1 AND note LIKE 'Welcome bonus%')`, custID).Scan(&hasWelcome)
	if !hasWelcome {
		_, _ = h.pool.Exec(r.Context(), `
			INSERT INTO coin_wallets (customer_id, balance_coins) VALUES ($1, 100)
			ON CONFLICT (customer_id) DO UPDATE SET balance_coins = coin_wallets.balance_coins + 100, updated_at = NOW()
		`, custID)
		_, _ = h.pool.Exec(r.Context(), `
			INSERT INTO coin_transactions (customer_id, delta, tx_type, note)
			VALUES ($1, 100, 'earn', 'Welcome bonus on Giftlaya sign-up')
		`, custID)
	} else {
		_, _ = h.pool.Exec(r.Context(), `INSERT INTO coin_wallets (customer_id, balance_coins) VALUES ($1, 0) ON CONFLICT DO NOTHING`, custID)
	}
	if custPhone != "" {
		_, _ = h.pool.Exec(r.Context(), `
			UPDATE orders SET customer_id = $1
			WHERE (customer_id IS NULL OR customer_id IN (
				SELECT id FROM customers WHERE id <> $1 AND RIGHT(REGEXP_REPLACE(COALESCE(phone,''), '\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE($2, '\D', '', 'g'), 10)
			))
			  AND RIGHT(REGEXP_REPLACE(recipient_phone, '\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE($2, '\D', '', 'g'), 10)
			  AND LENGTH(REGEXP_REPLACE($2, '\D', '', 'g')) >= 10
		`, custID, custPhone)
	}
	var coins int
	_ = h.pool.QueryRow(r.Context(), `SELECT balance_coins FROM coin_wallets WHERE customer_id=$1`, custID).Scan(&coins)

	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"customer": map[string]any{
			"id":            custID,
			"name":          custName,
			"phone":         custPhone,
			"email":         custEmail,
			"target":        target,
			"coins_balance": coins,
			"created_at":    custCreatedAt,
		},
	})
}

func (h *StorefrontHandler) ListBlogs(w http.ResponseWriter, r *http.Request) {
	posts, err := h.phase3Svc.ListBlogPosts(r.Context(), "published")
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	cats, _ := h.phase3Svc.ListBlogCategories(r.Context())
	handler.WriteJSON(w, http.StatusOK, map[string]any{"posts": posts, "categories": cats})
}

func (h *StorefrontHandler) GetRecentWorks(w http.ResponseWriter, r *http.Request) {
	items, err := h.phase3Svc.ListRecentWorks(r.Context(), r.URL.Query().Get("category_slug"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

func (h *StorefrontHandler) GetPublicSettings(w http.ResponseWriter, r *http.Request) {
	items, err := h.phase3Svc.ListSiteSettings(r.Context(), "")
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	out := map[string]json.RawMessage{}
	for _, st := range items {
		out[st.Key] = st.ValueJSON
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

func (h *StorefrontHandler) GetSitemapXML(w http.ResponseWriter, r *http.Request) {
	xmlStr, err := h.phase3Svc.GenerateSitemapXML(r.Context(), r.URL.Query().Get("base_url"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(xmlStr))
}

// SubmitInquiry godoc
// @Summary Submit contact, callback, product inquiry, franchise or seller request
// @Tags Public Storefront
// @Accept json
// @Produce json
// @Param payload body domain.ContactInquiry true "Inquiry"
// @Success 201 {object} domain.ContactInquiry
// @Router /api/v1/public/inquiries [post]
func (h *StorefrontHandler) SubmitInquiry(w http.ResponseWriter, r *http.Request) {
	var in domain.ContactInquiry
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	meta := in.Metadata
	if len(meta) == 0 {
		meta = json.RawMessage("{}")
	}
	it := in.InquiryType
	if it == "" {
		it = "contact"
	}
	var out domain.ContactInquiry
	err := h.pool.QueryRow(r.Context(), `
		INSERT INTO contact_inquiries (inquiry_type, name, phone, email, city, subject, message, metadata, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new')
		RETURNING id, inquiry_type, name, phone, email, city, subject, message, metadata, status, assigned_admin_id, created_at
	`, it, in.Name, in.Phone, in.Email, in.City, in.Subject, in.Message, meta).Scan(
		&out.ID, &out.InquiryType, &out.Name, &out.Phone, &out.Email, &out.City, &out.Subject, &out.Message, &out.Metadata, &out.Status, &out.AssignedAdminID, &out.CreatedAt,
	)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

func (h *StorefrontHandler) GetPageBySlug(w http.ResponseWriter, r *http.Request) {
	slug := strings.Trim(strings.ToLower(chi.URLParam(r, "slug")), "/")
	aliases := map[string]string{
		"terms-conditions":    "terms-and-conditions",
		"cancellation-policy": "cancellation-and-return",
		"about":               "about-us",
	}
	altSlug := aliases[slug]
	pages, err := h.phase3Svc.ListCMSPages(r.Context(), "")
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	for _, p := range pages {
		if !p.IsPublished {
			continue
		}
		if strings.EqualFold(p.Slug, slug) || (altSlug != "" && strings.EqualFold(p.Slug, altSlug)) {
			handler.WriteJSON(w, http.StatusOK, p)
			return
		}
	}
	handler.WriteError(w, http.StatusNotFound, "page not found")
}

func (h *StorefrontHandler) ListPagesPublic(w http.ResponseWriter, r *http.Request) {
	pages, err := h.phase3Svc.ListCMSPages(r.Context(), r.URL.Query().Get("page_type"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	out := make([]domain.CMSPage, 0, len(pages))
	for _, p := range pages {
		if p.IsPublished {
			out = append(out, p)
		}
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

func (h *StorefrontHandler) ListSEORedirectsPublic(w http.ResponseWriter, r *http.Request) {
	items, err := h.phase3Svc.ListSEORedirects(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

func (h *StorefrontHandler) ListCustomerOrders(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || custID <= 0 {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	ctx := r.Context()
	orders, total, err := h.orderSvc.ListOrders(ctx, domain.OrderListFilter{
		CustomerID: &custID,
		Page:       1,
		Limit:      50,
	}, nil)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	type orderOut struct {
		domain.Order
		PrimaryImageURL string `json:"primary_image_url,omitempty"`
	}
	out := make([]orderOut, 0, len(orders))
	for _, o := range orders {
		oid := o.ID
		if full, gErr := h.orderSvc.GetOrder(ctx, &oid, "", nil); gErr == nil && full != nil {
			o = *full
		}
		var imgURL string
		if h.pool != nil && len(o.Items) > 0 && o.Items[0].ProductID > 0 {
			_ = h.pool.QueryRow(ctx, `SELECT COALESCE((SELECT url FROM product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1), '')`, o.Items[0].ProductID).Scan(&imgURL)
		}
		out = append(out, orderOut{Order: o, PrimaryImageURL: imgURL})
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{"items": out, "total": total})
}

func (h *StorefrontHandler) loadCustomerAddresses(r *http.Request, custID int64) []map[string]any {
	out := []map[string]any{}
	if h.pool == nil {
		return out
	}
	rows, err := h.pool.Query(r.Context(), `
		SELECT ca.id, ca.label, ca.recipient_name, ca.recipient_phone, ca.address_line1, ca.address_line2, ca.landmark, COALESCE(NULLIF(ca.city_name, ''), COALESCE(c.name, '')), ca.pincode, ca.is_default
		FROM customer_addresses ca
		LEFT JOIN cities c ON c.id = ca.city_id
		WHERE ca.customer_id = $1
		ORDER BY ca.is_default DESC, ca.id DESC
	`, custID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var label, fullName, phone, flat, area, landmark, cityName, pincode string
		var isDefault bool
		if rows.Scan(&id, &label, &fullName, &phone, &flat, &area, &landmark, &cityName, &pincode, &isDefault) == nil {
			out = append(out, map[string]any{
				"id":         strconv.FormatInt(id, 10),
				"db_id":      id,
				"type":       strings.ToLower(label),
				"label":      label,
				"fullName":   fullName,
				"phone":      phone,
				"flat":       flat,
				"area":       area,
				"landmark":   landmark,
				"city":       cityName,
				"pincode":    pincode,
				"is_default": isDefault,
			})
		}
	}
	return out
}

func (h *StorefrontHandler) GetCustomerProfile(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || custID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	var name, phone, email string
	var createdAt time.Time
	var isBlocked bool
	err = h.pool.QueryRow(r.Context(), `
		SELECT name, COALESCE(phone,''), COALESCE(email,''), created_at, is_blocked
		FROM customers WHERE id = $1 AND deleted_at IS NULL
	`, custID).Scan(&name, &phone, &email, &createdAt, &isBlocked)
	if err != nil {
		handler.WriteError(w, http.StatusNotFound, "customer not found")
		return
	}
	var coins int
	_ = h.pool.QueryRow(r.Context(), `SELECT COALESCE(balance_coins, 0) FROM coin_wallets WHERE customer_id=$1`, custID).Scan(&coins)

	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"id":            custID,
		"name":          name,
		"phone":         phone,
		"email":         email,
		"coins_balance": coins,
		"created_at":    createdAt,
		"is_blocked":    isBlocked,
		"addresses":     h.loadCustomerAddresses(r, custID),
	})
}

func (h *StorefrontHandler) UpdateCustomerProfile(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || custID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	var req struct {
		Name  string `json:"name"`
		Phone string `json:"phone"`
		Email string `json:"email"`
	}
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	cleanName := strings.TrimSpace(req.Name)
	var phonePtr, emailPtr *string
	if p := normalizeOTPTarget("sms", req.Phone); p != "" {
		phonePtr = &p
	}
	if em := normalizeOTPTarget("email", req.Email); em != "" {
		emailPtr = &em
	}
	var outName, outPhone, outEmail string
	var createdAt time.Time
	err = h.pool.QueryRow(r.Context(), `
		UPDATE customers
		SET name = COALESCE(NULLIF($2,''), name),
		    phone = COALESCE($3, phone),
		    email = COALESCE($4, email),
		    updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING name, COALESCE(phone,''), COALESCE(email,''), created_at
	`, custID, cleanName, phonePtr, emailPtr).Scan(&outName, &outPhone, &outEmail, &createdAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			handler.WriteError(w, http.StatusConflict, "phone or email already belongs to another account")
			return
		}
		handler.WriteError(w, http.StatusNotFound, "customer not found")
		return
	}
	var coins int
	_ = h.pool.QueryRow(r.Context(), `SELECT COALESCE(balance_coins, 0) FROM coin_wallets WHERE customer_id=$1`, custID).Scan(&coins)
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"id":            custID,
		"name":          outName,
		"phone":         outPhone,
		"email":         outEmail,
		"coins_balance": coins,
		"created_at":    createdAt,
	})
}

func (h *StorefrontHandler) SaveCustomerAddress(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || custID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	var addrID int64
	if rawAID := chi.URLParam(r, "addrId"); rawAID != "" {
		addrID, _ = strconv.ParseInt(rawAID, 10, 64)
	}
	var req struct {
		Type      string `json:"type"`
		Label     string `json:"label"`
		FullName  string `json:"fullName" validate:"required"`
		Phone     string `json:"phone" validate:"required"`
		Flat      string `json:"flat" validate:"required"`
		Area      string `json:"area" validate:"required"`
		Landmark  string `json:"landmark"`
		City      string `json:"city" validate:"required"`
		Pincode   string `json:"pincode" validate:"required"`
		IsDefault bool   `json:"is_default"`
	}
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	label := strings.TrimSpace(req.Label)
	if label == "" {
		label = strings.TrimSpace(req.Type)
	}
	if label == "" {
		label = "home"
	}
	cityName := strings.TrimSpace(req.City)
	var cityID *int64
	var cid int64
	if h.pool.QueryRow(r.Context(), `SELECT id FROM cities WHERE LOWER(name) = LOWER($1) LIMIT 1`, cityName).Scan(&cid) == nil && cid > 0 {
		cityID = &cid
	}
	if addrID > 0 {
		_, err = h.pool.Exec(r.Context(), `
			UPDATE customer_addresses
			SET label=$1, recipient_name=$2, recipient_phone=$3, address_line1=$4, address_line2=$5, landmark=$6, city_id=$7, city_name=$8, pincode=$9, is_default=$10, updated_at=NOW()
			WHERE id=$11 AND customer_id=$12
		`, label, strings.TrimSpace(req.FullName), strings.TrimSpace(req.Phone), strings.TrimSpace(req.Flat), strings.TrimSpace(req.Area), strings.TrimSpace(req.Landmark), cityID, cityName, strings.TrimSpace(req.Pincode), req.IsDefault, addrID, custID)
	} else {
		_, err = h.pool.Exec(r.Context(), `
			INSERT INTO customer_addresses (customer_id, label, recipient_name, recipient_phone, address_line1, address_line2, landmark, city_id, city_name, pincode, is_default)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		`, custID, label, strings.TrimSpace(req.FullName), strings.TrimSpace(req.Phone), strings.TrimSpace(req.Flat), strings.TrimSpace(req.Area), strings.TrimSpace(req.Landmark), cityID, cityName, strings.TrimSpace(req.Pincode), req.IsDefault)
	}
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, h.loadCustomerAddresses(r, custID))
}

func (h *StorefrontHandler) DeleteCustomerAddress(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	addrID, err2 := strconv.ParseInt(chi.URLParam(r, "addrId"), 10, 64)
	if err != nil || err2 != nil || custID <= 0 || addrID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer or address id")
		return
	}
	_, _ = h.pool.Exec(r.Context(), `DELETE FROM customer_addresses WHERE id=$1 AND customer_id=$2`, addrID, custID)
	handler.WriteJSON(w, http.StatusOK, h.loadCustomerAddresses(r, custID))
}

func (h *StorefrontHandler) GetCustomerCoins(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || custID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	ctx := r.Context()
	var balance int
	_ = h.pool.QueryRow(ctx, `SELECT COALESCE(balance_coins, 0) FROM coin_wallets WHERE customer_id=$1`, custID).Scan(&balance)

	earnPct, maxRedeemPct := 10, 25
	if h.phase3Svc != nil {
		if sets, sErr := h.phase3Svc.ListSiteSettings(ctx, "commerce"); sErr == nil {
			for _, st := range sets {
				if st.Key == "coins_config" {
					var cfg struct {
						EarnPercent      int `json:"earn_percent"`
						MaxRedeemPercent int `json:"max_redeem_percent"`
					}
					if json.Unmarshal(st.ValueJSON, &cfg) == nil {
						if cfg.EarnPercent > 0 {
							earnPct = cfg.EarnPercent
						}
						if cfg.MaxRedeemPercent > 0 {
							maxRedeemPct = cfg.MaxRedeemPercent
						}
					}
				}
			}
		}
	}

	txRows, qErr := h.pool.Query(ctx, `
		SELECT ct.id, ct.delta, ct.tx_type, ct.note, COALESCE(o.order_number, ''), ct.created_at
		FROM coin_transactions ct
		LEFT JOIN orders o ON o.id = ct.order_id
		WHERE ct.customer_id = $1
		ORDER BY ct.id DESC LIMIT 100
	`, custID)
	type txItem struct {
		ID           int64     `json:"id"`
		Delta        int       `json:"delta"`
		TxType       string    `json:"tx_type"`
		Note         string    `json:"note"`
		OrderNumber  string    `json:"order_number,omitempty"`
		CreatedAt    time.Time `json:"created_at"`
		BalanceAfter int       `json:"balance_after"`
	}
	var list []txItem
	earnedTotal, redeemedTotal := 0, 0
	if qErr == nil {
		defer txRows.Close()
		for txRows.Next() {
			var it txItem
			if txRows.Scan(&it.ID, &it.Delta, &it.TxType, &it.Note, &it.OrderNumber, &it.CreatedAt) == nil {
				if it.Delta > 0 {
					earnedTotal += it.Delta
				} else if it.Delta < 0 {
					redeemedTotal += -it.Delta
				}
				list = append(list, it)
			}
		}
	}
	// Compute running balance_after descending from current wallet balance
	running := balance
	for i := range list {
		list[i].BalanceAfter = running
		running -= list[i].Delta
	}

	var pendingOrders int
	var pendingSubtotal int64
	_ = h.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(subtotal_paise), 0)
		FROM orders
		WHERE customer_id=$1 AND deleted_at IS NULL AND status NOT IN ('delivered','cancelled','refunded')
	`, custID).Scan(&pendingOrders, &pendingSubtotal)
	pendingCoins := int(pendingSubtotal/100) * earnPct / 100

	if list == nil {
		list = []txItem{}
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"balance_coins":        balance,
		"earned_total":         earnedTotal,
		"redeemed_total":       redeemedTotal,
		"pending_coins":        pendingCoins,
		"pending_orders_count": pendingOrders,
		"earn_percent":         earnPct,
		"max_redeem_percent":   maxRedeemPct,
		"transactions":         list,
	})
}

func (h *StorefrontHandler) ListCustomerTickets(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || custID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	rows, err := h.pool.Query(r.Context(), `
		SELECT st.id, st.ticket_number, st.source_type, st.customer_id, st.order_id, COALESCE(o.order_number, ''), st.subject, st.status, st.priority, st.messages_json, st.created_at, st.updated_at
		FROM support_tickets st
		LEFT JOIN orders o ON o.id = st.order_id
		WHERE st.customer_id = $1
		ORDER BY st.id DESC LIMIT 50
	`, custID)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id int64
		var num, src, orderNum, subj, st, prio string
		var cID, oID *int64
		var msgs json.RawMessage
		var cAt, uAt time.Time
		if rows.Scan(&id, &num, &src, &cID, &oID, &orderNum, &subj, &st, &prio, &msgs, &cAt, &uAt) == nil {
			out = append(out, map[string]any{
				"id": id, "ticket_number": num, "source_type": src, "customer_id": cID,
				"order_id": oID, "order_number": orderNum, "subject": subj, "status": st,
				"priority": prio, "messages_json": msgs, "created_at": cAt, "updated_at": uAt,
			})
		}
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

func (h *StorefrontHandler) CreateCustomerTicket(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || custID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	var req struct {
		Category    string `json:"category" validate:"required"`
		Message     string `json:"message" validate:"required,min=5"`
		OrderNumber string `json:"order_number"`
		Email       string `json:"email"`
	}
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	var orderID *int64
	if onum := strings.TrimSpace(req.OrderNumber); onum != "" {
		var oid int64
		if h.pool.QueryRow(r.Context(), `SELECT id FROM orders WHERE order_number=$1`, onum).Scan(&oid) == nil && oid > 0 {
			orderID = &oid
		}
	}
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	tnum := fmt.Sprintf("TKT-%d", n.Int64()+100000)
	msgs, _ := json.Marshal([]map[string]any{{
		"sender": "customer", "body": strings.TrimSpace(req.Message), "email": strings.TrimSpace(req.Email), "sent_at": time.Now().Format(time.RFC3339),
	}})
	var outID int64
	err = h.pool.QueryRow(r.Context(), `
		INSERT INTO support_tickets (ticket_number, source_type, customer_id, order_id, subject, status, priority, messages_json)
		VALUES ($1, 'customer', $2, $3, $4, 'open', 'medium', $5::jsonb)
		RETURNING id
	`, tnum, custID, orderID, strings.TrimSpace(req.Category), msgs).Scan(&outID)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, map[string]any{
		"id": outID, "ticket_number": tnum, "subject": req.Category, "status": "open", "messages_json": json.RawMessage(msgs),
	})
}

func (h *StorefrontHandler) GetCustomerTicket(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	tID, err2 := strconv.ParseInt(chi.URLParam(r, "ticketId"), 10, 64)
	if err != nil || err2 != nil || custID <= 0 || tID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var id int64
	var num, src, orderNum, subj, st, prio string
	var oID *int64
	var msgs json.RawMessage
	var cAt, uAt time.Time
	err = h.pool.QueryRow(r.Context(), `
		SELECT st.id, st.ticket_number, st.source_type, st.order_id, COALESCE(o.order_number, ''), st.subject, st.status, st.priority, st.messages_json, st.created_at, st.updated_at
		FROM support_tickets st
		LEFT JOIN orders o ON o.id = st.order_id
		WHERE st.id = $1 AND st.customer_id = $2
	`, tID, custID).Scan(&id, &num, &src, &oID, &orderNum, &subj, &st, &prio, &msgs, &cAt, &uAt)
	if err != nil {
		handler.WriteError(w, http.StatusNotFound, "ticket not found")
		return
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"id": id, "ticket_number": num, "source_type": src, "customer_id": custID,
		"order_id": oID, "order_number": orderNum, "subject": subj, "status": st,
		"priority": prio, "messages_json": msgs, "created_at": cAt, "updated_at": uAt,
	})
}

func (h *StorefrontHandler) ReplyCustomerTicket(w http.ResponseWriter, r *http.Request) {
	custID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	tID, err2 := strconv.ParseInt(chi.URLParam(r, "ticketId"), 10, 64)
	if err != nil || err2 != nil || custID <= 0 || tID <= 0 || h.pool == nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req struct {
		Message string `json:"message" validate:"required,min=1"`
	}
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	entryBytes, _ := json.Marshal([]map[string]any{{
		"sender": "customer", "body": strings.TrimSpace(req.Message), "sent_at": time.Now().Format(time.RFC3339),
	}})
	var msgs json.RawMessage
	var st string
	err = h.pool.QueryRow(r.Context(), `
		UPDATE support_tickets
		SET messages_json = messages_json || $3::jsonb, status = CASE WHEN status='closed' THEN 'open' ELSE status END, updated_at = NOW()
		WHERE id = $1 AND customer_id = $2
		RETURNING status, messages_json
	`, tID, custID, entryBytes).Scan(&st, &msgs)
	if err != nil {
		handler.WriteError(w, http.StatusNotFound, "ticket not found")
		return
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{"id": tID, "status": st, "messages_json": msgs})
}

func (h *StorefrontHandler) CancelCustomerOrder(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	var req struct {
		Reason      string `json:"reason"`
		OrderNumber string `json:"order_number"`
		Phone       string `json:"phone"`
		CustomerID  *int64 `json:"customer_id"`
	}
	_ = handler.DecodeAndValidate(r, &req)
	existing, gErr := h.orderSvc.GetOrder(r.Context(), &id, "", nil)
	if gErr != nil {
		handler.HandleDomainError(w, gErr)
		return
	}
	normPhone := func(p string) string {
		var b strings.Builder
		for _, ch := range p {
			if ch >= '0' && ch <= '9' {
				b.WriteRune(ch)
			}
		}
		s := b.String()
		if len(s) > 10 {
			s = s[len(s)-10:]
		}
		return s
	}
	verified := (req.OrderNumber != "" && strings.EqualFold(strings.TrimSpace(req.OrderNumber), existing.OrderNumber)) ||
		(req.Phone != "" && normPhone(req.Phone) != "" && normPhone(req.Phone) == normPhone(existing.RecipientPhone)) ||
		(req.CustomerID != nil && existing.CustomerID != nil && *req.CustomerID == *existing.CustomerID)
	if !verified {
		handler.WriteError(w, http.StatusForbidden, "order ownership verification required")
		return
	}
	if req.Reason == "" {
		req.Reason = "Customer requested cancellation"
	}
	o, err := h.orderSvc.UpdateOrderStatus(r.Context(), id, domain.OrderStatusCancelled, req.Reason, nil, "customer", "", "")
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, o)
}

func (h *StorefrontHandler) SearchCatalog(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		handler.WriteJSON(w, http.StatusOK, map[string]any{"products": []any{}, "categories": []any{}})
		return
	}
	prods, _, err := h.catalogSvc.ListProducts(r.Context(), domain.ProductListFilter{
		Search: q,
		Status: "published",
		Page:   1,
		Limit:  12,
	}, nil)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	cats, err := h.catalogSvc.ListCategories(r.Context(), "", q, false)
	if err != nil {
		cats = []domain.Category{}
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"products":   prods,
		"categories": cats,
	})
}

func (h *StorefrontHandler) SubmitReview(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProductID    *int64 `json:"product_id"`
		ProductSlug  string `json:"product_slug"`
		ReviewerName string `json:"reviewer_name" validate:"required,min=2,max=120"`
		CityName     string `json:"city_name"`
		Rating       int    `json:"rating" validate:"required,min=1,max=5"`
		Comment      string `json:"comment" validate:"required,min=3"`
	}
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	pid := req.ProductID
	if pid == nil && strings.TrimSpace(req.ProductSlug) != "" {
		var resolvedID int64
		if err := h.pool.QueryRow(r.Context(), `SELECT id FROM products WHERE slug=$1 AND deleted_at IS NULL`, strings.TrimSpace(req.ProductSlug)).Scan(&resolvedID); err == nil {
			pid = &resolvedID
		}
	}
	var id int64
	err := h.pool.QueryRow(r.Context(), `
		INSERT INTO reviews (product_id, reviewer_name, city_name, rating, comment, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id
	`, pid, strings.TrimSpace(req.ReviewerName), strings.TrimSpace(req.CityName), req.Rating, strings.TrimSpace(req.Comment)).Scan(&id)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, map[string]any{
		"id":     id,
		"status": "pending",
	})
}

func (h *StorefrontHandler) ListDeliveryTypes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `
		SELECT id, slug, name, lead_time_days, CASE WHEN cutoff_time IS NOT NULL THEN TO_CHAR(cutoff_time, 'HH24:MI') ELSE NULL END
		FROM delivery_types WHERE is_active = TRUE ORDER BY id ASC
	`)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id int64
		var slug, name string
		var leadDays int
		var cutoff *string
		if rows.Scan(&id, &slug, &name, &leadDays, &cutoff) == nil {
			out = append(out, map[string]any{
				"id":             id,
				"slug":           slug,
				"name":           name,
				"lead_time_days": leadDays,
				"cutoff_time":    cutoff,
			})
		}
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

func (h *StorefrontHandler) ListAddonsPublic(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	allAddons, _, err := h.catalogSvc.ListAddons(ctx, "", 1, 200)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	activeAddons := make([]domain.ProductAddon, 0, len(allAddons))
	for _, a := range allAddons {
		if a.IsActive {
			activeAddons = append(activeAddons, a)
		}
	}
	cats, _ := h.catalogSvc.ListCategories(ctx, "addon", "", false)
	activeCats := make([]domain.Category, 0, len(cats))
	for _, c := range cats {
		if c.IsActive {
			activeCats = append(activeCats, c)
		}
	}

	popularIDs := []int64{}
	if pslug := strings.TrimSpace(r.URL.Query().Get("product_slug")); pslug != "" {
		if prod, perr := h.catalogSvc.GetProduct(ctx, nil, pslug, nil); perr == nil && prod != nil {
			popularIDs = append(popularIDs, prod.AddonIDs...)
		}
	}

	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"addons":      activeAddons,
		"categories":  activeCats,
		"popular_ids": popularIDs,
	})
}

func (h *StorefrontHandler) ListCouponsPublic(w http.ResponseWriter, r *http.Request) {
	items, err := h.phase2Svc.ListCoupons(r.Context(), "")
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	now := time.Now()
	out := make([]domain.Coupon, 0, len(items))
	for _, c := range items {
		if !c.IsActive {
			continue
		}
		if !c.ValidFrom.IsZero() && now.Before(c.ValidFrom) {
			continue
		}
		if !c.ValidUntil.IsZero() && now.After(c.ValidUntil) {
			continue
		}
		out = append(out, c)
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

func (h *StorefrontHandler) GetCorporateBanner(w http.ResponseWriter, r *http.Request) {
	var raw []byte
	if err := h.pool.QueryRow(r.Context(), `SELECT value_json FROM site_settings WHERE key = 'corporate_banner_config'`).Scan(&raw); err == nil && len(raw) > 0 {
		var payload map[string]any
		if json.Unmarshal(raw, &payload) == nil {
			handler.WriteJSON(w, http.StatusOK, payload)
			return
		}
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"href":         "/corporate-gift",
		"label":        "Explore corporate gift",
		"alt":          "Corporate Gifting by Giftlaya",
		"desktopImage": "https://cdn.giftlaya.com/images/93/340236a1-9cdf-40b2-9d0e-c2a1d8072cd0.webp",
		"mobileImage":  "https://cdn.giftlaya.com/images/93/355ed3a5-cf6a-4c83-98f1-2db49a0a48db.webp",
		"image":        "https://cdn.giftlaya.com/images/93/340236a1-9cdf-40b2-9d0e-c2a1d8072cd0.webp",
	})
}

func (h *StorefrontHandler) GetExploreLinks(w http.ResponseWriter, r *http.Request) {
	var raw []byte
	if err := h.pool.QueryRow(r.Context(), `SELECT value_json FROM site_settings WHERE key = 'explore_links_config'`).Scan(&raw); err == nil && len(raw) > 0 {
		var groups []map[string]any
		if json.Unmarshal(raw, &groups) == nil {
			handler.WriteJSON(w, http.StatusOK, groups)
			return
		}
	}
	handler.WriteJSON(w, http.StatusOK, []any{})
}

func (h *StorefrontHandler) ListPresetsPublic(w http.ResponseWriter, r *http.Request) {
	items, err := h.phase2Svc.ListPresets(r.Context(), r.URL.Query().Get("type"), r.URL.Query().Get("search"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	out := make([]domain.Preset, 0, len(items))
	for _, p := range items {
		if p.IsActive {
			out = append(out, p)
		}
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

type sitemapImageEntry struct {
	Loc     string `json:"loc"`
	Caption string `json:"caption,omitempty"`
}

type sitemapUrlEntry struct {
	Loc        string              `json:"loc"`
	Lastmod    string              `json:"lastmod,omitempty"`
	Changefreq string              `json:"changefreq,omitempty"`
	Priority   string              `json:"priority,omitempty"`
	Images     []sitemapImageEntry `json:"images,omitempty"`
}

func (h *StorefrontHandler) GetSitemapByType(w http.ResponseWriter, r *http.Request) {
	typ := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "type")))
	ctx := r.Context()
	today := time.Now().Format("2006-01-02")

	loadCats := func() []domain.Category {
		if h.catalogSvc == nil {
			return nil
		}
		all, err := h.catalogSvc.ListCategories(ctx, "", "", false)
		if err != nil {
			return nil
		}
		var out []domain.Category
		for _, c := range all {
			if c.IsActive && c.Kind != "addon" {
				out = append(out, c)
			}
		}
		return out
	}

	loadProducts := func() []domain.Product {
		if h.catalogSvc == nil {
			return nil
		}
		items, _, err := h.catalogSvc.ListProducts(ctx, domain.ProductListFilter{
			Status: "published",
			Page:   1,
			Limit:  1000,
		}, nil)
		if err != nil {
			return nil
		}
		return items
	}

	var entries []sitemapUrlEntry
	switch typ {
	case "category":
		entries = append(entries,
			sitemapUrlEntry{Loc: "", Changefreq: "daily", Priority: "1.0"},
			sitemapUrlEntry{Loc: "/contact-us", Changefreq: "monthly", Priority: "0.5"},
		)
		if h.phase3Svc != nil {
			if pages, err := h.phase3Svc.ListCMSPages(ctx, ""); err == nil {
				for _, p := range pages {
					if !p.IsPublished {
						continue
					}
					loc := "/" + strings.TrimPrefix(p.Slug, "/")
					if p.PageType == "footer_policy" {
						loc = "/pages/" + strings.TrimPrefix(p.Slug, "/")
					}
					entries = append(entries, sitemapUrlEntry{Loc: loc, Lastmod: today, Changefreq: "monthly", Priority: "0.6"})
				}
			}
		}
		for _, c := range loadCats() {
			entries = append(entries, sitemapUrlEntry{
				Loc:        "/" + strings.TrimPrefix(c.Slug, "/"),
				Lastmod:    today,
				Changefreq: "weekly",
				Priority:   "0.8",
			})
		}

	case "page":
		cats := loadCats()
		var cities []domain.City
		if h.phase2Svc != nil {
			cities, _ = h.phase2Svc.ListCities(ctx, "", true)
		}
		for _, c := range cats {
			for _, city := range cities {
				if len(entries) >= 1000 {
					break
				}
				entries = append(entries, sitemapUrlEntry{
					Loc:        "/" + strings.TrimPrefix(c.Slug, "/") + "/" + strings.TrimPrefix(city.Slug, "/"),
					Lastmod:    today,
					Changefreq: "weekly",
					Priority:   "0.8",
				})
			}
			if len(entries) >= 1000 {
				break
			}
		}

	case "sub-page":
		cats := loadCats()
		var cities []domain.City
		if h.phase2Svc != nil {
			cities, _ = h.phase2Svc.ListCities(ctx, "", true)
		}
		maxCities := len(cities)
		if maxCities > 12 {
			maxCities = 12
		}
		for _, c := range cats {
			if strings.Contains(c.Slug, "/") || c.ParentID != nil {
				entries = append(entries, sitemapUrlEntry{Loc: "/" + strings.TrimPrefix(c.Slug, "/"), Lastmod: today, Changefreq: "weekly", Priority: "0.8"})
				for i := 0; i < maxCities; i++ {
					entries = append(entries, sitemapUrlEntry{
						Loc:        "/" + strings.TrimPrefix(c.Slug, "/") + "/" + strings.TrimPrefix(cities[i].Slug, "/"),
						Lastmod:    today,
						Changefreq: "weekly",
						Priority:   "0.7",
					})
				}
			}
		}
		hyperlocalAreas := map[string][]string{
			"bangalore": {"bannerghatta-road", "btm-layout", "electronic-city", "hsr-layout", "indiranagar", "jayanagar", "jp-nagar", "koramangala", "malleshwaram", "whitefield"},
			"hyderabad": {"banjara-hills", "begumpet", "gachibowli", "hitec-city", "jubilee-hills", "kondapur", "kukatpally", "madhapur", "miyapur"},
			"mumbai":    {"andheri-east-west", "bandra-east-west", "borivali-east-west", "chembur-east-west", "dadar", "juhu", "powai", "thane"},
			"delhi":     {"defence-colony", "dwarka", "greater-kailash", "janakpuri", "karol-bagh", "pitampura", "rohini", "vasant-kunj"},
			"kolkata":   {"ballygunge", "bhowanipore", "garia", "jadavpur", "new-alipore", "new-town-rajarhat", "salt-lake"},
		}
		for citySlug, areas := range hyperlocalAreas {
			for _, areaSlug := range areas {
				entries = append(entries, sitemapUrlEntry{
					Loc:        "/balloon-decorations/" + citySlug + "/" + areaSlug,
					Lastmod:    today,
					Changefreq: "weekly",
					Priority:   "0.7",
				})
			}
		}

	case "product":
		for _, p := range loadProducts() {
			if p.ProductType == "decoration_package" {
				continue
			}
			entries = append(entries, sitemapUrlEntry{
				Loc:        "/p/" + p.Slug,
				Lastmod:    today,
				Changefreq: "weekly",
				Priority:   "0.8",
			})
		}

	case "service":
		for _, p := range loadProducts() {
			if p.ProductType != "decoration_package" {
				continue
			}
			entries = append(entries, sitemapUrlEntry{
				Loc:        "/s/" + p.Slug,
				Lastmod:    today,
				Changefreq: "weekly",
				Priority:   "0.8",
			})
		}

	case "blog":
		entries = append(entries, sitemapUrlEntry{Loc: "/blog", Changefreq: "daily", Priority: "0.7"})
		if h.phase3Svc != nil {
			if bCats, err := h.phase3Svc.ListBlogCategories(ctx); err == nil {
				for _, bc := range bCats {
					entries = append(entries, sitemapUrlEntry{Loc: "/blog/category/" + bc.Slug, Lastmod: today, Changefreq: "weekly", Priority: "0.6"})
				}
			}
			if posts, err := h.phase3Svc.ListBlogPosts(ctx, "published"); err == nil {
				for _, bp := range posts {
					entries = append(entries, sitemapUrlEntry{Loc: "/blog/" + bp.Slug, Lastmod: today, Changefreq: "weekly", Priority: "0.6"})
				}
			}
		}

	case "brand":
		entries = append(entries, sitemapUrlEntry{Loc: "/brands", Changefreq: "weekly", Priority: "0.6"})

	case "images":
		for _, p := range loadProducts() {
			if strings.TrimSpace(p.PrimaryImageURL) == "" {
				continue
			}
			prefix := "/p/"
			if p.ProductType == "decoration_package" {
				prefix = "/s/"
			}
			entries = append(entries, sitemapUrlEntry{
				Loc:    prefix + p.Slug,
				Images: []sitemapImageEntry{{Loc: p.PrimaryImageURL, Caption: p.Name}},
			})
		}

	default:
		handler.WriteError(w, http.StatusNotFound, "unknown sitemap type")
		return
	}

	if entries == nil {
		entries = []sitemapUrlEntry{}
	}
	handler.WriteJSON(w, http.StatusOK, entries)
}
