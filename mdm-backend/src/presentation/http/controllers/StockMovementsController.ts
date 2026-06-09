import type { Request, Response } from "express";
import type { CreateStockMovementUseCase } from "../../../application/useCases/CreateStockMovementUseCase";
import type { GetStockMovementsUseCase } from "../../../application/useCases/GetStockMovementsUseCase";
import type { AuthenticatedRequest } from "../auth";

export class StockMovementsController {
  constructor(
    private readonly getStockMovementsUseCase: GetStockMovementsUseCase,
    private readonly createStockMovementUseCase: CreateStockMovementUseCase
  ) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const movements = await this.getStockMovementsUseCase.execute();

      response.json(movements);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения складских движений"
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

      const movement = await this.createStockMovementUseCase.execute({
        partId: Number(request.body.partId),
        type: String(request.body.type ?? ""),
        quantity: Number(request.body.quantity),
        fromLocation: String(request.body.fromLocation ?? ""),
        toLocation: String(request.body.toLocation ?? ""),
        reason: String(request.body.reason ?? ""),
        employee: authUser.displayName
      });

      response.status(201).json(movement);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка создания складского движения"
      });
    }
  };
}
