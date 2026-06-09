import type {
  StockMovement,
  StockMovementType
} from "../../domain/entities/StockMovement";
import type {
  CreateStockMovementRecord,
  StockMovementRepository
} from "../../domain/repositories/StockMovementRepository";
import { postgresPool } from "../database/PostgresConnection";

type StockMovementRow = {
  id: number;
  part_id: number;
  part_code: string;
  part_name: string;
  movement_type: StockMovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  from_location: string;
  to_location: string;
  reason: string;
  employee: string;
  created_at: string | Date;
};

type PartStockRow = {
  id: number;
  stock: number;
};

function mapCreatedAt(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function mapStockMovement(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    partId: row.part_id,
    partCode: row.part_code,
    partName: row.part_name,
    type: row.movement_type,
    quantity: row.quantity,
    stockBefore: row.stock_before,
    stockAfter: row.stock_after,
    fromLocation: row.from_location,
    toLocation: row.to_location,
    reason: row.reason,
    employee: row.employee,
    createdAt: mapCreatedAt(row.created_at)
  };
}

const stockMovementSelectSql = `
  SELECT
    sm.id,
    sm.part_id,
    p.code AS part_code,
    p.name AS part_name,
    sm.movement_type,
    sm.quantity,
    sm.stock_before,
    sm.stock_after,
    sm.from_location,
    sm.to_location,
    sm.reason,
    sm.employee,
    sm.created_at
  FROM stock_movements sm
  JOIN parts p ON p.id = sm.part_id
`;

export class PostgresStockMovementRepository implements StockMovementRepository {
  async findAll(): Promise<StockMovement[]> {
    const result = await postgresPool.query<StockMovementRow>(`
      ${stockMovementSelectSql}
      ORDER BY sm.created_at DESC, sm.id DESC
    `);

    return result.rows.map(mapStockMovement);
  }

  async create(movement: CreateStockMovementRecord): Promise<StockMovement> {
    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      const partResult = await client.query<PartStockRow>(
        `
          SELECT id, stock
          FROM parts
          WHERE id = $1
          FOR UPDATE
        `,
        [movement.partId]
      );

      const part = partResult.rows[0];

      if (!part) {
        throw new Error("Деталь не найдена");
      }

      const stockBefore = part.stock;
      let stockAfter = stockBefore;

      if (movement.type === "receipt") {
        stockAfter = stockBefore + movement.quantity;
      }

      if (movement.type === "write_off") {
        stockAfter = stockBefore - movement.quantity;

        if (stockAfter < 0) {
          throw new Error("Нельзя списать больше, чем есть на складе");
        }
      }

      if (movement.type === "inventory") {
        stockAfter = movement.quantity;
      }

      if (movement.type === "adjustment") {
        stockAfter = stockBefore + movement.quantity;
      }

      await client.query(
        `
          UPDATE parts
          SET stock = $1
          WHERE id = $2
        `,
        [stockAfter, movement.partId]
      );

      const insertResult = await client.query<{ id: number }>(
        `
          INSERT INTO stock_movements
            (
              part_id,
              movement_type,
              quantity,
              stock_before,
              stock_after,
              from_location,
              to_location,
              reason,
              employee
            )
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `,
        [
          movement.partId,
          movement.type,
          movement.quantity,
          stockBefore,
          stockAfter,
          movement.fromLocation,
          movement.toLocation,
          movement.reason,
          movement.employee
        ]
      );

      const createdResult = await client.query<StockMovementRow>(
        `
          ${stockMovementSelectSql}
          WHERE sm.id = $1
        `,
        [insertResult.rows[0].id]
      );

      await client.query("COMMIT");

      return mapStockMovement(createdResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
