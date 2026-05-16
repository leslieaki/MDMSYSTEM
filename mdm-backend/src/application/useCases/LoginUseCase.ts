import { pbkdf2Sync, timingSafeEqual } from "node:crypto";
import type { AuthUser, AuthUserSafe } from "../../domain/entities/AuthUser";
import type { AuthUserRepository } from "../../domain/repositories/AuthUserRepository";

type LoginInput = {
  username: string;
  password: string;
};

function toSafeUser(user: AuthUser): AuthUserSafe {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role
  };
}

function verifyPassword(password: string, user: AuthUser): boolean {
  const calculatedHash = pbkdf2Sync(
    password,
    Buffer.from(user.passwordSalt, "hex"),
    user.passwordIterations,
    32,
    "sha256"
  );

  const storedHash = Buffer.from(user.passwordHash, "hex");

  if (calculatedHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(calculatedHash, storedHash);
}

export class LoginUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(input: LoginInput): Promise<AuthUserSafe> {
    const username = input.username.trim();

    if (!username || !input.password) {
      throw new Error("Введите логин и пароль");
    }

    const user = await this.authUserRepository.findByUsername(username);

    if (!user || !user.isActive || !verifyPassword(input.password, user)) {
      throw new Error("Неверный логин или пароль");
    }

    return toSafeUser(user);
  }
}