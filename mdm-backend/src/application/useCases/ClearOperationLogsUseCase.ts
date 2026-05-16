import type { OperationLogRepository } from "../../domain/repositories/OperationLogRepository";

export class ClearOperationLogsUseCase {
  constructor(private readonly operationLogRepository: OperationLogRepository) {}

  async execute(): Promise<number> {
    return this.operationLogRepository.clear();
  }
}
