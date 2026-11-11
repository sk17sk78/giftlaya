-- Phase 0: Core Auth, RBAC & Immutable Audit Log Schema

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE permissions (
  id BIGSERIAL PRIMARY KEY,
  module_key VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT FALSE,
  can_write BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE admin_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(140) NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  access_code_hash TEXT NOT NULL DEFAULT '',
  role_id BIGINT NOT NULL REFERENCES roles(id),
  seller_id BIGINT NULL,
  is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
  totp_secret_enc TEXT NOT NULL DEFAULT '',
  totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_admin_users_role ON admin_users(role_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_users_seller ON admin_users(seller_id) WHERE seller_id IS NOT NULL;

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  customer_id BIGINT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  family_id UUID NOT NULL,
  replaced_by_id BIGINT NULL REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_admin ON refresh_tokens(admin_user_id) WHERE admin_user_id IS NOT NULL;

CREATE TABLE password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_type VARCHAR(24) NOT NULL CHECK (user_type IN ('admin', 'customer')),
  user_id BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_lookup ON password_reset_tokens(user_type, user_id);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_type VARCHAR(24) NOT NULL DEFAULT 'admin',
  actor_id BIGINT NULL,
  actor_username VARCHAR(80) NOT NULL DEFAULT '',
  module VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL DEFAULT '',
  entity_id VARCHAR(64) NOT NULL DEFAULT '',
  request_id VARCHAR(64) NOT NULL DEFAULT '',
  ip_address VARCHAR(64) NOT NULL DEFAULT '',
  before_json JSONB NULL,
  after_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module, created_at DESC);

