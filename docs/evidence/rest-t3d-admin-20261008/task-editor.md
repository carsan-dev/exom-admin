# REST-T3D-ADMIN-01a — guardado confirmado independiente del refetch

> Copia saneada para entrega: ubicaciones normalizadas; resultados, fechas y hashes conservan su significado histórico y corresponden al snapshot privado original, no a esta copia. WORKSPACE_ROOT identifica la coordinación; SDK_ROOT el SDK instalado; RUNTIME_ROOT las herramientas locales; TEST_ARTIFACT_ROOT los recursos privados retenidos, no publicados.


Implementado y validado localmente el cierre/foco del editor tras confirmación de create/update, sin esperar al refetch. La incertidumbre conserva el UUID/payload original; no se ha cambiado la política de conflictos. Verificación funcional independiente y navegador PASS según evidencia de 2026-10-08 añadida al final; nueva revisión nativa y commit local siguen pendientes del padre. Esto no cierra Admin completo, REST-T3D ni P5.

## Identidad y alcance

- Ventana UTC observada: inicio `2026-10-08T13:18:06.981Z`; checks funcionales terminados antes de `2026-10-08T13:24:45.580Z`.
- Raíz Admin real: `${WORKSPACE_ROOT}/exom-admin`; rama `fix/progress-detail-and-charts`, HEAD/base de esta unidad `6f5080b58383dc37b10ab490dd92e408eb79d3c2`.
- Upstream `origin/fix/progress-detail-and-charts`; merge-base `e14d56a8b35ca2bb18420d27549739d237653084`. Status/diff iniciales limpios; índice vacío. Sin fetch, stage, commit, checkout ni operaciones remotas.
- Coordinación EXOM no Git según contexto parental, sin inicialización. Documento consumido: [CURRENT y REST-T2E](../../../../odd/tasks/progress-remaining-phases.md), SHA256 inicial `44e615fbcfd894e7e5348ab8c4239e63cabdc282f024abe3223f84f0c1dd9b0b`.
- Admin `.codegraph` existente confirmado, no reinicializado. Lecturas directas completas de los dos archivos reales autorizados; no búsqueda estructural ni resultados del editor genérico usados como evidencia.
- Node `22.21.0`, npm `11.13.0`; instalados Vitest `4.1.9`, TypeScript `5.9.3`, Vite `6.4.2`, ESLint `9.39.4`. Scripts reales: `test=vitest run`, `lint=eslint .`, `build=tsc -b && vite build`.
- Tres rutas authored: `task-editor.tsx`, `follow-up-panel.test.tsx` y este recibo nuevo (no existía). Sin dependencias, lockfiles, API/App, recap editor, print cache o browser helpers editados.

## Resultado y disposición basada en evidencia

| Contrato | Evidencia/disposición local |
| --- | --- |
| R4-refetch-blocks-confirmed-save | Reproducido: el `await invalidateQueries` mantenía abierto el editor con refresh pendiente; refresh rechazado entraba en el catch de mutación y congelaba un commit ya confirmado. Ahora invalidación asíncrona con catch propio y cierre guardado por `stillHere`. |
| R3-frozen-retry-rejection | No defecto demostrado de congelación: baseline ya conserva frozen tras timeout seguido de 400/403/409. No unfreeze, nuevo UUID ni contenido editable automáticos. |
| Retry tras recuperación | Tras timeout→400/403, tercer POST exitoso usa exactamente el body original, incluido UUID y descripción normalizada. Tras 409, frozen permanece y retry queda deshabilitado por conflicto: no se inventa una política de replay/overwrite. |
| 403 inicial definido | Test previo continúa pasando: draft editable y campos conservados, distinto de retry de resultado incierto. |
| Descarte local incierto | Copy existente ya dice que puede haberse realizado y exige comprobar listado antes de crear otra tarea; sin cambio de texto innecesario. Test de cancelar/aceptar cierre prueba que no emite otro POST, no que el servidor no aplicara el primero. |
| R3-replacement-focus | Casos existentes de reemplazo por versión, opener retirado, panel oculto, navegación/unmount pasan; ninguna modificación del controlador de foco. |
| Propietario tardío | Tres nuevos casos client/identity/unmount: invalidación solo del scope original, nunca cierre/foco del nuevo editor. |

