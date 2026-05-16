import type {
  AuthUser,
  AuthUserListItem,
  AuthUserRole
} from "../../domain/entities/AuthUser";
import type { AuthUserRepository } from "../../domain/repositories/AuthUserRepository";

type UpdateAuthUserInput = {
  id: number;
  currentUserId: number;
  currentUserRole: AuthUserRole;
  displayName: string;
  role: string;
  isActive: boolean;
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

function parseRole(role: string): AuthUserRole {
  if (role !== "superadmin" && role !== "admin" && role !== "worker") {
    throw new Error("Некорректная роль пользователя");
  }

  return role;
}

function canManageTarget(
  currentUserRole: AuthUserRole,
  targetUser: AuthUser
): boolean {
  if (currentUserRole === "superadmin") {
    return true;
  }

  return currentUserRole === "admin" && targetUser.role === "worker";
}

export class UpdateAuthUserUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(input: UpdateAuthUserInput): Promise<AuthUserListItem> {
    const displayName = input.displayName.trim();
    const role = parseRole(input.role);

    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new Error("Некорректный идентификатор пользователя");
    }

    if (!displayName) {
      throw new Error("Укажите имя пользователя");
    }

    const existingUser = await this.authUserRepository.findById(input.id);

    if (!existingUser) {
      throw new Error("Пользователь не найден");
    }

    if (!canManageTarget(input.currentUserRole, existingUser)) {
      throw new Error("Администратор может управлять только работниками");
    }

    if (existingUser.id === input.currentUserId && !input.isActive) {
      throw new Error("Нельзя отключить собственную учетную запись");
    }

    if (existingUser.role === "superadmin") {
      if (existingUser.id !== input.currentUserId) {
        throw new Error("Суперадминистратор может быть только один");
      }

      if (role !== "superadmin" || !input.isActive) {
        throw new Error("Нельзя изменить роль или отключить суперадминистратора");
      }
    }

    if (input.currentUserRole === "admin" && role !== "worker") {
      throw new Error("Только суперадминистратор может назначать администраторов");
    }

    if (input.currentUserRole !== "superadmin" && role === "admin") {
      throw new Error("Только суперадминистратор может назначать администраторов");
    }

    if (role === "superadmin" && existingUser.role !== "superadmin") {
      throw new Error("Суперадминистратор уже назначен");
    }

    const removesActiveAdmin =
      existingUser.role === "admin" && (role !== "admin" || !input.isActive);

    if (removesActiveAdmin) {
      const otherActiveAdmins = await this.authUserRepository.countActiveAdmins(
        existingUser.id
      );

      if (otherActiveAdmins === 0) {
        throw new Error("Нельзя оставить систему без активного администратора");
      }
    }

    const updatedUser = await this.authUserRepository.update(input.id, {
      displayName,
      role,
      isActive: input.isActive
    });

    if (!updatedUser) {
      throw new Error("Пользователь не найден");
    }

    return toListItem(updatedUser);
  }
}