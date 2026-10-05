# REST-T2E2 — Seguimiento / Tareas en Admin

> Copia saneada para entrega: ubicaciones normalizadas; resultados, fechas y hashes conservan su significado histórico y corresponden al snapshot privado original, no a esta copia. WORKSPACE_ROOT identifica la coordinación; SDK_ROOT el SDK instalado; RUNTIME_ROOT las herramientas locales; TEST_ARTIFACT_ROOT los recursos privados retenidos, no publicados.


**Estado actual: APPROVED / VERIFIED — commit local y evidencia final pendientes del parent; no DONE ni cierre P5. Sin aprobación de diseño del usuario.** Implementación y checkpoint preservados; los resultados independientes y el historial de fallos se registran abajo. Seguimiento queda habilitado en el Progreso existente: resumen canónico, tareas paginadas y editor lateral. **Navegador/aceptación visual NOT_RUN en este writer; no declarar REST-T2E ni P5 cerrados.** Sin publicación, mensajes, cambios remotos, commits ni implementación de REST-T3/P6.

## Identidad y alcance — 2026-10-05

- Coordinación: `${WORKSPACE_ROOT}/`, raíz no Git según contexto autoritativo del parent. Documentos tratados como instantáneas, no commits.
- Admin: `${WORKSPACE_ROOT}/exom-admin`; base `e14d56a8b35ca2bb18420d27549739d237653084`, `fix/progress-detail-and-charts` / `origin/fix/progress-detail-and-charts`, árbol inicialmente limpio.
- API inspeccionada, sin editar: `../exom-api`, HEAD `224e7b0051ff0f96821ebd95aad0a171106bc683`, `feat/progreso-adherencia-p4` / `origin/feat/progreso-adherencia-p4`; probe de borrado original no seguido preservado.
- Node `22.21.0`, npm `11.13.0`, Vitest observado `4.1.9`, Vite observado `6.4.2`; dependencias/lockfile intactos.
- SHA256 AGENTS: `f21dc8259e9ff8b7a02122efd9b1651a4a22859081c6871722b099c8476a38db`; plan: `8322fb624e1c0e54c51c071c7e90a1a2bdd957c9c33374274c80afb78eb2db16`; tarea CURRENT leída: `8f5c39cd090302357b80e33262673ba48d8226a429d2ddb495094ba107bd795b`.
- Autoridad: [CURRENT](../../../../odd/tasks/progress-remaining-phases.md), [P5](../../../../docs/plans/progreso-clientes-plan.md), [contrato API](../../../../exom-api/docs/evidence/rest-t2e-api-20261005/README.md). La autorización explícita vigente del usuario/parent prevalece sobre la antigua nota documental de P5.

## Contratos preservados

| Área | Implementación |
| --- | --- |
| Navegación | Conserva Resumen como entrada, Racha, todas las secciones entregadas, parámetros/periodo URL y selector. Dashboard sigue pendiente. |
| Fuentes | `/admin/clients/:clientId/follow-up-tasks`, `/assignees` y `/summary`, mediante apiClient y envelope existente. No selección independiente de próxima tarea/revisión. |
| Lista | `page=1`, `limit=20`, abiertas por defecto; historial cerrado, filtros por estado/responsable y página. Tabla escritorio/fila apilada móvil. Vencida es texto, usando `as_of_date` UTC del servidor; sin reloj local alternativo. |
| Responsables | Solo lookup específico paginado, carga explícita de más páginas. Nombres históricos conservados como display/filtro; no son nuevas opciones elegibles. Un responsable intacto se omite del PUT, conservando también null histórico. El servidor revalida cambios. |
| Creación | UUID estable por borrador. Latch impide doble envío; ante red/5xx se congela el payload y el reintento usa exactamente el mismo UUID y campos. No retry automático de mutaciones. |
| Edición | PUT `expected_version` original. 409 conserva borrador, consulta y muestra la versión actual; nunca avanza versión ni sobrescribe automáticamente. Solo descarte explícito carga esa versión para una nueva revisión. |
| Estados | Pendiente/en progreso editables. Completar/cancelar mediante PUT; cancelación exige confirmación. Cerradas son de lectura, sin reabrir. No efectos sobre pautas/mensajes. |
| Aislamiento | Claves de consulta incluyen identidad, cliente y filtros. Remount por identidad/cliente, señales de cancelación, callbacks tardíos ignorados. Invalidación de éxito limitada a la identidad/cliente capturados. Guardas para salida/cambio de cliente/sección, incluso navegación del data router; aviso beforeunload. |
| Errores | Mensajes separados para 401/403/404/409/423/red; conserva entradas ante rechazo de elegibilidad. Mantiene semántica central del apiClient, incluida sesión caducada/cuenta bloqueada. |
| Recaps | Pestaña explica REST-T3 pendiente; no usa la bandeja global como si estuviera filtrada al cliente ni simula publicación. |

El reintento incierto está protegido mientras se conserva el borrador abierto. No se añade cola offline ni persistencia de borradores entre reinicios. Cerrar/abandonar explícitamente un resultado incierto avisa de comprobar el listado antes de crear otra tarea; no se promete recuperación automática tras crash.

## Evidencia de comandos observados

Strict TDD: activado explícitamente por el parent. Resultados de este writer, con mocks sintéticos en Vitest; no HTTP/PG/Firebase real de Admin.

