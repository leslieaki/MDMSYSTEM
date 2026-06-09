import type {
  StockMovement,
  StockMovementType
} from "../../domain/entities/StockMovement";
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
    private readonly stockMovementRepository: StockMovementRepository
  ) {}

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

    if (type === "transfer") {
      if (!fromLocation || !toLocation) {
        throw new Error("Для перемещения нужно указать склад-источник и склад-получатель");
      }

      if (fromLocation.toLowerCase() === toLocation.toLowerCase()) {
        throw new Error("Склад-источник и склад-получатель не должны совпадать");
      }
    }

    if (!employee) {
      throw new Error("Не указан пользователь, выполняющий операцию");
    }

    if (!reason) {
      throw new Error("Не указано основание складского движения");
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
