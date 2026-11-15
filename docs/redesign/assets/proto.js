/*
 * EXOM Admin redesign - prototype runtime (vanilla JS, no build).
 *
 * Load in <head>, AFTER the deferred Lucide script:
 *   <script src="assets/vendor/lucide-local.js" defer></script>
 *   <script src="assets/proto.js"></script>
 *
 * It runs once immediately (theme / role / sidebar attributes, no flash) and
 * builds the shell on DOMContentLoaded. Behaviour is wired by data attributes:
 *   data-open="#id"           open a .overlay (dialog/sheet), .menu or .popover
 *   data-close                close the nearest overlay / menu / popover
 *   data-static               (on .overlay) scrim click does not close
 *   data-ctx="a b"            flags passed to the opened menu/overlay
 *   data-ctx-name="..."       values filled into [data-fill="name"] when opened
 *   data-if / data-if-not     (menu items) shown only if ctx flag present / absent
 *   data-disable-if="flag"    (menu items) aria-disabled when ctx flag present
 *   data-toast="Mensaje"      fire a toast (data-toast-tone, data-toast-desc)
 *   data-tabs                 tab container (role=tablist / tab / tabpanel)
 *   .segmented > .seg-btn     aria-pressed group; data-panel="#id" swaps panels
 *   data-show="loading ..."   visible only for that prototype state
 *   data-role="super|admin"   visible only for that role
 *   data-text-super / data-text-admin  role-dependent text
 *   tr.row-link[data-href]    whole row navigates
 *   table[data-selectable]    checkbox selection + .selection-bar[data-for]
 *   form[data-validate]       required/email/minlength check, loading, toast
 *   [data-confirm-match="X"][data-confirm-target="#btn"]  enable when typed
 *   textarea[maxlength][data-count]  live .field-count
 *   select[data-switch="key"] shows [data-case="key:value"] blocks
 *   [data-remove-chip] / [data-clear-chips]  active filter chips
 *   [data-set-state="data"]   retry buttons (loading, then switch state)
 *   [data-refresh-label="..."] refresh buttons (loading, then relabel)
 *   [data-tip="..."]          tooltip
 * URL overrides (not persisted): ?theme=light|dark&role=admin|super&state=data|loading|empty|error&open=<overlay id>
 * Public helpers: window.Proto.toast(title, tone, desc), Proto.icons(), Proto.setState(s)
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ---------- storage (guarded) ---------- */
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  var KEYS = { theme: 'exom-proto-theme', role: 'exom-proto-role', sb: 'exom-proto-sidebar' };

  /* ---------- early attributes (before first paint) ---------- */
  // URL overrides for review links: ?theme=light&role=admin&state=loading
  var params = {};
  try { new URLSearchParams(window.location.search).forEach(function (v, k) { params[k] = v; }); } catch (e) { /* ignore */ }
  var embed = params.embed === '1'; // hub previews: no prototype UI
  var theme = (params.theme || store.get(KEYS.theme)) === 'light' ? 'light' : 'dark';
  var role = (params.role || store.get(KEYS.role)) === 'admin' ? 'admin' : 'super';
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-role', role);

  var mqDesk = window.matchMedia('(min-width: 1024px)');
  var mqTab = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
  var mqMob = window.matchMedia('(max-width: 767px)');
  var sbPref = store.get(KEYS.sb) === 'rail' ? 'rail' : 'open';
  var tabletOpen = false;
  function sbState() {
    if (mqDesk.matches) return sbPref;
    if (mqTab.matches) return tabletOpen ? 'open' : 'rail';
    return 'open';
  }
  root.setAttribute('data-sb', sbState());

  /* ---------- navigation model ---------- */
  var NAV = [
    { label: null, items: [
      { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: 'layout-dashboard' }
    ] },
    { label: 'Seguimiento', items: [
      { id: 'clientes', label: 'Clientes', superLabel: 'Usuarios', href: 'clientes.html', icon: 'users' },
      { id: 'progreso', label: 'Progreso', href: 'progreso.html', icon: 'trending-up' },
      { id: 'feedback', label: 'Feedback', href: 'feedback.html', icon: 'message-square' },
      { id: 'recaps', label: 'Recaps', href: 'recaps.html', icon: 'file-text' }
    ] },
    { label: 'Planificación', items: [
      { id: 'asignaciones', label: 'Asignaciones', href: 'asignaciones.html', icon: 'calendar-days' },
      { id: 'entrenamientos', label: 'Entrenamientos', href: 'entrenamientos.html', icon: 'clipboard-list' },
      { id: 'dietas', label: 'Dietas', href: 'dietas.html', icon: 'utensils-crossed' }
    ] },
    { label: 'Catálogo', items: [
      { id: 'ejercicios', label: 'Ejercicios', href: 'ejercicios.html', icon: 'dumbbell' },
      { id: 'ingredientes', label: 'Ingredientes', href: 'ingredientes.html', icon: 'apple' },
      { id: 'badges', label: 'Badges', href: 'badges.html', icon: 'tags' }
    ] },
    { label: 'Motivación', items: [
      { id: 'retos', label: 'Retos', href: 'retos.html', icon: 'trophy' },
      { id: 'logros', label: 'Logros', href: 'logros.html', icon: 'award' }
    ] },
    { label: 'Comunicación', items: [
      { id: 'notificaciones', label: 'Notificaciones', href: 'notificaciones.html', icon: 'bell' },
      { id: 'plantillas', label: 'Plantillas', href: 'plantillas.html', icon: 'settings', role: 'super' }
    ] },
    { label: 'Control', items: [
      { id: 'solicitudes', label: 'Solicitudes', href: 'solicitudes.html', icon: 'shield-check', count: 3, countRole: 'super' }
    ] }
  ];
  var TABBAR = ['dashboard', 'feedback', 'recaps', 'progreso'];
  var PENDING_REQUESTS = 3;

  function findItem(key) {
    for (var g = 0; g < NAV.length; g++) {
      for (var i = 0; i < NAV[g].items.length; i++) {
        var it = NAV[g].items[i];
        if (it.id === key || it.label === key || it.superLabel === key) return { item: it, group: NAV[g] };
      }
    }
    return null;
  }

  var SYMBOL_PATH = 'M46 110C20 106 0 84 0 56C0 33 14 12 35 3C48-2 60 4 62 16C66 29 57 39 44 39C36 39 28 35 23 28C11 38 5 51 7 65C9 86 24 103 46 109Z';
  var SYMBOL = '<svg class="brand-symbol" viewBox="0 0 120 112" aria-hidden="true" focusable="false">' +
    '<path class="half-a" d="' + SYMBOL_PATH + '"/>' +
    '<path class="half-b" transform="rotate(180 60 56)" d="' + SYMBOL_PATH + '"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function labelAttrs(it) {
    return it.superLabel ? ' data-text-super="' + esc(it.superLabel) + '" data-text-admin="' + esc(it.label) + '"' : '';
  }
  function labelNow(it) { return it.superLabel && role === 'super' ? it.superLabel : it.label; }

  function navItemHTML(it, current) {
    var cur = it.id === current;
    return '<li' + (it.role ? ' data-role="' + it.role + '"' : '') + '>' +
      '<a class="nav-item" href="' + it.href + '" data-tip-rail' + (cur ? ' aria-current="page"' : '') + '>' +
      '<i data-lucide="' + it.icon + '"></i>' +
      '<span class="nav-label"' + labelAttrs(it) + '>' + esc(labelNow(it)) + '</span>' +
      (it.count ? '<span class="count"' + (it.countRole ? ' data-role="' + it.countRole + '"' : '') +
        ' aria-label="' + it.count + ' pendientes">' + it.count + '</span>' : '') +
      '</a></li>';
  }

  /* hoistId: item rendered first in its own unlabelled group (mobile "Más" sheet) */
  function navGroupsHTML(current, idPrefix, hoistId) {
    var html = '';
    if (hoistId) {
      var hf = findItem(hoistId);
      if (hf) html += '<div class="sb-group"><ul>' + navItemHTML(hf.item, current) + '</ul></div>';
    }
    NAV.forEach(function (g, gi) {
      if (hoistId && !g.items.some(function (it) { return it.id !== hoistId; })) return;
      var gid = idPrefix + '-g' + gi;
      html += '<div class="sb-group">';
      if (g.label) html += '<p class="sb-group-label micro" id="' + gid + '">' + esc(g.label) + '</p>';
      html += '<ul' + (g.label ? ' aria-labelledby="' + gid + '"' : '') + '>';
      g.items.forEach(function (it) {
        if (it.id === hoistId) return;
        html += navItemHTML(it, current);
      });
      html += '</ul></div>';
    });
    return html;
  }

  function buildShell() {
    var body = doc.body;
    var app = doc.getElementById('app');
    var main = app && app.querySelector('main');
    if (!app || !main) return;
    var page = body.getAttribute('data-page') || '';
    var found = findItem(page);
    var st = params.state;
    if (st === 'data' || st === 'loading' || st === 'empty' || st === 'error') body.setAttribute('data-state', st);
    else if (!body.hasAttribute('data-state')) body.setAttribute('data-state', 'data');
    if (!main.id) main.id = 'main';

    // Breadcrumbs
    var crumbs;
    try { crumbs = JSON.parse(body.getAttribute('data-crumbs') || 'null'); } catch (e) { crumbs = null; }
    if (!crumbs || !crumbs.length) crumbs = [found ? found.item.label : (doc.title.split('·')[0].trim() || 'EXOM')];
    var crumbsHTML = crumbs.map(function (c, i) {
      var last = i === crumbs.length - 1;
      var f = findItem(c);
      var attrs = f ? labelAttrs(f.item) : '';
      var text = f ? labelNow(f.item) : c;
      if (last) return '<li><span aria-current="page"' + attrs + '>' + esc(text) + '</span></li>';
      return '<li><a href="' + (f ? f.item.href : '#') + '"' + attrs + '>' + esc(text) + '</a></li>';
    }).join('');

    var userMenuBtn = function (cls, inner, label) {
      return '<button class="' + cls + '" type="button" data-open="#user-menu" aria-haspopup="menu" aria-expanded="false"' +
        (label ? ' aria-label="' + label + '"' : '') + '>' + inner + '</button>';
    };

    var sidebar =
      '<aside class="sidebar" id="sidebar" aria-label="Menú principal">' +
        '<a class="sb-brand" href="dashboard.html" aria-label="EXOM Admin, ir al Dashboard">' + SYMBOL +
          '<span class="wordmark">E<span>X</span>OM</span><span class="micro">Admin</span></a>' +
        '<nav class="sb-nav" aria-label="Secciones">' + navGroupsHTML(page, 'nav') + '</nav>' +
        '<div class="sb-foot">' +
          userMenuBtn('sb-user', '<span class="avatar avatar-28">MS</span>' +
            '<span class="sb-user-text"><span class="sb-user-name">Moisés Sánchez</span>' +
            '<span class="sb-user-role micro" data-text-super="Super Admin" data-text-admin="Admin"></span></span>' +
            '<i data-lucide="chevrons-up-down"></i>', 'Cuenta de Moisés Sánchez') +
        '</div>' +
      '</aside>';

    var header =
      '<header class="header">' +
        '<button class="btn btn-ghost btn-icon" type="button" id="sb-toggle" data-sb-toggle aria-controls="sidebar">' +
          '<i data-lucide="panel-left-close" class="ic-collapse"></i><i data-lucide="panel-left-open" class="ic-expand"></i></button>' +
        '<nav class="crumbs" aria-label="Ruta de navegación"><ol>' + crumbsHTML + '</ol></nav>' +
        '<button class="btn btn-ghost btn-icon" type="button" data-theme-toggle aria-label="Cambiar tema" data-tip="Cambiar tema">' +
          '<i data-lucide="sun" class="theme-icon-dark"></i><i data-lucide="moon" class="theme-icon-light"></i></button>' +
      '</header>';

    var mtop =
      '<header class="mtopbar">' +
        '<a class="mtopbar-brand" href="dashboard.html" aria-label="EXOM Admin, ir al Dashboard">' + SYMBOL +
          '<span class="wordmark">E<span>X</span>OM</span></a>' +
        userMenuBtn('mtopbar-user', '<span class="avatar avatar-32">MS</span>', 'Cuenta de Moisés Sánchez') +
      '</header>';

    var inTabbar = TABBAR.indexOf(page) > -1;
    var tabbar = '<nav class="tabbar" aria-label="Navegación inferior">' +
      TABBAR.map(function (id) {
        var it = findItem(id).item;
        return '<a class="tab-item" href="' + it.href + '"' + (id === page ? ' aria-current="page"' : '') + '>' +
          '<i data-lucide="' + it.icon + '"></i><span' + labelAttrs(it) + '>' + esc(labelNow(it)) + '</span></a>';
      }).join('') +
      '<button class="tab-item' + (!inTabbar && found ? ' is-current' : '') + '" type="button" data-open="#more-nav" aria-haspopup="dialog" aria-expanded="false">' +
        '<i data-lucide="menu"></i><span>Más</span>' +
        '<span class="count tab-count-badge" data-role="super" aria-label="' + PENDING_REQUESTS + ' solicitudes pendientes">' + PENDING_REQUESTS + '</span></button>' +
      '</nav>';

    var userMenu =
      '<div class="menu" id="user-menu" role="menu" aria-label="Cuenta" hidden>' +
        '<div class="menu-label"><div class="h3">Moisés Sánchez</div><div class="caption">moises@exom.app</div></div>' +
        '<div class="menu-sep" role="separator"></div>' +
        '<button class="menu-item" type="button" role="menuitem" data-theme-toggle><i data-lucide="sun-moon"></i>Cambiar tema</button>' +
        '<div class="menu-sep" role="separator"></div>' +
        '<a class="menu-item is-danger" role="menuitem" href="login.html"><i data-lucide="log-out"></i>Cerrar sesión</a>' +
      '</div>';

    var moreNav =
      '<div class="overlay overlay-sheet" id="more-nav" hidden>' +
        '<div class="sheet sheet-sm" role="dialog" aria-modal="true" aria-labelledby="more-nav-title">' +
          '<div class="ov-head"><div class="ov-head-text"><h2 class="ov-title" id="more-nav-title">Menú</h2></div>' +
          '<button class="btn btn-ghost btn-icon" type="button" data-close aria-label="Cerrar"><i data-lucide="x"></i></button></div>' +
          '<nav class="ov-body more-nav" aria-label="Todas las secciones">' + navGroupsHTML(page, 'more', 'solicitudes') + '</nav>' +
        '</div>' +
      '</div>';

    var proto =
      '<div class="proto" role="group" aria-label="Controles del prototipo">' +
        '<div class="proto-panel" id="proto-panel" hidden>' +
          protoRow('Rol', 'role', [['admin', 'ADMIN'], ['super', 'SUPER_ADMIN']]) +
          protoRow('Tema', 'theme', [['dark', 'oscuro'], ['light', 'claro']]) +
          protoRow('Estado', 'state', [['data', 'datos'], ['loading', 'cargando'], ['empty', 'vacío'], ['error', 'error']]) +
          '<p class="proto-note">Clientes, correos y cifras: datos de demostración ficticios.</p>' +
        '</div>' +
        '<button class="proto-pill" type="button" aria-expanded="false" aria-controls="proto-panel">Prototipo <b data-proto-sum></b></button>' +
      '</div>';

    var skip = '<a class="skip-link" href="#' + main.id + '">Saltar al contenido</a>';

    // Assemble
    app.classList.add('shell');
    app.insertAdjacentHTML('afterbegin', sidebar);
    var shellMain = doc.createElement('div');
    shellMain.className = 'shell-main';
    app.insertBefore(shellMain, main);
    shellMain.insertAdjacentHTML('beforeend', header + mtop);
    shellMain.appendChild(main);
    app.insertAdjacentHTML('beforeend', tabbar);
    body.insertAdjacentHTML('afterbegin', skip);
    body.insertAdjacentHTML('beforeend', userMenu + moreNav + (embed ? '' : proto));
  }

  function protoRow(label, key, opts) {
    return '<div class="proto-row"><span>' + label + '</span><div class="proto-opts">' +
      opts.map(function (o) { return '<button type="button" data-proto="' + key + '" value="' + o[0] + '">' + o[1] + '</button>'; }).join('') +
      '</div></div>';
  }

  /* ---------- icons ---------- */
  function icons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.6 } });
    }
  }

  /* ---------- role / state / theme ---------- */
  function tokens(v) { return String(v || '').split(/\s+/).filter(Boolean); }
  function roleOK(el) { return !el.hasAttribute('data-role') || tokens(el.getAttribute('data-role')).indexOf(role) > -1; }

  function applyVisibility() {
    var state = doc.body.getAttribute('data-state') || 'data';
    Array.prototype.forEach.call(doc.querySelectorAll('[data-show], [data-role]'), function (el) {
      if (el === root) return;
      var ok = roleOK(el);
      if (ok && el.hasAttribute('data-show')) ok = tokens(el.getAttribute('data-show')).indexOf(state) > -1;
      el.hidden = !ok;
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-text-super]'), function (el) {
      el.textContent = role === 'super' ? el.getAttribute('data-text-super') : el.getAttribute('data-text-admin');
    });
    // Tab sets whose tablist got hidden fall back to their first tab
    Array.prototype.forEach.call(doc.querySelectorAll('[data-tabs]'), function (box) {
      var list = box.querySelector('[role="tablist"]');
      if (list && list.closest('[hidden]') && box._select) box._select(list.querySelector('[role="tab"]'));
      if (box._move) box._move();
    });
    syncProto();
  }

  function setTheme(t) {
    theme = t === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    store.set(KEYS.theme, theme);
    syncProto();
  }
  function setRole(r) {
    role = r === 'admin' ? 'admin' : 'super';
    root.setAttribute('data-role', role);
    store.set(KEYS.role, role);
    applyVisibility();
  }
  function setState(s) {
    doc.body.setAttribute('data-state', s);
    applyVisibility();
    icons();
  }
  function syncProto() {
    var vals = { role: role, theme: theme, state: doc.body.getAttribute('data-state') || 'data' };
    Array.prototype.forEach.call(doc.querySelectorAll('[data-proto]'), function (b) {
      b.setAttribute('aria-pressed', String(vals[b.getAttribute('data-proto')] === b.value));
    });
    var sum = doc.querySelector('[data-proto-sum]');
    if (sum) {
      var names = { data: 'datos', loading: 'cargando', empty: 'vacío', error: 'error' };
      sum.textContent = (role === 'super' ? 'SUPER_ADMIN' : 'ADMIN') + ' · ' + (theme === 'light' ? 'claro' : 'oscuro') + ' · ' + names[vals.state];
    }
  }

  /* ---------- sidebar ---------- */
  function syncSidebar() {
    root.setAttribute('data-sb', sbState());
    var btn = doc.getElementById('sb-toggle');
    if (!btn) return;
    var rail = root.getAttribute('data-sb') === 'rail';
    btn.setAttribute('aria-label', rail ? 'Expandir menú' : 'Contraer menú');
    btn.setAttribute('aria-expanded', String(!rail));
    btn.setAttribute('data-tip', rail ? 'Expandir menú' : 'Contraer menú');
  }
  function toggleSidebar() {
    var next = root.getAttribute('data-sb') === 'rail' ? 'open' : 'rail';
    if (mqDesk.matches) { sbPref = next; store.set(KEYS.sb, next); } else if (mqTab.matches) { tabletOpen = next === 'open'; }
    syncSidebar();
    hideTip();
  }

  /* ---------- tabs ---------- */
  function initTabs() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-tabs]'), function (box) {
      var list = box.querySelector('[role="tablist"]');
      if (!list) return;
      var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
      var ink = doc.createElement('span');
      ink.className = 'tabs-ink no-anim';
      ink.setAttribute('aria-hidden', 'true');
      list.appendChild(ink);
      list.classList.add('has-ink');
      function move() {
        var t = list.querySelector('[aria-selected="true"]');
        if (!t || !t.offsetWidth) { ink.style.transform = 'translateX(0) scaleX(0)'; return; }
        ink.style.transform = 'translateX(' + t.offsetLeft + 'px) scaleX(' + t.offsetWidth + ')';
      }
      function select(tab, focus) {
        if (!tab) return;
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var p = t.getAttribute('aria-controls') && doc.getElementById(t.getAttribute('aria-controls'));
          if (p) p.hidden = !on;
        });
        move();
        if (focus) tab.focus();
        box.dispatchEvent(new CustomEvent('tabchange', { bubbles: true, detail: { tab: tab } }));
      }
      tabs.forEach(function (t) {
        t.addEventListener('click', function () { select(t, false); });
        t.addEventListener('keydown', function (e) {
          var i = tabs.indexOf(t), n = null;
          if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
          if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
          if (e.key === 'Home') n = tabs[0];
          if (e.key === 'End') n = tabs[tabs.length - 1];
          if (n) { e.preventDefault(); select(n, true); }
        });
      });
      box._move = move;
      box._select = select;
      select(list.querySelector('[aria-selected="true"]') || tabs[0], false);
      window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { ink.classList.remove('no-anim'); }); });
      if (window.ResizeObserver) new ResizeObserver(move).observe(list);
    });
  }
  function moveAllInks() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-tabs]'), function (b) { if (b._move) b._move(); });
  }

  /* ---------- overlays ---------- */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var modalStack = [];
  var openFloat = null;
  var ctx = { flags: [], values: {} };

  function visibleFocusables(scope) {
    return Array.prototype.filter.call(scope.querySelectorAll(FOCUSABLE), function (el) {
      return !el.closest('[hidden]') && el.offsetParent !== null;
    });
  }

  function readCtx(trigger) {
    var c = { flags: [], values: {} };
    if (!trigger) return c;
    c.flags = tokens(trigger.getAttribute('data-ctx'));
    Array.prototype.forEach.call(trigger.attributes, function (a) {
      if (a.name.indexOf('data-ctx-') === 0) c.values[a.name.slice(9)] = a.value;
    });
    return c;
  }
  function applyCtx(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('[data-if], [data-if-not]'), function (el) {
      var ok = roleOK(el);
      if (ok && el.hasAttribute('data-if')) ok = tokens(el.getAttribute('data-if')).some(function (f) { return ctx.flags.indexOf(f) > -1; });
      if (ok && el.hasAttribute('data-if-not')) ok = !tokens(el.getAttribute('data-if-not')).some(function (f) { return ctx.flags.indexOf(f) > -1; });
      el.hidden = !ok;
    });
    Array.prototype.forEach.call(scope.querySelectorAll('[data-disable-if]'), function (el) {
      var dis = tokens(el.getAttribute('data-disable-if')).some(function (f) { return ctx.flags.indexOf(f) > -1; });
      if (dis) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
    });
    Array.prototype.forEach.call(scope.querySelectorAll('[data-fill]'), function (el) {
      var k = el.getAttribute('data-fill');
      if (ctx.values[k] == null) return;
      if (el.matches('input, textarea, select')) el.value = ctx.values[k]; else el.textContent = ctx.values[k];
    });
  }

  function ownsExpanded(el, ov) {
    return !!(el && el.getAttribute && ov.id && el.hasAttribute('aria-expanded') && el.getAttribute('data-open') === '#' + ov.id);
  }
  function lockScroll() { doc.body.style.overflow = modalStack.length ? 'hidden' : ''; }

  function openModal(ov, returnTo) {
    if (!ov.hidden && ov.getAttribute('data-state') === 'open') return;
    closeFloat(false);
    if (!ov.querySelector(':scope > .scrim')) {
      var s = doc.createElement('div');
      s.className = 'scrim';
      ov.insertBefore(s, ov.firstChild);
    }
    var panel = ov.querySelector('.dialog, .sheet');
    if (panel && !panel.querySelector(':scope > .ov-handle')) {
      var h = doc.createElement('div');
      h.className = 'ov-handle';
      h.setAttribute('aria-hidden', 'true');
      panel.insertBefore(h, panel.firstChild);
      bindDrag(h, ov, panel);
    }
    resetForms(ov);
    applyCtx(ov);
    ov._returnTo = returnTo || doc.activeElement;
    ov.hidden = false;
    void ov.offsetWidth;
    ov.setAttribute('data-state', 'open');
    modalStack.push(ov);
    lockScroll();
    if (ownsExpanded(returnTo, ov)) returnTo.setAttribute('aria-expanded', 'true');
    var target = ov.querySelector('[autofocus]') || visibleFocusables(ov.querySelector('.ov-body') || ov)[0] || visibleFocusables(ov)[0];
    if (target) target.focus({ preventScroll: true });
    icons();
  }

  function closeModal(ov) {
    if (ov.hidden) return;
    ov.setAttribute('data-state', 'closing');
    modalStack = modalStack.filter(function (m) { return m !== ov; });
    lockScroll();
    var back = ov._returnTo;
    if (ownsExpanded(back, ov)) back.setAttribute('aria-expanded', 'false');
    window.setTimeout(function () {
      if (ov.getAttribute('data-state') !== 'closing') return;
      ov.hidden = true;
      ov.removeAttribute('data-state');
      var p = ov.querySelector('.dialog, .sheet');
      if (p) p.style.transform = '';
    }, 170);
    if (back && back.focus && doc.contains(back)) back.focus({ preventScroll: true });
  }

  function resetForms(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('[data-confirm-match]'), function (inp) {
      inp.value = '';
      var b = doc.querySelector(inp.getAttribute('data-confirm-target'));
      if (b) b.disabled = true;
    });
    Array.prototype.forEach.call(scope.querySelectorAll('form[data-validate]'), function (f) {
      f.reset();
      Array.prototype.forEach.call(f.querySelectorAll('.field.is-invalid'), function (fl) { clearFieldError(fl); });
    });
    Array.prototype.forEach.call(scope.querySelectorAll('select[data-switch]'), applySwitch);
    Array.prototype.forEach.call(scope.querySelectorAll('textarea[data-count]'), updateCount);
  }

  function bindDrag(handle, ov, panel) {
    var startY = 0, dy = 0, dragging = false;
    handle.addEventListener('pointerdown', function (e) {
      dragging = true; startY = e.clientY; dy = 0;
      panel.style.transition = 'none';
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      panel.style.transform = 'translateY(' + dy + 'px)';
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      panel.style.transition = '';
      if (dy > 80 && !ov.hasAttribute('data-static')) closeModal(ov);
      else panel.style.transform = '';
    }
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function positionFloat(el, trigger) {
    var r = trigger.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var w = el.offsetWidth, h = el.offsetHeight;
    var alignStart = el.getAttribute('data-align') === 'start';
    var left = alignStart ? r.left : r.right - w;
    left = Math.max(8, Math.min(left, vw - w - 8));
    var top = r.bottom + 4;
    if (top + h > vh - 8 && r.top - h - 4 > 8) top = r.top - h - 4;
    top = Math.max(8, Math.min(top, vh - h - 8));
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
  }

  function openFloatEl(el, trigger) {
    if (openFloat === el) { closeFloat(true); return; }
    closeFloat(false);
    ctx = readCtx(trigger);
    applyCtx(el);
    el.hidden = false;
    el._trigger = trigger;
    positionFloat(el, trigger);
    void el.offsetWidth;
    el.setAttribute('data-state', 'open');
    openFloat = el;
    trigger.setAttribute('aria-expanded', 'true');
    icons();
    var first = el.matches('.menu') ? menuItems(el)[0] : visibleFocusables(el)[0];
    if (first) first.focus({ preventScroll: true });
  }

  function closeFloat(returnFocus) {
    var el = openFloat;
    if (!el) return;
    openFloat = null;
    el.removeAttribute('data-state');
    el.hidden = true;
    if (el._trigger) {
      el._trigger.setAttribute('aria-expanded', 'false');
      if (returnFocus) el._trigger.focus({ preventScroll: true });
    }
  }

  function menuItems(menu) {
    return Array.prototype.filter.call(menu.querySelectorAll('.menu-item'), function (i) {
      return !i.hidden && !i.closest('[hidden]') && i.getAttribute('aria-disabled') !== 'true';
    });
  }

  function openTarget(target, trigger, returnTo) {
    if (target.matches('.menu, .popover')) openFloatEl(target, trigger);
    else if (target.matches('.overlay')) {
      if (trigger && !trigger.closest('.menu')) ctx = readCtx(trigger);
      openModal(target, returnTo || trigger);
    }
  }
  function closeHost(host) {
    if (host.matches('.overlay')) closeModal(host);
    else if (host === openFloat) closeFloat(true);
  }

  /* ---------- toasts ---------- */
  var TONE_ICON = { success: 'circle-check', warning: 'triangle-alert', danger: 'circle-alert', info: 'info', brand: 'check' };
  function toast(title, tone, desc) {
    tone = tone || 'success';
    var region = doc.querySelector('.toasts');
    if (!region) {
      region = doc.createElement('div');
      region.className = 'toasts';
      region.setAttribute('aria-live', 'polite');
      doc.body.appendChild(region);
    }
    var t = doc.createElement('div');
    t.className = 'toast toast-' + tone;
    t.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
    t.innerHTML = '<i data-lucide="' + (TONE_ICON[tone] || 'info') + '"></i>' +
      '<div><div class="toast-title">' + esc(title) + '</div>' + (desc ? '<div class="toast-desc">' + esc(desc) + '</div>' : '') + '</div>' +
      '<div class="toast-actions"><button class="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Cerrar aviso"><i data-lucide="x"></i></button></div>';
    region.appendChild(t);
    icons();
    var gone = false;
    function dismiss() {
      if (gone) return;
      gone = true;
      t.classList.add('is-leaving');
      window.setTimeout(function () { t.remove(); }, 170);
    }
    t.querySelector('button').addEventListener('click', dismiss);
    window.setTimeout(dismiss, 5000);
  }

  /* ---------- tooltip ---------- */
  var tipEl = null, tipTimer = 0, tipFor = null;
  function showTip(el) {
    var rail = el.hasAttribute('data-tip-rail');
    if (rail && root.getAttribute('data-sb') !== 'rail') return;
    if (rail && mqMob.matches) return;
    var text = el.getAttribute('data-tip') ||
      (el.querySelector('.nav-label, .sb-user-name') || {}).textContent;
    if (!text) return;
    window.clearTimeout(tipTimer);
    tipTimer = window.setTimeout(function () {
      if (!tipEl) {
        tipEl = doc.createElement('div');
        tipEl.className = 'tooltip';
        tipEl.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(tipEl);
      }
      tipEl.textContent = text;
      tipEl.removeAttribute('data-state');
      tipEl.style.display = 'block';
      var r = el.getBoundingClientRect();
      var w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      var left, top;
      if (rail) { left = r.right + 8; top = r.top + (r.height - h) / 2; }
      else {
        left = r.left + (r.width - w) / 2;
        top = r.bottom + 6;
        if (top + h > window.innerHeight - 8) top = r.top - h - 6;
      }
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      tipEl.style.left = Math.round(left) + 'px';
      tipEl.style.top = Math.round(top) + 'px';
      void tipEl.offsetWidth;
      tipEl.setAttribute('data-state', 'open');
      tipFor = el;
    }, rail ? 0 : 400);
  }
  function hideTip() {
    window.clearTimeout(tipTimer);
    tipFor = null;
    if (tipEl) { tipEl.removeAttribute('data-state'); tipEl.style.display = 'none'; }
  }

  /* ---------- forms ---------- */
  function fieldOf(inp) { return inp.closest('.field'); }
  function setFieldError(inp, msg) {
    var field = fieldOf(inp);
    if (!field) return;
    field.classList.add('is-invalid');
    inp.setAttribute('aria-invalid', 'true');
    var err = field.querySelector('.field-error');
    if (!err) {
      err = doc.createElement('p');
      err.className = 'field-error';
      err.id = (inp.id || 'f' + Math.random().toString(36).slice(2)) + '-error';
      var help = field.querySelector('.field-help, .field-foot');
      if (help) field.insertBefore(err, help); else field.appendChild(err);
    }
    err.innerHTML = '<i data-lucide="circle-alert"></i><span></span>';
    err.lastChild.textContent = msg;
    var d = tokens(inp.getAttribute('aria-describedby'));
    if (d.indexOf(err.id) < 0) { d.push(err.id); inp.setAttribute('aria-describedby', d.join(' ')); }
  }
  function clearFieldError(field) {
    field.classList.remove('is-invalid');
    var inp = field.querySelector('[aria-invalid]');
    var err = field.querySelector('.field-error');
    if (inp) {
      inp.removeAttribute('aria-invalid');
      if (err) {
        var d = tokens(inp.getAttribute('aria-describedby')).filter(function (x) { return x !== err.id; });
        if (d.length) inp.setAttribute('aria-describedby', d.join(' ')); else inp.removeAttribute('aria-describedby');
      }
    }
    if (err && !err.hasAttribute('data-static')) err.remove();
  }
  function checkInput(inp) {
    var v = inp.value.trim();
    if (inp.required && !v) return inp.getAttribute('data-error-required') || 'Este campo es obligatorio.';
    if (v && inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return inp.getAttribute('data-error-format') || 'Introduce un email válido.';
    if (v && inp.minLength > 0 && v.length < inp.minLength) return inp.getAttribute('data-error-format') || ('Mínimo ' + inp.minLength + ' caracteres.');
    return null;
  }
  function setLoading(btn, on) {
    if (!btn) return;
    var label = btn.getAttribute('data-loading-label');
    var node = null;
    Array.prototype.forEach.call(btn.childNodes, function (n) { if (n.nodeType === 3 && n.textContent.trim()) node = n; });
    if (on) {
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      if (label && node) { btn._label = node.textContent; node.textContent = label; }
    } else {
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
      if (btn._label && node) { node.textContent = btn._label; btn._label = null; }
    }
  }
  function applySwitch(sel) {
    var key = sel.getAttribute('data-switch');
    var scope = sel.closest('form, .overlay, .page') || doc;
    Array.prototype.forEach.call(scope.querySelectorAll('[data-case^="' + key + ':"]'), function (el) {
      el.hidden = el.getAttribute('data-case') !== key + ':' + sel.value;
    });
  }
  function updateCount(ta) {
    var field = fieldOf(ta);
    var out = field && field.querySelector('.field-count');
    if (!out) return;
    var max = ta.maxLength > 0 ? ta.maxLength : 0;
    out.textContent = ta.value.length + '/' + max;
    out.classList.toggle('is-near', max && ta.value.length >= max * 0.9);
  }

  /* ---------- filter chips ---------- */
  function syncFilterCount(scope) {
    if (!scope) return;
    var n = scope.querySelectorAll('.filter-chip').length;
    Array.prototype.forEach.call(scope.querySelectorAll('[data-filter-count]'), function (c) {
      c.textContent = n; c.hidden = n === 0;
    });
    Array.prototype.forEach.call(scope.querySelectorAll('[data-clear-chips]'), function (b) { b.hidden = n === 0; });
  }

  /* ---------- selection ---------- */
  function syncSelection(table) {
    var rows = table.querySelectorAll('[data-select-row]');
    var n = 0;
    Array.prototype.forEach.call(rows, function (cb) {
      var tr = cb.closest('tr');
      if (tr) tr.classList.toggle('is-selected', cb.checked);
      if (cb.checked) n++;
    });
    var all = table.querySelector('[data-select-all]');
    if (all) { all.checked = n > 0 && n === rows.length; all.indeterminate = n > 0 && n < rows.length; }
    var bar = table.id && doc.querySelector('.selection-bar[data-for="#' + table.id + '"]');
    if (bar) {
      bar.hidden = n === 0;
      var c = bar.querySelector('.selection-count');
      if (c) c.textContent = n === 1 ? '1 seleccionado' : n + ' seleccionados';
    }
  }

  /* ---------- events ---------- */
  function onClick(e) {
    var el = e.target;
    if (!(el instanceof Element)) return;

    var proto = el.closest('[data-proto]');
    if (proto) {
      var k = proto.getAttribute('data-proto');
      if (k === 'role') setRole(proto.value);
      if (k === 'theme') setTheme(proto.value);
      if (k === 'state') setState(proto.value);
      return;
    }
    var pill = el.closest('.proto-pill');
    if (pill) {
      var panel = doc.getElementById('proto-panel');
      panel.hidden = !panel.hidden;
      pill.setAttribute('aria-expanded', String(!panel.hidden));
      return;
    }

    var disabled = el.closest('[aria-disabled="true"]');
    if (disabled) { e.preventDefault(); return; }

    var menuItem = el.closest('.menu .menu-item');
    var opener = el.closest('[data-open]');
    var closer = el.closest('[data-close]');
    var toaster = el.closest('[data-toast]');

    if (menuItem) {
      var menu = menuItem.closest('.menu');
      var menuTrigger = menu._trigger;
      closeFloat(!opener);
      if (opener) {
        var t1 = doc.querySelector(opener.getAttribute('data-open'));
        if (t1) { e.preventDefault(); openTarget(t1, opener, menuTrigger); }
      }
    } else if (opener) {
      var t2 = doc.querySelector(opener.getAttribute('data-open'));
      if (t2) { e.preventDefault(); openTarget(t2, opener); }
    }
    if (closer) {
      var host = closer.closest('.overlay, .menu, .popover');
      if (host) closeHost(host);
    }
    if (toaster) toast(toaster.getAttribute('data-toast'), toaster.getAttribute('data-toast-tone'), toaster.getAttribute('data-toast-desc'));
    if (el.closest('[data-theme-toggle]')) setTheme(theme === 'dark' ? 'light' : 'dark');
    if (el.closest('[data-sb-toggle]')) toggleSidebar();

    var seg = el.closest('.segmented .seg-btn');
    if (seg && !seg.hasAttribute('role')) {
      Array.prototype.forEach.call(seg.parentNode.querySelectorAll('.seg-btn'), function (b) {
        var on = b === seg;
        b.setAttribute('aria-pressed', String(on));
        var p = b.getAttribute('data-panel') && doc.querySelector(b.getAttribute('data-panel'));
        if (p) p.hidden = !on;
      });
      moveAllInks();
    }

    var rm = el.closest('[data-remove-chip]');
    if (rm) {
      var bar = rm.closest('.toolbar');
      var chip = rm.closest('.filter-chip');
      var next = chip && (chip.nextElementSibling && chip.nextElementSibling.querySelector('button') || bar.querySelector('.input'));
      if (chip) chip.remove();
      syncFilterCount(bar);
      if (next) next.focus();
    }
    var clear = el.closest('[data-clear-chips]');
    if (clear) {
      var tb = clear.closest('.toolbar');
      Array.prototype.forEach.call(tb.querySelectorAll('.filter-chip'), function (c) { c.remove(); });
      syncFilterCount(tb);
      var s = tb.querySelector('.input');
      if (s) s.focus();
    }

    var retry = el.closest('[data-set-state]');
    if (retry) {
      setLoading(retry, true);
      window.setTimeout(function () { setLoading(retry, false); setState(retry.getAttribute('data-set-state')); }, 700);
    }
    var refresh = el.closest('[data-refresh-label]');
    if (refresh) {
      setLoading(refresh, true);
      window.setTimeout(function () {
        setLoading(refresh, false);
        Array.prototype.forEach.call(refresh.childNodes, function (n) {
          if (n.nodeType === 3 && n.textContent.trim()) n.textContent = refresh.getAttribute('data-refresh-label');
        });
      }, 600);
    }

    var clearSel = el.closest('[data-clear-selection]');
    if (clearSel) {
      var tbl = doc.querySelector(clearSel.closest('.selection-bar').getAttribute('data-for'));
      if (tbl) {
        Array.prototype.forEach.call(tbl.querySelectorAll('[data-select-row], [data-select-all]'), function (c) { c.checked = false; });
        syncSelection(tbl);
      }
    }

    var sortBtn = el.closest('.th-sort');
    if (sortBtn) {
      var th = sortBtn.closest('th');
      var cur = th.getAttribute('aria-sort');
      Array.prototype.forEach.call(th.parentNode.querySelectorAll('th[aria-sort]'), function (o) { if (o !== th) o.setAttribute('aria-sort', 'none'); });
      th.setAttribute('aria-sort', cur === 'ascending' ? 'descending' : 'ascending');
    }

    var row = el.closest('tr[data-href]');
    if (row && !el.closest('a, button, input, select, textarea, label, [data-open]')) {
      window.location.href = row.getAttribute('data-href');
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      if (openFloat) { e.preventDefault(); closeFloat(true); return; }
      var top = modalStack[modalStack.length - 1];
      if (top) { e.preventDefault(); closeModal(top); return; }
      var panel = doc.getElementById('proto-panel');
      if (panel && !panel.hidden) { panel.hidden = true; var pl = doc.querySelector('.proto-pill'); pl.setAttribute('aria-expanded', 'false'); pl.focus(); }
      return;
    }
    if (openFloat && openFloat.matches('.menu')) {
      var items = menuItems(openFloat);
      var i = items.indexOf(doc.activeElement);
      var n = null;
      if (e.key === 'ArrowDown') n = items[(i + 1) % items.length];
      if (e.key === 'ArrowUp') n = items[(i - 1 + items.length) % items.length];
      if (e.key === 'Home') n = items[0];
      if (e.key === 'End') n = items[items.length - 1];
      if (n) { e.preventDefault(); n.focus(); return; }
      if (e.key === 'Tab') { closeFloat(true); return; }
    }
    if (e.key === 'Tab' && modalStack.length) {
      var ov = modalStack[modalStack.length - 1];
      var f = visibleFocusables(ov);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === first || !ov.contains(doc.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (doc.activeElement === last || !ov.contains(doc.activeElement))) { e.preventDefault(); first.focus(); }
    }
    if ((e.key === 'Enter') && e.target.matches && e.target.matches('tr[data-href]')) {
      window.location.href = e.target.getAttribute('data-href');
    }
  }

  function onPointerDown(e) {
    if (openFloat && !openFloat.contains(e.target) && !(openFloat._trigger && openFloat._trigger.contains(e.target))) closeFloat(false);
    var panel = doc.getElementById('proto-panel');
    if (panel && !panel.hidden && !e.target.closest('.proto')) {
      panel.hidden = true;
      doc.querySelector('.proto-pill').setAttribute('aria-expanded', 'false');
    }
  }

  function onScrimClick(e) {
    if (!e.target.classList || !e.target.classList.contains('scrim')) return;
    var ov = e.target.closest('.overlay');
    if (ov && !ov.hasAttribute('data-static')) closeModal(ov);
  }

  function onInput(e) {
    var t = e.target;
    if (t.matches('[data-confirm-match]')) {
      var b = doc.querySelector(t.getAttribute('data-confirm-target'));
      if (b) b.disabled = t.value !== t.getAttribute('data-confirm-match');
    }
    if (t.matches('textarea[data-count]')) updateCount(t);
    var field = t.closest && t.closest('.field.is-invalid');
    if (field && !checkInput(t)) clearFieldError(field);
  }

  function onChange(e) {
    var t = e.target;
    if (t.matches('select[data-switch]')) applySwitch(t);
    if (t.matches('[data-select-all]')) {
      var table = t.closest('table');
      Array.prototype.forEach.call(table.querySelectorAll('[data-select-row]'), function (c) { c.checked = t.checked; });
      syncSelection(table);
    }
    if (t.matches('[data-select-row]')) syncSelection(t.closest('table'));
  }

  function onSubmit(e) {
    var f = e.target;
    if (!f.matches('form[data-validate]')) return;
    e.preventDefault();
    var firstBad = null;
    Array.prototype.forEach.call(f.querySelectorAll('input, select, textarea'), function (inp) {
      if (inp.closest('[hidden]')) return;
      var msg = checkInput(inp);
      var field = fieldOf(inp);
      if (msg) { setFieldError(inp, msg); if (!firstBad) firstBad = inp; }
      else if (field && field.classList.contains('is-invalid')) clearFieldError(field);
    });
    icons();
    if (firstBad) { firstBad.focus(); return; }
    var btn = e.submitter || doc.querySelector('[form="' + f.id + '"][type="submit"]') || f.querySelector('[type="submit"]');
    setLoading(btn, true);
    window.setTimeout(function () {
      setLoading(btn, false);
      var ov = f.closest('.overlay');
      if (ov) closeModal(ov);
      var msg = f.getAttribute('data-success-toast');
      if (f.querySelector('select[data-switch]') && f.getAttribute('data-success-toast-alt')) {
        var sw = f.querySelector('select[data-switch]');
        if (sw.selectedIndex > 0) msg = f.getAttribute('data-success-toast-alt');
      }
      if (msg) toast(msg, 'success');
    }, 800);
  }

  function onPointerOver(e) {
    var el = e.target.closest && e.target.closest('[data-tip], [data-tip-rail]');
    if (el && el !== tipFor) showTip(el);
    if (!el && tipFor) hideTip();
  }
  function onFocusIn(e) {
    var el = e.target.closest && e.target.closest('[data-tip], [data-tip-rail]');
    if (el && e.target.matches(':focus-visible')) showTip(el); else hideTip();
  }

  /* ---------- boot ---------- */
  function boot() {
    buildShell();
    applyVisibility();
    syncSidebar();
    initTabs();
    Array.prototype.forEach.call(doc.querySelectorAll('select[data-switch]'), applySwitch);
    Array.prototype.forEach.call(doc.querySelectorAll('textarea[data-count]'), updateCount);
    Array.prototype.forEach.call(doc.querySelectorAll('.toolbar'), syncFilterCount);
    Array.prototype.forEach.call(doc.querySelectorAll('table[data-selectable]'), syncSelection);
    Array.prototype.forEach.call(doc.querySelectorAll('tr[data-href]'), function (tr) { tr.classList.add('row-link'); });
    icons();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(moveAllInks);

    doc.addEventListener('click', onClick);
    doc.addEventListener('click', onScrimClick);
    doc.addEventListener('keydown', onKeydown);
    doc.addEventListener('pointerdown', onPointerDown);
    doc.addEventListener('input', onInput);
    doc.addEventListener('change', onChange);
    doc.addEventListener('submit', onSubmit);
    doc.addEventListener('pointerover', onPointerOver);
    doc.addEventListener('focusin', onFocusIn);
    doc.addEventListener('focusout', hideTip);
    window.addEventListener('scroll', function () {
      hideTip();
      if (openFloat && openFloat._trigger) positionFloat(openFloat, openFloat._trigger);
    }, { passive: true, capture: true });
    window.addEventListener('resize', function () { closeFloat(false); hideTip(); });
    var onMQ = function () { syncSidebar(); moveAllInks(); };
    [mqDesk, mqTab, mqMob].forEach(function (mq) {
      if (mq.addEventListener) mq.addEventListener('change', onMQ); else mq.addListener(onMQ);
    });
    var shell = doc.querySelector('.shell');
    if (shell) shell.addEventListener('transitionend', moveAllInks);
    if (params.open) {
      var pre = doc.getElementById(params.open);
      if (pre && pre.matches('.overlay')) openModal(pre, null);
    }
  }

  window.Proto = { toast: toast, icons: icons, setState: setState, setRole: setRole, setTheme: setTheme };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
