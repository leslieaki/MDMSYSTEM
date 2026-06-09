import type { Request, Response } from "express";
import type { GetDepartmentsUseCase } from "../../../application/useCases/GetDepartmentsUseCase";

export class DepartmentsController {
  constructor(private readonly getDepartmentsUseCase: GetDepartmentsUseCase) {}

  getAll = async (_request: Request, response: Response): Promise<void> => {
    try {
      const departments = await this.getDepartmentsUseCase.execute();

      response.json(departments);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка получения подразделений"
      });
    }
  };
}
