import { postgresPool } from "../PostgresConnection";

async function main(): Promise<void> {
  const client = await postgresPool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      INSERT INTO part_categories (name, description)
      SELECT data.name, data.description
      FROM (
        VALUES
          ('Крепеж', 'Болты, гайки, шайбы и другие крепежные изделия'),
          ('Покупное комплектующее изделие', 'Комплектующие, закупаемые у внешних поставщиков'),
          ('Деталь собственного производства', 'Детали, изготавливаемые внутри предприятия'),
          ('Расходный материал', 'Материалы и изделия, расходуемые в производственном процессе'),
          ('Электрокомпонент', 'Электрические и электронные компоненты')
      ) AS data(name, description)
      WHERE NOT EXISTS (
        SELECT 1 FROM part_categories
        WHERE LOWER(part_categories.name) = LOWER(data.name)
      );

      INSERT INTO materials (name, description)
      SELECT data.name, data.description
      FROM (
        VALUES
          ('Сталь оцинкованная', 'Сталь с цинковым защитным покрытием'),
          ('Сталь 40Х', 'Конструкционная легированная сталь'),
          ('Бронза БрАЖ9-4', 'Алюминиево-железистая бронза'),
          ('Сталь 09Г2С', 'Низколегированная конструкционная сталь'),
          ('Пластик ABS', 'Ударопрочный технический пластик')
      ) AS data(name, description)
      WHERE NOT EXISTS (
        SELECT 1 FROM materials
        WHERE LOWER(materials.name) = LOWER(data.name)
      );

      INSERT INTO suppliers (name, description)
      SELECT data.name, data.description
      FROM (
        VALUES
          ('МеталлКомплект', 'Поставщик крепежа и металлоизделий'),
          ('ПромСнаб', 'Поставщик производственных комплектующих'),
          ('ТехноДеталь', 'Поставщик точных деталей и втулок'),
          ('Внутреннее производство', 'Изготовление внутри предприятия'),
          ('ЭлектроПоставка', 'Поставщик электротехнических компонентов')
      ) AS data(name, description)
      WHERE NOT EXISTS (
        SELECT 1 FROM suppliers
        WHERE LOWER(suppliers.name) = LOWER(data.name)
      );

      INSERT INTO measurement_units (name, description)
      SELECT data.name, data.description
      FROM (
        VALUES
          ('шт', 'Штуки'),
          ('кг', 'Килограммы'),
          ('м', 'Метры'),
          ('л', 'Литры'),
          ('компл', 'Комплекты')
      ) AS data(name, description)
      WHERE NOT EXISTS (
        SELECT 1 FROM measurement_units
        WHERE LOWER(measurement_units.name) = LOWER(data.name)
      );

      INSERT INTO departments (name, manager, employee_count)
      SELECT data.name, data.manager, data.employee_count
      FROM (
        VALUES
          ('Склад комплектующих', 'Иванов И.И.', 12),
          ('Отдел снабжения', 'Петров П.П.', 8),
          ('Производственный участок', 'Сидоров С.С.', 34),
          ('Отдел НСИ', 'Кузнецова А.А.', 5)
      ) AS data(name, manager, employee_count)
      WHERE NOT EXISTS (
        SELECT 1 FROM departments
        WHERE LOWER(departments.name) = LOWER(data.name)
      );


      UPDATE auth_users user_record
      SET department_id = department_record.id
      FROM departments department_record
      WHERE user_record.department_id IS NULL
        AND (
          (LOWER(user_record.display_name) LIKE LOWER('Кузнецова%') AND department_record.name = 'Отдел НСИ')
          OR (LOWER(user_record.display_name) LIKE LOWER('Иванов%') AND department_record.name = 'Склад комплектующих')
          OR (LOWER(user_record.display_name) LIKE LOWER('Петров%') AND department_record.name = 'Отдел снабжения')
          OR (LOWER(user_record.username) = 'worker' AND department_record.name = 'Склад комплектующих')
        );

      INSERT INTO employees (name, position, department, role)
      SELECT data.name, data.position, data.department, data.role
      FROM (
        VALUES
          ('Иванов И.И.', 'Кладовщик', 'Склад комплектующих', 'worker'),
          ('Петров П.П.', 'Специалист по снабжению', 'Отдел снабжения', 'worker'),
          ('Сидоров С.С.', 'Мастер участка', 'Производственный участок', 'worker'),
          ('Кузнецова А.А.', 'Администратор НСИ', 'Отдел НСИ', 'admin')
      ) AS data(name, position, department, role)
      WHERE NOT EXISTS (
        SELECT 1 FROM employees
        WHERE LOWER(employees.name) = LOWER(data.name)
      );

      INSERT INTO part_nomenclature (code, name, category, material, drawing)
      SELECT data.code, data.name, data.category, data.material, data.drawing
      FROM (
        VALUES
          ('MDM-001', 'Болт М12x40', 'Крепеж', 'Сталь оцинкованная', 'CH-001-2026'),
          ('MDM-002', 'Гайка М12', 'Крепеж', 'Сталь оцинкованная', 'CH-002-2026'),
          ('MDM-003', 'Втулка направляющая', 'Деталь собственного производства', 'Бронза БрАЖ9-4', 'CH-003-2026'),
          ('MDM-004', 'Корпус редуктора', 'Деталь собственного производства', 'Сталь 09Г2С', 'CH-004-2026'),
          ('MDM-005', 'Датчик положения', 'Электрокомпонент', 'Пластик ABS', 'CH-005-2026')
      ) AS data(code, name, category, material, drawing)
      WHERE NOT EXISTS (
        SELECT 1 FROM part_nomenclature
        WHERE LOWER(part_nomenclature.code) = LOWER(data.code)
           OR LOWER(part_nomenclature.drawing) = LOWER(data.drawing)
      );

      INSERT INTO parts
        (code, name, category, material, unit, weight, stock, min_stock, drawing, supplier, nomenclature_id)
      SELECT
        data.code,
        data.name,
        data.category,
        data.material,
        data.unit,
        data.weight,
        data.stock,
        data.min_stock,
        data.drawing,
        data.supplier,
        pn.id
      FROM (
        VALUES
          ('MDM-001', 'Болт М12x40', 'Крепеж', 'Сталь оцинкованная', 'шт', 0.080, 120, 50, 'CH-001-2026', 'МеталлКомплект'),
          ('MDM-002', 'Гайка М12', 'Крепеж', 'Сталь оцинкованная', 'шт', 0.030, 240, 80, 'CH-002-2026', 'МеталлКомплект'),
          ('MDM-003', 'Втулка направляющая', 'Деталь собственного производства', 'Бронза БрАЖ9-4', 'шт', 0.450, 35, 15, 'CH-003-2026', 'ТехноДеталь'),
          ('MDM-004', 'Корпус редуктора', 'Деталь собственного производства', 'Сталь 09Г2С', 'шт', 4.800, 8, 3, 'CH-004-2026', 'Внутреннее производство'),
          ('MDM-005', 'Датчик положения', 'Электрокомпонент', 'Пластик ABS', 'шт', 0.120, 18, 10, 'CH-005-2026', 'ЭлектроПоставка')
      ) AS data(code, name, category, material, unit, weight, stock, min_stock, drawing, supplier)
      JOIN part_nomenclature pn ON LOWER(pn.code) = LOWER(data.code)
      WHERE NOT EXISTS (
        SELECT 1 FROM parts
        WHERE LOWER(parts.code) = LOWER(data.code)
      );

      INSERT INTO purchases
        (raw_name, part_id, quantity, price, supplier, employee, date)
      SELECT
        p.name,
        p.id,
        data.quantity,
        data.price,
        data.supplier,
        data.employee,
        data.date::date
      FROM (
        VALUES
          ('MDM-001', 50, 25.50, 'МеталлКомплект', 'Иванов И.И.', '2026-05-10'),
          ('MDM-002', 100, 8.20, 'МеталлКомплект', 'Петров П.П.', '2026-05-12'),
          ('MDM-003', 10, 430.00, 'ТехноДеталь', 'Сидоров С.С.', '2026-05-15'),
          ('MDM-005', 5, 1250.00, 'ЭлектроПоставка', 'Иванов И.И.', '2026-05-18')
      ) AS data(code, quantity, price, supplier, employee, date)
      JOIN parts p ON LOWER(p.code) = LOWER(data.code)
      WHERE NOT EXISTS (
        SELECT 1 FROM purchases existing_purchase
        WHERE existing_purchase.part_id = p.id
          AND existing_purchase.quantity = data.quantity
          AND existing_purchase.price = data.price
          AND existing_purchase.date = data.date::date
      );

      INSERT INTO operation_logs (user_name, user_role, action, section, description)
      SELECT data.user_name, data.user_role, data.action, data.section, data.description
      FROM (
        VALUES
          ('Суперадминистратор', 'superadmin', 'seed', 'database', 'Созданы демонстрационные данные для дипломного проекта'),
          ('Кузнецова А.А.', 'admin', 'approve', 'nomenclature', 'Проверены и утверждены базовые позиции номенклатуры')
      ) AS data(user_name, user_role, action, section, description)
      WHERE NOT EXISTS (
        SELECT 1 FROM operation_logs
        WHERE operation_logs.action = data.action
          AND operation_logs.section = data.section
          AND operation_logs.description = data.description
      );
    `);

    const result = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM parts) AS parts_count,
        (SELECT COUNT(*)::int FROM part_nomenclature) AS nomenclature_count,
        (SELECT COUNT(*)::int FROM purchases) AS purchases_count,
        (SELECT COUNT(*)::int FROM departments) AS departments_count,
        (SELECT COUNT(*)::int FROM employees) AS employees_count,
        (SELECT COUNT(*)::int FROM auth_users) AS users_count,
        (SELECT COUNT(*)::int FROM operation_logs) AS operation_logs_count;
    `);

    await client.query("COMMIT");

    console.log("database seed completed:", result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await postgresPool.end();
  }
}

main().catch((error) => {
  console.error("database seed failed");
  console.error(error);
  process.exit(1);
});