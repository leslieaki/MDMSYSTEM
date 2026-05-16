import type {
  ReferenceItem,
  ReferenceKind
} from "../../domain/entities/ReferenceItem";
import type { ReferenceRepository } from "../../domain/repositories/ReferenceRepository";

type CreateReferenceItemInput = {
  name: string;
  description?: string;
};

export class CreateReferenceItemUseCase {
  constructor(private readonly referenceRepository: ReferenceRepository) {}

  async execute(
    kind: ReferenceKind,
    input: CreateReferenceItemInput
  ): Promise<ReferenceItem> {
    const name = input.name.trim();
    const description = input.description?.trim() || "";

    if (!name) {
      throw new Error("Не указано название записи справочника");
    }

    const existingItem = await this.referenceRepository.findByName(kind, name);

    if (existingItem) {
      throw new Error("Такая запись справочника уже существует");
    }

    return this.referenceRepository.create(kind, {
      name,
      description
    });
  }
}