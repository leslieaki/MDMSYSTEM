#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

CSS_FILE="mdm-frontend/src/styles.css"

if [ ! -f "$CSS_FILE" ]; then
  echo "Не найден $CSS_FILE"
  exit 1
fi

echo "[1/4] Backup текущего состояния локальным коммитом..."

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "chore: backup before fixed mobile header" || true
else
  echo "Незакоммиченных изменений нет."
fi

echo "[2/4] Удаляю старые дубли mobile-header фиксов..."

python3 <<'PY'
from pathlib import Path
import re

p = Path("mdm-frontend/src/styles.css")
s = p.read_text(encoding="utf-8")

blocks = [
    "Clean mobile sticky header and sidebar fix.",
    "Final mobile header not clipped fix.",
    "Restore sticky mobile header only.",
    "Fixed mobile header without bottom menu.",
]

for title in blocks:
    pattern = r"\n/\* " + re.escape(title) + r" \*/[\s\S]*?(?=\n/\*|\Z)"
    s = re.sub(pattern, "\n", s)

p.write_text(s.rstrip() + "\n", encoding="utf-8")
PY

echo "[3/4] Добавляю фиксированную мобильную шапку..."

cat <<'CSS' >> "$CSS_FILE"

/* Fixed mobile header without bottom menu. */
@media (max-width: 768px) {
  html,
  body,
  #root {
    width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }

  .mdm_app {
    width: 100%;
    min-width: 0;
    min-height: 100dvh;
    overflow-x: hidden;
  }

  .mdm_main {
    width: 100%;
    min-width: 0;
    max-width: 100vw;
    overflow-x: hidden;

    /* место под фиксированную верхнюю карточку */
    padding-top: 158px !important;
  }

  .system_topbar {
    position: fixed !important;
    top: 12px !important;
    left: 50% !important;
    z-index: 1000 !important;

    width: calc(100vw - 28px) !important;
    max-width: 420px !important;
    min-width: 0 !important;

    margin: 0 !important;
    box-sizing: border-box;

    transform: translateX(-50%) !important;
    overflow: visible !important;
    clip-path: none !important;
  }

  .system_topbar > * {
    min-width: 0 !important;
  }

  .system_topbar button:first-child,
  .system_topbar__burger,
  .mobile__burger,
  .mobile_burger,
  .burger_button,
  button[aria-label="Открыть меню"],
  button[aria-label="Меню"] {
    position: static !important;
    inset: auto !important;
    z-index: auto !important;

    flex: 0 0 52px !important;
    width: 52px !important;
    height: 52px !important;
    min-width: 52px !important;
    min-height: 52px !important;
  }

  .breadcrumbs {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
  }

  .breadcrumbs span:first-child,
  .breadcrumbs b {
    display: block !important;
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
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
    z-index: 1050 !important;
  }
}

@media (max-width: 360px) {
  .mdm_main {
    padding-top: 154px !important;
  }

  .system_topbar {
    top: 10px !important;
    width: calc(100vw - 20px) !important;
  }

  .system_topbar button:first-child,
  .system_topbar__burger,
  .mobile__burger,
  .mobile_burger,
  .burger_button,
  button[aria-label="Открыть меню"],
  button[aria-label="Меню"] {
    flex-basis: 48px !important;
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;
    min-height: 48px !important;
  }
}
CSS

echo "[4/4] Проверяю сборку и делаю локальный коммит..."

cd mdm-frontend
npm run build
cd "$ROOT"

git add "$CSS_FILE"

if git diff --cached --quiet; then
  echo "Изменений нет, коммит не создан."
else
  git commit -m "fix: keep mobile header fixed while scrolling"
fi

echo "Готово. Push НЕ выполнялся."
echo "Запусти:"
echo "cd mdm-frontend && npm run dev"
echo "Потом Ctrl + F5."
git log --oneline -5