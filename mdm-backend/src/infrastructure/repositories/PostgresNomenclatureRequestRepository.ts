import type {
  NomenclatureRequest,
  NomenclatureRequestStatus,
  NomenclatureRequestType
} from "../../domain/entities/NomenclatureRequest";
import type {
  CreateNomenclatureRequestRecord,
  NomenclatureRequestRepository
} from "../../domain/repositories/NomenclatureRequestRepository";
import { postgresPool } from "../database/PostgresConnection";

type NomenclatureRequestRow = {
  id: number;
  request_type: NomenclatureRequestType;
  status: NomenclatureRequestStatus;
  target_nomenclature_id: number | null;
  target_code: string | null;
  target_name: string | null;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
  comment: string;
  reject_reason: string;
  created_by: string;
  created_by_role: string;
  reviewed_by: string;
  reviewed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type RawRequestRow = {
  id: number;
  request_type: NomenclatureRequestType;
  status: NomenclatureRequestStatus;
  target_nomenclature_id: number | null;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
};

type IdRow = {
  id: number;
};

function mapDate(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function mapNomenclatureRequest(
  row: NomenclatureRequestRow
): NomenclatureRequest {
  return {
    id: row.id,
    requestType: row.request_type,
    status: row.status,
    targetNomenclatureId: row.target_nomenclature_id,
    targetCode: row.target_code ?? "",
    targetName: row.target_name ?? "",
    code: row.code,
    name: row.name,
    category: row.category,
    material: row.material,
    drawing: row.drawing,
    comment: row.comment,
    rejectReason: row.reject_reason,
    createdBy: row.created_by,
    createdByRole: row.created_by_role,
    reviewedBy: row.reviewed_by,
    reviewedAt: mapDate(row.reviewed_at),
    createdAt: mapDate(row.created_at) || "",
    updatedAt: mapDate(row.updated_at) || ""
  };
}

const selectSql = `
  SELECT
    nr.id,
    nr.request_type,
    nr.status,
    nr.target_nomenclature_id,
    target.code AS target_code,
    target.name AS target_name,
    nr.code,
    nr.name,
    nr.category,
    nr.material,
    nr.drawing,
    nr.comment,
    nr.reject_reason,
    nr.created_by,
    nr.created_by_role,
    nr.reviewed_by,
    nr.reviewed_at,
    nr.created_at,
    nr.updated_at
  FROM nomenclature_requests nr
  LEFT JOIN part_nomenclature target ON target.id = nr.target_nomenclature_id
`;

export class PostgresNomenclatureRequestRepository
  implements NomenclatureRequestRepository
{
  async findAll(): Promise<NomenclatureRequest[]> {
    const result = await postgresPool.query<NomenclatureRequestRow>(`
      ${selectSql}
      ORDER BY nr.created_at DESC, nr.id DESC
    `);

    return result.rows.map(mapNomenclatureRequest);
  }

  async createDraft(
    request: CreateNomenclatureRequestRecord
  ): Promise<NomenclatureRequest> {
    const result = await postgresPool.query<IdRow>(
      `
        INSERT INTO nomenclature_requests
          (
            request_type,
            status,
            target_nomenclature_id,
            code,
            name,
            category,
            material,
            drawing,
            comment,
            created_by,
            created_by_role
          )
        VALUES
          ($1, 'draft', $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `,
      [
        request.requestType,
        request.targetNomenclatureId,
        request.code,
        request.name,
        request.category,
        request.material,
        request.drawing,
        request.comment,
        request.createdBy,
        request.createdByRole
      ]
    );

    return this.findByIdOrThrow(result.rows[0].id);
  }

  async submit(id: number): Promise<NomenclatureRequest> {
    const result = await postgresPool.query<IdRow>(
      `
        UPDATE nomenclature_requests
        SET
          status = 'pending',
          reject_reason = '',
          reviewed_by = '',
          reviewed_at = NULL,
          updated_at = NOW()
        WHERE id = $1
          AND status IN ('draft', 'rejected')
        RETURNING id
      `,
      [id]
    );

    if (!result.rows[0]) {
      throw new Error("Заявка НСИ не найдена или уже отправлена на согласование");
    }

    return this.findByIdOrThrow(id);
  }

  async approve(id: number, reviewedBy: string): Promise<NomenclatureRequest> {
    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      const requestResult = await client.query<RawRequestRow>(
        `
          SELECT
            id,
            request_type,
            status,
            target_nomenclature_id,
            code,
            name,
            category,
            material,
            drawing
          FROM nomenclature_requests
          WHERE id = $1
          FOR UPDATE
        `,
        [id]
      );

      const request = requestResult.rows[0];

      if (!request) {
        throw new Error("Заявка НСИ не найдена");
      }

      if (request.status !== "pending") {
        throw new Error("Согласовать можно только заявку в статусе pending");
      }

      await this.ensureReferenceExists(client, "part_categories", request.category);
      await this.ensureReferenceExists(client, "materials", request.material);

      if (request.request_type === "create") {
        await this.ensureCodeIsUnique(client, request.code, null);
        await this.ensureDrawingIsUnique(client, request.drawing, null);

        const createdResult = await client.query<IdRow>(
          `
            INSERT INTO part_nomenclature
              (code, name, category, material, drawing)
            VALUES
              ($1, $2, $3, $4, $5)
            RETURNING id
          `,
          [
            request.code,
            request.name,
            request.category,
            request.material,
            request.drawing
          ]
        );

        await client.query(
          `
            UPDATE nomenclature_requests
            SET target_nomenclature_id = $1
            WHERE id = $2
          `,
          [createdResult.rows[0].id, request.id]
        );
      }

      if (request.request_type === "update") {
        if (!request.target_nomenclature_id) {
          throw new Error("В заявке не указана изменяемая номенклатура");
        }

        await this.ensureTargetExists(client, request.target_nomenclature_id);
        await this.ensureCodeIsUnique(
          client,
          request.code,
          request.target_nomenclature_id
        );
        await this.ensureDrawingIsUnique(
          client,
          request.drawing,
          request.target_nomenclature_id
        );

        await client.query(
          `
            UPDATE part_nomenclature
            SET
              code = $1,
              name = $2,
              category = $3,
              material = $4,
              drawing = $5
            WHERE id = $6
          `,
          [
            request.code,
            request.name,
            request.category,
            request.material,
            request.drawing,
            request.target_nomenclature_id
          ]
        );

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
          [
            request.code,
            request.name,
            request.category,
            request.material,
            request.drawing,
            request.target_nomenclature_id
          ]
        );
      }

      await client.query(
        `
          UPDATE nomenclature_requests
          SET
            status = 'approved',
            reject_reason = '',
            reviewed_by = $1,
            reviewed_at = NOW(),
            updated_at = NOW()
          WHERE id = $2
        `,
        [reviewedBy, id]
      );

      await client.query("COMMIT");

      return this.findByIdOrThrow(id);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async reject(
    id: number,
    reviewedBy: string,
    rejectReason: string
  ): Promise<NomenclatureRequest> {
    const result = await postgresPool.query<IdRow>(
      `
        UPDATE nomenclature_requests
        SET
          status = 'rejected',
          reject_reason = $1,
          reviewed_by = $2,
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE id = $3
          AND status = 'pending'
        RETURNING id
      `,
      [rejectReason, reviewedBy, id]
    );

    if (!result.rows[0]) {
      throw new Error("Отклонить можно только заявку в статусе pending");
    }

    return this.findByIdOrThrow(id);
  }

  private async findByIdOrThrow(id: number): Promise<NomenclatureRequest> {
    const result = await postgresPool.query<NomenclatureRequestRow>(
      `
        ${selectSql}
        WHERE nr.id = $1
      `,
      [id]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Заявка НСИ не найдена");
    }

    return mapNomenclatureRequest(row);
  }

  private async ensureReferenceExists(
    client: { query: typeof postgresPool.query },
    tableName: "part_categories" | "materials",
    name: string
  ): Promise<void> {
    const result = await client.query<IdRow>(
      `
        SELECT id
        FROM ${tableName}
        WHERE LOWER(name) = LOWER($1)
      `,
      [name]
    );

    if (!result.rows[0]) {
      throw new Error(`Значение "${name}" отсутствует в справочнике НСИ`);
    }
  }

  private async ensureTargetExists(
    client: { query: typeof postgresPool.query },
    id: number
  ): Promise<void> {
    const result = await client.query<IdRow>(
      `
        SELECT id
        FROM part_nomenclature
        WHERE id = $1
      `,
      [id]
    );

    if (!result.rows[0]) {
      throw new Error("Изменяемая номенклатура не найдена");
    }
  }

  private async ensureCodeIsUnique(
    client: { query: typeof postgresPool.query },
    code: string,
    allowedId: number | null
  ): Promise<void> {
    const result = await client.query<IdRow>(
      `
        SELECT id
        FROM part_nomenclature
        WHERE LOWER(code) = LOWER($1)
          AND ($2::int IS NULL OR id <> $2)
      `,
      [code, allowedId]
    );

    if (result.rows[0]) {
      throw new Error("Номенклатура с таким кодом уже существует");
    }
  }

  private async ensureDrawingIsUnique(
    client: { query: typeof postgresPool.query },
    drawing: string,
    allowedId: number | null
  ): Promise<void> {
    const result = await client.query<IdRow>(
      `
        SELECT id
        FROM part_nomenclature
        WHERE LOWER(drawing) = LOWER($1)
          AND ($2::int IS NULL OR id <> $2)
      `,
      [drawing, allowedId]
    );

    if (result.rows[0]) {
      throw new Error("Номенклатура с таким номером чертежа уже существует");
    }
  }
}
