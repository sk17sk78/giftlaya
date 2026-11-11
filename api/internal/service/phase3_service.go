package service

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"strings"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/jobs"
	"github.com/giftlaya/giftlaya-api/internal/storage"
)

type Phase3Service struct {
	repo     domain.Phase3Repository
	storage  storage.Client
	queue    jobs.Queue
	auditSvc *AuditService
}

func NewPhase3Service(repo domain.Phase3Repository, store storage.Client, queue jobs.Queue, auditSvc *AuditService) *Phase3Service {
	return &Phase3Service{
		repo:     repo,
		storage:  store,
		queue:    queue,
		auditSvc: auditSvc,
	}
}

func RenderNotificationTemplate(tpl string, vars map[string]string) string {
	out := tpl
	for k, v := range vars {
		out = strings.ReplaceAll(out, "{{"+k+"}}", v)
	}
	return out
}

type SitemapURLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	Xmlns   string       `xml:"xmlns,attr"`
	URLs    []SitemapURL `xml:"url"`
}

type SitemapURL struct {
	Loc string `xml:"loc"`
}

func BuildSitemapXML(baseURL string, products, categories, blogs, pages []string) string {
	base := strings.TrimRight(baseURL, "/")
	if base == "" {
		base = "https://www.giftlaya.com"
	}
	set := SitemapURLSet{Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"}
	set.URLs = append(set.URLs, SitemapURL{Loc: base + "/"})
	for _, c := range categories {
		set.URLs = append(set.URLs, SitemapURL{Loc: base + "/" + c})
	}
	for _, p := range products {
		path := strings.TrimPrefix(p, "/")
		if !strings.HasPrefix(path, "p/") && !strings.HasPrefix(path, "s/") && !strings.HasPrefix(path, "product/") {
			path = "product/" + path
		}
		set.URLs = append(set.URLs, SitemapURL{Loc: base + "/" + path})
	}
	for _, b := range blogs {
		set.URLs = append(set.URLs, SitemapURL{Loc: base + "/blog/" + b})
	}
	for _, pg := range pages {
		set.URLs = append(set.URLs, SitemapURL{Loc: base + "/" + pg})
	}
	raw, _ := xml.MarshalIndent(set, "", "  ")
	return xml.Header + string(raw)
}

func assertAdminOnly(admin *domain.AdminProfile) error {
	if admin != nil && admin.SellerID != nil {
		return domain.ErrForbidden
	}
	return nil
}

// ---------- Reviews ----------

func (s *Phase3Service) ListReviews(ctx context.Context, status string, page, limit int) ([]domain.Review, int64, error) {
	return s.repo.ListReviews(ctx, status, page, limit)
}

func (s *Phase3Service) SaveReview(ctx context.Context, r *domain.Review, admin *domain.AdminProfile, reqID, ip string) (*domain.Review, error) {
	out, err := s.repo.SaveReview(ctx, r)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "review.create", "review", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase3Service) ModerateReview(ctx context.Context, id int64, status, reply string, featured bool, admin *domain.AdminProfile, reqID, ip string) (*domain.Review, error) {
	out, err := s.repo.ModerateReview(ctx, id, status, reply, featured)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "product", "review.moderate", "review", id, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase3Service) DeleteReview(ctx context.Context, id int64) error {
	return s.repo.DeleteReview(ctx, id)
}

// ---------- Sellers & Vendor Row Scope ----------

func (s *Phase3Service) ListSellers(ctx context.Context, kycStatus string, admin *domain.AdminProfile) ([]domain.Seller, error) {
	return s.repo.ListSellers(ctx, kycStatus, vendorScopeSellerID(admin))
}

func (s *Phase3Service) SaveSeller(ctx context.Context, sel *domain.Seller, admin *domain.AdminProfile, reqID, ip string) (*domain.Seller, error) {
	if err := assertAdminOnly(admin); err != nil {
		return nil, err
	}
	if sel.Slug == "" {
		sel.Slug = Slugify(sel.BusinessName)
	}
	out, err := s.repo.SaveSeller(ctx, sel)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "seller", "seller.save", "seller", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase3Service) UpdateSellerKYC(ctx context.Context, id int64, status string, commission float64, admin *domain.AdminProfile, reqID, ip string) (*domain.Seller, error) {
	if err := assertAdminOnly(admin); err != nil {
		return nil, err
	}
	out, err := s.repo.UpdateSellerKYC(ctx, id, status, commission)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "seller", "seller.kyc_update", "seller", id, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase3Service) ListSellerPayouts(ctx context.Context, sellerID *int64, admin *domain.AdminProfile) ([]domain.SellerPayout, error) {
	if sid := vendorScopeSellerID(admin); sid != nil {
		sellerID = sid
	}
	return s.repo.ListSellerPayouts(ctx, sellerID)
}

func (s *Phase3Service) CreateSellerPayout(ctx context.Context, p *domain.SellerPayout, admin *domain.AdminProfile, reqID, ip string) (*domain.SellerPayout, error) {
	if err := assertAdminOnly(admin); err != nil {
		return nil, err
	}
	if admin != nil {
		p.CreatedByAdminID = &admin.ID
	}
	out, err := s.repo.CreateSellerPayout(ctx, p)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "seller", "payout.create", "seller_payout", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase3Service) MarkPayoutPaid(ctx context.Context, id int64, utr string, admin *domain.AdminProfile, reqID, ip string) (*domain.SellerPayout, error) {
	if err := assertAdminOnly(admin); err != nil {
		return nil, err
	}
	out, err := s.repo.MarkPayoutPaid(ctx, id, utr)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "seller", "payout.mark_paid", "seller_payout", id, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase3Service) ApproveSellerProduct(ctx context.Context, productID int64, status string, admin *domain.AdminProfile, reqID, ip string) error {
	if err := assertAdminOnly(admin); err != nil {
		return err
	}
	if err := s.repo.ApproveSellerProduct(ctx, productID, status); err != nil {
		return err
	}
	if admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "seller", "seller_product.approve", "product", productID, reqID, ip, nil, map[string]string{"status": status})
	}
	return nil
}

