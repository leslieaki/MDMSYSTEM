import type { Department } from "../../domain/entities/Department";
import type { DepartmentRepository } from "../../domain/repositories/DepartmentRepository";
import { postgresPool } from "../database/PostgresConnection";

type DepartmentRow = {
  id: number;
  name: string;
  manager: string;
  count: number;
};

function mapDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    manager: row.manager,
    count: row.count
  };
}

export class PostgresDepartmentRepository implements DepartmentRepository {
  async findAll(): Promise<Department[]> {
    const result = await postgresPool.query<DepartmentRow>(`
      SELECT
        id,
        name,
        manager,
        employee_count AS count
      FROM departments
      ORDER BY id ASC
    `);

    return result.rows.map(mapDepartment);
  }
}
