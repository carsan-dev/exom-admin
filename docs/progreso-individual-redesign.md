# Progreso individual: lectura visual y límites

El rediseño permite consultar estado, tendencia relevante y cobertura de un cliente antes de abrir el detalle. Conserva las seis pantallas habilitadas, sus acciones y el significado de los datos; no incorpora paneles de cohortes ni cambios en API o App.

**Integración:** la entrega de código se organiza en una cadena de ramas de funcionalidad (`feature-branch-chain`), con base de integración `feat/admin-progress-visual-redesign`. Este documento llega inicialmente a esa base como entrega solo documental; los bloques de código y sus pruebas siguen después. No acredita código integrado en `develop`, fusionado ni desplegado.

## Qué puede consultar el usuario

| Pantalla | Lectura e interacciones conservadas |
| --- | --- |
| Resumen | Tarjetas de actividad semanal y racha; acceso a Racha, calendario mensual seleccionable, consulta de un día e «Ir a hoy». El detalle diario mantiene la información disponible sin saturar la primera vista. |
| Métricas | Observaciones por métrica, unidad y fecha; comparación neutral, historial paginado y acceso a registros corporales originales. El equivalente en la ficha del cliente comparte la presentación de métricas. |
| Fotos | Comparación de sesiones con selección y navegación, vistas ausentes explícitas y recuperación de errores de imagen. Una sesión o una sesión parcial sigue siendo consultable; las fotos no producen análisis corporal. |
| Entrenamiento | Resumen de actividad y carga, selección de ejercicio y evolución por unidad; detalle progresivo de días, sesiones y series. No se inventa una tendencia global entre ejercicios incompatibles. |
| Adherencia | Veredicto de siete días cerrados, agregado del periodo explorado, evolución y calendario con selección diaria; pasos y detalle semanal desplegables. La configuración existente queda en segundo plano, con sus permisos y validaciones. Es el componente canónico de la ficha del cliente. |
| Racha | Contadores registrados e historial legible; acceso a la actividad diaria en Resumen. La tarjeta canónica de la ficha del cliente mantiene el mismo significado. |

La cabecera y el contexto se despliegan progresivamente para dejar visibles los datos en móvil. Dashboard y Seguimiento siguen deshabilitados. Se conservan filtros, estado de URL, navegación, acciones existentes y aislamiento entre clientes y fechas; consultar no añade escrituras.

## Periodos y significado de los datos

- Todas las fechas civiles y cierres se explican en **UTC**; no se desplazan por la zona horaria del navegador.
- El selector general ofrece desde inicio, cuatro semanas, tres meses y rango personalizado para **Métricas y Entrenamiento**, no para todas las pantallas. Valida orden y límite de hoy.
- En Entrenamiento, «Desde inicio» recorre ventanas consecutivas de hasta 366 días inclusivos mediante anterior/posterior. Resumen usa la semana del día seleccionado; Fotos y Adherencia tienen consultas propias; Racha muestra contadores registrados.
- **`null` no es cero.** Ausencia, insuficiencia, no aplicable, sin asignación, provisional y futuro conservan etiquetas distintas. Carga, vacío, error y reintento no se sustituyen por gráficas de ceros.
- La baja adherencia es el **veredicto del servidor sobre siete días cerrados**: puede preceder al periodo explorado y excluye hoy provisional y futuro. No se reconstruye desde el calendario, el agregado elegido ni la configuración actual; el estado de un día no equivale a ese veredicto.
- Los porcentajes explican numerador, denominador y cobertura evaluable. La pauta original y las versiones históricas permanecen diferenciadas de la configuración vigente.
- Los pasos son **observaciones semanales del recap**, no una serie diaria inventada; la comparación usa la semana completa y no modifica el porcentaje global de adherencia.
- Las gráficas de puntos representan **observaciones reales**, no interpolaciones ni muestras sintéticas. Una sola observación no demuestra tendencia; kg, repeticiones y segundos no comparten un eje engañoso.
- La dirección del peso es **neutral**: subir o bajar no se presenta por sí mismo como bueno o malo. Las fotos permiten comparación visual, no diagnóstico ni inferencias sobre el cuerpo.
- Hay alternativas textuales o tabulares, etiquetas de estado además del color, controles de teclado, foco visible y contraste en temas claro/oscuro. Las transiciones son no esenciales y respetan `prefers-reduced-motion`.

