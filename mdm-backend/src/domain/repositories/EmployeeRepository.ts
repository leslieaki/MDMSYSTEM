import type { Employee } from "../entities/Employee";

export interface EmployeeRepository {
  findAll(): Promise<Employee[]>;
}
