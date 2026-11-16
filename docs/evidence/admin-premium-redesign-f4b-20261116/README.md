# Evidencias F4 lote B — Seguimiento (rediseño premium de exom-admin)

Plan: `docs/plans/admin-premium-redesign.md` (sección 4, F4, lote B). Fecha: 2026-11-16. Autorización: el 2026-11-15 el propietario autorizó el lote B entero (RDS-F4-B1 a B7) con commits locales; sin push, PR ni merge. El 2026-11-16 amplió la autorización (D17 y D18, ver sección 8 y el plan): continuar con los lotes C–F, F4-bis y F5, PR a `develop` y merge con CI en verde; los push los hace el propietario.

Rama: `feat/admin-rediseno-f4b-seguimiento`, creada desde `69aa625` (HEAD de `feat/admin-rediseno-f4a-listas` antes de integrar `develop`). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. HEAD de código: `62ff0a0`. Entorno (no secreto): Windows 11, Node v22.21.0, arnés sintético sin red (`127.0.0.1:5192`), Chrome headless. Logs de checks en el scratchpad de la sesión (fuera del repo), carpeta `f4b/`. Nada está subido.

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `09d6615` | Dashboard | B1 |
| `b335117` | extracción de Clientes y Usuarios sin cambio visual | B2, extracción |
| `8abeae4` | búsqueda y filtros en la URL | B2, P15 |
| `9f8e054` | estilo de Clientes y Usuarios | B2, estilo |
| `5b0d23e` | Detalle de cliente | B3 |
| `42be4e9` | Feedback | B4 (P11) |
| `9e7cd09` | Recaps (lista) | B5 |
| `51e1f63` | extracción del Detalle de recap sin cambio visual | B6, extracción |
| `7778682` | estilo del Detalle de recap | B6, estilo |
| `7c3f3dc` | Solicitudes | B7 (P2, P3) |
| `7896660` | correcciones de la revisión independiente | F-1, F-2, F-3, F-4, F-6, F-8 |
| `62ff0a0` | merge de integración de `develop` (vía `0f6596f` en f3-shell y `eb7659c` en f4a-listas) | integración |
| (pendiente) | capturas y evidencias del lote B de F4 | `capturas-f4b/`, este README y `SUBIDA.md` |

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F4-01 capturas frente al boceto | exom-admin | `7896660` (capturas anteriores a este commit y a la integración; sin cambio visual en ambos salvo la entrada «Servicio base» del menú) | arnés sintético en Chrome headless: 1440 oscuro, 1440 claro, 1440x2400 y 390 oscuro; pasada manual a 375 px con datos largos (nombres de 150 caracteres, emails de 120, notas largas) en todas las unidades | PASS con divergencias anotadas: 53 PNG; sin scroll horizontal de página. 390 px en tema claro: NOT_RUN (el arnés solo genera 390 oscuro) | 2026-11-16 | `capturas-f4b/`, sección 5 |
| RDS-F4-02 parámetros de URL y P15 (RDS-F4-16) | exom-admin | `7896660` | `npm test -- --run` (tests de Clientes y Usuarios) | PASS: parámetros `clientsFilters`, `adminsFilters`, `superAdminsFilters`; formato `q:<búsqueda>;<clave>:<v1>,<v2>;<clave>:<desde>~<hasta>`; ausentes sin filtros; 17 tests más los de la corrección | 2026-11-16 | sección 3 |
| RDS-F4-03 tests, textos, `aria-label` y roles | exom-admin | `7c3f3dc` | `npm test -- --run`; revisor independiente | PASS: ningún test preexistente modificado en el lote. Excepción posterior en la integración: `app-shell.test.tsx` (F3) ampliado con `['Servicio base', '/base-service']` (16 a 17 entradas; el título del test sigue diciendo 16) porque `develop` añadió esa pantalla | 2026-11-16 | sección 3 |
| RDS-F4-04 sin cambios de lógica | exom-admin | `7c3f3dc` | `git diff 69aa625..7c3f3dc` en `features/*/api.ts`, esquemas, `src/lib`, `src/hooks` | PASS: diff vacío (R1 del revisor) | 2026-11-16 | sección 4 |
| RDS-F4-07 diff legible en Solicitudes (P2) | exom-admin | `7c3f3dc` | tests de Solicitudes | PASS: diccionario de 98 claves; claves desconocidas tal cual; JSON completo en «Datos técnicos», cerrado por defecto | 2026-11-16 | sección 3 |
| RDS-F4-08 fecha absoluta en Solicitudes (P3) | exom-admin | `7c3f3dc` | tests de Solicitudes | PASS completo con el lote A: `dd/mm/aaaa HH:mm` en `<time dateTime>` junto a la relativa | 2026-11-16 | sección 3 |
| RDS-F4-15 navegación en Feedback (P11) | exom-admin | `7896660` | tests de Feedback | PASS: siguiente pendiente posterior en la lista cargada o el primero restante; aviso «No quedan feedbacks pendientes en esta lista.»; Anterior/Siguiente en el diálogo por debajo de 1024 px | 2026-11-16 | sección 3 |
| Pruebas pedidas por el plan | exom-admin | `7896660` | `npm test -- --run` | PASS: tests de humo añadidos en dashboard, feedback y approval-requests; además clients (caracterización 18 tests y 20 snapshots, URL, variantes), client-detail (14 estados), recaps (página 7; caracterización del detalle 28) | 2026-11-16 | scratchpad `f4b/` |
| Reglas D7 | exom-admin | `7c3f3dc` | `git diff 69aa625..7c3f3dc --stat -- src/features/*/api.ts src/features/*/schemas.ts src/lib src/hooks src/components/ui src/components/page src/components/filters src/components/workspace src/index.css src/App.tsx package.json package-lock.json` | PASS (R1): diff vacío. R2: 13 ficheros de test o snapshot, todos añadidos; ningún test preexistente modificado | 2026-11-16 | sección 4 |
| Checks del revisor | exom-admin | `7c3f3dc` | `npm run lint`; `npm test -- --run`; `npm run build`; `git diff --check 69aa625 7c3f3dc` | PASS: lint 0 problemas; 139 ficheros / 1040 tests; build OK; diff limpio | 2026-11-16 | scratchpad `f4b/` |
| Checks tras correcciones | exom-admin | `7896660` | `npm run lint`; `npm test -- --run`; `npm run build` | PASS: lint 0; 139 ficheros / 1050 tests; build OK | 2026-11-16 | scratchpad `f4b/` |
| Checks tras integrar `develop` | exom-admin | `0f6596f` (f3-shell), `eb7659c` (f4a-listas), `62ff0a0` (f4b) | `npm run lint`; `npm test -- --run`; `npm run build` en cada rama | PASS: f3-shell lint 0, 121 ficheros / 1016 tests, build OK; f4a-listas lint 0, 134 / 1088, build OK; f4b lint 0, 145 / 1231, build OK. Base del lote (`bc927b1`): 128 / 907 | 2026-11-16 | scratchpad `f4b/` |
| Revisión independiente del lote B | exom-admin | `69aa625..7c3f3dc` | revisor independiente (lint, test, build, reglas R1–R13) | ACCEPT WITH FOLLOW-UPS; R1–R13 PASS; 0 bloqueantes, 0 altos; correcciones en `7896660` | 2026-11-16 | sección 4 |
| CI remoto | exom-admin | — | — | NOT_RUN (nada subido) | 2026-11-16 | sección 8 |
| Dispositivo real, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-16 | sección 7 |