Fuente del fix: [task-editor.tsx](../../../src/features/progress/follow-up-tasks/task-editor.tsx), `save` (líneas 93–110). Fuente de protección: `stillHere`, `alive`, payload frozen, conflicto 409 y `locked`, sin cambios. Regresiones: [follow-up-panel.test.tsx](../../../src/features/progress/follow-up-tasks/follow-up-panel.test.tsx), once casos nuevos desde línea 164; 33 anteriores preservados.

La premisa parental ya refutada se mantiene: autorización API precede dedup de UUID (`client-followup-tasks.service.ts:88–155,366–421`, cita transmitida por el padre, no nueva validación API). Un create con respuesta perdida pudo aplicar antes de revocación; retry403 o UUID409 no prueban ausencia de aplicación. No nueva cola persistente, reconciliación ni autorización debilitada.

Texto íntegro de advisories nativos: **NOT_PROVIDED**. Las disposiciones anteriores derivan de fuente/tests observados, no de un nuevo verdict ni revisión del candidato consumido.

## TDD causal y verificación

TDD test-first explícito de esta delegación. Todos los comandos en foreground desde Admin, sin live API, DB, Firebase ni servidor.

| Comando exacto | Resultado observado |
| --- | --- |
| `npm test -- --run src/features/progress/follow-up-tasks/follow-up-panel.test.tsx` — preparación inicial | FAIL: 36 PASS/8 FAIL y 1 error no manejado. Cuatro fallos causales más fixture GET de UUID mal tipado y tres consultas de opener oculto por modal. Se corrigió solo el harness, no producto. Log local `${RUNTIME_ROOT}/AppData/Local/Temp/pi-bash-1afb3da3298bb7fc.log`. |
| Mismo comando — RED causal, fuente original intacta | FAIL: 40 PASS/4 FAIL, solo create/update × pending/rejected en cierre del diálogo. Sin errores no manejados. Inicio `13:19:47Z`, duración 17.84s; log local `${RUNTIME_ROOT}/AppData/Local/Temp/pi-bash-9842b088167f24ae.log`. |
| Mismo comando — primer run tras fix mínimo | FAIL: 40 PASS/4 FAIL; cierre/foco ya pasan, falla assertion de confirm por llamadas acumuladas del test previo. Se aisló `window.confirm.mockClear()` en los cuatro casos, sin debilitar assertion. |
| Mismo comando — GREEN final | PASS: 44/44, 1 archivo, sin errores no manejados; inicio `13:20:51Z`, duración 14.24s. |
| `npm test -- --run` | PASS: 67 archivos/425 tests, sin pending/fallos/errores no manejados; inicio `13:21:15Z`, duración 78.85s. |
| `npm run lint` | PASS: 0 errores/1 warning en `.local/progress-ux6.tsx:14:10` (`react-refresh/only-export-components`), archivo no editado; warning histórico citado en REST-T2E. |
| `npm exec -- tsc -b` | PASS: exit0, sin diagnósticos. |
| `npm exec -- vite build --outDir ${RUNTIME_ROOT}/AppData/Local/Temp/exom-admin-rest-t3d-eb65a432-b64d-4f63-92c5-dff3bda95d13 --emptyOutDir false` | PASS: 3555 módulos, 20.27s. Destino único bajo system TEMP comprobado inexistente antes; no vaciado de dist ni cleanup. |
| `git diff --check` | PASS exit0 para tracked; se repite tras escribir recibo. |

Los últimos dos checks equivalen a las dos etapas del build real, evitando borrar artefactos Vite/dist previos. Salidas de tooling de tests/tsc y Vite temporal permitidas explícitamente; no cambios mantenidos fuera del inventario.

TRIANGULATE: once nuevos casos cubren incertidumbre/rechazo/recuperación, descarte advertido, commit confirmado y propietario tardío; todos los casos de foco/reemplazo/retirada y draft403/409 previos pasan. Sin refactor extra. La promesa diferida de invalidación aísla el efecto de refresh, no prueba integración HTTP/DB ni liveness real.

