import type { PartDrawingFile } from "../../domain/entities/PartDrawingFile";
import type { DrawingFileStorage } from "../../domain/repositories/DrawingFileStorage";
import type { PartDrawingFileRepository } from "../../domain/repositories/PartDrawingFileRepository";
import type { PartRepository } from "../../domain/repositories/PartRepository";

type UploadPartDrawingFileInput = {
  partId: number;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  uploadedBy: string;
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const maxFileSizeBytes = 25 * 1024 * 1024;

export class UploadPartDrawingFileUseCase {
  constructor(
    private readonly partRepository: PartRepository,
    private readonly partDrawingFileRepository: PartDrawingFileRepository,
    private readonly drawingFileStorage: DrawingFileStorage
  ) {}

  async execute(input: UploadPartDrawingFileInput): Promise<PartDrawingFile> {
    if (!Number.isInteger(input.partId) || input.partId <= 0) {
      throw new Error("Некорректный идентификатор детали");
    }

    const part = await this.partRepository.findById(input.partId);

    if (!part) {
      throw new Error("Деталь не найдена");
    }

    if (!allowedMimeTypes.has(input.mimeType)) {
      throw new Error("Можно загрузить только изображение JPG, PNG, WEBP или GIF");
    }

    if (!Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
      throw new Error("Файл изображения не получен");
    }

    if (input.buffer.length > maxFileSizeBytes) {
      throw new Error("Размер изображения не должен превышать 25 МБ");
    }

    const originalName = input.originalName.trim() || `drawing-${input.partId}`;
    const uploadedBy = input.uploadedBy.trim() || "Неизвестный пользователь";

    const savedFile = await this.drawingFileStorage.save({
      partId: input.partId,
      originalName,
      mimeType: input.mimeType,
      buffer: input.buffer
    });

    try {
      const result = await this.partDrawingFileRepository.replaceForPart({
        partId: input.partId,
        originalName: savedFile.originalName,
        storedName: savedFile.storedName,
        storagePath: savedFile.storagePath,
        mimeType: input.mimeType,
        sizeBytes: savedFile.sizeBytes,
        uploadedBy
      });

      if (result.previousFile) {
        await this.drawingFileStorage.delete(result.previousFile.storagePath);
      }

      return result.file;
    } catch (error) {
      await this.drawingFileStorage.delete(savedFile.storagePath);
      throw error;
    }
  }
}