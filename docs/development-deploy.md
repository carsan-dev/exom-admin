# Desarrollo y deploy

CI instala con `npm ci`, ejecuta lint, todos los tests y `npm run build`. El build existente incluye `tsc -b` y Vite; no se añade otro script de typecheck. Ramas de desarrollo y PR prueban el SHA del evento. No existe workflow de release Admin; Vercel se configura fuera de GitHub Actions.

Vitest no carga archivos `.env`: fija valores Firebase sintéticos y un destino API `.invalid` exclusivos de tests. Permite importar el SDK real sin depender de claves locales o del hosting. Estos valores no habilitan autenticación real; los tests de sesión/API conservan sus mocks y adaptadores específicos. Las pruebas de autenticación externa necesitan un entorno aislado propio. `vite build` mantiene su configuración de despliegue y no utiliza los valores de Vitest. Referencia: [variables de tests en Vitest](https://vitest.dev/config/env).

Desarrollo utiliza `VITE_API_URL=http://localhost:3000` y Firebase de desarrollo. Staging/Preview requiere su propia API, Firebase y cuentas; producción usa los valores de Production del hosting. Vite incorpora estas variables públicas durante el build: no introducir secretos. Admin añade `/api/v1` a la URL base; no duplicarlo en VITE_API_URL.

`vercel.json` mantiene el rewrite Firebase productivo `exom-prod.firebaseapp.com`. No usar ese despliegue como entorno de pruebas aislado: un proyecto Preview separado debe configurar el rewrite `/__/auth` y el dominio autorizado del Firebase de staging. Cambiar solo VITE_API_URL no aísla autenticación. El aprovisionamiento y los ajustes remotos de hosting quedan fuera de esta edición local.

Antes de activar auto-deploy, exigir éxito de CI del mismo commit. Un verde de otra rama no habilita publicación. La configuración de build versionada ejecuta lint y tests antes de typecheck/Vite, también cuando el hosting construye directamente. No se ha ejecutado ningún deploy desde esta fase.

Las métricas usan día UTC tanto en formulario como en API; la etiqueta del formulario lo indica. La regresión de la ventana posterior a medianoche local usa un reloj fijo y conserva el contrato de fechas del servidor.
