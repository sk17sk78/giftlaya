package service

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

func TestRenderNotificationTemplateAndSitemapXML(t *testing.T) {
	rendered := RenderNotificationTemplate(
		"Hi {{name}}, order {{order_id}} confirmed for {{slot}}.",
		map[string]string{
			"name":     "Priya",
			"order_id": "GL-2026-1024",
			"slot":     "Midnight (11 PM - 12 AM)",
		},
	)
	expected := "Hi Priya, order GL-2026-1024 confirmed for Midnight (11 PM - 12 AM)."
	if rendered != expected {
		t.Fatalf("unexpected rendered template: %q", rendered)
	}

	xmlStr := BuildSitemapXML("https://www.giftlaya.com", []string{"pastel-balloon-arch", "s/rose-arch"}, []string{"birthday-decoration"}, []string{"top-birthday-ideas"}, []string{"about-us", "pages/terms-and-conditions"})
	for _, want := range []string{
		"https://www.giftlaya.com/birthday-decoration",
		"https://www.giftlaya.com/product/pastel-balloon-arch",
		"https://www.giftlaya.com/s/rose-arch",
		"https://www.giftlaya.com/blog/top-birthday-ideas",
		"https://www.giftlaya.com/about-us",
		"https://www.giftlaya.com/pages/terms-and-conditions",
	} {
		if !strings.Contains(xmlStr, want) {
			t.Fatalf("expected sitemap xml to contain %s", want)
		}
	}
}

func TestVendorRestrictedActionsReturnForbidden(t *testing.T) {
	sid := int64(7)
	vendor := &domain.AdminProfile{ID: 10, Username: "vendor7", SellerID: &sid}
	svc := NewPhase3Service(nil, nil, nil, nil)

	if _, err := svc.UpdateSellerKYC(context.Background(), 7, "verified", 12, vendor, "r1", "127.0.0.1"); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden when vendor updates KYC, got %v", err)
	}
	if _, err := svc.CreateSellerPayout(context.Background(), &domain.SellerPayout{SellerID: 7}, vendor, "r2", "127.0.0.1"); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden when vendor creates payout, got %v", err)
	}
	if _, err := svc.ExportDatabaseBackupJSON(context.Background(), vendor, "r3", "127.0.0.1"); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("expected ErrForbidden when vendor exports DB backup, got %v", err)
	}
}

