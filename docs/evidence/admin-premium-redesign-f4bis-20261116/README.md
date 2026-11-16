# Evidencias F4-bis — Buscador global (rediseño premium de exom-admin)

Estado: REVIEW_REQUIRED. Implementado y validado en local (HEAD de código `d9ced73`). Revisión independiente recibida (ACCEPT WITH FOLLOW-UPS); resultado en sección 4. Pendiente: push del propietario (D18), PR a `develop`, CI remoto en verde, merge con merge commit (D17) y revisión de las capturas por el propietario. Nada está subido.

Plan: `EXOM/docs/plans/admin-premium-redesign.md` (sección 4, F4-bis). Fecha: 2026-11-16. Autorización: D17 (F4-bis y F5), D18 (push del propietario) y D21 (boceto aprobado `docs/redesign/buscador.html`). Propuesta: P13. El 2026-11-16 el propietario indicó además que el agente decida los puntos abiertos en su ausencia y que el consumo semanal sin Fable no supere el 75 % (D22 del plan).

Rama: `feat/admin-rediseno-f4bis-buscador`, creada con `--no-track` desde `origin/develop` `fcd36c1` (merge de la PR #63, lote F). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. HEAD de código: `d9ced73`. `main` (`312afef`) sin tocar. Entorno (no secreto): Windows 11, arnés sintético sin red (`docs/evidence/admin-premium-redesign-f0-20261115/browser-harness`, con cambios en 2 ficheros, ver sección 6), Chrome headless por CDP. Nada está subido.

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `8d9de41` | docs: boceto del buscador global (sesión anterior) | RDS-F4B-U1 |
| `7968c69` | feat: buscador global con atajo Ctrl K en la cabecera y en el panel «Más» | RDS-F4B-U2 |
| `d61cf2b` | test: tests del buscador (53 tests) | RDS-F4B-U3 |
| `4ba6c7d` | fix: V-1 esqueleto visible y V-2 ruta de las acciones oculta en móvil | RDS-F4B-U2, V-1, V-2 |
| `d9ced73` | fix: correcciones de la revisión independiente y de las capturas (F-1, F-2, F-4, V-4, F-8; 9 tests más) | F-1, F-2, F-4, F-8, V-4 |
| (pendiente) | capturas, cambios del arnés y evidencias de F4-bis | `capturas-f4bis/`, arnés y este README |

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F4B-01 boceto aprobado antes de cualquier código | exom-admin | `8d9de41` | aprobación del propietario, D21 del plan | PASS (sesión anterior) | 2026-11-16 | plan, D21 |
| RDS-F4B-02 accesible por teclado, atajo documentado, sin destinos no permitidos al rol | exom-admin | `d9ced73` | tests (62) y comprobaciones en navegador (arnés sintético, Chrome headless por CDP; 1440x900 y 390x844 nativo con emulación móvil, `deviceScaleFactor` 2 y táctil; oscuro y claro) | PASS: ver secciones 3 y 4 | 2026-11-16 | `global-search.test.tsx`, `global-search-model.test.ts`, `capturas-f4bis/` |
| RDS-F4B-03 sin endpoints nuevos | exom-admin | `d9ced73` | D7 (fila siguiente) y revisión del diff | PASS: sin dependencias ni endpoints nuevos; clientes con el `useClients` existente | 2026-11-16 | sección 3 |
| Capturas frente al boceto | exom-admin | `d9ced73` | arnés sintético, tres rondas (la final sobre `d9ced73`) | PASS con divergencias anotadas: 32 PNG en `capturas-f4bis/`; `scrollWidth === innerWidth` en 32 de 32; 0 errores de consola (solo el aviso del router del arnés «No `HydrateFallback` element provided»); 0 líneas `[fixture-api] 404` | 2026-11-16 | `capturas-f4bis/`, secciones 3 y 5 |
| Comportamiento medido en navegador | exom-admin | `d9ced73` | Chrome por CDP sobre el arnés | PASS: Ctrl+K abre y cierra; Ctrl+Shift+K no abre; Ctrl+K con repetición no alterna; Esc cierra y el foco vuelve al disparador (1440) o al botón «Más» (390); roles `dialog` «Buscador», 1 `combobox`, 1 `listbox`, N `option`; `aria-activedescendant` apunta a una opción existente y seleccionada tras ↓ y tras llegar los clientes; ADMIN: 20 opciones y 0 al escribir «plantilla»; Enter sobre un cliente navega a `/users/<id>` y cierra; opción «Reintentar la búsqueda de clientes», 0 `role=alert`, Enter vuelve a pedir | 2026-11-16 | sección 3 |
| Región viva (`status`) | exom-admin | `d9ced73` | Chrome por CDP | PASS: «22 resultados» (vacío, SUPER_ADMIN), «10 resultados» («re»), «1 resultado» («mart»), «Sin resultados», «Buscando clientes…» (carga), «6 resultados · No se pudieron buscar clientes» y «No se pudieron buscar clientes» (error) | 2026-11-16 | sección 3 |
| Peticiones de clientes | exom-admin | `d9ced73` | `window.__fixtureCalls` y registro de peticiones del arnés | PASS: 0 con 1 carácter; 1 sola al teclear «mart» rápido con `{page:1, limit:5, search:"mart", archive:"visible"}` | 2026-11-16 | sección 3 |
| Geometría y objetivos táctiles | exom-admin | `d9ced73` | `getBoundingClientRect` | PASS: hoja a 390 = `{0,0,390,844}` con scroll interior de la lista; panel a 1440 = `{400,135,640,510}`, lista máx. 420 px con scroll; a 390 filas 48 px, «Cancelar» 84,5x44, campo 44 y «Buscar» en «Más» 44 (ninguno bajo 44); disparador de cabecera de 240 px sin solape con las migas a 768 (x 334,2–574,2) y 1024 (x 590,2–830,2) | 2026-11-16 | `buscador-trigger-*`, `buscador-open-empty-*` |
| Esqueleto frente al fondo | exom-admin | `d9ced73` | color calculado | PASS: oscuro 1440 rgb(54,59,50) sobre rgb(27,30,27) 1,46:1; oscuro 390 1,65:1; claro 1440 rgb(198,196,181) sobre blanco 1,76:1; claro 390 1,55:1 | 2026-11-16 | `buscador-loading-*` |
| Contraste WCAG (normal / seleccionada / pista / cabecera de grupo / marcador / Cancelar) | exom-admin | `d9ced73` | cálculo sobre los colores medidos | PASS salvo un valor: oscuro 1440 8,70 / 11,60 / 4,01 / 5,14 / 5,14 / n.a.; oscuro 390 9,78 / 13,51 / 4,67 / 5,78 / 5,50 / 16,69; claro 1440 9,09 / 17,64 / 5,67 / 6,07 / 6,07 / n.a.; claro 390 8,02 / 15,98 / 5,13 / 5,36 / 5,66 / 16,69. Bajo 4,5:1: la pista en oscuro 1440 (4,01): `RDS-F4B-CONTRAST-01`, abierto, medio | 2026-11-16 | sección 7 |
| Tests nuevos (U3) | exom-admin | `d9ced73` | `npx vitest run` sobre los dos ficheros | PASS: `global-search.test.tsx` 43 tests y `global-search-model.test.ts` 19 tests, 62 en total (53 en `d61cf2b` y 9 en `d9ced73`) | 2026-11-16 | sección 3 |
| Tests existentes no debilitados | exom-admin | `d9ced73` | `git diff --name-status fcd36c1 HEAD -- '*.test.ts' '*.test.tsx' '*.snap'` | PASS: solo 2 `A`, ningún test preexistente modificado | 2026-11-16 | sección 3 |
| Reglas D7 | exom-admin | `d9ced73` | `git diff --stat fcd36c1 HEAD -- 'src/features/*/api.ts' 'src/features/*/schemas.ts' 'src/features/*/types.ts' src/lib src/hooks src/components/ui src/index.css src/App.tsx package.json package-lock.json` | PASS: salida vacía. Sin dependencias nuevas | 2026-11-16 | sección 3 |
| Revisión independiente | exom-admin | `4ba6c7d` | revisión de `8d9de41..4ba6c7d` (Sonnet, esfuerzo alto) | ACCEPT WITH FOLLOW-UPS: 0 bloqueantes, R1–R9 PASS; hallazgos F-1 a F-8 en sección 4 | 2026-11-16 | sección 4 |
| Lint | exom-admin | `d9ced73` | `npm run lint` | PASS (exit 0, 0 problemas) | 2026-11-16 | logs fuera del repo (`f4bis-final-1-lint.log`) |
| Tests | exom-admin | `d9ced73` | `npm test -- --run` (dos ejecuciones seguidas) | PASS las dos: 169 ficheros / 1559 tests cada una (base antes de la fase: 167 / 1497) | 2026-11-16 | `f4bis-final-2-test1.log`, `f4bis-final-3-test2.log` |
| Build | exom-admin | `d9ced73` | `npm run build` | PASS (exit 0, 0 `error TS`, sin aviso de chunk grande; mayor chunk `vendor-charts` 405,15 kB, gzip 110,07 kB) | 2026-11-16 | `f4bis-final-4-build.log` |
| Diff | exom-admin | `d9ced73` | `git -c core.whitespace=cr-at-eol diff --check fcd36c1 HEAD` y del árbol | PASS: limpios. `git diff --shortstat fcd36c1 HEAD`: 12 ficheros, 2738 inserciones, 65 eliminaciones (bajo `src`: 8 ficheros, +1851 −64) | 2026-11-16 | logs fuera del repo |
| CI remoto | exom-admin | — | — | NOT_RUN (nada subido) | 2026-11-16 | sección 8 |
| Dispositivo real, teclado virtual, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-16 | sección 8 |

## 3. Notas por unidad

- U2 implementación (`7968c69`, `4ba6c7d`, `d9ced73`), todo en `src/components/layout/`: `global-search.tsx` (proveedor con estado y atajo, diálogo Radix con cmdk a través de `components/ui/command.tsx` sin editarlo, disparador de cabecera, paleta y resultados), `global-search-model.ts` (entradas, coincidencia, anuncios y rutas) y `global-search-context.ts`; `header.tsx` (disparador visible desde 768 px); `mobile-tabbar.tsx` («Buscar» primer elemento del panel «Más»; cierra «Más» y el foco vuelve a «Más» al cerrar el buscador); `app-layout.tsx` (proveedor; el diff es reindentado).
- Grupos: «Ir a» (destinos de `resolveNavGroups(role)` de `nav-model.ts`, sin lista duplicada; 22 opciones SUPER_ADMIN y 20 ADMIN con el buscador vacío, contando acciones); «Acciones» (solo navegación: `/notification-templates` «Nueva plantilla» solo SUPER_ADMIN, `/notifications`, `/approval-requests?status=PENDING`, `/feedback?status=PENDING`, `/recaps?status=SUBMITTED`); «Clientes» (`useClients` con `page 1`, `limit 5`, `search`, `archive: 'visible'`; espera de 250 ms; mínimo 2 caracteres; detalle `/users/:id` o `/clients/:id` según rol; «Ver todos» a la lista con `clientsFilters=q:<texto>`, formato que la lista ya lee).
- Estados: vacío, resultados, cargando (esqueleto), sin resultados y error con reintento. Atajo `Ctrl K` / `⌘ K` (alterna; ignora Alt, Shift, repetición y el foco dentro de otro diálogo). Móvil: hoja a pantalla completa con «Cancelar».
- Decisiones del agente al amparo de D17 y D22 (revisables por el propietario): (a) `useClients` no admite `enabled` y `api.ts` no se toca (D7): un componente sin interfaz, `ClientsSearch`, se monta solo con término válido tras la espera; (b) `archive: 'visible'` para coincidir con la lista por defecto; (c) se usa `Dialog` de Radix con `Content` directo en vez de `CommandDialog`/`DialogContent`, que añaden un botón «Close» y no permiten el nombre accesible «Buscador»; (d) `ActiveDescendantSync` corrige `aria-activedescendant` tras cada cambio de selección, porque cmdk 1.1.1 lo deja obsoleto cuando las filas se montan o desmontan; (e) el debounce reutiliza `useDebouncedValue` de `features/base-service`; (f) coincidencia por subcadena sin mayúsculas ni tildes con `shouldFilter={false}` (sin ordenación difusa, D21); (g) anuncio de la región viva: «Buscando clientes…» en carga y «N resultados · No se pudieron buscar clientes» o solo el fallo en error (el boceto solo definía el recuento); (h) V-5 se traslada a F5-U1.
- U3 tests (`d61cf2b`, `d9ced73`): `global-search.test.tsx` (43 tests) y `global-search-model.test.ts` (19 tests), 62 en total. Cubren atajo (Ctrl K, ⌘ K, alternancia, otro diálogo, Alt Gr, Shift, repetición), roles ARIA (diálogo «Buscador», combobox, listbox, option, `aria-activedescendant`, región viva), teclado (flechas con bucle, Enter, Esc y retorno del foco al disparador, al elemento previo y a «Más»), respeto del rol (SUPER_ADMIN, ADMIN, rol indefinido; conjunto de destinos igual a `resolveNavGroups`), clientes (mínimo, espera, parámetros, esqueleto, máximo 5, «Ver todos», error y reintento, sin resultados, reapertura vacía), coincidencia y móvil.
- Mutaciones probadas y revertidas, todas detectadas: «Nueva plantilla» visible para ADMIN (2 FAIL), mínimo de 1 carácter (2), Esc sin retorno de foco (3), atajo con otra tecla (4), sin `ActiveDescendantSync` (2), sin la comprobación de otro diálogo (1).
- Ningún test preexistente modificado. Un test propio del lote se ajustó en `d9ced73`: el de error pasó de `getByRole('alert')` a la región `status`, por el cambio de contrato F-2.
- Capturas (32 PNG en `capturas-f4bis/`; nombres `buscador-<estado>-{dark,light}-{1440,390}.png`):
  - Disparador (8): `buscador-trigger-dark-{1440,1024,768,390}`, `buscador-trigger-light-{1440,390}` (6 en total) y `buscador-keyboard-{dark,light}-1440` (2).
  - Abierto vacío (4): `buscador-open-empty-{dark,light}-{1440,390}`.
  - Resultados (4): `buscador-results-{dark,light}-{1440,390}`.
  - Cargando (4): `buscador-loading-{dark,light}-{1440,390}`.
  - Sin resultados (4): `buscador-no-results-{dark,light}-{1440,390}`.
  - Error (4): `buscador-error-{dark,light}-{1440,390}`.
  - Rol ADMIN (4): `buscador-admin-dark-1440`, `buscador-admin-light-390`, `buscador-admin-empty-dark-1440`, `buscador-admin-empty-light-390`.
- Higiene de procesos: el Vite del arnés y Chrome se pararon por PID tras cada ronda (puertos 5192 y 9333 libres); sin procesos residuales tras los checks.

## 4. Revisión independiente

Veredicto: ACCEPT WITH FOLLOW-UPS (`8d9de41..4ba6c7d`, revisor en Sonnet, esfuerzo alto). 0 bloqueantes, R1–R9 PASS (R1 «Ir a» por rol sin lista duplicada; R2 acciones solo navegación a rutas existentes; R3 clientes con el hook existente; R4 estados; R5 atajo y móvil; R6 accesibilidad; R7 coincidencia; R8 D7; R9 tests). Las correcciones de `d9ced73` no han tenido una segunda revisión independiente: verificadas por el diff del orquestador, los tests y el navegador.

| ID | Hallazgo | Resultado |
| --- | --- | --- |
| F-1 | (medio) La región viva decía «Sin resultados» durante la carga o el error. | Corregido en `d9ced73`. |
| F-2 | (medio) `role="alert"` dentro de una opción y «Reintentar» oculto a lectores. | Corregido en `d9ced73`. |
| F-3 | (medio-bajo) La hoja móvil `fixed inset-0` sin `interactive-widget` ni `visualViewport`: el teclado virtual de Android podría tapar las últimas filas; no verificado en dispositivo. | Anotado: `RDS-F4B-KEYBOARD-01`, fase responsable F5 (RDS-F5-U2, prueba en móvil real); `index.html` queda fuera del alcance de esta fase. |
| F-4 | (bajo) Sin guarda de repetición ni de Shift en el atajo. | Corregido en `d9ced73`. |
| F-5 | (bajo) Resaltado con texto Unicode descompuesto (base y marca). | Anotado, sin cambio. |
| F-6 | (bajo) Al cruzar 768 px con el buscador abierto se remonta el campo y se pierde el foco. | Anotado, sin cambio. |
| F-7 | (bajo) `ActiveDescendantSync` depende de internos de cmdk 1.1.1. | Anotado; verificado después en navegador real por CDP: correcto. |
| F-8 | (bajo) Faltaban tests de rol indefinido, Alt Gr y otros. | Corregido en `d9ced73` (9 tests). |

### Defectos de capturas

| ID | Resultado |
| --- | --- |
| V-1 | Esqueleto invisible en oscuro 1440 (mismo color que el panel): corregido en `4ba6c7d` y reforzado en `d9ced73`. |
| V-2 | Ruta de las acciones truncada a 390: corregido en `4ba6c7d` (se oculta bajo 768 px). |
| V-3 | El pie anunciaba un recuento durante la carga: corregido en `d9ced73` (F-1). |
| V-4 | Esqueleto tenue en oscuro 1440 (1,1:1): corregido en `d9ced73` (1,46:1). |
| V-5 | Pista a 4,01:1 en oscuro 1440: ABIERTO, `RDS-F4B-CONTRAST-01` (medio, F5 / RDS-F5-U1). Es la pareja de tokens `muted-foreground` rgb(138,144,134) sobre `background-surface` rgb(27,30,27) en tema oscuro, sistémica y fuera de D7 para esta fase. Aceptación: ≥ 4,5:1 medido o decisión registrada. |

## 5. Divergencias respecto al boceto (prevalece el código, S2)

- La ruta de las acciones se oculta bajo 768 px (el boceto la muestra truncada).
- Anuncio de carga y de error añadido a la región viva (el boceto solo definía el recuento).
- Esqueleto con `--border-strong`/`--control-border` en vez de `surface-3`/`rule-strong`.
- Radios y componentes del sistema compartido.

## 6. Cambios del arnés (sin commit hasta el commit de evidencias)

En `docs/evidence/admin-premium-redesign-f0-20261115/browser-harness/`:

- `boot.ts`: dos indicadores nuevos, `__clientsDelay=<ms>` (retrasa la respuesta de `GET /admin/clients`) y `__clientsFail=1` (la hace fallar con 500), exportados como `harnessClientsDelay` y `harnessClientsFail`.
- `fixture-api.ts`: en `GET /admin/clients` aplica el retraso y, si procede, lanza un `AxiosError` con estado 500 antes de resolver el fixture; importa los dos nuevos indicadores.

## 7. Abiertos para el propietario

- `RDS-F4B-CONTRAST-01` (abierto, medio): pista del buscador a 4,01:1 en oscuro 1440 (`muted-foreground` sobre `background-surface`); destino F5 (RDS-F5-U1); aceptación: ≥ 4,5:1 medido o decisión registrada.
- `RDS-F4B-KEYBOARD-01` (abierto, medio-bajo): teclado virtual de Android sobre la hoja móvil; destino F5 (RDS-F5-U2, prueba en móvil real).
- Hallazgos anotados: F-5, F-6 y F-7.
- Decisiones del agente (a)–(h) de la sección 3 (D22 del plan): revisables.
- Divergencias de la sección 5.
- Revisión de las capturas por el propietario.

## 8. No verificado

Dispositivo real y teclado virtual; lectores de pantalla; Safari y Firefox; API real y autenticación real (el arnés acredita aspecto y forma de las peticiones, no comportamiento); CI remoto (NOT_RUN, nada subido).

## 9. Subida pendiente

- Decisiones del propietario: D17, D18 y D22 (ver plan). Nada está subido; el push lo hace el propietario.
- Estado: implementado y validado en local, HEAD de código `d9ced73`; REVIEW_REQUIRED. Push pendiente del propietario (D18): `git push -u origin feat/admin-rediseno-f4bis-buscador`. Después: PR a `develop`, CI remoto en verde y merge con merge commit (D17); revisión de capturas por el propietario.
- Siguiente: F5 en rama nueva derivada de `feat/admin-rediseno-f4bis-buscador` (D17).
