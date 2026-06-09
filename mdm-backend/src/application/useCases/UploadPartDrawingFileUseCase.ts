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

function startsWithBytes(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => buffer[index] === byte);
}

function isValidJpeg(buffer: Buffer): boolean {
  return startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
}

function isValidPng(buffer: Buffer): boolean {
  return startsWithBytes(buffer, [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a
  ]);
}

function isValidGif(buffer: Buffer): boolean {
  const signature = buffer.subarray(0, 6).toString("ascii");

  return signature === "GIF87a" || signature === "GIF89a";
}

function isValidWebp(buffer: Buffer): boolean {
  if (buffer.length < 12) {
    return false;
  }

  return (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function isValidImageContent(mimeType: string, buffer: Buffer): boolean {
  if (mimeType === "image/jpeg") {
    return isValidJpeg(buffer);
  }

  if (mimeType === "image/png") {
    return isValidPng(buffer);
  }

  if (mimeType === "image/webp") {
    return isValidWebp(buffer);
  }

  if (mimeType === "image/gif") {
    return isValidGif(buffer);
  }

  return false;
}

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

    if (!isValidImageContent(input.mimeType, input.buffer)) {
      throw new Error("Содержимое файла не соответствует типу изображения");
    }

    const originalName = input.originalName.trim() || `drawing-${input.partId}`;
    const uploadedBy = input.uploadedBy.trim();

    if (!uploadedBy) {
      throw new Error("Не указан пользователь, загрузивший файл");
    }

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
