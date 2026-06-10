import type { NomenclatureRequest } from "../../domain/entities/NomenclatureRequest";
import type { NomenclatureRequestRepository } from "../../domain/repositories/NomenclatureRequestRepository";

export class SubmitNomenclatureRequestUseCase {
  constructor(
    private readonly nomenclatureRequestRepository: NomenclatureRequestRepository
  ) {}

  async execute(id: number): Promise<NomenclatureRequest> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Некорректный идентификатор заявки НСИ");
    }

    return this.nomenclatureRequestRepository.submit(id);
  }
}
