# MDM project context

## What this project is
Corporate master data system (MDM) with a frontend in `mdm-frontend` and backend in `mdm-backend`. The current frontend is a React + TypeScript + Vite application.

## Current frontend refactor rules
- Layout class names must follow clean BEM-style naming without hyphenated chains.
- Use block or block element names with underscores, for example `mdm_app`, `profile_card__caption`, `part_details_modal__header`.
- Use modifier classes as separate `_modifier` classes, for example `mdm_nav__button _active`, `warehouse_status _warning`.
- Do not return to names like `first-second-third` or `block__element--modifier`.
- Keep styles in `mdm-frontend/src/styles.css`; `enterprise.css` was removed as a separate import to avoid split/duplicated overrides.
- Keep responsive layout mobile-first at small widths: sidebar as an off-canvas panel, tables with horizontal scroll wrappers, compact cards/buttons at `480px` and below.

## Files changed in the BEM layout refactor
- `mdm-frontend/src/App.tsx`
- `mdm-frontend/src/NsiRequestsPage.tsx`
- `mdm-frontend/src/styles.css`
- `mdm-frontend/src/enterprise.css` was deleted and its small enterprise theme overrides were merged into `styles.css`.

## Verification performed
- TypeScript check: `node node_modules/typescript/bin/tsc -b`
- ESLint check for edited frontend files: `node node_modules/eslint/bin/eslint.js src/App.tsx src/NsiRequestsPage.tsx`

## Notes for the next chat or developer
- A local backup commit was created before the refactor: `7a1a124 chore: backup current layout before bem refactor`.
- The BEM refactor commit is `b926c25 refactor: rewrite frontend layout with clean BEM classes`.
- GitHub push could not be completed from this sandbox because the environment cannot resolve `github.com`; push from the user machine with internet access.
- If Vite build fails on Linux because `@rolldown/binding-linux-x64-gnu` is missing, remove `node_modules` and run `npm install` inside `mdm-frontend` so optional native dependencies are installed for the current OS.
