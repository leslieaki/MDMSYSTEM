import type { PartDrawingFile } from "../entities/PartDrawingFile";

export type CreatePartDrawingFileRecord = Omit<
  PartDrawingFile,
  "id" | "uploadedAt"
>;

export type ReplacePartDrawingFileResult = {
  file: PartDrawingFile;
  previousFile: PartDrawingFile | null;
};

export interface PartDrawingFileRepository {
  findAll(): Promise<PartDrawingFile[]>;
  findByPartId(partId: number): Promise<PartDrawingFile | null>;
  replaceForPart(
    file: CreatePartDrawingFileRecord
  ): Promise<ReplacePartDrawingFileResult>;
  deleteByPartId(partId: number): Promise<PartDrawingFile | null>;
}