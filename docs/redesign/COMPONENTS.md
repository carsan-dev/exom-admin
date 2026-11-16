# EXOM Admin redesign: component cheat sheet

Compose every screen only from `assets/system.css` and `assets/proto.js`. Live specimens: `sistema.html`. Reference screens: `dashboard.html`, `clientes.html`.

Ground rules for builders:

- No page-level colours, radii, shadows or fonts. If something is missing, extend the system in the same language (hairlines, square corners, one lime) and say so.
- Lime only where the coach acts (primary button), where something is active (nav, tab, selection, segmented) or where focus is. Never decorative.
- No side stripes: never mark an item with a 2px coloured left/top border. Active nav = `--lime-soft` fill + `--ink` text + lime icon; active mobile tab = lime icon + `--ink` label; selected table row = `--lime-soft` fill + checked checkbox; banners = full 1px border (status colour 45% over `--rule`) + soft status fill + coloured icon; toasts = coloured icon + 1px `--rule-strong` border. Underline tabs keep their 2px bottom underline.
- Form control borders (`.input`, `.select`, `.textarea`, checkbox, radio, switch track, `.btn-secondary`) use `--field-border` (3:1 against the control and page background in both themes; hover `--field-border-hover`). `--rule-strong` is for dividers only.
- Status = pill `.chip`. Taxonomy = square `.tag`. Keep this everywhere.
- Sections are ruled, not boxed. `.card` only for discrete objects (a day, a meal).
- Copy in Spanish (es-ES, tuteo) taken from the screen audits. Do not invent features, metrics or fields.
- New files in LF, UTF-8.
- Review links: `pagina.html?theme=light&role=admin&state=loading&open=<overlay-id>`.

## Icons

Los bocetos cargan los iconos Lucide desde CDN; en producción se usa `lucide-react`, ya instalado.

## Page skeleton

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Feedback · EXOM Admin</title>
  <link rel="icon" href="assets/exom-balance.svg" type="image/svg+xml">
  <link rel="preload" href="assets/fonts/barlow-800.woff" as="font" type="font/woff" crossorigin>
  <link rel="stylesheet" href="assets/system.css">
  <script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js" defer></script>
  <script src="assets/proto.js"></script>
</head>
<body data-page="feedback" data-crumbs='["Feedback"]'>
<div id="app">
<main class="page" id="main">
  <!-- page content -->
</main>
</div>
<!-- menus, popovers and .overlay dialogs/sheets go here, after #app -->
</body>
</html>
```

- `data-page`: nav id of the section (`dashboard`, `clientes`, `progreso`, `feedback`, `recaps`, `asignaciones`, `entrenamientos`, `dietas`, `ejercicios`, `ingredientes`, `badges`, `retos`, `logros`, `notificaciones`, `plantillas`, `solicitudes`). Detail pages use the parent id.
- `data-crumbs`: JSON labels. Labels matching a nav item become links (and follow the role: "Clientes"/"Usuarios"). Last one is the current page (the mobile top bar shows the EXOM lockup, not the title).
- proto.js injects sidebar, header, mobile top bar, bottom tab bar, "Más" sheet, user menu and the prototype bar.

## Type

```html
<h1 class="h1">Clientes</h1>          <!-- Barlow 800 30px uppercase -->
<span class="fig">42</span>            <!-- Barlow 44px KPI figure -->
<span class="display">Vamos</span>     <!-- login only -->
<h2 class="h2">Actividad reciente</h2> <!-- DM Sans 16/600 -->
<span class="micro">Hoy</span>         <!-- 11px uppercase .1em ink-3 -->
<p class="secondary text-2">…</p>      <!-- 13px ink-2 -->
<span class="caption">…</span>         <!-- 12px ink-3 -->
```

Utilities: `.text-2`, `.text-3`, `.accent`, `.num`, `.truncate`, `.row`, `.row-12`, `.stack-4/8/12/16/24/32/48`, `.spacer`, `.sr-only`, `.prose-13`.

## Page header

```html
<header class="page-header">
  <div class="ph-main">
    <div class="ph-title-row">
      <h1 class="h1">Clientes</h1>
      <span class="ph-meta">46 clientes registrados</span>
    </div>
    <p class="ph-sub">Up to two lines (72ch), it wraps instead of truncating.</p>
  </div>
  <div class="ph-actions">
    <button class="btn btn-primary" type="button"><i data-lucide="plus"></i>Nuevo cliente</button>
  </div>
