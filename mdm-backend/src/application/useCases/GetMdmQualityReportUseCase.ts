import type {
  MdmQualityReport,
  MdmQualityReportRepository
} from "../../domain/repositories/MdmQualityReportRepository";

export class GetMdmQualityReportUseCase {
  constructor(
    private readonly mdmQualityReportRepository: MdmQualityReportRepository
  ) {}

  execute(): Promise<MdmQualityReport> {
    return this.mdmQualityReportRepository.getQualityReport();
  }
}
