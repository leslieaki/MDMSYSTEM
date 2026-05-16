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