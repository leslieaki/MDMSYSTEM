import type { PartDrawingFile } from "../../domain/entities/PartDrawingFile";
import type { PartDrawingFileRepository } from "../../domain/repositories/PartDrawingFileRepository";

export class GetPartDrawingFilesUseCase {
  constructor(
    private readonly partDrawingFileRepository: PartDrawingFileRepository
  ) {}

  async execute(): Promise<PartDrawingFile[]> {
    return this.partDrawingFileRepository.findAll();
  }
}