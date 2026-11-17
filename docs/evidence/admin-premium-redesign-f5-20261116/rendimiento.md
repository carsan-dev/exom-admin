# Rendimiento de exom-admin: chunks, fuentes y LCP (RDS-F5-U3, criterio RDS-F5-03)

Fecha: 2026-11-16. Rama `feat/admin-rediseno-f5-cierre`, HEAD `9e69954`. Base de F0: `develop@727ffb3` (README de F0, `docs/evidence/admin-premium-redesign-f0-20261115/README.md`, sección 4).

Criterio: «Ningún chunk nuevo supera el aviso de 650 KB; las fuentes suman ≤ 95 KB; el LCP no empeora frente a la base.»

Resumen por parte:

| Parte | Resultado |
| --- | --- |
| Chunks (ninguno > 650 KB) | PASS: el mayor es `vendor-charts` con 405,15 kB; `chunkSizeWarningLimit: 650` confirmado en `vite.config.ts:32`. |
| Fuentes ≤ 95 KB | PASS en woff2 (`6d838fc`): 71.460 B frente a 95.000 B (kB decimales) y 97.280 B (KiB), sin ambigüedad de unidad (sección 2 bis). La medición de la sección 2 (woff, 95.092 B) queda como histórica y sustituida. |
| LCP no empeora frente a la base | FAIL con la regla declarada (sección 6, medición el 2026-11-16 sobre `727ffb3` frente a `4e237b3`): PASS en las 4 combinaciones de `/login` sin limitación y en 3 de 4 con CPU 4x y red Fast 4G; FAIL en `/login` 390 claro con limitación (+763 ms, +43,6 %) y en el Dashboard 390 del arnés de desarrollo (+394 ms, +19,4 %). Global de la sección 6: FAIL. (La medición de la sección 3 sobre `9e69954` no tenía base y queda como histórica.) Investigación posterior (sección 7, máquina libre): el FAIL de `/login` 390 claro no se reproduce (+98 ms, +9,5 %, n = 20: era ruido por carga de la máquina) y las 4 combinaciones de `/login` con limitación pasan; el FAIL del Dashboard 390 persiste numéricamente (+236 ms, +22,1 %, n = 16, 1.068 → 1.304) y se explica por el modo desarrollo del arnés (27 módulos y 532 KB más sin empaquetar y fuentes sin precarga en el `index.html` del arnés): artefacto de medición, sin equivalente en producción. El Dashboard en producción no se ha medido. |

## 1. Chunks

Fuentes de datos: base F0 = `base-chunks.txt` de la sesión de F0 (69 ficheros del resumen de build); fin de F4-bis = build de `d9ced73` (`f4bis-final-4-build.log`); actual = build de `9e69954` (`f5-u4-build.log`). Los tres son `npm run build` (`tsc -b && vite build`, Vite 6.4.2). Valores en kB decimales (los que imprime Vite), gzip entre paréntesis. «Δ» es actual menos base F0.

| Chunk | Base F0 `727ffb3` | Fin F4-bis `d9ced73` | Actual `9e69954` | Δ frente a F0 |
| --- | --- | --- | --- | --- |
| vendor-charts | 405,15 (110,07) | 405,15 (110,07) | 405,15 (110,07) | 0,00 / 0,0 % |
| index (JS) | 249,09 (77,02) | 282,73 (86,60) | 282,73 (86,59) | +33,64 / +13,5 % |
| vendor-ui | 211,10 (54,01) | 211,64 (54,80) | 211,64 (54,80) | +0,54 / +0,3 % |
| vendor-utils | 161,55 (52,98) | 171,04 (55,46) | 171,04 (55,46) | +9,49 / +5,9 % |
| vendor-firebase | 164,59 (35,00) | 164,59 (35,00) | 164,59 (35,00) | 0,00 / 0,0 % |
| vendor-react | 142,25 (45,77) | 142,29 (45,78) | 142,29 (45,78) | +0,04 / 0,0 % |
| progress-page | 129,32 (34,89) | 140,31 (37,02) | 140,31 (37,01) | +10,99 / +8,5 % |
| index.css | 75,44 (13,49) | 111,26 (19,30) | 111,26 (19,30) | +35,82 / +47,5 % |
| vendor-forms | 89,66 (24,78) | 89,66 (24,78) | 89,66 (24,78) | 0,00 / 0,0 % |
| trainings-page | 78,84 (20,19) | 88,22 (22,81) | 88,22 (22,81) | +9,38 / +11,9 % |
| diets-page | 65,85 (17,77) | 77,76 (21,26) | 77,76 (21,26) | +11,91 / +18,1 % |
| assignments-page | 77,51 (19,08) | 77,12 (20,46) | 77,12 (20,45) | -0,39 / -0,5 % |
| image-upload-field | 60,03 (23,82) | 60,02 (23,82) | 60,02 (23,82) | -0,01 / 0,0 % |
| challenges-page | 40,29 (10,05) | 39,91 (10,53) | 39,91 (10,53) | -0,38 / -0,9 % |
| clients-page | 36,91 (9,42) | 38,08 (10,66) | 38,08 (10,66) | +1,17 / +3,2 % |
| achievements-page | 35,35 (9,37) | 37,29 (10,31) | 37,29 (10,30) | +1,94 / +5,5 % |
| exercises-page | 33,75 (10,44) | 35,87 (11,23) | 35,87 (11,23) | +2,12 / +6,3 % |
| base-service-page (NUEVO) | no existía | 35,65 (10,94) | 35,65 (10,94) | +35,65 (chunk nuevo) |
| client-streak-card | 32,18 (10,47) | 33,50 (10,72) | 33,50 (10,72) | +1,32 / +4,1 % |
| recap-detail-page | 28,32 (7,78) | 27,92 (8,40) | 27,92 (8,40) | -0,40 / -1,4 % |
| notification-templates-page | 23,10 (6,24) | 26,82 (7,64) | 26,82 (7,64) | +3,72 / +16,1 % |
| client-detail-page | 25,78 (6,75) | 24,31 (6,67) | 24,31 (6,66) | -1,47 / -5,7 % |
| approval-requests-page | 18,22 (5,15) | 25,10 (7,43) | 25,10 (7,43) | +6,88 / +37,8 % |
| notifications-page | 21,16 (6,50) | 21,94 (7,20) | 21,94 (7,20) | +0,78 / +3,7 % |

Totales (suma de los tamaños que imprime Vite, sin comprimir):

| Magnitud | Base F0 | Fin F4-bis | Actual |
| --- | --- | --- | --- |
| Ficheros JS (incluye `worker-*.js`) | 66 | 79 | 79 |
| JS total | 2.319,36 kB | 2.477,12 kB | 2.477,12 kB |
| JS total gzip (solo ficheros con gzip) | 661,25 kB | 719,08 kB | 718,96 kB |
| CSS (un fichero) | 75,44 kB (13,49) | 111,26 kB (19,30) | 111,26 kB (19,30) |
| Mayor chunk | 405,15 kB | 405,15 kB | 405,15 kB |

JS total +157,76 kB (+6,8 %) frente a F0; CSS +35,82 kB (+47,5 %).

Chunks nuevos (ausentes en F0, comparando por nombre): 18 en el build actual. Solo uno supera 20 kB, `base-service-page` (35,65 kB, sección «Servicio base», commit `0029571`, que no estaba en `727ffb3`: funcionalidad ajena al rediseño). Los otros 17 son compartidos pequeños (`tag`, `badge`, `empty-state`, `status-chip`, `pagination`, `segmented`, `checkbox`, `textarea`, `error-state`, `push-preview`, `recap-status-chip`, `use-confirm-dialog`, `selection-bar`, `figure-strip`, `review-duration`, `to-api-params`, `notification-date-time`), todos por debajo de 4 kB. Desaparecen por reagrupación `search`, `avg-review-time-card`, `dialog` y dos `types`/`api` homónimos. Ningún chunk nuevo ni existente supera 650 kB: PASS.

### Atribución de los cambios mayores de 5 kB

No hay un visualizador de bundle ni builds intermedios aislados, así que la atribución es de causa probable, no medida módulo a módulo salvo donde se indica.