| Comando exacto | Resultado |
| --- | --- |
| `npm test -- --run src/features/progress/pages/progress-page.test.tsx` RED | 9 PASS / 2 FAIL: Seguimiento aún deshabilitado/no accesible con el nombre esperado. |
| Mismo comando GREEN | 11 PASS después de montar la implementación mínima. |
| `npm test -- --run src/features/progress/follow-up-tasks/follow-up-panel.test.tsx` | 23 PASS de contratos/operaciones/negativos. |
| `npm test -- --run src/features/progress/pages/progress-page.test.tsx src/features/progress/follow-up-tasks/follow-up-panel.test.tsx` final | 2 archivos / 35 PASS, incluye descarte/navegación del router real y conservación URL. |
| `npm test -- --run` final | 63 archivos / 376 PASS, sin omitidas. |
| `npm run lint` final | PASS, cero errores; una advertencia en el archivo preexistente no editado `.local/progress-ux6.tsx:14` (fast-refresh). |
| `npm run build -- --config docs/evidence/rest-t2e-admin-20261005/vite.isolated.config.ts` inicial | FAIL TS2550: `Array.at` en test, incompatible con ES2020. Corregido con indexación sin cambiar configuración ni assertions. |
| Mismo build final | PASS: `tsc -b` y Vite, 3554 módulos. Advertencia de chunk >650 kB en configuración aislada sin manualChunks; no prueba del reparto de bundles de producción. |
| `git diff --check` | PASS, exit 0, sin diagnósticos. |
| `${RUNTIME_ROOT}/.pi/agent/skills/impeccable/scripts/impeccable detect --json src/features/progress/pages/progress-page.tsx src/features/progress/follow-up-tasks/follow-up-panel.tsx src/features/progress/follow-up-tasks/task-editor.tsx src/features/progress/follow-up-tasks/route-guard.tsx` | Una ejecución: `[]`. No equivale a aprobación visual/accesibilidad completa. |

Cobertura focal: envelope/rutas, keys por propietario, summary independiente de página, filtros/paging; formulario accesible y validación; lookup página 2 sin fanout; historial cerrado; responsable histórico; doble click/respuesta perdida; revocación; conflicto sin rebasing silencioso; complete/cancel; desmontaje por cliente/identidad, respuesta de listado tardía e invalidación de la operación original; URL y Dashboard sin activar.

## Configuración aislada de build

`vite.isolated.config.ts` usa `envDir:false`, `emptyOutDir:false` y output únicamente en `build/` de este recibo. No modifica ni vacía `dist/`. `package.json` es solo una frontera de configuración CommonJS, sin dependencias/scripts: evita que Vite cree y borre un `.vite-temp` ESM fuera del alcance. Imports dinámicos permiten los plugins ESM existentes.

Fidelidad: mismos plugins React/Tailwind, alias fuente y definición de versión, pero versión sintética constante; no emite `version.json` ni replica manualChunks/proxy/dev headers del config de despliegue. Valida TypeScript y bundle del código real, no rollout/cache/versionado de producción. Los tsbuildinfo generados quedan ignorados y no se deben stagear. Configs/fixtures de evidencia están fuera de `include` de ambos proyectos TypeScript; no contaminan inputs de `tsc -b`.

## Harness preparado para el verificador del parent — NOT_RUN

`vite.browser.config.ts` sirve el **AppLayout y ProgressPage reales** en loopback, con tokens/CSS/public assets existentes y React Query. Sustituye únicamente módulos de apiClient/auth mediante alias. El adapter Axios es local en memoria: rutas desconocidas fallan, jamás hay fallback HTTP; no importa Firebase ni lee dotenv. El harness y sus escenarios aún requieren comprobación en navegador, no se presentan como ejecutados.

Comando propuesto para el verificador, desde Admin:

```text
npm run dev -- --config docs/evidence/rest-t2e-admin-20261005/vite.browser.config.ts
```

Ruta inicial:
`http://127.0.0.1:5187/progress?clientId=11111111-1111-4111-8111-111111111111&section=seguimiento`

Antes de navegar, el runner del verificador debe bloquear TODA red salvo `http://127.0.0.1:5187` y su WebSocket HMR; abortar solicitudes API externas, Firebase y cualquier otro origen. No usar el build de producto sin los alias ni apuntar el dev client a la API habitual. Puerto ocupado implica detenerse, no matar recursos preexistentes.

| `scenario` URL | Fixture / objetivo |
| --- | --- |
| omitido o `data` | 23 abiertas y 2 cerradas iniciales, responsables históricos no elegibles/null, lista página 2 y elegibles 20+1, crear/editar/completar/cancelar e historial. |
| `empty` / `loading` | Vacío explícito / consulta pendiente que se libera mediante `releaseResponses()`. |
| `401`, `403`, `404`, `423`, `network` | Errores específicos; `recoverErrors()` permite reintentar mediante controles reales de la UI. |
| `revoked` | Rechazo 403 al guardar tras lookup; conserva formulario. |
| `lost-response` | Primer POST se aplica en memoria y pierde respuesta; retry conserva UUID/payload y no duplica fila. |
| `conflict` | Primer PUT incrementa versión/título antes de rechazar 409; GET permite comparar sin sobrescribir borrador. |
| `deferred` | Retiene la lectura de listado de A; `pending()` acredita el bloqueo y `releaseResponses()` lo resuelve. `delivered()` registra la entrega y supresión por generación. |

