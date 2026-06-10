import type { Purchase } from "../../domain/entities/Purchase";
import type {
  CreatePurchaseRecord,
  PurchaseRepository
} from "../../domain/repositories/PurchaseRepository";
import { postgresPool } from "../database/PostgresConnection";

type PurchaseRow = {
  id: number;
  raw_name: string;
  part_id: number;
  quantity: number;
  price: string;
  supplier: string;
  employee: string;
  date: string | Date;
};

function mapDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function mapPurchase(row: PurchaseRow): Purchase {
  const price = Number(row.price);
  const quantity = Number(row.quantity);
  return {
    id: row.id,
    rawName: row.raw_name,
    partId: row.part_id,
    quantity,
    price,
    total: price * quantity,
    supplier: row.supplier,
    employee: row.employee,
    date: mapDate(row.date)
  };
}

export class PostgresPurchaseRepository implements PurchaseRepository {
  async findAll(): Promise<Purchase[]> {
    const result = await postgresPool.query<PurchaseRow>(`
      SELECT
        id,
        raw_name,
        part_id,
        quantity,
        price,
        supplier,
        employee,
        date
      FROM purchases
      ORDER BY id DESC
    `);

    return result.rows.map(mapPurchase);
  }

  async create(purchase: CreatePurchaseRecord): Promise<Purchase> {
    const result = await postgresPool.query<PurchaseRow>(
      `
        INSERT INTO purchases
          (raw_name, part_id, quantity, price, supplier, employee, date)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          raw_name,
          part_id,
          quantity,
          price,
          supplier,
          employee,
          date
      `,
      [
        purchase.rawName,
        purchase.partId,
        purchase.quantity,
        purchase.price,
        purchase.supplier,
        purchase.employee,
        purchase.date
      ]
    );

    return mapPurchase(result.rows[0]);
  }

  async createAndIncreasePartStock(
    purchase: CreatePurchaseRecord,
    partId: number,
    quantity: number
  ): Promise<Purchase> {
    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      const purchaseResult = await client.query<PurchaseRow>(
        `
          INSERT INTO purchases
            (raw_name, part_id, quantity, price, supplier, employee, date)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            raw_name,
            part_id,
            quantity,
            price,
            supplier,
            employee,
            date
        `,
        [
          purchase.rawName,
          purchase.partId,
          purchase.quantity,
          purchase.price,
          purchase.supplier,
          purchase.employee,
          purchase.date
        ]
      );

      const stockResult = await client.query(
        `
          UPDATE parts
          SET stock = stock + $1
          WHERE id = $2
          RETURNING id
        `,
        [quantity, partId]
      );

      if ((stockResult.rowCount ?? 0) === 0) {
        throw new Error("Деталь не найдена");
      }

      await client.query("COMMIT");

      return mapPurchase(purchaseResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
