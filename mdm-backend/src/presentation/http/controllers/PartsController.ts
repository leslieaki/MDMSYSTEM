import type { Request, Response } from "express";
import type { CreatePartUseCase } from "../../../application/useCases/CreatePartUseCase";
import type { GetPartsUseCase } from "../../../application/useCases/GetPartsUseCase";
import type { UpdatePartUseCase } from "../../../application/useCases/UpdatePartUseCase";

export class PartsController {
  constructor(
    private readonly getPartsUseCase: GetPartsUseCase,
    private readonly createPartUseCase: CreatePartUseCase,
    private readonly updatePartUseCase: UpdatePartUseCase
  ) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const parts = await this.getPartsUseCase.execute();

      response.json(parts);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения справочника деталей"
      });
    }
  };

  create = async (request: Request, response: Response): Promise<void> => {
    try {
      const part = await this.createPartUseCase.execute({
        nomenclatureId: Number(request.body.nomenclatureId),
        supplier: String(request.body.supplier ?? ""),
        unit: String(request.body.unit ?? ""),
        weight: Number(request.body.weight),
        stock: Number(request.body.stock),
        minStock: Number(request.body.minStock)
      });

      response.status(201).json(part);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error ? error.message : "Ошибка создания детали"
      });
    }
  };

  update = async (request: Request, response: Response): Promise<void> => {
    try {
      const part = await this.updatePartUseCase.execute({
        id: Number(request.params.id),
        nomenclatureId: Number(request.body.nomenclatureId),
        supplier: String(request.body.supplier ?? ""),
        unit: String(request.body.unit ?? ""),
        weight: Number(request.body.weight),
        stock: Number(request.body.stock),
        minStock: Number(request.body.minStock)
      });

      response.json(part);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error ? error.message : "Ошибка обновления детали"
      });
    }
  };
}