</header>
```

The primary action sits on the H1 row on every page (one rule in `system.css`; no page-level overrides). The H1 is the first element of `.ph-main`: there is no eyebrow or micro-label above the page title. Micro-labels stay for table headers, sidebar group labels, ledger cell labels and day-group labels.

Small "updated" meta action: `<button class="btn btn-meta" data-refresh-label="Actualizado ahora"><i data-lucide="refresh-cw"></i>Actualizado hace 12 s</button>`.

## Section, split, card

```html
<div class="split"> <!-- 1.7fr / 1fr, stacks under 1024 -->
  <section class="section" aria-labelledby="t1">
    <div class="section-head">
      <div><h2 class="h2" id="t1">Actividad reciente</h2><p class="section-sub">…</p></div>
      <div class="section-actions">…</div>
    </div>
    …
  </section>
</div>
<div class="card"><div class="card-head"><span class="h3">Desayuno</span><span class="caption">420 kcal</span></div>…</div>
```

## Buttons

```html
<button class="btn btn-primary">Crear cliente</button>
<button class="btn btn-secondary"><i data-lucide="sliders-horizontal"></i>Filtros<span class="count">2</span></button>
<button class="btn btn-ghost btn-sm">Limpiar todo</button>
<button class="btn btn-danger">Confirmar baja</button>            <!-- outline, fills on hover -->
<button class="btn btn-danger is-solid">Eliminar permanentemente</button>
<button class="btn btn-ghost btn-icon" aria-label="Cerrar"><i data-lucide="x"></i></button>
<a class="btn btn-primary btn-lg btn-arrow" href="…">Ir a clientes<i data-lucide="arrow-right"></i></a>
<button class="btn btn-primary is-loading" aria-busy="true">Creando...</button>
<button class="btn btn-primary" disabled>Crear cliente</button>
```

Sizes: `.btn-sm` 32, base 36, `.btn-lg` 44. `data-loading-label="Creando..."` swaps the label while loading (forms, retry).

## Fields

```html
<div class="field">
  <label class="field-label" for="x">Objetivo principal <span class="field-optional">Opcional</span></label>
  <textarea class="textarea" id="x" maxlength="160" data-count></textarea>
  <div class="field-foot"><span></span><span class="field-count" aria-live="polite">0/160</span></div>
</div>
<div class="field is-invalid">
  <label class="field-label" for="e">Email</label>
  <input class="input" id="e" type="email" aria-invalid="true" aria-describedby="e-err">
  <p class="field-error" id="e-err"><i data-lucide="circle-alert"></i><span>Introduce un email válido.</span></p>
</div>
<select class="select">…</select>
<label class="input-icon"><span class="sr-only">Buscar</span><i data-lucide="search"></i><input class="input" type="search" placeholder="Buscar por nombre o email..."></label>
<label class="check"><input type="checkbox">Con admins</label>
<label class="check"><input type="radio" name="r">Opción</label>   <!-- square radio -->
<label class="switch"><input type="checkbox" role="switch">Recordatorios</label>
<div class="field-grid">…<div class="field span-2">…</div></div>  <!-- 2 cols, 1 on mobile -->
```

Conditional blocks: `<select data-switch="pw">` + `<div data-case="pw:manual" hidden>`. Filter groups in popovers: `.filter-group > fieldset.fieldset > legend.micro + .filter-options`.

## Status, taxonomy, counts

```html
<span class="chip chip-success">Activa</span>     <!-- -warning -danger -info -neutral -brand; .no-dot -->
<span class="tag">Intermedio</span>
<span class="count">3</span> <span class="count count-muted">12</span>
<span class="filter-chip">Estado: <b>Activa</b><button type="button" data-remove-chip aria-label="Quitar filtro Estado: Activa"><i data-lucide="x"></i></button></span>
<span class="kbd">Esc</span>
<span class="proposal-tag">Propuesta</span>   <!-- UI that does not exist today; defined once in system.css, never in page CSS -->
```

## Toolbar + segmented

```html
<div class="toolbar-row">
  <div class="toolbar" role="search" aria-label="Buscar y filtrar">
    <label class="input-icon">…</label>
    <button class="btn btn-secondary" data-open="#filters-pop" aria-haspopup="dialog" aria-expanded="false">
      <i data-lucide="sliders-horizontal"></i>Filtros<span class="count" data-filter-count>2</span></button>
    <span class="filter-chip">…</span>
    <button class="btn btn-ghost btn-sm clear-all" type="button" data-clear-chips>Limpiar todo</button>
  </div>
  <div class="segmented" role="group" aria-label="Visibilidad del listado">
    <button class="seg-btn" type="button" aria-pressed="true" data-panel="#view-main">Listado principal</button>
    <button class="seg-btn" type="button" aria-pressed="false" data-panel="#view-archived">Archivados</button>
  </div>
