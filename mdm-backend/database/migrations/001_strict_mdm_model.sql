CREATE TABLE IF NOT EXISTS part_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_part_categories_name_lower
ON part_categories (LOWER(name));

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_materials_name_lower
ON materials (LOWER(name));

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_name_lower
ON suppliers (LOWER(name));

CREATE TABLE IF NOT EXISTS measurement_units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_measurement_units_name_lower
ON measurement_units (LOWER(name));

INSERT INTO part_categories (name, description)
VALUES
  ('Крепеж', 'Болты, гайки, шайбы и другие крепежные изделия'),
  ('Покупное комплектующее изделие', 'Комплектующие, закупаемые у внешних поставщиков'),
  ('Деталь собственного производства', 'Детали, изготавливаемые внутри предприятия'),
  ('Расходный материал', 'Материалы и изделия, расходуемые в производственном процессе'),
  ('Электрокомпонент', 'Электрические и электронные компоненты')
ON CONFLICT DO NOTHING;

INSERT INTO materials (name, description)
VALUES
  ('Сталь оцинкованная', 'Сталь с цинковым защитным покрытием'),
  ('Сталь 40Х', 'Конструкционная легированная сталь'),
  ('Бронза БрАЖ9-4', 'Алюминиево-железистая бронза'),
  ('Сталь 09Г2С', 'Низколегированная конструкционная сталь'),
  ('Пластик ABS', 'Ударопрочный технический пластик')
ON CONFLICT DO NOTHING;

INSERT INTO suppliers (name, description)
VALUES
  ('МеталлКомплект', 'Поставщик крепежа и металлоизделий'),
  ('ПромСнаб', 'Поставщик производственных комплектующих'),
  ('ТехноДеталь', 'Поставщик точных деталей и втулок'),
  ('Внутреннее производство', 'Изготовление внутри предприятия'),
  ('ЭлектроПоставка', 'Поставщик электротехнических компонентов')
ON CONFLICT DO NOTHING;

INSERT INTO measurement_units (name, description)
VALUES
  ('шт', 'Штуки'),
  ('кг', 'Килограммы'),
  ('м', 'Метры'),
  ('л', 'Литры'),
  ('компл', 'Комплекты')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS part_nomenclature (
  id SERIAL PRIMARY KEY,
  code VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  material VARCHAR(255) NOT NULL,
  drawing VARCHAR(255) NOT NULL
);

ALTER TABLE part_nomenclature
DROP COLUMN IF EXISTS unit;

ALTER TABLE part_nomenclature
DROP COLUMN IF EXISTS weight;

CREATE UNIQUE INDEX IF NOT EXISTS ux_part_nomenclature_code_lower
ON part_nomenclature (LOWER(code));

CREATE UNIQUE INDEX IF NOT EXISTS ux_part_nomenclature_drawing_lower
ON part_nomenclature (LOWER(drawing));

INSERT INTO part_nomenclature
  (code, name, category, material, drawing)
SELECT DISTINCT ON (LOWER(code))
  code,
  name,
  category,
  material,
  drawing
FROM parts
WHERE code IS NOT NULL
ORDER BY LOWER(code), id
ON CONFLICT DO NOTHING;

ALTER TABLE parts
ADD COLUMN IF NOT EXISTS nomenclature_id INTEGER;

UPDATE parts AS p
SET nomenclature_id = pn.id
FROM part_nomenclature AS pn
WHERE LOWER(p.code) = LOWER(pn.code)
  AND p.nomenclature_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM parts
    WHERE nomenclature_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Есть детали без номенклатуры. Сначала создайте записи part_nomenclature и заполните parts.nomenclature_id.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_parts_nomenclature'
  ) THEN
    ALTER TABLE parts
    ADD CONSTRAINT fk_parts_nomenclature
    FOREIGN KEY (nomenclature_id)
    REFERENCES part_nomenclature(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE parts
ALTER COLUMN nomenclature_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_parts_nomenclature_id
ON parts (nomenclature_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_parts_code_lower
ON parts (LOWER(code));

CREATE INDEX IF NOT EXISTS idx_parts_supplier
ON parts (supplier);

CREATE INDEX IF NOT EXISTS idx_parts_category
ON parts (category);

CREATE INDEX IF NOT EXISTS idx_parts_material
ON parts (material);

CREATE INDEX IF NOT EXISTS idx_parts_unit
ON parts (unit);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier
ON purchases (supplier);