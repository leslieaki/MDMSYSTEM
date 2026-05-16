import type { OperationLog } from "../entities/OperationLog";

export type CreateOperationLogRecord = {
  userName: string;
  userRole: string;
  action: string;
  section: string;
  description: string;
};

export interface OperationLogRepository {
  findAll(): Promise<OperationLog[]>;
  create(record: CreateOperationLogRecord): Promise<OperationLog>;
  clear(): Promise<number>;
}
