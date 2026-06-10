UPDATE auth_users
SET
  display_name = 'Суперадминистратор',
  role = 'superadmin',
  department_id = NULL,
  is_active = TRUE,
  updated_at = NOW()
WHERE username = 'admin';

UPDATE auth_users
SET
  display_name = 'Администратор MDM',
  role = 'admin',
  department_id = (
    SELECT id FROM departments WHERE name = 'Отдел НСИ' LIMIT 1
  ),
  is_active = TRUE,
  updated_at = NOW()
WHERE username = 'dragunov';

UPDATE auth_users
SET
  display_name = 'Работник склада',
  role = 'worker',
  department_id = (
    SELECT id FROM departments WHERE name = 'Отдел снабжения' LIMIT 1
  ),
  is_active = TRUE,
  updated_at = NOW()
WHERE username = 'worker';

UPDATE auth_users
SET
  department_id = (
    SELECT id FROM departments WHERE name = 'Отдел снабжения' LIMIT 1
  ),
  updated_at = NOW()
WHERE role = 'worker'
  AND department_id IS NULL;

UPDATE auth_users
SET
  department_id = (
    SELECT id FROM departments WHERE name = 'Отдел НСИ' LIMIT 1
  ),
  updated_at = NOW()
WHERE role = 'admin'
  AND department_id IS NULL;