// ---------- Content, Blog, Recent Work, FAQs, Redirects, Sitemap ----------

func (s *Phase3Service) ListCMSPages(ctx context.Context, pageType string) ([]domain.CMSPage, error) {
	return s.repo.ListCMSPages(ctx, pageType)
}
func (s *Phase3Service) SaveCMSPage(ctx context.Context, p *domain.CMSPage, admin *domain.AdminProfile, reqID, ip string) (*domain.CMSPage, error) {
	if strings.TrimSpace(p.Slug) == "" {
		p.Slug = Slugify(p.Title)
	} else {
		p.Slug = Slugify(p.Slug)
	}
	out, err := s.repo.SaveCMSPage(ctx, p)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "page", "cms_page.save", "cms_page", out.ID, reqID, ip, nil, out.Slug)
	}
	return out, err
}
func (s *Phase3Service) DeleteCMSPage(ctx context.Context, id int64) error {
	return s.repo.DeleteCMSPage(ctx, id)
}

func (s *Phase3Service) ListFAQs(ctx context.Context, scopeType string) ([]domain.FAQ, error) {
	return s.repo.ListFAQs(ctx, scopeType)
}
func (s *Phase3Service) SaveFAQ(ctx context.Context, f *domain.FAQ) (*domain.FAQ, error) {
	return s.repo.SaveFAQ(ctx, f)
}
func (s *Phase3Service) DeleteFAQ(ctx context.Context, id int64) error {
	return s.repo.DeleteFAQ(ctx, id)
}

func (s *Phase3Service) ListBlogCategories(ctx context.Context) ([]domain.BlogCategory, error) {
	return s.repo.ListBlogCategories(ctx)
}
func (s *Phase3Service) SaveBlogCategory(ctx context.Context, c *domain.BlogCategory) (*domain.BlogCategory, error) {
	if c.Slug == "" {
		c.Slug = Slugify(c.Name)
	}
	return s.repo.SaveBlogCategory(ctx, c)
}
func (s *Phase3Service) ListBlogPosts(ctx context.Context, status string) ([]domain.BlogPost, error) {
	return s.repo.ListBlogPosts(ctx, status)
}
func (s *Phase3Service) SaveBlogPost(ctx context.Context, b *domain.BlogPost, admin *domain.AdminProfile, reqID, ip string) (*domain.BlogPost, error) {
	if b.Slug == "" {
		b.Slug = Slugify(b.Title)
	}
	out, err := s.repo.SaveBlogPost(ctx, b)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "blog", "blog_post.save", "blog_post", out.ID, reqID, ip, nil, out.Slug)
	}
	return out, err
}
func (s *Phase3Service) DeleteBlogPost(ctx context.Context, id int64) error {
	return s.repo.DeleteBlogPost(ctx, id)
}

