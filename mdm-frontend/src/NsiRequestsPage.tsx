import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  approveNomenclatureRequest,
  createNomenclatureRequest,
  getNomenclatureRequests,
  getPartNomenclature,
  getReferences,
  rejectNomenclatureRequest,
  submitNomenclatureRequest
} from "./api";
import type {
  AuthUserRole,
  CreateNomenclatureRequestData,
  NomenclatureRequest,
  NomenclatureRequestStatus,
  NomenclatureRequestType,
  PartNomenclature,
  ReferenceItem
} from "./api";

type NsiRequestForm = {
  requestType: NomenclatureRequestType;
  targetNomenclatureId: string;
  code: string;
  name: string;
  category: string;
  material: string;
  drawing: string;
  comment: string;
};

type NsiReferenceLists = {
  categories: ReferenceItem[];
  materials: ReferenceItem[];
};

const initialForm: NsiRequestForm = {
  requestType: "create",
  targetNomenclatureId: "",
  code: "",
  name: "",
  category: "",
  material: "",
  drawing: "",
  comment: ""
};

const statusLabels: Record<NomenclatureRequestStatus, string> = {
  draft: "Черновик",
  pending: "На согласовании",
  approved: "Утверждена",
  rejected: "Отклонена"
};

const typeLabels: Record<NomenclatureRequestType, string> = {
  create: "Создание",
  update: "Изменение"
};

