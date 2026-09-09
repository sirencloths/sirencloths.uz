ALTER TABLE products ADD COLUMN IF NOT EXISTS gender varchar(16) NOT NULL DEFAULT 'unisex';
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
-- Existing products are conservatively marked unisex. Review and reclassify them in Admin.
