import type {
  NomenclatureRequest,
  NomenclatureRequestType
} from "../../domain/entities/NomenclatureRequest";
import type { ReferenceKind } from "../../domain/entities/ReferenceItem";
import type { NomenclatureRequestRepository } from "../../domain/repositories/NomenclatureRequestRepository";
import type { PartNomenclatureRepository } from "../../domain/repositories/PartNomenclatureRepository";
import type { ReferenceRepository } from "../../domain/repositories/ReferenceRepository";

type CreateNomenclatureRequestInput = {
  requestType: string;
  targetNomenclatureId: number | null;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
  comment: string;
  createdBy: string;
  createdByRole: string;
};

const allowedRequestTypes = new Set<NomenclatureRequestType>([
  "create",
  "update"
]);

function isNomenclatureRequestType(
  value: string
): value is NomenclatureRequestType {
  return allowedRequestTypes.has(value as NomenclatureRequestType);
}

export class CreateNomenclatureRequestUseCase {
  constructor(
    private readonly nomenclatureRequestRepository: NomenclatureRequestRepository,
    private readonly partNomenclatureRepository: PartNomenclatureRepository,
    private readonly referenceRepository: ReferenceRepository
  ) {}

  async execute(
    input: CreateNomenclatureRequestInput
  ): Promise<NomenclatureRequest> {
    const requestType = input.requestType.trim();
    const code = input.code.trim();
    const name = input.name.trim();
    const category = input.category.trim();
    const material = input.material.trim();
    const drawing = input.drawing.trim();
    const comment = input.comment.trim();
    const createdBy = input.createdBy.trim();
    const createdByRole = input.createdByRole.trim();

    if (!isNomenclatureRequestType(requestType)) {
      throw new Error("Некорректный тип заявки НСИ");
    }

    if (!code) {
      throw new Error("Не указан код номенклатуры");
    }

    if (!name) {
      throw new Error("Не указано наименование номенклатуры");
    }

    if (!category) {
      throw new Error("Выберите категорию из справочника НСИ");
    }

    if (!material) {
      throw new Error("Выберите материал из справочника НСИ");
    }

    if (!drawing) {
      throw new Error("Не указан номер чертежа");
    }

    if (!createdBy) {
      throw new Error("Не определен автор заявки");
    }

    await this.ensureReferenceExists("part-categories", category);
    await this.ensureReferenceExists("materials", material);

    if (requestType === "create") {
      if (input.targetNomenclatureId !== null) {
        throw new Error("Для создания номенклатуры не выбирается существующая позиция");
      }

      const sameCode = await this.partNomenclatureRepository.findByCode(code);

      if (sameCode) {
        throw new Error("Номенклатура с таким кодом уже существует");
      }

      const sameDrawing =
        await this.partNomenclatureRepository.findByDrawing(drawing);

      if (sameDrawing) {
        throw new Error("Номенклатура с таким номером чертежа уже существует");
      }
    }

    if (requestType === "update") {
      if (
        !Number.isInteger(input.targetNomenclatureId) ||
        !input.targetNomenclatureId ||
        input.targetNomenclatureId <= 0
      ) {
        throw new Error("Выберите номенклатуру для изменения");
      }

      const target = await this.partNomenclatureRepository.findById(
        input.targetNomenclatureId
      );

      if (!target) {
        throw new Error("Изменяемая номенклатура не найдена");
      }

      const sameCode = await this.partNomenclatureRepository.findByCode(code);

      if (sameCode && sameCode.id !== input.targetNomenclatureId) {
        throw new Error("Номенклатура с таким кодом уже существует");
      }

      const sameDrawing =
        await this.partNomenclatureRepository.findByDrawing(drawing);

      if (sameDrawing && sameDrawing.id !== input.targetNomenclatureId) {
        throw new Error("Номенклатура с таким номером чертежа уже существует");
      }
    }

    return this.nomenclatureRequestRepository.createDraft({
      requestType,
      targetNomenclatureId: input.targetNomenclatureId,
      code,
      name,
      category,
      material,
      drawing,
      comment,
      createdBy,
      createdByRole
    });
  }

  private async ensureReferenceExists(
    kind: ReferenceKind,
    name: string
  ): Promise<void> {
    const item = await this.referenceRepository.findByName(kind, name);

    if (!item) {
      throw new Error(`Значение "${name}" отсутствует в справочнике НСИ`);
    }
  }
}
