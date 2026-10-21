import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryTranslations1726410000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb"); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE categories DROP COLUMN IF EXISTS translations'); }
}
