package public

import (
	"io"
	"net/http"

	"github.com/giftlaya/giftlaya-api/internal/handler"
	"github.com/giftlaya/giftlaya-api/internal/service"
)

type WebhookHandler struct {
	phase2Svc *service.Phase2Service
}

func NewWebhookHandler(phase2Svc *service.Phase2Service) *WebhookHandler {
	return &WebhookHandler{phase2Svc: phase2Svc}
}

// RazorpayWebhook godoc
// @Summary Idempotent Razorpay payment gateway webhook receiver
// @Tags Public Payments
// @Accept json
// @Produce json
// @Success 200 {object} map[string]any
// @Router /api/v1/public/webhooks/razorpay [post]
func (h *WebhookHandler) RazorpayWebhook(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "failed to read webhook body")
		return
	}
	sig := r.Header.Get("X-Razorpay-Signature")
	duplicate, err := h.phase2Svc.HandleRazorpayWebhook(r.Context(), sig, body)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"duplicate": duplicate,
	})
}

