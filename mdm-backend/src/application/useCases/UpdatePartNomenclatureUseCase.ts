import type { PartNomenclature } from "../../domain/entities/PartNomenclature";
import type { ReferenceKind } from "../../domain/entities/ReferenceItem";
import type { PartNomenclatureRepository } from "../../domain/repositories/PartNomenclatureRepository";
import type { ReferenceRepository } from "../../domain/repositories/ReferenceRepository";

type UpdatePartNomenclatureInput = {
  id: number;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
};

export class UpdatePartNomenclatureUseCase {
  constructor(
    private readonly partNomenclatureRepository: PartNomenclatureRepository,
    private readonly referenceRepository: ReferenceRepository
  ) {}

  async execute(input: UpdatePartNomenclatureInput): Promise<PartNomenclature> {
    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new Error("Некорректный идентификатор номенклатуры");
    }

    const code = input.code.trim();
    const name = input.name.trim();
    const category = input.category.trim();
    const material = input.material.trim();
    const drawing = input.drawing.trim();

    if (!code) {
      throw new Error("Не указан код номенклатуры");
    }

    if (!name) {
      throw new Error("Не указано наименование номенклатуры");
    }

    if (!category) {
      throw new Error("Не выбрана категория");
    }

    if (!material) {
      throw new Error("Не выбран материал");
    }

    if (!drawing) {
      throw new Error("Не указан номер чертежа");
    }

    const currentItem = await this.partNomenclatureRepository.findById(input.id);

    if (!currentItem) {
      throw new Error("Номенклатура не найдена");
    }

    const itemWithSameCode =
      await this.partNomenclatureRepository.findByCode(code);

    if (itemWithSameCode && itemWithSameCode.id !== input.id) {
      throw new Error("Номенклатура с таким кодом уже существует");
    }

    const itemWithSameDrawing =
      await this.partNomenclatureRepository.findByDrawing(drawing);

    if (itemWithSameDrawing && itemWithSameDrawing.id !== input.id) {
      throw new Error("Номенклатура с таким номером чертежа уже существует");
    }

    await this.ensureReferenceExists("part-categories", category);
    await this.ensureReferenceExists("materials", material);

    return this.partNomenclatureRepository.update(input.id, {
      code,
      name,
      category,
      material,
      drawing
    });
  }

  private async ensureReferenceExists(
    kind: ReferenceKind,
    name: string
  ): Promise<void> {
    const referenceItem = await this.referenceRepository.findByName(kind, name);

    if (!referenceItem) {
      throw new Error(
        `Значение "${name}" отсутствует в утвержденном справочнике`
      );
    }
  }
}