`window.__followupFixture.calls` expone llamadas sintéticas con método, ruta, query, payload e identidad/generación, sin tokens. `changeIdentity()` cambia al segundo profesional; logout real del menú elimina usuario y autenticación e incrementa generación. Las respuestas de una generación anterior se rechazan como en el apiClient real. `snapshot()` consulta solo el servidor sintético, no estado privado de la UI. `holdReads(clientId)`, `pending()`, `releaseResponses()`, `delivered()` y `recoverErrors()` controlan únicamente el transporte. El selector ofrece A y B; B tiene una tarea exclusiva para demostrar aislamiento. Recargar reinicia fixtures: no es una prueba de persistencia servidor/crash.

Batched aceptación pendiente: escritorio 1440 y móvil 390, ambos temas; lista apilada sin overflow, formularios full-width móvil, foco/teclado/Escape y confirmaciones; filtros/paging/lookup más allá de página 1; create/edit/progreso/complete/cancel; revocación/409/red; cambio de cliente/identidad/respuestas tardías y conservación de URL/Resumen/Racha/Dashboard pendiente. Una ronda conjunta y, si procede, una única tanda de correcciones/confirmación. Capturas/trazas/salidas en `browser-output/`, ignoradas localmente. No hay capturas ni trace PASS aquí.

El transporte sintético no acredita integración HTTP Admin→API ni PG/Firebase real. La evidencia real HTTP/PG de API pertenece al recibo REST-T2E1 enlazado; no se repitió ni se convierte en evidencia del navegador.

## Runner independiente preparado — 2026-10-05, NOT_RUN

**Propósito de esta etapa:** preparar una comprobación reproducible y revisable para el verificador readonly. Solo se ampliaron fixtures/runner/documentación de evidencia; las ocho identidades SHA256 de código/tests de producto cotejadas siguen iguales al handoff anterior. No se ejecutó navegador, build, suite ni instalación en esta etapa. `node --check` del runner y `git diff --check` son inspecciones estáticas, no prueba funcional. También se comprobó sintaxis de los tres módulos de fixture mediante TypeScript `transpileModule` en memoria (sin emitir archivos): PASS sintáctico, no typecheck ni ejecución.

Desde la raíz Admin, con el servidor aislado existente en 5187:

```text
node docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs
```

El runner **no arranca ni detiene Vite**, no mata otros procesos y rechaza el puerto si el HTML no identifica este harness. Si falta servidor/módulo/browser, termina con error; no inventa capturas ni PASS. El verificador puede iniciar el servidor con el comando de configuración aislada indicado arriba, sin arrancar otro si ya existe.

Resolución readonly observada:
- `playwright`, `@playwright/test` y `playwright-core` no se resuelven desde los módulos de Admin.
- Playwright **1.56.1** existente en `${WORKSPACE_ROOT}/docs/evidence/metrics-p1-20260916/browser-tools/node_modules/playwright/index.js`. El runner resuelve automáticamente esa ruta conocida; **no requiere variable adicional** en este entorno.
- Chromium descargado para esa versión no está presente. Se comprobó existencia de Chrome instalado en `${SDK_ROOT}/Google/Chrome/Application/chrome.exe`; el runner usa ese ejecutable explícito, sin descargar navegador.
- Solo si otro entorno tiene rutas diferentes: `EXOM_PLAYWRIGHT_MODULE` identifica un módulo YA instalado y `EXOM_BROWSER_EXECUTABLE` un ejecutable YA instalado. Nunca instala/actualiza dependencias ni lockfiles.

La cerca HTTP/WebSocket se instala antes de cada navegación: permite únicamente HTTP `127.0.0.1:5187` para assets del fixture y WS HMR en `/`; cualquier intento de API HTTP, otro origen/protocolo o WS ajeno se aborta y hace FAIL. Service workers bloqueados. Browser usa perfil propio temporal, entorno hijo limitado a variables OS y directorio runtime bajo output ignorado; no usa perfiles existentes, Firebase ni API real. Solo cierra el browser que él mismo lanzó.

**18 casos preparados, sin resultados observados:** cuatro ejecuciones desktop 1440×900/mobile 390×844, claro/oscuro; vacío; loading/liberación; red y 403 con recuperación/reintento; 401/404/423 diferenciados; revocación con draft; respuesta perdida con igualdad exacta de ambos POST y única fila persistida; 409/comparación/descarte explícito sin segundo PUT; cambio de cliente vía back con descarte rechazado/aceptado; lectura tardía de otro cliente; cambio de identidad; logout con lectura tardía.

Cada ejecución de la matriz incluye filtros por estado/UUID/null, lista y elegibles página 2, preservación de responsable null/no elegible al editar otros campos, creación/edición/progreso/completar/cancelar rechazando y aceptando confirmación, histórico cerrado no editable (incluido responsable stale/null), teclado Tab/Escape y retorno de foco al opener. No hay sleeps ni rebajas de assertions; respuestas diferidas tienen recibos explícitos de bloqueo/liberación. Un fallo conserva el FAIL y su captura/trace; no aplica correcciones al producto. Capturas permiten revisión visual independiente, no un PASS visual automático.