## Bytes probados y recuperación

| Archivo | SHA256 baseline | SHA256 final probado |
| --- | --- | --- |
| `src/features/progress/follow-up-tasks/task-editor.tsx` | `59378d62e2f36fc5da01a46f3a57914e3971d7ed796db17a641131fbd7cc9b21` | `634207c12fe526b051365aaad09e568952fa2c69148d2bb7396b7d1ef5a398ce` |
| `src/features/progress/follow-up-tasks/follow-up-panel.test.tsx` | `84382337c58bfc369c5b3e7137804890a8182186e2ee5bd5afb5a7cd59f4081f` | `1219e241989b55d99ad1439c928be3737194113434b3bd436b3a8d8c82518422` |

SHA del test RED causal: `dce929679b07c1b9cba3eaffcfc0db5867cdc60b37d2b4c937b751dd94425665`; a `13:20:11.179Z` fuente seguía exactamente baseline. Hashes finales verificados a `13:23:45.407Z` tras suite/lint/tsc y repetidos al entregar. No cambios fuente después de GREEN.

Diff fuente/test: +105/−1 (102 líneas de test, fix +3/−1), más recibo. Estado final y hash del recibo en handoff, evitando autorreferencia. Inventario/índice inspeccionados; ningún otro tracked modificado. Git HEAD no identifica por sí solo este diff aún sin commit; archivos locales actuales más este recibo constituyen el handoff recuperable para checkpoint del padre. Logs TEMP son LOCAL_ONLY, no prueba recuperable desde fresh clone.

API HEAD `2860703d8e00dc6a096a02c0c4b37543c0cd514a`, solo probe original untracked SHA256 `8b5ba61a1cf147c643727dbfb2f7139126e6f08647906bb7cf5ad9004ddc8ac4`; App HEAD `15af3774308a9a0d080705a38e4327c9b251f2d3`, limpia. Lecturas de estado final coinciden con contexto parental, sin escritura en esos repos.

Rollback revisable: retirar únicamente los dos hunks de esta unidad en editor/test y el recibo, conservando cambios ajenos; no operación destructiva ejecutada. Cierre independiente pendiente del padre sobre estos hashes, navegador/foco real y revisión nativa nueva si procede; no se abrió ni reabrió ninguna revisión aquí. Recap editor/print cache/browser helper y reconciliación API/App/P5 permanecen unidades separadas, no defectos nuevos atribuidos sin evidencia.

## Runner mantenido preparado — navegador NOT_RUN

Añadido [verify-task-editor.cjs](./verify-task-editor.cjs) para cuatro casos: create/update × desktop 1440×900/mobile 390×844. **Preparado, no ejecutado**; no nuevo PASS de navegador, aprobación visual ni cierre técnico. Conserva íntegros los resultados históricos anteriores. No requiere RED artificial: el defecto ya está corregido y los hashes editor/test anteriores quedan fijados como precondición.

Desde la raíz Admin, el verificador autorizado podrá ejecutar exactamente:

```text
node docs/evidence/rest-t3d-admin-20261008/verify-task-editor.cjs
```

