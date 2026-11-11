package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/notify"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrderRuntimeConfig struct {
	CancelCutoffHours int
	CancelFeePercent  int
	CoinsEarnPercent  int
	GSTINSeller       string
}

type OrderSettingsReader interface {
	LoadOrderRuntimeConfig(ctx context.Context) OrderRuntimeConfig
}

type CoinsCreditor interface {
	CreditDeliveredOrderCoins(ctx context.Context, order *domain.Order, earnPercent int) error
}

type PGRuntimeOrderHelpers struct {
	pool *pgxpool.Pool
}

func NewPGRuntimeOrderHelpers(pool *pgxpool.Pool) *PGRuntimeOrderHelpers {
	return &PGRuntimeOrderHelpers{pool: pool}
}

func (h *PGRuntimeOrderHelpers) LoadOrderRuntimeConfig(ctx context.Context) OrderRuntimeConfig {
	cfg := OrderRuntimeConfig{
		CancelCutoffHours: 24,
		CancelFeePercent:  25,
		CoinsEarnPercent:  10,
		GSTINSeller:       "27AABCG1234F1Z5",
	}
	if h.pool == nil {
		return cfg
	}

	var raw []byte
	if err := h.pool.QueryRow(ctx, `SELECT value_json FROM site_settings WHERE key = 'cancellation_rules'`).Scan(&raw); err == nil {
		var v struct {
			CutoffHours int `json:"cutoff_hours"`
			FeePercent  int `json:"fee_percent"`
		}
		if json.Unmarshal(raw, &v) == nil {
			if v.CutoffHours > 0 {
				cfg.CancelCutoffHours = v.CutoffHours
			}
			if v.FeePercent > 0 {
				cfg.CancelFeePercent = v.FeePercent
			}
		}
	}

	raw = nil
	if err := h.pool.QueryRow(ctx, `SELECT value_json FROM site_settings WHERE key = 'coins_config'`).Scan(&raw); err == nil {
		var v struct {
			EarnPercent int `json:"earn_percent"`
		}
		if json.Unmarshal(raw, &v) == nil && v.EarnPercent > 0 {
			cfg.CoinsEarnPercent = v.EarnPercent
		}
	}

	raw = nil
	if err := h.pool.QueryRow(ctx, `SELECT value_json FROM site_settings WHERE key = 'tax_gst'`).Scan(&raw); err == nil {
		var v struct {
			GSTIN string `json:"gstin"`
		}
		if json.Unmarshal(raw, &v) == nil && v.GSTIN != "" {
			cfg.GSTINSeller = v.GSTIN
		}
	}
	return cfg
}

func (h *PGRuntimeOrderHelpers) CreditDeliveredOrderCoins(ctx context.Context, order *domain.Order, earnPercent int) error {
	if h.pool == nil || order == nil || order.CustomerID == nil || earnPercent <= 0 {
		return nil
	}
	coins := int(((order.SubtotalPaise / 100) * int64(earnPercent)) / 100)
	if coins <= 0 {
		return nil
	}
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var exists bool
	_ = tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM coin_transactions WHERE order_id = $1 AND tx_type = 'earn')`, order.ID).Scan(&exists)
	if exists {
		return nil
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO coin_wallets (customer_id, balance_coins, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (customer_id) DO UPDATE SET balance_coins = coin_wallets.balance_coins + EXCLUDED.balance_coins, updated_at = NOW()
	`, *order.CustomerID, coins)
	if err != nil {
		return err
	}

	exp := time.Now().AddDate(0, 6, 0)
	_, err = tx.Exec(ctx, `
		INSERT INTO coin_transactions (customer_id, order_id, delta, tx_type, note, expires_at)
		VALUES ($1, $2, $3, 'earn', $4, $5)
	`, *order.CustomerID, order.ID, coins, fmt.Sprintf("Earned %d%% on %s", earnPercent, order.OrderNumber), exp)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

