DROP TABLE IF EXISTS operation_logs;
DROP TABLE IF EXISTS part_drawing_files;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS parts;
DROP TABLE IF EXISTS part_nomenclature;
DROP TABLE IF EXISTS measurement_units;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS part_categories;

CREATE TABLE part_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX ux_part_categories_name_lower
ON part_categories (LOWER(name));

CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX ux_materials_name_lower
ON materials (LOWER(name));

CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX ux_suppliers_name_lower
ON suppliers (LOWER(name));

CREATE TABLE measurement_units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX ux_measurement_units_name_lower
ON measurement_units (LOWER(name));

CREATE TABLE part_nomenclature (
  id SERIAL PRIMARY KEY,
  code VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  material VARCHAR(255) NOT NULL,
  drawing VARCHAR(255) NOT NULL
);

CREATE UNIQUE INDEX ux_part_nomenclature_code_lower
ON part_nomenclature (LOWER(code));

CREATE UNIQUE INDEX ux_part_nomenclature_drawing_lower
ON part_nomenclature (LOWER(drawing));

CREATE INDEX idx_part_nomenclature_category
ON part_nomenclature (category);

CREATE INDEX idx_part_nomenclature_material
ON part_nomenclature (material);

CREATE TABLE parts (
  id SERIAL PRIMARY KEY,
  nomenclature_id INTEGER NOT NULL REFERENCES part_nomenclature(id) ON DELETE RESTRICT,
  code VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  material VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  weight NUMERIC(10, 3) NOT NULL CHECK (weight >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  min_stock INTEGER NOT NULL CHECK (min_stock >= 0),
  drawing VARCHAR(255) NOT NULL,
  supplier VARCHAR(255) NOT NULL
);

CREATE UNIQUE INDEX ux_parts_nomenclature_id
ON parts (nomenclature_id);

CREATE UNIQUE INDEX ux_parts_code_lower
ON parts (LOWER(code));

CREATE INDEX idx_parts_supplier
ON parts (supplier);

CREATE INDEX idx_parts_category
ON parts (category);

CREATE INDEX idx_parts_material
ON parts (material);

CREATE INDEX idx_parts_unit
ON parts (unit);

CREATE TABLE part_drawing_files (
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

CREATE UNIQUE INDEX ux_part_drawing_files_part_id
ON part_drawing_files (part_id);

CREATE UNIQUE INDEX ux_part_drawing_files_stored_name
ON part_drawing_files (stored_name);

CREATE INDEX idx_part_drawing_files_uploaded_at
ON part_drawing_files (uploaded_at);

CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  raw_name VARCHAR(255) NOT NULL,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  supplier VARCHAR(255) NOT NULL,
  employee VARCHAR(255) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_purchases_part_id
ON purchases (part_id);

CREATE INDEX idx_purchases_supplier
ON purchases (supplier);

CREATE TABLE operation_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  action VARCHAR(120) NOT NULL,
  section VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_operation_logs_created_at
ON operation_logs (created_at DESC);

CREATE INDEX idx_operation_logs_section
ON operation_logs (section);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  manager VARCHAR(255) NOT NULL,
  employee_count INTEGER NOT NULL CHECK (employee_count >= 0)
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL
);

INSERT INTO part_categories (name, description)
VALUES
  ('Крепеж', 'Болты, гайки, шайбы и другие крепежные изделия'),
  ('Покупное комплектующее изделие', 'Комплектующие, закупаемые у внешних поставщиков'),
  ('Деталь собственного производства', 'Детали, изготавливаемые внутри предприятия'),
  ('Расходный материал', 'Материалы и изделия, расходуемые в производственном процессе'),
  ('Электрокомпонент', 'Электрические и электронные компоненты');

INSERT INTO materials (name, description)
VALUES
  ('Сталь оцинкованная', 'Сталь с цинковым защитным покрытием'),
  ('Сталь 40Х', 'Конструкционная легированная сталь'),
  ('Бронза БрАЖ9-4', 'Алюминиево-железистая бронза'),
  ('Сталь 09Г2С', 'Низколегированная конструкционная сталь'),
  ('Пластик ABS', 'Ударопрочный технический пластик');

INSERT INTO suppliers (name, description)
VALUES
  ('МеталлКомплект', 'Поставщик крепежа и металлоизделий'),
  ('ПромСнаб', 'Поставщик производственных комплектующих'),
  ('ТехноДеталь', 'Поставщик точных деталей и втулок'),
  ('Внутреннее производство', 'Изготовление внутри предприятия'),
  ('ЭлектроПоставка', 'Поставщик электротехнических компонентов');

INSERT INTO measurement_units (name, description)
VALUES
  ('шт', 'Штуки'),
  ('кг', 'Килограммы'),
  ('м', 'Метры'),
  ('л', 'Литры'),
  ('компл', 'Комплекты');

INSERT INTO part_nomenclature
  (code, name, category, material, drawing)
VALUES
  ('ГОСТ 11371-78', 'Шайба плоская М10', 'Крепеж', 'Сталь оцинкованная', 'DRW-WASHER-M10-001'),
  ('ГОСТ 7798-70', 'Болт М12x60', 'Крепеж', 'Сталь 40Х', 'DRW-BOLT-M12-060'),
  ('ГОСТ 5915-70', 'Гайка шестигранная М12', 'Крепеж', 'Сталь оцинкованная', 'DRW-NUT-M12-001'),
  ('ПКИ-204-11', 'Втулка направляющая', 'Покупное комплектующее изделие', 'Бронза БрАЖ9-4', 'DRW-BUSHING-204-11'),
  ('ЧРТ-77-02', 'Кронштейн крепления двигателя', 'Деталь собственного производства', 'Сталь 09Г2С', 'DRW-BRACKET-77-02');

INSERT INTO parts
  (
    nomenclature_id,
    code,
    name,
    category,
    material,
    unit,
    weight,
    stock,
    min_stock,
    drawing,
    supplier
  )
SELECT
  pn.id,
  pn.code,
  pn.name,
  pn.category,
  pn.material,
  seed.unit,
  seed.weight,
  seed.stock,
  seed.min_stock,
  pn.drawing,
  seed.supplier
FROM part_nomenclature pn
JOIN (
  VALUES
    ('ГОСТ 11371-78', 'шт', 0.011::NUMERIC, 420, 150, 'МеталлКомплект'),
    ('ГОСТ 7798-70', 'шт', 0.085::NUMERIC, 96, 120, 'ПромСнаб'),
    ('ГОСТ 5915-70', 'шт', 0.026::NUMERIC, 280, 100, 'МеталлКомплект'),
    ('ПКИ-204-11', 'шт', 0.340::NUMERIC, 18, 30, 'ТехноДеталь'),
    ('ЧРТ-77-02', 'шт', 1.720::NUMERIC, 44, 20, 'Внутреннее производство')
) AS seed(code, unit, weight, stock, min_stock, supplier)
  ON LOWER(seed.code) = LOWER(pn.code);

INSERT INTO purchases
  (raw_name, part_id, quantity, price, supplier, employee, date)
SELECT
  'Шайба плоская М10 · 100 шт',
  p.id,
  100,
  1200,
  p.supplier,
  'Иванов Сергей',
  '2026-05-15'
FROM parts p
WHERE LOWER(p.code) = LOWER('ГОСТ 11371-78');

INSERT INTO purchases
  (raw_name, part_id, quantity, price, supplier, employee, date)
SELECT
  'Болт М12x60 · 50 шт',
  p.id,
  50,
  3300,
  p.supplier,
  'Петров Алексей',
  '2026-05-14'
FROM parts p
WHERE LOWER(p.code) = LOWER('ГОСТ 7798-70');

INSERT INTO departments
  (name, manager, employee_count)
VALUES
  ('Отдел снабжения', 'Иванов Сергей', 4),
  ('Склад', 'Кузнецова Мария', 8),
  ('Производственный цех', 'Смирнов Павел', 24),
  ('ИТ-отдел', 'Волков Дмитрий', 5);

INSERT INTO employees
  (name, position, department, role)
VALUES
  ('Иванов Сергей', 'Специалист по закупкам', 'Отдел снабжения', 'Админ'),
  ('Кузнецова Мария', 'Начальник склада', 'Склад', 'Админ'),
  ('Орлов Андрей', 'Слесарь-сборщик', 'Производственный цех', 'Работник'),
  ('Волков Дмитрий', 'Системный администратор', 'ИТ-отдел', 'Админ');