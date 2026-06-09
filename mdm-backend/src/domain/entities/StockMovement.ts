export type StockMovementType =
  | "receipt"
  | "write_off"
  | "transfer"
  | "inventory"
  | "adjustment";

export type StockMovement = {
  id: number;
  partId: number;
  partCode: string;
  partName: string;
  type: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  fromLocation: string;
  toLocation: string;
  reason: string;
  employee: string;
  createdAt: string;
};
