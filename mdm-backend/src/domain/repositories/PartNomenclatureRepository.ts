import type { PartNomenclature } from "../entities/PartNomenclature";

export type CreatePartNomenclatureRecord = Omit<PartNomenclature, "id">;

export type UpdatePartNomenclatureRecord = Omit<PartNomenclature, "id">;

export type DeletePartNomenclatureOptions = {
  replacementId?: number;
};

export type DeletePartNomenclatureResult = {
  deletedItem: PartNomenclature;
  replacementItem: PartNomenclature | null;
  affectedParts: number;
};

export interface PartNomenclatureRepository {
  findAll(): Promise<PartNomenclature[]>;
  findById(id: number): Promise<PartNomenclature | null>;
  findByCode(code: string): Promise<PartNomenclature | null>;
  findByDrawing(drawing: string): Promise<PartNomenclature | null>;
  create(item: CreatePartNomenclatureRecord): Promise<PartNomenclature>;
  update(
    id: number,
    item: UpdatePartNomenclatureRecord
  ): Promise<PartNomenclature>;
  delete(
    id: number,
    options?: DeletePartNomenclatureOptions
  ): Promise<DeletePartNomenclatureResult>;
}