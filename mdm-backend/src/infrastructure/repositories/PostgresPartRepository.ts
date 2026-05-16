import type { Part } from "../../domain/entities/Part";
import type {
  CreatePartRecord,
  PartRepository,
  UpdatePartRecord
} from "../../domain/repositories/PartRepository";
import { postgresPool } from "../database/PostgresConnection";

type PartRow = {
  id: number;
  nomenclature_id: number;
  code: string;
  name: string;
  category: string;
  material: string;
  unit: string;
  weight: string;
  stock: number;
  min_stock: number;
  drawing: string;
  supplier: string;
};

function mapPart(row: PartRow): Part {
  return {
    id: row.id,
    nomenclatureId: row.nomenclature_id,
    code: row.code,
    name: row.name,
    category: row.category,
    material: row.material,
    unit: row.unit,
    weight: Number(row.weight),
    stock: row.stock,
    minStock: row.min_stock,
    drawing: row.drawing,
    supplier: row.supplier
  };
}

const partSelectSql = `
  SELECT
    id,
    nomenclature_id,
    code,
    name,
    category,
    material,
    unit,
    weight,
    stock,
    min_stock,
    drawing,
    supplier
  FROM parts
`;

export class PostgresPartRepository implements PartRepository {
  async findAll(): Promise<Part[]> {
    const result = await postgresPool.query<PartRow>(`
      ${partSelectSql}
      ORDER BY id ASC
    `);

    return result.rows.map(mapPart);
  }

  async findById(id: number): Promise<Part | null> {
    const result = await postgresPool.query<PartRow>(
      `
        ${partSelectSql}
        WHERE id = $1
      `,
      [id]
    );

    const row = result.rows[0];

    return row ? mapPart(row) : null;
  }

  async findByCode(code: string): Promise<Part | null> {
    const result = await postgresPool.query<PartRow>(
      `
        ${partSelectSql}
        WHERE LOWER(code) = LOWER($1)
      `,
      [code]
    );

    const row = result.rows[0];

    return row ? mapPart(row) : null;
  }

  async create(part: CreatePartRecord): Promise<Part> {
    const result = await postgresPool.query<PartRow>(
      `
        INSERT INTO parts
          (
            nomenclature_id,
            code,
            name,
            category,
            material,
            unit,
            weight,
            stock,
            min_stock,
            drawing,
            supplier
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id,
          nomenclature_id,
          code,
          name,
          category,
          material,
          unit,
          weight,
          stock,
          min_stock,
          drawing,
          supplier
      `,
      [
        part.nomenclatureId,
        part.code,
        part.name,
        part.category,
        part.material,
        part.unit,
        part.weight,
        part.stock,
        part.minStock,
        part.drawing,
        part.supplier
      ]
    );

    return mapPart(result.rows[0]);
  }

  async update(id: number, part: UpdatePartRecord): Promise<Part> {
    const result = await postgresPool.query<PartRow>(
      `
        UPDATE parts
        SET
          nomenclature_id = $1,
          code = $2,
          name = $3,
          category = $4,
          material = $5,
          unit = $6,
          weight = $7,
          stock = $8,
          min_stock = $9,
          drawing = $10,
          supplier = $11
        WHERE id = $12
        RETURNING
          id,
          nomenclature_id,
          code,
          name,
          category,
          material,
          unit,
          weight,
          stock,
          min_stock,
          drawing,
          supplier
      `,
      [
        part.nomenclatureId,
        part.code,
        part.name,
        part.category,
        part.material,
        part.unit,
        part.weight,
        part.stock,
        part.minStock,
        part.drawing,
        part.supplier,
        id
      ]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Деталь не найдена");
    }

    return mapPart(row);
  }

  async increaseStock(partId: number, quantity: number): Promise<Part> {
    const result = await postgresPool.query<PartRow>(
      `
        UPDATE parts
        SET stock = stock + $1
        WHERE id = $2
        RETURNING
          id,
          nomenclature_id,
          code,
          name,
          category,
          material,
          unit,
          weight,
          stock,
          min_stock,
          drawing,
          supplier
      `,
      [quantity, partId]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Деталь не найдена");
    }

    return mapPart(row);
  }
}