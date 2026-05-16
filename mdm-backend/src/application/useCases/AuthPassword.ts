import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthUser } from "../../domain/entities/AuthUser";

export type PasswordHashRecord = {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
};

const passwordIterations = 120000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";

export function createPasswordHash(password: string): PasswordHashRecord {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(
    password,
    salt,
    passwordIterations,
    passwordKeyLength,
    passwordDigest
  );

  return {
    passwordHash: hash.toString("hex"),
    passwordSalt: salt.toString("hex"),
    passwordIterations
  };
}

export function verifyPassword(password: string, user: AuthUser): boolean {
  const calculatedHash = pbkdf2Sync(
    password,
    Buffer.from(user.passwordSalt, "hex"),
    user.passwordIterations,
    passwordKeyLength,
    passwordDigest
  );
  const storedHash = Buffer.from(user.passwordHash, "hex");

  if (calculatedHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(calculatedHash, storedHash);
}

export function validateNewPassword(password: string): void {
  if (password.length < 8) {
    throw new Error("Пароль должен содержать не менее 8 символов");
  }
}