</div>
```

## Tabs

```html
<div data-tabs>
  <div class="tabs" role="tablist" aria-label="Tipo de usuario">
    <button class="tab" role="tab" id="t-a" aria-controls="p-a" aria-selected="true">Clientes <span class="tab-count">46</span></button>
    <button class="tab" role="tab" id="t-b" aria-controls="p-b" aria-selected="false">Admins <span class="tab-count">5</span></button>
  </div>
  <section id="p-a" role="tabpanel" aria-labelledby="t-a">…</section>
  <section id="p-b" role="tabpanel" aria-labelledby="t-b" hidden>…</section>
</div>
```

A `tabchange` event (detail.tab) bubbles from the `[data-tabs]` element.

## Table

```html
<div class="table-wrap"> <!-- container query: .p3 hidden < 980px, .p2 hidden < 760px -->
  <table class="table table--stack">
    <caption class="sr-only">Listado de clientes</caption>
    <thead><tr>
      <th scope="col">Cliente</th>
      <th scope="col" class="p3">Email</th>
      <th scope="col" aria-sort="none"><button class="th-sort" type="button">Fecha<i data-lucide="arrow-up-down"></i></button></th>
      <th scope="col" class="cell-num">Racha</th>
      <th scope="col" class="cell-actions"><span class="sr-only">Acciones</span></th>
    </tr></thead>
    <tbody>
      <tr data-href="cliente-detalle.html">
        <td class="cell-primary"><div class="entity"><span class="avatar avatar-32" aria-hidden="true">LM</span>
          <span class="entity-text"><a class="entity-name row-anchor" href="cliente-detalle.html">Lucía Martínez</a>
          <span class="entity-sub">Perder grasa, ganar masa muscular</span></span></div></td>
        <td class="cell-muted p3" data-label="Email"><span>lucia@…</span></td>
        <td class="st-inline" data-label="Estado"><span class="chip chip-success">Activa</span></td>
        <td class="cell-num" data-label="Racha"><span>12 días</span></td>
        <td class="cell-actions"><span class="cell-actions-inner"><i data-lucide="chevron-right" class="row-chevron"></i>
          <button class="btn btn-ghost btn-icon btn-sm" data-open="#row-menu" aria-haspopup="menu" aria-expanded="false"
            aria-label="Acciones de Lucía Martínez" data-ctx="blocked" data-ctx-name="Lucía Martínez"><i data-lucide="ellipsis"></i></button></span></td>
      </tr>
    </tbody>
  </table>
</div>
<nav class="pagination" aria-label="Paginación"><span class="pagination-label">Página 1 de 5</span>
  <span class="pagination-actions"><button class="btn btn-secondary btn-sm" disabled>Anterior</button><button class="btn btn-secondary btn-sm">Siguiente</button></span></nav>
