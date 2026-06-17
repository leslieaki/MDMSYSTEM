#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$PWD}"
FRONT="$ROOT/mdm-frontend"
APP="$FRONT/src/App.tsx"
NSI="$FRONT/src/NsiRequestsPage.tsx"
CSS="$FRONT/src/enterprise.css"

for f in "$APP" "$NSI" "$CSS"; do
  [[ -f "$f" ]] || { echo "Не найден файл: $f" >&2; exit 1; }
done

python3 - "$APP" "$NSI" <<'PY'
from pathlib import Path
import sys

app = Path(sys.argv[1])
nsi = Path(sys.argv[2])
app_text = app.read_text(encoding='utf-8')
nsi_text = nsi.read_text(encoding='utf-8')

replacements = [
    ('<b>Система мастер-данных</b>\n          <span>Корпоративный контур предприятия</span>',
     '<b>MDM-платформа предприятия</b>\n          <span>Единый контур управления мастер-данными</span>'),
    ('<span className="profile-card__caption">Текущий пользователь</span>',
     '<span className="profile-card__caption">Рабочая сессия</span>'),
    ('"Корпоративная система мастер-данных"', '"MDM-контур предприятия"'),
    ('<p className="page-header__eyebrow">Корпоративная система мастер-данных</p>',
     '<p className="page-header__eyebrow">MDM-контур предприятия</p>'),
    ('<h2>Контроль мастер-данных и складских рисков</h2>',
     '<h2>Операционный контур мастер-данных</h2>'),
    ('Сводка показывает критичные остатки, качество карточек деталей,\n            последние закупки и действия пользователей. Экран предназначен для\n            быстрого ежедневного контроля состояния MDM-контура.',
     'Сводка показывает критичные остатки, качество карточек деталей,\n            последние закупки и действия пользователей. Экран предназначен для\n            ежедневного контроля состояния MDM-контура предприятия.'),
    ('>\n              Открыть склад\n            </button>',
     '>\n              Открыть реестр\n            </button>'),
    ('>\n              В склад\n            </button>',
     '>\n              Открыть реестр\n            </button>'),
    ('              <span>Подразделение</span>\n              <span>Подразделение</span>\n              <span>Роль</span>',
     '              <span>Подразделение</span>\n              <span>Роль</span>'),
]

for old, new in replacements:
    if old in app_text:
        app_text = app_text.replace(old, new)
    else:
        print(f'WARN: pattern not found in App.tsx: {old[:80]!r}', file=sys.stderr)

app.write_text(app_text, encoding='utf-8')

nsi_old = '                            <span className="muted-text">Завершена</span>'
nsi_new = '                            <span className="muted-text">Завершено</span>'
if nsi_old in nsi_text:
    nsi_text = nsi_text.replace(nsi_old, nsi_new)
else:
    print('WARN: pattern not found in NsiRequestsPage.tsx', file=sys.stderr)

nsi.write_text(nsi_text, encoding='utf-8')
PY

if ! grep -q "pass2-production-tune" "$CSS"; then
cat >> "$CSS" <<'CSS'

/* pass2-production-tune */
:root {
  --enterprise-sidebar-top: #0f2742;
  --enterprise-sidebar-bottom: #0b1626;
  --enterprise-sidebar-border: rgba(255, 255, 255, 0.08);
  --enterprise-surface-muted: #f3f6fb;
}

.mdm-sidebar {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 30%),
    linear-gradient(180deg, var(--enterprise-sidebar-top), var(--enterprise-sidebar-bottom)) !important;
}

.mdm-logo__content b {
  font-size: 17px;
  line-height: 1.12;
}

.mdm-logo__content span {
  color: #c4d2e3;
  font-size: 12px;
}

