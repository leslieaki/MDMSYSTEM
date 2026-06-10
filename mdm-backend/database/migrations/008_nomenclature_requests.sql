CREATE TABLE IF NOT EXISTS nomenclature_requests (
  id SERIAL PRIMARY KEY,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('create', 'update')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  target_nomenclature_id INTEGER REFERENCES part_nomenclature(id) ON DELETE SET NULL,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  material VARCHAR(255) NOT NULL,
  drawing VARCHAR(255) NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  reject_reason TEXT NOT NULL DEFAULT '',
  created_by VARCHAR(255) NOT NULL,
  created_by_role VARCHAR(50) NOT NULL,
  reviewed_by VARCHAR(255) NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomenclature_requests_status
ON nomenclature_requests (status);

CREATE INDEX IF NOT EXISTS idx_nomenclature_requests_type
ON nomenclature_requests (request_type);

CREATE INDEX IF NOT EXISTS idx_nomenclature_requests_target
ON nomenclature_requests (target_nomenclature_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_requests_created_at
ON nomenclature_requests (created_at DESC);
