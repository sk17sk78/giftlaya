package repository

import (
	"context"
	"errors"
	"fmt"
	"net/netip"
	"time"

	"github.com/giftlaya/giftlaya-api/internal/domain"
	"github.com/giftlaya/giftlaya-api/internal/repository/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepo struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewPostgresRepo(pool *pgxpool.Pool) *PostgresRepo {
	return &PostgresRepo{
		pool: pool,
		q:    sqlc.New(pool),
	}
}

func (r *PostgresRepo) Queries() *sqlc.Queries {
	return r.q
}

func mapErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return domain.ErrConflict
		case "23502", "23503", "23514", "22P02":
			return fmt.Errorf("%w: %s", domain.ErrValidation, pgErr.Message)
		}
	}
	return err
}

func toPgInt8(v *int64) pgtype.Int8 {
	if v == nil {
		return pgtype.Int8{}
	}
	return pgtype.Int8{Int64: *v, Valid: true}
}

func fromPgInt8(v pgtype.Int8) *int64 {
	if !v.Valid {
		return nil
	}
	val := v.Int64
	return &val
}

func fromPgTime(v pgtype.Timestamptz) *time.Time {
	if !v.Valid {
		return nil
	}
	t := v.Time
	return &t
}

func (r *PostgresRepo) GetAdminByUsername(ctx context.Context, username string) (*domain.AdminUserSecret, error) {
	row, err := r.q.GetAdminUserByUsername(ctx, username)
	if err != nil {
		return nil, mapErr(err)
	}
	perms, err := r.GetRolePermissions(ctx, row.RoleID)
	if err != nil {
		return nil, err
	}
	return &domain.AdminUserSecret{
		Profile: domain.AdminProfile{
			ID:          row.ID,
			Username:    row.Username,
			Email:       row.Email,
			FullName:    row.FullName,
			RoleID:      row.RoleID,
			RoleSlug:    row.RoleSlug,
			RoleName:    row.RoleName,
			SellerID:    fromPgInt8(row.SellerID),
			Superuser:   row.IsSuperuser,
			TOTPEnabled: row.TotpEnabled,
			IsActive:    row.IsActive,
			Roles:       perms,
			LastLoginAt: fromPgTime(row.LastLoginAt),
			CreatedAt:   row.CreatedAt.Time,
		},
		PasswordHash:   row.PasswordHash,
		AccessCodeHash: row.AccessCodeHash,
		TOTPSecretEnc:  row.TotpSecretEnc,
	}, nil
}

func (r *PostgresRepo) GetAdminByEmail(ctx context.Context, email string) (*domain.AdminUserSecret, error) {
	row, err := r.q.GetAdminUserByEmail(ctx, email)
	if err != nil {
		return nil, mapErr(err)
	}
	perms, err := r.GetRolePermissions(ctx, row.RoleID)
	if err != nil {
		return nil, err
	}
	return &domain.AdminUserSecret{
		Profile: domain.AdminProfile{
			ID:          row.ID,
			Username:    row.Username,
			Email:       row.Email,
			FullName:    row.FullName,
			RoleID:      row.RoleID,
			RoleSlug:    row.RoleSlug,
			RoleName:    row.RoleName,
			SellerID:    fromPgInt8(row.SellerID),
			Superuser:   row.IsSuperuser,
			TOTPEnabled: row.TotpEnabled,
			IsActive:    row.IsActive,
			Roles:       perms,
			LastLoginAt: fromPgTime(row.LastLoginAt),
			CreatedAt:   row.CreatedAt.Time,
		},
		PasswordHash:   row.PasswordHash,
		AccessCodeHash: row.AccessCodeHash,
		TOTPSecretEnc:  row.TotpSecretEnc,
	}, nil
}

func (r *PostgresRepo) GetAdminByID(ctx context.Context, id int64) (*domain.AdminUserSecret, error) {
	row, err := r.q.GetAdminUserByID(ctx, id)
	if err != nil {
		return nil, mapErr(err)
	}
	perms, err := r.GetRolePermissions(ctx, row.RoleID)
	if err != nil {
		return nil, err
	}
	return &domain.AdminUserSecret{
		Profile: domain.AdminProfile{
			ID:          row.ID,
			Username:    row.Username,
			Email:       row.Email,
			FullName:    row.FullName,
			RoleID:      row.RoleID,
			RoleSlug:    row.RoleSlug,
			RoleName:    row.RoleName,
			SellerID:    fromPgInt8(row.SellerID),
			Superuser:   row.IsSuperuser,
			TOTPEnabled: row.TotpEnabled,
			IsActive:    row.IsActive,
			Roles:       perms,
			LastLoginAt: fromPgTime(row.LastLoginAt),
			CreatedAt:   row.CreatedAt.Time,
		},
		PasswordHash:   row.PasswordHash,
		AccessCodeHash: row.AccessCodeHash,
		TOTPSecretEnc:  row.TotpSecretEnc,
	}, nil
}

