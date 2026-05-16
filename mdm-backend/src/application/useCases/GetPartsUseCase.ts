import type { Part } from "../../domain/entities/Part";
import type { PartRepository } from "../../domain/repositories/PartRepository";

export class GetPartsUseCase {
  constructor(private readonly partRepository: PartRepository) {}

  async execute(): Promise<Part[]> {
    return this.partRepository.findAll();
  }
}