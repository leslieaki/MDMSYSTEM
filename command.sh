#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

APP_FILE="mdm-frontend/src/App.tsx"
CSS_FILE="mdm-frontend/src/styles.css"

if [ ! -f "$APP_FILE" ]; then
  echo "Не найден $APP_FILE"
  exit 1
fi

if [ ! -f "$CSS_FILE" ]; then
  echo "Не найден $CSS_FILE"
  exit 1
fi

echo "[1/5] Backup текущего состояния локальным коммитом..."

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "chore: backup before bottom mobile menu button" || true
else
  echo "Незакоммиченных изменений нет."
fi

echo "[2/5] Добавляю нижнюю плавающую кнопку открытия сайдбара..."

python3 <<'PY'
from pathlib import Path
import re

p = Path("mdm-frontend/src/App.tsx")
s = p.read_text(encoding="utf-8")

# Удаляем старую версию этого эффекта, если уже добавлялась.
s = re.sub(
    r"\n  /\* Bottom mobile menu floating trigger\. \*/[\s\S]*?\n  /\* End bottom mobile menu floating trigger\. \*/\n",
    "\n",
    s,
)

effect = '''  /* Bottom mobile menu floating trigger. */
  useEffect(() => {
    if (!authSession) {
      return undefined;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile_menu__floating_button";
    button.setAttribute("aria-label", "Открыть меню");
    button.innerHTML = `
      <span class="mobile_menu__floating_icon" aria-hidden="true">
        <span class="mobile_menu__floating_line"></span>
        <span class="mobile_menu__floating_line"></span>
        <span class="mobile_menu__floating_line"></span>
      </span>
      <span class="mobile_menu__floating_text">Меню</span>
    `;

    button.addEventListener("click", () => {
      setIsMobileMenuOpen(true);
    });

    document.body.appendChild(button);

    return () => {
      button.remove();
    };
  }, [authSession]);
  /* End bottom mobile menu floating trigger. */

'''

marker = "  if (!authSession) {"
if effect.strip() not in s:
    if marker not in s:
        raise SystemExit("Не нашел место вставки: if (!authSession) {")
    s = s.replace(marker, effect + marker, 1)

p.write_text(s, encoding="utf-8")
PY

echo "[3/5] Удаляю старые дубли CSS для этой кнопки..."

python3 <<'PY'
from pathlib import Path
import re

p = Path("mdm-frontend/src/styles.css")
s = p.read_text(encoding="utf-8")

s = re.sub(
    r"\n/\* Bottom mobile menu floating trigger\. \*/[\s\S]*?(?=\n/\*|\Z)",
    "\n",
    s,
)

p.write_text(s.rstrip() + "\n", encoding="utf-8")
PY

echo "[4/5] Добавляю CSS нижней кнопки..."

cat <<'CSS' >> "$CSS_FILE"

/* Bottom mobile menu floating trigger. */
.mobile_menu__floating_button {
  display: none;
}

@media (max-width: 768px) {
  .mobile_menu__floating_button {
    position: fixed;
    left: max(14px, env(safe-area-inset-left));
    bottom: max(14px, env(safe-area-inset-bottom));
    z-index: 980;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;

    width: auto;
    min-width: 112px;
    height: 52px;
    padding: 0 18px;

    border: 1px solid rgba(15, 34, 64, 0.14);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    color: #10213f;
    box-shadow: 0 18px 42px rgba(15, 34, 64, 0.2);
    backdrop-filter: blur(14px);

    font: inherit;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.01em;

    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile_menu__floating_button:active {
    transform: translateY(1px);
  }

  .mobile_menu__floating_icon {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;

    width: 18px;
    height: 18px;
    flex: 0 0 18px;
  }

  .mobile_menu__floating_line {
    display: block;
    width: 18px;
    height: 2px;
    border-radius: 999px;
    background: currentColor;
  }

  .mobile_menu__floating_text {
    display: block;
    white-space: nowrap;
  }

  .mdm_sidebar._open ~ .mobile_menu__floating_button {
    display: none;
  }
}

@media (max-width: 360px) {
  .mobile_menu__floating_button {
    left: 10px;
    bottom: 10px;
    min-width: 104px;
    height: 48px;
    padding: 0 16px;
    font-size: 13px;
  }
}
CSS

echo "[5/5] Проверяю сборку и делаю локальный коммит..."

cd mdm-frontend
npm run build
cd "$ROOT"

git add "$APP_FILE" "$CSS_FILE"

if git diff --cached --quiet; then
  echo "Изменений нет, коммит не создан."
else
  git commit -m "feat: add bottom mobile menu trigger"
fi

echo "Готово. Push НЕ выполнялся."
echo "Запусти npm run dev и обнови страницу Ctrl + F5."
git log --oneline -4