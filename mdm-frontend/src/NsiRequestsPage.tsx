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
  PartNomenclature,
  ReferenceItem
} from "./api";

type NsiRequestForm = {
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

function hasReviewAccess(role: AuthUserRole): boolean {
  return role === "admin" || role === "superadmin";
}

function getPersonDisplayName(value: string): string {
  if (value === "worker" || value === "Работник склада") {
    return "Сотрудник склада";
  }

  if (value === "admin") {
    return "Администратор НСИ";
  }

  return value.replace(/Работник/g, "Сотрудник");
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

  const canCreateRequests = role === "worker";
  const canReviewRequests = hasReviewAccess(role);
  const isFormReady = Boolean(form.targetNomenclatureId && form.category && form.material && form.comment.trim());

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
        error instanceof Error ? error.message : "Не удалось загрузить заявки НСИ"
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

  function updateSelectedNomenclature(value: string) {
    const selectedItem = partNomenclature.find(
      (item) => String(item.id) === value
    );

    if (!selectedItem) {
      setForm(initialForm);
      return;
    }

    setForm({
      targetNomenclatureId: value,
      code: selectedItem.code,
      name: selectedItem.name,
      category: selectedItem.category,
      material: selectedItem.material,
      drawing: selectedItem.drawing,
      comment: ""
    });
  }

  function updateForm(field: keyof NsiRequestForm, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateRequests) {
      return;
    }

    setIsSaving(true);
    setActionError("");

    try {
      const data: CreateNomenclatureRequestData = {
        requestType: "update",
        targetNomenclatureId: Number(form.targetNomenclatureId),
        code: form.code,
        name: form.name,
        category: form.category,
        material: form.material,
        drawing: form.drawing,
        comment: form.comment.trim()
      };

      const createdRequest = await createNomenclatureRequest(data);
      await submitNomenclatureRequest(createdRequest.id);
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
    if (!canCreateRequests) {
      return;
    }

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
    if (!canReviewRequests) {
      return;
    }

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
    if (!canReviewRequests) {
      return;
    }

    const rejectReason = window.prompt("Причина отклонения");

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
          <span>Изменения мастер-данных</span>
        </div>

        <div className="metric-card">
          <p>Черновики</p>
          <strong>{metrics.draft.toLocaleString("ru-RU")}</strong>
          <span>Подготовка инициатором</span>
        </div>

        <div className="metric-card">
          <p>На согласовании</p>
          <strong>{metrics.pending.toLocaleString("ru-RU")}</strong>
          <span>Ожидают решения</span>
        </div>

        <div className="metric-card">
          <p>Утверждено</p>
          <strong>{metrics.approved.toLocaleString("ru-RU")}</strong>
          <span>Применено к НСИ</span>
        </div>
      </div>

      <div
        className={
          canCreateRequests
            ? "nsi-requests-layout"
            : "nsi-requests-layout nsi-requests-layout--review"
        }
      >
        {canCreateRequests && (
          <form className="content-card entity-form" onSubmit={handleCreateRequest}>
            <div className="content-card__header">
              <div>
                <p>Новая заявка</p>
                <h2>Изменение карточки НСИ</h2>
              </div>
            </div>

            <label>
              Карточка НСИ
              <select
                className="entity-form__control"
                value={form.targetNomenclatureId}
                onChange={(event) => updateSelectedNomenclature(event.target.value)}
                required
              >
                <option value="">Выберите карточку</option>
                {partNomenclature.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </label>

            {form.targetNomenclatureId && (
              <div className="nsi-selected-card">
                <strong>
                  {form.code} · {form.name}
                </strong>
                <span>{form.drawing}</span>
              </div>
            )}

            <label>
              Категория
              <select
                className="entity-form__control"
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                required
              >
                <option value="">Выберите категорию</option>
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
                <option value="">Выберите материал</option>
                {references.materials.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Обоснование
              <textarea
                className="entity-form__control"
                value={form.comment}
                onChange={(event) => updateForm("comment", event.target.value)}
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={isSaving || !isFormReady}>
              {isSaving ? "Создание..." : "Отправить на согласование"}
            </button>
          </form>
        )}

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
            <p className="empty-state">Нет заявок НСИ.</p>
          ) : (
            <div className="nsi-requests-table-wrap">
              <table className="nsi-requests-table">
                <thead>
                  <tr>
                    <th>Карточка</th>
                    <th>Статус</th>
                    <th>Инициатор</th>
                    <th>Рассмотрел</th>
                    <th className="nsi-actions-column">Действия</th>
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
                      <td>
                        <span className={`nsi-status nsi-status--${item.status}`}>
                          {statusLabels[item.status]}
                        </span>
                      </td>
                      <td>
                        <strong>{getPersonDisplayName(item.createdBy)}</strong>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </td>
                      <td>
                        {item.reviewedBy ? (
                          <>
                            <strong>{getPersonDisplayName(item.reviewedBy)}</strong>
                            <span>{formatDateTime(item.reviewedAt)}</span>
                          </>
                        ) : (
                          <span className="muted-text">—</span>
                        )}
                      </td>
                      <td className="nsi-actions-cell"><div className="nsi-actions">
                          {item.status === "draft" && canCreateRequests && (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => handleSubmitRequest(item.id)}
                            >
                              Отправить
                            </button>
                          )}

                          {item.status === "pending" && canReviewRequests && (
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

                          {(item.status === "approved" || item.status === "rejected") && (
                            <span className="muted-text">Завершена</span>
                          )}

                          {item.status === "draft" && !canCreateRequests && (
                            <span className="muted-text">—</span>
                          )}

                          {item.status === "pending" && !canReviewRequests && (
                            <span className="muted-text">На рассмотрении</span>
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
    </section>
  );
}
