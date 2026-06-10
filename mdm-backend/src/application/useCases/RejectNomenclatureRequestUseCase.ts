import type { NomenclatureRequest } from "../../domain/entities/NomenclatureRequest";
import type { NomenclatureRequestRepository } from "../../domain/repositories/NomenclatureRequestRepository";

export class RejectNomenclatureRequestUseCase {
  constructor(
    private readonly nomenclatureRequestRepository: NomenclatureRequestRepository
  ) {}

  async execute(
    id: number,
    reviewedBy: string,
    rejectReason: string
  ): Promise<NomenclatureRequest> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Некорректный идентификатор заявки НСИ");
    }

    const reviewer = reviewedBy.trim();
    const reason = rejectReason.trim();

    if (!reviewer) {
      throw new Error("Не определен согласующий пользователь");
    }

    if (!reason) {
      throw new Error("Укажите причину отклонения заявки");
    }

    return this.nomenclatureRequestRepository.reject(id, reviewer, reason);
  }
}
