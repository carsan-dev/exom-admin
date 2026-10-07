# REST-T3C1 — Admin: borrador, publicación e impresión

> Copia saneada para entrega: ubicaciones normalizadas; resultados, fechas y hashes conservan su significado histórico y corresponden al snapshot privado original, no a esta copia. WORKSPACE_ROOT identifica la coordinación; SDK_ROOT el SDK instalado; RUNTIME_ROOT las herramientas locales; TEST_ARTIFACT_ROOT los recursos privados retenidos, no publicados.


2026-10-07. Recibo actual: navegador independiente 14/14 PASS y 10/10 PDF proofs PASS; revisión visual parcial. Revisión nativa y futuro commit PENDING. No DONE, cierre de P5, despliegue ni inicio de App. Las secciones anteriores a «Recibo final de aceptación» son historia fechada, no el estado actual.

## Identidad y alcance

- Admin: `${WORKSPACE_ROOT}/exom-admin`, rama/upstream `fix/progress-detail-and-charts` / `origin/fix/progress-detail-and-charts`, base `af64addb18a772518ea443568cd5351763a60c00`. Árbol limpio antes de escribir; índice vacío al terminar. Resultado: working tree más [13 hashes de fuentes verificadas](source-hashes.sha256), no un commit.
- API read-only: `../exom-api`, rama/upstream `feat/progreso-adherencia-p4` / `origin/feat/progreso-adherencia-p4`, HEAD `2860703d8e00dc6a096a02c0c4b37543c0cd514a`; solo el probe de eliminación original sin seguimiento. DTO SHA256 `3f10a55af097dbf9bf93d39df5c9b6497161381dd2c921311ff55e573b82fbfb`; servicio `edc19b769620516e149228e39aefb276cb4780a9bf4ea324e3a9f265c8b0bc22`.
- Coordinación: `${WORKSPACE_ROOT}/`, no Git utilizable. Documentos leídos, no editados; hashes capturados a `2026-10-07T20:41:14Z`: AGENTS `f21dc8259e9ff8b7a02122efd9b1651a4a22859081c6871722b099c8476a38db`; plan `0dbbf1c5267a3fc3f35ae2a6f8d46fbb62bc005de391e931ee050e1cd2508437`; tareas `cd2ab9b683c41277c163a6396fcd27ab731eb776d08f1e4d409cd7af33c2a1df`.
- Sin API/App writes, dependencias, router global, revisión nativa, staging/commit/push, runtime de navegador ni conexiones externas. Se conservan los follow-ups T2E para su propia unidad.

## Contratos y criterios protegidos

- P5-01 / REST-T3C1: PUT `/recaps/:id/review-draft` con `expected_version` y tres campos privados; POST `/review-publish` con versión y `confirm: true`. Un guardado exitoso del borrador actual habilita una confirmación explícita. Edición posterior invalida esa habilitación. Ningún autosave ni POST automático/reintentado; bloqueo síncrono de doble acción.
- P5-02: última publicación separada del borrador local. Errores/409 preservan texto y versión; bloquean comandos hasta consultar y descartar/cargar explícitamente. GET fallido permite reintentar solo consulta. GET tras resultado incierto no es una repetición de publicación. Sesión/identidad incluye generación para logout→login de la misma cuenta; respuestas tardías no actualizan caché ni UI de otra identidad. El detalle se monta por sesión e id.
- Formularios legacy conservan endpoint/body, estado y semántica de feedback enviado/leído. Consultas de fondo no borran ningún formulario dirty; errores de refetch no desmontan editores. La guarda existente protege navegación/back y la impresión se deshabilita con cualquiera de los dos formularios dirty o con un resultado incierto.
- Dependencia causal verificada: Prisma legacy review/archive devuelve fila escalar sin relación `client`. La adaptación de caché combina esa fila con el detalle autorizado, sin perder identidad. No modifica API.
- Seguimiento reutiliza RecapsList con consulta paginada `client_id`/page/limit, sin carga global ni filtrado local. Prop opcional `returnTo` aprobado por el padre; los links globales conservan exactamente su destino anterior. Vuelta solo a la ruta local `/progress?`.
- P5-03 subincremento: proyección allowlist de tres campos publicados, feedback legacy confirmado y respuestas existentes. Nunca drafts/version/notas internas/email. Mantiene whitespace, overflow-wrap, encabezados y reglas de viudas/huérfanas/paginación existentes; prueba una palabra de 2900 caracteres. Recap DRAFT: no autoría ni informe independiente; explicación de envío obligatorio.
- Compatibilidad: campos nuevos opcionales en DTO Admin para fixtures/servidores legacy; ausencia de versión deshabilita autoría. No backfill histórico.

