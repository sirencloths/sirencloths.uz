import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPickupLocationWorkingHours1726340000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE pickup_locations ADD COLUMN IF NOT EXISTS working_hours text NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE pickup_locations DROP COLUMN IF EXISTS working_hours');
  }
}
