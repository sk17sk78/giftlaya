package server_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"testing"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/config"
	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/handler/public"
	"github.com/giftlaya/giftlaya-api/internal/notify"
	"github.com/giftlaya/giftlaya-api/internal/repository"
	"github.com/giftlaya/giftlaya-api/internal/server"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/google/uuid"
)

type stubFullRepo struct {
	users  map[int64]*domain.AdminUserSecret
	byName map[string]*domain.AdminUserSecret
	tokens map[string]*domain.RefreshTokenRecord
	audits []domain.AuditEntry
	nextID int64
}

func newStubRepo() *stubFullRepo {
	r := &stubFullRepo{
		users:  make(map[int64]*domain.AdminUserSecret),
		byName: make(map[string]*domain.AdminUserSecret),
		tokens: make(map[string]*domain.RefreshTokenRecord),
		nextID: 10,
	}
	pHash, _ := service.HashSecret("SecretPass#123")
	cHash, _ := service.HashSecret("654321")

	super := &domain.AdminUserSecret{
		Profile: domain.AdminProfile{
			ID:        1,
			Username:  "superadmin",
			Email:     "super@giftlaya.com",
			FullName:  "Super Admin",
			RoleID:    1,
			RoleSlug:  "super_admin",
			RoleName:  "Super Admin",
			Superuser: true,
			IsActive:  true,
			Roles:     map[string]domain.PermissionAccess{"product": {Read: true, Write: true}},
		},
		PasswordHash:   pHash,
		AccessCodeHash: cHash,
	}
	catalog := &domain.AdminUserSecret{
		Profile: domain.AdminProfile{
			ID:        2,
			Username:  "catalog_mgr",
			Email:     "catalog@giftlaya.com",
			FullName:  "Catalog Manager",
			RoleID:    2,
			RoleSlug:  "catalog_manager",
			RoleName:  "Catalog Manager",
			Superuser: false,
			IsActive:  true,
			Roles: map[string]domain.PermissionAccess{
				"product": {Read: true, Write: true},
				"order":   {Read: false, Write: false},
			},
		},
		PasswordHash:   pHash,
		AccessCodeHash: cHash,
	}
	r.users[1] = super
	r.byName["superadmin"] = super
	r.users[2] = catalog
	r.byName["catalog_mgr"] = catalog
	return r
}

func (s *stubFullRepo) GetAdminByUsername(_ context.Context, u string) (*domain.AdminUserSecret, error) {
	if v, ok := s.byName[u]; ok {
		return v, nil
	}
	return nil, domain.ErrNotFound
}
func (s *stubFullRepo) GetAdminByEmail(_ context.Context, _ string) (*domain.AdminUserSecret, error) {
	return nil, domain.ErrNotFound
}
func (s *stubFullRepo) GetAdminByID(_ context.Context, id int64) (*domain.AdminUserSecret, error) {
	if v, ok := s.users[id]; ok {
		return v, nil
	}
	return nil, domain.ErrNotFound
}
func (s *stubFullRepo) GetRolePermissions(_ context.Context, _ int64) (map[string]domain.PermissionAccess, error) {
	return map[string]domain.PermissionAccess{}, nil
}
func (s *stubFullRepo) CreateRefreshToken(_ context.Context, uid int64, hash string, fid uuid.UUID, exp time.Time, _ *netip.Addr, _ string) (*domain.RefreshTokenRecord, error) {
	s.nextID++
	rec := &domain.RefreshTokenRecord{ID: s.nextID, AdminUserID: uid, TokenHash: hash, FamilyID: fid, ExpiresAt: exp}
	s.tokens[hash] = rec
	return rec, nil
}
func (s *stubFullRepo) GetRefreshTokenByHash(_ context.Context, h string) (*domain.RefreshTokenRecord, error) {
	if r, ok := s.tokens[h]; ok {
		return r, nil
	}
	return nil, domain.ErrNotFound
}
func (s *stubFullRepo) RevokeRefreshToken(_ context.Context, _ int64, _ *int64) error { return nil }
func (s *stubFullRepo) RevokeRefreshTokenFamily(_ context.Context, _ uuid.UUID) error { return nil }
func (s *stubFullRepo) UpdateAdminLastLogin(_ context.Context, _ int64) error         { return nil }
func (s *stubFullRepo) UpdateAdminPassword(_ context.Context, _ int64, _ string) error {
	return nil
}
func (s *stubFullRepo) SetAdminTOTPSecret(_ context.Context, _ int64, _ string) error { return nil }
func (s *stubFullRepo) EnableAdminTOTP(_ context.Context, _ int64) error              { return nil }
func (s *stubFullRepo) CreatePasswordResetToken(_ context.Context, _ int64, _ string, _ time.Time) error {
	return nil
}
func (s *stubFullRepo) GetValidPasswordResetToken(_ context.Context, _ string) (*domain.PasswordResetRecord, error) {
	return nil, domain.ErrNotFound
}
func (s *stubFullRepo) MarkPasswordResetUsed(_ context.Context, _ int64) error { return nil }
func (s *stubFullRepo) ListRoles(_ context.Context) ([]domain.Role, error) {
	return []domain.Role{{ID: 1, Slug: "super_admin", Name: "Super Admin"}}, nil
}
func (s *stubFullRepo) ListPermissions(_ context.Context) ([]domain.Permission, error) {
	return []domain.Permission{{ID: 1, ModuleKey: "product", Label: "Products"}}, nil
}
func (s *stubFullRepo) UpsertRolePermission(_ context.Context, _, _ int64, _, _ bool) error {
	return nil
}
func (s *stubFullRepo) ListAdminUsers(_ context.Context, _ string, _, _ int) ([]domain.AdminProfile, int64, error) {
	return []domain.AdminProfile{s.users[1].Profile, s.users[2].Profile}, 2, nil
}
func (s *stubFullRepo) CreateAdminUser(_ context.Context, username, email, fullName, _, _ string, roleID int64, sellerID *int64, isSuperuser, isActive bool) (*domain.AdminProfile, error) {
	s.nextID++
	return &domain.AdminProfile{ID: s.nextID, Username: username, Email: email, FullName: fullName, RoleID: roleID, SellerID: sellerID, Superuser: isSuperuser, IsActive: isActive}, nil
}
func (s *stubFullRepo) UpdateAdminUser(_ context.Context, id int64, email, fullName string, roleID int64, sellerID *int64, isSuperuser, isActive bool) (*domain.AdminProfile, error) {
	return &domain.AdminProfile{ID: id, Username: "updated", Email: email, FullName: fullName, RoleID: roleID, SellerID: sellerID, Superuser: isSuperuser, IsActive: isActive}, nil
}
func (s *stubFullRepo) SoftDeleteAdminUser(_ context.Context, _ int64) error { return nil }
func (s *stubFullRepo) GetSidebarCounts(_ context.Context) (*domain.SidebarCounts, error) {
	return &domain.SidebarCounts{}, nil
}
func (s *stubFullRepo) CreateAuditLog(_ context.Context, e domain.AuditEntry) error {
	s.audits = append(s.audits, e)
	return nil
}
func (s *stubFullRepo) ListAuditLogs(_ context.Context, _ string, _ *int64, _, _ int) ([]domain.AuditEntry, int64, error) {
	return s.audits, int64(len(s.audits)), nil
}

