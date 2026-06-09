import type { Employee } from "../../domain/entities/Employee";
import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";

export class GetEmployeesUseCase {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async execute(): Promise<Employee[]> {
    return this.employeeRepository.findAll();
  }
}
