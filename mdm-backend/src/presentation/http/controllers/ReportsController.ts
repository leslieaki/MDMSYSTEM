import type { Request, Response } from "express";
import type { GetStockReportUseCase } from "../../../application/useCases/GetStockReportUseCase";

export class ReportsController {
  constructor(private readonly getStockReportUseCase: GetStockReportUseCase) {}

  getStockReport = async (
    _request: Request,
    response: Response
  ): Promise<void> => {
    try {
      const report = await this.getStockReportUseCase.execute();

      response.json(report);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка формирования отчета по складу"
      });
    }
  };
}