## Evidencia observada

Runner y TDD estricto: elección explícita del padre (tests primero RED→GREEN). Entorno Vitest/jsdom con API mock, `envDir: false` y valores sintéticos; no Firebase/DB real.

Comando focal exacto:

```sh
npm test -- --run src/features/recaps/api.test.tsx src/features/recaps/pages/recap-detail-page.test.tsx src/features/recaps/components/recap-review-editor.test.tsx src/features/recaps/components/recap-printable-summary.test.tsx src/features/progress/follow-up-tasks/follow-up-panel.test.tsx
```

| Ejecución / criterio | Resultado observado |
| --- | --- |
| RED inicial, antes de producto (22:29 local) | FAIL: 9 pruebas fallidas / 43 PASS; suite del editor no cargó por componente inexistente. Fallos conductuales: sesión tardía, logout/privacy, campos publicados e integración Recaps ausentes; hooks inexistentes. No atribuir RED conductual al editor que aún no cargaba. |
| GREEN inicial (22:33) | PASS: 5 archivos / 60 pruebas. |
| Triangulación respuesta legacy real (22:35) | FAIL: 1 / 59 PASS; actualización escalar de caché perdía `client`, TypeError `profile`. Corregido mediante merge tipado. |
| GREEN legacy (22:36) | PASS: 5 archivos / 60 pruebas. |
| Triangulación consulta fallida (22:40) | FAIL: 1 / 63 PASS; faltaba explicación española de recuperación. Prefijo explícito añadido, sin debilitar assertions. |
| Focal intermedio (22:41) | PASS: 5 archivos / 64 pruebas; conflictos save/publish, timeout, cancel/confirm, versión, edición tras save, consulta fallida, dirty/back, sesión/cliente y allowlist. |
| Triangulación independencia legacy (22:48) | FAIL: 1 / 64 PASS; private dirty bloqueaba guardado legacy. Separadas guardas dirty/pending: se conservan ambos formularios, solo se excluyen mutaciones simultáneas. |
| Focal final (22:48:49) | PASS: 5 archivos / 65 pruebas. |
| `npm test -- --run` final (22:49) | PASS: 67 archivos / 409 pruebas, cero fallidas/omitidas. Completos intermedios: 404 y 408 PASS, conservados como historia. |
| `npm run lint` final | PASS: 0 errores; 1 warning en `.local/progress-ux6.tsx:14` (ya registrado en T2E), sin corrección ajena. |
| Build aislado, intento inicial | FAIL TS18048 en fixture del editor: versión opcional. Añadida guarda explícita en fixture; no cast ni debilitamiento. |
| `npm run build -- --config docs/evidence/rest-t2e-admin-20261005/vite.isolated.config.ts` final | PASS: `tsc -b` y Vite, 3555 módulos. Warning de chunk >650 kB, sin refactor ajeno. Config conservada: envDir false, emptyOutDir false y salida aislada; no lectura dotenv ni limpieza de dist. |
| `git diff --check` final | PASS, salida vacía. |
| `sha256sum -c docs/evidence/rest-t3c-admin-20261007/source-hashes.sha256` | PASS: 13/13; las cuatro copias de fuentes nuevas coinciden también. Patch final SHA256 `e79cc9aff04f9b7070f4e2b1eb51e29e804b5b49541401e8faf189bf70b6e22e`. |

El test obsoleto del placeholder REST-T3 se actualizó al contrato implementado: listado real filtrado/contexto y enlaces globales; se conserva la assertion de cero publicaciones implícitas. Assertions legacy y de privacidad siguen cubiertas.

## Recuperación y pendientes

Checkpoint final LOCAL_ONLY `checkpoint/final/` (el checkpoint anterior de 408 tests se conserva como historia, no como versión final): patch tracked y copias `.snapshot` de las cuatro fuentes nuevas, manifiesto con hashes; no secretos, no fuentes generadas ejecutables. Archivar aparte si se necesita recuperar desde otro equipo: ignored no equivale a entregado. Recibo y hashes permanecen visibles; ignore acotado únicamente a checkpoint generado.

