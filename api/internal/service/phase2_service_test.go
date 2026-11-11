package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"testing"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

type mockPhase2Repo struct {
	seenEvents map[string]bool
	coinsBal   map[int64]int
}

func newMockPhase2Repo() *mockPhase2Repo {
	return &mockPhase2Repo{
		seenEvents: make(map[string]bool),
		coinsBal:   map[int64]int{1: 100},
	}
}

func (m *mockPhase2Repo) ListHeroBanners(context.Context, bool) ([]domain.HeroBanner, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SaveHeroBanner(_ context.Context, b *domain.HeroBanner) (*domain.HeroBanner, error) {
	return b, nil
}
func (m *mockPhase2Repo) DeleteHeroBanner(context.Context, int64) error { return nil }
func (m *mockPhase2Repo) ListHomepageSections(context.Context, bool) ([]domain.HomepageSection, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SaveHomepageSection(_ context.Context, s *domain.HomepageSection) (*domain.HomepageSection, error) {
	return s, nil
}
func (m *mockPhase2Repo) DeleteHomepageSection(context.Context, int64) error { return nil }
func (m *mockPhase2Repo) ListStates(context.Context) ([]domain.State, error) { return nil, nil }
func (m *mockPhase2Repo) SaveState(_ context.Context, s *domain.State) (*domain.State, error) {
	return s, nil
}
func (m *mockPhase2Repo) ListCities(context.Context, string, bool) ([]domain.City, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SaveCity(_ context.Context, c *domain.City) (*domain.City, error) {
	return c, nil
}
func (m *mockPhase2Repo) ListPincodes(context.Context, *int64, string, int, int) ([]domain.Pincode, int64, error) {
	return nil, 0, nil
}
func (m *mockPhase2Repo) SavePincode(_ context.Context, p *domain.Pincode) (*domain.Pincode, error) {
	return p, nil
}
func (m *mockPhase2Repo) DeletePincode(context.Context, int64) error { return nil }
func (m *mockPhase2Repo) ListTimeSlots(context.Context, bool) ([]domain.TimeSlotTemplate, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SaveTimeSlot(_ context.Context, t *domain.TimeSlotTemplate) (*domain.TimeSlotTemplate, error) {
	return t, nil
}
func (m *mockPhase2Repo) ListSlotLedger(context.Context, int64, string) ([]domain.SlotCapacityOverride, error) {
	return nil, nil
}
func (m *mockPhase2Repo) UpsertSlotLedger(_ context.Context, o *domain.SlotCapacityOverride) (*domain.SlotCapacityOverride, error) {
	return o, nil
}
func (m *mockPhase2Repo) ListBlackoutDates(context.Context, *int64) ([]domain.BlackoutDate, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SaveBlackoutDate(_ context.Context, b *domain.BlackoutDate) (*domain.BlackoutDate, error) {
	return b, nil
}
func (m *mockPhase2Repo) DeleteBlackoutDate(context.Context, int64) error { return nil }
func (m *mockPhase2Repo) ListDecoratorTeams(context.Context, *int64) ([]domain.DecoratorTeam, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SaveDecoratorTeam(_ context.Context, d *domain.DecoratorTeam) (*domain.DecoratorTeam, error) {
	return d, nil
}
func (m *mockPhase2Repo) ListPresets(context.Context, string, string) ([]domain.Preset, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SavePreset(_ context.Context, p *domain.Preset) (*domain.Preset, error) {
	return p, nil
}
func (m *mockPhase2Repo) DeletePreset(context.Context, int64) error { return nil }
func (m *mockPhase2Repo) ListCustomers(context.Context, string, int, int) ([]domain.Customer, int64, error) {
	return nil, 0, nil
}
func (m *mockPhase2Repo) GetCustomerDetail(context.Context, int64) (*domain.Customer, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SetCustomerBlocked(context.Context, int64, bool) error { return nil }
func (m *mockPhase2Repo) AdjustCustomerCoinsTx(_ context.Context, cid int64, delta int, _ string, _ int64) (int, error) {
	next := m.coinsBal[cid] + delta
	if next < 0 {
		return 0, domain.ErrInsufficientCoins
	}
	m.coinsBal[cid] = next
	return next, nil
}
func (m *mockPhase2Repo) ListCoupons(context.Context, string) ([]domain.Coupon, error) {
	return nil, nil
}
func (m *mockPhase2Repo) SaveCoupon(_ context.Context, c *domain.Coupon) (*domain.Coupon, error) {
	return c, nil
}
func (m *mockPhase2Repo) DeleteCoupon(context.Context, int64) error { return nil }
func (m *mockPhase2Repo) ListPaymentTransactions(context.Context, string, int, int) ([]domain.PaymentTransaction, int64, error) {
	return nil, 0, nil
}
func (m *mockPhase2Repo) RecordIdempotentPaymentWebhookTx(_ context.Context, txIn *domain.PaymentTransaction) (bool, error) {
	key := txIn.Gateway + ":" + txIn.GatewayEventID
	if m.seenEvents[key] {
		return true, nil
	}
	m.seenEvents[key] = true
	return false, nil
}
func (m *mockPhase2Repo) ListRefunds(context.Context, int, int) ([]domain.Refund, int64, error) {
	return nil, 0, nil
}
func (m *mockPhase2Repo) CreateRefundTx(_ context.Context, r *domain.Refund, _ int64) (*domain.Refund, error) {
	return r, nil
}
func (m *mockPhase2Repo) GetSettlementReport(context.Context, time.Time, time.Time) (*domain.SettlementReport, error) {
	return &domain.SettlementReport{}, nil
}

func TestRazorpayWebhookHMACAndIdempotency(t *testing.T) {
	secret := "rzp_test_secret_123"
	repo := newMockPhase2Repo()
	svc := NewPhase2Service(repo, nil, secret)

	body := []byte(`{"event_id":"evt_999","event":"payment.captured","order_id":42,"gateway_payment_id":"pay_111","amount_paise":199900}`)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	validSig := hex.EncodeToString(mac.Sum(nil))

	// Invalid signature must fail
	if _, err := svc.HandleRazorpayWebhook(context.Background(), "bad_sig", body); !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("expected ErrUnauthorized on bad signature, got %v", err)
	}

	// First delivery succeeds and is not duplicate
	dup1, err := svc.HandleRazorpayWebhook(context.Background(), validSig, body)
	if err != nil || dup1 {
		t.Fatalf("expected first webhook ok & duplicate=false, got dup=%v err=%v", dup1, err)
	}

	// Replay with same event_id returns duplicate=true idempotently
	dup2, err := svc.HandleRazorpayWebhook(context.Background(), validSig, body)
	if err != nil || !dup2 {
		t.Fatalf("expected duplicate=true on replay, got dup=%v err=%v", dup2, err)
	}
}

func TestCoinsAdjustmentValidation(t *testing.T) {
	repo := newMockPhase2Repo()
	svc := NewPhase2Service(repo, nil, "")
	admin := &domain.AdminProfile{ID: 1, Username: "superadmin"}

	bal, err := svc.AdjustCustomerCoins(context.Background(), 1, 50, "Bonus", admin, "r1", "127.0.0.1")
	if err != nil || bal != 150 {
		t.Fatalf("expected balance 150, got %d err=%v", bal, err)
	}
	if _, err := svc.AdjustCustomerCoins(context.Background(), 1, -200, "Over-deduct", admin, "r2", "127.0.0.1"); !errors.Is(err, domain.ErrInsufficientCoins) {
		t.Fatalf("expected ErrInsufficientCoins, got %v", err)
	}
}

func TestGenerateInvoicePDFValidStructure(t *testing.T) {
	d := "2026-11-15"
	order := &domain.Order{
		OrderNumber:    "GL-2026-8888",
		CityName:       "Kolkata",
		DeliveryDate:   &d,
		RecipientName:  "Riya Sharma",
		RecipientPhone: "+919876543210",
		SubtotalPaise:  150000,
		TaxGSTPaise:    27000,
		TotalPaise:     177000,
		PaymentStatus:  "paid",
		PaymentMethod:  "razorpay",
		Items: []domain.OrderItem{
			{ProductTitle: "Pastel Balloon Backdrop", Qty: 1, LineTotalPaise: 150000},
		},
	}
	inv := &domain.Invoice{
		InvoiceNumber: "INV-GL-2026-8888",
		GSTINSeller:   "19AABCG1234F1Z2",
		GeneratedAt:   time.Now(),
	}
	pdf := GenerateInvoicePDF(order, inv)
	if !bytes.HasPrefix(pdf, []byte("%PDF-1.4\n")) {
		t.Fatalf("expected %%PDF-1.4 header")
	}
	if !bytes.Contains(pdf, []byte("INV-GL-2026-8888")) || !bytes.Contains(pdf, []byte("19AABCG1234F1Z2")) {
		t.Fatalf("expected invoice number and seller GSTIN inside PDF stream")
	}
	if !bytes.Contains(pdf, []byte("%%EOF")) {
		t.Fatalf("expected %%EOF trailer")
	}
}

