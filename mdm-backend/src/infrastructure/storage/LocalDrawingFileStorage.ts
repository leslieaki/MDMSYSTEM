import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  DrawingFileStorage,
  SaveDrawingFileInput,
  SavedDrawingFile
} from "../../domain/repositories/DrawingFileStorage";

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

function sanitizeOriginalName(value: string): string {
  const baseName = path.basename(value || "drawing").trim();
  const safeName = baseName.replace(/[^a-zA-Zа-яА-ЯёЁ0-9._ -]/g, "_");

  return safeName.slice(0, 255) || "drawing";
}

function isPathInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, filePath);

  return (
    Boolean(relativePath) &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}

export class LocalDrawingFileStorage implements DrawingFileStorage {
  private readonly uploadDirectory: string;

  constructor(
    uploadDirectory = path.resolve(process.cwd(), "uploads", "drawings")
  ) {
    this.uploadDirectory = uploadDirectory;
  }

  async save(input: SaveDrawingFileInput): Promise<SavedDrawingFile> {
    const extension = extensionByMimeType[input.mimeType];

    if (!extension) {
      throw new Error("Неподдерживаемый тип изображения");
    }

    await fs.mkdir(this.uploadDirectory, { recursive: true });

    const originalName = sanitizeOriginalName(input.originalName);
    const storedName = `part-${input.partId}-${Date.now()}-${randomUUID()}.${extension}`;
    const storagePath = path.join(this.uploadDirectory, storedName);

    await fs.writeFile(storagePath, input.buffer);

    return {
      originalName,
      storedName,
      storagePath,
      sizeBytes: input.buffer.length
    };
  }

  async delete(storagePath: string): Promise<void> {
    const resolvedPath = path.resolve(storagePath);
    const resolvedUploadDirectory = path.resolve(this.uploadDirectory);

    if (!isPathInsideDirectory(resolvedPath, resolvedUploadDirectory)) {
      return;
    }

    await fs.rm(resolvedPath, { force: true });
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await fs.access(storagePath);
      return true;
    } catch {
      return false;
    }
  }
}