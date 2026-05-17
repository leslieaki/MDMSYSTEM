import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  changeAuthUserPasswordRequest,
  clearAuthSession,
  clearOperationLogsRequest,
  createAuthUserRequest,
  createOperationLogRequest,
  createPartNomenclatureRequest,
  createPartRequest,
  createPurchaseRequest,
  createReferenceItemRequest,
  deleteDrawingImageRequest,
  deletePartNomenclatureRequest,
  deleteReferenceItemRequest,
  getAuthUsers,
  getDepartments,
  getDrawingImages,
  getEmployees,
  getOperationLogs,
  getPartNomenclature,
  getParts,
  getPurchases,
  getReferences,
  getStockReport,
  getStoredAuthSession,
  loginRequest,
  storeAuthSession,
  updateAuthUserRequest,
  updatePartNomenclatureRequest,
  updatePartRequest,
  updateReferenceItemRequest,
  uploadDrawingImageRequest
} from "./api";
import type {
  Department,
  AuthSession,
  AuthUserRole,
  DrawingImagesMap,
  Employee,
  ManagedAuthUser,
  Part,
  PartNomenclature,
  Purchase,
  ReferenceItem,
  ReferenceKind,
  StockReportItem
} from "./api";
import "./styles.css";

type Page =
  | "dashboard"
  | "parts"
  | "purchases"
  | "warehouse"
  | "reports"
  | "employees"
  | "drawings"
  | "journal"
  | "users"
  | "admin";

type Role = AuthUserRole;

type LoginForm = {
  username: string;
  password: string;
};

type CreateUserForm = {
  username: string;
  displayName: string;
  role: AuthUserRole;
  password: string;
};

type EditUserForm = {
  displayName: string;
  role: AuthUserRole;
  isActive: boolean;
};

type PasswordUserForm = {
  password: string;
};

type MenuGroup = "control" | "master-data" | "operations" | "administration";

type MenuItem = {
  id: Page;
  title: string;
  subtitle: string;
  group: MenuGroup;
  adminOnly?: boolean;
};

type PurchaseForm = {
  partId: string;
  quantity: string;
  price: string;
  employee: string;
};

type PartForm = {
  nomenclatureId: string;
  supplier: string;
  unit: string;
  weight: string;
  stock: string;
  minStock: string;
};

type NomenclatureForm = {
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
};

type ReferenceForm = {
  name: string;
  description: string;
};

type ReferencesMap = Record<ReferenceKind, ReferenceItem[]>;

type ReferenceModalMode = "create" | "edit" | "delete";

type ReferenceModalState = {
  kind: ReferenceKind;
  mode: ReferenceModalMode;
  item?: ReferenceItem;
};

type PartModalMode = "create" | "edit";

type PartModalState = {
  mode: PartModalMode;
  part?: Part;
};

type PartDetailTab =
  | "passport"
  | "warehouse"
  | "purchases"
  | "drawing"
  | "quality"
  | "history";

type NomenclatureModalMode = "create" | "edit" | "delete";

type NomenclatureModalState = {
  mode: NomenclatureModalMode;
  item?: PartNomenclature;
};

type InfoModalImage = {
  src: string;
  alt: string;
  caption?: string;
};

type InfoModalState = {
  title: string;
  subtitle?: string;
  rows: Array<{
    label: string;
    value: string;
  }>;
  image?: InfoModalImage;
};

type OperationLogEntry = {
  id: number;
  createdAt: string;
  user: string;
  action: string;
  section: string;
  description: string;
};


const ACTIVE_PAGE_STORAGE_KEY = "mdm-active-page";
const CURRENT_EMPLOYEE_STORAGE_KEY = "mdm-current-employee-id";

const referenceKinds: ReferenceKind[] = [
  "part-categories",
  "materials",
  "suppliers",
  "measurement-units"
];

const menu: MenuItem[] = [
  {
    id: "dashboard",
    title: "Центр контроля",
    subtitle: "Риски, статусы, операции",
    group: "control"
  },
  {
    id: "reports",
    title: "Отчеты",
    subtitle: "Аналитика склада",
    group: "control"
  },
  {
    id: "parts",
    title: "Детали",
    subtitle: "Карточки мастер-данных",
    group: "master-data"
  },
  {
    id: "admin",
    title: "Номенклатура",
    subtitle: "Справочники и правила",
    group: "master-data",
    adminOnly: true
  },
  {
    id: "drawings",
    title: "Чертежи",
    subtitle: "Техническая документация",
    group: "master-data"
  },
  {
    id: "warehouse",
    title: "Склад",
    subtitle: "Остатки и дефицит",
    group: "operations"
  },
  {
    id: "purchases",
    title: "Закупки",
    subtitle: "Журнал снабжения",
    group: "operations"
  },
  {
    id: "employees",
    title: "Сотрудники",
    subtitle: "Подразделения и роли",
    group: "administration"
  },
  {
    id: "users",
    title: "Пользователи",
    subtitle: "Учетные записи",
    group: "administration",
    adminOnly: true
  },
  {
    id: "journal",
    title: "Журнал",
    subtitle: "История действий",
    group: "administration"
  }
];

const initialPurchaseForm: PurchaseForm = {
  partId: "",
  quantity: "",
  price: "",
  employee: ""
};

const initialPartForm: PartForm = {
  nomenclatureId: "",
  supplier: "",
  unit: "",
  weight: "",
  stock: "",
  minStock: ""
};

const initialNomenclatureForm: NomenclatureForm = {
  code: "",
  name: "",
  category: "",
  material: "",
  drawing: ""
};

const initialReferenceForm: ReferenceForm = {
  name: "",
  description: ""
};

const initialCreateUserForm: CreateUserForm = {
  username: "",
  displayName: "",
  role: "worker",
  password: ""
};

const initialEditUserForm: EditUserForm = {
  displayName: "",
  role: "worker",
  isActive: true
};

const initialPasswordUserForm: PasswordUserForm = {
  password: ""
};

const emptyReferences: ReferencesMap = {
  "part-categories": [],
  materials: [],
  suppliers: [],
  "measurement-units": []
};

function isValidPage(value: string | null): value is Page {
  return (
    value === "dashboard" ||
    value === "parts" ||
    value === "purchases" ||
    value === "warehouse" ||
    value === "reports" ||
    value === "employees" ||
    value === "drawings" ||
    value === "journal" ||
    value === "users" ||
    value === "admin"
  );
}

function getPageFromHash(): Page | null {
  const value = window.location.hash.replace("#", "").replace("/", "");

  return isValidPage(value) ? value : null;
}

function getInitialPage(): Page {
  const pageFromHash = getPageFromHash();
  const savedPage = localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);

  if (pageFromHash) {
    return pageFromHash;
  }

  return isValidPage(savedPage) ? savedPage : "dashboard";
}

function getReferenceTitle(kind: ReferenceKind): string {
  const titles: Record<ReferenceKind, string> = {
    "part-categories": "Категории деталей",
    materials: "Материалы",
    suppliers: "Поставщики",
    "measurement-units": "Единицы измерения"
  };

  return titles[kind];
}

function getReferenceSubtitle(kind: ReferenceKind): string {
  const subtitles: Record<ReferenceKind, string> = {
    "part-categories": "Утвержденные типы деталей и комплектующих",
    materials: "Разрешенные материалы для номенклатуры",
    suppliers: "Поставщики, доступные для карточек деталей и закупок",
    "measurement-units": "Единицы учета для склада и закупок"
  };

  return subtitles[kind];
}

function getRoleTitle(role: Role): string {
  if (role === "superadmin") {
    return "Суперадминистратор";
  }

  return role === "admin" ? "Администратор системы" : "Работник";
}

function hasAdminAccess(role: Role): boolean {
  return role === "superadmin" || role === "admin";
}

function canCreateUserWithRole(currentRole: Role, targetRole: AuthUserRole): boolean {
  if (targetRole === "superadmin") {
    return false;
  }

  if (currentRole === "superadmin") {
    return targetRole === "admin" || targetRole === "worker";
  }

  return currentRole === "admin" && targetRole === "worker";
}

function canManageUserRecord(
  currentRole: Role,
  currentUserId: number,
  targetUser: ManagedAuthUser
): boolean {
  if (currentRole === "superadmin") {
    return targetUser.role !== "superadmin" || targetUser.id === currentUserId;
  }

  return currentRole === "admin" && targetUser.role === "worker";
}

