ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS department_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_auth_users_department'
      AND conrelid = 'auth_users'::regclass
  ) THEN
    ALTER TABLE auth_users
    ADD CONSTRAINT fk_auth_users_department
    FOREIGN KEY (department_id)
    REFERENCES departments(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_auth_users_department_id
ON auth_users (department_id);

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
