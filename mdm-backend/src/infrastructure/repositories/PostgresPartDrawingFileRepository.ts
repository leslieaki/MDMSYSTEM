import type { PartDrawingFile } from "../../domain/entities/PartDrawingFile";
import type {
  CreatePartDrawingFileRecord,
  PartDrawingFileRepository,
  ReplacePartDrawingFileResult
} from "../../domain/repositories/PartDrawingFileRepository";
import { postgresPool } from "../database/PostgresConnection";

type PartDrawingFileRow = {
  id: number;
  part_id: number;
  original_name: string;
  stored_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  uploaded_at: string | Date;
};

function mapDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function mapPartDrawingFile(row: PartDrawingFileRow): PartDrawingFile {
  return {
    id: row.id,
    partId: row.part_id,
    originalName: row.original_name,
    storedName: row.stored_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    uploadedAt: mapDate(row.uploaded_at)
  };
}

const selectSql = `
  SELECT
    id,
    part_id,
    original_name,
    stored_name,
    storage_path,
    mime_type,
    size_bytes,
    uploaded_by,
    uploaded_at
  FROM part_drawing_files
`;

export class PostgresPartDrawingFileRepository
  implements PartDrawingFileRepository
{
  async findAll(): Promise<PartDrawingFile[]> {
    const result = await postgresPool.query<PartDrawingFileRow>(`
      ${selectSql}
      ORDER BY uploaded_at DESC, id DESC
    `);

    return result.rows.map(mapPartDrawingFile);
  }

  async findByPartId(partId: number): Promise<PartDrawingFile | null> {
    const result = await postgresPool.query<PartDrawingFileRow>(
      `
        ${selectSql}
        WHERE part_id = $1
      `,
      [partId]
    );

    const row = result.rows[0];

    return row ? mapPartDrawingFile(row) : null;
  }

  async replaceForPart(
    file: CreatePartDrawingFileRecord
  ): Promise<ReplacePartDrawingFileResult> {
    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      const previousResult = await client.query<PartDrawingFileRow>(
        `
          ${selectSql}
          WHERE part_id = $1
          FOR UPDATE
        `,
        [file.partId]
      );

      const previousFile = previousResult.rows[0]
        ? mapPartDrawingFile(previousResult.rows[0])
        : null;

      await client.query(
        `
          DELETE FROM part_drawing_files
          WHERE part_id = $1
        `,
        [file.partId]
      );

      const createdResult = await client.query<PartDrawingFileRow>(
        `
          INSERT INTO part_drawing_files
            (
              part_id,
              original_name,
              stored_name,
              storage_path,
              mime_type,
              size_bytes,
              uploaded_by
            )
          VALUES
            ($1, $2, $3, $4, $5, $6, $7)
          RETURNING
            id,
            part_id,
            original_name,
            stored_name,
            storage_path,
            mime_type,
            size_bytes,
            uploaded_by,
            uploaded_at
        `,
        [
          file.partId,
          file.originalName,
          file.storedName,
          file.storagePath,
          file.mimeType,
          file.sizeBytes,
          file.uploadedBy
        ]
      );

      await client.query("COMMIT");

      return {
        file: mapPartDrawingFile(createdResult.rows[0]),
        previousFile
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteByPartId(partId: number): Promise<PartDrawingFile | null> {
    const result = await postgresPool.query<PartDrawingFileRow>(
      `
        DELETE FROM part_drawing_files
        WHERE part_id = $1
        RETURNING
          id,
          part_id,
          original_name,
          stored_name,
          storage_path,
          mime_type,
          size_bytes,
          uploaded_by,
          uploaded_at
      `,
      [partId]
    );

    const row = result.rows[0];

    return row ? mapPartDrawingFile(row) : null;
  }
}