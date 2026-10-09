# Compatibilidad del payload publicado — Admin

Fecha: 2026-10-09. Alcance R5 / REST-T3D-RECONCILE-01, P5-02/P5-03. Solo cobertura; ninguna modificación de producto. RED productivo NOT_APPLICABLE: no defecto productivo demostrado ni comportamiento esperado inventado.

La publicación `reviewed_at=2026-10-08T10:20:30.456Z` se conserva ante un borrador privado posterior (`updated_at=2026-10-09T11:00:00.000Z`, versión9). Cuatro sentinelas distintos para nota interna/resumen/cambios/objetivos privados. Feedback legacy con fecha de envío sigue permitido; nunca se usa el borrador como fallback. Null/ausencia no inventan publicación. Tests anteriores de privacidad, identidad y sesión conservados.

| Variante | Campos públicos | SHA256 JSON canónico |
| --- | --- | --- |
| full | 42 | b259648472dff52f42fbc0cc4960ab980542023d1813222b6ca70219ad1bb238 |
| partial | 42 | 1eed7dd846aded5b022cb90e654cdee9be5708bf3d361b8d40815b23841eeaea |
| null | 42 | 3789f1f9081af01410a44865040cd837667be56f8e3b7665fb1804c09bf4b6aa |
| absent legacy | 39 | 6c34850dd3feafdedd5adb4fa873c1cf052deef0bb1f2d791935ffd69ebab837 |

Comparación estructural de los tres literales PASS: extraer `publicationPayload`, interpretar claves/valores sin tipos y comparar objetos; JSON canónico UTF-8, claves ordenadas, separadores compactos, Unicode sin escape. Variantes idénticas: tres textos; resumen/NULL/objetivos; tres NULL; eliminación de las tres claves. Cada checkout incorpora su literal; los tests no leen archivos hermanos ni requieren fixture externo.

Snapshot HEAD61a34926d51a273803fa17775041a54862cb4174; rama/upstream fix/progress-detail-and-charts / origin/fix/progress-detail-and-charts. SHA256 test `ae2bc9b92c684e5a3402ac23b6c31f0a642dfc81c482354881d13079ee6eb0f5`.

- PASS `npm.cmd run lint`:0 errores/1 warning existente `.local/progress-ux6.tsx:14` fast-refresh; no desactivación/autofix.
- PASS `npm.cmd test -- --run`:67 archivos/429 tests, incluidos21 del spec de impresión con cuatro variantes comunes.
- PASS `npm.cmd run build`:tsc-b y Vite6.4.2,3555 módulos. PASS diff-check.
- Modelo y DOM imprimible contienen solo campos publicados esperados y feedback legacy enviado; los sentinelas privados se excluyen. full/partial mantienen texto y null/absent no recurren al draft.
- Resumen reproducible final: sesión ejecución50586, resultado terminal0, consola20:43:33 y duración tests109.81s; este recibo conserva el resumen, sin log externo inventado. Node22.21.0/npm11.13.0/Vitest4.1.9.
- Históricos no finales: sandbox EPERM rename cache bloqueó67 suites antes de tests; retry elevado intermedio5FAIL/424PASS por mojibake propio. Se restauró exactamente texto HEAD y reaplicó únicamente cobertura UTF-8/LF; final429PASS tras restauración, sin producto ni assertions alterados.

SKIPPED: navegador/PDF físico ya acreditados sobre producto idéntico, no rerun artificial por pruebas nuevas; esta cobertura verifica proyección/DOM, no nueva geometría PDF. Sin remoto/deploy; revisión/CI pendientes del padre.