type OrderService struct {
	repo     domain.OrderRepository
	settings OrderSettingsReader
	coins    CoinsCreditor
	auditSvc *AuditService
	notifier notify.Notifier
}

func NewOrderService(
	repo domain.OrderRepository,
	settings OrderSettingsReader,
	coins CoinsCreditor,
	auditSvc *AuditService,
	notifier notify.Notifier,
) *OrderService {
	return &OrderService{
		repo:     repo,
		settings: settings,
		coins:    coins,
		auditSvc: auditSvc,
		notifier: notifier,
	}
}

func (s *OrderService) runtimeConfig(ctx context.Context) OrderRuntimeConfig {
	if s.settings != nil {
		return s.settings.LoadOrderRuntimeConfig(ctx)
	}
	return OrderRuntimeConfig{
		CancelCutoffHours: 24,
		CancelFeePercent:  25,
		CoinsEarnPercent:  10,
		GSTINSeller:       "27AABCG1234F1Z5",
	}
}

func assertOrderVendorAccess(o *domain.Order, admin *domain.AdminProfile) error {
	if admin != nil && admin.SellerID != nil {
		for _, it := range o.Items {
			if it.SellerID != nil && *it.SellerID == *admin.SellerID {
				return nil
			}
		}
		return domain.ErrForbidden
	}
	return nil
}

func (s *OrderService) CreateOrder(ctx context.Context, in domain.CreateOrderInput, admin *domain.AdminProfile, reqID, ip string) (*domain.Order, error) {
	cfg := s.runtimeConfig(ctx)
	order, err := s.repo.CreateOrderTx(ctx, in, cfg.CancelFeePercent, cfg.CoinsEarnPercent)
	if err != nil {
		return nil, err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "order", "order.create_manual", "order", order.ID, reqID, ip, nil, map[string]any{
			"order_number": order.OrderNumber, "total_paise": order.TotalPaise,
		})
	}
	s.notifyOrderEvent(ctx, order, "order.placed")
	return order, nil
}

func (s *OrderService) ListOrders(ctx context.Context, f domain.OrderListFilter, admin *domain.AdminProfile) ([]domain.Order, int64, error) {
	if admin != nil && admin.SellerID != nil {
		sid := *admin.SellerID
		f.SellerID = &sid
	}
	return s.repo.ListOrders(ctx, f)
}

func (s *OrderService) GetOrder(ctx context.Context, id *int64, orderNum string, admin *domain.AdminProfile) (*domain.Order, error) {
	o, err := s.repo.GetOrderByIDOrNumber(ctx, id, orderNum)
	if err != nil {
		return nil, err
	}
	if err := assertOrderVendorAccess(o, admin); err != nil {
		return nil, err
	}
	return o, nil
}

func (s *OrderService) UpdateOrderStatus(ctx context.Context, orderID int64, toStatus, reason string, admin *domain.AdminProfile, actorType, reqID, ip string) (*domain.Order, error) {
	existing, err := s.repo.GetOrderByIDOrNumber(ctx, &orderID, "")
	if err != nil {
		return nil, err
	}
	if err := assertOrderVendorAccess(existing, admin); err != nil {
		return nil, err
	}
	cfg := s.runtimeConfig(ctx)
	var actorID *int64
	if admin != nil {
		actorID = &admin.ID
		if actorType == "" {
			actorType = "admin"
		}
	} else if actorType == "" {
		actorType = "customer"
	}

	updated, err := s.repo.UpdateOrderStatusTx(ctx, orderID, toStatus, actorType, actorID, reason, cfg.CancelCutoffHours, cfg.CancelFeePercent)
	if err != nil {
		return nil, err
	}

	if toStatus == domain.OrderStatusDelivered && s.coins != nil {
		_ = s.coins.CreditDeliveredOrderCoins(ctx, updated, cfg.CoinsEarnPercent)
	}

	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "order", "order.status_update", "order", orderID, reqID, ip, map[string]any{
			"status": existing.Status,
		}, map[string]any{
			"status": updated.Status, "reason": reason, "cancellation_fee_paise": updated.CancellationFeePaise,
		})
	}
	s.notifyOrderEvent(ctx, updated, "order."+toStatus)
	return updated, nil
}