func (s *Phase3Service) ListRecentWorks(ctx context.Context, categorySlug string) ([]domain.RecentWork, error) {
	return s.repo.ListRecentWorks(ctx, categorySlug)
}
func (s *Phase3Service) SaveRecentWork(ctx context.Context, rw *domain.RecentWork) (*domain.RecentWork, error) {
	return s.repo.SaveRecentWork(ctx, rw)
}
func (s *Phase3Service) DeleteRecentWork(ctx context.Context, id int64) error {
	return s.repo.DeleteRecentWork(ctx, id)
}

func (s *Phase3Service) ListSEORedirects(ctx context.Context) ([]domain.SEORedirect, error) {
	return s.repo.ListSEORedirects(ctx)
}
func (s *Phase3Service) SaveSEORedirect(ctx context.Context, rd *domain.SEORedirect) (*domain.SEORedirect, error) {
	return s.repo.SaveSEORedirect(ctx, rd)
}
func (s *Phase3Service) DeleteSEORedirect(ctx context.Context, id int64) error {
	return s.repo.DeleteSEORedirect(ctx, id)
}
func (s *Phase3Service) GenerateSitemapXML(ctx context.Context, baseURL string) (string, error) {
	prods, cats, blogs, pages, err := s.repo.ListSitemapSlugs(ctx)
	if err != nil {
		return "", err
	}
	return BuildSitemapXML(baseURL, prods, cats, blogs, pages), nil
}

// ---------- Media Library ----------

func (s *Phase3Service) ListMediaFolders(ctx context.Context) ([]domain.MediaFolder, error) {
	return s.repo.ListMediaFolders(ctx)
}
func (s *Phase3Service) CreateMediaFolder(ctx context.Context, name string, parentID *int64) (*domain.MediaFolder, error) {
	return s.repo.CreateMediaFolder(ctx, &domain.MediaFolder{
		ParentID: parentID,
		Name:     name,
		Slug:     Slugify(name),
	})
}
func (s *Phase3Service) ListMediaAssets(ctx context.Context, folderID *int64, search string, page, limit int) ([]domain.MediaAsset, int64, error) {
	return s.repo.ListMediaAssets(ctx, folderID, search, page, limit)
}

func (s *Phase3Service) UploadMedia(ctx context.Context, folderID *int64, folderName, filename, contentType, altText string, size int64, body io.Reader, admin *domain.AdminProfile) (*domain.MediaAsset, error) {
	if s.storage == nil {
		return nil, fmt.Errorf("storage backend unavailable")
	}
	res, err := s.storage.Upload(ctx, storage.UploadInput{
		Folder:      folderName,
		Filename:    filename,
		ContentType: contentType,
		Size:        size,
		Body:        body,
	})
	if err != nil {
		return nil, err
	}
	var adminID *int64
	if admin != nil {
		adminID = &admin.ID
	}
	asset, err := s.repo.CreateMediaAsset(ctx, &domain.MediaAsset{
		FolderID:          folderID,
		FileKey:           res.FileKey,
		CDNURL:            res.CDNURL,
		WebPURL:           res.CDNURL,
		AltText:           altText,
		SizeBytes:         size,
		MimeType:          contentType,
		UploadedByAdminID: adminID,
	})
	if err != nil {
		return nil, err
	}
	if s.queue != nil {
		_ = s.queue.Enqueue(ctx, jobs.TaskProcessImage, map[string]any{"asset_id": asset.ID, "file_key": res.FileKey})
	}
	return asset, nil
}

func (s *Phase3Service) UpdateMediaAltText(ctx context.Context, id int64, alt string) error {
	return s.repo.UpdateMediaAltText(ctx, id, alt)
}
func (s *Phase3Service) DeleteMediaAsset(ctx context.Context, id int64) error {
	key, err := s.repo.DeleteMediaAsset(ctx, id)
	if err != nil {
		return err
	}
	if s.storage != nil && key != "" {
		_ = s.storage.Delete(ctx, key)
	}
	return nil
}

// ---------- Inquiries, Support, WhatsApp, Notifications, Meta Ads, Settings ----------

