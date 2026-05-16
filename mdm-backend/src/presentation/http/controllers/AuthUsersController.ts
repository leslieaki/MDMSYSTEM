import type { Request, Response } from "express";
import type { ChangeAuthUserPasswordUseCase } from "../../../application/useCases/ChangeAuthUserPasswordUseCase";
import type { CreateAuthUserUseCase } from "../../../application/useCases/CreateAuthUserUseCase";
import type { GetAuthUsersUseCase } from "../../../application/useCases/GetAuthUsersUseCase";
import type { UpdateAuthUserUseCase } from "../../../application/useCases/UpdateAuthUserUseCase";
import type { AuthenticatedRequest } from "../auth";

function getUserId(request: Request): number {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Некорректный идентификатор пользователя");
  }

  return id;
}

export class AuthUsersController {
  constructor(
    private readonly getAuthUsersUseCase: GetAuthUsersUseCase,
    private readonly createAuthUserUseCase: CreateAuthUserUseCase,
    private readonly updateAuthUserUseCase: UpdateAuthUserUseCase,
    private readonly changeAuthUserPasswordUseCase: ChangeAuthUserPasswordUseCase
  ) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const users = await this.getAuthUsersUseCase.execute();

      response.json(users);
    } catch (error) {
      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения пользователей"
      });
    }
  };

  create = async (request: Request, response: Response): Promise<void> => {
    try {
      const currentUser = (request as AuthenticatedRequest).authUser;

      if (!currentUser) {
        response.status(401).json({ message: "Требуется авторизация" });
        return;
      }

      const user = await this.createAuthUserUseCase.execute({
        currentUserRole: currentUser.role,
        username: String(request.body.username ?? ""),
        displayName: String(request.body.displayName ?? ""),
        role: String(request.body.role ?? ""),
        password: String(request.body.password ?? "")
      });

      response.status(201).json(user);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка создания пользователя"
      });
    }
  };

  update = async (request: Request, response: Response): Promise<void> => {
    try {
      const currentUser = (request as AuthenticatedRequest).authUser;

      if (!currentUser) {
        response.status(401).json({ message: "Требуется авторизация" });
        return;
      }

      const user = await this.updateAuthUserUseCase.execute({
        id: getUserId(request),
        currentUserId: currentUser.id,
        currentUserRole: currentUser.role,
        displayName: String(request.body.displayName ?? ""),
        role: String(request.body.role ?? ""),
        isActive: Boolean(request.body.isActive)
      });

      response.json(user);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка изменения пользователя"
      });
    }
  };

  changePassword = async (
    request: Request,
    response: Response
  ): Promise<void> => {
    try {
      const currentUser = (request as AuthenticatedRequest).authUser;

      if (!currentUser) {
        response.status(401).json({ message: "Требуется авторизация" });
        return;
      }

      const user = await this.changeAuthUserPasswordUseCase.execute({
        id: getUserId(request),
        currentUserId: currentUser.id,
        currentUserRole: currentUser.role,
        password: String(request.body.password ?? "")
      });

      response.json(user);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error ? error.message : "Ошибка смены пароля"
      });
    }
  };
}