Outputs esperados en un directorio nuevo y único `browser-output/independent/run-<fecha>-<uuid>/`:
- `results.json`: resultado agregado PASS/FAIL, casos, errores, intentos de escape y llamadas sintéticas.
- `run.log`, 18 JSON de caso y 18 traces ZIP si todos los casos alcanzan su cierre; un error de preflight puede terminar antes.
- Ocho PNG de matriz: `desktop-light-list/sheet`, `desktop-dark-list/sheet`, `mobile-light-list/sheet`, `mobile-dark-list/sheet`; PNG adicional de fallo cuando corresponda.
- `runtime/`: scratch privado de la ejecución, nunca código compilable en `src`.

Este runner quedó preparado para revisión estática y ejecución por el parent/verificador. **NOT_RUN era el estado de esta etapa de preparación; la ejecución independiente posterior se registra abajo.** No se atribuye PASS de integración Admin→API real ni aprobación visual a estas pruebas sintéticas.

## Primera ejecución independiente y única tanda correctiva — 2026-10-05

Evidencia histórica preservada: `browser-output/independent/run-2026-10-05T17-57-43-041Z-21b042fb-8a06-4b3a-9699-5361a718884e`. **8 PASS / 10 FAIL, agregado FAIL**. No constituye aprobación funcional/visual ni cierre REST-T2E/P5. Este writer inspeccionó resultados, captura y DOM de traces existentes; no ejecutó navegador ni produjo otra ronda visual.

Diagnóstico/correcciones acotadas:
- Tailwind del harness no descubría las utilidades del `src` real al estar servido desde la raíz de evidencia. `browser/fixture.css` importa el `src/index.css` existente y añade `@source` explícito del `src` real; `main.tsx` importa ese wrapper. No CSS sustitutivo, cambios de tokens ni estilos de producto.
- Los labels que envuelven selects incorporan texto de opciones al matching exacto de `getByLabel`. El runner usa ahora combobox + nombre accesible con prefijo delimitado para Responsable/Tipo/Estado/filtros. Mantiene valores, navegación y todas las assertions.
- **REST-T2E-A11Y-01**, ampliación causal autorizada por parent: el botón cliente con `role=combobox` tenía nombre accesible vacío. Una línea `aria-label` identifica `Cliente: <nombre seleccionado>` o `Seleccionar cliente`. Regresión del componente real verifica ambos estados, actualización A→B y callback real de selección. Sin cambios de routing/selección.
- Loading conserva la assertion de visibilidad, acotada al tabpanel Tareas y al nodo visible; no acepta skeleton oculto. La utilidad real `.h-16` se genera de nuevo. No se eliminan assertions de overflow/foco/aislamiento ni se omiten casos.

Fidelidad estática/servidor: fetch readonly de `http://127.0.0.1:5187/fixture.css` devuelve 200 y CSS transformado (104093 bytes) con `.flex`, `.hidden`, `.h-16`, `.lg\\:flex`, `.sm\\:max-w-lg`, media query `width >= 64rem` y token `--background-secondary`. El servidor existente sirve el cambio sin reinicio; GET readonly de `/main.tsx` y del módulo ClientSelector devuelve 200 con import `fixture.css` y `aria-label` actualizados. No se arrancó/detuvo otro proceso. Entrega HMR a un navegador existente no observada: no hubo ejecución de navegador del writer. Esto demuestra generación/servicio de utilidades, no layout visual PASS.

| Comando exacto | Resultado de esta tanda |
| --- | --- |
| `npm test -- --run src/features/progress/components/client-selector.test.tsx` RED | 2 FAIL: combobox `Name ""`, inaccesible por nombres esperados. |
| Mismo comando GREEN final | 2 PASS. Primera tentativa posterior al label: `ReferenceError: ResizeObserver is not defined`; suplidas solo APIs DOM ausentes de JSDOM en el test, restauradas al finalizar. |
| `npm test -- --run` final | 64 archivos / 378 PASS, sin omitidas. |
| `npm run lint` final | **FAIL**, 13 errores/10 warnings. Errores exclusivamente en `cache/deps/react-router.js` y `cache/deps/recharts.js`, por directivas de paquetes generados: `Definition for rule 'jsx-a11y/anchor-has-content' was not found`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `react/no-array-index-key`, `@typescript-eslint/no-unnecessary-condition`, `jsx-a11y/click-events-have-key-events`, `jsx-a11y/no-static-element-interactions`. Sin limpieza, instalación ni cambios al lint global; no hay excepción aprobada para declarar PASS. |
| `npm run build -- --config docs/evidence/rest-t2e-admin-20261005/vite.isolated.config.ts` inicial | FAIL `TS2769: No overload matches this call.` El test usaba `exact` de Playwright en opciones RTL `ByRoleOptions`; retirado, conservando matching exacto por string de nombre. |
| Mismo build final | PASS `tsc -b` + Vite, 3554 módulos; warning de chunk >650 kB. |
| `node --check docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs` | PASS, inspección sintáctica sin browser. |
| `git diff --check` | PASS, exit 0; los archivos nuevos se inspeccionan como fuentes, no están incluidos en el diff Git. |

Inspección de hashes: 11/11 entradas coinciden con el manifiesto. Un primer probe CSS ad hoc falló por escaping del comando: `SyntaxError: Invalid regular expression: missing /`; repetido sin regex, obtuvo el CSS/markers indicados. No fue un fallo de CSS ni se ejecutó navegador.