## 3. Notas por unidad

- B1 (`09d6615`): Dashboard con las piezas de F2; KPI reordenados por urgencia; humo del Dashboard.
- B2 (`b335117`, `8abeae4`, `9f8e054`): primero se extraen Clientes y Usuarios sin cambio visual (caracterización de 18 tests y 20 snapshots); después P15 (búsqueda y filtros en la URL con `clientsFilters`, `adminsFilters` y `superAdminsFilters`); por último el estilo. Defecto hallado solo en navegador y corregido en la unidad: email partido a mitad de palabra en la tabla de Admins (`[overflow-wrap:anywhere]` aplastaba la columna; se añadió ancho mínimo).
- B3 (`5b0d23e`): Detalle de cliente (14 estados en el test). Defectos hallados solo en navegador y corregidos en la unidad: filetes dobles con hueco vacío, dos `summary` con tamaño distinto, nombre con palabra larga recortado a 375 px y título de sección sin la tipografía del lote. Racha y Adherencia no se tocan (compartidas con Progreso, lote E).
- B4 (`42be4e9`): Feedback con lista y detalle (corte a 1024 px) y P11 (siguiente pendiente, aviso al agotar la lista, Anterior/Siguiente en el diálogo).
- B5 (`9e7cd09`): Recaps (lista), página 7 de tests. `RecapsList` es compartida con el panel Seguimiento de Progreso y cambia allí también.
- B6 (`51e1f63`, `7778682`): extracción del Detalle de recap sin cambio visual (caracterización de 28 tests) y después el estilo. Defecto hallado en navegador y corregido: el rótulo «Revisión de recap» se había sustituido por error; restaurado.
- B7 (`7c3f3dc`): Solicitudes con P2 (diccionario de 98 claves, «Datos técnicos») y P3 (fecha absoluta junto a la relativa).
- Capturas (53 PNG en `capturas-f4b/`): por pantalla, Dashboard, Clientes, Usuarios (pestañas Usuarios, Admins y Super admins), Detalle de cliente (Información, Métricas, Adherencia y Racha), Feedback, Recaps, Detalle de recap, Solicitudes y su detalle con «Datos técnicos». Mayoría en 1440 oscuro; las principales también en claro, en 1440x2400 y en 390 oscuro. Hay variantes por rol (Admin y Super admin) donde la pantalla cambia.