## Unidades de código y pruebas

Rutas relativas a `src/features/`: `P` = `progress/components/`, `C` = `clients/components/`. Los nombres de la tabla incluyen la extensión; no son unidades de seguimiento.

| Intención | Fuentes | Pruebas |
| --- | --- | --- |
| Contexto y navegación | `progress/pages/progress-page.tsx`; `clients/pages/client-detail-page.tsx`; `C/client-header.tsx` | `progress/pages/progress-page.test.tsx`; `clients/pages/client-detail-page.test.tsx`; `C/client-header.test.tsx` |
| Resumen y detalle diario | `P/progress-overview-cards.tsx`; `P/progress-calendar.tsx`; `P/day-progress-detail.tsx` | `P/progress-overview-cards.test.tsx`; `P/progress-calendar.test.tsx`; `P/day-progress-detail.test.tsx` |
| Adherencia canónica y evolución | `C/client-adherence-tab.tsx`; `P/adherence-evolution.tsx` | `C/client-adherence-tab.test.tsx` |
| Racha y equivalente de cliente | `P/streak-section.tsx`; `C/client-streak-card.tsx` | `P/streak-section.test.tsx`; `P/progress-overview-cards.test.tsx`; `clients/pages/client-detail-page.test.tsx` |
| Métricas comparables e historial | `P/metric-visual.tsx`; `P/metrics-overview.tsx`; `P/metrics-table.tsx`; `C/client-metrics-tab.tsx` | `P/metric-visual.test.tsx`; `P/metrics-overview.test.tsx`; `P/metrics-table.test.tsx`; `C/client-metrics-tab.test.tsx`; `progress/metrics-overview.test.tsx` |
| Entrenamiento por ejercicio y sesión | `P/training-progress-panel.tsx`; `P/training-load-evolution.tsx`; `P/training-exercise-table.tsx`; `P/training-session-detail.tsx` | `P/training-visual-redesign.test.tsx`; `P/training-progress-panel.test.tsx`; `P/training-load-evolution.test.tsx`; `P/training-progress-ux.test.tsx`; `progress/training-window.test.ts` |
| Comparación fotográfica | `P/progress-photos-panel.tsx`; `P/progress-photos-workspace.tsx`; `P/progress-photos-image.tsx` | `P/progress-photos-panel.test.tsx` |

## Evidencia local y reproducción

La verificación final registrada el **2026-10-04** corresponde al **candidato local completo**, no a esta entrega inicial solo documental:

- **317/317 pruebas en 58 archivos**; lint, build (`tsc -b` + Vite) y comprobación de diff correctos.
- **340 comprobaciones sintéticas en Chrome, sin fallos; 228 capturas, nueve rutas y ambos temas**, con cobertura de teclado y movimiento reducido. Incluye el shell real y la ruta real de ficha del cliente; no acredita dispositivos físicos, Safari, Firefox ni escrituras reales.
- No se detectaron errores de página, peticiones externas/desconocidas de API ni mutaciones en ese entorno aislado. No es evidencia de despliegue ni de CI de las futuras entregas.

Para reproducir sobre el candidato con código: desde `exom-admin`, ejecutar `npm test -- --run`, `npm run lint`, `npm run build` y `git diff --check`. La reproducción visual requiere el montaje local aislado y las fixtures sintéticas del arnés preservado en la raíz de coordinación: [`docs/evidence/admin-progress-visual-redesign-20261004/browser-harness`](../../docs/evidence/admin-progress-visual-redesign-20261004/browser-harness/), con entrada `progress-ux6.tsx` y comprobador `progress-ux6-check.cjs`.

Ese arnés utilizó un runtime histórico de Playwright ya disponible, **sin instalación**; no constituye una dependencia o un runner incorporado al repositorio. Consultar el montaje preservado antes de ejecutarlo, sin credenciales reales ni servicios externos. El registro fechado y los límites de la verificación están en la [tarea de coordinación](../../odd/tasks/admin-progress-visual-redesign.md); este documento explica el comportamiento, no duplica su checklist.
