import type { OperationLog } from "../../domain/entities/OperationLog";
import type {
  CreateOperationLogRecord,
  OperationLogRepository
} from "../../domain/repositories/OperationLogRepository";

type CreateOperationLogInput = {
  userName: string;
  userRole: string;
  action: string;
  section: string;
  description: string;
};

function normalizeText(value: string, fallback: string): string {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
}

export class CreateOperationLogUseCase {
  constructor(private readonly operationLogRepository: OperationLogRepository) {}

  async execute(input: CreateOperationLogInput): Promise<OperationLog> {
    const record: CreateOperationLogRecord = {
      userName: normalizeText(input.userName, "Неизвестный пользователь"),
      userRole: normalizeText(input.userRole, "unknown"),
      action: normalizeText(input.action, "Операция"),
      section: normalizeText(input.section, "Система"),
      description: normalizeText(input.description, "Действие без описания")
    };

    if (record.userName.length > 255) {
      throw new Error("Имя пользователя слишком длинное");
    }

    if (record.userRole.length > 50) {
      throw new Error("Роль пользователя слишком длинная");
    }

    if (record.action.length > 120) {
      throw new Error("Название операции слишком длинное");
    }

    if (record.section.length > 120) {
      throw new Error("Название раздела слишком длинное");
    }

    return this.operationLogRepository.create(record);
  }
}
