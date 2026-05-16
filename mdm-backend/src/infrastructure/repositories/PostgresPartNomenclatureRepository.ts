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

      const usageResult = await client.query<CountRow>(
        `
          SELECT COUNT(*)::int AS count
          FROM parts
          WHERE nomenclature_id = $1
        `,
        [deletedItem.id]
      );

      const usedPartsCount = Number(usageResult.rows[0]?.count ?? 0);

      let replacementItem: PartNomenclature | null = null;
      let affectedParts = 0;

      if (usedPartsCount > 0) {
        if (!replacementId) {
          throw new Error(
            `Номенклатура "${deletedItem.name}" используется в карточках деталей. Выберите замену перед удалением.`
          );
        }

        if (replacementId === deletedItem.id) {
          throw new Error("Нельзя заменить номенклатуру самой собой");
        }

        const replacementResult = await client.query<PartNomenclatureRow>(
          `
            ${selectSql}
            WHERE id = $1
          `,
          [replacementId]
        );

        const replacementRow = replacementResult.rows[0];

        if (!replacementRow) {
          throw new Error("Номенклатура для замены не найдена");
        }

        replacementItem = mapPartNomenclature(replacementRow);

        const duplicatePartResult = await client.query<CountRow>(
          `
            SELECT COUNT(*)::int AS count
            FROM parts
            WHERE nomenclature_id = $1
          `,
          [replacementItem.id]
        );

        const duplicatePartCount = Number(
          duplicatePartResult.rows[0]?.count ?? 0
        );

        if (duplicatePartCount > 0) {
          throw new Error(
            "Нельзя заменить на выбранную номенклатуру: для нее уже существует карточка детали"
          );
        }

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
            WHERE nomenclature_id = $7
          `,
          [
            replacementItem.id,
            replacementItem.code,
            replacementItem.name,
            replacementItem.category,
            replacementItem.material,
            replacementItem.drawing,
            deletedItem.id
          ]
        );

        affectedParts = updatePartsResult.rowCount ?? 0;
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
        affectedParts
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}