/*
 * recap-detalle.html - prototype behaviour.
 * Variants (?v= or prototype bar "Recap"): review (Por revisar), reviewed, archived, conflict, refresh.
 * - Respuestas | Revisión switch under 960px of content width.
 * - In-page index highlights the section in view.
 * - Block 1: editing disables "Publicar revisión" until "Guardar borrador privado"; publish asks for confirmation.
 * - Block 2: "Marcar como revisado" / "Guardar cambios" sit at the foot of their own fields.
 * - Unsaved-changes guard on every navigation link while a block is dirty.
 */
(function () {
  'use strict';
  var doc = document;
  function $(id) { return doc.getElementById(id); }
  function all(sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); }

  var VARIANTS = [['review', 'por revisar'], ['reviewed', 'revisado'], ['archived', 'archivado'], ['conflict', 'conflicto'], ['refresh', 'error de refresco']];
  var variant = 'review';
  var dirty1 = false, dirty2 = false;
  var draftVersion = 3;
  var pendingHref = null;

  var COMMENT = 'Muy buena semana, Lucía. Hemos bajado un poco el peso en la sentadilla búlgara para cuidar la rodilla: céntrate en que no se vaya hacia dentro.';
  var NOTE = 'Vigilar rodilla izquierda. Si persiste dos semanas, proponer valoración con fisio.';

  function setLoading(btn, on) {
    var label = btn.getAttribute('data-loading-label');
    var node = null;
    Array.prototype.forEach.call(btn.childNodes, function (n) { if (n.nodeType === 3 && n.textContent.trim()) node = n; });
    btn.classList.toggle('is-loading', on);
    if (on) { btn.setAttribute('aria-busy', 'true'); if (label && node) { btn._label = node.textContent; node.textContent = label; } }
    else { btn.removeAttribute('aria-busy'); if (btn._label && node) { node.textContent = btn._label; btn._label = null; } }
  }

  /* ---------- variants ---------- */
  function setVariant(v) {
    variant = v;
    all('[data-v]').forEach(function (el) { el.hidden = el.getAttribute('data-v').split(/\s+/).indexOf(v) < 0; });
    var archived = v === 'archived';
    var reviewed = v === 'reviewed' || archived;
    $('rd-review').classList.toggle('is-readonly', archived);
    all('#rd-review textarea').forEach(function (t) { t.readOnly = archived; });
    all('[data-edit-only]').forEach(function (el) { el.hidden = archived; });
    $('rv-comment').value = reviewed ? COMMENT : '';
    $('rv-note').value = reviewed ? NOTE : '';
    dirty1 = false; dirty2 = false;
    sync();
    all('[data-pv]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.value === v)); });
    if (window.Proto) window.Proto.icons();
  }

  function sync() {
    $('rv-save-draft').disabled = !dirty1;
    $('rv-publish').disabled = dirty1;
    $('rv-1-hint').hidden = !dirty1;
    $('rv-save-comments').disabled = !dirty2;
    $('rd-print').disabled = dirty1 || dirty2;
    var dirty = dirty1 || dirty2;
    // Navigation links open the guard while dirty (proto.js handles [data-open]).
    all('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || h.charAt(0) === '#' || h.indexOf('mailto:') === 0 || a.closest('#main')) return;
      if (dirty) a.setAttribute('data-open', '#dlg-unsaved'); else if (a.getAttribute('data-open') === '#dlg-unsaved') a.removeAttribute('data-open');
    });
  }

  /* ---------- index highlight ---------- */
  function initIndex() {
    var links = all('.rd-index a');
    var secs = links.map(function (a) { return doc.querySelector(a.getAttribute('href')); });
    function mark(id) { links.forEach(function (a) { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); }
    function onScroll() {
      var line = 52 + 56 + 24;
      var cur = secs[0];
      secs.forEach(function (s) { if (s.getBoundingClientRect().top - line <= 0) cur = s; });
      if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 4) cur = secs[secs.length - 1];
      mark(cur.id);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    links.forEach(function (a) { a.addEventListener('click', function () { window.setTimeout(function () { mark(a.getAttribute('href').slice(1)); }, 30); }); });
    onScroll();
  }

  /* ---------- prototype bar row ---------- */
  function addVariantRow() {
    var panel = $('proto-panel');
    if (!panel) return;
    panel.insertAdjacentHTML('beforeend', '<div class="proto-row"><span>Recap</span><div class="proto-opts">' +
      VARIANTS.map(function (o) { return '<button type="button" data-pv value="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>');
  }

  function init() {
    addVariantRow();
    var params = new URLSearchParams(window.location.search);
    var v = params.get('v');
    setVariant(VARIANTS.some(function (o) { return o[0] === v; }) ? v : 'review');
    if (params.get('view') === 'review') setView('review');
    initIndex();

    doc.addEventListener('input', function (e) {
      var t = e.target;
      if (!t.closest) return;
      if (t.closest('[data-block="1"]')) { dirty1 = true; sync(); }
      if (t.closest('[data-block="2"]')) { dirty2 = true; sync(); }
    });

    doc.addEventListener('click', function (e) {
      var t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      var pv = t.closest('[data-pv]');
      if (pv) { setVariant(pv.value); return; }
      var pvs = t.closest('[data-pv-set]');
      if (pvs) { setVariant(pvs.getAttribute('data-pv-set')); return; }
      var vw = t.closest('.rd-switch .seg-btn');
      if (vw) { setView(vw.getAttribute('data-view')); return; }

      if (t.closest('#rd-print') && !$('rd-print').disabled) { window.print(); return; }

      var saveDraft = t.closest('#rv-save-draft');
      if (saveDraft && !saveDraft.disabled) {
        setLoading(saveDraft, true);
        window.setTimeout(function () {
          setLoading(saveDraft, false);
          draftVersion += 1;
          doc.querySelector('[data-draft-version]').textContent = 'versión ' + draftVersion;
          dirty1 = false; sync();
          $('rv-publish').focus();
        }, 700);
        return;
      }

      var pubOk = t.closest('#dlg-publish-ok');
      if (pubOk) {
        setLoading(pubOk, true);
        window.setTimeout(function () {
          setLoading(pubOk, false);
          doc.querySelector('[data-pub="summary"]').textContent = $('rv-summary').value;
          doc.querySelector('[data-pub="changes"]').textContent = $('rv-changes').value;
          doc.querySelector('[data-pub="goals"]').textContent = $('rv-goals').value;
          var det = $('rv-published');
          det.open = true;
          det.classList.add('is-fresh');
          doc.querySelector('#dlg-publish [data-close]').click();
        }, 700);
        return;
      }

      var mark = t.closest('#rv-mark');
      if (mark) {
        setLoading(mark, true);
        window.setTimeout(function () {
          setLoading(mark, false);
          var c = $('rv-comment').value, n = $('rv-note').value;
          setVariant('reviewed');
          if (c) $('rv-comment').value = c;
          if (n) $('rv-note').value = n;
          window.Proto.toast('Recap revisado correctamente', 'success');
        }, 800);
        return;
      }

      var saveC = t.closest('#rv-save-comments');
      if (saveC && !saveC.disabled) {
        setLoading(saveC, true);
        window.setTimeout(function () {
          setLoading(saveC, false);
          dirty2 = false; sync();
          window.Proto.toast('Comentario guardado correctamente', 'success');
        }, 800);
        return;
      }

      if (t.closest('#dlg-archive-ok')) {
        doc.querySelector('#dlg-archive [data-close]').click();
        setVariant('archived');
        window.Proto.toast('Recap archivado correctamente', 'success');
        return;
      }

      // Remember where a guarded link wanted to go
      var a = t.closest('a[data-open="#dlg-unsaved"]');
      if (a) pendingHref = a.getAttribute('href');
      if (t.closest('#dlg-unsaved-leave') && pendingHref) { dirty1 = dirty2 = false; window.location.href = pendingHref; }
    }, true);
  }

  function setView(v) {
    var body = doc.querySelector('.rd-body');
    body.setAttribute('data-view', v);
    all('.rd-switch .seg-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
    var top = doc.querySelector('.rd-wrap').getBoundingClientRect().top + window.scrollY - 64;
    if (window.scrollY > top) window.scrollTo(0, top);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
