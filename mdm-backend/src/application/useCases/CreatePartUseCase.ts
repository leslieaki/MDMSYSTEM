import type { Part } from "../../domain/entities/Part";
import type { PartRepository } from "../../domain/repositories/PartRepository";
import type { PartNomenclatureRepository } from "../../domain/repositories/PartNomenclatureRepository";
import type { ReferenceRepository } from "../../domain/repositories/ReferenceRepository";

type CreatePartInput = {
  nomenclatureId: number;
  supplier: string;
  unit: string;
  weight: number;
  stock: number;
  minStock: number;
};

export class CreatePartUseCase {
  constructor(
    private readonly partRepository: PartRepository,
    private readonly partNomenclatureRepository: PartNomenclatureRepository,
    private readonly referenceRepository: ReferenceRepository
  ) {}

  async execute(input: CreatePartInput): Promise<Part> {
    if (!Number.isInteger(input.nomenclatureId) || input.nomenclatureId <= 0) {
      throw new Error("Не выбрана номенклатура детали");
    }

    const supplier = input.supplier.trim();
    const unit = input.unit.trim();

    if (!supplier) {
      throw new Error("Не выбран поставщик");
    }

    if (!unit) {
      throw new Error("Не выбрана единица измерения");
    }

    if (!Number.isFinite(input.weight) || input.weight < 0) {
      throw new Error("Вес должен быть числом больше или равным нулю");
    }

    if (!Number.isInteger(input.stock) || input.stock < 0) {
      throw new Error("Остаток должен быть целым числом больше или равным нулю");
    }

    if (!Number.isInteger(input.minStock) || input.minStock < 0) {
      throw new Error(
        "Минимальный остаток должен быть целым числом больше или равным нулю"
      );
    }

    const nomenclature = await this.partNomenclatureRepository.findById(
      input.nomenclatureId
    );

    if (!nomenclature) {
      throw new Error("Номенклатура детали не найдена");
    }

    const existingPart = await this.partRepository.findByCode(
      nomenclature.code
    );

    if (existingPart) {
      throw new Error("Деталь с выбранной номенклатурой уже существует");
    }

    const supplierReference = await this.referenceRepository.findByName(
      "suppliers",
      supplier
    );

    if (!supplierReference) {
      throw new Error(
        `Поставщик "${supplier}" отсутствует в утвержденном справочнике`
      );
    }

    const unitReference = await this.referenceRepository.findByName(
      "measurement-units",
      unit
    );

    if (!unitReference) {
      throw new Error(
        `Единица измерения "${unit}" отсутствует в утвержденном справочнике`
      );
    }

    return this.partRepository.create({
      nomenclatureId: nomenclature.id,
      code: nomenclature.code,
      name: nomenclature.name,
      category: nomenclature.category,
      material: nomenclature.material,
      unit,
      weight: input.weight,
      stock: input.stock,
      minStock: input.minStock,
      drawing: nomenclature.drawing,
      supplier
    });
  }
}