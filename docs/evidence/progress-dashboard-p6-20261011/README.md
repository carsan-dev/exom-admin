# P6 Dashboard — checkpoint Admin, 2026-10-11

Estado: **REVIEW_REQUIRED**. Entrada sin sección explícita: **Dashboard**, activado únicamente después de focal68/68 y aceptación canónica previa12/12 PASS. Navegador final13/13 PASS sobre los bytes activados; revisión nativa, CI y entrega pendientes del padre. P6 no se declara DONE; P5 histórico permanece DONE.

## Versión y alcance

- Base Admin `develop`: `b2e6e27ffcb9e12a7ff10250562b4e563bd32947`; rama local `feat/dashboard-p6-20261011`, diff sin commit. Árbol inicial limpio. Snapshot final de archivos: `checkpoint.json`; no confundir HEAD con este resultado.
- P6-01–04 y P5-04 diferido. Solo Admin y seguimiento documental. Sin Flutter, API, dependencias nuevas, datos reales, Firebase, despliegues, migraciones ni operaciones remotas.
- Dashboard usa consultas existentes: métricas históricas para último peso/cambio canónico; rango inclusivo hoy−29/hoy para gráficos; adherencia global/días/recentClosed del servidor; semana UTC completa y nuevos campos canónicos de **días** de dieta, opcionales ante servidor anterior.
- Próximos pasos comparten `NextTaskSummary` con Seguimiento. No selección, ordenación ni fórmula de vencimiento de tareas en Dashboard. Las alertas de tareas muestran próximas acciones vencidas, con alcance explícito y enlace al listado completo; no afirman inventario exhaustivo.
- Alertas agrupadas: acciones canónicas vencidas, recaps SUBMITTED enviados de semanas cerradas, días canónicos partial/incomplete cerrados y baja adherencia únicamente por `recentClosed.status`. Hoy/futuro excluidos de alertas. Las fechas seleccionadas/filtros futuros no alteran el periodo Dashboard actual.
- Navegación conserva filtros y secciones previas, Resumen/Racha y guard de borrador. Dashboard disponible explícitamente, primer tab; filtros generales no duplicados sobre Dashboard.
- `MetricVisual.compact` es presentación optativa: mismo gráfico, escalas y tabla accesible; observaciones/procedencia y metodología bajo disclosure. El detalle normal sigue siendo predeterminado.

## Evidencias observadas

| Comprobación | Resultado y evidencia |
| --- | --- |
| RED Dashboard | 10/10 fallaron frente al scaffold sin comportamiento; primer intento sandbox EPERM sin tests no acredita RED. Ejecución local escalada posterior sí observó los diez fallos de requisitos. |
| GREEN inicial focal | PASS66/66, `focused-second.log`. |
| Focal final checkpoint | PASS73/73 en cuatro archivos, `focused-checkpoint-final.log`; incluye compact, periodo, no-pauta, servidor anterior, recuperación, paridad de presentación y aislamiento de cliente. |
| `npm run lint` | PASS0 errores, un warning en archivo `.local/progress-ux6.tsx` ajeno al cambio; final `lint-activated.log`. Primer FAIL por import propio no usado/caché generado fue corregido, `lint-first.log` preservado. |
| `npm run build` | PASS `tsc -b` + Vite, final `build-activated.log`. Primer error JSX corregido, `build-first.log` histórico. |
| `npm test -- --run` | Final PASS443/443,68 archivos (`full-tests-final.log`). Prefijos FAIL1/PASS438 (Dashboard disabled obsoleto) y FAIL1/PASS442 (nuevo test usaba click en vez de mouseDown de Radix) preservados. Contrato autorizado y cobertura URL/guard intactos; no excepción fabricada. |
| `git diff --check` | PASS sobre checkpoint. |
| Navegador | PASS12/12 final checkpoint, `browser-output/results.json`; Chrome instalado, Playwright existente, transporte sintético, AppLayout/ProgressPage/CSS reales. |
| Impeccable | Detector manual una vez, cinco targets UI: `[]`, exit0, `impeccable-detector.json`. Una inspección agrupada desktop/móvil claro/oscuro, un lote de correcciones y una confirmación agrupada; terminado el pulido. |
| Activación por defecto | PASS tras prerrequisitos; navegador final comprueba Dashboard sin sección, filtros conservados y sección desconocida hacia Métricas. Regresiones unitarias preservan acceso a Resumen. |
| P5-04 API común | PASS local consumidor de ocho salidas reales: vacío, empates, vencida/hoy/futura, estados cerrados, cambios y aislamiento. SHA256 `474f667eda623200619fc7ef279bef0819d99ffabc46309221702a26fa3ff584`. `functional-prerequisite.json` y `functional-final.json` registran procedencia y casos; no acreditan JWT vivo. Servicio/SQL real PostgreSQL12 y HTTP49 PASS separados en recibo API. |

