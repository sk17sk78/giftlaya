package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

type Phase2Service struct {
	repo       domain.Phase2Repository
	auditSvc   *AuditService
	webhookSec string
}

func NewPhase2Service(repo domain.Phase2Repository, auditSvc *AuditService, razorpayWebhookSec string) *Phase2Service {
	return &Phase2Service{
		repo:       repo,
		auditSvc:   auditSvc,
		webhookSec: razorpayWebhookSec,
	}
}

func VerifyHMACSHA256(secret string, payload []byte, providedHex string) bool {
	if secret == "" || providedHex == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := mac.Sum(nil)
	decoded, err := hex.DecodeString(strings.TrimSpace(providedHex))
	if err != nil {
		return false
	}
	return hmac.Equal(expected, decoded)
}

// ---------- Homepage & Banners ----------

func (s *Phase2Service) ListHeroBanners(ctx context.Context, activeOnly bool) ([]domain.HeroBanner, error) {
	return s.repo.ListHeroBanners(ctx, activeOnly)
}

func (s *Phase2Service) SaveHeroBanner(ctx context.Context, b *domain.HeroBanner, admin *domain.AdminProfile, reqID, ip string) (*domain.HeroBanner, error) {
	out, err := s.repo.SaveHeroBanner(ctx, b)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "page", "banner.save", "hero_banner", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) DeleteHeroBanner(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.DeleteHeroBanner(ctx, id); err != nil {
		return err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "page", "banner.delete", "hero_banner", id, reqID, ip, nil, nil)
	}
	return nil
}

func (s *Phase2Service) ListHomepageSections(ctx context.Context, activeOnly bool) ([]domain.HomepageSection, error) {
	return s.repo.ListHomepageSections(ctx, activeOnly)
}

func (s *Phase2Service) SaveHomepageSection(ctx context.Context, sec *domain.HomepageSection, admin *domain.AdminProfile, reqID, ip string) (*domain.HomepageSection, error) {
	if sec.SectionKey == "" {
		sec.SectionKey = Slugify(sec.Title)
	}
	out, err := s.repo.SaveHomepageSection(ctx, sec)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "page", "homepage_section.save", "homepage_section", out.ID, reqID, ip, nil, map[string]any{
			"section_key": out.SectionKey, "slider_enabled": out.SliderEnabled, "sort_order": out.SortOrder,
		})
	}
	return out, err
}

func (s *Phase2Service) DeleteHomepageSection(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.DeleteHomepageSection(ctx, id); err != nil {
		return err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "page", "homepage_section.delete", "homepage_section", id, reqID, ip, nil, nil)
	}
	return nil
}

// ---------- Geo, Slots, Blackouts, Decorators & Presets ----------

func (s *Phase2Service) ListStates(ctx context.Context) ([]domain.State, error) {
	return s.repo.ListStates(ctx)
}

func (s *Phase2Service) SaveState(ctx context.Context, st *domain.State, admin *domain.AdminProfile, reqID, ip string) (*domain.State, error) {
	if st.Slug == "" {
		st.Slug = Slugify(st.Name)
	}
	out, err := s.repo.SaveState(ctx, st)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "state.save", "state", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) ListCities(ctx context.Context, search string, activeOnly bool) ([]domain.City, error) {
	return s.repo.ListCities(ctx, search, activeOnly)
}

func (s *Phase2Service) SaveCity(ctx context.Context, c *domain.City, admin *domain.AdminProfile, reqID, ip string) (*domain.City, error) {
	if c.Slug == "" {
		c.Slug = Slugify(c.Name)
	}
	out, err := s.repo.SaveCity(ctx, c)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "city.save", "city", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) ListPincodes(ctx context.Context, cityID *int64, search string, page, limit int) ([]domain.Pincode, int64, error) {
	return s.repo.ListPincodes(ctx, cityID, search, page, limit)
}

func (s *Phase2Service) SavePincode(ctx context.Context, p *domain.Pincode, admin *domain.AdminProfile, reqID, ip string) (*domain.Pincode, error) {
	out, err := s.repo.SavePincode(ctx, p)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "pincode.save", "pincode", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) DeletePincode(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.DeletePincode(ctx, id); err != nil {
		return err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "pincode.delete", "pincode", id, reqID, ip, nil, nil)
	}
	return nil
}

