# Evidencias F4 lote D — Asignaciones (rediseño premium de exom-admin)

Estado: REVIEW_REQUIRED. Implementado y confirmado en local (HEAD de código `13cca7e`). Revisión independiente recibida (ACCEPT WITH FOLLOW-UPS); correcciones en sección 4. Pendiente: commit de capturas y evidencias, revisión de capturas por el propietario, push, PR, CI remoto y merge.

Plan: `EXOM/docs/plans/admin-premium-redesign.md` (sección 4, F4, lote D). Fecha: 2026-11-16. Autorización: D17 (lotes B–F y F5 con commits locales, PR a `develop` y merge con CI en verde; los push los hace el propietario).

Rama: `feat/admin-rediseno-f4d-asignaciones`, creada desde `feat/admin-rediseno-f4c-builders` (`e5da4be`). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. HEAD de código: `13cca7e`. Entorno (no secreto): Windows 11, Node v22.21.0, arnés sintético sin red (`127.0.0.1:5192`, reloj fijo hoy = 2026-11-15), Chrome headless con emulación de dispositivo por CDP. Nada está subido.

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `1289694` | test de caracterización de Asignaciones | RDS-F4-D1 |
| `2f6087a` | extracción sin cambio visual | RDS-F4-D1 |
| `d72785b` | margen del test de arrastre | RDS-F4-C-FLAKY-01 |
| `c74d162` | estilo de Asignaciones | RDS-F4-D1 |
| `b55e4dc` | P5: «Hoy», doble clic/Intro abre el editor | RDS-F4-09 |
| `255d11e` | fix: rejilla mensual desplazada en zonas UTC+ (`getUTCDay()`), con regresión | GRUPO 1, fallo previo al rediseño (F-6) |
| `46523ce` | test(admin): ampliar el margen de tiempo a todos los tests de arrastre de comidas | RDS-F4-C-FLAKY-01 |
| `13cca7e` | fix: correcciones de la revisión y de las capturas del lote D (F-3, F-4, V-1, V-2, V-3, V-5) | GRUPO 2 |
| (pendiente) | test(admin): capturas y evidencias del lote D de F4 con el arnés sintético | `capturas-f4d/` y este README |

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F4-01 capturas frente al boceto | exom-admin | `13cca7e` de la ronda de correcciones (commits pendientes) | arnés sintético, Chrome headless por CDP: 1440 (viewport 900 o 1440x2400 en mes) y 390 nativo (emulación móvil), oscuro y claro; regeneradas tras las correcciones | PASS con divergencias anotadas: 41 PNG en `capturas-f4d/` (38 anteriores regeneradas + 3 nuevas: diálogos a 390 en tema claro). Sin scroll horizontal en las 41 (`scrollWidth === innerWidth`), 0 líneas `[fixture-api] 404`, 0 errores de consola (solo el aviso de React Router «No `HydrateFallback`»); 14/14 comprobaciones funcionales PASS | 2026-11-16 | `capturas-f4d/`, secciones 3 y 5 |
| RDS-F4-09 P5, verificación en navegador real | exom-admin | `b55e4dc` | script CDP con ratón y teclado reales a 1440 oscuro | PASS: doble clic abre el editor del día pulsado (mié 18); Intro en un día enfocado abre el editor (vie 20); Espacio selecciona sin abrir el editor; «Hoy» desde `date=2026-11-23` lleva a `date=2026-11-15` conservando `clientId` y `view` (semana y mes) | 2026-11-16 | sección 3 |
| Foco visible con teclado | exom-admin | `b55e4dc` | Tab real por CDP, `:focus-visible` y outline calculado | PASS: día, «Hoy» y control de vista con outline 2px sólido (oscuro `rgb(186, 242, 58)`, claro `rgb(63, 92, 0)`) | 2026-11-16 | `assignments-focus-*` |
| Objetivos táctiles ≥ 44 px a 390 | exom-admin | `13cca7e` | `getBoundingClientRect` y alto del pseudo-elemento `::after` (el `Button` y el `SegmentedControl` amplían el área táctil a 44 px por debajo de `md`), a 390 en semana, mes y barra de selección | PASS: área efectiva 44 px en los 9 controles de la barra (semana y mes) y en los 4 de la barra de selección. Alto visual: el selector de cliente pasa de 40 a 44 (`max-md:h-11`); el resto conserva su alto visual (36 o 40) y llega a 44 con el pseudo-elemento. Antes de la corrección, medido solo con `getBoundingClientRect`, era FAIL (40/36) | 2026-11-16 | sección 4 |
| Reglas D7 | exom-admin | `b55e4dc` | `git diff e5da4be..b55e4dc --stat -- 'src/features/*/api.ts' 'src/features/*/schemas.ts' src/lib src/hooks/use-auth.ts src/components/ui package.json package-lock.json` | PASS: salida vacía | 2026-11-16 | sección 4 |
| Checks finales en `13cca7e` (sustituye a la ronda de correcciones) | exom-admin | `13cca7e` | `npm run lint`; `npm test -- --run` (dos ejecuciones seguidas); `npm run build`; `git -c core.whitespace=cr-at-eol diff --check`; D7 (`git diff --stat feat/admin-rediseno-f4c-builders -- 'src/features/*/api.ts' 'src/features/*/schemas.ts' src/lib src/hooks/use-auth.ts src/components/ui package.json package-lock.json`) | lint PASS (exit 0, 0 problemas); tests PASS las dos ejecuciones (157 ficheros / 1400 tests); build PASS (exit 0, 0 `error TS`); diff limpio; D7 salida vacía. Sin dependencias nuevas. Ronda previa sobre `b55e4dc` + cambios sin confirmar, historial: 3 ejecuciones con 1399 o 1398 de 1400 PASS; timeouts de 5000 ms en Dietas, ver RDS-F4-C-FLAKY-01 | 2026-11-16 | logs fuera del repo (`f4d-final-*.log`; ronda previa `f4d-u4-*.log`) |
| RDS-F4-C-FLAKY-01 | exom-admin | `46523ce` | `vi.setConfig({ testTimeout: 15000 })` en `diet-meals.sortable.test.tsx`; suite completa `npm test -- --run` ×2 | PASS (CLOSED): 2 de 2 en verde en `13cca7e`; sin cambio de aserciones | 2026-11-16 | secciones 3 y 7 |
| Regresión de la rejilla mensual (F-6) | exom-admin | `13cca7e` | `npm test -- --run src/features/assignments/components/month-grid-layout.test.ts` con el cálculo antiguo (`getUTCDay()`) y con el corregido (`getDay()`); `TZ=UTC` y `TZ=America/New_York` sobre `src/features/assignments` | ROJO: 12 de 28 fallan (Europe/Madrid y Pacific/Auckland); VERDE: 28 de 28. `src/features/assignments` en `TZ=UTC` y `America/New_York`: 83 de 83 PASS | 2026-11-16 | sección 4 |
| Revisión independiente del lote D | exom-admin | `b55e4dc` | revisión independiente más capturas | ACCEPT WITH FOLLOW-UPS: 0 bloqueantes, 0 altos, 0 medios, 6 bajos (F-3, F-4 y F-6 corregidos; F-1, F-2 y F-5 anotados) | 2026-11-16 | sección 4 |
| CI remoto | exom-admin | — | — | NOT_RUN (nada subido) | 2026-11-16 | sección 8 |
| Dispositivo real, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-16 | sección 7 |

