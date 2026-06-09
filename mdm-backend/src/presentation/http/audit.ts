import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { CreateOperationLogUseCase } from "../../application/useCases/CreateOperationLogUseCase";
import type { AuthenticatedRequest } from "./auth";

type AuditLogOptions = {
  action: string;
  section: string;
  description: string;
};

export function createAuditLogMiddleware(
  createOperationLogUseCase: CreateOperationLogUseCase,
  options: AuditLogOptions
): RequestHandler {
  return async (
    request: Request,
    _response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authUser = (request as AuthenticatedRequest).authUser;

      if (authUser) {
        await createOperationLogUseCase.execute({
          userName: authUser.displayName,
          userRole: authUser.role,
          action: options.action,
          section: options.section,
          description: options.description
        });
      }
    } catch (error) {
      console.error("Operation audit log failed:", error);
    }

    next();
  };
}
