/* Logros: prototype behaviour. Runs after proto.js boot (DOMContentLoaded order). */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);

  function busy(btn, ms, fn) {
    var label = btn.getAttribute('data-loading-label'), node = null;
    btn.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.textContent.trim()) node = n; });
    var old = node && node.textContent;
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    if (label && node) node.textContent = label;
    setTimeout(function () { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); if (node) node.textContent = old; fn(); }, ms || 700);
  }
  function closeOv(id) { var c = $('#' + id + ' [data-close]'); if (c) c.click(); }

  var RULES = {
    TRAINING_DAYS: { unit: ['día', 'días'], what: function (t) { return t && t !== 'Cualquier entrenamiento' ? 'Días con un entrenamiento de tipo ' + t + ' completado.' : 'Días con al menos un entrenamiento completado.'; } },
    STREAK_DAYS: { unit: ['día', 'días'], what: function () { return 'Días seguidos de racha activa del cliente.'; } },
    CHALLENGES_COMPLETED: { unit: ['reto', 'retos'], what: function () { return 'Retos completados por el cliente.'; } },
    WEIGHT_LOGS: { unit: ['registro', 'registros'], what: function () { return 'Registros de peso del cliente.'; } },
    CUSTOM: { unit: null, what: function () { return 'Nada: lo otorgas tú manualmente desde «Otorgar».'; } }
  };
  function syncRule() {
    var r = $('#l-rule').value, def = RULES[r];
    var meta = +$('#l-meta').value || 1;
    var unit = def.unit ? def.unit[meta === 1 ? 0 : 1] : '';
    $('[data-meta-unit]').textContent = unit;
    $('[data-meta-field]').hidden = r === 'CUSTOM';
    $('[data-rp-mode]').textContent = r === 'CUSTOM' ? 'Manual' : 'Automático';
    $('[data-rp-what]').textContent = def.what($('#l-type').value);
    $('[data-rp-goal]').textContent = r === 'CUSTOM' ? 'Sin meta numérica' : meta + ' ' + unit;
    $('[data-rp-note]').textContent = r === 'CUSTOM'
      ? 'Los logros personalizados no se evalúan solos: se otorgan a mano desde «Otorgar».'
      : 'Al guardar, se revisa el historial de todos los clientes afectados: se otorga el logro a quien ya cumple la meta y se retira a quien ya no la cumple.';
  }
  function syncIcon() {
    var v = $('[data-icon-url]').value.trim(), box = $('#icon-prev'), help = $('#l-icon-help');
    var ok = /^https?:\/\/\S+\.\S+/.test(v);
    var field = $('[data-icon-url]').closest('.field');
    field.classList.toggle('is-invalid', !!v && !ok);
    help.textContent = v && !ok ? 'Introduce una URL válida' : 'Pega la URL de una imagen cuadrada.';
    help.className = v && !ok ? 'field-error' : 'field-help';
    if (ok) {
      var img = new Image();
      img.alt = '';
      img.onload = function () { box.innerHTML = ''; box.appendChild(img); };
      img.onerror = function () { box.innerHTML = '<i data-lucide="image-off"></i>'; Proto.icons(); };
      img.src = v;
    } else { box.innerHTML = '<i data-lucide="award"></i>'; Proto.icons(); }
  }
  function syncUsers() {
    var n = 0;
    $$('[data-us-cb]').forEach(function (c) { c.closest('.us-row').classList.toggle('is-selected', c.checked); if (c.checked) n++; });
    var b = $('#recalc-sel');
    b.lastChild.textContent = 'Recalcular selección (' + n + ')';
    b.disabled = n === 0;
  }
  function syncGrant() {
    var n = $$('#dlg-grant [data-pick-cb]').filter(function (c) { return c.checked; }).length;
    $('#gr-count').textContent = n === 1 ? '1 cliente seleccionado' : n + ' clientes seleccionados';
    $('#gr-ok').disabled = n === 0;
  }

  var revokeTarget = null, recalcScope = 'visible';

  function boot() {
    doc.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-open]');
      if (!t) return;
      var id = t.getAttribute('data-open');
      if (id === '#dlg-form') {
        var edit = t.hasAttribute('data-edit');
        setTimeout(function () {
          $$('#dlg-form [data-if="edit"]').forEach(function (el) { el.hidden = !edit; });
          $$('#dlg-form [data-if-not="edit"]').forEach(function (el) { el.hidden = edit; });
          $('#form-logro').setAttribute('data-success-toast', edit ? 'Logro actualizado correctamente' : 'Logro creado correctamente');
          syncRule(); syncIcon();
        }, 0);
      }
      if (id === '#dlg-grant') setTimeout(function () { $$('#dlg-grant [data-pick-cb]').forEach(function (c) { c.checked = false; }); syncGrant(); }, 0);
      if (id === '#dlg-revoke') revokeTarget = t.closest('.us-row');
      if (id === '#dlg-recalc') {
        recalcScope = t.getAttribute('data-recalc');
        var n = $$('[data-us-cb]').filter(function (c) { return c.checked; }).length;
        $('#rc-scope').textContent = recalcScope === 'sel' ? (n === 1 ? 'el cliente seleccionado' : 'los ' + n + ' clientes seleccionados') : 'los clientes visibles';
      }
    }, true);

    doc.addEventListener('click', function (e) {
      var el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest('[data-dismiss-info]')) { $('#lg-info').remove(); }
      if (el.closest('#rc-ok')) busy($('#rc-ok'), 900, function () { closeOv('dlg-recalc'); Proto.toast('Recálculo completado: 1 otorgado(s) y 0 revocado(s).', 'success'); });
      if (el.closest('#rv-ok')) busy($('#rv-ok'), 700, function () { closeOv('dlg-revoke'); if (revokeTarget) revokeTarget.remove(); syncUsers(); Proto.toast('Logro revocado correctamente', 'success'); });
      if (el.closest('#gr-ok') && !$('#gr-ok').disabled) {
        var n = $$('#dlg-grant [data-pick-cb]').filter(function (c) { return c.checked; }).length;
        busy($('#gr-ok'), 800, function () { closeOv('dlg-grant'); Proto.toast(n === 1 ? 'Logro otorgado a 1 cliente' : 'Logro otorgado a ' + n + ' clientes', 'success'); });
      }
      if (el.closest('#dl-ok')) busy($('#dl-ok'), 800, function () { closeOv('dlg-delete'); Proto.toast('Logro eliminado', 'success'); });
    });
    doc.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-us-cb]')) syncUsers();
      if (t.matches('#dlg-grant [data-pick-cb]')) syncGrant();
      if (t.id === 'l-rule' || t.id === 'l-type') syncRule();
      if (t.matches('.tb-field select')) $('[data-clear-filters]').hidden = t.selectedIndex === 0;
    });
    doc.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'l-meta') syncRule();
      if (t.matches('[data-icon-url]')) syncIcon();
      if (t.matches('[data-pick-search]')) {
        var q = t.value.trim().toLowerCase();
        $$('#dlg-grant .pick-row').forEach(function (r) { r.hidden = q && r.getAttribute('data-pick').indexOf(q) < 0; });
      }
      if (t.matches('[data-search]')) {
        var s = t.value.trim().toLowerCase(), n = 0;
        $$('.table tbody tr').forEach(function (tr) { var hit = !s || tr.textContent.toLowerCase().indexOf(s) > -1; tr.hidden = !hit; if (hit) n++; });
        $('[data-count-label]').textContent = s ? n + (n === 1 ? ' logro encontrado' : ' logros encontrados') : '14 logros encontrados';
        $('[data-clear-filters]').hidden = !s;
      }
    });
    doc.addEventListener('reset', function () { setTimeout(function () { $$('.table tbody tr').forEach(function (tr) { tr.hidden = false; }); $('[data-count-label]').textContent = '14 logros encontrados'; $('[data-clear-filters]').hidden = true; }, 0); });

    function syncState() {
      var empty = doc.body.getAttribute('data-state') === 'empty';
      $$('.fig[data-n]').forEach(function (f) { f.textContent = empty ? '0' : f.getAttribute('data-n'); });
      $('[data-count-label]').textContent = empty ? '0 logros encontrados' : '14 logros encontrados';
    }
    new MutationObserver(syncState).observe(doc.body, { attributes: true, attributeFilter: ['data-state'] });
    syncState();
    syncUsers(); syncRule();
    if (params.get('open') === 'sheet-users') $$('#sheet-users [data-if="auto"]').forEach(function (el) { el.hidden = false; });
  }
  // Deferred scripts run before DOMContentLoaded: wait so proto.js has built the shell first.
  doc.addEventListener('DOMContentLoaded', boot);
})();
