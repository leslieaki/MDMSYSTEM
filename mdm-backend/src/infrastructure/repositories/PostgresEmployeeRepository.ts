import type { Employee } from "../../domain/entities/Employee";
import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";
import { postgresPool } from "../database/PostgresConnection";

type EmployeeRow = {
  id: number;
  name: string;
  position: string;
  department: string;
  role: string;
};

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    department: row.department,
    role: row.role
  };
}

export class PostgresEmployeeRepository implements EmployeeRepository {
  async findAll(): Promise<Employee[]> {
    const result = await postgresPool.query<EmployeeRow>(`
      SELECT
        id,
        name,
        position,
        department,
        role
      FROM employees
      ORDER BY id ASC
    `);

    return result.rows.map(mapEmployee);
  }
}
