import type { Request, Response } from "express";
import type { ApproveNomenclatureRequestUseCase } from "../../../application/useCases/ApproveNomenclatureRequestUseCase";
import type { CreateNomenclatureRequestUseCase } from "../../../application/useCases/CreateNomenclatureRequestUseCase";
import type { GetNomenclatureRequestsUseCase } from "../../../application/useCases/GetNomenclatureRequestsUseCase";
import type { RejectNomenclatureRequestUseCase } from "../../../application/useCases/RejectNomenclatureRequestUseCase";
import type { SubmitNomenclatureRequestUseCase } from "../../../application/useCases/SubmitNomenclatureRequestUseCase";
import type { AuthenticatedRequest } from "../auth";

function parseId(value: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Некорректный идентификатор заявки НСИ");
  }

  return id;
}

export class NomenclatureRequestsController {
  constructor(
    private readonly getNomenclatureRequestsUseCase: GetNomenclatureRequestsUseCase,
    private readonly createNomenclatureRequestUseCase: CreateNomenclatureRequestUseCase,
    private readonly submitNomenclatureRequestUseCase: SubmitNomenclatureRequestUseCase,
    private readonly approveNomenclatureRequestUseCase: ApproveNomenclatureRequestUseCase,
    private readonly rejectNomenclatureRequestUseCase: RejectNomenclatureRequestUseCase
  ) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const requests = await this.getNomenclatureRequestsUseCase.execute();

      response.json(requests);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения заявок НСИ"
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

      const targetRawValue = request.body.targetNomenclatureId;
      const targetNomenclatureId =
        targetRawValue === undefined ||
        targetRawValue === null ||
        targetRawValue === ""
          ? null
          : Number(targetRawValue);

      const createdRequest =
        await this.createNomenclatureRequestUseCase.execute({
          requestType: String(request.body.requestType ?? ""),
          targetNomenclatureId,
          code: String(request.body.code ?? ""),
          name: String(request.body.name ?? ""),
          category: String(request.body.category ?? ""),
          material: String(request.body.material ?? ""),
          drawing: String(request.body.drawing ?? ""),
          comment: String(request.body.comment ?? ""),
          createdBy: authUser.displayName,
          createdByRole: authUser.role
        });

      response.status(201).json(createdRequest);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка создания заявки НСИ"
      });
    }
  };

  submit = async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await this.submitNomenclatureRequestUseCase.execute(
        parseId(request.params.id)
      );

      response.json(result);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка отправки заявки НСИ на согласование"
      });
    }
  };

  approve = async (request: Request, response: Response): Promise<void> => {
    try {
      const authUser = (request as AuthenticatedRequest).authUser;

      if (!authUser) {
        response.status(401).json({
          message: "Требуется авторизация"
        });
        return;
      }

      const result = await this.approveNomenclatureRequestUseCase.execute(
        parseId(request.params.id),
        authUser.displayName
      );

      response.json(result);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка согласования заявки НСИ"
      });
    }
  };

  reject = async (request: Request, response: Response): Promise<void> => {
    try {
      const authUser = (request as AuthenticatedRequest).authUser;

      if (!authUser) {
        response.status(401).json({
          message: "Требуется авторизация"
        });
        return;
      }

      const result = await this.rejectNomenclatureRequestUseCase.execute(
        parseId(request.params.id),
        authUser.displayName,
        String(request.body.rejectReason ?? "")
      );

      response.json(result);
    } catch (error) {
      response.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка отклонения заявки НСИ"
      });
    }
  };
}