| Preparación / límite | Contrato del runner |
| --- | --- |
| Dependencias ya instaladas | Node 22.21.0; Vite 6.4.2 en `exom-admin/node_modules/vite/dist/node/index.js`; Playwright 1.56.1 resuelto en `../docs/evidence/metrics-p1-20260916/browser-tools/node_modules/playwright/index.js` (no está en node_modules Admin); Chrome comprobado en `${SDK_ROOT}/Google/Chrome/Application/chrome.exe`. No instala ni descarga. |
| Overrides / argv | `EXOM_PLAYWRIGHT_MODULE` selecciona un módulo instalado, `EXOM_BROWSER_EXECUTABLE` un ejecutable instalado. Sin argumentos por defecto; única opción `--output <directorio-nuevo-hijo-directo-de-system-TEMP>`. Rechaza cualquier directorio existente, incluso vacío, antes de habilitar escrituras de resultados. |
| Salidas nuevas aisladas | `mkdtemp(system TEMP/exom-task-editor-*)`; dentro: `runtime` para perfiles/cache Chrome, `vite-cache`, JSON por caso, `results.json`, trazas ZIP y PNG pending/released. TEMP/TMP/TMPDIR del proceso/browser apuntan al runtime nuevo. Sin cleanup destructivo, reutilización de outputs previos, dist, checkpoints ni caché antigua. Resultado agregado exige exactamente 4 PASS; errores de caso/setup/traza/cleanup no se ocultan. |
| Fuente servida | Carga `docs/evidence/rest-t2e-admin-20261005/vite.browser.config.ts` mediante `vite.loadConfigFromFile` con loader por defecto `bundle`, que genera salida ignorada autorizada en `node_modules/.vite-temp/**`. Sustituye la elección inicial `runner` por el incidente causal registrado abajo. `createServer` conserva plugins/aliases del original, sustituye cacheDir y fuerza `configFile:false`, `envDir:false`, sin dotenv ni configuración productiva. |
| Servidor propio | host 127.0.0.1, port 0/strictPort, HMR limitado al WebSocket de este mismo origen efímero. En Vite 6 `server.listen(0)` cae al puerto por defecto; por eso se enlaza directamente **su nuevo** `httpServer.listen(0)` y se deriva el origen de `address().port`. Valida el marker `EXOM · Seguimiento sintético aislado`. Nunca usa el servidor antiguo 5187 ni termina PIDs ajenos. |
| Fixture real existente | `browser/main.tsx` importa AppLayout/ProgressPage y el editor de `src`; aliases API/auth a `browser/fixture-api.ts` / `fixture-auth.ts`, no copia del editor. Axios adapter en memoria: HTTP solo sirve archivos Vite, no API/auth reales, DB ni Firebase. |
| Fence previo a navegación | Abort de todo request fuera del origen efímero exacto y rutas `/api`/`admin`; bloquea service workers y todos los WebSockets salvo `ws://127.0.0.1:<puerto-propio>/` de Vite (misma autoridad exacta); remotos/Firebase siempre bloqueados. Vite 6 inyecta un cliente que intenta conectar incluso con `hmr:false`; se conserva HMR local en vez de introducir un falso fallo del harness. Intentos bloqueados y pageerrors hacen fallar el caso. |
| Barrera de liveness | Listado/resumen/responsable iniciales disponibles; `holdReads(A)` justo antes de submit. Espera snapshot con write confirmado **y** pending >0; exige diálogo cerrado y foco en el opener vivo, visible, habilitado antes de release; registra pending/delivered/snapshot/mutación/foco. Exactamente un POST o PUT; ninguna respuesta retenida entregada todavía. |
| Selectores / foco | Dialog por nombre exacto Nueva tarea/Detalle de tarea; input Título dentro del dialog, responsable por combobox. Captura handle del opener **antes** del modal (evita labels ocultos ambiguos). Comprueba propiedad nativa `HTMLButtonElement.disabled`, conexión, visibilidad y activeElement, no `isDisabled()` atravesando un label. La discrepancia del option nativo de Playwright 1.56.1 documentada en el runner histórico no se usa como prueba de bloqueo aquí. |
| Después de release | Espera entrega exacta de las respuestas retenidas, ninguna suprimida; create navega a página dos, update permanece en primera. Exige botón del título confirmado desde listado refrescado y exactamente una mutación total. Sin sleeps como sustituto de barrera. |
| Fuera de prueba browser | No simula secuencias combinadas timeout→403/409 ni rechazo de refetch: esa capacidad no existe en el fixture actual. Las regresiones unitarias históricas cubren contratos separados; este runner no reclama probarlos ni probar transporte remoto. |

Checks de preparación limitados a sintaxis, whitespace, readback y preservación de hashes/inventario; sus resultados exactos y hashes del runner/recibo se entregan al padre. No rerun funcional de frontend, browser ni runner antiguo en esta preparación. Cualquier ejecución posterior deberá registrar resultado y ruta TEMP reales; **NOT_RUN** sigue vigente hasta ese verificador.

## Incidente de harness — 2026-10-08, corrección preparada

