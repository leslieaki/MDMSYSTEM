import type { AuthUser } from "../entities/AuthUser";

export interface AuthUserRepository {
  findById(id: number): Promise<AuthUser | null>;
  findByUsername(username: string): Promise<AuthUser | null>;
}