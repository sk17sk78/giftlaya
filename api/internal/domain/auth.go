package domain

import (
	"context"
	"encoding/json"
	"errors"
	"net/netip"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotFound          = errors.New("resource not found")
	ErrInvalidCredential = errors.New("invalid username, password, or access code")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrForbidden         = errors.New("forbidden")
	ErrRateLimited       = errors.New("too many attempts, please try again later")
	ErrConflict          = errors.New("resource already exists")
	ErrInactiveUser      = errors.New("account is disabled")
)

type PermissionAccess struct {
	Read  bool `json:"read"`
	Write bool `json:"write"`
}

type Permission struct {
	ID          int64  `json:"id"`
	ModuleKey   string `json:"module_key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type Role struct {
	ID          int64     `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsSystem    bool      `json:"is_system"`
	CreatedAt   time.Time `json:"created_at"`
}

type AdminProfile struct {
	ID          int64                       `json:"id"`
	Username    string                      `json:"username"`
	Email       string                      `json:"email"`
	FullName    string                      `json:"full_name"`
	RoleID      int64                       `json:"role_id"`
	RoleSlug    string                      `json:"role_slug"`
	RoleName    string                      `json:"role_name"`
	SellerID    *int64                      `json:"seller_id,omitempty"`
	Superuser   bool                        `json:"superuser"`
	TOTPEnabled bool                        `json:"totp_enabled"`
	IsActive    bool                        `json:"is_active"`
	Roles       map[string]PermissionAccess `json:"roles"`
	LastLoginAt *time.Time                  `json:"last_login_at,omitempty"`
	CreatedAt   time.Time                   `json:"created_at"`
}

type AdminUserSecret struct {
	Profile        AdminProfile
	PasswordHash   string
	AccessCodeHash string
	TOTPSecretEnc  string
}

type RefreshTokenRecord struct {
	ID           int64
	AdminUserID  int64
	TokenHash    string
	FamilyID     uuid.UUID
	ReplacedByID *int64
	RevokedAt    *time.Time
	ExpiresAt    time.Time
}

type PasswordResetRecord struct {
	ID        int64
	UserID    int64
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresInSec int64  `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type SidebarCounts struct {
	Orders struct {
		Total      int `json:"total"`
		New        int `json:"new"`
		Processing int `json:"processing"`
		Delivered  int `json:"delivered"`
		Failed     int `json:"failed"`
		Cancelled  int `json:"cancelled"`
	} `json:"orders"`
	Customers      int `json:"customers"`
	Contact        struct {
		New   int `json:"new"`
		Total int `json:"total"`
	} `json:"contact"`
	ProductInquiry struct {
		New   int `json:"new"`
		Total int `json:"total"`
	} `json:"productInquiry"`
	Whatsapp int `json:"whatsapp"`
	Support  struct {
		Open  int `json:"open"`
		Total int `json:"total"`
	} `json:"support"`
	Sellers struct {
		Requests int `json:"requests"`
		Products int `json:"products"`
		Payouts  int `json:"payouts"`
		Tickets  int `json:"tickets"`
	} `json:"sellers"`
}

type AuditEntry struct {
	ID            int64           `json:"id"`
	ActorType     string          `json:"actor_type"`
	ActorID       *int64          `json:"actor_id,omitempty"`
	ActorUsername string          `json:"actor_username"`
	Module        string          `json:"module"`
	Action        string          `json:"action"`
	EntityType    string          `json:"entity_type"`
	EntityID      string          `json:"entity_id"`
	RequestID     string          `json:"request_id"`
	IPAddress     string          `json:"ip_address"`
	BeforeJSON    json.RawMessage `json:"before_json,omitempty"`
	AfterJSON     json.RawMessage `json:"after_json,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

type AuthRepository interface {
	GetAdminByUsername(ctx context.Context, username string) (*AdminUserSecret, error)
	GetAdminByEmail(ctx context.Context, email string) (*AdminUserSecret, error)
	GetAdminByID(ctx context.Context, id int64) (*AdminUserSecret, error)
	GetRolePermissions(ctx context.Context, roleID int64) (map[string]PermissionAccess, error)
	CreateRefreshToken(ctx context.Context, adminUserID int64, tokenHash string, familyID uuid.UUID, expiresAt time.Time, ip *netip.Addr, ua string) (*RefreshTokenRecord, error)
	GetRefreshTokenByHash(ctx context.Context, tokenHash string) (*RefreshTokenRecord, error)
	RevokeRefreshToken(ctx context.Context, id int64, replacedByID *int64) error
	RevokeRefreshTokenFamily(ctx context.Context, familyID uuid.UUID) error
	UpdateAdminLastLogin(ctx context.Context, id int64) error
	UpdateAdminPassword(ctx context.Context, id int64, hash string) error
	SetAdminTOTPSecret(ctx context.Context, id int64, encryptedSecret string) error
	EnableAdminTOTP(ctx context.Context, id int64) error
	CreatePasswordResetToken(ctx context.Context, adminUserID int64, tokenHash string, expiresAt time.Time) error
	GetValidPasswordResetToken(ctx context.Context, tokenHash string) (*PasswordResetRecord, error)
	MarkPasswordResetUsed(ctx context.Context, id int64) error
}

type RBACRepository interface {
	ListRoles(ctx context.Context) ([]Role, error)
	ListPermissions(ctx context.Context) ([]Permission, error)
	GetRolePermissions(ctx context.Context, roleID int64) (map[string]PermissionAccess, error)
	UpsertRolePermission(ctx context.Context, roleID, permissionID int64, canRead, canWrite bool) error
	ListAdminUsers(ctx context.Context, search string, limit, offset int) ([]AdminProfile, int64, error)
	CreateAdminUser(ctx context.Context, username, email, fullName, passwordHash, accessCodeHash string, roleID int64, sellerID *int64, isSuperuser, isActive bool) (*AdminProfile, error)
	UpdateAdminUser(ctx context.Context, id int64, email, fullName string, roleID int64, sellerID *int64, isSuperuser, isActive bool) (*AdminProfile, error)
	SoftDeleteAdminUser(ctx context.Context, id int64) error
	GetSidebarCounts(ctx context.Context) (*SidebarCounts, error)
}

type AuditRepository interface {
	CreateAuditLog(ctx context.Context, entry AuditEntry) error
	ListAuditLogs(ctx context.Context, module string, actorID *int64, limit, offset int) ([]AuditEntry, int64, error)
}

type RateLimiter interface {
	Allow(ctx context.Context, key string, limit int, window time.Duration) (allowed bool, remaining int, retryAfter time.Duration, err error)
	Reset(ctx context.Context, key string) error
}