## 4. Revisión independiente (`69aa625..7c3f3dc`)

Veredicto: ACCEPT WITH FOLLOW-UPS, R1–R13 PASS; 0 bloqueantes, 0 altos. Detalle completo en el informe del revisor del scratchpad (`f4b/rev-informe.md`).

Corregidos en `7896660` (cada uno con un test que falló primero):

- F-1 Feedback: fallo silencioso si se cerraba el detalle antes de la respuesta; la mutación sube a la página y el borrador solo se limpia con éxito.
- F-2 Feedback: la selección hecha durante el envío se respeta y «Enviando…» es por elemento.
- F-3 Clientes: la navegación externa con filtros conserva la página.
- F-4 Clientes: las fechas imposibles de la URL se descartan.
- F-6 Feedback: nombre accesible completo de la fila.
- F-8 Feedback: la guarda de cambios cubre los borradores de todos los elementos.

Anotados y no corregidos:

- F-5: la lista `pending` del setter serializado puede retener entradas obsoletas (teórico).
- F-7: `avg-review-time-card.tsx` huérfano y `formatWeekRange` duplicada.
- F-9: los datos anidados se resumen como «N elementos».

## 5. Divergencias respecto a los bocetos (prevalece el código, S2)

- B1 Dashboard: sin botón «Actualizado hace…», sin agrupación Hoy/Ayer; «Cuentas bloqueadas» va a `/users` sin filtro; KPI reordenados por urgencia.
- B2 Clientes y Usuarios: sin tira de cifras ni contadores en pestañas; filas no clicables; Admins conserva botones con texto.
- B3 Detalle de cliente: acciones como botones en fila (no menú); email y alta en el desplegable; sin banner de cuenta bloqueada; Racha y Adherencia sin tocar.
- B4 Feedback: corte lista/detalle a 1024 px; por debajo, detalle en diálogo (no hoja); sin selección inicial automática.
- B5 Recaps: se mantienen el selector de cliente y el botón «Ver archivados»; sin avatar ni fila clicable.
- B6 Detalle de recap: sin dos columnas lectura/revisión; sin menú ⋯; los dos flujos de revisión en el mismo orden.
- B7 Solicitudes: detalle en diálogo (no hoja); sin contadores; el estado del código es «Fallida» (el boceto dice «Cancelada»).