| Caso | Qué dicen los datos |
| --- | --- |
| `vendor-utils` +9,49 kB | El contenido de `manualChunks['vendor-utils']` es `axios`, `date-fns`, `sonner`, `zustand`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@dnd-kit/core` (y `next-themes` hasta `9e69954`). Entre `727ffb3` y HEAD la única dependencia de esa lista que cambia de versión es `tailwind-merge` 2.6.0 a 3.7.0 (commit `86fd4c2`, «subir tailwind-merge a v3 para Tailwind 4»). Es la causa más probable. No se aisló con un build sin ese cambio. |
| `next-themes` | Sin efecto. `d9ced73` y `9e69954` tienen tamaños idénticos en los 79 chunks JS y en el CSS (gzip varía ±0,01-0,02 kB). `git grep next-themes d9ced73 -- src` da 0 resultados: ya no se importaba. La retirada (junto con `@vercel/analytics` y `@vercel/speed-insights`, también sin uso) solo quita 3 dependencias de `package.json`, el nombre en `manualChunks` y 3 paquetes de `node_modules`. |
| `index` +33,64 kB | No aislado. El cambio de `src/` desde F0 es amplio (363 ficheros, 81.423 inserciones y 11.240 borrados, incluidas pruebas y snapshots). Entre lo que entra en el chunk de entrada están `src/components/layout/global-search.tsx` (565 líneas nuevas, F4-bis) y el resto del shell/layout rediseñado. No se midió la parte de cada módulo. |
| `progress-page` +10,99 kB, `trainings-page` +9,38, `diets-page` +11,91, `approval-requests-page` +6,88, `notification-templates-page` +3,72 | No aislado. Coinciden con páginas reescritas o ampliadas en F4: diffs grandes en `diet-form-dialog.tsx` (1.367 líneas), `notification-templates-page.tsx` (1.170), `training-form-dialog.tsx` (875), `exercise-picker.tsx` (859), y además funcionalidad nueva (P7 con `@dnd-kit/sortable`, añadido en `0ead561`, usado por `components/sortable/sortable-list.tsx` y `features/trainings/reorder-training-items.ts`; P9/P10 en Plantillas). No hay datos para repartir el delta entre estilo y funcionalidad en `approval-requests-page`. |
| `index.css` +35,82 kB (+47,5 %) | No aislado. `src/index.css` cambia +342/-91 líneas (ahora 13.493 B de fuente) con los tokens y utilidades del rediseño, y Tailwind 4 genera además las utilidades que usan los 363 ficheros de `src/` modificados. La hipótesis de F0 (Tailwind leyendo los bocetos de `docs/redesign/**`) queda descartada en la práctica: `src/index.css:4` ya trae `@source not "../docs"`. |
| `vendor-ui` +0,54 kB, `vendor-react` +0,04 kB | Por debajo de 5 kB; no se atribuyen. |

## 2. Fuentes (medición histórica sobre `9e69954`, sustituida por la sección 2 bis)

Medido con `wc -c public/fonts/*` en `9e69954`. El veredicto ambiguo de esta sección (FAIL en kB decimales, PASS en KiB) queda superado por la sección 2 bis; se conserva sin cambios como registro de la medición de entonces.

| Fichero | Bytes | kB (÷1000) | KiB (÷1024) | Formato | `font-display` | Precarga en `index.html` |
| --- | --- | --- | --- | --- | --- | --- |
| `barlow-800.woff` | 42.768 | 42,77 | 41,77 | woff | `swap` | Sí: `<link rel="preload" as="font" type="font/woff" crossorigin>` (línea 10) |
| `dm-sans-400.woff` | 26.204 | 26,20 | 25,59 | woff | `swap` | Sí: mismos atributos (línea 9) |
| `dm-sans-600.woff` | 26.120 | 26,12 | 25,51 | woff | `swap` | No |
| Suma | 95.092 | 95,09 | 92,86 | | | |

- `@font-face` en `src/index.css:10-31`: tres declaraciones, `format('woff')`, pesos 800 (Barlow) y 400/600 (DM Sans), sin `unicode-range`. Formato woff, no woff2; no se midió qué ahorraría woff2 (no se generó ninguno).
- Base F0 (`727ffb3`): no había fuentes alojadas ni `@font-face` ni precarga (`git ls-tree 727ffb3 -- public` solo lista `apple-touch-icon.png` y `favicon.svg`; `git show 727ffb3:index.html` sin referencias a fuentes). Las fuentes entran en F1 (commit `610bd73`). El peso anterior es 0 B de fuentes web.
- Peticiones reales (CDP `Network.requestWillBeSent` con tipo `Font`, 5 cargas por combinación): el Dashboard y el Login piden las 3 fuentes siempre, en el arnés y en el build de producción. Transferido por CDP (incluye cabeceras): 96.049 B en el arnés y 96.304 B en el build servido con `vite preview` (3 peticiones).
- Veredicto del criterio «≤ 95 KB»:
  - kB decimales (95.000 B, la unidad con la que Vite expresa también el aviso de 650): 95.092 B excede por 92 B (0,10 %): FAIL.
  - KiB (97.280 B): 92,86 KiB, margen de 2.188 B: PASS.
  - El plan no define la unidad. Queda para quien decida el cierre; no se ha cambiado ninguna fuente ni criterio.

## 2 bis. Fuentes en woff2 (`6d838fc`)

Decisión del propietario del 2026-11-16: convertir las tres fuentes alojadas de woff a woff2 en lugar de interpretar la unidad del criterio. Commit `6d838fc` («perf(admin): fuentes web en woff2»), presente en `4e237b3`.

| Fichero | woff (`9e69954`) | woff2 (`6d838fc`) | Δ |
| --- | --- | --- | --- |
| `barlow-800` | 42.768 B | 33.128 B | -9.640 B |
| `dm-sans-400` | 26.204 B | 19.184 B | -7.020 B |
| `dm-sans-600` | 26.120 B | 19.148 B | -6.972 B |
| Suma | 95.092 B | 71.460 B | -23.632 B (-24,9 %) |

- Veredicto «≤ 95 KB»: PASS en ambas unidades. 71.460 B frente a 95.000 B (kB decimales, margen 23.540 B) y frente a 97.280 B (KiB, margen 25.820 B).
- Los tamaños se confirmaron también en el build de `4e237b3` hecho para la medición de la sección 6: `fonts/barlow-800.woff2` 33.128 B, `fonts/dm-sans-400.woff2` 19.184 B, `fonts/dm-sans-600.woff2` 19.148 B.
- Conversión sin pérdida, verificada en la unidad de `6d838fc`: tablas, glifos, `cmap`, métricas y contornos idénticos entre el woff original y el woff2; anchos de texto idénticos en 48 de 48 mediciones en navegador. Esta sesión no repitió esa verificación; se toma del registro de esa unidad.
- Solo se solicitan ficheros `.woff2` (los tres; ningún `.woff`). En la medición de la sección 6 las peticiones de fuente del `/login` de producción fueron 3 y 72.675 B transferidos (incluye cabeceras), y 3 y 72.420 B en el Dashboard del arnés.

## 3. LCP, FCP y CLS (medición histórica sobre `9e69954`, sin base)

### Método

- Chrome 1440x900 (escala 1) y 390x844 móvil (`Emulation.setDeviceMetricsOverride`, escala 2, táctil), temas oscuro y claro (`localStorage['exom-admin-theme']` escrito antes de arrancar), caché desactivada con `Network.setCacheDisabled`, 5 cargas en frío por combinación, una pestaña nueva por carga, tras una carga de calentamiento descartada.
- `PerformanceObserver` inyectado con `Page.addScriptToEvaluateOnNewDocument`: `largest-contentful-paint` (valor `renderTime` o `startTime`), `layout-shift` (CLS = suma sin `hadRecentInput`), `paint` (FCP). Se lee 3,5 s después de que aparezca el elemento de «listo».
- Script: `scratchpad/perf-f5.cjs` (fuera del repo). Resultados: `scratchpad/f5-rendimiento.json` (`f5-rendimiento-harness.json` y `f5-rendimiento-preview.json` los originales). Lanza el servidor y Chrome por PID y los para por PID.
- Medición A (arnés): arnés sintético de F0 (`browser-harness/vite.browser.config.ts`) con `--port 5193`, Chrome en el puerto CDP 9334, ruta `/dashboard?__role=SUPER_ADMIN`.
- Medición B (más representativa): `npm run build` aparte con `vite build --outDir <scratchpad>/dist-perf` y valores de Firebase y API ficticios pasados por variables de entorno del proceso (el `dist/` del repo se construyó sin `.env`, por lo que Firebase lanza `auth/invalid-api-key` y la app no pinta nada; no se leyó ningún `.env`), servido con `vite preview --port 5194`, ruta `/login` (no necesita sesión). Sin credenciales, sin inicio de sesión.

### Resultados: mediana (mínimo-máximo) en ms

Arnés sintético, Vite de desarrollo, Dashboard (`/dashboard`, SUPER_ADMIN):

| Combinación | LCP | FCP | CLS | Elemento LCP |
| --- | --- | --- | --- | --- |
| 1440, oscuro | 948 (932-1096) | 880 (876-1004) | 0 (0-0) | `<p>` «Hola, Lucía. Aquí tienes el resumen ejecutivo de tu operació…», `mt-2 max-w-[72ch] text-pretty text-[13px] …`, 640x20 px, área 7.242 |
| 1440, claro | 944 (940-960) | 876 (872-880) | 0 (0-0) | el mismo `<p>` |
| 390, oscuro | 1016 (976-1224) | 908 (892-1104) | 0 (0-0) | el mismo `<p>`, 366x40 px, área 13.505 |
| 390, claro | 1064 (980-1084) | 956 (892-988) | 0 (0-0) | el mismo `<p>` |

Complemento en el arnés: Login (`/login?__auth=none`), 1440 oscuro: LCP 816 (784-848), FCP 816 (784-848), CLS 0; elemento `<span>` «EXOM» (decorativo, 747x334 px, área 295.075).

Build de producción servido con `vite preview` (medición B), Login:

| Combinación | LCP | FCP | CLS | Elemento LCP |
| --- | --- | --- | --- | --- |
| 1440, oscuro | 134 (122-179) | 134 (122-179) | 0 | `<span>` «EXOM» decorativo, 747x334 px, área 295.075 |
| 1440, claro | 125 (123-149) | 125 (123-149) | 0 | el mismo `<span>` |
| 390, oscuro | 124 (122-136) | 124 (122-136) | 0 | `<h1>` «Iniciar sesión», `font-display text-[38px] font-extrabold uppercase …`, 358x35 px, área 9.568 |
| 390, claro | 128 (127-131) | 128 (127-131) | 0 | el mismo `<h1>` |

Peticiones y bytes (CDP, `encodedDataLength`, sin caché): build de producción en `/login`: 11 peticiones al origen; JS 6 ficheros, 305.397 B; CSS 1 fichero, 19.761 B; fuentes 3 ficheros, 96.304 B; otras 1.126 B. En el arnés (Vite de desarrollo, sin empaquetar): Dashboard 130 peticiones (125 scripts, 7.139.579 B, 3 fuentes 96.049 B); Login 119 peticiones (115 scripts, 7.006.200 B).

Observaciones: CLS es 0 en las 45 cargas medidas (0 saltos de layout). LCP es igual a FCP en el Login (el elemento aparece en el primer pintado). En el Dashboard del arnés el LCP llega unos 60-110 ms después del FCP, cuando se pinta el párrafo de saludo con los datos del fixture. `font-display: swap` no provocó ningún cambio de LCP ni de layout visible en estas cargas.

### Limitaciones

- La medición A usa el Vite de desarrollo (módulos sin minificar ni dividir en chunks de producción, 130 peticiones, 7 MB de JS), datos sintéticos de fixture sin red real y la máquina compartida con otra tarea (la auditoría de accesibilidad) durante las mediciones. La cifra no es comparable con producción; solo sirve como referencia relativa.
- La medición B es del Login, no del Dashboard (el Dashboard exige sesión y no se ha usado ninguna credencial). El build usó valores de Firebase ficticios, de modo que el estado de sesión es «sin usuario». `vite preview` sirve en loopback sin latencia de red ni CDN; las cifras (≈ 125-135 ms) son un suelo, no una estimación de producción. Los bytes de JS y CSS son los que reporta CDP y son coherentes con tamaños gzip (preview comprimió las respuestas).
- Sin base de LCP, ninguna cifra de esta sección demuestra «no empeora».
- Los resultados de la medición A comparten `cacheDir` de Vite con el arnés de la otra tarea (`browser-harness/node_modules/.vite`), por lo que la primera carga puede haber reoptimizado dependencias; se descartó una carga de calentamiento.

## 4. Base de LCP: opciones (histórica; ejecutada en la sección 6)

Texto de la sesión anterior; la medición con base se hizo después y se documenta en la sección 6.

- F0 no registró LCP (búsqueda de «LCP» en toda la carpeta `admin-premium-redesign-f0-20261115` y en `docs/plans/admin-premium-redesign.md`: solo aparece en las líneas 358 y 365 del plan, es decir, el criterio). La base de código es `develop@727ffb3`.
- El arnés se creó en F0 después de esa base (commits `b495f4e`..`718f8f3`); en `727ffb3` no existe, pero es evidencia que no toca `src/`, de modo que se podría ejecutar contra un checkout de `727ffb3` copiando `browser-harness/` y apuntando su `root`/aliases a ese `src/`. Haría falta un worktree y `npm ci` (no se hizo: no autorizado en esta unidad).
- Alternativa más barata y representativa: construir `727ffb3` con valores de Firebase ficticios (como en la medición B) y medir `/login` con `vite preview`; comparar con las 20 cargas actuales. El Dashboard requiere el arnés. Coste estimado: un worktree, `npm ci`, un build y unos 10 minutos de medición. Comparación válida solo si se repite en la misma máquina y con la misma carga.

## 5. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F5-03 (chunks ≤ 650 KB) | exom-admin | `9e69954` (base `727ffb3`, intermedio `d9ced73`) | `npm run build` (`tsc -b && vite build`); `node scratchpad/chunks-cmp.cjs` | PASS: mayor chunk 405,15 kB; 79 chunks JS; JS 2.477,12 kB; CSS 111,26 kB | 2026-11-16 | `scratchpad/f5-u4-chunks.txt`, `f5-u4-build.log`, `f4bis-final-4-build.log`, `f5-chunks-parsed.json` |
| RDS-F5-03 (fuentes ≤ 95 KB) | exom-admin | `9e69954` | `wc -c public/fonts/*` | Histórica, sustituida por la fila woff2 siguiente: FAIL en kB decimales (95.092 B > 95.000 B); PASS en KiB (95.092 B ≤ 97.280 B); decisión de unidad pendiente | 2026-11-16 | sección 2 |
| RDS-F5-03 (LCP no empeora frente a la base) | exom-admin | `9e69954` | `node scratchpad/perf-f5.cjs harness` y `node scratchpad/perf-f5.cjs preview` | NOT_RUN (histórica; sustituida por las filas de la sección 6): base no registrada en F0. Referencia actual medida (sección 3) | 2026-11-16 | `scratchpad/f5-rendimiento.json`, `f5-perf-harness.log`, `f5-perf-preview.log` |
| RDS-F5-03 (carga de fuentes) | exom-admin | `9e69954` | los mismos dos comandos (CDP `Network`) | PASS (medido): Dashboard y Login piden las 3 fuentes; 96.049-96.304 B transferidos; solo 2 de 3 precargadas | 2026-11-16 | sección 2 y `f5-rendimiento.json` |
| Retirada de `next-themes` sin efecto en el bundle | exom-admin | `d9ced73` frente a `9e69954` | comparación de `f4bis-final-4-build.log` y `f5-u4-build.log` | PASS: tamaños idénticos en 79 chunks JS y CSS | 2026-11-16 | sección 1 |
| RDS-F5-03 (fuentes ≤ 95 KB, woff2; sustituye a la fila woff de arriba) | exom-admin | `6d838fc` (medido en el build de `4e237b3`) | `wc -c` de las 3 fuentes y suma de ficheros `fonts/*.woff2` del build de `lcp-build-actual` | PASS: 71.460 B (33.128 + 19.184 + 19.148) frente a 95.000 B y 97.280 B; -23.632 B respecto a woff. Conversión sin pérdida: registro de la unidad `6d838fc` (no repetida aquí) | 2026-11-16 | sección 2 bis; `scratchpad/lcp-build-actual/fonts/` |
| RDS-F5-03 (LCP no empeora, A: `/login` producción, sin limitación) | exom-admin | base `727ffb3` frente a `4e237b3` | `node scratchpad/lcp-measure.cjs A` (build con variables ficticias, `vite preview` 5195/5196, 10 cargas alternadas, 1440 y 390, oscuro y claro); `node scratchpad/lcp-analyze.cjs A` | PASS en las 4 combinaciones (+10, +10, +14, +10 ms; +6,5 % a +10,1 %) | 2026-11-16 | `scratchpad/lcp-result-A.json`, `lcp-stats-A.json`, `lcp-run-A.log`, sección 6 |
| RDS-F5-03 (LCP no empeora, A con CPU 4x y Fast 4G) | exom-admin | base `727ffb3` frente a `4e237b3` | `node scratchpad/lcp-measure.cjs Athr` (6 cargas alternadas por combinación); `node scratchpad/lcp-analyze.cjs Athr` | FAIL: 3 combinaciones PASS (+104, +109, +83 ms) y `/login` 390 claro FAIL (+763 ms, +43,6 %; mediana actual 2.511 ms frente a límite 1.973 ms) | 2026-11-16 | `scratchpad/lcp-result-Athr.json`, `lcp-stats-Athr.json`, `lcp-run-Athr.log`, sección 6 |
| RDS-F5-03 (LCP no empeora, B: Dashboard en el arnés, modo desarrollo) | exom-admin | base `727ffb3` (arnés copiado, sin seguimiento) frente a `4e237b3` | `node scratchpad/lcp-measure.cjs B` (Vite del arnés 5197/5198, 8 cargas alternadas, 1440 y 390, oscuro); `node scratchpad/lcp-analyze.cjs B` | FAIL: 1440 PASS (-146 ms, -11,2 %); 390 FAIL (+394 ms, +19,4 %; mediana actual 2.426 ms frente a límite 2.285 ms). Solo referencia relativa (modo desarrollo) | 2026-11-16 | `scratchpad/lcp-result-B.json`, `lcp-stats-B.json`, `lcp-run-B.log`, `lcp-probe-base.png`, sección 6 |
| RDS-F5-03 (LCP no empeora frente a la base, veredicto global) | exom-admin | base `727ffb3` frente a `4e237b3` | regla: mediana actual ≤ mediana base × 1,10 + 50 ms por combinación | FAIL (2 de 10 combinaciones fuera del margen; las 8 restantes PASS). No hay NOT_RUN: las tres mediciones se ejecutaron | 2026-11-16 | sección 6 |
| Build y entorno de la medición de LCP | exom-admin | `727ffb3` y `4e237b3` | `git worktree add --detach … <sha>`; `npm ci`; `npx tsc -b && npx vite build --outDir … --emptyOutDir` con variables `VITE_*` ficticias; `git worktree remove --force` | PASS: `npm ci` exit 0 y build exit 0 en ambos; worktrees eliminados (`git worktree list` sin `lcp-base` ni `lcp-actual`) | 2026-11-16 | `scratchpad/lcp-npmci-{base,actual}.log`, `lcp-build-{base,actual}.log` |
| RDS-F5-03 (LCP, FAIL 1: repetición de `/login` 390/1440 claro y oscuro, CPU 4x + Fast 4G, máquina libre) | exom-admin | base `727ffb3` frente a `4e237b3` | `node scratchpad/lcp-inv.cjs rep` (servidor estático con gzip, 20 cargas alternadas en 390, 12 en 1440); `node scratchpad/lcp-inv-analyze.cjs rep` | PASS en las 4 combinaciones: 390 oscuro 1.020 → 1.118 (+98 ms, +9,6 %, n = 20), 390 claro 1.032 → 1.130 (+98 ms, +9,5 %, n = 20), 1440 oscuro 1.074 → 1.194 (+120 ms, +11,2 %, n = 12), 1440 claro 1.072 → 1.172 (+100 ms, +9,3 %, n = 12). El FAIL anterior se clasifica como ruido | 2026-11-16 | `scratchpad/lcp-inv-rep.json`, `lcp-inv-tablas-rep.md`, `lcp-inv-run-rep.log`, sección 7 |
| RDS-F5-03 (LCP, FAIL 1: experimentos de atribución de fuentes) | exom-admin | copias de `4e237b3` en el scratchpad | `node scratchpad/lcp-inv.cjs exp`; `node scratchpad/lcp-inv-analyze.cjs exp` | PASS en las 6 variantes y 2 temas (n = 12): fuentes bloqueadas -16 ms (claro) y -30 ms (oscuro) respecto al actual; `optional`, precarga de la tercera fuente y sin precarga sin mejora material. Las fuentes explican como mucho 16-30 ms de ~100 ms | 2026-11-16 | `scratchpad/lcp-inv-exp.json`, `lcp-inv-tablas-exp.md`, `lcp-build-{optional,preload3,nopreload}`, sección 7 |
| RDS-F5-03 (LCP, FAIL 2: Dashboard en el arnés, modo desarrollo, repetición) | exom-admin | base `727ffb3` frente a `9ae5fdd` (worktrees temporales, arnés copiado) | `node scratchpad/lcp-inv.cjs dev` y `node scratchpad/lcp-inv.cjs devblock`; `node scratchpad/lcp-inv-analyze.cjs dev` | FAIL numérico en 390 (1.068 → 1.304, +236 ms, +22,1 %, n = 16; en la repetición con fuentes bloqueadas 1.060 → 1.322 y 1.248, n = 12); PASS en 1440 (1.046 → 1.186, +140 ms, n = 12). Clasificado como artefacto de modo desarrollo (104 → 131 peticiones, 6.706.884 → 7.238.873 B antes del LCP; fuentes sin precarga en el arnés: 74 ms). No sustituye una medición del Dashboard en producción, que no se ha hecho | 2026-11-17 | `scratchpad/lcp-inv-dev.json`, `lcp-inv-devblock.json`, `lcp-inv-tablas-dev.md`, `lcp-inv-tablas-devblock.md`, `lcp-inv-npmci-{base,actual}.log`, sección 7 |

## 6. LCP frente a la base (2026-11-16)

Cierra la parte pendiente de RDS-F5-03 («el LCP no empeora frente a la base»). Base = `727ffb3` (`develop`, base registrada del rediseño: `docs/evidence/admin-premium-redesign-f0-20261115/README.md`, línea 5, `develop@727ffb34c4046182af585f176a643a263d37f98f`). Actual = `4e237b3` (rama `feat/admin-rediseno-f5-cierre`, incluye las fuentes woff2 de `6d838fc`). La medición de la sección 3 (`9e69954`) no tenía base y no se reutiliza.

### Método

- Dos worktrees temporales desechables, `lcp-base` (`git worktree add --detach … 727ffb3`) y `lcp-actual` (`… 4e237b3`), creados bajo `exom-admin-worktrees/`, cada uno con `npm ci` desde su propio lockfile (exit 0 los dos) y eliminados al terminar con `git worktree remove --force`. Ninguna edición en el worktree principal; no se leyó ningún `.env`.
- Build de producción de cada uno con `npx tsc -b && npx vite build --outDir <scratchpad>/lcp-build-<base|actual> --emptyOutDir` (ambos con exit 0) y valores ficticios de las siete variables `VITE_*` de `.env.example` pasados por el entorno del proceso (sin credenciales reales, sin inicio de sesión).
- Tamaño de cada build (suma de ficheros): base, 66 JS = 2.319.413 B, 1 CSS = 75.439 B, 0 fuentes; actual, 78 JS = 2.489.802 B (+170.389 B, +7,3 %), 1 CSS = 112.922 B (+37.483 B, +49,7 %), 3 fuentes woff2 = 71.460 B. Las 3 fuentes y la precarga de dos de ellas (`index.html:9-10`) solo existen en el actual.
- Script `scratchpad/lcp-measure.cjs` (CDP, Chrome 1440x900 y 390x844 móvil con escala 2 y táctil, caché desactivada, una pestaña nueva por carga, una carga de calentamiento descartada por versión y combinación). Las cargas de base y actual se ALTERNAN (base, actual, base, actual…) dentro de cada combinación. `PerformanceObserver` inyectado antes de cargar: `largest-contentful-paint` (valor `renderTime` o `startTime` de la última entrada), `layout-shift` (CLS), `paint` (FCP); se lee 3,5 s después de que aparezca el elemento de «listo» (5 s con limitación). Peticiones y bytes por `Network` (`encodedDataLength`, solo las del origen).
- Medición A: `/login` sobre el build de producción servido con `vite preview` (puertos 5195 base y 5196 actual, CDP 9335). Tema por defecto de ambas versiones: oscuro (`initTheme` es idéntico en las dos: sin `localStorage` → oscuro). Se midieron oscuro y claro en las dos versiones (`localStorage['exom-admin-theme']` escrito antes de arrancar). Sin limitación: 10 cargas por combinación y versión. Con limitación (`Emulation.setCPUThrottlingRate` 4x y `Network.emulateNetworkConditions` con 9 Mbps de bajada y subida y 150 ms de latencia): 6 cargas por combinación y versión.
- Medición B: Dashboard en el arnés sintético de F0 (modo desarrollo de Vite, puertos 5197 base y 5198 actual, `/dashboard?__role=SUPER_ADMIN`, oscuro). El arnés no existe en `727ffb3` (se creó en F0 después de esa base): se copió `browser-harness/` del estado actual al worktree base (fichero sin seguimiento, temporal). El Dashboard base se pinta con él (captura de comprobación `scratchpad/lcp-probe-base.png`: tarjetas, actividad reciente y top clientes con datos del fixture; la única línea de consola es el aviso `No HydrateFallback element provided`, también presente en el actual; sin líneas `[fixture-api] 404`), de modo que la medición se ejecutó. 8 cargas alternadas por combinación y versión tras una de calentamiento descartada.
- Regla de veredicto (margen de ruido declarado antes de medir): PASS si mediana LCP actual ≤ mediana LCP base × 1,10 + 50 ms en esa combinación; si no, FAIL. Veredicto global: PASS solo si lo son todas las combinaciones.
- Estadística: mediana, mínimo-máximo y rango intercuartílico (RIC, interpolación lineal) de LCP, FCP y CLS. Tablas generadas por `scratchpad/lcp-analyze.cjs` desde `scratchpad/lcp-result-<A|Athr|B>.json`.

### Resultados A: `/login`, build de producción, sin limitación (10 cargas alternadas, ms)

| Combinación | Base `727ffb3` mediana (mín-máx; RIC) | Actual `4e237b3` mediana (mín-máx; RIC) | Δ medianas | Límite (base×1,10+50) | Veredicto |
| --- | --- | --- | --- | --- | --- |
| login-1440-dark | 144 (131-203; RIC 14) | 154 (140-231; RIC 14) | +10 ms / +6,9 % | 208 | PASS |
|  ↳ FCP | 144 (131-203; RIC 14) | 154 (140-231; RIC 14) | +10 ms / 6,9 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0000 (0,0000-0,0000) | | | |
| login-1440-light | 144 (137-164; RIC 16) | 154 (136-1366; RIC 23) | +10 ms / +7,0 % | 208 | PASS |
|  ↳ FCP | 144 (137-164; RIC 16) | 154 (136-1366; RIC 23) | +10 ms / 7,0 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0000 (0,0000-0,0000) | | | |
| login-390-dark | 140 (135-158; RIC 4) | 154 (143-234; RIC 31) | +14 ms / +10,1 % | 204 | PASS |
|  ↳ FCP | 140 (135-158; RIC 4) | 154 (143-234; RIC 31) | +14 ms / 10,1 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0000 (0,0000-0,0000) | | | |
| login-390-light | 149 (128-211; RIC 15) | 159 (141-213; RIC 21) | +10 ms / +6,5 % | 214 | PASS |
|  ↳ FCP | 149 (128-211; RIC 15) | 159 (141-213; RIC 21) | +10 ms / 6,5 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0000 (0,0000-0,0000) | | | |

### Resultados A con limitación: `/login`, build de producción, CPU 4x y Fast 4G (6 cargas alternadas, ms)

| Combinación | Base `727ffb3` mediana (mín-máx; RIC) | Actual `4e237b3` mediana (mín-máx; RIC) | Δ medianas | Límite (base×1,10+50) | Veredicto |
| --- | --- | --- | --- | --- | --- |
| login-1440-dark | 1022 (983-1033; RIC 23) | 1126 (1102-1142; RIC 16) | +104 ms / +10,2 % | 1174 | PASS |
|  ↳ FCP | 1022 (983-1033; RIC 23) | 1126 (1102-1142; RIC 16) | +104 ms / 10,2 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0001 (0,0001-0,0001) | | | |
| login-1440-light | 1036 (1019-1087; RIC 30) | 1145 (1113-1231; RIC 26) | +109 ms / +10,5 % | 1189 | PASS |
|  ↳ FCP | 1036 (1019-1087; RIC 30) | 1145 (1113-1231; RIC 26) | +109 ms / 10,5 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0001 (0,0001-0,0001) | | | |
| login-390-dark | 1918 (1436-2549; RIC 569) | 2001 (1718-2298; RIC 241) | +83 ms / +4,3 % | 2160 | PASS |
|  ↳ FCP | 1918 (1436-2549; RIC 569) | 2001 (1718-2298; RIC 241) | +83 ms / 4,3 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0004 (0,0004-0,0004) | | | |
| login-390-light | 1748 (1591-2066; RIC 146) | 2511 (2098-2773; RIC 161) | +763 ms / +43,6 % | 1973 | FAIL |
|  ↳ FCP | 1748 (1591-2066; RIC 146) | 2511 (2098-2773; RIC 161) | +763 ms / 43,6 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0004 (0,0004-0,0004) | | | |

Cargas individuales del caso FAIL (LCP, ms, en orden de ejecución): `/login` 390 claro, base 1591 1727 2066 1761 1736 1913; actual 2437 2604 2773 2440 2583 2098. Las 6 cargas del actual superan a las 6 del base (el mínimo del actual, 2098, es mayor que el máximo del base, 2066): no es un valor atípico. En 390 oscuro, mismo escenario: base 1536 1436 2549 1908 1929 2288; actual 1996 1790 2107 2007 1718 2298 (solapadas, PASS con +4,3 %).

### Resultados B: Dashboard, arnés sintético en modo desarrollo (8 cargas alternadas, ms)

| Combinación | Base `727ffb3` mediana (mín-máx; RIC) | Actual `4e237b3` mediana (mín-máx; RIC) | Δ medianas | Límite (base×1,10+50) | Veredicto |
| --- | --- | --- | --- | --- | --- |
| dashboard-1440 | 1300 (924-2356; RIC 439) | 1154 (1092-1912; RIC 461) | -146 ms / -11,2 % | 1480 | PASS |
|  ↳ FCP | 1208 (864-2204; RIC 429) | 1066 (1016-1792; RIC 431) | -142 ms / -11,8 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0000 (0,0000-0,0000) | | | |
| dashboard-390 | 2032 (1740-2128; RIC 126) | 2426 (2036-3108; RIC 248) | +394 ms / +19,4 % | 2285 | FAIL |
|  ↳ FCP | 1928 (1644-2020; RIC 128) | 2262 (1876-2948; RIC 255) | +334 ms / 17,3 % | | |
|  ↳ CLS | 0,0000 (0,0000-0,0000) | 0,0000 (0,0000-0,0000) | | | |

Cargas individuales (LCP, ms): 1440 base 1664 1044 1408 1244 1356 924 1000 2356; actual 1116 1104 1172 1476 1136 1092 1912 1868. 390 base 2012 2052 2128 1984 2116 1864 2068 1740; actual 2384 3032 3108 2420 2036 2432 2256 2456.

### Peticiones, bytes y elemento LCP

Medianas base → actual. `/login` producción (A): 8 → 11 peticiones; JS 6 → 6 ficheros (292.526 → 305.947 B transferidos); CSS 13.938 → 19.988 B; fuentes 0 → 3 (0 → 72.675 B). Dashboard del arnés (B, módulos de desarrollo sin empaquetar): 105 → 132 peticiones; JS 104 → 128 ficheros (6.706.839 → 7.165.690 B); fuentes 0 → 3 (0 → 72.420 B). Estas cifras de B no son representativas de producción.

Elemento LCP (el más frecuente): en `/login` 1440 es el `<span>` decorativo «EXOM» en ambas versiones. En `/login` 390 cambia: base `<span>` «EXOM»; actual `<h1>` «Iniciar sesión». En el Dashboard 1440 cambia: base `<p>` «Ranking semanal por días de entrenamiento completados.»; actual `<p>` «Hola, Lucía. Aquí tienes el resumen ejecutivo…»; en 390 es el párrafo de saludo en ambas. Es decir, en 5 de las 10 combinaciones medidas (los dos `/login` 390 de A y los dos de A con limitación, y el Dashboard 1440) el LCP compara elementos distintos por el rediseño, no el mismo elemento. CLS: 0 en todas las cargas de base y en el actual salvo en A con limitación (0,0001 en 1440 y 0,0004 en 390, en las 6 cargas de cada combinación), órdenes de magnitud por debajo del umbral de 0,1.

### Veredictos

| Combinación | Medición | Δ mediana LCP | Veredicto |
| --- | --- | --- | --- |
| `/login` 1440 oscuro | A, producción | +10 ms / +6,9 % | PASS |
| `/login` 1440 claro | A, producción | +10 ms / +7,0 % | PASS |
| `/login` 390 oscuro | A, producción | +14 ms / +10,1 % | PASS |
| `/login` 390 claro | A, producción | +10 ms / +6,5 % | PASS |
| `/login` 1440 oscuro, CPU 4x + Fast 4G | A con limitación | +104 ms / +10,2 % | PASS (margen 48 ms) |
| `/login` 1440 claro, CPU 4x + Fast 4G | A con limitación | +109 ms / +10,5 % | PASS (margen 44 ms) |
| `/login` 390 oscuro, CPU 4x + Fast 4G | A con limitación | +83 ms / +4,3 % | PASS |
| `/login` 390 claro, CPU 4x + Fast 4G | A con limitación | +763 ms / +43,6 % | FAIL (límite 1.973 ms, mediana actual 2.511 ms) |
| Dashboard 1440 oscuro | B, arnés en desarrollo | -146 ms / -11,2 % | PASS (solo referencia relativa) |
| Dashboard 390 oscuro | B, arnés en desarrollo | +394 ms / +19,4 % | FAIL (límite 2.285 ms, mediana actual 2.426 ms; solo referencia relativa) |

Veredicto global de «el LCP no empeora frente a la base»: FAIL con la regla declarada. Respaldo: la medición A (producción en `/login`) da PASS en las 4 combinaciones sin limitación y en 3 de las 4 con limitación, y FAIL en `/login` 390 claro con limitación (+763 ms); la medición B (Dashboard en modo desarrollo del arnés) da FAIL en 390 (+394 ms) y PASS en 1440, y solo sirve como referencia relativa. En 1440 con limitación el actual queda a 44-48 ms del límite (Δ +10,2 % y +10,5 %): dentro del margen, pero sin holgura. No se ha cambiado la regla ni el margen para obtener otro resultado.

Los dos FAIL no se han diagnosticado: esta unidad solo mide. Datos que acotan la causa, sin demostrarla: en `/login` el FCP se mueve igual que el LCP (la diferencia está en el primer pintado, no en un elemento tardío); el actual añade 3 peticiones (las 3 fuentes, 72.675 B), 13.421 B de JS y 6.050 B de CSS transferidos, y precarga dos de las fuentes (`index.html:9-10`); y en 390 el elemento LCP del `/login` pasó de un `<span>` a un `<h1>`. Hipótesis, no confirmadas: la competencia de las fuentes precargadas con el ancho de banda emulado de 9 Mbps y el cambio de elemento LCP. El FAIL en 390 claro con limitación, frente a un PASS en 390 oscuro con la misma configuración, apunta además a ruido o a una dependencia del tema que esta medición no separó.

### Limitaciones

- La máquina estaba compartida con otro trabajo en el worktree principal (edición de `src/` y ejecución de pruebas del otro worker) durante la medición; no se pudo controlar esa carga. La alternancia base/actual reparte el efecto por igual, pero hay valores extremos (por ejemplo `/login` 1440 claro del actual, máximo 1.366 ms con mediana 154 ms; y el Dashboard 1440 de B con RIC de 439 y 461 ms).
- `/login` es representativo del arranque de la aplicación (shell, CSS, JS de entrada y fuentes), no de la ruta que nombra el criterio. El Dashboard solo se pudo medir con el arnés en modo desarrollo (módulos sin minificar ni empaquetar, 105-132 peticiones, 6,7-7,2 MB de JS), con datos de fixture, sin red real y con el reloj fijado; sus cifras solo sirven como comparación relativa y no se pueden trasladar a producción.
- Los valores de Firebase eran ficticios: el estado de sesión del build es «sin usuario». `vite preview` sirve en loopback sin latencia ni CDN salvo la emulada; las cifras sin limitación (140-160 ms de mediana) son un suelo.
- La limitación de CPU y red es emulación de Chrome (CDP), no un dispositivo real; el LCP real depende de CDN, caché y red.
- El arnés copiado a `727ffb3` usa los mismos fixtures que el actual; el Dashboard base se pintó con datos y no hubo líneas `[fixture-api] 404`, pero un fixture pensado para la UI actual podría no cubrir todo lo que pide el Dashboard base.
- En 5 de las 10 combinaciones el LCP compara elementos distintos de cada versión (ver arriba).
- En B solo se midió el tema oscuro.
- El actual transfiere 72,7 kB de fuentes que el base no tenía (las fuentes se incorporaron en F1, commit `610bd73`).
- Reproducible desde el scratchpad: `lcp-measure.cjs`, `lcp-analyze.cjs`, `lcp-result-{A,Athr,B}.json`, `lcp-stats-{A,Athr,B}.json`, `lcp-tablas-{A,Athr,B}.md`, `lcp-run-{A,Athr,B}.log`, `lcp-build-{base,actual}.log`, `lcp-npmci-{base,actual}.log`.

## 7. Investigación de los FAIL de LCP (2026-11-16 y 2026-11-17)

Decisión del propietario: investigar antes de aceptar o corregir. Solo diagnóstico: no se tocó `src/` ni el worktree principal. La sección 6 queda como medición histórica (con la máquina compartida con otro worker); esta sección la repite con la máquina libre. No se cambió la regla (mediana actual ≤ mediana base × 1,10 + 50 ms) ni el margen.

### Método

- Producción (FAIL 1): los builds de la sección 6 (`lcp-build-base` de `727ffb3`, `lcp-build-actual` de `4e237b3`), servidos ahora con un servidor estático mínimo con gzip (`scratchpad/lcp-static.cjs`, un solo proceso, un puerto por build, `Cache-Control: no-cache`; sustituye a `vite preview` porque los worktrees ya no existen y permite servir las copias de los experimentos con la misma pila). Los `transferSize` de los 6 JS de una carga de ejemplo suman 291.398 B en la base y 304.810 B en el actual, del orden de los de la sección 6 (292.526 y 305.947 B). `/login`, CPU 4x y Fast 4G (9 Mbps, 150 ms), caché desactivada, una pestaña por carga, una carga de calentamiento descartada por versión y combinación, cargas ALTERNADAS base/actual. Script `scratchpad/lcp-inv.cjs rep|exp`, estadística `scratchpad/lcp-inv-analyze.cjs`.
- Dashboard (FAIL 2): worktrees temporales nuevos `lcp-base` (`727ffb3`) y `lcp-actual` en `9ae5fdd` (HEAD actual de la rama, confirmado con `git rev-parse`; difiere de `4e237b3` en 43 ficheros de accesibilidad/formularios), `npm ci` exit 0 en ambos, arnés de F0 copiado a base, Vite del arnés en modo desarrollo (puertos 5197 y 5198), `/dashboard?__role=SUPER_ADMIN`, oscuro, sin limitación, calentamiento descartado en cada servidor (`lcp-inv.cjs dev|devblock`). Los worktrees se eliminaron al terminar.
- Cada carga guarda: `responseEnd` del HTML, `performance.getEntriesByType('resource')` (inicio, fin, `transferSize`), todas las entradas `largest-contentful-paint` (tiempo, tamaño, elemento, `url`), FCP, `layout-shift`, eventos `loading` y `loadingdone` de `document.fonts` y estado de cada `FontFace`.
- Experimentos de atribución sobre copias del build actual en el scratchpad, nunca en el repo: `actual-blocked` (mismo build, `Network.setBlockedURLs` con `*.woff2`), `optional` (`font-display:swap` sustituido por `optional` en las 3 reglas `@font-face` del CSS de la copia), `preload3` (precarga añadida de `dm-sans-600.woff2` en el `index.html` de la copia), `nopreload` (sin ninguna precarga).

### 1b. Cómo se fija el tema

- Base y actual son idénticos en el mecanismo: `index.html` trae `<html class="dark">` fijo (sin script de tema); `src/main.tsx:10` llama a `initTheme()`, que lee `localStorage['exom-admin-theme']` (`'light'` → claro, cualquier otra cosa → oscuro), y `applyTheme` quita y añade la clase `dark` o `light` en `<html>` y guarda el valor (la actual además actualiza `meta[name="theme-color"]`). El tema por defecto de ambas es oscuro. La base sí tenía tema claro y oscuro.
- La medición lo fuerza con `Page.addScriptToEvaluateOnNewDocument`, que escribe `localStorage['exom-admin-theme']` antes de cargar la página, tanto para claro como para oscuro (también se escribe `'dark'` en oscuro): el trabajo añadido por el arnés es el mismo en las dos combinaciones y en las dos versiones; no hay artefacto de forzado asimétrico.
- En claro, el HTML llega siempre como `class="dark"` (fondo `#101111` en el `<style>` en línea del actual, `#30271e` en la base) y la clase cambia cuando se ejecuta el JS de entrada. Es decir, en claro hay un cambio de clase en `<html>` durante `initTheme()`, antes del primer render de React, que no ocurre en oscuro. Ese cambio es igual en ambas versiones y no aparece en las líneas de tiempo como evento previo al LCP (`layout-shift` vacío en producción salvo el 0,0004 posterior al LCP descrito abajo).

### FAIL 1: `/login`, producción, 390 claro con limitación (repetición con la máquina libre)

n = cargas válidas (todas lo fueron; 0 cargas con `ready` falso). Veredicto por la regla declarada.

| Combinación | Variante | n | Mediana | RIC | Mín | Máx | Δ vs base | Límite | Veredicto | FCP mediana |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| login-390-dark | base | 20 | 1020 | 21 | 1004 | 1048 |  |  |  | 1020 |
| login-390-dark | actual | 20 | 1118 | 13 | 1100 | 1152 | +98 ms / 9,6 % | 1172 | PASS | 1118 |
| login-390-light | base | 20 | 1032 | 16 | 1020 | 1112 |  |  |  | 1032 |
| login-390-light | actual | 20 | 1130 | 16 | 1104 | 1336 | +98 ms / 9,5 % | 1185 | PASS | 1130 |
| login-1440-dark | base | 12 | 1074 | 11 | 1048 | 1096 |  |  |  | 1074 |
| login-1440-dark | actual | 12 | 1194 | 29 | 1160 | 1208 | +120 ms / 11,2 % | 1231 | PASS | 1194 |
| login-1440-light | base | 12 | 1072 | 45 | 1016 | 1108 |  |  |  | 1072 |
| login-1440-light | actual | 12 | 1172 | 34 | 1112 | 1200 | +100 ms / 9,3 % | 1229 | PASS | 1172 |

Distribución ordenada (LCP, ms):
- login-390-dark base (n=20): 1004 1004 1008 1012 1012 1012 1016 1016 1016 1016 1024 1024 1024 1028 1032 1036 1036 1040 1044 1048
- login-390-dark actual (n=20): 1100 1104 1108 1108 1112 1112 1116 1116 1116 1116 1120 1120 1120 1124 1124 1128 1128 1136 1140 1152
- login-390-light base (n=20): 1020 1020 1024 1024 1024 1024 1024 1028 1028 1032 1032 1032 1036 1036 1036 1052 1068 1072 1088 1112
- login-390-light actual (n=20): 1104 1112 1116 1120 1124 1124 1124 1124 1128 1128 1132 1132 1132 1136 1140 1140 1148 1156 1188 1336
- login-1440-dark base (n=12): 1048 1056 1064 1068 1072 1072 1076 1076 1076 1084 1088 1096
- login-1440-dark actual (n=12): 1160 1168 1168 1172 1188 1192 1196 1196 1200 1200 1200 1208
- login-1440-light base (n=12): 1016 1020 1024 1036 1072 1072 1072 1076 1076 1084 1088 1108
- login-1440-light actual (n=12): 1112 1116 1136 1156 1160 1172 1172 1172 1184 1188 1192 1200

| Combinación | Variante | n | Elemento LCP final | Último evento antes del LCP (categoría) | LCP ≤120 ms tras llegada de fuente | Hueco mediano al evento previo (ms) | Entradas LCP (mediana) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| login-390-dark | base | 20 | SPAN:EXOM x20 | js x20 | 0/20 | 354 | 1 |
| login-390-dark | actual | 20 | H1:Iniciar sesión x20 | js x20 | 0/20 | 364 | 1 |
| login-390-light | base | 20 | SPAN:EXOM x20 | js x20 | 0/20 | 356 | 1 |
| login-390-light | actual | 20 | H1:Iniciar sesión x20 | js x20 | 0/20 | 368 | 1 |
| login-1440-dark | base | 12 | SPAN:EXOM x12 | js x12 | 0/12 | 410 | 1 |
| login-1440-dark | actual | 12 | SPAN:EXOM x12 | js x12 | 0/12 | 425 | 1 |
| login-1440-light | base | 12 | SPAN:EXOM x12 | js x12 | 0/12 | 407 | 1 |
| login-1440-light | actual | 12 | SPAN:EXOM x12 | js x12 | 0/12 | 423 | 1 |

Lectura: con la máquina libre la diferencia 390 claro/oscuro NO se reproduce. En 390 claro la mediana pasa de 1.032 (base) a 1.130 (actual), +98 ms / +9,5 %, y en 390 oscuro de 1.020 a 1.118, +98 ms / +9,6 %. Las distribuciones casi no se solapan (mínimos del actual 1.100 oscuro y 1.104 claro; máximos de la base 1.048 oscuro y 1.112 claro, una sola carga, la siguiente es 1.088): el actual es de forma estable unos 100 ms más lento, pero los dos temas coinciden y las cuatro combinaciones pasan la regla (PASS). En 1440 el actual está +100 ms (claro) y +120 ms (oscuro, +11,2 %, dentro del margen por los 50 ms fijos: 1.194 ≤ 1.231). El resultado de la sección 6 (1.748 → 2.511 ms, +43,6 %) no se reproduce: sus cargas tenían medianas de base de 1.748 a 1.918 ms frente a los 1.020-1.032 actuales, y RIC de hasta 569 ms, con la máquina compartida con las pruebas del otro worker. Conclusión: ruido por carga de la máquina.

Línea temporal (una carga representativa de 390 claro con limitación; tiempos en ms desde el inicio de la navegación):

| Evento | Base `727ffb3` | Actual `4e237b3` |
| --- | --- | --- |
| `responseEnd` del HTML | 182 | 178 |
| Fuentes (precargadas) | no hay | `dm-sans-400` 204-474, `barlow-800` 206-537 |
| CSS | 210-448 (13.788 B) | 209-676 (19.830 B) |
| JS de entrada y vendors (6 ficheros) | último `responseEnd` 686 | último `responseEnd` 771 (`vendor-ui`; `vendor-forms` 756) |
| FCP | 1.052 | 1.136 |
| Entradas LCP | 1, a 1.052: `<span>` «EXOM» 123x40, tamaño 5.952, fuente del sistema | 1, a 1.136: `<h1>` «Iniciar sesión» 358x35, tamaño 9.568, `Barlow` |
| `document.fonts` | sin fuentes | `loadingdone` a 1.133 (Barlow y DM Sans 400) y a 1.252 (DM Sans 600) |
| Petición de `dm-sans-600` | no hay | empieza a 1.047 (no precargada, la pide el CSS al renderizar), termina 1.242 |
| `layout-shift` | ninguno | 0,0004 a 1.259 (después del LCP) |

Resumen de las líneas de tiempo de todas las cargas (20 por versión y combinación de 390; 12 de 1440):

- Elemento LCP final: base `<span>` «EXOM» (todas las cargas); actual `<h1>` «Iniciar sesión» en 390 y `<span>` «EXOM» en 1440. No es un elemento distinto entre claro y oscuro: es el mismo en los dos temas.
- Entradas LCP por carga: 1 en todas (mediana 1): el LCP no se actualiza después del primer pintado de contenido, FCP = LCP.
- Evento previo al LCP: el último `responseEnd` anterior es siempre de un fichero JS, con un hueco mediano de 354-425 ms hasta el pintado (tiempo de ejecución con CPU 4x): base 354-410 ms y actual 364-425 ms.
- Cargas en las que el LCP final ocurre ≤ 120 ms después de llegar una fuente: 0 de 20, 0 de 20, 0 de 12 y 0 de 12 en el actual en las cuatro combinaciones (columna «LCP ≤120 ms tras llegada de fuente»). Las fuentes precargadas terminan (474-537 ms) mucho antes del LCP (~1.130 ms) y no es la llegada de la fuente la que repinta un texto mayor.
- Dónde está la diferencia: en la línea de tiempo el hueco entre el último JS y el pintado es igual (366 ms en la base, 365 ms en el actual) y el actual llega ~85 ms más tarde al último JS (771 frente a 686). La diferencia está antes del pintado, en la llegada de los recursos críticos, no en trabajo posterior.

### Experimentos de atribución (390, `/login`, producción con limitación, 12 cargas alternadas por variante)

| Combinación | Variante | n | Mediana | RIC | Mín | Máx | Δ vs base | Límite | Veredicto | FCP mediana |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| login-390-light | base | 12 | 1038 | 17 | 1028 | 1056 |  |  |  | 1038 |
| login-390-light | actual | 12 | 1136 | 14 | 1112 | 1396 | +98 ms / 9,4 % | 1192 | PASS | 1136 |
| login-390-light | actual-blocked | 12 | 1120 | 14 | 1104 | 1140 | +82 ms / 7,9 % | 1192 | PASS | 1120 |
| login-390-light | optional | 12 | 1144 | 22 | 1112 | 1200 | +106 ms / 10,2 % | 1192 | PASS | 1144 |
| login-390-light | preload3 | 12 | 1132 | 37 | 1096 | 1220 | +94 ms / 9,1 % | 1192 | PASS | 1132 |
| login-390-light | nopreload | 12 | 1166 | 10 | 1140 | 1232 | +128 ms / 12,3 % | 1192 | PASS | 1166 |
| login-390-dark | base | 12 | 1064 | 42 | 1040 | 1184 |  |  |  | 1064 |
| login-390-dark | actual | 12 | 1174 | 52 | 1140 | 1224 | +110 ms / 10,3 % | 1220 | PASS | 1174 |
| login-390-dark | actual-blocked | 12 | 1144 | 61 | 1120 | 1340 | +80 ms / 7,5 % | 1220 | PASS | 1144 |
| login-390-dark | optional | 12 | 1166 | 51 | 1132 | 1852 | +102 ms / 9,6 % | 1220 | PASS | 1166 |
| login-390-dark | preload3 | 12 | 1148 | 49 | 1048 | 1280 | +84 ms / 7,9 % | 1220 | PASS | 1148 |
| login-390-dark | nopreload | 12 | 1200 | 79 | 1152 | 1368 | +136 ms / 12,8 % | 1220 | PASS | 1200 |

Distribución ordenada (LCP, ms):
- login-390-light base (n=12): 1028 1032 1032 1032 1036 1036 1040 1044 1048 1052 1056 1056
- login-390-light actual (n=12): 1112 1124 1128 1132 1132 1136 1136 1136 1144 1148 1192 1396
- login-390-light actual-blocked (n=12): 1104 1104 1108 1112 1116 1116 1124 1124 1124 1128 1136 1140
- login-390-light optional (n=12): 1112 1124 1124 1128 1132 1144 1144 1148 1148 1152 1160 1200
- login-390-light preload3 (n=12): 1096 1100 1104 1104 1116 1128 1136 1136 1140 1144 1152 1220
- login-390-light nopreload (n=12): 1140 1152 1160 1164 1164 1164 1168 1168 1172 1176 1180 1232
- login-390-dark base (n=12): 1040 1044 1044 1048 1052 1060 1068 1076 1088 1092 1124 1184
- login-390-dark actual (n=12): 1140 1140 1148 1152 1156 1164 1184 1196 1200 1212 1220 1224
- login-390-dark actual-blocked (n=12): 1120 1120 1128 1136 1140 1140 1148 1156 1176 1252 1296 1340
- login-390-dark optional (n=12): 1132 1148 1152 1156 1160 1164 1168 1176 1180 1284 1336 1852
- login-390-dark preload3 (n=12): 1048 1108 1124 1132 1144 1148 1148 1148 1176 1188 1192 1280
- login-390-dark nopreload (n=12): 1152 1164 1172 1172 1176 1188 1212 1232 1240 1284 1288 1368

| Combinación | Variante | n | Elemento LCP final | Último evento antes del LCP (categoría) | LCP ≤120 ms tras llegada de fuente | Hueco mediano al evento previo (ms) | Entradas LCP (mediana) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| login-390-light | base | 12 | SPAN:EXOM x12 | js x12 | 0/12 | 370 | 1 |
| login-390-light | actual | 12 | H1:Iniciar sesión x12 | js x12 | 0/12 | 377 | 1 |
| login-390-light | actual-blocked | 12 | H1:Iniciar sesión x12 | js x12 | 0/12 | 425 | 1 |
| login-390-light | optional | 12 | H1:Iniciar sesión x12 | js x12 | 0/12 | 378 | 1 |
| login-390-light | preload3 | 12 | H1:Iniciar sesión x12 | js x8; fontdone x4 | 0/12 | 327 | 1 |
| login-390-light | nopreload | 12 | H1:Iniciar sesión x12 | js x12 | 0/12 | 470 | 1 |
| login-390-dark | base | 12 | SPAN:EXOM x12 | js x12 | 0/12 | 393 | 1 |
| login-390-dark | actual | 12 | H1:Iniciar sesión x12 | js x12 | 0/12 | 405 | 1 |
| login-390-dark | actual-blocked | 12 | H1:Iniciar sesión x12 | js x12 | 0/12 | 437 | 1 |
| login-390-dark | optional | 12 | H1:Iniciar sesión x12 | js x12 | 0/12 | 408 | 1 |
| login-390-dark | preload3 | 12 | H1:Iniciar sesión x12 | fontdone x4; js x8 | 0/12 | 347 | 1 |
| login-390-dark | nopreload | 12 | H1:Iniciar sesión x12 | js x11; font x1 | 1/12 | 491 | 1 |

Lectura de las medianas (Δ frente a la base, ms):

| Variante | 390 claro | 390 oscuro | Efecto frente al actual sin modificar |
| --- | --- | --- | --- |
| actual | +98 | +110 | referencia |
| actual-blocked (3 fuentes bloqueadas) | +82 | +80 | -16 claro, -30 oscuro |
| optional | +106 | +102 | +8 claro, -8 oscuro (sin efecto) |
| preload3 (precarga de `dm-sans-600`) | +94 | +84 | -4 claro, -26 oscuro (dentro del ruido) |
| nopreload (sin precargas) | +128 | +136 | +30 claro, +26 oscuro (empeora) |

- Fuentes: bloquear las tres reduce la mediana solo 16 ms (claro) y 30 ms (oscuro); queda un +82 ms / +80 ms sin ninguna fuente. Las fuentes explican como mucho 16-30 ms (≈ 20-27 % de los ~100 ms) del delta de producción.
- El resto (≈ 80 ms) no depende de las fuentes. Datos que lo acotan sin aislarlo con un experimento: el actual transfiere 13.421 B más de JS y 6.050 B más de CSS (medición de la sección 6), carga entradas de mayor tamaño (`index` 282,78 kB frente a 249,09 kB sin comprimir) y ejecuta más código antes de pintar con la CPU a 4x. Hipótesis (no demostrada): coste de transferencia y ejecución de JS/CSS más grandes por el rediseño.
- `font-display: optional` no cambia nada; la precarga de la tercera fuente da -4 y -26 ms (no distinguible del ruido; RIC de 37 y 49 ms); quitar las precargas empeora (+30 ms). Ninguna variante de fuentes reduce el delta de forma material, por lo que no se propone ningún cambio en las fuentes para el LCP del `/login`.
- Conclusión FAIL 1: ruido de la medición anterior (máquina cargada). Con la máquina libre las 4 combinaciones de `/login` con limitación pasan; el actual es unos 100 ms (≈ 9,5 %) más lento y consistente, de los cuales 16-30 ms son de las fuentes y el resto es el peso del JS/CSS del rediseño. No se propone corrección.

### FAIL 2: Dashboard, arnés en modo desarrollo, 390 oscuro (`lcp-base` `727ffb3` frente a `lcp-actual` `9ae5fdd`)

| Combinación | Variante | n | Mediana | RIC | Mín | Máx | Δ vs base | Límite | Veredicto | FCP mediana |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard-390-dark | base | 16 | 1068 | 126 | 988 | 1472 |  |  |  | 1002 |
| dashboard-390-dark | actual | 16 | 1304 | 125 | 1204 | 1960 | +236 ms / 22,1 % | 1225 | FAIL | 1192 |
| dashboard-1440-dark | base | 12 | 1046 | 32 | 996 | 1244 |  |  |  | 972 |
| dashboard-1440-dark | actual | 12 | 1186 | 29 | 1128 | 1332 | +140 ms / 13,4 % | 1201 | PASS | 1110 |

Distribución ordenada (LCP, ms):
- dashboard-390-dark base (n=16): 988 1008 1024 1024 1032 1040 1044 1068 1068 1092 1120 1148 1180 1184 1284 1472
- dashboard-390-dark actual (n=16): 1204 1244 1244 1248 1256 1256 1260 1276 1332 1336 1344 1372 1400 1492 1496 1960
- dashboard-1440-dark base (n=12): 996 1012 1024 1032 1040 1044 1048 1056 1060 1068 1152 1244
- dashboard-1440-dark actual (n=12): 1128 1168 1168 1180 1184 1184 1188 1192 1196 1236 1320 1332

| Combinación | Variante | n | Elemento LCP final | Último evento antes del LCP (categoría) | LCP ≤120 ms tras llegada de fuente | Hueco mediano al evento previo (ms) | Entradas LCP (mediana) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard-390-dark | base | 16 | P:Hola, Lucía. Aquí tien x16 | js x16 | 0/16 | 157 | 2 |
| dashboard-390-dark | actual | 16 | P:Hola, Lucía. Aquí tien x16 | fontdone x16 | 0/16 | 4 | 2 |
| dashboard-1440-dark | base | 12 | P:Ranking semanal por dí x12 | js x12 | 0/12 | 162 | 2 |
| dashboard-1440-dark | actual | 12 | P:Hola, Lucía. Aquí tien x12 | fontdone x12 | 6/12 | 5 | 2 |

Peticiones y bytes antes del LCP (medianas; en todas las cargas todas las peticiones del arnés terminan antes del LCP): base 104 peticiones y 6.706.884 B; actual 131 peticiones y 7.238.873 B (+27 peticiones, +26 %, y +531.989 B, +7,9 %, de módulos de desarrollo sin empaquetar ni minificar). Esto no ocurre en producción, donde el actual tiene 12 ficheros JS más que la base (78 frente a 66) y +170.389 B (+7,3 %) en el total del build, pero solo 6 ficheros JS en la ruta de `/login`.

Línea temporal de una carga de 390 (ms): base, HTML a 19; el último recurso (de 104) termina a 1.051; FCP 1.180 (primera entrada LCP: `<span>` «Dashboard», tamaño 1.311); LCP final 1.284 (`<p>` «Hola, Lucía…», 12.129), 2 entradas LCP, sin `document.fonts`. Actual: HTML a 15; el último recurso (de 131) termina a 1.264; los 3 `.woff2` se piden a 1.255 y terminan a 1.260-1.264, justo antes del FCP (1.324, `<span>` «EXOM», 984) y del LCP final a 1.492 (`<p>` «Hola, Lucía…», 13.505), 2 entradas; `document.fonts` `loadingdone` a 1.321 y 1.487; sin layout shift. El último evento anterior al LCP del actual es la llegada de las fuentes (`loadingdone`, hueco mediano de 4 ms) en las 16 cargas, mientras que en la base es un fichero JS con un hueco de 157 ms.

Fuentes bloqueadas en el actual (390, 12 cargas, 3 variantes alternadas, tabla siguiente): base 1.060, actual 1.322 (+262 ms, +24,7 %, FAIL), actual con las 3 fuentes bloqueadas 1.248 (+188 ms, +17,7 %, FAIL). Las fuentes aportan 74 ms de los 262; los otros 188 ms son del mayor número de módulos sin empaquetar (el último recurso del actual termina 213 ms después que el de la base, 1.264 frente a 1.051, con el LCP 208 ms más tarde). En el arnés, el `index.html` no tiene precarga de fuentes (0 coincidencias de «preload» en `browser-harness/index.html`), por lo que las fuentes se piden recién al renderizar, a 1.255 ms, y entran en la ruta crítica; el build de producción las precarga desde `index.html:9-10` y llegan a los 474-537 ms, 600 ms antes del LCP.

| Combinación | Variante | n | Mediana | RIC | Mín | Máx | Δ vs base | Límite | Veredicto | FCP mediana |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard-390-dark | base | 12 | 1060 | 59 | 1020 | 1156 |  |  |  | 988 |
| dashboard-390-dark | actual | 12 | 1322 | 93 | 1240 | 1496 | +262 ms / 24,7 % | 1216 | FAIL | 1206 |
| dashboard-390-dark | actual-blocked | 12 | 1248 | 174 | 1176 | 1444 | +188 ms / 17,7 % | 1216 | FAIL | 1128 |

Distribución ordenada (LCP, ms):
- dashboard-390-dark base (n=12): 1020 1024 1024 1044 1056 1056 1064 1080 1096 1104 1148 1156
- dashboard-390-dark actual (n=12): 1240 1248 1256 1260 1280 1308 1336 1344 1344 1376 1428 1496
- dashboard-390-dark actual-blocked (n=12): 1176 1192 1200 1216 1228 1236 1260 1280 1372 1428 1432 1444

| Combinación | Variante | n | Elemento LCP final | Último evento antes del LCP (categoría) | LCP ≤120 ms tras llegada de fuente | Hueco mediano al evento previo (ms) | Entradas LCP (mediana) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard-390-dark | base | 12 | P:Hola, Lucía. Aquí tien x12 | js x12 | 0/12 | 165 | 2 |
| dashboard-390-dark | actual | 12 | P:Hola, Lucía. Aquí tien x12 | fontdone x12 | 0/12 | 5 | 2 |
| dashboard-390-dark | actual-blocked | 12 | P:Hola, Lucía. Aquí tien x12 | fontdone x12 | 0/12 | 6 | 2 |

Conclusión FAIL 2: artefacto de la medición. La diferencia de +236 ms (+22,1 %, n = 16) / +262 ms (n = 12) se explica por (a) 27 módulos y 532 KB más sin empaquetar en modo desarrollo, que no existen en producción, y (b) el `index.html` del arnés, que no precarga las fuentes que el producto sí precarga (74 ms). Con la regla numérica sigue siendo FAIL en esta medición (390: 1.068 → 1.304 con n = 16, límite 1.225; 1440: 1.046 → 1.186, +140 ms, límite 1.201, PASS) y no se ha cambiado la regla. El equivalente representativo (`/login` en producción a 390 con limitación) da +98 ms, PASS. El Dashboard en producción no se pudo medir (exige sesión). Hasta que se mida el Dashboard real, la afirmación sobre el Dashboard queda como referencia relativa, no como PASS.

### Límites de esta investigación

- El build actual de los experimentos es `4e237b3`, no `9ae5fdd`; la medición del arnés sí usa `9ae5fdd`. Las diferencias entre ambos son de accesibilidad y formularios (43 ficheros), sin cambios de fuentes ni de `index.html`.
- La máquina estaba libre según el coordinador; no se registró la carga de CPU durante la medición.
- La atribución del ≈ 80 ms restante de FAIL 1 a JS/CSS más grandes es una hipótesis acotada por las cifras, no un aislamiento con un build alternativo.
- La emulación (CPU 4x, 9 Mbps, 150 ms) es de Chrome; no es un dispositivo real.
- Un proceso `chrome.exe` huérfano (de la propia medición, perfil `chrome-prof-inv-rep`) quedó escuchando en el puerto 9335 después del `taskkill /T` del lanzador y se paró por PID.
- Reproducible desde el scratchpad: `lcp-static.cjs`, `lcp-inv.cjs`, `lcp-inv-analyze.cjs`, `lcp-inv-{rep,exp,dev,devblock}.json`, `lcp-inv-stats-*.json`, `lcp-inv-tablas-*.md`, `lcp-inv-run-*.log`, `lcp-inv-npmci-*.log`, y las copias `lcp-build-{optional,preload3,nopreload}`.
