CREATE TABLE IF NOT EXISTS operation_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  action VARCHAR(120) NOT NULL,
  section VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at
ON operation_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operation_logs_section
ON operation_logs (section);