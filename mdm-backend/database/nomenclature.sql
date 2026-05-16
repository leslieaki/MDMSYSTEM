CREATE TABLE IF NOT EXISTS part_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS measurement_units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

INSERT INTO part_categories (name, description)
VALUES
  ('Крепеж', 'Болты, гайки, шайбы и другие крепежные изделия'),
  ('Покупное комплектующее изделие', 'Комплектующие, закупаемые у внешних поставщиков'),
  ('Деталь собственного производства', 'Детали, изготавливаемые внутри предприятия'),
  ('Расходный материал', 'Материалы и изделия, расходуемые в производственном процессе'),
  ('Электрокомпонент', 'Электрические и электронные компоненты')
ON CONFLICT (name) DO NOTHING;

INSERT INTO materials (name, description)
VALUES
  ('Сталь оцинкованная', 'Сталь с цинковым защитным покрытием'),
  ('Сталь 40Х', 'Конструкционная легированная сталь'),
  ('Бронза БрАЖ9-4', 'Алюминиево-железистая бронза'),
  ('Сталь 09Г2С', 'Низколегированная конструкционная сталь'),
  ('Пластик ABS', 'Ударопрочный технический пластик')
ON CONFLICT (name) DO NOTHING;

INSERT INTO suppliers (name, description)
VALUES
  ('МеталлКомплект', 'Поставщик крепежа и металлоизделий'),
  ('ПромСнаб', 'Поставщик производственных комплектующих'),
  ('ТехноДеталь', 'Поставщик точных деталей и втулок'),
  ('Внутреннее производство', 'Изготовление внутри предприятия'),
  ('ЭлектроПоставка', 'Поставщик электротехнических компонентов')
ON CONFLICT (name) DO NOTHING;

INSERT INTO measurement_units (name, description)
VALUES
  ('шт', 'Штуки'),
  ('кг', 'Килограммы'),
  ('м', 'Метры'),
  ('л', 'Литры'),
  ('компл', 'Комплекты')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS part_nomenclature (
  id SERIAL PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  material VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  weight NUMERIC(10, 3) NOT NULL,
  drawing VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_part_nomenclature_code
ON part_nomenclature (code);

CREATE INDEX IF NOT EXISTS idx_part_nomenclature_drawing
ON part_nomenclature (drawing);

INSERT INTO part_nomenclature
  (code, name, category, material, unit, weight, drawing)
SELECT DISTINCT ON (code)
  code,
  name,
  category,
  material,
  unit,
  weight,
  drawing
FROM parts
ORDER BY code, id
ON CONFLICT (code) DO NOTHING;

ALTER TABLE parts
ADD COLUMN IF NOT EXISTS nomenclature_id INTEGER;

UPDATE parts AS p
SET nomenclature_id = pn.id
FROM part_nomenclature AS pn
WHERE LOWER(p.code) = LOWER(pn.code)
  AND p.nomenclature_id IS NULL;

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

CREATE INDEX IF NOT EXISTS idx_parts_nomenclature_id
ON parts (nomenclature_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM parts
    WHERE nomenclature_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Нельзя включить строгую MDM-модель: есть детали без номенклатуры';
  ELSE
    ALTER TABLE parts
    ALTER COLUMN nomenclature_id SET NOT NULL;
  END IF;
END $$;