Comandos focales reales: `npm test -- src/features/progress/components/progress-dashboard.test.tsx src/features/progress/follow-up-tasks/follow-up-panel.test.tsx src/features/progress/pages/progress-page.test.tsx`; checkpoint amplía con `src/features/progress/metrics-overview.test.tsx` por assertion obsoleta. Compact test inicial falló por ResizeObserver ausente en JSDOM, suplido únicamente en test, no en UI (`focused-final.log`).

## Navegador aislado y reproducción

1. Desde Admin: `npm exec -- vite --config docs/evidence/progress-dashboard-p6-20261011/vite.browser.config.ts`.
2. `node docs/evidence/progress-dashboard-p6-20261011/verify-browser.cjs --activated`.

Solo `127.0.0.1:5189`, HTTP/WS cercados antes de navegación, service workers bloqueados, `envDir:false`, aliases axios/auth sintéticos. Rutas desconocidas/mutaciones lanzan error sin fallback de red. Sin import Firebase ni credenciales. Fecha sintética UTC11/10/2026, IDs sintéticos y dominios example.invalid. Sandbox inicial rechazó red loopback; server y Chrome local escalados conservaron el mismo cercado.

Matriz final13: desktop/mobile × light/dark (4), nuevo/sin-pauta/loading/error+retry (4), ocho casos de paridad/cambios (1), guard borrador (1), respuestas retenidas/cambio cliente+generación (1), keyboard/zoom200% (1), entrada predeterminada/fallback (1). Prerrequisito12/12 anterior a activación. Prefijo visual consumidor12 preservado en `results.json` y capturas existentes; no prueba fixture final real. Revalidación final exclusivamente funcional, sin nuevas capturas ni pulido. Dos fallos previos del assertion del harness (región transitoria y codificación Windows) corregidos sin cambiar salidas canónicas ni UI.

## Pendientes y entrega

- API corrigió y validó dieta asignada vacía incluida en denominador pero nunca completada; no-pauta significa ausencia de asignación, no dieta vacía. Dashboard no lo recalcula. Perfiles aislados API finales PASS registrados por su escritor.
- Padre: revisión nativa, commits, CI y cadena autorizada `auto-chain / stacked-to-develop`; forecast900–1300 orientativo, sin excepción. Propuesta única: fuente/pruebas Admin379 líneas autoradas; harness/docs autorados 367, más fixture generado145 y recibos/DOM generados separados. Los gates pueden contar JSON y superar400: medir inventario íntegro y resolver límites antes de publicar; no comprimir código ni quitar pruebas. Rollback fuente restaura Resumen/default y vistas anteriores; rollback harness elimina solo aceptación sintética. El escritor no commit/push/PR/merge.
- P2-05 y P4/iOS siguen pendientes externos. No cierre global. Engram mirror PENDING: hook de host rechaza mutación por identidad no confirmada; no sesión inventada.
