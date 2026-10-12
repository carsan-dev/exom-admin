# R3-NORM-001 — normalización exclusiva LF, 2026-10-11
FAIL real: commit propio no publicado `92d374f0472fc84197ac85a27e7ab9acb27e6233` creado pese a check cached fallido; check de commit reproducido EXIT2. Check unstaged previo omitía nuevos archivos. autocrlf=false, whitespace sin override, atributos aplicables ausentes; ninguna configuración modificada.
Final: igualdad textual sin CR8/8 PASS; lint PASS0 errores/1 warning ajeno, build TypeScript/Vite PASS, node --check PASS, browser activado14/14/ocho casos PASS, diff normalización y base→worktree PASS. Full444 anterior NOT_RUN nuevamente: producción idéntica. Restage/check padre pendiente; rollback conserva commit propio antes de reemplazo, sin tocar trabajo ajeno. UTC `2026-10-11T10:53:51.8742108Z`.
Dashboard `dae34e4de763f18ae2b9e7c32a46a389be5dcb181b19d5db98ca7354cbd818c9` y fixture `474f667eda623200619fc7ef279bef0819d99ffabc46309221702a26fa3ff584` intactos. Solo adapter92/runner167 CRLF→LF; harness336+recibo15=351 desde base previa, normalización259+259. Sin fuente/UI/pulido/capturas/stage/commit/refs/remotos. P6 REVIEW_REQUIRED, P5 DONE/iOS externo intactos, Engram PENDING.
Raíz sin Git: plan antes `26C4259E15BF513969A5AB7B15C09DE4EC6719A49A0DB0D0E3C3D51F9E644BA1` → `2FCB639FB7FD9433B8A529D324A30BDFA3B7FF07B9845140657F5385B8803D86`; tareas antes `027A664BA7D6FFE8EACEADE0F9E225BEF67CBDA45F7ACA435E0D2863B269FAF7` → `D30171C202023DAEC8C0E5195405EDB5A85F0B419E0AF6DB419733F3002DB6A6`.
| Archivo | SHA256 antes | SHA256 después |
| --- | --- | --- |
| `.gitignore` | `f389981dae350822983887c128f820ae7858dddd864c5713320f8b169216d1f1` | igual |
| `browser/fixture-api.ts` | `e7ce7b0826585a54a89e77eaeaca41dac0a3f5376597c3dea5e9c87b556b26ba` | `ec097b37eabdfed7411b3cd62866f475acdfeb10d680f9fcb2063cd646505441` |
| `browser/fixture-auth.ts` | `32e9f84d804d6b82c408654adcc1f93773f7130a92555e6b1e6d373f5413ae71` | igual |
| `browser/fixture.css` | `95ff4bbdd4354fb2b1e0537549c845462b53404ec5fab21c7a5a633351c9e1bc` | igual |
| `browser/index.html` | `9bf6d350a2644affa5f0692a42783e17f1f3e5b7659038424b858f1754e290d8` | igual |
| `browser/main.tsx` | `8ca6707a3fbf1dcc91f0e463da1778010162896e7c18584157ffd599c4d06fd7` | igual |
| `verify-browser.cjs` | `1f2d55b0082a466b2ae2058e773e04524e4643ec899e50e81d7f4947f969b31f` | `4b061c4097bb99bde3ca1336e9db146b881f54ff2e537ce255050bd5229027c6` |
| `vite.browser.config.ts` | `5cc4089258507a50703c2985c73abfc00a879bc0abdc78a9cd7238cf4a3a3444` | igual |
