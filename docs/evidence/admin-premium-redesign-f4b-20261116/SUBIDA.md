# Subida de las ramas del rediseño premium (pendiente del propietario)

`git push` está denegado para el agente por los permisos de la sesión (D18). Lo ejecuta el propietario desde el worktree `C:/Users/croly/Documents/Desarrollos/EXOM/exom-admin-worktrees/admin-rediseno`, en este orden y una rama por comando.

## 1. Push (propietario)

```bash
git push -u origin feat/admin-rediseno-f0-red-seguridad
```

```bash
git push -u origin feat/admin-rediseno-f1-tokens
```

```bash
git push -u origin feat/admin-rediseno-f2-piezas
```

```bash
git push -u origin feat/admin-rediseno-f3-shell
```

```bash
git push -u origin feat/admin-rediseno-f4a-listas
```

```bash
git push -u origin feat/admin-rediseno-f4b-seguimiento
```

```bash
git push -u origin feat/admin-rediseno-f4c-builders
```

## 2. Qué decirle al agente después

> Ramas subidas. Abre las PR a develop en cadena (F0 → F1 → F2 → F3 → F4a → F4b → F4c), espera a CI en cada una y haz merge con merge commit cuando esté verde; si sale rojo, reintenta si es inestabilidad o corrígelo.

## 3. PR propuestas

| Fase | Título propuesto | Rama | SHA | Evidencia |
| --- | --- | --- | --- | --- |
| F0 | `test(admin): red de seguridad del rediseño premium (F0)` | `feat/admin-rediseno-f0-red-seguridad` | `718f8f3` | `docs/evidence/admin-premium-redesign-f0…` |
| F1 | `feat(admin): tokens y tema del rediseño premium (F1)` | `feat/admin-rediseno-f1-tokens` | `5860abe` | `docs/evidence/admin-premium-redesign-f1…` |
| F2 | `feat(admin): piezas compartidas del rediseño premium (F2)` | `feat/admin-rediseno-f2-piezas` | `f3696ed` | `docs/evidence/admin-premium-redesign-f2…` |
| F3 | `feat(admin): shell del rediseño premium (F3)` | `feat/admin-rediseno-f3-shell` | `0f6596f` | `docs/evidence/admin-premium-redesign-f3…` |
| F4a | `feat(admin): listas del rediseño premium (F4, lote A)` | `feat/admin-rediseno-f4a-listas` | `eb7659c` | `docs/evidence/admin-premium-redesign-f4a…` |
| F4b | `feat(admin): seguimiento del rediseño premium (F4, lote B)` | `feat/admin-rediseno-f4b-seguimiento` | HEAD tras el commit de evidencias (`git rev-parse HEAD` en esa rama; el código es `62ff0a0`) | `docs/evidence/admin-premium-redesign-f4b…` |
| F4c | `feat(admin): builders del rediseño premium (F4, lote C)` | `feat/admin-rediseno-f4c-builders` | HEAD tras el commit de evidencias (`git rev-parse HEAD` en esa rama; el código es `0cf860f`) | `docs/evidence/admin-premium-redesign-f4c…` |

## 4. Notas

- Orden obligatorio: cada PR contiene a las anteriores; tras el merge de una, la siguiente muestra solo su diferencia.
- Merge commit, no squash: el squash rompe la pila.
- La CI corre en push a `feat/**` y en `pull_request`.
- Sin atribución de IA en las PR.
- Cada merge a `develop` puede disparar un despliegue de vista previa en Vercel (comprobarlo); `main` no se toca.