Freeze de fuentes: [correction-source-hashes.json](./correction-source-hashes.json). Selector: SHA256 HEAD `5a61f4db3c42df483541cf569584c5b5dacbcf963985ddd3aed757056deb8bdd` → `f1e710edd46e7783e25c365585c4ed5b30566dae562aac6e7e3b65719caf0091`, diff de una línea. `src/index.css` idéntico a HEAD (`b781f9fc04d479ea2ff68d9fae493a8b540c1a1c33b3f0a9d971096bf0137da4`). Las ocho fuentes/tests anteriores no se editaron en esta tanda; sus hashes actuales permiten cotejo del parent con su handoff previo. El contexto compactado no incluía los valores numéricos anteriores para repetir ese cotejo aquí.

**Estado de tanda: partial por lint obligatorio FAIL.** Pendiente comprobación independiente, posibles defectos adicionales no anticipados y aceptación visual. Comando preparado, exclusivamente para parent/verificador con el mismo servidor existente:

```text
node docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs
```

## Corrección del límite de cache generado para lint — 2026-10-05

Seguimiento autorizado únicamente de configuración lint/evidencia, posterior al `partial` anterior. El harness del candidato introdujo interferencia en `eslint .`: su `cacheDir` de Vite es `docs/evidence/rest-t2e-admin-20261005/cache`, pero el ignore de ESLint no excluía ese output de terceros. Se preserva el FAIL histórico y su causa; no se reclasifica como PASS retroactivo ni se suprime una regla de código propio.

Antes de editar se repitió **`npm run lint`: FAIL, exit 1, 13 errores / 10 warnings**. Clasificación completa: `cache/deps/react-router.js` contiene los 3 errores (10608, 10643, 10774); `cache/deps/recharts.js` contiene los otros 10 (8555, 10040, 16811, 17013, 17497, 22522, 22555, 24939 y dos en 32544). Todos son directivas de reglas inexistentes dentro del cache generado de terceros. Ningún error fuera de ese path. Detalle y hashes: [checkpoint/lint-boundary-freeze.json](./checkpoint/lint-boundary-freeze.json).

Cambio mínimo: se añade solamente `docs/evidence/rest-t2e-admin-20261005/cache/**` al ignore global existente de `eslint.config.js`. No se ignoran fuentes, tests, fixtures de navegador, documentación ni configs autorales; no se desactiva ninguna regla ni se modifica/elimina el cache existente.

Después: **`npm run lint`: PASS, exit 0, cero errores / una advertencia preexistente** en `.local/progress-ux6.tsx:14`, `react-refresh/only-export-components`. RED/GREEN observado del límite de lint; excepción justificada a RED de comportamiento: cambio exclusivamente de descubrimiento de archivos generados, sin cambio funcional de aplicación. No se fabrica RED de servicios ni de UI.

Freeze: 11/11 hashes de producto del manifiesto previo coinciden; harness/configs quedan identificados en el checkpoint adicional. Tests (378 PASS) y build aislado previo permanecen válidos para la aplicación sin cambios; no se repiten por este ajuste exclusivamente ESLint. No hubo navegador, reinicio de servidor, instalación, limpieza ni operaciones Git de escritura. El estado `partial` anterior queda resuelto **solo respecto al lint obligatorio**; la primera ejecución independiente continúa siendo 8/18 PASS, agregado FAIL, y la confirmación de navegador/aceptación visual permanece pendiente.

Comando exacto preparado para parent/verificador, desde Admin, sobre el servidor existente en 5187:

```text
node docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs
```

## Incidente TESTTOOLING: option nativo y continuación funcional — 2026-10-05

No tercera ronda de polish visual. Historial preservado: primera ronda **8/18 PASS, agregado FAIL**; confirmación `run-2026-10-05T18-29-10-523Z-61203da8-7899-42e9-8c67-7a767162d2c1`, **14/18 PASS, agregado FAIL**. Los cuatro casos de matriz se detuvieron en la assertion del option histórico: `retained.isDisabled()` recibió false. Los flujos posteriores siguen pendientes; no hay aprobación global/visual.

Diagnóstico confirmado, no hipótesis: trace desktop-light identifica el OPTION seleccionado, valor `66666666-6666-4666-8666-666666666666`, atributo `disabled` y target `call@339`. El selector no apuntaba a otra opción. En Playwright **1.56.1** instalado, `elementState` usa `retarget(..., 'follow-label')` para disabled; OPTION no está en las excepciones de follow-label, por lo que reemplaza el option por `enclosingLabel.control`, el SELECT habilitado. Es el estado del control padre, no la elegibilidad del option.

Probe mínimo autorizado:

```text
node docs/evidence/rest-t2e-admin-20261005/native-option-probe.cjs
```

**PASS observado.** `setContent` local compara el mismo select/option con y sin label envolvente: isDisabled bare=true, wrapped=false; en ambos, `HTMLOptionElement.disabled=true`, hasAttribute=true, ariaSnapshot `- option "Historical" [disabled] [selected]` y lookup accessible disabled coincide. Chrome Home→ArrowDown→ArrowUp produce `""`→`eligible`→`""`, saltando el option histórico. Sin app, navegación, screenshots, trace ni intentos de red; su propio browser se cerró. Resultado conservado en `checkpoint/native-option-probe-b250976b-48f4-440f-a27f-f45bfd226754/result.json`.