## 3. Notas por unidad

- D1 (`1289694`, `2f6087a`, `c74d162`): primero test de caracterización, después extracción sin cambio visual, después estilo.
- `d72785b` (RDS-F4-C-FLAKY-01): margen del test de arrastre.
- `46523ce` (RDS-F4-C-FLAKY-01): margen a todos los tests de arrastre por teclado de `diet-meals.sortable.test.tsx`. Causa: superan 5000 ms bajo carga de la suite completa en local. Sin cambio de aserciones. CLOSED.
- P5 (`b55e4dc`, RDS-F4-09): botón «Hoy», marca «Hoy» en el día actual, doble clic o Intro abre el editor del día; Espacio conserva la selección.
- Cambios de marcado intencionados: el contador «N seleccionados» pasa a la barra de selección (ya no existe «0 seleccionados»); «Limpiar selección» es un botón de icono con `aria-label`; el título pasa a h1 (antes h2); `aria-pressed` en los días; mes en una sola lista responsive; Intro abre el editor (antes alternaba la selección).
- Capturas (41 PNG en `capturas-f4d/`, regeneradas tras las correcciones, solo SUPER_ADMIN, cliente `c11e0000-0000-4000-8000-000000000001`):
  - Semana con datos (`date=2026-11-16`): `assignments-week-superadmin-{dark,light}-{1440,390}.png`.
  - Semana con «Hoy» (`date=2026-11-09`): `assignments-week-today-superadmin-{dark,light}-{1440,390}.png`.
  - Mes: `assignments-month-superadmin-{dark,light}-1440x2400.png` y `assignments-month-superadmin-{dark,light}-390.png`.
  - Selección de 2 días: `assignments-selection-superadmin-{dark,light}-{1440,390}.png`.
  - Editor por doble clic: `assignments-editor-superadmin-{dark,light}-{1440,390}.png`.
  - Copiar semana, vista previa (destino 2026-11-23) y copiar selección: `assignments-copy-week-`, `assignments-copy-week-preview-` y `assignments-copy-selection-` con sufijo `superadmin-{dark,light}-{1440,390}.png` (12 imágenes; las 3 de `light-390` son nuevas).
  - Sin cliente: `assignments-no-client-superadmin-{dark,light}-1440.png` y `assignments-no-client-superadmin-dark-390.png`.
  - Foco con teclado: `assignments-focus-{dia,hoy,vista}-superadmin-{dark,light}-1440.png`.
