import type { Request, Response } from "express";
import type { CreateReferenceItemUseCase } from "../../../application/useCases/CreateReferenceItemUseCase";
import type { DeleteReferenceItemUseCase } from "../../../application/useCases/DeleteReferenceItemUseCase";
import type { GetReferenceItemsUseCase } from "../../../application/useCases/GetReferenceItemsUseCase";
import type { UpdateReferenceItemUseCase } from "../../../application/useCases/UpdateReferenceItemUseCase";
import type { ReferenceKind } from "../../../domain/entities/ReferenceItem";

function isReferenceKind(value: string): value is ReferenceKind {
  return (
    value === "part-categories" ||
    value === "materials" ||
    value === "suppliers" ||
    value === "measurement-units"
  );
}

export class ReferencesController {
  constructor(
    private readonly getReferenceItemsUseCase: GetReferenceItemsUseCase,
    private readonly createReferenceItemUseCase: CreateReferenceItemUseCase,
    private readonly updateReferenceItemUseCase: UpdateReferenceItemUseCase,
    private readonly deleteReferenceItemUseCase: DeleteReferenceItemUseCase
  ) {}

  getAll = async (request: Request, response: Response): Promise<void> => {
    try {
      const kind = String(request.params.kind);

      if (!isReferenceKind(kind)) {
        response.status(404).json({
          message: "Справочник не найден"
        });
        return;
      }

      const items = await this.getReferenceItemsUseCase.execute(kind);

      response.json(items);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения справочника"
      });
    }
  };

  create = async (request: Request, response: Response): Promise<void> => {
    try {
      const kind = String(request.params.kind);

      if (!isReferenceKind(kind)) {
        response.status(404).json({
          message: "Справочник не найден"
        });
        return;
      }

      const item = await this.createReferenceItemUseCase.execute(kind, {
        name: String(request.body.name ?? ""),
        description: String(request.body.description ?? "")
      });

      response.status(201).json(item);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка создания записи справочника"
      });
    }
  };

  update = async (request: Request, response: Response): Promise<void> => {
    try {
      const kind = String(request.params.kind);

      if (!isReferenceKind(kind)) {
        response.status(404).json({
          message: "Справочник не найден"
        });
        return;
      }

      const item = await this.updateReferenceItemUseCase.execute(kind, {
        id: Number(request.params.id),
        name: String(request.body.name ?? ""),
        description: String(request.body.description ?? "")
      });

      response.json(item);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка обновления записи справочника"
      });
    }
  };

  remove = async (request: Request, response: Response): Promise<void> => {
    try {
      const kind = String(request.params.kind);

      if (!isReferenceKind(kind)) {
        response.status(404).json({
          message: "Справочник не найден"
        });
        return;
      }

      const result = await this.deleteReferenceItemUseCase.execute(kind, {
        id: Number(request.params.id),
        replacementName:
          request.body?.replacementName === undefined ||
          request.body?.replacementName === null ||
          request.body?.replacementName === ""
            ? undefined
            : String(request.body.replacementName)
      });

      response.json(result);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка удаления записи справочника"
      });
    }
  };
}