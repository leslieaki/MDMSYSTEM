const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export type Part = {
  id: number;
  nomenclatureId: number;
  code: string;
  name: string;
  category: string;
  material: string;
  unit: string;
  weight: number;
  stock: number;
  minStock: number;
  drawing: string;
  supplier: string;
};

export type PartNomenclature = {
  id: number;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
};

export type Purchase = {
  id: number;
  rawName: string;
  partId: number;
  quantity: number;
  price: number;
  supplier: string;
  employee: string;
  date: string;
};

export type Department = {
  id: number;
  name: string;
  manager: string;
  count: number;
};

export type Employee = {
  id: number;
  name: string;
  position: string;
  department: string;
  role: string;
};

export type AuthUserRole = "superadmin" | "admin" | "worker";

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  role: AuthUserRole;
};

export type ManagedAuthUser = AuthUser & {
  isActive: boolean;
  createdAt: string;
};

export type CreateAuthUserData = {
  username: string;
  displayName: string;
  role: AuthUserRole;
  password: string;
};

export type UpdateAuthUserData = {
  displayName: string;
  role: AuthUserRole;
  isActive: boolean;
};

export type ChangeAuthUserPasswordData = {
  password: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type LoginData = {
  username: string;
  password: string;
};

export type ReferenceKind =
  | "part-categories"
  | "materials"
  | "suppliers"
  | "measurement-units";

export type ReferenceItem = {
  id: number;
  name: string;
  description: string;
};

export type CreatePurchaseData = {
  partId: number;
  quantity: number;
  price: number;
  employee: string;
};

export type CreatePartData = {
  nomenclatureId: number;
  supplier: string;
  unit: string;
  weight: number;
  stock: number;
  minStock: number;
};

export type UpdatePartData = CreatePartData;

export type CreatePartNomenclatureData = {
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
};

export type UpdatePartNomenclatureData = CreatePartNomenclatureData;

export type DeletePartNomenclatureData = {
  replacementId?: number;
};

export type DeletePartNomenclatureResult = {
  deletedItem: PartNomenclature;
  replacementItem: PartNomenclature | null;
  affectedParts: number;
};

export type CreateReferenceItemData = {
  name: string;
  description: string;
};

export type UpdateReferenceItemData = {
  name: string;
  description: string;
};

export type DeleteReferenceItemData = {
  replacementName?: string;
};

export type DeleteReferenceItemResult = {
  deletedItem: ReferenceItem;
  replacementItem: ReferenceItem | null;
  affectedParts: number;
  affectedNomenclature: number;
  affectedPurchases: number;
};

export type DrawingImagesMap = Record<string, string>;

export type PartDrawingFile = {
  id: number;
  partId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
};

export type PartDrawingFilesMap = Record<string, PartDrawingFile>;

export type UploadDrawingImageResult = PartDrawingFile;

export type DeleteDrawingImageResult = {
  partId: number;
  deleted: boolean;
  deletedFile: PartDrawingFile | null;
};

export type PartDrawingStorageIssue = {
  type: "missing-file";
  partId: number;
  fileId: number;
  originalName: string;
  storedName: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  message: string;
};

export type StockReportStatus = "Норма" | "Низкий остаток" | "Дефицит";

export type StockReportItem = {
  partId: number;
  code: string;
  name: string;
  category: string;
  material: string;
  unit: string;
  stock: number;
  minStock: number;
  stockStatus: StockReportStatus;
  supplier: string;
  drawing: string;
  purchaseCount: number;
  purchasedQuantity: number;
  purchaseTotal: number;
};

export type OperationLogEntry = {
  id: number;
  createdAt: string;
  user: string;
  action: string;
  section: string;
  description: string;
};

type OperationLogResponse = {
  id: number;
  userName: string;
  userRole: string;
  action: string;
  section: string;
  description: string;
  createdAt: string;
};

export type CreateOperationLogData = {
  user: string;
  role?: string;
  action: string;
  section: string;
  description: string;
};

export type ClearOperationLogsResult = {
  message: string;
  deletedCount: number;
};

function mapOperationLog(log: OperationLogResponse): OperationLogEntry {
  return {
    id: log.id,
    createdAt: log.createdAt,
    user: log.userName || log.userRole || "Неизвестный пользователь",
    action: log.action,
    section: log.section,
    description: log.description,
  };
}

const AUTH_SESSION_STORAGE_KEY = "mdm-auth-session";

export function getStoredAuthSession(): AuthSession | null {
  const rawSession = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession;

    if (!session.token || !session.user) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function storeAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

function getAuthToken(): string {
  return getStoredAuthSession()?.token || "";
}

function createRequestHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  const token = getAuthToken();

  if (token && !result.has("Authorization")) {
    result.set("Authorization", `Bearer ${token}`);
  }

  return result;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: createRequestHeaders(options?.headers)
  });

  if (!response.ok) {
    let message = "Ошибка запроса к серверу";

    try {
      const error = await response.json();
      message = error.message || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json();
}

function createAbsoluteApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/api/")) {
    return `http://localhost:4000${path}`;
  }

  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function loginRequest(data: LoginData): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function getCurrentUserRequest(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>("/auth/me");
}

export function getAuthUsers(): Promise<ManagedAuthUser[]> {
  return request<ManagedAuthUser[]>("/auth/users");
}

