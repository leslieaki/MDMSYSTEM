CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  movement_type VARCHAR(40) NOT NULL CHECK (
    movement_type IN (
      'receipt',
      'write_off',
      'transfer',
      'inventory',
      'adjustment'
    )
  ),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
  stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
  from_location VARCHAR(255) NOT NULL DEFAULT '',
  to_location VARCHAR(255) NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  employee VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_part_id
ON stock_movements (part_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_type
ON stock_movements (movement_type);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
ON stock_movements (created_at DESC);
