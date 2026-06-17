#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

CSS_FILE="mdm-frontend/src/styles.css"

if [ ! -f "$CSS_FILE" ]; then
  echo "Не найден $CSS_FILE"
  exit 1
fi

echo "[1/4] Делаю backup текущего состояния локальным коммитом..."

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "chore: backup before clean mobile header fix" || true
else
  echo "Незакоммиченных изменений нет."
fi

echo "[2/4] Удаляю предыдущие кривые mobile-hotfix блоки..."

python3 <<'PY'
from pathlib import Path
import re

p = Path("mdm-frontend/src/styles.css")
s = p.read_text(encoding="utf-8")

bad_blocks = [
    "Mobile clipping hotfix after BEM refactor.",
    "Mobile sidebar full height fix.",
    "Mobile profile name nowrap fix.",
    "Fixed mobile burger and profile text fix.",
    "Clean mobile sticky header and sidebar fix.",
]

for title in bad_blocks:
    pattern = r"\n/\* " + re.escape(title) + r" \*/[\s\S]*?(?=\n/\*|\Z)"
    s = re.sub(pattern, "\n", s)

p.write_text(s.rstrip() + "\n", encoding="utf-8")
PY

echo "[3/4] Добавляю нормальный фикс: липкая шапка + сайдбар на всю высоту..."

cat <<'CSS' >> "$CSS_FILE"

/* Clean mobile sticky header and sidebar fix. */
@media (max-width: 768px) {
  html,
  body,
  #root {
    width: 100%;
    min-width: 0;
    margin: 0;
    overflow-x: hidden;
  }

  .mdm_app {
    position: relative;
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
  }

  .system_topbar {
    position: sticky !important;
    top: 10px !important;
    z-index: 900 !important;

    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box;
    overflow: hidden;
  }

  .system_topbar > * {
    min-width: 0;
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
    min-width: 0 !important;
    max-width: 100% !important;

    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;

    word-break: normal !important;
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

  .page_header h1,
  .hero_card h1,
  .hero__title {
    max-width: 100%;
    overflow-wrap: normal;
    word-break: normal;
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
    flex-basis: 48px !important;
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;
    min-height: 48px !important;
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

echo "[4/4] Проверяю сборку и делаю локальный коммит..."

cd mdm-frontend
npm run build
cd "$ROOT"

git add "$CSS_FILE"

if git diff --cached --quiet; then
  echo "Изменений нет, коммит не создан."
else
  git commit -m "fix: make mobile topbar sticky without overlaying content"
fi

echo "Готово. Push НЕ выполнялся."
echo "Обнови страницу Ctrl + F5."
echo "Последние коммиты:"
git log --oneline -4