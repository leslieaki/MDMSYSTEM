import type { Request, Response } from "express";
import type { ClearMissingPartDrawingFileUseCase } from "../../../application/useCases/ClearMissingPartDrawingFileUseCase";
import type { DeletePartDrawingFileUseCase } from "../../../application/useCases/DeletePartDrawingFileUseCase";
import type { GetPartDrawingFileUseCase } from "../../../application/useCases/GetPartDrawingFileUseCase";
import type { GetPartDrawingFilesUseCase } from "../../../application/useCases/GetPartDrawingFilesUseCase";
import type { GetPartDrawingStorageIssuesUseCase } from "../../../application/useCases/GetPartDrawingStorageIssuesUseCase";
import type { PartDrawingStorageIssue } from "../../../application/useCases/GetPartDrawingStorageIssuesUseCase";
import type { UploadPartDrawingFileUseCase } from "../../../application/useCases/UploadPartDrawingFileUseCase";
import type { PartDrawingFile } from "../../../domain/entities/PartDrawingFile";
import type { AuthenticatedRequest } from "../auth";

type DrawingFileResponse = {
  id: number;
  partId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
};

type DrawingStorageIssueResponse = PartDrawingStorageIssue;

function parsePartId(value: string): number {
  const partId = Number(value);

  if (!Number.isInteger(partId) || partId <= 0) {
    throw new Error("Некорректный идентификатор детали");
  }

  return partId;
}

function getHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function decodeHeaderValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function createFileUrl(file: PartDrawingFile): string {
  return `/api/parts/${file.partId}/drawing-file?v=${encodeURIComponent(
    file.uploadedAt
  )}`;
}

function mapFileResponse(file: PartDrawingFile): DrawingFileResponse {
  return {
    id: file.id,
    partId: file.partId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt,
    url: createFileUrl(file)
  };
}

export class PartDrawingFilesController {
  constructor(
    private readonly getPartDrawingFilesUseCase: GetPartDrawingFilesUseCase,
    private readonly getPartDrawingFileUseCase: GetPartDrawingFileUseCase,
    private readonly uploadPartDrawingFileUseCase: UploadPartDrawingFileUseCase,
    private readonly deletePartDrawingFileUseCase: DeletePartDrawingFileUseCase,
    private readonly getPartDrawingStorageIssuesUseCase: GetPartDrawingStorageIssuesUseCase,
    private readonly clearMissingPartDrawingFileUseCase: ClearMissingPartDrawingFileUseCase
  ) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const files = await this.getPartDrawingFilesUseCase.execute();
      const result: Record<string, DrawingFileResponse> = {};

      files.forEach((file: PartDrawingFile) => {
        result[String(file.partId)] = mapFileResponse(file);
      });

      response.json(result);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения файлов чертежей"
      });
    }
  };

  getLegacyImageMap = async (
    _request: Request,
    response: Response
  ): Promise<void> => {
    try {
      const files = await this.getPartDrawingFilesUseCase.execute();
      const result: Record<string, string> = {};

      files.forEach((file: PartDrawingFile) => {
        result[String(file.partId)] = createFileUrl(file);
      });

      response.json(result);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения фото чертежей"
      });
    }
  };

  getStorageIssues = async (
    _request: Request,
    response: Response
  ): Promise<void> => {
    try {
      const issues = await this.getPartDrawingStorageIssuesUseCase.execute();
      const result: DrawingStorageIssueResponse[] = issues;

      response.json(result);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка проверки хранилища чертежей"
      });
    }
  };

  clearMissingRecord = async (
    request: Request,
    response: Response
  ): Promise<void> => {
    try {
      const partId = parsePartId(request.params.id);
      const result =
        await this.clearMissingPartDrawingFileUseCase.execute(partId);

      response.json({
        partId: result.partId,
        deleted: result.deleted,
        deletedFile: result.deletedFile
          ? mapFileResponse(result.deletedFile)
          : null
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ошибка очистки записи файла чертежа";

      response.status(message.includes("не найд") ? 404 : 400).json({
        message
      });
    }
  };

  getFile = async (request: Request, response: Response): Promise<void> => {
    try {
      const partId = parsePartId(request.params.id);
      const file = await this.getPartDrawingFileUseCase.execute(partId);

      response.setHeader("Content-Type", file.mimeType);
      response.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
      );

      response.sendFile(file.storagePath);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ошибка получения файла чертежа";

      response.status(message.includes("не найден") ? 404 : 400).json({
        message
      });
    }
  };

  upload = async (request: Request, response: Response): Promise<void> => {
    try {
      const authUser = (request as AuthenticatedRequest).authUser;

      if (!authUser) {
        response.status(401).json({
          message: "Требуется авторизация"
        });
        return;
      }

      const partId = parsePartId(request.params.id);
      const mimeType = getHeaderValue(request.headers["content-type"]).split(
        ";"
      )[0];
      const originalName = decodeHeaderValue(
        getHeaderValue(request.headers["x-file-name"])
      );

      if (!Buffer.isBuffer(request.body)) {
        throw new Error("Файл изображения не получен");
      }

      const file = await this.uploadPartDrawingFileUseCase.execute({
        partId,
        originalName,
        mimeType,
        buffer: request.body,
        uploadedBy: authUser.displayName
      });

      response.status(201).json(mapFileResponse(file));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ошибка загрузки файла чертежа";

      response.status(message.includes("не найдена") ? 404 : 400).json({
        message
      });
    }
  };

  remove = async (request: Request, response: Response): Promise<void> => {
    try {
      const partId = parsePartId(request.params.id);
      const deletedFile =
        await this.deletePartDrawingFileUseCase.execute(partId);

      response.json({
        partId,
        deleted: Boolean(deletedFile),
        deletedFile: deletedFile ? mapFileResponse(deletedFile) : null
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ошибка удаления файла чертежа";

      response.status(message.includes("не найдена") ? 404 : 400).json({
        message
      });
    }
  };
}
