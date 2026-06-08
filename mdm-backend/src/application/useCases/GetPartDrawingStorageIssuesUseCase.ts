import type { PartDrawingFile } from "../../domain/entities/PartDrawingFile";
import type { DrawingFileStorage } from "../../domain/repositories/DrawingFileStorage";
import type { PartDrawingFileRepository } from "../../domain/repositories/PartDrawingFileRepository";

export type PartDrawingStorageIssueType = "missing-file";

export type PartDrawingStorageIssue = {
  type: PartDrawingStorageIssueType;
  partId: number;
  fileId: number;
  originalName: string;
  storedName: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  message: string;
};

function createMissingFileIssue(file: PartDrawingFile): PartDrawingStorageIssue {
  return {
    type: "missing-file",
    partId: file.partId,
    fileId: file.id,
    originalName: file.originalName,
    storedName: file.storedName,
    storagePath: file.storagePath,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt,
    message: "В базе есть запись о файле чертежа, но файл отсутствует на сервере"
  };
}

export class GetPartDrawingStorageIssuesUseCase {
  constructor(
    private readonly partDrawingFileRepository: PartDrawingFileRepository,
    private readonly drawingFileStorage: DrawingFileStorage
  ) {}

  async execute(): Promise<PartDrawingStorageIssue[]> {
    const files = await this.partDrawingFileRepository.findAll();
    const issues: PartDrawingStorageIssue[] = [];

    for (const file of files) {
      const fileExists = await this.drawingFileStorage.exists(file.storagePath);

      if (!fileExists) {
        issues.push(createMissingFileIssue(file));
      }
    }

    return issues;
  }
}
