import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSessions1726190000000 implements MigrationInterface {
  name = 'CreateAuthSessions1726190000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Some existing local installations were bootstrapped with synchronize
    // before this migration was introduced.  Treat that already-compatible
    // table as migrated instead of failing every later deployment.
    await queryRunner.query("CREATE TABLE IF NOT EXISTS auth_sessions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid, customer_id uuid, kind varchar(20) NOT NULL, token_hash varchar(255) NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT auth_sessions_owner_check CHECK ((user_id IS NOT NULL AND customer_id IS NULL) OR (user_id IS NULL AND customer_id IS NOT NULL)), CONSTRAINT auth_sessions_kind_check CHECK (kind IN ('admin', 'customer')))");
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, revoked_at)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_auth_sessions_customer_active ON auth_sessions(customer_id, revoked_at)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE auth_sessions');
  }
}
