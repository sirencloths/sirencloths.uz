import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreatePartners1726170000000 implements MigrationInterface {
  name = 'CreatePartners1726170000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query("CREATE TYPE partner_type_enum AS ENUM ('sponsor','influencer','referral','affiliate')");
    await q.query("CREATE TABLE partners (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar(180) NOT NULL, type partner_type_enum NOT NULL, email varchar(255), phone varchar(50), social varchar(255), promo_code varchar(60) UNIQUE, discount_percent int NOT NULL DEFAULT 0, product_ids jsonb NOT NULL DEFAULT '[]', per_customer_limit int, is_active boolean NOT NULL DEFAULT true, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
    await q.query("CREATE TABLE partner_promo_usages (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), partner_id uuid NOT NULL REFERENCES partners(id), customer_id uuid, order_id uuid, discount_amount numeric(12,2) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now())");
    await q.query('CREATE INDEX idx_partner_promo_usages_partner_customer ON partner_promo_usages(partner_id, customer_id)');
  }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE partner_promo_usages'); await q.query('DROP TABLE partners'); await q.query('DROP TYPE partner_type_enum'); }
}