func TestRouterAuthAndRBACFlow(t *testing.T) {
	repo := newStubRepo()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	limiter := repository.NewRedisRateLimiter(nil)
	tokens := service.NewTokenManager("integration-test-secret-32-chars!!", 15*time.Minute)
	auditSvc := service.NewAuditService(repo, logger)
	authSvc := service.NewAuthService(repo, limiter, auditSvc, tokens, notify.NewLogNotifier(logger), 24*time.Hour, "totp-key-32", "Giftlaya CMS")
	rbacSvc := service.NewRBACService(repo, auditSvc)

	router := server.NewRouter(server.Dependencies{
		Config: &config.Config{
			AppName:            "giftlaya-api-test",
			AppEnv:             "test",
			CORSAllowedOrigins: []string{"http://localhost:5173"},
		},
		Logger:        logger,
		RateLimiter:   limiter,
		TokenManager:  tokens,
		AuthService:   authSvc,
		RBACService:   rbacSvc,
		AuditService:  auditSvc,
		HealthHandler: public.NewHealthHandler(nil, nil),
	})

	// 1. Health check public route
	reqHealth := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recHealth := httptest.NewRecorder()
	router.ServeHTTP(recHealth, reqHealth)
	if recHealth.Code != http.StatusOK {
		t.Fatalf("expected 200 /healthz, got %d", recHealth.Code)
	}

	// 2. Unauthenticated /auth/me must return 401
	reqUnauth := httptest.NewRequest(http.MethodGet, "/api/v1/admin/auth/me", nil)
	recUnauth := httptest.NewRecorder()
	router.ServeHTTP(recUnauth, reqUnauth)
	if recUnauth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 unauth /me, got %d", recUnauth.Code)
	}

	loginAndGetToken := func(username string) string {
		body, _ := json.Marshal(map[string]string{
			"username": username,
			"password": "SecretPass#123",
			"code":     "654321",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/auth/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("login failed for %s: %d %s", username, rec.Code, rec.Body.String())
		}
		var out service.LoginResponse
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return out.Tokens.AccessToken
	}

	// 3. Catalog Manager tries superuser-only /api/v1/admin/users -> must get 403 Forbidden
	catToken := loginAndGetToken("catalog_mgr")
	reqCatUsers := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users", nil)
	reqCatUsers.Header.Set("Authorization", "Bearer "+catToken)
	recCatUsers := httptest.NewRecorder()
	router.ServeHTTP(recCatUsers, reqCatUsers)
	if recCatUsers.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for catalog_mgr on /users, got %d", recCatUsers.Code)
	}

	// 4. Super Admin accesses /api/v1/admin/users and /dashboard/sidebar-counts -> 200 OK
	superToken := loginAndGetToken("superadmin")
	reqSuperUsers := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users", nil)
	reqSuperUsers.Header.Set("Authorization", "Bearer "+superToken)
	recSuperUsers := httptest.NewRecorder()
	router.ServeHTTP(recSuperUsers, reqSuperUsers)
	if recSuperUsers.Code != http.StatusOK {
		t.Fatalf("expected 200 for superadmin on /users, got %d", recSuperUsers.Code)
	}

	reqCounts := httptest.NewRequest(http.MethodGet, "/api/v1/admin/dashboard/sidebar-counts", nil)
	reqCounts.Header.Set("Authorization", "Bearer "+superToken)
	recCounts := httptest.NewRecorder()
	router.ServeHTTP(recCounts, reqCounts)
	if recCounts.Code != http.StatusOK {
		t.Fatalf("expected 200 sidebar-counts, got %d", recCounts.Code)
	}
}

