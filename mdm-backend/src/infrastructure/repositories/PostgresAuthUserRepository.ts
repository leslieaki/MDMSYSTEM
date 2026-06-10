import type { AuthUser, AuthUserRole } from "../../domain/entities/AuthUser";
import type {
  AuthUserRepository,
  CreateAuthUserRecord,
  UpdateAuthUserPasswordRecord,
  UpdateAuthUserRecord
} from "../../domain/repositories/AuthUserRepository";
import { postgresPool } from "../database/PostgresConnection";

type AuthUserRow = {
  id: number;
  username: string;
  display_name: string;
  department_id: number | null;
  department_name: string | null;
  role: AuthUserRole;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  is_active: boolean;
  created_at: string | Date;
};

const selectSql = `
  SELECT
    auth_user.id,
    auth_user.username,
    auth_user.display_name,
    auth_user.department_id,
    COALESCE(department.name, '') AS department_name,
    auth_user.role,
    auth_user.password_hash,
    auth_user.password_salt,
    auth_user.password_iterations,
    auth_user.is_active,
    auth_user.created_at
  FROM auth_users auth_user
  LEFT JOIN departments department ON department.id = auth_user.department_id
`;

function mapDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function mapAuthUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    departmentId: row.department_id,
    departmentName: row.department_name ?? "",
    role: row.role,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    passwordIterations: row.password_iterations,
    isActive: row.is_active,
    createdAt: mapDate(row.created_at)
  };
}

export class PostgresAuthUserRepository implements AuthUserRepository {
  async findAll(): Promise<AuthUser[]> {
    const result = await postgresPool.query<AuthUserRow>(`
      ${selectSql}
      ORDER BY
        CASE auth_user.role
          WHEN 'superadmin' THEN 0
          WHEN 'admin' THEN 1
          ELSE 2
        END ASC,
        auth_user.is_active DESC,
        department.name ASC NULLS LAST,
        auth_user.display_name ASC,
        auth_user.username ASC
    `);

    return result.rows.map(mapAuthUser);
  }

  async findById(id: number): Promise<AuthUser | null> {
    const result = await postgresPool.query<AuthUserRow>(
      `
        ${selectSql}
        WHERE auth_user.id = $1
      `,
      [id]
    );

    const row = result.rows[0];

    return row ? mapAuthUser(row) : null;
  }

  async findByUsername(username: string): Promise<AuthUser | null> {
    const result = await postgresPool.query<AuthUserRow>(
      `
        ${selectSql}
        WHERE LOWER(auth_user.username) = LOWER($1)
      `,
      [username.trim().toLowerCase()]
    );

    const row = result.rows[0];

    return row ? mapAuthUser(row) : null;
  }

  async create(record: CreateAuthUserRecord): Promise<AuthUser> {
    const result = await postgresPool.query<AuthUserRow>(
      `
        WITH inserted_user AS (
          INSERT INTO auth_users
            (
              username,
              display_name,
              department_id,
              role,
              password_hash,
              password_salt,
              password_iterations,
              is_active
            )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING
            id,
            username,
            display_name,
            department_id,
            role,
            password_hash,
            password_salt,
            password_iterations,
            is_active,
            created_at
        )
        SELECT
          inserted_user.id,
          inserted_user.username,
          inserted_user.display_name,
          inserted_user.department_id,
          COALESCE(department.name, '') AS department_name,
          inserted_user.role,
          inserted_user.password_hash,
          inserted_user.password_salt,
          inserted_user.password_iterations,
          inserted_user.is_active,
          inserted_user.created_at
        FROM inserted_user
        LEFT JOIN departments department ON department.id = inserted_user.department_id
      `,
      [
        record.username,
        record.displayName,
        record.departmentId,
        record.role,
        record.passwordHash,
        record.passwordSalt,
        record.passwordIterations,
        record.isActive
      ]
    );

    return mapAuthUser(result.rows[0]);
  }

  async update(
    id: number,
    record: UpdateAuthUserRecord
  ): Promise<AuthUser | null> {
    const result = await postgresPool.query<AuthUserRow>(
      `
        WITH updated_user AS (
          UPDATE auth_users
          SET
            display_name = $2,
            department_id = $3,
            role = $4,
            is_active = $5,
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            username,
            display_name,
            department_id,
            role,
            password_hash,
            password_salt,
            password_iterations,
            is_active,
            created_at
        )
        SELECT
          updated_user.id,
          updated_user.username,
          updated_user.display_name,
          updated_user.department_id,
          COALESCE(department.name, '') AS department_name,
          updated_user.role,
          updated_user.password_hash,
          updated_user.password_salt,
          updated_user.password_iterations,
          updated_user.is_active,
          updated_user.created_at
        FROM updated_user
        LEFT JOIN departments department ON department.id = updated_user.department_id
      `,
      [id, record.displayName, record.departmentId, record.role, record.isActive]
    );

    const row = result.rows[0];

    return row ? mapAuthUser(row) : null;
  }

  async updatePassword(
    id: number,
    record: UpdateAuthUserPasswordRecord
  ): Promise<AuthUser | null> {
    const result = await postgresPool.query<AuthUserRow>(
      `
        WITH updated_user AS (
          UPDATE auth_users
          SET
            password_hash = $2,
            password_salt = $3,
            password_iterations = $4,
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            username,
            display_name,
            department_id,
            role,
            password_hash,
            password_salt,
            password_iterations,
            is_active,
            created_at
        )
        SELECT
          updated_user.id,
          updated_user.username,
          updated_user.display_name,
          updated_user.department_id,
          COALESCE(department.name, '') AS department_name,
          updated_user.role,
          updated_user.password_hash,
          updated_user.password_salt,
          updated_user.password_iterations,
          updated_user.is_active,
          updated_user.created_at
        FROM updated_user
        LEFT JOIN departments department ON department.id = updated_user.department_id
      `,
      [id, record.passwordHash, record.passwordSalt, record.passwordIterations]
    );

    const row = result.rows[0];

    return row ? mapAuthUser(row) : null;
  }

  async countActiveAdmins(excludeUserId?: number): Promise<number> {
    const result = await postgresPool.query<{ count: number | string }>(
      `
        SELECT COUNT(*)::int AS count
        FROM auth_users
        WHERE role IN ('superadmin', 'admin')
          AND is_active = TRUE
          AND ($1::int IS NULL OR id <> $1)
      `,
      [excludeUserId ?? null]
    );

    return Number(result.rows[0]?.count ?? 0);
  }
}
