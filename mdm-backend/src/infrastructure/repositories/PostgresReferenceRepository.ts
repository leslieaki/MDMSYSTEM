import type {
  ReferenceItem,
  ReferenceKind
} from "../../domain/entities/ReferenceItem";
import type {
  CreateReferenceItemRecord,
  DeleteReferenceItemOptions,
  DeleteReferenceItemResult,
  ReferenceRepository,
  UpdateReferenceItemRecord
} from "../../domain/repositories/ReferenceRepository";
import { postgresPool } from "../database/PostgresConnection";

type ReferenceRow = {
  id: number;
  name: string;
  description: string;
};

type CountRow = {
  count: number | string;
};

const tableByKind: Record<ReferenceKind, string> = {
  "part-categories": "part_categories",
  materials: "materials",
  suppliers: "suppliers",
  "measurement-units": "measurement_units"
};

const partColumnByKind: Record<ReferenceKind, string> = {
  "part-categories": "category",
  materials: "material",
  suppliers: "supplier",
  "measurement-units": "unit"
};

const nomenclatureColumnByKind: Partial<Record<ReferenceKind, string>> = {
  "part-categories": "category",
  materials: "material"
};

function getTableName(kind: ReferenceKind): string {
  const tableName = tableByKind[kind];

  if (!tableName) {
    throw new Error("Неизвестный справочник");
  }

  return tableName;
}

function getPartColumnName(kind: ReferenceKind): string {
  const columnName = partColumnByKind[kind];

  if (!columnName) {
    throw new Error("Неизвестный справочник");
  }

  return columnName;
}

function mapReferenceItem(row: ReferenceRow): ReferenceItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description
  };
}

export class PostgresReferenceRepository implements ReferenceRepository {
  async findAll(kind: ReferenceKind): Promise<ReferenceItem[]> {
    const tableName = getTableName(kind);

    const result = await postgresPool.query<ReferenceRow>(`
      SELECT
        id,
        name,
        description
      FROM ${tableName}
      ORDER BY name ASC
    `);

    return result.rows.map(mapReferenceItem);
  }

  async findById(
    kind: ReferenceKind,
    id: number
  ): Promise<ReferenceItem | null> {
    const tableName = getTableName(kind);

    const result = await postgresPool.query<ReferenceRow>(
      `
        SELECT
          id,
          name,
          description
        FROM ${tableName}
        WHERE id = $1
      `,
      [id]
    );

    const row = result.rows[0];

    return row ? mapReferenceItem(row) : null;
  }

  async findByName(
    kind: ReferenceKind,
    name: string
  ): Promise<ReferenceItem | null> {
    const tableName = getTableName(kind);

    const result = await postgresPool.query<ReferenceRow>(
      `
        SELECT
          id,
          name,
          description
        FROM ${tableName}
        WHERE LOWER(name) = LOWER($1)
      `,
      [name]
    );

    const row = result.rows[0];

    return row ? mapReferenceItem(row) : null;
  }

  async create(
    kind: ReferenceKind,
    item: CreateReferenceItemRecord
  ): Promise<ReferenceItem> {
    const tableName = getTableName(kind);

    const result = await postgresPool.query<ReferenceRow>(
      `
        INSERT INTO ${tableName}
          (name, description)
        VALUES
          ($1, $2)
        RETURNING
          id,
          name,
          description
      `,
      [item.name, item.description]
    );

    return mapReferenceItem(result.rows[0]);
  }

