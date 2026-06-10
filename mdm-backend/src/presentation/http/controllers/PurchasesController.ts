import type { Request, Response } from "express";
import type { CreatePurchaseUseCase } from "../../../application/useCases/CreatePurchaseUseCase";
import type { GetPurchasesUseCase } from "../../../application/useCases/GetPurchasesUseCase";
import type { AuthenticatedRequest } from "../auth";

export class PurchasesController {
  constructor(
    private readonly getPurchasesUseCase: GetPurchasesUseCase,
    private readonly createPurchaseUseCase: CreatePurchaseUseCase
  ) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const purchases = await this.getPurchasesUseCase.execute();

      response.json(purchases);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error ? error.message : "Ошибка получения закупок"
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

      const purchase = await this.createPurchaseUseCase.execute({
        partId: Number(request.body.partId),
        quantity: Number(request.body.quantity),
        price: Number(request.body.price),
        employee: authUser.displayName
      });

      response.status(201).json(purchase);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error ? error.message : "Ошибка создания закупки"
      });
    }
  };
}