function canChangeUserPassword(
  currentRole: Role,
  currentUserId: number,
  targetUser: ManagedAuthUser
): boolean {
  if (currentRole === "superadmin") {
    return true;
  }

  return (
    currentRole === "admin" &&
    (targetUser.role === "worker" || targetUser.id === currentUserId)
  );
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function decimalInputValue(value: string): string {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const firstDotIndex = normalized.indexOf(".");

  if (firstDotIndex === -1) {
    return normalized;
  }

  return (
    normalized.slice(0, firstDotIndex + 1) +
    normalized.slice(firstDotIndex + 1).replace(/\./g, "")
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);
}

function getPageTitle(page: Page): string {
  const titles: Record<Page, string> = {
    dashboard: "Центр контроля",
    parts: "Справочник деталей",
    purchases: "Закупки",
    warehouse: "Складские остатки",
    reports: "Отчеты",
    employees: "Сотрудники и подразделения",
    drawings: "Чертежи",
    journal: "Журнал операций",
    users: "Пользователи",
    admin: "Администрирование"
  };

  return titles[page];
}


function getPageDescription(page: Page): string {
  const descriptions: Record<Page, string> = {
    dashboard: "Оперативный контроль качества мастер-данных, складских рисков и последних действий",
    parts: "Реестр утвержденных карточек деталей с привязкой к номенклатуре, поставщикам и чертежам",
    purchases: "Рабочий журнал снабжения на основе утвержденных карточек деталей",
    warehouse: "Контроль остатков, минимальных запасов и позиций для пополнения",
    reports: "Складская аналитика и выгрузка данных для контроля MDM-процессов",
    employees: "Подразделения, роли и ответственные сотрудники предприятия",
    drawings: "Хранение и просмотр технической документации по деталям",
    journal: "Аудит действий пользователей и административных операций",
    users: "Управление учетными записями, ролями и доступом",
    admin: "Администрирование справочников, номенклатуры и правил мастер-данных"
  };

  return descriptions[page];
}

function getMenuGroupTitle(group: MenuGroup): string {
  const titles: Record<MenuGroup, string> = {
    control: "Контроль",
    "master-data": "Мастер-данные",
    operations: "Операции",
    administration: "Администрирование"
  };

  return titles[group];
}

function getMenuGroupOrder(group: MenuGroup): number {
  const order: Record<MenuGroup, number> = {
    control: 0,
    "master-data": 1,
    operations: 2,
    administration: 3
  };

  return order[group];
}

function getFirstReferenceName(items: ReferenceItem[]): string {
  return items[0]?.name || "";
}

function createPartForm(
  nomenclature: PartNomenclature[],
  references: ReferencesMap
): PartForm {
  return {
    nomenclatureId: nomenclature[0] ? String(nomenclature[0].id) : "",
    supplier: getFirstReferenceName(references.suppliers),
    unit: getFirstReferenceName(references["measurement-units"]),
    weight: "",
    stock: "",
    minStock: ""
  };
}

function createNomenclatureForm(references: ReferencesMap): NomenclatureForm {
  return {
    ...initialNomenclatureForm,
    category: getFirstReferenceName(references["part-categories"]),
    material: getFirstReferenceName(references.materials)
  };
}

function arePartFormsEqual(left: PartForm, right: PartForm): boolean {
  return (
    left.nomenclatureId === right.nomenclatureId &&
    left.supplier === right.supplier &&
    left.unit === right.unit &&
    left.weight === right.weight &&
    left.stock === right.stock &&
    left.minStock === right.minStock
  );
}

function areNomenclatureFormsEqual(
  left: NomenclatureForm,
  right: NomenclatureForm
): boolean {
  return (
    left.code === right.code &&
    left.name === right.name &&
    left.category === right.category &&
    left.material === right.material &&
    left.drawing === right.drawing
  );
}

function areReferenceFormsEqual(
  left: ReferenceForm,
  right: ReferenceForm
): boolean {
  return left.name === right.name && left.description === right.description;
}

function confirmDiscardChanges(hasChanges: boolean): boolean {
  if (!hasChanges) {
    return true;
  }

  return window.confirm("Закрыть окно? Внесенные изменения будут потеряны.");
}

function normalizeDuplicateValue(value: string): string {
  return value.trim().toLowerCase();
}

function findDuplicateValues<T>(
  items: T[],
  getValue: (item: T) => string
): string[] {
  const counter = new Map<string, { value: string; count: number }>();

  items.forEach((item) => {
    const rawValue = getValue(item).trim();

    if (!rawValue) {
      return;
    }

    const key = normalizeDuplicateValue(rawValue);
    const current = counter.get(key);

    if (current) {
      current.count += 1;
      return;
    }

    counter.set(key, {
      value: rawValue,
      count: 1
    });
  });

  return Array.from(counter.values())
    .filter((item) => item.count > 1)
    .map((item) => `${item.value} (${item.count})`);
}

function formatDuplicateValues(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "Не найдены";
}

function escapeCsvValue(value: string | number): string {
  const text = String(value).replace(/"/g, '""');

  return `"${text}"`;
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function getPartStockStatus(part: Part): {
  className: string;
  tone: "success" | "warning" | "danger";
  title: string;
} {
  if (part.stock <= 0) {
    return {
      className: "warehouse-status warehouse-status--danger",
      tone: "danger",
      title: "Дефицит"
    };
  }

  if (part.stock < part.minStock) {
    return {
      className: "warehouse-status warehouse-status--warning",
      tone: "warning",
      title: "Низкий остаток"
    };
  }

  return {
    className: "warehouse-status warehouse-status--success",
    tone: "success",
    title: "Норма"
  };
}

function getPartStockProgress(part: Part): number {
  if (part.minStock <= 0) {
    return 100;
  }

  return Math.min(100, Math.round((part.stock / part.minStock) * 100));
}

function App() {
  const [page, setPageState] = useState<Page>(getInitialPage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    getStoredAuthSession()
  );
  const [loginForm, setLoginForm] = useState<LoginForm>({
    username: "",
    password: ""
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [parts, setParts] = useState<Part[]>([]);
  const [partNomenclature, setPartNomenclature] = useState<PartNomenclature[]>(
    []
  );
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stockReport, setStockReport] = useState<StockReportItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [references, setReferences] = useState<ReferencesMap>(emptyReferences);

  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(() => {
    return localStorage.getItem(CURRENT_EMPLOYEE_STORAGE_KEY) || "";
  });

  const [reportSearch, setReportSearch] = useState("");
  const [reportCategory, setReportCategory] = useState("all");
  const [reportStatus, setReportStatus] = useState("all");
  const [isRefreshingReport, setIsRefreshingReport] = useState(false);
  const [isLoading, setIsLoading] = useState(() => Boolean(authSession));
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [purchaseForm, setPurchaseForm] =
    useState<PurchaseForm>(initialPurchaseForm);

  const [partForm, setPartForm] = useState<PartForm>(initialPartForm);
  const [partFormInitial, setPartFormInitial] =
    useState<PartForm>(initialPartForm);
  const [partModal, setPartModal] = useState<PartModalState | null>(null);
  const [isSavingPart, setIsSavingPart] = useState(false);

  const [nomenclatureForm, setNomenclatureForm] =
    useState<NomenclatureForm>(initialNomenclatureForm);
  const [nomenclatureFormInitial, setNomenclatureFormInitial] =
    useState<NomenclatureForm>(initialNomenclatureForm);

  const [nomenclatureModal, setNomenclatureModal] =
    useState<NomenclatureModalState | null>(null);

  const [nomenclatureReplacementId, setNomenclatureReplacementId] =
    useState("");
  const [nomenclatureReplacementIdInitial, setNomenclatureReplacementIdInitial] =
    useState("");

  const [isSavingNomenclature, setIsSavingNomenclature] = useState(false);

  const [referenceModal, setReferenceModal] =
    useState<ReferenceModalState | null>(null);

  const [referenceForm, setReferenceForm] =
    useState<ReferenceForm>(initialReferenceForm);
  const [referenceFormInitial, setReferenceFormInitial] =
    useState<ReferenceForm>(initialReferenceForm);

  const [deleteReplacementName, setDeleteReplacementName] = useState("");
  const [deleteReplacementNameInitial, setDeleteReplacementNameInitial] =
    useState("");
  const [isSavingReference, setIsSavingReference] = useState(false);

  const [infoModal, setInfoModal] = useState<InfoModalState | null>(null);
  const [partDetailsId, setPartDetailsId] = useState<number | null>(null);
  const [operationLog, setOperationLog] =
    useState<OperationLogEntry[]>([]);
  const [drawingImages, setDrawingImages] =
    useState<DrawingImagesMap>({});

  const currentEmployee = employees.find(
    (employee) => String(employee.id) === currentEmployeeId
  );

  const role: Role = authSession?.user.role || "worker";
  const activePage: Page =
    !hasAdminAccess(role) && (page === "admin" || page === "users")
      ? "dashboard"
      : page;

  const visibleMenu = useMemo(() => {
    return menu.filter((item) => !item.adminOnly || hasAdminAccess(role));
  }, [role]);

  const authenticatedUserName = authSession?.user.displayName || "Не авторизован";

  const lowStockParts = useMemo(() => {
    return parts.filter((part) => part.stock > 0 && part.stock < part.minStock);
  }, [parts]);

  const deficitParts = useMemo(() => {
    return parts.filter((part) => part.stock <= 0);
  }, [parts]);

  const partsWithoutDrawings = useMemo(() => {
    return parts.filter((part) => !drawingImages[String(part.id)]);
  }, [parts, drawingImages]);

  const reportCategories = useMemo(() => {
    return Array.from(
      new Set(stockReport.map((item) => item.category).filter(Boolean))
    ).sort((left, right) => left.localeCompare(right, "ru"));
  }, [stockReport]);

  const filteredStockReport = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();

    return stockReport.filter((item) => {
      const matchesSearch = query
        ? `${item.code} ${item.name} ${item.category} ${item.material} ${item.supplier} ${item.drawing}`
            .toLowerCase()
            .includes(query)
        : true;
      const matchesCategory =
        reportCategory === "all" || item.category === reportCategory;
      const matchesStatus =
        reportStatus === "all" || item.stockStatus === reportStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stockReport, reportSearch, reportCategory, reportStatus]);

  const totalStock = useMemo(() => {
    return parts.reduce((sum, part) => sum + part.stock, 0);
  }, [parts]);

  const totalPurchases = useMemo(() => {
    return purchases.reduce((sum, purchase) => sum + purchase.price, 0);
  }, [purchases]);

  const selectedPartFormNomenclature = partNomenclature.find(
    (item) => String(item.id) === partForm.nomenclatureId
  );

  const selectedPurchasePart = parts.find(
    (part) => String(part.id) === purchaseForm.partId
  );

  const partDetails = useMemo(() => {
    if (partDetailsId === null) {
      return null;
    }

    return parts.find((part) => part.id === partDetailsId) || null;
  }, [partDetailsId, parts]);

  const isFormModalOpen = Boolean(partModal || nomenclatureModal || referenceModal);

  const backendStatusText = isLoading
    ? "Проверка backend..."
    : loadError
      ? "Backend API недоступен"
      : "Backend API подключен";

  function setPage(nextPage: Page) {
    const safePage: Page =
      !hasAdminAccess(role) && (nextPage === "admin" || nextPage === "users")
        ? "dashboard"
        : nextPage;

    localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, safePage);
    setIsMobileMenuOpen(false);

    if (getPageFromHash() === safePage) {
      setPageState(safePage);
      return;
    }

    window.location.hash = safePage;
  }

  function clearActionError() {
    setActionError("");
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  function refreshOperationLog(delayMs = 0): void {
    window.setTimeout(() => {
      void getOperationLogs()
        .then((entries) => {
          setOperationLog(entries);
        })
        .catch((requestError: unknown) => {
          setActionError(
            getErrorMessage(requestError, "Ошибка обновления журнала операций")
          );
        });
    }, delayMs);
  }

  function addOperationLog(
    action: string,
    section: string,
    description: string
  ): void {
    const serverAuditedActions = new Set([
      "Создание закупки",
      "Создание детали",
      "Редактирование детали",
      "Создание номенклатуры",
      "Редактирование номенклатуры",
      "Удаление номенклатуры",
      "Создание записи справочника",
      "Редактирование записи справочника",
      "Удаление записи справочника",
      "Загрузка чертежа",
      "Удаление чертежа",
      "Создание пользователя",
      "Редактирование пользователя",
      "Смена пароля пользователя"
    ]);

    if (serverAuditedActions.has(action)) {
      refreshOperationLog(250);
      return;
    }

    void createOperationLogRequest({
      user: authenticatedUserName,
      role,
      action,
      section,
      description
    })
      .then((createdEntry) => {
        setOperationLog((currentLog) => [createdEntry, ...currentLog].slice(0, 300));
      })
      .catch((requestError: unknown) => {
        setActionError(
          getErrorMessage(requestError, "Ошибка записи в журнал операций")
        );
      });
  }

  async function clearOperationLog(): Promise<void> {
    const confirmed = window.confirm("Очистить журнал операций?");

    if (!confirmed) {
      return;
    }

    try {
      clearActionError();
      await clearOperationLogsRequest();
      setOperationLog([]);
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError, "Ошибка очистки журнала операций")
      );
    }
  }

  function exportOperationLogCsv(): void {
    if (operationLog.length === 0) {
      setInfoModal({
        title: "Выгрузка журнала",
        subtitle: "Нет записей",
        rows: [
          {
            label: "Результат",
            value: "Журнал операций пуст, файл не создан"
          }
        ]
      });
      return;
    }

    const header = ["createdAt", "user", "action", "section", "description"];
    const lines = operationLog.map((entry) =>
      [
        formatDateTime(entry.createdAt),
        entry.user,
        entry.action,
        entry.section,
        entry.description
      ]
        .map(escapeCsvValue)
        .join(";")
    );

    const csv = [header.join(";"), ...lines].join("\n");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `mdm-operation-log-${date}.csv`;

    downloadCsv(filename, csv);
    addOperationLog("Выгрузка", "Журнал операций", `Создан файл ${filename}`);

    setInfoModal({
      title: "Выгрузка журнала",
      subtitle: "CSV-файл создан",
      rows: [
        { label: "Файл", value: filename },
        { label: "Записей", value: String(operationLog.length) }
      ]
    });
  }

  async function refreshStockReport(): Promise<void> {
    try {
      setIsRefreshingReport(true);
      clearActionError();

      const report = await getStockReport();
      setStockReport(report);

      addOperationLog(
        "Обновление",
        "Отчеты",
        `Обновлен отчет по складу, строк: ${report.length}`
      );
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError, "Ошибка обновления отчета по складу")
      );
    } finally {
      setIsRefreshingReport(false);
    }
  }

  function exportStockReportCsv(): void {
    if (!hasAdminAccess(role)) {
      setInfoModal({
        title: "Выгрузка отчета",
        subtitle: "Недостаточно прав",
        rows: [
          {
            label: "Результат",
            value: "Выгрузка CSV доступна только администратору"
          }
        ]
      });
      return;
    }

    if (filteredStockReport.length === 0) {
      setInfoModal({
        title: "Выгрузка отчета",
        subtitle: "Нет данных",
        rows: [
          {
            label: "Результат",
            value: "По текущим фильтрам нет строк для выгрузки"
          }
        ]
      });
      return;
    }

    const header = [
      "code",
      "name",
      "category",
      "material",
      "unit",
      "stock",
      "minStock",
      "stockStatus",
      "supplier",
      "drawing",
      "purchaseCount",
      "purchasedQuantity",
      "purchaseTotal"
    ];

    const lines = filteredStockReport.map((item) =>
      [
        item.code,
        item.name,
        item.category,
        item.material,
        item.unit,
        item.stock,
        item.minStock,
        item.stockStatus,
        item.supplier,
        item.drawing,
        item.purchaseCount,
        item.purchasedQuantity,
        item.purchaseTotal
      ]
        .map(escapeCsvValue)
        .join(";")
    );

    const csv = [header.join(";"), ...lines].join("\n");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `mdm-stock-report-${date}.csv`;

    downloadCsv(filename, csv);
    addOperationLog(
      "Выгрузка",
      "Отчеты",
      `Создан отчет ${filename}, строк: ${filteredStockReport.length}`
    );

    setInfoModal({
      title: "Выгрузка отчета",
      subtitle: "CSV-файл создан",
      rows: [
        { label: "Файл", value: filename },
        { label: "Строк", value: String(filteredStockReport.length) }
      ]
    });
  }

  function updatePurchaseForm(field: keyof PurchaseForm, value: string) {
    setPurchaseForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function updatePartForm(field: keyof PartForm, value: string) {
    setPartForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function updateNomenclatureForm(
    field: keyof NomenclatureForm,
    value: string
  ) {
    setNomenclatureForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function hasPartFormChanges(): boolean {
    return Boolean(partModal) && !arePartFormsEqual(partForm, partFormInitial);
  }

  function hasNomenclatureFormChanges(): boolean {
    if (!nomenclatureModal) {
      return false;
    }

    return (
      !areNomenclatureFormsEqual(nomenclatureForm, nomenclatureFormInitial) ||
      nomenclatureReplacementId !== nomenclatureReplacementIdInitial
    );
  }

  function hasReferenceFormChanges(): boolean {
    if (!referenceModal) {
      return false;
    }

    return (
      !areReferenceFormsEqual(referenceForm, referenceFormInitial) ||
      deleteReplacementName !== deleteReplacementNameInitial
    );
  }

  function openCreatePartModal() {
    const nextForm = createPartForm(partNomenclature, references);

    clearActionError();
    setPartForm(nextForm);
    setPartFormInitial(nextForm);
    setPartModal({ mode: "create" });
  }

  function openEditPartModal(part: Part) {
    const nextForm: PartForm = {
      nomenclatureId: String(part.nomenclatureId),
      supplier: part.supplier,
      unit: part.unit,
      weight: String(part.weight),
      stock: String(part.stock),
      minStock: String(part.minStock)
    };

    clearActionError();
    setPartForm(nextForm);
    setPartFormInitial(nextForm);
    setPartModal({
      mode: "edit",
      part
    });
  }

  function closePartModal() {
    setPartModal(null);
    setPartForm(initialPartForm);
    setPartFormInitial(initialPartForm);
    clearActionError();
  }

  function requestClosePartModal() {
    if (confirmDiscardChanges(hasPartFormChanges())) {
      closePartModal();
    }
  }

  function openCreateNomenclatureModal() {
    const nextForm = createNomenclatureForm(references);

    clearActionError();
    setNomenclatureForm(nextForm);
    setNomenclatureFormInitial(nextForm);
    setNomenclatureReplacementId("");
    setNomenclatureReplacementIdInitial("");
    setNomenclatureModal({ mode: "create" });
  }

  function openEditNomenclatureModal(item: PartNomenclature) {
    const nextForm: NomenclatureForm = {
      code: item.code,
      name: item.name,
      category: item.category,
      material: item.material,
      drawing: item.drawing
    };

    clearActionError();
    setNomenclatureForm(nextForm);
    setNomenclatureFormInitial(nextForm);
    setNomenclatureReplacementId("");
    setNomenclatureReplacementIdInitial("");
    setNomenclatureModal({
      mode: "edit",
      item
    });
  }

  function openDeleteNomenclatureModal(item: PartNomenclature) {
    const nextForm: NomenclatureForm = {
      code: item.code,
      name: item.name,
      category: item.category,
      material: item.material,
      drawing: item.drawing
    };

    clearActionError();
    setNomenclatureForm(nextForm);
    setNomenclatureFormInitial(nextForm);
    setNomenclatureReplacementId("");
    setNomenclatureReplacementIdInitial("");
    setNomenclatureModal({
      mode: "delete",
      item
    });
  }

  function closeNomenclatureModal() {
    setNomenclatureModal(null);
    setNomenclatureForm(initialNomenclatureForm);
    setNomenclatureFormInitial(initialNomenclatureForm);
    setNomenclatureReplacementId("");
    setNomenclatureReplacementIdInitial("");
    clearActionError();
  }

  function requestCloseNomenclatureModal() {
    if (confirmDiscardChanges(hasNomenclatureFormChanges())) {
      closeNomenclatureModal();
    }
  }

  function openCreateReferenceModal(kind: ReferenceKind) {
    clearActionError();
    setReferenceModal({ kind, mode: "create" });
    setReferenceForm(initialReferenceForm);
    setReferenceFormInitial(initialReferenceForm);
    setDeleteReplacementName("");
    setDeleteReplacementNameInitial("");
  }

  function openEditReferenceModal(kind: ReferenceKind, item: ReferenceItem) {
    const nextForm: ReferenceForm = {
      name: item.name,
      description: item.description
    };

    clearActionError();
    setReferenceModal({ kind, mode: "edit", item });
    setReferenceForm(nextForm);
    setReferenceFormInitial(nextForm);
    setDeleteReplacementName("");
    setDeleteReplacementNameInitial("");
  }

  function openDeleteReferenceModal(kind: ReferenceKind, item: ReferenceItem) {
    const nextForm: ReferenceForm = {
      name: item.name,
      description: item.description
    };

    clearActionError();
    setReferenceModal({ kind, mode: "delete", item });
    setReferenceForm(nextForm);
    setReferenceFormInitial(nextForm);
    setDeleteReplacementName("");
    setDeleteReplacementNameInitial("");
  }

  function closeReferenceModal() {
    setReferenceModal(null);
    setReferenceForm(initialReferenceForm);
    setReferenceFormInitial(initialReferenceForm);
    setDeleteReplacementName("");
    setDeleteReplacementNameInitial("");
    clearActionError();
  }

  function requestCloseReferenceModal() {
    if (confirmDiscardChanges(hasReferenceFormChanges())) {
      closeReferenceModal();
    }
  }

  function updateReferenceModalForm(field: keyof ReferenceForm, value: string) {
    setReferenceForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  function closeInfoModal() {
    setInfoModal(null);
  }

  function openPurchaseInfo(purchase: Purchase) {
    const part = parts.find((item) => item.id === purchase.partId);

    setInfoModal({
      title: purchase.rawName,
      subtitle: "Карточка закупки",
      rows: [
        { label: "Деталь", value: part?.name || "Не найдена" },
        { label: "Код детали", value: part?.code || "Не найден" },
        { label: "Количество", value: String(purchase.quantity) },
        { label: "Цена", value: formatMoney(purchase.price) },
        { label: "Поставщик", value: purchase.supplier },
        { label: "Ответственный", value: purchase.employee },
        { label: "Дата", value: purchase.date }
      ]
    });
  }

  function openDepartmentInfo(department: Department) {
    setInfoModal({
      title: department.name,
      subtitle: "Подразделение",
      rows: [
        { label: "Руководитель", value: department.manager },
        { label: "Количество сотрудников", value: String(department.count) }
      ]
    });
  }

  function openEmployeeInfo(employee: Employee) {
    setInfoModal({
      title: employee.name,
      subtitle: "Сотрудник",
      rows: [
        { label: "Должность", value: employee.position },
        { label: "Подразделение", value: employee.department },
        { label: "Роль", value: employee.role }
      ]
    });
  }

  function openDuplicateReport() {
    const duplicateRows = [
      {
        label: "Коды номенклатуры",
        value: formatDuplicateValues(
          findDuplicateValues(partNomenclature, (item) => item.code)
        )
      },
      {
        label: "Чертежи номенклатуры",
        value: formatDuplicateValues(
          findDuplicateValues(partNomenclature, (item) => item.drawing)
        )
      },
      {
        label: "Коды карточек деталей",
        value: formatDuplicateValues(findDuplicateValues(parts, (part) => part.code))
      },
      {
        label: "Категории",
        value: formatDuplicateValues(
          findDuplicateValues(references["part-categories"], (item) => item.name)
        )
      },
      {
        label: "Материалы",
        value: formatDuplicateValues(
          findDuplicateValues(references.materials, (item) => item.name)
        )
      },
      {
        label: "Поставщики",
        value: formatDuplicateValues(
          findDuplicateValues(references.suppliers, (item) => item.name)
        )
      },
      {
        label: "Единицы измерения",
        value: formatDuplicateValues(
          findDuplicateValues(references["measurement-units"], (item) => item.name)
        )
      }
    ];

    const hasDuplicates = duplicateRows.some(
      (row) => row.value !== "Не найдены"
    );

    setInfoModal({
      title: "Проверка дубликатов",
      subtitle: hasDuplicates
        ? "Найдены совпадения"
        : "Контроль качества данных",
      rows: hasDuplicates
        ? duplicateRows
        : [
            {
              label: "Результат",
              value: "Дубликаты не найдены"
            },
            {
              label: "Проверено",
              value:
                "коды, чертежи, карточки деталей и все основные справочники"
            }
          ]
    });

    addOperationLog(
      "Проверка дублей",
      "Администрирование",
      hasDuplicates ? "Найдены совпадения в мастер-данных" : "Дубликаты не найдены"
    );
  }

  function exportPartsCsv() {
    if (parts.length === 0) {
      setInfoModal({
        title: "Выгрузка справочника",
        subtitle: "Нет данных",
        rows: [
          {
            label: "Результат",
            value: "Справочник деталей пуст, файл не создан"
          }
        ]
      });
      return;
    }

    const header = [
      "code",
      "name",
      "category",
      "material",
      "unit",
      "weight",
      "stock",
      "minStock",
      "drawing",
      "supplier"
    ];

    const lines = parts.map((part) =>
      [
        part.code,
        part.name,
        part.category,
        part.material,
        part.unit,
        part.weight,
        part.stock,
        part.minStock,
        part.drawing,
        part.supplier
      ]
        .map(escapeCsvValue)
        .join(";")
    );

    const csv = [header.join(";"), ...lines].join("\n");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `mdm-parts-${date}.csv`;

    downloadCsv(filename, csv);
    addOperationLog(
      "Выгрузка",
      "Справочник деталей",
      `Создан файл ${filename}, позиций: ${parts.length}`
    );

    setInfoModal({
      title: "Выгрузка справочника",
      subtitle: "CSV-файл создан",
      rows: [
        {
          label: "Файл",
          value: filename
        },
        {
          label: "Позиций",
          value: String(parts.length)
        }
      ]
    });
  }

  function closePartDetails() {
    setPartDetailsId(null);
  }

  function openPartInfo(part: Part) {
    setPartDetailsId(part.id);
  }

  function openPartByRole(part: Part) {
    openPartInfo(part);
  }

  async function uploadDrawingImage(part: Part, file: File): Promise<void> {
    try {
      setActionError("");

      if (!hasAdminAccess(role)) {
        throw new Error("Загрузка фото чертежа доступна только администратору");
      }

      if (!file.type.startsWith("image/")) {
        throw new Error("Можно загрузить только изображение");
      }

      const maxSizeBytes = 25 * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        throw new Error("Размер изображения не должен превышать 25 МБ");
      }

      const result = await uploadDrawingImageRequest(
        part.id,
        file,
        currentEmployee?.name || "Неизвестный пользователь"
      );

      setDrawingImages((currentImages) => ({
        ...currentImages,
        [String(part.id)]: result.url
      }));

      addOperationLog(
        "Загрузка чертежа",
        "Чертежи",
        `Загружено фото чертежа для ${part.code} — ${part.name}`
      );

      setInfoModal({
        title: "Фото чертежа загружено",
        subtitle: "Техническая документация",
        image: {
          src: result.url,
          alt: `Фото чертежа ${part.drawing}`,
          caption: `Чертеж ${part.drawing}`
        },
        rows: [
          { label: "Деталь", value: part.name },
          { label: "Код", value: part.code },
          { label: "Чертеж", value: part.drawing },
          { label: "Файл", value: file.name },
          { label: "Размер", value: `${(file.size / 1024 / 1024).toFixed(2)} МБ` }
        ]
      });
    } catch (uploadError) {
      setActionError(
        getErrorMessage(uploadError, "Ошибка загрузки фото чертежа")
      );
    }
  }

  async function removeDrawingImage(part: Part): Promise<void> {
    try {
      setActionError("");

      if (!hasAdminAccess(role)) {
        throw new Error("Удаление фото чертежа доступно только администратору");
      }

      const confirmed = window.confirm("Удалить загруженное фото чертежа?");

      if (!confirmed) {
        return;
      }

      await deleteDrawingImageRequest(part.id);

      setDrawingImages((currentImages) => {
        const nextImages = { ...currentImages };
        delete nextImages[String(part.id)];
        return nextImages;
      });

      addOperationLog(
        "Удаление чертежа",
        "Чертежи",
        `Удалено фото чертежа для ${part.code} — ${part.name}`
      );
    } catch (removeError) {
      setActionError(
        getErrorMessage(removeError, "Ошибка удаления фото чертежа")
      );
    }
  }

  function updateLoginForm(field: keyof LoginForm, value: string) {
    setLoginForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsLoggingIn(true);
      setLoginError("");

      const session = await loginRequest({
        username: loginForm.username.trim(),
        password: loginForm.password
      });

      storeAuthSession(session);
      setAuthSession(session);
      setLoginForm({ username: "", password: "" });
      setPage("dashboard");
    } catch (requestError) {
      setLoginError(getErrorMessage(requestError, "Ошибка входа в систему"));
    } finally {
      setIsLoggingIn(false);
    }
  }

  function logout() {
    clearAuthSession();
    setAuthSession(null);
    setParts([]);
    setPartNomenclature([]);
    setPurchases([]);
    setStockReport([]);
    setDepartments([]);
    setEmployees([]);
    setReferences(emptyReferences);
    setDrawingImages({});
    setOperationLog([]);
    setCurrentEmployeeId("");
    setPage("dashboard");
  }

  const loadData = useCallback(async function loadData() {
    try {
      setIsLoading(true);
      setLoadError("");

      const [
        partsFromApi,
        partNomenclatureFromApi,
        purchasesFromApi,
        departmentsFromApi,
        employeesFromApi,
        categoriesFromApi,
        materialsFromApi,
        suppliersFromApi,
        unitsFromApi,
        stockReportFromApi,
        drawingImagesFromApi,
        operationLogFromApi
      ] = await Promise.all([
        getParts(),
        getPartNomenclature(),
        getPurchases(),
        getDepartments(),
        getEmployees(),
        getReferences("part-categories"),
        getReferences("materials"),
        getReferences("suppliers"),
        getReferences("measurement-units"),
        getStockReport(),
        getDrawingImages(),
        getOperationLogs()
      ]);

      const referencesFromApi: ReferencesMap = {
        "part-categories": categoriesFromApi,
        materials: materialsFromApi,
        suppliers: suppliersFromApi,
        "measurement-units": unitsFromApi
      };

      setParts(partsFromApi);
      setPartNomenclature(partNomenclatureFromApi);
      setPurchases(purchasesFromApi);
      setStockReport(stockReportFromApi);
      setDepartments(departmentsFromApi);
      setEmployees(employeesFromApi);
      setReferences(referencesFromApi);
      setDrawingImages(drawingImagesFromApi);
      setOperationLog(operationLogFromApi);

      const matchedEmployee = employeesFromApi.find(
        (employee) => employee.name === authenticatedUserName
      );

      if (matchedEmployee) {
        setCurrentEmployeeId(String(matchedEmployee.id));
        localStorage.setItem(
          CURRENT_EMPLOYEE_STORAGE_KEY,
          String(matchedEmployee.id)
        );
      } else {
        setCurrentEmployeeId("");
        localStorage.removeItem(CURRENT_EMPLOYEE_STORAGE_KEY);
      }

      setPurchaseForm((currentForm) => ({
        ...currentForm,
        partId:
          partsFromApi.find((part) => String(part.id) === currentForm.partId)
            ?.id.toString() || partsFromApi[0]?.id.toString() || "",
        employee: authenticatedUserName
      }));
    } catch (requestError) {
      setLoadError(getErrorMessage(requestError, "Ошибка загрузки данных"));

      setParts([]);
      setPartNomenclature([]);
      setPurchases([]);
      setStockReport([]);
      setDepartments([]);
      setEmployees([]);
      setReferences(emptyReferences);
      setDrawingImages({});
      setOperationLog([]);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedUserName]);

  async function createPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      clearActionError();

      if (!selectedPurchasePart) {
        throw new Error("Выберите деталь из справочника");
      }

      const quantity = Number(purchaseForm.quantity);
      const price = Number(purchaseForm.price);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Количество должно быть целым числом больше нуля");
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Цена должна быть числом больше или равным нулю");
      }

      await createPurchaseRequest({
        partId: selectedPurchasePart.id,
        quantity,
        price,
        employee: purchaseForm.employee.trim() || authenticatedUserName
      });

      addOperationLog(
        "Создание закупки",
        "Закупки",
        `${selectedPurchasePart.code} — ${selectedPurchasePart.name}, количество: ${quantity}, цена: ${price}`
      );

      await loadData();

      setPurchaseForm({
        partId: String(selectedPurchasePart.id),
        quantity: "",
        price: "",
        employee: authenticatedUserName
      });

      setPage("purchases");
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Ошибка создания закупки"));
    }
  }

  async function submitPartModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!partModal) {
      return;
    }

    try {
      setIsSavingPart(true);
      clearActionError();

      const data = {
        nomenclatureId: Number(partForm.nomenclatureId),
        supplier: partForm.supplier,
        unit: partForm.unit,
        weight: Number(partForm.weight),
        stock: Number(partForm.stock),
        minStock: Number(partForm.minStock)
      };

      const selectedNomenclature = partNomenclature.find(
        (item) => item.id === data.nomenclatureId
      );
      const partDescription = selectedNomenclature
        ? `${selectedNomenclature.code} — ${selectedNomenclature.name}`
        : `Номенклатура ID ${data.nomenclatureId}`;

      if (partModal.mode === "create") {
        await createPartRequest(data);
        addOperationLog("Создание детали", "Детали", partDescription);
      }

      if (partModal.mode === "edit" && partModal.part) {
        await updatePartRequest(partModal.part.id, data);
        addOperationLog("Редактирование детали", "Детали", partDescription);
      }

      await loadData();
      closePartModal();
      setPage("parts");
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Ошибка сохранения детали"));
    } finally {
      setIsSavingPart(false);
    }
  }

  async function submitNomenclatureModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nomenclatureModal) {
      return;
    }

    try {
      setIsSavingNomenclature(true);
      clearActionError();

      if (nomenclatureModal.mode === "create") {
        await createPartNomenclatureRequest({
          code: nomenclatureForm.code.trim(),
          name: nomenclatureForm.name.trim(),
          category: nomenclatureForm.category,
          material: nomenclatureForm.material,
          drawing: nomenclatureForm.drawing.trim()
        });
        addOperationLog(
          "Создание номенклатуры",
          "Номенклатура",
          `${nomenclatureForm.code.trim()} — ${nomenclatureForm.name.trim()}`
        );
      }

      if (nomenclatureModal.mode === "edit" && nomenclatureModal.item) {
        await updatePartNomenclatureRequest(nomenclatureModal.item.id, {
          code: nomenclatureForm.code.trim(),
          name: nomenclatureForm.name.trim(),
          category: nomenclatureForm.category,
          material: nomenclatureForm.material,
          drawing: nomenclatureForm.drawing.trim()
        });
        addOperationLog(
          "Редактирование номенклатуры",
          "Номенклатура",
          `${nomenclatureForm.code.trim()} — ${nomenclatureForm.name.trim()}`
        );
      }

      if (nomenclatureModal.mode === "delete" && nomenclatureModal.item) {
        await deletePartNomenclatureRequest(nomenclatureModal.item.id, {
          replacementId: nomenclatureReplacementId
            ? Number(nomenclatureReplacementId)
            : undefined
        });
        addOperationLog(
          "Удаление номенклатуры",
          "Номенклатура",
          `${nomenclatureModal.item.code} — ${nomenclatureModal.item.name}`
        );
      }

      await loadData();
      closeNomenclatureModal();
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError, "Ошибка сохранения номенклатуры")
      );
    } finally {
      setIsSavingNomenclature(false);
    }
  }

  async function submitReferenceModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!referenceModal) {
      return;
    }

    try {
      setIsSavingReference(true);
      clearActionError();

      if (referenceModal.mode === "create") {
        await createReferenceItemRequest(referenceModal.kind, {
          name: referenceForm.name.trim(),
          description: referenceForm.description.trim()
        });
        addOperationLog(
          "Создание записи справочника",
          getReferenceTitle(referenceModal.kind),
          referenceForm.name.trim()
        );
      }

      if (referenceModal.mode === "edit" && referenceModal.item) {
        await updateReferenceItemRequest(
          referenceModal.kind,
          referenceModal.item.id,
          {
            name: referenceForm.name.trim(),
            description: referenceForm.description.trim()
          }
        );
        addOperationLog(
          "Редактирование записи справочника",
          getReferenceTitle(referenceModal.kind),
          `${referenceModal.item.name} → ${referenceForm.name.trim()}`
        );
      }

      if (referenceModal.mode === "delete" && referenceModal.item) {
        await deleteReferenceItemRequest(
          referenceModal.kind,
          referenceModal.item.id,
          {
            replacementName: deleteReplacementName || undefined
          }
        );
        addOperationLog(
          "Удаление записи справочника",
          getReferenceTitle(referenceModal.kind),
          referenceModal.item.name
        );
      }

      await loadData();
      closeReferenceModal();
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError, "Ошибка сохранения справочника")
      );
    } finally {
      setIsSavingReference(false);
    }
  }

  useEffect(() => {
    function syncPageWithHash() {
      const nextPage = getPageFromHash();

      if (!nextPage) {
        return;
      }

      setPageState(nextPage);
      localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, nextPage);
    }

    if (!getPageFromHash()) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#${page}`
      );
    }

    window.addEventListener("hashchange", syncPageWithHash);

    return () => {
      window.removeEventListener("hashchange", syncPageWithHash);
    };
  }, [page]);

  useEffect(() => {
    if (!authSession) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authSession, loadData]);

  useEffect(() => {
    function closeTopModal(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (infoModal) {
        setInfoModal(null);
        return;
      }

      if (partDetailsId !== null) {
        setPartDetailsId(null);
        return;
      }

      if (referenceModal) {
        const hasChanges =
          !areReferenceFormsEqual(referenceForm, referenceFormInitial) ||
          deleteReplacementName !== deleteReplacementNameInitial;

        if (confirmDiscardChanges(hasChanges)) {
          setReferenceModal(null);
          setReferenceForm(initialReferenceForm);
          setReferenceFormInitial(initialReferenceForm);
          setDeleteReplacementName("");
          setDeleteReplacementNameInitial("");
          clearActionError();
        }

        return;
      }

      if (nomenclatureModal) {
        const hasChanges =
          !areNomenclatureFormsEqual(nomenclatureForm, nomenclatureFormInitial) ||
          nomenclatureReplacementId !== nomenclatureReplacementIdInitial;

        if (confirmDiscardChanges(hasChanges)) {
          setNomenclatureModal(null);
          setNomenclatureForm(initialNomenclatureForm);
          setNomenclatureFormInitial(initialNomenclatureForm);
          setNomenclatureReplacementId("");
          setNomenclatureReplacementIdInitial("");
          clearActionError();
        }

        return;
      }

      if (partModal) {
        const hasChanges = !arePartFormsEqual(partForm, partFormInitial);

        if (confirmDiscardChanges(hasChanges)) {
          setPartModal(null);
          setPartForm(initialPartForm);
          setPartFormInitial(initialPartForm);
          clearActionError();
        }
      }
    }

    window.addEventListener("keydown", closeTopModal);

    return () => {
      window.removeEventListener("keydown", closeTopModal);
    };
  }, [
    infoModal,
    partDetailsId,
    referenceModal,
    nomenclatureModal,
    partModal,
    partForm,
    partFormInitial,
    nomenclatureForm,
    nomenclatureFormInitial,
    nomenclatureReplacementId,
    nomenclatureReplacementIdInitial,
    referenceForm,
    referenceFormInitial,
    deleteReplacementName,
    deleteReplacementNameInitial
  ]);

  if (!authSession) {
    return (
      <LoginPage
        form={loginForm}
        error={loginError}
        isSubmitting={isLoggingIn}
        onChangeForm={updateLoginForm}
        onSubmit={submitLogin}
      />
    );
  }

  return (
    <div className="mdm-app">
      <button
        aria-label="Закрыть меню"
        className={isMobileMenuOpen ? "mobile__overlay _open" : "mobile__overlay"}
        type="button"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <Sidebar
        authSession={authSession}
        currentEmployee={currentEmployee}
        isOpen={isMobileMenuOpen}
        menu={visibleMenu}
        page={activePage}
        role={role}
        onChangePage={setPage}
        onLogout={logout}
      />

      <main className="mdm-main">
        {isLoading && (
          <div className="system-message">Загрузка данных из backend...</div>
        )}

        {loadError && (
          <div className="system-message system-message--error">{loadError}</div>
        )}

        {actionError && !isFormModalOpen && (
          <div className="system-message system-message--error">
            {actionError}
          </div>
        )}

        <SystemTopbar
          authSession={authSession}
          backendStatusText={backendStatusText}
          hasError={Boolean(loadError)}
          page={activePage}
          role={role}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <PageHeader page={activePage} />

        {activePage === "dashboard" && (
          <DashboardPage
            deficitParts={deficitParts}
            lowStockParts={lowStockParts}
            operationLog={operationLog}
            parts={parts}
            partsCount={parts.length}
            partsWithoutDrawings={partsWithoutDrawings}
            purchases={purchases}
            purchasesTotal={totalPurchases}
            role={role}
            totalStock={totalStock}
            onChangePage={setPage}
            onOpenPart={openPartByRole}
            onOpenPurchase={openPurchaseInfo}
          />
        )}

        {activePage === "parts" && (
          <PartsPage
            drawingImages={drawingImages}
            parts={parts}
            role={role}
            onOpenCreatePart={openCreatePartModal}
            onOpenPart={openPartByRole}
          />
        )}

        {activePage === "purchases" && (
          <PurchasesPage
            form={purchaseForm}
            isDisabled={Boolean(loadError) || parts.length === 0 || !hasAdminAccess(role)}
            parts={parts}
            purchases={purchases}
            role={role}
            selectedPart={selectedPurchasePart}
            onChangeForm={updatePurchaseForm}
            onExportPurchases={(count) => {
              addOperationLog(
                "Выгрузка закупок",
                "Закупки",
                `Выгружен журнал закупок, строк: ${count}`
              );
            }}
            onOpenPurchase={openPurchaseInfo}
            onSubmit={createPurchase}
          />
        )}

        {activePage === "warehouse" && (
          <WarehousePage
            items={stockReport}
            role={role}
            onOpenPart={(item) => {
              const part = parts.find((currentPart) => currentPart.id === item.partId);

              if (part) {
                openPartByRole(part);
              }
            }}
          />
        )}

        {activePage === "reports" && (
          <ReportsPage
            categories={reportCategories}
            category={reportCategory}
            isRefreshing={isRefreshingReport}
            items={filteredStockReport}
            rawItemsCount={stockReport.length}
            role={role}
            search={reportSearch}
            status={reportStatus}
            onChangeCategory={setReportCategory}
            onChangeSearch={setReportSearch}
            onChangeStatus={setReportStatus}
            onExport={exportStockReportCsv}
            onOpenPart={(item) => {
              const part = parts.find((currentPart) => currentPart.id === item.partId);

              if (part) {
                openPartInfo(part);
              }
            }}
            onRefresh={refreshStockReport}
          />
        )}

        {activePage === "employees" && (
          <EmployeesPage
            departments={departments}
            employees={employees}
            onOpenDepartment={openDepartmentInfo}
            onOpenEmployee={openEmployeeInfo}
          />
        )}

        {activePage === "drawings" && (
          <DrawingsPage
            drawingImages={drawingImages}
            parts={parts}
            role={role}
            onOpenPart={openPartInfo}
            onRemoveDrawingImage={removeDrawingImage}
            onUploadDrawingImage={uploadDrawingImage}
          />
        )}

        {activePage === "journal" && (
          <OperationLogPage
            entries={operationLog}
            role={role}
            onClear={clearOperationLog}
            onExport={exportOperationLogCsv}
          />
        )}

        {activePage === "users" && hasAdminAccess(role) && authSession && (
          <UsersPage
            currentUserId={authSession.user.id}
            currentUserRole={role}
            onChanged={() => refreshOperationLog(250)}
          />
        )}

        {activePage === "admin" && hasAdminAccess(role) && (
          <AdminPage
            partNomenclature={partNomenclature}
            references={references}
            onCheckDuplicates={openDuplicateReport}
            onCreatePartClick={openCreatePartModal}
            onExportParts={exportPartsCsv}
            onOpenCreateNomenclature={openCreateNomenclatureModal}
            onOpenCreateReference={openCreateReferenceModal}
            onOpenDeleteNomenclature={openDeleteNomenclatureModal}
            onOpenDeleteReference={openDeleteReferenceModal}
            onOpenEditNomenclature={openEditNomenclatureModal}
            onOpenEditReference={openEditReferenceModal}
          />
        )}
      </main>

      {partModal && (
        <PartModal
          error={actionError}
          form={partForm}
          isSaving={isSavingPart}
          modal={partModal}
          partNomenclature={partNomenclature}
          references={references}
          selectedNomenclature={selectedPartFormNomenclature}
          onChangeForm={updatePartForm}
          onClose={requestClosePartModal}
          onSubmit={submitPartModal}
        />
      )}

      {nomenclatureModal && (
        <NomenclatureModal
          error={actionError}
          form={nomenclatureForm}
          isSaving={isSavingNomenclature}
          modal={nomenclatureModal}
          partNomenclature={partNomenclature}
          parts={parts}
          references={references}
          replacementId={nomenclatureReplacementId}
          onChangeForm={updateNomenclatureForm}
          onChangeReplacementId={setNomenclatureReplacementId}
          onClose={requestCloseNomenclatureModal}
          onSubmit={submitNomenclatureModal}
        />
      )}

      {referenceModal && (
        <ReferenceModal
          error={actionError}
          form={referenceForm}
          isSaving={isSavingReference}
          modal={referenceModal}
          references={references}
          replacementName={deleteReplacementName}
          onChangeForm={updateReferenceModalForm}
          onChangeReplacementName={setDeleteReplacementName}
          onClose={requestCloseReferenceModal}
          onSubmit={submitReferenceModal}
        />
      )}

      {partDetails && (
        <PartDetailsModal
          drawingImage={drawingImages[String(partDetails.id)]}
          operationLog={operationLog}
          part={partDetails}
          purchases={purchases}
          role={role}
          onClose={closePartDetails}
          onEdit={() => {
            closePartDetails();
            openEditPartModal(partDetails);
          }}
          onOpenPurchase={openPurchaseInfo}
          onRemoveDrawingImage={removeDrawingImage}
          onUploadDrawingImage={uploadDrawingImage}
        />
      )}

      {infoModal && <InfoModal modal={infoModal} onClose={closeInfoModal} />}
    </div>
  );
}

