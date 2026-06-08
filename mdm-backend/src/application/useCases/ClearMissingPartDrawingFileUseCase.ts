import type { PartDrawingFile } from "../../domain/entities/PartDrawingFile";
import type { DrawingFileStorage } from "../../domain/repositories/DrawingFileStorage";
import type { PartDrawingFileRepository } from "../../domain/repositories/PartDrawingFileRepository";
import type { PartRepository } from "../../domain/repositories/PartRepository";

export type ClearMissingPartDrawingFileResult = {
  partId: number;
  deleted: boolean;
  deletedFile: PartDrawingFile | null;
};

export class ClearMissingPartDrawingFileUseCase {
  constructor(
    private readonly partRepository: PartRepository,
    private readonly partDrawingFileRepository: PartDrawingFileRepository,
    private readonly drawingFileStorage: DrawingFileStorage
  ) {}

  async execute(partId: number): Promise<ClearMissingPartDrawingFileResult> {
    if (!Number.isInteger(partId) || partId <= 0) {
      throw new Error("Некорректный идентификатор детали");
    }

    const part = await this.partRepository.findById(partId);

    if (!part) {
      throw new Error("Деталь не найдена");
    }

    const file = await this.partDrawingFileRepository.findByPartId(partId);

    if (!file) {
      return {
        partId,
        deleted: false,
        deletedFile: null
      };
    }

    const fileExists = await this.drawingFileStorage.exists(file.storagePath);

    if (fileExists) {
      throw new Error(
        "Файл чертежа существует на сервере. Очистка записи не требуется"
      );
    }

    const deletedFile =
      await this.partDrawingFileRepository.deleteByPartId(partId);

    return {
      partId,
      deleted: Boolean(deletedFile),
      deletedFile
    };
  }
}
