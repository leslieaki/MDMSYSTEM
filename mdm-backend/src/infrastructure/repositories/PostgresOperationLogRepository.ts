import type { OperationLog } from "../../domain/entities/OperationLog";
import type {
  CreateOperationLogRecord,
  OperationLogRepository
} from "../../domain/repositories/OperationLogRepository";
import { postgresPool } from "../database/PostgresConnection";

type OperationLogRow = {
  id: number;
  user_name: string;
  user_role: string;
  action: string;
  section: string;
  description: string;
  created_at: string | Date;
};

function mapDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function mapOperationLog(row: OperationLogRow): OperationLog {
  return {
    id: row.id,
    userName: row.user_name,
    userRole: row.user_role,
    action: row.action,
    section: row.section,
    description: row.description,
    createdAt: mapDate(row.created_at)
  };
}

const selectSql = `
  SELECT
    id,
    user_name,
    user_role,
    action,
    section,
    description,
    created_at
  FROM operation_logs
`;

export class PostgresOperationLogRepository implements OperationLogRepository {
  async findAll(): Promise<OperationLog[]> {
    const result = await postgresPool.query<OperationLogRow>(`
      ${selectSql}
      ORDER BY created_at DESC, id DESC
    `);

    return result.rows.map(mapOperationLog);
  }

  async create(record: CreateOperationLogRecord): Promise<OperationLog> {
    const result = await postgresPool.query<OperationLogRow>(
      `
        INSERT INTO operation_logs
          (
            user_name,
            user_role,
            action,
            section,
            description
          )
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING
          id,
          user_name,
          user_role,
          action,
          section,
          description,
          created_at
      `,
      [
        record.userName,
        record.userRole,
        record.action,
        record.section,
        record.description
      ]
    );

    return mapOperationLog(result.rows[0]);
  }

  async clear(): Promise<number> {
    const result = await postgresPool.query("DELETE FROM operation_logs");

    return result.rowCount ?? 0;
  }
}
