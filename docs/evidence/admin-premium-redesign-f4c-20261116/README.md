# Evidencias F4 lote C — Builders (rediseño premium de exom-admin)

Plan: `docs/plans/admin-premium-redesign.md` (sección 4, F4, lote C). Fecha: 2026-11-16. Autorización: el 2026-11-16 el propietario amplió la autorización (D17 y D18, ver sección 8 y el plan): lotes B–F y F5 con commits locales, PR a `develop` y merge con CI en verde; los push los hace el propietario.

Rama: `feat/admin-rediseno-f4c-builders`, creada desde `54975da` (HEAD de `feat/admin-rediseno-f4b-seguimiento`). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. HEAD de código: `0cf860f`. Entorno (no secreto): Windows 11, Node v22.21.0, arnés sintético sin red (`127.0.0.1:5192`), Chrome headless. Logs de checks en el scratchpad de la sesión (fuera del repo), carpeta `f4c/` (`fixrev-*` para los checks finales). Nada está subido.

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `0ead561` | dependencia `@dnd-kit/sortable` (autorizada por D3) | C0 |
| `4b140db` | extracción de Entrenamientos y su builder sin cambio visual | C1, extracción |
| `8320c57` | estilo de Entrenamientos: filas y builder en banco de trabajo | C1, estilo |
| `2e8fd47` | reordenar por arrastre ejercicios y circuitos en el builder de Entrenamientos | C1, P7 |
| `eb5ebb8` | extracción de Dietas y su builder sin cambio visual | C2, extracción |
| `215b6b7` | normalización de los ids de React en los snapshots de caracterización | soporte de tests |
| `3dae382` | estilo de Dietas: builder en banco de trabajo y suma de ingredientes | C2, estilo y P6 |
| `5235727` | reordenar por arrastre las comidas en el builder de Dietas | C2, P7 |
| `0cf860f` | correcciones de la revisión independiente | F-1, F-2, F-3, F-4, F-6, F-8 |
| (pendiente) | test(admin): capturas y evidencias del lote C de F4 con el arnés sintético | `capturas-f4c/`, este README y la actualización de `SUBIDA.md` |

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F4-01 capturas frente al boceto | exom-admin | `0cf860f` (capturas anteriores a este commit; los cambios visibles posteriores son «—» en comidas sin ingredientes y el plural «1 ejercicio») | arnés sintético en Chrome headless: 1440 oscuro, 1440 claro, 1440x2400 y 390 oscuro, más estados de edición y de arrastre | PASS con divergencias anotadas: 25 PNG en `capturas-f4c/`. 390 px en tema claro: NOT_RUN (el arnés solo genera 390 oscuro) | 2026-11-16 | `capturas-f4c/`, sección 5 |
| RDS-F4-C0 dependencia | exom-admin | `0ead561` | `git diff 54975da..0cf860f -- package.json package-lock.json` | PASS: `package.json` solo +1 línea (`@dnd-kit/sortable ^10.0.0`) y su entrada en el lockfile | 2026-11-16 | sección 4 |
| Extracción sin cambio visual (C1, C2) | exom-admin | `4b140db`, `eb5ebb8` | `npm test -- --run` con snapshots de caracterización tomados antes de la extracción | PASS: snapshots byte-idénticos. Entrenamientos: trainings-page 912 a 516 líneas, training-form-dialog 995 a 207, exercise-picker 858 a 371. Dietas: diets-page 813 a 427, diet-form-dialog 1564 a 353, ingredient-picker 315 a 178 | 2026-11-16 | sección 3 |
| Builders en Workbench a pantalla completa | exom-admin | `0cf860f` | tests de Entrenamientos y Dietas; arnés en navegador | PASS: la guarda de cambios sin guardar queda intacta | 2026-11-16 | sección 3 |
| P7 reordenar por arrastre (RDS-F4-C1, C2) | exom-admin | `0cf860f` | tests de arrastre; arrastre real en Chrome headless (ratón a 1440 px y táctil a 390 px) en Entrenamientos y Dietas | PASS: ejercicios, circuitos, ejercicios dentro de circuito y comidas; flechas conservadas; arrastre y flechas llaman a la misma operación y producen el mismo payload (test); Escape cancela el arrastre sin cerrar el banco de trabajo; deslizar fuera del asa hace scroll | 2026-11-16 | sección 3 |
| P6 comprobación nutricional (RDS-F4-C2) | exom-admin | `0cf860f` | tests de Dietas | PASS: solo lectura; suma de ingredientes frente a lo declarado, tolerancia ±1, «Cuadra»/«No cuadra»; resumen de dieta = valores declarados de las comidas principales, sin variantes; sin comparación («—») cuando no hay ingredientes calculables | 2026-11-16 | sección 3 |
| Reglas D7 | exom-admin | `0cf860f` | `git diff 54975da..0cf860f --stat -- src/features/*/api.ts src/features/*/schemas.ts src/lib src/hooks/use-auth.ts src/components/ui package.json package-lock.json` | PASS: diff vacío en `src/features/*/api.ts`, esquemas, `src/lib`, `src/hooks/use-auth.ts` y `src/components/ui`; `package.json` y lockfile solo con la dependencia de C0. Tests y snapshots del lote solo añadidos, salvo el snapshot de caracterización de Clientes (creado en el lote B) regenerado en `0cf860f` solo con ids de React normalizados (28 líneas) | 2026-11-16 | sección 4 |
| Checks finales | exom-admin | `0cf860f` | `npm run lint`; `npm test -- --run`; `npm run build`; `git -c core.whitespace=cr-at-eol diff --check` | PASS: lint 0 problemas; 154 ficheros / 1337 tests (base `54975da`: 145 / 1231); build OK (0 `error TS`); diff limpio | 2026-11-16 | scratchpad `f4c/fixrev-*` |
| Revisión independiente del lote C | exom-admin | `54975da..5235727` | revisor independiente (lint, test, build, reglas R1–R10) | ACCEPT WITH FOLLOW-UPS; 0 bloqueantes, 0 altos; R1–R10 PASS (R10 falló solo en un snapshot del lote B, corregido en F-3); correcciones en `0cf860f` | 2026-11-16 | sección 4 |
| CI remoto | exom-admin | — | — | NOT_RUN (nada subido) | 2026-11-16 | sección 8 |
| Dispositivo real, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-16 | sección 7 |

