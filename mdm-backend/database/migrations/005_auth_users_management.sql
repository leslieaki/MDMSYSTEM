CREATE TABLE IF NOT EXISTS auth_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  password_iterations INTEGER NOT NULL CHECK (password_iterations > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'auth_users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE auth_users DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE auth_users
ADD CONSTRAINT ck_auth_users_role
CHECK (role IN ('superadmin', 'admin', 'worker'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ux_auth_users_username'
      AND conrelid = 'auth_users'::regclass
  ) THEN
    ALTER TABLE auth_users
    ADD CONSTRAINT ux_auth_users_username UNIQUE (username);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_users_username_lower
ON auth_users (LOWER(username));

INSERT INTO auth_users
  (
    username,
    display_name,
    role,
    password_hash,
    password_salt,
    password_iterations,
    is_active
  )
VALUES
  (
    'admin',
    'Суперадминистратор',
    'superadmin',
    '7cb77868a9ce8060c9cd6478cf194f31a22eb4b5ab1c38fa79751c2a845cae99',
    '3a3e323f80e840712748862bf50a1991',
    120000,
    TRUE
  )
ON CONFLICT (username) DO NOTHING;

INSERT INTO auth_users
  (
    username,
    display_name,
    role,
    password_hash,
    password_salt,
    password_iterations,
    is_active
  )
VALUES
  (
    'worker',
    'Работник склада',
    'worker',
    'ed869fd28ff3b4ef88c674c7cb17420f4413344365ff598044d4a321fa01b86e',
    '63ebc3804b7039674a6b7dba1e04ac39',
    120000,
    TRUE
  )
ON CONFLICT (username) DO NOTHING;

UPDATE auth_users
SET
  role = 'superadmin',
  display_name = CASE
    WHEN display_name IN ('Администратор', 'admin') THEN 'Суперадминистратор'
    ELSE display_name
  END,
  is_active = TRUE,
  updated_at = NOW()
WHERE LOWER(username) = 'admin';

UPDATE auth_users
SET updated_at = COALESCE(updated_at, created_at, NOW());