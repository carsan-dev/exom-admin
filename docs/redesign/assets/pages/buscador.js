/* Buscador global (P13): maqueta estática con una demo mínima en el marco grande.
 * Sin dependencias. Tema: misma clave que proto.js. Todos los datos son de demostración. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ---------- tema (antes del primer pintado) ---------- */
  var THEME_KEY = 'exom-proto-theme';
  var stored = null;
  try { stored = window.localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
  var urlTheme = null;
  try { urlTheme = new URLSearchParams(window.location.search).get('theme'); } catch (e) { /* ignore */ }
  root.setAttribute('data-theme', (urlTheme || stored) === 'light' ? 'light' : 'dark');

  /* ---------- datos de demostración ---------- */
  var SCREENS = [
    { l: 'Dashboard', i: 'layout-dashboard', g: 'Inicio', to: '/dashboard' },
    { l: 'Clientes', ls: 'Usuarios', i: 'users', g: 'Seguimiento', to: '/clients', tos: '/users' },
    { l: 'Servicio base', i: 'mail', g: 'Seguimiento', to: '/base-service' },
    { l: 'Progreso', i: 'trending-up', g: 'Seguimiento', to: '/progress' },
    { l: 'Feedback', i: 'message-square', g: 'Seguimiento', to: '/feedback', c: 4 },
    { l: 'Recaps', i: 'file-text', g: 'Seguimiento', to: '/recaps', c: 7 },
    { l: 'Asignaciones', i: 'calendar-days', g: 'Planificación', to: '/assignments' },
    { l: 'Entrenamientos', i: 'clipboard-list', g: 'Planificación', to: '/trainings' },
    { l: 'Dietas', i: 'utensils-crossed', g: 'Planificación', to: '/diets' },
    { l: 'Ejercicios', i: 'dumbbell', g: 'Catálogo', to: '/exercises' },
    { l: 'Ingredientes', i: 'apple', g: 'Catálogo', to: '/ingredients' },
    { l: 'Etiquetas', i: 'tags', g: 'Catálogo', to: '/badges' },
    { l: 'Retos', i: 'trophy', g: 'Motivación', to: '/challenges' },
    { l: 'Logros', i: 'award', g: 'Motivación', to: '/achievements' },
    { l: 'Notificaciones', i: 'bell', g: 'Comunicación', to: '/notifications' },
    { l: 'Plantillas', i: 'settings', g: 'Comunicación', to: '/notification-templates', sa: true },
    { l: 'Solicitudes', i: 'shield-check', g: 'Control', to: '/approval-requests', c: 3, cs: true }
  ];
  var ACTIONS = [
    { l: 'Nueva plantilla', i: 'plus', to: '/notification-templates', sa: true },
    { l: 'Enviar notificación', i: 'send', to: '/notifications' },
    { l: 'Ver solicitudes pendientes', i: 'shield-check', to: '/approval-requests?status=PENDING' },
    { l: 'Ver feedback pendiente', i: 'message-square', to: '/feedback?status=PENDING' },
    { l: 'Ver recaps enviados', i: 'file-text', to: '/recaps?status=SUBMITTED' }
  ];
  var CLIENTS = [
    { id: 'c01', n: 'Sergio Prol', m: 'sergio.prol@correo.es', a: 'SP' },
    { id: 'c02', n: 'Elena Proença', m: 'elena.proenca@correo.es', a: 'EP' },
    { id: 'c03', n: 'Lucía Martínez', m: 'lucia.martinez@correo.es', a: 'LM' },
    { id: 'c04', n: 'Javier Ortega', m: 'javier.ortega@correo.es', a: 'JO' },
    { id: 'c05', n: 'Marta Ruiz', m: 'marta.ruiz@correo.es', a: 'MR' },
    { id: 'c06', n: 'Carla Núñez', m: 'carla.nunez@correo.es', a: 'CN' }
  ];
  var SYMBOL_PATH = 'M46 110C20 106 0 84 0 56C0 33 14 12 35 3C48-2 60 4 62 16C66 29 57 39 44 39C36 39 28 35 23 28C11 38 5 51 7 65C9 86 24 103 46 109Z';
  var SYMBOL = '<svg class="brand-symbol" viewBox="0 0 120 112" aria-hidden="true" focusable="false">' +
    '<path class="half-a" d="' + SYMBOL_PATH + '"/>' +
    '<path class="half-b" transform="rotate(180 60 56)" d="' + SYMBOL_PATH + '"/></svg>';

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function matchAt(text, q) { return q ? norm(text).indexOf(norm(q)) : -1; }
  function hl(text, q) {
    var i = matchAt(text, q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<b class="pal-m">' + esc(text.slice(i, i + q.length)) + '</b>' + esc(text.slice(i + q.length));
  }
  function icon(name) { return '<i data-lucide="' + name + '"></i>'; }
  function screenLabel(s, role) { return s.ls && role !== 'admin' ? s.ls : s.l; }
  function screenTo(s, role) { return s.tos && role !== 'admin' ? s.tos : s.to; }
  function icons(scope) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ root: scope || doc, attrs: { 'stroke-width': 1.6 } });
    }
  }

  /* ---------- modelo de resultados ---------- */
  // cfg: { p, q, role, clients: ok|loading|error, active, mobile }
  function build(cfg) {
    var q = (cfg.q || '').trim();
    var sup = cfg.role !== 'admin';
    var n = 0, count = 0, htmlGroups = [], ids = [], tos = [];
    function oid() { var id = cfg.p + '-o' + n; ids.push(id); n++; return id; }
    function sel(i) { return i === cfg.active ? 'true' : 'false'; }

    var screens = SCREENS.filter(function (s) { return (!s.sa || sup) && (!q || matchAt(screenLabel(s, cfg.role), q) > -1); });
    var actions = ACTIONS.filter(function (a) { return (!a.sa || sup) && (!q || matchAt(a.l, q) > -1); });

    function group(id, title, rows) {
      return '<div class="pal-group" role="group" aria-labelledby="' + cfg.p + '-' + id + '">' +
        '<p class="pal-gh micro" id="' + cfg.p + '-' + id + '">' + title + '</p>' + rows + '</div>';
    }
    function row(i, label, sec, to, cls) {
      var k = n;
      var id = oid();
      tos.push(to);
      return '<div class="pal-opt' + (cls ? ' ' + cls : '') + '" role="option" id="' + id + '" data-i="' + k + '" aria-selected="' + sel(k) + '">' +
        icon(i) + '<span class="pal-l">' + label + '</span>' + (sec ? '<span class="pal-s">' + esc(sec) + '</span>' : '') + '</div>';
    }

    if (screens.length) {
      htmlGroups.push(group('g1', 'Ir a', screens.map(function (s, si) {
        count++;
        if (cfg.maxScreens && si >= cfg.maxScreens) return '';
        return row(s.i, hl(screenLabel(s, cfg.role), q), s.g, screenTo(s, cfg.role));
      }).join('')));
    }
    if (actions.length) {
      htmlGroups.push(group('g2', 'Acciones', actions.map(function (a) {
        count++;
        return row(a.i, hl(a.l, q), a.to, a.to);
      }).join('')));
    }

    var clientsOn = q.length >= 2;
    var clientsHtml = '';
    if (clientsOn) {
      if (cfg.clients === 'loading') {
        var sk = '';
        for (var s = 0; s < 3; s++) {
          sk += '<div class="pal-sk" aria-hidden="true"><span class="sk-circle"></span><span class="pal-sk-text"><span class="sk-line" style="--w:' + (46 + s * 8) + '%"></span><span class="sk-line" style="--w:' + (66 - s * 6) + '%"></span></span></div>';
        }
        clientsHtml = '<div class="pal-group" role="group" aria-busy="true" aria-labelledby="' + cfg.p + '-g3"><p class="pal-gh micro" id="' + cfg.p + '-g3">Clientes</p>' + sk + '</div>';
      } else if (cfg.clients === 'error') {
        var k = n, eid = oid();
        tos.push('retry');
        clientsHtml = '<div class="pal-group" role="group" aria-labelledby="' + cfg.p + '-g3"><p class="pal-gh micro" id="' + cfg.p + '-g3">Clientes</p>' +
          '<div class="pal-err" role="option" id="' + eid + '" data-i="' + k + '" aria-selected="' + sel(k) + '">' + icon('circle-alert') +
          '<span class="pal-l" role="alert">No se pudieron buscar clientes</span>' +
          '<span class="btn btn-secondary btn-sm">' + icon('rotate-cw') + 'Reintentar</span></div></div>';
      } else {
        var found = CLIENTS.filter(function (c) { return matchAt(c.n, q) > -1 || matchAt(c.m, q) > -1; }).slice(0, 5);
        if (found.length) {
          var rows = found.map(function (c) {
            count++;
            var k2 = n, id2 = oid();
            tos.push((sup ? '/users/' : '/clients/') + c.id);
            return '<div class="pal-opt" role="option" id="' + id2 + '" data-i="' + k2 + '" aria-selected="' + sel(k2) + '">' +
              '<span class="avatar" aria-hidden="true">' + c.a + '</span>' +
              '<span class="pal-cl"><span class="pal-l">' + hl(c.n, q) + '</span><span class="pal-mail">' + hl(c.m, q) + '</span></span></div>';
          }).join('');
          var k3 = n, id3 = oid();
          tos.push(sup ? '/users' : '/clients');
          rows += '<div class="pal-opt pal-opt-all" role="option" id="' + id3 + '" data-i="' + k3 + '" aria-selected="' + sel(k3) + '">' +
            icon('arrow-right') + '<span class="pal-l">Ver todos en ' + (sup ? 'Usuarios' : 'Clientes') + '</span></div>';
          clientsHtml = group('g3', 'Clientes', rows);
        }
      }
    }
    if (clientsHtml) htmlGroups.push(clientsHtml);

    var html = htmlGroups.join('');
    if (!html) {
      html = '<div class="pal-empty">' + icon('search') +
        '<p class="pal-e-t">Sin resultados para “' + esc(q) + '”</p>' +
        '<p class="pal-e-h">Prueba con el nombre de una pantalla o de un cliente</p></div>';
    }
    var label = count === 0 ? 'Sin resultados' : count === 1 ? '1 resultado' : count + ' resultados';
    return { html: html, count: count, label: label, n: n, ids: ids, tos: tos };
  }

  function paletteHTML(cfg, mobile) {
    var r = build(cfg);
    var activeId = r.ids[cfg.active] || '';
    var input = '<input class="pal-input" type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" ' +
      'aria-controls="' + cfg.p + '-lb" aria-activedescendant="' + activeId + '" aria-label="Buscar" ' +
      'placeholder="' + (mobile ? 'Buscar…' : 'Buscar pantallas, acciones o clientes…') + '" value="' + esc(cfg.q) + '" autocomplete="off" spellcheck="false">';
    var list = '<div class="pal-list' + (cfg.fade ? ' is-faded' : '') + '" role="listbox" id="' + cfg.p + '-lb" aria-label="Resultados">' + r.html + '</div>';
    var live = '<span class="sr-only" role="status" aria-live="polite">' + r.label + '</span>';
    if (mobile) {
      return '<div class="bm-sheet" role="dialog" aria-modal="true" aria-label="Buscador">' +
        '<div class="bm-top"><div class="bm-field">' + icon('search') + input + '</div>' +
        '<button class="bm-cancel" type="button">Cancelar</button></div>' + list + live + '</div>';
    }
    return '<div class="pal" role="dialog" aria-modal="true" aria-label="Buscador">' +
      '<div class="pal-in">' + icon('search') + input + '<kbd class="kbd">Esc</kbd></div>' + list +
      '<div class="pal-foot"><span><kbd class="kbd">↑↓</kbd>navegar</span><span><kbd class="kbd">↵</kbd>abrir</span>' +
      '<span><kbd class="kbd">Esc</kbd>cerrar</span><span class="pal-count" role="status" aria-live="polite">' + r.label + '</span></div></div>';
  }

  /* ---------- shell del marco de escritorio ---------- */
  function sidebarHTML(role) {
    var groups = [], cur = null;
    SCREENS.forEach(function (s) {
      if (!cur || cur.g !== s.g) { cur = { g: s.g, items: [] }; groups.push(cur); }
      cur.items.push(s);
    });
    var nav = groups.map(function (g, gi) {
      var items = g.items.map(function (s) {
        var cnt = s.c ? '<span class="count"' + (s.cs ? ' data-sa' : '') + '>' + s.c + '</span>' : '';
        return '<li' + (s.sa ? ' data-sa' : '') + '><a class="nav-item" href="#" tabindex="-1"' + (s.l === 'Dashboard' ? ' aria-current="page"' : '') + '>' +
          icon(s.i) + '<span class="nav-label"' + (s.ls ? ' data-sidebar-clients' : '') + '>' + esc(screenLabel(s, role)) + '</span>' + cnt + '</a></li>';
      }).join('');
      return '<div class="sb-group">' + (g.g !== 'Inicio' ? '<p class="sb-group-label micro">' + g.g + '</p>' : '') + '<ul>' + items + '</ul></div>';
    }).join('');
    return '<aside class="sidebar" aria-hidden="true"><div class="sb-brand">' + SYMBOL +
      '<span class="wordmark">E<span>X</span>OM</span><span class="micro">Admin</span></div>' +
      '<nav class="sb-nav">' + nav + '</nav>' +
      '<div class="sb-foot"><div class="sb-user"><span class="avatar avatar-28">MS</span><span class="sb-user-text"><span class="sb-user-name">Moisés Sánchez</span>' +
      '<span class="sb-user-role micro" data-sa-role>Super Admin</span></span>' + icon('chevrons-up-down') + '</div></div></aside>';
  }
  function pageHTML() {
    var av = function (a) { return '<span class="avatar avatar-32" aria-hidden="true">' + a + '</span>'; };
    var feed = function (ic, a, name, desc, t) {
      return '<li><span class="feed-row">' + icon(ic) + av(a) + '<span class="feed-text"><span class="feed-name">' + name + '</span>' +
        '<span class="feed-desc">' + desc + '</span></span><span class="feed-time">' + t + '</span></span></li>';
    };
    return '<div class="bf-page" aria-hidden="true">' +
      '<header class="page-header"><div class="ph-main"><h1 class="h1">Dashboard</h1>' +
      '<p class="ph-sub">Hola, Moisés. Aquí tienes el resumen ejecutivo de tu operación en EXOM.</p></div></header>' +
      '<div class="stack-48"><div class="ledger">' +
      '<span class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Recaps pendientes</span></span><span class="fig">7</span><span class="ledger-sub">Pendientes de revisión</span></span>' +
      '<span class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Feedback pendiente</span></span><span class="fig">4</span><span class="ledger-sub">Feedback por responder</span></span>' +
      '<span class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Cuentas bloqueadas</span></span><span class="fig">1</span><span class="ledger-sub">Requieren atención inmediata</span></span>' +
      '<span class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Clientes activos</span></span><span class="fig">42</span><span class="ledger-sub">46 clientes visibles</span></span>' +
      '</div>' +
      '<div class="split"><section class="section"><div class="section-head"><div><h2 class="h2">Actividad reciente</h2>' +
      '<p class="section-sub">Últimos movimientos relevantes de tus clientes.</p></div></div><ul class="feed">' +
      feed('file-text', 'LM', 'Lucía Martínez', 'Ha enviado su recap semanal con 3 fotos de progreso.', 'hace 3 horas') +
      feed('message-square', 'JO', 'Javier Ortega', 'Ha enviado feedback de Pierna B con 2 vídeos.', 'hace 4 horas') +
      feed('dumbbell', 'MR', 'Marta Ruiz', 'Ha completado Torso A: 6 ejercicios, 22 series.', 'hace 5 horas') +
      feed('user-plus', 'CN', 'Carla Núñez', 'Nueva cliente dada de alta.', 'hace 7 horas') +
      '</ul></section><section class="section"><div class="section-head"><div><h2 class="h2">Top clientes</h2>' +
      '<p class="section-sub">Ranking semanal por días completados.</p></div></div><ol class="rank">' +
      '<li><span class="rank-row"><span class="rank-pos">1</span>' + av('MR') + '<span class="rank-main"><span class="feed-name">Marta Ruiz</span></span></span></li>' +
      '<li><span class="rank-row"><span class="rank-pos">2</span>' + av('LM') + '<span class="rank-main"><span class="feed-name">Lucía Martínez</span></span></span></li>' +
      '<li><span class="rank-row"><span class="rank-pos">3</span>' + av('JO') + '<span class="rank-main"><span class="feed-name">Javier Ortega</span></span></span></li>' +
      '</ol></section></div></div></div>';
  }
  function headerHTML() {
    return '<header class="header"><span class="btn btn-ghost btn-icon">' + icon('panel-left-close') + '</span>' +
      '<nav class="crumbs" aria-label="Ruta de navegación"><ol><li><span aria-current="page">Dashboard</span></li></ol></nav>' +
      '<button class="hd-search" type="button" aria-haspopup="dialog" aria-expanded="false" aria-keyshortcuts="Control+K Meta+K">' +
      icon('search') + '<span>Buscar…</span><kbd class="kbd" data-kbd>Ctrl K</kbd></button>' +
      '<button class="btn btn-ghost btn-icon" type="button" data-theme-toggle aria-label="Cambiar tema">' +
      '<i data-lucide="sun" class="theme-icon-dark"></i><i data-lucide="moon" class="theme-icon-light"></i></button></header>';
  }

  function mountDesk(el, cfg) {
    el.innerHTML = '<div class="bf-shell">' + sidebarHTML(cfg.role) + '<div class="shell-main">' + headerHTML() + pageHTML() + '</div></div>' +
      '<div class="bf-veil">' + paletteHTML(cfg, false) + '</div>';
    if (!el.hasAttribute('data-live')) {
      var trig = el.querySelector('.hd-search');
      trig.setAttribute('aria-expanded', 'true');
    }
  }
  function mountMini(el, cfg) { el.innerHTML = paletteHTML(cfg, false); }
  function mountMobile(el, cfg) { el.innerHTML = paletteHTML(cfg, true); }

  /* Panel «Más» con «Buscar» como primer elemento */
  function mountMore(el) {
    var role = 'super';
    var byGroup = {};
    SCREENS.forEach(function (s) { (byGroup[s.g] = byGroup[s.g] || []).push(s); });
    function item(s) {
      return '<li><a class="nav-item" href="#" tabindex="-1">' + icon(s.i) + '<span class="nav-label">' + esc(screenLabel(s, role)) + '</span>' +
        (s.c && s.cs ? '<span class="count">' + s.c + '</span>' : '') + '</a></li>';
    }
    var order = ['Seguimiento', 'Planificación', 'Catálogo'];
    var groups = '<div class="sb-group"><ul>' +
      '<li><a class="nav-item is-new" href="#" tabindex="-1">' + icon('search') + '<span class="nav-label">Buscar</span><span class="proposal-tag">Propuesta</span></a></li>' +
      item(byGroup.Control[0]) + '</ul></div>' +
      order.map(function (g) {
        return '<div class="sb-group"><p class="sb-group-label micro">' + g + '</p><ul>' + byGroup[g].map(item).join('') + '</ul></div>';
      }).join('');
    var tab = function (ic, l, cur) { return '<span class="tab-item' + (cur ? ' is-current' : '') + '"' + (cur ? ' aria-expanded="true"' : '') + '>' + icon(ic) + '<span>' + l + '</span></span>'; };
    el.innerHTML = '<div class="bm-pagebg" aria-hidden="true">' +
      '<header class="mtopbar">' + '<span class="mtopbar-brand">' + SYMBOL + '<span class="wordmark">E<span>X</span>OM</span></span><span class="avatar avatar-32">MS</span></header>' +
      '<div class="bm-body"><h1 class="h1">Dashboard</h1><div class="ledger" style="margin-top:20px">' +
      '<span class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Recaps</span></span><span class="fig">7</span></span>' +
      '<span class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Feedback</span></span><span class="fig">4</span></span>' +
      '</div></div>' +
      '<nav class="tabbar">' + tab('layout-dashboard', 'Dashboard', false) + tab('message-square', 'Feedback', false) + tab('file-text', 'Recaps', false) +
      tab('trending-up', 'Progreso', false) + tab('menu', 'Más', true) + '</nav></div>' +
      '<div class="bm-veil"></div>' +
      '<div class="bm-more" role="dialog" aria-modal="true" aria-label="Menú"><div class="bm-more-head"><h2 class="h2">Menú</h2>' +
      '<span class="btn btn-ghost btn-icon">' + icon('x') + '</span></div><nav class="bm-more-body more-nav" aria-label="Todas las secciones">' + groups + '</nav></div>';
  }

  /* ---------- demo interactiva (marco grande) ---------- */
  function initLive(el) {
    var cfg = JSON.parse(el.getAttribute('data-pal'));
    var st = { q: cfg.q, role: cfg.role, clients: 'ok', active: 0, open: true };
    var timers = [];
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    function c() { return { p: 'live', q: st.q, role: st.role, clients: st.clients, active: st.active }; }
    mountDesk(el, c());
    var veil = el.querySelector('.bf-veil');
    var trig = el.querySelector('.hd-search');
    var input = el.querySelector('.pal-input');
    var list = el.querySelector('.pal-list');
    var count = el.querySelector('.pal-count');
    var status = doc.getElementById('live-status');
    var kbd = el.querySelector('[data-kbd]');
    if (mac && kbd) kbd.textContent = '⌘ K';
    trig.setAttribute('aria-expanded', 'true');

    var last = { tos: [], ids: [], n: 0 };
    function paint() {
      var r = build(c());
      if (st.active >= r.n) st.active = Math.max(0, r.n - 1);
      r = build(c());
      last = r;
      list.innerHTML = r.html;
      count.textContent = r.label;
      input.setAttribute('aria-activedescendant', r.ids[st.active] || '');
      icons(list);
      var a = list.querySelector('[aria-selected="true"]');
      if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    }
    function setActive(i) {
      st.active = i;
      Array.prototype.forEach.call(list.querySelectorAll('[role="option"]'), function (o) {
        o.setAttribute('aria-selected', String(Number(o.getAttribute('data-i')) === i));
      });
      input.setAttribute('aria-activedescendant', last.ids[i] || '');
    }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function onInput() {
      st.q = input.value;
      st.active = 0;
      clearTimers();
      if (st.q.trim().length >= 2) {
        st.clients = 'loading';
        // debounce de 250 ms + petición simulada
        timers.push(setTimeout(function () {
          timers.push(setTimeout(function () { st.clients = 'ok'; paint(); }, 450));
        }, 250));
      } else {
        st.clients = 'ok';
      }
      paint();
    }
    function open() {
      st.open = true; veil.hidden = false; trig.setAttribute('aria-expanded', 'true');
      input.focus(); input.select();
    }
    function close() {
      st.open = false; veil.hidden = true; trig.setAttribute('aria-expanded', 'false'); clearTimers();
      trig.focus();
    }
    function choose(i) {
      var to = last.tos[i];
      if (!to) return;
      if (to === 'retry') {
        st.clients = 'loading'; paint();
        timers.push(setTimeout(function () { st.clients = 'ok'; paint(); }, 600));
        return;
      }
      status.textContent = 'Abriría: ' + to + ' (demostración, no navega).';
      close();
    }
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!last.n) return;
        var next = e.key === 'ArrowDown' ? (st.active + 1) % last.n : (st.active - 1 + last.n) % last.n;
        setActive(next);
        var a = list.querySelector('[aria-selected="true"]');
        if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault(); choose(st.active);
      } else if (e.key === 'Escape') {
        e.preventDefault(); close();
      } else if (e.key === 'Tab') {
        e.preventDefault(); // foco atrapado: el campo es el único elemento tabulable
      }
    });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('mousemove', function (e) {
      var o = e.target.closest && e.target.closest('[role="option"]');
      if (o) { var i = Number(o.getAttribute('data-i')); if (i !== st.active) setActive(i); }
    });
    list.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('[role="option"]');
      if (o) choose(Number(o.getAttribute('data-i')));
    });
    veil.addEventListener('mousedown', function (e) { if (e.target === veil) { e.preventDefault(); close(); } });
    trig.addEventListener('click', function () { if (st.open) close(); else open(); });
    doc.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        if (st.open) close(); else open();
      }
    });

    // Rol de la demostración
    Array.prototype.forEach.call(doc.querySelectorAll('[data-bs-role]'), function (b) {
      b.addEventListener('click', function () {
        st.role = b.getAttribute('data-bs-role');
        Array.prototype.forEach.call(doc.querySelectorAll('[data-bs-role]'), function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        Array.prototype.forEach.call(el.querySelectorAll('[data-sa]'), function (x) { x.hidden = st.role === 'admin'; });
        var lab = el.querySelector('[data-sidebar-clients]');
        if (lab) lab.textContent = st.role === 'admin' ? 'Clientes' : 'Usuarios';
        var rl = el.querySelector('[data-sa-role]');
        if (rl) rl.textContent = st.role === 'admin' ? 'Admin' : 'Super Admin';
        st.active = 0; paint();
      });
    });
  }

  /* ---------- arranque ---------- */
  function init() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-desk]'), function (el) {
      if (el.hasAttribute('data-live')) initLive(el);
      else mountDesk(el, JSON.parse(el.getAttribute('data-pal')));
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-pal]:not([data-desk])'), function (el) { mountMini(el, JSON.parse(el.getAttribute('data-pal'))); });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-palm]'), function (el) { mountMobile(el, JSON.parse(el.getAttribute('data-palm'))); });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-more]'), mountMore);

    // Tema de la página
    Array.prototype.forEach.call(doc.querySelectorAll('[data-theme-toggle]'), function (b) {
      b.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        try { window.localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
      });
    });
    icons(doc);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
