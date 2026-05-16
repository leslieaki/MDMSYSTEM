import type { OperationLog } from "../../domain/entities/OperationLog";
import type { OperationLogRepository } from "../../domain/repositories/OperationLogRepository";

export class GetOperationLogsUseCase {
  constructor(private readonly operationLogRepository: OperationLogRepository) {}

  async execute(): Promise<OperationLog[]> {
    return this.operationLogRepository.findAll();
  }
}