Corrección del runner: exige instancia nativa OPTION, disabled=true, atributo disabled y UUID histórico exacto. Conserva el valor seleccionado y prueba PUT sin `assigned_to_id` cuando no cambia. Después de acreditar ese PUT, reabre el editor y ejercita Home/ArrowDown/ArrowUp sobre el select real, exigiendo que salte el option histórico; descarta explícitamente ese draft sin otra escritura. Si la UI permite elección ilegal, el caso falla y se informa como defecto de producto, sin parchearlo. El lookup específico de API sigue siendo la fuente de opciones habilitadas; no se inyectan ni se habilitan opciones.

Continuación preparada, **NOT_RUN**, exclusivamente para parent/verificador:

```text
node docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs --remaining-functional
```

Alcance explícito: **2 casos**, escritorio 1440×900 y móvil 390×844, una vez cada uno en oscuro. Ejecutan el core funcional de la matriz incompleta, con prefijos de navegación necesarios para llegar a los flujos pendientes; no vuelven a ejecutar los otros 14 casos ni duplican temas. Cada caso conserva paging/filtros/null, option histórico y PUT omitido, teclado de selección; Tab/Escape/foco de retorno; validación sin responsable con cero POST y draft conservado; lookup página 2 y creación; edit/progreso/completar; cerradas read-only; cancelación con confirmación rechazada (sin PUT) y aceptada; versiones y estados exactos; ausencia de mutaciones de mensajes/pautas. Completar conserva el contrato actual sin confirmación adicional; el rechazo/aceptación corresponde a Cancelar. Se mantienen overflow y ancho Sheet móvil como assertions geométricas funcionales, no criterio de nuevo diseño.

El modo no llama screenshot ni en éxito ni en fallo; tracing tiene `screenshots:false`, conserva snapshots/logs/recibos. Outputs nuevos `browser-output/independent/remaining-functional-<fecha>-<uuid>/`, JSON con mode/expectedCases=2 y resultado solo de esos dos casos. No se declara 18/18 ni PASS visual. El modo predeterminado sin flag mantiene los 18 casos y sus capturas, con el mismo control nativo corregido. Flags desconocidos/duplicados se rechazan; no hay omisiones silenciosas de assertions.

Checks observados: `node --check docs/evidence/rest-t2e-admin-20261005/native-option-probe.cjs` PASS; `node --check docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs` PASS. [Freeze/diagnóstico](./checkpoint/native-option-tooling-freeze.json) contiene hashes de scripts y datos del probe; 11/11 hashes de producto permanecen iguales. Sin cambios de app, lint/build/configs/fixtures, servidor, dependencias ni Git de escritura. No se ejecutó continuación ni otra ronda completa/visual.

## Incidente de lanzamiento: runtime corto — 2026-10-05

La continuación independiente `remaining-functional-2026-10-05T18-43-14-066Z-dfc0bef9-9821-42d2-9524-45683a66a651` terminó **FAIL antes de cualquier caso funcional (0 ejecutados)**: `browserType.launch: Target page, context or browser has been closed`. Chrome informó fallos GPUPersistentCache/DawnGraphiteCache bajo el runtime anidado en el recibo largo y `Failed to open UKM database: -4 sql::Database is not opened.` No demuestra un defecto de producto. La longitud de ruta es una hipótesis apoyada por el diagnóstico, **no causa raíz probada**.

Mitigación mínima autorizada: el runtime único pasa a `browser-output/r-<8hex>/`, dentro del output ya ignorado; `mkdir` exclusivo no reutiliza ni altera un directorio existente y una colisión falla cerrada. TEMP/TMP/TMPDIR del runner/browser apuntan allí. Logs/results/traces mantienen el nombre largo y legible del recibo. `results.json` añade `runtimePath` y `receiptPath` para su correspondencia; `run.log` registra `RUNTIME:` antes de launch, incluso si falla. Sin borrados, limpieza, flags nuevos, cambios de sandbox/registro, perfiles de producción ni operación de servidor. Recibos/perfiles anteriores no se tocaron.

Cálculo readonly en este checkout: runtime representativo de 116 caracteres; el archivo cache observado pasa de 316 a 224 caracteres con el mismo sufijo Playwright/profile/Chrome. Deja 36 bajo 260, o 35 reservando NUL. Es presupuesto del sufijo observado, no garantía de todos los nombres futuros de Chrome ni prueba causal. Detalle/hash: [checkpoint/runtime-short-path-freeze.json](./checkpoint/runtime-short-path-freeze.json).

`node --check docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs`: PASS. 11/11 hashes de producto coinciden con el freeze previo. Assertions, casos, fence externa, fixtures/configs y modos de captura permanecen iguales. No se ejecutó browser, aplicación ni otra ronda visual en esta etapa; continuación con mitigación **NOT_RUN**. Comando independiente siguiente, con Vite existente intacto:

```text
node docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs --remaining-functional
```

## REST-T2E-FOCUS-01 — defecto funcional de accesibilidad, 2026-10-05

Historial conservado: 8/18 FAIL agregado, después 14/18 FAIL agregado; continuación con fallo de launch y cero casos; posteriormente `remaining-functional-2026-10-05T18-48-36-081Z-e7e77476-5bfe-4088-a4b3-578d1aa1f14b` ejecutó ambos casos y completó assertions de mutaciones/elegibilidad/histórico, pero ambos terminaron **FAIL**: `AssertionError [ERR_ASSERTION]: Sheet must return focus to opener`. No se reclasifican como PASS.

