import type { Part } from "../../domain/entities/Part";
import type {
  CreatePartRecord,
  PartRepository,
  UpdatePartRecord
} from "../../domain/repositories/PartRepository";
import { parts } from "../data/seedData";

export class InMemoryPartRepository implements PartRepository {
  async findAll(): Promise<Part[]> {
    return parts;
  }

  async findById(id: number): Promise<Part | null> {
    return parts.find((part) => part.id === id) || null;
  }

  async findByCode(code: string): Promise<Part | null> {
    const normalizedCode = code.trim().toLowerCase();

    return (
      parts.find((part) => part.code.trim().toLowerCase() === normalizedCode) ||
      null
    );
  }

  async create(part: CreatePartRecord): Promise<Part> {
    const nextId =
      parts.length === 0 ? 1 : Math.max(...parts.map((item) => item.id)) + 1;

    const createdPart: Part = {
      id: nextId,
      ...part
    };

    parts.push(createdPart);

    return createdPart;
  }

  async update(id: number, part: UpdatePartRecord): Promise<Part> {
    const index = parts.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error("Деталь не найдена");
    }

    const updatedPart: Part = {
      id,
      ...part
    };

    parts[index] = updatedPart;

    return updatedPart;
  }

  async increaseStock(partId: number, quantity: number): Promise<Part> {
    const part = parts.find((item) => item.id === partId);

    if (!part) {
      throw new Error("Деталь не найдена");
    }

    part.stock += quantity;

    return part;
  }
}