Navegador, shell real, teclado/foco visual, temas/móvil y PDF real NOT_RUN aquí, por instrucción; corresponden a verificación independiente REST-T3C3. Tests/build no acreditan layouts/PDF, API real ni concurrencia PostgreSQL (contrato consumido de T3B). Padre mantiene seguimiento raíz y revisión/disposición. No iniciar App/P6 ni cerrar P5 desde este recibo.

## Harness independiente preparado — no ejecutado

Preparación posterior de 2026-10-07, sin cambios en producto/tests ni en el harness T2E. Archivos: `package.json`, `vite.browser.config.ts`, `browser/{index.html,main.tsx,fixture-auth.ts,fixture-api.ts,fixture.css}` y `verify-browser.cjs`. Importa AppLayout, ClientDetailPage, ProgressPage (incluye FollowUpPanel), RecapsPage y RecapDetailPage reales; monta la guarda UnsavedChangesGuard real. CSS: import de `src/index.css` con `@source` del árbol `src`, sin copias ni overrides de diseño.

Auth controlado sin Firebase: alias de `use-auth`/API; plugin rechaza cualquier import de Firebase o transporte/auth reales. Adapter local con allowlist cerrada de rutas/métodos y DTOs estrictos; ruta desconocida queda registrada y rechazada, nunca transportada. Fences HTTP/WebSocket antes de navegar, solo origen propio `http://127.0.0.1:5188`; cualquier intento externo provoca FAIL. Cache/build propios; envDir false, emptyOutDir false, strictPort 5188. No iniciar servidor, cambiar puerto ni detener procesos automáticamente.

### Comandos exactos para el padre/verificador (desde raíz Admin)

No se ejecutaron aquí. Verificar primero Playwright/Chrome ya instalados; no usar instaladores ni fallback remoto.

```sh
node --check docs/evidence/rest-t3c-admin-20261007/verify-browser.cjs
npm exec -- vite --config docs/evidence/rest-t3c-admin-20261007/vite.browser.config.ts
```

Vite permanece en primer plano en una terminal autorizada. En otra terminal, únicamente cuando el padre autorice la ejecución y sus outputs:

```sh
node docs/evidence/rest-t3c-admin-20261007/verify-browser.cjs
```

El runner no arranca/detiene Vite. Antes de Chrome verifica los 13 hashes del producto contra manifest SHA256 `9a7ccd92895e9f05254596943de3f12d731281abebd77bfdb2754957abf93af0` y el marcador HTML `REST-T3C-ISOLATED-20261007` del servidor. Playwright: resolución local del repo o instalación conservada `../docs/evidence/metrics-p1-20260916/browser-tools/node_modules/playwright`. Chrome: `${SDK_ROOT}/Google/Chrome/Application/chrome.exe`.

### Casos y artefactos previstos

14 casos: matriz desktop1440/mobile390 × claro/oscuro con ficha/shell/listado paginado/contexto/vuelta, publicación anterior frente a draft dirty, browser-back cancelado, save/version→cancel/confirm, reemplazo explícito, conflicto 409 y descarte cancelado/aceptado, legacy independiente; además loading, consulta fallida/retry GET, publicación aceptada con respuesta perdida sin POST duplicado, private-only submitted, DRAFT sin impresión, legacy REVIEWED sin sent_at, inbox global, lectura tardía de otro cliente, logout→misma cuenta y mutación tardía de otra identidad. Son escenarios sintéticos, no integración real ni garantía de rollback del backend.

Outputs futuros autorizables: exclusivamente `docs/evidence/rest-t3c-admin-20261007/browser-output/r-<8hex>/**`, `browser/cache/**` y `browser/build/**`. Cada run crea directorio exclusivo; perfiles persistentes `p-01`…`p-14` retenidos, no limpieza ni reutilización. Guarda conteo/longitud: runtime ≤150 y perfil ≤160 caracteres, aborta si exceden. Retiene JSON por caso/resultados, traces, PNG, PDFs reales de Chrome y texto extraído si existe parser. No modificar T2E ni dist.

