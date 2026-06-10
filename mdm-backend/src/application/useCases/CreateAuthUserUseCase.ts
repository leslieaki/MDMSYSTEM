import type {
  AuthUser,
  AuthUserListItem,
  AuthUserRole
} from "../../domain/entities/AuthUser";
import type { AuthUserRepository } from "../../domain/repositories/AuthUserRepository";
import { createPasswordHash, validateNewPassword } from "./AuthPassword";

type CreateAuthUserInput = {
  currentUserRole: AuthUserRole;
  username: string;
  displayName: string;
  departmentId: number;
  role: string;
  password: string;
};

function toListItem(user: AuthUser): AuthUserListItem {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    departmentId: user.departmentId,
    departmentName: user.departmentName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function validateUsername(username: string): void {
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
    throw new Error(
      "Логин должен содержать 3-50 символов: латиница, цифры, точка, дефис или подчеркивание"
    );
  }
}

function parseRole(role: string): AuthUserRole {
  if (role !== "superadmin" && role !== "admin" && role !== "worker") {
    throw new Error("Некорректная роль пользователя");
  }

  return role;
}

function parseDepartmentId(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Выберите подразделение из справочника");
  }

  return value;
}

function canCreateRole(
  currentUserRole: AuthUserRole,
  targetRole: AuthUserRole
): boolean {
  if (targetRole === "superadmin") {
    return false;
  }

  if (currentUserRole === "superadmin") {
    return targetRole === "admin" || targetRole === "worker";
  }

  return currentUserRole === "admin" && targetRole === "worker";
}

export class CreateAuthUserUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(input: CreateAuthUserInput): Promise<AuthUserListItem> {
    const username = normalizeUsername(input.username);
    const displayName = input.displayName.trim();
    const departmentId = parseDepartmentId(input.departmentId);
    const role = parseRole(input.role);

    validateUsername(username);
    validateNewPassword(input.password);

    if (!displayName) {
      throw new Error("Укажите фамилию и имя пользователя");
    }

    if (!canCreateRole(input.currentUserRole, role)) {
      throw new Error("Только суперадминистратор может создавать администраторов");
    }

    const existingUser = await this.authUserRepository.findByUsername(username);

    if (existingUser) {
      throw new Error("Пользователь с таким логином уже существует");
    }

    const createdUser = await this.authUserRepository.create({
      username,
      displayName,
      departmentId,
      role,
      ...createPasswordHash(input.password),
      isActive: true
    });

    return toListItem(createdUser);
  }
}
