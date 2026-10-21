import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerCommerceState1726400000000 implements MigrationInterface {
  name = 'CreateCustomerCommerceState1726400000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE IF NOT EXISTS customer_cart_items (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE, variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE, quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(customer_id, variant_id))");
    await queryRunner.query("CREATE TABLE IF NOT EXISTS customer_favorites (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(customer_id, product_id))");
    await queryRunner.query("CREATE TABLE IF NOT EXISTS customer_product_discounts (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE, percent int NOT NULL CHECK (percent BETWEEN 1 AND 99), is_active boolean NOT NULL DEFAULT true, expires_at timestamptz, created_by uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(customer_id, product_id))");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_customer_cart_items_customer ON customer_cart_items(customer_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer ON customer_favorites(customer_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_customer_product_discounts_customer ON customer_product_discounts(customer_id, is_active)');
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS customer_product_discounts, customer_favorites, customer_cart_items'); }
}