Primero se corrigió el timing del runner, antes de cambiar producto: exige Sheet cerrada y poll acotado (12 s) del foco real en Nueva tarea; guarda `focusAfterClose` con tag/role/label/text del activeElement en finally, también si timeout. No cambia el criterio ni elimina assertions. No se ejecutó browser por el writer. La reproducción RTL con Radix real, cierre confirmado y waitFor acotado **sí falló determinísticamente**: 27 PASS / 4 FAIL, foco recibido BODY en Escape (opener nuevo y de fila), descarte aceptado y creación exitosa. No era solo una lectura inmediata susceptible al callback diferido.

Causa/cambio mínimo: Sheet controlada sin SheetTrigger, por lo que la restauración por trigger de Radix no conoce el opener. FollowUpPanel captura el botón real que abrió el editor. TaskEditor usa únicamente su `onCloseAutoFocus` para restaurarlo tras el cierre real. El callback comprueba panel conectado, identidad vigente, pertenencia al panel y target visible/no hidden/inert/aria-hidden; si la mutación retiró la fila usa Nueva tarea del mismo panel vivo. No enfoca un cliente anterior ni target oculto; no modifica el Sheet global ni estilos, navegación, payloads, lookup o guardas de descarte.

| Comando exacto | Evidencia final |
| --- | --- |
| `npm test -- --run src/features/progress/follow-up-tasks/follow-up-panel.test.tsx` RED | 27 PASS / 4 FAIL de foco tras cierre y poll, BODY activo. |
| Mismo comando GREEN/triangulación | 33 PASS; diez casos nuevos de foco, sin sleeps como prueba. |
| `npm test -- --run` | 64 archivos / 388 PASS. |
| `npm run lint` | PASS, cero errores; warning preexistente `.local/progress-ux6.tsx:14`. |
| `npm run build -- --config docs/evidence/rest-t2e-admin-20261005/vite.isolated.config.ts` | PASS `tsc -b` y Vite, 3554 módulos; warning chunk >650 kB. |
| `node --check docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs` | PASS. |
| `git diff --check` | PASS. |

Triangulación: foco tras Escape y éxito; cancelar descarte mantiene draft/foco y aceptar cierra/restaura; completar elimina fila y restaura fallback del mismo cliente; remount de editor por conflicto conserva foco dentro del nuevo editor; cambio de cliente/identidad, unmount y panel oculto no roban foco a navegación. Los casos negativos esperan el evento real diferido `focusScope.autoFocusOnUnmount`, no simplemente ausencia inmediata del dialog. Dos errores de setup de nuevas pruebas se corrigieron sin tocar contratos: historial compartido de spy confirm (limpieza por caso de foco) y matching exacto de título dentro de un párrafo de servidor más largo (prefijo anclado; valor final exacto preservado).

Freeze: [checkpoint/focus-01-freeze.json](./checkpoint/focus-01-freeze.json), tres fuentes/tests cambiados y runner actualizado. Las otras ocho entradas de producto coinciden con el manifiesto histórico. Harness/fixtures/fence/red externa y runtime corto preservados. No browser funcional/visual, screenshots, reinicio, operaciones remotas, limpieza, staging/commit ni cambio de diseño. **Confirmación tras esta corrección: NOT_RUN**, independiente con el comando existente:

```text
node docs/evidence/rest-t2e-admin-20261005/verify-browser.cjs --remaining-functional
```

## Cierre de sesión: REVIEW_REQUIRED y checkpoint recuperable — 2026-10-05

Se detiene implementación de fuentes. **REVIEW_REQUIRED**: falta consentimiento fresco para revisión nativa y checkpoint/commit local del parent; no hay commit ni P5 DONE. La inspección nativa anterior seleccionó 23 paths, target SHA256 `726417b74601b623021ed59f6ef1d0eb86736b8e2bc34f94c36eec047c547f02`, tree `3a13d1b4e1b34324f882b178c4949c90a1e83a51`. **START expiró tras 10 minutos sin respuesta**: `lineage_created=false`, `native_invocation=false`, `mutation=false`. No fue consentimiento rechazado ni aprobado; la lineage propuesta no se creó. Al regresar la persona, corresponde **fresh inspect/select + START**, no reutilizar el consentimiento vencido ni presentar el antiguo target como inspección del estado posterior de este README.

ASSESS fue unknown/unassessable sobre la declaración untracked. El parent completó fallback independiente de riesgo alto; eso no concede consentimiento nativo ni fabrica una lineage/aprobación. Resultado técnico comunicado y evidencia preservada:
- Writer: 64 archivos / **388 PASS**, lint cero errores / una advertencia antigua y build aislado TypeScript/Vite **PASS**.
- Independiente: suite focal **33 PASS** y continuación **2/2 PASS** (`remaining-functional-2026-10-05T19-05-18-406Z-c8b23b85-aa7c-4b9e-bd7d-f05160673405`). El recibo guarda foco post-cierre en BUTTON Nueva tarea, sin escapes/errores de página.
- Los 14 casos anteriores aprobados más esta continuación son evidencia combinada; **no hubo rerun 18/18**, ni esta prueba sintética acredita API/Firebase live.
- El parent vio capturas corregidas desktop-light y mobile-dark sin solapamiento/overflow. No equivale a aprobación de diseño del usuario ni nueva ronda visual del writer.
- REST-T2E-A11Y-01 y REST-T2E-FOCUS-01 conservan RED/GREEN y correcciones focales; fallos históricos, incidente de launch, limitación Playwright/isDisabled y límites de evidencia permanecen intactos.

