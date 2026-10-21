import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBannerTranslations1760100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE banners ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE banners DROP COLUMN IF EXISTS translations');
  }
}
