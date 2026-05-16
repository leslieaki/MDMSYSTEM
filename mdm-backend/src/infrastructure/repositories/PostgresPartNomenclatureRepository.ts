import type { PartNomenclature } from "../../domain/entities/PartNomenclature";
import type {
  CreatePartNomenclatureRecord,
  DeletePartNomenclatureOptions,
  DeletePartNomenclatureResult,
  PartNomenclatureRepository,
  UpdatePartNomenclatureRecord
} from "../../domain/repositories/PartNomenclatureRepository";
import { postgresPool } from "../database/PostgresConnection";

type PartNomenclatureRow = {
  id: number;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
};

type CountRow = {
  count: number | string;
};

type PartUsageRow = {
  id: number;
  stock: number | string;
  min_stock: number | string;
};

function mapPartNomenclature(row: PartNomenclatureRow): PartNomenclature {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    material: row.material,
    drawing: row.drawing
  };
}

const selectSql = `
  SELECT
    id,
    code,
    name,
    category,
    material,
    drawing
  FROM part_nomenclature
`;

export class PostgresPartNomenclatureRepository
  implements PartNomenclatureRepository
{
  async findAll(): Promise<PartNomenclature[]> {
    const result = await postgresPool.query<PartNomenclatureRow>(`
      ${selectSql}
      ORDER BY name ASC
    `);

    return result.rows.map(mapPartNomenclature);
  }

  async findById(id: number): Promise<PartNomenclature | null> {
    const result = await postgresPool.query<PartNomenclatureRow>(
      `
        ${selectSql}
        WHERE id = $1
      `,
      [id]
    );

    const row = result.rows[0];

    return row ? mapPartNomenclature(row) : null;
  }

  async findByCode(code: string): Promise<PartNomenclature | null> {
    const result = await postgresPool.query<PartNomenclatureRow>(
      `
        ${selectSql}
        WHERE LOWER(code) = LOWER($1)
      `,
      [code]
    );

    const row = result.rows[0];

    return row ? mapPartNomenclature(row) : null;
  }

  async findByDrawing(drawing: string): Promise<PartNomenclature | null> {
    const result = await postgresPool.query<PartNomenclatureRow>(
      `
        ${selectSql}
        WHERE LOWER(drawing) = LOWER($1)
      `,
      [drawing]
    );

    const row = result.rows[0];

    return row ? mapPartNomenclature(row) : null;
  }

  async create(
    item: CreatePartNomenclatureRecord
  ): Promise<PartNomenclature> {
    const result = await postgresPool.query<PartNomenclatureRow>(
      `
        INSERT INTO part_nomenclature
          (
            code,
            name,
            category,
            material,
            drawing
          )
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING
          id,
          code,
          name,
          category,
          material,
          drawing
      `,
      [item.code, item.name, item.category, item.material, item.drawing]
    );

    return mapPartNomenclature(result.rows[0]);
  }

  async update(
    id: number,
    item: UpdatePartNomenclatureRecord
  ): Promise<PartNomenclature> {
    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<PartNomenclatureRow>(
        `
          UPDATE part_nomenclature
          SET
            code = $1,
            name = $2,
            category = $3,
            material = $4,
            drawing = $5
          WHERE id = $6
          RETURNING
            id,
            code,
            name,
            category,
            material,
            drawing
        `,
        [item.code, item.name, item.category, item.material, item.drawing, id]
      );

      const row = result.rows[0];

      if (!row) {
        throw new Error("Номенклатура не найдена");
      }

      await client.query(
        `
          UPDATE parts
          SET
            code = $1,
            name = $2,
            category = $3,
            material = $4,
            drawing = $5
          WHERE nomenclature_id = $6
        `,
        [item.code, item.name, item.category, item.material, item.drawing, id]
      );

      await client.query("COMMIT");

      return mapPartNomenclature(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(
    id: number,
    options: DeletePartNomenclatureOptions = {}
  ): Promise<DeletePartNomenclatureResult> {
    const replacementId = options.replacementId;
    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      const currentResult = await client.query<PartNomenclatureRow>(
        `
          ${selectSql}
          WHERE id = $1
          FOR UPDATE
        `,
        [id]
      );

      const currentRow = currentResult.rows[0];

      if (!currentRow) {
        throw new Error("Номенклатура не найдена");
      }

      const deletedItem = mapPartNomenclature(currentRow);

      const sourcePartResult = await client.query<PartUsageRow>(
        `
          SELECT
            id,
            stock,
            min_stock
          FROM parts
          WHERE nomenclature_id = $1
          FOR UPDATE
        `,
        [deletedItem.id]
      );

      const sourcePart = sourcePartResult.rows[0];
      const usedPartsCount = sourcePart ? 1 : 0;

      let replacementItem: PartNomenclature | null = null;
      let affectedParts = 0;

      if (sourcePart) {
        if (!replacementId) {
          throw new Error(
            `Номенклатура "${deletedItem.name}" используется в карточке детали. Выберите номенклатуру для объединения перед удалением.`
          );
        }

        if (replacementId === deletedItem.id) {
          throw new Error("Нельзя объединить номенклатуру саму с собой");
        }

        const replacementResult = await client.query<PartNomenclatureRow>(
          `
            ${selectSql}
            WHERE id = $1
            FOR UPDATE
          `,
          [replacementId]
        );

        const replacementRow = replacementResult.rows[0];

        if (!replacementRow) {
          throw new Error("Номенклатура для объединения не найдена");
        }

        replacementItem = mapPartNomenclature(replacementRow);

        const replacementPartResult = await client.query<PartUsageRow>(
          `
            SELECT
              id,
              stock,
              min_stock
            FROM parts
            WHERE nomenclature_id = $1
            FOR UPDATE
          `,
          [replacementItem.id]
        );

        const replacementPart = replacementPartResult.rows[0];

        if (replacementPart) {
          await client.query(
            `
              UPDATE purchases
              SET part_id = $1
              WHERE part_id = $2
            `,
            [replacementPart.id, sourcePart.id]
          );

          const replacementDrawingResult = await client.query<CountRow>(
            `
              SELECT COUNT(*)::int AS count
              FROM part_drawing_files
              WHERE part_id = $1
            `,
            [replacementPart.id]
          );

          const replacementHasDrawing =
            Number(replacementDrawingResult.rows[0]?.count ?? 0) > 0;

          if (!replacementHasDrawing) {
            await client.query(
              `
                UPDATE part_drawing_files
                SET part_id = $1
                WHERE part_id = $2
              `,
              [replacementPart.id, sourcePart.id]
            );
          }

          await client.query(
            `
              UPDATE parts
              SET
                stock = stock + $1,
                min_stock = GREATEST(min_stock, $2)
              WHERE id = $3
            `,
            [
              Number(sourcePart.stock),
              Number(sourcePart.min_stock),
              replacementPart.id
            ]
          );

          await client.query(
            `
              DELETE FROM parts
              WHERE id = $1
            `,
            [sourcePart.id]
          );

          affectedParts = 1;
        } else {
          const updatePartsResult = await client.query(
            `
              UPDATE parts
              SET
                nomenclature_id = $1,
                code = $2,
                name = $3,
                category = $4,
                material = $5,
                drawing = $6
              WHERE id = $7
            `,
            [
              replacementItem.id,
              replacementItem.code,
              replacementItem.name,
              replacementItem.category,
              replacementItem.material,
              replacementItem.drawing,
              sourcePart.id
            ]
          );

          affectedParts = updatePartsResult.rowCount ?? 0;
        }
      }

      await client.query(
        `
          DELETE FROM part_nomenclature
          WHERE id = $1
        `,
        [deletedItem.id]
      );

      await client.query("COMMIT");

      return {
        deletedItem,
        replacementItem,
        affectedParts: usedPartsCount > 0 ? Math.max(affectedParts, 1) : 0
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
