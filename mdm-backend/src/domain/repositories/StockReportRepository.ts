export type StockReportStatus = "Норма" | "Низкий остаток" | "Дефицит";

export type StockReportItem = {
  partId: number;
  code: string;
  name: string;
  category: string;
  material: string;
  unit: string;
  stock: number;
  minStock: number;
  stockStatus: StockReportStatus;
  supplier: string;
  drawing: string;
  purchaseCount: number;
  purchasedQuantity: number;
  purchaseTotal: number;
};

export interface StockReportRepository {
  findAll(): Promise<StockReportItem[]>;
}