-- name: GetAdminUserByUsername :one
SELECT
  u.id, u.username, u.email, u.full_name, u.password_hash, u.access_code_hash,
  u.role_id, r.slug AS role_slug, r.name AS role_name,
  u.seller_id, u.is_superuser, u.totp_secret_enc, u.totp_enabled, u.is_active,
  u.last_login_at, u.created_at, u.updated_at
FROM admin_users u
JOIN roles r ON r.id = u.role_id
WHERE u.username = $1 AND u.deleted_at IS NULL
LIMIT 1;

-- name: GetAdminUserByEmail :one
SELECT
  u.id, u.username, u.email, u.full_name, u.password_hash, u.access_code_hash,
  u.role_id, r.slug AS role_slug, r.name AS role_name,
  u.seller_id, u.is_superuser, u.totp_secret_enc, u.totp_enabled, u.is_active,
  u.last_login_at, u.created_at, u.updated_at
FROM admin_users u
JOIN roles r ON r.id = u.role_id
WHERE u.email = $1 AND u.deleted_at IS NULL
LIMIT 1;

-- name: GetAdminUserByID :one
SELECT
  u.id, u.username, u.email, u.full_name, u.password_hash, u.access_code_hash,
  u.role_id, r.slug AS role_slug, r.name AS role_name,
  u.seller_id, u.is_superuser, u.totp_secret_enc, u.totp_enabled, u.is_active,
  u.last_login_at, u.created_at, u.updated_at
FROM admin_users u
JOIN roles r ON r.id = u.role_id
WHERE u.id = $1 AND u.deleted_at IS NULL
LIMIT 1;

-- name: ListRolePermissionsByRoleID :many
SELECT p.id, p.module_key, p.label, rp.can_read, rp.can_write
FROM permissions p
LEFT JOIN role_permissions rp
  ON rp.permission_id = p.id AND rp.role_id = $1
ORDER BY p.id ASC;

-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (
  admin_user_id, token_hash, family_id, expires_at, ip_address, user_agent
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetRefreshTokenByHash :one
SELECT * FROM refresh_tokens
WHERE token_hash = $1
LIMIT 1;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revoked_at = NOW(), replaced_by_id = $2
WHERE id = $1 AND revoked_at IS NULL;

-- name: RevokeRefreshTokenFamily :exec
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE family_id = $1 AND revoked_at IS NULL;

-- name: UpdateAdminLastLogin :exec
UPDATE admin_users
SET last_login_at = NOW()
WHERE id = $1;

-- name: UpdateAdminPassword :exec
UPDATE admin_users
SET password_hash = $2
WHERE id = $1 AND deleted_at IS NULL;

-- name: SetAdminTOTPSecret :exec
UPDATE admin_users
SET totp_secret_enc = $2, totp_enabled = FALSE
WHERE id = $1 AND deleted_at IS NULL;

-- name: EnableAdminTOTP :exec
UPDATE admin_users
SET totp_enabled = TRUE
WHERE id = $1 AND deleted_at IS NULL;

-- name: CreatePasswordResetToken :one
INSERT INTO password_reset_tokens (user_type, user_id, token_hash, expires_at)
VALUES ('admin', $1, $2, $3)
RETURNING *;

-- name: GetValidPasswordResetToken :one
SELECT * FROM password_reset_tokens
WHERE token_hash = $1 AND user_type = 'admin' AND used_at IS NULL AND expires_at > NOW()
LIMIT 1;

-- name: MarkPasswordResetUsed :exec
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE id = $1;

-- name: ListRoles :many
SELECT * FROM roles ORDER BY id ASC;

-- name: GetRoleBySlug :one
SELECT * FROM roles WHERE slug = $1 LIMIT 1;

-- name: ListPermissions :many
SELECT * FROM permissions ORDER BY id ASC;

-- name: UpsertRolePermission :exec
INSERT INTO role_permissions (role_id, permission_id, can_read, can_write)
VALUES ($1, $2, $3, $4)
ON CONFLICT (role_id, permission_id)
DO UPDATE SET can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write;

-- name: ListAdminUsers :many
SELECT
  u.id, u.username, u.email, u.full_name, u.role_id,
  r.slug AS role_slug, r.name AS role_name,
  u.seller_id, u.is_superuser, u.totp_enabled, u.is_active,
  u.last_login_at, u.created_at, u.updated_at
FROM admin_users u
JOIN roles r ON r.id = u.role_id
WHERE u.deleted_at IS NULL
  AND (sqlc.narg('search')::TEXT IS NULL OR u.username ILIKE '%' || sqlc.narg('search') || '%' OR u.email ILIKE '%' || sqlc.narg('search') || '%' OR u.full_name ILIKE '%' || sqlc.narg('search') || '%')
ORDER BY u.id DESC
LIMIT $1 OFFSET $2;

-- name: CountAdminUsers :one
SELECT COUNT(*)::BIGINT AS total
FROM admin_users u
WHERE u.deleted_at IS NULL
  AND (sqlc.narg('search')::TEXT IS NULL OR u.username ILIKE '%' || sqlc.narg('search') || '%' OR u.email ILIKE '%' || sqlc.narg('search') || '%' OR u.full_name ILIKE '%' || sqlc.narg('search') || '%');

-- name: CreateAdminUser :one
INSERT INTO admin_users (
  username, email, full_name, password_hash, access_code_hash,
  role_id, seller_id, is_superuser, is_active
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING id, username, email, full_name, role_id, seller_id, is_superuser, totp_enabled, is_active, created_at, updated_at;

-- name: UpdateAdminUser :one
UPDATE admin_users
SET
  email = $2,
  full_name = $3,
  role_id = $4,
  seller_id = $5,
  is_superuser = $6,
  is_active = $7
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, username, email, full_name, role_id, seller_id, is_superuser, totp_enabled, is_active, created_at, updated_at;

-- name: SoftDeleteAdminUser :exec
UPDATE admin_users
SET deleted_at = NOW(), is_active = FALSE
WHERE id = $1 AND deleted_at IS NULL;