PDF: ventana nativa de impresión invocada desde el control real y PDF generado por Chrome con CSS de impresión/A4. Antes y después del reemplazo se verifica allowlist, ausencia de sentinels privados/notas/email/version, texto largo/palabra de 2900 caracteres, wrapping y reglas de encabezado/viudas/huérfanas; screenshots y binario completo con páginas/hash se conservan incluso ante fallo de contenido. Extracción usa solo `pdftotext`, `pdfjs-dist` o `pdf-parse` ya instalados. Sin parser: `pdfTextStatus=NOT_VERIFIED`, límite explícito; DOM/layout + binario no equivalen a comprobar texto ni legibilidad del PDF. Revisión humana de PNG/PDF sigue pendiente aunque las assertions pasen.

**Sentinel contractual no ocultado:** `reviewed-unsent-feedback-contract` exige que REVIEWED con feedback pero sin `client_feedback_sent_at` no lo imprima. Lectura estática del modelo actual muestra gate por status/reviewed_at, no por sent_at; esta prueba puede fallar. No se modificó producto ni se relajó el caso: el padre debe disponer esa divergencia legacy tras la ejecución independiente. El resto conserva fixtures de feedback enviado y SUBMITTED sin envío.

Checks de preparación: `npm run lint` PASS, 0 errores/1 warning existente `.local/progress-ux6.tsx:14`; `git diff --check` se reporta en handoff. Sintaxis CJS, server/browser, PDF/parser, screenshots y casos funcionales NOT_RUN aquí. RED/GREEN de navegador no atribuible a esta preparación: ejecución diferida expresamente al verificador. Los hashes/tests anteriores de producto no acreditan el harness.

### Corrección acotada tras run independiente `r-776ea8f1`

Evidencia leída, no repetida por este escritor: `browser-output/r-776ea8f1/results.json` y cases muestran 1 PASS / 13 FAIL, todos los FAIL en el selector exacto del borrador. Screenshots de desktop/light, mobile/dark, SUBMITTED, DRAFT, loading-released y logout muestran el detalle real, no un fallo de transporte/render. El trace `private-only-submitted-trace.zip` contiene los tres labels y textareas habilitados, con caption dentro de span y valor inicial como nodo de texto dentro de textarea. La implementación instalada de Playwright (`getElementLabels`→`elementText`) concatena todo el texto descendiente del label: el selector exacto incluía implícitamente también `PRIVATE_DRAFT_SENTINEL`. Causa confirmada del harness; no evidencia de fallo en auth/reviewVersionReady ni autorización de cambios de producto.

Selector corregido solo en runner: caption exacto descendiente del label nativo→su textarea, independiente del valor inicial/editado. Se conservan los 14 casos y todas sus condiciones, incluidos sent_at/409/logout y ausencia de publicación automática. Instrumentación futura en FAIL: `*-failure-dom.json` con texto del editor, captions, labels completos, campos/disabled/geometría, auth sintética sin credenciales y cuerpos de respuestas GET exitosas de recaps conocidos; además `*-failure-page.html`, screenshot y trace. No se leen perfiles ni storage de credenciales.

El run histórico declaró erróneamente PDF text PASS con cero proofs (`every([])`). No se reescribe su evidencia: nueva agregación exige cobertura nominal de **10 PDF proofs** (before/after ×4, private-only y reviewed-unsent), registra faltantes y count; cero produce cobertura/texto `NOT_RUN`, cobertura incompleta `INCOMPLETE` y nunca un PASS vacío. El PASS global exige esa cobertura además de los 14 casos verdes. CSS permanece acreditado por computed styles de impresión, no por buscar clases inline en CSS compilado.

Rerun e instrumentación funcional pendientes del padre/verificador; este escritor no ejecuta runner, no reinicia ni modifica el servidor retenido 5188. Validación permitida: `node --check docs/evidence/rest-t3c-admin-20261007/verify-browser.cjs`, lint y diff-check. Producto/tests conservan los 13 hashes previos.

Checks observados de esta corrección: `node --check docs/evidence/rest-t3c-admin-20261007/verify-browser.cjs` PASS; `git diff --check` PASS; `sha256sum -c docs/evidence/rest-t3c-admin-20261007/source-hashes.sha256` PASS 13/13. `npm run lint` FAIL: 13 errores de reglas no disponibles dentro del cache generado retenido `browser/cache/deps/{react-router,recharts}.js`, 10 warnings (incluye el existente `.local/progress-ux6.tsx:14`). No se borró cache ni se amplió ignore/config fuera del alcance; el padre debe disponer este fallo de entorno. No ejecución de runner ni nuevos resultados browser/PDF.

