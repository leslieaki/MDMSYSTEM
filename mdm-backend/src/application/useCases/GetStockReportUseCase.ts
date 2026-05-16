import { postgresPool } from "../../infrastructure/database/PostgresConnection";

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

type StockReportRow = {
  part_id: number;
  code: string;
  name: string;
  category: string;
  material: string;
  unit: string;
  stock: number;
  min_stock: number;
  supplier: string;
  drawing: string;
  purchase_count: string | number;
  purchased_quantity: string | number | null;
  purchase_total: string | number | null;
};

function toNumber(value: string | number | null): number {
  if (value === null) {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getStockStatus(stock: number, minStock: number): StockReportStatus {
  if (stock <= 0) {
    return "Дефицит";
  }

  if (stock < minStock) {
    return "Низкий остаток";
  }

  return "Норма";
}

export class GetStockReportUseCase {
  async execute(): Promise<StockReportItem[]> {
    const result = await postgresPool.query<StockReportRow>(`
      SELECT
        p.id AS part_id,
        p.code,
        p.name,
        p.category,
        p.material,
        p.unit,
        p.stock,
        p.min_stock,
        p.supplier,
        p.drawing,
        COUNT(pu.id) AS purchase_count,
        COALESCE(SUM(pu.quantity), 0) AS purchased_quantity,
        COALESCE(SUM(pu.price), 0) AS purchase_total
      FROM parts p
      LEFT JOIN purchases pu ON pu.part_id = p.id
      GROUP BY
        p.id,
        p.code,
        p.name,
        p.category,
        p.material,
        p.unit,
        p.stock,
        p.min_stock,
        p.supplier,
        p.drawing
      ORDER BY
        CASE
          WHEN p.stock <= 0 THEN 0
          WHEN p.stock < p.min_stock THEN 1
          ELSE 2
        END ASC,
        p.name ASC
    `);

    return result.rows.map((row) => {
      const stock = toNumber(row.stock);
      const minStock = toNumber(row.min_stock);

      return {
        partId: row.part_id,
        code: row.code,
        name: row.name,
        category: row.category,
        material: row.material,
        unit: row.unit,
        stock,
        minStock,
        stockStatus: getStockStatus(stock, minStock),
        supplier: row.supplier,
        drawing: row.drawing,
        purchaseCount: toNumber(row.purchase_count),
        purchasedQuantity: toNumber(row.purchased_quantity),
        purchaseTotal: toNumber(row.purchase_total)
      };
    });
  }
}