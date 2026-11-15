/* Retos: prototype behaviour. Runs after proto.js boot (DOMContentLoaded order). */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);

  /* Variants row in the prototype bar (page-specific states the bar lacks) */
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
    return apply;
  }
  function busy(btn, ms, fn) {
    var label = btn.getAttribute('data-loading-label'), node = null;
    btn.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.textContent.trim()) node = n; });
    var old = node && node.textContent;
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    if (label && node) node.textContent = label;
    setTimeout(function () { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); if (node) node.textContent = old; fn(); }, ms || 700);
  }
  function closeOv(id) { var c = $('#' + id + ' [data-close]'); if (c) c.click(); }

  var setVariant;
  var assignName = '';

  function syncCount() {
    var all = $('[data-as-mode="all"]').getAttribute('aria-pressed') === 'true';
    var n = $$('[data-pick-cb]').filter(function (c) { return c.checked; }).length;
    $('#as-count').innerHTML = all ? 'Se generarán filas para <b>46 clientes visibles</b> ahora mismo.'
      : '<b>' + n + (n === 1 ? ' cliente' : ' clientes') + '</b> ' + (n === 1 ? 'seleccionado' : 'seleccionados') + ' para recibir el reto.';
    var ok = $('#as-ok');
    if (ok.getAttribute('aria-disabled') !== 'true') ok.disabled = !all && n === 0;
  }
  function syncFilters() {
    var dirty = $$('.tb-field select').some(function (s) { return s.selectedIndex > 0; }) || (($('[data-search]') || {}).value || '').trim() !== '' || doc.body.getAttribute('data-variant') === 'empty-filter';
    $('[data-clear-filters]').hidden = !dirty;
  }
  function liveSearch(q) {
    q = q.trim().toLowerCase();
    var n = 0;
    $$('.table tbody tr[data-open]').forEach(function (tr) {
      var hit = !q || tr.textContent.toLowerCase().indexOf(q) > -1;
      tr.hidden = !hit; if (hit) n++;
    });
    $('[data-count-label]').textContent = q ? n + (n === 1 ? ' reto encontrado' : ' retos encontrados') : '12 retos encontrados';
  }

  function boot() {
    setVariant = initVariants([['default', 'Normal'], ['button', 'Búsqueda con botón'], ['empty-filter', 'Sin resultados']]);
    doc.addEventListener('variantchange', function (e) {
      $('[data-count-label]').textContent = e.detail === 'empty-filter' ? '0 retos encontrados' : '12 retos encontrados';
      syncFilters();
    });
    syncFilters();

    // Empty state: counters at zero
    function syncState() {
      var empty = doc.body.getAttribute('data-state') === 'empty';
      $$('.fig[data-n]').forEach(function (f) { f.textContent = empty ? '0' : f.getAttribute('data-n'); });
      $('[data-count-label]').textContent = empty ? '0 retos encontrados' : '12 retos encontrados';
    }
    new MutationObserver(syncState).observe(doc.body, { attributes: true, attributeFilter: ['data-state'] });
    syncState();

    // Capture: prepare overlays before proto.js opens them
    doc.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-open]');
      if (!t) return;
      var id = t.getAttribute('data-open');
      if (id === '#dlg-form') {
        var edit = t.hasAttribute('data-edit');
        setTimeout(function () {
          $$('#dlg-form [data-if="edit"]').forEach(function (el) { el.hidden = !edit; });
          $$('#dlg-form [data-if-not="edit"]').forEach(function (el) { el.hidden = edit; });
          $('#form-reto').setAttribute('data-success-toast', edit ? 'Reto actualizado correctamente' : 'Reto creado correctamente');
        }, 0);
      }
      if (id === '#dlg-assign') {
        assignName = t.getAttribute('data-ctx-name') || '';
        setTimeout(function () {
          var all = $('[data-as-mode="all"]'), some = $('[data-as-mode="some"]');
          some.setAttribute('aria-pressed', 'true'); all.setAttribute('aria-pressed', 'false');
          $('#as-specific').hidden = false; $('#as-all').hidden = true;
          var s = $('[data-pick-search]'); s.value = '';
          $$('.pick-row').forEach(function (r) { r.hidden = false; });
          syncCount();
        }, 0);
      }
    }, true);

    doc.addEventListener('click', function (e) {
      var el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest('[data-as-mode]')) setTimeout(syncCount, 0);
      if (el.closest('#as-ok')) {
        var b = $('#as-ok');
        if (b.disabled || b.getAttribute('aria-disabled') === 'true') return;
        var all = $('[data-as-mode="all"]').getAttribute('aria-pressed') === 'true';
        busy(b, 800, function () { closeOv('dlg-assign'); Proto.toast(all ? 'Reto asignado a todos los clientes visibles' : 'Reto asignado correctamente', 'success'); });
      }
      if (el.closest('#dl-ok')) {
        busy($('#dl-ok'), 800, function () { closeOv('dlg-delete'); Proto.toast('Reto eliminado', 'success'); });
      }
      if (el.closest('[data-clear-filters]')) {
        setTimeout(function () { liveSearch(''); if (doc.body.getAttribute('data-variant') === 'empty-filter') setVariant('default'); syncFilters(); }, 0);
      }
      if (el.closest('[data-clear-variant]')) { setVariant('default'); }
    });
    doc.addEventListener('change', function (e) {
      if (e.target.matches('[data-pick-cb]')) syncCount();
      if (e.target.matches('.tb-field select')) syncFilters();
    });
    doc.addEventListener('input', function (e) {
      var t = e.target;
      if (t.matches('[data-pick-search]')) {
        var q = t.value.trim().toLowerCase();
        $$('.pick-row').forEach(function (r) { r.hidden = q && r.getAttribute('data-pick').indexOf(q) < 0; });
      }
      if (t.matches('[data-search]') && doc.body.getAttribute('data-variant') !== 'button') { liveSearch(t.value); syncFilters(); }
    });
    var op = params.get('open');
    if (op === 'dlg-assign') syncCount();
  }
  // Deferred scripts run before DOMContentLoaded: wait so proto.js has built the shell first.
  doc.addEventListener('DOMContentLoaded', boot);
})();
