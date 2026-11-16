/* Catalog + builders page layer. Loaded at the end of <body>, before proto.js
   boots (DOMContentLoaded), so these delegated listeners run before proto's.

   Attributes
   - body[data-variants='[["key","label"],...]'] + ?variant=key
       Adds a "Variante" row to the prototype panel. [data-v="a b"] is visible
       only in those variants, [data-v-not="a"] hidden in them.
   - tr[data-row-open]          row click activates its .row-anchor button
   - [data-mode="new|edit|dup"] on a [data-open] trigger: sets texts
       [data-t-new|edit|dup] and [data-mode-only] inside the target overlay
   - [data-move="up|down"]      moves the closest [data-movable] (renumbers .rx-num)
   - [data-remove-item]         removes the closest [data-movable]
   - [data-toggle-pressed]      toggles aria-pressed
   - [data-collapse="#id"]      toggles .is-collapsed on target, aria-expanded
   - [data-sheet-open="#id"] / [data-sheet-close]   builder bottom sheet (< 1200)
   - [data-close-also="#id"]    clicking also closes that overlay
   - .range2                    dual range sync
   - [data-sel-n]               filled with the selected row count of table [data-sel-for]
*/
(function () {
  'use strict';
  var doc = document;
  var params = {};
  try { new URLSearchParams(window.location.search).forEach(function (v, k) { params[k] = v; }); } catch (e) { /* ignore */ }

  function tokens(v) { return String(v || '').split(/\s+/).filter(Boolean); }
  function each(sel, fn, scope) { Array.prototype.forEach.call((scope || doc).querySelectorAll(sel), fn); }

  // Review links (?pop=id): keep the float open when the capture tool resizes the window
  if (params.pop) window.addEventListener('resize', function (e) { e.stopImmediatePropagation(); });

  /* ---------- variants ---------- */
  var variant = params.variant || '';
  function applyVariant(v) {
    variant = v || '';
    doc.body.setAttribute('data-variant', variant);
    each('[data-v]', function (el) { el.classList.toggle('is-v-off', tokens(el.getAttribute('data-v')).indexOf(variant) < 0); });
    each('[data-v-not]', function (el) { el.classList.toggle('is-v-off', tokens(el.getAttribute('data-v-not')).indexOf(variant) > -1); });
    each('[data-variant-btn]', function (b) { b.setAttribute('aria-pressed', String(b.value === variant)); });
    doc.dispatchEvent(new CustomEvent('variantchange', { detail: { variant: variant } }));
  }
  function injectVariantRow() {
    var raw = doc.body.getAttribute('data-variants');
    var panel = doc.getElementById('proto-panel');
    if (!raw || !panel) return;
    var list;
    try { list = JSON.parse(raw); } catch (e) { return; }
    var html = '<div class="proto-row"><span>Variante</span><div class="proto-opts">' +
      '<button type="button" data-variant-btn value="">normal</button>' +
      list.map(function (o) { return '<button type="button" data-variant-btn value="' + o[0] + '">' + o[1] + '</button>'; }).join('') +
      '</div></div>';
    panel.insertAdjacentHTML('beforeend', html);
  }

  /* ---------- modes (new / edit / duplicate) ---------- */
  function applyMode(target, mode) {
    each('[data-t-' + mode + ']', function (el) { el.textContent = el.getAttribute('data-t-' + mode); }, target);
    each('[data-mode-only]', function (el) { el.hidden = tokens(el.getAttribute('data-mode-only')).indexOf(mode) < 0; }, target);
    // Field defaults per mode (proto resets forms to their default value on open)
    each('[data-val-new], [data-val-edit], [data-val-dup]', function (el) {
      var v = el.getAttribute('data-val-' + mode);
      if (v == null) v = '';
      if (el.tagName === 'SELECT') {
        Array.prototype.forEach.call(el.options, function (o) { o.defaultSelected = (o.value || o.text) === v; });
      } else if (el.tagName === 'TEXTAREA') el.defaultValue = v;
      else el.setAttribute('value', v);
      el.value = v;
    }, target);
    each('[data-st-' + mode + ']', function (el) { el.setAttribute('data-success-toast', el.getAttribute('data-st-' + mode)); }, target);
    target.setAttribute('data-mode', mode);
  }

  /* ---------- reorder ---------- */
  var live;
  function announce(msg) {
    if (!live) {
      live = doc.createElement('div');
      live.className = 'sr-only';
      live.setAttribute('aria-live', 'polite');
      doc.body.appendChild(live);
    }
    live.textContent = msg;
  }
  function renumber(list) {
    if (!list) return;
    var n = 0;
    Array.prototype.forEach.call(list.children, function (ch) {
      if (!ch.matches('[data-movable]') || ch.classList.contains('is-v-off')) return;
      n++;
      var num = ch.querySelector(':scope > .rx-num, :scope > .circuit-head > .rx-num, :scope .ml-num');
      if (num) num.textContent = n;
      var up = ch.querySelector('[data-move="up"]');
      var down = ch.querySelector('[data-move="down"]');
      if (up) up.disabled = false;
      if (down) down.disabled = false;
    });
    var items = Array.prototype.filter.call(list.children, function (c) { return c.matches('[data-movable]') && !c.classList.contains('is-v-off'); });
    if (items.length) {
      var f = items[0].querySelector('[data-move="up"]');
      var l = items[items.length - 1].querySelector('[data-move="down"]');
      if (f) f.disabled = true;
      if (l) l.disabled = true;
    }
  }
  function move(btn) {
    var item = btn.closest('[data-movable]');
    if (!item) return;
    var list = item.parentNode;
    var dir = btn.getAttribute('data-move');
    var sib = item;
    do { sib = dir === 'up' ? sib.previousElementSibling : sib.nextElementSibling; } while (sib && !sib.matches('[data-movable]'));
    if (!sib) return;
    if (dir === 'up') list.insertBefore(item, sib); else list.insertBefore(sib, item);
    renumber(list);
    var same = item.querySelector('[data-move="' + dir + '"]');
    var other = item.querySelector('[data-move="' + (dir === 'up' ? 'down' : 'up') + '"]');
    (same && !same.disabled ? same : other).focus();
    var name = item.getAttribute('data-name') || '';
    var pos = Array.prototype.filter.call(list.children, function (c) { return c.matches('[data-movable]'); }).indexOf(item) + 1;
    announce(name + ' movido a la posición ' + pos);
  }

  /* ---------- selection count ---------- */
  function syncSelCount() {
    each('[data-sel-n]', function (el) {
      var t = doc.querySelector(el.getAttribute('data-sel-n'));
      if (!t) return;
      var n = t.querySelectorAll('[data-select-row]:checked').length;
      var tpl = el.getAttribute('data-sel-tpl') || '{n}';
      el.textContent = tpl.replace('{n}', n);
    });
  }

  /* ---------- ranges ---------- */
  function syncRange(box, from) {
    var r = box.querySelectorAll('input[type="range"]');
    var nums = box.querySelectorAll('input[type="number"]');
    if (r.length < 2) return;
    var min = +r[0].min, max = +r[0].max;
    if (from && from.type === 'number') {
      var i = Array.prototype.indexOf.call(nums, from);
      if (i > -1 && from.value !== '') r[i].value = from.value;
    }
    var lo = +r[0].value, hi = +r[1].value;
    if (lo > hi) { if (from === r[0]) { r[0].value = hi; lo = hi; } else { r[1].value = lo; hi = lo; } }
    box.style.setProperty('--l', ((lo - min) / (max - min) * 100) + '%');
    box.style.setProperty('--r', ((hi - min) / (max - min) * 100) + '%');
    if (!from || from.type === 'range') { if (nums[0]) nums[0].value = lo; if (nums[1]) nums[1].value = hi; }
  }

  /* ---------- builder sheet (picker) ---------- */
  function sheet(id, open) {
    var el = doc.querySelector(id);
    if (!el) return;
    el.classList.toggle('is-open', open);
    var wb = el.closest('.workbench');
    var scrim = wb && wb.querySelector('.wb-scrim');
    if (scrim) scrim.classList.toggle('is-open', open);
    if (open) { var f = el.querySelector('input, button'); if (f) f.focus({ preventScroll: true }); }
  }

  /* ---------- events ---------- */
  doc.addEventListener('click', function (e) {
    var el = e.target;
    if (!(el instanceof Element)) return;

    var vb = el.closest('[data-variant-btn]');
    if (vb) { applyVariant(vb.value); return; }

    var modeT = el.closest('[data-mode][data-open]');
    if (modeT) {
      var tgt = doc.querySelector(modeT.getAttribute('data-open'));
      if (tgt) applyMode(tgt, modeT.getAttribute('data-mode'));
    }

    var row = el.closest('tr[data-row-open]');
    if (row && !el.closest('a, button, input, select, textarea, label, [data-open], .tag-more')) {
      var a = row.querySelector('.row-anchor');
      if (a) a.click();
      return;
    }

    var mv = el.closest('[data-move]');
    if (mv && !mv.disabled) { move(mv); return; }

    var rm = el.closest('[data-remove-item]');
    if (rm) {
      var item = rm.closest('[data-movable]');
      if (item) {
        var list = item.parentNode;
        var nm = item.getAttribute('data-name') || 'Elemento';
        var nextFocus = (item.nextElementSibling || item.previousElementSibling);
        item.remove();
        renumber(list);
        announce(nm + ' quitado');
        if (nextFocus) { var b = nextFocus.querySelector('button'); if (b) b.focus(); }
        doc.dispatchEvent(new CustomEvent('itemsChanged'));
      }
      return;
    }

    var xt = el.closest('.tag-x button');
    if (xt) {
      var tag = xt.closest('.tag-x');
      var box = tag && tag.parentNode;
      tag.remove();
      if (box) { var nb = box.querySelector('.tag-x button'); if (nb) nb.focus(); }
      return;
    }

    var tp = el.closest('[data-toggle-pressed]');
    if (tp) tp.setAttribute('aria-pressed', String(tp.getAttribute('aria-pressed') !== 'true'));

    var col = el.closest('[data-collapse]');
    if (col) {
      var target = doc.querySelector(col.getAttribute('data-collapse'));
      if (target) {
        var collapsed = target.classList.toggle('is-collapsed');
        if (target.classList.contains('macros-panel')) { target.classList.toggle('is-open', !collapsed); }
        col.setAttribute('aria-expanded', String(!collapsed));
      }
    }

    var so = el.closest('[data-sheet-open]');
    if (so) { sheet(so.getAttribute('data-sheet-open'), true); return; }
    var sc = el.closest('[data-sheet-close]');
    if (sc) {
      var host = sc.closest('.wb-right') || doc.querySelector('.wb-right.is-open');
      if (host) sheet('#' + host.id, false);
      var opener = doc.querySelector('[data-sheet-open="#' + (host && host.id) + '"]');
      if (opener && sc.classList.contains('wb-scrim') === false) opener.focus({ preventScroll: true });
      return;
    }

    var tf = el.closest('[data-toast-fill]');
    if (tf && window.Proto) {
      var scope = tf.closest('.overlay') || doc;
      var nameEl = scope.querySelector('[data-fill="name"]');
      Proto.toast(tf.getAttribute('data-toast-fill').replace('{name}', nameEl ? nameEl.textContent : ''), tf.getAttribute('data-toast-tone') || 'success');
    }

    var also = el.closest('[data-close-also]');
    if (also) {
      var ov = doc.querySelector(also.getAttribute('data-close-also'));
      var closer = ov && ov.querySelector('[data-close]');
      if (closer) closer.click();
    }
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openSheet = doc.querySelector('.wb-right.is-open');
    if (openSheet) { e.preventDefault(); e.stopImmediatePropagation(); sheet('#' + openSheet.id, false); return; }
    // A workbench on top asks before discarding (same as its close button)
    var opens = Array.prototype.filter.call(doc.querySelectorAll('.overlay[data-state="open"]'), function () { return true; });
    var top = opens[opens.length - 1];
    if (top && top.classList.contains('overlay-wb') && !doc.querySelector('.menu[data-state="open"], .popover[data-state="open"]')) {
      var x = top.querySelector('[data-wb-close]');
      if (x) { e.preventDefault(); e.stopImmediatePropagation(); x.click(); }
    }
  }, true);

  doc.addEventListener('input', function (e) {
    var t = e.target;
    var box = t.closest && t.closest('.range2');
    if (box) syncRange(box, t);
  });
  doc.addEventListener('change', function (e) {
    if (e.target.matches('[data-select-row], [data-select-all]')) window.setTimeout(syncSelCount, 0);
  });
  doc.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-clear-selection]')) window.setTimeout(syncSelCount, 0);
  });

  doc.addEventListener('DOMContentLoaded', function () {
    injectVariantRow();
    applyVariant(variant);
    each('.range2', function (b) { syncRange(b); });
    each('[data-indeterminate]', function (c) { c.indeterminate = true; });
    each('.rx-list, .circuit-items, .ml-list', renumber);
    syncSelCount();
    // Builders under 1200px start with "Información general" collapsed so the list comes first
    if (window.matchMedia('(max-width: 1199px)').matches) {
      each('[data-collapse-mobile]', function (btn) {
        var t = doc.querySelector(btn.getAttribute('data-collapse'));
        if (t) { t.classList.add('is-collapsed'); btn.setAttribute('aria-expanded', 'false'); }
      });
    }
    if (params.sheet) sheet('#' + params.sheet, true);
    if (params.pop) window.setTimeout(function () {
      var tr = doc.querySelector('[data-open="#' + params.pop + '"]');
      if (tr) tr.click();
    }, 600);
    if (params.mode && params.open) {
      var o = doc.getElementById(params.open);
      if (o) {
        applyMode(o, params.mode);
        each('form', function (f) { f.reset(); }, o);
        each('textarea[data-count]', function (t) { t.dispatchEvent(new Event('input', { bubbles: true })); }, o);
      }
    }
  });

  window.Catalog = { applyMode: applyMode, applyVariant: applyVariant, renumber: renumber, announce: announce, syncSelCount: syncSelCount };
})();
