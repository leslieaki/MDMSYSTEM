import type {
  StockMovement,
  StockMovementType
} from "../entities/StockMovement";

export type CreateStockMovementRecord = {
  partId: number;
  type: StockMovementType;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  reason: string;
  employee: string;
};

export interface StockMovementRepository {
  findAll(): Promise<StockMovement[]>;
  create(movement: CreateStockMovementRecord): Promise<StockMovement>;
}