## 3. Notas por unidad

- C0 (`0ead561`): `@dnd-kit/sortable ^10.0.0` (familia de `@dnd-kit/core ^6.3.1`), autorizada por D3, sin uso en ese commit.
- C1 (`4b140db`, `8320c57`, `2e8fd47`): primero se extraen Entrenamientos y su builder sin cambio visual (trainings-page 912 a 516 líneas, training-form-dialog 995 a 207, exercise-picker 858 a 371, con snapshots de caracterización byte-idénticos); después el estilo (filas y builder en Workbench a pantalla completa, con la guarda de cambios sin guardar intacta); por último P7 (arrastre de ejercicios, circuitos y ejercicios dentro de circuito, con flechas conservadas).
- C2 (`eb5ebb8`, `215b6b7`, `3dae382`, `5235727`): primero se extraen Dietas y su builder sin cambio visual (diets-page 813 a 427, diet-form-dialog 1564 a 353, ingredient-picker 315 a 178); `215b6b7` normaliza los ids de React en los snapshots de caracterización; después el estilo con P6; por último P7 (arrastre de comidas, con flechas conservadas).
- P7: arrastre y flechas llaman a la misma operación y producen el mismo payload (test). Probado con arrastre real en Chrome headless, ratón a 1440 px y táctil a 390 px, en Entrenamientos y Dietas. Escape cancela el arrastre sin cerrar el banco de trabajo; deslizar fuera del asa hace scroll. El arrastre dentro de circuitos solo se probó por teclado en jsdom.
- P6: comprobación nutricional de solo lectura en Dietas. Compara la suma de ingredientes con lo declarado, con tolerancia ±1, y muestra «Cuadra» o «No cuadra». El resumen de dieta usa los valores declarados de las comidas principales, sin variantes.
- Capturas (25 PNG en `capturas-f4c/`, solo SUPER_ADMIN):
  - Entrenamientos, lista: `trainings-superadmin-dark-1440.png`, `trainings-superadmin-dark-1440x2400.png`, `trainings-superadmin-dark-390.png`, `trainings-superadmin-light-1440.png`.
  - Entrenamientos, builder: `training-builder-superadmin-dark-1440.png`, `training-builder-superadmin-dark-390.png`, edición `training-builder-superadmin-dark-edit-1440.png`, `training-builder-superadmin-dark-edit-1440-tall.png`, `training-builder-superadmin-dark-edit-390.png`, `training-builder-superadmin-dark-edit-390-exercises.png`, y arrastre `training-builder-superadmin-dark-drag-1440.png`, `training-builder-superadmin-dark-drag-390.png`.
  - Dietas, lista: `diets-superadmin-dark-1440.png`, `diets-superadmin-dark-1440x2400.png`, `diets-superadmin-dark-390.png`, `diets-superadmin-light-1440.png`.
  - Dietas, builder: `diet-builder-superadmin-dark-1440.png`, `diet-builder-superadmin-dark-390.png`, edición `diet-builder-superadmin-dark-edit-1440.png`, `diet-builder-superadmin-dark-edit-1440-tall.png`, `diet-builder-superadmin-dark-edit-390.png`, `diet-builder-superadmin-dark-edit-390-meals.png`, comprobación nutricional `diet-builder-superadmin-dark-p6-1440.png`, y arrastre `diet-builder-superadmin-dark-drag-1440.png`, `diet-builder-superadmin-dark-drag-390.png`.

