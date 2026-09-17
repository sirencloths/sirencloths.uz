import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductLaunchSchedule1726200000000 implements MigrationInterface {
  name = 'AddProductLaunchSchedule1726200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Local databases created through TypeORM synchronize can already have
    // these columns before migrations are introduced.
    await queryRunner.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS scheduled_at timestamptz');
    await queryRunner.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS show_launch_countdown boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS launch_countdown_text varchar(180)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_products_scheduled_at ON products(scheduled_at)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_products_scheduled_at');
    await queryRunner.query('ALTER TABLE products DROP COLUMN IF EXISTS launch_countdown_text');
    await queryRunner.query('ALTER TABLE products DROP COLUMN IF EXISTS show_launch_countdown');
    await queryRunner.query('ALTER TABLE products DROP COLUMN IF EXISTS scheduled_at');
  }
}
