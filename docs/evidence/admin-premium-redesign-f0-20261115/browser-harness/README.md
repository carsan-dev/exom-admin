# Arnés sintético de capturas de exom-admin (RDS-F0-U5, decisión D12)

Sirve para fotografiar el estado ACTUAL de la UI antes del rediseño, sin base de datos, sin Firebase y sin red. Reutiliza el enfoque de `docs/evidence/progreso-modo-completado-20261012/browser-harness/` y lo amplía a todas las rutas y a los dos roles. No toca nada de `src/`, `index.html`, `package.json`, lockfile ni configs: es evidencia, no producto.

## Qué es

- La app real (`src/App.tsx`: router, `AppLayout`, todas las páginas y estilos) se monta desde `main.tsx` del arnés.
- Tres sustituciones por alias de Vite (`vite.browser.config.ts`):
  - `@/lib/api` -> `fixture-api.ts`: adaptador de axios sin red. Responde lecturas desde los `fx-*.ts`, las mutaciones (POST/PUT/PATCH/DELETE) devuelven éxito genérico sin cambiar estado y cualquier ruta desconocida da 404 y deja `[fixture-api] 404 <método> <url>` en la consola.
  - `@/hooks/use-auth` -> `fixture-auth.ts`: sesión falsa con perfil (no redirige a onboarding) y dos roles.
  - `@/lib/firebase` -> `fixture-firebase.ts`: stub sin `initializeApp`.
- `envDir: false`: no se lee ningún `.env`. Servidor en `127.0.0.1:5192` con `strictPort`.
- Reloj fijo (`boot.ts`): "hoy" = domingo 2026-11-15 10:00 UTC; el tiempo sigue avanzando desde ahí.
- Datos 100 % inventados (`@example.com`); imágenes y vídeos son SVG como data URI, nunca una URL remota.

## Cómo arrancarlo

Desde la raíz del worktree (necesita `node_modules`; no instala nada):

```
npm exec -- vite --config docs/evidence/admin-premium-redesign-f0-20261115/browser-harness/vite.browser.config.ts
```

Banderas por query, leídas en el arranque y conservadas en `sessionStorage` (la SPA reescribe la query al navegar):

| Bandera | Valores | Por defecto |
| --- | --- | --- |
| `__role` | `ADMIN` (Mateo Ríos), `SUPER_ADMIN` (Lucía Marín) | `SUPER_ADMIN` |
| `__theme` | `dark`, `light` (escribe `localStorage['exom-admin-theme']`) | el que haya / `dark` |
| `__auth` | `none` (sin sesión, para `/login`), `noprofile` (sin perfil, para `/onboarding`) | sesión con perfil |

Ejemplo: `http://127.0.0.1:5192/clients?__role=ADMIN&__theme=light`. Los ids de datos con contenido: cliente protagonista `c11e0000-0000-4000-8000-000000000001` y recap `7ec00000-0000-4000-8000-000000000001`.

## Cómo capturar

Con el servidor arrancado, un proceso de Chrome cada vez (nunca en paralelo):

```
node docs/evidence/admin-premium-redesign-f0-20261115/browser-harness/capture.cjs [--only <regex>] [--list] [--log <fichero>]
```

