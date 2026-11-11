package admin

import (
	"io"
	"math"
	"net/http"
	"strconv"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/handler"
	"github.com/giftlaya/giftlaya-api/internal/middleware"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

type CatalogHandler struct {
	svc *service.CatalogService
}

func NewCatalogHandler(svc *service.CatalogService) *CatalogHandler {
	return &CatalogHandler{svc: svc}
}

type ProductsListResponse struct {
	Items []domain.Product      `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type AddonsListResponse struct {
	Items []domain.ProductAddon `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type BulkProductUpdateRequest struct {
	Items []domain.BulkProductUpdateItem `json:"items" validate:"required,min=1,dive"`
}

// ---------- Products ----------

// ListProducts godoc
// @Summary List products with pagination, search, filters, and sort
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param search query string false "Search by name or SKU"
// @Param product_type query string false "Filter by product_type"
// @Param status query string false "Filter by status (draft|published|archived)"
// @Param category_id query int false "Filter by category ID"
// @Param city_id query int false "Filter by city availability"
// @Param trending query bool false "Filter featured/trending"
// @Param sort_by query string false "newest | price_asc | price_desc | discount"
// @Param page query int false "Page" default(1)
// @Param limit query int false "Limit" default(20)
// @Success 200 {object} ProductsListResponse
// @Router /api/v1/admin/products [get]
func (h *CatalogHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 20
	}

	f := domain.ProductListFilter{
		Search:      q.Get("search"),
		ProductType: q.Get("product_type"),
		Status:      q.Get("status"),
		SortBy:      q.Get("sort_by"),
		Page:        page,
		Limit:       limit,
	}
	if cid, err := strconv.ParseInt(q.Get("category_id"), 10, 64); err == nil && cid > 0 {
		f.CategoryID = &cid
	}
	if cityID, err := strconv.ParseInt(q.Get("city_id"), 10, 64); err == nil && cityID > 0 {
		f.CityID = &cityID
	}
	if tStr := q.Get("trending"); tStr != "" {
		b := tStr == "true"
		f.Trending = &b
	}
	if fStr := q.Get("featured"); fStr != "" {
		b := fStr == "true"
		f.Featured = &b
	}

	admin := middleware.AdminFromContext(r.Context())
	items, total, err := h.svc.ListProducts(r.Context(), f, admin)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	handler.WriteJSON(w, http.StatusOK, ProductsListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: totalPages},
	})
}

// GetProduct godoc
// @Summary Get full product detail including variants, images, options, personalization, city overrides
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param id path int true "Product ID"
// @Success 200 {object} domain.Product
// @Router /api/v1/admin/products/{id} [get]
func (h *CatalogHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	admin := middleware.AdminFromContext(r.Context())
	p, err := h.svc.GetProduct(r.Context(), &id, "", admin)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, p)
}

