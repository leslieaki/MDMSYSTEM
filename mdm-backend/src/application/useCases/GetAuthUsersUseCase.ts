import type {
  AuthUser,
  AuthUserListItem
} from "../../domain/entities/AuthUser";
import type { AuthUserRepository } from "../../domain/repositories/AuthUserRepository";

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

export class GetAuthUsersUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(): Promise<AuthUserListItem[]> {
    const users = await this.authUserRepository.findAll();

    return users.map(toListItem);
  }
}
