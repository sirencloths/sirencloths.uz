ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash varchar;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS region varchar(120);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS registration_source varchar(80) NOT NULL DEFAULT 'checkout';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS welcome_discount_eligible boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS welcome_discount_percent integer NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS welcome_discount_used_at timestamptz;

CREATE TABLE IF NOT EXISTS auth_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  purpose varchar(40) NOT NULL,
  code_hash varchar(255) NOT NULL,
  expires_at timestamptz NOT NULL,
  resend_available_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_otps_email_purpose ON auth_otps(email, purpose);
