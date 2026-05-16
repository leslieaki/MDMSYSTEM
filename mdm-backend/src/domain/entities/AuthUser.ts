export type AuthUserRole = "superadmin" | "admin" | "worker";

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  role: AuthUserRole;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  isActive: boolean;
  createdAt: string;
};

export type AuthUserSafe = {
  id: number;
  username: string;
  displayName: string;
  role: AuthUserRole;
};

export type AuthUserListItem = AuthUserSafe & {
  isActive: boolean;
  createdAt: string;
};