  async update(
    kind: ReferenceKind,
    id: number,
    item: UpdateReferenceItemRecord
  ): Promise<ReferenceItem> {
    const tableName = getTableName(kind);
    const partColumnName = getPartColumnName(kind);
    const nomenclatureColumnName = nomenclatureColumnByKind[kind];

    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      const currentResult = await client.query<ReferenceRow>(
        `
          SELECT
            id,
            name,
            description
          FROM ${tableName}
          WHERE id = $1
          FOR UPDATE
        `,
        [id]
      );

      const currentRow = currentResult.rows[0];

      if (!currentRow) {
        throw new Error("Запись справочника не найдена");
      }

      const currentItem = mapReferenceItem(currentRow);

      const result = await client.query<ReferenceRow>(
        `
          UPDATE ${tableName}
          SET
            name = $1,
            description = $2
          WHERE id = $3
          RETURNING
            id,
            name,
            description
        `,
        [item.name, item.description, id]
      );

      await client.query(
        `
          UPDATE parts
          SET ${partColumnName} = $1
          WHERE LOWER(${partColumnName}) = LOWER($2)
        `,
        [item.name, currentItem.name]
      );

      if (nomenclatureColumnName) {
        await client.query(
          `
            UPDATE part_nomenclature
            SET ${nomenclatureColumnName} = $1
            WHERE LOWER(${nomenclatureColumnName}) = LOWER($2)
          `,
          [item.name, currentItem.name]
        );
      }

      if (kind === "suppliers") {
        await client.query(
          `
            UPDATE purchases
            SET supplier = $1
            WHERE LOWER(supplier) = LOWER($2)
          `,
          [item.name, currentItem.name]
        );
      }

      await client.query("COMMIT");

      return mapReferenceItem(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(
    kind: ReferenceKind,
    id: number,
    options: DeleteReferenceItemOptions = {}
  ): Promise<DeleteReferenceItemResult> {
    const tableName = getTableName(kind);
    const partColumnName = getPartColumnName(kind);
    const nomenclatureColumnName = nomenclatureColumnByKind[kind];
    const replacementName = options.replacementName?.trim() || "";

    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      const currentItemResult = await client.query<ReferenceRow>(
        `
          SELECT
            id,
            name,
            description
          FROM ${tableName}
          WHERE id = $1
          FOR UPDATE
        `,
        [id]
      );

      const currentItemRow = currentItemResult.rows[0];

      if (!currentItemRow) {
        throw new Error("Запись справочника не найдена");
      }

      const deletedItem = mapReferenceItem(currentItemRow);

      const partsUsageResult = await client.query<CountRow>(
        `
          SELECT COUNT(*)::int AS count
          FROM parts
          WHERE LOWER(${partColumnName}) = LOWER($1)
        `,
        [deletedItem.name]
      );

      const affectedPartsBeforeDelete = Number(
        partsUsageResult.rows[0]?.count ?? 0
      );

      let affectedNomenclatureBeforeDelete = 0;

      if (nomenclatureColumnName) {
        const nomenclatureUsageResult = await client.query<CountRow>(
          `
            SELECT COUNT(*)::int AS count
            FROM part_nomenclature
            WHERE LOWER(${nomenclatureColumnName}) = LOWER($1)
          `,
          [deletedItem.name]
        );

        affectedNomenclatureBeforeDelete = Number(
          nomenclatureUsageResult.rows[0]?.count ?? 0
        );
      }

      let affectedPurchasesBeforeDelete = 0;

      if (kind === "suppliers") {
        const purchasesUsageResult = await client.query<CountRow>(
          `
            SELECT COUNT(*)::int AS count
            FROM purchases
            WHERE LOWER(supplier) = LOWER($1)
          `,
          [deletedItem.name]
        );

        affectedPurchasesBeforeDelete = Number(
          purchasesUsageResult.rows[0]?.count ?? 0
        );
      }

      const isUsed =
        affectedPartsBeforeDelete > 0 ||
        affectedNomenclatureBeforeDelete > 0 ||
        affectedPurchasesBeforeDelete > 0;

      let replacementItem: ReferenceItem | null = null;
      let affectedParts = 0;
      let affectedNomenclature = 0;
      let affectedPurchases = 0;

      if (isUsed) {
        if (!replacementName) {
          throw new Error(
            `Запись "${deletedItem.name}" используется в данных. Выберите замену перед удалением.`
          );
        }

        const replacementResult = await client.query<ReferenceRow>(
          `
            SELECT
              id,
              name,
              description
            FROM ${tableName}
            WHERE LOWER(name) = LOWER($1)
              AND id <> $2
          `,
          [replacementName, deletedItem.id]
        );

        const replacementRow = replacementResult.rows[0];

        if (!replacementRow) {
          throw new Error("Запись для замены не найдена в этом справочнике");
        }

        replacementItem = mapReferenceItem(replacementRow);

        const updatedPartsResult = await client.query(
          `
            UPDATE parts
            SET ${partColumnName} = $1
            WHERE LOWER(${partColumnName}) = LOWER($2)
          `,
          [replacementItem.name, deletedItem.name]
        );

        affectedParts = updatedPartsResult.rowCount ?? 0;

        if (nomenclatureColumnName) {
          const updatedNomenclatureResult = await client.query(
            `
              UPDATE part_nomenclature
              SET ${nomenclatureColumnName} = $1
              WHERE LOWER(${nomenclatureColumnName}) = LOWER($2)
            `,
            [replacementItem.name, deletedItem.name]
          );

          affectedNomenclature = updatedNomenclatureResult.rowCount ?? 0;
        }

        if (kind === "suppliers") {
          const updatedPurchasesResult = await client.query(
            `
              UPDATE purchases
              SET supplier = $1
              WHERE LOWER(supplier) = LOWER($2)
            `,
            [replacementItem.name, deletedItem.name]
          );

          affectedPurchases = updatedPurchasesResult.rowCount ?? 0;
        }
      }

      await client.query(
        `
          DELETE FROM ${tableName}
          WHERE id = $1
        `,
        [deletedItem.id]
      );

      await client.query("COMMIT");

      return {
        deletedItem,
        replacementItem,
        affectedParts,
        affectedNomenclature,
        affectedPurchases
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}