import type { Part } from "../entities/Part";

export type CreatePartRecord = Omit<Part, "id">;

export type UpdatePartRecord = Omit<Part, "id">;

export interface PartRepository {
  findAll(): Promise<Part[]>;
  findById(id: number): Promise<Part | null>;
  findByCode(code: string): Promise<Part | null>;
  create(part: CreatePartRecord): Promise<Part>;
  update(id: number, part: UpdatePartRecord): Promise<Part>;
  increaseStock(partId: number, quantity: number): Promise<Part>;
}