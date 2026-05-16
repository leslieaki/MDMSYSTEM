import type {
  AuthUser,
  AuthUserListItem,
  AuthUserRole
} from "../../domain/entities/AuthUser";
import type { AuthUserRepository } from "../../domain/repositories/AuthUserRepository";
import { createPasswordHash, validateNewPassword } from "./AuthPassword";

type ChangeAuthUserPasswordInput = {
  id: number;
  currentUserId: number;
  currentUserRole: AuthUserRole;
  password: string;
};

function toListItem(user: AuthUser): AuthUserListItem {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
}

function canChangePassword(
  currentUserRole: AuthUserRole,
  currentUserId: number,
  targetUser: AuthUser
): boolean {
  if (currentUserRole === "superadmin") {
    return true;
  }

  return (
    currentUserRole === "admin" &&
    (targetUser.role === "worker" || targetUser.id === currentUserId)
  );
}

export class ChangeAuthUserPasswordUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(input: ChangeAuthUserPasswordInput): Promise<AuthUserListItem> {
    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new Error("Некорректный идентификатор пользователя");
    }

    validateNewPassword(input.password);

    const existingUser = await this.authUserRepository.findById(input.id);

    if (!existingUser) {
      throw new Error("Пользователь не найден");
    }

    if (
      !canChangePassword(
        input.currentUserRole,
        input.currentUserId,
        existingUser
      )
    ) {
      throw new Error("Недостаточно прав для смены пароля этой учетной записи");
    }

    const updatedUser = await this.authUserRepository.updatePassword(
      input.id,
      createPasswordHash(input.password)
    );

    if (!updatedUser) {
      throw new Error("Пользователь не найден");
    }

    return toListItem(updatedUser);
  }
}