- Las capturas a 390 de página se toman a altura completa (`captureBeyondViewport`): la barra de navegación inferior fija aparece a mitad de imagen; es un artefacto de la captura. El botón circular con flecha sobre la barra de selección a 390 es, según el DOM, el lanzador de TanStack Query Devtools del servidor de desarrollo, no del producto.

## 4. Revisión independiente

Veredicto: ACCEPT WITH FOLLOW-UPS. 0 bloqueantes, 0 altos, 0 medios, 6 bajos.

| ID | Hallazgo | Resultado |
| --- | --- | --- |
| F-1 | Doble clic o Intro abre el editor y sustituye la selección múltiple; cancelar no la recupera. | Comportamiento buscado y cubierto por tests. Sin cambio. |
| F-2 | Los títulos de los estados vacío y de error pasan a párrafo por `EmptyState`/`ErrorState`. | Igual que en lotes anteriores. Sin cambio. |
| F-3 | «Limpiar selección» dejó de deshabilitarse con `isBusy` (antes del rediseño sí). | Corregido: `SelectionBar` (`src/components/workspace/selection-bar.tsx`, fuera de `src/components/ui`) gana la propiedad opcional `clearDisabled` (por defecto `false`, sin efecto en otros consumidores) y la barra de Asignaciones pasa `clearDisabled={isBusy}`. Test nuevo en `selection-bar.test.tsx`. |
| F-4 | `weekAfter` sin usar y aserción vacía `expect(weekAfter).toHaveLength(7)` en `assignments-page.today-and-open.test.tsx`. | Corregido: eliminados la variable y la aserción (solo comprobaba la longitud de una constante; el test conserva las aserciones sobre `date` y la URL). |
| F-5 | La pista común («Clic en un día…») se repite por lector de pantalla. | Anotado, sin cambio. |
| F-6 | Rejilla mensual desplazada una columna en zonas UTC+ por `getUTCDay()` sobre una fecha de medianoche local. | Fallo previo al rediseño, confirmado en navegador (1 nov 2026, domingo, aparecía bajo «S»). Corregido en commit propio (ver abajo). |

F-6, causa y corrección. `assignments-month-grid.tsx` calculaba las celdas vacías iniciales con `parseISO(fecha).getUTCDay()`; `parseISO` devuelve medianoche local, que en zonas al este de UTC es el día UTC anterior, de modo que el día de la semana salía uno menos. Corrección: el cálculo se extrae a `getLeadingEmptyCells` (`month-grid-layout.ts`) y usa `getDay()` local. Resto de usos de `getUTCDay`/`getUTCDate`/`getUTCMonth` en la feature, revisados y sin cambio porque construyen siempre la fecha en UTC (`Date.UTC(...)` o `T00:00:00Z`) y leen en UTC, así que son coherentes: `assignment-editor-dialog.tsx:70,75,81`, `assignment-editor-state.ts:40`, `assignments-page.tsx:91`, `schemas.ts:15,27`, `rir-cycle-panel.tsx:51` y el helper de `assignments-page.today-and-open.test.tsx:63`. Regresión: `month-grid-layout.test.ts` fija `process.env.TZ` (Europe/Madrid, UTC, America/New_York, Pacific/Auckland), comprueba que la zona se aplicó (`getTimezoneOffset`) y verifica seis fechas explícitas. Rojo con `getUTCDay()` (12 de 28 fallan en Madrid y Auckland), verde con `getDay()` (28 de 28); determinista en CI (UTC) y en Windows. El snapshot de caracterización de la vista mes (2 snapshots) se había generado con el defecto en zona UTC+ (5 celdas vacías iniciales para el domingo 1 de marzo de 2026); se actualizó a 6 celdas iniciales, que es lo correcto, y pasa en `TZ=UTC`, `America/New_York` y en Madrid.

### Defectos de capturas, resultado tras la corrección