- Verificación independiente `muzl75ni-n-tjhu`, UTC `13:45:04–13:46:01`: **FAIL, 0/4 casos ejecutados**, antes de servidor/browser. Error `Vite module runner has been closed`. Recibo fallido retenido sin cambios: `${RUNTIME_ROOT}/AppData/Local/Temp/exom-task-editor-OVNw49/results.json`, 1998 bytes (evidencia transmitida por el padre).
- **HARNESS RED, no producto RED**: el loader `runner` cierra su module runner antes de que Vite invoque la factory async `browserConfig`; los imports dinámicos de plugins de la configuración original ya no pueden ejecutarse. Sintaxis/diff/whitespace habían pasado; Vitest/lint/tsc/build independientes quedaron NOT_RUN tras STOP y consulta de política de outputs.
- Cambio mínimo: usar el loader por defecto `bundle`; su factory Node mantiene válidos los imports dinámicos posteriores. Esta decisión sustituye expresamente la elección inicial `runner` para evitar `.vite-temp`. No cambia configuración original, paquetes, editor/test, cuatro casos ni assertions, puerto efímero, aliases en memoria, envDir:false o fences.
- Grant explícito del padre: outputs generados ignorados `node_modules/.vite-temp/**` para bundle; el próximo verificador también puede generar `node_modules/.vite/**`, `node_modules/.tmp/*tsbuildinfo` y `tsconfig.*.tsbuildinfo` ignorados, nunca archivos tracked. Sin cambios de ignores/dependencias. Outputs/cache/perfiles de browser continúan en system TEMP nuevo y único; recursos/outputs antiguos intactos.
- Corrección preparada con checks estáticos únicamente. **GREEN de harness pendiente; rerun independiente/browser NOT_RUN**. El FAIL histórico no se sustituye por PASS ni se dispensan pruebas.

## Verificación independiente — 2026-10-08, PASS posterior al fix de bundle

Evidencia exacta transmitida por el padre del verificador `muzl75ni-n-tjhu`, UTC `13:52:29–13:56:21`; incorporada pasivamente, sin repetir comandos funcionales. Este resultado posterior resuelve el NOT_RUN de preparación y el GREEN de harness pendiente, sin reescribir sus estados históricos ni el FAIL 0/4 anterior.

| Comando exacto del verificador | Resultado observado independiente |
| --- | --- |
| `node docs/evidence/rest-t3d-admin-20261008/verify-task-editor.cjs` | PASS 4/4: desktop 1440×900 y mobile 390×844, create/update en cada viewport. Origen propio nuevo `http://127.0.0.1:63597`, cerrado después mediante lifecycle normal de recursos propios únicamente. |
| `npm test -- --run src/features/progress/follow-up-tasks/follow-up-panel.test.tsx` | PASS 44/44, 13.71s. |
| `npm test -- --run` | PASS 425/425, 67 archivos, 77.11s. |
| `npm run lint` | PASS: 0 errores y 1 warning histórico en `.local/progress-ux6.tsx:14:10`. |
| `npm exec -- vite build --outDir ${RUNTIME_ROOT}/AppData/Local/Temp/exom-independent-t3d-resume-pmodiq61/vite-build --emptyOutDir false` | PASS: 3555 módulos, 17.89s; destino TEMP nuevo, sin vaciado de artefactos anteriores. |
| `npm exec -- tsc -b` | NOT_RUN independiente: habría sobrescrito `tsconfig.node.tsbuildinfo` tracked; no se ejecutó el comando nominal. Sustitución completa por los dos proyectos raíz registrada abajo, sin waiver de typecheck. |
| `node --check docs/evidence/rest-t3d-admin-20261008/verify-task-editor.cjs`; `git diff --check`; checks explícitos untracked | PASS de sintaxis/diff/whitespace comunicado por el verificador. |

**Barrera browser observada en cada uno de los cuatro casos:** write confirmado, 1 GET de listado retenido y 0 respuestas entregadas; diálogo cerrado, foco nativo en opener conectado/visible/habilitado y exactamente 1 POST o PUT **antes** de release. Después: 0 pending, 1 delivered, título confirmado visible y todavía 1 mutación. Totales: 0 escapes de red y 0 errores de browser. El verificador inspeccionó el PNG mobile create posterior a release; no equivale a aprobación visual de todo Admin.

