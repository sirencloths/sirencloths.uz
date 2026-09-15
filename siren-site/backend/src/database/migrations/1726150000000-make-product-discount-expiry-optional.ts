import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeProductDiscountExpiryOptional1726150000000 implements MigrationInterface {
  name = 'MakeProductDiscountExpiryOptional1726150000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE product_discounts ALTER COLUMN ends_at DROP NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM product_discounts WHERE ends_at IS NULL');
    await queryRunner.query('ALTER TABLE product_discounts ALTER COLUMN ends_at SET NOT NULL');
  }
}