```

Width: a table never exceeds its container. Mark the long text column's `td` with `.cell-clip` (elastic, one-line ellipsis; put a `title` on the text) and keep short numeric/date/status cells on one line (`.cell-num`, `.cell-date`, `.cell-week`, `.st-inline` are `nowrap`). Mobile (< 768) `.table--stack`: primary cell + actions on top, `.st-inline` cells as one chip row, other `[data-label]` cells as label/value lines. Wrap the cell content in an element. Scrollable table with sticky header: wrap in `.table-scroll` with a max-height. Selection: `table[data-selectable][id]` with `[data-select-all]` / `[data-select-row]` checkboxes in `.cell-check` cells, plus `<div class="selection-bar" data-for="#table-id" hidden><span class="selection-count"></span>…<button data-clear-selection>`. Only for lists that really have bulk actions.

## Ledger (KPI strip)

```html
<div class="ledger"> <!-- 4 cols; 2 under 1024; set style="--cols:3" for 3 -->
  <a class="ledger-cell is-alert" href="clientes.html?status=BLOCKED" data-tone="danger">
    <span class="ledger-head"><span class="ledger-dot" aria-hidden="true"></span><span class="ledger-label micro">Cuentas bloqueadas</span><i data-lucide="arrow-up-right" class="ledger-go"></i></span>
    <span class="fig">1</span>
    <span class="ledger-sub">Requieren atención inmediata</span>
  </a>
</div>
```

Figures are always `--ink`, never a status hue. A value that signals a problem gets the 6px `.ledger-dot` beside its label; only a true alert (blocked accounts, failed sends > 0) uses `is-alert` + `data-tone="danger"`, which adds the red dot and a red figure. Never a blue or amber numeral. Order cells by urgency.

## Ruled lists

- `.feed > li > a.feed-row` (type icon `.feed-type`, avatar, `.feed-text` with `.feed-name` + `.feed-desc`, `time.feed-time`, `.row-chevron`). Day labels: `<h3 class="feed-day micro">Hoy</h3>`.
- `.rank > li > a.rank-row` (`.rank-pos`, avatar, `.rank-main`, `.rank-streak`).
- `.ruled > li` plain hairline rows; `.ruled-row` for a space-between line.
- `.dl` definition grid: `<dl class="dl"><dt>Email</dt><dd>…</dd></dl>`.
- `.progress` `<div class="progress" role="progressbar" aria-valuenow="71" …><span style="--value:71%"></span></div>`.
- `.week-ticks`: `<span class="week-ticks" aria-hidden="true"><i class="on"></i>…7 items</span><span class="caption">5/7 días completados</span>`.
- `.avatar avatar-24|28|32|40|56` with initials.

## Overlays

```html
<!-- Dialog: data-static = scrim click does not close (forms, destructive) -->
<div class="overlay" id="dlg-x" data-static hidden>
  <div class="dialog dialog-md" role="dialog" aria-modal="true" aria-labelledby="dlg-x-t" aria-describedby="dlg-x-d">
    <div class="ov-head">
      <div class="ov-head-text"><h2 class="ov-title" id="dlg-x-t">Nuevo cliente</h2><p class="ov-desc" id="dlg-x-d">…</p></div>
      <button class="btn btn-ghost btn-icon" type="button" data-close aria-label="Cerrar"><i data-lucide="x"></i></button>
    </div>
    <div class="ov-body">…</div>
    <div class="ov-foot">
      <button class="btn btn-secondary" type="button" data-close>Cancelar</button>
      <button class="btn btn-primary" type="submit" form="form-id" data-loading-label="Creando...">Crear cliente</button>
    </div>
  </div>
</div>
<!-- Sheet: same chrome, .overlay-sheet + .sheet .sheet-sm|md|lg (480/640/960) -->
<div class="overlay overlay-sheet" id="sheet-x" hidden><div class="sheet sheet-sm" role="dialog" aria-modal="true" …>…</div></div>
<!-- Menu -->
<div class="menu" id="row-menu" role="menu" aria-label="Acciones" hidden>
  <button class="menu-item" type="button" role="menuitem" data-if="blocked"><i data-lucide="lock-open"></i>Desbloquear</button>
  <div class="menu-sep" role="separator"></div>
  <button class="menu-item is-danger" type="button" role="menuitem" data-open="#dlg-delete"><i data-lucide="trash-2"></i>Eliminar definitivamente</button>
</div>
<!-- Popover -->
<div class="popover" id="pop" role="dialog" aria-labelledby="pop-t" data-align="start" style="--w:440px" hidden>
  <div class="popover-head">…</div><div class="popover-body">…</div><div class="popover-foot">…</div>
