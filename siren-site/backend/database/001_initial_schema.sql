CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE users_role_enum AS ENUM ('super_admin','admin','editor','fulfillment','analyst');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE products_status_enum AS ENUM ('draft','active','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE orders_status_enum AS ENUM ('pending','paid','processing','shipped','delivered','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(255) NOT NULL UNIQUE,
  password_hash varchar NOT NULL, role users_role_enum NOT NULL DEFAULT 'admin',
  first_name varchar(100) NOT NULL DEFAULT '', last_name varchar(100) NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(180) NOT NULL UNIQUE, name varchar(180) NOT NULL,
  description varchar, image_url varchar, position integer NOT NULL DEFAULT 0, is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(180) NOT NULL UNIQUE, name varchar(180) NOT NULL,
  description varchar, hero_image_url varchar, position integer NOT NULL DEFAULT 0, is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(220) NOT NULL UNIQUE, title varchar(220) NOT NULL,
  description text NOT NULL DEFAULT '', status products_status_enum NOT NULL DEFAULT 'draft',
  price numeric(12,2) NOT NULL DEFAULT 0, compare_at_price numeric(12,2), currency_code varchar(3) NOT NULL DEFAULT 'UZS',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL, media jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku varchar(120) NOT NULL, barcode varchar(120), name varchar(180) NOT NULL DEFAULT '', color varchar(100), size varchar(30),
  price numeric(12,2), inventory_quantity integer NOT NULL DEFAULT 0 CHECK (inventory_quantity >= 0), offline_inventory_quantity integer NOT NULL DEFAULT 0 CHECK (offline_inventory_quantity >= 0), is_active boolean NOT NULL DEFAULT true,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, sku)
);
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(255) UNIQUE, phone varchar(40),
  first_name varchar(100) NOT NULL DEFAULT '', last_name varchar(100) NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  country varchar(100) NOT NULL DEFAULT '', city varchar(120) NOT NULL DEFAULT '', line_1 varchar(255) NOT NULL DEFAULT '',
  line_2 varchar(255) NOT NULL DEFAULT '', postal_code varchar(30) NOT NULL DEFAULT '', is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number bigserial NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL, status orders_status_enum NOT NULL DEFAULT 'pending',
  payment_status varchar(40) NOT NULL DEFAULT 'pending', fulfillment_status varchar(40) NOT NULL DEFAULT 'unfulfilled',
  currency_code varchar(3) NOT NULL DEFAULT 'UZS', subtotal_amount numeric(12,2) NOT NULL DEFAULT 0,
  shipping_amount numeric(12,2) NOT NULL DEFAULT 0, discount_amount numeric(12,2) NOT NULL DEFAULT 0, total_amount numeric(12,2) NOT NULL DEFAULT 0,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb, billing_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_method varchar(60), note text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid, variant_id uuid, title_snapshot varchar(220) NOT NULL, sku_snapshot varchar(120), quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL, total_price numeric(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(180) NOT NULL, image_url varchar NOT NULL, mobile_image_url varchar,
  target_url varchar, position integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz, ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(180) NOT NULL UNIQUE, title varchar(220) NOT NULL,
  is_published boolean NOT NULL DEFAULT false, seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type varchar(80) NOT NULL, position integer NOT NULL DEFAULT 0, content jsonb NOT NULL DEFAULT '{}'::jsonb, is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(220) NOT NULL UNIQUE, title varchar(255) NOT NULL,
  excerpt text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', cover_image_url varchar, is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz, seo jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lookbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(180) NOT NULL, image_url varchar NOT NULL,
  caption varchar, target_url varchar, position integer NOT NULL DEFAULT 0, is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key varchar(180) NOT NULL UNIQUE, value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, action varchar(100) NOT NULL, entity_type varchar(100) NOT NULL,
  entity_id varchar, payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_page_id ON page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE, quantity integer NOT NULL CHECK (quantity > 0),
  direction varchar(32) NOT NULL, from_location varchar(80) NOT NULL, to_location varchar(80) NOT NULL,
  actor_id uuid NULL REFERENCES users(id) ON DELETE SET NULL, note text NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_variant_created_at ON inventory_transfers(variant_id, created_at DESC);
