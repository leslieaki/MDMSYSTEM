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
  git commit -m "chore: backup before mobile sidebar height fix" || true
fi

echo "[2/4] Убираю старые mobile sidebar hotfix-блоки, если они были..."

python3 <<'PY'
from pathlib import Path
import re

p = Path("mdm-frontend/src/styles.css")
s = p.read_text(encoding="utf-8")

patterns = [
    r"\n/\* Mobile clipping hotfix after BEM refactor\. \*/[\s\S]*?(?=\n/\*|\Z)",
    r"\n/\* Mobile sidebar full height fix\. \*/[\s\S]*?(?=\n/\*|\Z)",
]

for pattern in patterns:
    s = re.sub(pattern, "\n", s)

p.write_text(s.rstrip() + "\n", encoding="utf-8")
PY

echo "[3/4] Добавляю нормальный фикс сайдбара на всю высоту..."

cat <<'CSS' >> "$CSS_FILE"

/* Mobile sidebar full height fix. */
@media (max-width: 768px) {
  html,
  body,
  #root {
    width: 100%;
    min-width: 0;
    min-height: 100%;
    margin: 0;
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
  }

  .mdm_sidebar {
    position: fixed !important;
    top: 0 !important;
    right: auto !important;
    bottom: 0 !important;
    left: 0 !important;

    z-index: 1000;
    width: min(320px, 88vw) !important;
    height: 100vh !important;
    height: 100dvh !important;
    min-height: 100vh !important;
    min-height: 100dvh !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;

    margin: 0 !important;
    border-radius: 0 !important;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;

    transform: translateX(-105%);
  }

  .mdm_sidebar._open {
    transform: translateX(0);
  }

  .mobile__overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
  }
}

@media (max-width: 480px) {
  .mdm_sidebar {
    width: min(300px, 90vw) !important;
  }
}
CSS

echo "[4/4] Проверяю, коммичу и пушу..."

cd mdm-frontend
npm run build
cd "$ROOT"

git add "$CSS_FILE"

if git diff --cached --quiet; then
  echo "Изменений нет."
else
  git commit -m "fix: stretch mobile sidebar to full viewport height"
  git push origin HEAD
fi

echo "Готово. Перезапусти фронт и обнови страницу Ctrl + F5."