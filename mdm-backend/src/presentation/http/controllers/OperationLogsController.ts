import type { Request, Response } from "express";
import type { ClearOperationLogsUseCase } from "../../../application/useCases/ClearOperationLogsUseCase";
import type { CreateOperationLogUseCase } from "../../../application/useCases/CreateOperationLogUseCase";
import type { GetOperationLogsUseCase } from "../../../application/useCases/GetOperationLogsUseCase";
import type { AuthenticatedRequest } from "../auth";

export class OperationLogsController {
  constructor(
    private readonly getOperationLogsUseCase: GetOperationLogsUseCase,
    private readonly createOperationLogUseCase: CreateOperationLogUseCase,
    private readonly clearOperationLogsUseCase: ClearOperationLogsUseCase
  ) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const logs = await this.getOperationLogsUseCase.execute();

      response.json(logs);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения журнала операций"
      });
    }
  };

  create = async (request: Request, response: Response): Promise<void> => {
    try {
      const authUser = (request as AuthenticatedRequest).authUser;

      if (!authUser) {
        response.status(401).json({
          message: "Требуется авторизация"
        });
        return;
      }

      const log = await this.createOperationLogUseCase.execute({
        userName: authUser.displayName,
        userRole: authUser.role,
        action: String(request.body.action ?? ""),
        section: String(request.body.section ?? ""),
        description: String(request.body.description ?? "")
      });

      response.status(201).json(log);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка создания записи журнала"
      });
    }
  };

  clear = async (_request: Request, response: Response): Promise<void> => {
    try {
      const deletedCount = await this.clearOperationLogsUseCase.execute();

      response.json({
        message: "Журнал операций очищен",
        deletedCount
      });
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка очистки журнала операций"
      });
    }
  };
}
