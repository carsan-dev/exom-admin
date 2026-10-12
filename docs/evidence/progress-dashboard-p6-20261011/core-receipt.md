# P6 Dashboard — unidad funcional, 2026-10-11

Alcance: P6-01–04 y P5-04 diferido; fuentes canónicas compartidas, sin selector de tareas ni cálculos independientes de métricas.
Prerrequisitos observados: focal68/68 y navegador canónico12/12 PASS antes de activar Dashboard sin sección explícita.
Versión activada: `npm test -- --run` PASS443/443; `npm run lint` PASS0 errores/1 warning ajeno; `npm run build` PASS TypeScript/Vite; `git diff --check` PASS.
Navegador final: `node docs/evidence/progress-dashboard-p6-20261011/verify-browser.cjs --activated`, PASS13/13 flujos y ocho casos canónicos; verificador independiente: spotcheck70/70 PASS informado por coordinación.
Fixture generado por servicio/SQL API real PostgreSQL: SHA256 `474f667eda623200619fc7ef279bef0819d99ffabc46309221702a26fa3ff584`; transporte sintético no acredita JWT vivo.
Página activada SHA256 `3f7284f5b529a314e42af59a4ed0b6164017d4dc024479824484b94657a4b5a9`; filtros, Resumen/Racha, fallback Métricas y guard de borrador conservados.
Rollback: revertir conjuntamente los nueve archivos fuente/pruebas de esta unidad restaura la entrada anterior y presentación completa; no revertir API ni histórico P5.
Estado: REVIEW_REQUIRED; revisión nativa, CI y publicación pendientes. P2-05/P4-iOS siguen externos; no cierre global ni despliegue autorizado.
Detalles/prefijos preservados: [recibo completo del siguiente slice](README.md); fixture y harness se publican en unidades posteriores de la misma cadena.