export function createAuthUserRequest(
  data: CreateAuthUserData,
): Promise<ManagedAuthUser> {
  return request<ManagedAuthUser>("/auth/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function updateAuthUserRequest(
  id: number,
  data: UpdateAuthUserData,
): Promise<ManagedAuthUser> {
  return request<ManagedAuthUser>(`/auth/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function changeAuthUserPasswordRequest(
  id: number,
  data: ChangeAuthUserPasswordData,
): Promise<ManagedAuthUser> {
  return request<ManagedAuthUser>(`/auth/users/${id}/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function getParts(): Promise<Part[]> {
  return request<Part[]>("/parts");
}

export function createPartRequest(data: CreatePartData): Promise<Part> {
  return request<Part>("/parts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function updatePartRequest(
  id: number,
  data: UpdatePartData,
): Promise<Part> {
  return request<Part>(`/parts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function getPartDrawingFiles(): Promise<PartDrawingFilesMap> {
  const files = await request<PartDrawingFilesMap>("/parts/drawing-files");

  return Object.fromEntries(
    Object.entries(files).map(([partId, file]) => [
      partId,
      {
        ...file,
        url: createAbsoluteApiUrl(file.url),
      },
    ]),
  );
}

async function fetchDrawingImageBlobUrl(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: createRequestHeaders()
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }

    let message = "Ошибка получения фото чертежа";

    try {
      const error = await response.json();
      message = error.message || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  return URL.createObjectURL(blob);
}

export async function getDrawingImages(): Promise<DrawingImagesMap> {
  const files = await getPartDrawingFiles();
  const entries = await Promise.all(
    Object.entries(files).map(async ([partId, file]) => {
      const objectUrl = await fetchDrawingImageBlobUrl(file.url);

      return objectUrl ? ([partId, objectUrl] as const) : null;
    }),
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)));
}

export async function uploadDrawingImageRequest(
  partId: number,
  file: File,
  uploadedBy = "Неизвестный пользователь",
): Promise<UploadDrawingImageResult> {
  const response = await fetch(`${API_URL}/parts/${partId}/drawing-file`, {
    method: "PUT",
    headers: createRequestHeaders({
      "Content-Type": file.type,
      "X-File-Name": encodeURIComponent(file.name),
      "X-Uploaded-By": encodeURIComponent(uploadedBy),
    }),
    body: file,
  });

  if (!response.ok) {
    let message = "Ошибка загрузки фото чертежа";

    try {
      const error = await response.json();
      message = error.message || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  const result = (await response.json()) as UploadDrawingImageResult;

  return {
    ...result,
    url: URL.createObjectURL(file),
  };
}

export function deleteDrawingImageRequest(
  partId: number,
): Promise<DeleteDrawingImageResult> {
  return request<DeleteDrawingImageResult>(`/parts/${partId}/drawing-file`, {
    method: "DELETE",
  });
}

export function getDrawingStorageIssuesRequest(): Promise<PartDrawingStorageIssue[]> {
  return request<PartDrawingStorageIssue[]>("/parts/drawing-storage-issues");
}

export function clearMissingDrawingFileRecordRequest(
  partId: number,
): Promise<DeleteDrawingImageResult> {
  return request<DeleteDrawingImageResult>(
    `/parts/${partId}/drawing-file/missing-record`,
    {
      method: "DELETE",
    },
  );
}

export function getStockReport(): Promise<StockReportItem[]> {
  return request<StockReportItem[]>("/reports/stock");
}

export async function getOperationLogs(): Promise<OperationLogEntry[]> {
  const logs = await request<OperationLogResponse[]>("/operation-logs");

  return logs.map(mapOperationLog);
}

export async function createOperationLogRequest(
  data: CreateOperationLogData,
): Promise<OperationLogEntry> {
  const log = await request<OperationLogResponse>("/operation-logs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: data.action,
      section: data.section,
      description: data.description,
    }),
  });

  return mapOperationLog(log);
}

export function clearOperationLogsRequest(): Promise<ClearOperationLogsResult> {
  return request<ClearOperationLogsResult>("/operation-logs", {
    method: "DELETE",
  });
}

export function getPartNomenclature(): Promise<PartNomenclature[]> {
  return request<PartNomenclature[]>("/part-nomenclature");
}

export function createPartNomenclatureRequest(
  data: CreatePartNomenclatureData,
): Promise<PartNomenclature> {
  return request<PartNomenclature>("/part-nomenclature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function updatePartNomenclatureRequest(
  id: number,
  data: UpdatePartNomenclatureData,
): Promise<PartNomenclature> {
  return request<PartNomenclature>(`/part-nomenclature/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function deletePartNomenclatureRequest(
  id: number,
  data: DeletePartNomenclatureData,
): Promise<DeletePartNomenclatureResult> {
  return request<DeletePartNomenclatureResult>(`/part-nomenclature/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function getPurchases(): Promise<Purchase[]> {
  return request<Purchase[]>("/purchases");
}

export function createPurchaseRequest(
  data: CreatePurchaseData,
): Promise<Purchase> {
  return request<Purchase>("/purchases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function getDepartments(): Promise<Department[]> {
  return request<Department[]>("/departments");
}

export function getEmployees(): Promise<Employee[]> {
  return request<Employee[]>("/employees");
}

export function getReferences(kind: ReferenceKind): Promise<ReferenceItem[]> {
  return request<ReferenceItem[]>(`/references/${kind}`);
}

export function createReferenceItemRequest(
  kind: ReferenceKind,
  data: CreateReferenceItemData,
): Promise<ReferenceItem> {
  return request<ReferenceItem>(`/references/${kind}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function updateReferenceItemRequest(
  kind: ReferenceKind,
  id: number,
  data: UpdateReferenceItemData,
): Promise<ReferenceItem> {
  return request<ReferenceItem>(`/references/${kind}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function deleteReferenceItemRequest(
  kind: ReferenceKind,
  id: number,
  data: DeleteReferenceItemData,
): Promise<DeleteReferenceItemResult> {
  return request<DeleteReferenceItemResult>(`/references/${kind}/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
