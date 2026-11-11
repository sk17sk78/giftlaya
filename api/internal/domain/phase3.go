package domain

import (
	"context"
	"encoding/json"
	"time"
)

// ---------- Reviews ----------

type Review struct {
	ID             int64     `json:"id"`
	ProductID      *int64    `json:"product_id,omitempty"`
	ProductName    string    `json:"product_name,omitempty"`
	CategoryID     *int64    `json:"category_id,omitempty"`
	CustomerID     *int64    `json:"customer_id,omitempty"`
	ReviewerName   string    `json:"reviewer_name" validate:"required"`
	CityName       string    `json:"city_name"`
	Rating         int       `json:"rating" validate:"required,min=1,max=5"`
	Comment        string    `json:"comment" validate:"required"`
	Status         string    `json:"status"`
	AdminReply     string    `json:"admin_reply"`
	IsFeaturedHome bool      `json:"is_featured_home"`
	CreatedAt      time.Time `json:"created_at"`
}

// ---------- Sellers & Payouts ----------

type Seller struct {
	ID                int64           `json:"id"`
	BusinessName      string          `json:"business_name" validate:"required"`
	Slug              string          `json:"slug"`
	ContactName       string          `json:"contact_name" validate:"required"`
	Phone             string          `json:"phone" validate:"required"`
	Email             string          `json:"email" validate:"required,email"`
	CityID            *int64          `json:"city_id,omitempty"`
	CityName          string          `json:"city_name,omitempty"`
	CommissionPercent float64         `json:"commission_percent"`
	KYCStatus         string          `json:"kyc_status"`
	KYCDocsJSON       json.RawMessage `json:"kyc_docs_json" swaggertype:"object"`
	BankDetailsJSON   json.RawMessage `json:"bank_details_json" swaggertype:"object"`
	IsActive          bool            `json:"is_active"`
	CreatedAt         time.Time       `json:"created_at"`
}