Checkpoint final recuperable: [checkpoint/final-pending-review-2026-10-05T19-41-12-310Z/manifest.json](./checkpoint/final-pending-review-2026-10-05T19-41-12-310Z/manifest.json). Incluye backups `.snapshot` de archivos autorales sin activar inputs compilables, parche Git de todos los cambios tracked, manifiesto/hash de nuevos archivos, base/upstream/status y prueba de índice sin cambios. Los snapshots no contienen caches/outputs recursivos ni secretos. El manifiesto distingue el antiguo target de revisión y esta instantánea posterior.

Generated files/caches/recibos/perfiles son **LOCAL_ONLY**, ignorados y retenidos: un clone fresco no hereda automáticamente esa evidencia. El parent añadió únicamente los ignores de checkpoint/correction-source-hashes a `.gitignore` en el último paso; se preservan, sin ajustes nuevos aquí. Vite existente 66400/5187 y recursos API/PG no se tocaron; tampoco se ejecutaron checks, browser, revisión nativa, acciones Git de escritura, limpieza o remotos en este cierre. El tracking en la raíz de coordinación y toda disposición final de revisión/commit siguen siendo del parent.

## Cierre documental precommit aprobado — 2026-10-05

Actualización posterior al checkpoint REVIEW_REQUIRED; el consentimiento expirado y todos los FAIL históricos anteriores se conservan como historia, no como estado actual. Native review **`review-629aec3476ffc9b0` APPROVED**. El parent informa acknowledgement exacto consumido exitosamente: target `sha256:726417b74601b623021ed59f6ef1d0eb86736b8e2bc34f94c36eec047c547f02`, candidate tree `3a13d1b4e1b34324f882b178c4949c90a1e83a51`, consumed revision `sha256:8430342a9930a93ed6055c26b7a747a6ba29f7d8ed19ef29b6b4d88d97b046c7`. **Authority burned**: no reapertura ni reutilización de esa autoridad. El grupo se interrumpió después de tres submissions; bound status se reanudó solo para la captura final de fiabilidad; las cuatro quedaron admitted. No correction. Este writer no invocó revisión nativa.

Estado técnico: **APPROVED / VERIFIED, LOCAL COMMIT PENDING**. Se mantienen writer 64 archivos / 388 PASS, focused independiente 33 PASS, browser continuation 2/2 PASS y los 14 casos previos aprobados como evidencia combinada, no rerun 18/18 ni integración live API/Firebase. No bytes de fuentes/configs/scripts cambiados en este cierre; únicamente documentación y checkpoint pasivo.

Advisories informativos no bloqueantes para este commit, separados de la corrección actual y abiertos para seguimiento P5 posterior:

| ID | Estado | Ubicación | Criterio de cierre |
| --- | --- | --- | --- |
| R3-frozen-retry-rejection | OPEN — follow-up P5 posterior | `src/features/progress/follow-up-tasks/task-editor.tsx:100-104` | Reproducir independientemente la preocupación nombrada y registrar disposición con regresión cuando aplique, antes de aceptación final P5. |
| R3-replacement-focus | OPEN — follow-up P5 posterior | `src/features/progress/follow-up-tasks/task-editor.tsx:119` | Mismo criterio: reproducción independiente y disposición/regresión aplicable antes de aceptación final P5. |
| R4-refetch-blocks-confirmed-save | OPEN — follow-up P5 posterior | `src/features/progress/follow-up-tasks/task-editor.tsx:97-98` | Mismo criterio: reproducción independiente y disposición/regresión aplicable antes de aceptación final P5. |

Texto detallado de revisores no disponible: estos IDs/ubicaciones no se convierten en defectos confirmados ni se inventa diagnóstico. Sin fixes silenciosos ni ampliación de implementación.

Checkpoint [approved-precommit-2026-10-05T20-14-02-682Z/manifest.json](./checkpoint/approved-precommit-2026-10-05T20-14-02-682Z/manifest.json): **24 paths autorales exactos**, los 23 revisados más README pasivo; manifiesto/hash, snapshots `.snapshot`, referencias recuperables al checkpoint previo y observaciones readonly de HEAD/rama/upstream/índice/hooks. El README pasivo actual no se presenta como el target anterior revisado. Generated cache/build/output/checkpoints se conservan LOCAL_ONLY y no se incluyen como paths para commit.

El parent hará stage/commit exclusivamente de los paths del manifiesto y registrará evidencia final. **No DONE hasta commit y evidencia final; no cierre P5 por estos advisories abiertos.** No se ejecutaron tests, build, lint, revisión nativa, scripts de hooks, Git de escritura, limpieza, browser ni cambios de servidor en este cierre. Root tracking y disposición de los follow-ups siguen siendo parent-owned.

## Handoff y límites

Implementación dentro de superficies autorizadas. Sin dependencias nuevas, rebrand, PRODUCT/DESIGN paralelo, cambios API/App, mensajes, datos remotos, staging/commit/publicación, limpieza ni P6. El detector y checks técnicos no sustituyen el navegador independiente ni revisión del parent. El árbol fuente nuevo/no seguido debe incluirse en el checkpoint/commit que prepare el parent; builds y recursos ignorados son solo locales. No crear un commit que omita `follow-up-tasks/`.
