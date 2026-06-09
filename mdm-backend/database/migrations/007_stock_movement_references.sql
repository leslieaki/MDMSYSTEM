CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_warehouses_name_lower
ON warehouses (LOWER(name));

CREATE TABLE IF NOT EXISTS stock_movement_reasons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_movement_reasons_name_lower
ON stock_movement_reasons (LOWER(name));

INSERT INTO warehouses (name, description)
VALUES
  ('Основной склад', 'Центральная зона хранения деталей и комплектующих'),
  ('Зона приемки', 'Зона первичного поступления и контроля поставок'),
  ('Производственный участок', 'Зона передачи материалов в производство'),
  ('Склад брака', 'Зона хранения списанных или дефектных позиций')
ON CONFLICT DO NOTHING;

INSERT INTO stock_movement_reasons (name, description)
VALUES
  ('Накладная поставщика', 'Основание для оформления прихода на склад'),
  ('Акт списания', 'Основание для списания материалов или деталей'),
  ('Требование-накладная', 'Основание для передачи материалов в производство'),
  ('Инвентаризационная ведомость', 'Основание для фиксации фактических остатков'),
  ('Корректировка остатков', 'Основание для исправления складского остатка')
ON CONFLICT DO NOTHING;