Corrección causal de lint autorizada posteriormente: `eslint.config.js` añade únicamente `docs/evidence/rest-t3c-admin-20261007/browser/cache/**` a ignores globales, siguiendo la exclusión acotada T2E existente. No excluye fuentes TS/TSX/CJS del harness ni modifica reglas. El resultado anterior permanece FAIL (13 errores/10 warnings), no se convierte retroactivamente en PASS. Tras este cambio, `npm run lint` PASS: 0 errores/1 warning existente `.local/progress-ux6.tsx:14`; `git diff --check` se registra en el handoff. Producto/tests conservan los 13 hashes. Sin ejecución de navegador.

## Corrección causal de impresión tras `r-2292fa7f` — 2026-10-07

El resultado independiente anterior sigue siendo evidencia histórica FAIL: feedback REVIEWED sin sent_at aparece en DOM/PDF, y los cuatro casos de matriz fallan después de publicar con maxRight 797.75 frente a report.right 794. No se repitió ni relajó el navegador por este escritor.

**Privacidad.** El modelo infería envío de legacy a partir de status/reviewed_at, que no demuestran envío de ese feedback: publicar los campos del coach también establece REVIEWED. Ahora el informe exige `client_feedback_sent_at` para incluir texto legacy. Los tres campos publicados del coach son independientes de ese marcador, se mantienen sin draft/version/notas/email y los informes DRAFT siguen ausentes. Fixtures positivos antiguos que decían representar feedback enviado ahora incluyen explícitamente su sent_at; assertions de privacidad y dirty no se redujeron.

Lectores/escritores read-only revisados: API `CLIENT_RECAP_SELECT` y getMyRecapById/findMyRecaps exponen text/sent_at sin aplicar filtro; buildClientFeedbackUpdate establece timestamp al cambiar texto no vacío y limpia ambos timestamps al vaciar, sin cambios en este trabajo. App RecapFeedbackCard usa hasClientFeedback basado en texto y fecha solo para el rótulo. Por tanto no se atribuye a API/App un filtro que no existe: esta autorización introduce el gate más estricto únicamente en la impresión Admin; contratos/servicio legacy y otros lectores quedan intactos. El padre registra por separado la decisión de feature y su disposición.

**Ancho.** El portal de impresión es article/section/p/dl/div/dd directamente bajo body, no hereda el grid de edición. Screenshot `desktop-light-after-print-layout.png` (794×4742) sitúa tinta en las dos últimas columnas a filas 3501–3506 y 3633–3638, dentro del párrafo nuevo publicado «Resumen del coach», no en las filas del token Z. HTML y texto del proof contienen sus espacios finales preservados; pre-wrap permite que esos espacios cuelguen fuera de la caja. La corrección cambia solo section p y dd a `white-space: break-spaces`, conserva saltos/espacios y overflow-wrap:anywhere, y fija min-width:0/max-width:100% en descendientes. No clips, truncado, reducción de texto ni cambio de umbral geométrico. Encabezados, line-height 1.5, orphans/widows y page-break se mantienen. La atribución exacta de cada Range rect y la geometría/PDF corregidos necesitan todavía comprobación independiente; jsdom acredita texto/política CSS, no layout Chrome.

### Evidencia del escritor posterior a esta corrección

TDD estricto activado por instrucción del padre; runner Vitest 4.1.9/jsdom, sin backend/Firebase/DB.

| Comando | Resultado observado |
| --- | --- |
| `npm test -- --run src/features/recaps/components/recap-printable-summary.test.tsx` RED, 23:50 local | FAIL: 4 / 13 PASS (17 total). REVIEWED unsent conserva sentinel; sent_at sin reviewed_at se oculta en dos estados; falta política de espacios/ancho. |
| Mismo comando GREEN, 23:51 local | PASS: 17/17. |
| Comando focal de cinco archivos registrado arriba, 23:52 local | PASS: 5 archivos / 70 pruebas (65 originales + 5 nuevas). |
| `npm test -- --run` | PASS: 67 archivos / 414 pruebas. |
| `npm run lint` | PASS: 0 errores/1 warning existente `.local/progress-ux6.tsx:14`. |
| `npm run build -- --config docs/evidence/rest-t2e-admin-20261005/vite.isolated.config.ts` | PASS: tsc -b + Vite 6.4.2, 3555 módulos; warning chunk >650 kB. Config sin cambios, envDir:false/emptyOutDir:false, sin limpieza. |

