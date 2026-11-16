# Evidencias F4 lote E — Progreso (rediseño premium de exom-admin)

Estado: REVIEW_REQUIRED. Implementado y validado en local (HEAD de código `d6493fc`). Revisión independiente recibida (ACCEPT WITH FOLLOW-UPS); resultado en sección 4. Pendiente: push del propietario (D18), PR a `develop`, CI remoto en verde, merge y revisión de las capturas por el propietario.

Plan: `EXOM/docs/plans/admin-premium-redesign.md` (sección 4, F4, lote E). Fecha: 2026-11-16. Autorización: D17 (lotes B–F y F5 con commits locales, PR a `develop` y merge con CI en verde; los push los hace el propietario).

Rama: `feat/admin-rediseno-f4e-progreso`, creada con `--no-track` desde `origin/develop` `f0fb162` (merge de la PR #61, mismo árbol que `8086b5c`). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. HEAD de código: `d6493fc`. `main` sin tocar. Entorno (no secreto): Windows 11, arnés sintético sin red (`127.0.0.1:5192`, `docs/evidence/admin-premium-redesign-f0-20261115/browser-harness`, sin cambios en los fixtures), Chrome headless por CDP. Nada está subido.

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `754f5f1` | test de caracterización de la cabecera y las pestañas de Progreso (20 tests) | RDS-F4-E0 |
| `2fc55e7` | cabecera con selector de cliente en las acciones, pestañas como carril vertical fijo desde `lg` con grupos, fila desplazable bajo `sm`, `EmptyState` sin cliente | RDS-F4-E0 |
| `4a457ed` | estilo de la Racha (`ClientStreakCard` plana y `FigureStrip`, compartida con el detalle de cliente; botón de reinicio `destructive`) | RDS-F4-E7 |
| `0eb6775` | test de caracterización de los bloques del Dashboard (5 tests: carga, error y reintento por bloque) | RDS-F4-E1 |
| `cac5745` | estilo del Dashboard (libro de KPI, solo clases) | RDS-F4-E1 |
| `1c2e805` | estilo de Métricas (solo clases; Recharts sigue con variables CSS) | RDS-F4-E3 |
| `0e8ab2e` | estilo de Fotos (clases, constantes de estilo y ayudante puro de tono) | RDS-F4-E4 |
| `db5e2ca` | test de caracterización de la respuesta del coach en el Resumen (2 tests) | RDS-F4-E2 |
| `02c98cd` | estilo del Resumen | RDS-F4-E2 |
| `38ad965` | estilo de Seguimiento (solo clases) | RDS-F4-E8 |
| `0816377` | estilo de Entrenamiento (solo clases) | RDS-F4-E5 |
| `ca1798a` | estilo de Adherencia (`ClientAdherenceTab` compartida con el detalle de cliente, `AdherenceEvolution` compartida con el Dashboard, editor de configuración) | RDS-F4-E6 |
| `342def3` | corrección de 2 errores de compilación detectados en la primera ronda de checks | E3 y E2 (ver sección 3) |
| `58a2e2e` | margen de tiempo del test de nutrición de dietas | RDS-F4-C-FLAKY-02 |
| `d6493fc` | correcciones de la revisión independiente y de las capturas | F-1, F-2, F-4, F-7, F-11, V-1 |
| (pendiente) | capturas y evidencias del lote E de F4 | `capturas-f4e/` y este README |

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F4-01 capturas frente al boceto | exom-admin | `d6493fc` | arnés sintético, Chrome headless por CDP: 1440x900 y 390 nativo (emulación móvil, `deviceScaleFactor` 2, altura completa), oscuro y claro, SUPER_ADMIN | PASS con divergencias anotadas: 42 PNG en `capturas-f4e/` (8 secciones x 2 temas x 2 anchos = 32; sin cliente 3; editor de tarea 2; diálogo de reinicio de racha 1; pestaña Adherencia del detalle de cliente 2; foco de teclado en una pestaña 2). `scrollWidth === innerWidth` en 42 de 42 (también a 768, 1024 y 1280); 0 errores de consola (solo el aviso de React Router «No `HydrateFallback`»); 0 líneas `[fixture-api] 404` | 2026-11-16 | `capturas-f4e/`, secciones 3 y 5 |
| Foco visible con teclado | exom-admin | `d6493fc` | Tab real por CDP a 1440, oscuro y claro; flechas en el carril | PASS: anillo visible en la pestaña con Tab; abajo y arriba mueven el foco por el carril vertical (`aria-orientation=vertical`); a 1024 y 1280 el elemento activo del carril tiene borde izquierdo de 2 px en `--primary` | 2026-11-16 | `progress-focus-tab-*` |
| Maquetación entre anchos | exom-admin | `d6493fc` | captura a 768, 1024 y 1280 | PASS: a 768 las pestañas pasan a 2 filas sin scroll interior | 2026-11-16 | sección 3 |
| Objetivos táctiles a 390 | exom-admin | `d6493fc` | `getBoundingClientRect` | PASS salvo el selector de periodo compartido: pestañas de sección 44 px, selector de cliente 44, pestañas «Tareas» y «Recaps» 44 (eran 39, corregido), «Escala del eje Y» 44 (era 40, corregido). Queda < 44 el selector de periodo «Últimos 30 días» = 40 px (`src/components/period`, compartido con otras pantallas, previo, sin cambiar): RDS-F4-E-TOUCH-01, abierto, bajo | 2026-11-16 | sección 6 |
| Reglas D7 | exom-admin | `d6493fc` | `git diff --stat f0fb162 HEAD -- 'src/features/*/api.ts' 'src/features/*/schemas.ts' src/lib src/hooks src/components/ui src/index.css src/App.tsx package.json package-lock.json` | PASS: salida vacía | 2026-11-16 | sección 3 |
| Tests existentes no debilitados | exom-admin | `d6493fc` | `git diff --name-status f0fb162 HEAD -- '*.test.ts' '*.test.tsx' '*.snap'` | PASS: 3 añadidos (`progress-page.characterization`, `progress-dashboard.blocks`, `day-progress-detail.characterization`) y 1 modificado (`diet-form-nutrition.test.tsx`, +2 líneas de margen de tiempo, sin aserciones). Ficheros de test bajo `src/features/progress`: 31 en `f0fb162`, 34 en HEAD; bajo `src/features/progress/components`: 23 (el plan exige conservarlos) y 25 | 2026-11-16 | `git ls-tree -r --name-only <rev> -- src/features/progress`, sección 3 |
| Primera ronda de checks | exom-admin | `ca1798a` | `npm run lint`; `npm test -- --run` x2; `npm run build`; `git diff --check`; D7 | lint PASS; suite completa FAIL x2 (159 de 160 ficheros, 1426 de 1427 tests; solo «Calcular desde ingredientes» de `diet-form-nutrition.test.tsx`, 5000 ms); build FAIL (2 `error TS`); `diff --check` limpio; D7 vacío | 2026-11-16 | logs fuera del repo |
| Segunda ronda de checks | exom-admin | contenido de `58a2e2e` | `npm run build`; `npm run lint`; `npm test -- --run` x2 | build PASS (0 `error TS`); lint PASS; suite completa PASS x2 (160 ficheros / 1427 tests; base antes del lote: 157 / 1400) | 2026-11-16 | logs fuera del repo |
| RDS-F4-C-FLAKY-02 | exom-admin | `58a2e2e` | `vi.setConfig({ testTimeout: 15000 })` en `diet-form-nutrition.test.tsx`; suite completa x2 | PASS (CLOSED): el test «Calcular desde ingredientes» agotó 5000 ms en las dos ejecuciones completas de la primera ronda y pasa aislado en 1995 y 1978 ms; mismo remedio que RDS-F4-C-FLAKY-01; sin cambio de aserciones; 2 ejecuciones completas en verde | 2026-11-16 | secciones 3 y 7 |
| Revisión independiente del lote E | exom-admin | `58a2e2e` | revisión de `f0fb162..58a2e2e` | ACCEPT WITH FOLLOW-UPS: 0 bloqueantes, 0 altos, R1–R8 PASS; hallazgos F-1 a F-11 en sección 4 | 2026-11-16 | sección 4 |
| Checks finales en `d6493fc` | exom-admin | `d6493fc` | `npm run lint`; `npm test -- --run` (dos ejecuciones seguidas); `npm run build`; `git -c core.whitespace=cr-at-eol diff --check f0fb162 HEAD`; D7 (`git diff --stat f0fb162 HEAD -- 'src/features/*/api.ts' 'src/features/*/schemas.ts' src/lib src/hooks src/components/ui src/index.css src/App.tsx package.json package-lock.json`) | lint PASS (exit 0, 0 problemas); tests PASS las dos ejecuciones (160 ficheros / 1427 tests); build PASS (exit 0, 0 `error TS`); diff limpio; D7 salida vacía. `git diff --shortstat f0fb162 HEAD`: 31 ficheros, 881 inserciones, 422 eliminaciones, 15 commits | 2026-11-16 | logs fuera del repo (`f4e-final-*.log`) |
| CI remoto | exom-admin | — | — | NOT_RUN (nada subido) | 2026-11-16 | sección 8 |
| Dispositivo real, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-16 | sección 7 |

## 3. Notas por unidad

- E0 (`754f5f1`, `2fc55e7`): primero test de caracterización de la página (20 tests: orden de pestañas, enlaces profundos, valor desconocido a Métricas, URL conservada, cambio de cliente que reinicia `date`, `historyPage` y `trainingWindow`, confirmación al descartar una tarea en edición). Después estilo: `PageHeader` con el selector de cliente en las acciones; pestañas de sección como carril vertical fijo desde `lg` con grupos, fila desplazable bajo `sm`; `EmptyState` sin cliente.
- E7 Racha (`4a457ed`): `ClientStreakCard` plana con `FigureStrip` (compartida con el detalle de cliente); botón de reinicio con variante `destructive`. `AlertDialog` y mutación sin tocar; los tests existentes ya cubrían cancelar y confirmar, sin test nuevo.
- E1 Dashboard (`0eb6775`, `cac5745`): primero caracterización de los bloques (5 tests: carga, error y reintento por bloque), después libro de KPI solo con clases.
- E3 Métricas (`1c2e805`): solo clases; los colores de Recharts siguen en variables CSS; los tests existentes cubrían el comportamiento.
- E4 Fotos (`0e8ab2e`): clases, constantes de estilo y un ayudante puro de tono. Checkpoint de subida, precondición de reemplazo y lógica del comparador sin tocar; cubierto por los 21 tests existentes.
- E2 Resumen (`db5e2ca`, `02c98cd`): primero caracterización de la respuesta del coach (2 tests: aviso de push, «Responder», error con reintento, sin registro), después estilo.
- E8 Seguimiento (`38ad965`), E5 Entrenamiento (`0816377`): solo clases.
- E6 Adherencia (`ca1798a`): `ClientAdherenceTab` (compartida con el detalle de cliente), `AdherenceEvolution` (compartida con el Dashboard) y el editor de configuración. El conflicto 409 y «Recargar versión conservando borrador» sin tocar, cubiertos por tests existentes.
- `342def3`: corrige 2 errores de compilación de la primera ronda: `className` duplicado en `metrics-table.tsx` (introducido en `1c2e805`) y tipo de fixture incompleto en el test de caracterización de `db5e2ca`. `1c2e805` y `db5e2ca` no compilan por sí solos hasta `342def3`.
- `58a2e2e` (RDS-F4-C-FLAKY-02): margen de tiempo en `src/features/diets/components/diet-form-nutrition.test.tsx`; sin cambio de aserciones. CLOSED tras 2 ejecuciones completas en verde.
- `d6493fc`: correcciones de la revisión (F-1, F-2, F-4 en parte, F-7, F-11) y de las capturas (V-1).
- URL y periodos sin cambios: `clientId`, `section`, `date`, `period`, `historyPage`, `trainingWindow`, `adherence_period/_start/_end`, `metric_group`, `metric`, `compare` y `dashboard_*`. Sin dependencias nuevas.
- Cambios de marcado intencionados: la sección del periodo pasa bajo la lista de pestañas; lista de pestañas vertical desde `lg` (teclado arriba y abajo); `EmptyClientState` usa el `EmptyState` compartido; el `dl` de la racha pasa a `FigureStrip` (sigue siendo `dl`/`dt`/`dd`) más una fila `dl` aparte para la fecha; la fila de acciones de la racha pasa bajo la nota; iconos decorativos con `aria-hidden`; el texto del aviso de push va en un `span` con una campana decorativa.
- Capturas (42 PNG en `capturas-f4e/`, solo SUPER_ADMIN, nombres `progress-<sección>-superadmin-{dark,light}-{1440,390}.png`):
  - Ocho secciones: `progress-{dashboard,resumen,metricas,fotos,entrenamiento,adherencia,racha,seguimiento}-superadmin-{dark,light}-{1440,390}.png` (32).
  - Sin cliente: `progress-no-client-superadmin-dark-1440.png`, `-dark-390.png` y `-light-1440.png`.
  - Editor de tarea: `progress-seguimiento-task-editor-superadmin-dark-1440.png` y `-light-390.png`.
  - Diálogo de reinicio: `progress-racha-reset-dialog-superadmin-dark-1440.png`.
  - Detalle de cliente, pestaña Adherencia: `progress-client-detail-adherence-superadmin-dark-1440.png` y `-light-390.png`.
  - Foco en una pestaña de sección: `progress-focus-tab-superadmin-{dark,light}-1440.png`.
- Las capturas a 390 de página se toman a altura completa: la barra de navegación inferior fija aparece a mitad de imagen (artefacto de captura). El texto «FRONT» del SVG del fixture sale recortado (artefacto del fixture). El script de captura no está versionado (scratchpad de la sesión).
- Higiene de procesos: el Vite del arnés y Chrome se pararon por PID tras cada ronda de capturas; sin procesos huérfanos.

## 4. Revisión independiente

Veredicto: ACCEPT WITH FOLLOW-UPS (`f0fb162..58a2e2e`). 0 bloqueantes, 0 altos, R1–R8 PASS.

| ID | Hallazgo | Resultado |
| --- | --- | --- |
| F-1 | Estilo de cifra de pantalla (mayúsculas grandes) aplicado a valores en frase en los KPI del Dashboard. | Corregido en `d6493fc`. |
| F-2 | Fecha de última actividad de la racha en tamaño de pantalla (3 líneas a 390). | Corregido en `d6493fc`: la fecha pasa a su propia fila `dl` en tamaño de cuerpo. |
| F-3 | Captura del Dashboard oscuro a 1440 en blanco; las de 390 sin gráficos. | Corregido: recaptura con calentamiento de Vite y espera de Recharts. |
| F-4 | Estado activo del carril solo por fondo tenue; sin test de la orientación vertical (jsdom no tiene `matchMedia`). | Corregido en parte en `d6493fc`: borde izquierdo de 2 px en `--primary`. El test con `matchMedia` no se añadió: anotado. |
| F-5 | `EmptyClientState` sin test propio (las páginas lo mockean). | Anotado, sin cambio. |
| F-6 | `1c2e805` y `db5e2ca` no compilan hasta `342def3`; asuntos largos. | Anotado, sin cambio (afecta a `git bisect`; squash si se reescribe antes de la PR). |
| F-7 | Nota del cliente en `blockquote`. | Corregido: vuelve a `p`. |
| F-8 | Mayúsculas sobre unidades y textos largos (`PESO · KG`, etiqueta larga de Adherencia). | Anotado, sin cambio. |
| F-9 | Clases táctiles `min-h-*` redundantes o incoherentes entre paneles. | Anotado, sin cambio. |
| F-10 | `text-muted-foreground` y `text-foreground-muted` mezclados en `progress-dashboard.tsx`. | Anotado, sin cambio. |
| F-11 | Sin `sm:flex-wrap`, las pestañas entre 640 y 1023 px quedaban en una línea desplazable. | Corregido: las pestañas vuelven a envolver entre `sm` y `lg`. |

### Defectos de capturas

| ID | Resultado |
| --- | --- |
| V-1 | Fecha de la racha en tamaño de pantalla: corregido (F-2). |
| V-2 | Filas de tareas de Seguimiento a 390 como líneas apiladas sin chips de estado ni prioridad (requiere marcado o chip compartido; los textos están ligados a tests). Abierto, anotado. |
| V-3 | Tabla de ejercicios de Entrenamiento a 390: desplaza dentro de su tarjeta con una columna cortada y sin pista de desplazamiento. Abierto, anotado. |
| V-4 | Fila de pestañas a 390 corta «Entrenamiento» sin degradado ni pista (igual que antes del rediseño bajo `sm`). Abierto, anotado. |
| V-5 | Gráficos en blanco en el Dashboard a 390: artefacto de captura; corregido esperando a Recharts. |
| V-6 | Huecos entre grupos del carril: intencionados (grupos antes de Métricas, Adherencia y Seguimiento). |
| V-7 | Etiquetas largas de KPI a 3 líneas a 390. Abierto, anotado. |

## 5. Divergencias respecto al boceto (prevalece el código, S2)

- Selector de cliente a la derecha del título (acciones de `PageHeader`), conservando el combobox existente.
- Sin contador de «vencidas» en la pestaña Seguimiento (no hay dato sin llamadas nuevas).
- KPI sin celdas clicables (se conservan los enlaces de texto existentes); sin iconos de tono, chips ni leyenda en el Dashboard.
- Cifras semanales del Resumen como celdas con filetes en tamaño de texto (los tests necesitan las cadenas largas en un solo nodo).
- Métricas conserva su DOM (sin fila única de controles ni leyenda; botones de paginación existentes).
- Fotos conserva la `Card` compartida y la pila vertical (sin dos columnas ni superposición de zoom).
- Entrenamiento conserva tarjetas con borde y tablas desplazables (sin tabla apilada en móvil).
- Adherencia conserva `DeltaBadge`, la barra SVG y la rejilla del calendario; el aviso 409 sigue siendo la alerta existente.
- Seguimiento conserva `Button` para el cambio de vista y no usa chips.
- El selector de periodo sigue dentro de la columna de contenido, ahora bajo la lista de pestañas.

## 6. Abiertos para el propietario

- Divergencias de la sección 5 y cambios de marcado de la sección 3.
- RDS-F4-E-TOUCH-01 (abierto, bajo): el selector de periodo compartido mide 40 px a 390 (`src/components/period`, compartido con otras pantallas, previo; no se modificó).
- Defectos visuales abiertos: V-2, V-3, V-4 y V-7 (sección 4).
- Hallazgos anotados: F-4 (falta el test de `matchMedia` para la orientación vertical), F-5, F-6, F-8, F-9 y F-10.
- El teclado en el carril cambia desde `lg`: izquierda y derecha dejan de mover el foco y lo hacen arriba y abajo (correcto según ARIA); a tener en cuenta en las notas de versión.
- Revisión de las capturas por el propietario.
- RDS-F4-C-FLAKY-02 CLOSED (`58a2e2e`).

## 7. No verificado

Dispositivo real; lectores de pantalla; Safari y Firefox; API real (el arnés acredita aspecto, no comportamiento); CI remoto (NOT_RUN, nada subido). Checks finales en `d6493fc`: pendientes de registrar (fila «Checks finales en `d6493fc`»).

## 8. Subida pendiente

- Decisiones del propietario: D17 (ver plan). Nada está subido; el push lo hace el propietario.
- Estado: implementado y validado en local, HEAD de código `d6493fc`; REVIEW_REQUIRED. Push pendiente del propietario (D18): `git push -u origin feat/admin-rediseno-f4e-progreso`. Después: PR a `develop`, CI remoto en verde y merge (D17); revisión de capturas por el propietario.
- Siguiente: lote F (Login con P16, Onboarding, Plantillas con P9 y P10) en rama nueva desde `develop` actualizado; F4-bis exige el boceto del buscador aprobado por el propietario antes de cualquier código; F5 después (D17).