function PartDetailsModal({
  drawingImage,
  operationLog,
  part,
  purchases,
  role,
  onClose,
  onEdit,
  onOpenPurchase,
  onRemoveDrawingImage,
  onUploadDrawingImage
}: {
  drawingImage?: string;
  operationLog: OperationLogEntry[];
  part: Part;
  purchases: Purchase[];
  role: Role;
  onClose: () => void;
  onEdit: () => void;
  onOpenPurchase: (purchase: Purchase) => void;
  onRemoveDrawingImage: (part: Part) => Promise<void>;
  onUploadDrawingImage: (part: Part, file: File) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<PartDetailTab>("passport");
  const [isDrawingBusy, setIsDrawingBusy] = useState(false);
  const stockStatus = getPartStockStatus(part);
  const stockProgress = getPartStockProgress(part);
  const partPurchases = useMemo(() => {
    return purchases
      .filter((purchase) => purchase.partId === part.id)
      .sort(
        (left, right) =>
          new Date(right.date).getTime() - new Date(left.date).getTime()
      );
  }, [part.id, purchases]);
  const purchaseQuantity = partPurchases.reduce(
    (sum, purchase) => sum + purchase.quantity,
    0
  );
  const purchaseTotal = partPurchases.reduce(
    (sum, purchase) => sum + purchase.price,
    0
  );
  const relatedHistory = useMemo(() => {
    const code = part.code.toLowerCase();
    const name = part.name.toLowerCase();
    const drawing = part.drawing.toLowerCase();

    return operationLog
      .filter((entry) => {
        const source = `${entry.action} ${entry.section} ${entry.description}`.toLowerCase();

        return source.includes(code) || source.includes(name) || source.includes(drawing);
      })
      .slice(0, 8);
  }, [operationLog, part.code, part.drawing, part.name]);

  const qualityChecks = [
    {
      label: "Чертеж",
      ok: Boolean(drawingImage),
      text: drawingImage ? "Файл чертежа загружен" : "Нет файла чертежа"
    },
    {
      label: "Поставщик",
      ok: Boolean(part.supplier.trim()),
      text: part.supplier ? "Поставщик указан" : "Поставщик не указан"
    },
    {
      label: "Складской минимум",
      ok: part.minStock > 0,
      text: part.minStock > 0 ? "Минимальный остаток задан" : "Минимальный остаток не задан"
    },
    {
      label: "Остаток",
      ok: part.stock >= 0,
      text: part.stock >= 0 ? "Остаток корректен" : "Остаток требует проверки"
    },
    {
      label: "Закупочная история",
      ok: partPurchases.length > 0,
      text: partPurchases.length > 0 ? "Есть связанные закупки" : "Закупок по детали нет"
    }
  ];
  const qualityScore = Math.round(
    (qualityChecks.filter((item) => item.ok).length / qualityChecks.length) * 100
  );
  const tabs: Array<{ id: PartDetailTab; title: string }> = [
    { id: "passport", title: "Паспорт" },
    { id: "warehouse", title: "Склад" },
    { id: "purchases", title: "Закупки" },
    { id: "drawing", title: "Чертеж" },
    { id: "quality", title: "Качество" },
    { id: "history", title: "История" }
  ];

  async function uploadSelectedFile(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }

    setIsDrawingBusy(true);

    try {
      await onUploadDrawingImage(part, file);
    } finally {
      setIsDrawingBusy(false);
    }
  }

  async function removeDrawing(): Promise<void> {
    setIsDrawingBusy(true);

    try {
      await onRemoveDrawingImage(part);
    } finally {
      setIsDrawingBusy(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <article className="part-details-modal" role="dialog" aria-modal="true">
        <header className="part-details-modal__header">
          <div className="part-details-modal__title-block">
            <span className="part-details-modal__eyebrow">MDM-карточка детали</span>
            <h2>{part.name}</h2>
            <div className="part-details-modal__meta">
              <b>{part.code}</b>
              <span>{part.category}</span>
              <span>{part.material}</span>
              <span className={stockStatus.className}>{stockStatus.title}</span>
            </div>
          </div>

          <div className="part-details-modal__actions">
            {hasAdminAccess(role) && (
              <button className="secondary-button" type="button" onClick={onEdit}>
                Редактировать
              </button>
            )}
            <button className="modal-close" type="button" onClick={onClose}>
              ×
            </button>
          </div>
        </header>

        <section className="part-details-modal__summary">
          <div className="part-detail-summary-card">
            <span>Остаток</span>
            <strong>
              {part.stock.toLocaleString("ru-RU")} {part.unit}
            </strong>
            <p>Минимум: {part.minStock.toLocaleString("ru-RU")} {part.unit}</p>
          </div>
          <div className="part-detail-summary-card">
            <span>Закупки</span>
            <strong>{partPurchases.length.toLocaleString("ru-RU")}</strong>
            <p>{formatMoney(purchaseTotal)}</p>
          </div>
          <div className="part-detail-summary-card">
            <span>Качество данных</span>
            <strong>{qualityScore}%</strong>
            <p>{qualityChecks.filter((item) => !item.ok).length === 0 ? "Замечаний нет" : "Есть замечания"}</p>
          </div>
          <div className="part-detail-summary-card">
            <span>Чертеж</span>
            <strong>{drawingImage ? "Есть" : "Нет"}</strong>
            <p>{part.drawing}</p>
          </div>
        </section>

        <nav className="part-details-tabs" aria-label="Разделы карточки детали">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={
                activeTab === tab.id
                  ? "part-details-tabs__button part-details-tabs__button--active"
                  : "part-details-tabs__button"
              }
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.title}
            </button>
          ))}
        </nav>

        <section className="part-details-modal__body">
          {activeTab === "passport" && (
            <div className="part-detail-grid">
              <DetailField label="Код" value={part.code} />
              <DetailField label="Наименование" value={part.name} />
              <DetailField label="Категория" value={part.category} />
              <DetailField label="Материал" value={part.material} />
              <DetailField label="Поставщик" value={part.supplier} />
              <DetailField label="Единица измерения" value={part.unit} />
              <DetailField label="Вес" value={`${part.weight.toLocaleString("ru-RU")} кг`} />
              <DetailField label="Номер чертежа" value={part.drawing} />
            </div>
          )}

          {activeTab === "warehouse" && (
            <div className="part-detail-section">
              <div className="part-detail-section__header">
                <div>
                  <p>Складской контроль</p>
                  <h3>{stockStatus.title}</h3>
                </div>
                <span className={stockStatus.className}>{stockStatus.title}</span>
              </div>
              <div className="part-detail-stock-panel">
                <div className="part-detail-stock-panel__numbers">
                  <strong>{part.stock.toLocaleString("ru-RU")}</strong>
                  <span>/ {part.minStock.toLocaleString("ru-RU")} {part.unit}</span>
                </div>
                <div className="progress part-detail-stock-panel__progress">
                  <div
                    className={
                      stockStatus.tone === "danger"
                        ? "progress__bar progress__bar--danger"
                        : stockStatus.tone === "warning"
                          ? "progress__bar progress__bar--warning"
                          : "progress__bar"
                    }
                    style={{ width: `${stockProgress}%` }}
                  />
                </div>
                <p>
                  {part.stock < part.minStock
                    ? `Нужно пополнить минимум на ${(part.minStock - part.stock).toLocaleString("ru-RU")} ${part.unit}`
                    : "Остаток соответствует установленному минимуму"}
                </p>
              </div>
            </div>
          )}

          {activeTab === "purchases" && (
            <div className="part-detail-section">
              <div className="part-detail-section__header">
                <div>
                  <p>Закупочная история</p>
                  <h3>{partPurchases.length.toLocaleString("ru-RU")} операций</h3>
                </div>
                <span>{purchaseQuantity.toLocaleString("ru-RU")} {part.unit}</span>
              </div>

              {partPurchases.length === 0 ? (
                <div className="empty-state">По этой детали пока нет закупочных операций.</div>
              ) : (
                <div className="part-detail-table-wrap">
                  <table className="data-table part-detail-table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Количество</th>
                        <th>Сумма</th>
                        <th>Ответственный</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {partPurchases.slice(0, 8).map((purchase) => (
                        <tr key={purchase.id}>
                          <td>{formatDateTime(purchase.date)}</td>
                          <td>{purchase.quantity.toLocaleString("ru-RU")}</td>
                          <td>{formatMoney(purchase.price)}</td>
                          <td>{purchase.employee}</td>
                          <td>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => onOpenPurchase(purchase)}
                            >
                              Открыть
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "drawing" && (
            <div className="part-detail-drawing-layout">
              <div className="part-detail-drawing-preview">
                {drawingImage ? (
                  <img src={drawingImage} alt={`Чертеж ${part.drawing}`} />
                ) : (
                  <div className="part-detail-drawing-preview__empty">
                    <span>Файл чертежа не загружен</span>
                    <p>{part.drawing}</p>
                  </div>
                )}
              </div>

              <div className="part-detail-drawing-info">
                <DetailField label="Обозначение" value={part.drawing} />
                <DetailField label="Статус файла" value={drawingImage ? "Загружен" : "Не загружен"} />
                <DetailField label="Материал" value={part.material} />

                {hasAdminAccess(role) && (
                  <div className="part-detail-drawing-actions">
                    <label className="secondary-button part-detail-upload-button">
                      {isDrawingBusy ? "Загрузка..." : "Загрузить файл"}
                      <input
                        accept="image/*"
                        disabled={isDrawingBusy}
                        type="file"
                        onChange={(event) => {
                          void uploadSelectedFile(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>

                    {drawingImage && (
                      <button
                        className="danger-button"
                        disabled={isDrawingBusy}
                        type="button"
                        onClick={() => void removeDrawing()}
                      >
                        Удалить файл
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "quality" && (
            <div className="part-detail-quality-list">
              {qualityChecks.map((check) => (
                <div
                  key={check.label}
                  className={
                    check.ok
                      ? "part-detail-quality-item part-detail-quality-item--ok"
                      : "part-detail-quality-item part-detail-quality-item--problem"
                  }
                >
                  <div>
                    <b>{check.label}</b>
                    <span>{check.text}</span>
                  </div>
                  <strong>{check.ok ? "OK" : "Проверить"}</strong>
                </div>
              ))}
            </div>
          )}

          {activeTab === "history" && (
            <div className="part-detail-history-list">
              {relatedHistory.length === 0 ? (
                <div className="empty-state">Связанных записей журнала по детали не найдено.</div>
              ) : (
                relatedHistory.map((entry) => (
                  <div key={entry.id} className="part-detail-history-item">
                    <span>{formatDateTime(entry.createdAt)}</span>
                    <b>{entry.action}</b>
                    <p>{entry.description}</p>
                    <small>{entry.user} · {entry.section}</small>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </article>
    </ModalBackdrop>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function ModalBackdrop({
  children,
  onClose
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}

function LoginPage({
  form,
  error,
  isSubmitting,
  onChangeForm,
  onSubmit
}: {
  form: LoginForm;
  error: string;
  isSubmitting: boolean;
  onChangeForm: (field: keyof LoginForm, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <main className="mdm-login-page">
      <section className="mdm-login-card">
        <div className="mdm-logo mdm-logo--login">
          <div className="mdm-logo__mark">M</div>
          <div className="mdm-logo__content">
            <b>Factory MDM</b>
            <span>авторизация пользователя</span>
          </div>
        </div>

        <div className="mdm-login-heading">
          <h1>Вход в систему</h1>
          <p>
            Введите корпоративный логин и пароль. Права доступа проверяются на
            backend по роли пользователя.
          </p>
        </div>

        {error && (
          <div className="system-message system-message--error">{error}</div>
        )}

        <form className="mdm-login-form" onSubmit={onSubmit}>
          <label className="mdm-login-form__field">
            <span>Логин</span>
            <input
              autoComplete="username"
              value={form.username}
              onChange={(event) => onChangeForm("username", event.target.value)}
              placeholder="Введите логин"
            />
          </label>

          <label className="mdm-login-form__field">
            <span>Пароль</span>

            <div className="mdm-login-form__password">
              <input
                autoComplete="current-password"
                type={isPasswordVisible ? "text" : "password"}
                value={form.password}
                onChange={(event) =>
                  onChangeForm("password", event.target.value)
                }
                placeholder="Введите пароль"
              />

              <button
                aria-label={
                  isPasswordVisible ? "Скрыть пароль" : "Показать пароль"
                }
                className="mdm-login-form__toggle"
                disabled={isSubmitting}
                onClick={() =>
                  setIsPasswordVisible((currentValue) => !currentValue)
                }
                type="button"
              >
                {isPasswordVisible ? "Скрыть" : "Показать"}
              </button>
            </div>
          </label>

          <div className="mdm-login-form__submit">
            <button
              className="primary-button mdm-login-form__button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && (
                <span
                  aria-hidden="true"
                  className="mdm-login-form__loader"
                />
              )}

              <span>{isSubmitting ? "Выполняется вход..." : "Войти"}</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}


function UsersPage({
  currentUserId,
  currentUserRole,
  onChanged
}: {
  currentUserId: number;
  currentUserRole: Role;
  onChanged: () => void;
}) {
  const [users, setUsers] = useState<ManagedAuthUser[]>([]);
  const [createForm, setCreateForm] = useState<CreateUserForm>(
    initialCreateUserForm
  );
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>(initialEditUserForm);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordUserForm>(
    initialPasswordUserForm
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [usersLoadError, setUsersLoadError] = useState("");
  const [usersActionError, setUsersActionError] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      setUsersLoadError("");
      setUsers(await getAuthUsers());
    } catch (requestError) {
      setUsers([]);
      setUsersLoadError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка загрузки пользователей"
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadUsers]);

  const activeUsers = users.filter((user) => user.isActive);
  const activeSuperadmins = activeUsers.filter(
    (user) => user.role === "superadmin"
  );
  const activeAdmins = activeUsers.filter((user) => user.role === "admin");
  const activeWorkers = activeUsers.filter((user) => user.role === "worker");
  const blockedUsers = users.filter((user) => !user.isActive);
  const editingUser = users.find((user) => user.id === editUserId) || null;
  const passwordUser = users.find((user) => user.id === passwordUserId) || null;
  const createRoleOptions: AuthUserRole[] =
    currentUserRole === "superadmin" ? ["worker", "admin"] : ["worker"];
  const editRoleOptions: AuthUserRole[] = editingUser
    ? editingUser.role === "superadmin"
      ? ["superadmin"]
      : currentUserRole === "superadmin"
        ? ["worker", "admin"]
        : ["worker"]
    : ["worker"];

  function updateCreateForm(field: keyof CreateUserForm, value: string): void {
    setCreateForm((currentForm) => ({
      ...currentForm,
      [field]: field === "role" ? (value as AuthUserRole) : value
    }));
  }

  function updateEditForm(
    field: keyof EditUserForm,
    value: string | boolean
  ): void {
    setEditForm((currentForm) => ({
      ...currentForm,
      [field]: field === "role" ? (value as AuthUserRole) : value
    }));
  }

  function startEditUser(user: ManagedAuthUser): void {
    if (!canManageUserRecord(currentUserRole, currentUserId, user)) {
      setUsersActionError("Недостаточно прав для изменения этой учетной записи");
      return;
    }

    setUsersActionError("");
    setPasswordUserId(null);
    setPasswordForm(initialPasswordUserForm);
    setEditUserId(user.id);
    setEditForm({
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive
    });
  }

  function cancelEditUser(): void {
    setEditUserId(null);
    setEditForm(initialEditUserForm);
  }

  function startPasswordChange(user: ManagedAuthUser): void {
    if (!canChangeUserPassword(currentUserRole, currentUserId, user)) {
      setUsersActionError("Недостаточно прав для смены пароля этой учетной записи");
      return;
    }

    setUsersActionError("");
    setEditUserId(null);
    setEditForm(initialEditUserForm);
    setPasswordUserId(user.id);
    setPasswordForm(initialPasswordUserForm);
  }

  function cancelPasswordChange(): void {
    setPasswordUserId(null);
    setPasswordForm(initialPasswordUserForm);
  }

  async function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSavingUser(true);
      setUsersActionError("");

      if (!canCreateUserWithRole(currentUserRole, createForm.role)) {
        throw new Error("Только суперадминистратор может создавать администраторов");
      }

      await createAuthUserRequest({
        username: createForm.username.trim(),
        displayName: createForm.displayName.trim(),
        role: createForm.role,
        password: createForm.password
      });

      setCreateForm(initialCreateUserForm);
      await loadUsers();
      onChanged();
    } catch (requestError) {
      setUsersActionError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка создания пользователя"
      );
    } finally {
      setIsSavingUser(false);
    }
  }

  async function submitEditUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    try {
      setIsSavingUser(true);
      setUsersActionError("");

      if (!canManageUserRecord(currentUserRole, currentUserId, editingUser)) {
        throw new Error("Недостаточно прав для изменения этой учетной записи");
      }

      await updateAuthUserRequest(editingUser.id, {
        displayName: editForm.displayName.trim(),
        role: editForm.role,
        isActive: editForm.isActive
      });

      cancelEditUser();
      await loadUsers();
      onChanged();
    } catch (requestError) {
      setUsersActionError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка изменения пользователя"
      );
    } finally {
      setIsSavingUser(false);
    }
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordUser) {
      return;
    }

    try {
      setIsSavingUser(true);
      setUsersActionError("");

      if (!canChangeUserPassword(currentUserRole, currentUserId, passwordUser)) {
        throw new Error("Недостаточно прав для смены пароля этой учетной записи");
      }

      await changeAuthUserPasswordRequest(passwordUser.id, {
        password: passwordForm.password
      });

      cancelPasswordChange();
      await loadUsers();
      onChanged();
    } catch (requestError) {
      setUsersActionError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка смены пароля"
      );
    } finally {
      setIsSavingUser(false);
    }
  }

  return (
    <section className="users-page">
      <div className="metrics-grid users-page__metrics">
        <MetricCard
          title="Всего учетных записей"
          value={String(users.length)}
          text="Все пользователи системы"
        />
        <MetricCard
          title="Суперадминистратор"
          value={String(activeSuperadmins.length)}
          text="Единственный полный владелец доступа"
        />
        <MetricCard
          title="Активные администраторы"
          value={String(activeAdmins.length)}
          text="Управление рабочими учетными записями"
        />
        <MetricCard
          title="Активные работники"
          value={String(activeWorkers.length)}
          text="Просмотр рабочих данных"
        />
        <MetricCard
          danger={blockedUsers.length > 0}
          title="Отключенные"
          value={String(blockedUsers.length)}
          text="Доступ заблокирован"
        />
      </div>

      <section className="content-card users-create-card">
        <div className="content-card__header">
          <div>
            <p className="content-card__eyebrow">Новая учетная запись</p>
            <h2>Создать пользователя</h2>
            <span>
              Суперадминистратор может создавать администраторов и работников.
              Администратор может создавать только работников.
            </span>
          </div>
        </div>

        {usersActionError && (
          <div className="system-message system-message--error">
            {usersActionError}
          </div>
        )}

        <form className="entity-form users-form" onSubmit={submitCreateUser}>
          <div className="entity-form__row users-form__row">
            <label className="entity-form__field">
              <span>Логин</span>
              <input
                className="entity-form__control"
                value={createForm.username}
                onChange={(event) =>
                  updateCreateForm("username", event.target.value)
                }
                placeholder="ivanov"
              />
            </label>

            <label className="entity-form__field">
              <span>Имя пользователя</span>
              <input
                className="entity-form__control"
                value={createForm.displayName}
                onChange={(event) =>
                  updateCreateForm("displayName", event.target.value)
                }
                placeholder="Иванов И.И."
              />
            </label>
          </div>

          <div className="entity-form__row users-form__row">
            <label className="entity-form__field">
              <span>Роль</span>
              <select
                className="entity-form__control"
                value={createForm.role}
                onChange={(event) => updateCreateForm("role", event.target.value)}
              >
                {createRoleOptions.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {getRoleTitle(roleOption)}
                  </option>
                ))}
              </select>
            </label>

            <label className="entity-form__field">
              <span>Пароль</span>
              <input
                className="entity-form__control"
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  updateCreateForm("password", event.target.value)
                }
                placeholder="Не менее 8 символов"
              />
            </label>
          </div>

          <button className="primary-button" disabled={isSavingUser} type="submit">
            {isSavingUser ? "Сохранение..." : "Создать пользователя"}
          </button>
        </form>
      </section>

      <section className="content-card users-table-card">
        <div className="content-card__header">
          <div>
            <p className="content-card__eyebrow">Учетные записи</p>
            <h2>Пользователи системы</h2>
            <span>
              Отключение пользователя блокирует вход без удаления истории операций.
            </span>
          </div>

          <button
            className="secondary-button secondary-button--large"
            disabled={isLoadingUsers}
            type="button"
            onClick={() => void loadUsers()}
          >
            Обновить
          </button>
        </div>

        {usersLoadError && (
          <div className="system-message system-message--error">
            {usersLoadError}
          </div>
        )}

        {isLoadingUsers ? (
          <div className="system-message">Загрузка пользователей...</div>
        ) : (
          <div className="data-table users-table">
            <div className="data-table__row data-table__row--head users-table__row">
              <span>Пользователь</span>
              <span>Роль</span>
              <span>Статус</span>
              <span>Создан</span>
              <span>Действия</span>
            </div>

            {users.map((user) => {
              const canEditUser = canManageUserRecord(
                currentUserRole,
                currentUserId,
                user
              );
              const canChangePassword = canChangeUserPassword(
                currentUserRole,
                currentUserId,
                user
              );

              return (
                <div className="data-table__row users-table__row" key={user.id}>
                  <span>
                    <b>{user.displayName}</b>
                    <small>{user.username}</small>
                  </span>
                  <span>{getRoleTitle(user.role)}</span>
                  <span>
                    <b
                      className={
                        user.isActive
                          ? "users-status users-status--active"
                          : "users-status users-status--blocked"
                      }
                    >
                      {user.isActive ? "Активен" : "Отключен"}
                    </b>
                  </span>
                  <span>{formatDateTime(user.createdAt)}</span>
                  <span className="users-table__actions">
                    <button
                      className="secondary-button"
                      disabled={!canEditUser}
                      type="button"
                      onClick={() => startEditUser(user)}
                    >
                      Изменить
                    </button>
                    <button
                      className="secondary-button"
                      disabled={!canChangePassword}
                      type="button"
                      onClick={() => startPasswordChange(user)}
                    >
                      Пароль
                    </button>
                  </span>
                </div>
              );
            })}

            {users.length === 0 && !usersLoadError && (
              <div className="system-message">Пользователи не найдены</div>
            )}
          </div>
        )}
      </section>

      {editingUser && (
        <section className="content-card users-edit-card">
          <div className="content-card__header">
            <div>
              <p className="content-card__eyebrow">Редактирование</p>
              <h2>{editingUser.displayName}</h2>
              <span>Логин: {editingUser.username}</span>
            </div>

            <button className="secondary-button" type="button" onClick={cancelEditUser}>
              Отмена
            </button>
          </div>

          <form className="entity-form users-form" onSubmit={submitEditUser}>
            <div className="entity-form__row users-form__row">
              <label className="entity-form__field">
                <span>Имя пользователя</span>
                <input
                  className="entity-form__control"
                  value={editForm.displayName}
                  onChange={(event) =>
                    updateEditForm("displayName", event.target.value)
                  }
                />
              </label>

              <label className="entity-form__field">
                <span>Роль</span>
                <select
                  className="entity-form__control"
                  value={editForm.role}
                  disabled={editingUser.role === "superadmin"}
                  onChange={(event) => updateEditForm("role", event.target.value)}
                >
                  {editRoleOptions.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {getRoleTitle(roleOption)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="users-toggle">
              <input
                checked={editForm.isActive}
                disabled={editingUser.id === currentUserId || editingUser.role === "superadmin"}
                type="checkbox"
                onChange={(event) =>
                  updateEditForm("isActive", event.target.checked)
                }
              />
              <span>Учетная запись активна</span>
            </label>

            {editingUser.id === currentUserId && (
              <p className="form-hint">
                Собственную учетную запись нельзя отключить из интерфейса.
              </p>
            )}

            {editingUser.role === "superadmin" && (
              <p className="form-hint">
                Суперадминистратор в системе единственный: роль и активность не изменяются.
              </p>
            )}

            <button className="primary-button" disabled={isSavingUser} type="submit">
              {isSavingUser ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </form>
        </section>
      )}

      {passwordUser && (
        <section className="content-card users-edit-card">
          <div className="content-card__header">
            <div>
              <p className="content-card__eyebrow">Смена пароля</p>
              <h2>{passwordUser.displayName}</h2>
              <span>Новый пароль начнет действовать при следующем входе.</span>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={cancelPasswordChange}
            >
              Отмена
            </button>
          </div>

          <form className="entity-form users-form" onSubmit={submitPasswordChange}>
            <label className="entity-form__field">
              <span>Новый пароль</span>
              <input
                className="entity-form__control"
                type="password"
                value={passwordForm.password}
                onChange={(event) =>
                  setPasswordForm({ password: event.target.value })
                }
                placeholder="Не менее 8 символов"
              />
            </label>

            <button className="primary-button" disabled={isSavingUser} type="submit">
              {isSavingUser ? "Сохранение..." : "Сменить пароль"}
            </button>
          </form>
        </section>
      )}
    </section>
  );
}

function Sidebar({
  authSession,
  currentEmployee,
  isOpen,
  menu,
  page,
  role,
  onChangePage,
  onLogout
}: {
  authSession: AuthSession;
  currentEmployee: Employee | undefined;
  isOpen: boolean;
  menu: MenuItem[];
  page: Page;
  role: Role;
  onChangePage: (page: Page) => void;
  onLogout: () => void;
}) {
  const groupedMenu = useMemo(() => {
    const groups = new Map<MenuGroup, MenuItem[]>();

    menu.forEach((item) => {
      const groupItems = groups.get(item.group) || [];
      groupItems.push(item);
      groups.set(item.group, groupItems);
    });

    return Array.from(groups.entries()).sort(
      ([leftGroup], [rightGroup]) =>
        getMenuGroupOrder(leftGroup) - getMenuGroupOrder(rightGroup)
    );
  }, [menu]);

  return (
    <aside className={isOpen ? "mdm-sidebar _open" : "mdm-sidebar"}>
      <div className="mdm-logo">
        <div className="mdm-logo__mark">M</div>
        <div className="mdm-logo__content">
          <b>Factory MDM</b>
          <span>единый контур мастер-данных</span>
        </div>
      </div>

      <section className="profile-card">
        <span className="profile-card__caption">Текущий пользователь</span>

        <div className="profile-card__person">
          <div className="profile-card__avatar">
            {authSession.user.displayName.slice(0, 1)}
          </div>

          <div>
            <b>{authSession.user.displayName}</b>
            <span>Логин: {authSession.user.username}</span>
          </div>
        </div>

        <div className="profile-card__meta">
          <span>{currentEmployee?.department || "Авторизованный пользователь"}</span>
          <b
            className={
              role === "superadmin"
                ? "profile-card__role profile-card__role--superadmin"
                : role === "admin"
                  ? "profile-card__role profile-card__role--admin"
                  : "profile-card__role profile-card__role--worker"
            }
          >
            {getRoleTitle(role)}
          </b>
        </div>

        <button className="secondary-button" type="button" onClick={onLogout}>
          Выйти
        </button>
      </section>

      <nav className="mdm-nav">
        {groupedMenu.map(([group, items]) => (
          <section className="mdm-nav__group" key={group}>
            <p className="mdm-nav__group-title">{getMenuGroupTitle(group)}</p>

            {items.map((item) => (
              <button
                key={item.id}
                className={
                  page === item.id
                    ? "mdm-nav__button mdm-nav__button--active"
                    : "mdm-nav__button"
                }
                type="button"
                onClick={() => onChangePage(item.id)}
              >
                <span className="mdm-nav__title">{item.title}</span>
                <span className="mdm-nav__subtitle">{item.subtitle}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>
    </aside>
  );
}

function SystemTopbar({
  authSession,
  backendStatusText,
  hasError,
  page,
  role,
  onOpenMobileMenu
}: {
  authSession: AuthSession;
  backendStatusText: string;
  hasError: boolean;
  page: Page;
  role: Role;
  onOpenMobileMenu: () => void;
}) {
  const currentDate = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  return (
    <section className="system-topbar">
      <div className="topbar__left">
        <button
          aria-label="Открыть меню"
          className="mobile__button"
          type="button"
          onClick={onOpenMobileMenu}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="breadcrumbs" aria-label="Навигационная цепочка">
          <span>Factory MDM</span>
          <span>/</span>
          <b>{getPageTitle(page)}</b>
        </div>
      </div>

      <div className="system-topbar__right">
        <span className="system-chip">{currentDate}</span>
        <span className="system-chip">{getRoleTitle(role)}</span>
        <span className="system-chip">{authSession.user.displayName}</span>
        <span
          className={
            hasError
              ? "system-chip system-chip--error"
              : "system-chip system-chip--success"
          }
        >
          <i />
          {backendStatusText}
        </span>
      </div>
    </section>
  );
}

function PageHeader({ page }: { page: Page }) {
  return (
    <header className="page-header">
      <div>
        <p className="page-header__eyebrow">Централизованная MDM-система</p>
        <h1 className="page-header__title">{getPageTitle(page)}</h1>
        <p className="page-header__description">{getPageDescription(page)}</p>
      </div>
    </header>
  );
}

function DashboardPage({
  deficitParts,
  lowStockParts,
  operationLog,
  parts,
  partsCount,
  partsWithoutDrawings,
  purchases,
  purchasesTotal,
  role,
  totalStock,
  onChangePage,
  onOpenPart,
  onOpenPurchase
}: {
  deficitParts: Part[];
  lowStockParts: Part[];
  operationLog: OperationLogEntry[];
  parts: Part[];
  partsCount: number;
  partsWithoutDrawings: Part[];
  purchases: Purchase[];
  purchasesTotal: number;
  role: Role;
  totalStock: number;
  onChangePage: (page: Page) => void;
  onOpenPart: (part: Part) => void;
  onOpenPurchase: (purchase: Purchase) => void;
}) {
  const latestPurchases = purchases.slice(0, 5);
  const criticalParts = [...deficitParts, ...lowStockParts]
    .filter(
      (part, index, collection) =>
        collection.findIndex((currentPart) => currentPart.id === part.id) === index
    )
    .slice(0, 8);
  const latestOperations = operationLog.slice(0, 6);
  const dataQualityWarnings = [
    {
      title: "Детали без чертежей",
      value: partsWithoutDrawings.length,
      text: "Нужно загрузить техническую документацию",
      page: "drawings" as Page
    },
    {
      title: "Нулевой остаток",
      value: deficitParts.length,
      text: "Позиции требуют срочной реакции склада",
      page: "warehouse" as Page
    },
    {
      title: "Низкий остаток",
      value: lowStockParts.length,
      text: "Остаток ниже минимального уровня",
      page: "warehouse" as Page
    }
  ];
  const healthyPartsCount = Math.max(
    partsCount - deficitParts.length - lowStockParts.length,
    0
  );
  const qualityScore = partsCount
    ? Math.round(((partsCount - partsWithoutDrawings.length) / partsCount) * 100)
    : 100;

  return (
    <section className="dashboard-page dashboard-page--control">
      <section className="control-hero">
        <div className="control-hero__content">
          <p className="control-hero__eyebrow">Оперативный центр</p>
          <h2>Контроль мастер-данных и складских рисков</h2>
          <p>
            Сводка показывает критичные остатки, качество карточек деталей,
            последние закупки и действия пользователей. Экран предназначен для
            быстрого ежедневного контроля состояния MDM-контура.
          </p>

          <div className="control-hero__actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => onChangePage("warehouse")}
            >
              Открыть склад
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onChangePage("journal")}
            >
              Журнал операций
            </button>
            {hasAdminAccess(role) && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => onChangePage("admin")}
              >
                Управление справочниками
              </button>
            )}
          </div>
        </div>

        <div className="control-health-card">
          <span>Качество карточек</span>
          <strong>{qualityScore}%</strong>
          <p>
            {partsWithoutDrawings.length > 0
              ? `Без чертежей: ${partsWithoutDrawings.length}`
              : "По карточкам не найдено критичных пропусков"}
          </p>
        </div>
      </section>

      <div className="metrics-grid metrics-grid--control">
        <MetricCard
          title="Карточек деталей"
          value={partsCount.toLocaleString("ru-RU")}
          text="Активные позиции мастер-данных"
        />
        <MetricCard
          title="Остаток на складе"
          value={totalStock.toLocaleString("ru-RU")}
          text={`Норма по позициям: ${healthyPartsCount.toLocaleString("ru-RU")}`}
        />
        <MetricCard
          danger={lowStockParts.length > 0}
          title="Низкий остаток"
          value={lowStockParts.length.toLocaleString("ru-RU")}
          text="Ниже минимального уровня"
        />
        <MetricCard
          danger={deficitParts.length > 0}
          title="Дефицит"
          value={deficitParts.length.toLocaleString("ru-RU")}
          text="Остаток равен нулю или ниже"
        />
      </div>

      <div className="control-grid">
        <section className="content-card content-card--primary">
          <div className="content-card__header">
            <div>
              <p>Складской контроль</p>
              <h2>Позиции, требующие реакции</h2>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onChangePage("warehouse")}
            >
              В склад
            </button>
          </div>

          <div className="data-table data-table--dense">
            <div className="data-table__row data-table__row--head">
              <span>Деталь</span>
              <span>Поставщик</span>
              <span>Остаток</span>
              <span>Минимум</span>
            </div>

            {criticalParts.length > 0 ? (
              criticalParts.map((part) => (
                <button
                  className="data-table__row data-table__row--button"
                  key={part.id}
                  type="button"
                  onClick={() => onOpenPart(part)}
                >
                  <span>
                    <b>{part.code}</b>
                    <small>{part.name}</small>
                  </span>
                  <span>{part.supplier}</span>
                  <span>
                    {part.stock} {part.unit}
                  </span>
                  <span>
                    {part.minStock} {part.unit}
                  </span>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <b>Критичных складских предупреждений нет</b>
                <span>Остатки находятся в пределах заданных минимумов.</span>
              </div>
            )}
          </div>
        </section>

        <section className="content-card">
          <div className="content-card__header">
            <div>
              <p>Качество мастер-данных</p>
              <h2>Контроль заполненности</h2>
            </div>
          </div>

          <div className="quality-list">
            {dataQualityWarnings.map((item) => (
              <button
                className="quality-list__item"
                key={item.title}
                type="button"
                onClick={() => onChangePage(item.page)}
              >
                <span>
                  <b>{item.title}</b>
                  <small>{item.text}</small>
                </span>
                <strong>{item.value.toLocaleString("ru-RU")}</strong>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="control-grid control-grid--secondary">
        <section className="content-card">
          <div className="content-card__header">
            <div>
              <p>Закупки</p>
              <h2>Последние операции</h2>
            </div>

            <div className="status-badge status-badge--success">
              <i />
              {formatMoney(purchasesTotal)}
            </div>
          </div>

          <div className="data-table data-table--dense">
            <div className="data-table__row data-table__row--head">
              <span>Дата</span>
              <span>Деталь</span>
              <span>Кол-во</span>
              <span>Сумма</span>
            </div>

            {latestPurchases.length > 0 ? (
              latestPurchases.map((purchase) => {
                const part = parts.find((item) => item.id === purchase.partId);

                return (
                  <button
                    className="data-table__row data-table__row--button"
                    key={purchase.id}
                    type="button"
                    onClick={() => onOpenPurchase(purchase)}
                  >
                    <span>{formatDateTime(purchase.date)}</span>
                    <span>{part?.name || purchase.rawName}</span>
                    <span>{purchase.quantity}</span>
                    <span>{formatMoney(purchase.price)}</span>
                  </button>
                );
              })
            ) : (
              <div className="empty-state">
                <b>Закупок пока нет</b>
                <span>Журнал закупок будет заполняться после проведения операций.</span>
              </div>
            )}
          </div>
        </section>

        <section className="content-card">
          <div className="content-card__header">
            <div>
              <p>Аудит</p>
              <h2>Последние действия</h2>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onChangePage("journal")}
            >
              Открыть журнал
            </button>
          </div>

          <div className="audit-feed">
            {latestOperations.length > 0 ? (
              latestOperations.map((entry) => (
                <article className="audit-feed__item" key={entry.id}>
                  <span>{formatDateTime(entry.createdAt)}</span>
                  <b>{entry.action}</b>
                  <p>{entry.description}</p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <b>Журнал пока пуст</b>
                <span>После операций пользователей здесь появится аудит.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function PartsPage({
  drawingImages,
  parts,
  role,
  onOpenCreatePart,
  onOpenPart
}: {
  drawingImages: DrawingImagesMap;
  parts: Part[];
  role: Role;
  onOpenCreatePart: () => void;
  onOpenPart: (part: Part) => void;
}) {
  const [partSearch, setPartSearch] = useState("");
  const [partCategory, setPartCategory] = useState("all");
  const [partMaterial, setPartMaterial] = useState("all");
  const [partSupplier, setPartSupplier] = useState("all");
  const [partStockStatus, setPartStockStatus] = useState("all");
  const [partDrawingStatus, setPartDrawingStatus] = useState("all");
  const [partSort, setPartSort] = useState("code");

  const categories = useMemo(() => {
    return Array.from(new Set(parts.map((part) => part.category).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, "ru"));
  }, [parts]);

  const materials = useMemo(() => {
    return Array.from(new Set(parts.map((part) => part.material).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, "ru"));
  }, [parts]);

  const suppliers = useMemo(() => {
    return Array.from(new Set(parts.map((part) => part.supplier).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, "ru"));
  }, [parts]);

  const criticalParts = useMemo(() => {
    return parts.filter((part) => part.stock === 0);
  }, [parts]);

  const lowStockParts = useMemo(() => {
    return parts.filter((part) => part.stock > 0 && part.stock < part.minStock);
  }, [parts]);

  const partsWithDrawingFiles = useMemo(() => {
    return parts.filter((part) => Boolean(drawingImages[String(part.id)]));
  }, [drawingImages, parts]);

  const partsWithoutDrawingFiles = parts.length - partsWithDrawingFiles.length;

  const filteredParts = useMemo(() => {
    const query = partSearch.trim().toLowerCase();

    return parts
      .filter((part) => {
        const hasDrawingFile = Boolean(drawingImages[String(part.id)]);
        const isCritical = part.stock === 0;
        const isLowStock = part.stock > 0 && part.stock < part.minStock;
        const isNormal = part.stock >= part.minStock;
        const matchesSearch = query
          ? `${part.code} ${part.name} ${part.category} ${part.material} ${part.supplier} ${part.drawing}`
              .toLowerCase()
              .includes(query)
          : true;
        const matchesCategory = partCategory === "all" || part.category === partCategory;
        const matchesMaterial = partMaterial === "all" || part.material === partMaterial;
        const matchesSupplier = partSupplier === "all" || part.supplier === partSupplier;
        const matchesDrawing =
          partDrawingStatus === "all" ||
          (partDrawingStatus === "with" && hasDrawingFile) ||
          (partDrawingStatus === "without" && !hasDrawingFile);
        const matchesStockStatus =
          partStockStatus === "all" ||
          (partStockStatus === "critical" && isCritical) ||
          (partStockStatus === "low" && isLowStock) ||
          (partStockStatus === "normal" && isNormal);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesMaterial &&
          matchesSupplier &&
          matchesDrawing &&
          matchesStockStatus
        );
      })
      .sort((left, right) => {
        if (partSort === "name") {
          return left.name.localeCompare(right.name, "ru");
        }

        if (partSort === "stock") {
          return left.stock - right.stock;
        }

        if (partSort === "category") {
          return (
            left.category.localeCompare(right.category, "ru") ||
            left.code.localeCompare(right.code, "ru")
          );
        }

        if (partSort === "supplier") {
          return (
            left.supplier.localeCompare(right.supplier, "ru") ||
            left.code.localeCompare(right.code, "ru")
          );
        }

        return left.code.localeCompare(right.code, "ru");
      });
  }, [
    drawingImages,
    partCategory,
    partDrawingStatus,
    partMaterial,
    partSearch,
    partSort,
    partStockStatus,
    partSupplier,
    parts
  ]);

  const totalStock = filteredParts.reduce((sum, part) => sum + part.stock, 0);
  const totalMinStock = filteredParts.reduce((sum, part) => sum + part.minStock, 0);
  const canExport = hasAdminAccess(role) && filteredParts.length > 0;

  function getPartStatus(part: Part): {
    className: string;
    title: string;
  } {
    if (part.stock === 0) {
      return {
        className: "warehouse-status warehouse-status--danger",
        title: "Дефицит"
      };
    }

    if (part.stock < part.minStock) {
      return {
        className: "warehouse-status warehouse-status--warning",
        title: "Низкий остаток"
      };
    }

    return {
      className: "warehouse-status warehouse-status--success",
      title: "Норма"
    };
  }

  function exportFilteredPartsCsv(): void {
    if (!canExport) {
      return;
    }

    const header = [
      "code",
      "name",
      "category",
      "material",
      "supplier",
      "unit",
      "weight",
      "stock",
      "minStock",
      "drawing",
      "drawingFile"
    ];
    const lines = filteredParts.map((part) =>
      [
        part.code,
        part.name,
        part.category,
        part.material,
        part.supplier,
        part.unit,
        part.weight,
        part.stock,
        part.minStock,
        part.drawing,
        drawingImages[String(part.id)] ? "uploaded" : "missing"
      ]
        .map(escapeCsvValue)
        .join(";")
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const date = new Date().toISOString().slice(0, 10);

    downloadCsv(`mdm-parts-registry-${date}.csv`, csv);
  }

  return (
    <section className="parts-production-page">
      <section className="content-card parts-summary-card">
        <div className="content-card__header warehouse-summary-card__header">
          <div>
            <p>Детали</p>
            <h2>Реестр карточек деталей</h2>
          </div>

          <div className="content-card__actions">
            {hasAdminAccess(role) && (
              <>
                <button
                  className="secondary-button"
                  disabled={!canExport}
                  type="button"
                  onClick={exportFilteredPartsCsv}
                >
                  Выгрузить CSV
                </button>

                <button
                  className="primary-button"
                  type="button"
                  onClick={onOpenCreatePart}
                >
                  Добавить деталь
                </button>
              </>
            )}
          </div>
        </div>

        <div className="warehouse-kpi-grid parts-kpi-grid">
          <MetricCard
            title="Деталей"
            value={parts.length.toLocaleString("ru-RU")}
            text={`Отфильтровано: ${filteredParts.length.toLocaleString("ru-RU")}`}
          />
          <MetricCard
            danger={criticalParts.length > 0}
            title="Критический остаток"
            value={criticalParts.length.toLocaleString("ru-RU")}
            text="Остаток равен нулю"
          />
          <MetricCard
            danger={lowStockParts.length > 0}
            title="Низкий остаток"
            value={lowStockParts.length.toLocaleString("ru-RU")}
            text="Остаток выше нуля, но ниже минимума"
          />
          <MetricCard
            danger={partsWithoutDrawingFiles > 0}
            title="Чертежи"
            value={`${partsWithDrawingFiles.length.toLocaleString("ru-RU")} / ${partsWithoutDrawingFiles.toLocaleString("ru-RU")}`}
            text="С файлом / без файла"
          />
        </div>
      </section>

      <section className="content-card parts-control-card">
        <div className="content-card__header">
          <div>
            <p>Контроль</p>
            <h2>Позиции без запаса</h2>
          </div>
        </div>

        {criticalParts.length === 0 && lowStockParts.length === 0 ? (
          <div className="warehouse-empty-state">Критичных позиций нет.</div>
        ) : (
          <div className="warehouse-shortage-list">
            {[...criticalParts, ...lowStockParts].slice(0, 8).map((part) => {
              const status = getPartStatus(part);

              return (
                <button
                  className="warehouse-shortage-item"
                  key={part.id}
                  type="button"
                  onClick={() => onOpenPart(part)}
                >
                  <div>
                    <b>{part.code}</b>
                    <span>{part.name}</span>
                  </div>
                  <strong className={status.className}>{status.title}</strong>
                  <small>
                    {part.stock} / {part.minStock} {part.unit}
                  </small>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="content-card parts-table-card">
        <div className="content-card__header warehouse-table-card__header">
          <div>
            <p>Реестр</p>
            <h2>Карточки деталей</h2>
          </div>
        </div>

        <div className="warehouse-filters parts-filters">
          <input
            className="search-field warehouse-filters__search"
            value={partSearch}
            onChange={(event) => setPartSearch(event.target.value)}
            placeholder="Поиск по коду, названию, материалу, поставщику или чертежу"
          />

          <select
            className="entity-form__control"
            value={partStockStatus}
            onChange={(event) => setPartStockStatus(event.target.value)}
          >
            <option value="all">Все остатки</option>
            <option value="critical">Критический остаток</option>
            <option value="low">Низкий остаток</option>
            <option value="normal">Норма</option>
          </select>

          <select
            className="entity-form__control"
            value={partCategory}
            onChange={(event) => setPartCategory(event.target.value)}
          >
            <option value="all">Все категории</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="entity-form__control"
            value={partMaterial}
            onChange={(event) => setPartMaterial(event.target.value)}
          >
            <option value="all">Все материалы</option>
            {materials.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>

          <select
            className="entity-form__control"
            value={partSupplier}
            onChange={(event) => setPartSupplier(event.target.value)}
          >
            <option value="all">Все поставщики</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>

          <select
            className="entity-form__control"
            value={partDrawingStatus}
            onChange={(event) => setPartDrawingStatus(event.target.value)}
          >
            <option value="all">Все чертежи</option>
            <option value="with">Файл загружен</option>
            <option value="without">Файла нет</option>
          </select>

          <select
            className="entity-form__control"
            value={partSort}
            onChange={(event) => setPartSort(event.target.value)}
          >
            <option value="code">По коду</option>
            <option value="name">По наименованию</option>
            <option value="stock">По остатку</option>
            <option value="category">По категории</option>
            <option value="supplier">По поставщику</option>
          </select>
        </div>

        <div className="parts-table-meta">
          <span>Показано: {filteredParts.length.toLocaleString("ru-RU")}</span>
          <span>Остаток: {totalStock.toLocaleString("ru-RU")}</span>
          <span>Минимум: {totalMinStock.toLocaleString("ru-RU")}</span>
        </div>

        {filteredParts.length === 0 ? (
          <div className="warehouse-empty-state">По текущим фильтрам деталей нет.</div>
        ) : (
          <div className="warehouse-table-wrap parts-table-wrap">
            <table className="warehouse-table parts-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Наименование</th>
                  <th>Категория</th>
                  <th>Материал</th>
                  <th>Поставщик</th>
                  <th>Остаток</th>
                  <th>Чертеж</th>
                  <th>Действие</th>
                </tr>
              </thead>

              <tbody>
                {filteredParts.map((part) => {
                  const status = getPartStatus(part);
                  const percent = part.minStock > 0
                    ? Math.min(100, Math.round((part.stock / part.minStock) * 100))
                    : 100;
                  const hasDrawingFile = Boolean(drawingImages[String(part.id)]);

                  return (
                    <tr key={part.id}>
                      <td>
                        <b>{part.code}</b>
                        <span>ID {part.id}</span>
                      </td>
                      <td>
                        <b>{part.name}</b>
                        <span>{part.unit}, {part.weight} кг</span>
                      </td>
                      <td>{part.category}</td>
                      <td>{part.material}</td>
                      <td>{part.supplier}</td>
                      <td>
                        <b>{part.stock} / {part.minStock} {part.unit}</b>
                        <div className="progress warehouse-table__progress">
                          <div
                            className={
                              status.title === "Норма"
                                ? "progress__bar"
                                : "progress__bar progress__bar--danger"
                            }
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className={status.className}>{status.title}</span>
                      </td>
                      <td>
                        <b>{part.drawing}</b>
                        <span>{hasDrawingFile ? "Файл загружен" : "Файла нет"}</span>
                      </td>
                      <td>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => onOpenPart(part)}
                        >
                          Карточка
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function PurchasesPage({
  form,
  isDisabled,
  parts,
  purchases,
  role,
  selectedPart,
  onChangeForm,
  onExportPurchases,
  onOpenPurchase,
  onSubmit
}: {
  form: PurchaseForm;
  isDisabled: boolean;
  parts: Part[];
  purchases: Purchase[];
  role: Role;
  selectedPart: Part | undefined;
  onChangeForm: (field: keyof PurchaseForm, value: string) => void;
  onExportPurchases: (count: number) => void;
  onOpenPurchase: (purchase: Purchase) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseSupplier, setPurchaseSupplier] = useState("all");
  const [purchasePeriod, setPurchasePeriod] = useState("all");
  const [purchaseSort, setPurchaseSort] = useState("date-desc");

  const partById = useMemo(() => {
    return new Map(parts.map((part) => [part.id, part]));
  }, [parts]);

  const suppliers = useMemo(() => {
    const values = new Set<string>();

    purchases.forEach((purchase) => {
      const part = partById.get(purchase.partId);
      const supplier = part?.supplier || purchase.supplier;

      if (supplier) {
        values.add(supplier);
      }
    });

    return Array.from(values).sort((left, right) => left.localeCompare(right, "ru"));
  }, [partById, purchases]);

  const filteredPurchases = useMemo(() => {
    const query = purchaseSearch.trim().toLowerCase();
    const now = new Date();

    function matchesPeriod(dateValue: string): boolean {
      if (purchasePeriod === "all") {
        return true;
      }

      const purchaseDate = new Date(dateValue);

      if (Number.isNaN(purchaseDate.getTime())) {
        return false;
      }

      if (purchasePeriod === "7") {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 7);
        return purchaseDate >= limit;
      }

      if (purchasePeriod === "30") {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 30);
        return purchaseDate >= limit;
      }

      if (purchasePeriod === "month") {
        return (
          purchaseDate.getFullYear() === now.getFullYear() &&
          purchaseDate.getMonth() === now.getMonth()
        );
      }

      return true;
    }

    const result = purchases.filter((purchase) => {
      const part = partById.get(purchase.partId);
      const supplier = part?.supplier || purchase.supplier;
      const searchSource = [
        purchase.rawName,
        part?.code || "",
        part?.name || "",
        part?.category || "",
        supplier,
        purchase.employee,
        purchase.date
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = query ? searchSource.includes(query) : true;
      const matchesSupplier =
        purchaseSupplier === "all" || supplier === purchaseSupplier;

      return matchesSearch && matchesSupplier && matchesPeriod(purchase.date);
    });

    return result.sort((left, right) => {
      const leftPart = partById.get(left.partId);
      const rightPart = partById.get(right.partId);

      if (purchaseSort === "date-asc") {
        return new Date(left.date).getTime() - new Date(right.date).getTime();
      }

      if (purchaseSort === "sum-desc") {
        return right.price - left.price;
      }

      if (purchaseSort === "quantity-desc") {
        return right.quantity - left.quantity;
      }

      if (purchaseSort === "supplier") {
        return (leftPart?.supplier || left.supplier).localeCompare(
          rightPart?.supplier || right.supplier,
          "ru"
        );
      }

      if (purchaseSort === "part") {
        return (leftPart?.name || left.rawName).localeCompare(
          rightPart?.name || right.rawName,
          "ru"
        );
      }

      return new Date(right.date).getTime() - new Date(left.date).getTime();
    });
  }, [partById, purchasePeriod, purchaseSearch, purchaseSort, purchaseSupplier, purchases]);

  const totalQuantity = filteredPurchases.reduce(
    (sum, purchase) => sum + purchase.quantity,
    0
  );
  const totalAmount = filteredPurchases.reduce(
    (sum, purchase) => sum + purchase.price,
    0
  );
  const averageAmount =
    filteredPurchases.length > 0 ? totalAmount / filteredPurchases.length : 0;
  const uniqueSuppliersCount = new Set(
    filteredPurchases.map((purchase) => {
      const part = partById.get(purchase.partId);
      return part?.supplier || purchase.supplier;
    })
  ).size;

  function exportPurchasesCsv() {
    const header = [
      "date",
      "partCode",
      "partName",
      "category",
      "supplier",
      "quantity",
      "price",
      "employee"
    ];
    const rows = filteredPurchases.map((purchase) => {
      const part = partById.get(purchase.partId);

      return [
        purchase.date,
        part?.code || "",
        part?.name || purchase.rawName,
        part?.category || "",
        part?.supplier || purchase.supplier,
        purchase.quantity,
        purchase.price,
        purchase.employee
      ]
        .map(escapeCsvValue)
        .join(";");
    });
    const csv = [header.join(";"), ...rows].join("\n");
    const date = new Date().toISOString().slice(0, 10);

    downloadCsv(`mdm-purchases-${date}.csv`, csv);
    onExportPurchases(filteredPurchases.length);
  }

  return (
    <section className="purchases-page">
      <section className="content-card purchases-summary-card">
        <div className="content-card__header purchases-summary-card__header">
          <div>
            <p>Закупочные операции</p>
            <h2>Журнал снабжения</h2>
          </div>

          {hasAdminAccess(role) && (
            <button
              className="secondary-button"
              type="button"
              onClick={exportPurchasesCsv}
              disabled={filteredPurchases.length === 0}
            >
              Выгрузить CSV
            </button>
          )}
        </div>

        <div className="warehouse-kpi-grid purchases-kpi-grid">
          <MetricCard
            title="Операций"
            value={String(filteredPurchases.length)}
            text={`Всего в базе: ${purchases.length}`}
          />
          <MetricCard
            title="Общая сумма"
            value={formatMoney(totalAmount)}
            text="По текущей выборке"
          />
          <MetricCard
            title="Количество"
            value={String(totalQuantity)}
            text="Суммарно по позициям"
          />
          <MetricCard
            title="Средняя сумма"
            value={formatMoney(averageAmount)}
            text={`Поставщиков: ${uniqueSuppliersCount}`}
          />
        </div>
      </section>

      {hasAdminAccess(role) && (
        <section className="content-card purchases-create-card">
          <div className="content-card__header">
            <div>
              <p>Новая операция</p>
              <h2>Провести закупку</h2>
            </div>
          </div>

          <form className="entity-form purchases-form" onSubmit={onSubmit}>
            <label className="entity-form__field purchases-form__part">
              <span>Деталь из утвержденного справочника</span>
              <select
                required
                className="entity-form__control"
                disabled={isDisabled}
                value={form.partId}
                onChange={(event) => onChangeForm("partId", event.target.value)}
              >
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.code} — {part.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="entity-form__field">
              <span>Количество</span>
              <input
                required
                className="entity-form__control"
                disabled={isDisabled}
                inputMode="numeric"
                type="text"
                value={form.quantity}
                onChange={(event) =>
                  onChangeForm("quantity", onlyDigits(event.target.value))
                }
                placeholder="100"
              />
            </label>

            <label className="entity-form__field">
              <span>Цена</span>
              <input
                required
                className="entity-form__control"
                disabled={isDisabled}
                inputMode="decimal"
                type="text"
                value={form.price}
                onChange={(event) =>
                  onChangeForm("price", decimalInputValue(event.target.value))
                }
                placeholder="1200"
              />
            </label>

            <label className="entity-form__field">
              <span>Ответственный</span>
              <input
                disabled
                className="entity-form__control"
                value={form.employee}
                onChange={(event) => onChangeForm("employee", event.target.value)}
              />
            </label>

            {selectedPart && (
              <div className="form-hint purchases-form__hint">
                <span>
                  Остаток: {selectedPart.stock} {selectedPart.unit}
                </span>
                <span>Поставщик: {selectedPart.supplier}</span>
                <span>Материал: {selectedPart.material}</span>
                <span>Чертеж: {selectedPart.drawing}</span>
              </div>
            )}

            <button
              className="primary-button purchases-form__submit"
              type="submit"
              disabled={isDisabled}
            >
              Провести закупку
            </button>
          </form>
        </section>
      )}

      <section className="content-card purchases-table-card">
        <div className="content-card__header purchases-table-card__header">
          <div>
            <p>Реестр</p>
            <h2>История закупок</h2>
          </div>
        </div>

        <div className="warehouse-filters purchases-filters">
          <input
            className="search-field warehouse-filters__search"
            value={purchaseSearch}
            onChange={(event) => setPurchaseSearch(event.target.value)}
            placeholder="Поиск по коду, детали, поставщику, сотруднику"
          />

          <select
            className="entity-form__control"
            value={purchaseSupplier}
            onChange={(event) => setPurchaseSupplier(event.target.value)}
          >
            <option value="all">Все поставщики</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>

          <select
            className="entity-form__control"
            value={purchasePeriod}
            onChange={(event) => setPurchasePeriod(event.target.value)}
          >
            <option value="all">За все время</option>
            <option value="7">Последние 7 дней</option>
            <option value="30">Последние 30 дней</option>
            <option value="month">Текущий месяц</option>
          </select>

          <select
            className="entity-form__control"
            value={purchaseSort}
            onChange={(event) => setPurchaseSort(event.target.value)}
          >
            <option value="date-desc">Сначала новые</option>
            <option value="date-asc">Сначала старые</option>
            <option value="sum-desc">Сначала дорогие</option>
            <option value="quantity-desc">Больше количество</option>
            <option value="supplier">По поставщику</option>
            <option value="part">По детали</option>
          </select>
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="warehouse-empty-state">
            По заданным фильтрам закупки не найдены
          </div>
        ) : (
          <div className="purchases-table-wrap">
            <table className="purchases-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Деталь</th>
                  <th>Поставщик</th>
                  <th>Количество</th>
                  <th>Сумма</th>
                  <th>Ответственный</th>
                  <th>Действие</th>
                </tr>
              </thead>

              <tbody>
                {filteredPurchases.map((purchase) => {
                  const part = partById.get(purchase.partId);

                  return (
                    <tr key={purchase.id}>
                      <td>
                        <b>{purchase.date}</b>
                      </td>
                      <td>
                        <b>{part?.code || "Код не найден"}</b>
                        <span>{part?.name || purchase.rawName}</span>
                      </td>
                      <td>
                        <b>{part?.supplier || purchase.supplier}</b>
                        <span>{part?.category || "Категория не указана"}</span>
                      </td>
                      <td>
                        <b>{purchase.quantity}</b>
                        <span>{part?.unit || "ед."}</span>
                      </td>
                      <td>
                        <b>{formatMoney(purchase.price)}</b>
                      </td>
                      <td>
                        <b>{purchase.employee}</b>
                      </td>
                      <td>
                        <button
                          className="table-action-button"
                          type="button"
                          onClick={() => onOpenPurchase(purchase)}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function ReportsPage({
  categories,
  category,
  isRefreshing,
  items,
  rawItemsCount,
  role,
  search,
  status,
  onChangeCategory,
  onChangeSearch,
  onChangeStatus,
  onExport,
  onOpenPart,
  onRefresh
}: {
  categories: string[];
  category: string;
  isRefreshing: boolean;
  items: StockReportItem[];
  rawItemsCount: number;
  role: Role;
  search: string;
  status: string;
  onChangeCategory: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onExport: () => void;
  onOpenPart: (item: StockReportItem) => void;
  onRefresh: () => void;
}) {
  const deficitCount = items.filter(
    (item) => item.stockStatus === "Дефицит"
  ).length;
  const lowStockCount = items.filter(
    (item) => item.stockStatus === "Низкий остаток"
  ).length;
  const normalCount = items.filter((item) => item.stockStatus === "Норма")
    .length;
  const purchaseTotal = items.reduce(
    (sum, item) => sum + item.purchaseTotal,
    0
  );

  return (
    <section className="content-card">
      <div className="content-card__header">
        <div>
          <p>Аналитика мастер-данных</p>
          <h2>Отчет по складу и закупкам</h2>
          <span>
            Отчет строится на backend по таблицам деталей и закупок. Работник
            просматривает данные, администратор может выгрузить CSV.
          </span>
        </div>

        <div className="reference-actions">
          <button
            className="secondary-button secondary-button--large"
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Обновление..." : "Обновить"}
          </button>

          {hasAdminAccess(role) && (
            <button
              className="primary-button"
              type="button"
              onClick={onExport}
              disabled={items.length === 0}
            >
              Выгрузить CSV
            </button>
          )}
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Строк в отчете"
          value={items.length.toLocaleString("ru-RU")}
          text={`Всего позиций: ${rawItemsCount.toLocaleString("ru-RU")}`}
        />
        <MetricCard
          danger={deficitCount > 0}
          title="Дефицит"
          value={deficitCount.toLocaleString("ru-RU")}
          text="Остаток равен нулю или ниже"
        />
        <MetricCard
          danger={lowStockCount > 0}
          title="Низкий остаток"
          value={lowStockCount.toLocaleString("ru-RU")}
          text="Остаток достиг минимального уровня"
        />
        <MetricCard
          title="Сумма закупок"
          value={formatMoney(purchaseTotal)}
          text={`Норма: ${normalCount.toLocaleString("ru-RU")}`}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) 220px 220px",
          gap: "12px",
          margin: "22px 0"
        }}
      >
        <input
          className="search-field"
          value={search}
          onChange={(event) => onChangeSearch(event.target.value)}
          placeholder="Поиск по коду, названию, материалу, поставщику или чертежу"
          style={{ margin: 0 }}
        />

        <select
          className="entity-form__control"
          value={category}
          onChange={(event) => onChangeCategory(event.target.value)}
        >
          <option value="all">Все категории</option>
          {categories.map((currentCategory) => (
            <option key={currentCategory} value={currentCategory}>
              {currentCategory}
            </option>
          ))}
        </select>

        <select
          className="entity-form__control"
          value={status}
          onChange={(event) => onChangeStatus(event.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="Норма">Норма</option>
          <option value="Низкий остаток">Низкий остаток</option>
          <option value="Дефицит">Дефицит</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="system-message">
          По текущим фильтрам нет данных для отображения.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 10px",
              minWidth: "1120px"
            }}
          >
            <thead>
              <tr>
                {[
                  "Деталь",
                  "Категория",
                  "Остаток",
                  "Мин.",
                  "Статус",
                  "Закупок",
                  "Кол-во",
                  "Сумма",
                  "Действие"
                ].map((title) => (
                  <th
                    key={title}
                    style={{
                      color: "var(--muted)",
                      fontSize: "12px",
                      fontWeight: 900,
                      padding: "0 14px 6px",
                      textAlign: "left",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const isDanger = item.stockStatus === "Дефицит";
                const isWarning = item.stockStatus === "Низкий остаток";

                return (
                  <tr key={item.partId}>
                    <td
                      style={{
                        background: "var(--surface-soft)",
                        borderBottomLeftRadius: "18px",
                        borderTopLeftRadius: "18px",
                        padding: "14px"
                      }}
                    >
                      <b style={{ display: "block", color: "var(--text)" }}>
                        {item.code} · {item.name}
                      </b>
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>
                        {item.material} · {item.drawing}
                      </span>
                    </td>

                    <td style={{ background: "var(--surface-soft)", padding: "14px" }}>
                      {item.category}
                    </td>
                    <td style={{ background: "var(--surface-soft)", padding: "14px" }}>
                      <b>
                        {item.stock} {item.unit}
                      </b>
                    </td>
                    <td style={{ background: "var(--surface-soft)", padding: "14px" }}>
                      {item.minStock} {item.unit}
                    </td>
                    <td style={{ background: "var(--surface-soft)", padding: "14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "7px 10px",
                          borderRadius: "999px",
                          background: isDanger
                            ? "#fef2f2"
                            : isWarning
                              ? "#fff7ed"
                              : "#ecfdf3",
                          color: isDanger
                            ? "#b42318"
                            : isWarning
                              ? "#b54708"
                              : "#14763f",
                          fontSize: "12px",
                          fontWeight: 900,
                          whiteSpace: "nowrap"
                        }}
                      >
                        {item.stockStatus}
                      </span>
                    </td>
                    <td style={{ background: "var(--surface-soft)", padding: "14px" }}>
                      {item.purchaseCount}
                    </td>
                    <td style={{ background: "var(--surface-soft)", padding: "14px" }}>
                      {item.purchasedQuantity}
                    </td>
                    <td style={{ background: "var(--surface-soft)", padding: "14px" }}>
                      {formatMoney(item.purchaseTotal)}
                    </td>
                    <td
                      style={{
                        background: "var(--surface-soft)",
                        borderBottomRightRadius: "18px",
                        borderTopRightRadius: "18px",
                        padding: "14px"
                      }}
                    >
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => onOpenPart(item)}
                      >
                        Карточка
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function WarehousePage({
  items,
  role,
  onOpenPart
}: {
  items: StockReportItem[];
  role: Role;
  onOpenPart: (item: StockReportItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [sort, setSort] = useState("status");

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, "ru"));
  }, [items]);

  const suppliers = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.supplier).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, "ru"));
  }, [items]);

  const deficitItems = useMemo(() => {
    return items
      .filter((item) => item.stockStatus === "Дефицит")
      .sort((left, right) => left.stock - right.stock || left.name.localeCompare(right.name, "ru"));
  }, [items]);

  const lowStockItems = useMemo(() => {
    return items.filter((item) => item.stockStatus === "Низкий остаток");
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const statusPriority: Record<StockReportItem["stockStatus"], number> = {
      "Дефицит": 0,
      "Низкий остаток": 1,
      "Норма": 2
    };

    return items
      .filter((item) => {
        const matchesSearch = query
          ? `${item.code} ${item.name} ${item.category} ${item.material} ${item.supplier} ${item.drawing}`
              .toLowerCase()
              .includes(query)
          : true;
        const matchesStatus = status === "all" || item.stockStatus === status;
        const matchesCategory = category === "all" || item.category === category;
        const matchesSupplier = supplier === "all" || item.supplier === supplier;

        return matchesSearch && matchesStatus && matchesCategory && matchesSupplier;
      })
      .sort((left, right) => {
        if (sort === "code") {
          return left.code.localeCompare(right.code, "ru");
        }

        if (sort === "name") {
          return left.name.localeCompare(right.name, "ru");
        }

        if (sort === "stock") {
          return left.stock - right.stock;
        }

        if (sort === "minStock") {
          return right.minStock - left.minStock;
        }

        return (
          statusPriority[left.stockStatus] - statusPriority[right.stockStatus] ||
          left.stock - right.stock ||
          left.name.localeCompare(right.name, "ru")
        );
      });
  }, [items, search, status, category, supplier, sort]);

  const totalStock = filteredItems.reduce((sum, item) => sum + item.stock, 0);
  const totalMinStock = filteredItems.reduce((sum, item) => sum + item.minStock, 0);
  const canExport = hasAdminAccess(role) && filteredItems.length > 0;

  function exportWarehouseCsv(): void {
    if (!canExport) {
      return;
    }

    const header = [
      "code",
      "name",
      "category",
      "material",
      "unit",
      "stock",
      "minStock",
      "stockStatus",
      "supplier",
      "drawing"
    ];
    const lines = filteredItems.map((item) =>
      [
        item.code,
        item.name,
        item.category,
        item.material,
        item.unit,
        item.stock,
        item.minStock,
        item.stockStatus,
        item.supplier,
        item.drawing
      ]
        .map(escapeCsvValue)
        .join(";")
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const date = new Date().toISOString().slice(0, 10);

    downloadCsv(`mdm-warehouse-stock-${date}.csv`, csv);
  }

  return (
    <section className="warehouse-page">
      <section className="content-card warehouse-summary-card">
        <div className="content-card__header warehouse-summary-card__header">
          <div>
            <p>Склад</p>
            <h2>Контроль остатков</h2>
          </div>

          {hasAdminAccess(role) && (
            <button
              className="primary-button"
              disabled={!canExport}
              type="button"
              onClick={exportWarehouseCsv}
            >
              Выгрузить CSV
            </button>
          )}
        </div>

        <div className="warehouse-kpi-grid">
          <MetricCard
            title="Позиций"
            value={items.length.toLocaleString("ru-RU")}
            text={`Отфильтровано: ${filteredItems.length.toLocaleString("ru-RU")}`}
          />
          <MetricCard
            danger={deficitItems.length > 0}
            title="Дефицит"
            value={deficitItems.length.toLocaleString("ru-RU")}
            text="Остаток равен нулю"
          />
          <MetricCard
            danger={lowStockItems.length > 0}
            title="Низкий остаток"
            value={lowStockItems.length.toLocaleString("ru-RU")}
            text="Остаток ниже минимума"
          />
          <MetricCard
            title="Остаток / минимум"
            value={`${totalStock.toLocaleString("ru-RU")} / ${totalMinStock.toLocaleString("ru-RU")}`}
            text="По текущей выборке"
          />
        </div>
      </section>

      <section className="content-card warehouse-deficit-card">
        <div className="content-card__header">
          <div>
            <p>Приоритет</p>
            <h2>Позиции для пополнения</h2>
          </div>
        </div>

        {deficitItems.length === 0 && lowStockItems.length === 0 ? (
          <div className="warehouse-empty-state">Критичных остатков нет.</div>
        ) : (
          <div className="warehouse-shortage-list">
            {[...deficitItems, ...lowStockItems].slice(0, 6).map((item) => (
              <button
                className="warehouse-shortage-item"
                key={`${item.stockStatus}-${item.partId}`}
                type="button"
                onClick={() => onOpenPart(item)}
              >
                <div>
                  <b>{item.code}</b>
                  <span>{item.name}</span>
                </div>
                <strong
                  className={
                    item.stockStatus === "Дефицит"
                      ? "warehouse-status warehouse-status--danger"
                      : "warehouse-status warehouse-status--warning"
                  }
                >
                  {item.stockStatus}
                </strong>
                <small>
                  {item.stock} / {item.minStock} {item.unit}
                </small>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="content-card warehouse-table-card">
        <div className="content-card__header warehouse-table-card__header">
          <div>
            <p>Реестр</p>
            <h2>Складские позиции</h2>
          </div>
        </div>

        <div className="warehouse-filters">
          <input
            className="search-field warehouse-filters__search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по коду, названию, материалу, поставщику или чертежу"
          />

          <select
            className="entity-form__control"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Все статусы</option>
            <option value="Дефицит">Дефицит</option>
            <option value="Низкий остаток">Низкий остаток</option>
            <option value="Норма">Норма</option>
          </select>

          <select
            className="entity-form__control"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">Все категории</option>
            {categories.map((currentCategory) => (
              <option key={currentCategory} value={currentCategory}>
                {currentCategory}
              </option>
            ))}
          </select>

          <select
            className="entity-form__control"
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
          >
            <option value="all">Все поставщики</option>
            {suppliers.map((currentSupplier) => (
              <option key={currentSupplier} value={currentSupplier}>
                {currentSupplier}
              </option>
            ))}
          </select>

          <select
            className="entity-form__control"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="status">Сначала проблемные</option>
            <option value="code">По коду</option>
            <option value="name">По наименованию</option>
            <option value="stock">По остатку</option>
            <option value="minStock">По минимуму</option>
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <div className="warehouse-empty-state">По текущим фильтрам позиций нет.</div>
        ) : (
          <div className="warehouse-table-wrap">
            <table className="warehouse-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Наименование</th>
                  <th>Категория</th>
                  <th>Поставщик</th>
                  <th>Остаток</th>
                  <th>Минимум</th>
                  <th>Статус</th>
                  <th>Действие</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const percent = item.minStock > 0
                    ? Math.min(100, Math.round((item.stock / item.minStock) * 100))
                    : 100;
                  const statusClass =
                    item.stockStatus === "Дефицит"
                      ? "warehouse-status warehouse-status--danger"
                      : item.stockStatus === "Низкий остаток"
                        ? "warehouse-status warehouse-status--warning"
                        : "warehouse-status warehouse-status--success";

                  return (
                    <tr key={item.partId}>
                      <td>
                        <b>{item.code}</b>
                        <span>{item.drawing}</span>
                      </td>
                      <td>
                        <b>{item.name}</b>
                        <span>{item.material}</span>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.supplier}</td>
                      <td>
                        <b>{item.stock} {item.unit}</b>
                        <div className="progress warehouse-table__progress">
                          <div
                            className={
                              item.stockStatus === "Норма"
                                ? "progress__bar"
                                : "progress__bar progress__bar--danger"
                            }
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                      <td>{item.minStock} {item.unit}</td>
                      <td>
                        <span className={statusClass}>{item.stockStatus}</span>
                      </td>
                      <td>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => onOpenPart(item)}
                        >
                          Карточка
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function EmployeesPage({
  departments,
  employees,
  onOpenDepartment,
  onOpenEmployee
}: {
  departments: Department[];
  employees: Employee[];
  onOpenDepartment: (department: Department) => void;
  onOpenEmployee: (employee: Employee) => void;
}) {
  return (
    <section className="employee-layout">
      <section className="content-card">
        <div className="content-card__header">
          <div>
            <p>Оргструктура</p>
            <h2>Подразделения</h2>
          </div>
        </div>

        <div className="simple-list">
          {departments.map((department) => (
            <button
              key={department.id}
              className="simple-list__item simple-list__item--button"
              type="button"
              onClick={() => onOpenDepartment(department)}
            >
              <b>{department.name}</b>
              <span>Ответственный: {department.manager}</span>
              <small>{department.count} сотрудников</small>
            </button>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="content-card__header">
          <div>
            <p>Доступ</p>
            <h2>Сотрудники</h2>
          </div>
        </div>

        <div className="data-table data-table--employees">
          <div className="data-table__row data-table__row--head">
            <span>ФИО</span>
            <span>Должность</span>
            <span>Роль</span>
          </div>

          {employees.map((employee) => (
            <button
              className="data-table__row data-table__row--button"
              key={employee.id}
              type="button"
              onClick={() => onOpenEmployee(employee)}
            >
              <span>{employee.name}</span>
              <span>{employee.position}</span>
              <span>{employee.role}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function DrawingsPage({
  drawingImages,
  parts,
  role,
  onOpenPart,
  onRemoveDrawingImage,
  onUploadDrawingImage
}: {
  drawingImages: DrawingImagesMap;
  parts: Part[];
  role: Role;
  onOpenPart: (part: Part) => void;
  onRemoveDrawingImage: (part: Part) => void;
  onUploadDrawingImage: (part: Part, file: File) => void;
}) {
  const canManageDrawings = hasAdminAccess(role);

  return (
    <section className="content-card">
      <div className="content-card__header">
        <div>
          <p>Техническая документация</p>
          <h2>Чертежи и спецификации</h2>
          <span>
            Работник может только просматривать чертежи. Загрузка и удаление
            фото доступны администратору.
          </span>
        </div>
      </div>

      <div className="drawings-grid" style={{ alignItems: "stretch" }}>
        {parts.map((part) => {
          const drawingImage = drawingImages[String(part.id)];
          const actionColumns = canManageDrawings
            ? drawingImage
              ? "repeat(3, minmax(145px, 1fr))"
              : "repeat(2, minmax(145px, 1fr))"
            : "minmax(145px, 240px)";

          return (
            <article
              className="drawing-card"
              key={part.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "14px",
                padding: "18px",
                overflow: "hidden",
                alignContent: "start"
              }}
            >
              <button
                type="button"
                onClick={() => onOpenPart(part)}
                style={{
                  display: "grid",
                  width: "100%",
                  height: "230px",
                  minHeight: "230px",
                  placeItems: "center",
                  overflow: "hidden",
                  padding: drawingImage ? "12px" : "18px",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  background: drawingImage
                    ? "#ffffff"
                    : "linear-gradient(135deg, rgba(34, 92, 255, 0.08), transparent), repeating-linear-gradient(45deg, #f1f5fb, #f1f5fb 8px, #e8eef8 8px, #e8eef8 16px)",
                  cursor: "pointer"
                }}
              >
                {drawingImage ? (
                  <img
                    alt={`Фото чертежа ${part.drawing}`}
                    src={drawingImage}
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      borderRadius: "14px"
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: "var(--muted-strong)",
                      fontSize: "13px",
                      fontWeight: 900,
                      lineHeight: 1.45,
                      overflowWrap: "anywhere",
                      textAlign: "center"
                    }}
                  >
                    {part.drawing}
                  </span>
                )}
              </button>

              <div
                className="drawing-card__content"
                style={{
                  display: "grid",
                  gap: "14px",
                  alignItems: "start",
                  justifyContent: "stretch"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    minWidth: 0
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <b
                      style={{
                        display: "block",
                        color: "var(--text)",
                        fontSize: "17px",
                        lineHeight: 1.3,
                        overflowWrap: "anywhere"
                      }}
                    >
                      {part.name}
                    </b>
                    <span
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "var(--muted)",
                        fontSize: "13px",
                        fontWeight: 800,
                        overflowWrap: "anywhere"
                      }}
                    >
                      {part.code} · {part.drawing}
                    </span>
                  </div>

                  <span
                    style={{
                      flex: "0 0 auto",
                      padding: "7px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: "999px",
                      background: drawingImage ? "#ecfdf3" : "var(--surface-soft)",
                      color: drawingImage ? "#14763f" : "var(--muted-strong)",
                      fontSize: "12px",
                      fontWeight: 900,
                      whiteSpace: "nowrap"
                    }}
                  >
                    {drawingImage ? "Фото загружено" : "Нет фото"}
                  </span>
                </div>

                <div
                  className="reference-actions"
                  style={{
                    display: "grid",
                    gridTemplateColumns: actionColumns,
                    gap: "10px",
                    justifyContent: "stretch"
                  }}
                >
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onOpenPart(part)}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Открыть карточку
                  </button>

                  {canManageDrawings && (
                    <label
                      className="secondary-button"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        cursor: "pointer"
                      }}
                    >
                      Загрузить фото
                      <input
                        accept="image/*"
                        type="file"
                        style={{ display: "none" }}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = "";

                          if (file) {
                            void onUploadDrawingImage(part, file);
                          }
                        }}
                      />
                    </label>
                  )}

                  {canManageDrawings && drawingImage && (
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => onRemoveDrawingImage(part)}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Удалить фото
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OperationLogPage({
  entries,
  role,
  onClear,
  onExport
}: {
  entries: OperationLogEntry[];
  role: Role;
  onClear: () => void;
  onExport: () => void;
}) {
  return (
    <section className="content-card">
      <div className="content-card__header">
        <div>
          <p>Контроль действий</p>
          <h2>Журнал операций</h2>
          <span>
            Здесь фиксируются ключевые действия с номенклатурой, деталями,
            закупками и справочниками.
          </span>
        </div>

        {hasAdminAccess(role) ? (
          <div className="reference-actions">
            <button
              className="secondary-button secondary-button--large"
              type="button"
              onClick={onExport}
            >
              Выгрузить журнал
            </button>

            <button
              className="danger-button danger-button--large"
              type="button"
              onClick={onClear}
              disabled={entries.length === 0}
            >
              Очистить
            </button>
          </div>
        ) : (
          <div className="status-badge">Только просмотр</div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="system-message">
          Журнал пока пуст. Новые операции появятся здесь автоматически.
        </div>
      ) : (
        <div className="simple-list">
          {entries.map((entry) => (
            <article className="simple-list__item" key={entry.id}>
              <b>{entry.action}</b>
              <span>{entry.description}</span>
              <small>
                {formatDateTime(entry.createdAt)} · {entry.user} · {entry.section}
              </small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminPage({
  partNomenclature,
  references,
  onCheckDuplicates,
  onCreatePartClick,
  onExportParts,
  onOpenCreateNomenclature,
  onOpenCreateReference,
  onOpenDeleteNomenclature,
  onOpenDeleteReference,
  onOpenEditNomenclature,
  onOpenEditReference
}: {
  partNomenclature: PartNomenclature[];
  references: ReferencesMap;
  onCheckDuplicates: () => void;
  onCreatePartClick: () => void;
  onExportParts: () => void;
  onOpenCreateNomenclature: () => void;
  onOpenCreateReference: (kind: ReferenceKind) => void;
  onOpenDeleteNomenclature: (item: PartNomenclature) => void;
  onOpenDeleteReference: (kind: ReferenceKind, item: ReferenceItem) => void;
  onOpenEditNomenclature: (item: PartNomenclature) => void;
  onOpenEditReference: (kind: ReferenceKind, item: ReferenceItem) => void;
}) {
  return (
    <section className="admin-page">
      <section className="content-card admin-hero-card">
        <div className="content-card__header">
          <div>
            <p>Администрирование</p>
            <h2>Управление мастер-данными</h2>
            <span>
              Сначала создаются утвержденные справочники и номенклатура, потом
              из них собираются карточки деталей.
            </span>
          </div>
        </div>

        <div className="admin-actions">
          <button type="button" onClick={onCreatePartClick}>
            Добавить деталь
          </button>
          <button type="button" onClick={onOpenCreateNomenclature}>
            Добавить номенклатуру
          </button>
          <button type="button" onClick={onCheckDuplicates}>
            Проверить дубликаты
          </button>
          <button type="button" onClick={onExportParts}>
            Выгрузить справочник
          </button>
        </div>
      </section>

      <section className="content-card">
        <div className="content-card__header">
          <div>
            <p>Главный справочник</p>
            <h2>Номенклатура деталей</h2>
            <span>
              Код, наименование, категория, материал и чертеж задаются здесь. В
              карточке детали они только выбираются.
            </span>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={onOpenCreateNomenclature}
          >
            Добавить
          </button>
        </div>

        <div className="nomenclature-list">
          {partNomenclature.map((item) => (
            <article className="nomenclature-item" key={item.id}>
              <div>
                <b>{item.name}</b>
                <span>{item.code}</span>
                <small>Чертеж: {item.drawing}</small>
              </div>

              <div>
                <span>{item.category}</span>
                <small>{item.material}</small>
              </div>

              <div className="reference-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onOpenEditNomenclature(item)}
                >
                  Редактировать
                </button>

                <button
                  className="danger-button"
                  type="button"
                  onClick={() => onOpenDeleteNomenclature(item)}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="reference-grid">
        {referenceKinds.map((kind) => (
          <section className="content-card reference-card" key={kind}>
            <div className="content-card__header reference-card__header">
              <div>
                <p>Справочник</p>
                <h2>{getReferenceTitle(kind)}</h2>
                <span>{getReferenceSubtitle(kind)}</span>
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={() => onOpenCreateReference(kind)}
              >
                Добавить
              </button>
            </div>

            <div className="reference-list">
              {references[kind].map((item) => (
                <article className="reference-item" key={item.id}>
                  <div>
                    <b>{item.name}</b>
                    <span>{item.description || "Описание не указано"}</span>
                    <small>ID: {item.id}</small>
                  </div>

                  <div className="reference-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => onOpenEditReference(kind, item)}
                    >
                      Редактировать
                    </button>

                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => onOpenDeleteReference(kind, item)}
                    >
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function PartModal({
  modal,
  form,
  partNomenclature,
  references,
  selectedNomenclature,
  error,
  isSaving,
  onChangeForm,
  onClose,
  onSubmit
}: {
  modal: PartModalState;
  form: PartForm;
  partNomenclature: PartNomenclature[];
  references: ReferencesMap;
  selectedNomenclature: PartNomenclature | undefined;
  error: string;
  isSaving: boolean;
  onChangeForm: (field: keyof PartForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const title =
    modal.mode === "edit" ? "Редактирование карточки детали" : "Добавление детали";

  return (
    <ModalBackdrop onClose={onClose}>
      <section className="reference-modal">
        <div className="reference-modal__header">
          <div>
            <p>Карточка детали</p>
            <h2>{title}</h2>
          </div>

          <button type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>

        {error && (
          <div className="system-message system-message--error">{error}</div>
        )}

        <form className="entity-form" onSubmit={onSubmit}>
          <label className="entity-form__field">
            <span>Номенклатура детали</span>
            <select
              required
              className="entity-form__control"
              value={form.nomenclatureId}
              onChange={(event) =>
                onChangeForm("nomenclatureId", event.target.value)
              }
            >
              <option value="">Выберите номенклатуру</option>
              {partNomenclature.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </label>

          {selectedNomenclature && (
            <div className="nomenclature-preview">
              <div>
                <span>Код</span>
                <b>{selectedNomenclature.code}</b>
              </div>
              <div>
                <span>Наименование</span>
                <b>{selectedNomenclature.name}</b>
              </div>
              <div>
                <span>Категория</span>
                <b>{selectedNomenclature.category}</b>
              </div>
              <div>
                <span>Материал</span>
                <b>{selectedNomenclature.material}</b>
              </div>
              <div>
                <span>Чертеж</span>
                <b>{selectedNomenclature.drawing}</b>
              </div>
            </div>
          )}

          <label className="entity-form__field">
            <span>Поставщик</span>
            <select
              required
              className="entity-form__control"
              value={form.supplier}
              onChange={(event) => onChangeForm("supplier", event.target.value)}
            >
              <option value="">Выберите поставщика</option>
              {references.suppliers.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="entity-form__row">
            <label className="entity-form__field">
              <span>Единица измерения</span>
              <select
                required
                className="entity-form__control"
                value={form.unit}
                onChange={(event) => onChangeForm("unit", event.target.value)}
              >
                <option value="">Выберите единицу</option>
                {references["measurement-units"].map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="entity-form__field">
              <span>Вес, кг</span>
              <input
                required
                className="entity-form__control"
                inputMode="decimal"
                type="text"
                value={form.weight}
                onChange={(event) =>
                  onChangeForm("weight", decimalInputValue(event.target.value))
                }
                placeholder="0.085"
              />
            </label>
          </div>

          <div className="entity-form__row">
            <label className="entity-form__field">
              <span>Остаток</span>
              <input
                required
                className="entity-form__control"
                inputMode="numeric"
                type="text"
                value={form.stock}
                onChange={(event) =>
                  onChangeForm("stock", onlyDigits(event.target.value))
                }
                placeholder="100"
              />
            </label>

            <label className="entity-form__field">
              <span>Минимальный остаток</span>
              <input
                required
                className="entity-form__control"
                inputMode="numeric"
                type="text"
                value={form.minStock}
                onChange={(event) =>
                  onChangeForm("minStock", onlyDigits(event.target.value))
                }
                placeholder="50"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>

            <button
              className="secondary-button secondary-button--large"
              type="button"
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}

function NomenclatureModal({
  modal,
  form,
  references,
  partNomenclature,
  parts,
  replacementId,
  error,
  isSaving,
  onChangeForm,
  onChangeReplacementId,
  onClose,
  onSubmit
}: {
  modal: NomenclatureModalState;
  form: NomenclatureForm;
  references: ReferencesMap;
  partNomenclature: PartNomenclature[];
  parts: Part[];
  replacementId: string;
  error: string;
  isSaving: boolean;
  onChangeForm: (field: keyof NomenclatureForm, value: string) => void;
  onChangeReplacementId: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isDelete = modal.mode === "delete";
  const isEdit = modal.mode === "edit";

  const title = isDelete
    ? "Удаление номенклатуры"
    : isEdit
      ? "Редактирование номенклатуры"
      : "Добавление номенклатуры";

  const deletedPart = modal.item
    ? parts.find((part) => part.nomenclatureId === modal.item?.id)
    : undefined;
  const selectedReplacementId = Number(replacementId);
  const replacementPart = Number.isFinite(selectedReplacementId)
    ? parts.find((part) => part.nomenclatureId === selectedReplacementId)
    : undefined;
  const replacementOptions = partNomenclature.filter(
    (item) => item.id !== modal.item?.id
  );
  const isUsedInPart = Boolean(deletedPart);
  const isDeleteDisabled = isSaving || (isDelete && isUsedInPart && !replacementId);

  return (
    <ModalBackdrop onClose={onClose}>
      <section className="reference-modal reference-modal--wide">
        <div className="reference-modal__header">
          <div>
            <p>Номенклатура деталей</p>
            <h2>{title}</h2>
          </div>

          <button type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>

        {error && (
          <div className="system-message system-message--error">{error}</div>
        )}

        <form className="entity-form" onSubmit={onSubmit}>
          {!isDelete && (
            <>
              <div className="entity-form__row">
                <label className="entity-form__field">
                  <span>Код детали</span>
                  <input
                    required
                    className="entity-form__control"
                    value={form.code}
                    onChange={(event) =>
                      onChangeForm("code", event.target.value)
                    }
                    placeholder="ГОСТ 11371-78"
                  />
                </label>

                <label className="entity-form__field">
                  <span>Наименование</span>
                  <input
                    required
                    className="entity-form__control"
                    value={form.name}
                    onChange={(event) =>
                      onChangeForm("name", event.target.value)
                    }
                    placeholder="Шайба плоская М10"
                  />
                </label>
              </div>

              <div className="entity-form__row">
                <label className="entity-form__field">
                  <span>Категория</span>
                  <select
                    required
                    className="entity-form__control"
                    value={form.category}
                    onChange={(event) =>
                      onChangeForm("category", event.target.value)
                    }
                  >
                    <option value="">Выберите категорию</option>
                    {references["part-categories"].map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="entity-form__field">
                  <span>Материал</span>
                  <select
                    required
                    className="entity-form__control"
                    value={form.material}
                    onChange={(event) =>
                      onChangeForm("material", event.target.value)
                    }
                  >
                    <option value="">Выберите материал</option>
                    {references.materials.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="entity-form__field">
                <span>Номер чертежа</span>
                <input
                  required
                  className="entity-form__control"
                  value={form.drawing}
                  onChange={(event) =>
                    onChangeForm("drawing", event.target.value)
                  }
                  placeholder="DRW-BOLT-M12-060"
                />
              </label>
            </>
          )}

          {isDelete && (
            <>
              <div className="delete-warning delete-warning--merge">
                <b>
                  Вы удаляете: {modal.item?.code} — {modal.item?.name}
                </b>

                {isUsedInPart ? (
                  <span>
                    Эта номенклатура уже связана с карточкой детали. Такую запись нельзя просто стереть: нужно
                    объединить ее с правильной номенклатурой, чтобы не потерять
                    складской остаток и историю закупок.
                  </span>
                ) : (
                  <span>
                    Эта номенклатура не используется в карточках деталей. Ее
                    можно удалить без замены.
                  </span>
                )}
              </div>

              {deletedPart && (
                <div className="merge-summary">
                  <div>
                    <span>Текущая карточка</span>
                    <b>{deletedPart.code} — {deletedPart.name}</b>
                  </div>
                  <div>
                    <span>Остаток</span>
                    <b>{deletedPart.stock.toLocaleString("ru-RU")} {deletedPart.unit}</b>
                  </div>
                  <div>
                    <span>Минимум</span>
                    <b>{deletedPart.minStock.toLocaleString("ru-RU")} {deletedPart.unit}</b>
                  </div>
                  <div>
                    <span>Поставщик</span>
                    <b>{deletedPart.supplier}</b>
                  </div>
                </div>
              )}

              <label className="entity-form__field">
                <span>
                  {isUsedInPart
                    ? "Объединить с номенклатурой"
                    : "Заменить на"}
                </span>
                <select
                  required={isUsedInPart}
                  className="entity-form__control"
                  value={replacementId}
                  onChange={(event) => onChangeReplacementId(event.target.value)}
                >
                  <option value="">
                    {isUsedInPart
                      ? "Выберите основную номенклатуру"
                      : "Не заменять, удалить без переноса"}
                  </option>

                  {replacementOptions.map((item) => {
                    const optionPart = parts.find(
                      (part) => part.nomenclatureId === item.id
                    );

                    return (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.name}
                        {optionPart ? " · есть карточка склада" : " · карточки нет"}
                      </option>
                    );
                  })}
                </select>
              </label>

              {isUsedInPart && replacementId && (
                <div className="merge-plan">
                  <b>Что произойдет после подтверждения</b>
                  <span>
                    Закупки удаляемой карточки будут перепривязаны к выбранной
                    номенклатуре. Остаток удаляемой карточки будет добавлен к
                    остатку основной карточки. Минимальный остаток будет взят по
                    большему значению. После переноса дубль будет удален.
                  </span>

                  {replacementPart && deletedPart && (
                    <div className="merge-plan__grid">
                      <div>
                        <span>Основная карточка сейчас</span>
                        <b>
                          {replacementPart.stock.toLocaleString("ru-RU")} {replacementPart.unit}
                        </b>
                      </div>
                      <div>
                        <span>Будет после объединения</span>
                        <b>
                          {(replacementPart.stock + deletedPart.stock).toLocaleString("ru-RU")} {replacementPart.unit}
                        </b>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="modal-actions">
            <button
              className={
                isDelete ? "danger-button danger-button--large" : "primary-button"
              }
              type="submit"
              disabled={isDeleteDisabled}
            >
              {isSaving
                ? "Сохранение..."
                : isDelete && isUsedInPart
                  ? "Объединить и удалить"
                  : isDelete
                    ? "Удалить"
                    : isEdit
                      ? "Сохранить изменения"
                      : "Добавить"}
            </button>

            <button
              className="secondary-button secondary-button--large"
              type="button"
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}

function ReferenceModal({
  modal,
  form,
  references,
  replacementName,
  error,
  isSaving,
  onChangeForm,
  onChangeReplacementName,
  onClose,
  onSubmit
}: {
  modal: ReferenceModalState;
  form: ReferenceForm;
  references: ReferencesMap;
  replacementName: string;
  error: string;
  isSaving: boolean;
  onChangeForm: (field: keyof ReferenceForm, value: string) => void;
  onChangeReplacementName: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isDelete = modal.mode === "delete";
  const isEdit = modal.mode === "edit";

  const title = isDelete
    ? "Удаление записи справочника"
    : isEdit
      ? "Редактирование записи справочника"
      : "Добавление записи справочника";

  const replacementOptions = references[modal.kind].filter(
    (item) => item.id !== modal.item?.id
  );

  return (
    <ModalBackdrop onClose={onClose}>
      <section className="reference-modal">
        <div className="reference-modal__header">
          <div>
            <p>{getReferenceTitle(modal.kind)}</p>
            <h2>{title}</h2>
          </div>

          <button type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>

        {error && (
          <div className="system-message system-message--error">{error}</div>
        )}

        <form className="entity-form" onSubmit={onSubmit}>
          {!isDelete && (
            <>
              <label className="entity-form__field">
                <span>Название</span>
                <input
                  required
                  className="entity-form__control"
                  value={form.name}
                  onChange={(event) =>
                    onChangeForm("name", event.target.value)
                  }
                  placeholder="Название записи справочника"
                />
              </label>

              <label className="entity-form__field">
                <span>Описание</span>
                <input
                  className="entity-form__control"
                  value={form.description}
                  onChange={(event) =>
                    onChangeForm("description", event.target.value)
                  }
                  placeholder="Краткое описание"
                />
              </label>
            </>
          )}

          {isDelete && (
            <>
              <div className="delete-warning">
                <b>Вы удаляете: {modal.item?.name}</b>
                <span>
                  Если запись уже используется в карточках деталей,
                  номенклатуре или закупках, выберите замену. История закупок не
                  будет удалена.
                </span>
              </div>

              <label className="entity-form__field">
                <span>Заменить на</span>
                <select
                  className="entity-form__control"
                  value={replacementName}
                  onChange={(event) =>
                    onChangeReplacementName(event.target.value)
                  }
                >
                  <option value="">
                    Не заменять, удалить только если запись не используется
                  </option>

                  {replacementOptions.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="modal-actions">
            <button
              className={
                isDelete ? "danger-button danger-button--large" : "primary-button"
              }
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Сохранение..."
                : isDelete
                  ? "Удалить запись"
                  : isEdit
                    ? "Сохранить изменения"
                    : "Добавить запись"}
            </button>

            <button
              className="secondary-button secondary-button--large"
              type="button"
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}

function InfoModal({
  modal,
  onClose
}: {
  modal: InfoModalState;
  onClose: () => void;
}) {
  const hasImage = Boolean(modal.image);

  return (
    <ModalBackdrop onClose={onClose}>
      <section
        className={hasImage ? "reference-modal reference-modal--wide" : "reference-modal"}
        style={
          hasImage
            ? {
                width: "min(980px, 100%)"
              }
            : undefined
        }
      >
        <div className="reference-modal__header">
          <div>
            <p>{modal.subtitle || "Карточка"}</p>
            <h2>{modal.title}</h2>
          </div>

          <button type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div
          style={
            hasImage
              ? {
                  display: "grid",
                  gridTemplateColumns: "minmax(300px, 420px) minmax(0, 1fr)",
                  gap: "18px",
                  alignItems: "start"
                }
              : undefined
          }
        >
          {modal.image && (
            <div
              style={{
                minWidth: 0,
                padding: "12px",
                border: "1px solid var(--border)",
                borderRadius: "22px",
                background: "var(--surface-soft)"
              }}
            >
              <div
                style={{
                  display: "grid",
                  width: "100%",
                  height: "360px",
                  placeItems: "center",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  borderRadius: "18px",
                  background: "#ffffff"
                }}
              >
                <img
                  alt={modal.image.alt}
                  src={modal.image.src}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain"
                  }}
                />
              </div>

              {modal.image.caption && (
                <p
                  style={{
                    margin: "12px 0 0",
                    color: "var(--muted-strong)",
                    fontSize: "13px",
                    fontWeight: 900,
                    textAlign: "center",
                    overflowWrap: "anywhere"
                  }}
                >
                  {modal.image.caption}
                </p>
              )}
            </div>
          )}

          <div
            className="info-list"
            style={{
              display: "grid",
              gap: "10px",
              minWidth: 0
            }}
          >
            {modal.rows.map((row) => (
              <div className="info-list__row" key={row.label}>
                <span>{row.label}</span>
                <b>{row.value}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
    </ModalBackdrop>
  );
}

function MetricCard({
  title,
  value,
  text,
  danger = false
}: {
  title: string;
  value: string;
  text: string;
  danger?: boolean;
}) {
  return (
    <article
      className={danger ? "metric-card metric-card--danger" : "metric-card"}
    >
      <span>{title}</span>
      <b>{value}</b>
      <p>{text}</p>
    </article>
  );
}

export default App;
