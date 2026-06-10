import type { Request, Response } from "express";
import type { GetMdmQualityReportUseCase } from "../../../application/useCases/GetMdmQualityReportUseCase";
import type { GetStockReportUseCase } from "../../../application/useCases/GetStockReportUseCase";

export class ReportsController {
  constructor(
    private readonly getStockReportUseCase: GetStockReportUseCase,
    private readonly getMdmQualityReportUseCase: GetMdmQualityReportUseCase
  ) {}

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

  getMdmQualityReport = async (
    _request: Request,
    response: Response
  ): Promise<void> => {
    try {
      const report = await this.getMdmQualityReportUseCase.execute();

      response.json(report);
    } catch (error) {
      console.error(error);

      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Ошибка формирования отчета качества мастер-данных"
      });
    }
  };
}