func (s *Phase3Service) ListContactInquiries(ctx context.Context, inquiryType, status string) ([]domain.ContactInquiry, error) {
	return s.repo.ListContactInquiries(ctx, inquiryType, status)
}
func (s *Phase3Service) UpdateInquiryStatus(ctx context.Context, id int64, status string) error {
	return s.repo.UpdateInquiryStatus(ctx, id, status)
}

func (s *Phase3Service) ListSupportTickets(ctx context.Context, status string, admin *domain.AdminProfile) ([]domain.SupportTicket, error) {
	return s.repo.ListSupportTickets(ctx, vendorScopeSellerID(admin), status)
}
func (s *Phase3Service) ReplySupportTicket(ctx context.Context, id int64, text, nextStatus string, admin *domain.AdminProfile) (*domain.SupportTicket, error) {
	sender := "Support Agent"
	if admin != nil {
		sender = admin.FullName
	}
	return s.repo.ReplySupportTicket(ctx, id, sender, text, nextStatus)
}

func (s *Phase3Service) ListWhatsappContacts(ctx context.Context) ([]domain.WhatsappContact, error) {
	return s.repo.ListWhatsappContacts(ctx)
}
func (s *Phase3Service) SaveWhatsappContact(ctx context.Context, c *domain.WhatsappContact) (*domain.WhatsappContact, error) {
	return s.repo.SaveWhatsappContact(ctx, c)
}
func (s *Phase3Service) ListWhatsappMessages(ctx context.Context, contactID int64) ([]domain.WhatsappMessage, error) {
	return s.repo.ListWhatsappMessages(ctx, contactID)
}
func (s *Phase3Service) SendWhatsappMessage(ctx context.Context, contactID int64, body string) (*domain.WhatsappMessage, error) {
	msg, err := s.repo.SendWhatsappMessage(ctx, contactID, body)
	if err == nil && s.queue != nil {
		_ = s.queue.Enqueue(ctx, jobs.TaskSendNotification, jobs.NotificationTaskPayload{
			Channel: "whatsapp", To: fmt.Sprintf("contact:%d", contactID), Subject: "whatsapp.reply", Body: body,
		})
	}
	return msg, err
}

func (s *Phase3Service) ListNotificationTemplates(ctx context.Context) ([]domain.NotificationTemplate, error) {
	return s.repo.ListNotificationTemplates(ctx)
}
func (s *Phase3Service) SaveNotificationTemplate(ctx context.Context, t *domain.NotificationTemplate, admin *domain.AdminProfile, reqID, ip string) (*domain.NotificationTemplate, error) {
	out, err := s.repo.SaveNotificationTemplate(ctx, t)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "setting", "notification_template.save", "notification_template", out.ID, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase3Service) ListMetaAdsCampaigns(ctx context.Context) ([]domain.MetaAdsCampaign, error) {
	return s.repo.ListMetaAdsCampaigns(ctx)
}
func (s *Phase3Service) SaveMetaAdsCampaign(ctx context.Context, m *domain.MetaAdsCampaign) (*domain.MetaAdsCampaign, error) {
	return s.repo.SaveMetaAdsCampaign(ctx, m)
}

func (s *Phase3Service) ListSiteSettings(ctx context.Context, group string) ([]domain.SiteSetting, error) {
	return s.repo.ListSiteSettings(ctx, group)
}
func (s *Phase3Service) UpsertSiteSetting(ctx context.Context, st *domain.SiteSetting, admin *domain.AdminProfile, reqID, ip string) (*domain.SiteSetting, error) {
	if admin != nil {
		st.UpdatedByAdminID = &admin.ID
	}
	out, err := s.repo.UpsertSiteSetting(ctx, st)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "setting", "site_setting.upsert", "site_setting", out.Key, reqID, ip, nil, out)
	}
	return out, err
}

func (s *Phase3Service) ExportDatabaseBackupJSON(ctx context.Context, admin *domain.AdminProfile, reqID, ip string) (map[string]any, error) {
	if err := assertAdminOnly(admin); err != nil {
		return nil, err
	}
	snap, err := s.repo.ExportDatabaseBackupJSON(ctx)
	if err == nil && admin != nil && s.auditSvc != nil {
		s.auditSvc.Record(ctx, &admin.ID, admin.Username, "setting", "database.backup_export", "system", "snapshot", reqID, ip, nil, nil)
	}
	return snap, err
}

