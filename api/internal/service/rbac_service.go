package service

import (
	"context"

	"github.com/giftlaya/giftlaya-api/internal/domain"
)

type RBACService struct {
	repo  domain.RBACRepository
	audit *AuditService
}

func NewRBACService(repo domain.RBACRepository, audit *AuditService) *RBACService {
	return &RBACService{repo: repo, audit: audit}
}

func HasPermission(profile *domain.AdminProfile, moduleKey string, write bool) bool {
	if profile == nil || !profile.IsActive {
		return false
	}
	if profile.Superuser {
		return true
	}
	if moduleKey == "superuser" {
		return false
	}
	access, ok := profile.Roles[moduleKey]
	if !ok {
		return false
	}
	if write {
		return access.Write
	}
	return access.Read
}

type RoleWithPermissions struct {
	domain.Role
	Permissions map[string]domain.PermissionAccess `json:"permissions"`
}

func (s *RBACService) ListRoles(ctx context.Context) ([]RoleWithPermissions, error) {
	roles, err := s.repo.ListRoles(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]RoleWithPermissions, 0, len(roles))
	for _, r := range roles {
		perms, err := s.repo.GetRolePermissions(ctx, r.ID)
		if err != nil {
			return nil, err
		}
		out = append(out, RoleWithPermissions{
			Role:        r,
			Permissions: perms,
		})
	}
	return out, nil
}

func (s *RBACService) ListPermissions(ctx context.Context) ([]domain.Permission, error) {
	return s.repo.ListPermissions(ctx)
}

type RolePermissionInput struct {
	PermissionID int64 `json:"permission_id" validate:"required"`
	CanRead      bool  `json:"can_read"`
	CanWrite     bool  `json:"can_write"`
}

func (s *RBACService) UpdateRolePermissions(ctx context.Context, actor *domain.AdminProfile, roleID int64, items []RolePermissionInput, reqID, ip string) error {
	before, _ := s.repo.GetRolePermissions(ctx, roleID)
	for _, it := range items {
		read := it.CanRead || it.CanWrite
		if err := s.repo.UpsertRolePermission(ctx, roleID, it.PermissionID, read, it.CanWrite); err != nil {
			return err
		}
	}
	after, _ := s.repo.GetRolePermissions(ctx, roleID)
	s.audit.Record(ctx, &actor.ID, actor.Username, "superuser", "update_role_permissions", "role", roleID, reqID, ip, before, after)
	return nil
}

func (s *RBACService) ListUsers(ctx context.Context, search string, page, limit int) ([]domain.AdminProfile, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	return s.repo.ListAdminUsers(ctx, search, limit, offset)
}

type CreateUserInput struct {
	Username    string `json:"username" validate:"required,min=3,max=80"`
	Email       string `json:"email" validate:"required,email"`
	FullName    string `json:"full_name" validate:"required"`
	Password    string `json:"password" validate:"required,min=8"`
	AccessCode  string `json:"access_code" validate:"required,min=4,max=20"`
	RoleID      int64  `json:"role_id" validate:"required"`
	SellerID    *int64 `json:"seller_id"`
	IsSuperuser bool   `json:"is_superuser"`
	IsActive    bool   `json:"is_active"`
}

func (s *RBACService) CreateUser(ctx context.Context, actor *domain.AdminProfile, in CreateUserInput, reqID, ip string) (*domain.AdminProfile, error) {
	passHash, err := HashSecret(in.Password)
	if err != nil {
		return nil, err
	}
	codeHash, err := HashSecret(in.AccessCode)
	if err != nil {
		return nil, err
	}
	created, err := s.repo.CreateAdminUser(ctx, in.Username, in.Email, in.FullName, passHash, codeHash, in.RoleID, in.SellerID, in.IsSuperuser, in.IsActive)
	if err != nil {
		return nil, err
	}
	s.audit.Record(ctx, &actor.ID, actor.Username, "superuser", "create_admin_user", "admin_user", created.ID, reqID, ip, nil, created)
	return created, nil
}

type UpdateUserInput struct {
	Email       string `json:"email" validate:"required,email"`
	FullName    string `json:"full_name" validate:"required"`
	RoleID      int64  `json:"role_id" validate:"required"`
	SellerID    *int64 `json:"seller_id"`
	IsSuperuser bool   `json:"is_superuser"`
	IsActive    bool   `json:"is_active"`
}

func (s *RBACService) UpdateUser(ctx context.Context, actor *domain.AdminProfile, id int64, in UpdateUserInput, reqID, ip string) (*domain.AdminProfile, error) {
	updated, err := s.repo.UpdateAdminUser(ctx, id, in.Email, in.FullName, in.RoleID, in.SellerID, in.IsSuperuser, in.IsActive)
	if err != nil {
		return nil, err
	}
	s.audit.Record(ctx, &actor.ID, actor.Username, "superuser", "update_admin_user", "admin_user", id, reqID, ip, nil, updated)
	return updated, nil
}

func (s *RBACService) DeleteUser(ctx context.Context, actor *domain.AdminProfile, id int64, reqID, ip string) error {
	if err := s.repo.SoftDeleteAdminUser(ctx, id); err != nil {
		return err
	}
	s.audit.Record(ctx, &actor.ID, actor.Username, "superuser", "delete_admin_user", "admin_user", id, reqID, ip, nil, nil)
	return nil
}

func (s *RBACService) GetSidebarCounts(ctx context.Context) (*domain.SidebarCounts, error) {
	return s.repo.GetSidebarCounts(ctx)
}

