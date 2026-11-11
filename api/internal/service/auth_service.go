package service

import (
	"context"
	"net/netip"
	"strings"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/notify"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
)

const (
	loginRateLimitAttempts = 10
	loginRateLimitWindow   = 15 * time.Minute
)

type AuthService struct {
	repo       domain.AuthRepository
	limiter    domain.RateLimiter
	audit      *AuditService
	tokens     *TokenManager
	notifier   notify.Notifier
	refreshTTL time.Duration
	totpEncKey string
	totpIssuer string
}

func NewAuthService(
	repo domain.AuthRepository,
	limiter domain.RateLimiter,
	audit *AuditService,
	tokens *TokenManager,
	notifier notify.Notifier,
	refreshTTL time.Duration,
	totpEncKey string,
	totpIssuer string,
) *AuthService {
	return &AuthService{
		repo:       repo,
		limiter:    limiter,
		audit:      audit,
		tokens:     tokens,
		notifier:   notifier,
		refreshTTL: refreshTTL,
		totpEncKey: totpEncKey,
		totpIssuer: totpIssuer,
	}
}

type LoginResponse struct {
	User   domain.AdminProfile `json:"user"`
	Tokens domain.TokenPair    `json:"tokens"`
}

func (s *AuthService) Login(ctx context.Context, username, password, code, ipStr, ua, reqID string) (*LoginResponse, error) {
	username = strings.TrimSpace(username)
	rlKey := "rl:admin_login:" + ipStr + ":" + strings.ToLower(username)

	if s.limiter != nil {
		allowed, _, _, err := s.limiter.Allow(ctx, rlKey, loginRateLimitAttempts, loginRateLimitWindow)
		if err == nil && !allowed {
			return nil, domain.ErrRateLimited
		}
	}

	userRec, err := s.repo.GetAdminByUsername(ctx, username)
	if err != nil {
		return nil, domain.ErrInvalidCredential
	}
	if !userRec.Profile.IsActive {
		return nil, domain.ErrInactiveUser
	}
	if !VerifySecret(password, userRec.PasswordHash) {
		return nil, domain.ErrInvalidCredential
	}

	if !s.verifySecondFactor(userRec, code) {
		return nil, domain.ErrInvalidCredential
	}

	if s.limiter != nil {
		_ = s.limiter.Reset(ctx, rlKey)
	}
	_ = s.repo.UpdateAdminLastLogin(ctx, userRec.Profile.ID)

	tokens, err := s.issuePairAndPersist(ctx, userRec.Profile, uuid.New(), ipStr, ua)
	if err != nil {
		return nil, err
	}

	s.audit.Record(ctx, &userRec.Profile.ID, userRec.Profile.Username, "auth", "login", "admin_user", userRec.Profile.ID, reqID, ipStr, nil, map[string]any{
		"username": userRec.Profile.Username,
	})

	return &LoginResponse{
		User:   userRec.Profile,
		Tokens: *tokens,
	}, nil
}

func (s *AuthService) verifySecondFactor(user *domain.AdminUserSecret, code string) bool {
	code = strings.TrimSpace(code)
	if user.Profile.TOTPEnabled && user.TOTPSecretEnc != "" {
		secret, err := DecryptString(user.TOTPSecretEnc, s.totpEncKey)
		if err != nil {
			return false
		}
		if totp.Validate(code, secret) {
			return true
		}
		if user.AccessCodeHash != "" {
			return VerifySecret(code, user.AccessCodeHash)
		}
		return false
	}
	if user.AccessCodeHash == "" {
		return true
	}
	return VerifySecret(code, user.AccessCodeHash)
}

func (s *AuthService) Refresh(ctx context.Context, rawRefresh, ipStr, ua string) (*LoginResponse, error) {
	if strings.TrimSpace(rawRefresh) == "" {
		return nil, domain.ErrUnauthorized
	}
	hash := HashOpaqueToken(rawRefresh)
	existing, err := s.repo.GetRefreshTokenByHash(ctx, hash)
	if err != nil {
		return nil, domain.ErrUnauthorized
	}

	// Reuse detection: if an already rotated/revoked token is replayed, revoke whole token family
	if existing.RevokedAt != nil {
		_ = s.repo.RevokeRefreshTokenFamily(ctx, existing.FamilyID)
		return nil, domain.ErrUnauthorized
	}
	if time.Now().After(existing.ExpiresAt) {
		return nil, domain.ErrUnauthorized
	}

	userRec, err := s.repo.GetAdminByID(ctx, existing.AdminUserID)
	if err != nil || !userRec.Profile.IsActive {
		return nil, domain.ErrUnauthorized
	}

	rawNext, hashNext, err := GenerateOpaqueToken()
	if err != nil {
		return nil, err
	}
	parsedIP := parseNetIP(ipStr)
	created, err := s.repo.CreateRefreshToken(ctx, userRec.Profile.ID, hashNext, existing.FamilyID, time.Now().Add(s.refreshTTL), parsedIP, ua)
	if err != nil {
		return nil, err
	}
	if err := s.repo.RevokeRefreshToken(ctx, existing.ID, &created.ID); err != nil {
		return nil, err
	}

	access, expSec, err := s.tokens.IssueAccessToken(userRec.Profile)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		User: userRec.Profile,
		Tokens: domain.TokenPair{
			AccessToken:  access,
			RefreshToken: rawNext,
			ExpiresInSec: expSec,
			TokenType:    "Bearer",
		},
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, rawRefresh string, userID *int64, username, reqID, ipStr string) error {
	if strings.TrimSpace(rawRefresh) != "" {
		rec, err := s.repo.GetRefreshTokenByHash(ctx, HashOpaqueToken(rawRefresh))
		if err == nil && rec.RevokedAt == nil {
			_ = s.repo.RevokeRefreshToken(ctx, rec.ID, nil)
		}
	}
	if userID != nil {
		s.audit.Record(ctx, userID, username, "auth", "logout", "admin_user", *userID, reqID, ipStr, nil, nil)
	}
	return nil
}