.profile-card {
  gap: 12px;
  border: 1px solid var(--enterprise-sidebar-border);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.profile-card__caption {
  color: #bfd0e1;
}

.profile-card__meta {
  gap: 6px;
}

.profile-card__meta span {
  color: #d5deea;
}

.profile-card__role {
  display: none !important;
}

.mdm-nav__group-title {
  color: #8294ab;
}

.mdm-nav__button {
  border-radius: 18px;
}

.mdm-nav__button--active {
  background: rgba(34, 92, 255, 0.22) !important;
  box-shadow:
    inset 3px 0 0 #90b4ff,
    0 12px 30px rgba(6, 23, 46, 0.22);
}

.system-topbar,
.page-header,
.content-card,
.metric-card {
  border-radius: 24px;
}

.data-table__row,
.data-table__row span,
.data-table__row b,
.data-table__row small,
.warehouse-table td,
.warehouse-table td b,
.warehouse-table td span,
.nsi-requests-table td,
.nsi-requests-table td strong,
.nsi-requests-table td span,
.nsi-requests-table td small {
  font-weight: 600;
}

.data-table__row--head,
.data-table__row--head span,
.warehouse-table th,
.nsi-requests-table th {
  font-weight: 800;
}

.data-table--dense .data-table__row {
  grid-template-columns: minmax(340px, 1.5fr) minmax(220px, 0.9fr) minmax(140px, 0.5fr) minmax(140px, 0.5fr);
}

.data-table__row--head,
.data-table__row--button,
.data-table__row {
  align-items: center;
}

.users-table {
  min-width: 1040px;
}

.users-table__row {
  grid-template-columns: minmax(220px, 1.3fr) minmax(170px, 1fr) minmax(160px, 0.8fr) minmax(130px, 0.7fr) minmax(160px, 0.8fr) minmax(210px, 0.95fr) !important;
  align-items: center;
}

.users-table__actions {
  justify-content: flex-start;
}

.warehouse-table-wrap,
.nsi-requests-table-wrap {
  overflow-x: auto;
}

.warehouse-table {
  min-width: 1480px;
  table-layout: auto;
}

.warehouse-table th,
.warehouse-table td {
  white-space: nowrap;
  vertical-align: middle;
}

.warehouse-table td:nth-child(1),
.warehouse-table td:nth-child(2) {
  min-width: 220px;
}

.warehouse-table td:nth-child(3),
.warehouse-table td:nth-child(4) {
  min-width: 180px;
}

.warehouse-table__progress {
  margin-top: 10px;
  width: 160px;
}

.warehouse-status,
.nsi-status {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 36px;
  padding: 0 16px;
  line-height: 1;
  text-align: center;
  vertical-align: middle;
}

.warehouse-shortage-list {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.warehouse-shortage-item {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px 18px;
  padding: 18px;
  min-height: 162px;
}

.warehouse-shortage-item small {
  display: block;
  margin-top: 2px;
  line-height: 1.45;
}

.nomenclature-item {
  grid-template-columns: minmax(260px, 1.25fr) minmax(220px, 0.9fr) auto !important;
  align-items: center;
  gap: 14px;
}

.reference-item {
  align-items: center;
}

.reference-actions {
  justify-content: flex-start;
  align-items: center;
}

.nsi-requests-table {
  min-width: 1120px !important;
  table-layout: fixed;
}

.nsi-requests-table th:nth-child(1),
.nsi-requests-table td:nth-child(1) { width: 34%; }
.nsi-requests-table th:nth-child(2),
.nsi-requests-table td:nth-child(2) { width: 14%; }
.nsi-requests-table th:nth-child(3),
.nsi-requests-table td:nth-child(3) { width: 18%; }
.nsi-requests-table th:nth-child(4),
.nsi-requests-table td:nth-child(4) { width: 18%; }
.nsi-requests-table th:nth-child(5),
.nsi-requests-table td:nth-child(5) { width: 16%; }

.nsi-requests-table td {
  vertical-align: middle;
}

.nsi-actions-cell {
  vertical-align: middle !important;
}

.nsi-actions {
  min-height: 38px;
  flex-wrap: nowrap;
  align-items: center;
}

.nsi-requests-table .muted-text {
  margin-top: 0;
  line-height: 1;
  white-space: nowrap;
}

.drawings-grid {
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 18px;
}

.drawing-card {
  border-radius: 24px;
  background: #ffffff;
}

.drawing-card > button:first-child {
  min-height: 260px !important;
  height: 260px !important;
  padding: 16px !important;
  border-radius: 22px !important;
  background: linear-gradient(180deg, #fbfdff, #f2f6fc) !important;
}

.drawing-card > button:first-child img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #f8fbff;
}

.drawing-card__content > div:first-child {
  align-items: center !important;
}

.drawing-card__content > div:first-child > span {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-height: 34px;
}

.part-details-modal {
  background: linear-gradient(180deg, rgba(13, 24, 42, 0.98), rgba(8, 17, 32, 0.96)), #0c1727;
}

.part-details-modal .empty-state,
.part-details-modal .system-message,
.part-details-modal .part-detail-table-wrap,
.part-details-modal .data-table th,
.part-details-modal .data-table td {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #d7e3f1;
  border-color: rgba(148, 163, 184, 0.14) !important;
}

.part-details-modal .empty-state b,
.part-details-modal .data-table th,
.part-details-modal .data-table td {
  color: #eff6ff;
}

.part-details-modal .empty-state span,
.part-details-modal .system-message {
  color: #b7c7da;
}

.part-detail-stock-panel {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.045);
}

.part-detail-stock-panel__numbers {
  gap: 14px;
}

.part-detail-stock-panel__numbers strong {
  font-size: clamp(30px, 4vw, 48px);
}

.part-detail-stock-panel__numbers span {
  font-size: 20px;
  color: #d7e3f1;
}

.part-detail-stock-panel p {
  color: #c5d3e3;
}

@media (max-width: 1280px) {
  .nomenclature-item {
    grid-template-columns: 1fr;
  }

  .reference-actions {
    justify-content: flex-start;
  }
}
CSS
fi

echo "UI pass 2 applied: $FRONT"
