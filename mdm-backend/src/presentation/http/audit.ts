import type { Request, RequestHandler, Response } from "express";
import type { CreateOperationLogUseCase } from "../../application/useCases/CreateOperationLogUseCase";
import type { AuthenticatedRequest } from "./auth";

type AuditLogOptions = {
  action: string;
  section: string;
  description: string | ((request: Request, response: Response) => string);
};

function getDescription(
  description: AuditLogOptions["description"],
  request: Request,
  response: Response
): string {
  if (typeof description === "function") {
    return description(request, response);
  }

  return description;
}

export function createAuditLogMiddleware(
  createOperationLogUseCase: CreateOperationLogUseCase,
  options: AuditLogOptions
): RequestHandler {
  return (request: Request, response: Response, next) => {
    response.once("finish", () => {
      if (response.statusCode >= 400) {
        return;
      }

      const user = (request as AuthenticatedRequest).authUser;

      if (!user) {
        return;
      }

      void createOperationLogUseCase
        .execute({
          userName: user.displayName,
          userRole: user.role,
          action: options.action,
          section: options.section,
          description: getDescription(options.description, request, response)
        })
        .catch((error: unknown) => {
          console.error("Audit log write error:", error);
        });
    });

    next();
  };
}