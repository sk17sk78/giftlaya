package domain

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrInvalidTransition = errors.New("invalid order status transition")
	ErrInsufficientStock = errors.New("insufficient product stock")
	ErrSlotFull          = errors.New("selected delivery time slot is full or blocked")
	ErrCutoffPassed      = errors.New("same-day delivery cut-off time has passed")
	ErrBlackoutDate      = errors.New("delivery unavailable on selected blackout date")
	ErrNotServiceable    = errors.New("selected city or pincode is not serviceable")
	ErrCancelNotAllowed  = errors.New("decoration booking cannot be cancelled on event day or within 24 hours")
	ErrInvalidCoupon     = errors.New("coupon is invalid, expired, or does not meet criteria")
	ErrInsufficientCoins = errors.New("insufficient coins balance")
	ErrValidation        = errors.New("validation failed")
)

const (
	OrderStatusPlaced         = "placed"
	OrderStatusConfirmed      = "confirmed"
	OrderStatusAssigned       = "assigned"
	OrderStatusOutForDelivery = "out_for_delivery"
	OrderStatusDelivered      = "delivered"
	OrderStatusCancelled      = "cancelled"
	OrderStatusRefunded       = "refunded"
)

var AllowedOrderTransitions = map[string][]string{
	OrderStatusPlaced:         {OrderStatusConfirmed, OrderStatusCancelled},
	OrderStatusConfirmed:      {OrderStatusAssigned, OrderStatusCancelled},
	OrderStatusAssigned:       {OrderStatusOutForDelivery, OrderStatusCancelled},
	OrderStatusOutForDelivery: {OrderStatusDelivered, OrderStatusCancelled},
	OrderStatusDelivered:      {OrderStatusRefunded},
	OrderStatusCancelled:      {OrderStatusRefunded},
	OrderStatusRefunded:       {},
}