func (r *PostgresRepo) GetRolePermissions(ctx context.Context, roleID int64) (map[string]domain.PermissionAccess, error) {
	rows, err := r.q.ListRolePermissionsByRoleID(ctx, roleID)
	if err != nil {
		return nil, mapErr(err)
	}
	out := make(map[string]domain.PermissionAccess, len(rows))
	for _, row := range rows {
		out[row.ModuleKey] = domain.PermissionAccess{
			Read:  row.CanRead.Bool,
			Write: row.CanWrite.Bool,
		}
	}
	return out, nil
}

func (r *PostgresRepo) CreateRefreshToken(ctx context.Context, adminUserID int64, tokenHash string, familyID uuid.UUID, expiresAt time.Time, ip *netip.Addr, ua string) (*domain.RefreshTokenRecord, error) {
	row, err := r.q.CreateRefreshToken(ctx, sqlc.CreateRefreshTokenParams{
		AdminUserID: pgtype.Int8{Int64: adminUserID, Valid: true},
		TokenHash:   tokenHash,
		FamilyID:    pgtype.UUID{Bytes: familyID, Valid: true},
		ExpiresAt:   pgtype.Timestamptz{Time: expiresAt, Valid: true},
		IpAddress:   ip,
		UserAgent:   ua,
	})
	if err != nil {
		return nil, mapErr(err)
	}
	return &domain.RefreshTokenRecord{
		ID:           row.ID,
		AdminUserID:  row.AdminUserID.Int64,
		TokenHash:    row.TokenHash,
		FamilyID:     uuid.UUID(row.FamilyID.Bytes),
		ReplacedByID: fromPgInt8(row.ReplacedByID),
		RevokedAt:    fromPgTime(row.RevokedAt),
		ExpiresAt:    row.ExpiresAt.Time,
	}, nil
}

func (r *PostgresRepo) GetRefreshTokenByHash(ctx context.Context, tokenHash string) (*domain.RefreshTokenRecord, error) {
	row, err := r.q.GetRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		return nil, mapErr(err)
	}
	return &domain.RefreshTokenRecord{
		ID:           row.ID,
		AdminUserID:  row.AdminUserID.Int64,
		TokenHash:    row.TokenHash,
		FamilyID:     uuid.UUID(row.FamilyID.Bytes),
		ReplacedByID: fromPgInt8(row.ReplacedByID),
		RevokedAt:    fromPgTime(row.RevokedAt),
		ExpiresAt:    row.ExpiresAt.Time,
	}, nil
}

func (r *PostgresRepo) RevokeRefreshToken(ctx context.Context, id int64, replacedByID *int64) error {
	return mapErr(r.q.RevokeRefreshToken(ctx, sqlc.RevokeRefreshTokenParams{
		ID:           id,
		ReplacedByID: toPgInt8(replacedByID),
	}))
}

func (r *PostgresRepo) RevokeRefreshTokenFamily(ctx context.Context, familyID uuid.UUID) error {
	return mapErr(r.q.RevokeRefreshTokenFamily(ctx, pgtype.UUID{Bytes: familyID, Valid: true}))
}

func (r *PostgresRepo) UpdateAdminLastLogin(ctx context.Context, id int64) error {
	return mapErr(r.q.UpdateAdminLastLogin(ctx, id))
}

func (r *PostgresRepo) UpdateAdminPassword(ctx context.Context, id int64, hash string) error {
	return mapErr(r.q.UpdateAdminPassword(ctx, sqlc.UpdateAdminPasswordParams{
		ID:           id,
		PasswordHash: hash,
	}))
}

func (r *PostgresRepo) SetAdminTOTPSecret(ctx context.Context, id int64, encryptedSecret string) error {
	return mapErr(r.q.SetAdminTOTPSecret(ctx, sqlc.SetAdminTOTPSecretParams{
		ID:            id,
		TotpSecretEnc: encryptedSecret,
	}))
}

func (r *PostgresRepo) EnableAdminTOTP(ctx context.Context, id int64) error {
	return mapErr(r.q.EnableAdminTOTP(ctx, id))
}

