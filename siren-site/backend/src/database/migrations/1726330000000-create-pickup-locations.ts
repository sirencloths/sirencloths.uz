import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePickupLocations1726330000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS pickup_locations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(140) NOT NULL,
      address text NOT NULL,
      city varchar(100) NOT NULL DEFAULT 'Tashkent',
      latitude numeric(10,7) NOT NULL,
      longitude numeric(10,7) NOT NULL,
      instructions text NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS pickup_locations'); }
}