func CanTransitionOrder(from, to string) bool {
	if from == to {
		return false
	}
	allowed, ok := AllowedOrderTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

// ---------- Dashboard ----------

type StatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type TopProductStat struct {
	ProductID int64  `json:"product_id"`
	Title     string `json:"title"`
	SKU       string `json:"sku"`
	UnitsSold int64  `json:"units_sold"`
	Revenue   int64  `json:"revenue_paise"`
}

type TopCityStat struct {
	CityID  int64  `json:"city_id"`
	Name    string `json:"name"`
	Orders  int64  `json:"orders"`
	Revenue int64  `json:"revenue_paise"`
}

type LowStockItem struct {
	ProductID int64  `json:"product_id"`
	Name      string `json:"name"`
	SKU       string `json:"sku"`
	StockQty  int    `json:"stock_qty"`
}

type DailyRevenuePoint struct {
	Date    string `json:"date"`
	Orders  int64  `json:"orders"`
	Revenue int64  `json:"revenue_paise"`
}

type DashboardStats struct {
	TodayOrders   int64               `json:"today_orders"`
	TodayRevenue  int64               `json:"today_revenue_paise"`
	TotalOrders   int64               `json:"total_orders"`
	TotalRevenue  int64               `json:"total_revenue_paise"`
	StatusCounts  []StatusCount       `json:"status_counts"`
	TopProducts   []TopProductStat    `json:"top_products"`
	TopCities     []TopCityStat       `json:"top_cities"`
	LowStockItems []LowStockItem      `json:"low_stock_items"`
	RevenueSeries []DailyRevenuePoint `json:"revenue_series"`
}

// ---------- Catalog ----------

type ProductImage struct {
	ID        int64  `json:"id,omitempty"`
	ProductID int64  `json:"product_id,omitempty"`
	MediaID   *int64 `json:"media_id,omitempty"`
	URL       string `json:"url"`
	AltText   string `json:"alt_text"`
	SortOrder int    `json:"sort_order"`
	IsPrimary bool   `json:"is_primary"`
}

type ProductVariant struct {
	ID        int64  `json:"id,omitempty"`
	ProductID int64  `json:"product_id,omitempty"`
	Label     string `json:"label"`
	SKUSuffix string `json:"sku_suffix"`
	MRPPaise  int64  `json:"mrp_paise"`
	PricePaise int64 `json:"price_paise"`
	StockQty  int    `json:"stock_qty"`
	SortOrder int    `json:"sort_order"`
	IsActive  bool   `json:"is_active"`
}

type ProductAddon struct {
	ID              int64     `json:"id"`
	AddonCategoryID *int64    `json:"addon_category_id,omitempty"`
	Name            string    `json:"name"`
	Slug            string    `json:"slug"`
	ImageURL        string    `json:"image_url"`
	PricePaise      int64     `json:"price_paise"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
}

type ProductOptionGroup struct {
	ID            int64           `json:"id,omitempty"`
	ProductID     int64           `json:"product_id,omitempty"`
	Name          string          `json:"name"`
	SelectionType string          `json:"selection_type"`
	OptionsJSON   json.RawMessage `json:"options_json"`
	IsRequired    bool            `json:"is_required"`
	SortOrder     int             `json:"sort_order"`
}

type PersonalizationField struct {
	ID              int64           `json:"id,omitempty"`
	ProductID       int64           `json:"product_id,omitempty"`
	FieldKey        string          `json:"field_key"`
	Label           string          `json:"label"`
	FieldType       string          `json:"field_type"`
	Placeholder     string          `json:"placeholder"`
	OptionsJSON     json.RawMessage `json:"options_json"`
	ExtraPricePaise int64           `json:"extra_price_paise"`
	IsRequired      bool            `json:"is_required"`
	SortOrder       int             `json:"sort_order"`
}

type DecorationInclusion struct {
	ID        int64  `json:"id,omitempty"`
	ProductID int64  `json:"product_id,omitempty"`
	Kind      string `json:"kind"` // included | not_included
	ItemText  string `json:"item_text"`
	SortOrder int    `json:"sort_order"`
}

type ProductCityOverride struct {
	ProductID           int64   `json:"product_id,omitempty"`
	CityID              int64   `json:"city_id"`
	IsAvailable         bool    `json:"is_available"`
	PriceOverridePaise  *int64  `json:"price_override_paise,omitempty"`
	DeliveryChargePaise *int    `json:"delivery_charge_paise,omitempty"`
	CutoffOverride      *string `json:"cutoff_override,omitempty"`
}

type Product struct {
	ID                   int64                  `json:"id"`
	SellerID             *int64                 `json:"seller_id,omitempty"`
	ProductType          string                 `json:"product_type"`
	Name                 string                 `json:"name"`
	Slug                 string                 `json:"slug"`
	SKU                  string                 `json:"sku"`
	Description          string                 `json:"description"`
	MRPPaise             int64                  `json:"mrp_paise"`
	SellingPricePaise    int64                  `json:"selling_price_paise"`
	DiscountPercent      int                    `json:"discount_percent"`
	StockQty             int                    `json:"stock_qty"`
	TrackStock           bool                   `json:"track_stock"`
	IsEggless            bool                   `json:"is_eggless"`
	HasVegNonVeg         bool                   `json:"has_veg_nonveg"`
	VegDeltaPaise        int                    `json:"veg_delta_paise"`
	NonVegDeltaPaise     int                    `json:"nonveg_delta_paise"`
	DeliveryTypeID             *int64                 `json:"delivery_type_id,omitempty"`
	DeliveryTypeSlug           string                 `json:"delivery_type_slug,omitempty"`
	CancellationPolicyPresetID *int64                 `json:"cancellation_policy_preset_id,omitempty"`
	LeadTimeDays               int                    `json:"lead_time_days"`
	CutoffTime                 *string                `json:"cutoff_time,omitempty"`
	GSTRatePercent             float64                `json:"gst_rate_percent"`
	AvailableAllCities         bool                   `json:"available_all_cities"`
	IsFeatured                 bool                   `json:"is_featured"`
	IsTrending                 bool                   `json:"is_trending"`
	Status                     string                 `json:"status"`
	SEOTitle                   string                 `json:"seo_title"`
	SEODescription             string                 `json:"seo_description"`
	RatingAvg                  float64                `json:"rating_avg"`
	RatingsCount               int                    `json:"ratings_count"`
	PrimaryImageURL            string                 `json:"primary_image_url,omitempty"`
	Images                     []ProductImage         `json:"images,omitempty"`
	Variants                   []ProductVariant       `json:"variants,omitempty"`
	CategoryIDs                []int64                `json:"category_ids,omitempty"`
	PresetIDs                  []int64                `json:"preset_ids,omitempty"`
	AddonIDs                   []int64                `json:"addon_ids,omitempty"`
	Addons                     []ProductAddon         `json:"addons,omitempty"`
	Reviews                    []Review               `json:"reviews,omitempty"`
	OptionGroups               []ProductOptionGroup   `json:"option_groups,omitempty"`
	Personalization      []PersonalizationField `json:"personalization_fields,omitempty"`
	DecorationInclusions []DecorationInclusion  `json:"decoration_inclusions,omitempty"`
	CityOverrides        []ProductCityOverride  `json:"city_overrides,omitempty"`
	CreatedAt            time.Time              `json:"created_at"`
	SimilarProducts      []Product              `json:"similar_products,omitempty"`
	YouMayAlsoLike       []Product              `json:"you_may_also_like,omitempty"`
	UpdatedAt            time.Time              `json:"updated_at"`
}

type ProductListFilter struct {
	Search      string
	ProductType string
	Status      string
	CategoryID  *int64
	CityID      *int64
	SellerID    *int64
	Trending    *bool
	Featured    *bool
	SortBy      string // newest | price_asc | price_desc | discount
	Page        int
	Limit       int
}

type BulkProductUpdateItem struct {
	ProductID         int64  `json:"product_id" validate:"required"`
	MRPPaise          *int64 `json:"mrp_paise"`
	SellingPricePaise *int64 `json:"selling_price_paise"`
	StockQty          *int   `json:"stock_qty"`
	Status            string `json:"status"`
}

type Category struct {
	ID             int64      `json:"id"`
	ParentID       *int64     `json:"parent_id,omitempty"`
	Name           string     `json:"name"`
	Slug           string     `json:"slug"`
	Kind           string     `json:"kind"`
	ImageURL       string     `json:"image_url"`
	SEOTitle       string     `json:"seo_title"`
	SEODescription string     `json:"seo_description"`
	RobotsIndex    bool       `json:"robots_index"`
	SEOContentHTML string     `json:"seo_content_html"`
	SortOrder      int        `json:"sort_order"`
	IsActive       bool       `json:"is_active"`
	Children       []Category `json:"children,omitempty"`
	ProductCount   int64      `json:"product_count,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type NavigationItem struct {
	ID          int64            `json:"id"`
	ParentID    *int64           `json:"parent_id,omitempty"`
	ColumnTitle string           `json:"column_title"`
	Label       string           `json:"label"`
	Href        string           `json:"href"`
	Badge       *string          `json:"badge,omitempty"`
	CategoryID  *int64           `json:"category_id,omitempty"`
	SortOrder   int              `json:"sort_order"`
	IsActive    bool             `json:"is_active"`
	Children    []NavigationItem `json:"children,omitempty"`
}

// ---------- Orders ----------

type OrderItem struct {
	ID                  int64           `json:"id"`
	OrderID             int64           `json:"order_id"`
	ProductID           int64           `json:"product_id"`
	VariantID           *int64          `json:"variant_id,omitempty"`
	SellerID            *int64          `json:"seller_id,omitempty"`
	ProductTitle        string          `json:"product_title"`
	SKUSnapshot         string          `json:"sku_snapshot"`
	ItemType            string          `json:"item_type"`
	Qty                 int             `json:"qty"`
	UnitPricePaise      int64           `json:"unit_price_paise"`
	LineTotalPaise      int64           `json:"line_total_paise"`
	CommissionPercent   float64         `json:"commission_percent"`
	SellerPayoutPaise   int64           `json:"seller_payout_paise"`
	PersonalizationJSON json.RawMessage `json:"personalization_json,omitempty"`
	AddonsJSON          json.RawMessage `json:"addons_json,omitempty"`
}

type OrderStatusHistoryEntry struct {
	ID         int64     `json:"id"`
	OrderID    int64     `json:"order_id"`
	FromStatus string    `json:"from_status"`
	ToStatus   string    `json:"to_status"`
	ActorType  string    `json:"actor_type"`
	ActorID    *int64    `json:"actor_id,omitempty"`
	Reason     string    `json:"reason"`
	CreatedAt  time.Time `json:"created_at"`
}

type OrderAssignment struct {
	ID                   int64     `json:"id"`
	OrderID              int64     `json:"order_id"`
	DecoratorTeamID      *int64    `json:"decorator_team_id,omitempty"`
	DeliveryPartnerName  string    `json:"delivery_partner_name"`
	DeliveryPartnerPhone string    `json:"delivery_partner_phone"`
	AssignedByAdminID    *int64    `json:"assigned_by_admin_id,omitempty"`
	AssignedAt           time.Time `json:"assigned_at"`
}

type Order struct {
	ID                   int64                     `json:"id"`
	OrderNumber          string                    `json:"order_number"`
	CustomerID           *int64                    `json:"customer_id,omitempty"`
	CityID               int64                     `json:"city_id"`
	CityName             string                    `json:"city_name,omitempty"`
	Status               string                    `json:"status"`
	PaymentStatus        string                    `json:"payment_status"`
	PaymentMethod        string                    `json:"payment_method"`
	IsManual             bool                      `json:"is_manual"`
	DeliveryDate         *string                   `json:"delivery_date,omitempty"`
	SlotTemplateID       *int64                    `json:"slot_template_id,omitempty"`
	SlotLabel            string                    `json:"slot_label,omitempty"`
	SubtotalPaise        int64                     `json:"subtotal_paise"`
	DeliveryFeePaise     int64                     `json:"delivery_fee_paise"`
	SlotSurchargePaise   int64                     `json:"slot_surcharge_paise"`
	CouponCode           *string                   `json:"coupon_code,omitempty"`
	CouponDiscountPaise  int64                     `json:"coupon_discount_paise"`
	CoinsRedeemed        int                       `json:"coins_redeemed"`
	CoinsDiscountPaise   int64                     `json:"coins_discount_paise"`
	TaxGSTPaise          int64                     `json:"tax_gst_paise"`
	TotalPaise           int64                     `json:"total_paise"`
	CancellationFeePaise int64                     `json:"cancellation_fee_paise"`
	ShippingAddressJSON  json.RawMessage           `json:"shipping_address_json"`
	RecipientName        string                    `json:"recipient_name"`
	RecipientPhone       string                    `json:"recipient_phone"`
	TrackingID           string                    `json:"tracking_id"`
	InternalNotes        string                    `json:"internal_notes"`
	PlacedAt             time.Time                 `json:"placed_at"`
	CreatedAt            time.Time                 `json:"created_at"`
	UpdatedAt            time.Time                 `json:"updated_at"`
	Items                []OrderItem               `json:"items,omitempty"`
	History              []OrderStatusHistoryEntry `json:"history,omitempty"`
	Assignments          []OrderAssignment         `json:"assignments,omitempty"`
}

type OrderUploadEntry struct {
	ItemID              int64           `json:"item_id"`
	OrderID             int64           `json:"order_id"`
	OrderNumber         string          `json:"order_number"`
	RecipientName       string          `json:"recipient_name"`
	RecipientPhone      string          `json:"recipient_phone"`
	DeliveryDate        *string         `json:"delivery_date,omitempty"`
	Status              string          `json:"status"`
	ProductID           int64           `json:"product_id"`
	ProductTitle        string          `json:"product_title"`
	PersonalizationJSON json.RawMessage `json:"personalization_json" swaggertype:"object"`
	PlacedAt            time.Time       `json:"placed_at"`
}

type OrderListFilter struct {
	Status        string
	PaymentStatus string
	PaymentMethod string
	DeliveryType  string
	IsManual      *bool
	CityID        *int64
	CategoryID    *int64
	SellerID      *int64
	CustomerID    *int64
	DateFrom      string
	DateTo        string
	Search        string
	SortBy        string
	Page          int
	Limit         int
}

type CreateOrderAddonInput struct {
	AddonID int64 `json:"addon_id" validate:"required"`
	Qty     int   `json:"qty" validate:"required,min=1,max=50"`
}

type CreateOrderItemInput struct {
	ProductID           int64                   `json:"product_id" validate:"required"`
	VariantID           *int64                  `json:"variant_id"`
	Qty                 int                     `json:"qty" validate:"required,min=1,max=100"`
	DietPreference      string                  `json:"diet_preference"` // Veg | Non-Veg
	AddonIDs            []int64                 `json:"addon_ids"`
	Addons              []CreateOrderAddonInput `json:"addons"`
	PersonalizationJSON json.RawMessage         `json:"personalization_json"`
}

type CreateOrderInput struct {
	CustomerID          *int64                 `json:"customer_id"`
	CityID              int64                  `json:"city_id" validate:"required"`
	Pincode             string                 `json:"pincode"`
	PaymentMethod       string                 `json:"payment_method" validate:"required,oneof=razorpay cod payment_link"`
	IsManual            bool                   `json:"is_manual"`
	DeliveryDate        string                 `json:"delivery_date" validate:"required"` // YYYY-MM-DD
	SlotTemplateID      *int64                 `json:"slot_template_id"`
	CouponCode          string                 `json:"coupon_code"`
	CoinsToRedeem       int                    `json:"coins_to_redeem"`
	RecipientName       string                 `json:"recipient_name" validate:"required"`
	RecipientPhone      string                 `json:"recipient_phone" validate:"required"`
	ShippingAddressJSON json.RawMessage        `json:"shipping_address_json"`
	InternalNotes       string                 `json:"internal_notes"`
	Items               []CreateOrderItemInput `json:"items" validate:"required,min=1,dive"`
}

type PaymentLink struct {
	ID               int64      `json:"id"`
	OrderID          *int64     `json:"order_id,omitempty"`
	CustomerPhone    string     `json:"customer_phone"`
	AmountPaise      int64      `json:"amount_paise"`
	ShortURL         string     `json:"short_url"`
	Status           string     `json:"status"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	CreatedByAdminID *int64     `json:"created_by_admin_id,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type Invoice struct {
	ID            int64           `json:"id"`
	OrderID       int64           `json:"order_id"`
	OrderNumber   string          `json:"order_number,omitempty"`
	InvoiceNumber string          `json:"invoice_number"`
	GSTINSeller   string          `json:"gstin_seller"`
	GSTBreakup    json.RawMessage `json:"gst_breakup_json"`
	PDFURL        string          `json:"pdf_url"`
	GeneratedAt   time.Time       `json:"generated_at"`
}

// ---------- Repositories ----------

type DashboardRepository interface {
	GetStats(ctx context.Context, from, to time.Time) (*DashboardStats, error)
}

type CatalogRepository interface {
	ListProducts(ctx context.Context, f ProductListFilter) ([]Product, int64, error)
	GetProductByIDOrSlug(ctx context.Context, id *int64, slug string) (*Product, error)
	CreateProduct(ctx context.Context, p *Product) (*Product, error)
	UpdateProduct(ctx context.Context, p *Product) (*Product, error)
	SoftDeleteProduct(ctx context.Context, id int64) error
	DuplicateProduct(ctx context.Context, id int64) (*Product, error)
	BulkUpdateProducts(ctx context.Context, items []BulkProductUpdateItem) error

	ListAddons(ctx context.Context, search string, page, limit int) ([]ProductAddon, int64, error)
	CreateAddon(ctx context.Context, a *ProductAddon) (*ProductAddon, error)
	UpdateAddon(ctx context.Context, a *ProductAddon) (*ProductAddon, error)
	DeleteAddon(ctx context.Context, id int64) error

	ListCategories(ctx context.Context, kind, search string) ([]Category, error)
	GetCategoryByIDOrSlug(ctx context.Context, id *int64, slug string) (*Category, error)
	CreateCategory(ctx context.Context, c *Category) (*Category, error)
	UpdateCategory(ctx context.Context, c *Category) (*Category, error)
	SoftDeleteCategory(ctx context.Context, id int64) error

	ListNavigation(ctx context.Context) ([]NavigationItem, error)
	CreateNavigationItem(ctx context.Context, n *NavigationItem) (*NavigationItem, error)
	UpdateNavigationItem(ctx context.Context, n *NavigationItem) (*NavigationItem, error)
	DeleteNavigationItem(ctx context.Context, id int64) error
}

type OrderRepository interface {
	CreateOrderTx(ctx context.Context, in CreateOrderInput, cancelFeePercent int, coinsEarnPercent int) (*Order, error)
	ListOrders(ctx context.Context, f OrderListFilter) ([]Order, int64, error)
	GetOrderByIDOrNumber(ctx context.Context, id *int64, orderNum string) (*Order, error)
	UpdateOrderStatusTx(ctx context.Context, orderID int64, toStatus, actorType string, actorID *int64, reason string, cancelCutoffHours int, cancelFeePercent int) (*Order, error)
	AssignOrder(ctx context.Context, orderID int64, decoratorTeamID *int64, partnerName, partnerPhone string, adminID *int64) (*OrderAssignment, error)
	UpdateOrderTrackingNotes(ctx context.Context, orderID int64, trackingID, internalNotes string) (*Order, error)
	GetCalendarBookings(ctx context.Context, month string, cityID *int64) ([]map[string]any, error)
	ListOrderUploads(ctx context.Context, sellerID *int64, page, limit int) ([]OrderUploadEntry, int64, error)
	ListPaymentLinks(ctx context.Context, page, limit int) ([]PaymentLink, int64, error)
	CreatePaymentLink(ctx context.Context, link *PaymentLink) (*PaymentLink, error)
	ListInvoices(ctx context.Context, page, limit int) ([]Invoice, int64, error)
	GetOrGenerateInvoice(ctx context.Context, orderID int64, gstin string) (*Invoice, error)
}

