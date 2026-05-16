import type {
  ReferenceItem,
  ReferenceKind
} from "../entities/ReferenceItem";

export type CreateReferenceItemRecord = {
  name: string;
  description: string;
};

export type UpdateReferenceItemRecord = {
  name: string;
  description: string;
};

export type DeleteReferenceItemOptions = {
  replacementName?: string;
};

export type DeleteReferenceItemResult = {
  deletedItem: ReferenceItem;
  replacementItem: ReferenceItem | null;
  affectedParts: number;
  affectedNomenclature: number;
  affectedPurchases: number;
};

export interface ReferenceRepository {
  findAll(kind: ReferenceKind): Promise<ReferenceItem[]>;
  findById(kind: ReferenceKind, id: number): Promise<ReferenceItem | null>;
  findByName(kind: ReferenceKind, name: string): Promise<ReferenceItem | null>;

  create(
    kind: ReferenceKind,
    item: CreateReferenceItemRecord
  ): Promise<ReferenceItem>;

  update(
    kind: ReferenceKind,
    id: number,
    item: UpdateReferenceItemRecord
  ): Promise<ReferenceItem>;

  delete(
    kind: ReferenceKind,
    id: number,
    options?: DeleteReferenceItemOptions
  ): Promise<DeleteReferenceItemResult>;
}