package server

import (
	"log/slog"
	"net/http"
	"time"

	_ "github.com/giftlaya/giftlaya-api/docs"
	"github.com/giftlaya/giftlaya-api/internal/config"
	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/handler"
	adminh "github.com/giftlaya/giftlaya-api/internal/handler/admin"
	publich "github.com/giftlaya/giftlaya-api/internal/handler/public"
	"github.com/giftlaya/giftlaya-api/internal/middleware"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

type Dependencies struct {
	Config        *config.Config
	Logger        *slog.Logger
	RateLimiter   domain.RateLimiter
	TokenManager     *service.TokenManager
	AuthService      *service.AuthService
	RBACService      *service.RBACService
	AuditService     *service.AuditService
	DashboardService  *service.DashboardService
	CatalogService    *service.CatalogService
	OrderService      *service.OrderService
	Phase2Service     *service.Phase2Service
	Phase3Service     *service.Phase3Service
	StorefrontHandler *publich.StorefrontHandler
	HealthHandler     *publich.HealthHandler
}

func NewRouter(deps Dependencies) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.CORS(deps.Config.CORSAllowedOrigins))
	r.Use(middleware.SlogLogger(deps.Logger))
	r.Use(middleware.RateLimit(deps.RateLimiter, 5000, time.Minute))

	authHandler := adminh.NewAuthHandler(deps.AuthService)
	rbacHandler := adminh.NewRBACHandler(deps.RBACService, deps.AuditService)

	var dashHandler *adminh.DashboardHandler
	if deps.DashboardService != nil {
		dashHandler = adminh.NewDashboardHandler(deps.DashboardService)
	}
	var catHandler *adminh.CatalogHandler
	if deps.CatalogService != nil {
		catHandler = adminh.NewCatalogHandler(deps.CatalogService)
	}
	var ordHandler *adminh.OrderHandler
	if deps.OrderService != nil {
		ordHandler = adminh.NewOrderHandler(deps.OrderService)
	}
	var p2Handler *adminh.Phase2Handler
	var webhookHandler *publich.WebhookHandler
	if deps.Phase2Service != nil {
		p2Handler = adminh.NewPhase2Handler(deps.Phase2Service, deps.OrderService)
		webhookHandler = publich.NewWebhookHandler(deps.Phase2Service)
	}
	var p3Handler *adminh.Phase3Handler
	if deps.Phase3Service != nil {
		p3Handler = adminh.NewPhase3Handler(deps.Phase3Service)
	}

	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))
	r.Get("/healthz", deps.HealthHandler.Healthz)
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	r.Route("/api/v1", func(v1 chi.Router) {
		v1.Route("/public", func(pub chi.Router) {
			pub.Get("/health", deps.HealthHandler.Healthz)
			pub.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
				handler.WriteJSON(w, http.StatusOK, map[string]string{
					"service": deps.Config.AppName,
					"phase":   "phase3",
				})
			})
			if webhookHandler != nil {
				pub.Post("/webhooks/razorpay", webhookHandler.RazorpayWebhook)
			}
			if deps.StorefrontHandler != nil {
				sf := deps.StorefrontHandler
				pub.Get("/home", sf.GetHome)
				pub.Get("/navigation", sf.GetNavigation)
				pub.Get("/cities", sf.ListCities)
				pub.Get("/delivery-types", sf.ListDeliveryTypes)
				pub.Get("/pincodes/{code}/serviceable", sf.CheckPincodeServiceability)
				pub.Get("/slots", sf.GetAvailableSlots)
				pub.Get("/presets", sf.ListPresetsPublic)
				pub.Get("/categories", sf.ListCategories)
				pub.Get("/categories/*", sf.GetCategoryBySlug)
				pub.Get("/products", sf.ListProducts)
				pub.Get("/products/{slug}", sf.GetProductBySlug)
				pub.Get("/addons", sf.ListAddonsPublic)
				pub.Get("/coupons", sf.ListCouponsPublic)
				pub.Get("/banners/corporate", sf.GetCorporateBanner)
				pub.Get("/explore-links", sf.GetExploreLinks)
				pub.Get("/search", sf.SearchCatalog)
				pub.Post("/reviews", sf.SubmitReview)
				pub.Post("/coupons/validate", sf.ValidateCoupon)
				pub.Post("/orders", sf.CreateOrder)
				pub.Get("/orders/{orderNumber}", sf.GetOrderByNumber)
				pub.Post("/orders/{id}/cancel", sf.CancelCustomerOrder)
				pub.Get("/customers/{id}", sf.GetCustomerProfile)
				pub.Put("/customers/{id}", sf.UpdateCustomerProfile)
				pub.Get("/customers/{id}/orders", sf.ListCustomerOrders)
				pub.Post("/customers/{id}/addresses", sf.SaveCustomerAddress)
				pub.Put("/customers/{id}/addresses/{addrId}", sf.SaveCustomerAddress)
				pub.Delete("/customers/{id}/addresses/{addrId}", sf.DeleteCustomerAddress)
				pub.Get("/customers/{id}/coins", sf.GetCustomerCoins)
				pub.Get("/customers/{id}/tickets", sf.ListCustomerTickets)
				pub.Post("/customers/{id}/tickets", sf.CreateCustomerTicket)
				pub.Get("/customers/{id}/tickets/{ticketId}", sf.GetCustomerTicket)
				pub.Post("/customers/{id}/tickets/{ticketId}/reply", sf.ReplyCustomerTicket)
				pub.Post("/auth/otp/request", sf.RequestOTP)
				pub.Post("/auth/otp/verify", sf.VerifyOTP)
				pub.Get("/blogs", sf.ListBlogs)
				pub.Get("/recent-works", sf.GetRecentWorks)
				pub.Get("/pages", sf.ListPagesPublic)
				pub.Get("/pages/{slug}", sf.GetPageBySlug)
				pub.Get("/redirects", sf.ListSEORedirectsPublic)
				pub.Get("/settings", sf.GetPublicSettings)
				pub.Get("/sitemap.xml", sf.GetSitemapXML)
				pub.Get("/sitemap/{type}", sf.GetSitemapByType)
				pub.Post("/inquiries", sf.SubmitInquiry)
			}
		})

		v1.Route("/admin", func(adm chi.Router) {
			adm.Post("/auth/login", authHandler.Login)
			adm.Post("/auth/refresh", authHandler.Refresh)
			adm.Post("/auth/forgot-password", authHandler.ForgotPassword)
			adm.Post("/auth/reset-password", authHandler.ResetPassword)

			adm.Group(func(prot chi.Router) {
				prot.Use(middleware.AuthenticateAdmin(deps.TokenManager, deps.AuthService))

				prot.Post("/auth/logout", authHandler.Logout)
				prot.Get("/auth/me", authHandler.Me)
				prot.Post("/auth/change-password", authHandler.ChangePassword)
				prot.Post("/auth/totp/setup", authHandler.SetupTOTP)
				prot.Post("/auth/totp/enable", authHandler.EnableTOTP)

				prot.Get("/dashboard/sidebar-counts", rbacHandler.SidebarCounts)
				if dashHandler != nil {
					prot.Get("/dashboard/stats", dashHandler.GetStats)
				}

				if ordHandler != nil {
					prot.With(middleware.RequirePermission("order", false)).Get("/orders", ordHandler.ListOrders)
					prot.With(middleware.RequirePermission("order", false)).Get("/orders/uploads", ordHandler.ListOrderUploads)
					prot.With(middleware.RequirePermission("order", false)).Get("/orders/calendar", ordHandler.CalendarBookings)
					prot.With(middleware.RequirePermission("order", false)).Get("/orders/export-csv", ordHandler.ExportOrdersCSV)
					prot.With(middleware.RequirePermission("order", true)).Post("/orders/manual", ordHandler.CreateManualOrder)
					prot.With(middleware.RequirePermission("order", false)).Get("/orders/{id}", ordHandler.GetOrder)
					prot.With(middleware.RequirePermission("order", true)).Put("/orders/{id}/status", ordHandler.UpdateOrderStatus)
					prot.With(middleware.RequirePermission("order", true)).Post("/orders/{id}/assign", ordHandler.AssignOrder)
					prot.With(middleware.RequirePermission("order", true)).Put("/orders/{id}/notes", ordHandler.UpdateOrderNotes)
					prot.With(middleware.RequirePermission("order", true)).Post("/orders/{id}/resend-notification", ordHandler.ResendOrderNotification)
					prot.With(middleware.RequirePermission("order", false)).Get("/orders/{id}/invoice", ordHandler.GetOrderInvoice)

					prot.With(middleware.RequirePermission("order", false)).Get("/payment-links", ordHandler.ListPaymentLinks)
					prot.With(middleware.RequirePermission("order", true)).Post("/payment-links", ordHandler.CreatePaymentLink)
					prot.With(middleware.RequirePermission("order", false)).Get("/invoices", ordHandler.ListInvoices)
				}

				if catHandler != nil {
					prot.With(middleware.RequirePermission("product", false)).Get("/products", catHandler.ListProducts)
					prot.With(middleware.RequirePermission("product", false)).Get("/products/export-csv", catHandler.ExportProductsCSV)
					prot.With(middleware.RequirePermission("product", true)).Post("/products/import-csv", catHandler.ImportProductsCSV)
					prot.With(middleware.RequirePermission("product", true)).Post("/products/bulk-update", catHandler.BulkUpdateProducts)
					prot.With(middleware.RequirePermission("product", false)).Get("/products/{id}", catHandler.GetProduct)
					prot.With(middleware.RequirePermission("product", true)).Post("/products", catHandler.CreateProduct)
					prot.With(middleware.RequirePermission("product", true)).Put("/products/{id}", catHandler.UpdateProduct)
					prot.With(middleware.RequirePermission("product", true)).Delete("/products/{id}", catHandler.DeleteProduct)
					prot.With(middleware.RequirePermission("product", true)).Post("/products/{id}/duplicate", catHandler.DuplicateProduct)

					prot.With(middleware.RequirePermission("product", false)).Get("/addons", catHandler.ListAddons)
					prot.With(middleware.RequirePermission("product", true)).Post("/addons", catHandler.CreateAddon)
					prot.With(middleware.RequirePermission("product", true)).Put("/addons/{id}", catHandler.UpdateAddon)
					prot.With(middleware.RequirePermission("product", true)).Delete("/addons/{id}", catHandler.DeleteAddon)

					prot.With(middleware.RequirePermission("category", false)).Get("/categories", catHandler.ListCategories)
					prot.With(middleware.RequirePermission("category", true)).Post("/categories", catHandler.CreateCategory)
					prot.With(middleware.RequirePermission("category", true)).Put("/categories/{id}", catHandler.UpdateCategory)
					prot.With(middleware.RequirePermission("category", true)).Delete("/categories/{id}", catHandler.DeleteCategory)

					prot.With(middleware.RequirePermission("category", false)).Get("/navigation", catHandler.ListNavigation)
					prot.With(middleware.RequirePermission("category", true)).Post("/navigation", catHandler.CreateNavigationItem)
					prot.With(middleware.RequirePermission("category", true)).Put("/navigation/{id}", catHandler.UpdateNavigationItem)
					prot.With(middleware.RequirePermission("category", true)).Delete("/navigation/{id}", catHandler.DeleteNavigationItem)
				}

				prot.With(middleware.RequirePermission("superuser", false)).Get("/roles", rbacHandler.ListRoles)
				prot.With(middleware.RequirePermission("superuser", false)).Get("/permissions", rbacHandler.ListPermissions)
				prot.With(middleware.RequirePermission("superuser", true)).Put("/roles/{id}/permissions", rbacHandler.UpdateRolePermissions)

				prot.With(middleware.RequirePermission("superuser", false)).Get("/users", rbacHandler.ListUsers)
				prot.With(middleware.RequirePermission("superuser", true)).Post("/users", rbacHandler.CreateUser)
				prot.With(middleware.RequirePermission("superuser", true)).Put("/users/{id}", rbacHandler.UpdateUser)
				prot.With(middleware.RequirePermission("superuser", true)).Delete("/users/{id}", rbacHandler.DeleteUser)

				prot.With(middleware.RequirePermission("audit", false)).Get("/audit-logs", rbacHandler.ListAuditLogs)

				if p2Handler != nil {
					prot.With(middleware.RequirePermission("page", false)).Get("/hero-banners", p2Handler.ListHeroBanners)
					prot.With(middleware.RequirePermission("page", true)).Post("/hero-banners", p2Handler.SaveHeroBanner)
					prot.With(middleware.RequirePermission("page", true)).Put("/hero-banners/{id}", p2Handler.SaveHeroBanner)
					prot.With(middleware.RequirePermission("page", true)).Delete("/hero-banners/{id}", p2Handler.DeleteHeroBanner)

					prot.With(middleware.RequirePermission("page", false)).Get("/homepage-sections", p2Handler.ListHomepageSections)
					prot.With(middleware.RequirePermission("page", true)).Post("/homepage-sections", p2Handler.SaveHomepageSection)
					prot.With(middleware.RequirePermission("page", true)).Put("/homepage-sections/{id}", p2Handler.SaveHomepageSection)
					prot.With(middleware.RequirePermission("page", true)).Delete("/homepage-sections/{id}", p2Handler.DeleteHomepageSection)

					prot.With(middleware.RequirePermission("preset", false)).Get("/states", p2Handler.ListStates)
					prot.With(middleware.RequirePermission("preset", true)).Post("/states", p2Handler.SaveState)
					prot.With(middleware.RequirePermission("preset", false)).Get("/cities", p2Handler.ListCities)
					prot.With(middleware.RequirePermission("preset", true)).Post("/cities", p2Handler.SaveCity)
					prot.With(middleware.RequirePermission("preset", false)).Get("/pincodes", p2Handler.ListPincodes)
					prot.With(middleware.RequirePermission("preset", true)).Post("/pincodes", p2Handler.SavePincode)
					prot.With(middleware.RequirePermission("preset", true)).Delete("/pincodes/{id}", p2Handler.DeletePincode)
					prot.With(middleware.RequirePermission("preset", false)).Get("/time-slots", p2Handler.ListTimeSlots)
					prot.With(middleware.RequirePermission("preset", true)).Post("/time-slots", p2Handler.SaveTimeSlot)
					prot.With(middleware.RequirePermission("preset", false)).Get("/slot-capacity", p2Handler.ListSlotLedger)
					prot.With(middleware.RequirePermission("preset", true)).Post("/slot-capacity", p2Handler.UpsertSlotLedger)
					prot.With(middleware.RequirePermission("preset", false)).Get("/blackout-dates", p2Handler.ListBlackoutDates)
					prot.With(middleware.RequirePermission("preset", true)).Post("/blackout-dates", p2Handler.SaveBlackoutDate)
					prot.With(middleware.RequirePermission("preset", true)).Delete("/blackout-dates/{id}", p2Handler.DeleteBlackoutDate)
					prot.With(middleware.RequirePermission("preset", false)).Get("/decorator-teams", p2Handler.ListDecoratorTeams)
					prot.With(middleware.RequirePermission("preset", true)).Post("/decorator-teams", p2Handler.SaveDecoratorTeam)
					prot.With(middleware.RequirePermission("preset", false)).Get("/presets", p2Handler.ListPresets)
					prot.With(middleware.RequirePermission("preset", true)).Post("/presets", p2Handler.SavePreset)
					prot.With(middleware.RequirePermission("preset", true)).Delete("/presets/{id}", p2Handler.DeletePreset)

					prot.With(middleware.RequirePermission("user", false)).Get("/customers", p2Handler.ListCustomers)
					prot.With(middleware.RequirePermission("user", false)).Get("/customers/{id}", p2Handler.GetCustomer)
					prot.With(middleware.RequirePermission("user", true)).Put("/customers/{id}/block", p2Handler.BlockCustomer)
					prot.With(middleware.RequirePermission("user", true)).Post("/customers/{id}/coins", p2Handler.AdjustCustomerCoins)

					prot.With(middleware.RequirePermission("product", false)).Get("/coupons", p2Handler.ListCoupons)
					prot.With(middleware.RequirePermission("product", true)).Post("/coupons", p2Handler.SaveCoupon)
					prot.With(middleware.RequirePermission("product", true)).Delete("/coupons/{id}", p2Handler.DeleteCoupon)

					prot.With(middleware.RequirePermission("order", false)).Get("/payments", p2Handler.ListPayments)
					prot.With(middleware.RequirePermission("order", false)).Get("/payments/settlement", p2Handler.GetSettlementReport)
					prot.With(middleware.RequirePermission("order", false)).Get("/refunds", p2Handler.ListRefunds)
					prot.With(middleware.RequirePermission("order", true)).Post("/refunds", p2Handler.CreateRefund)
					prot.With(middleware.RequirePermission("order", false)).Get("/orders/{id}/invoice/pdf", p2Handler.DownloadInvoicePDF)
				}

				if p3Handler != nil {
					prot.With(middleware.RequirePermission("product", false)).Get("/reviews", p3Handler.ListReviews)
					prot.With(middleware.RequirePermission("product", true)).Post("/reviews", p3Handler.CreateReview)
					prot.With(middleware.RequirePermission("product", true)).Put("/reviews/{id}/moderate", p3Handler.ModerateReview)
					prot.With(middleware.RequirePermission("product", true)).Delete("/reviews/{id}", p3Handler.DeleteReview)

					prot.With(middleware.RequirePermission("seller", false)).Get("/sellers", p3Handler.ListSellers)
					prot.With(middleware.RequirePermission("seller", true)).Post("/sellers", p3Handler.SaveSeller)
					prot.With(middleware.RequirePermission("seller", true)).Put("/sellers/{id}/kyc", p3Handler.UpdateSellerKYC)
					prot.With(middleware.RequirePermission("seller", true)).Put("/sellers/products/{id}/approve", p3Handler.ApproveSellerProduct)
					prot.With(middleware.RequirePermission("seller", false)).Get("/seller-payouts", p3Handler.ListSellerPayouts)
					prot.With(middleware.RequirePermission("seller", true)).Post("/seller-payouts", p3Handler.CreateSellerPayout)
					prot.With(middleware.RequirePermission("seller", true)).Put("/seller-payouts/{id}/pay", p3Handler.MarkPayoutPaid)

					prot.With(middleware.RequirePermission("page", false)).Get("/cms-pages", p3Handler.ListCMSPages)
					prot.With(middleware.RequirePermission("page", true)).Post("/cms-pages", p3Handler.SaveCMSPage)
					prot.With(middleware.RequirePermission("page", true)).Delete("/cms-pages/{id}", p3Handler.DeleteCMSPage)
					prot.With(middleware.RequirePermission("page", false)).Get("/faqs", p3Handler.ListFAQs)
					prot.With(middleware.RequirePermission("page", true)).Post("/faqs", p3Handler.SaveFAQ)
					prot.With(middleware.RequirePermission("page", true)).Delete("/faqs/{id}", p3Handler.DeleteFAQ)
					prot.With(middleware.RequirePermission("blog", false)).Get("/blog/categories", p3Handler.ListBlogCategories)
					prot.With(middleware.RequirePermission("blog", true)).Post("/blog/categories", p3Handler.SaveBlogCategory)
					prot.With(middleware.RequirePermission("blog", false)).Get("/blog/posts", p3Handler.ListBlogPosts)
					prot.With(middleware.RequirePermission("blog", true)).Post("/blog/posts", p3Handler.SaveBlogPost)
					prot.With(middleware.RequirePermission("blog", true)).Delete("/blog/posts/{id}", p3Handler.DeleteBlogPost)
					prot.With(middleware.RequirePermission("page", false)).Get("/recent-works", p3Handler.ListRecentWorks)
					prot.With(middleware.RequirePermission("page", true)).Post("/recent-works", p3Handler.SaveRecentWork)
					prot.With(middleware.RequirePermission("page", true)).Delete("/recent-works/{id}", p3Handler.DeleteRecentWork)
					prot.With(middleware.RequirePermission("page", false)).Get("/seo-redirects", p3Handler.ListSEORedirects)
					prot.With(middleware.RequirePermission("page", true)).Post("/seo-redirects", p3Handler.SaveSEORedirect)
					prot.With(middleware.RequirePermission("page", true)).Delete("/seo-redirects/{id}", p3Handler.DeleteSEORedirect)
					prot.Get("/sitemap.xml", p3Handler.GetSitemapXML)

					prot.With(middleware.RequirePermission("image", false)).Get("/media/folders", p3Handler.ListMediaFolders)
					prot.With(middleware.RequirePermission("image", false)).Get("/media", p3Handler.ListMediaAssets)
					prot.With(middleware.RequirePermission("image", true)).Post("/media/upload", p3Handler.UploadMedia)
					prot.With(middleware.RequirePermission("image", true)).Delete("/media/{id}", p3Handler.DeleteMediaAsset)

					prot.Get("/inquiries", p3Handler.ListInquiries)
					prot.Put("/inquiries/{id}/status", p3Handler.UpdateInquiryStatus)
					prot.Get("/support-tickets", p3Handler.ListTickets)
					prot.Post("/support-tickets/{id}/reply", p3Handler.ReplyTicket)
					prot.Get("/whatsapp/contacts", p3Handler.ListWhatsappContacts)
					prot.Post("/whatsapp/contacts", p3Handler.SaveWhatsappContact)
					prot.Get("/whatsapp/contacts/{id}/messages", p3Handler.ListWhatsappMessages)
					prot.Post("/whatsapp/contacts/{id}/messages", p3Handler.SendWhatsappMessage)
					prot.Get("/notification-templates", p3Handler.ListNotificationTemplates)
					prot.With(middleware.RequirePermission("setting", true)).Post("/notification-templates", p3Handler.SaveNotificationTemplate)
					prot.With(middleware.RequirePermission("superuser", false)).Get("/meta-ads", p3Handler.ListMetaAds)
					prot.With(middleware.RequirePermission("superuser", true)).Post("/meta-ads", p3Handler.SaveMetaAds)
					prot.Get("/settings", p3Handler.ListSiteSettings)
					prot.With(middleware.RequirePermission("setting", true)).Put("/settings", p3Handler.UpsertSiteSetting)
					prot.With(middleware.RequirePermission("superuser", false)).Get("/settings/backup", p3Handler.ExportBackupJSON)
				}
			})
		})
	})

	return r
}