Fuente/recuperación: las tres fuentes print y su test actualizan únicamente tres entradas del manifest de 13. SHA256 actual del manifest: `4b8ce1ae66e37aa2c67b3c82a31015d583f399b042c38749a663a23ad9f9477b`; las diez restantes no cambian. Checkpoint nuevo LOCAL_ONLY `checkpoint/print-privacy-wrap/`: manifest previo intacto (`9a7ccd…`), patch completo HEAD→tres fuentes actuales (`5e9757ea62c6a2ddb8fbf0f9674f34d5a0f7dddd266f9bd5d773fe0c34ba6750`), receipt y overrides de hashes; checkpoints anteriores no reescritos. El patch coincide byte a byte con git diff de esos tres paths. Diff-check/hash-check finales se reportan en handoff.

**Preflight pendiente del padre:** verify-browser.cjs todavía fija el digest anterior `9a7ccd…`. Antes del próximo run debe reconciliar ese pin con `4b8ce1ae…`; ese archivo no pertenece a las superficies de edición de esta corrección y no se tocó. No nuevo navegador/PDF, revisión nativa, Git index/publicación ni writes API/App. No cierre de P5: aceptación geométrica, legibilidad/PDF y revisión final siguen pendientes.

## Recibo final de aceptación — antes de revisión nativa

Estado: **implementado y verificado en harness sintético; native review/commit PENDING**. Fuente vigente: base Admin `af64addb18a772518ea443568cd5351763a60c00`, manifest de 13 `4b8ce1ae66e37aa2c67b3c82a31015d583f399b042c38749a663a23ad9f9477b`. El padre actualizó el pin del runner; esta tarea final modifica solo documentación/checkpoint. No API/App writes, navegador nuevo, commits ni invocación de revisión nativa por este escritor.

### Aceptación independiente y límites

| Evidencia | Resultado y actor |
| --- | --- |
| `browser-output/r-776ea8f1/results.json` | Histórico FAIL: 1/14 PASS, 13 FAIL por selector. Cero PDFs; su viejo PDF text PASS era agregado vacío inválido, no aceptación. |
| `browser-output/r-2292fa7f/results.json` | Histórico FAIL: 9/14 PASS, 5 FAIL (unsent legacy + overflow en cuatro matrices). 10 proofs; text NOT_VERIFIED. No se reclasifica retrospectivamente. |
| `browser-output/r-015608fa/results.json` | Verificador independiente: **14/14 PASS**, sin escapes/pageErrors; **10/10 PDFs reales de Chrome**, cobertura completa y texto/privacidad con pdftotext PASS. Geometría PASS: after maxRight 788.046875 ≤794, before 793.6875 ≤794; private-only/unsent también pasan. Son 10 documentos/68 páginas, no 10 páginas visualmente revisadas. |
| Unit independiente anterior, `npm test -- --run` | Según evidencia transferida por el padre: 409 PASS, **antes** de la corrección print. No acredita la versión final de 414 tests. |
| Unit independiente posterior, `npm test -- --run src/features/recaps/components/recap-printable-summary.test.tsx` | Según evidencia transferida por el padre: 17 PASS tras la corrección. No se atribuyen al verificador el completo 414 ni focal 70 del escritor. |
| Corrección print, TDD del escritor | RED conductual 4 FAIL/13 PASS → GREEN 17/17; focal 70, completo 414/67 archivos; lint 0 errores/1 warning existente y build aislado PASS. Comandos exactos y límites registrados arriba; no rerun unit/build en esta tarea docs-only. |

El padre leyó dos layouts completos de impresión y **tres páginas de PDF realmente rasterizadas**: desktop-light-after páginas 4 y 6, mobile-dark-before página 7. Observó párrafos y palabras largas legibles, wrapping sin clipping, encabezados y ausencia de drafts/notas internas. PNGs: `browser-output/r-015608fa/pdf-pages/r-da24f633/desktop-light-after-page-{4,6}.png` y `mobile-dark-before-page-7.png`. Cuarto PNG producido: `desktop-light-after-page-1.png`, **no inspeccionado aún**. Esa revisión parcial no acredita todas las páginas/documentos, aprobación del usuario, accesibilidad completa ni integración con API/Firebase reales.

