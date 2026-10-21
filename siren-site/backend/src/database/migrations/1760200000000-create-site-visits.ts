import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSiteVisits1760200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE IF NOT EXISTS site_visits (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), visitor_id varchar(80) NOT NULL, visit_date date NOT NULL, path varchar(500) NOT NULL DEFAULT '/', created_at timestamptz NOT NULL DEFAULT now())");
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_site_visits_visitor_day ON site_visits(visitor_id, visit_date)');
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS site_visits');
  }
}
