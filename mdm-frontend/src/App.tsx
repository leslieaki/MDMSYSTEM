import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  clearAuthSession,
  clearOperationLogsRequest,
  createOperationLogRequest,
  createPartNomenclatureRequest,
  createPartRequest,
  createPurchaseRequest,
  createReferenceItemRequest,
  deleteDrawingImageRequest,
  deletePartNomenclatureRequest,
  deleteReferenceItemRequest,
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
  updatePartNomenclatureRequest,
  updatePartRequest,
  updateReferenceItemRequest,
  uploadDrawingImageRequest
} from "./api";
import type {
  Department,
  AuthSession,
  DrawingImagesMap,
  Employee,
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
  | "admin";

type Role = "admin" | "worker";

type LoginForm = {
  username: string;
  password: string;
};

type MenuItem = {
  id: Page;
  title: string;
  subtitle: string;
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
  { id: "dashboard", title: "Обзор", subtitle: "Главные показатели" },
  { id: "parts", title: "Детали", subtitle: "Справочник мастер-данных" },
  {
    id: "purchases",
    title: "Закупки",
    subtitle: "Регламент учета",
    adminOnly: true
  },
  { id: "warehouse", title: "Склад", subtitle: "Остатки и дефицит" },
  { id: "reports", title: "Отчеты", subtitle: "Аналитика склада" },
  { id: "employees", title: "Сотрудники", subtitle: "Подразделения и роли" },
  { id: "drawings", title: "Чертежи", subtitle: "Документация" },
  {
    id: "journal",
    title: "Журнал",
    subtitle: "История действий"
  },
  {
    id: "admin",
    title: "Админка",
    subtitle: "Управление системой",
    adminOnly: true
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
  return role === "admin" ? "Администратор системы" : "Работник";
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
    dashboard: "Панель управления",
    parts: "Справочник деталей",
    purchases: "Закупки",
    warehouse: "Складские остатки",
    reports: "Отчеты",
    employees: "Сотрудники и подразделения",
    drawings: "Чертежи",
    journal: "Журнал операций",
    admin: "Администрирование"
  };

  return titles[page];
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
  const blob = new Blob([`﻿${csv}`], {
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

function App() {
  const [page, setPageState] = useState<Page>(getInitialPage);
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

  const [search, setSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportCategory, setReportCategory] = useState("all");
  const [reportStatus, setReportStatus] = useState("all");
  const [isRefreshingReport, setIsRefreshingReport] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
  const [operationLog, setOperationLog] =
    useState<OperationLogEntry[]>([]);
  const [drawingImages, setDrawingImages] =
    useState<DrawingImagesMap>({});

  const currentEmployee = employees.find(
    (employee) => String(employee.id) === currentEmployeeId
  );

  const role: Role = authSession?.user.role || "worker";

  const visibleMenu = useMemo(() => {
    return menu.filter((item) => !item.adminOnly || role === "admin");
  }, [role]);

  const authenticatedUserName = authSession?.user.displayName || "Не авторизован";

  const filteredParts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return parts;
    }

    return parts.filter((part) =>
      `${part.code} ${part.name} ${part.category} ${part.drawing} ${part.material} ${part.supplier}`
        .toLowerCase()
        .includes(query)
    );
  }, [parts, search]);

  const lowStockParts = useMemo(() => {
    return parts.filter((part) => part.stock <= part.minStock);
  }, [parts]);

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

  const isFormModalOpen = Boolean(partModal || nomenclatureModal || referenceModal);

  const backendStatusText = isLoading
    ? "Проверка backend..."
    : loadError
      ? "Backend API недоступен"
      : "Backend API подключен";

  function setPage(nextPage: Page) {
    localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, nextPage);

    if (getPageFromHash() === nextPage) {
      setPageState(nextPage);
      return;
    }

    window.location.hash = nextPage;
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
      "Удаление чертежа"
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
    if (role !== "admin") {
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

  function openPartInfo(part: Part) {
    const drawingImage = drawingImages[String(part.id)];

    setInfoModal({
      title: part.name,
      subtitle: "Карточка детали",
      image: drawingImage
        ? {
            src: drawingImage,
            alt: `Фото чертежа ${part.drawing}`,
            caption: `Чертеж ${part.drawing}`
          }
        : undefined,
      rows: [
        { label: "Код", value: part.code },
        { label: "Категория", value: part.category },
        { label: "Материал", value: part.material },
        { label: "Поставщик", value: part.supplier },
        { label: "Единица измерения", value: part.unit },
        { label: "Вес", value: `${part.weight} кг` },
        { label: "Остаток", value: `${part.stock} ${part.unit}` },
        { label: "Минимальный остаток", value: String(part.minStock) },
        { label: "Чертеж", value: part.drawing },
        {
          label: "Фото чертежа",
          value: drawingImage ? "Загружено" : "Не загружено"
        }
      ]
    });
  }

  function openPartByRole(part: Part) {
    if (role === "admin") {
      openEditPartModal(part);
      return;
    }

    openPartInfo(part);
  }

  async function uploadDrawingImage(part: Part, file: File): Promise<void> {
    try {
      setActionError("");

      if (role !== "admin") {
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
        "Загрузка",
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

      if (role !== "admin") {
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
        "Удаление",
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

  async function loadData() {
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
  }

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
  }, []);

  useEffect(() => {
    if (!authSession) {
      setIsLoading(false);
      return;
    }

    void loadData();
  }, [authSession]);

  useEffect(() => {
    function closeTopModal(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (infoModal) {
        closeInfoModal();
        return;
      }

      if (referenceModal) {
        requestCloseReferenceModal();
        return;
      }

      if (nomenclatureModal) {
        requestCloseNomenclatureModal();
        return;
      }

      if (partModal) {
        requestClosePartModal();
      }
    }

    window.addEventListener("keydown", closeTopModal);

    return () => {
      window.removeEventListener("keydown", closeTopModal);
    };
  }, [
    infoModal,
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

  useEffect(() => {
    if (!authSession) {
      return;
    }

    if (role === "worker" && (page === "admin" || page === "purchases")) {
      setPage("dashboard");
    }
  }, [authSession, role, page]);

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
      <Sidebar
        authSession={authSession}
        currentEmployee={currentEmployee}
        menu={visibleMenu}
        page={page}
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

        <PageHeader
          page={page}
          backendStatusText={backendStatusText}
          hasError={Boolean(loadError)}
        />

        {page === "dashboard" && (
          <DashboardPage
            lowStockParts={lowStockParts}
            parts={parts}
            partsCount={parts.length}
            purchases={purchases}
            purchasesTotal={totalPurchases}
            totalStock={totalStock}
            onOpenPart={openPartByRole}
            onOpenPurchase={openPurchaseInfo}
          />
        )}

        {page === "parts" && (
          <PartsPage
            filteredParts={filteredParts}
            role={role}
            search={search}
            onChangeSearch={setSearch}
            onOpenCreatePart={openCreatePartModal}
            onOpenPart={openPartByRole}
          />
        )}

        {page === "purchases" && role === "admin" && (
          <PurchasesPage
            form={purchaseForm}
            isDisabled={Boolean(loadError) || parts.length === 0}
            parts={parts}
            purchases={purchases}
            selectedPart={selectedPurchasePart}
            onChangeForm={updatePurchaseForm}
            onOpenPurchase={openPurchaseInfo}
            onSubmit={createPurchase}
          />
        )}

        {page === "warehouse" && (
          <WarehousePage
            lowStockCount={lowStockParts.length}
            parts={parts}
            onOpenPart={openPartByRole}
          />
        )}

        {page === "reports" && (
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

        {page === "employees" && (
          <EmployeesPage
            departments={departments}
            employees={employees}
            onOpenDepartment={openDepartmentInfo}
            onOpenEmployee={openEmployeeInfo}
          />
        )}

        {page === "drawings" && (
          <DrawingsPage
            drawingImages={drawingImages}
            parts={parts}
            role={role}
            onOpenPart={openPartInfo}
            onRemoveDrawingImage={removeDrawingImage}
            onUploadDrawingImage={uploadDrawingImage}
          />
        )}

        {page === "journal" && (
          <OperationLogPage
            entries={operationLog}
            role={role}
            onClear={clearOperationLog}
            onExport={exportOperationLogCsv}
          />
        )}

        {page === "admin" && role === "admin" && (
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

      {infoModal && <InfoModal modal={infoModal} onClose={closeInfoModal} />}
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

function Sidebar({
  authSession,
  currentEmployee,
  menu,
  page,
  role,
  onChangePage,
  onLogout
}: {
  authSession: AuthSession;
  currentEmployee: Employee | undefined;
  menu: MenuItem[];
  page: Page;
  role: Role;
  onChangePage: (page: Page) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="mdm-sidebar">
      <div className="mdm-logo">
        <div className="mdm-logo__mark">M</div>
        <div className="mdm-logo__content">
          <b>Factory MDM</b>
          <span>единые данные завода</span>
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
              role === "admin"
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
        {menu.map((item) => (
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
      </nav>
    </aside>
  );
}

function PageHeader({
  page,
  backendStatusText,
  hasError
}: {
  page: Page;
  backendStatusText: string;
  hasError: boolean;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="page-header__eyebrow">Централизованная MDM-система</p>
        <h1 className="page-header__title">{getPageTitle(page)}</h1>
      </div>

      <div className="page-header__badges">
        <span className="tech-badge">React + TypeScript</span>

        <span
          className={
            hasError
              ? "status-badge status-badge--error"
              : "status-badge status-badge--success"
          }
        >
          <i />
          {backendStatusText}
        </span>
      </div>
    </header>
  );
}

function DashboardPage({
  lowStockParts,
  parts,
  partsCount,
  purchases,
  purchasesTotal,
  totalStock,
  onOpenPart,
  onOpenPurchase
}: {
  lowStockParts: Part[];
  parts: Part[];
  partsCount: number;
  purchases: Purchase[];
  purchasesTotal: number;
  totalStock: number;
  onOpenPart: (part: Part) => void;
  onOpenPurchase: (purchase: Purchase) => void;
}) {
  const latestPurchases = purchases.slice(0, 6);
  const criticalParts = lowStockParts.slice(0, 8);
  const deficitCount = lowStockParts.filter((part) => part.stock === 0).length;

  return (
    <section className="dashboard-page">
      <div className="metrics-grid">
        <MetricCard
          title="Карточек деталей"
          value={partsCount.toLocaleString("ru-RU")}
          text="Активные позиции мастер-данных"
        />
        <MetricCard
          title="Остаток на складе"
          value={totalStock.toLocaleString("ru-RU")}
          text="Суммарное количество по всем позициям"
        />
        <MetricCard
          danger={lowStockParts.length > 0}
          title="Требуют контроля"
          value={lowStockParts.length.toLocaleString("ru-RU")}
          text="Остаток ниже или равен минимальному"
        />
        <MetricCard
          danger={deficitCount > 0}
          title="Дефицит"
          value={deficitCount.toLocaleString("ru-RU")}
          text="Позиции с нулевым остатком"
        />
      </div>

      <section className="content-card">
        <div className="content-card__header">
          <div>
            <p>Контроль склада</p>
            <h2>Позиции, требующие пополнения</h2>
          </div>
        </div>

        <div className="data-table">
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
                  {part.code} · {part.name}
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
            <div className="data-table__row">
              <span>Позиций с низким остатком нет</span>
              <span>—</span>
              <span>—</span>
              <span>—</span>
            </div>
          )}
        </div>
      </section>

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

        <div className="data-table">
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
            <div className="data-table__row">
              <span>Закупок пока нет</span>
              <span>—</span>
              <span>—</span>
              <span>—</span>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function PartsPage({
  filteredParts,
  role,
  search,
  onChangeSearch,
  onOpenCreatePart,
  onOpenPart
}: {
  filteredParts: Part[];
  role: Role;
  search: string;
  onChangeSearch: (value: string) => void;
  onOpenCreatePart: () => void;
  onOpenPart: (part: Part) => void;
}) {
  return (
    <section className="content-card">
      <div className="content-card__header">
        <div>
          <p>Мастер-данные</p>
          <h2>Справочник деталей и ПКИ</h2>
          <span>
            Код, наименование, категория, материал и чертеж берутся только из
            утвержденной номенклатуры.
          </span>
        </div>

        {role === "admin" && (
          <button
            className="primary-button"
            type="button"
            onClick={onOpenCreatePart}
          >
            Добавить деталь
          </button>
        )}
      </div>

      <input
        className="search-field"
        value={search}
        onChange={(event) => onChangeSearch(event.target.value)}
        placeholder="Поиск по названию, ГОСТ, категории, поставщику или номеру чертежа"
      />

      <div className="parts-grid">
        {filteredParts.map((part) => (
          <PartCard key={part.id} part={part} onOpenPart={onOpenPart} />
        ))}
      </div>
    </section>
  );
}

function PartCard({
  part,
  onOpenPart
}: {
  part: Part;
  onOpenPart: (part: Part) => void;
}) {
  const danger = part.stock <= part.minStock;

  return (
    <button
      className="part-card part-card--button"
      type="button"
      onClick={() => onOpenPart(part)}
    >
      <div className="part-card__header">
        <div>
          <span>{part.category}</span>
          <h3>{part.name}</h3>
        </div>

        <b
          className={
            danger
              ? "part-card__badge part-card__badge--danger"
              : "part-card__badge"
          }
        >
          {danger ? "Мало" : "В норме"}
        </b>
      </div>

      <div className="part-card__grid">
        <div>
          <span>Код</span>
          <b>{part.code}</b>
        </div>

        <div>
          <span>Материал</span>
          <b>{part.material}</b>
        </div>

        <div>
          <span>Поставщик</span>
          <b>{part.supplier}</b>
        </div>

        <div>
          <span>Остаток</span>
          <b>
            {part.stock} {part.unit}
          </b>
        </div>
      </div>

      <div className="drawing-line">
        <span>Чертеж</span>
        <b>{part.drawing}</b>
      </div>
    </button>
  );
}

function PurchasesPage({
  form,
  isDisabled,
  parts,
  purchases,
  selectedPart,
  onChangeForm,
  onOpenPurchase,
  onSubmit
}: {
  form: PurchaseForm;
  isDisabled: boolean;
  parts: Part[];
  purchases: Purchase[];
  selectedPart: Part | undefined;
  onChangeForm: (field: keyof PurchaseForm, value: string) => void;
  onOpenPurchase: (purchase: Purchase) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="purchase-layout">
      <section className="content-card">
        <div className="content-card__header">
          <div>
            <p>Регламент закупок</p>
            <h2>Новая закупка</h2>
            <span>Вручную вводятся только количество и цена.</span>
          </div>
        </div>

        <form className="entity-form" onSubmit={onSubmit}>
          <label className="entity-form__field">
            <span>Деталь из справочника</span>
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

          {selectedPart && (
            <div className="form-hint">
              <span>
                Остаток: {selectedPart.stock} {selectedPart.unit}
              </span>
              <span>Поставщик: {selectedPart.supplier}</span>
              <span>Материал: {selectedPart.material}</span>
              <span>Чертеж: {selectedPart.drawing}</span>
            </div>
          )}

          <div className="entity-form__row">
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
          </div>

          <label className="entity-form__field">
            <span>Ответственный</span>
            <input
              disabled
              className="entity-form__control"
              value={form.employee}
              onChange={(event) => onChangeForm("employee", event.target.value)}
            />
          </label>

          <button className="primary-button" type="submit" disabled={isDisabled}>
            Провести закупку
          </button>
        </form>
      </section>

      <section className="content-card">
        <div className="content-card__header">
          <div>
            <p>История</p>
            <h2>Последние закупки</h2>
          </div>
        </div>

        <div className="data-table">
          <div className="data-table__row data-table__row--head">
            <span>Операция</span>
            <span>Деталь</span>
            <span>Кол-во</span>
            <span>Цена</span>
          </div>

          {purchases.map((purchase) => {
            const part = parts.find((item) => item.id === purchase.partId);

            return (
              <button
                className="data-table__row data-table__row--button"
                key={purchase.id}
                type="button"
                onClick={() => onOpenPurchase(purchase)}
              >
                <span>{purchase.rawName}</span>
                <span>{part?.name || "Не найдена"}</span>
                <span>{purchase.quantity}</span>
                <span>{formatMoney(purchase.price)}</span>
              </button>
            );
          })}
        </div>
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

          {role === "admin" && (
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
  parts,
  lowStockCount,
  onOpenPart
}: {
  parts: Part[];
  lowStockCount: number;
  onOpenPart: (part: Part) => void;
}) {
  return (
    <section className="content-card">
      <div className="content-card__header">
        <div>
          <p>Складской учет</p>
          <h2>Остатки деталей</h2>
        </div>

        <span className="pill">Низкий остаток: {lowStockCount}</span>
      </div>

      <div className="warehouse-list">
        {parts.map((part) => {
          const percent =
            part.minStock > 0
              ? Math.min(100, Math.round((part.stock / part.minStock) * 100))
              : 100;

          const danger = part.stock <= part.minStock;

          return (
            <button
              className="warehouse-item warehouse-item--button"
              key={part.id}
              type="button"
              onClick={() => onOpenPart(part)}
            >
              <div>
                <b>{part.name}</b>
                <span>{part.code}</span>
              </div>

              <div>
                <b>
                  {part.stock} {part.unit}
                </b>
                <span>минимум: {part.minStock}</span>
              </div>

              <div className="progress">
                <div
                  className={
                    danger
                      ? "progress__bar progress__bar--danger"
                      : "progress__bar"
                  }
                  style={{ width: `${percent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
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
  const canManageDrawings = role === "admin";

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

        {role === "admin" ? (
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

  const replacementOptions = partNomenclature.filter(
    (item) => item.id !== modal.item?.id
  );

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
              <div className="delete-warning">
                <b>Вы удаляете: {modal.item?.name}</b>
                <span>
                  Если эта номенклатура используется в карточках деталей,
                  выберите замену. Связанные карточки будут перенесены на новую
                  номенклатуру.
                </span>
              </div>

              <label className="entity-form__field">
                <span>Заменить на</span>
                <select
                  className="entity-form__control"
                  value={replacementId}
                  onChange={(event) => onChangeReplacementId(event.target.value)}
                >
                  <option value="">
                    Не заменять, удалить только если не используется
                  </option>

                  {replacementOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name}
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
