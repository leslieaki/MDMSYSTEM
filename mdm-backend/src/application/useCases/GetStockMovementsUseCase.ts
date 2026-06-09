import type { StockMovement } from "../../domain/entities/StockMovement";
import type { StockMovementRepository } from "../../domain/repositories/StockMovementRepository";

export class GetStockMovementsUseCase {
  constructor(
    private readonly stockMovementRepository: StockMovementRepository
  ) {}

  async execute(): Promise<StockMovement[]> {
    return this.stockMovementRepository.findAll();
  }
}
