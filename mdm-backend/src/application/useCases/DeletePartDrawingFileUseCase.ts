import type { PartDrawingFile } from "../../domain/entities/PartDrawingFile";
import type { DrawingFileStorage } from "../../domain/repositories/DrawingFileStorage";
import type { PartDrawingFileRepository } from "../../domain/repositories/PartDrawingFileRepository";
import type { PartRepository } from "../../domain/repositories/PartRepository";

export class DeletePartDrawingFileUseCase {
  constructor(
    private readonly partRepository: PartRepository,
    private readonly partDrawingFileRepository: PartDrawingFileRepository,
    private readonly drawingFileStorage: DrawingFileStorage
  ) {}

  async execute(partId: number): Promise<PartDrawingFile | null> {
    if (!Number.isInteger(partId) || partId <= 0) {
      throw new Error("Некорректный идентификатор детали");
    }

    const part = await this.partRepository.findById(partId);

    if (!part) {
      throw new Error("Деталь не найдена");
    }

    const deletedFile = await this.partDrawingFileRepository.deleteByPartId(
      partId
    );

    if (deletedFile) {
      await this.drawingFileStorage.delete(deletedFile.storagePath);
    }

    return deletedFile;
  }
}