import type { Request, Response } from "express";
import type { GetEmployeesUseCase } from "../../../application/useCases/GetEmployeesUseCase";

export class EmployeesController {
  constructor(private readonly getEmployeesUseCase: GetEmployeesUseCase) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const employees = await this.getEmployeesUseCase.execute();

      response.json(employees);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения сотрудников"
      });
    }
  };
}