function hasAdminAccess(role: AuthUserRole): boolean {
  return role === "admin" || role === "superadmin";
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function NsiRequestsPage({ role }: { role: AuthUserRole }) {
  const [requests, setRequests] = useState<NomenclatureRequest[]>([]);
  const [partNomenclature, setPartNomenclature] = useState<PartNomenclature[]>(
    []
  );
  const [references, setReferences] = useState<NsiReferenceLists>({
    categories: [],
    materials: []
  });
  const [form, setForm] = useState<NsiRequestForm>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const isAdmin = hasAdminAccess(role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError("");

    try {
      const [
        requestsFromApi,
        nomenclatureFromApi,
        categoriesFromApi,
        materialsFromApi
      ] = await Promise.all([
        getNomenclatureRequests(),
        getPartNomenclature(),
        getReferences("part-categories"),
        getReferences("materials")
      ]);

      setRequests(requestsFromApi);
      setPartNomenclature(nomenclatureFromApi);
      setReferences({
        categories: categoriesFromApi,
        materials: materialsFromApi
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить заявки НСИ"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const metrics = useMemo(() => {
    return {
      total: requests.length,
      draft: requests.filter((item) => item.status === "draft").length,
      pending: requests.filter((item) => item.status === "pending").length,
      approved: requests.filter((item) => item.status === "approved").length,
      rejected: requests.filter((item) => item.status === "rejected").length
    };
  }, [requests]);

  function updateForm(field: keyof NsiRequestForm, value: string) {
    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [field]: value
      };

      if (field === "requestType" && value === "create") {
        return {
          ...nextForm,
          targetNomenclatureId: ""
        };
      }

      if (field === "targetNomenclatureId" && value) {
        const selectedItem = partNomenclature.find(
          (item) => String(item.id) === value
        );

        if (selectedItem) {
          return {
            ...nextForm,
            code: selectedItem.code,
            name: selectedItem.name,
            category: selectedItem.category,
            material: selectedItem.material,
            drawing: selectedItem.drawing
          };
        }
      }

      return nextForm;
    });
  }

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setActionError("");

    try {
      const data: CreateNomenclatureRequestData = {
        requestType: form.requestType,
        targetNomenclatureId:
          form.requestType === "update"
            ? Number(form.targetNomenclatureId)
            : null,
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category,
        material: form.material,
        drawing: form.drawing.trim(),
        comment: form.comment.trim()
      };

      await createNomenclatureRequest(data);
      setForm(initialForm);
      await loadData();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Ошибка создания заявки НСИ"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitRequest(id: number) {
    setActionError("");

    try {
      await submitNomenclatureRequest(id);
      await loadData();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Ошибка отправки заявки НСИ"
      );
    }
  }

  async function handleApproveRequest(id: number) {
    setActionError("");

    try {
      await approveNomenclatureRequest(id);
      await loadData();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Ошибка утверждения заявки НСИ"
      );
    }
  }

  async function handleRejectRequest(id: number) {
    const rejectReason = window.prompt("Укажите причину отклонения заявки НСИ");

    if (!rejectReason?.trim()) {
      return;
    }

    setActionError("");

    try {
      await rejectNomenclatureRequest(id, rejectReason.trim());
      await loadData();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Ошибка отклонения заявки НСИ"
      );
    }
  }

  return (
    <section className="nsi-requests-page">
      {actionError && (
        <div className="system-message system-message--error">{actionError}</div>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <p>Всего заявок</p>
          <strong>{metrics.total.toLocaleString("ru-RU")}</strong>
          <span>Создание и изменение мастер-данных</span>
        </div>

        <div className="metric-card">
          <p>Черновики</p>
          <strong>{metrics.draft.toLocaleString("ru-RU")}</strong>
          <span>Готовятся инициатором</span>
        </div>

        <div className="metric-card">
          <p>На согласовании</p>
          <strong>{metrics.pending.toLocaleString("ru-RU")}</strong>
          <span>Ожидают решения администратора</span>
        </div>

        <div className="metric-card">
          <p>Утверждено</p>
          <strong>{metrics.approved.toLocaleString("ru-RU")}</strong>
          <span>Применено к номенклатуре</span>
        </div>
      </div>

      <div className="nsi-requests-layout">
        <form className="content-card entity-form" onSubmit={handleCreateRequest}>
          <div className="content-card__header">
            <div>
              <p>Новая заявка</p>
              <h2>Изменение мастер-данных</h2>
            </div>
          </div>

          <label>
            Тип заявки
            <select
              className="entity-form__control"
              value={form.requestType}
              onChange={(event) =>
                updateForm("requestType", event.target.value)
              }
              required
            >
              <option value="create">Создание новой позиции</option>
              <option value="update">Изменение существующей позиции</option>
            </select>
          </label>

          {form.requestType === "update" && (
            <label>
              Изменяемая карточка
              <select
                className="entity-form__control"
                value={form.targetNomenclatureId}
                onChange={(event) =>
                  updateForm("targetNomenclatureId", event.target.value)
                }
                required
              >
                <option value="">Выберите карточку НСИ</option>
                {partNomenclature.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Код
            <input
              className="entity-form__control"
              value={form.code}
              onChange={(event) => updateForm("code", event.target.value)}
              placeholder="Например: CH-006-2026"
              required
            />
          </label>

          <label>
            Наименование
            <input
              className="entity-form__control"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Введите наименование позиции"
              required
            />
          </label>

          <label>
            Категория
            <select
              className="entity-form__control"
              value={form.category}
              onChange={(event) => updateForm("category", event.target.value)}
              required
            >
              <option value="">Выберите категорию из справочника</option>
              {references.categories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Материал
            <select
              className="entity-form__control"
              value={form.material}
              onChange={(event) => updateForm("material", event.target.value)}
              required
            >
              <option value="">Выберите материал из справочника</option>
              {references.materials.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Чертеж
            <input
              className="entity-form__control"
              value={form.drawing}
              onChange={(event) => updateForm("drawing", event.target.value)}
              placeholder="Номер или код чертежа"
              required
            />
          </label>

          <label>
            Обоснование
            <textarea
              className="entity-form__control"
              value={form.comment}
              onChange={(event) => updateForm("comment", event.target.value)}
              placeholder="Почему нужно создать или изменить мастер-данные"
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Создание..." : "Создать черновик"}
          </button>
        </form>

        <div className="content-card nsi-requests-table-card">
          <div className="content-card__header">
            <div>
              <p>Workflow НСИ</p>
              <h2>Журнал заявок</h2>
            </div>
            <button className="secondary-button" type="button" onClick={loadData}>
              Обновить
            </button>
          </div>

          {isLoading ? (
            <div className="system-message">Загрузка заявок НСИ...</div>
          ) : requests.length === 0 ? (
            <p className="empty-state">Заявки НСИ пока не созданы.</p>
          ) : (
            <div className="nsi-requests-table-wrap">
              <table className="nsi-requests-table">
                <thead>
                  <tr>
                    <th>Заявка</th>
                    <th>Тип</th>
                    <th>Статус</th>
                    <th>Инициатор</th>
                    <th>Рассмотрел</th>
                    <th>Действия</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.code}</strong>
                        <span>{item.name}</span>
                        <small>
                          {item.category} · {item.material} · {item.drawing}
                        </small>
                      </td>
                      <td>{typeLabels[item.requestType]}</td>
                      <td>
                        <span className={`nsi-status nsi-status--${item.status}`}>
                          {statusLabels[item.status]}
                        </span>
                      </td>
                      <td>
                        <strong>{item.createdBy}</strong>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </td>
                      <td>
                        {item.reviewedBy ? (
                          <>
                            <strong>{item.reviewedBy}</strong>
                            <span>{formatDateTime(item.reviewedAt)}</span>
                          </>
                        ) : (
                          <span className="muted-text">Не рассмотрена</span>
                        )}
                      </td>
                      <td>
                        <div className="nsi-actions">
                          {item.status === "draft" && (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleSubmitRequest(item.id)}
                            >
                              Отправить
                            </button>
                          )}

                          {item.status === "pending" && isAdmin && (
                            <>
                              <button
                                className="primary-button"
                                type="button"
                                onClick={() => handleApproveRequest(item.id)}
                              >
                                Утвердить
                              </button>
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => handleRejectRequest(item.id)}
                              >
                                Отклонить
                              </button>
                            </>
                          )}

                          {item.status !== "draft" && item.status !== "pending" && (
                            <span className="muted-text">Завершена</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {metrics.rejected > 0 && (
        <div className="system-message system-message--error">
          Есть отклоненные заявки НСИ: {metrics.rejected}. Их нужно проверить и
          создать новые исправленные заявки.
        </div>
      )}
    </section>
  );
}
