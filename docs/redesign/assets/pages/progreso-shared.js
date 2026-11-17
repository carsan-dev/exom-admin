/* ==========================================================================
   Shared blocks for cliente-detalle.html and progreso.html.
   Must be loaded with a plain <script> at the end of <body> (before
   DOMContentLoaded) so proto.js boots over the injected markup.

   Placeholders replaced here:
     <div data-tpl="adherence" data-title="h2|psec"></div>
     <div data-tpl="streak" data-mode="client|progress"></div>
     <div data-tpl="metrics-table" data-rows="10"></div>
     <div data-tpl="metric-dialog"></div>
   Charts: <div class="chart" data-chart="id" style="--h:240px"></div>
   with a spec registered in ExomCharts.specs[id].
   ========================================================================== */
(function () {
  'use strict';
  var doc = document;

  /* ---------- formatting ---------- */
  function num(v, dec) {
    return Number(v).toLocaleString('es-ES', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0, useGrouping: true });
  }
  function signed(v, dec) {
    var s = num(Math.abs(v), dec);
    return (v > 0 ? '+' : v < 0 ? '−' : '+') + s;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseISO(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function ddmm(t) { var d = new Date(t); return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1); }
  function ddmmyyyy(t) { var d = new Date(t); return ddmm(t) + '/' + d.getUTCFullYear(); }
  var DAY = 86400000;
  var WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function longDate(t) { var d = new Date(t); return WEEKDAYS[d.getUTCDay()] + ', ' + d.getUTCDate() + ' de ' + MONTHS[d.getUTCMonth()] + ' de ' + d.getUTCFullYear(); }

  /* ======================================================================
     CHARTS (inline SVG, re-drawn at the real container width)
     ====================================================================== */
  var NS = 'http://www.w3.org/2000/svg';
  function niceTicks(min, max, count) {
    if (max === min) { max += 1; min -= 1; }
    var span = max - min;
    var step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = span / count / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, t = [];
    for (var v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(6));
    return { ticks: t, step: step };
  }
  function linreg(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    var d = n * sxx - sx * sx; if (!d) return null;
    var m = (n * sxy - sx * sy) / d; return { m: m, b: (sy - m * sx) / n };
  }
  function el(name, attrs, text) {
    var e = doc.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  var specs = {};
  function render(box) {
    var spec = specs[box.getAttribute('data-chart')];
    if (!spec) return;
    var W = box.clientWidth, H = box.clientHeight;
    if (!W || !H) return;
    var key = W + 'x' + H + ':' + (spec.version || 0);
    if (box._key === key) return;
    box._key = key;

    var narrow = W < 420;
    var x0 = parseISO(spec.x0), x1 = parseISO(spec.x1);
    var vals = [];
    spec.series.forEach(function (s) { if (!s.hidden) s.pts.forEach(function (p) { if (p[1] != null) vals.push(p[1]); }); });
    var ymin = spec.yMin != null ? spec.yMin : Math.min.apply(null, vals);
    var ymax = spec.yMax != null ? spec.yMax : Math.max.apply(null, vals);
    if (spec.zero) ymin = 0;
    if (spec.yMin == null && !spec.zero) { var padY = (ymax - ymin) * 0.15 || 1; ymin -= padY; ymax += padY; }
    var nt = niceTicks(ymin, ymax, narrow ? 4 : 5);
    var yt = nt.ticks; ymin = yt[0]; ymax = yt[yt.length - 1];
    var dec = spec.yDec != null ? spec.yDec : (nt.step < 1 ? 1 : 0);
    var yLabel = function (v) { return num(v, dec) + (spec.ySuffix || ''); };

    var maxLabel = 0;
    yt.forEach(function (v) { maxLabel = Math.max(maxLabel, yLabel(v).length); });
    var m = { t: 10, r: 10, b: 26, l: Math.max(28, maxLabel * 6.4 + 12) };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var sx = function (t) { return m.l + (t - x0) / (x1 - x0) * iw; };
    var sy = function (v) { return m.t + (1 - (v - ymin) / (ymax - ymin)) * ih; };

    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': spec.label || '' });
    var g = el('g');
    yt.forEach(function (v, i) {
      var y = Math.round(sy(v)) + 0.5;
      g.appendChild(el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, 'class': i === 0 ? 'c-base' : 'c-grid' }));
      g.appendChild(el('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end', 'class': 'c-tick' }, yLabel(v)));
    });
    var days = Math.round((x1 - x0) / DAY);
    var nX = narrow ? 3 : Math.min(6, Math.max(3, Math.floor(iw / 110)));
    for (var i = 0; i <= nX; i++) {
      var t = x0 + Math.round(days * i / nX) * DAY;
      var anchor = i === 0 ? 'start' : i === nX ? 'end' : 'middle';
      g.appendChild(el('text', { x: sx(t), y: H - 6, 'text-anchor': anchor, 'class': 'c-tick' }, ddmm(t)));
    }
    svg.appendChild(g);

    spec.series.forEach(function (s) {
      if (s.hidden) return;
      var pts = s.pts.map(function (p) { return [parseISO(p[0]), p[1], p[0]]; });
      if (s.kind === 'line') {
        var d = '', pen = false;
        pts.forEach(function (p) {
          if (p[1] == null) { pen = false; return; }
          d += (pen ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1);
          pen = true;
        });
        svg.appendChild(el('path', { d: d, 'class': s.cls }));
        if (s.dots) pts.forEach(function (p) {
          if (p[1] == null) return;
          var c = el('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 2.5, 'class': 'c-dot' });
          c.appendChild(el('title', null, ddmmyyyy(p[0]) + ' · ' + s.name + ' ' + num(p[1], s.dec || 0) + (s.unit || '')));
          svg.appendChild(c);
        });
      } else {
        var real = pts.filter(function (p) { return p[1] != null; });
        if (s.guide && real.length > 1) {
          var r = linreg(real.map(function (p) { return [p[0], p[1]]; }));
          var a = real[0][0], b = real[real.length - 1][0];
          if (r) svg.appendChild(el('line', { x1: sx(a), y1: sy(r.m * a + r.b), x2: sx(b), y2: sy(r.m * b + r.b), 'class': s.cmp ? 'c-cmp' : 'c-guide' }));
        }
        real.forEach(function (p) {
          var node;
          if (s.cmp) {
            var cx = sx(p[0]), cy = sy(p[1]), k = 4;
            node = el('path', { d: 'M' + cx + ' ' + (cy - k) + 'L' + (cx + k) + ' ' + cy + 'L' + cx + ' ' + (cy + k) + 'L' + (cx - k) + ' ' + cy + 'Z', 'class': 'c-cmp-dot' });
          } else {
            node = el('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 3.5, 'class': 'c-dot' });
          }
          node.appendChild(el('title', null, ddmmyyyy(p[0]) + ' · ' + s.name + ' ' + num(p[1], s.dec || 0) + (s.unit || '')));
          svg.appendChild(node);
        });
      }
    });
    box.textContent = '';
    box.appendChild(svg);
  }
  function observeCharts(scope) {
    var boxes = (scope || doc).querySelectorAll('.chart[data-chart]');
    Array.prototype.forEach.call(boxes, function (b) {
      if (b._obs) return;
      b._obs = true;
      if (window.ResizeObserver) new ResizeObserver(function () { render(b); }).observe(b);
      render(b);
    });
  }
  function refresh(id) {
    var s = specs[id]; if (s) s.version = (s.version || 0) + 1;
    Array.prototype.forEach.call(doc.querySelectorAll('.chart[data-chart="' + id + '"]'), render);
  }
  window.ExomCharts = { specs: specs, render: render, refresh: refresh, observe: observeCharts };

  /* ======================================================================
     DATA (mock, Lucía Martínez)
     ====================================================================== */
  var WEIGHT = [['2026-10-17', 71.8], ['2026-10-21', 71.6], ['2026-10-24', 71.5], ['2026-10-28', 71.9], ['2026-10-31', 72.0],
    ['2026-11-04', 72.1], ['2026-11-07', 72.6], ['2026-11-11', 71.8], ['2026-11-14', 72.4]];
  var MUSCLE = [['2026-10-17', 31.6], ['2026-11-04', 31.9], ['2026-11-14', 32.1]];
  window.ExomData = { weight: WEIGHT, muscle: MUSCLE };

  // Adherencia: 16/10/2026 .. 15/11/2026 (15/11 = hoy, provisional)
  var ADH_START = parseISO('2026-10-16');
  var ST = ['ok', 'part', 'rest', 'ok', 'ok', 'part', 'ok', 'ok', 'nodata', 'rest', 'ok', 'part', 'ok', 'miss', 'ok', 'part', 'rest',
    'ok', 'ok', 'ok', 'part', 'ok', 'noplan', 'rest', 'part', 'miss', 'part', 'miss', 'ok', 'part', 'nodata'];
  var TR = [100, 100, null, 100, 100, 50, 100, 100, null, null, 100, 50, 100, 0, 100, 100, null, 100, 100, 100, 50, 100, null, null, 100, 0, 50, 0, 100, 50, null];
  var NU = [94, 62, 88, 96, 92, 70, 95, 91, null, 86, 93, 64, 97, 38, 92, 66, 90, 95, 96, 93, 68, 94, null, 84, 62, 35, 58, 32, 92, 64, null];
  var STATE = {
    ok: { label: 'Completo', icon: 'check', cls: 'st-ok', chip: 'chip-success' },
    part: { label: 'Parcial', icon: 'minus', cls: 'st-part', chip: 'chip-warning' },
    miss: { label: 'Sin cumplir', icon: 'x', cls: 'st-miss', chip: 'chip-danger' },
    nodata: { label: 'Sin datos', icon: 'circle-dashed', cls: 'st-mute', chip: 'chip-neutral' },
    noplan: { label: 'Sin pauta', icon: 'circle-off', cls: 'st-mute', chip: 'chip-neutral' },
    rest: { label: 'Descanso', icon: 'moon', cls: 'st-mute', chip: 'chip-neutral' },
    future: { label: 'Futuro', icon: 'clock', cls: 'st-mute', chip: 'chip-neutral' }
  };
  function globalAt(i) {
    var a = TR[i], b = NU[i];
    if (a == null && b == null) return null;
    if (a == null) return b; if (b == null) return a;
    return Math.round((a + b) / 2);
  }
  function isoAt(i) { var d = new Date(ADH_START + i * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  var adhG = [], adhT = [], adhN = [];
  for (var di = 0; di < ST.length - 1; di++) {
    adhG.push([isoAt(di), globalAt(di)]); adhT.push([isoAt(di), TR[di]]); adhN.push([isoAt(di), NU[di]]);
  }
  specs.adherence = {
    label: 'Evolución diaria de la adherencia del periodo seleccionado: global, entrenamiento y nutrición',
    x0: '2026-10-16', x1: '2026-11-14', yMin: 0, yMax: 100, yDec: 0, ySuffix: ' %',
    series: [
      { kind: 'line', cls: 'c-dotted', name: 'Nutrición', unit: ' %', pts: adhN },
      { kind: 'line', cls: 'c-dashed2', name: 'Entrenamiento', unit: ' %', pts: adhT },
      { kind: 'line', cls: 'c-main is-bold', name: 'Global', unit: ' %', pts: adhG, dots: true }
    ]
  };

  /* ======================================================================
     TEMPLATES
     ====================================================================== */
  function infoBtn(id, label) {
    return '<button class="btn btn-ghost btn-icon info-btn" type="button" data-open="#' + id + '" aria-haspopup="dialog" aria-expanded="false" aria-label="' + label + '"><i data-lucide="info"></i></button>';
  }

  /* ---------- Adherencia ---------- */
  function calendarHTML() {
    var h = '<div class="adh-cal" role="group" aria-label="Días del periodo">';
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(function (d) { h += '<span class="adh-cal-h micro" aria-hidden="true">' + d + '</span>'; });
    for (var b = 0; b < 4; b++) h += '<span class="adh-blank" aria-hidden="true"></span>';
    ST.forEach(function (s, i) {
      var t = ADH_START + i * DAY, st = STATE[s];
      var sel = i === 28;
      h += '<button class="adh-day ' + st.cls + '" type="button" data-adh-day="' + i + '" aria-pressed="' + sel + '" aria-label="' + longDate(t) + ': ' + st.label + (i === 30 ? ', provisional' : '') + '">' +
        '<span>' + ddmm(t) + '</span><i data-lucide="' + st.icon + '" aria-hidden="true"></i></button>';
    });
    h += '</div>';
    h += '<ul class="st-legend" aria-label="Leyenda">';
    ['ok', 'part', 'miss', 'nodata', 'noplan', 'rest', 'future'].forEach(function (k) {
      h += '<li class="' + STATE[k].cls + '"><i data-lucide="' + STATE[k].icon + '" aria-hidden="true"></i>' + STATE[k].label + '</li>';
    });
    return h + '</ul>';
  }
  function dailyTable() {
    var rows = '';
    for (var i = ST.length - 2; i >= ST.length - 9; i--) {
      var g = globalAt(i);
      rows += '<tr><td class="cell-date">' + ddmmyyyy(ADH_START + i * DAY) + '</td>' +
        '<td class="cell-num">' + (g == null ? '<span aria-label="Sin datos">—</span>' : g + ' %') + '</td>' +
        '<td class="cell-num">' + (TR[i] == null ? '<span aria-label="Sin datos">—</span>' : TR[i] + ' %') + '</td>' +
        '<td class="cell-num">' + (NU[i] == null ? '<span aria-label="Sin datos">—</span>' : NU[i] + ' %') + '</td></tr>';
    }
    return '<div class="tscroll"><table class="table table-compact"><caption class="sr-only">Valores diarios de adherencia</caption>' +
      '<thead><tr><th scope="col">Fecha</th><th scope="col" class="cell-num">Global</th><th scope="col" class="cell-num">Entrenamiento</th><th scope="col" class="cell-num">Nutrición</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div><p class="caption" style="margin-top:8px">Últimos 8 días cerrados del periodo · 30 días en total.</p>';
  }
  function adherenceHTML(opts) {
    var titleHTML = opts.title === 'psec'
      ? '<h2 class="psec-title" id="adh-title">Adherencia</h2>'
      : '<h2 class="h2" id="adh-title">Adherencia</h2>';
    return '' +
'<section class="adh" aria-labelledby="adh-title">' +
'  <div class="psec-head">' +
'    <div>' + titleHTML +
       (opts.title === 'psec' ? '<p class="psec-sub">Cumplimiento de la pauta en días cerrados, por entrenamiento y nutrición.</p>' : '') +
'    </div>' +
'    <div class="period">' +
'      <div class="period-row">' +
'        <label class="period-label" for="adh-period">Periodo</label>' +
'        <select class="select" id="adh-period" data-switch="adhp" data-period>' +
'          <option value="7" data-range="08/11/2026 – 14/11/2026 · Comparado con 01/11/2026 – 07/11/2026">Últimos 7 días</option>' +
'          <option value="30" selected data-range="16/10/2026 – 14/11/2026 · Comparado con 16/09/2026 – 15/10/2026">Últimos 30 días</option>' +
'          <option value="month" data-range="01/11/2026 – 14/11/2026 · Comparado con 01/10/2026 – 14/10/2026">Mes actual</option>' +
'          <option value="prev" data-range="01/10/2026 – 31/10/2026 · Comparado con 01/09/2026 – 30/09/2026">Mes anterior</option>' +
'          <option value="custom" data-range="Selecciona las fechas de inicio y fin.">Personalizado</option>' +
'        </select>' + infoBtn('pop-adh', 'Cómo se calcula la adherencia') +
'        <button class="btn btn-secondary" type="button" data-refresh-label="Actualizar evaluaciones" data-loading-label="Actualizando…" data-toast="Evaluaciones actualizadas" data-toast-tone="success"><i data-lucide="refresh-cw"></i>Actualizar evaluaciones</button>' +
'      </div>' +
'      <div class="period-custom" data-case="adhp:custom" hidden>' +
'        <div class="field"><label class="field-label" for="adh-from">Desde</label><input class="input input-sm" type="date" id="adh-from" max="2026-11-15"></div>' +
'        <div class="field"><label class="field-label" for="adh-to">Hasta</label><input class="input input-sm" type="date" id="adh-to" max="2026-11-15"></div>' +
'      </div>' +
'      <p class="period-range" data-period-range>16/10/2026 – 14/11/2026 · Comparado con 16/09/2026 – 15/10/2026</p>' +
'    </div>' +
'  </div>' +

'  <div class="blk">' +
'    <div class="blk-head"><div><h3 class="blk-title">Últimos siete días cerrados</h3><p class="blk-sub">08/11/2026 – 14/11/2026</p></div></div>' +
'    <div class="verdict">' +
'      <div class="fig-line"><span class="fig">56</span><span class="fig-unit">%</span></div>' +
'      <div class="verdict-main">' +
'        <span class="chip chip-warning">Baja adherencia global</span>' +
'        <span class="caption">Umbral global de siete días: 70 % · Configuración versión 4</span>' +
'      </div>' +
'      <dl class="verdict-parts">' +
'        <div><dt>Entrenamiento</dt><dd>50 %</dd></div>' +
'        <div><dt>Nutrición</dt><dd>61 %</dd></div>' +
'      </dl>' +
'    </div>' +
'    <p class="cover-line">Cobertura: 7 / 7 días disponibles · 6 evaluables · 1 no aplicables · 0 insuficientes.</p>' +
'  </div>' +

'  <div class="blk">' +
'    <div class="blk-head"><div><h3 class="blk-title">Periodo cerrado · 16/10/2026 – 14/11/2026</h3><p class="blk-sub">Fuente: entrenamiento y nutrición · Evaluado: 15/11/2026 06:00</p></div></div>' +
'    <div class="ledger ledger-3" style="--cols:3">' +
'      <div class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Entrenamiento</span></span>' +
'        <span class="fig-line"><span class="fig">81</span><span class="fig-unit">%</span></span>' +
'        <div class="progress" role="progressbar" aria-label="Entrenamiento" aria-valuemin="0" aria-valuemax="100" aria-valuenow="81"><span style="--value:81%"></span></div>' +
'        <span class="ledger-foot"><span class="delta">+6 p. p.</span><span>22 / 27 evaluables</span></span></div>' +
'      <div class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Nutrición</span></span>' +
'        <span class="fig-line"><span class="fig">74</span><span class="fig-unit">%</span></span>' +
'        <div class="progress" role="progressbar" aria-label="Nutrición" aria-valuemin="0" aria-valuemax="100" aria-valuenow="74"><span style="--value:74%"></span></div>' +
'        <span class="ledger-foot"><span class="delta">+2 p. p.</span><span>28 / 29 evaluables</span></span></div>' +
'      <div class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Global</span></span>' +
'        <span class="fig-line"><span class="fig">78</span><span class="fig-unit">%</span></span>' +
'        <div class="progress" role="progressbar" aria-label="Global" aria-valuemin="0" aria-valuemax="100" aria-valuenow="78"><span style="--value:78%"></span></div>' +
'        <span class="ledger-foot"><span class="delta">+4 p. p.</span><span>28 / 29 evaluables</span></span></div>' +
'    </div>' +
'  </div>' +

'  <div class="blk adh-grid">' +
'    <div class="stack-12" style="min-width:0">' +
'      <div class="blk-head" style="margin-bottom:0"><div><h3 class="blk-title">Evolución diaria del periodo seleccionado</h3><p class="blk-sub">0–100 % por día cerrado</p></div></div>' +
'      <div class="chart" data-chart="adherence" style="--h:240px"></div>' +
'      <div class="legend" aria-hidden="true">' +
'        <span class="legend-item"><svg viewBox="0 0 22 8"><line x1="0" y1="4" x2="22" y2="4" class="lg-main"/></svg>Global</span>' +
'        <span class="legend-item"><svg viewBox="0 0 22 8"><line x1="0" y1="4" x2="22" y2="4" class="lg-dashed"/></svg>Entrenamiento</span>' +
'        <span class="legend-item"><svg viewBox="0 0 22 8"><line x1="1" y1="4" x2="22" y2="4" class="lg-dotted"/></svg>Nutrición</span>' +
'      </div>' +
'      <div class="disc-group"><details class="disc"><summary>Ver valores diarios en tabla<i data-lucide="chevron-down" class="disc-chev"></i></summary><div class="disc-body">' + dailyTable() + '</div></details></div>' +
'    </div>' +
'    <div style="min-width:0">' +
'      <div class="blk-head"><div><h3 class="blk-title">Calendario de adherencia</h3><p class="blk-sub">Selecciona un día para ver su detalle.</p></div></div>' +
       calendarHTML() +
'      <div class="daydetail" aria-live="polite">' +
'        <div class="daydetail-head"><h4 class="daydetail-title" data-adh-title>viernes, 13 de noviembre de 2026</h4><span class="chip chip-success" data-adh-chip>Completo</span></div>' +
'        <p class="caption" data-adh-prov hidden style="margin-bottom:8px">Provisional · no incluido en el periodo cerrado</p>' +
'        <dl class="kv">' +
'          <div><dt>Pauta</dt><dd data-adh-plan>Entrenamiento: Pautado · Nutrición: Pautado</dd></div>' +
'          <div><dt>Adherencia</dt><dd data-adh-metrics>Entrenamiento 100 % · Nutrición 92 % · Global 96 %</dd></div>' +
'          <div><dt>Calorías</dt><dd data-adh-kcal>2.100 kcal estimadas / 2.400 kcal pautadas · Dentro del objetivo</dd></div>' +
'          <div><dt>Proteína</dt><dd data-adh-prot>140 g estimados / 150 g pautados · Dentro del objetivo</dd></div>' +
'        </dl>' +
'      </div>' +
'    </div>' +
'  </div>' +

'  <div class="blk disc-group">' +
'    <details class="disc"><summary>Pasos y detalle semanal<i data-lucide="chevron-down" class="disc-chev"></i></summary><div class="disc-body">' +
'      <div class="tscroll"><table class="table table-compact"><caption class="sr-only">Pasos y detalle semanal</caption>' +
'        <thead><tr><th scope="col">Semana</th><th scope="col" class="cell-num">Media de pasos del recap</th><th scope="col" class="cell-num">Umbral</th><th scope="col" class="cell-num">Objetivo diario</th></tr></thead><tbody>' +
'        <tr><td class="cell-date">09/11/2026 – 15/11/2026</td><td class="cell-num">6.850</td><td class="cell-num">7.200</td><td class="cell-num">8.000</td></tr>' +
'        <tr><td class="cell-date">02/11/2026 – 08/11/2026</td><td class="cell-num">8.420</td><td class="cell-num">7.200</td><td class="cell-num">8.000</td></tr>' +
'        <tr><td class="cell-date">26/10/2026 – 01/11/2026</td><td class="cell-num">9.130</td><td class="cell-num">7.200</td><td class="cell-num">8.000</td></tr>' +
'        <tr><td class="cell-date">19/10/2026 – 25/10/2026</td><td class="cell-num"><span aria-label="Sin datos">—</span></td><td class="cell-num">7.200</td><td class="cell-num">8.000</td></tr>' +
'      </tbody></table></div>' +
'    </div></details>' +
'    <details class="disc" id="adh-config"><summary>Configuración de adherencia<span class="disc-meta">Versión de escritura: <span data-cfg-version>4</span></span><i data-lucide="chevron-down" class="disc-chev"></i></summary><div class="disc-body">' +
'      <div class="banner banner-danger" data-cfg-conflict hidden style="margin-bottom:20px"><i data-lucide="circle-alert"></i><span class="banner-text"><b>Conflicto: cambió la versión</b> de la configuración mientras editabas. Tu borrador se conserva.</span><span class="banner-actions"><button class="btn btn-secondary btn-sm" type="button" data-cfg-reload>Recargar versión conservando borrador</button></span></div>' +
'      <div class="cfg-top">' +
'        <div class="field"><label class="field-label" for="cfg-from">Vigencia desde</label><input class="input" type="date" id="cfg-from" min="2026-11-16" value="2026-11-16"></div>' +
'        <button class="btn btn-secondary" type="button" data-toast="Configuración cargada" data-toast-desc="Valores vigentes desde el 16/11/2026.">Cargar configuración de la fecha</button>' +
'      </div>' +
'      <div class="cfg-grid">' +
'        <div class="field"><label class="field-label" for="cfg-steps">Objetivo de pasos</label><input class="input" id="cfg-steps" type="number" min="1" step="1" value="8000" inputmode="numeric"><p class="field-help">Vacío desactiva el objetivo.</p></div>' +
'        <div class="field"><label class="field-label" for="cfg-kmin">Margen inferior de calorías (%)</label><input class="input" id="cfg-kmin" type="number" min="0" max="100" value="10"></div>' +
'        <div class="field"><label class="field-label" for="cfg-kmax">Margen superior de calorías (%)</label><input class="input" id="cfg-kmax" type="number" min="0" max="100" value="10"></div>' +
'        <div class="field"><label class="field-label" for="cfg-prot">Proteína mínima (%)</label><input class="input" id="cfg-prot" type="number" min="0" max="200" value="90"></div>' +
'        <div class="field"><label class="field-label" for="cfg-stepmin">Pasos mínimos (%)</label><input class="input" id="cfg-stepmin" type="number" min="0" max="200" value="90"></div>' +
'        <div class="field"><label class="field-label" for="cfg-low">Baja adherencia global (%)</label><input class="input" id="cfg-low" type="number" min="0" max="100" value="70"></div>' +
'      </div>' +
'      <div class="cfg-foot">' +
'        <p class="cfg-saved" data-cfg-saved hidden><i data-lucide="circle-check"></i>Guardada · vigente desde 16/11/2026. No modifica días anteriores.</p>' +
'        <span class="caption" data-cfg-note>Solo se aplica desde la fecha de vigencia. No modifica días anteriores.</span>' +
'        <button class="btn btn-primary" type="button" data-cfg-save data-loading-label="Guardando…">Guardar configuración futura</button>' +
'      </div>' +
'    </div></details>' +
'  </div>' +
'</section>';
  }
  var ADH_POP = '' +
'<div class="popover" id="pop-adh" role="dialog" aria-labelledby="pop-adh-t" style="--w:340px" hidden>' +
'  <div class="popover-head"><h2 class="h3" id="pop-adh-t">Cómo se calcula</h2></div>' +
'  <div class="popover-body">' +
'    <p class="pop-prose">Solo cuentan los <b>días cerrados</b>. Hoy es provisional y no entra en el periodo cerrado.</p>' +
'    <p class="pop-prose">Periodo máximo: 31 días. La variación en p. p. compara con el periodo anterior de igual duración.</p>' +
'    <p class="pop-prose">Los últimos siete días cerrados se anclan al día anterior a hoy. Todas las fechas están en UTC.</p>' +
'  </div>' +
'</div>';

  /* ---------- Racha ---------- */
  function streakHTML(mode) {
    var actions = mode === 'progress'
      ? '<button class="btn btn-danger" type="button" data-open="#dlg-reset-streak" aria-haspopup="dialog"><i data-lucide="rotate-ccw"></i>Reiniciar racha</button>' +
        '<a class="btn btn-ghost" href="?section=resumen" data-goto="resumen"><i data-lucide="calendar-days"></i>Consultar actividad diaria en Resumen</a>'
      : '<a class="link-btn" href="progreso.html?clientId=c01&amp;section=racha">Ver racha en Progreso<i data-lucide="arrow-up-right"></i></a><span class="proposal-tag">Propuesta</span>';
    return '' +
'<section aria-labelledby="streak-title">' +
'  <div class="psec-head"><div>' +
     (mode === 'progress' ? '<h2 class="psec-title" id="streak-title">Racha del cliente</h2>' : '<h2 class="h2" id="streak-title">Racha del cliente</h2>') +
'    <p class="psec-sub">Racha actual y mejor récord registrado, en días.</p></div></div>' +
'  <div data-show="data error">' +
'    <div class="ledger ledger-3" style="--cols:3">' +
'      <div class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Racha actual</span></span><span class="fig-line"><span class="fig">12</span><span class="fig-unit">días</span></span></div>' +
'      <div class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Mejor récord</span></span><span class="fig-line"><span class="fig">30</span><span class="fig-unit">días</span></span></div>' +
'      <div class="ledger-cell"><span class="ledger-head"><span class="ledger-label micro">Última actividad</span></span><span class="ledger-val">14 de noviembre de 2026</span></div>' +
'    </div>' +
'    <p class="streak-note">Estos contadores no se filtran por el periodo de métricas. No se dispone del historial de rachas ni de los motivos de interrupción.</p>' +
'    <div class="streak-actions">' + actions + '</div>' +
'  </div>' +
'  <div data-show="empty"><div class="empty empty-compact"><span class="empty-x" aria-hidden="true"></span>' +
'    <p class="empty-title">El cliente todavía no tiene una racha registrada.</p><p class="empty-text">No equivale a una racha de cero días.</p></div></div>' +
'</section>';
  }

  /* ---------- Métricas table ---------- */
  var COLS = [
    { k: 'peso', short: 'Peso', long: 'Peso', unit: 'kg', dec: 1, grp: 0 },
    { k: 'mm', short: 'Masa muscular', long: 'Masa muscular', unit: 'kg', dec: 1, grp: 0 },
    { k: 'alt', short: 'Altura', long: 'Altura', unit: 'cm', dec: 0, grp: 0 },
    { k: 'sue', short: 'Sueño', long: 'Sueño', unit: 'h', dec: 1, grp: 0 },
    { k: 'cue', short: 'Cuello', long: 'Cuello', unit: 'cm', dec: 1, grp: 1 },
    { k: 'hom', short: 'Hombros', long: 'Hombros', unit: 'cm', dec: 1, grp: 1 },
    { k: 'pec', short: 'Pecho', long: 'Pecho', unit: 'cm', dec: 1, grp: 1 },
    { k: 'cin', short: 'Cintura', long: 'Cintura', unit: 'cm', dec: 1, grp: 1 },
    { k: 'cad', short: 'Cadera', long: 'Cadera', unit: 'cm', dec: 1, grp: 1 },
    { k: 'bi', short: 'Brazo izq.', long: 'Brazo izquierdo', unit: 'cm', dec: 1, grp: 2 },
    { k: 'bd', short: 'Brazo der.', long: 'Brazo derecho', unit: 'cm', dec: 1, grp: 2 },
    { k: 'ai', short: 'Antebrazo izq.', long: 'Antebrazo izquierdo', unit: 'cm', dec: 1, grp: 2 },
    { k: 'ad', short: 'Antebrazo der.', long: 'Antebrazo derecho', unit: 'cm', dec: 1, grp: 2 },
    { k: 'mi', short: 'Muslo izq.', long: 'Muslo izquierdo', unit: 'cm', dec: 1, grp: 2 },
    { k: 'md', short: 'Muslo der.', long: 'Muslo derecho', unit: 'cm', dec: 1, grp: 2 },
    { k: 'gi', short: 'Gemelo izq.', long: 'Gemelo izquierdo', unit: 'cm', dec: 1, grp: 2 },
    { k: 'gd', short: 'Gemelo der.', long: 'Gemelo derecho', unit: 'cm', dec: 1, grp: 2 }
  ];
  var GROUPS = ['Composición y bienestar', 'Tronco', 'Extremidades'];
  var FULL_1104 = { cue: 36.5, hom: 112.0, pec: 98.0, bi: 31.5, bd: 31.8, ai: 27.0, ad: 27.2, mi: 56.0, md: 56.5, gi: 37.0, gd: 37.2 };
  var ROWS = [
    { d: '14/11/2026', peso: 72.4, mm: 32.1, sue: 7.5, cin: 76.0, cad: 95.5 },
    { d: '11/11/2026', peso: 71.8, sue: 6.5, cin: 76.5, cad: 96.0 },
    { d: '07/11/2026', peso: 72.6, sue: 7.0 },
    { d: '04/11/2026', peso: 72.1, mm: 31.9, sue: 7.0, cin: 77.0, cad: 96.0, full: FULL_1104 },
    { d: '31/10/2026', peso: 72.0, sue: 8.0 },
    { d: '28/10/2026', peso: 71.9, sue: 7.5, cin: 77.0 },
    { d: '24/10/2026', peso: 71.5, sue: 6.5 },
    { d: '21/10/2026', peso: 71.6, sue: 7.0 },
    { d: '17/10/2026', peso: 71.8, mm: 31.6, sue: 7.5, cin: 77.5, cad: 96.5 },
    { d: '03/10/2026', peso: 72.3, mm: 31.5, alt: 175, sue: 7.0, cin: 78.0, cad: 96.5, full: { cue: 36.8, hom: 111.5, pec: 98.5, bi: 31.2, bd: 31.5, ai: 26.8, ad: 27.0, mi: 56.5, md: 57.0, gi: 36.8, gd: 37.0 } }
  ];
  ROWS.forEach(function (r) { if (r.full) for (var k in r.full) r[k] = r.full[k]; });
  window.ExomData.metricRows = ROWS;
  window.ExomData.metricCols = COLS;

  function metricsTableHTML(n) {
    var rows = ROWS.slice(0, n);
    var h = '<div class="mtable-scroll" role="region" aria-label="Tabla de métricas corporales, desplazable en horizontal" tabindex="0">' +
      '<table class="table mtable"><caption class="sr-only">Métricas corporales por fecha</caption><thead>' +
      '<tr class="grp"><th class="c-date" scope="col" aria-hidden="true"></th>';
    var spans = [4, 5, 8];
    GROUPS.forEach(function (g, i) { h += '<th scope="colgroup" colspan="' + spans[i] + '" class="g-start">' + g + '</th>'; });
    h += '<th class="c-act" aria-hidden="true"></th></tr><tr><th scope="col" class="c-date">Fecha</th>';
    COLS.forEach(function (c, i) {
      var start = i === 0 || COLS[i - 1].grp !== c.grp;
      h += '<th scope="col" class="cell-num' + (start ? ' g-start' : '') + '" title="' + c.long + ' (' + c.unit + ')">' + c.short + '</th>';
    });
    h += '<th scope="col" class="c-act"><span class="sr-only">Acciones</span></th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr><th scope="row" class="c-date">' + r.d + '</th>';
      COLS.forEach(function (c, i) {
        var start = i === 0 || COLS[i - 1].grp !== c.grp, v = r[c.k];
        h += '<td class="cell-num' + (start ? ' g-start' : '') + (v == null ? ' is-missing' : '') + '">' +
          (v == null ? '<span aria-label="Sin datos">—</span>' : num(v, c.dec) + ' ' + c.unit) + '</td>';
      });
      h += '<td class="c-act"><button class="btn btn-ghost btn-icon btn-sm" type="button" data-open="#dlg-metric" data-ctx="edit" data-ctx-date="' + r.d + '" aria-haspopup="dialog" aria-label="Editar métricas del ' + r.d + '" data-tip="Editar"><i data-lucide="pencil"></i></button></td></tr>';
    });
    h += '</tbody></table></div>';
    // Mobile: one collapsible row per date with only the values present
    h += '<div class="mlist">';
    rows.forEach(function (r, ri) {
      var count = 0, body = '';
      GROUPS.forEach(function (g, gi) {
        var items = '';
        COLS.forEach(function (c) {
          if (c.grp !== gi || r[c.k] == null) return;
          count++;
          items += '<div><dt>' + c.long + '</dt><dd>' + num(r[c.k], c.dec) + ' ' + c.unit + '</dd></div>';
        });
        if (items) body += '<div class="mlist-grp"><span class="micro">' + g + '</span><dl class="mlist-vals">' + items + '</dl></div>';
      });
      h += '<details' + (ri === 0 ? ' open' : '') + '><summary><span class="mlist-date">' + r.d + '</span><span class="mlist-meta">' + count + (count === 1 ? ' valor' : ' valores') +
        (r.peso != null ? ' · ' + num(r.peso, 1) + ' kg' : '') + '</span><i data-lucide="chevron-down" class="mlist-chev"></i></summary>' +
        '<div class="mlist-body">' + body + '<button class="btn btn-ghost btn-sm mlist-edit" type="button" data-open="#dlg-metric" data-ctx="edit" data-ctx-date="' + r.d + '" aria-haspopup="dialog"><i data-lucide="pencil"></i>Editar métricas del ' + r.d + '</button></div></details>';
    });
    return h + '</div>';
  }

  /* ---------- Añadir / editar métricas (dialog lg) ---------- */
  function mfield(id, label, unit) {
    return '<div class="field"><label class="field-label" for="' + id + '">' + label + ' (' + unit + ')</label><input class="input" id="' + id + '" type="number" min="0" step="0.1" inputmode="decimal"></div>';
  }
  function metricDialogHTML() {
    var h = '<div class="overlay" id="dlg-metric" data-static hidden>' +
      '<div class="dialog dialog-lg" role="dialog" aria-modal="true" aria-labelledby="dlg-metric-t" aria-describedby="dlg-metric-d">' +
      '<div class="ov-head"><div class="ov-head-text">' +
      '<h2 class="ov-title" id="dlg-metric-t"><span data-if-not="edit">Añadir métricas</span><span data-if="edit">Editar métricas</span></h2>' +
      '<p class="ov-desc" id="dlg-metric-d">Registra medidas del cliente. Campos sin valor quedarán vacíos.</p></div>' +
      '<button class="btn btn-ghost btn-icon" type="button" data-close aria-label="Cerrar"><i data-lucide="x"></i></button></div>' +
      '<div class="ov-body"><form id="form-metric" novalidate>' +
      '<div class="field" style="max-width:220px;margin-bottom:24px"><label class="field-label" for="m-date">Fecha</label><input class="input" id="m-date" type="date" required max="2026-11-15" value="2026-11-15"><p class="field-help">Fecha en UTC. No puede ser futura.</p></div>' +
      '<fieldset class="mfs"><legend>Composición y bienestar</legend><div class="field-grid-4">' +
      mfield('m-peso', 'Peso', 'kg') + mfield('m-mm', 'Masa muscular', 'kg') + mfield('m-alt', 'Altura', 'cm') + mfield('m-sue', 'Sueño', 'h') +
      '</div></fieldset>' +
      '<fieldset class="mfs"><legend>Tronco</legend><div class="field-grid-4">' +
      mfield('m-cue', 'Cuello', 'cm') + mfield('m-hom', 'Hombros', 'cm') + mfield('m-pec', 'Pecho', 'cm') + mfield('m-cin', 'Cintura', 'cm') + mfield('m-cad', 'Cadera', 'cm') +
      '</div></fieldset>' +
      '<fieldset class="mfs"><legend>Extremidades</legend><div class="field-grid-4">' +
      mfield('m-bi', 'Brazo izquierdo', 'cm') + mfield('m-bd', 'Brazo derecho', 'cm') + mfield('m-ai', 'Antebrazo izquierdo', 'cm') + mfield('m-ad', 'Antebrazo derecho', 'cm') +
      mfield('m-mi', 'Muslo izquierdo', 'cm') + mfield('m-md', 'Muslo derecho', 'cm') + mfield('m-gi', 'Gemelo izquierdo', 'cm') + mfield('m-gd', 'Gemelo derecho', 'cm') +
      '</div></fieldset>' +
      '<p class="field-error" data-metric-empty hidden><i data-lucide="circle-alert"></i><span>Introduce al menos una métrica</span></p>' +
      '</form></div>' +
      '<div class="ov-foot">' +
      '<button class="btn btn-secondary" type="button" data-close>Cancelar</button>' +
      '<button class="btn btn-primary" type="submit" form="form-metric" data-metric-submit data-loading-label="Guardando..."><span data-if-not="edit">Añadir métricas</span><span data-if="edit">Guardar cambios</span></button>' +
      '</div></div></div>';
    return h;
  }

  /* ---------- inject ---------- */
  var extra = '';
  Array.prototype.forEach.call(doc.querySelectorAll('[data-tpl]'), function (ph) {
    var t = ph.getAttribute('data-tpl'), html = '';
    if (t === 'adherence') { html = adherenceHTML({ title: ph.getAttribute('data-title') }); extra += ADH_POP; }
    if (t === 'streak') html = streakHTML(ph.getAttribute('data-mode'));
    if (t === 'metrics-table') html = metricsTableHTML(+ph.getAttribute('data-rows') || 10);
    if (t === 'metric-dialog') html = metricDialogHTML();
    ph.insertAdjacentHTML('beforebegin', html);
    ph.remove();
  });
  if (extra) doc.body.insertAdjacentHTML('beforeend', extra);

  /* ======================================================================
     BEHAVIOUR
     ====================================================================== */
  // Period selects: range line follows the selected option
  doc.addEventListener('change', function (e) {
    var s = e.target;
    if (s.matches && s.matches('select[data-period]')) {
      var box = s.closest('.period');
      var line = box && box.querySelector('[data-period-range]');
      var opt = s.options[s.selectedIndex];
      if (line && opt) line.textContent = opt.getAttribute('data-range') || '';
      var group = s.getAttribute('data-period-group');
      if (group) {
        Array.prototype.forEach.call(doc.querySelectorAll('select[data-period-group="' + group + '"]'), function (o) {
          if (o === s) return;
          o.value = s.value;
          var b2 = o.closest('.period'), l2 = b2 && b2.querySelector('[data-period-range]');
          if (l2) l2.textContent = o.options[o.selectedIndex].getAttribute('data-range') || '';
          var c2 = b2 && b2.querySelector('[data-case]');
          if (c2) c2.hidden = s.value !== 'custom';
        });
      }
    }
  });

  // Adherence calendar day selection
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-adh-day]');
    if (b) {
      var i = +b.getAttribute('data-adh-day'), st = STATE[ST[i]];
      Array.prototype.forEach.call(b.parentNode.querySelectorAll('[data-adh-day]'), function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      var scope = b.closest('.adh');
      var q = function (sel) { return scope.querySelector(sel); };
      q('[data-adh-title]').textContent = longDate(ADH_START + i * DAY);
      var chip = q('[data-adh-chip]');
      chip.className = 'chip ' + st.chip; chip.textContent = st.label;
      q('[data-adh-prov]').hidden = i !== 30;
      var t = TR[i], n = NU[i], g = globalAt(i);
      q('[data-adh-plan]').textContent = 'Entrenamiento: ' + (ST[i] === 'rest' || t == null ? 'Sin pauta' : 'Pautado') + ' · Nutrición: ' + (n == null ? 'Sin pauta' : 'Pautado');
      q('[data-adh-metrics]').textContent = g == null ? 'Sin datos' :
        'Entrenamiento ' + (t == null ? '—' : t + ' %') + ' · Nutrición ' + (n == null ? '—' : n + ' %') + ' · Global ' + g + ' %';
      if (n == null) {
        q('[data-adh-kcal]').textContent = 'Sin datos';
        q('[data-adh-prot]').textContent = 'Sin datos';
      } else {
        var kcal = Math.round(2400 * (0.55 + 0.4 * n / 100) / 10) * 10;
        var prot = Math.round(150 * (0.5 + 0.45 * n / 100));
        var kOK = kcal >= 2160 && kcal <= 2640, pOK = prot >= 135;
        q('[data-adh-kcal]').textContent = num(kcal) + ' kcal estimadas / 2.400 kcal pautadas · ' + (kOK ? 'Dentro del objetivo' : 'Fuera del objetivo');
        q('[data-adh-prot]').textContent = prot + ' g estimados / 150 g pautados · ' + (pOK ? 'Dentro del objetivo' : 'Por debajo del mínimo');
      }
      return;
    }
    // Configuración: first save shows the 409 conflict, reload keeps the draft, second save succeeds
    var save = e.target.closest && e.target.closest('[data-cfg-save]');
    if (save) {
      var cfg = save.closest('.disc-body');
      if (!cfg._reloaded) { cfg.querySelector('[data-cfg-conflict]').hidden = false; cfg.querySelector('[data-cfg-conflict] button').focus(); }
      else {
        cfg.querySelector('[data-cfg-saved]').hidden = false;
        cfg.querySelector('[data-cfg-note]').hidden = true;
        if (window.Proto) window.Proto.toast('Configuración guardada', 'success', 'Vigente desde el 16/11/2026. No modifica días anteriores.');
      }
      return;
    }
    var reload = e.target.closest && e.target.closest('[data-cfg-reload]');
    if (reload) {
      var c = reload.closest('.disc-body');
      c._reloaded = true;
      c.querySelector('[data-cfg-conflict]').hidden = true;
      var v = doc.querySelector('[data-cfg-version]'); if (v) v.textContent = '5';
      if (window.Proto) window.Proto.toast('Versión 5 cargada', 'info', 'Se ha conservado tu borrador.');
      c.querySelector('[data-cfg-save]').focus();
    }
  });

  // Métricas dialog: at least one value
  doc.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id !== 'form-metric') return;
    e.preventDefault();
    var any = Array.prototype.some.call(f.querySelectorAll('input[type="number"]'), function (i) { return i.value !== ''; });
    var err = f.querySelector('[data-metric-empty]');
    if (!any && !doc.getElementById('dlg-metric').querySelector('[data-if="edit"]:not([hidden])')) { err.hidden = false; return; }
    err.hidden = true;
    var ov = doc.getElementById('dlg-metric');
    var edit = !!ov.querySelector('[data-if="edit"]:not([hidden])');
    ov.querySelector('[data-close]').click();
    if (window.Proto) window.Proto.toast(edit ? 'Métricas actualizadas' : 'Métricas añadidas', 'success');
  });

  // ?conflict=1 opens the configuration with the 409 banner
  if (/[?&]conflict=1/.test(location.search)) {
    var d = doc.getElementById('adh-config');
    if (d) { d.open = true; d.querySelector('[data-cfg-conflict]').hidden = false; }
  }

  doc.addEventListener('DOMContentLoaded', function () { observeCharts(doc); });
  window.ExomShared = { longDate: longDate, num: num, signed: signed, parseISO: parseISO };
})();
