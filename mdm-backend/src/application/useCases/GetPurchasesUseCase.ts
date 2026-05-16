import type { Purchase } from "../../domain/entities/Purchase";
import type { PurchaseRepository } from "../../domain/repositories/PurchaseRepository";

export class GetPurchasesUseCase {
  constructor(private readonly purchaseRepository: PurchaseRepository) {}

  async execute(): Promise<Purchase[]> {
    return this.purchaseRepository.findAll();
  }
}
