# Evidencias F4 lote A — Listas (rediseño premium de exom-admin)

Plan: `docs/plans/admin-premium-redesign.md` (sección 4, F4, lote A). Fecha: 2026-11-15. Autorización: F4 lote A (RDS-F4-A1 a A6) con commits locales solo (D16); sin push, PR, merge ni tag. Los lotes B–F y F4-bis siguen sin autorizar.

Rama: `feat/admin-rediseno-f4a-listas`, base `2cbc558` (HEAD de `feat/admin-rediseno-f3-shell`). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. Entorno (no secreto): Windows 11, Node v22.21.0, arnés sintético sin red (`127.0.0.1:5192`). Logs de checks en el scratchpad de la sesión (fuera del repo), con prefijos `f4/a1-` a `f4/a6-`, `f4/fix-` y `f4/final-`.

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `a42f7e2` | feat(admin): rediseñar la lista de Ejercicios con miniatura | A1 (P8) |
| `17535a8` | feat(admin): rediseñar la lista de Ingredientes | A2 |
| `79b83b8` | refactor(admin): separar la vista de Etiquetas en componentes sin cambio visual | A3, extracción |
| `d82e007` | feat(admin): rediseñar Etiquetas con filas, punto de color y barra de selección | A3, estilo |
| `795ec29` | feat(admin): rediseñar Retos con tira de cifras y filas | A4 |
| `cc359a7` | feat(admin): rediseñar Logros con icono en la lista y confirmaciones | A5 (P1, P8) |
| `822114d` | feat(admin): rediseñar Notificaciones con hora, vista previa y confirmación | A6 (P1, P3, P9) |
| `037338f` | fix(admin): permitir barras fijas al pie en móvil y tablet | fix del shell |
| `bc927b1` | fix(admin): correcciones de la revisión independiente del lote A de F4 | F-1 a F-7 y `aria-busy` |
| (pendiente) | test(admin): capturas y evidencias del lote A de F4 | capturas en `capturas-f4a/` y galería `galeria-f4a.html` |

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F4-01 capturas frente al boceto | exom-admin | `bc927b1` | arnés sintético en navegador, ambos temas, 1440 y 390 px | PASS con divergencias anotadas: 36 capturas iniciales más recapturas tras las correcciones; sin scroll horizontal de página en ninguna; consola solo con el 404 de `favicon.ico` del arnés y el aviso `HydrateFallback` | 2026-11-15 | `capturas-f4a/`, `galeria-f4a.html`, sección 5 |
| RDS-F4-02 parámetros de URL | exom-admin | `bc927b1` | `npm test -- --run` (tests de página) | PASS: Ejercicios `page`, `sort_by`, `sort_dir`, `training_usage`; Ingredientes `page`, `sort_by`, `sort_dir`; Retos `page`, `search`, `type`, `source`, `scope`, `status`; Logros `search`, `criteria_type`, `page`; Notificaciones `recipientId`, `status`, `search`, `page`, `stats_period` (`stats_from` y `stats_to` los gestiona el selector de periodo compartido, sin test propio en este lote) | 2026-11-15 | sección 3 |
| RDS-F4-03 tests, textos, `aria-label` y roles | exom-admin | `bc927b1` | `npm test -- --run`; muestreo de la revisión independiente | PASS: tests existentes sin modificar; textos, `aria-label` y roles conservados | 2026-11-15 | sección 3 |
| RDS-F4-04 sin cambios de lógica | exom-admin | `bc927b1` | `git diff 2cbc558..bc927b1` en hooks, `api.ts`, esquemas; `diff` de `badges-page.tsx` | PASS: sin cambios en hooks, `api.ts`, claves de query ni esquemas; en `badges-page.tsx` el bloque de estado, consultas, mutaciones y efectos es idéntico antes y después de la extracción (comprobado por el worker y de nuevo por la revisión independiente) | 2026-11-15 | sección 3 |
| RDS-F4-05 aprobación pendiente y flujos intactos | exom-admin | `bc927b1` | tests de página; revisión independiente | PASS: indicador de aprobación pendiente en todas las listas; subida de vídeo/miniatura, diálogos y guarda de cambios sin tocar | 2026-11-15 | sección 3 |
| RDS-F4-06 confirmaciones (P1) | exom-admin | `bc927b1` | tests de Logros y Notificaciones | PASS para Logros y Notificaciones: revocar logro, recalcular (cartera visible y selección) y «enviar a todos» piden confirmación; cancelar = 0 llamadas; confirmar = misma llamada y argumentos | 2026-11-15 | sección 3 |
| RDS-F4-08 hora en historial (P3) | exom-admin | `bc927b1` | tests de Notificaciones | PASS parcial: historial con `dd/mm/aaaa HH:mm` en hora local dentro de `<time dateTime>`; la fecha absoluta de Solicitudes es del lote B | 2026-11-15 | sección 3 |
| RDS-F4-12 miniatura e icono (P8) | exom-admin | `bc927b1` | tests; arnés | PASS: miniatura en Ejercicios (48×36) e icono en Logros (36×36), con `alt`, `loading="lazy"`, `referrerPolicy="no-referrer"` y respaldo ante URL nula o error. Los datos del arnés no traen `icon_url`: en navegador solo se vio el respaldo del icono de logro | 2026-11-15 | sección 3 |
| RDS-F4-13 vista previa y contadores (P9) | exom-admin | `bc927b1` | tests de Notificaciones | PASS parcial: vista previa tipo push y contadores 100/500 en el envío (límites del esquema existente, contando con `trim`); la parte de Plantillas (120/500) es del lote F | 2026-11-15 | sección 3 |
| Pruebas pedidas por el plan | exom-admin | `bc927b1` | `npm test -- --run` | PASS: test de humo añadido en exercises, ingredients, badges, challenges, achievements y notifications | 2026-11-15 | scratchpad `f4/final-*.log` |
| Reglas D7 | exom-admin | `bc927b1` | `git diff 2cbc558..bc927b1 --stat -- src/features/*/api.ts src/features/*/schemas.ts src/lib src/hooks src/components/ui src/components/page src/components/workspace src/index.css src/App.tsx package.json package-lock.json` | PASS: diff vacío. Tests: 13 ficheros de test nuevos (`A`) y ningún test preexistente modificado | 2026-11-15 | sección 3 |
| Checks finales | exom-admin | `bc927b1` | `npm run lint`; `npm test -- --run`; `npm run build`; `git diff --check 2cbc558 HEAD` | PASS: lint 0 problemas; 128 ficheros / 907 tests (base `2cbc558`: 115 / 835); build OK (0 `error TS`); `git diff --check` limpio | 2026-11-15 | scratchpad `f4/final-*.log` |
| Revisión independiente del lote A | exom-admin | `2cbc558..822114d` | revisor independiente (lint, test, build, reglas R1–R13) | ACCEPT WITH FOLLOW-UPS; R1–R13 PASS; correcciones en `bc927b1` | 2026-11-15 | sección 4 |
| Dispositivo real, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-15 | sección 7 |