func (s *OrderService) AssignOrder(ctx context.Context, orderID int64, decoratorTeamID *int64, partnerName, partnerPhone string, admin *domain.AdminProfile, reqID, ip string) (*domain.Order, error) {
	existing, err := s.repo.GetOrderByIDOrNumber(ctx, &orderID, "")
	if err != nil {
		return nil, err
	}
	if err := assertOrderVendorAccess(existing, admin); err != nil {
		return nil, err
	}
	if existing.Status == domain.OrderStatusCancelled || existing.Status == domain.OrderStatusDelivered || existing.Status == domain.OrderStatusRefunded {
		return nil, domain.ErrInvalidTransition
	}
	var adminID *int64
	if admin != nil {
		adminID = &admin.ID
	}
	assignment, err := s.repo.AssignOrder(ctx, orderID, decoratorTeamID, partnerName, partnerPhone, adminID)
	if err != nil {
		return nil, err
	}

	cfg := s.runtimeConfig(ctx)
	if existing.Status == domain.OrderStatusPlaced {
		if _, err := s.repo.UpdateOrderStatusTx(ctx, orderID, domain.OrderStatusConfirmed, "admin", adminID, "Auto-confirmed on assignment", cfg.CancelCutoffHours, cfg.CancelFeePercent); err != nil {
			return nil, err
		}
	}
	if existing.Status == domain.OrderStatusPlaced || existing.Status == domain.OrderStatusConfirmed {
		if _, err := s.repo.UpdateOrderStatusTx(ctx, orderID, domain.OrderStatusAssigned, "admin", adminID, "Partner/decorator assigned", cfg.CancelCutoffHours, cfg.CancelFeePercent); err != nil {
			return nil, err
		}
	}

	updated, err := s.repo.GetOrderByIDOrNumber(ctx, &orderID, "")
	if err != nil {
		return nil, err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "order", "order.assign", "order", orderID, reqID, ip, nil, assignment)
	}
	return updated, nil
}

func (s *OrderService) UpdateTrackingNotes(ctx context.Context, orderID int64, trackingID, internalNotes string, admin *domain.AdminProfile, reqID, ip string) (*domain.Order, error) {
	existing, err := s.repo.GetOrderByIDOrNumber(ctx, &orderID, "")
	if err != nil {
		return nil, err
	}
	if err := assertOrderVendorAccess(existing, admin); err != nil {
		return nil, err
	}
	updated, err := s.repo.UpdateOrderTrackingNotes(ctx, orderID, trackingID, internalNotes)
	if err != nil {
		return nil, err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "order", "order.update_notes", "order", orderID, reqID, ip, map[string]any{
			"tracking_id": existing.TrackingID, "internal_notes": existing.InternalNotes,
		}, map[string]any{
			"tracking_id": updated.TrackingID, "internal_notes": updated.InternalNotes,
		})
	}
	return updated, nil
}

func (s *OrderService) ResendNotification(ctx context.Context, orderID int64, event string, admin *domain.AdminProfile, reqID, ip string) error {
	o, err := s.GetOrder(ctx, &orderID, "", admin)
	if err != nil {
		return err
	}
	if event == "" {
		event = "order." + o.Status
	}
	s.notifyOrderEvent(ctx, o, event)
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "order", "order.resend_notification", "order", orderID, reqID, ip, nil, map[string]string{"event": event})
	}
	return nil
}

