package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/giftlaya/giftlaya-api/internal/config"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
)

type roleDef struct {
	slug, name, desc string
	system           bool
}

type permDef struct {
	key, label, desc string
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}
	if cfg.DatabaseURL == "" || cfg.SeedAdminPassword == "" || cfg.SeedAdminAccessCode == "" {
		logger.Error("DATABASE_URL, SEED_ADMIN_PASSWORD, and SEED_ADMIN_ACCESS_CODE must be set in .env")
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("connect db", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	roles := []roleDef{
		{"super_admin", "Super Admin", "Unrestricted system access", true},
		{"admin", "Admin", "Full operational access excluding system backups/roles", true},
		{"catalog_manager", "Catalog Manager", "Products, categories, presets, media & coupons", true},
		{"order_manager", "Order Manager", "Orders, booking calendar, payments, invoices & delivery", true},
		{"support", "Support", "Customers, contact inquiries, tickets & WhatsApp", true},
		{"content_seo_manager", "Content & SEO Manager", "Pages, blog, recent work, FAQs, media & sitemap", true},
		{"vendor", "Vendor", "Seller scoped catalog, orders & payouts", true},
	}

	for _, r := range roles {
		_, err := pool.Exec(ctx, `
			INSERT INTO roles (slug, name, description, is_system)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
		`, r.slug, r.name, r.desc, r.system)
		if err != nil {
			logger.Error("seed role", "role", r.slug, "error", err)
			os.Exit(1)
		}
	}

	perms := []permDef{
		{"order", "Orders & Fulfillment", "Orders, manual orders, calendar, invoices"},
		{"product", "Products & Addons", "Catalog products, variants, addons, coupons"},
		{"category", "Categories & Pages", "Nested categories, mega-menu & sub-pages"},
		{"preset", "Presets & Geo", "Cities, states, slots, flavours, occasions, policies"},
		{"page", "CMS Pages & Home", "Homepage builder, header, footer, recent work"},
		{"blog", "Blog & Articles", "Blog posts and blog categories"},
		{"image", "Media Library", "Upload, crop and organize CDN assets"},
		{"user", "Customers & Wallet", "Customers, addresses & coins wallet"},
		{"seller", "Marketplace Sellers", "Sellers, KYC, payouts, vendor approvals"},
		{"support", "Support & Inbox", "Tickets, contact forms, WhatsApp & inquiries"},
		{"setting", "Site Settings", "Themes, taxes, cutoffs & templates"},
		{"audit", "Audit Logs", "View immutable admin action history"},
	}

	for _, p := range perms {
		_, err := pool.Exec(ctx, `
			INSERT INTO permissions (module_key, label, description)
			VALUES ($1, $2, $3)
			ON CONFLICT (module_key) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description
		`, p.key, p.label, p.desc)
		if err != nil {
			logger.Error("seed permission", "key", p.key, "error", err)
			os.Exit(1)
		}
	}

	matrix := map[string]map[string][2]bool{
		"admin": {
			"order": {true, true}, "product": {true, true}, "category": {true, true},
			"preset": {true, true}, "page": {true, true}, "blog": {true, true},
			"image": {true, true}, "user": {true, true}, "seller": {true, true},
			"support": {true, true}, "setting": {true, false}, "audit": {true, false},
		},
		"catalog_manager": {
			"product": {true, true}, "category": {true, true}, "preset": {true, true}, "image": {true, true},
		},
		"order_manager": {
			"order": {true, true}, "user": {true, false}, "support": {true, true},
		},
		"support": {
			"order": {true, false}, "user": {true, true}, "support": {true, true},
		},
		"content_seo_manager": {
			"page": {true, true}, "blog": {true, true}, "image": {true, true}, "category": {true, true},
		},
		"vendor": {
			"product": {true, true}, "order": {true, false}, "seller": {true, false}, "image": {true, true},
		},
	}

	for roleSlug, modMap := range matrix {
		for modKey, rw := range modMap {
			_, err := pool.Exec(ctx, `
				INSERT INTO role_permissions (role_id, permission_id, can_read, can_write)
				SELECT r.id, p.id, $3, $4
				FROM roles r, permissions p
				WHERE r.slug = $1 AND p.module_key = $2
				ON CONFLICT (role_id, permission_id) DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write
			`, roleSlug, modKey, rw[0], rw[1])
			if err != nil {
				logger.Error("seed role_permission", "role", roleSlug, "perm", modKey, "error", err)
				os.Exit(1)
			}
		}
	}

	// Super Admin gets read+write across all permissions
	_, _ = pool.Exec(ctx, `
		INSERT INTO role_permissions (role_id, permission_id, can_read, can_write)
		SELECT r.id, p.id, TRUE, TRUE
		FROM roles r CROSS JOIN permissions p
		WHERE r.slug = 'super_admin'
		ON CONFLICT (role_id, permission_id) DO NOTHING
	`)

	passHash, err := service.HashSecret(cfg.SeedAdminPassword)
	if err != nil {
		logger.Error("hash password", "error", err)
		os.Exit(1)
	}
	codeHash, err := service.HashSecret(cfg.SeedAdminAccessCode)
	if err != nil {
		logger.Error("hash access code", "error", err)
		os.Exit(1)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO admin_users (username, email, full_name, password_hash, access_code_hash, role_id, is_superuser, is_active)
		SELECT $1, $2, 'Super Admin', $3, $4, r.id, TRUE, TRUE
		FROM roles r WHERE r.slug = 'super_admin'
		ON CONFLICT (username) DO NOTHING
	`, cfg.SeedAdminUsername, cfg.SeedAdminEmail, passHash, codeHash)
	if err != nil {
		logger.Error("seed superadmin", "error", err)
		os.Exit(1)
	}

	seedGiftlayaCatalog(ctx, pool, logger)
	logger.Info("seed completed successfully", "superadmin", cfg.SeedAdminUsername)
}

