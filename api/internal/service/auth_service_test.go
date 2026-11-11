package service_test

import (
	"context"
	"io"
	"log/slog"
	"net/netip"
	"testing"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/notify"
	"github.com/giftlaya/giftlaya-api/internal/repository"
	"github.com/giftlaya/giftlaya-api/internal/service"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
)

type memAuthRepo struct {
	users   map[string]*domain.AdminUserSecret
	byID    map[int64]*domain.AdminUserSecret
	tokens  map[string]*domain.RefreshTokenRecord
	audits  []domain.AuditEntry
	nextTID int64
}

func newMemAuthRepo() *memAuthRepo {
	return &memAuthRepo{
		users:  make(map[string]*domain.AdminUserSecret),
		byID:   make(map[int64]*domain.AdminUserSecret),
		tokens: make(map[string]*domain.RefreshTokenRecord),
	}
}

func (m *memAuthRepo) seedUser(u *domain.AdminUserSecret) {
	m.users[u.Profile.Username] = u
	m.byID[u.Profile.ID] = u
}

func (m *memAuthRepo) GetAdminByUsername(_ context.Context, username string) (*domain.AdminUserSecret, error) {
	u, ok := m.users[username]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *u
	return &cp, nil
}
func (m *memAuthRepo) GetAdminByEmail(_ context.Context, email string) (*domain.AdminUserSecret, error) {
	for _, u := range m.byID {
		if u.Profile.Email == email {
			cp := *u
			return &cp, nil
		}
	}
	return nil, domain.ErrNotFound
}
func (m *memAuthRepo) GetAdminByID(_ context.Context, id int64) (*domain.AdminUserSecret, error) {
	u, ok := m.byID[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *u
	return &cp, nil
}
func (m *memAuthRepo) GetRolePermissions(_ context.Context, _ int64) (map[string]domain.PermissionAccess, error) {
	return map[string]domain.PermissionAccess{}, nil
}
func (m *memAuthRepo) CreateRefreshToken(_ context.Context, adminUserID int64, tokenHash string, familyID uuid.UUID, expiresAt time.Time, _ *netip.Addr, _ string) (*domain.RefreshTokenRecord, error) {
	m.nextTID++
	rec := &domain.RefreshTokenRecord{
		ID:          m.nextTID,
		AdminUserID: adminUserID,
		TokenHash:   tokenHash,
		FamilyID:    familyID,
		ExpiresAt:   expiresAt,
	}
	m.tokens[tokenHash] = rec
	return rec, nil
}
func (m *memAuthRepo) GetRefreshTokenByHash(_ context.Context, tokenHash string) (*domain.RefreshTokenRecord, error) {
	r, ok := m.tokens[tokenHash]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *r
	return &cp, nil
}
func (m *memAuthRepo) RevokeRefreshToken(_ context.Context, id int64, replacedByID *int64) error {
	now := time.Now()
	for _, r := range m.tokens {
		if r.ID == id {
			r.RevokedAt = &now
			r.ReplacedByID = replacedByID
		}
	}
	return nil
}
func (m *memAuthRepo) RevokeRefreshTokenFamily(_ context.Context, familyID uuid.UUID) error {
	now := time.Now()
	for _, r := range m.tokens {
		if r.FamilyID == familyID && r.RevokedAt == nil {
			r.RevokedAt = &now
		}
	}
	return nil
}
func (m *memAuthRepo) UpdateAdminLastLogin(_ context.Context, _ int64) error { return nil }
func (m *memAuthRepo) UpdateAdminPassword(_ context.Context, id int64, hash string) error {
	m.byID[id].PasswordHash = hash
	return nil
}
func (m *memAuthRepo) SetAdminTOTPSecret(_ context.Context, id int64, enc string) error {
	m.byID[id].TOTPSecretEnc = enc
	m.byID[id].Profile.TOTPEnabled = false
	return nil
}
func (m *memAuthRepo) EnableAdminTOTP(_ context.Context, id int64) error {
	m.byID[id].Profile.TOTPEnabled = true
	return nil
}
func (m *memAuthRepo) CreatePasswordResetToken(_ context.Context, _ int64, _ string, _ time.Time) error {
	return nil
}
func (m *memAuthRepo) GetValidPasswordResetToken(_ context.Context, _ string) (*domain.PasswordResetRecord, error) {
	return nil, domain.ErrNotFound
}
func (m *memAuthRepo) MarkPasswordResetUsed(_ context.Context, _ int64) error { return nil }
func (m *memAuthRepo) CreateAuditLog(_ context.Context, entry domain.AuditEntry) error {
	m.audits = append(m.audits, entry)
	return nil
}
func (m *memAuthRepo) ListAuditLogs(_ context.Context, _ string, _ *int64, _, _ int) ([]domain.AuditEntry, int64, error) {
	return m.audits, int64(len(m.audits)), nil
}

func TestCryptoHashAndEncryption(t *testing.T) {
	hash, err := service.HashSecret("StrongPass@2026")
	if err != nil {
		t.Fatalf("hash error: %v", err)
	}
	if !service.VerifySecret("StrongPass@2026", hash) {
		t.Fatal("expected valid secret verification")
	}
	if service.VerifySecret("wrong", hash) {
		t.Fatal("expected invalid secret failure")
	}

	enc, err := service.EncryptString("JBSWY3DPEHPK3PXP", "32-char-secret-key-for-aes-gcm!")
	if err != nil {
		t.Fatalf("encrypt error: %v", err)
	}
	plain, err := service.DecryptString(enc, "32-char-secret-key-for-aes-gcm!")
	if err != nil || plain != "JBSWY3DPEHPK3PXP" {
		t.Fatalf("decrypt mismatch: %v %q", err, plain)
	}
}

func TestAuthLoginRefreshRotationAndReuseDetection(t *testing.T) {
	ctx := context.Background()
	repo := newMemAuthRepo()
	pHash, _ := service.HashSecret("AdminPass#99")
	cHash, _ := service.HashSecret("918100")

	repo.seedUser(&domain.AdminUserSecret{
		Profile: domain.AdminProfile{
			ID:        1,
			Username:  "superadmin",
			Email:     "admin@giftlaya.com",
			RoleID:    1,
			RoleSlug:  "super_admin",
			Superuser: true,
			IsActive:  true,
		},
		PasswordHash:   pHash,
		AccessCodeHash: cHash,
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	limiter := repository.NewRedisRateLimiter(nil)
	auditSvc := service.NewAuditService(repo, logger)
	tokens := service.NewTokenManager("test-access-secret-key-32-chars!!", 15*time.Minute)
	authSvc := service.NewAuthService(repo, limiter, auditSvc, tokens, notify.NewLogNotifier(logger), 24*time.Hour, "totp-key-32", "Giftlaya CMS")

	// Wrong code should reject
	if _, err := authSvc.Login(ctx, "superadmin", "AdminPass#99", "000000", "127.0.0.1", "ua", "req1"); err == nil {
		t.Fatal("expected wrong access code to fail")
	}

	// Valid login issues tokens + logs audit
	res1, err := authSvc.Login(ctx, "superadmin", "AdminPass#99", "918100", "127.0.0.1", "ua", "req2")
	if err != nil {
		t.Fatalf("expected valid login: %v", err)
	}
	if res1.Tokens.AccessToken == "" || res1.Tokens.RefreshToken == "" {
		t.Fatal("expected non-empty token pair")
	}
	if len(repo.audits) != 1 || repo.audits[0].Action != "login" {
		t.Fatalf("expected login audit log, got %+v", repo.audits)
	}

	// Rotate refresh token
	res2, err := authSvc.Refresh(ctx, res1.Tokens.RefreshToken, "127.0.0.1", "ua")
	if err != nil {
		t.Fatalf("expected valid refresh rotation: %v", err)
	}
	if res2.Tokens.RefreshToken == res1.Tokens.RefreshToken {
		t.Fatal("expected new rotated refresh token")
	}

	// Replay old revoked token -> reuse attack must fail AND revoke the rotated token too!
	if _, err := authSvc.Refresh(ctx, res1.Tokens.RefreshToken, "127.0.0.1", "ua"); err == nil {
		t.Fatal("expected replayed refresh token to fail")
	}
	if _, err := authSvc.Refresh(ctx, res2.Tokens.RefreshToken, "127.0.0.1", "ua"); err == nil {
		t.Fatal("expected entire token family to be revoked after reuse attack")
	}
}

func TestTOTPSetupAndRateLimit(t *testing.T) {
	ctx := context.Background()
	repo := newMemAuthRepo()
	pHash, _ := service.HashSecret("AdminPass#99")
	cHash, _ := service.HashSecret("918100")

	repo.seedUser(&domain.AdminUserSecret{
		Profile: domain.AdminProfile{
			ID:       2,
			Username: "ops",
			Email:    "ops@giftlaya.com",
			RoleID:   2,
			RoleSlug: "order_manager",
			IsActive: true,
		},
		PasswordHash:   pHash,
		AccessCodeHash: cHash,
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	limiter := repository.NewRedisRateLimiter(nil)
	auditSvc := service.NewAuditService(repo, logger)
	tokens := service.NewTokenManager("test-access-secret-key-32-chars!!", 15*time.Minute)
	authSvc := service.NewAuthService(repo, limiter, auditSvc, tokens, notify.NewLogNotifier(logger), 24*time.Hour, "totp-key-32", "Giftlaya CMS")

	setup, err := authSvc.SetupTOTP(ctx, 2)
	if err != nil || setup.Secret == "" {
		t.Fatalf("setup TOTP failed: %v", err)
	}
	code, err := totp.GenerateCode(setup.Secret, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if err := authSvc.EnableTOTP(ctx, 2, code, "req-totp", "127.0.0.1"); err != nil {
		t.Fatalf("enable TOTP failed: %v", err)
	}
	if _, err := authSvc.Login(ctx, "ops", "AdminPass#99", code, "127.0.0.1", "ua", "req-login-totp"); err != nil {
		t.Fatalf("TOTP login failed: %v", err)
	}

	// Rate limit after 10 failures
	for i := 0; i < 10; i++ {
		_, _ = authSvc.Login(ctx, "ops", "bad-pass", "000000", "10.0.0.5", "ua", "rl")
	}
	if _, err := authSvc.Login(ctx, "ops", "AdminPass#99", code, "10.0.0.5", "ua", "rl-over"); err != domain.ErrRateLimited {
		t.Fatalf("expected ErrRateLimited, got %v", err)
	}
}

