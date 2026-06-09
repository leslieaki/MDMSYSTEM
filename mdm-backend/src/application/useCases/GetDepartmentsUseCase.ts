import type { Department } from "../../domain/entities/Department";
import type { DepartmentRepository } from "../../domain/repositories/DepartmentRepository";

export class GetDepartmentsUseCase {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(): Promise<Department[]> {
    return this.departmentRepository.findAll();
  }
}
