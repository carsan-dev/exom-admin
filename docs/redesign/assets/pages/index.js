/*
 * Hub page (index.html) behaviours. proto.js (loaded without #app, so it
 * builds no shell) already handles theme toggle, dialogs, tabs and toasts.
 * This file adds: gallery preview scaling, the "Ver en móvil" dialog,
 * the active state of the section index and the selection-bar demo.
 */
(function () {
  'use strict';

  var doc = document;

  /* ---------- gallery: scale 1440x900 iframes to the tile width ---------- */
  function scaleFrame(frame) {
    var w = frame.clientWidth;
    if (w) frame.style.setProperty('--k', String(w / 1440));
  }
  /* A previewed page with autofocus (e.g. onboarding) would pull focus into its
     iframe and scroll this document to it. Undo that: previews never take focus. */
  function guardPreviewFocus() {
    var lastY = window.scrollY;
    function isPreview(el) { return !!(el && el.tagName === 'IFRAME' && el.closest('.tile-frame')); }
    function undo() {
      if (!isPreview(doc.activeElement)) return false;
      doc.activeElement.blur();
      if (doc.activeElement && doc.activeElement !== doc.body && doc.activeElement.blur) doc.activeElement.blur();
      window.scrollTo(window.scrollX, lastY);
      return true;
    }
    window.addEventListener('scroll', function () {
      if (!undo()) lastY = window.scrollY;
    }, { passive: true });
    // Focus can move into a frame without any event reaching this document: check every frame.
    (function watch() {
      if (!undo()) lastY = window.scrollY;
      window.requestAnimationFrame(watch);
    })();
  }

  /* Load previews only near the viewport (a previewed page may autofocus). */
  function lazyFrames() {
    var frames = doc.querySelectorAll('.tile-frame iframe[data-src]');
    // Previews are embedded (no prototype UI) and follow the hub theme.
    function previewSrc(f) {
      var theme = doc.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var base = f.getAttribute('data-base');
      return base + (base.indexOf('?') < 0 ? '?' : '&') + 'embed=1&theme=' + theme;
    }
    function load(f) {
      if (!f.hasAttribute('data-src')) return;
      f.setAttribute('data-base', f.getAttribute('data-src'));
      f.src = previewSrc(f);
      f.removeAttribute('data-src');
    }
    // Theme toggle: reload previews that were already loaded
    new MutationObserver(function () {
      Array.prototype.forEach.call(frames, function (f) { if (f.hasAttribute('data-base')) f.src = previewSrc(f); });
    }).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (!window.IntersectionObserver) { Array.prototype.forEach.call(frames, load); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '300px 0px' });
    Array.prototype.forEach.call(frames, function (f) { io.observe(f); });
  }

  function initTiles() {
    guardPreviewFocus();
    lazyFrames();
    var frames = doc.querySelectorAll('.tile-frame');
    Array.prototype.forEach.call(frames, scaleFrame);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function (entries) {
        entries.forEach(function (e) { scaleFrame(e.target); });
      });
      Array.prototype.forEach.call(frames, function (f) { ro.observe(f); });
    } else {
      window.addEventListener('resize', function () { Array.prototype.forEach.call(frames, scaleFrame); });
    }
  }

  /* ---------- "Ver en móvil": 390x780 iframe, unloaded on close ---------- */
  var dlg, phone, ttl, link;
  function fitPhone() {
    if (!phone) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var maxH = Math.min(vh - 48, vh * 0.92) - 132;   // dialog chrome: head + paddings
    var maxW = Math.min(vw - 48, 480) - 50;          // dialog width minus body padding and frame rule
    var k = Math.min(1, maxH / 780, maxW / 390);
    phone.style.setProperty('--pk', String(Math.max(0.3, k)));
  }
  function unloadPhone() {
    var f = phone && phone.querySelector('iframe');
    if (f) { f.src = 'about:blank'; f.remove(); }
  }
  function openPhone(trigger) {
    var src = trigger.getAttribute('data-phone');
    var name = trigger.getAttribute('data-phone-title') || src;
    ttl.textContent = name + ' en móvil';
    link.href = src;
    phone.querySelector('.tile-ph-name').textContent = name;
    phone.querySelector('.tile-ph-file').textContent = src;
    unloadPhone();
    var f = doc.createElement('iframe');
    f.src = src;
    f.title = 'Vista de ' + name + ' a 390 px de ancho';
    f.width = '390';
    f.height = '780';
    phone.appendChild(f);
    fitPhone();
  }
  function initPhone() {
    dlg = doc.getElementById('dlg-phone');
    if (!dlg) return;
    phone = dlg.querySelector('.phone-frame');
    ttl = doc.getElementById('dlg-phone-t');
    link = doc.getElementById('dlg-phone-open');
    doc.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-phone]');
      if (t) openPhone(t);
    });
    new MutationObserver(function () {
      if (dlg.hidden) unloadPhone();
    }).observe(dlg, { attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('resize', fitPhone);
  }

  /* ---------- section index: mark the section being read ---------- */
  function initIndex() {
    var links = doc.querySelectorAll('.hub-index a[href^="#"]');
    if (!links.length || !window.IntersectionObserver) return;
    var map = {};
    Array.prototype.forEach.call(links, function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var current = null;
    function set(id) {
      if (id === current || !map[id]) return;
      current = id;
      Array.prototype.forEach.call(links, function (a) { a.removeAttribute('aria-current'); });
      map[id].setAttribute('aria-current', 'true');
      var row = map[id].closest('ol');
      if (row && row.scrollWidth > row.clientWidth) {
        var a = map[id];
        row.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
      }
    }
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var ids = Object.keys(map);
      for (var i = 0; i < ids.length; i++) {
        if (visible[ids[i]]) { set(ids[i]); return; }
      }
    }, { rootMargin: '-120px 0px -55% 0px' });
    Object.keys(map).forEach(function (id) {
      var el = doc.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ---------- selection bar demo ---------- */
  function initSelDemo() {
    var box = doc.querySelector('[data-sel-demo]');
    if (!box) return;
    var bar = box.querySelector('.demo-selbar');
    var count = bar.querySelector('.selection-count');
    var checks = box.querySelectorAll('input[type="checkbox"]');
    function sync() {
      var n = Array.prototype.filter.call(checks, function (c) { return c.checked; }).length;
      bar.hidden = n === 0;
      var txt = n === 1 ? '1 fila seleccionada' : n + ' filas seleccionadas';
      if (count.textContent !== txt) {
        count.textContent = txt;
        count.classList.remove('is-changing');
        void count.offsetWidth;
        count.classList.add('is-changing');
      }
    }
    box.addEventListener('change', sync);
    bar.querySelector('[data-demo-clear]').addEventListener('click', function () {
      Array.prototype.forEach.call(checks, function (c) { c.checked = false; });
      sync();
      checks[0].focus();
    });
  }

  function boot() {
    initTiles();
    initPhone();
    initIndex();
    initSelDemo();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