func (s *Phase2Service) ListTimeSlots(ctx context.Context, activeOnly bool) ([]domain.TimeSlotTemplate, error) {
	return s.repo.ListTimeSlots(ctx, activeOnly)
}

func (s *Phase2Service) SaveTimeSlot(ctx context.Context, t *domain.TimeSlotTemplate, admin *domain.AdminProfile, reqID, ip string) (*domain.TimeSlotTemplate, error) {
	out, err := s.repo.SaveTimeSlot(ctx, t)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "time_slot.save", "time_slot", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) ListSlotLedger(ctx context.Context, cityID int64, date string) ([]domain.SlotCapacityOverride, error) {
	return s.repo.ListSlotLedger(ctx, cityID, date)
}

func (s *Phase2Service) UpsertSlotLedger(ctx context.Context, ov *domain.SlotCapacityOverride, admin *domain.AdminProfile, reqID, ip string) (*domain.SlotCapacityOverride, error) {
	out, err := s.repo.UpsertSlotLedger(ctx, ov)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "slot_ledger.upsert", "slot_ledger", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) ListBlackoutDates(ctx context.Context, cityID *int64) ([]domain.BlackoutDate, error) {
	return s.repo.ListBlackoutDates(ctx, cityID)
}

func (s *Phase2Service) SaveBlackoutDate(ctx context.Context, b *domain.BlackoutDate, admin *domain.AdminProfile, reqID, ip string) (*domain.BlackoutDate, error) {
	out, err := s.repo.SaveBlackoutDate(ctx, b)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "blackout_date.create", "blackout_date", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) DeleteBlackoutDate(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	return s.repo.DeleteBlackoutDate(ctx, id)
}

func (s *Phase2Service) ListDecoratorTeams(ctx context.Context, cityID *int64) ([]domain.DecoratorTeam, error) {
	return s.repo.ListDecoratorTeams(ctx, cityID)
}

func (s *Phase2Service) SaveDecoratorTeam(ctx context.Context, d *domain.DecoratorTeam, admin *domain.AdminProfile, reqID, ip string) (*domain.DecoratorTeam, error) {
	out, err := s.repo.SaveDecoratorTeam(ctx, d)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "decorator_team.save", "decorator_team", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) ListPresets(ctx context.Context, presetType, search string) ([]domain.Preset, error) {
	return s.repo.ListPresets(ctx, presetType, search)
}

func (s *Phase2Service) SavePreset(ctx context.Context, p *domain.Preset, admin *domain.AdminProfile, reqID, ip string) (*domain.Preset, error) {
	if p.Slug == "" {
		p.Slug = Slugify(p.Name)
	}
	out, err := s.repo.SavePreset(ctx, p)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "preset.save", "preset", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) DeletePreset(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.DeletePreset(ctx, id); err != nil {
		return err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "preset", "preset.delete", "preset", id, reqID, ip, nil, nil)
	}
	return nil
}

// ---------- Customers, Coins & Coupons ----------

func (s *Phase2Service) ListCustomers(ctx context.Context, search string, page, limit int) ([]domain.Customer, int64, error) {
	return s.repo.ListCustomers(ctx, search, page, limit)
}

func (s *Phase2Service) GetCustomerDetail(ctx context.Context, id int64) (*domain.Customer, error) {
	return s.repo.GetCustomerDetail(ctx, id)
}

func (s *Phase2Service) SetCustomerBlocked(ctx context.Context, id int64, blocked bool, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.SetCustomerBlocked(ctx, id, blocked); err != nil {
		return err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "user", "customer.block_toggle", "customer", id, reqID, ip, nil, map[string]bool{"is_blocked": blocked})
	}
	return nil
}