func (s *AuthService) GetMe(ctx context.Context, userID int64) (*domain.AdminProfile, error) {
	rec, err := s.repo.GetAdminByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !rec.Profile.IsActive {
		return nil, domain.ErrInactiveUser
	}
	return &rec.Profile, nil
}

func (s *AuthService) ChangePassword(ctx context.Context, userID int64, currentPass, newPass, reqID, ipStr string) error {
	rec, err := s.repo.GetAdminByID(ctx, userID)
	if err != nil {
		return err
	}
	if !VerifySecret(currentPass, rec.PasswordHash) {
		return domain.ErrInvalidCredential
	}
	hash, err := HashSecret(newPass)
	if err != nil {
		return err
	}
	if err := s.repo.UpdateAdminPassword(ctx, userID, hash); err != nil {
		return err
	}
	s.audit.Record(ctx, &userID, rec.Profile.Username, "auth", "change_password", "admin_user", userID, reqID, ipStr, nil, nil)
	return nil
}

func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	rec, err := s.repo.GetAdminByEmail(ctx, strings.TrimSpace(email))
	if err != nil {
		// Prevent user enumeration
		return nil
	}
	raw, hash, err := GenerateOpaqueToken()
	if err != nil {
		return err
	}
	if err := s.repo.CreatePasswordResetToken(ctx, rec.Profile.ID, hash, time.Now().Add(30*time.Minute)); err != nil {
		return err
	}
	if s.notifier != nil {
		_ = s.notifier.Send(ctx, notify.Message{
			Channel: "email",
			To:      rec.Profile.Email,
			Subject: "Giftlaya CMS Password Reset",
			Body:    "Reset token: " + raw,
		})
	}
	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, rawToken, newPass string) error {
	rec, err := s.repo.GetValidPasswordResetToken(ctx, HashOpaqueToken(strings.TrimSpace(rawToken)))
	if err != nil {
		return domain.ErrInvalidCredential
	}
	hash, err := HashSecret(newPass)
	if err != nil {
		return err
	}
	if err := s.repo.UpdateAdminPassword(ctx, rec.UserID, hash); err != nil {
		return err
	}
	return s.repo.MarkPasswordResetUsed(ctx, rec.ID)
}

type TOTPSetupResponse struct {
	Secret     string `json:"secret"`
	OTPAuthURL string `json:"otpauth_url"`
}

func (s *AuthService) SetupTOTP(ctx context.Context, userID int64) (*TOTPSetupResponse, error) {
	rec, err := s.repo.GetAdminByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      s.totpIssuer,
		AccountName: rec.Profile.Username,
	})
	if err != nil {
		return nil, err
	}
	enc, err := EncryptString(key.Secret(), s.totpEncKey)
	if err != nil {
		return nil, err
	}
	if err := s.repo.SetAdminTOTPSecret(ctx, userID, enc); err != nil {
		return nil, err
	}
	return &TOTPSetupResponse{
		Secret:     key.Secret(),
		OTPAuthURL: key.URL(),
	}, nil
}

func (s *AuthService) EnableTOTP(ctx context.Context, userID int64, code, reqID, ipStr string) error {
	rec, err := s.repo.GetAdminByID(ctx, userID)
	if err != nil {
		return err
	}
	if rec.TOTPSecretEnc == "" {
		return domain.ErrInvalidCredential
	}
	secret, err := DecryptString(rec.TOTPSecretEnc, s.totpEncKey)
	if err != nil || !totp.Validate(strings.TrimSpace(code), secret) {
		return domain.ErrInvalidCredential
	}
	if err := s.repo.EnableAdminTOTP(ctx, userID); err != nil {
		return err
	}
	s.audit.Record(ctx, &userID, rec.Profile.Username, "auth", "totp_enabled", "admin_user", userID, reqID, ipStr, nil, nil)
	return nil
}

func (s *AuthService) issuePairAndPersist(ctx context.Context, profile domain.AdminProfile, familyID uuid.UUID, ipStr, ua string) (*domain.TokenPair, error) {
	access, expSec, err := s.tokens.IssueAccessToken(profile)
	if err != nil {
		return nil, err
	}
	rawRefresh, hashRefresh, err := GenerateOpaqueToken()
	if err != nil {
		return nil, err
	}
	if _, err := s.repo.CreateRefreshToken(ctx, profile.ID, hashRefresh, familyID, time.Now().Add(s.refreshTTL), parseNetIP(ipStr), ua); err != nil {
		return nil, err
	}
	return &domain.TokenPair{
		AccessToken:  access,
		RefreshToken: rawRefresh,
		ExpiresInSec: expSec,
		TokenType:    "Bearer",
	}, nil
}

func parseNetIP(raw string) *netip.Addr {
	if raw == "" {
		return nil
	}
	if addr, err := netip.ParseAddr(raw); err == nil {
		return &addr
	}
	return nil
}