type SellerPayout struct {
	ID               int64      `json:"id"`
	SellerID         int64      `json:"seller_id" validate:"required"`
	SellerName       string     `json:"seller_name,omitempty"`
	PeriodStart      string     `json:"period_start" validate:"required"`
	PeriodEnd        string     `json:"period_end" validate:"required"`
	GrossPaise       int64      `json:"gross_paise"`
	CommissionPaise  int64      `json:"commission_paise"`
	NetPayoutPaise   int64      `json:"net_payout_paise"`
	Status           string     `json:"status"`
	UTRNumber        string     `json:"utr_number"`
	PaidAt           *time.Time `json:"paid_at,omitempty"`
	CreatedByAdminID *int64     `json:"created_by_admin_id,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

// ---------- Content, Blog, Recent Work, FAQs, Redirects ----------

type CMSPage struct {
	ID             int64           `json:"id"`
	Slug           string          `json:"slug" validate:"required"`
	PageType       string          `json:"page_type"`
	Title          string          `json:"title" validate:"required"`
	BodyHTML       string          `json:"body_html"`
	SectionsJSON   json.RawMessage `json:"sections_json" swaggertype:"array,object"`
	SEOTitle       string          `json:"seo_title"`
	SEODescription string          `json:"seo_description"`
	RobotsIndex    bool            `json:"robots_index"`
	IsPublished    bool            `json:"is_published"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type FAQ struct {
	ID        int64     `json:"id"`
	ScopeType string    `json:"scope_type"`
	ScopeID   *int64    `json:"scope_id,omitempty"`
	Question  string    `json:"question" validate:"required"`
	Answer    string    `json:"answer" validate:"required"`
	SortOrder int       `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type BlogCategory struct {
	ID             int64     `json:"id"`
	Name           string    `json:"name" validate:"required"`
	Slug           string    `json:"slug"`
	ImageURL       string    `json:"image_url"`
	SEOTitle       string    `json:"seo_title"`
	SEODescription string    `json:"seo_description"`
	CreatedAt      time.Time `json:"created_at"`
}

type BlogPost struct {
	ID               int64           `json:"id"`
	CategoryID       *int64          `json:"category_id,omitempty"`
	CategoryName     string          `json:"category_name,omitempty"`
	Title            string          `json:"title" validate:"required"`
	Slug             string          `json:"slug"`
	Excerpt          string          `json:"excerpt"`
	ContentHTML      string          `json:"content_html"`
	SectionsJSON     json.RawMessage `json:"sections_json" swaggertype:"array,object"`
	FeaturedImageURL string          `json:"featured_image_url"`
	AuthorName       string          `json:"author_name"`
	ReadTime         string          `json:"read_time"`
	IsFeatured       bool            `json:"is_featured"`
	Status           string          `json:"status"`
	PublishedAt      *time.Time      `json:"published_at,omitempty"`
	SEOTitle         string          `json:"seo_title"`
	SEODescription   string          `json:"seo_description"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type RecentWork struct {
	ID           int64     `json:"id"`
	CategorySlug string    `json:"category_slug"`
	Title        string    `json:"title" validate:"required"`
	CityID       *int64    `json:"city_id,omitempty"`
	CityName     string    `json:"city_name,omitempty"`
	ImageURL     string    `json:"image_url" validate:"required"`
	Description  string    `json:"description"`
	SortOrder    int       `json:"sort_order"`
	IsPublished  bool      `json:"is_published"`
	CreatedAt    time.Time `json:"created_at"`
}

type SEORedirect struct {
	ID         int64     `json:"id"`
	FromPath   string    `json:"from_path" validate:"required"`
	ToPath     string    `json:"to_path" validate:"required"`
	StatusCode int       `json:"status_code"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
}

// ---------- Media Library ----------

type MediaFolder struct {
	ID        int64     `json:"id"`
	ParentID  *int64    `json:"parent_id,omitempty"`
	Name      string    `json:"name" validate:"required"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"created_at"`
}

type MediaAsset struct {
	ID                int64     `json:"id"`
	FolderID          *int64    `json:"folder_id,omitempty"`
	FileKey           string    `json:"file_key"`
	CDNURL            string    `json:"cdn_url"`
	WebPURL           string    `json:"webp_url"`
	AltText           string    `json:"alt_text"`
	Width             int       `json:"width"`
	Height            int       `json:"height"`
	SizeBytes         int64     `json:"size_bytes"`
	MimeType          string    `json:"mime_type"`
	UploadedByAdminID *int64    `json:"uploaded_by_admin_id,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

// ---------- Support, Inquiries, WhatsApp, Notifications, Marketing, Settings ----------

type ContactInquiry struct {
	ID              int64           `json:"id"`
	InquiryType     string          `json:"inquiry_type"`
	Name            string          `json:"name" validate:"required"`
	Phone           string          `json:"phone"`
	Email           string          `json:"email"`
	City            string          `json:"city"`
	Subject         string          `json:"subject"`
	Message         string          `json:"message"`
	Metadata        json.RawMessage `json:"metadata,omitempty" swaggertype:"object"`
	Status          string          `json:"status"`
	AssignedAdminID *int64          `json:"assigned_admin_id,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
}

type SupportTicket struct {
	ID           int64           `json:"id"`
	TicketNumber string          `json:"ticket_number"`
	SourceType   string          `json:"source_type"`
	CustomerID   *int64          `json:"customer_id,omitempty"`
	SellerID     *int64          `json:"seller_id,omitempty"`
	OrderID      *int64          `json:"order_id,omitempty"`
	Subject      string          `json:"subject"`
	Status       string          `json:"status"`
	Priority     string          `json:"priority"`
	MessagesJSON json.RawMessage `json:"messages_json" swaggertype:"array,object"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type NotificationTemplate struct {
	ID           int64     `json:"id"`
	EventKey     string    `json:"event_key" validate:"required"`
	Channel      string    `json:"channel" validate:"required,oneof=email whatsapp sms push"`
	Subject      string    `json:"subject"`
	BodyTemplate string    `json:"body_template" validate:"required"`
	IsActive     bool      `json:"is_active"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type WhatsappContact struct {
	ID            int64      `json:"id"`
	Phone         string     `json:"phone"`
	Name          string     `json:"name"`
	CustomerID    *int64     `json:"customer_id,omitempty"`
	UnreadCount   int        `json:"unread_count"`
	LastMessageAt *time.Time `json:"last_message_at,omitempty"`
}

type WhatsappMessage struct {
	ID        int64     `json:"id"`
	ContactID int64     `json:"contact_id"`
	Direction string    `json:"direction"`
	Body      string    `json:"body"`
	MediaURL  string    `json:"media_url"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type MetaAdsCampaign struct {
	ID                 int64           `json:"id"`
	ExternalCampaignID string          `json:"external_campaign_id"`
	Name               string          `json:"name"`
	Objective          string          `json:"objective"`
	Status             string          `json:"status"`
	DailyBudgetPaise   int64           `json:"daily_budget_paise"`
	RulesJSON          json.RawMessage `json:"rules_json" swaggertype:"object"`
	MetricsJSON        json.RawMessage `json:"metrics_json" swaggertype:"object"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

type SiteSetting struct {
	Key              string          `json:"key" validate:"required"`
	GroupName        string          `json:"group_name"`
	ValueJSON        json.RawMessage `json:"value_json" swaggertype:"object"`
	UpdatedByAdminID *int64          `json:"updated_by_admin_id,omitempty"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type Phase3Repository interface {
	// Reviews
	ListReviews(ctx context.Context, status string, page, limit int) ([]Review, int64, error)
	SaveReview(ctx context.Context, r *Review) (*Review, error)
	ModerateReview(ctx context.Context, id int64, status, reply string, featured bool) (*Review, error)
	DeleteReview(ctx context.Context, id int64) error

	// Sellers
	ListSellers(ctx context.Context, kycStatus string, sellerID *int64) ([]Seller, error)
	SaveSeller(ctx context.Context, s *Seller) (*Seller, error)
	UpdateSellerKYC(ctx context.Context, id int64, status string, commission float64) (*Seller, error)
	ListSellerPayouts(ctx context.Context, sellerID *int64) ([]SellerPayout, error)
	CreateSellerPayout(ctx context.Context, p *SellerPayout) (*SellerPayout, error)
	MarkPayoutPaid(ctx context.Context, id int64, utr string) (*SellerPayout, error)
	ApproveSellerProduct(ctx context.Context, productID int64, status string) error

	// Content, Blog, Recent Work, FAQs, Redirects
	ListCMSPages(ctx context.Context, pageType string) ([]CMSPage, error)
	GetCMSPageBySlug(ctx context.Context, slug string) (*CMSPage, error)
	SaveCMSPage(ctx context.Context, p *CMSPage) (*CMSPage, error)
	DeleteCMSPage(ctx context.Context, id int64) error
	ListFAQs(ctx context.Context, scopeType string) ([]FAQ, error)
	SaveFAQ(ctx context.Context, f *FAQ) (*FAQ, error)
	DeleteFAQ(ctx context.Context, id int64) error
	ListBlogCategories(ctx context.Context) ([]BlogCategory, error)
	SaveBlogCategory(ctx context.Context, c *BlogCategory) (*BlogCategory, error)
	ListBlogPosts(ctx context.Context, status string) ([]BlogPost, error)
	SaveBlogPost(ctx context.Context, b *BlogPost) (*BlogPost, error)
	DeleteBlogPost(ctx context.Context, id int64) error
	ListRecentWorks(ctx context.Context, categorySlug string) ([]RecentWork, error)
	SaveRecentWork(ctx context.Context, w *RecentWork) (*RecentWork, error)
	DeleteRecentWork(ctx context.Context, id int64) error
	ListSEORedirects(ctx context.Context) ([]SEORedirect, error)
	SaveSEORedirect(ctx context.Context, red *SEORedirect) (*SEORedirect, error)
	DeleteSEORedirect(ctx context.Context, id int64) error
	ListSitemapSlugs(ctx context.Context) (products, categories, blogs, pages []string, err error)

	// Media Library
	ListMediaFolders(ctx context.Context) ([]MediaFolder, error)
	CreateMediaFolder(ctx context.Context, f *MediaFolder) (*MediaFolder, error)
	ListMediaAssets(ctx context.Context, folderID *int64, search string, page, limit int) ([]MediaAsset, int64, error)
	CreateMediaAsset(ctx context.Context, a *MediaAsset) (*MediaAsset, error)
	UpdateMediaAltText(ctx context.Context, id int64, alt string) error
	DeleteMediaAsset(ctx context.Context, id int64) (string, error)

	// Inquiries, Support, WhatsApp, Notifications, Meta Ads, Settings
	ListContactInquiries(ctx context.Context, inquiryType, status string) ([]ContactInquiry, error)
	CreateContactInquiry(ctx context.Context, c *ContactInquiry) (*ContactInquiry, error)
	UpdateInquiryStatus(ctx context.Context, id int64, status string) error
	ListSupportTickets(ctx context.Context, sellerID *int64, status string) ([]SupportTicket, error)
	ReplySupportTicket(ctx context.Context, id int64, sender, text, nextStatus string) (*SupportTicket, error)
	ListWhatsappContacts(ctx context.Context) ([]WhatsappContact, error)
	SaveWhatsappContact(ctx context.Context, c *WhatsappContact) (*WhatsappContact, error)
	ListWhatsappMessages(ctx context.Context, contactID int64) ([]WhatsappMessage, error)
	SendWhatsappMessage(ctx context.Context, contactID int64, body string) (*WhatsappMessage, error)
	ListNotificationTemplates(ctx context.Context) ([]NotificationTemplate, error)
	SaveNotificationTemplate(ctx context.Context, t *NotificationTemplate) (*NotificationTemplate, error)
	ListMetaAdsCampaigns(ctx context.Context) ([]MetaAdsCampaign, error)
	SaveMetaAdsCampaign(ctx context.Context, m *MetaAdsCampaign) (*MetaAdsCampaign, error)
	ListSiteSettings(ctx context.Context, group string) ([]SiteSetting, error)
	UpsertSiteSetting(ctx context.Context, s *SiteSetting) (*SiteSetting, error)
	ExportDatabaseBackupJSON(ctx context.Context) (map[string]any, error)
}
