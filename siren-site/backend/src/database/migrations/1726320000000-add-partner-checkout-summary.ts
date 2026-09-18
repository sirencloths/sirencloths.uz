import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerCheckoutSummary1726320000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE partners ADD COLUMN IF NOT EXISTS show_in_checkout_summary boolean NOT NULL DEFAULT false');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE partners DROP COLUMN IF EXISTS show_in_checkout_summary');
  }
}