| ID | Resultado |
| --- | --- |
| V-1 | Corregido: en móvil el rótulo del periodo ocupa su propia línea a ancho completo y Anterior / Siguiente / Hoy van en una fila de tres botones (`flex-1`); en ≥ md se mantiene en línea. Comprobado en `assignments-week-today-superadmin-dark-390.png` y `assignments-month-superadmin-light-390.png`. |
| V-2 | Corregido: en la vista previa de copia la rejilla de 7 columnas pasa a 4 en `xl` (2 filas), con etiquetas de 11 px sin tracking, padding reducido y salto de palabra; «ENTRENAMIENTO», «PLAN NUTRICIONAL» y «Día de descanso» se leen completos, sin scroll horizontal. Ver `assignments-copy-week-preview-superadmin-dark-1440.png`. |
| V-3 | Medido: el `Button` y el `SegmentedControl` ya amplían el área táctil a 44 px por debajo de `md` con `::after`, así que Anterior / Siguiente / Hoy, Editar y Desactivar autoasignación, Editar o cancelar mesociclo, Semanal / Mensual y las acciones de la barra de selección (incluida «Limpiar selección») miden 44 px efectivos sin cambio. El selector de cliente (`SelectTrigger` de `components/ui`, sin pseudo-elemento) pasa de 40 a 44 con `max-md:h-11` en la feature. Sin tocar `src/components/ui`. |
| V-4 | «1 descansos»: texto previo al rediseño, no corregido (anotado). |
| V-5 | Corregido: el valor del select de dieta del editor queda en una línea (el nombre; las etiquetas se ocultan solo en el valor del disparador, no en la lista). Ver `assignments-editor-superadmin-light-1440.png`. |

## 5. Divergencias respecto a los bocetos (prevalece el código, S2) y defectos visuales observados

Divergencias:

- Eyebrow y descripción conservados.
- Selector de cliente = Select existente, no popover.
- Acciones «Seleccionar todos», «Copiar semana», «Editar/Desactivar autoasignación» visibles en lugar de en menús.
- El editor sigue siendo Dialog, no panel lateral.
- Panel RIR inline bajo el calendario.
- «Hoy» va después de «Siguiente».
- Cabecera de semana «MIÉ HOY» sin punto.
- Sin etiquetas «Propuesta».

Defectos visuales observados en las capturas (estado original; resultado de cada uno en la sección 4):

- V-1 (390, semana y mes, oscuro y claro, también sin cliente): el rótulo del periodo («9 de noviembre - 15 de noviembre», «noviembre de 2026») queda comprimido entre «Anterior» y «Siguiente» (47 px de ancho), se parte en 3-4 líneas y se solapa con «Siguiente». Ver `assignments-week-today-superadmin-dark-390.png` y `assignments-month-superadmin-light-390.png`.
- V-2 (1440, vista previa de copia semanal): las etiquetas «ENTRENAMIENTO» y «PLAN NUTRICIONAL» y «Día de descanso» se cortan o desbordan en las 7 columnas. Ver `assignments-copy-week-preview-superadmin-dark-1440.png`. El pie del diálogo (Volver / Confirmar copia) queda fuera de la vista y se alcanza con scroll del diálogo (comprobado: `overflow-y: auto`).
- V-3 (390): objetivos táctiles de 36-40 px (tabla de evidencias).
- V-4 (menor): «1 descansos» con plural incorrecto en el resumen del periodo.
- V-5 (menor, 1440 claro): en el editor, la etiqueta del selector de dieta se parte en dos líneas centradas («Dieta descarga 1900 kcal / descarga»).

## 6. Abiertos para el propietario

- Divergencias de la sección 5 y cambios de marcado de la sección 3.
- No corregidos, anotados: V-4 «1 descansos» (texto previo al rediseño); F-5 pista común repetida por lector de pantalla; F-1 la selección múltiple se sustituye al abrir con doble clic o Intro y cancelar no la recupera (buscado y cubierto por tests); F-2 títulos de estados vacío/error como párrafo.
- Revisión de las capturas regeneradas por el propietario.
- RDS-F4-C-FLAKY-01 CLOSED (`46523ce`). Observación sin issue: `diet-form-nutrition` agotó 5000 ms en una ejecución intermedia; no reproducido en las dos pasadas finales.
- Selector CSS `[&>span>span>span:nth-child(n+2)]:hidden` del select de dieta del editor: frágil ante cambios de la pieza Select.
- `clearDisabled` añadido a `src/components/workspace/selection-bar.tsx` (pieza compartida, fuera de `src/components/ui`): revisión del propietario.

## 7. No verificado

Dispositivo real; lectores de pantalla; Safari y Firefox; API real (el arnés acredita aspecto, no comportamiento; las mutaciones devuelven éxito genérico y la vista previa de copia usa datos del fixture); CI remoto (NOT_RUN); suite completa en `13cca7e`: PASS 2 de 2 (2026-11-16). Las 3 ejecuciones previas (`b55e4dc` + cambios sin confirmar) tuvieron 1 o 2 timeouts de Dietas; quedan como historial.

## 8. Subida pendiente

- Decisiones del propietario: D17 (ver plan). Nada está subido; el push lo hace el propietario.
- Estado: implementado y confirmado en local, HEAD de código `13cca7e`; REVIEW_REQUIRED. Push pendiente del propietario (D18): `git push -u origin feat/admin-rediseno-f4d-asignaciones`. Después: PR a `develop`, CI remoto en verde y merge (D17); revisión de capturas por el propietario.
