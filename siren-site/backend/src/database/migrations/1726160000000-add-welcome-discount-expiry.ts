import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWelcomeDiscountExpiry1726160000000 implements MigrationInterface {
  name = 'AddWelcomeDiscountExpiry1726160000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS welcome_discount_expires_at timestamptz');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE customers DROP COLUMN IF EXISTS welcome_discount_expires_at');
  }
}
