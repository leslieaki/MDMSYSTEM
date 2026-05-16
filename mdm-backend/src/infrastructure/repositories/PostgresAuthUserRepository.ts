import type { AuthUser, AuthUserRole } from "../../domain/entities/AuthUser";
import type { AuthUserRepository } from "../../domain/repositories/AuthUserRepository";
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

export class PostgresAuthUserRepository implements AuthUserRepository {
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
    const normalizedUsername = username.trim().toLowerCase();

    const result = await postgresPool.query<AuthUserRow>(
      `
        ${selectSql}
        WHERE LOWER(username) = LOWER($1)
      `,
      [normalizedUsername]
    );

    const row = result.rows[0];

    return row ? mapAuthUser(row) : null;
  }
}