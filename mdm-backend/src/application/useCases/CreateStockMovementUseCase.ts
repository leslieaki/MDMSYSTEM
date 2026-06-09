import type {
  StockMovement,
  StockMovementType
} from "../../domain/entities/StockMovement";
import type { ReferenceKind } from "../../domain/entities/ReferenceItem";
import type { ReferenceRepository } from "../../domain/repositories/ReferenceRepository";
import type { StockMovementRepository } from "../../domain/repositories/StockMovementRepository";

type CreateStockMovementInput = {
  partId: number;
  type: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  reason: string;
  employee: string;
};

const allowedMovementTypes = new Set<StockMovementType>([
  "receipt",
  "write_off",
  "transfer",
  "inventory",
  "adjustment"
]);

function isStockMovementType(value: string): value is StockMovementType {
  return allowedMovementTypes.has(value as StockMovementType);
}

export class CreateStockMovementUseCase {
  constructor(
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly referenceRepository: ReferenceRepository
  ) {}

  private async ensureReferenceExists(
    kind: ReferenceKind,
    name: string,
    errorMessage: string
  ): Promise<void> {
    const item = await this.referenceRepository.findByName(kind, name);

    if (!item) {
      throw new Error(errorMessage);
    }
  }

  async execute(input: CreateStockMovementInput): Promise<StockMovement> {
    const type = input.type.trim();
    const employee = input.employee.trim();
    const fromLocation = input.fromLocation.trim();
    const toLocation = input.toLocation.trim();
    const reason = input.reason.trim();

    if (!isStockMovementType(type)) {
      throw new Error("Некорректный тип складского движения");
    }

    if (!Number.isInteger(input.partId) || input.partId <= 0) {
      throw new Error("Некорректный идентификатор детали");
    }

    if (!Number.isInteger(input.quantity)) {
      throw new Error("Количество должно быть целым числом");
    }

    if (type === "inventory") {
      if (input.quantity < 0) {
        throw new Error("Остаток по инвентаризации не может быть отрицательным");
      }
    } else if (input.quantity <= 0) {
      throw new Error("Количество должно быть больше нуля");
    }

    if (!employee) {
      throw new Error("Не указан пользователь, выполняющий операцию");
    }

    if (!reason) {
      throw new Error("Выберите основание складского движения из справочника");
    }

    await this.ensureReferenceExists(
      "stock-movement-reasons",
      reason,
      "Основание складского движения отсутствует в справочнике НСИ"
    );

    if (type === "receipt") {
      if (!toLocation) {
        throw new Error("Выберите склад-получатель из справочника");
      }

      await this.ensureReferenceExists(
        "warehouses",
        toLocation,
        "Склад-получатель отсутствует в справочнике НСИ"
      );
    }

    if (type === "write_off") {
      if (!fromLocation) {
        throw new Error("Выберите склад-источник из справочника");
      }

      await this.ensureReferenceExists(
        "warehouses",
        fromLocation,
        "Склад-источник отсутствует в справочнике НСИ"
      );
    }

    if (type === "transfer") {
      if (!fromLocation || !toLocation) {
        throw new Error("Выберите склад-источник и склад-получатель из справочника");
      }

      if (fromLocation.toLowerCase() === toLocation.toLowerCase()) {
        throw new Error("Склад-источник и склад-получатель не должны совпадать");
      }

      await this.ensureReferenceExists(
        "warehouses",
        fromLocation,
        "Склад-источник отсутствует в справочнике НСИ"
      );

      await this.ensureReferenceExists(
        "warehouses",
        toLocation,
        "Склад-получатель отсутствует в справочнике НСИ"
      );
    }

    if (type === "inventory" || type === "adjustment") {
      if (!toLocation) {
        throw new Error("Выберите склад проведения операции из справочника");
      }

      await this.ensureReferenceExists(
        "warehouses",
        toLocation,
        "Склад проведения операции отсутствует в справочнике НСИ"
      );
    }

    return this.stockMovementRepository.create({
      partId: input.partId,
      type,
      quantity: input.quantity,
      fromLocation,
      toLocation,
      reason,
      employee
    });
  }
}
