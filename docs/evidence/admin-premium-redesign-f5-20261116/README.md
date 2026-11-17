# Evidencias F5 — Cierre del rediseño premium de exom-admin

Estado: **DONE** (2026-11-17, tarde; ver la sección 11, «Cierre»). Texto previo, vigente hasta la fusión: REVIEW_REQUIRED. U1, U3, U4, U5 y U6 implementadas y validadas en local (HEAD `840366f`); U2 `NOT_RUN` (sin dispositivo real). Pendiente: push del propietario (D18), PR a `develop`, CI remoto en verde, merge con merge commit (D17), prueba en móvil real (RDS-F5-U2), aceptación de `RDS-F5-LCP-01` y de R-7, y revisión de las capturas por el propietario. Nada de F5 está subido.

Plan: `EXOM/docs/plans/admin-premium-redesign.md` (sección 4, F5). Fecha de los trabajos: 2026-11-16, con el cierre local del 2026-11-17 (madrugada, hora UTC). Autorización: D17 (F5), D18 (push del propietario), D22 (decisiones del agente y tope de consumo) y D23 (decisiones del propietario del 2026-11-16 sobre F5, ver sección 7). Cierre previo: F4-bis quedó DONE el 2026-11-16 (PR #64, HEAD `37df692`, merge `0dc7f55`, 20:18:53 UTC, CI remoto en verde con 3 checks y 0 fallos; `origin/develop` = `0dc7f55`, mismo árbol que `37df692`; `main` = `312afef`, sin tocar; no desplegado).

Rama: `feat/admin-rediseno-f5-cierre`, creada con `--no-track` desde `37df692` (HEAD de F4-bis, hoy contenido en `origin/develop` `0dc7f55`). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. HEAD: `840366f`. Entorno (no secreto): Windows 11, Node 22, arnés sintético sin red (`docs/evidence/admin-premium-redesign-f0-20261115/browser-harness`), Chrome headless por CDP; mediciones de LCP sobre builds de producción servidos en loopback y sobre el Vite del arnés. Nada está subido.

Diff de la fase (`37df692..840366f`): 185 ficheros, +6921 −4629 (bajo `src`: 175 ficheros, +6918 −4530; incluye tests y snapshots).

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `9e69954` | chore: retirar `next-themes`, `@vercel/analytics` y `@vercel/speed-insights` sin uso | RDS-F5-U4 |
| `daf9541` | fix: accesibilidad y teclado en todas las rutas (auditoría de F5), ronda 1 | RDS-F5-U1 |
| `5a7d487` | fix: segunda ronda de accesibilidad tras la re-auditoría | RDS-F5-U1 |
| `6d838fc` | perf: fuentes web en woff2 | RDS-F5-U3 |
| `4e237b3` | fix: campos obligatorios, errores en línea, etiquetas e iconos decorativos (decisiones del propietario) | RDS-F5-U1 |
| `9ae5fdd` | fix: cierre de pendientes de accesibilidad de F5 | RDS-F5-U1 |
| `840366f` | fix: foco visible en tablas con desplazamiento horizontal y marca de puntero del editor de plantillas | RDS-F5-U1 |
| (pendiente) | evidencias de F5 (esta carpeta) | todas |

Los ficheros de `EXOM/DESIGN.md`, `EXOM/docs/archive/DESIGN-apple-20261116.md`, el plan y el seguimiento viven en la raíz de coordinación, que no tiene Git (ver sección 3, U5).

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F5-01 WCAG 2.1 AA en ambos temas y teclado completo, con evidencia por ruta | exom-admin | `9ae5fdd` (matriz completa en `4e237b3`); `840366f` corrige A11Y-23 | auditoría por CDP sobre el arnés: 27 configuraciones × 2 temas × {1440, 390} = 108 cargas, más 320, 720, 768, 1023, 24 diálogos, hoja «Más» y Ctrl K | PASS con abiertos bajos listados: 27 de 27 rutas PASS, 0 FAIL, 0 NOT_RUN, sobre la base de matriz completa medida en `4e237b3`, verificación dirigida y pasada global en `9ae5fdd`, y verificación del punto A11Y-23 en `840366f` (no hay una re-auditoría completa de `840366f`). `RDS-F5-A11Y-23` cerrado en `840366f`: 0 paradas de foco recortadas por el contenedor de la tabla o tapadas por la barra lateral en las 6 tablas a 768 y 1023 px (antes, `/exercises` a 768 px: «Nombre» con `scrollLeft` 72 y 15 de 75 px visibles). Abiertos de gravedad baja: `RDS-F5-A11Y-26`, `-27`, R-7, H-4, H-5, J-2, J-3, J-4, G-3 y la excepción de los paneles altos (sección 5), más una observación nueva sin ID (filas de filtros por grupo a 768 px). Limitaciones: sin lector de pantalla, sin dispositivo real, sin Safari ni Firefox, aviso de versión simulado, StrictMode del arnés | 2026-11-16 y 2026-11-17 | `a11y-por-ruta.md` (incluye la adenda del 2026-11-17), `capturas-a11y/` |
| RDS-F5-02 prueba en móvil real (iOS y Android, 390 px) | exom-admin | — | — | PASS (2026-11-17, sección 11): prueba del propietario en un iPhone 16 Pro y un Samsung S25 Ultra, resultado «perfecto». Incluye `RDS-F4B-KEYBOARD-01`: PASS. Antes: NOT_RUN, el agente no dispone de dispositivo; la ejecuta el propietario | 2026-11-16 y 2026-11-17 | secciones 8 y 11 |
| RDS-F5-03 (a) ningún chunk > 650 kB | exom-admin | `9e69954` (base `727ffb3`) | `npm run build` (`tsc -b && vite build`) y comparación de los 79 chunks | PASS: mayor `vendor-charts` 405,15 kB; `chunkSizeWarningLimit: 650` en `vite.config.ts:32` | 2026-11-16 | `rendimiento.md`, sección 1 |
| RDS-F5-03 (b) fuentes ≤ 95 kB | exom-admin | `6d838fc` | `wc -c public/fonts/*` y peticiones de fuentes por CDP | PASS: 71.460 B (woff2) frente a 95.000 B y 97.280 B; antes 95.092 B (woff) | 2026-11-16 | `rendimiento.md`, sección 2 bis; `capturas-fuentes/` |
| RDS-F5-03 (c) LCP no empeora frente a la base `727ffb3` | exom-admin | `727ffb3` frente a `4e237b3` (`/login`) y `9ae5fdd` (Dashboard del arnés) | regla declarada: mediana actual ≤ mediana base × 1,10 + 50 ms; worktrees temporales, builds de producción y arnés | `/login` en producción: 8 de 8 combinaciones PASS tras repetir con la máquina libre. Dashboard (solo medible en modo desarrollo del arnés): 1440 PASS; 390 FAIL numérico (1.068 → 1.304 ms, +22,1 %, n = 16, límite 1.225), clasificado como artefacto del modo desarrollo, pendiente de aceptación del propietario (`RDS-F5-LCP-01`). Dashboard en producción: NOT_RUN (exige sesión real) | 2026-11-16 y 2026-11-17 | `rendimiento.md`, secciones 6 y 7 |
| RDS-F5-04 dependencias retiradas con 0 imports y build correcto | exom-admin | `9e69954` | `git grep` de los tres paquetes en `src` (0 resultados, antes y en la revisión independiente); `npm run build`; comparación de chunks | PASS: `package-lock.json` solo pierde esas 3 entradas (93 líneas, 0 transitivos); `vite.config.ts` solo pierde `'next-themes'` de `manualChunks`; los 79 chunks, idénticos antes y después | 2026-11-16 | `rendimiento.md`, sección 1 |
| RDS-F5-05 `DESIGN.md` nuevo y copia del anterior con hash antes y después | EXOM (raíz sin Git) | `daf9541`, `9ae5fdd` y `840366f` (instantánea de archivos) | `sha256sum` de `DESIGN.md` y de `docs/archive/DESIGN-apple-20261116.md`; autocomprobación de tokens y componentes citados | PASS: copia con hash idéntico (`40b693a0…acb95ded`) antes y después; 0 discrepancias de tokens y componentes citados; hashes del nuevo en la sección 3 | 2026-11-16 y 2026-11-17 | sección 3 (U5) |
| RDS-F5-06 destino de `docs/redesign/` | exom-admin | — | decisión del propietario | PASS: se conserva como referencia permanente (D23, punto 1) | 2026-11-16 | plan, D23 |
| RDS-F5-07 criterios RDS-F0…F5 trazados a evidencia del resultado final | exom-admin | `840366f` | este documento | PARCIAL: criterios de F5 trazados en esta tabla. No se ha hecho en esta sesión una revisión completa de F0…F4-bis; su trazabilidad está en los README de evidencias de cada fase (`admin-premium-redesign-f0-20261115`, `…-f4b-20261116`, `…-f4f-20261116`, `…-f4bis-20261116`, entre otros) | 2026-11-17 | sección 8 |
| Reglas D7 y rutas sensibles | exom-admin | `840366f` | `git diff --stat 37df692 HEAD -- 'src/features/*/api.ts' 'src/features/*/schemas.ts' 'src/features/*/types.ts' src/lib src/hooks src/index.css src/App.tsx`; `git diff --stat 37df692 HEAD -- src/components/ui package.json package-lock.json` | PASS con cambios declarados: `api.ts`, `schemas.ts`, `src/lib`, `src/hooks` y `App.tsx` sin cambios; `src/features/trainings/types.ts` (+6 −1: función de estilo `getTrainingAccentSoftTextColor`, presentacional, verificada por la revisión); `src/index.css` (+42 −5: token de texto atenuado en oscuro, `--training-accent-text-mix`, `scroll-padding`); `src/components/ui` (16 ficheros, +449 −41: accesibilidad, ver sección 3); `package.json` y `package-lock.json` (U4). Sin lógica de negocio, llamadas a la API, rutas ni estructuras de datos | 2026-11-17 | secciones 3 y 5 |
| Tests existentes no debilitados | exom-admin | `840366f` | `git diff --name-status 37df692 HEAD -- '*.test.ts' '*.test.tsx' '*.snap'` | PASS: 15 `A` y 20 `M` (13 tests y 7 `.snap`), 0 `D`. Ajustes de contrato declarados: «Close» → «Cerrar diálogo» / «Cerrar panel» (5 aserciones), contrato del relleno inferior de `app-layout.test.tsx` y snapshots de caracterización (verificado por script que solo cambian atributos y clases de accesibilidad) | 2026-11-17 | sección 3 (U1) |
| Lint | exom-admin | `840366f` | `npm run lint` | PASS: exit 0, 0 problemas | 2026-11-17 | log `f5-final-*.log` fuera del repo (scratchpad de la sesión) |
| Tests | exom-admin | `840366f` | `npm test -- --run` (dos ejecuciones seguidas) | PASS en las dos ejecuciones seguidas: 184 ficheros / 1631 tests cada una, 0 FAIL, 0 snapshots obsoletos (base al final de F4-bis: 169 ficheros / 1559 tests) | 2026-11-17 | log `f5-final-*.log` fuera del repo |
| Build | exom-admin | `840366f` | `npm run build` | PASS: exit 0, 0 `error TS`, sin aviso de chunk grande; 78 ficheros JS; mayores chunks en kB/gzip: `vendor-charts` 405,15/110,07, `index` 285,38/87,13, `vendor-ui` 211,64/54,80, `vendor-utils` 171,04/55,46, `vendor-firebase` 164,59/35,00, `vendor-react` 142,29/45,78, `progress-page` 140,60/37,01, `trainings-page` 90,58/23,29; CSS 112,73 kB / gzip 19,52; `dist/fonts`: `barlow-800.woff2` 33128 B, `dm-sans-400.woff2` 19184 B, `dm-sans-600.woff2` 19148 B | 2026-11-17 | log `f5-final-*.log` fuera del repo |
| Diff | exom-admin | `840366f` | `git -c core.whitespace=cr-at-eol diff --check 37df692 HEAD` | PASS: limpio, y también el del árbol de trabajo. `git diff --shortstat 37df692 HEAD`: 185 ficheros, +6921 −4629 (bajo `src`: 175 ficheros, +6918 −4530); `package.json`, `package-lock.json`, `vite.config.ts`, `index.html` y `public`: 10 ficheros, +3 −99; rutas sensibles de datos (`src/features/*/api.ts`, `schemas.ts`, `types.ts`, `src/lib`, `src/hooks`, `src/App.tsx`): solo `src/features/trainings/types.ts` (+6 −1); `npm ls --depth=0` sin `missing` ni `extraneous` y los tres paquetes retirados ausentes | 2026-11-17 | `git` sobre `37df692..840366f` (reproducible) |
| CI remoto | exom-admin | — | — | NOT_RUN (nada subido) | 2026-11-17 | sección 10 |
| Dispositivo real, teclado virtual, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-17 | sección 9 |

## 3. Notas por unidad

- **U4 (RDS-F5-04, `9e69954`)**: retirados `next-themes`, `@vercel/analytics` y `@vercel/speed-insights`. 0 imports de los tres paquetes en `src` (verificado antes de retirar y por la revisión independiente). `package.json` −3 líneas; `package-lock.json` −93 líneas, solo las 3 entradas, 0 transitivos; `vite.config.ts` pierde `'next-themes'` de `manualChunks`. Los 79 chunks JS y el CSS tienen los mismos tamaños antes y después, porque ya no se importaban.
- **U3 (RDS-F5-03, `6d838fc`)**: (a) chunks: ninguno supera 650 kB; el mayor, `vendor-charts`, 405,15 kB, sin cambio. Frente a la base de F0 (`727ffb3`): JS total +6,8 % (2.319,36 → 2.477,12 kB) y CSS de 75,44 a 111,26 kB en el build de `9e69954` (112,9 kB en el de `4e237b3`); la atribución es de causa probable, no medida módulo a módulo (detalle en `rendimiento.md`). (b) Fuentes: de 95.092 B en woff (92 B por encima de 95.000 B en kB decimales, ambiguo según la unidad) a 71.460 B en woff2 (barlow-800 33.128, dm-sans-400 19.184, dm-sans-600 19.148), −23.632 B; el propietario decidió convertir. Conversión sin pérdida con fontTools 4.53.1 y brotli 1.2.1 en un entorno virtual aislado fuera del proyecto (descarga de `brotli` autorizada expresamente por el propietario); equivalencia verificada: tablas, glifos (571, 439 y 439), `cmap`, métricas y contornos idénticos, anchos de texto idénticos en 48 de 48 mediciones en navegador; solo se solicitan `.woff2` (3 peticiones, 0 `.woff`). (c) LCP: F0 no registró base; se midió la base `727ffb3` frente a la actual en worktrees temporales `lcp-base` y `lcp-actual` (autorizado expresamente por el propietario; eliminados al terminar) con la regla declarada antes de medir. `/login` en producción: sin limitación 140–149 → 154–159 ms; con CPU 4x y Fast 4G, tras repetir con la máquina libre, las 4 combinaciones pasan (390 claro 1.032 → 1.130 ms, +9,5 %, n = 20); el FAIL inicial de 390 claro (1.748 → 2.511 ms, +43,6 %) no se reprodujo y se clasifica como ruido por carga de la máquina. Dashboard, solo medible con el arnés en modo desarrollo: 1440 PASS (1.046 → 1.186 ms, n = 12); 390 FAIL numérico (1.068 → 1.304 ms, +22,1 %, n = 16, límite 1.225), atribuido a los módulos sin empaquetar del modo desarrollo (104 → 131 peticiones antes del LCP) y a que el `index.html` del arnés no precarga fuentes; no existe en producción. Coste real estimado del rediseño: unos 100 ms con limitación y unos 10 ms sin ella; las fuentes explican 16–30 ms; ninguna variante probada (precarga de la tercera fuente, `font-display: optional`, sin precargas) lo mejora de forma apreciable; sin corrección aplicada. ID abierto: `RDS-F5-LCP-01`.
- **U1 (RDS-F5-01, `daf9541`, `5a7d487`, `4e237b3`, `9ae5fdd`, `840366f`)**: auditoría inicial sobre `9e69954` (108 cargas: 27 configuraciones × 2 temas × 1440/390; más 320 y 720; diálogos y formularios vacíos): 18 defectos A-1 a A-18 (5 altos, 7 medios, 6 bajos), 0 rutas PASS. Cuatro rondas de corrección y tres verificaciones en navegador (sección 5). Qué se corrigió: el foco nunca queda oculto (`scroll-padding` y relleno inferior de `main`); título de documento por ruta; enlace «Saltar al contenido» e indicador de foco en `main`; nombres accesibles en selectores, botones de icono y 11 campos que solo tenían `placeholder` (más «Nombre de la variante» y el selector de color); `aria-invalid` y errores asociados, incluidos los mensajes en línea de «Nueva plantilla»; `aria-describedby` solo con ids presentes en el formulario compartido (de 59 referencias colgantes a 0); objetivos táctiles de 44 px por debajo de 768 px; contraste del texto atenuado en oscuro (`--muted-foreground` `#8a9086` → `#949a90`, mínimo 5,08:1; fila seleccionada del buscador 4,57:1); asterisco visible y `aria-required` en los campos obligatorios (27 formularios); `aria-hidden` en 255 iconos decorativos de lucide en 102 ficheros; gráficos de dispersión sin `role=img` expuestos; desborde del editor de autoasignación; cabecera de tabla recortada (`scroll-px-6` en `Table`, `840366f`). Cierra `RDS-F4-F-TOUCH-01`, `RDS-F4-F-TOUCH-02` y `RDS-F4B-CONTRAST-01`. Cambio de nombre accesible existente: el botón de cierre de diálogos y hojas pasa de «Close» a «Cerrar diálogo» / «Cerrar panel» (5 aserciones de test ajustadas). Rutas sensibles: ver fila D7 de la sección 2; `src/features/trainings/types.ts` solo añade `getTrainingAccentSoftTextColor` (estilo) y `src/components/ui/command.tsx` solo añade `aria-hidden` a su icono.
- **U2 (RDS-F5-02)**: PASS el 2026-11-17 (sección 11); antes `NOT_RUN`. Flujos de feedback, progreso y aprobaciones en iOS y Android a 390 px; incluye `RDS-F4B-KEYBOARD-01` (teclado virtual de Android sobre la hoja del buscador). Lo debe ejecutar el propietario con modelo y versión del dispositivo.
- **U5 (RDS-F5-05)**: `EXOM/DESIGN.md` anterior (SHA-256 `40b693a04ee09cab54649709803c25fd6edfd2b7073488c9f44d440accb95ded`) copiado a `EXOM/docs/archive/DESIGN-apple-20261116.md` con hash idéntico verificado antes y después (comprobado de nuevo el 2026-11-17). El nuevo `EXOM/DESIGN.md` se generó desde `src/index.css` y `src/components/ui` en `daf9541` (570 líneas, `393ad33751dd5c17c03d126e87a9c465ff0d30782293fa9ac1a39f450f82fa47`), se actualizó a `9ae5fdd` (596 líneas, `7cc9c3ba60a6c415564be36a0845f4039839aec3cae2ad34baa136e7e6fcdbb4`) y el 2026-11-17 se añadió una frase en la entrada de `Table` por el `scroll-px-6` de `840366f` (596 líneas, `4356165bd3aee7670dfc22b75ae8f33b66f7435e0cdfb8d5356aac19be0936c3`). Autocomprobación de tokens y componentes citados: 0 discrepancias (hecha sobre `9ae5fdd`; la frase añadida no introduce tokens nuevos).
- **U6 (RDS-F5-06)**: decisión del propietario (2026-11-16): `docs/redesign/` se conserva como referencia permanente.

## 4. Revisiones independientes

Tres revisiones (revisor en Sonnet, esfuerzo alto), 0 bloqueantes en las tres.

| Rango | Veredicto | Comprobaciones | Hallazgos |
| --- | --- | --- | --- |
| `37df692..daf9541` | ACCEPT WITH FOLLOW-UPS | R1–R7 PASS | G-1 a G-4 |
| `daf9541..4e237b3` | ACCEPT WITH FOLLOW-UPS | R1–R8 PASS (R3 con hallazgo menor H-2) | H-1 a H-7 |
| `4e237b3..9ae5fdd` | ACCEPT WITH FOLLOW-UPS | R1–R6 PASS | J-1 a J-4 |

| ID | Hallazgo | Resultado |
| --- | --- | --- |
| G-1 | Medio. `max-md:h-11` de `Input`/`Select` gana a las alturas compactas `h-7`/`h-8`/`h-9` de los consumidores, de modo que las filas densas crecen por debajo de 768 px junto a botones de 28–36 px | Corregido en `5a7d487` y `9ae5fdd` (botones adyacentes a 44 px y filas alineadas; verificado en navegador: 0 px de desalineación en 68 exploraciones a 390). El detalle de esta primera revisión lo entregó el revisor en su informe; no existe un `f5-revision.md` |
| G-2 | El contorno de foco de `main` tras el enlace de salto no se veía (en Tailwind 4 `outline-none` fija el estilo a `none`) | Corregido (`app-layout.tsx`: `outline-solid` con `outline-2` y `-outline-offset-2`; 2 px, 14,28:1 oscuro y 6,76:1 claro) |
| G-3 | El nombre accesible del combobox de destinatarios ya no incluye el resumen de la selección | Abierto, bajo |
| G-4 | `any` en `use-document-title.ts` | Corregido (`anyRoleItem`) |
| H-1 | `Label` con `asChild` lanzaba `React.Children.only` | Corregido; sin uso en `src` hoy (ver J-3) |
| H-2 | Campos obligatorios por esquema sin marcar (diálogos de administrador, usuario, perfil, métricas, rol, copia de semana, filas de ejercicio) | Corregido en `9ae5fdd` (A11Y-21) |
| H-3 | Dos `FormDescription`/`FormMessage` en un `FormItem`: el cleanup de uno apagaba el indicador del otro | Corregido (contadores en `form.tsx`) |
| H-4 | `scroll-padding-bottom` incondicional (96 px desde md; 76 px bajo md con barra) | Abierto, bajo |
| H-5 | Estado transmitido solo por icono en dos puntos (`send-notification-dialog.tsx`, `training-exercise-picker.tsx`), preexistente | Abierto, bajo |
| H-6 | Bajo. Cambios no estrictamente mínimos: renombrado de una variable local en `use-document-title.ts`, retirada de ~20 `max-md:h-11` redundantes, test de guardia de iconos sobre 5 pantallas y aserciones de clase en `app-layout.test` | Anotado, sin cambio |
| H-7 | `scrollIntoView` al enfocar «Cuerpo» saltaba con el puntero | Corregido (`pointerdown` en una ref; Tab recoloca, clic no desplaza) |
| J-1 | Medio. La marca que distingue el foco por puntero en el editor de plantillas podía quedar activa tras un toque cancelado o un clic en la barra de desplazamiento y suprimir el siguiente `scrollIntoView` por teclado | Corregido en `840366f` (se limpia en `pointerup` y `pointercancel`; 2 tests que fallan sin el cambio) |
| J-2 | «Repeticiones objetivo» marcado como obligatorio también en filas heredadas con `id`, que el esquema exime | Abierto, bajo |
| J-3 | `Label` con `asChild` y `required` a la vez no está soportado; sin uso en el repo | Abierto, bajo |
| J-4 | Huecos de test en marcas condicionales | Abierto, bajo |

`840366f` (7 ficheros, +92 −35) no ha tenido revisión independiente: verificado por el diff del orquestador, 3 tests nuevos que fallan sin el cambio y snapshots que solo añaden `scroll-px-6` (34 líneas en 3 ficheros).

## 5. Accesibilidad (RDS-F5-U1)

Evolución del resultado por ruta (27 configuraciones):

| Commit | Alcance medido | PASS | FAIL |
| --- | --- | --- | --- |
| `9e69954` | auditoría inicial, matriz completa | 0 | 27 |
| `daf9541` | re-auditoría, matriz completa | 4 | 23 |
| `4e237b3` | matriz completa | 19 | 8 |
| `9ae5fdd` | verificación dirigida de los puntos corregidos y pasada global de regresión de 108 cargas (la matriz completa se midió en `4e237b3`) | 26 | 1 (`/exercises`, `RDS-F5-A11Y-23`) |
| `840366f` | corrige A11Y-23; verificación del punto A11Y-23 en navegador sobre el código real (adenda de `a11y-por-ruta.md`): 0 paradas recortadas en 6 tablas a 768 y 1023 px; `/exercises` a 768 px: «Nombre» con `scrollLeft` 0 y 100 % visible (antes 72 y 15 de 75 px); sin regresión a 390 y 1440 px. No es una re-auditoría completa | 27 | 0 |

Sobre `9ae5fdd`: 24 de los 25 IDs `RDS-F5-A11Y-nn` originales cerrados y verificados (02, 10, 20, 21, 22, 24 y 25 en esa pasada; 01, 03–09 y 11–19 desde `5a7d487` y `4e237b3`), con A11Y-23 cerrado en `840366f` (verificación dirigida de ese punto; ver la adenda de `a11y-por-ruta.md`); regresiones funcionales atribuibles a `9ae5fdd`: 0. Los detalles por ruta, la evolución de A-1 a A-18 y las 135 capturas de la matriz (136 con la de `840366f`, ver el índice) están en `a11y-por-ruta.md` y `capturas-a11y/`.

IDs y observaciones abiertas tras `840366f` (ninguno cambia el veredicto de una ruta; aceptación de todos: decisión del propietario o corrección en una fase posterior):

| ID | Gravedad | Alcance | Motivo |
| --- | --- | --- | --- |
| `RDS-F5-A11Y-26` | bajo | Detalle de solicitud, «Motivo de rechazo» (SUPER_ADMIN, solicitud ajena) | Con el campo vacío el error es solo un aviso («El motivo debe tener al menos 10 caracteres»): sin `aria-invalid` ni mensaje en línea asociado (`approval-detail-dialog.tsx`) |
| `RDS-F5-A11Y-27` | bajo | «Añadir métricas» de clientes, «Peso (kg)» | La regla de grupo «al menos una métrica» marca el error en «Peso (kg)», que no tiene marca de obligatorio; ninguna medida es obligatoria por sí sola (`client-metric-dialog.tsx`) |
| R-7 | menor | Por debajo de 768 px, páginas cortas | El relleno inferior fijo de `main` (132 px, consecuencia de A11Y-02) deja 76–100,5 px al final de páginas largas y añade hueco en páginas cortas; la lista vacía de `/exercises` pasa a desplazar 55 px. Decisión del propietario |
| H-4 | bajo | `scroll-padding-bottom` incondicional | Afecta solo a desplazamientos de foco y anclas |
| H-5 | bajo | `send-notification-dialog.tsx`, `training-exercise-picker.tsx` | Estado transmitido solo por icono; preexistente |
| J-2 | bajo | Filas heredadas con `id` en el editor de entrenamientos | «Repeticiones objetivo» aparece marcado como obligatorio aunque el esquema las exime |
| J-3 | bajo | `Label` | Combinar `asChild` con `required` no está soportado; sin uso en el repo |
| J-4 | bajo | Tests | Huecos de test en marcas condicionales |
| G-3 | bajo | Combobox de destinatarios | El nombre accesible ya no incluye el resumen de la selección |
| Filas de filtros por grupo | observación nueva, sin ID (bajo) | `/diets` y `/trainings` a 768 px (`div.flex gap-3 overflow-x-auto pb-2`) | Una parada de foco por fila queda recortada (77,8 % y 97,4 % visible; no a 1023 px); no es la tabla ni la barra lateral; no medida antes ni corregida. Propuesta: `scroll-px-*` en ese contenedor en una fase posterior |
| Paneles altos | excepción documentada | 5 paneles de pestaña de más de 838 px (users, users/:id, clients/:id, badges, progress) | 2,3–5,9 % bajo la barra inferior; no pueden despejarse |

Limitaciones: arnés con StrictMode (el retorno de foco al cerrar diálogos de crear es `NOT_RUN` en navegador; cubierto por `dialog.test.tsx:80`), aviso de versión solo simulado, sin lector de pantalla, sin dispositivo real, sin Safari ni Firefox. Sobre `9ae5fdd` no se repitió la matriz completa: contraste, objetivos táctiles (salvo la casilla de horario), indicador de foco, reflujo a 320 y 720 px, trampas y 768/1023 conservan la medición de `4e237b3`.

## 6. Rendimiento (RDS-F5-U3)

Resumen en la fila RDS-F5-03 de la sección 2 y en la nota de U3. Cifras y método completos en `rendimiento.md`: chunks por fichero frente a la base de F0 (sección 1), fuentes en woff y woff2 (secciones 2 y 2 bis), LCP histórico sin base (sección 3), LCP frente a la base (sección 6) e investigación de los dos FAIL (sección 7). La regla de veredicto del LCP se declaró antes de medir y no se cambió. En el borde: en 5 de las 10 combinaciones de la sección 6 el elemento LCP difiere entre base y actual por el propio rediseño.

## 7. Decisiones del propietario (2026-11-16; D23 del plan)

1. `docs/redesign/` se conserva como referencia permanente.
2. `RDS-F5-A11Y-15`: asterisco visible y `aria-required` en los campos obligatorios.
3. `RDS-F5-A11Y-05`: mensaje de error en línea en «Nueva plantilla».
4. `RDS-F5-A11Y-04`: corregir la reserva del aviso de versión.
5. `RDS-F5-A11Y-12`: `aria-label` en los 11 campos que solo tenían `placeholder`.
6. `RDS-F5-A11Y-13`: `aria-hidden` en los iconos decorativos ahora.
7. Fuentes a woff2, con autorización expresa para descargar `brotli` de PyPI en un entorno virtual aislado.
8. Autorización expresa de la medición de LCP con worktrees temporales.
9. Ante el FAIL de LCP: investigar la causa y corregir solo si la corrección es acotada y medida.
10. Los tres campos de dietas sin etiqueta visible (tipo y nombre de la comida, nombre de la variante) se dejan sin asterisco visible.
11. El borrado múltiple en catálogos es una funcionalidad nueva fuera de este plan, en su propia sesión y rama (`feat/admin-borrado-multiple`), en pausa hasta la fusión de F5.

## 8. Abiertos para el propietario

- RDS-F5-U2 (prueba en móvil real, iOS y Android a 390 px; incluye `RDS-F4B-KEYBOARD-01`): `NOT_RUN`.
- `RDS-F5-LCP-01` (medio): el Dashboard a 390 queda en FAIL numérico en modo desarrollo del arnés (+22,1 %), clasificado como artefacto. Aceptación: decisión del propietario o medición del Dashboard en producción con una sesión de prueba.
- R-7 (menor): aceptar o ajustar el hueco inferior de las páginas en móvil.
- Abiertos de accesibilidad de la sección 5 (`RDS-F5-A11Y-26`, `-27`, H-4, H-5, J-2, J-3, J-4, G-3, la observación de las filas de filtros por grupo y la excepción de los paneles altos).
- RDS-F5-07: la trazabilidad de F0…F4-bis a evidencia del resultado final no se ha revisado en esta sesión; ver los README de cada fase.
- Revisión de las capturas (sección 10) y de las de F4-bis, que quedó pendiente.

## 9. No verificado

Dispositivo real y teclado virtual; lectores de pantalla; Safari y Firefox; API real y autenticación real (el arnés acredita aspecto y forma de las peticiones, no comportamiento); aviso de versión real (solo simulado); Dashboard en producción; CI remoto (`NOT_RUN`, nada subido); recap-detail con los dos campos de la tarjeta heredada de revisión (no se renderiza en el fixture, cubierto por `placeholder-only-fields.a11y.test.tsx`).

## 10. Subida pendiente

- Nada de F5 está subido; el push lo hace el propietario (D18): `git push -u origin feat/admin-rediseno-f5-cierre`. La rama se creó con `--no-track` y no tiene upstream.
- Después: PR a `develop`, CI remoto en verde (3 checks) y merge con merge commit (D17, D18). Tras el merge, avisar a la sesión del borrado múltiple (`feat/admin-borrado-multiple`).
- Pendientes del propietario: RDS-F5-U2, revisión de capturas, aceptación de `RDS-F5-LCP-01` y de R-7.
- Higiene de procesos: servidores del arnés, de vista previa y Chrome parados por PID tras cada ronda; worktrees temporales `lcp-base` y `lcp-actual` eliminados. Verificación final de procesos: tras los checks, 0 procesos `node`/Vite/Vitest/esbuild/Chrome asociados al worktree o al scratchpad y ningún puerto del arnés (5190–5201, 9333–9335) a la escucha. Tras la verificación de A11Y-23: Vite (PID 27824, con su hijo 31472) parado por PID; los 3 Chrome del arnés (PID 29528, 8076 y 34260) cerrados por sus scripts; puertos 5192 y 9333 sin escucha; ningún shell en segundo plano vivo.
- Consumo (dato para D17 y D22): tope indicado 75 % semanal sin Fable; mediciones del 2026-11-16: 64 % al iniciar la sesión, 65 % tras F4-bis, 67 % a las 20:12 UTC; el propietario indicó después que el consumo no es una restricción. Valor al cierre (2026-11-17, ~00:40 UTC): semanal de todos los modelos 77 %, Fable 12 %, es decir 71 % sin Fable; ventana de 5 h al 28 %. El tope de 75 % no se alcanzó.

## 11. Cierre (2026-11-17, tarde)

Decisiones del propietario. F5 pasa de REVIEW_REQUIRED a DONE (cierre técnico, no despliegue: fusionada en `develop`, PR #65, merge `50a319b`; `main` = `312afef` sin tocar; nada desplegado). Las secciones 8 y 10 anteriores describen el estado previo y se conservan como histórico.

| Criterio / asunto | Resultado | Detalle |
| --- | --- | --- |
| RDS-F5-U2 / RDS-F5-02 | PASS | Prueba en móvil real del propietario, flujos de D2: iPhone 16 Pro (última versión de iOS disponible a 2026-11-17) y Samsung S25 Ultra (última versión de Android disponible a 2026-11-17); resultado «perfecto». El propietario no indicó el número de versión exacto. |
| `RDS-F4B-KEYBOARD-01` | PASS | Teclado de Android sobre la hoja del buscador, incluido en la prueba anterior. |
| Revisión de capturas | Conforme | Las capturas de esta carpeta (`admin-premium-redesign-f5-20261116`) fueron revisadas y dadas por conformes por el propietario. |
| `RDS-F5-LCP-01` (medio) | APLAZADO, no bloquea F5 | Destino: medir el LCP real del Dashboard a 390 px en producción con sesión, tras la release `develop`→`main` del admin. Criterio: si supera 1.225 ms se reabre; si no, se cierra. La parte de LCP de RDS-F5-03 queda aplazada por decisión del propietario, no como PASS. |
| R-7 (menor) | APLAZADO, no bloquea F5 | Relleno inferior fijo de 76 px en móvil: mejora futura (relleno calculado en lugar de fijo). |
| Revisión independiente de `840366f` | ACCEPT WITH FOLLOW-UPS, 0 bloqueantes | Hecha el 2026-11-17 (Sonnet, esfuerzo alto, solo lectura, sin ejecutar tests). Snapshots: única diferencia `scroll-px-6` (confirmado). Complementa la nota de la sección 4 («sin revisión independiente»). |

Hallazgos de la revisión de `840366f`:

| ID | Gravedad | Hallazgo | Resultado |
| --- | --- | --- | --- |
| K-1 | medio | En `src/features/notification-templates/components/template-editor-form.tsx:133-135` el reinicio de la marca en `onPointerUp` podría anular en táctil la supresión del salto de H-7 | Descartado por la prueba del propietario en móvil real («no salta») |
| K-2 | menor | El test «un clic sin foco» de `template-editor-form.focus.test.tsx` fija un orden de eventos que `fireEvent` no reproduce como un toque real | Abierto; aplazado a la próxima tanda de tests del admin |
| K-3 | menor | `table.test.tsx` comprueba la clase y no el comportamiento a 768 px | Abierto; aplazado a la próxima tanda de tests del admin |
| K-4 | menor | Dos arreglos sin relación en un commit | Informativo |

## Índice de la carpeta

| Fichero | Contenido |
| --- | --- |
| `README.md` | Este documento |
| `a11y-por-ruta.md` | Estado final de accesibilidad por ruta (sobre `9ae5fdd`), evolución A-1 a A-18, verificaciones, tabla de IDs `RDS-F5-A11Y-01` a `27` y adenda del 2026-11-17 con la verificación de A11Y-23 sobre `840366f` |
| `rendimiento.md` | Chunks, fuentes, LCP frente a la base e investigación de los FAIL |
| `capturas-a11y/` | 136 PNG (117 de `4e237b3`, 18 `a11y-final-*` de `9ae5fdd` y 1 de `840366f`: `a11y-final-exercises-768-tabla-foco-840366f.png`) |
| `capturas-fuentes/` | 2 PNG (`fuentes-woff2-dashboard-dark-1440.png`, `fuentes-woff2-login-dark-1440.png`) |

Nota: `a11y-por-ruta.md` está redactado sobre `9ae5fdd`; la verificación de `RDS-F5-A11Y-23` sobre `840366f` (2026-11-17) consta en su «Adenda» final y en este README.
