import type {
  StockReportItem,
  StockReportRepository
} from "../../domain/repositories/StockReportRepository";

export class GetStockReportUseCase {
  constructor(private readonly stockReportRepository: StockReportRepository) {}

  execute(): Promise<StockReportItem[]> {
    return this.stockReportRepository.findAll();
  }
}