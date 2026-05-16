import type { ReferenceKind } from "../../domain/entities/ReferenceItem";
import type {
  DeleteReferenceItemResult,
  ReferenceRepository
} from "../../domain/repositories/ReferenceRepository";

type DeleteReferenceItemInput = {
  id: number;
  replacementName?: string;
};

export class DeleteReferenceItemUseCase {
  constructor(private readonly referenceRepository: ReferenceRepository) {}

  async execute(
    kind: ReferenceKind,
    input: DeleteReferenceItemInput
  ): Promise<DeleteReferenceItemResult> {
    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new Error("Некорректный идентификатор записи справочника");
    }

    return this.referenceRepository.delete(kind, input.id, {
      replacementName: input.replacementName?.trim() || undefined
    });
  }
}