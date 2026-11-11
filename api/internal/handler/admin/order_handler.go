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

type OrderHandler struct {
	svc *service.OrderService
}

func NewOrderHandler(svc *service.OrderService) *OrderHandler {
	return &OrderHandler{svc: svc}
}

type OrdersListResponse struct {
	Items []domain.Order        `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type OrderUploadsResponse struct {
	Items []domain.OrderUploadEntry `json:"items"`
	Meta  handler.PaginatedMeta     `json:"meta"`
}

type PaymentLinksListResponse struct {
	Items []domain.PaymentLink  `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type InvoicesListResponse struct {
	Items []domain.Invoice      `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=placed confirmed assigned out_for_delivery delivered cancelled refunded"`
	Reason string `json:"reason"`
}

type AssignOrderRequest struct {
	DecoratorTeamID      *int64 `json:"decorator_team_id"`
	DeliveryPartnerName  string `json:"delivery_partner_name"`
	DeliveryPartnerPhone string `json:"delivery_partner_phone"`
}

type UpdateOrderNotesRequest struct {
	TrackingID    string `json:"tracking_id"`
	InternalNotes string `json:"internal_notes"`
}

type ResendNotificationRequest struct {
	Event string `json:"event"`
}

// ListOrders godoc
// @Summary List and filter orders (status, date range, city, delivery type, payment, search)
// @Tags Admin Orders
// @Produce json
// @Security BearerAuth
// @Param status query string false "placed | confirmed | assigned | out_for_delivery | delivered | cancelled | refunded"
// @Param payment_status query string false "pending | paid | failed | refunded"
// @Param payment_method query string false "razorpay | cod | payment_link"
// @Param delivery_type query string false "Delivery type slug"
// @Param city_id query int false "City ID"
// @Param category_id query int false "Category ID"
// @Param date_from query string false "From YYYY-MM-DD"
// @Param date_to query string false "To YYYY-MM-DD"
// @Param search query string false "Search order number, phone, or recipient"
// @Param sort_by query string false "newest | oldest | total_desc | delivery_date"
// @Param page query int false "Page" default(1)
// @Param limit query int false "Limit" default(20)
// @Success 200 {object} OrdersListResponse
// @Router /api/v1/admin/orders [get]
func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 20
	}
	f := domain.OrderListFilter{
		Status:        q.Get("status"),
		PaymentStatus: q.Get("payment_status"),
		PaymentMethod: q.Get("payment_method"),
		DeliveryType:  q.Get("delivery_type"),
		DateFrom:      q.Get("date_from"),
		DateTo:        q.Get("date_to"),
		Search:        q.Get("search"),
		SortBy:        q.Get("sort_by"),
		Page:          page,
		Limit:         limit,
	}
	if cid, err := strconv.ParseInt(q.Get("city_id"), 10, 64); err == nil && cid > 0 {
		f.CityID = &cid
	}
	if catID, err := strconv.ParseInt(q.Get("category_id"), 10, 64); err == nil && catID > 0 {
		f.CategoryID = &catID
	}
	if m := q.Get("is_manual"); m == "true" || m == "false" {
		val := m == "true"
		f.IsManual = &val
	}

	items, total, err := h.svc.ListOrders(r.Context(), f, middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, OrdersListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// GetOrder godoc
// @Summary Get full order detail including items, timeline history, and assignments
// @Tags Admin Orders
// @Produce json
// @Security BearerAuth
// @Param id path string true "Order ID or Order Number"
// @Success 200 {object} domain.Order
// @Router /api/v1/admin/orders/{id} [get]
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	raw := chi.URLParam(r, "id")
	var idPtr *int64
	orderNum := ""
	if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil {
		idPtr = &parsed
	} else {
		orderNum = raw
	}
	o, err := h.svc.GetOrder(r.Context(), idPtr, orderNum, middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, o)
}

// CreateManualOrder godoc
// @Summary Create a manual order from Admin CMS (transactional stock + slot FOR UPDATE locking)
// @Tags Admin Orders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.CreateOrderInput true "Order input"
// @Success 201 {object} domain.Order
// @Router /api/v1/admin/orders/manual [post]
func (h *OrderHandler) CreateManualOrder(w http.ResponseWriter, r *http.Request) {
	var in domain.CreateOrderInput
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	in.IsManual = true
	o, err := h.svc.CreateOrder(r.Context(), in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, o)
}

// UpdateOrderStatus godoc
// @Summary Update order status using state machine (rejects invalid transitions)
// @Tags Admin Orders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Order ID"
// @Param payload body UpdateOrderStatusRequest true "New status"
// @Success 200 {object} domain.Order
// @Router /api/v1/admin/orders/{id}/status [put]
func (h *OrderHandler) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	var req UpdateOrderStatusRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	o, err := h.svc.UpdateOrderStatus(r.Context(), id, req.Status, req.Reason, middleware.AdminFromContext(r.Context()), "admin", chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, o)
}

