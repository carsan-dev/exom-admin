# Evidencias F4 lote F — Acceso y plantillas (rediseño premium de exom-admin)

Estado: REVIEW_REQUIRED. Implementado y validado en local (HEAD de código `08ad124`). Revisión independiente recibida (ACCEPT WITH FOLLOW-UPS); resultado en sección 4. Pendiente: push del propietario (D18), PR a `develop`, CI remoto en verde, merge y revisión de las capturas por el propietario.

Plan: `EXOM/docs/plans/admin-premium-redesign.md` (sección 4, F4, lote F). Fecha: 2026-11-16. Autorización: D17 (lotes B–F y F5 con commits locales, PR a `develop` y merge con CI en verde; los push los hace el propietario). Propuestas: P9 y P10 (Plantillas), P16 (Login y Onboarding).

Rama: `feat/admin-rediseno-f4f-acceso-plantillas`, creada con `--no-track` desde `origin/develop` `23a6caf` (merge de la PR #62, lote E). Worktree: `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`. HEAD de código: `08ad124`. `main` (`312afef`) sin tocar. Entorno (no secreto): Windows 11, arnés sintético sin red (`docs/evidence/admin-premium-redesign-f0-20261115/browser-harness`, con cambios en 4 ficheros, ver sección 6), Chrome headless por CDP. Nada está subido.

## 1. Commits (locales, sin publicar)

| SHA | Asunto | Unidad |
| --- | --- | --- |
| `8979add` | test de caracterización del Onboarding (7 tests) | RDS-F4-F2 |
| `6f4a7ba` | estilo del Onboarding | RDS-F4-F2 |
| `c208b55` | test de caracterización de Plantillas de notificación (21 tests) | RDS-F4-F3 |
| `652087c` | P16: «Cerrar sesión» en el Onboarding con el `logout` existente de `use-auth`, deshabilitado mientras se envía, y regresión (3 tests) | RDS-F4-F2, P16 |
| `13e4eea` | test de caracterización del Login (15 tests) | RDS-F4-F1 |
| `e8a8947` | estilo del Login | RDS-F4-F1 |
| `15eccfd` | extracción de los componentes de vista de Plantillas sin cambio visual (página de 1110 a 327 líneas) | RDS-F4-F3 |
| `bd7f3e7` | P16: retirar el botón de Apple del Login y regresión (3 tests) | RDS-F4-F1, P16 |
| `a37bc06` | estilo de Plantillas de notificación | RDS-F4-F3 |
| `390cd15` | P9: vista previa tipo push y contadores n/120 y n/500 en Plantillas, y regresión (5 tests) | RDS-F4-F3, P9 |
| `91ee783` | P10: un solo «Guardar cambios» para texto y horario, y regresión (15 tests) | RDS-F4-F3, P10 |
| `08ad124` | correcciones de la revisión independiente y de las capturas | F-1, F-2, F-6, V-1 a V-7 |
| (pendiente) | capturas, cambios del arnés y evidencias del lote F de F4 | `capturas-f4f/`, arnés y este README |

## 2. Tabla de evidencias

| Criterio | Repo | SHA | Comando | Resultado | Fecha | Referencia |
| --- | --- | --- | --- | --- | --- | --- |
| RDS-F4-01 capturas frente al boceto | exom-admin | `08ad124` | arnés sintético, Chrome headless por CDP: 1440x900 y 390 nativo (emulación móvil, `deviceScaleFactor` 2), oscuro y claro | PASS con divergencias anotadas: 51 PNG en `capturas-f4f/` (Login 13, Onboarding 8, Plantillas 30). `scrollWidth === innerWidth` en 51 de 51; 0 líneas `[fixture-api] 404`; 0 errores de consola salvo el aviso de Chrome «Blocked beforeunload confirmation» en 8 capturas de Plantillas (navegación del arnés con un formulario sucio, no es un error de la aplicación) | 2026-11-16 | `capturas-f4f/`, secciones 3 y 5 |
| Botón de Apple retirado (P16) | exom-admin | `08ad124` | inspección del DOM en el arnés a 1440 y 390 | PASS: sin botón de Apple en el DOM | 2026-11-16 | `login-default-*` |
| Foco visible con teclado | exom-admin | `08ad124` | Tab real por CDP | PASS: anillo visible en el Login (enlace de salto, correo, contraseña, interruptor, «¿Olvidaste tu contraseña?», envío, Google), en el Onboarding y en las filas de plantillas | 2026-11-16 | `login-password-toggle-focus-dark-1440`, `onboarding-logout-focus-dark-1440`, `plantillas-row-focus-*` |
| Objetivos táctiles a 390 | exom-admin | `08ad124` | `getBoundingClientRect` | PASS salvo dos elementos: ≥ 44 px en el envío del Login, Google, enlace de restablecer, interruptor de contraseña (44; eran 42, corregido), envío y «Cerrar sesión» del Onboarding, filas de plantillas, guardar, restaurar y eliminar, nueva plantilla, filtros y casillas. Quedan < 44 px: campo de búsqueda de plantillas 40 px (`FilterToolbar` compartido sin prop de clase): RDS-F4-F-TOUCH-01, abierto, bajo; botón de cierre del diálogo de creación 36 px (`src/components/ui`): RDS-F4-F-TOUCH-02, abierto, bajo | 2026-11-16 | sección 6 |
| Barra de guardado y diálogo de creación a 390 | exom-admin | `08ad124` | `getBoundingClientRect` en capturas de viewport | PASS: barra de guardado 598,5–711,5 sobre la barra inferior (arriba en 788), ambos botones visibles, sin cruce con el botón de volver arriba; diálogo de creación 16–828 de 844 con el pie dentro del viewport y el cuerpo interior con scroll | 2026-11-16 | `plantillas-savebar-viewport-*`, `plantillas-create-dialog-light-390` |
| Panel de marca idéntico en Login y Onboarding | exom-admin | `08ad124` | geometría en el arnés a 1440; colores calculados en tema claro | PASS: misma geometría; fondo `rgb(9,10,9)` y filetes `rgb(186,242,58)` en tema claro | 2026-11-16 | `login-default-*`, `onboarding-default-*` |
| Humo funcional en el navegador (P10) | exom-admin | `08ad124` | peticiones leídas de `window.__fixtureCalls` del arnés (sin red real) | PASS: solo título, 1 PATCH `/notifications/templates/manual_bienvenida`; solo hora, 1 PATCH `.../recap_reminder/schedule`; ambos, 2 PATCH; formulario limpio, guardar deshabilitado; editar y pulsar otra fila abre «Hay cambios sin guardar» [Permanecer, Salir sin guardar]; «Permanecer» conserva valor y selección; «Salir sin guardar» cambia con 0 PATCH. Límite: el fixture no persiste mutaciones, por lo que tras guardar el campo vuelve a mostrar el valor anterior del servidor; con la API real el refetch devuelve el valor guardado (no verificado contra una API real) | 2026-11-16 | sección 3 |
| Reglas D7 | exom-admin | `91ee783` | `git diff --stat 23a6caf HEAD -- 'src/features/*/api.ts' 'src/features/*/schemas.ts' 'src/features/*/types.ts' src/lib src/hooks src/components/ui src/index.css src/App.tsx package.json package-lock.json` | PASS: salida vacía. Fuera de las rutas D7 y de las tres pantallas solo cambian dos componentes compartidos de notificaciones (props opcionales). Sin dependencias nuevas | 2026-11-16 | sección 3 |
| Tests existentes no debilitados | exom-admin | `91ee783` | `git diff --name-status 23a6caf HEAD -- '*.test.ts' '*.test.tsx' '*.snap'` | PASS: 7 ficheros de test añadidos, ninguno preexistente modificado; `notification-templates-page.confirm.test.tsx` idéntico byte a byte a `23a6caf`. El test de caracterización de este lote se ajustó en 4 tests que fijaban el contrato de dos botones (sección 3) | 2026-11-16 | sección 3 |
| Primera ronda de checks | exom-admin | `91ee783` | `npm run lint`; `npm test -- --run` x2; `npm run build`; `git diff --check`; D7 | lint PASS (0 problemas); suite completa PASS x2 (167 ficheros / 1496 tests; base antes del lote: 160 / 1427); build PASS (0 `error TS`); `diff --check` limpio; D7 vacío | 2026-11-16 | logs fuera del repo |
| Revisión independiente del lote F | exom-admin | `91ee783` | revisión de `23a6caf..91ee783` (Opus, esfuerzo alto) | ACCEPT WITH FOLLOW-UPS: 0 bloqueantes, 0 altos, R1–R9 PASS; hallazgos F-1 a F-9 en sección 4 | 2026-11-16 | sección 4 |
| Checks finales en `08ad124` | exom-admin | `08ad124` | `npm run lint`; `npm test -- --run` (dos ejecuciones seguidas); `npm run build`; `git -c core.whitespace=cr-at-eol diff --check 23a6caf HEAD`; D7 | lint PASS (exit 0, 0 problemas); tests PASS las dos ejecuciones (167 ficheros / 1497 tests); build PASS (exit 0, 0 `error TS`); diff limpio (rango y árbol de trabajo); D7 salida vacía. `git diff --shortstat 23a6caf HEAD`: 23 ficheros, 3007 inserciones, 1055 eliminaciones, 12 commits; 7 ficheros de test añadidos, ninguno previo modificado; `src/features/notifications`: 2 ficheros, +16 −5 | 2026-11-16 | logs fuera del repo (`f4f-final-*.log`) |
| CI remoto | exom-admin | — | — | NOT_RUN (nada subido) | 2026-11-16 | sección 8 |
| Dispositivo real, lectores de pantalla, Safari y Firefox | exom-admin | — | — | NOT_RUN | 2026-11-16 | sección 7 |

## 3. Notas por unidad

- F2 Onboarding (`8979add`, `6f4a7ba`, `652087c`): primero caracterización (7 tests), después estilo. P16: «Cerrar sesión» llama al `logout` existente de `use-auth`, queda deshabilitado mientras se envía el formulario y tiene regresión (3 tests). `handleSubmit` sin cambios (`PUT /profile/me` con valores recortados y redirección a `/dashboard`).
- F3 Plantillas, caracterización y extracción (`c208b55`, `15eccfd`): 21 tests de caracterización y extracción de los componentes de vista sin cambio visual (página de 1110 a 327 líneas). Verificado como movimiento puro con `git diff --color-moved`; los hooks y los efectos conservan propietario y orden.
- F1 Login (`13e4eea`, `e8a8947`, `bd7f3e7`): 15 tests de caracterización (correo y contraseña, Google, restablecer contraseña, 423 `ACCOUNT_BLOCKED`, 429, credenciales inválidas, redirección). Estilo con las líneas de lógica anteriores al JSX sin cambios salvo las importaciones. P16: botón de Apple retirado (no tenía manejador; `use-auth` sin tocar) con regresión (3 tests).
- F3 Plantillas, estilo (`a37bc06`): cuadrícula maestro-detalle, filas con `aria-current`, secciones como `h3`, barra de guardado fija.
- P9 (`390cd15`): vista previa tipo push y contadores n/120 y n/500 reutilizando `PushPreview` y `CharCounter` de `src/features/notifications/components`, que ganan props OPCIONALES (`titleFallback`, `bodyFallback`, `unit`) con valores por defecto iguales al comportamiento anterior (Notificaciones sin cambios; sus tests pasan sin modificar). Regresión: 5 tests.
- P10 (`91ee783`): un solo «Guardar cambios» para texto y horario. La página es propietaria de ambos borradores como entradas `{key, draft}`; sin entrada, el borrador se deriva del valor del servidor, de modo que un refetch no sobrescribe ediciones. Solo se envían las partes sucias, cada una una vez por pulsación (ref de vuelo y estado pendiente); cada parte se valida antes de cualquier petición. Ante un fallo parcial solo se conservan las ediciones de la parte fallida y cada resultado tiene su propio aviso. Las ediciones solo se limpian si la entrada sigue siendo la enviada (una respuesta tardía no toca otra plantilla). Cambiar de plantilla o crear una con ediciones sucias pide confirmación; una plantilla sucia oculta por búsqueda o filtros sigue seleccionada; restaurar limpia solo las ediciones de texto; eliminar limpia todas. `mutateAsync` espera a la invalidación y al refetch, por lo que no hay parpadeo del valor anterior. Regresión: 15 tests (16 tras `08ad124`).
- Ajuste del test de caracterización en `91ee783`: 4 tests que fijaban el contrato de dos botones pasan de «botón «Guardar horario» ausente o deshabilitado» a «único «Guardar cambios»», conservando la cobertura de payload, validación, estado pendiente y error.
- Decisión D20 (plan): el botón único llama solo al endpoint de la parte modificada; no se envía un PATCH sin cambios. Interpreta RDS-F4-14. Revisable por el propietario.
- `08ad124`: correcciones de la revisión (F-1, F-2, F-6) y de las capturas (V-1 a V-7).
- URL y parámetros sin cambios; sin dependencias nuevas.
- Cambios de marcado intencionados: Login y Onboarding sin `Card`, `h1` en `font-display`, aviso de error con `role=alert`, enlace de salto en el Login, interruptor de contraseña con nombre accesible; Plantillas como cuadrícula maestro-detalle, título de la lista como `h2` solo para lectores, filas con `aria-current`, etiquetas de sección como `h3`, barra de guardado fija.
- Capturas (51 PNG en `capturas-f4f/`; nombres `<pantalla>-<estado>-{dark,light}-{1440,390}.png`):
  - Login (13): `login-default-{dark,light}-{1440,390}` (4); `login-error-invalid-credentials-{dark,light}-{1440,390}` (4); `login-validation-dark-1440`, `login-validation-light-390`; `login-blocked-423-dark-1440`, `login-blocked-423-light-390`; `login-password-toggle-focus-dark-1440`.
  - Onboarding (8): `onboarding-default-{dark,light}-{1440,390}` (4); `onboarding-error-submit-dark-1440`, `onboarding-error-submit-light-390`; `onboarding-validation-empty-dark-1440`; `onboarding-logout-focus-dark-1440`.
  - Plantillas, lista y editor (12): `plantillas-list-editor-manual-{dark,light}-{1440,390}` (4); `plantillas-list-editor-manual-viewport-top-{dark,light}-390` (2); `plantillas-scheduled-editor-{dark,light}-{1440,390}` (4); `plantillas-scheduled-editor-tall-dark-1440`; `plantillas-scheduled-meal-editor-light-390`.
  - Plantillas, edición y guardado (12): `plantillas-edited-preview-counters-{dark,light}-{1440,390}` (4); `plantillas-edited-viewport-title-{dark,light}-390` (2); `plantillas-edited-viewport-bottom-{dark,light}-390` (2); `plantillas-savebar-viewport-{dark,light}-390` (2); `plantillas-row-focus-{dark,light}-1440` (2).
  - Plantillas, diálogos y permisos (6): `plantillas-create-dialog-dark-1440`, `plantillas-create-dialog-light-390`; `plantillas-discard-confirm-dark-1440`, `plantillas-discard-confirm-light-390`; `plantillas-admin-permissions-dark-1440`, `plantillas-admin-permissions-light-390`.
- Artefacto de captura: las capturas de altura completa a 390 dibujan la barra de navegación inferior fija y la barra de guardado fija a mitad de página.
- Higiene de procesos: el Vite del arnés y Chrome se pararon por PID tras cada ronda de capturas.

## 4. Revisión independiente

Veredicto: ACCEPT WITH FOLLOW-UPS (`23a6caf..91ee783`, revisor en Opus, esfuerzo alto). 0 bloqueantes, 0 altos, R1–R9 PASS.

| ID | Hallazgo | Resultado |
| --- | --- | --- |
| F-1 | Panel de marca duplicado y desviado entre Login y Onboarding (color literal, sin símbolo, sin enlace de salto, `aria-hidden` en todo el panel). | Corregido en `08ad124`: componente compartido `src/features/auth/components/auth-brand-panel.tsx`, panel oscuro fijo en ambos temas como el boceto, colores literales solo ahí y lima por el token `brand-primary`. |
| F-2 | El test de doble envío no ejercitaba la protección de petición en vuelo. | Corregido en `08ad124`: caso nuevo con dos envíos síncronos; verificado que falla al quitar la protección. |
| F-3 | Guardar una plantilla sucia oculta por filtros mueve la selección a la primera visible (baja). | Anotado, sin cambio. |
| F-4 | Una plantilla sucia eliminada en el servidor descarta las ediciones sin aviso (baja). | Anotado, sin cambio. |
| F-5 | Una entrada de edición revertida al valor del servidor oculta cambios posteriores del servidor hasta limpiarla (baja). | Anotado, sin cambio. |
| F-6 | Interruptor de contraseña con etiqueta dinámica y `aria-pressed` a la vez. | Corregido en `08ad124`: se quita `aria-pressed` y se conserva la etiqueta dinámica. |
| F-7 | Los lectores de pantalla oyen «caracteres» dos veces en el contador del cuerpo (baja). | Anotado, sin cambio. |
| F-8 | Huecos de test: «Cerrar sesión» deshabilitado al enviar y crear con el editor sucio (baja). | Anotado, sin cambio. |
| F-9 | Cerrar sesión con el formulario de Onboarding sucio no pide confirmación (igual que el cierre de sesión de la cabecera). | Aceptado. |

### Defectos de capturas

| ID | Resultado |
| --- | --- |
| V-1 | Barra de guardado bajo la barra de navegación móvil: corregido. |
| V-2 | Botón de volver arriba sobre «Guardar cambios»: corregido (margen reservado). |
| V-3 | Diálogo de creación más alto que el viewport a 390: corregido. |
| V-4 | Confirmación de descarte con solo título y «Aceptar» principal: corregido con el texto del boceto (título «Hay cambios sin guardar», descripción, «Permanecer» y «Salir sin guardar» destructivo) con opciones existentes de `useConfirmDialog`. |
| V-5 | Aviso de ADMIN sin forma: corregido (icono, descripción y enlace «Ir a Notificaciones» a `/notifications`). |
| V-6 | Etiqueta de entrega duplicada («Programada Programada»), previa al rediseño: se oculta visualmente cuando coincide con la etiqueta del tipo; el texto se conserva para tecnologías de apoyo. |
| V-7 | Panel del Onboarding sin logotipo: corregido con el panel compartido (F-1). |

## 5. Divergencias respecto al boceto (prevalece el código, S2)

- Login conserva el radio de `Input` y `Button` compartidos.
- La frase «Panel de administración EXOM» aparece una sola vez.
- Plantillas sin editor como hoja bajo 1100 px (disposición apilada); los filtros siguen siendo el popover compartido; sin botones de insertar variable ni bloque de detalles «tech» (propuestas fuera de P9 y P10).
- La vista previa conserva los respaldos «Sin título» y «Sin cuerpo» y la línea «Sin ruta».

## 6. Cambios del arnés (sin commit hasta el commit de evidencias)

En `docs/evidence/admin-premium-redesign-f0-20261115/browser-harness/`:

- `boot.ts`: indicadores `__authError=blocked|invalid` y `__fail=profile`.
- `fixture-auth.ts`: `blocked` fija `ACCOUNT_BLOCKED` al iniciar; `invalid` hace que el inicio de sesión fije «Credenciales inválidas».
- `fixture-api.ts`: `PUT /profile/me` devuelve 500 con `__fail=profile`; expone `window.__fixtureCalls`.
- `fx-engagement.ts`: las rutas de plantilla empiezan ahora por «/» (el validador real rechazaba los valores anteriores).

## 7. Abiertos para el propietario

- Divergencias de la sección 5 y cambios de marcado de la sección 3.
- RDS-F4-F-TOUCH-01 (abierto, bajo): campo de búsqueda de plantillas a 40 px en 390 (`FilterToolbar` compartido sin prop de clase).
- RDS-F4-F-TOUCH-02 (abierto, bajo): botón de cierre del diálogo de creación a 36 px (`src/components/ui`).
- Hallazgos anotados: F-3, F-4, F-5, F-7 y F-8; F-9 aceptado.
- D20: el botón único envía solo la parte modificada (revisable).
- Revisión de las capturas por el propietario.

## 8. No verificado

Dispositivo real; lectores de pantalla; Safari y Firefox; API real y autenticación real de Firebase (el arnés acredita aspecto y forma de las peticiones, no comportamiento); CI remoto (NOT_RUN, nada subido). Checks finales en `08ad124`: pendientes de registrar (fila «Checks finales en `08ad124`»).

## 9. Subida pendiente

- Decisiones del propietario: D17 y D18 (ver plan). Nada está subido; el push lo hace el propietario.
- Estado: implementado y validado en local, HEAD de código `08ad124`; REVIEW_REQUIRED. Push pendiente del propietario (D18): `git push -u origin feat/admin-rediseno-f4f-acceso-plantillas`. Después: PR a `develop`, CI remoto en verde y merge (D17); revisión de capturas por el propietario.
- Siguiente: F4-bis exige el boceto del buscador aprobado por el propietario antes de cualquier código; F5 después (D17).
