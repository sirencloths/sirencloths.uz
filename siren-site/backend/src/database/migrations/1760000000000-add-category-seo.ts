import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategorySeo1760000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "seo" jsonb NOT NULL DEFAULT '{}'::jsonb`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "seo"`);
  }
}