Rasterización adicional realizada por el padre, no por este escritor: pypdfium2 **4.30.0** instalado exclusivamente en `browser-output/pdf-tools/site/`, wheel en `browser-output/pdf-tools/wheels/`; SHA256 comprobado `90dbb2ac07be53219f56be09961eb95cf2473f834d01a42d901d13ccfad64b4c`. Son herramientas/PNGs **ignored LOCAL_ONLY**, ninguna dependencia del proyecto. Intentos anteriores ImageMagick siguen **FAIL por ausencia de gswin64c**; el éxito posterior de pypdfium2 no los convierte en PASS. La transferencia no incluye sus invocaciones/stderr exactos ni existe log en el run inspeccionado: no se inventan comandos de esos fallos; conservar la salida original del padre si se necesita trazabilidad literal.

### Reproducción y durabilidad

Desde raíz Admin, solo bajo autorización del padre, servidor Vite aislado en una terminal y runner en otra:

```sh
npm exec -- vite --config docs/evidence/rest-t3c-admin-20261007/vite.browser.config.ts
node docs/evidence/rest-t3c-admin-20261007/verify-browser.cjs
```

No instaladores automáticos, API live ni vaciado de outputs. El runner crea un run exclusivo, conserva perfiles y registra 14 casos y 10 proofs nominales; utiliza pdftotext instalado. Los `results.json`, traces, PNGs, PDFs, texto extraído, perfiles, wheels y rasterizaciones existentes son **LOCAL_ONLY/ignored**, no una entrega Git ni evidencia disponible tras un checkout nuevo. Este README no ignorado es el recibo durable previsto para revisión/commit; actualmente es untracked, no se staged aquí. Archivar los outputs locales por separado si deben acompañar el handoff. La reproducción genera evidencia nueva y nunca sustituye los FAIL históricos.

Compatibilidad: el filtro por sent_at es exclusivamente del informe Admin autorizado. API client select y App legacy card mantienen sus lectores text-based; servicios, timestamps/notificaciones legacy y clientes antiguos no se alteraron ni se declara que oculten el texto unsent. Los campos publicados del coach no dependen del feedback legacy. No trabajo App ni otra fase iniciado; el padre mantiene seguimiento/decisión de feature, disposición nativa y futura unidad de commit.

### Checkpoint y conjunto candidato para revisión

`checkpoint/acceptance-final/` es LOCAL_ONLY: índice de patches + patch config actual + manifest de **25 archivos** (11 tracked modificados, 14 untracked), hashes completos e inventario sin bulk generado. Recuperación de tracked: patch previo `checkpoint/final/tracked.patch` solo para los seis paths no reemplazados, patch actual print para sus tres paths y config.patch para `.gitignore`/`eslint.config.js`; todos contra HEAD base, no aplicar patches superpuestos. Los cuatro untracked de producto tienen copias en checkpoint/final; el manifest identifica además las diez fuentes de harness/recibo vigentes en el working tree, necesarias para recuperación/entrega. No afirmar que un inventario de hashes contenga los bytes de esos diez archivos: conservarlos hasta revisión/commit o archivarlos aparte. Checkpoints antiguos intactos.

Untracked **intencionados** que la revisión debe incluir:

- `src/features/recaps/api.test.tsx`
- `src/features/recaps/components/recap-review-editor.tsx`
- `src/features/recaps/components/recap-review-editor.test.tsx`
- `src/features/recaps/pages/recap-detail-page.test.tsx`
- `docs/evidence/rest-t3c-admin-20261007/README.md`
- `docs/evidence/rest-t3c-admin-20261007/source-hashes.sha256`
- `docs/evidence/rest-t3c-admin-20261007/package.json`
- `docs/evidence/rest-t3c-admin-20261007/vite.browser.config.ts`
- `docs/evidence/rest-t3c-admin-20261007/verify-browser.cjs`
- `docs/evidence/rest-t3c-admin-20261007/browser/index.html`
- `docs/evidence/rest-t3c-admin-20261007/browser/main.tsx`
- `docs/evidence/rest-t3c-admin-20261007/browser/fixture-api.ts`
- `docs/evidence/rest-t3c-admin-20261007/browser/fixture-auth.ts`
- `docs/evidence/rest-t3c-admin-20261007/browser/fixture.css`

Diff-check final se reporta en handoff. Native review, disposición final y commit **PENDING**; ningún DONE/cierre P5, push, merge, despliegue ni aprobación de producto inferidos de este recibo.
