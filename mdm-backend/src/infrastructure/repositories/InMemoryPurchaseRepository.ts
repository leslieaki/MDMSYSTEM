import type { Purchase } from "../../domain/entities/Purchase";
import type {
  CreatePurchaseRecord,
  PurchaseRepository
} from "../../domain/repositories/PurchaseRepository";
import { purchases } from "../data/seedData";

export class InMemoryPurchaseRepository implements PurchaseRepository {
  async findAll(): Promise<Purchase[]> {
    return [...purchases].sort((left, right) => right.id - left.id);
  }

  async create(purchase: CreatePurchaseRecord): Promise<Purchase> {
    const nextId =
      purchases.length === 0
        ? 1
        : Math.max(...purchases.map((item) => item.id)) + 1;

    const createdPurchase: Purchase = {
      id: nextId,
      ...purchase
    };

    purchases.unshift(createdPurchase);

    return createdPurchase;
  }
}