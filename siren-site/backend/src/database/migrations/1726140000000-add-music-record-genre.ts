import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMusicRecordGenre1726140000000 implements MigrationInterface {
  name = 'AddMusicRecordGenre1726140000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "music_records" ADD COLUMN IF NOT EXISTS "genre" character varying(120) NOT NULL DEFAULT ''`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "music_records" DROP COLUMN IF EXISTS "genre"`);
  }
}
