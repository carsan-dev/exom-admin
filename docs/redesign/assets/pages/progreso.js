/* progreso.html only. Runs before DOMContentLoaded (end of body). */
(function () {
  'use strict';
  var doc = document;
  var params = new URLSearchParams(location.search);
  var C = window.ExomCharts, D = window.ExomData, S = window.ExomShared;

  /* ---------- Chart specs ---------- */
  C.specs['weight-dash'] = {
    label: 'Peso en kg, últimos 30 días: de 71,8 a 72,4 kg', x0: '2026-10-16', x1: '2026-11-15', yDec: 1,
    series: [{ kind: 'scatter', guide: true, name: 'Peso', unit: ' kg', dec: 1, pts: D.weight }]
  };
  C.specs['weight-met'] = {
    label: 'Peso en kg del periodo, con guía lineal', x0: '2026-10-16', x1: '2026-11-15', yDec: 1,
    series: [
      { kind: 'scatter', guide: true, name: 'Peso', unit: ' kg', dec: 1, pts: D.weight },
      { kind: 'scatter', guide: true, cmp: true, hidden: true, name: 'Masa muscular', unit: ' kg', dec: 1, pts: D.muscle }
    ]
  };
  var LOADS = [];
  [['2026-10-19', [55, 55, 57.5]], ['2026-10-22', [55, 57.5, 57.5]], ['2026-10-26', [57.5, 57.5, 60]], ['2026-10-30', [57.5, 60, 60]],
    ['2026-11-02', [60, 60, 60]], ['2026-11-05', [60, 62.5, 62.5]], ['2026-11-09', [65, 65, 62.5]], ['2026-11-13', [60, 62.5, 62.5]]]
    .forEach(function (s) { s[1].forEach(function (v) { LOADS.push([s[0], v]); }); });
  C.specs.loads = {
    label: 'Sentadilla trasera, peso externo por serie: de 55 a 65 kg', x0: '2026-10-16', x1: '2026-11-15',
    series: [{ kind: 'scatter', guide: true, name: 'Sentadilla trasera', unit: ' kg', dec: 1, pts: LOADS }]
  };

  doc.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-cmp]')) {
      C.specs['weight-met'].series[1].hidden = !t.value;
      doc.querySelector('[data-cmp-legend]').hidden = !t.value;
      C.refresh('weight-met');
    }
    if (t.matches('[data-scale]')) { C.specs['weight-met'].zero = t.value === 'zero'; C.refresh('weight-met'); }
  });

  /* ---------- Section switching (?section=) ---------- */
  var SECS = ['dashboard', 'resumen', 'metricas', 'fotos', 'entrenamiento', 'adherencia', 'racha', 'seguimiento'];
  function show(id, opts) {
    opts = opts || {};
    Array.prototype.forEach.call(doc.querySelectorAll('.psec'), function (s) { s.hidden = s.getAttribute('data-sec') !== id; });
    Array.prototype.forEach.call(doc.querySelectorAll('.prog-nav a'), function (a) {
      if (a.getAttribute('data-goto') === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var p = new URLSearchParams(location.search);
    p.set('section', id);
    if (!opts.keepTab) p.delete('tab');
    history.replaceState(null, '', '?' + p.toString());
    var cur = doc.querySelector('.prog-nav a[aria-current]');
    var nav = doc.querySelector('.prog-nav');
    if (cur && nav && window.matchMedia('(max-width: 1023px)').matches) nav.scrollLeft = cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2;
    if (opts.scroll) window.scrollTo({ top: 0 });
    if (window.Proto) window.requestAnimationFrame(function () { C.observe(doc); });
  }
  var start = params.get('section');
  if (!start) start = 'dashboard';
  else if (SECS.indexOf(start) < 0) start = 'metricas';
  show(start, { keepTab: true });

  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    show(a.getAttribute('data-goto'), { scroll: !a.closest('.prog-nav') });
    if (a.getAttribute('data-subtab') === 'recaps') { var t = doc.getElementById('st-recaps'); if (t) t.click(); }
  });
  if (params.get('tab') === 'recaps') doc.getElementById('st-recaps').setAttribute('aria-selected', 'true'), doc.getElementById('st-tareas').setAttribute('aria-selected', 'false');

  /* ---------- Client selector ---------- */
  var pick = doc.getElementById('client-pick');
  function setPicker(name, ini) {
    var nm = pick.querySelector('[data-cp-name]'), av = pick.querySelector('[data-cp-avatar]');
    if (!name) {
      nm.textContent = 'Seleccionar cliente...'; nm.classList.add('is-placeholder'); av.hidden = true;
      pick.setAttribute('aria-label', 'Seleccionar cliente...');
    } else {
      nm.textContent = name; nm.classList.remove('is-placeholder'); av.hidden = false; av.textContent = ini;
      pick.setAttribute('aria-label', 'Cliente: ' + name + '. Cambiar cliente');
    }
  }
  function syncPickerWithState() {
    var empty = doc.body.getAttribute('data-state') === 'empty';
    if (empty) {
      setPicker(null);
      Array.prototype.forEach.call(doc.querySelectorAll('[data-cp]'), function (o) { o.setAttribute('aria-selected', 'false'); });
    } else if (pick.querySelector('[data-cp-name]').classList.contains('is-placeholder')) {
      setPicker('Lucía Martínez', 'LM');
      doc.querySelector('[data-cp="Lucía Martínez"]').setAttribute('aria-selected', 'true');
    }
  }
  new MutationObserver(syncPickerWithState).observe(doc.body, { attributes: true, attributeFilter: ['data-state'] });
  doc.addEventListener('DOMContentLoaded', syncPickerWithState);
  doc.addEventListener('click', function (e) {
    var o = e.target.closest('[data-cp]');
    if (!o) return;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-cp]'), function (x) { x.setAttribute('aria-selected', String(x === o)); });
    setPicker(o.getAttribute('data-cp'), o.getAttribute('data-cp-i'));
    pick.click(); // closes the popover and returns focus
    if (doc.body.getAttribute('data-state') === 'empty' && window.Proto) window.Proto.setState('data');
  });
  var search = doc.querySelector('[data-cp-search]');
  search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase(), n = 0;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-cp]'), function (o) {
      var hit = !q || o.textContent.toLowerCase().indexOf(q) > -1;
      o.hidden = !hit; if (hit) n++;
    });
    doc.querySelector('[data-cp-none]').hidden = n > 0;
  });

  /* ---------- Resumen: month calendar ---------- */
  var MSTATE = {
    ok: ['check', 'st-ok', 'Completado'], part: ['minus', 'st-part', 'Parcialmente completado'], miss: ['x', 'st-miss', 'No completado'],
    rest: ['moon', 'st-mute', 'Día de descanso'], pend: ['clock', 'st-mute', 'Pendiente'], none: ['circle-off', 'st-mute', 'Sin asignaciones'],
    norec: ['circle-dashed', 'st-mute', 'Sin registro']
  };
  // 1..30 de noviembre de 2026
  var NOV = ['rest', 'ok', 'ok', 'ok', 'part', 'ok', 'none', 'rest', 'part', 'miss', 'part', 'miss', 'ok', 'part', 'pend',
    'pend', 'pend', 'pend', 'pend', 'pend', 'pend', 'rest', 'pend', 'pend', 'pend', 'pend', 'pend', 'pend', 'rest', 'pend'];
  var cal = doc.querySelector('[data-mcal]');
  var list = doc.querySelector('[data-month-list]');
  var selDay = 13;
  if (cal) {
    var h = '';
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(function (d) { h += '<span class="mcal-dow micro" aria-hidden="true">' + d + '</span>'; });
    [26, 27, 28, 29, 30, 31].forEach(function (d) { h += '<span class="mcal-day is-out" aria-hidden="true"><span class="mcal-n">' + d + '</span></span>'; });
    var lh = '';
    NOV.forEach(function (s, i) {
      var d = i + 1, st = MSTATE[s], t = Date.UTC(2026, 10, d);
      var label = S.longDate(t) + (d === 15 ? ' (hoy)' : '') + ': ' + st[2];
      h += '<button class="mcal-day ' + st[1] + (d === 15 ? ' is-today' : '') + '" type="button" data-mday="' + d + '" aria-pressed="' + (d === selDay) + '" aria-label="' + label + '"' + (d === 15 ? ' aria-current="date"' : '') + '>' +
        '<span class="mcal-n">' + d + '</span><i data-lucide="' + st[0] + '" aria-hidden="true"></i></button>';
      if (d <= 15) lh = '<li class="ruled-row ' + st[1] + '"><span>' + S.longDate(t) + '</span><span class="row" style="gap:6px;font-size:13px;color:var(--ink-2)"><i data-lucide="' + st[0] + '" aria-hidden="true"></i>' + st[2] + '</span></li>' + lh;
    });
    for (var k = 1; k <= 6; k++) h += '<span class="mcal-day is-out" aria-hidden="true"><span class="mcal-n">' + k + '</span></span>';
    cal.innerHTML = h;
    if (list) list.innerHTML = lh;
  }
  function selectDay(d) {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-mday]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-mday') === d)); });
    doc.querySelector('[data-day-title]').textContent = S.longDate(Date.UTC(2026, 10, d));
    var inp = doc.getElementById('res-day'); if (inp) inp.value = '2026-11-' + (d < 10 ? '0' : '') + d;
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mday]');
    if (b) selectDay(+b.getAttribute('data-mday'));
    if (e.target.closest('[data-res-today]')) selectDay(15);
  });
  var resDay = doc.getElementById('res-day');
  if (resDay) resDay.addEventListener('change', function () {
    var m = /^2026-11-(\d\d)$/.exec(resDay.value); if (m) selectDay(+m[1]);
  });

  /* ---------- Fotos: compared view ---------- */
  var VIEW = { 'Frontal': ['sil-front', false, '10 de 12'], 'Lateral izquierda': ['sil-side', true, '12 de 12'], 'Lateral derecha': ['sil-side', true, '12 de 12'], 'Espalda': ['sil-back', true, '11 de 12'] };
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]');
    if (!b) return;
    var v = b.getAttribute('data-view'), conf = VIEW[v];
    Array.prototype.forEach.call(doc.querySelectorAll('[data-view-name]'), function (n) { n.textContent = v; });
    doc.querySelector('[data-view-count]').textContent = conf[2];
    var flip = v === 'Lateral derecha' ? ' style="transform:scaleX(-1)"' : '';
    var a = doc.querySelector('[data-frame="a"]');
    a.querySelector('svg').outerHTML = '<svg class="sil" role="img" aria-label="Foto ' + v + ' del 15 de octubre de 2026"' + flip + '><use href="#' + conf[0] + '"/></svg>';
    var fb = doc.querySelector('[data-frame="b"]');
    if (conf[1]) {
      fb.className = 'ph-frame';
      fb.innerHTML = '<svg class="sil" role="img" aria-label="Foto ' + v + ' del 12 de noviembre de 2026"' + flip + '><use href="#' + conf[0] + '"/></svg>' +
        '<button class="btn btn-ghost btn-icon btn-sm ph-expand" type="button" data-open="#dlg-zoom" aria-haspopup="dialog" aria-label="Ampliar foto posterior"><i data-lucide="expand"></i></button>';
    } else {
      fb.className = 'ph-frame is-missing';
      fb.innerHTML = '<p class="ph-missing"><i data-lucide="image-off" aria-hidden="true"></i><span>Vista ' + v + ' no disponible en esta fecha.</span></p>';
    }
    doc.getElementById('dlg-zoom-t').textContent = v + ' · 15 de octubre de 2026';
    if (window.Proto) window.Proto.icons();
  });

  /* ---------- Entrenamiento: inline session detail ---------- */
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sess-toggle]');
    if (!b) return;
    var row = b.closest('.sess-row'), det = row.querySelector('.sess-detail');
    if (!det) { if (window.Proto) window.Proto.toast('Detalle de ejemplo', 'info', 'En el boceto solo Pierna A tiene detalle desplegado.'); return; }
    var open = b.getAttribute('aria-expanded') === 'true';
    det.hidden = open;
    b.setAttribute('aria-expanded', String(!open));
    b.textContent = open ? 'Ver detalle' : 'Cerrar detalle';
  });

  /* ---------- Seguimiento: cancel task confirm closes both layers ---------- */
  doc.addEventListener('click', function (e) {
    if (!e.target.closest('[data-cancel-task]')) return;
    doc.querySelector('#dlg-cancel-task [data-close]').click();
    window.setTimeout(function () {
      var x = doc.querySelector('#sheet-task .ov-head [data-close]'); if (x) x.click();
      if (window.Proto) window.Proto.toast('Tarea cancelada', 'success', 'Queda en el historial.');
    }, 60);
  });
})();
