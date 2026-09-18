import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfflineReportTransferExpense1726280000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "offline_daily_reports" ADD COLUMN IF NOT EXISTS "transfer_amount" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "offline_daily_reports" ADD COLUMN IF NOT EXISTS "expense_amount" numeric(12,2) NOT NULL DEFAULT 0`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "offline_daily_reports" DROP COLUMN IF EXISTS "expense_amount"`);
    await queryRunner.query(`ALTER TABLE "offline_daily_reports" DROP COLUMN IF EXISTS "transfer_amount"`);
  }
}