## 3. Notas por unidad

- A1 (`a42f7e2`): lista de Ejercicios con miniatura de 48×36 px (P8) y respaldo.
- A2 (`17535a8`): lista de Ingredientes con las piezas de F2.
- A3 (`79b83b8`, `d82e007`): primero se extrae la vista de `badges-page.tsx` sin cambio visual; después el estilo (filas, punto de color, barra de selección).
- A4 (`795ec29`): Retos con tira de cifras y filas.
- A5 (`cc359a7`): Logros con icono de 36×36 px (P8) y confirmaciones de revocar y recalcular (P1). Textos: «¿Revocar el logro «NOMBRE» a USUARIO?», «¿Recalcular el logro «NOMBRE» para toda la cartera visible?», «¿Recalcular el logro «NOMBRE» para N cliente(s) seleccionado(s)?».
- A6 (`822114d`): Notificaciones con hora en el historial (P3), vista previa y contadores (P9) y confirmación de «enviar a todos» (P1): «¿Enviar la notificación a todos tus clientes?».
- Shell (`037338f`): `overflow-x-hidden` pasa a `overflow-x-clip` en el contenedor de contenido de `app-layout.tsx`; el primero anulaba `position: sticky` por debajo de 1024 px. Cambia una clase del shell de F3, fuera del alcance estricto del lote; justificado como dependencia directa.

## 4. Revisión independiente (`2cbc558..822114d`)

Veredicto: ACCEPT WITH FOLLOW-UPS, R1–R13 PASS.

Corregidos en `bc927b1`:

- F-1: la confirmación de «enviar a todos» mostraba como total la lista cargada, con tope de 200; ahora usa el total real o un texto sin cifra.
- F-2: recomprobación tras confirmar.
- F-3: texto «Con vídeo»/«Sin vídeo» para lectores de pantalla.
- F-4: el contador anuncia solo al cruzar umbrales.
- F-6: color destructivo del borrado y salto de layout en Etiquetas.
- F-7: `referrerPolicy`.
- `aria-busy` en los recuentos de Retos y Logros.

Hallados en las capturas a 390 px y corregidos:

- El diálogo de envío desbordaba con un título largo: la columna implícita `auto` de la rejilla del diálogo crecía con el texto sin salto de la vista previa.
- La barra de selección de Etiquetas no se veía; causa de fondo en el shell (`037338f`).

## 5. Divergencias respecto a los bocetos (prevalece el código, S2)

- Ejercicios conserva la columna «Vídeo» y el subtítulo; las filas no son clicables y el nivel va como etiqueta neutra.
- Etiquetas conserva las pestañas en vez de la lista lateral.
- Retos conserva los cuatro botones por fila en vez de un menú, la cabecera «Modo» y la búsqueda con botón.
- Logros conserva los botones por fila y la nota informativa.
- Notificaciones conserva el filtro de estado como desplegable.
- En todas, con una sola página se muestra el texto «Página 1 de 1».

## 6. Abiertos para el propietario

- «Recalcular» logros no está marcado como acción destructiva aunque un recálculo puede retirar logros.
- En Notificaciones, «Limpiar filtros» solo limpia la búsqueda (defecto previo, no tocado).
- Las casillas de selección miden 16 px (componente compartido `Checkbox`).
- Duplicación entre pantallas candidata a extraer: cuatro esqueletos de lista, `useMediaQuery('(min-width: 768px)', true)` en cuatro sitios, acciones de fila de Retos y Logros, bloque «Página X de Y» con una sola página.
- `037338f` cambia una clase del shell de F3 fuera del alcance estricto del lote.

## 7. No verificado

Dispositivo real; lectores de pantalla; Safari y Firefox; imagen real de icono de logro; estados de error reales de API en navegador (solo en tests).
