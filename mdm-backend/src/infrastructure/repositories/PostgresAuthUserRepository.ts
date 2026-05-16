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
  role: AuthUserRole;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  is_active: boolean;
  created_at: string | Date;
};

const selectSql = `
  SELECT
    id,
    username,
    display_name,
    role,
    password_hash,
    password_salt,
    password_iterations,
    is_active,
    created_at
  FROM auth_users
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
        CASE role
          WHEN 'superadmin' THEN 0
          WHEN 'admin' THEN 1
          ELSE 2
        END ASC,
        is_active DESC,
        display_name ASC,
        username ASC
    `);

    return result.rows.map(mapAuthUser);
  }

  async findById(id: number): Promise<AuthUser | null> {
    const result = await postgresPool.query<AuthUserRow>(
      `
        ${selectSql}
        WHERE id = $1
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
        WHERE LOWER(username) = LOWER($1)
      `,
      [username.trim().toLowerCase()]
    );

    const row = result.rows[0];

    return row ? mapAuthUser(row) : null;
  }

  async create(record: CreateAuthUserRecord): Promise<AuthUser> {
    const result = await postgresPool.query<AuthUserRow>(
      `
        INSERT INTO auth_users
          (
            username,
            display_name,
            role,
            password_hash,
            password_salt,
            password_iterations,
            is_active
          )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          username,
          display_name,
          role,
          password_hash,
          password_salt,
          password_iterations,
          is_active,
          created_at
      `,
      [
        record.username,
        record.displayName,
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
        UPDATE auth_users
        SET
          display_name = $2,
          role = $3,
          is_active = $4,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          username,
          display_name,
          role,
          password_hash,
          password_salt,
          password_iterations,
          is_active,
          created_at
      `,
      [id, record.displayName, record.role, record.isActive]
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
          role,
          password_hash,
          password_salt,
          password_iterations,
          is_active,
          created_at
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
