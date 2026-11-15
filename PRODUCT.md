# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Entrenadores y administradores de EXOM (roles ADMIN y SUPER_ADMIN; los clientes no entran al panel). Confirmado por el propietario: uso diario en escritorio para gestionar y planificar, y uso frecuente desde el móvil para revisar feedback, progreso y aprobaciones.

## Product Purpose
Panel de gestión del método EXOM: mantener el catálogo (ejercicios, entrenamientos, ingredientes, dietas), planificar asignaciones por cliente y día, revisar progreso, feedback multimedia y recaps semanales, y comunicar con los clientes de la app móvil.

## Operating Context
SPA React 19 + Vite 6 + Tailwind 4 + shadcn/Radix que consume exom-api. Los clientes usan la app Flutter. Las acciones sensibles de un ADMIN pasan por solicitudes de aprobación que resuelve un SUPER_ADMIN.

## Capabilities and Constraints
- Rutas: dashboard, clientes/usuarios y detalle, ejercicios, entrenamientos, badges, ingredientes, dietas, asignaciones, progreso, feedback, recaps y detalle, retos, logros, notificaciones, plantillas, solicitudes, login y onboarding.
- Filtros, orden, paginación y periodos viven en la URL. Hay guardia de cambios sin guardar, flujo de aprobaciones y subidas con checkpoint: no deben romperse.
- Tema oscuro y claro. Textos en español sin i18n. El histórico de datos del cliente se conserva siempre.

## Brand Commitments
Identidad de exommethod.com: negro verdoso #101111, crema #f2f1e9, lima #baf23a como único acento, Barlow 800 en mayúsculas para titulares, DM Sans para texto, esquinas rectas, filetes de 1px, la X en lima del wordmark y el símbolo de equilibrio. Voz cercana y directa en español de España.

## Evidence on Hand
Guía del sitio en exom-site/dist; auditorías de pantallas del panel (noviembre de 2026). No hay métricas de uso del panel: no inventarlas.

## Product Principles
1. Primero lo que requiere atención del entrenador.
2. Cada pantalla responde a su tarea, no a una plantilla.
3. El histórico del cliente es sagrado: confirmar antes de destruir.
4. Rápido para quien lo usa a diario: menos pasos, menos ruido.

## Accessibility & Inclusion
WCAG 2.1 AA en ambos temas, navegación completa por teclado, objetivos táctiles de 44px en móvil y respeto de prefers-reduced-motion. (Inferido del encargo del propietario.)
