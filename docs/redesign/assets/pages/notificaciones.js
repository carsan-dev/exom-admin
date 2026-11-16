/* Notificaciones: prototype behaviour. Boots after proto.js (DOMContentLoaded order). */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);

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
    }
    apply(cur);
    return apply;
  }
  function busy(btn, ms, fn) {
    var label = btn.getAttribute('data-loading-label'), node = null;
    btn.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.textContent.trim()) node = n; });
    var old = node && node.textContent;
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    if (label && node) node.textContent = label;
    setTimeout(function () { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); if (node) node.textContent = old; fn(); }, ms || 800);
  }
  function closeOv(id) { var c = $('#' + id + ' [data-close]'); if (c) c.click(); }

  var TPL = {
    recap: ['Recordatorio de recap', 'Envía tu recap semanal antes del domingo a las 21:00.', 'Recap'],
    entreno: ['Recordatorio entreno', 'Tu entrenamiento de hoy ya está listo. ¡A por ello!', 'Entrenamiento'],
    dieta: ['Recordatorio dieta', 'No olvides marcar tus comidas de hoy en la app.', 'Dieta'],
    semanal: ['¡Buen trabajo esta semana!', 'Has cumplido tu plan. Descansa bien y a por la próxima.', 'Inicio'],
    mensual: ['Revisión mensual', 'Esta semana revisamos tu progreso del mes. Prepara tus fotos y medidas.', 'Recap']
  };
  var TOTAL = 46;

  function selected() { return $$('#pop-recip .opt').filter(function (o) { return o.getAttribute('aria-selected') === 'true'; }); }
  function syncRecip() {
    var all = $('#send-all').checked, sel = selected();
    $('#recip-btn').disabled = all;
    $('#recip-btn-t').textContent = all ? 'Todos tus clientes visibles' : (sel.length ? (sel.length === 1 ? '1 destinatario' : sel.length + ' destinatarios') : 'Seleccionar destinatarios...');
    $('#recip-btn').style.color = sel.length || all ? 'var(--ink)' : '';
    $('#recip-chips').innerHTML = all ? '' : sel.map(function (o) {
      var n = o.getAttribute('data-recip');
      return '<span class="recip-chip"><span class="avatar" aria-hidden="true">' + o.getAttribute('data-av') + '</span>' + n +
        '<button type="button" data-unpick="' + n + '" aria-label="Quitar ' + n + '"><i data-lucide="x"></i></button></span>';
    }).join('');
    $('#recip-help').textContent = all ? 'La selección manual queda desactivada mientras envías a todos tus clientes.' : 'Puedes elegir uno o varios clientes concretos.';
    var n = all ? TOTAL : sel.length;
    $('[data-reach]').textContent = n === 0 ? 'Elige al menos un destinatario' : 'Se enviará a ' + n + (n === 1 ? ' cliente' : ' clientes');
    var f = $('#recip-field');
    if (n > 0 && f.classList.contains('is-invalid')) clearErr(f);
    Proto.icons();
  }
  function syncPreview() {
    var t = $('#sd-title').value.trim(), b = $('#sd-body').value.trim();
    var pt = $('[data-pv-title]'), pb = $('[data-pv-body]');
    pt.textContent = t || 'Nuevo recordatorio'; pt.classList.toggle('is-placeholder', !t);
    pb.textContent = b || 'Escribe el mensaje que recibirán tus clientes...'; pb.classList.toggle('is-placeholder', !b);
    $('[data-pv-route]').textContent = 'Al tocarla se abrirá ' + $('#sd-route').value + '.';
    var c = $('[data-count-for="sd-title"]');
    c.textContent = $('#sd-title').value.length + '/100';
    c.classList.toggle('is-near', $('#sd-title').value.length >= 90);
  }
  function setErr(field, msg) {
    field.classList.add('is-invalid');
    var inp = field.querySelector('input, textarea, .combo');
    if (inp) inp.setAttribute('aria-invalid', 'true');
    if (!field.querySelector('.field-error')) {
      var p = doc.createElement('p'); p.className = 'field-error'; p.innerHTML = '<i data-lucide="circle-alert"></i><span></span>';
      p.lastChild.textContent = msg;
      var foot = field.querySelector('.field-foot, .field-help');
      if (foot) field.insertBefore(p, foot); else field.appendChild(p);
    }
  }
  function clearErr(field) {
    field.classList.remove('is-invalid');
    var inp = field.querySelector('[aria-invalid]'); if (inp) inp.removeAttribute('aria-invalid');
    var e = field.querySelector('.field-error'); if (e) e.remove();
  }
  function validate() {
    var ok = true, first = null;
    var all = $('#send-all').checked;
    if (!all && !selected().length) { setErr($('#recip-field'), 'Selecciona al menos un destinatario'); ok = false; first = first || $('#recip-btn'); }
    if (!$('#sd-title').value.trim()) { setErr($('#sd-title').closest('.field'), 'El título es obligatorio'); ok = false; first = first || $('#sd-title'); }
    if (!$('#sd-body').value.trim()) { setErr($('#sd-body').closest('.field'), 'El cuerpo es obligatorio'); ok = false; first = first || $('#sd-body'); }
    Proto.icons();
    if (first) first.focus();
    return ok;
  }
  function resetSend() {
    $('#form-send').reset();
    $$('#pop-recip .opt').forEach(function (o, i) { o.setAttribute('aria-selected', String(i < 3)); });
    $$('.tpl-btn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    $$('#dlg-send .field.is-invalid').forEach(clearErr);
    $('#sd-body').dispatchEvent(new Event('input', { bubbles: true }));
    syncRecip(); syncPreview();
  }
  function done(n) {
    if (doc.body.getAttribute('data-variant') === 'partial') Proto.toast('Se enviaron ' + (n - 2) + ' y fallaron 2. Revisa el historial para ver el detalle.', 'danger');
    else Proto.toast(n === 1 ? 'Notificación enviada correctamente' : 'Notificaciones enviadas a ' + n + ' clientes', 'success');
  }
  function filterRows() {
    var st = ($$('[data-status]').filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || {}).getAttribute ? $$('[data-status]').filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0].getAttribute('data-status') : 'all';
    var q = ($('[data-search]').value || '').trim().toLowerCase();
    var cl = $('[data-f]').selectedIndex > 0 ? $('[data-f]').value : '';
    var n = 0;
    $$('.nt-table tbody tr').forEach(function (tr) {
      if (!tr.querySelector('.nt-msg')) return;
      var failed = tr.classList.contains('is-failed');
      var hit = (st === 'all' || (st === 'ko') === failed) &&
        (!q || tr.querySelector('.nt-msg').textContent.toLowerCase().indexOf(q) > -1) &&
        (!cl || tr.querySelector('.entity-name').textContent === cl);
      tr.hidden = !hit; if (hit) n++;
    });
    $('.nt-noresults').hidden = n > 0;
    $('[data-clear-filters]').hidden = st === 'all' && !q && !cl;
  }

  function boot() {
    initVariants([['default', 'Normal'], ['partial', 'Envío parcial'], ['cartera', 'Error de cartera']]);
    function syncState() {
      var empty = doc.body.getAttribute('data-state') === 'empty';
      $$('.fig[data-n]').forEach(function (f) { f.textContent = empty ? '0' : f.getAttribute('data-n'); });
      var fc = $('[data-failed]');
      fc.classList.toggle('is-alert', !empty); fc.setAttribute('data-tone', empty ? '' : 'danger');
    }
    new MutationObserver(syncState).observe(doc.body, { attributes: true, attributeFilter: ['data-state'] });
    syncState();
    resetSend();

    doc.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-open="#dlg-send"]');
      if (t) resetSend();
      var snd = e.target.closest && e.target.closest('#sd-send');
      if (snd) {
        // Decide before proto.js handles the click: invalid -> stop; "todos" -> confirm dialog; else send.
        if (!validate()) { e.stopPropagation(); snd.removeAttribute('data-open'); return; }
        if ($('#send-all').checked) { snd.setAttribute('data-open', '#dlg-all'); return; }
        snd.removeAttribute('data-open');
        e.stopPropagation();
        var n = selected().length;
        busy(snd, 900, function () { closeOv('dlg-send'); done(n); });
      }
    }, true);

    doc.addEventListener('click', function (e) {
      var el = e.target;
      if (!(el instanceof Element)) return;
      var tp = el.closest('[data-tpl]');
      if (tp) {
        var d = TPL[tp.getAttribute('data-tpl')];
        $('#sd-title').value = d[0]; $('#sd-body').value = d[1]; $('#sd-route').value = d[2];
        $('#sd-body').dispatchEvent(new Event('input', { bubbles: true }));
        $$('.tpl-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b === tp)); });
        $$('#dlg-send .field.is-invalid').forEach(function (f) { if (f.id !== 'recip-field') clearErr(f); });
        syncPreview();
      }
      var op = el.closest('#pop-recip .opt');
      if (op) { op.setAttribute('aria-selected', String(op.getAttribute('aria-selected') !== 'true')); syncRecip(); }
      var un = el.closest('[data-unpick]');
      if (un) { var o = $('#pop-recip .opt[data-recip="' + un.getAttribute('data-unpick') + '"]'); if (o) o.setAttribute('aria-selected', 'false'); syncRecip(); $('#recip-btn').focus(); }
      if (el.closest('#al-ok')) busy($('#al-ok'), 900, function () { closeOv('dlg-all'); closeOv('dlg-send'); done(TOTAL); });
      if (el.closest('[data-retry-cartera]')) busy(el.closest('[data-retry-cartera]'), 700, function () { $$('[data-v="cartera"]').forEach(function (b) { b.hidden = true; }); });
      if (el.closest('[data-status]')) setTimeout(filterRows, 0);
      if (el.closest('[data-clear-filters]')) setTimeout(function () { $$('[data-status]').forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === 0)); }); filterRows(); }, 0);
    });
    doc.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'sd-title' || t.id === 'sd-body') { syncPreview(); var f = t.closest('.field'); if (f.classList.contains('is-invalid') && t.value.trim()) clearErr(f); $$('.tpl-btn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); }
      if (t.matches('[data-recip-search]')) {
        var q = t.value.trim().toLowerCase();
        $$('#pop-recip .opt').forEach(function (o) { o.hidden = q && o.getAttribute('data-q').indexOf(q) < 0; });
      }
      if (t.matches('[data-search]')) filterRows();
    });
    doc.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'send-all') syncRecip();
      if (t.id === 'sd-route') syncPreview();
      if (t.matches('[data-f]')) filterRows();
      if (t.id === 'period') {
        $('[data-period-label]').textContent = t.options[t.selectedIndex].text;
        var RANGES = { '7': '09/11/2026 – 15/11/2026', '30': '16/10/2026 – 15/11/2026', '90': '17/08/2026 – 15/11/2026', 'year': '01/01/2026 – 15/11/2026', 'all': 'Desde el primer envío', 'custom': '01/11/2026 – 15/11/2026' };
        $('[data-period-range]').textContent = RANGES[t.value] || '';
      }
    });
    if (params.get('all') === '1') { $('#send-all').checked = true; syncRecip(); }
    if (params.get('fill') === '1') { $('[data-tpl="entreno"]').click(); }
  }
  doc.addEventListener('DOMContentLoaded', boot);
})();
