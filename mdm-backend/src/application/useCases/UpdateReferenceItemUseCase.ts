import type {
  ReferenceItem,
  ReferenceKind
} from "../../domain/entities/ReferenceItem";
import type { ReferenceRepository } from "../../domain/repositories/ReferenceRepository";

type UpdateReferenceItemInput = {
  id: number;
  name: string;
  description?: string;
};

export class UpdateReferenceItemUseCase {
  constructor(private readonly referenceRepository: ReferenceRepository) {}

  async execute(
    kind: ReferenceKind,
    input: UpdateReferenceItemInput
  ): Promise<ReferenceItem> {
    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new Error("Некорректный идентификатор записи справочника");
    }

    const name = input.name.trim();
    const description = input.description?.trim() || "";

    if (!name) {
      throw new Error("Не указано название записи справочника");
    }

    const currentItem = await this.referenceRepository.findById(kind, input.id);

    if (!currentItem) {
      throw new Error("Запись справочника не найдена");
    }

    const itemWithSameName = await this.referenceRepository.findByName(
      kind,
      name
    );

    if (itemWithSameName && itemWithSameName.id !== input.id) {
      throw new Error("Запись с таким названием уже существует");
    }

    return this.referenceRepository.update(kind, input.id, {
      name,
      description
    });
  }
}