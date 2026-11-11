package domain

import (
	"context"
	"encoding/json"
	"time"
)

// ---------- Homepage & Banners ----------

type HeroBanner struct {
	ID              int64      `json:"id"`
	Title           string     `json:"title" validate:"required"`
	Href            string     `json:"href" validate:"required"`
	DesktopImageURL string     `json:"desktop_image_url" validate:"required"`
	MobileImageURL  string     `json:"mobile_image_url"`
	StartsAt        *time.Time `json:"starts_at,omitempty"`
	EndsAt          *time.Time `json:"ends_at,omitempty"`
	SortOrder       int        `json:"sort_order"`
	IsActive        bool       `json:"is_active"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type HomepageSection struct {
	ID             int64           `json:"id"`
	SectionKey     string          `json:"section_key" validate:"required"`
	SectionType    string          `json:"section_type" validate:"required"`
	Title          string          `json:"title" validate:"required"`
	Subtitle       string          `json:"subtitle"`
	SliderEnabled  bool            `json:"slider_enabled"`
	RuleConfigJSON json.RawMessage `json:"rule_config_json" swaggertype:"object"`
	SortOrder      int             `json:"sort_order"`
	IsActive       bool            `json:"is_active"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

// ---------- Geo, Cities, Pincodes, Slots, Blackouts, Presets, Decorators ----------

type State struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name" validate:"required"`
	Slug      string    `json:"slug"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type City struct {
	ID                      int64     `json:"id"`
	StateID                 *int64    `json:"state_id,omitempty"`
	StateName               string    `json:"state_name,omitempty"`
	Name                    string    `json:"name" validate:"required"`
	Slug                    string    `json:"slug"`
	IsPopular               bool      `json:"is_popular"`
	LandmarkKey             string    `json:"landmark_key"`
	BaseDeliveryChargePaise int       `json:"base_delivery_charge_paise"`
	SameDayCutoffTime       string    `json:"same_day_cutoff_time"`
	MidnightAvailable       bool      `json:"midnight_available"`
	SortOrder               int       `json:"sort_order"`
	IsActive                bool      `json:"is_active"`
	CreatedAt               time.Time `json:"created_at"`
}

type Pincode struct {
	ID                 int64     `json:"id"`
	CityID             int64     `json:"city_id" validate:"required"`
	CityName           string    `json:"city_name,omitempty"`
	Code               string    `json:"code" validate:"required,min=4,max=10"`
	AreaName           string    `json:"area_name"`
	ExtraChargePaise   int       `json:"extra_charge_paise"`
	IsExpressAvailable bool      `json:"is_express_available"`
	IsServiceable      bool      `json:"is_serviceable"`
	CreatedAt          time.Time `json:"created_at"`
}

type TimeSlotTemplate struct {
	ID               int64  `json:"id"`
	Label            string `json:"label" validate:"required"`
	StartTime        string `json:"start_time" validate:"required"` // HH:MM
	EndTime          string `json:"end_time" validate:"required"`   // HH:MM
	IsMidnight       bool   `json:"is_midnight"`
	ExtraChargePaise int    `json:"extra_charge_paise"`
	DefaultCapacity  int    `json:"default_capacity"`
	SortOrder        int    `json:"sort_order"`
	IsActive         bool   `json:"is_active"`
}

type SlotCapacityOverride struct {
	ID             int64  `json:"id"`
	CityID         int64  `json:"city_id" validate:"required"`
	SlotTemplateID int64  `json:"slot_template_id" validate:"required"`
	SlotLabel      string `json:"slot_label,omitempty"`
	ServiceDate    string `json:"service_date" validate:"required"` // YYYY-MM-DD
	MaxCapacity    int    `json:"max_capacity"`
	ReservedCount  int    `json:"reserved_count"`
	IsBlocked      bool   `json:"is_blocked"`
}

type BlackoutDate struct {
	ID              int64  `json:"id"`
	CityID          *int64 `json:"city_id,omitempty"`
	CityName        string `json:"city_name,omitempty"`
	BlackoutDate    string `json:"blackout_date" validate:"required"` // YYYY-MM-DD
	Reason          string `json:"reason"`
	BlockSameDay    bool   `json:"block_same_day"`
	ExtraSurgePaise int    `json:"extra_surge_paise"`
}

type DecoratorTeam struct {
	ID            int64  `json:"id"`
	CityID        int64  `json:"city_id" validate:"required"`
	CityName      string `json:"city_name,omitempty"`
	Name          string `json:"name" validate:"required"`
	Phone         string `json:"phone" validate:"required"`
	DailyCapacity int    `json:"daily_capacity"`
	IsActive      bool   `json:"is_active"`
}

type Preset struct {
	ID         int64           `json:"id"`
	PresetType string          `json:"preset_type" validate:"required"`
	Name       string          `json:"name" validate:"required"`
	Slug       string          `json:"slug"`
	Metadata   json.RawMessage `json:"metadata" swaggertype:"object"`
	SortOrder  int             `json:"sort_order"`
	IsActive   bool            `json:"is_active"`
	CreatedAt  time.Time       `json:"created_at"`
}

// ---------- Customers, Coins & Coupons ----------

type CustomerAddress struct {
	ID             int64  `json:"id"`
	CustomerID     int64  `json:"customer_id"`
	Label          string `json:"label"`
	RecipientName  string `json:"recipient_name"`
	RecipientPhone string `json:"recipient_phone"`
	AddressLine1   string `json:"address_line1"`
	AddressLine2   string `json:"address_line2"`
	Landmark       string `json:"landmark"`
	CityID         *int64 `json:"city_id,omitempty"`
	CityName       string `json:"city_name,omitempty"`
	Pincode        string `json:"pincode"`
	IsDefault      bool   `json:"is_default"`
}

type CoinTransaction struct {
	ID          int64      `json:"id"`
	CustomerID  int64      `json:"customer_id"`
	OrderID     *int64     `json:"order_id,omitempty"`
	Delta       int        `json:"delta"`
	TxType      string     `json:"tx_type"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	Note        string     `json:"note"`
	AdminUserID *int64     `json:"admin_user_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Customer struct {
	ID             int64             `json:"id"`
	Name           string            `json:"name"`
	Phone          *string           `json:"phone,omitempty"`
	Email          *string           `json:"email,omitempty"`
	WhatsappOptIn  bool              `json:"whatsapp_opt_in"`
	IsBlocked      bool              `json:"is_blocked"`
	CoinsBalance   int               `json:"coins_balance"`
	OrdersCount    int64             `json:"orders_count"`
	TotalSpentPaise int64            `json:"total_spent_paise"`
	Addresses      []CustomerAddress `json:"addresses,omitempty"`
	CoinHistory    []CoinTransaction `json:"coin_history,omitempty"`
	CreatedAt      time.Time         `json:"created_at"`
}

type Coupon struct {
	ID                    int64     `json:"id"`
	Code                  string    `json:"code" validate:"required"`
	Description           string    `json:"description"`
	DiscountType          string    `json:"discount_type" validate:"required,oneof=flat percent"`
	DiscountValue         int       `json:"discount_value" validate:"required,min=1"`
	MaxDiscountPaise      *int64    `json:"max_discount_paise,omitempty"`
	MinCartPaise          int64     `json:"min_cart_paise"`
	ApplicableCategoryIDs []int64   `json:"applicable_category_ids"`
	ApplicableCityIDs     []int64   `json:"applicable_city_ids"`
	TotalUsageLimit       *int      `json:"total_usage_limit,omitempty"`
	UsedCount             int       `json:"used_count"`
	PerUserLimit          int       `json:"per_user_limit"`
	ValidFrom             time.Time `json:"valid_from"`
	ValidUntil            time.Time `json:"valid_until"`
	IsActive              bool      `json:"is_active"`
	CreatedAt             time.Time `json:"created_at"`
}

// ---------- Payments, Refunds & Settlement ----------

type PaymentTransaction struct {
	ID               int64           `json:"id"`
	OrderID          int64           `json:"order_id"`
	OrderNumber      string          `json:"order_number,omitempty"`
	Gateway          string          `json:"gateway"`
	GatewayOrderID   string          `json:"gateway_order_id"`
	GatewayPaymentID string          `json:"gateway_payment_id"`
	GatewayEventID   string          `json:"gateway_event_id"`
	IdempotencyKey   string          `json:"idempotency_key"`
	AmountPaise      int64           `json:"amount_paise"`
	Status           string          `json:"status"`
	RawPayload       json.RawMessage `json:"raw_payload,omitempty" swaggertype:"object"`
	CreatedAt        time.Time       `json:"created_at"`
}

type Refund struct {
	ID                   int64     `json:"id"`
	OrderID              int64     `json:"order_id"`
	OrderNumber          string    `json:"order_number,omitempty"`
	PaymentTransactionID *int64    `json:"payment_transaction_id,omitempty"`
	AmountPaise          int64     `json:"amount_paise"`
	CancellationFeePaise int64     `json:"cancellation_fee_paise"`
	Reason               string    `json:"reason"`
	GatewayRefundID      string    `json:"gateway_refund_id"`
	IdempotencyKey       string    `json:"idempotency_key"`
	Status               string    `json:"status"`
	ProcessedByAdminID   *int64    `json:"processed_by_admin_id,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
}

