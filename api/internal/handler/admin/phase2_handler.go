package admin

import (
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

type Phase2Handler struct {
	svc      *service.Phase2Service
	orderSvc *service.OrderService
}

func NewPhase2Handler(svc *service.Phase2Service, orderSvc *service.OrderService) *Phase2Handler {
	return &Phase2Handler{svc: svc, orderSvc: orderSvc}
}

type PincodesListResponse struct {
	Items []domain.Pincode      `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type CustomersListResponse struct {
	Items []domain.Customer     `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type PaymentsListResponse struct {
	Items []domain.PaymentTransaction `json:"items"`
	Meta  handler.PaginatedMeta       `json:"meta"`
}

type RefundsListResponse struct {
	Items []domain.Refund       `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type AdjustCoinsRequest struct {
	Delta int    `json:"delta" validate:"required"`
	Note  string `json:"note" validate:"required"`
}

type BlockCustomerRequest struct {
	IsBlocked bool `json:"is_blocked"`
}

// ---------- Hero Banners ----------

// ListHeroBanners godoc
// @Summary List homepage hero banners
// @Tags Admin Homepage Builder
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.HeroBanner
// @Router /api/v1/admin/hero-banners [get]
func (h *Phase2Handler) ListHeroBanners(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListHeroBanners(r.Context(), false)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveHeroBanner godoc
// @Summary Create or update a hero banner (desktop/mobile images + schedule)
// @Tags Admin Homepage Builder
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.HeroBanner true "Hero banner"
// @Success 200 {object} domain.HeroBanner
// @Router /api/v1/admin/hero-banners [post]
func (h *Phase2Handler) SaveHeroBanner(w http.ResponseWriter, r *http.Request) {
	var in domain.HeroBanner
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	if idStr := chi.URLParam(r, "id"); idStr != "" {
		if id, err := strconv.ParseInt(idStr, 10, 64); err == nil {
			in.ID = id
		}
	}
	out, err := h.svc.SaveHeroBanner(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteHeroBanner godoc
// @Summary Delete hero banner
// @Tags Admin Homepage Builder
// @Produce json
// @Security BearerAuth
// @Param id path int true "Banner ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/hero-banners/{id} [delete]
func (h *Phase2Handler) DeleteHeroBanner(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid banner id")
		return
	}
	if err := h.svc.DeleteHeroBanner(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "banner deleted"})
}

// ---------- Homepage Sections (with slider_enabled flag) ----------

// ListHomepageSections godoc
// @Summary List homepage builder sections with sort order and slider_enabled toggle
// @Tags Admin Homepage Builder
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.HomepageSection
// @Router /api/v1/admin/homepage-sections [get]
func (h *Phase2Handler) ListHomepageSections(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListHomepageSections(r.Context(), false)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveHomepageSection godoc
// @Summary Create or update homepage builder section (manual picks or rules + slider_enabled)
// @Tags Admin Homepage Builder
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.HomepageSection true "Section"
// @Success 200 {object} domain.HomepageSection
// @Router /api/v1/admin/homepage-sections [post]
func (h *Phase2Handler) SaveHomepageSection(w http.ResponseWriter, r *http.Request) {
	var in domain.HomepageSection
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	if idStr := chi.URLParam(r, "id"); idStr != "" {
		if id, err := strconv.ParseInt(idStr, 10, 64); err == nil {
			in.ID = id
		}
	}
	out, err := h.svc.SaveHomepageSection(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteHomepageSection godoc
// @Summary Delete homepage section
// @Tags Admin Homepage Builder
// @Produce json
// @Security BearerAuth
// @Param id path int true "Section ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/homepage-sections/{id} [delete]
func (h *Phase2Handler) DeleteHomepageSection(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid section id")
		return
	}
	if err := h.svc.DeleteHomepageSection(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "section deleted"})
}

// ---------- Geo, Cities, Pincodes, Slots, Blackouts, Decorators, Presets ----------

// ListStates godoc
// @Summary List delivery states
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.State
// @Router /api/v1/admin/states [get]
func (h *Phase2Handler) ListStates(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListStates(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveState godoc
// @Summary Create or update state
// @Tags Admin Geo & Presets
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.State true "State"
// @Success 200 {object} domain.State
// @Router /api/v1/admin/states [post]
func (h *Phase2Handler) SaveState(w http.ResponseWriter, r *http.Request) {
	var in domain.State
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveState(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListCities godoc
// @Summary List delivery cities with cutoffs and surge config
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.City
// @Router /api/v1/admin/cities [get]
func (h *Phase2Handler) ListCities(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListCities(r.Context(), r.URL.Query().Get("search"), false)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveCity godoc
// @Summary Create or update delivery city
// @Tags Admin Geo & Presets
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.City true "City"
// @Success 200 {object} domain.City
// @Router /api/v1/admin/cities [post]
func (h *Phase2Handler) SaveCity(w http.ResponseWriter, r *http.Request) {
	var in domain.City
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveCity(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListPincodes godoc
// @Summary List serviceable pincodes
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Success 200 {object} PincodesListResponse
// @Router /api/v1/admin/pincodes [get]
func (h *Phase2Handler) ListPincodes(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	var cityID *int64
	if c, err := strconv.ParseInt(q.Get("city_id"), 10, 64); err == nil && c > 0 {
		cityID = &c
	}
	items, total, err := h.svc.ListPincodes(r.Context(), cityID, q.Get("search"), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, PincodesListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// SavePincode godoc
// @Summary Create or update pincode
// @Tags Admin Geo & Presets
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.Pincode true "Pincode"
// @Success 200 {object} domain.Pincode
// @Router /api/v1/admin/pincodes [post]
func (h *Phase2Handler) SavePincode(w http.ResponseWriter, r *http.Request) {
	var in domain.Pincode
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SavePincode(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeletePincode godoc
// @Summary Delete pincode
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Param id path int true "Pincode ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/pincodes/{id} [delete]
func (h *Phase2Handler) DeletePincode(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid pincode id")
		return
	}
	if err := h.svc.DeletePincode(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "pincode deleted"})
}

// ListTimeSlots godoc
// @Summary List delivery time slot templates
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.TimeSlotTemplate
// @Router /api/v1/admin/time-slots [get]
func (h *Phase2Handler) ListTimeSlots(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListTimeSlots(r.Context(), false)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveTimeSlot godoc
// @Summary Create or update time slot template
// @Tags Admin Geo & Presets
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.TimeSlotTemplate true "Slot template"
// @Success 200 {object} domain.TimeSlotTemplate
// @Router /api/v1/admin/time-slots [post]
func (h *Phase2Handler) SaveTimeSlot(w http.ResponseWriter, r *http.Request) {
	var in domain.TimeSlotTemplate
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveTimeSlot(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListSlotLedger godoc
// @Summary List slot capacity ledger for a city & date
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Param city_id query int true "City ID"
// @Param date query string true "YYYY-MM-DD"
// @Success 200 {array} domain.SlotCapacityOverride
// @Router /api/v1/admin/slot-capacity [get]
func (h *Phase2Handler) ListSlotLedger(w http.ResponseWriter, r *http.Request) {
	cityID, err := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64)
	date := r.URL.Query().Get("date")
	if err != nil || cityID <= 0 || date == "" {
		handler.WriteError(w, http.StatusBadRequest, "city_id and date are required")
		return
	}
	items, err := h.svc.ListSlotLedger(r.Context(), cityID, date)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// UpsertSlotLedger godoc
// @Summary Set slot capacity limit or block a delivery slot for a city & date
// @Tags Admin Geo & Presets
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.SlotCapacityOverride true "Slot override"
// @Success 200 {object} domain.SlotCapacityOverride
// @Router /api/v1/admin/slot-capacity [post]
func (h *Phase2Handler) UpsertSlotLedger(w http.ResponseWriter, r *http.Request) {
	var in domain.SlotCapacityOverride
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.UpsertSlotLedger(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListBlackoutDates godoc
// @Summary List blackout and peak surge dates
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.BlackoutDate
// @Router /api/v1/admin/blackout-dates [get]
func (h *Phase2Handler) ListBlackoutDates(w http.ResponseWriter, r *http.Request) {
	var cityID *int64
	if c, err := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64); err == nil && c > 0 {
		cityID = &c
	}
	items, err := h.svc.ListBlackoutDates(r.Context(), cityID)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveBlackoutDate godoc
// @Summary Add blackout or peak surge date
// @Tags Admin Geo & Presets
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.BlackoutDate true "Blackout"
// @Success 201 {object} domain.BlackoutDate
// @Router /api/v1/admin/blackout-dates [post]
func (h *Phase2Handler) SaveBlackoutDate(w http.ResponseWriter, r *http.Request) {
	var in domain.BlackoutDate
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveBlackoutDate(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// DeleteBlackoutDate godoc
// @Summary Remove blackout date
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Param id path int true "Blackout ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/blackout-dates/{id} [delete]
func (h *Phase2Handler) DeleteBlackoutDate(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.svc.DeleteBlackoutDate(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "blackout date deleted"})
}

// ListDecoratorTeams godoc
// @Summary List decorator teams
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.DecoratorTeam
// @Router /api/v1/admin/decorator-teams [get]
func (h *Phase2Handler) ListDecoratorTeams(w http.ResponseWriter, r *http.Request) {
	var cityID *int64
	if c, err := strconv.ParseInt(r.URL.Query().Get("city_id"), 10, 64); err == nil && c > 0 {
		cityID = &c
	}
	items, err := h.svc.ListDecoratorTeams(r.Context(), cityID)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveDecoratorTeam godoc
// @Summary Create or update decorator team
// @Tags Admin Geo & Presets
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.DecoratorTeam true "Team"
// @Success 200 {object} domain.DecoratorTeam
// @Router /api/v1/admin/decorator-teams [post]
func (h *Phase2Handler) SaveDecoratorTeam(w http.ResponseWriter, r *http.Request) {
	var in domain.DecoratorTeam
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveDecoratorTeam(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListPresets godoc
// @Summary List presets for any of the 26 CMS preset types (flavour, occasion, balloon_color, etc.)
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Param type query string false "Preset type slug"
// @Param search query string false "Search"
// @Success 200 {array} domain.Preset
// @Router /api/v1/admin/presets [get]
func (h *Phase2Handler) ListPresets(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	items, err := h.svc.ListPresets(r.Context(), q.Get("type"), q.Get("search"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SavePreset godoc
// @Summary Create or update preset
// @Tags Admin Geo & Presets
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.Preset true "Preset"
// @Success 200 {object} domain.Preset
// @Router /api/v1/admin/presets [post]
func (h *Phase2Handler) SavePreset(w http.ResponseWriter, r *http.Request) {
	var in domain.Preset
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SavePreset(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeletePreset godoc
// @Summary Delete preset
// @Tags Admin Geo & Presets
// @Produce json
// @Security BearerAuth
// @Param id path int true "Preset ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/presets/{id} [delete]
func (h *Phase2Handler) DeletePreset(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid preset id")
		return
	}
	if err := h.svc.DeletePreset(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "preset deleted"})
}

// ---------- Customers, Coins & Coupons ----------

// ListCustomers godoc
// @Summary List customers with order totals and coin wallet balance
// @Tags Admin Customers & Coupons
// @Produce json
// @Security BearerAuth
// @Success 200 {object} CustomersListResponse
// @Router /api/v1/admin/customers [get]
func (h *Phase2Handler) ListCustomers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	items, total, err := h.svc.ListCustomers(r.Context(), q.Get("search"), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, CustomersListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// GetCustomer godoc
// @Summary Get customer profile, saved addresses, and coin ledger history
// @Tags Admin Customers & Coupons
// @Produce json
// @Security BearerAuth
// @Param id path int true "Customer ID"
// @Success 200 {object} domain.Customer
// @Router /api/v1/admin/customers/{id} [get]
func (h *Phase2Handler) GetCustomer(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	cust, err := h.svc.GetCustomerDetail(r.Context(), id)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, cust)
}

// BlockCustomer godoc
// @Summary Block or unblock customer account
// @Tags Admin Customers & Coupons
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Customer ID"
// @Param payload body BlockCustomerRequest true "Block state"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/customers/{id}/block [put]
func (h *Phase2Handler) BlockCustomer(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	var req BlockCustomerRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.svc.SetCustomerBlocked(r.Context(), id, req.IsBlocked, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "customer status updated"})
}

// AdjustCustomerCoins godoc
// @Summary Manually adjust customer coin wallet with immutable ledger & audit log
// @Tags Admin Customers & Coupons
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Customer ID"
// @Param payload body AdjustCoinsRequest true "Delta & note"
// @Success 200 {object} map[string]int
// @Router /api/v1/admin/customers/{id}/coins [post]
func (h *Phase2Handler) AdjustCustomerCoins(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	var req AdjustCoinsRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	bal, err := h.svc.AdjustCustomerCoins(r.Context(), id, req.Delta, req.Note, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, map[string]int{"balance_coins": bal})
}

// ListCoupons godoc
// @Summary List discount coupons
// @Tags Admin Customers & Coupons
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.Coupon
// @Router /api/v1/admin/coupons [get]
func (h *Phase2Handler) ListCoupons(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListCoupons(r.Context(), r.URL.Query().Get("search"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveCoupon godoc
// @Summary Create or update coupon
// @Tags Admin Customers & Coupons
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.Coupon true "Coupon"
// @Success 200 {object} domain.Coupon
// @Router /api/v1/admin/coupons [post]
func (h *Phase2Handler) SaveCoupon(w http.ResponseWriter, r *http.Request) {
	var in domain.Coupon
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveCoupon(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteCoupon godoc
// @Summary Delete coupon
// @Tags Admin Customers & Coupons
// @Produce json
// @Security BearerAuth
// @Param id path int true "Coupon ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/coupons/{id} [delete]
func (h *Phase2Handler) DeleteCoupon(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid coupon id")
		return
	}
	if err := h.svc.DeleteCoupon(r.Context(), id, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "coupon deleted"})
}

// ---------- Payments, Refunds, Settlement Report & Invoice PDF ----------

// ListPayments godoc
// @Summary List payment gateway transactions
// @Tags Admin Payments & Settlement
// @Produce json
// @Security BearerAuth
// @Success 200 {object} PaymentsListResponse
// @Router /api/v1/admin/payments [get]
func (h *Phase2Handler) ListPayments(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	items, total, err := h.svc.ListPayments(r.Context(), q.Get("status"), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, PaymentsListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// ListRefunds godoc
// @Summary List processed refunds
// @Tags Admin Payments & Settlement
// @Produce json
// @Security BearerAuth
// @Success 200 {object} RefundsListResponse
// @Router /api/v1/admin/refunds [get]
func (h *Phase2Handler) ListRefunds(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	items, total, err := h.svc.ListRefunds(r.Context(), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, RefundsListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// CreateRefund godoc
// @Summary Process an idempotent refund against an order
// @Tags Admin Payments & Settlement
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.Refund true "Refund"
// @Success 201 {object} domain.Refund
// @Router /api/v1/admin/refunds [post]
func (h *Phase2Handler) CreateRefund(w http.ResponseWriter, r *http.Request) {
	var in domain.Refund
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.ProcessRefund(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// GetSettlementReport godoc
// @Summary Get payment & GST settlement report across a date range
// @Tags Admin Payments & Settlement
// @Produce json
// @Security BearerAuth
// @Param from query string false "YYYY-MM-DD"
// @Param to query string false "YYYY-MM-DD"
// @Success 200 {object} domain.SettlementReport
// @Router /api/v1/admin/payments/settlement [get]
func (h *Phase2Handler) GetSettlementReport(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	rep, err := h.svc.GetSettlementReport(r.Context(), q.Get("from"), q.Get("to"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, rep)
}

// DownloadInvoicePDF godoc
// @Summary Download generated PDF tax invoice for an order
// @Tags Admin Orders
// @Produce application/pdf
// @Security BearerAuth
// @Param id path int true "Order ID"
// @Success 200 {file} binary
// @Router /api/v1/admin/orders/{id}/invoice/pdf [get]
func (h *Phase2Handler) DownloadInvoicePDF(w http.ResponseWriter, r *http.Request) {
	if h.orderSvc == nil {
		handler.WriteError(w, http.StatusServiceUnavailable, "order service unavailable")
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	admin := middleware.AdminFromContext(r.Context())
	order, err := h.orderSvc.GetOrder(r.Context(), &id, "", admin)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	inv, err := h.orderSvc.GetOrGenerateInvoice(r.Context(), id, admin)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	pdfBytes := service.GenerateInvoicePDF(order, inv)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="`+inv.InvoiceNumber+`.pdf"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdfBytes)
}

