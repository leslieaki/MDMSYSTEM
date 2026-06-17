#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

CSS_FILE="mdm-frontend/src/styles.css"

if [ ! -f "$CSS_FILE" ]; then
  echo "Не найден $CSS_FILE"
  exit 1
fi

echo "[1/4] Сохраняю текущее состояние перед правкой..."

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "chore: backup before fixed mobile burger fix" || true
else
  echo "Нет незакоммиченных изменений для backup-коммита."
fi

echo "[2/4] Убираю старый дубль этого фикса, если был..."

python3 <<'PY'
from pathlib import Path
import re

p = Path("mdm-frontend/src/styles.css")
s = p.read_text(encoding="utf-8")

s = re.sub(
    r"\n/\* Fixed mobile burger and profile text fix\. \*/[\s\S]*?(?=\n/\*|\Z)",
    "\n",
    s
)

p.write_text(s.rstrip() + "\n", encoding="utf-8")
PY

echo "[3/4] Добавляю нормальный мобильный фикс..."

cat <<'CSS' >> "$CSS_FILE"

/* Fixed mobile burger and profile text fix. */
@media (max-width: 768px) {
  .mdm_app {
    position: relative;
    width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }

  .mdm_main {
    width: 100%;
    min-width: 0;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .system_topbar {
    position: sticky;
    top: 10px;
    z-index: 800;
  }

  .system_topbar button:first-child,
  .system_topbar__burger,
  .mobile__burger,
  .mobile_burger,
  .burger_button,
  button[aria-label="Открыть меню"],
  button[aria-label="Меню"] {
    position: fixed !important;
    top: 18px !important;
    left: max(14px, env(safe-area-inset-left)) !important;
    z-index: 1200 !important;

    display: inline-flex !important;
    align-items: center;
    justify-content: center;

    width: 52px !important;
    height: 52px !important;
    min-width: 52px !important;
    min-height: 52px !important;

    border-radius: 18px !important;
    background: #ffffff !important;
    border: 1px solid rgba(15, 34, 64, 0.12) !important;
    box-shadow: 0 14px 32px rgba(15, 34, 64, 0.18) !important;
  }

  .mdm_sidebar {
    position: fixed !important;
    inset: 0 auto 0 0 !important;
    z-index: 1100 !important;

    width: min(330px, 88vw) !important;
    height: 100vh !important;
    height: 100dvh !important;
    min-height: 100vh !important;
    min-height: 100dvh !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;

    margin: 0 !important;
    border-radius: 0 !important;
    box-sizing: border-box;

    overflow-y: auto !important;
    overflow-x: hidden !important;
    overscroll-behavior: contain;

    transform: translateX(-105%);
  }

  .mdm_sidebar._open {
    transform: translateX(0);
  }

  .mobile__overlay {
    position: fixed !important;
    inset: 0 !important;
    z-index: 1000 !important;
  }

  .profile_card,
  .profile_card__person,
  .profile_card__person > div,
  .profile_card__person > div:last-child {
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .profile_card__person {
    display: grid !important;
    grid-template-columns: 52px minmax(0, 1fr) !important;
    gap: 14px !important;
    align-items: center !important;
  }

  .profile_card__person b {
    display: block !important;
    max-width: 100% !important;
    min-width: 0 !important;

    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;

    word-break: keep-all !important;
    overflow-wrap: normal !important;
    hyphens: none !important;

    font-size: clamp(13px, 4vw, 16px) !important;
    line-height: 1.15 !important;
  }

  .profile_card__role {
    max-width: 100% !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
}

@media (max-width: 360px) {
  .system_topbar button:first-child,
  .system_topbar__burger,
  .mobile__burger,
  .mobile_burger,
  .burger_button,
  button[aria-label="Открыть меню"],
  button[aria-label="Меню"] {
    top: 14px !important;
    left: 10px !important;
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;
    min-height: 48px !important;
    border-radius: 16px !important;
  }

  .profile_card__person {
    grid-template-columns: 46px minmax(0, 1fr) !important;
    gap: 12px !important;
  }

  .profile_card__person b {
    font-size: 13px !important;
  }
}
CSS

echo "[4/4] Проверяю сборку и делаю только локальный коммит..."

cd mdm-frontend
npm run build
cd "$ROOT"

git add "$CSS_FILE"

if git diff --cached --quiet; then
  echo "Изменений нет, коммит не создан."
else
  git commit -m "fix: keep mobile burger accessible while scrolling"
fi

echo "Готово. Push НЕ выполнялся."
echo "Обнови страницу Ctrl + F5."
echo "Проверь последние коммиты:"
echo "git log --oneline -3"