type SettlementReport struct {
	From                 string `json:"from"`
	To                   string `json:"to"`
	GrossCapturedPaise   int64  `json:"gross_captured_paise"`
	TotalRefundedPaise   int64  `json:"total_refunded_paise"`
	TotalGSTPaise        int64  `json:"total_gst_paise"`
	CancelFeesRetained   int64  `json:"cancel_fees_retained_paise"`
	NetSettlementPaise   int64  `json:"net_settlement_paise"`
	CapturedCount        int64  `json:"captured_count"`
	RefundCount          int64  `json:"refund_count"`
}

type Phase2Repository interface {
	// Homepage
	ListHeroBanners(ctx context.Context, activeOnly bool) ([]HeroBanner, error)
	SaveHeroBanner(ctx context.Context, b *HeroBanner) (*HeroBanner, error)
	DeleteHeroBanner(ctx context.Context, id int64) error
	ListHomepageSections(ctx context.Context, activeOnly bool) ([]HomepageSection, error)
	SaveHomepageSection(ctx context.Context, s *HomepageSection) (*HomepageSection, error)
	DeleteHomepageSection(ctx context.Context, id int64) error

	// Geo & Delivery
	ListStates(ctx context.Context) ([]State, error)
	SaveState(ctx context.Context, s *State) (*State, error)
	ListCities(ctx context.Context, search string, activeOnly bool) ([]City, error)
	SaveCity(ctx context.Context, c *City) (*City, error)
	ListPincodes(ctx context.Context, cityID *int64, search string, page, limit int) ([]Pincode, int64, error)
	SavePincode(ctx context.Context, p *Pincode) (*Pincode, error)
	DeletePincode(ctx context.Context, id int64) error
	ListTimeSlots(ctx context.Context, activeOnly bool) ([]TimeSlotTemplate, error)
	SaveTimeSlot(ctx context.Context, t *TimeSlotTemplate) (*TimeSlotTemplate, error)
	ListSlotLedger(ctx context.Context, cityID int64, date string) ([]SlotCapacityOverride, error)
	UpsertSlotLedger(ctx context.Context, ov *SlotCapacityOverride) (*SlotCapacityOverride, error)
	ListBlackoutDates(ctx context.Context, cityID *int64) ([]BlackoutDate, error)
	SaveBlackoutDate(ctx context.Context, b *BlackoutDate) (*BlackoutDate, error)
	DeleteBlackoutDate(ctx context.Context, id int64) error
	ListDecoratorTeams(ctx context.Context, cityID *int64) ([]DecoratorTeam, error)
	SaveDecoratorTeam(ctx context.Context, d *DecoratorTeam) (*DecoratorTeam, error)
	ListPresets(ctx context.Context, presetType, search string) ([]Preset, error)
	SavePreset(ctx context.Context, p *Preset) (*Preset, error)
	DeletePreset(ctx context.Context, id int64) error

	// Customers & Coupons
	ListCustomers(ctx context.Context, search string, page, limit int) ([]Customer, int64, error)
	GetCustomerDetail(ctx context.Context, id int64) (*Customer, error)
	SetCustomerBlocked(ctx context.Context, id int64, blocked bool) error
	AdjustCustomerCoinsTx(ctx context.Context, customerID int64, delta int, note string, adminID int64) (int, error)
	ListCoupons(ctx context.Context, search string) ([]Coupon, error)
	SaveCoupon(ctx context.Context, c *Coupon) (*Coupon, error)
	DeleteCoupon(ctx context.Context, id int64) error

	// Payments, Refunds & Settlement
	ListPaymentTransactions(ctx context.Context, status string, page, limit int) ([]PaymentTransaction, int64, error)
	RecordIdempotentPaymentWebhookTx(ctx context.Context, txIn *PaymentTransaction) (duplicate bool, err error)
	ListRefunds(ctx context.Context, page, limit int) ([]Refund, int64, error)
	CreateRefundTx(ctx context.Context, r *Refund, adminID int64) (*Refund, error)
	GetSettlementReport(ctx context.Context, from, to time.Time) (*SettlementReport, error)
}