// CreateProduct godoc
// @Summary Create a product with variants, personalization fields, addons, and city overrides
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.Product true "Product payload"
// @Success 201 {object} domain.Product
// @Router /api/v1/admin/products [post]
func (h *CatalogHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var in domain.Product
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	admin := middleware.AdminFromContext(r.Context())
	out, err := h.svc.CreateProduct(r.Context(), &in, admin, chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// UpdateProduct godoc
// @Summary Update a product
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Product ID"
// @Param payload body domain.Product true "Product payload"
// @Success 200 {object} domain.Product
// @Router /api/v1/admin/products/{id} [put]
func (h *CatalogHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	var in domain.Product
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	admin := middleware.AdminFromContext(r.Context())
	out, err := h.svc.UpdateProduct(r.Context(), id, &in, admin, chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteProduct godoc
// @Summary Soft delete a product
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param id path int true "Product ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/products/{id} [delete]
func (h *CatalogHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	admin := middleware.AdminFromContext(r.Context())
	if err := h.svc.DeleteProduct(r.Context(), id, admin, chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "product deleted"})
}

// DuplicateProduct godoc
// @Summary Duplicate a product as a new draft copy
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param id path int true "Product ID"
// @Success 201 {object} domain.Product
// @Router /api/v1/admin/products/{id}/duplicate [post]
func (h *CatalogHandler) DuplicateProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	admin := middleware.AdminFromContext(r.Context())
	out, err := h.svc.DuplicateProduct(r.Context(), id, admin, chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// BulkUpdateProducts godoc
// @Summary Bulk update price, MRP, stock, or status for multiple products
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body BulkProductUpdateRequest true "Bulk update items"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/products/bulk-update [post]
func (h *CatalogHandler) BulkUpdateProducts(w http.ResponseWriter, r *http.Request) {
	var req BulkProductUpdateRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	admin := middleware.AdminFromContext(r.Context())
	if err := h.svc.BulkUpdateProducts(r.Context(), req.Items, admin, chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "bulk update applied"})
}

// ExportProductsCSV godoc
// @Summary Export filtered products as CSV
// @Tags Admin Catalog
// @Produce text/csv
// @Security BearerAuth
// @Success 200 {string} string "CSV content"
// @Router /api/v1/admin/products/export-csv [get]
func (h *CatalogHandler) ExportProductsCSV(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := domain.ProductListFilter{
		Search:      q.Get("search"),
		ProductType: q.Get("product_type"),
		Status:      q.Get("status"),
	}
	admin := middleware.AdminFromContext(r.Context())
	data, err := h.svc.ExportProductsCSV(r.Context(), f, admin)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="giftlaya-products.csv"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// ImportProductsCSV godoc
// @Summary Import products in bulk from CSV upload or raw CSV body
// @Tags Admin Catalog
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Success 200 {object} service.CSVImportSummary
// @Router /api/v1/admin/products/import-csv [post]
func (h *CatalogHandler) ImportProductsCSV(w http.ResponseWriter, r *http.Request) {
	var rawCSV []byte
	if file, _, err := r.FormFile("file"); err == nil {
		defer file.Close()
		rawCSV, err = io.ReadAll(io.LimitReader(file, 5<<20))
		if err != nil {
			handler.WriteError(w, http.StatusBadRequest, "failed to read uploaded file")
			return
		}
	} else {
		defer r.Body.Close()
		rawCSV, err = io.ReadAll(io.LimitReader(r.Body, 5<<20))
		if err != nil {
			handler.WriteError(w, http.StatusBadRequest, "failed to read csv body")
			return
		}
	}
	admin := middleware.AdminFromContext(r.Context())
	summary, err := h.svc.ImportProductsCSV(r.Context(), rawCSV, admin, chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, summary)
}

// ---------- Addons ----------

// ListAddons godoc
// @Summary List product addons
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Success 200 {object} AddonsListResponse
// @Router /api/v1/admin/addons [get]
func (h *CatalogHandler) ListAddons(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	items, total, err := h.svc.ListAddons(r.Context(), q.Get("search"), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, AddonsListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// CreateAddon godoc
// @Summary Create a product addon
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.ProductAddon true "Addon"
// @Success 201 {object} domain.ProductAddon
// @Router /api/v1/admin/addons [post]
func (h *CatalogHandler) CreateAddon(w http.ResponseWriter, r *http.Request) {
	var in domain.ProductAddon
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.CreateAddon(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// UpdateAddon godoc
// @Summary Update a product addon
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Addon ID"
// @Param payload body domain.ProductAddon true "Addon"
// @Success 200 {object} domain.ProductAddon
// @Router /api/v1/admin/addons/{id} [put]
func (h *CatalogHandler) UpdateAddon(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid addon id")
		return
	}
	var in domain.ProductAddon
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.UpdateAddon(r.Context(), id, &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteAddon godoc
// @Summary Delete a product addon
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param id path int true "Addon ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/addons/{id} [delete]
func (h *CatalogHandler) DeleteAddon(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid addon id")
		return
	}
	if err := h.svc.DeleteAddon(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "addon deleted"})
}

// ---------- Categories & Sub-pages ----------

// ListCategories godoc
// @Summary List categories (nested tree by default, or flat with ?tree=false)
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param kind query string false "category | occasion | seo_page"
// @Param search query string false "Search name/slug"
// @Param tree query bool false "Return tree structure" default(true)
// @Success 200 {array} domain.Category
// @Router /api/v1/admin/categories [get]
func (h *CatalogHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	asTree := q.Get("tree") != "false" && q.Get("search") == ""
	items, err := h.svc.ListCategories(r.Context(), q.Get("kind"), q.Get("search"), asTree)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// CreateCategory godoc
// @Summary Create category or sub-page
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.Category true "Category"
// @Success 201 {object} domain.Category
// @Router /api/v1/admin/categories [post]
func (h *CatalogHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var in domain.Category
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.CreateCategory(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// UpdateCategory godoc
// @Summary Update category
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Category ID"
// @Param payload body domain.Category true "Category"
// @Success 200 {object} domain.Category
// @Router /api/v1/admin/categories/{id} [put]
func (h *CatalogHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid category id")
		return
	}
	var in domain.Category
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.UpdateCategory(r.Context(), id, &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteCategory godoc
// @Summary Soft delete category
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param id path int true "Category ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/categories/{id} [delete]
func (h *CatalogHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid category id")
		return
	}
	if err := h.svc.DeleteCategory(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "category deleted"})
}

// ---------- Mega-Menu / Navigation Builder ----------

// ListNavigation godoc
// @Summary List mega-menu navigation tree
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param tree query bool false "Tree format" default(true)
// @Success 200 {array} domain.NavigationItem
// @Router /api/v1/admin/navigation [get]
func (h *CatalogHandler) ListNavigation(w http.ResponseWriter, r *http.Request) {
	asTree := r.URL.Query().Get("tree") != "false"
	items, err := h.svc.ListNavigation(r.Context(), asTree)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// CreateNavigationItem godoc
// @Summary Create mega-menu navigation node
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.NavigationItem true "Navigation item"
// @Success 201 {object} domain.NavigationItem
// @Router /api/v1/admin/navigation [post]
func (h *CatalogHandler) CreateNavigationItem(w http.ResponseWriter, r *http.Request) {
	var in domain.NavigationItem
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.CreateNavigationItem(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// UpdateNavigationItem godoc
// @Summary Update mega-menu navigation node
// @Tags Admin Catalog
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Nav Item ID"
// @Param payload body domain.NavigationItem true "Navigation item"
// @Success 200 {object} domain.NavigationItem
// @Router /api/v1/admin/navigation/{id} [put]
func (h *CatalogHandler) UpdateNavigationItem(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid navigation id")
		return
	}
	var in domain.NavigationItem
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.UpdateNavigationItem(r.Context(), id, &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteNavigationItem godoc
// @Summary Delete mega-menu navigation node
// @Tags Admin Catalog
// @Produce json
// @Security BearerAuth
// @Param id path int true "Nav Item ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/navigation/{id} [delete]
func (h *CatalogHandler) DeleteNavigationItem(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid navigation id")
		return
	}
	if err := h.svc.DeleteNavigationItem(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "navigation item deleted"})
}

