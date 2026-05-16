import type { AuthUser, AuthUserRole } from "../entities/AuthUser";

export type CreateAuthUserRecord = {
  username: string;
  displayName: string;
  role: AuthUserRole;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  isActive: boolean;
};

export type UpdateAuthUserRecord = {
  displayName: string;
  role: AuthUserRole;
  isActive: boolean;
};

export type UpdateAuthUserPasswordRecord = {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
};

export interface AuthUserRepository {
  findAll(): Promise<AuthUser[]>;
  findById(id: number): Promise<AuthUser | null>;
  findByUsername(username: string): Promise<AuthUser | null>;
  create(record: CreateAuthUserRecord): Promise<AuthUser>;
  update(id: number, record: UpdateAuthUserRecord): Promise<AuthUser | null>;
  updatePassword(
    id: number,
    record: UpdateAuthUserPasswordRecord
  ): Promise<AuthUser | null>;
  countActiveAdmins(excludeUserId?: number): Promise<number>;
}
