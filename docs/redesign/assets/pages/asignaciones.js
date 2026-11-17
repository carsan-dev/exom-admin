/* Asignaciones: prototype behaviour (calendar, selection, editor, dialogs).
   Runs after proto.js has built the shell (DOMContentLoaded order). */
(function () {
  'use strict';

  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);

  /* ---------- dates ---------- */
  var WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var WD_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MO_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function D(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function monday(d) { var x = new Date(d); var w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); return x; }
  function isoWd(d) { return d.getDay() === 0 ? 7 : d.getDay(); }
  function short(d) { return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()]; }
  function long(d) { return WD_LONG[d.getDay()] + ', ' + d.getDate() + ' de ' + MO_LONG[d.getMonth()]; }
  function range(a, b) {
    if (a.getMonth() === b.getMonth()) return a.getDate() + ' – ' + b.getDate() + ' ' + MO[b.getMonth()] + ' ' + b.getFullYear();
    return a.getDate() + ' ' + MO[a.getMonth()] + ' – ' + b.getDate() + ' ' + MO[b.getMonth()] + ' ' + b.getFullYear();
  }
  function kcal(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kcal'; }
  var TODAY = D('2026-11-15');

  /* ---------- catalog + model ---------- */
  var T = {
    ta: { name: 'Torso A', min: 45, ex: 6, active: true },
    tb: { name: 'Torso B', min: 45, ex: 6, active: true },
    pa: { name: 'Pierna A', min: 50, ex: 6, active: true },
    pb: { name: 'Pierna B', min: 50, ex: 7, active: false },
    fc: { name: 'Full body C', min: 55, ex: 8, active: true },
    cs: { name: 'Cardio suave', min: 30, ex: 3, active: true }
  };
  var DI = {
    def: { name: 'Dieta de definición', kcal: 2000, meals: 5, p: 150, c: 200, tags: ['Definición', 'Alta en proteína'] },
    man: { name: 'Dieta de mantenimiento', kcal: 2400, meals: 4, p: 140, c: 280, tags: ['Mantenimiento'] }
  };
  var POLICY = [['AUTO', 'Automático'], ['ALWAYS', 'Siempre'], ['NEVER', 'Nunca']];
  var PATTERN = {
    1: { tr: ['ta'], diet: 'def' },
    2: { tr: ['pb'], diet: 'def' },
    3: { tr: ['cs'], diet: 'def' },
    4: { rest: true },
    5: { tr: ['fc', 'cs'], diet: 'def', mode: 'ANY' },
    6: { diet: 'man' }
  };
  function mk(p, auto) {
    return { rest: !!p.rest, tr: (p.tr || []).map(function (id) { return { id: id, policy: 'AUTO' }; }), diet: p.diet || '', mode: p.mode || 'ALL', auto: !!auto };
  }
  var model = {};
  (function seed() {
    var d = D('2026-10-26');
    var end = D('2026-12-06');
    while (d <= end) {
      var p = PATTERN[isoWd(d)];
      if (p) model[iso(d)] = mk(p, d >= D('2026-11-23'));
      d = add(d, 1);
    }
    // small history variations
    model['2026-11-03'] = mk({ tr: ['pa'], diet: 'def' });
    model['2026-11-10'] = mk({ tr: ['pa'], diet: 'def' });
    delete model['2026-10-31'];
    model['2026-11-29'] = mk({ tr: ['cs'] });
  })();
  function hasContent(x) { return !!(x && (x.rest || x.tr.length || x.diet)); }
  function clone(x) { return x ? JSON.parse(JSON.stringify(x)) : { rest: false, tr: [], diet: '', mode: 'ALL', auto: false }; }

  /* ---------- state ---------- */
  var st = {
    view: params.get('view') === 'month' ? 'month' : 'week',
    anchor: monday(D(params.get('date') || '2026-11-16')),
    sel: new Set(),
    client: 'Lucía Martínez',
    autoActive: true
  };
  if (st.view === 'month') { var a0 = D(params.get('date') || '2026-11-01'); st.anchor = new Date(a0.getFullYear(), a0.getMonth(), 1); }
  var selParam = params.get('sel');
  if (selParam) selParam.split(',').forEach(function (s) { st.sel.add(s.trim()); });
  function pState() { return doc.body.getAttribute('data-state') || 'data'; }
  function variant() { return doc.body.getAttribute('data-variant') || 'default'; }
  function dayData(isoS) { return pState() === 'empty' ? null : model[isoS]; }

  /* ---------- variants row in the prototype bar ---------- */
  function initVariants(list) {
    var cur = params.get('variant') || list[0][0];
    var panel = doc.getElementById('proto-panel');
    var btns = [];
    if (panel) {
      var row = doc.createElement('div');
      row.className = 'proto-row';
      row.innerHTML = '<span>Variante</span><div class="proto-opts"></div>';
      list.forEach(function (o) {
        var b = doc.createElement('button');
        b.type = 'button'; b.value = o[0]; b.textContent = o[1];
        b.addEventListener('click', function () { apply(o[0]); });
        row.lastChild.appendChild(b); btns.push(b);
      });
      panel.appendChild(row);
    }
    function apply(v) {
      doc.body.setAttribute('data-variant', v);
      $$('[data-v]').forEach(function (el) { el.hidden = el.getAttribute('data-v').split(/\s+/).indexOf(v) < 0; });
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.value === v)); });
      doc.dispatchEvent(new CustomEvent('variantchange', { detail: v }));
    }
    apply(cur);
  }

  /* ---------- open / close overlays through proto.js ---------- */
  var opener = doc.createElement('button');
  opener.type = 'button'; opener.hidden = true; doc.body.appendChild(opener);
  var suppress = false;
  function openOv(id, from) {
    var el = from || opener;
    var had = el.getAttribute('data-open');
    el.setAttribute('data-open', '#' + id);
    suppress = true;
    if (el === opener) { opener.hidden = false; }
    el.click();
    if (el === opener) { opener.hidden = true; }
    suppress = false;
    if (had === null) el.removeAttribute('data-open'); else el.setAttribute('data-open', had);
  }
  function closeOv(id) { var c = $('#' + id + ' [data-close]'); if (c) c.click(); }
  function busy(btn, ms, fn) {
    var label = btn.getAttribute('data-loading-label');
    var node = null;
    btn.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.textContent.trim()) node = n; });
    var old = node && node.textContent;
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    if (label && node) node.textContent = label;
    setTimeout(function () {
      btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
      if (node) node.textContent = old;
      fn();
    }, ms || 600);
  }
  function icons() { if (window.Proto) Proto.icons(); }
  function toast(t, tone, d) { if (window.Proto) Proto.toast(t, tone, d); }

  /* ---------- rendering: calendar ---------- */
  function visibleDays() {
    var out = [];
    if (st.view === 'week') { for (var i = 0; i < 7; i++) out.push(add(st.anchor, i)); }
    else {
      var first = st.anchor, start = monday(first);
      for (var j = 0; j < 42; j++) out.push(add(start, j));
    }
    return out;
  }
  function inPeriod(d) { return st.view === 'week' || d.getMonth() === st.anchor.getMonth(); }

  function weekCell(d) {
    var k = iso(d), x = dayData(k), sel = st.sel.has(k), today = +d === +TODAY;
    var body = '';
    if (!hasContent(x)) {
      body = '<button class="plan-btn" type="button" data-open="#sheet-editor" data-editor-date="' + k + '" aria-haspopup="dialog" aria-label="Planificar ' + long(d) + '"><i data-lucide="plus"></i>Planificar</button>';
    } else if (x.rest) {
      body = '<div class="wk-rest"><i data-lucide="pause"></i><b>Descanso</b><p>El cliente verá el estado de recuperación para este día.</p></div>';
    } else {
      if (x.tr.length > 1 && x.mode === 'ANY') body += '<div class="wk-mode"><span class="chip chip-info no-dot">Elegir uno</span></div>';
      x.tr.forEach(function (t, i) {
        var c = T[t.id];
        body += '<div class="wk-item"><div class="wk-item-name"><span class="n">' + (i + 1) + ' ·</span><span class="t">' + c.name + '</span></div>' +
          '<div class="wk-item-meta"><span>' + c.min + ' min</span>' + (c.active ? '' : '<span class="tag tag-warning">Retirado</span>') + '</div></div>';
      });
      if (x.diet) {
        var dd = DI[x.diet];
        body += '<div class="wk-item wk-diet"><i data-lucide="apple"></i><span class="t">' + dd.name + '</span><span class="k">' + kcal(dd.kcal) + '</span></div>';
      }
    }
    return '<div class="wk-day' + (sel ? ' is-selected' : '') + (today ? ' is-today' : '') + '">' +
      '<button class="day-toggle" type="button" data-toggle="' + k + '" aria-pressed="' + sel + '" aria-label="' + long(d) + (today ? ', hoy' : '') + '" aria-describedby="sum-' + k + ' as-hint-text"></button>' +
      '<div class="wk-head"><span><span class="micro">' + WD[d.getDay()] + (today ? ' · Hoy' : '') + '</span><span class="wk-num">' + d.getDate() + '</span>' +
      (today ? '<span class="proposal-tag" style="margin-top:6px">Propuesta</span>' : '') + '</span>' +
      '<span class="sel-mark" aria-hidden="true"><i data-lucide="check"></i></span></div>' +
      '<div class="wk-body" id="sum-' + k + '">' + body + '</div></div>';
  }

  function monthCell(d) {
    var k = iso(d), x = dayData(k), sel = st.sel.has(k), today = +d === +TODAY, out = !inPeriod(d);
    var ic = '', lines = '';
    if (hasContent(x)) {
      if (x.rest) { ic = '<i data-lucide="pause"></i>'; lines = '<span class="mo-line tr">Descanso</span>'; }
      else {
        if (x.tr.length) ic += '<i data-lucide="dumbbell"></i>';
        if (x.diet) ic += '<i data-lucide="apple"></i>';
        lines = (x.tr.length ? '<span class="mo-line tr">' + x.tr.map(function (t) { return T[t.id].name; }).join(' · ') + '</span>' : '<span class="mo-line tr text-3">Sin entreno</span>') +
          (x.diet ? '<span class="mo-line dt">' + DI[x.diet].name + '</span>' : '');
      }
    } else lines = '<span class="mo-line dt is-blank">Sin planificar</span>';
    if (out && !hasContent(x)) lines = '';
    return '<div class="mo-cell' + (sel ? ' is-selected' : '') + (today ? ' is-today' : '') + (out ? ' is-out' : '') + '">' +
      '<button class="day-toggle" type="button" data-toggle="' + k + '" aria-pressed="' + sel + '" aria-label="' + long(d) + (today ? ', hoy' : '') + '"' + (out ? ' tabindex="-1"' : '') + ' aria-describedby="msum-' + k + '"></button>' +
      '<div class="mo-top"><span class="mo-wd micro">' + WD[d.getDay()] + '</span><span class="mo-num">' + d.getDate() + '</span>' +
      (today ? '<span class="micro mo-today">Hoy</span>' : '') +
      '<span class="mo-icons" aria-hidden="true">' + ic + '</span><span class="sel-mark" aria-hidden="true"><i data-lucide="check"></i></span></div>' +
      '<span id="msum-' + k + '" style="display:contents">' + lines + '</span></div>';
  }

  function render() {
    var days = visibleDays();
    var cal = $('#cal');
    if (st.view === 'week') cal.innerHTML = '<div class="wk" role="group" aria-label="Semana ' + range(days[0], days[6]) + '">' + days.map(weekCell).join('') + '</div>';
    else cal.innerHTML = '<div class="mo" role="group" aria-label="Mes de ' + MO_LONG[st.anchor.getMonth()] + '"><div class="mo-head" aria-hidden="true">' +
      ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(function (l) { return '<span class="micro">' + l + '</span>'; }).join('') +
      '</div><div class="mo-grid">' + days.map(monthCell).join('') + '</div></div>';
    // period + labels
    $('#period-label').textContent = st.view === 'week' ? range(days[0], days[6]) : MO_LONG[st.anchor.getMonth()] + ' ' + st.anchor.getFullYear();
    $$('[data-step]').forEach(function (b) {
      var unit = st.view === 'week' ? 'Semana' : 'Mes';
      b.setAttribute('aria-label', unit + (b.getAttribute('data-step') === '1' ? ' siguiente' : ' anterior'));
    });
    $$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === st.view)); });
    var et = $('[data-empty-title]'); if (et) et.textContent = st.view === 'week' ? 'Semana sin planificación.' : 'Mes sin planificación.';
    var er = $('[data-err-title]'); if (er) er.textContent = st.view === 'week' ? 'No se ha podido cargar la semana' : 'No se ha podido cargar el mes';
    $$('[data-only-week]').forEach(function (b) { b.hidden = st.view !== 'week'; });
    // counts
    var tr = 0, di = 0, re = 0;
    days.forEach(function (d) {
      if (!inPeriod(d)) return;
      var x = dayData(iso(d));
      if (!hasContent(x)) return;
      if (x.rest) re++; else { if (x.tr.length) tr++; if (x.diet) di++; }
    });
    $('#as-counts').innerHTML =
      '<span class="as-count"><i data-lucide="dumbbell"></i><span><b>' + tr + '</b> ' + (tr === 1 ? 'día' : 'días') + ' con entreno</span></span>' +
      '<span class="as-count"><i data-lucide="apple"></i><span><b>' + di + '</b> ' + (di === 1 ? 'día' : 'días') + ' con dieta</span></span>' +
      '<span class="as-count"><i data-lucide="pause"></i><span><b>' + re + '</b> ' + (re === 1 ? 'descanso' : 'descansos') + '</span></span>';
    syncSelBar();
    icons();
  }

  function syncSelBar() {
    var n = st.sel.size;
    var bar = $('#selbar');
    var show = n > 0 && variant() !== 'noclient' && (pState() === 'data' || pState() === 'empty');
    bar.hidden = !show;
    doc.body.classList.toggle('has-sel', show);
    $('#sel-count').textContent = n === 1 ? '1 día seleccionado' : n + ' días seleccionados';
    var main = $('.sb-label-main');
    main.textContent = variant() === 'catalog' ? 'Marcar descanso' : (n === 1 ? 'Editar día' : 'Editar selección');
  }

  function skeleton() {
    var h = '';
    for (var i = 0; i < 7; i++) {
      h += '<div class="wk-day"><div class="wk-head"><span class="sk-line" style="--w:28px"></span><span class="sk-fig" style="--w:36px;height:24px;margin-top:8px"></span></div>' +
        '<div class="wk-body"><span class="sk-line" style="--w:' + (60 + (i * 7) % 30) + '%"></span><span class="sk-line" style="--w:40%"></span><span class="sk-line" style="--w:' + (50 + (i * 11) % 40) + '%;margin-top:10px"></span></div></div>';
    }
    $('#wk-sk').innerHTML = h;
  }

  /* ---------- client picker ---------- */
  var CLIENTS = [['LM', 'Lucía Martínez', 'lucia.martinez@example.com'], ['JO', 'Javier Ortega', 'javier.ortega@example.com'], ['MR', 'Marta Ruiz', 'marta.ruiz@example.com'],
    ['SG', 'Sara Gil', 'sara.gil@example.com'], ['CN', 'Carla Núñez', 'carla.nunez@example.com'], ['DV', 'Daniel Vega', 'daniel.vega@example.com'], ['PH', 'Pablo Herrera', 'pablo.herrera@example.com']];
  function renderClients(q) {
    q = (q || '').toLowerCase();
    $('#client-list').innerHTML = CLIENTS.filter(function (c) { return !q || (c[1] + c[2]).toLowerCase().indexOf(q) > -1; }).map(function (c) {
      var on = variant() !== 'noclient' && c[1] === st.client;
      return '<button class="opt" type="button" role="option" aria-selected="' + on + '" data-client="' + c[1] + '" data-av="' + c[0] + '">' +
        '<span class="avatar avatar-28" aria-hidden="true">' + c[0] + '</span><span><span>' + c[1] + '</span><span class="opt-sub">' + c[2] + '</span></span>' +
        '<i data-lucide="check" class="opt-check"></i></button>';
    }).join('') || '<p class="pv-none" style="padding:12px 16px">Sin resultados.</p>';
    icons();
  }
  function syncClientPick() {
    var b = $('#client-pick');
    var none = variant() === 'noclient';
    b.classList.toggle('is-empty', none);
    $('[data-cp-av]').hidden = none;
    $('[data-cp-name]').textContent = none ? 'Selecciona un cliente' : st.client;
    b.setAttribute('aria-label', none ? 'Selecciona un cliente' : 'Cliente: ' + st.client + '. Cambiar cliente');
    $$('[data-needs-client]').forEach(function (el) { el.hidden = none; });
  }
  function pickClient(name, av) {
    st.client = name;
    $('[data-cp-av]').textContent = av;
    if (variant() === 'noclient') setVariant('default');
    syncClientPick();
    render();
  }
  function setVariant(v) {
    var btn = $$('.proto-opts button').filter(function (b) { return b.value === v && !b.hasAttribute('data-proto'); })[0];
    if (btn) btn.click();
  }

  /* ---------- editor ---------- */
  function RULE_DAYS() { return [0, 1, 2, 3, 4, 5].map(function (i) { return iso(add(D('2026-11-23'), i)); }); }
  var ed = { mode: 'selection', days: [], drafts: {}, active: null, same: false, errors: {}, autoOn: false, autoUntil: false };
  function prepareEditor(mode, days) {
    ed.mode = mode;
    ed.days = days.slice().sort();
    ed.drafts = {}; ed.errors = {};
    ed.days.forEach(function (k) { ed.drafts[k] = clone(model[k]); });
    ed.active = ed.days[0];
    ed.same = false; $('#ed-same-cb').checked = false;
    ed.autoOn = mode === 'rule';
    ed.autoUntil = false;
    var n = ed.days.length;
    $('#ed-title').textContent = mode === 'rule' ? 'Editar autoasignación' : (n === 1 ? 'Editar día' : 'Editar selección');
    $('#ed-desc').textContent = mode === 'rule'
      ? 'Cambia el patrón semanal que se repite automáticamente para ' + st.client + '.'
      : (n === 1 ? 'Configura entrenamientos, dieta o descanso para este día.' : 'Configura entrenamientos, dieta o descanso para cada día seleccionado.');
    $('#ed-save').textContent = mode === 'rule' ? 'Guardar patrón' : 'Guardar planificación';
    $('#ed-same').hidden = n < 2;
    $('.ed-legend').hidden = mode === 'rule';
    $('#ed-rule-banner').hidden = mode !== 'rule';
    $('#ed-days-label').textContent = mode === 'rule' ? 'Patrón semanal' : (n === 1 ? '1 día seleccionado' : n + ' días seleccionados');
    renderEditor();
  }
  function existed(k) { return hasContent(model[k]); }
  function sumOf(x) {
    if (!hasContent(x)) return 'Vacío';
    if (x.rest) return 'Descanso';
    var p = [];
    if (x.tr.length) p.push(x.tr.length === 1 ? '1 entreno' : x.tr.length + ' entrenos');
    if (x.diet) p.push('dieta');
    return p.join(' + ');
  }
  function renderEditor() {
    $('#ed-daylist').innerHTML = ed.days.map(function (k) {
      var d = D(k);
      return '<button class="ed-day' + (ed.errors[k] ? ' has-error' : '') + '" type="button" data-ed-day="' + k + '" aria-current="' + (k === ed.active) + '">' +
        (existed(k) ? '<span class="dot" aria-hidden="true"></span>' : '<span class="dot-none" aria-hidden="true"></span>') +
        '<span>' + (ed.mode === 'rule' ? WD_LONG[d.getDay()] : short(d)) + (existed(k) && ed.mode !== 'rule' ? '<span class="sr-only">, ya existía</span>' : '') + '</span>' +
        '<span class="ed-day-sum">' + (ed.errors[k] ? 'Revisar' : sumOf(ed.drafts[k])) + '</span></button>';
    }).join('');
    renderMain();
    if (ed.mode === 'rule') {
      var keep = ed.days.filter(function (k) { return hasContent(ed.drafts[k]); }).map(function (k) { return WD_LONG[D(k).getDay()]; });
      $('#ed-rule-new').textContent = 'Patrón nuevo: ' + joinY(keep) + '.';
    }
    icons();
  }
  function joinY(a) { return a.length < 2 ? (a[0] || 'ninguno') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; }

  function renderMain() {
    var k = ed.active, x = ed.drafts[k], d = D(k);
    var single = ed.days.length === 1 && ed.mode !== 'rule';
    var h = '';
    h += '<div class="ed-dayhead"><h3 class="h2" id="ed-day-title">' + (ed.mode === 'rule' ? 'Cada ' + WD_LONG[d.getDay()] : long(d).replace(/^./, function (c) { return c.toUpperCase(); })) + '</h3>' +
      (existed(k) && ed.mode !== 'rule' ? '<span class="chip chip-neutral">Ya existía</span>' : '') + '</div>';
    if (ed.errors[k]) h += '<p class="field-error" role="alert" style="margin-top:12px"><i data-lucide="circle-alert"></i><span>' + ed.errors[k] + '</span></p>';
    if (single && existed(k)) {
      h += '<div class="field" style="max-width:240px"><label class="field-label" for="ed-date">Fecha</label><input class="input" id="ed-date" type="date" value="' + k + '"><p class="field-help">Mueve la asignación si necesitas cambiarla a otro día.</p></div>';
    } else if (ed.mode !== 'rule') {
      h += '<p class="secondary text-2" style="margin-top:8px">Fecha planificada: ' + short(d) + ' ' + d.getFullYear() + '</p>';
    }
    h += '<div class="seg-field"><span class="field-label" id="ed-mode-l">Modo de asignación</span>' +
      '<div class="segmented" role="group" aria-labelledby="ed-mode-l">' +
      '<button class="seg-btn" type="button" data-ed-mode="plan" aria-pressed="' + !x.rest + '"' + (variant() === 'catalog' ? ' disabled aria-disabled="true"' : '') + '>Entrenamiento y/o dieta</button>' +
      '<button class="seg-btn" type="button" data-ed-mode="rest" aria-pressed="' + x.rest + '">Día de descanso</button></div>' +
      '<p class="field-help">El descanso se aplica solo a este día y no cambia nada hasta que confirmes.</p></div>';
    if (x.rest) {
      h += '<div class="ed-rest-note"><i data-lucide="pause"></i><span><b class="h3">Día de descanso.</b> El cliente verá el estado de recuperación para este día. Se quitarán los entrenamientos y la dieta de esta fecha.</span></div>';
    } else {
      // trainings
      h += '<div class="ed-block"><div class="ed-block-head"><label class="field-label" for="tr-search">Entrenamientos</label><span class="caption">' + x.tr.length + '/5</span></div>' +
        '<div class="ed-search"><label class="input-icon"><span class="sr-only">Buscar entrenamiento</span><i data-lucide="search"></i>' +
        '<input class="input" id="tr-search" type="search" placeholder="Buscar entrenamiento…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="tr-results" aria-autocomplete="list"></label>' +
        '<div class="ed-results" id="tr-results" role="listbox" aria-label="Entrenamientos disponibles" hidden></div></div>' +
        '<p class="field-help" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">Los resultados aparecen al enfocar el buscador. <span class="proposal-tag">Propuesta</span></p>';
      if (x.tr.length) {
        h += '<div class="tr-cols"><span></span><span class="micro">#</span><span class="micro">Entrenamiento</span>' +
          '<span class="micro">Vídeo de la última serie <button type="button" data-tip="Automático sigue la configuración por defecto. Siempre: se pide vídeo de la última serie. Nunca: no se pide." aria-label="Qué significa la política de vídeo" aria-describedby="vp-help"><i data-lucide="info"></i></button></span><span></span></div>' +
          '<p class="sr-only" id="vp-help">Automático sigue la configuración por defecto. Siempre: se pide al cliente un vídeo de la última serie. Nunca: no se pide.</p>' +
          '<div class="tr-list" id="tr-list">' + x.tr.map(function (t, i) {
            var c = T[t.id];
            return '<div class="tr-row" draggable="true" data-idx="' + i + '">' +
              '<button class="tr-grip" type="button" data-grip="' + i + '" aria-label="Reordenar ' + c.name + ', posición ' + (i + 1) + ' de ' + x.tr.length + '. Usa las flechas arriba y abajo."><i data-lucide="grip-vertical"></i></button>' +
              '<span class="tr-n">' + (i + 1) + '</span>' +
              '<span class="tr-name"><span class="t">' + c.name + '</span><span class="caption">' + c.min + ' min</span>' + (c.active ? '' : '<span class="tag tag-warning">Retirado</span>') + '</span>' +
              '<span class="tr-policy"><select class="select" data-policy="' + i + '" aria-label="Política de vídeo para ' + c.name + '">' +
              POLICY.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === t.policy ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></span>' +
              '<button class="btn btn-ghost btn-icon btn-sm tr-x" type="button" data-rm-tr="' + i + '" aria-label="Quitar ' + c.name + '"><i data-lucide="x"></i></button></div>';
          }).join('') + '</div>' +
          '<div class="tr-foot"><span class="caption">' + x.tr.length + '/5 · Arrastra para reordenar</span></div>';
      } else {
        h += '<p class="tr-empty" style="margin-top:12px">Opcional si quieres asignar solo dieta o descanso.</p>';
      }
      h += '</div>';
      // diet
      h += '<div class="ed-block"><div class="field"><label class="field-label" for="ed-diet">Dieta</label>' +
        '<select class="select" id="ed-diet" style="max-width:440px"' + (variant() === 'catalog' ? ' disabled' : '') + '><option value="">Sin dieta</option>' +
        Object.keys(DI).map(function (id) { var di = DI[id]; return '<option value="' + id + '"' + (x.diet === id ? ' selected' : '') + '>' + di.name + ' · ' + kcal(di.kcal) + ' · ' + di.tags.join(', ') + '</option>'; }).join('') +
        '</select>' + (x.diet ? '<div class="diet-tags">' + DI[x.diet].tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</div>' : '') +
        '<p class="field-help">Opcional si quieres asignar solo entrenamiento o descanso.</p></div></div>';
      // completion mode
      if (x.tr.length > 1) {
        h += '<div class="ed-block seg-field"><span class="field-label" id="ed-cm-l">Modo de completado</span>' +
          '<div class="segmented" role="group" aria-labelledby="ed-cm-l">' +
          '<button class="seg-btn" type="button" data-ed-cm="ALL" aria-pressed="' + (x.mode !== 'ANY') + '">Completar todos</button>' +
          '<button class="seg-btn" type="button" data-ed-cm="ANY" aria-pressed="' + (x.mode === 'ANY') + '">Elegir uno</button></div>' +
          '<p class="field-help">Elegir uno: el día cuenta como completado al terminar cualquiera de los entrenamientos asignados.</p></div>';
      }
    }
    // auto-assign block (editor level)
    if (st.autoActive && ed.mode !== 'rule') {
      h += '<div class="banner banner-info"><i data-lucide="info"></i><span class="banner-text"><b>Edición puntual.</b> Este cambio solo afecta a las fechas seleccionadas. La autoasignación activa no se modificará.</span></div>';
    } else {
      var src = ed.mode === 'rule' ? D('2026-11-16') : monday(D(ed.days[0]));
      h += '<div class="ed-block auto-box"><h3 class="h3">Autoasignar semanalmente</h3>' +
        '<div><label class="switch"><input type="checkbox" role="switch" id="auto-on"' + (ed.autoOn ? ' checked' : '') + '>Activar</label>' +
        '<p class="field-help">Repite este patrón desde la semana siguiente. No sobrescribe días que ya estén planificados.</p></div>';
      if (ed.autoOn) {
        h += '<p class="auto-meta"><span>Patrón origen: <b>' + short(src) + '</b></span><span>Empieza: <b>' + short(add(src, 7)) + '</b></span></p>' +
          '<div class="seg-field"><span class="field-label" id="ed-dur-l">Duración</span><div class="segmented" role="group" aria-labelledby="ed-dur-l">' +
          '<button class="seg-btn" type="button" data-ed-dur="0" aria-pressed="' + !ed.autoUntil + '">Indefinida</button>' +
          '<button class="seg-btn" type="button" data-ed-dur="1" aria-pressed="' + ed.autoUntil + '">Hasta una fecha</button></div></div>' +
          (ed.autoUntil ? '<div class="field" style="max-width:240px"><label class="field-label" for="auto-end">Fecha fin</label><input class="input" id="auto-end" type="date" value="2026-12-31"><p class="field-help">La regla no generará asignaciones después de esta fecha.</p></div>' : '');
      }
      h += '</div>';
    }
    $('#ed-main').innerHTML = h;
  }

  function touch() { // propagate active draft to all when "same" is checked
    if (!ed.same) return;
    var src = ed.drafts[ed.active];
    ed.days.forEach(function (k) { if (k !== ed.active) ed.drafts[k] = clone(src); });
  }
  function showResults(q) {
    var x = ed.drafts[ed.active];
    var box = $('#tr-results'), inp = $('#tr-search');
    if (!box) return;
    q = (q || '').toLowerCase();
    var full = x.tr.length >= 5;
    var used = x.tr.map(function (t) { return t.id; });
    var list = Object.keys(T).filter(function (id) { return T[id].active && T[id].name.toLowerCase().indexOf(q) > -1; });
    box.innerHTML = list.map(function (id) {
      var dis = full || used.indexOf(id) > -1;
      return '<button class="opt" type="button" role="option" aria-selected="false" data-add-tr="' + id + '"' + (dis ? ' aria-disabled="true"' : '') + '>' +
        '<span><span>' + T[id].name + '</span><span class="opt-sub">' + T[id].min + ' min · ' + T[id].ex + ' ejercicios' + (used.indexOf(id) > -1 ? ' · ya añadido' : '') + '</span></span></button>';
    }).join('') + (list.length ? '' : '<p class="pv-none" style="padding:12px 16px">No hay resultados para "' + q + '"</p>') +
      (full ? '<p class="ed-results-foot">Máximo de 5 alcanzado</p>' : '');
    box.hidden = false; inp.setAttribute('aria-expanded', 'true');
  }
  function hideResults() { var b = $('#tr-results'); if (b) { b.hidden = true; $('#tr-search').setAttribute('aria-expanded', 'false'); } }

  function validate() {
    ed.errors = {};
    if (ed.mode === 'rule') return true;
    ed.days.forEach(function (k) { if (!hasContent(ed.drafts[k])) ed.errors[k] = 'Selecciona un entrenamiento, una dieta o marca descanso'; });
    var bad = Object.keys(ed.errors);
    if (bad.length) { ed.active = bad[0]; renderEditor(); $('#ed-foot-note').innerHTML = '<span class="text-2" style="color:var(--danger)">' + (bad.length === 1 ? '1 día sin contenido' : bad.length + ' días sin contenido') + '</span>'; return false; }
    $('#ed-foot-note').textContent = '';
    return true;
  }
  function commit() {
    ed.days.forEach(function (k) {
      var x = ed.drafts[k];
      if (hasContent(x)) { x.auto = false; model[k] = x; } else delete model[k];
    });
    st.sel.clear();
    render();
  }
  function save(btn) {
    if (!validate()) return;
    if (ed.mode === 'rule') {
      var removed = ed.days.filter(function (k) { return !hasContent(ed.drafts[k]); }).map(function (k) { return WD_LONG[D(k).getDay()]; });
      if (removed.length) {
        $('#pt-d').innerHTML = 'El nuevo patrón elimina los días <b>' + joinY(removed) + '</b>. ¿Confirmas la actualización?';
        openOv('dlg-pattern', btn);
        return;
      }
    }
    busy(btn, 700, function () {
      commit();
      closeOv('sheet-editor');
      toast(ed.mode === 'rule' ? 'Autoasignación actualizada' : 'Planificación guardada', 'success');
    });
  }

  /* ---------- preview ---------- */
  function renderPreview() {
    $('#pv-grid').innerHTML = ed.days.map(function (k) {
      var x = ed.drafts[k], d = D(k);
      var pills = [], tr = '', di = '';
      if (x.rest) pills.push('<span class="chip chip-neutral no-dot">Descanso</span>');
      else {
        if (x.tr.length) pills.push('<span class="chip chip-info no-dot">' + (x.tr.length === 1 ? '1 entreno asignado' : x.tr.length + ' entrenos asignados') + '</span>');
        if (x.diet) pills.push('<span class="chip chip-success no-dot">Dieta asignada</span>');
      }
      if (x.rest) tr = '<div class="pv-sec"><span class="micro">Descanso</span><p class="secondary text-2">El cliente verá el estado de recuperación para este día.</p></div>';
      else {
        tr = '<div class="pv-sec"><span class="micro">Entrenamiento</span>' + (x.tr.length ? (x.tr.length > 1 && x.mode === 'ANY' ? '<p class="caption" style="margin-bottom:4px">Elige uno de los siguientes</p>' : '') + '<ul>' + x.tr.map(function (t) {
          var c = T[t.id];
          return '<li><span>' + c.name + '</span><span class="caption">' + c.min + ' min · ' + c.ex + ' ejercicios</span></li>';
        }).join('') + '</ul>' : '<p class="pv-none">Sin entrenamiento asignado.</p>') + '</div>';
        di = '<div class="pv-sec"><span class="micro">Plan nutricional</span>' + (x.diet ? '<p class="h3">' + DI[x.diet].name + '</p><dl class="pv-macros">' +
          '<div><dt>Calorías</dt><dd>' + kcal(DI[x.diet].kcal) + '</dd></div><div><dt>Comidas</dt><dd>' + DI[x.diet].meals + '</dd></div>' +
          '<div><dt>Proteína</dt><dd>' + DI[x.diet].p + ' g</dd></div><div><dt>Carbohidratos</dt><dd>' + DI[x.diet].c + ' g</dd></div></dl>' : '<p class="pv-none">Sin dieta asignada.</p>') + '</div>';
      }
      return '<section class="pv-day" aria-label="' + long(d) + '"><p class="h3">' + long(d).replace(/^./, function (c) { return c.toUpperCase(); }) + '</p>' +
        '<p class="caption">Resumen de lo que verá el cliente en Home y Calendario.</p>' +
        '<div class="phone"><div class="phone-top"><span>' + short(d) + '</span><span>Calendario</span></div>' +
        '<div class="pv-pills">' + (pills.join('') || '<span class="chip chip-neutral no-dot">Sin planificación</span>') + '</div>' + tr + di + '</div></section>';
    }).join('');
  }

  /* ---------- copy week ---------- */
  var cw = { step: 1 };
  function cwSetStep(n) {
    cw.step = n;
    $('#cw-step1').hidden = n !== 1; $('#cw-step2').hidden = n !== 2;
    $('#cw-next').hidden = n !== 1; $('#cw-cancel').hidden = n !== 1;
    $('#cw-back').hidden = n !== 2; $('#cw-confirm').hidden = n !== 2;
    $('#cw-t').textContent = n === 1 ? 'Copiar semana' : 'Vista previa de copia semanal';
    $('#cw-d').textContent = n === 1 ? 'Configura la semana destino y revisa la vista previa antes de sobrescribir su planificación. Usa lunes como fecha de referencia.'
      : 'Revisa qué recibirá cada día de la semana destino antes de confirmar.';
    if (n === 2) cwPreview();
  }
  function cwInit() {
    var src = st.anchor;
    $('#cw-src').value = short(src) + ' ' + src.getFullYear();
    $('#cw-src-range').textContent = range(src, add(src, 6));
    $('#cw-dst').value = iso(add(src, 7));
    cwDstHelp();
    cwSetStep(1);
  }
  function cwDstHelp() {
    var v = $('#cw-dst').value, f = $('#cw-dst-field');
    var err = f.querySelector('.field-error'); if (err) err.remove();
    f.classList.remove('is-invalid'); $('#cw-dst').removeAttribute('aria-invalid');
    if (!v) return false;
    var d = D(v);
    $('#cw-dst-help').textContent = range(d, add(d, 6));
    var msg = d.getDay() !== 1 ? 'La semana destino debe comenzar en lunes' : (+d === +st.anchor ? 'Selecciona una semana distinta para copiar' : '');
    if (msg) {
      f.classList.add('is-invalid'); $('#cw-dst').setAttribute('aria-invalid', 'true');
      f.insertAdjacentHTML('beforeend', '<p class="field-error" role="alert"><i data-lucide="circle-alert"></i><span>' + msg + '</span></p>');
      icons(); return false;
    }
    return true;
  }
  function counts(days) {
    var t = 0, di = 0, r = 0;
    days.forEach(function (x) { if (!hasContent(x)) return; if (x.rest) r++; else { if (x.tr.length) t++; if (x.diet) di++; } });
    return [t, di, r];
  }
  function pillsOf(c, clear) {
    return '<span class="chip chip-info no-dot">' + c[0] + ' días con entreno</span><span class="chip chip-success no-dot">' + c[1] + ' días con dieta</span><span class="chip chip-neutral no-dot">' + c[2] + (c[2] === 1 ? ' descanso' : ' descansos') + '</span>' +
      (clear ? '<span class="chip chip-danger no-dot">' + clear + (clear === 1 ? ' día se limpiará' : ' días se limpiarán') + '</span>' : '');
  }
  function cwPreview() {
    var src = st.anchor, dst = D($('#cw-dst').value);
    var srcDays = [], clear = 0, cells = '';
    for (var i = 0; i < 7; i++) {
      var s = add(src, i), t = add(dst, i), x = dayData(iso(s));
      srcDays.push(x);
      var chips = '', names = '';
      if (!hasContent(x)) {
        if (hasContent(model[iso(t)])) { clear++; chips = '<span class="chip chip-danger no-dot">Se limpiará</span>'; } else chips = '<span class="chip chip-neutral no-dot">Sin planificación</span>';
        names = '<span class="text-3">El día destino quedará sin planificación</span>';
      }
      else if (x.rest) { chips = '<span class="chip chip-neutral no-dot">Descanso</span>'; }
      else {
        if (x.tr.length) chips += '<span class="chip chip-info no-dot">Entreno</span>';
        if (x.diet) chips += '<span class="chip chip-success no-dot">Dieta</span>';
        names = '<span class="names">' + x.tr.map(function (q) { return T[q.id].name; }).concat(x.diet ? [DI[x.diet].name] : []).join(' · ') + '</span>';
      }
      cells += '<div class="cw-day"><span class="h3">' + short(t) + '</span><span class="caption">Se copia desde ' + short(s) + '</span>' + chips + names + '</div>';
    }
    $('#cw-o-range').textContent = range(src, add(src, 6));
    $('#cw-d-range').textContent = range(dst, add(dst, 6));
    var c = counts(srcDays);
    $('#cw-o-pills').innerHTML = pillsOf(c, 0);
    $('#cw-d-pills').innerHTML = pillsOf(c, clear);
    $('#cw-grid').innerHTML = cells;
  }

  /* ---------- copy selection ---------- */
  function csRender() {
    var sel = Array.from(st.sel).sort();
    if (!sel.length) return;
    var first = D(sel[0]);
    var dst = D($('#cs-date').value || iso(add(first, 7)));
    var vis = visibleDays().filter(inPeriod).map(iso);
    $('#cs-list').innerHTML = sel.map(function (k) {
      var off = Math.round((D(k) - first) / 864e5);
      var t = add(dst, off), tk = iso(t), x = model[k];
      var src = !hasContent(x) ? 'Vacío (limpiará destino)' : x.rest ? 'Descanso' : x.tr.map(function (q) { return T[q.id].name; }).concat(x.diet ? [DI[x.diet].name] : []).join(' · ');
      var chip = vis.indexOf(tk) < 0 ? '<span class="chip chip-info">Destino fuera del período visible; se sobrescribirá si está ocupado</span>'
        : hasContent(model[tk]) ? '<span class="chip chip-warning">Destino ocupado: será sobrescrito</span>' : '<span class="chip chip-neutral">Destino vacío</span>';
      return '<li class="cs-row"><span class="map">' + short(D(k)) + ' → ' + short(t) + '</span><span class="src">' + src + '</span>' + chip + '</li>';
    }).join('');
    $('#cs-ok').textContent = sel.length === 1 ? 'Copiar 1 día' : 'Copiar ' + sel.length + ' días';
  }

  /* ---------- RIR ---------- */
  var seq = [3, 2, 1, 0];
  function renderSeq() {
    $('#rir-seq').innerHTML = seq.map(function (v, i) {
      return (i ? '<span class="seq-arrow" aria-hidden="true"><i data-lucide="arrow-right"></i></span>' : '') +
        '<div class="field"><label class="field-label" for="seq-' + i + '">Semana ' + (i + 1) + '</label><input class="input" id="seq-' + i + '" type="number" min="0" max="10" step="1" value="' + v + '" data-seq="' + i + '"></div>';
    }).join('');
    $('#seq-rm').disabled = seq.length <= 1;
    icons();
  }
  function rirStep(n) {
    $('#rir-edit').hidden = n === 2; $('#rir-preview').hidden = n !== 2;
    $('#rir-review').hidden = n === 2; $('#rir-confirm').hidden = n !== 2; $('#rir-back').hidden = n !== 2;
  }

  /* ---------- events ---------- */
  // Capture: prepare overlays before proto.js opens them
  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-open]');
    if (!t) return;
    var id = t.getAttribute('data-open');
    if (id === '#sheet-editor') {
      if (t.hasAttribute('data-editor-date')) prepareEditor('single', [t.getAttribute('data-editor-date')]);
      else if (t.getAttribute('data-editor') === 'rule') prepareEditor('rule', RULE_DAYS());
      else if (!suppress || !ed.days.length) prepareEditor('selection', st.sel.size ? Array.from(st.sel) : [iso(st.anchor)]);
      if (variant() === 'catalog' && t.id === 'sel-edit') ed.days.forEach(function (k) { ed.drafts[k] = clone(null); ed.drafts[k].rest = true; }), renderEditor();
      $('#ed-foot-note').textContent = '';
    }
    if (id === '#dlg-preview') renderPreview();
    if (id === '#dlg-copy-week') cwInit();
    if (id === '#dlg-copy-sel') { var s = Array.from(st.sel).sort(); if (s.length) $('#cs-date').value = iso(add(D(s[0]), st.view === 'week' ? 7 : 28)); csRender(); }
    if (id === '#dlg-clear') { var n = st.sel.size; $('[data-clear-n]').textContent = n === 1 ? '1 día' : n + ' días'; }
    if (id === '#sheet-rir') { rirStep(1); }
    if (id === '#pop-client') { renderClients(''); var si = $('[data-client-search]'); if (si) si.value = ''; }
  }, true);

  doc.addEventListener('click', function (e) {
    var el = e.target;
    if (!(el instanceof Element)) return;
    var tg = el.closest('[data-toggle]');
    if (tg && !suppress) {
      var k = tg.getAttribute('data-toggle');
      if (st.sel.has(k)) st.sel.delete(k); else st.sel.add(k);
      var cell = tg.parentNode;
      var on = st.sel.has(k);
      cell.classList.toggle('is-selected', on);
      tg.setAttribute('aria-pressed', String(on));
      syncSelBar();
      return;
    }
    var v = el.closest('[data-view]');
    if (v) {
      st.view = v.getAttribute('data-view');
      if (st.view === 'month') st.anchor = new Date(st.anchor.getFullYear(), st.anchor.getMonth(), Math.min(1, 1));
      else st.anchor = monday(st.sel.size ? D(Array.from(st.sel).sort()[0]) : (st.anchor.getMonth() === TODAY.getMonth() ? add(TODAY, 1) : st.anchor));
      render(); return;
    }
    var sp = el.closest('[data-step]');
    if (sp) {
      var n = +sp.getAttribute('data-step');
      st.anchor = st.view === 'week' ? add(st.anchor, 7 * n) : new Date(st.anchor.getFullYear(), st.anchor.getMonth() + n, 1);
      render(); return;
    }
    if (el.closest('[data-today]')) {
      st.anchor = st.view === 'week' ? monday(TODAY) : new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
      render(); return;
    }
    if (el.closest('[data-select-all]')) {
      visibleDays().filter(inPeriod).forEach(function (d) { st.sel.add(iso(d)); });
      render(); return;
    }
    if (el.closest('[data-clear-sel]')) { st.sel.clear(); render(); return; }
    var cl = el.closest('[data-client]');
    if (cl) {
      pickClient(cl.getAttribute('data-client'), cl.getAttribute('data-av'));
      doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }
    if (el.closest('[data-pick-first]')) { pickClient('Lucía Martínez', 'LM'); return; }
    var rc = el.closest('[data-retry-cat]');
    if (rc) { busy(rc, 700, function () { setVariant('default'); }); return; }

    // editor
    var dayBtn = el.closest('[data-ed-day]');
    if (dayBtn) { ed.active = dayBtn.getAttribute('data-ed-day'); renderEditor(); var b = $('[data-ed-day="' + ed.active + '"]'); if (b) b.focus(); return; }
    var mb = el.closest('[data-ed-mode]');
    if (mb && !mb.disabled) {
      var x = ed.drafts[ed.active];
      x.rest = mb.getAttribute('data-ed-mode') === 'rest';
      if (x.rest) { x.tr = []; x.diet = ''; }
      delete ed.errors[ed.active];
      touch(); renderEditor(); focusSel('[data-ed-mode="' + mb.getAttribute('data-ed-mode') + '"]'); return;
    }
    var cm = el.closest('[data-ed-cm]');
    if (cm) { ed.drafts[ed.active].mode = cm.getAttribute('data-ed-cm'); touch(); renderEditor(); focusSel('[data-ed-cm="' + cm.getAttribute('data-ed-cm') + '"]'); return; }
    var du = el.closest('[data-ed-dur]');
    if (du) { ed.autoUntil = du.getAttribute('data-ed-dur') === '1'; renderEditor(); focusSel('[data-ed-dur="' + du.getAttribute('data-ed-dur') + '"]'); return; }
    var at = el.closest('[data-add-tr]');
    if (at) {
      if (at.getAttribute('aria-disabled') === 'true') return;
      var xd = ed.drafts[ed.active];
      xd.tr.push({ id: at.getAttribute('data-add-tr'), policy: 'AUTO' });
      delete ed.errors[ed.active];
      touch(); renderEditor(); var si2 = $('#tr-search'); if (si2) si2.focus(); return;
    }
    var rm = el.closest('[data-rm-tr]');
    if (rm) { ed.drafts[ed.active].tr.splice(+rm.getAttribute('data-rm-tr'), 1); touch(); renderEditor(); focusSel('#tr-search'); return; }
    if (el.closest('#ed-save')) { save($('#ed-save')); return; }
    if (el.closest('#pt-ok')) {
      busy($('#pt-ok'), 700, function () { closeOv('dlg-pattern'); commit(); closeOv('sheet-editor'); toast('Autoasignación actualizada', 'success'); });
      return;
    }
    if (el.closest('#pv-confirm')) {
      if (!validate()) { closeOv('dlg-preview'); return; }
      busy($('#pv-confirm'), 700, function () { closeOv('dlg-preview'); commit(); closeOv('sheet-editor'); toast('Planificación guardada', 'success'); });
      return;
    }
    if (!el.closest('.ed-search')) hideResults();

    // copy week
    if (el.closest('#cw-next')) { if (cwDstHelp()) cwSetStep(2); else $('#cw-dst').focus(); return; }
    if (el.closest('#cw-back')) { cwSetStep(1); return; }
    if (el.closest('#cw-confirm')) {
      busy($('#cw-confirm'), 800, function () {
        var src = st.anchor, dst = D($('#cw-dst').value);
        for (var i = 0; i < 7; i++) {
          var x2 = model[iso(add(src, i))];
          if (hasContent(x2)) model[iso(add(dst, i))] = clone(x2); else delete model[iso(add(dst, i))];
        }
        closeOv('dlg-copy-week');
        st.anchor = dst; st.sel.clear(); render();
        toast('Semana copiada correctamente', 'success');
      });
      return;
    }
    if (el.closest('#cs-ok')) {
      busy($('#cs-ok'), 700, function () {
        var sel = Array.from(st.sel).sort(), first = D(sel[0]), dst2 = D($('#cs-date').value), cp = 0, clr = 0;
        sel.forEach(function (k2) {
          var t2 = iso(add(dst2, Math.round((D(k2) - first) / 864e5)));
          if (hasContent(model[k2])) { model[t2] = clone(model[k2]); cp++; } else { delete model[t2]; clr++; }
        });
        closeOv('dlg-copy-sel'); st.sel.clear(); render();
        toast(cp + (cp === 1 ? ' día copiado' : ' días copiados') + ' y ' + clr + (clr === 1 ? ' limpiado' : ' limpiados'), 'success');
      });
      return;
    }
    if (el.closest('#cl-ok')) {
      busy($('#cl-ok'), 700, function () {
        var n2 = st.sel.size;
        st.sel.forEach(function (k3) { delete model[k3]; });
        st.sel.clear(); closeOv('dlg-clear'); render();
        toast(n2 === 1 ? 'Día limpiado correctamente' : n2 + ' días limpiados correctamente', 'success');
      });
      return;
    }
    if (el.closest('#da-ok')) {
      busy($('#da-ok'), 700, function () {
        st.autoActive = false;
        Object.keys(model).forEach(function (k4) { if (model[k4].auto && D(k4) > TODAY) delete model[k4]; });
        var auto = $('.as-auto');
        auto.innerHTML = '<span class="chip chip-neutral">Sin autoasignación</span>';
        closeOv('dlg-deactivate'); render();
        toast('Autoasignación desactivada', 'success');
      });
      return;
    }
    // RIR
    if (el.closest('#seq-add')) { seq.push(0); renderSeq(); return; }
    if (el.closest('#seq-rm')) { if (seq.length > 1) seq.pop(); renderSeq(); return; }
    if (el.closest('#rir-review')) { rirStep(2); $('#rir-pv-t').scrollIntoView({ block: 'start' }); return; }
    if (el.closest('#rir-back')) { rirStep(1); return; }
    if (el.closest('#rir-confirm')) { busy($('#rir-confirm'), 800, function () { closeOv('sheet-rir'); toast('Mesociclo de RIR actualizado', 'success'); }); return; }
  });

  function focusSel(s) { var f = $(s); if (f) f.focus(); }

  doc.addEventListener('dblclick', function (e) {
    var tg = e.target.closest && e.target.closest('[data-toggle]');
    if (!tg) return;
    var k = tg.getAttribute('data-toggle');
    prepareEditor('single', [k]);
    openOv('sheet-editor', tg);
  });
  doc.addEventListener('keydown', function (e) {
    var tg = e.target.closest && e.target.closest('[data-toggle]');
    if (tg && e.key === 'Enter') {
      e.preventDefault();
      prepareEditor('single', [tg.getAttribute('data-toggle')]);
      openOv('sheet-editor', tg);
      return;
    }
    var grip = e.target.closest && e.target.closest('[data-grip]');
    if (grip && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      var i = +grip.getAttribute('data-grip'), list = ed.drafts[ed.active].tr, j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if (j < 0 || j >= list.length) return;
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
      touch(); renderEditor(); focusSel('[data-grip="' + j + '"]');
    }
    if (e.target.id === 'tr-search' && e.key === 'Escape' && !$('#tr-results').hidden) { e.stopPropagation(); hideResults(); }
  }, true);

  doc.addEventListener('focusin', function (e) { if (e.target.id === 'tr-search') showResults(e.target.value); });
  doc.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'tr-search') showResults(t.value);
    if (t.matches('[data-client-search]')) renderClients(t.value);
    if (t.id === 'cw-dst') cwDstHelp();
    if (t.id === 'cs-date') csRender();
    if (t.matches('[data-seq]')) seq[+t.getAttribute('data-seq')] = +t.value;
  });
  doc.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'ed-diet') { ed.drafts[ed.active].diet = t.value; delete ed.errors[ed.active]; touch(); renderEditor(); focusSel('#ed-diet'); }
    if (t.matches('[data-policy]')) { ed.drafts[ed.active].tr[+t.getAttribute('data-policy')].policy = t.value; touch(); }
    if (t.id === 'ed-same-cb') { ed.same = t.checked; touch(); renderEditor(); }
    if (t.id === 'auto-on') { ed.autoOn = t.checked; renderEditor(); focusSel('#auto-on'); }
    if (t.id === 'rir-cancel') $('#rir-cycle').hidden = t.checked;
  });

  // drag & drop reorder
  var dragIdx = null;
  doc.addEventListener('dragstart', function (e) {
    var r = e.target.closest && e.target.closest('.tr-row'); if (!r) return;
    dragIdx = +r.getAttribute('data-idx'); r.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragIdx));
  });
  doc.addEventListener('dragover', function (e) {
    var r = e.target.closest && e.target.closest('.tr-row'); if (!r || dragIdx === null) return;
    e.preventDefault();
    $$('.tr-row.is-over').forEach(function (o) { o.classList.remove('is-over'); });
    r.classList.add('is-over');
  });
  doc.addEventListener('drop', function (e) {
    var r = e.target.closest && e.target.closest('.tr-row'); if (!r || dragIdx === null) return;
    e.preventDefault();
    var to = +r.getAttribute('data-idx'), list = ed.drafts[ed.active].tr;
    var item = list.splice(dragIdx, 1)[0]; list.splice(to, 0, item);
    dragIdx = null; touch(); renderEditor();
  });
  doc.addEventListener('dragend', function () { dragIdx = null; $$('.tr-row').forEach(function (o) { o.classList.remove('is-dragging', 'is-over'); }); });

  /* ---------- boot ---------- */
  function boot() {
    initVariants([['default', 'Normal'], ['noclient', 'Sin cliente'], ['catalog', 'Error de catálogo']]);
    doc.addEventListener('variantchange', function () { syncClientPick(); syncSelBar(); });
    syncClientPick();
    skeleton();
    renderSeq();
    // hint text id for aria-describedby
    var hint = $('#as-hint span'); if (hint) hint.id = 'as-hint-text';
    render();
    new MutationObserver(function () { render(); }).observe(doc.body, { attributes: true, attributeFilter: ['data-state'] });
    // overlays opened from the URL (?open=)
    var op = params.get('open');
    if (op === 'sheet-editor' || op === 'dlg-preview' || op === 'dlg-pattern') {
      if (params.get('mode') === 'rule') prepareEditor('rule', RULE_DAYS());
      else prepareEditor('selection', st.sel.size ? Array.from(st.sel) : [iso(st.anchor)]);
      if (op === 'dlg-preview') renderPreview();
    }
    if (op === 'dlg-copy-week') { cwInit(); if (params.get('step') === 'preview') cwSetStep(2); }
    if (op === 'dlg-copy-sel') csRender();
    if (op === 'sheet-rir' && params.get('step') === 'preview') rirStep(2);
    icons();
  }
  // Deferred scripts run before DOMContentLoaded: wait so proto.js has built the shell first.
  doc.addEventListener('DOMContentLoaded', boot);
})();