Artefactos retenidos **LOCAL_ONLY**, no evidencia recuperable desde fresh clone: `${RUNTIME_ROOT}/AppData/Local/Temp/exom-task-editor-wNQVpp/results.json` (12461 bytes), 4 JSON de caso, 8 PNG y 4 trazas ZIP. Logs bajo `${RUNTIME_ROOT}/AppData/Local/Temp/exom-independent-t3d-resume-pmodiq61/`: `browser.log`, `focus.log`, `suite.log`, `lint.log`, `build.log`, `syntax.log`. El FAIL anterior sigue retenido en `exom-task-editor-OVNw49/results.json` (1998 bytes), sin sustituirlo por estos resultados.

### Typecheck completo sin sobrescribir cache tracked

El padre inspeccionó la configuración raíz: `files: []` y únicamente dos references, app/node; ninguno de los hijos tiene references, incremental ni composite y ambos conservan noEmit/strict originales. Por tanto se verificaron todos los proyectos referenciados con TypeScript 5.9.3, UTC independiente `13:58:32–13:59:56`:

| Comando exacto del verificador | Resultado / log LOCAL_ONLY |
| --- | --- |
| `npm exec -- tsc --project tsconfig.app.json` | PASS exit0, sin diagnósticos; `${RUNTIME_ROOT}/AppData/Local/Temp/exom-independent-t3d-typecheck-_nuq49wj/app.log`, 0 bytes. |
| `npm exec -- tsc --project tsconfig.node.json` | PASS exit0, sin diagnósticos; `${RUNTIME_ROOT}/AppData/Local/Temp/exom-independent-t3d-typecheck-_nuq49wj/node.log`, 0 bytes. |

Cobertura equivalente de typecheck de todos los proyectos más Vite build, sin escribir caches/typebuildinfo tracked; **no** se afirma haber ejecutado `tsc -b` independiente. Hash del `tsconfig.node.tsbuildinfo` tracked comunicado por el padre como `e8dd9e11…114027`, sin cambios (abreviado, no SHA completo disponible en este handoff).

### Identidad probada, límites y pendientes

Los hashes editor `634207c12fe526b051365aaad09e568952fa2c69148d2bb7396b7d1ef5a398ce`, test `1219e241989b55d99ad1439c928be3737194113434b3bd436b3a8d8c82518422` y runner `3f68633b9f66979e6cbe92c21c4b09316908f3a7d31889848299d80bd91c891e` fueron verificados exactamente y no cambiaron después de las pruebas. Recibo previo `e586e75e4cc66bed71e25a1424b6a748343a5a6ee1eac38e56b60bd3fccf6ffc`; esta adición documental cambia solo el recibo y no invalida checks de código. API probe y App preservados según evidencia parental.

Browser prueba únicamente liveness/foco ante refetch pendiente; rechazo de refetch y secuencias timeout/403 pertenecen a las regresiones Vitest, no a este browser. Sin backend real, verdict nativo nuevo ni cierre de Admin completo/REST-T3D/P5. Nueva revisión nativa y commit local siguen pendientes del padre; no se ejecutaron acciones de Git, revisión, publicación ni recursos ajenos en esta adición.

### Normalización final del recibo — 2026-10-08

El primer candidato fue aprobado por `review-29b7bd6956bb0957` y su ACK consumido sobre el tree `c21b2dfceebeeab8a1444abcb7c0f1cd010c3680`. Después, `git diff --cached --check` detectó `task-editor.md:136: new blank line at EOF` (FAIL exit2); el commit no llegó a ejecutarse. Los checks anteriores no habían aplicado el control Git de EOF al recibo no versionado. Se conserva ese fallo y se corrige únicamente la terminación documental, sin alterar los tres hashes de código/pruebas/runner ni su evidencia funcional. El índice contiene exclusivamente las cuatro rutas de esta unidad. El candidato normalizado requiere revisión nueva; la anterior está consumida y no se reabre ni se consulta. Commit, cierre de unidad y revisión nueva pendientes al registrar esta normalización; no cierre global de Admin/P5.
