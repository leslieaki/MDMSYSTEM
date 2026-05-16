import type { PartDrawingFile } from "../../domain/entities/PartDrawingFile";
import type { DrawingFileStorage } from "../../domain/repositories/DrawingFileStorage";
import type { PartDrawingFileRepository } from "../../domain/repositories/PartDrawingFileRepository";
import type { PartRepository } from "../../domain/repositories/PartRepository";

export class GetPartDrawingFileUseCase {
  constructor(
    private readonly partRepository: PartRepository,
    private readonly partDrawingFileRepository: PartDrawingFileRepository,
    private readonly drawingFileStorage: DrawingFileStorage
  ) {}

  async execute(partId: number): Promise<PartDrawingFile> {
    if (!Number.isInteger(partId) || partId <= 0) {
      throw new Error("Некорректный идентификатор детали");
    }

    const part = await this.partRepository.findById(partId);

    if (!part) {
      throw new Error("Деталь не найдена");
    }

    const file = await this.partDrawingFileRepository.findByPartId(partId);

    if (!file) {
      throw new Error("Фото чертежа не найдено");
    }

    const fileExists = await this.drawingFileStorage.exists(file.storagePath);

    if (!fileExists) {
      throw new Error("Файл чертежа отсутствует на сервере");
    }

    return file;
  }
}