func (r *PostgresRepo) CreatePasswordResetToken(ctx context.Context, adminUserID int64, tokenHash string, expiresAt time.Time) error {
	_, err := r.q.CreatePasswordResetToken(ctx, sqlc.CreatePasswordResetTokenParams{
		UserID:    adminUserID,
		TokenHash: tokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
	return mapErr(err)
}

func (r *PostgresRepo) GetValidPasswordResetToken(ctx context.Context, tokenHash string) (*domain.PasswordResetRecord, error) {
	row, err := r.q.GetValidPasswordResetToken(ctx, tokenHash)
	if err != nil {
		return nil, mapErr(err)
	}
	return &domain.PasswordResetRecord{
		ID:        row.ID,
		UserID:    row.UserID,
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt.Time,
		UsedAt:    fromPgTime(row.UsedAt),
	}, nil
}

func (r *PostgresRepo) MarkPasswordResetUsed(ctx context.Context, id int64) error {
	return mapErr(r.q.MarkPasswordResetUsed(ctx, id))
}

func (r *PostgresRepo) ListRoles(ctx context.Context) ([]domain.Role, error) {
	rows, err := r.q.ListRoles(ctx)
	if err != nil {
		return nil, mapErr(err)
	}
	out := make([]domain.Role, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.Role{
			ID:          row.ID,
			Slug:        row.Slug,
			Name:        row.Name,
			Description: row.Description,
			IsSystem:    row.IsSystem,
			CreatedAt:   row.CreatedAt.Time,
		})
	}
	return out, nil
}

func (r *PostgresRepo) ListPermissions(ctx context.Context) ([]domain.Permission, error) {
	rows, err := r.q.ListPermissions(ctx)
	if err != nil {
		return nil, mapErr(err)
	}
	out := make([]domain.Permission, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.Permission{
			ID:          row.ID,
			ModuleKey:   row.ModuleKey,
			Label:       row.Label,
			Description: row.Description,
		})
	}
	return out, nil
}

func (r *PostgresRepo) UpsertRolePermission(ctx context.Context, roleID, permissionID int64, canRead, canWrite bool) error {
	return mapErr(r.q.UpsertRolePermission(ctx, sqlc.UpsertRolePermissionParams{
		RoleID:       roleID,
		PermissionID: permissionID,
		CanRead:      canRead,
		CanWrite:     canWrite,
	}))
}

func (r *PostgresRepo) ListAdminUsers(ctx context.Context, search string, limit, offset int) ([]domain.AdminProfile, int64, error) {
	searchArg := pgtype.Text{}
	if search != "" {
		searchArg = pgtype.Text{String: search, Valid: true}
	}
	total, err := r.q.CountAdminUsers(ctx, searchArg)
	if err != nil {
		return nil, 0, mapErr(err)
	}
	rows, err := r.q.ListAdminUsers(ctx, sqlc.ListAdminUsersParams{
		Limit:  int32(limit),
		Offset: int32(offset),
		Search: searchArg,
	})
	if err != nil {
		return nil, 0, mapErr(err)
	}
	out := make([]domain.AdminProfile, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.AdminProfile{
			ID:          row.ID,
			Username:    row.Username,
			Email:       row.Email,
			FullName:    row.FullName,
			RoleID:      row.RoleID,
			RoleSlug:    row.RoleSlug,
			RoleName:    row.RoleName,
			SellerID:    fromPgInt8(row.SellerID),
			Superuser:   row.IsSuperuser,
			TOTPEnabled: row.TotpEnabled,
			IsActive:    row.IsActive,
			LastLoginAt: fromPgTime(row.LastLoginAt),
			CreatedAt:   row.CreatedAt.Time,
		})
	}
	return out, total, nil
}

func (r *PostgresRepo) CreateAdminUser(ctx context.Context, username, email, fullName, passwordHash, accessCodeHash string, roleID int64, sellerID *int64, isSuperuser, isActive bool) (*domain.AdminProfile, error) {
	row, err := r.q.CreateAdminUser(ctx, sqlc.CreateAdminUserParams{
		Username:       username,
		Email:          email,
		FullName:       fullName,
		PasswordHash:   passwordHash,
		AccessCodeHash: accessCodeHash,
		RoleID:         roleID,
		SellerID:       toPgInt8(sellerID),
		IsSuperuser:    isSuperuser,
		IsActive:       isActive,
	})
	if err != nil {
		return nil, mapErr(err)
	}
	return &domain.AdminProfile{
		ID:          row.ID,
		Username:    row.Username,
		Email:       row.Email,
		FullName:    row.FullName,
		RoleID:      row.RoleID,
		SellerID:    fromPgInt8(row.SellerID),
		Superuser:   row.IsSuperuser,
		TOTPEnabled: row.TotpEnabled,
		IsActive:    row.IsActive,
		CreatedAt:   row.CreatedAt.Time,
	}, nil
}

