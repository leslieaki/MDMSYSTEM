import type { Department } from "../entities/Department";

export interface DepartmentRepository {
  findAll(): Promise<Department[]>;
}
