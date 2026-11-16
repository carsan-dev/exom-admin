# exom-admin: instrucciones para agentes

Este repo forma parte del workspace EXOM. El protocolo común es `../AGENTS.md` y debes leerlo antes de cambiar nada (Codex no lo carga por sí solo desde aquí).

## Repo

- Stack: React 19, Vite 6, TypeScript, Vitest. Despliegue en Vercel.
- Rama base: `develop` (PR a `develop`; `main` es la release).

## Comandos (de `package.json`)

- `npm ci`, `npm run dev`, `npm run lint`, `npm test -- --run`, `npm run build` (ejecuta `tsc -b && vite build`, cuenta como typecheck).
- `npm run format` aplica `prettier --write src/`: es una edición masiva, no la uses como validación.
- No existen `typecheck` ni `format:check`; no los inventes.

## CI y despliegue

- CI (`.github/workflows/ci.yml`, Node 22.21.0): `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build`.
- Vercel ejecuta solo `npm run build` (`vercel.json`). Lint y tests se validan en GitHub Actions (`ci.yml`); no fusiones con el CI en rojo, porque Vercel ya no bloquea el despliegue por ellos.
- No leas ni imprimas `.env`; la plantilla es `.env.example`.

## Arnés (resumen de `../AGENTS.md`)

- Salida de tests/lint/build a un log fuera del repo; lee solo el resumen (Vitest `Test Files|Tests|FAIL`, ESLint `problem`, tsc `error TS`).
- Commits convencionales con ámbito y en español, sin atribución de IA ni `Co-Authored-By`; sin commit, push ni merge sin petición del propietario.
- Worktrees en `EXOM/exom-admin-worktrees/<nombre>`, nunca en `/tmp`, con su propio `.codegraph/` y `npm ci`.
- Sin gentle-ai ni `.atl/skill-registry.md`. Archivos nuevos en LF (`tr -cd '\r' < fichero | wc -c` = 0).