func (r *PostgresRepo) UpdateAdminUser(ctx context.Context, id int64, email, fullName string, roleID int64, sellerID *int64, isSuperuser, isActive bool) (*domain.AdminProfile, error) {
	row, err := r.q.UpdateAdminUser(ctx, sqlc.UpdateAdminUserParams{
		ID:          id,
		Email:       email,
		FullName:    fullName,
		RoleID:      roleID,
		SellerID:    toPgInt8(sellerID),
		IsSuperuser: isSuperuser,
		IsActive:    isActive,
	})
	if err != nil {
		return nil, mapErr(err)
	}
	return &domain.AdminProfile{
		ID:          row.ID,
		Username:    row.Username,
		Email:       row.Email,
		FullName:    row.FullName,
		RoleID:      row.RoleID,
		SellerID:    fromPgInt8(row.SellerID),
		Superuser:   row.IsSuperuser,
		TOTPEnabled: row.TotpEnabled,
		IsActive:    row.IsActive,
		CreatedAt:   row.CreatedAt.Time,
	}, nil
}

func (r *PostgresRepo) SoftDeleteAdminUser(ctx context.Context, id int64) error {
	return mapErr(r.q.SoftDeleteAdminUser(ctx, id))
}

func (r *PostgresRepo) GetSidebarCounts(ctx context.Context) (*domain.SidebarCounts, error) {
	row, err := r.q.GetSidebarCounts(ctx)
	if err != nil {
		return nil, mapErr(err)
	}
	c := &domain.SidebarCounts{}
	c.Orders.Total = int(row.OrdersTotal)
	c.Orders.New = int(row.OrdersNew)
	c.Orders.Processing = int(row.OrdersProcessing)
	c.Orders.Delivered = int(row.OrdersDelivered)
	c.Orders.Failed = int(row.OrdersFailed)
	c.Orders.Cancelled = int(row.OrdersCancelled)
	c.Customers = int(row.CustomersTotal)
	c.Contact.Total = int(row.ContactTotal)
	c.Contact.New = int(row.ContactNew)
	c.ProductInquiry.Total = int(row.InquiryTotal)
	c.ProductInquiry.New = int(row.InquiryNew)
	c.Whatsapp = int(row.WhatsappUnread)
	c.Support.Total = int(row.SupportTotal)
	c.Support.Open = int(row.SupportOpen)
	c.Sellers.Requests = int(row.SellerRequests)
	c.Sellers.Products = int(row.SellerProducts)
	c.Sellers.Payouts = int(row.SellerPayouts)
	c.Sellers.Tickets = int(row.SellerTickets)
	return c, nil
}

func (r *PostgresRepo) CreateAuditLog(ctx context.Context, entry domain.AuditEntry) error {
	_, err := r.q.CreateAuditLog(ctx, sqlc.CreateAuditLogParams{
		ActorType:     entry.ActorType,
		ActorID:       toPgInt8(entry.ActorID),
		ActorUsername: entry.ActorUsername,
		Module:        entry.Module,
		Action:        entry.Action,
		EntityType:    entry.EntityType,
		EntityID:      entry.EntityID,
		RequestID:     entry.RequestID,
		IpAddress:     entry.IPAddress,
		BeforeJson:    entry.BeforeJSON,
		AfterJson:     entry.AfterJSON,
	})
	return mapErr(err)
}

func (r *PostgresRepo) ListAuditLogs(ctx context.Context, module string, actorID *int64, limit, offset int) ([]domain.AuditEntry, int64, error) {
	modArg := pgtype.Text{}
	if module != "" {
		modArg = pgtype.Text{String: module, Valid: true}
	}
	actorArg := toPgInt8(actorID)

	total, err := r.q.CountAuditLogs(ctx, sqlc.CountAuditLogsParams{
		Module:  modArg,
		ActorID: actorArg,
	})
	if err != nil {
		return nil, 0, mapErr(err)
	}
	rows, err := r.q.ListAuditLogs(ctx, sqlc.ListAuditLogsParams{
		Limit:   int32(limit),
		Offset:  int32(offset),
		Module:  modArg,
		ActorID: actorArg,
	})
	if err != nil {
		return nil, 0, mapErr(err)
	}
	out := make([]domain.AuditEntry, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.AuditEntry{
			ID:            row.ID,
			ActorType:     row.ActorType,
			ActorID:       fromPgInt8(row.ActorID),
			ActorUsername: row.ActorUsername,
			Module:        row.Module,
			Action:        row.Action,
			EntityType:    row.EntityType,
			EntityID:      row.EntityID,
			RequestID:     row.RequestID,
			IPAddress:     row.IpAddress,
			BeforeJSON:    row.BeforeJson,
			AfterJSON:     row.AfterJson,
			CreatedAt:     row.CreatedAt.Time,
		})
	}
	return out, total, nil
}

