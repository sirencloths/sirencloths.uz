import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartnerComments1726180000000 implements MigrationInterface {
  name = 'CreatePartnerComments1726180000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE partner_comments (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE, author_id uuid, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())");
    await queryRunner.query('CREATE INDEX idx_partner_comments_partner_created ON partner_comments(partner_id, created_at)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE partner_comments');
  }
}
