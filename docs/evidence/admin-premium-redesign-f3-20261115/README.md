# Evidencias F3 — Shell (rediseño premium de exom-admin)

Plan: `docs/plans/admin-premium-redesign.md` (sección 4, F3). Fecha: 2026-11-15. Autorización: F3 completa (U1–U8) con commits locales solo; sin push, PR, merge ni tag.

Rama: `feat/admin-rediseno-f3-shell`, base `f3696ed` (HEAD de `feat/admin-rediseno-f2-piezas`). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. Entorno (no secreto): Windows 11, Node v22.21.0, arnés sintético sin red (`127.0.0.1:5192`). Logs de checks en el scratchpad de la sesión (fuera del repo), con prefijos `f3/u1-` a `f3/u8-` y `f3/fix-`.

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `a3390fd` | feat(admin): sidebar agrupada | U1 |
| `1c0a787` | feat(admin): cabecera de 52 px | U2 |
| `84e81c9` | feat(admin): barra inferior móvil y panel «Más» | U3 |
| `31398d7` | feat(admin): carril de iconos en tablet y `matchMedia` | U4 |
| `f420e29` | feat(admin): «Badges» pasa a «Etiquetas» en menú, migas y título | U5 |
| `7ca361a` | feat(admin): página 404 dentro del layout y `errorElement` | U6 |
| `ca852d8` | fix(admin): dejar que las utilidades de color ganen en los enlaces | fix global de enlaces (D15) |
| `755d381` | feat(admin): contadores de pendientes en Feedback y Recaps del menú | U7 |
| `1312a53` | fix(admin): colocar el aviso de versión y «Volver arriba» sobre la barra inferior | U8 |
| `482be42` | fix(admin): correcciones de la revisión independiente de F3 | F-1, F-2, F-6 y dos ajustes menores |
| (pendiente) | test(admin): capturas y evidencias de F3 | capturas en `capturas-f3/` y galería `galeria-f3.html` |

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F3-01 tests de humo de F0 | exom-admin | `1312a53` | `npm test -- --run`; `git diff f3696ed..1312a53 -- '*.test.ts' '*.test.tsx'` (revisión independiente) | PASS: única modificación de un test preexistente, `app-shell.test.tsx:61` `['Badges','/badges']` a `['Etiquetas','/badges']` (D14) | 2026-11-15 | sección 3 |
| RDS-F3-02 teclado, foco y nombres accesibles | exom-admin | `1312a53` | CDP contra el arnés; `sidebar.test.tsx`, `header.test.tsx` | PASS: foco visible con contorno `--focus` (medido: `outline: 2px solid rgb(186,242,58)`, offset −2px en la sidebar); hamburguesa, tema y menú de usuario con `aria-label`; `aria-current="page"` | 2026-11-15 | sección 3 |
| RDS-F3-03 barra inferior móvil | exom-admin | `1312a53` | CDP a 390 px; `mobile-tabbar.test.tsx` | PASS: 5 elementos de 78×55 px; panel «Más» con Solicitudes primero; contador de Solicitudes solo SUPER_ADMIN; el foco vuelve a «Más» al cerrar | 2026-11-15 | sección 3 |
| RDS-F3-04 carril de tablet y cambio reactivo | exom-admin | `1312a53` | CDP a 900 px; `app-layout.test.tsx` | PASS: carril de 56 px con tooltips, sin hamburguesa, preferencia de escritorio intacta (`localStorage` sigue en `expanded`); `useMediaQuery` reactivo; el carril es `sticky` y se mantiene al hacer scroll en páginas largas | 2026-11-15 | sección 3 |
| RDS-F3-05 404 y estado de error de ruta | exom-admin | `1312a53` | CDP en `/no-existe`; `not-found-page.test.tsx`, `route-error.test.tsx` | PASS: la 404 se muestra dentro del layout; `errorElement` en la raíz protegida y en `/login` (el estado de error real de carga solo se probó en tests) | 2026-11-15 | sección 3 |
| RDS-F3-06 «Etiquetas» | exom-admin | `1312a53` | CDP; `app-shell.test.tsx` | PASS: «Etiquetas» en menú, migas y `h1`; la ruta `/badges` no cambia | 2026-11-15 | sección 3 |
| RDS-F3-07 contadores sin endpoint nuevo | exom-admin | `1312a53` | `use-pending-counts.test.tsx` | PASS con nota: contadores desde la clave de caché del Dashboard, sin endpoint nuevo; refresco de 2 min fuera del Dashboard (D10). `features/dashboard/api.ts` no exporta la función de consulta y no se edita en esta fase, así que `use-pending-counts.ts` replica la llamada a `/dashboard` con la misma clave | 2026-11-15 | sección 3 |
| RDS-F3-08 guarda de cambios y aviso de versión | exom-admin | `1312a53` | `unsaved-changes-guard.test.tsx`; CDP a 390 y 700 px | PASS: `unsaved-changes-guard.tsx` sin diff y su test pasa; ningún `useBlocker` nuevo; aviso de versión y «Volver arriba» por encima de la barra inferior (medido a 390 y 700 px). Aviso «A router only supports one blocker at a time»: sin cambios respecto a F2 | 2026-11-15 | sección 3 |
| Reglas D7 | exom-admin | `482be42` | `git diff f3696ed..482be42 --stat -- src/features/*/api.ts src/lib src/hooks/use-auth.ts src/components/ui package.json package-lock.json src/index.css` | PASS: diff vacío; ningún token añadido, renombrado ni eliminado | 2026-11-15 | sección 3 |
| Checks en `1312a53` | exom-admin | `1312a53` | `npm run lint`; `npm test -- --run`; `npm run build` | PASS: lint 0 problemas; 114 ficheros / 832 tests; build OK | 2026-11-15 | scratchpad `f3/u8-*.log` |
| Checks finales | exom-admin | `482be42` | `npm run lint`; `npm test -- --run`; `npm run build`; `git diff --check` | PASS: lint 0 problemas; 115 ficheros / 835 tests (base de F2: 106 / 782); build OK; `git diff --check` limpio | 2026-11-15 | scratchpad `f3/fix-*.log` |
| Capturas | exom-admin | `482be42` | arnés + Chrome headless con CDP, ambos temas, 390 (nativo por emulación CDP), 900 y 1440 px | PASS: 38 PNG iniciales más recapturas tras las correcciones; sin scroll horizontal de página en ninguna; consola: solo `favicon.ico` 404 del arnés y el aviso `HydrateFallback` | 2026-11-15 | `capturas-f3/`, `galeria-f3.html` |
| Revisión independiente de F3 | exom-admin | `f3696ed..1312a53` | revisor independiente (lint, test, build, reglas R1–R12) | ACCEPT WITH FOLLOW-UPS; R1–R12 PASS; F-1, F-2, F-6 y dos ajustes menores corregidos en `482be42`; F-3, F-4, F-5, F-7 y F-8 abiertos | 2026-11-15 | sección 4 |
| Dispositivo real, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-15 | sección 6 |

