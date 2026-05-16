import type { Request, Response } from "express";
import type { CreatePartNomenclatureUseCase } from "../../../application/useCases/CreatePartNomenclatureUseCase";
import type { DeletePartNomenclatureUseCase } from "../../../application/useCases/DeletePartNomenclatureUseCase";
import type { GetPartNomenclatureUseCase } from "../../../application/useCases/GetPartNomenclatureUseCase";
import type { UpdatePartNomenclatureUseCase } from "../../../application/useCases/UpdatePartNomenclatureUseCase";

export class PartNomenclatureController {
  constructor(
    private readonly getPartNomenclatureUseCase: GetPartNomenclatureUseCase,
    private readonly createPartNomenclatureUseCase: CreatePartNomenclatureUseCase,
    private readonly updatePartNomenclatureUseCase: UpdatePartNomenclatureUseCase,
    private readonly deletePartNomenclatureUseCase: DeletePartNomenclatureUseCase
  ) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const items = await this.getPartNomenclatureUseCase.execute();

      response.json(items);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения номенклатуры деталей"
      });
    }
  };

  create = async (request: Request, response: Response): Promise<void> => {
    try {
      const item = await this.createPartNomenclatureUseCase.execute({
        code: String(request.body.code ?? ""),
        name: String(request.body.name ?? ""),
        category: String(request.body.category ?? ""),
        material: String(request.body.material ?? ""),
        drawing: String(request.body.drawing ?? "")
      });

      response.status(201).json(item);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка создания номенклатуры"
      });
    }
  };

  update = async (request: Request, response: Response): Promise<void> => {
    try {
      const item = await this.updatePartNomenclatureUseCase.execute({
        id: Number(request.params.id),
        code: String(request.body.code ?? ""),
        name: String(request.body.name ?? ""),
        category: String(request.body.category ?? ""),
        material: String(request.body.material ?? ""),
        drawing: String(request.body.drawing ?? "")
      });

      response.json(item);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка обновления номенклатуры"
      });
    }
  };

  remove = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.deletePartNomenclatureUseCase.execute({
        id: Number(request.params.id),
        replacementId:
          request.body?.replacementId === undefined ||
          request.body?.replacementId === null ||
          request.body?.replacementId === ""
            ? undefined
            : Number(request.body.replacementId)
      });

      response.json(result);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка удаления номенклатуры"
      });
    }
  };
}