- `--list` imprime la matriz sin capturar; `--only` filtra por nombre de fichero; `--log` guarda las líneas de consola (por ejemplo los 404 de fixture).
- Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe` (`--chrome` para cambiarlo), `--headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=8000`.
- Salida: `docs/evidence/admin-premium-redesign-f0-20261115/capturas-base/<ruta>-<rol>-<tema>-<ancho>.png` (`<ancho>` es `1440`, `1440x2400` o `390`).
- Matriz: toda ruta como SUPER_ADMIN, oscuro, 1440x900; las rutas largas también a 1440x2400; toda ruta en claro (1440); las rutas dependientes del rol (clientes, detalle de cliente, solicitudes, plantillas, logros) también como ADMIN; y a 390 (oscuro) dashboard, clientes, detalle de cliente, progreso (dashboard), feedback, recaps, detalle de recap, asignaciones (semana) y solicitudes.
- Móvil (390): Chrome headless en Windows no baja de unos 500 px de ancho. Las capturas `-390` cargan la app en un iframe de 390 px dentro de `wrapper.html` y lo escalan a la ventana de 500 px, así que el layout y las media queries son de 390 px y la imagen es 500 px de ancho (escala 1,28). No es una captura nativa a 390 px.

## Qué se simula

- API: todas las lecturas de las pantallas, con paginación y los parámetros de filtro que envían las páginas (búsqueda, nivel, estado, archivo, grupo, etc.). Mutaciones: éxito genérico sin efecto (cerrar un diálogo no cambia lo que se ve detrás).
- Sesión: usuario fijo por rol, sin tokens, sin `onAuthStateChanged`, sin validación contra el backend.
- Reloj: fecha fija de "hoy".

## Qué NO demuestra

- Comportamiento real de la API (contratos reales, errores, latencias, datos vacíos o enormes, permisos por rol en backend).
- Autenticación real, caducidad de sesión, bloqueo de cuentas, flujos de login/Google/olvido de contraseña (solo se ve la pantalla de login).
- Subidas, vídeo real, notificaciones push y cualquier servicio externo.
- Estados de error, carga prolongada, vacío o formularios con errores: solo se captura el estado poblado.
- Que no haya diferencias de render con el navegador real del usuario (fuentes, escala del sistema, zona horaria de la máquina).
- El móvil a 390 px es un iframe escalado, no un dispositivo.

## Rutas capturadas

Ver la lista completa con `--list`. Rutas: `/login`, `/onboarding`, `/dashboard`, `/clients` (ADMIN), `/users` (+ `?tab=admins`, `?tab=super-admins`), detalle de cliente con `?tab=info|metrics|streak|adherence` (como `/users/<id>` en SUPER_ADMIN y `/clients/<id>` en ADMIN), `/exercises`, `/trainings`, `/badges`, `/ingredients`, `/diets`, `/assignments` (semana 16-22 nov y mes), `/progress?section=dashboard|resumen|metricas|fotos|entrenamiento|adherencia|racha|seguimiento`, `/feedback`, `/recaps`, `/recaps/<id>`, `/challenges`, `/achievements`, `/notifications`, `/notification-templates`, `/approval-requests`.

Huecos: ver la sección de resultado al final (se rellena tras la última ejecución).

## Ficheros

- `vite.browser.config.ts`, `index.html`, `main.tsx`, `fixture.css`: montaje.
- `boot.ts`: reloj fijo y banderas. `fixture-auth.ts`, `fixture-firebase.ts`, `fixture-api.ts`: sustituciones.
- `fx-util.ts`: utilidades; `fx-people.ts`, `fx-catalog.ts`, `fx-assignments.ts`, `fx-progress.ts`, `fx-feedback-recaps.ts`, `fx-engagement.ts`: datos por dominio.
- `capture.cjs`, `wrapper.html`: captura.

## Resultado de la última ejecución (2026-11-15)

- 120 capturas PNG (13 MB) en `../capturas-base/`, 0 fallos de Chrome y 0 líneas `[fixture-api] 404` en la consola de todas las capturas. Cada ruta de la lista se ha revisado visualmente al menos una vez: todas muestran la UI real poblada (sin pantalla en blanco, redirección a login ni tarjeta de error).
- Rutas sin capturar: ninguna.
- Limitaciones que conviene conocer al comparar:
  - `/notification-templates` como ADMIN muestra la tarjeta "No tienes permisos para modificar plantillas": es el estado real actual para ese rol, no un fallo del fixture.
  - `/approval-requests` abre en la pestaña "Pendientes"; las solicitudes aprobadas, rechazadas y fallidas existen en el fixture pero no se capturan (haría falta interactuar con la página).
  - No se capturan diálogos, menús ni estados de formulario; solo la página tal como carga.
  - La primera visita tras reiniciar el servidor puede fallar un `import()` dinámico mientras Vite optimiza dependencias; si una captura sale con la tarjeta de error del router, repetirla con `--only`.
  - En tema claro el sidebar tiene poco contraste: es el estado actual de la app y queda registrado tal cual.
