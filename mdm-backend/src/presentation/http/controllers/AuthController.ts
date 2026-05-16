import type { Request, Response } from "express";
import type { LoginUseCase } from "../../../application/useCases/LoginUseCase";
import { createAuthToken } from "../auth";
import type { AuthenticatedRequest } from "../auth";

export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  login = async (request: Request, response: Response): Promise<void> => {
    try {
      const user = await this.loginUseCase.execute({
        username: String(request.body.username ?? ""),
        password: String(request.body.password ?? "")
      });

      const token = createAuthToken(user);

      response.json({
        token,
        user
      });
    } catch (error) {
      response.status(401).json({
        message:
          error instanceof Error ? error.message : "Ошибка входа в систему"
      });
    }
  };

  me = async (request: Request, response: Response): Promise<void> => {
    const user = (request as AuthenticatedRequest).authUser;

    if (!user) {
      response.status(401).json({
        message: "Требуется авторизация"
      });
      return;
    }

    response.json({ user });
  };
}