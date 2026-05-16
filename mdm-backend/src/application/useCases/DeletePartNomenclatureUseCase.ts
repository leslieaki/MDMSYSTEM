import type {
  DeletePartNomenclatureResult,
  PartNomenclatureRepository
} from "../../domain/repositories/PartNomenclatureRepository";

type DeletePartNomenclatureInput = {
  id: number;
  replacementId?: number;
};

export class DeletePartNomenclatureUseCase {
  constructor(
    private readonly partNomenclatureRepository: PartNomenclatureRepository
  ) {}

  async execute(
    input: DeletePartNomenclatureInput
  ): Promise<DeletePartNomenclatureResult> {
    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new Error("Некорректный идентификатор номенклатуры");
    }

    if (
      input.replacementId !== undefined &&
      (!Number.isInteger(input.replacementId) || input.replacementId <= 0)
    ) {
      throw new Error("Некорректная номенклатура для замены");
    }

    return this.partNomenclatureRepository.delete(input.id, {
      replacementId: input.replacementId
    });
  }
}