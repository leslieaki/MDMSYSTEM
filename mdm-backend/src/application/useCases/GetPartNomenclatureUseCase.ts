import type { PartNomenclature } from "../../domain/entities/PartNomenclature";
import type { PartNomenclatureRepository } from "../../domain/repositories/PartNomenclatureRepository";

export class GetPartNomenclatureUseCase {
  constructor(
    private readonly partNomenclatureRepository: PartNomenclatureRepository
  ) {}

  async execute(): Promise<PartNomenclature[]> {
    return this.partNomenclatureRepository.findAll();
  }
}