</div>
```

Dialog widths: `.dialog-sm` 440, `.dialog-md` 640, `.dialog-lg` 880. Destructive confirmation: `role="alertdialog"`, input `data-confirm-match="ELIMINAR" data-confirm-target="#btn"`, button `disabled`. Under 768px dialogs and sheets become bottom sheets with a drag handle (added by JS).

Tooltips: `data-tip="Texto"`. Toasts: `data-toast="Título" data-toast-tone="success|info|warning|danger" data-toast-desc="…"` or `Proto.toast(title, tone, desc)`.

## States

```html
<div data-show="loading" aria-busy="true"> … .sk-line (--w), .sk-circle (--av), .sk-fig, .sk-block (--h) … </div>
<div data-show="empty" class="section">
  <div class="empty"><span class="empty-x" aria-hidden="true"></span>
    <h2 class="empty-title">Aún no tienes clientes asignados</h2>
    <p class="empty-text">One line that teaches what will appear here.</p>
    <button class="btn btn-primary">Crear primer cliente</button></div>
</div>
<div data-show="error" class="section">
  <div class="error-state" role="alert"><i data-lucide="circle-alert"></i>
    <h2 class="empty-title">No se ha podido cargar el listado</h2><p class="empty-text">…</p>
    <button class="btn btn-secondary" data-set-state="data" data-loading-label="Reintentando..."><i data-lucide="rotate-cw"></i>Reintentar</button></div>
</div>
<div class="banner banner-warning"><i data-lucide="triangle-alert"></i><span class="banner-text">…</span><span class="banner-actions">…</span></div>
```

`.empty-compact` for in-section empties. Banner tones: info / warning / danger / brand. The info banner is neutral (`--surface-1` fill, 1px `--rule-strong` border, `--ink-2` icon, no blue): information is not a status. Warning and danger keep their tint.

## Prototype attributes (proto.js)

| Attribute | Effect |
| --- | --- |
| `data-show="data loading empty error"` | Visible only in those prototype states |
| `data-role="super"` / `"admin"` | Visible only for that role |
| `data-text-super` / `data-text-admin` | Role-dependent text |
| `data-open="#id"` / `data-close` / `data-static` | Overlays, menus, popovers (focus trap, Esc, scrim) |
| `data-ctx="flag"`, `data-ctx-name="…"` | Context passed to the opened menu/overlay; fills `[data-fill="name"]` |
| `data-if` / `data-if-not` / `data-disable-if` | Menu items shown/hidden/disabled by context flags |
| `tr[data-href]` | Whole row navigates (keep a real `<a>` in the primary cell) |
| `form[data-validate]` + `data-success-toast` | Required / email / minlength validation, loading, toast |
| `data-toast`, `data-tip`, `data-set-state`, `data-refresh-label` | Toast, tooltip, retry, refresh |

## Breakpoints

- ≥ 1024: sidebar 240 (collapsible to 56 rail, persisted).
- 768–1023: 56 rail by default; page padding 20; ledger 2 columns; split stacks.
- < 768: top bar (EXOM lockup, no page title: the H1 names the page) + bottom tab bar (Dashboard, Feedback, Recaps, Progreso, Más). "Más" carries the pending Solicitudes count (`.count`, SUPER_ADMIN only) and its sheet lists Solicitudes first, then the sidebar groups incl. Clientes/Usuarios; page padding 16; tables stack; overlays become bottom sheets; no horizontal page scroll.
- `pointer: coarse`: every control gets a 44px hit area without changing its visual size.

## How to capture at 390px

Headless Chrome on Windows cannot go below ~500px window width, so `--window-size=390,...` does not give a real 390px viewport. Capture mobile by loading the page inside an `<iframe width="390">` of a small wrapper HTML (kept outside the repo) and screenshot the wrapper:

```html
<body style="margin:0;background:#222"><iframe src="http://localhost:5191/dashboard.html" width="390" height="844" style="border:0;display:block"></iframe></body>
```

URL overrides (any page): `?theme=light|dark&role=admin|super&state=loading|empty|error&open=<overlay-id>`, e.g. `clientes.html?theme=light&role=super&open=dlg-new`. Combine with `&`.
