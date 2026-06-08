import type { Purchase } from "../entities/Purchase";

export type CreatePurchaseRecord = Omit<Purchase, "id">;

export interface PurchaseRepository {
  findAll(): Promise<Purchase[]>;
  create(purchase: CreatePurchaseRecord): Promise<Purchase>;
  createAndIncreasePartStock(
    purchase: CreatePurchaseRecord,
    partId: number,
    quantity: number
  ): Promise<Purchase>;
}