## 6. Abiertos para el propietario

- Con una sola página ya no se pintan «Anterior»/«Siguiente» deshabilitados; queda «Página 1 de 1» (igual que el lote A).
- Pulsar la opción ya activa de «Listado principal/Archivados» no hace nada (antes reescribía la URL y volvía a la página 1).
- Los títulos de error pasan de `h1` a párrafo dentro del estado de error compartido (Dashboard, Detalle de cliente, Detalle de recap).
- Feedback: borradores por elemento (antes se perdían al cerrar); botón «Ver» sustituido por fila-botón; «Reintentar» añadido en el error; el estado pasa de desplegable a control segmentado.
- `RecapsList` es compartida con el panel Seguimiento de Progreso y cambia allí también.
- Solicitudes: las pestañas de estado pasan a control segmentado (rol de pestaña a botón) que a 390 px se desplaza en horizontal.
- «Servicio base» (de `develop`): se ha colocado en el grupo Seguimiento tras Clientes; no está rediseñada ni figura en el plan, y su `delivery-status-badge.tsx` usa colores de la paleta por defecto (amber/green), no tokens.
- Heredados sin cambios: dos `useBlocker` activos, foco que no vuelve al origen en Dialog/Sheet controlados, casillas de 16 px.
- Avisos de espacios preexistentes en `git diff --check origin/develop HEAD` (sección 8), no corregidos.

## 7. No verificado

Dispositivo real; lectores de pantalla; Safari y Firefox; API real (el arnés acredita aspecto, no comportamiento de la API); en navegador, recap revisado/archivado, conflicto de versión, error de carga y vista de impresión (solo tests); fotos de perfil reales; captura a 390 px en tema claro (NOT_RUN); CI remoto.

## 8. Integración con develop y subida pendiente

- `origin/develop` pasó de `727ffb3` a `872d802` (10 commits, pantalla «Servicio base»). F0, F1 y F2 se integran limpias.
- Conflicto único en `src/components/layout/sidebar.tsx`, resuelto en f3-shell (`0f6596f`): se conserva el shell de F3 y la entrada se declara en `nav-model.ts` (grupo Seguimiento, tras Clientes, icono Mail, ruta `/base-service`, sin restricción de rol, como en `develop`) y en `breadcrumbs.tsx`. Propagado a f4a (`eb7659c`) y f4b (`62ff0a0`).
- `git merge-tree` contra `origin/develop`: 0 conflictos en las seis ramas.
- `git diff --check origin/develop HEAD`: 6 avisos preexistentes de espacios (`docs/redesign/feedback.html`, `assignment-editor-dialog.tsx`, `diets-table.tsx`), no corregidos.
- Decisiones del propietario del 2026-11-16: D17 (continuar con los lotes C–F, F4-bis y F5 en ese orden mientras el consumo lo permita, decidiendo el agente los puntos abiertos; PR a `develop` y merge con CI en verde; si sale rojo, reintentar si es inestabilidad o corregir) y D18 (`git push` denegado por los permisos de la sesión: push por el propietario; después el agente abre las PR, vigila CI y hace merge en verde).
- Nada está subido. Instrucciones exactas en `SUBIDA.md`.
- Estado: F4 lote A pasa a DONE (aprobado por el propietario al autorizar el lote B). F4 lote B REVIEW_REQUIRED: implementado y validado en local; pendiente de revisión de capturas por el propietario, subida y CI.