func (s *OrderService) notifyOrderEvent(ctx context.Context, o *domain.Order, event string) {
	if s.notifier == nil || o == nil {
		return
	}
	delivDate := ""
	if o.DeliveryDate != nil {
		delivDate = *o.DeliveryDate
	}
	msg := fmt.Sprintf("[%s] Order %s for %s (City: %s, Date: %s, Slot: %s, Total: INR %.2f)",
		event, o.OrderNumber, o.RecipientName, o.CityName, delivDate, o.SlotLabel, float64(o.TotalPaise)/100)
	_ = s.notifier.Send(ctx, notify.Message{
		Channel: "whatsapp",
		To:      o.RecipientPhone,
		Subject: event,
		Body:    msg,
		Metadata: map[string]any{
			"order_id": o.OrderNumber,
			"name":     o.RecipientName,
			"slot":     o.SlotLabel,
		},
	})
}

func (s *OrderService) ExportOrdersCSV(ctx context.Context, f domain.OrderListFilter, admin *domain.AdminProfile) ([]byte, error) {
	f.Page = 1
	f.Limit = 2000
	orders, _, err := s.ListOrders(ctx, f, admin)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{
		"ID", "Order Number", "City", "Recipient", "Phone", "Status", "Payment Status", "Payment Method",
		"Delivery Date", "Slot", "Total (INR)", "Cancel Fee (INR)", "Placed At",
	})
	for _, o := range orders {
		deliv := ""
		if o.DeliveryDate != nil {
			deliv = *o.DeliveryDate
		}
		_ = w.Write([]string{
			strconv.FormatInt(o.ID, 10),
			o.OrderNumber,
			o.CityName,
			o.RecipientName,
			o.RecipientPhone,
			o.Status,
			o.PaymentStatus,
			o.PaymentMethod,
			deliv,
			o.SlotLabel,
			fmt.Sprintf("%.2f", float64(o.TotalPaise)/100),
			fmt.Sprintf("%.2f", float64(o.CancellationFeePaise)/100),
			o.PlacedAt.Format(time.RFC3339),
		})
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

func (s *OrderService) GetCalendarBookings(ctx context.Context, month string, cityID *int64) ([]map[string]any, error) {
	return s.repo.GetCalendarBookings(ctx, month, cityID)
}

func (s *OrderService) ListOrderUploads(ctx context.Context, page, limit int, admin *domain.AdminProfile) ([]domain.OrderUploadEntry, int64, error) {
	var sellerID *int64
	if admin != nil && admin.SellerID != nil {
		sid := *admin.SellerID
		sellerID = &sid
	}
	return s.repo.ListOrderUploads(ctx, sellerID, page, limit)
}

func (s *OrderService) ListPaymentLinks(ctx context.Context, page, limit int) ([]domain.PaymentLink, int64, error) {
	return s.repo.ListPaymentLinks(ctx, page, limit)
}

func (s *OrderService) CreatePaymentLink(ctx context.Context, link *domain.PaymentLink, admin *domain.AdminProfile, reqID, ip string) (*domain.PaymentLink, error) {
	if admin != nil {
		link.CreatedByAdminID = &admin.ID
	}
	if link.ShortURL == "" {
		link.ShortURL = fmt.Sprintf("https://pay.giftlaya.com/pl/%d", time.Now().UnixNano()%10000000)
	}
	if link.Status == "" {
		link.Status = "created"
	}
	out, err := s.repo.CreatePaymentLink(ctx, link)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "order", "payment_link.create", "payment_link", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *OrderService) ListInvoices(ctx context.Context, page, limit int) ([]domain.Invoice, int64, error) {
	return s.repo.ListInvoices(ctx, page, limit)
}

func (s *OrderService) GetOrGenerateInvoice(ctx context.Context, orderID int64, admin *domain.AdminProfile) (*domain.Invoice, error) {
	o, err := s.GetOrder(ctx, &orderID, "", admin)
	if err != nil {
		return nil, err
	}
	_ = o
	cfg := s.runtimeConfig(ctx)
	return s.repo.GetOrGenerateInvoice(ctx, orderID, cfg.GSTINSeller)
}
