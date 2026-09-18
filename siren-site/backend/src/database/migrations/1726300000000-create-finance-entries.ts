import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateFinanceEntries1726300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`CREATE TABLE IF NOT EXISTS finance_entries (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), type varchar(16) NOT NULL, title varchar(180) NOT NULL, category varchar(80) NOT NULL DEFAULT 'Boshqa', amount numeric(12,2) NOT NULL, currency_code varchar(3) NOT NULL DEFAULT 'UZS', occurred_at timestamptz NOT NULL, note text, receipt_url varchar, created_by uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`); await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_finance_entries_occurred_at ON finance_entries(occurred_at DESC)`); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS finance_entries'); }
}
