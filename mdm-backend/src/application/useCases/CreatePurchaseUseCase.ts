import type { Purchase } from "../../domain/entities/Purchase";
import type { PartRepository } from "../../domain/repositories/PartRepository";
import type { PurchaseRepository } from "../../domain/repositories/PurchaseRepository";

type CreatePurchaseInput = {
  partId: number;
  quantity: number;
  price: number;
  employee: string;
};

export class CreatePurchaseUseCase {
  constructor(
    private readonly partRepository: PartRepository,
    private readonly purchaseRepository: PurchaseRepository
  ) {}

  async execute(input: CreatePurchaseInput): Promise<Purchase> {
    const employee = input.employee.trim();

    if (!employee) {
      throw new Error("Не указан сотрудник");
    }

    if (!Number.isInteger(input.partId) || input.partId <= 0) {
      throw new Error("Некорректный идентификатор детали");
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new Error("Количество должно быть больше нуля");
    }

    if (!Number.isFinite(input.price) || input.price < 0) {
      throw new Error("Цена должна быть числом больше или равным нулю");
    }

    const part = await this.partRepository.findById(input.partId);

    if (!part) {
      throw new Error("Деталь не найдена в справочнике");
    }

    return this.purchaseRepository.createAndIncreasePartStock(
      {
        rawName: `${part.name} · ${input.quantity} ${part.unit}`,
        partId: part.id,
        quantity: input.quantity,
        price: input.price,
        total: input.price * input.quantity,
        supplier: part.supplier,
        employee,
        date: new Date().toISOString().slice(0, 10)
      },
      part.id,
      input.quantity
    );
  }
}