// AssignOrder godoc
// @Summary Assign decorator team or delivery partner to an order
// @Tags Admin Orders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Order ID"
// @Param payload body AssignOrderRequest true "Assignment"
// @Success 200 {object} domain.Order
// @Router /api/v1/admin/orders/{id}/assign [post]
func (h *OrderHandler) AssignOrder(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	var req AssignOrderRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	o, err := h.svc.AssignOrder(r.Context(), id, req.DecoratorTeamID, req.DeliveryPartnerName, req.DeliveryPartnerPhone, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, o)
}

// UpdateOrderNotes godoc
// @Summary Update tracking ID and internal admin notes on an order
// @Tags Admin Orders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Order ID"
// @Param payload body UpdateOrderNotesRequest true "Notes & Tracking"
// @Success 200 {object} domain.Order
// @Router /api/v1/admin/orders/{id}/notes [put]
func (h *OrderHandler) UpdateOrderNotes(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	var req UpdateOrderNotesRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	o, err := h.svc.UpdateTrackingNotes(r.Context(), id, req.TrackingID, req.InternalNotes, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, o)
}

// ResendOrderNotification godoc
// @Summary Resend SMS/WhatsApp/Email notification for an order
// @Tags Admin Orders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Order ID"
// @Param payload body ResendNotificationRequest false "Optional event override"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/orders/{id}/resend-notification [post]
func (h *OrderHandler) ResendOrderNotification(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	var req ResendNotificationRequest
	_ = handler.DecodeAndValidate(r, &req)
	if err := h.svc.ResendNotification(r.Context(), id, req.Event, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "notification queued"})
}

// ExportOrdersCSV godoc
// @Summary Export filtered orders to CSV
// @Tags Admin Orders
// @Produce text/csv
// @Security BearerAuth
// @Success 200 {string} string "CSV content"
// @Router /api/v1/admin/orders/export-csv [get]
func (h *OrderHandler) ExportOrdersCSV(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := domain.OrderListFilter{
		Status:        q.Get("status"),
		PaymentStatus: q.Get("payment_status"),
		DateFrom:      q.Get("date_from"),
		DateTo:        q.Get("date_to"),
		Search:        q.Get("search"),
	}
	data, err := h.svc.ExportOrdersCSV(r.Context(), f, middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="giftlaya-orders.csv"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// CalendarBookings godoc
// @Summary List daily booking calendar counts by month (YYYY-MM)
// @Tags Admin Orders
// @Produce json
// @Security BearerAuth
// @Param month query string false "YYYY-MM"
// @Param city_id query int false "Optional City ID"
// @Success 200 {array} map[string]any
// @Router /api/v1/admin/orders/calendar [get]
func (h *OrderHandler) CalendarBookings(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var cityID *int64
	if cid, err := strconv.ParseInt(q.Get("city_id"), 10, 64); err == nil && cid > 0 {
		cityID = &cid
	}
	rows, err := h.svc.GetCalendarBookings(r.Context(), q.Get("month"), cityID)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, rows)
}

// ListPaymentLinks godoc
// @Summary List payment links
// @Tags Admin Orders
// @Produce json
// @Security BearerAuth
// @Success 200 {object} PaymentLinksListResponse
// @Router /api/v1/admin/payment-links [get]
func (h *OrderHandler) ListPaymentLinks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	items, total, err := h.svc.ListPaymentLinks(r.Context(), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, PaymentLinksListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// CreatePaymentLink godoc
// @Summary Create a payment link for manual/phone orders
// @Tags Admin Orders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.PaymentLink true "Payment Link"
// @Success 201 {object} domain.PaymentLink
// @Router /api/v1/admin/payment-links [post]
func (h *OrderHandler) CreatePaymentLink(w http.ResponseWriter, r *http.Request) {
	var in domain.PaymentLink
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.CreatePaymentLink(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// ListInvoices godoc
// @Summary List GST invoices
// @Tags Admin Orders
// @Produce json
// @Security BearerAuth
// @Success 200 {object} InvoicesListResponse
// @Router /api/v1/admin/invoices [get]
func (h *OrderHandler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	items, total, err := h.svc.ListInvoices(r.Context(), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, InvoicesListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// GetOrderInvoice godoc
// @Summary Get or generate GST invoice for an order
// @Tags Admin Orders
// @Produce json
// @Security BearerAuth
// @Param id path int true "Order ID"
// @Success 200 {object} domain.Invoice
// @Router /api/v1/admin/orders/{id}/invoice [get]
func (h *OrderHandler) GetOrderInvoice(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	inv, err := h.svc.GetOrGenerateInvoice(r.Context(), id, middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, inv)
}

// ListOrderUploads godoc
// @Summary List customer personalization uploads on orders
// @Tags Admin Orders
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page" default(1)
// @Param limit query int false "Limit" default(25)
// @Success 200 {object} OrderUploadsResponse
// @Router /api/v1/admin/orders/uploads [get]
func (h *OrderHandler) ListOrderUploads(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	items, total, err := h.svc.ListOrderUploads(r.Context(), page, limit, middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, OrderUploadsResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