## 3. Notas por unidad

- U1 (`a3390fd`): sidebar agrupada según `docs/redesign/assets/proto.js:71-102`, con estado expandido o en carril persistido en `localStorage`, foco visible (sin `focus-visible:ring-0` ni `blur` en `mousedown`) y lockup EXOM.
- U2 (`1c0a787`): cabecera de 52 px con migas, tema con `aria-label`, hamburguesa con `aria-label` y menú de usuario.
- U3 (`84e81c9`): `mobile-tabbar.tsx` nuevo (Dashboard, Feedback, Recaps, Progreso y Más). «Más» abre un panel con Solicitudes primero.
- U4 (`31398d7`): `window.innerWidth` sustituido por `matchMedia` reactivo. Carril de 56 px entre 768 y 1023 px.
- U5 (`f420e29`): «Etiquetas» en menú, migas y `h1` de `badges-page.tsx`. D14 cubre el ajuste de `app-shell.test.tsx`.
- U6 (`7ca361a`): ruta `path: '*'` dentro de `AppLayout` y `errorElement` en la raíz protegida y en `/login`, con reintento y vuelta al Dashboard.
- Fix global de enlaces (`ca852d8`, D15): la regla en línea `a { color: inherit }` de `index.html`, sin capa, anulaba las utilidades de color de Tailwind en enlaces y botones-enlace en toda la app. Se mueve a `@layer base`. Hallado en navegador.
- U7 (`755d381`): contadores de Feedback y Recaps desde la clave de caché del Dashboard; ocultos si valen 0 o hay error. Ver nota de RDS-F3-07 en la tabla.
- U8 (`1312a53`): el aviso de versión y «Volver arriba» quedan por encima de la barra inferior con posiciones y `z-index` comunes.
- Defectos hallados solo en navegador (jsdom no los ve): el `className` función de `NavLink` bajo `TooltipTrigger asChild` se convertía en texto (carril sin estilos ni foco); la regla sin capa de `index.html` (D15); F-1 de la revisión.

## 4. Revisión independiente (`f3696ed..1312a53`)

Veredicto: ACCEPT WITH FOLLOW-UPS, R1–R12 PASS.

Corregidos en `482be42`:

- F-1: entre 640 y 767 px las clases `sm:` ganaban a `max-md:`; el contenido final quedaba bajo la barra y «Volver arriba» tapaba «Más». Ahora base más `md:`.
- F-2: el botón «Volver» de la 404 sin historial.
- F-6: panel «Más» abierto al pasar a 768 px o más.
- Contador del carril que pisaba el icono (ahora un punto) y email cortado en el menú de usuario.

Abiertos para el propietario:

- F-3: el shell observa la consulta del Dashboard en todas las pantallas, así que cada invalidación de esa clave lanza un `GET /dashboard` también fuera del Dashboard. Coherente con D10.
- F-4: en tablet las filas del carril miden 36 px y los botones de icono de cabecera 40 px; el criterio de 44 px solo aplicaba a la barra inferior.
- F-5: con D15, `underline`, `hover:underline` y `text-*` escritos en enlaces vuelven a aplicarse en toda la app; revisar en F4.
- F-7: se modificó `docs/evidence/admin-premium-redesign-f0-20261115/browser-harness/index.html` como espejo de D15, para que el arnés reproduzca el `index.html` real.
- F-8: el aviso de versión usa `:has()`; Firefox anterior a la 121 lo ignora.

## 5. Divergencias respecto al boceto

- Filas de la sidebar de 36 px (boceto 34).
- Sin pie de usuario en la sidebar.
- La barra superior móvil no lleva «Admin».
- La 404 lleva «404» grande y botón «Volver» (el boceto tiene una X decorativa).
- La miga de una URL desconocida muestra el segmento tal cual.

## 6. No verificado y heredado

- No verificado: dispositivo real; lectores de pantalla; Safari y Firefox; estado de error real de carga de ruta en navegador (solo en tests).
- Heredado de F2 y sin cambios: dos `useBlocker` activos; el foco no vuelve al origen en `Dialog` y `Sheet` controlados ajenos al shell (el panel «Más» sí lo devuelve); filas de pestañas con scroll horizontal sin pista visual a 390 px.
- Estado de F3: `REVIEW_REQUIRED`. Implementada y validada; pendiente de la revisión de capturas del propietario. Sin desplegar ni publicar.