func (s *Phase2Service) AdjustCustomerCoins(ctx context.Context, customerID int64, delta int, note string, admin *domain.AdminProfile, reqID, ip string) (int, error) {
	if delta == 0 {
		return 0, fmt.Errorf("%w: coin delta cannot be 0", domain.ErrValidation)
	}
	var adminID int64
	if admin != nil {
		adminID = admin.ID
	}
	next, err := s.repo.AdjustCustomerCoinsTx(ctx, customerID, delta, note, adminID)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "user", "customer.coins_adjust", "customer", customerID, reqID, ip, nil, map[string]any{
			"delta": delta, "new_balance": next, "note": note,
		})
	}
	return next, err
}

func (s *Phase2Service) ListCoupons(ctx context.Context, search string) ([]domain.Coupon, error) {
	return s.repo.ListCoupons(ctx, search)
}

func (s *Phase2Service) SaveCoupon(ctx context.Context, c *domain.Coupon, admin *domain.AdminProfile, reqID, ip string) (*domain.Coupon, error) {
	out, err := s.repo.SaveCoupon(ctx, c)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "coupon.save", "coupon", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) DeleteCoupon(ctx context.Context, id int64, admin *domain.AdminProfile, reqID, ip string) error {
	if err := s.repo.DeleteCoupon(ctx, id); err != nil {
		return err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "coupon.delete", "coupon", id, reqID, ip, nil, nil)
	}
	return nil
}

// ---------- Payments, Idempotent Razorpay Webhook, Refunds & Settlement ----------

type RazorpayWebhookPayload struct {
	EventID          string `json:"event_id"`
	Event            string `json:"event"`
	OrderID          int64  `json:"order_id"`
	GatewayOrderID   string `json:"gateway_order_id"`
	GatewayPaymentID string `json:"gateway_payment_id"`
	AmountPaise      int64  `json:"amount_paise"`
}

func (s *Phase2Service) HandleRazorpayWebhook(ctx context.Context, sigHeader string, rawBody []byte) (duplicate bool, err error) {
	if s.webhookSec != "" && !VerifyHMACSHA256(s.webhookSec, rawBody, sigHeader) {
		return false, domain.ErrUnauthorized
	}
	var pl RazorpayWebhookPayload
	if err := json.Unmarshal(rawBody, &pl); err != nil {
		return false, fmt.Errorf("%w: invalid webhook json", domain.ErrValidation)
	}
	if pl.EventID == "" || pl.OrderID <= 0 {
		return false, fmt.Errorf("%w: event_id and order_id required", domain.ErrValidation)
	}
	status := "captured"
	if strings.Contains(strings.ToLower(pl.Event), "fail") {
		status = "failed"
	}
	return s.repo.RecordIdempotentPaymentWebhookTx(ctx, &domain.PaymentTransaction{
		OrderID:          pl.OrderID,
		Gateway:          "razorpay",
		GatewayOrderID:   pl.GatewayOrderID,
		GatewayPaymentID: pl.GatewayPaymentID,
		GatewayEventID:   pl.EventID,
		IdempotencyKey:   "rzp:" + pl.EventID,
		AmountPaise:      pl.AmountPaise,
		Status:           status,
		RawPayload:       rawBody,
	})
}

func (s *Phase2Service) ListPayments(ctx context.Context, status string, page, limit int) ([]domain.PaymentTransaction, int64, error) {
	return s.repo.ListPaymentTransactions(ctx, status, page, limit)
}

func (s *Phase2Service) ListRefunds(ctx context.Context, page, limit int) ([]domain.Refund, int64, error) {
	return s.repo.ListRefunds(ctx, page, limit)
}

func (s *Phase2Service) ProcessRefund(ctx context.Context, in *domain.Refund, admin *domain.AdminProfile, reqID, ip string) (*domain.Refund, error) {
	if in.IdempotencyKey == "" {
		in.IdempotencyKey = fmt.Sprintf("admin-rfnd-%d-%d", in.OrderID, time.Now().UnixNano())
	}
	var adminID int64
	if admin != nil {
		adminID = admin.ID
	}
	out, err := s.repo.CreateRefundTx(ctx, in, adminID)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "order", "payment.refund", "refund", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase2Service) GetSettlementReport(ctx context.Context, fromStr, toStr string) (*domain.SettlementReport, error) {
	now := time.Now()
	to := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
	from := to.AddDate(0, 0, -29)
	if fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}
	return s.repo.GetSettlementReport(ctx, from, to)
}

