import type {
  ReferenceItem,
  ReferenceKind
} from "../../domain/entities/ReferenceItem";
import type { ReferenceRepository } from "../../domain/repositories/ReferenceRepository";

export class GetReferenceItemsUseCase {
  constructor(private readonly referenceRepository: ReferenceRepository) {}

  async execute(kind: ReferenceKind): Promise<ReferenceItem[]> {
    return this.referenceRepository.findAll(kind);
  }
}