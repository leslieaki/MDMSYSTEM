CREATE TABLE IF NOT EXISTS part_drawing_files (
  id SERIAL PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  uploaded_by VARCHAR(255) NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_part_drawing_files_part_id
ON part_drawing_files (part_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_part_drawing_files_stored_name
ON part_drawing_files (stored_name);

CREATE INDEX IF NOT EXISTS idx_part_drawing_files_uploaded_at
ON part_drawing_files (uploaded_at);
