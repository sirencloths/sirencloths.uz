import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductEngagements1726350000000 implements MigrationInterface {
  name = 'CreateProductEngagements1726350000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE IF NOT EXISTS product_engagements (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), product_id uuid NOT NULL, kind varchar(20) NOT NULL, visitor_id varchar(80) NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT product_engagements_kind_check CHECK (kind IN ('favorite', 'cart')), CONSTRAINT product_engagements_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)");
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_product_engagements_unique_visitor ON product_engagements(product_id, kind, visitor_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_product_engagements_product_active ON product_engagements(product_id, kind, active)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS product_engagements');
  }
}
