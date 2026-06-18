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
  git commit -m "chore: backup before profile name nowrap fix" || true
else
  echo "Незакоммиченных изменений нет."
fi

echo "[2/4] Удаляю старые дубли фикса имени..."

python3 <<'PY'
from pathlib import Path
import re

p = Path("mdm-frontend/src/styles.css")
s = p.read_text(encoding="utf-8")

blocks = [
    "Mobile profile name nowrap fix.",
    "Profile card name nowrap fix.",
    "Final profile name nowrap fix."
]

for title in blocks:
    pattern = r"\n/\* " + re.escape(title) + r" \*/[\s\S]*?(?=\n/\*|\Z)"
    s = re.sub(pattern, "\n", s)

p.write_text(s.rstrip() + "\n", encoding="utf-8")
PY

echo "[3/4] Добавляю фикс нормального отображения имени..."

cat <<'CSS' >> "$CSS_FILE"

/* Final profile name nowrap fix. */
@media (max-width: 768px) {
  .profile_card {
    width: 100%;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box;
  }

  .profile_card__person {
    display: grid !important;
    grid-template-columns: 52px minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 14px !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .profile_card__avatar {
    width: 52px !important;
    height: 52px !important;
    min-width: 52px !important;
    min-height: 52px !important;
  }

  .profile_card__person > div,
  .profile_card__person > div:last-child {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
  }

  .profile_card__person b {
    display: block !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;

    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;

    word-break: keep-all !important;
    overflow-wrap: normal !important;
    hyphens: none !important;

    font-size: 15px !important;
    line-height: 1.15 !important;
  }

  .profile_card__person span {
    display: block !important;
    min-width: 0 !important;
    max-width: 100% !important;

    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;

    word-break: normal !important;
    overflow-wrap: normal !important;
    hyphens: none !important;
  }

  .profile_card__meta {
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .profile_card__role {
    display: block !important;
    max-width: 100% !important;

    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;

    word-break: normal !important;
    overflow-wrap: normal !important;
    hyphens: none !important;
  }
}

@media (max-width: 360px) {
  .profile_card__person {
    grid-template-columns: 46px minmax(0, 1fr) !important;
    gap: 12px !important;
  }

  .profile_card__avatar {
    width: 46px !important;
    height: 46px !important;
    min-width: 46px !important;
    min-height: 46px !important;
  }

  .profile_card__person b {
    font-size: 13px !important;
  }

  .profile_card__person span {
    font-size: 12px !important;
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
  git commit -m "fix: prevent profile name breaking in mobile sidebar"
fi

echo "Готово. Push НЕ выполнялся."
echo "Запусти:"
echo "cd mdm-frontend && npm run dev"
echo "Потом Ctrl + F5."
git log --oneline -5