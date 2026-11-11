-- Full Normalized Giftlaya E-Commerce & CMS v2 Schema (58 tables total)

-- ============================================================
-- 1. Geography, Delivery Types & Slot Capacity
-- ============================================================

CREATE TABLE states (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cities (
  id BIGSERIAL PRIMARY KEY,
  state_id BIGINT REFERENCES states(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  landmark_key VARCHAR(64) NOT NULL DEFAULT '',
  base_delivery_charge_paise INT NOT NULL DEFAULT 0,
  same_day_cutoff_time TIME NOT NULL DEFAULT '17:00:00',
  midnight_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cities_popular_sort ON cities(is_popular, sort_order) WHERE is_active = TRUE;

CREATE TABLE pincodes (
  id BIGSERIAL PRIMARY KEY,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL UNIQUE,
  area_name VARCHAR(140) NOT NULL DEFAULT '',
  extra_charge_paise INT NOT NULL DEFAULT 0,
  is_express_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_serviceable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pincodes_city_code ON pincodes(city_id, code);

CREATE TABLE delivery_types (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(48) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  lead_time_days INT NOT NULL DEFAULT 0,
  cutoff_time TIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE time_slot_templates (
  id BIGSERIAL PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_midnight BOOLEAN NOT NULL DEFAULT FALSE,
  extra_charge_paise INT NOT NULL DEFAULT 0,
  default_capacity INT NOT NULL DEFAULT 25,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE slot_capacity_ledger (
  id BIGSERIAL PRIMARY KEY,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  slot_template_id BIGINT NOT NULL REFERENCES time_slot_templates(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  max_capacity INT NOT NULL DEFAULT 25,
  reserved_count INT NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city_id, slot_template_id, service_date)
);

CREATE INDEX idx_slot_ledger_lookup ON slot_capacity_ledger(city_id, service_date);

CREATE TABLE blackout_dates (
  id BIGSERIAL PRIMARY KEY,
  city_id BIGINT NULL REFERENCES cities(id) ON DELETE CASCADE,
  blackout_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL DEFAULT '',
  block_same_day BOOLEAN NOT NULL DEFAULT TRUE,
  extra_surge_paise INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blackout_date_city ON blackout_dates(blackout_date, city_id);

-- ============================================================
-- 2. Marketplace: Sellers & KYC
-- ============================================================

CREATE TABLE sellers (
  id BIGSERIAL PRIMARY KEY,
  business_name VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  contact_name VARCHAR(140) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  city_id BIGINT NULL REFERENCES cities(id) ON DELETE SET NULL,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  kyc_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  kyc_docs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  bank_details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_sellers_city_kyc ON sellers(city_id, kyc_status) WHERE deleted_at IS NULL;

ALTER TABLE admin_users
  ADD CONSTRAINT fk_admin_users_seller
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Categories, Navigation, Presets & Media Library
-- ============================================================

CREATE TABLE media_folders (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT NULL REFERENCES media_folders(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, slug)
);

CREATE TABLE media_assets (
  id BIGSERIAL PRIMARY KEY,
  folder_id BIGINT NULL REFERENCES media_folders(id) ON DELETE SET NULL,
  file_key VARCHAR(255) NOT NULL UNIQUE,
  cdn_url TEXT NOT NULL,
  webp_url TEXT NOT NULL DEFAULT '',
  alt_text VARCHAR(255) NOT NULL DEFAULT '',
  width INT NOT NULL DEFAULT 0,
  height INT NOT NULL DEFAULT 0,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type VARCHAR(80) NOT NULL DEFAULT 'image/webp',
  uploaded_by_admin_id BIGINT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  kind VARCHAR(32) NOT NULL DEFAULT 'product' CHECK (kind IN ('product', 'decoration', 'addon')),
  image_url TEXT NOT NULL DEFAULT '',
  seo_title VARCHAR(255) NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  robots_index BOOLEAN NOT NULL DEFAULT TRUE,
  seo_content_html TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_categories_parent_sort ON categories(parent_id, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE navigation_items (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT NULL REFERENCES navigation_items(id) ON DELETE CASCADE,
  column_title VARCHAR(120) NOT NULL DEFAULT '',
  label VARCHAR(120) NOT NULL,
  href VARCHAR(255) NOT NULL,
  badge VARCHAR(32) NULL,
  category_id BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE presets (
  id BIGSERIAL PRIMARY KEY,
  preset_type VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (preset_type, slug)
);

CREATE INDEX idx_presets_type_sort ON presets(preset_type, sort_order) WHERE is_active = TRUE;

-- ============================================================
-- 4. Products, Variants, Add-ons, Personalization & Decor
-- ============================================================

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NULL REFERENCES sellers(id) ON DELETE SET NULL,
  product_type VARCHAR(32) NOT NULL CHECK (product_type IN (
    'flower', 'cake', 'plant', 'chocolate', 'personalised', 'hamper', 'decoration_package', 'combo'
  )),
  name VARCHAR(240) NOT NULL,
  slug VARCHAR(240) NOT NULL UNIQUE,
  sku VARCHAR(80) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  mrp_paise BIGINT NOT NULL CHECK (mrp_paise >= 0),
  selling_price_paise BIGINT NOT NULL CHECK (selling_price_paise >= 0),
  discount_percent SMALLINT GENERATED ALWAYS AS (
    CASE
      WHEN mrp_paise > 0 AND mrp_paise > selling_price_paise
        THEN LEAST(100, (((mrp_paise - selling_price_paise) * 100) / mrp_paise))::SMALLINT
      ELSE 0
    END
  ) STORED,
  stock_qty INT NOT NULL DEFAULT 0,
  track_stock BOOLEAN NOT NULL DEFAULT TRUE,
  is_eggless BOOLEAN NOT NULL DEFAULT FALSE,
  has_veg_nonveg BOOLEAN NOT NULL DEFAULT FALSE,
  veg_delta_paise INT NOT NULL DEFAULT 0,
  nonveg_delta_paise INT NOT NULL DEFAULT 14900,
  delivery_type_id BIGINT NULL REFERENCES delivery_types(id) ON DELETE SET NULL,
  lead_time_days INT NOT NULL DEFAULT 0,
  cutoff_time TIME NULL,
  cancellation_policy_preset_id BIGINT NULL REFERENCES presets(id) ON DELETE SET NULL,
  gst_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  available_all_cities BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'published', 'archived')),
  seo_title VARCHAR(255) NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 4.80,
  ratings_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_products_type_status ON products(product_type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_trending ON products(is_trending, created_at DESC) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_products_seller ON products(seller_id, status) WHERE deleted_at IS NULL;

CREATE TABLE product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id BIGINT NULL REFERENCES media_assets(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  alt_text VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE product_categories (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label VARCHAR(80) NOT NULL,
  sku_suffix VARCHAR(40) NOT NULL DEFAULT '',
  mrp_paise BIGINT NOT NULL,
  price_paise BIGINT NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE product_addons (
  id BIGSERIAL PRIMARY KEY,
  addon_category_id BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  image_url TEXT NOT NULL DEFAULT '',
  price_paise BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_addon_links (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  addon_id BIGINT NOT NULL REFERENCES product_addons(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, addon_id)
);

CREATE TABLE product_option_groups (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  selection_type VARCHAR(24) NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple')),
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE product_personalization_fields (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  field_key VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  field_type VARCHAR(24) NOT NULL CHECK (field_type IN ('text', 'photo', 'dropdown', 'color', 'date')),
  placeholder VARCHAR(160) NOT NULL DEFAULT '',
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_price_paise BIGINT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE product_presets (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  preset_id BIGINT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, preset_id)
);

CREATE TABLE city_product_overrides (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  price_override_paise BIGINT NULL,
  delivery_charge_paise INT NULL,
  cutoff_override TIME NULL,
  PRIMARY KEY (product_id, city_id)
);

CREATE TABLE decoration_inclusions (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('included', 'not_included')),
  item_text VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE decorator_teams (
  id BIGSERIAL PRIMARY KEY,
  city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(140) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  daily_capacity INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. Customers, Carts, Coupons & Coins Wallet
-- ============================================================

CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL DEFAULT '',
  phone VARCHAR(20) UNIQUE NULL,
  email VARCHAR(255) UNIQUE NULL,
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE customer_otps (
  id BIGSERIAL PRIMARY KEY,
  channel VARCHAR(16) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  target VARCHAR(255) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_otps_target ON customer_otps(channel, target, created_at DESC);

CREATE TABLE customer_addresses (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(64) NOT NULL DEFAULT 'Home',
  recipient_name VARCHAR(160) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255) NOT NULL DEFAULT '',
  landmark VARCHAR(180) NOT NULL DEFAULT '',
  city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
  pincode VARCHAR(10) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coupons (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL DEFAULT '',
  discount_type VARCHAR(16) NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value INT NOT NULL CHECK (discount_value > 0),
  max_discount_paise BIGINT NULL,
  min_cart_paise BIGINT NOT NULL DEFAULT 0,
  applicable_category_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  applicable_city_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_usage_limit INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  per_user_limit INT NOT NULL DEFAULT 1,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE carts (
  id UUID PRIMARY KEY,
  customer_id BIGINT NULL REFERENCES customers(id) ON DELETE SET NULL,
  session_token VARCHAR(120) UNIQUE NULL,
  city_id BIGINT NULL REFERENCES cities(id) ON DELETE SET NULL,
  coupon_code VARCHAR(40) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id BIGSERIAL PRIMARY KEY,
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id BIGINT NULL REFERENCES product_variants(id) ON DELETE SET NULL,
  qty INT NOT NULL CHECK (qty > 0),
  delivery_date DATE NULL,
  slot_template_id BIGINT NULL REFERENCES time_slot_templates(id) ON DELETE SET NULL,
  personalization_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  addons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coin_wallets (
  customer_id BIGINT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  balance_coins INT NOT NULL DEFAULT 0 CHECK (balance_coins >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. Orders State Machine, Payments, Refunds, Invoices & Payouts
-- ============================================================

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id BIGINT NULL REFERENCES customers(id) ON DELETE SET NULL,
  city_id BIGINT NOT NULL REFERENCES cities(id),
  status VARCHAR(32) NOT NULL DEFAULT 'placed' CHECK (status IN (
    'placed', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'
  )),
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'paid', 'failed', 'partially_refunded', 'refunded'
  )),
  payment_method VARCHAR(32) NOT NULL DEFAULT 'razorpay',
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_date DATE NULL,
  slot_template_id BIGINT NULL REFERENCES time_slot_templates(id) ON DELETE SET NULL,
  subtotal_paise BIGINT NOT NULL DEFAULT 0,
  delivery_fee_paise BIGINT NOT NULL DEFAULT 0,
  slot_surcharge_paise BIGINT NOT NULL DEFAULT 0,
  coupon_code VARCHAR(40) NULL,
  coupon_discount_paise BIGINT NOT NULL DEFAULT 0,
  coins_redeemed INT NOT NULL DEFAULT 0,
  coins_discount_paise BIGINT NOT NULL DEFAULT 0,
  tax_gst_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  cancellation_fee_paise BIGINT NOT NULL DEFAULT 0,
  shipping_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipient_name VARCHAR(160) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  tracking_id VARCHAR(120) NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_city_date ON orders(city_id, delivery_date);
CREATE INDEX idx_orders_customer ON orders(customer_id, created_at DESC);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  variant_id BIGINT NULL REFERENCES product_variants(id) ON DELETE SET NULL,
  seller_id BIGINT NULL REFERENCES sellers(id) ON DELETE SET NULL,
  product_title_snapshot VARCHAR(240) NOT NULL,
  sku_snapshot VARCHAR(80) NOT NULL,
  item_type VARCHAR(32) NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price_paise BIGINT NOT NULL,
  line_total_paise BIGINT NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  seller_payout_paise BIGINT NOT NULL DEFAULT 0,
  personalization_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  addons_json JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(32) NOT NULL DEFAULT '',
  to_status VARCHAR(32) NOT NULL,
  actor_type VARCHAR(24) NOT NULL DEFAULT 'system',
  actor_id BIGINT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_assignments (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  decorator_team_id BIGINT NULL REFERENCES decorator_teams(id) ON DELETE SET NULL,
  delivery_partner_name VARCHAR(140) NOT NULL DEFAULT '',
  delivery_partner_phone VARCHAR(20) NOT NULL DEFAULT '',
  assigned_by_admin_id BIGINT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coupon_usages (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_paise BIGINT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coin_transactions (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id BIGINT NULL REFERENCES orders(id) ON DELETE SET NULL,
  delta INT NOT NULL,
  tx_type VARCHAR(24) NOT NULL CHECK (tx_type IN ('earn', 'redeem', 'expire', 'admin_adjust', 'refund_clawback')),
  expires_at TIMESTAMPTZ NULL,
  note VARCHAR(255) NOT NULL DEFAULT '',
  admin_user_id BIGINT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway VARCHAR(32) NOT NULL,
  gateway_order_id VARCHAR(120) NOT NULL DEFAULT '',
  gateway_payment_id VARCHAR(120) NOT NULL DEFAULT '',
  gateway_event_id VARCHAR(120) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  amount_paise BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gateway, gateway_event_id)
);

CREATE TABLE payment_links (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NULL REFERENCES orders(id) ON DELETE SET NULL,
  customer_phone VARCHAR(20) NOT NULL,
  amount_paise BIGINT NOT NULL,
  short_url TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'created',
  expires_at TIMESTAMPTZ NULL,
  created_by_admin_id BIGINT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refunds (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_transaction_id BIGINT NULL REFERENCES payment_transactions(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL,
  cancellation_fee_paise BIGINT NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  gateway_refund_id VARCHAR(120) NOT NULL DEFAULT '',
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  processed_by_admin_id BIGINT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number VARCHAR(64) NOT NULL UNIQUE,
  gstin_seller VARCHAR(32) NOT NULL DEFAULT '',
  gst_breakup_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_payouts (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_paise BIGINT NOT NULL,
  commission_paise BIGINT NOT NULL,
  net_payout_paise BIGINT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  utr_number VARCHAR(80) NOT NULL DEFAULT '',
  paid_at TIMESTAMPTZ NULL,
  created_by_admin_id BIGINT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. CMS Content, Homepage Builder, Blog, Reviews & SEO
-- ============================================================

CREATE TABLE hero_banners (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  href VARCHAR(255) NOT NULL,
  desktop_image_url TEXT NOT NULL,
  mobile_image_url TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE homepage_sections (
  id BIGSERIAL PRIMARY KEY,
  section_key VARCHAR(80) NOT NULL UNIQUE,
  section_type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  slider_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  rule_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cms_pages (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(200) NOT NULL UNIQUE,
  page_type VARCHAR(32) NOT NULL DEFAULT 'static' CHECK (page_type IN ('static', 'category_landing', 'dynamic', 'footer_policy', 'app')),
  title VARCHAR(200) NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  sections_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title VARCHAR(255) NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  robots_index BOOLEAN NOT NULL DEFAULT TRUE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE faqs (
  id BIGSERIAL PRIMARY KEY,
  scope_type VARCHAR(24) NOT NULL DEFAULT 'home' CHECK (scope_type IN ('home', 'category', 'product', 'blog', 'global')),
  scope_id BIGINT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blog_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  image_url TEXT NOT NULL DEFAULT '',
  seo_title VARCHAR(255) NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blog_posts (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES blog_categories(id) ON DELETE SET NULL,
  title VARCHAR(240) NOT NULL,
  slug VARCHAR(240) NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  sections_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured_image_url TEXT NOT NULL DEFAULT '',
  author_name VARCHAR(120) NOT NULL DEFAULT 'Giftlaya Team',
  read_time VARCHAR(40) NOT NULL DEFAULT '4 min read',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ NULL,
  seo_title VARCHAR(255) NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE recent_works (
  id BIGSERIAL PRIMARY KEY,
  category_slug VARCHAR(120) NOT NULL DEFAULT '',
  title VARCHAR(200) NOT NULL,
  city_id BIGINT NULL REFERENCES cities(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL,
  customer_id BIGINT NULL REFERENCES customers(id) ON DELETE SET NULL,
  reviewer_name VARCHAR(120) NOT NULL,
  city_name VARCHAR(120) NOT NULL DEFAULT '',
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reply TEXT NOT NULL DEFAULT '',
  is_featured_home BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seo_redirects (
  id BIGSERIAL PRIMARY KEY,
  from_path VARCHAR(255) NOT NULL UNIQUE,
  to_path VARCHAR(255) NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 301,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trending_searches (
  id BIGSERIAL PRIMARY KEY,
  query_text VARCHAR(120) NOT NULL UNIQUE,
  href VARCHAR(255) NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 8. Support, WhatsApp, Notifications, Marketing & Settings
-- ============================================================

CREATE TABLE contact_inquiries (
  id BIGSERIAL PRIMARY KEY,
  inquiry_type VARCHAR(32) NOT NULL CHECK (inquiry_type IN ('contact', 'callback', 'product_inquiry', 'franchise', 'seller_request', 'vendor_request')),
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  subject VARCHAR(200) NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  assigned_admin_id BIGINT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE support_tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_number VARCHAR(40) NOT NULL UNIQUE,
  source_type VARCHAR(24) NOT NULL DEFAULT 'customer' CHECK (source_type IN ('customer', 'seller')),
  customer_id BIGINT NULL REFERENCES customers(id) ON DELETE SET NULL,
  seller_id BIGINT NULL REFERENCES sellers(id) ON DELETE SET NULL,
  order_id BIGINT NULL REFERENCES orders(id) ON DELETE SET NULL,
  subject VARCHAR(200) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  messages_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_templates (
  id BIGSERIAL PRIMARY KEY,
  event_key VARCHAR(80) NOT NULL,
  channel VARCHAR(24) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'push')),
  subject VARCHAR(200) NOT NULL DEFAULT '',
  body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_key, channel)
);

CREATE TABLE notification_logs (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NULL REFERENCES notification_templates(id) ON DELETE SET NULL,
  recipient VARCHAR(255) NOT NULL,
  channel VARCHAR(24) NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'queued',
  error_message TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_contacts (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL DEFAULT '',
  customer_id BIGINT NULL REFERENCES customers(id) ON DELETE SET NULL,
  unread_count INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_messages (
  id BIGSERIAL PRIMARY KEY,
  contact_id BIGINT NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('in', 'out')),
  body TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meta_ads_campaigns (
  id BIGSERIAL PRIMARY KEY,
  external_campaign_id VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  objective VARCHAR(80) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'paused',
  daily_budget_paise BIGINT NOT NULL DEFAULT 0,
  rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE site_settings (
  key VARCHAR(100) PRIMARY KEY,
  group_name VARCHAR(64) NOT NULL DEFAULT 'general',
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by_admin_id BIGINT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

