import type { AuthUser, AuthUserSafe } from "../../domain/entities/AuthUser";
import type { AuthUserRepository } from "../../domain/repositories/AuthUserRepository";
import { verifyPassword } from "./AuthPassword";

type LoginInput = {
  username: string;
  password: string;
};

function toSafeUser(user: AuthUser): AuthUserSafe {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    departmentId: user.departmentId,
    departmentName: user.departmentName,
    role: user.role
  };
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
