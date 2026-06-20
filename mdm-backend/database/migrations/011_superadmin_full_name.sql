UPDATE auth_users
SET
  display_name = 'Иванов Иван Иванович',
  updated_at = NOW()
WHERE username = 'admin'
  AND role = 'superadmin';