## 4. Revisión independiente (`54975da..5235727`)

Veredicto: ACCEPT WITH FOLLOW-UPS, R1–R10 PASS (R10 falló solo en un snapshot del lote B); 0 bloqueantes, 0 altos. Detalle completo en el informe del revisor del scratchpad (`f4c/rev-informe.txt`).

Corregidos en `0cf860f`:

- F-1: `aria-roledescription` del asa en español («elemento reordenable»).
- F-2: sin comparación de macros cuando no hay ingredientes calculables (antes «No cuadra» y «−500 kcal» en una comida sin ingredientes; ahora «—»).
- F-3: snapshot de caracterización de Clientes dependiente del orden (ids `_r_N_`); regenerado solo con ids normalizados (28 líneas).
- F-4: scroll muerto del builder eliminado.
- F-6: «1 ejercicios» pasa a «1 ejercicio».
- F-8: tests añadidos (Escape sin arrastre cierra el builder; mismo `exercise_id` repetido).

Anotados y no corregidos:

- F-5: el foco inicial del Workbench cae en «Cerrar» (antes, en el primer campo); razonado, no probado en navegador; decisión del propietario.
- F-7: las kcal por fila de ingrediente se redondean por separado y pueden diferir unas kcal del total; aceptado.
- Falta un test de arrastre en el builder dentro del `DndContext` de la página sin disparar `catalog-groups`.

## 5. Divergencias respecto a los bocetos (prevalece el código, S2)

- C1 y C2 Builders: en 2 columnas con selectores en línea (los bocetos piden 3 columnas o maestro-detalle).
- C1 y C2 P7: asa de arrastre a la izquierda de las flechas, que se conservan.

## 6. Abiertos para el propietario

- Eyebrow «Catálogo» pasa a «Planificación» en Entrenamientos y Dietas.
- Control «Ordenar» y línea de resumen nuevos en las listas móviles.
- `aria-label` añadidos a botones de solo icono.
- Botón «Cerrar» del Workbench de 36 px en móvil.
- Comidas muy altas (1.300–2.200 px) hacen incómodo el arrastre; posible plegado futuro, decisión de diseño no tomada.
- Textos y regla nuevos de P6.
- `diet-form-header.tsx` eliminado.
- Aviso de subida ahora en color de advertencia.
- F-5 (foco inicial del Workbench en «Cerrar»).
- Duplicación entre trainings y diets, candidata a extraer: page-header, pagination-bar, selection-bar, empty/error-card, table-skeleton, list-panel, desktop-table, mobile-list, row-actions y tags-field.

## 7. No verificado

Dispositivo real; lectores de pantalla; Safari y Firefox; API real (el arnés acredita aspecto, no comportamiento de la API); arrastre dentro de circuitos solo probado por teclado en jsdom; capturas tras `0cf860f` no repetidas (los cambios visibles son «—» en comidas sin ingredientes y el plural); captura a 390 px en tema claro (NOT_RUN); CI remoto (NOT_RUN).

## 8. Subida pendiente

- Decisiones del propietario: D17 (continuar con los lotes C–F, F4-bis y F5 en ese orden mientras el consumo lo permita, decidiendo el agente los puntos abiertos; PR a `develop` y merge con CI en verde) y D18 (`git push` denegado por los permisos del arnés en esta sesión: push por el propietario; después el agente abre las PR, vigila CI y hace merge en verde).
- Nada está subido. Instrucciones exactas en `docs/evidence/admin-premium-redesign-f4b-20261116/SUBIDA.md` (ampliado con esta rama como séptima).
- Estado: F4 lote C REVIEW_REQUIRED: implementado y revisado en local (HEAD `0cf860f`); pendiente de revisión de capturas por el propietario, push, PR y CI.
