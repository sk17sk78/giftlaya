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

type Phase3Handler struct {
	svc *service.Phase3Service
}

func NewPhase3Handler(svc *service.Phase3Service) *Phase3Handler {
	return &Phase3Handler{svc: svc}
}

type ReviewsListResponse struct {
	Items []domain.Review       `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type MediaListResponse struct {
	Items []domain.MediaAsset   `json:"items"`
	Meta  handler.PaginatedMeta `json:"meta"`
}

type ModerateReviewRequest struct {
	Status         string `json:"status" validate:"required,oneof=pending approved rejected"`
	AdminReply     string `json:"admin_reply"`
	IsFeaturedHome bool   `json:"is_featured_home"`
}

type SellerKYCRequest struct {
	KYCStatus         string  `json:"kyc_status" validate:"required,oneof=pending verified rejected"`
	CommissionPercent float64 `json:"commission_percent"`
}

type MarkPayoutPaidRequest struct {
	UTRNumber string `json:"utr_number" validate:"required"`
}

type TicketReplyRequest struct {
	Text   string `json:"text" validate:"required"`
	Status string `json:"status"`
}

type WhatsappSendRequest struct {
	Body string `json:"body" validate:"required"`
}

// ---------- Reviews ----------

// ListReviews godoc
// @Summary List product and home reviews
// @Tags Admin Phase 3 Reviews
// @Produce json
// @Security BearerAuth
// @Success 200 {object} ReviewsListResponse
// @Router /api/v1/admin/reviews [get]
func (h *Phase3Handler) ListReviews(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	items, total, err := h.svc.ListReviews(r.Context(), q.Get("status"), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, ReviewsListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// CreateReview godoc
// @Summary Create manual review
// @Tags Admin Phase 3 Reviews
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.Review true "Review"
// @Success 201 {object} domain.Review
// @Router /api/v1/admin/reviews [post]
func (h *Phase3Handler) CreateReview(w http.ResponseWriter, r *http.Request) {
	var in domain.Review
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveReview(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// ModerateReview godoc
// @Summary Approve, reject, reply or feature a review
// @Tags Admin Phase 3 Reviews
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Review ID"
// @Param payload body ModerateReviewRequest true "Moderation"
// @Success 200 {object} domain.Review
// @Router /api/v1/admin/reviews/{id}/moderate [put]
func (h *Phase3Handler) ModerateReview(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid review id")
		return
	}
	var req ModerateReviewRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.ModerateReview(r.Context(), id, req.Status, req.AdminReply, req.IsFeaturedHome, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteReview godoc
// @Summary Delete review
// @Tags Admin Phase 3 Reviews
// @Produce json
// @Security BearerAuth
// @Param id path int true "Review ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/reviews/{id} [delete]
func (h *Phase3Handler) DeleteReview(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid review id")
		return
	}
	if err := h.svc.DeleteReview(r.Context(), id); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "review deleted"})
}

// ---------- Sellers & Payouts (Vendor row scoped) ----------

// ListSellers godoc
// @Summary List sellers (vendors only see their own profile)
// @Tags Admin Marketplace
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.Seller
// @Router /api/v1/admin/sellers [get]
func (h *Phase3Handler) ListSellers(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListSellers(r.Context(), r.URL.Query().Get("kyc_status"), middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveSeller godoc
// @Summary Create or update seller
// @Tags Admin Marketplace
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.Seller true "Seller"
// @Success 200 {object} domain.Seller
// @Router /api/v1/admin/sellers [post]
func (h *Phase3Handler) SaveSeller(w http.ResponseWriter, r *http.Request) {
	var in domain.Seller
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveSeller(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// UpdateSellerKYC godoc
// @Summary Verify or reject seller KYC and update commission percentage
// @Tags Admin Marketplace
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Seller ID"
// @Param payload body SellerKYCRequest true "KYC"
// @Success 200 {object} domain.Seller
// @Router /api/v1/admin/sellers/{id}/kyc [put]
func (h *Phase3Handler) UpdateSellerKYC(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid seller id")
		return
	}
	var req SellerKYCRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.UpdateSellerKYC(r.Context(), id, req.KYCStatus, req.CommissionPercent, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ApproveSellerProduct godoc
// @Summary Approve or reject vendor product submission
// @Tags Admin Marketplace
// @Produce json
// @Security BearerAuth
// @Param id path int true "Product ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/sellers/products/{id}/approve [put]
func (h *Phase3Handler) ApproveSellerProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid product id")
		return
	}
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "published"
	}
	if err := h.svc.ApproveSellerProduct(r.Context(), id, status, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r)); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "product approval status updated"})
}

// ListSellerPayouts godoc
// @Summary List seller payouts
// @Tags Admin Marketplace
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.SellerPayout
// @Router /api/v1/admin/seller-payouts [get]
func (h *Phase3Handler) ListSellerPayouts(w http.ResponseWriter, r *http.Request) {
	var sid *int64
	if q := r.URL.Query().Get("seller_id"); q != "" {
		if id, err := strconv.ParseInt(q, 10, 64); err == nil {
			sid = &id
		}
	}
	items, err := h.svc.ListSellerPayouts(r.Context(), sid, middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// CreateSellerPayout godoc
// @Summary Generate seller payout settlement batch
// @Tags Admin Marketplace
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.SellerPayout true "Payout"
// @Success 201 {object} domain.SellerPayout
// @Router /api/v1/admin/seller-payouts [post]
func (h *Phase3Handler) CreateSellerPayout(w http.ResponseWriter, r *http.Request) {
	var in domain.SellerPayout
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.CreateSellerPayout(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// MarkPayoutPaid godoc
// @Summary Mark payout paid with UTR reference
// @Tags Admin Marketplace
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Payout ID"
// @Param payload body MarkPayoutPaidRequest true "UTR"
// @Success 200 {object} domain.SellerPayout
// @Router /api/v1/admin/seller-payouts/{id}/pay [put]
func (h *Phase3Handler) MarkPayoutPaid(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid payout id")
		return
	}
	var req MarkPayoutPaidRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.MarkPayoutPaid(r.Context(), id, req.UTRNumber, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ---------- Content, Blog, Recent Work, FAQs, Redirects, Sitemap ----------

// ListCMSPages godoc
// @Summary List CMS static/policy/dynamic pages
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.CMSPage
// @Router /api/v1/admin/cms-pages [get]
func (h *Phase3Handler) ListCMSPages(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListCMSPages(r.Context(), r.URL.Query().Get("page_type"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveCMSPage godoc
// @Summary Create or update CMS static/dynamic/policy page
// @Tags Admin Content & SEO
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.CMSPage true "Page"
// @Success 200 {object} domain.CMSPage
// @Router /api/v1/admin/cms-pages [post]
func (h *Phase3Handler) SaveCMSPage(w http.ResponseWriter, r *http.Request) {
	var in domain.CMSPage
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveCMSPage(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteCMSPage godoc
// @Summary Delete CMS page
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Param id path int true "Page ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/cms-pages/{id} [delete]
func (h *Phase3Handler) DeleteCMSPage(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.svc.DeleteCMSPage(r.Context(), id); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "page deleted"})
}

// ListFAQs godoc
// @Summary List FAQs
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.FAQ
// @Router /api/v1/admin/faqs [get]
func (h *Phase3Handler) ListFAQs(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListFAQs(r.Context(), r.URL.Query().Get("scope_type"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveFAQ godoc
// @Summary Save FAQ
// @Tags Admin Content & SEO
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.FAQ true "FAQ"
// @Success 200 {object} domain.FAQ
// @Router /api/v1/admin/faqs [post]
func (h *Phase3Handler) SaveFAQ(w http.ResponseWriter, r *http.Request) {
	var in domain.FAQ
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveFAQ(r.Context(), &in)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteFAQ godoc
// @Summary Delete FAQ
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Param id path int true "FAQ ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/faqs/{id} [delete]
func (h *Phase3Handler) DeleteFAQ(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		handler.WriteError(w, http.StatusBadRequest, "invalid faq id")
		return
	}
	if err := h.svc.DeleteFAQ(r.Context(), id); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "faq deleted"})
}

// ListBlogCategories godoc
// @Summary List blog categories
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.BlogCategory
// @Router /api/v1/admin/blog/categories [get]
func (h *Phase3Handler) ListBlogCategories(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListBlogCategories(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveBlogCategory godoc
// @Summary Save blog category
// @Tags Admin Content & SEO
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.BlogCategory true "Blog Category"
// @Success 200 {object} domain.BlogCategory
// @Router /api/v1/admin/blog/categories [post]
func (h *Phase3Handler) SaveBlogCategory(w http.ResponseWriter, r *http.Request) {
	var in domain.BlogCategory
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveBlogCategory(r.Context(), &in)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListBlogPosts godoc
// @Summary List blog articles
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.BlogPost
// @Router /api/v1/admin/blog/posts [get]
func (h *Phase3Handler) ListBlogPosts(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListBlogPosts(r.Context(), r.URL.Query().Get("status"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveBlogPost godoc
// @Summary Save blog post
// @Tags Admin Content & SEO
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.BlogPost true "Blog Post"
// @Success 200 {object} domain.BlogPost
// @Router /api/v1/admin/blog/posts [post]
func (h *Phase3Handler) SaveBlogPost(w http.ResponseWriter, r *http.Request) {
	var in domain.BlogPost
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveBlogPost(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteBlogPost godoc
// @Summary Delete blog post
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Param id path int true "Post ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/blog/posts/{id} [delete]
func (h *Phase3Handler) DeleteBlogPost(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		handler.WriteError(w, http.StatusBadRequest, "invalid post id")
		return
	}
	if err := h.svc.DeleteBlogPost(r.Context(), id); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "blog post deleted"})
}

// ListRecentWorks godoc
// @Summary List recent decoration portfolio works
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.RecentWork
// @Router /api/v1/admin/recent-works [get]
func (h *Phase3Handler) ListRecentWorks(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListRecentWorks(r.Context(), r.URL.Query().Get("category_slug"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveRecentWork godoc
// @Summary Create recent work showcase item
// @Tags Admin Content & SEO
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.RecentWork true "Recent Work"
// @Success 201 {object} domain.RecentWork
// @Router /api/v1/admin/recent-works [post]
func (h *Phase3Handler) SaveRecentWork(w http.ResponseWriter, r *http.Request) {
	var in domain.RecentWork
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveRecentWork(r.Context(), &in)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// DeleteRecentWork godoc
// @Summary Delete recent work item
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/recent-works/{id} [delete]
func (h *Phase3Handler) DeleteRecentWork(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		handler.WriteError(w, http.StatusBadRequest, "invalid recent work id")
		return
	}
	if err := h.svc.DeleteRecentWork(r.Context(), id); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "deleted"})
}

// ListSEORedirects godoc
// @Summary List 301 SEO redirects
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.SEORedirect
// @Router /api/v1/admin/seo-redirects [get]
func (h *Phase3Handler) ListSEORedirects(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListSEORedirects(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveSEORedirect godoc
// @Summary Save 301 SEO redirect rule
// @Tags Admin Content & SEO
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.SEORedirect true "Redirect"
// @Success 200 {object} domain.SEORedirect
// @Router /api/v1/admin/seo-redirects [post]
func (h *Phase3Handler) SaveSEORedirect(w http.ResponseWriter, r *http.Request) {
	var in domain.SEORedirect
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveSEORedirect(r.Context(), &in)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// DeleteSEORedirect godoc
// @Summary Delete SEO redirect rule
// @Tags Admin Content & SEO
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/seo-redirects/{id} [delete]
func (h *Phase3Handler) DeleteSEORedirect(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		handler.WriteError(w, http.StatusBadRequest, "invalid redirect id")
		return
	}
	if err := h.svc.DeleteSEORedirect(r.Context(), id); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "redirect deleted"})
}

// GetSitemapXML godoc
// @Summary Generate dynamic sitemap.xml from published catalog, categories, blog & pages
// @Tags Admin Content & SEO
// @Produce application/xml
// @Success 200 {string} string "XML Sitemap"
// @Router /api/v1/admin/sitemap.xml [get]
func (h *Phase3Handler) GetSitemapXML(w http.ResponseWriter, r *http.Request) {
	xmlStr, err := h.svc.GenerateSitemapXML(r.Context(), r.URL.Query().Get("base_url"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(xmlStr))
}

// ---------- Media Library ----------

// ListMediaFolders godoc
// @Summary List media folders
// @Tags Admin Media Library
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.MediaFolder
// @Router /api/v1/admin/media/folders [get]
func (h *Phase3Handler) ListMediaFolders(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListMediaFolders(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// ListMediaAssets godoc
// @Summary List media assets
// @Tags Admin Media Library
// @Produce json
// @Security BearerAuth
// @Success 200 {object} MediaListResponse
// @Router /api/v1/admin/media [get]
func (h *Phase3Handler) ListMediaAssets(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 30
	}
	var fid *int64
	if f, err := strconv.ParseInt(q.Get("folder_id"), 10, 64); err == nil && f > 0 {
		fid = &f
	}
	items, total, err := h.svc.ListMediaAssets(r.Context(), fid, q.Get("search"), page, limit)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, MediaListResponse{
		Items: items,
		Meta:  handler.PaginatedMeta{Page: page, Limit: limit, Total: total, TotalPages: int(math.Ceil(float64(total) / float64(limit)))},
	})
}

// UploadMedia godoc
// @Summary Upload image asset to local/S3 CDN storage
// @Tags Admin Media Library
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Success 201 {object} domain.MediaAsset
// @Router /api/v1/admin/media/upload [post]
func (h *Phase3Handler) UploadMedia(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		handler.WriteError(w, http.StatusBadRequest, "invalid multipart upload")
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		handler.WriteError(w, http.StatusBadRequest, "file field is required")
		return
	}
	defer file.Close()

	folder := r.FormValue("folder")
	alt := r.FormValue("alt_text")
	var fid *int64
	if f, err := strconv.ParseInt(r.FormValue("folder_id"), 10, 64); err == nil && f > 0 {
		fid = &f
	}
	ct := hdr.Header.Get("Content-Type")
	if ct == "" {
		ct = "image/jpeg"
	}
	asset, err := h.svc.UploadMedia(r.Context(), fid, folder, hdr.Filename, ct, alt, hdr.Size, file, middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, asset)
}

// DeleteMediaAsset godoc
// @Summary Delete media asset
// @Tags Admin Media Library
// @Produce json
// @Security BearerAuth
// @Param id path int true "Media ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/media/{id} [delete]
func (h *Phase3Handler) DeleteMediaAsset(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.svc.DeleteMediaAsset(r.Context(), id); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "media deleted"})
}

// ---------- Inquiries, Support, WhatsApp, Notifications, Meta Ads, Settings ----------

// ListInquiries godoc
// @Summary List contact, callback, product inquiry, franchise & seller requests
// @Tags Admin Support & Inbox
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.ContactInquiry
// @Router /api/v1/admin/inquiries [get]
func (h *Phase3Handler) ListInquiries(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	items, err := h.svc.ListContactInquiries(r.Context(), q.Get("type"), q.Get("status"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// UpdateInquiryStatus godoc
// @Summary Update inquiry status (new | in_progress | resolved)
// @Tags Admin Support & Inbox
// @Produce json
// @Security BearerAuth
// @Param id path int true "Inquiry ID"
// @Success 200 {object} handler.MessageResponse
// @Router /api/v1/admin/inquiries/{id}/status [put]
func (h *Phase3Handler) UpdateInquiryStatus(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		handler.WriteError(w, http.StatusBadRequest, "invalid inquiry id")
		return
	}
	var body struct {
		Status string `json:"status" validate:"required,oneof=new in_progress resolved"`
	}
	if err := handler.DecodeAndValidate(r, &body); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.svc.UpdateInquiryStatus(r.Context(), id, body.Status); err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, handler.MessageResponse{Message: "status updated"})
}

// ListTickets godoc
// @Summary List support tickets
// @Tags Admin Support & Inbox
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.SupportTicket
// @Router /api/v1/admin/support-tickets [get]
func (h *Phase3Handler) ListTickets(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListSupportTickets(r.Context(), r.URL.Query().Get("status"), middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// ReplyTicket godoc
// @Summary Append reply to support ticket
// @Tags Admin Support & Inbox
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Ticket ID"
// @Param payload body TicketReplyRequest true "Reply"
// @Success 200 {object} domain.SupportTicket
// @Router /api/v1/admin/support-tickets/{id}/reply [post]
func (h *Phase3Handler) ReplyTicket(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req TicketReplyRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.ReplySupportTicket(r.Context(), id, req.Text, req.Status, middleware.AdminFromContext(r.Context()))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListWhatsappContacts godoc
// @Summary List WhatsApp contacts
// @Tags Admin Support & Inbox
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.WhatsappContact
// @Router /api/v1/admin/whatsapp/contacts [get]
func (h *Phase3Handler) ListWhatsappContacts(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListWhatsappContacts(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveWhatsappContact godoc
// @Summary Create or update a WhatsApp contact
// @Tags Admin Support & Inbox
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.WhatsappContact true "Contact"
// @Success 201 {object} domain.WhatsappContact
// @Router /api/v1/admin/whatsapp/contacts [post]
func (h *Phase3Handler) SaveWhatsappContact(w http.ResponseWriter, r *http.Request) {
	var in domain.WhatsappContact
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	if in.Phone == "" {
		handler.WriteError(w, http.StatusBadRequest, "phone is required")
		return
	}
	out, err := h.svc.SaveWhatsappContact(r.Context(), &in)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// ListWhatsappMessages godoc
// @Summary List WhatsApp messages for a contact
// @Tags Admin Support & Inbox
// @Produce json
// @Security BearerAuth
// @Param id path int true "Contact ID"
// @Success 200 {array} domain.WhatsappMessage
// @Router /api/v1/admin/whatsapp/contacts/{id}/messages [get]
func (h *Phase3Handler) ListWhatsappMessages(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	items, err := h.svc.ListWhatsappMessages(r.Context(), id)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SendWhatsappMessage godoc
// @Summary Send WhatsApp reply via asynq worker
// @Tags Admin Support & Inbox
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Contact ID"
// @Param payload body WhatsappSendRequest true "Message"
// @Success 201 {object} domain.WhatsappMessage
// @Router /api/v1/admin/whatsapp/contacts/{id}/messages [post]
func (h *Phase3Handler) SendWhatsappMessage(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var req WhatsappSendRequest
	if err := handler.DecodeAndValidate(r, &req); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SendWhatsappMessage(r.Context(), id, req.Body)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusCreated, out)
}

// ListNotificationTemplates godoc
// @Summary List notification templates
// @Tags Admin Settings
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.NotificationTemplate
// @Router /api/v1/admin/notification-templates [get]
func (h *Phase3Handler) ListNotificationTemplates(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListNotificationTemplates(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveNotificationTemplate godoc
// @Summary Create or update notification template ({{order_id}}, {{name}}, {{slot}})
// @Tags Admin Settings
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.NotificationTemplate true "Template"
// @Success 200 {object} domain.NotificationTemplate
// @Router /api/v1/admin/notification-templates [post]
func (h *Phase3Handler) SaveNotificationTemplate(w http.ResponseWriter, r *http.Request) {
	var in domain.NotificationTemplate
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveNotificationTemplate(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListMetaAds godoc
// @Summary List Meta Ads campaigns
// @Tags Admin Marketing
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.MetaAdsCampaign
// @Router /api/v1/admin/meta-ads [get]
func (h *Phase3Handler) ListMetaAds(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListMetaAdsCampaigns(r.Context())
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// SaveMetaAds godoc
// @Summary Save Meta Ads campaign
// @Tags Admin Marketing
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.MetaAdsCampaign true "Campaign"
// @Success 200 {object} domain.MetaAdsCampaign
// @Router /api/v1/admin/meta-ads [post]
func (h *Phase3Handler) SaveMetaAds(w http.ResponseWriter, r *http.Request) {
	var in domain.MetaAdsCampaign
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.SaveMetaAdsCampaign(r.Context(), &in)
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ListSiteSettings godoc
// @Summary List all site settings (theme, GST, cancellation, coins, cutoffs, mobile, login methods)
// @Tags Admin Settings
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.SiteSetting
// @Router /api/v1/admin/settings [get]
func (h *Phase3Handler) ListSiteSettings(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListSiteSettings(r.Context(), r.URL.Query().Get("group"))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, items)
}

// UpsertSiteSetting godoc
// @Summary Save site setting by key
// @Tags Admin Settings
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body domain.SiteSetting true "Setting"
// @Success 200 {object} domain.SiteSetting
// @Router /api/v1/admin/settings [put]
func (h *Phase3Handler) UpsertSiteSetting(w http.ResponseWriter, r *http.Request) {
	var in domain.SiteSetting
	if err := handler.DecodeAndValidate(r, &in); err != nil {
		handler.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	out, err := h.svc.UpsertSiteSetting(r.Context(), &in, middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	handler.WriteJSON(w, http.StatusOK, out)
}

// ExportBackupJSON godoc
// @Summary Export system configuration and CMS snapshot JSON backup
// @Tags Admin Settings
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]any
// @Router /api/v1/admin/settings/backup [get]
func (h *Phase3Handler) ExportBackupJSON(w http.ResponseWriter, r *http.Request) {
	snap, err := h.svc.ExportDatabaseBackupJSON(r.Context(), middleware.AdminFromContext(r.Context()), chimw.GetReqID(r.Context()), middleware.ClientIP(r))
	if err != nil {
		handler.HandleDomainError(w, err)
		return
	}
	w.Header().Set("Content-Disposition", `attachment; filename="giftlaya-backup.json"`)
	handler.WriteJSON(w, http.StatusOK, snap)
}

