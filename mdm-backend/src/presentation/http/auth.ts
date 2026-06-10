import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type {
  AuthUser,
  AuthUserRole,
  AuthUserSafe
} from "../../domain/entities/AuthUser";
import type { AuthUserRepository } from "../../domain/repositories/AuthUserRepository";

export type AuthTokenPayload = {
  userId: number;
  username: string;
  role: AuthUserRole;
  exp: number;
};

export type AuthenticatedRequest = Request & {
  authUser?: AuthUserSafe;
};

const tokenTtlSeconds = 8 * 60 * 60;

function getTokenSecret(): string {
  const tokenSecret = process.env.AUTH_TOKEN_SECRET?.trim();

  if (!tokenSecret) {
    throw new Error("AUTH_TOKEN_SECRET is required");
  }

  if (tokenSecret.length < 32) {
    throw new Error("AUTH_TOKEN_SECRET must contain at least 32 characters");
  }

  return tokenSecret;
}

function toSafeUser(user: AuthUser): AuthUserSafe {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    departmentId: user.departmentId,
    departmentName: user.departmentName,
    role: user.role
  };
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return createHmac("sha256", getTokenSecret()).update(value).digest("base64url");
}

function verifySignature(value: string, signature: string): boolean {
  const expectedSignature = sign(value);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function createAuthToken(user: AuthUserSafe): string {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const payload: AuthTokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + tokenTtlSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const [encodedHeader, encodedPayload, signature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error("Некорректный токен авторизации");
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  if (!verifySignature(unsignedToken, signature)) {
    throw new Error("Некорректная подпись токена");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;

  if (!payload.userId || !payload.username || !payload.role || !payload.exp) {
    throw new Error("Некорректные данные токена");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Срок действия сессии истек");
  }

  return payload;
}

export function createAuthMiddleware(
  authUserRepository: AuthUserRepository
): RequestHandler {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authorization = request.headers.authorization || "";
      const [scheme, token] = authorization.split(" ");

      if (scheme !== "Bearer" || !token) {
        response.status(401).json({
          message: "Требуется авторизация"
        });
        return;
      }

      const payload = verifyAuthToken(token);
      const user = await authUserRepository.findById(payload.userId);

      if (!user || !user.isActive) {
        response.status(401).json({
          message: "Пользователь не найден или заблокирован"
        });
        return;
      }

      (request as AuthenticatedRequest).authUser = toSafeUser(user);
      next();
    } catch (error) {
      response.status(401).json({
        message: error instanceof Error ? error.message : "Ошибка авторизации"
      });
    }
  };
}

export function requireRole(...roles: AuthUserRole[]): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const user = (request as AuthenticatedRequest).authUser;

    if (!user) {
      response.status(401).json({
        message: "Требуется авторизация"
      });
      return;
    }

    if (!roles.includes(user.role)) {
      response.status(403).json({
        message: "Недостаточно прав для выполнения операции"
      });
      return;
    }

    next();
  };
}
