import type { NomenclatureRequest } from "../../domain/entities/NomenclatureRequest";
import type { NomenclatureRequestRepository } from "../../domain/repositories/NomenclatureRequestRepository";

export class ApproveNomenclatureRequestUseCase {
  constructor(
    private readonly nomenclatureRequestRepository: NomenclatureRequestRepository
  ) {}

  async execute(id: number, reviewedBy: string): Promise<NomenclatureRequest> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Некорректный идентификатор заявки НСИ");
    }

    const reviewer = reviewedBy.trim();

    if (!reviewer) {
      throw new Error("Не определен согласующий пользователь");
    }

    return this.nomenclatureRequestRepository.approve(id, reviewer);
  }
}
