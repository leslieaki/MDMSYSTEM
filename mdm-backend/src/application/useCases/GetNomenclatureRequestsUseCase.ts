import type { NomenclatureRequest } from "../../domain/entities/NomenclatureRequest";
import type { NomenclatureRequestRepository } from "../../domain/repositories/NomenclatureRequestRepository";

export class GetNomenclatureRequestsUseCase {
  constructor(
    private readonly nomenclatureRequestRepository: NomenclatureRequestRepository
  ) {}

  async execute(): Promise<NomenclatureRequest[]> {
    return this.nomenclatureRequestRepository.findAll();
  }
}
