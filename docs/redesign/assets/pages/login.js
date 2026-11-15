/*
 * Auth pages runtime (login.html, onboarding.html). These pages have no shell,
 * so proto.js does not inject its prototype bar nor read ?state=. This file adds
 * a small prototype bar (theme + page states) and the form behaviour.
 * States are body[data-state] values consumed by proto.js [data-show].
 */
(function () {
  'use strict';
  var doc = document;
  var body = doc.body;
  var kind = body.getAttribute('data-auth'); // "login" | "onboarding"

  var STATES = kind === 'login'
    ? [['form', 'formulario'], ['validation', 'validación'], ['error', 'error'], ['loading', 'cargando'], ['blocked', 'bloqueada']]
    : [['form', 'formulario'], ['validation', 'validación'], ['error', 'error API'], ['loading', 'guardando']];

  var params = {};
  try { new URLSearchParams(window.location.search).forEach(function (v, k) { params[k] = v; }); } catch (e) { /* ignore */ }

  function el(id) { return doc.getElementById(id); }

  /* ---------- field errors (same markup as the system) ---------- */
  function setError(input, msg) {
    var field = input.closest('.field');
    field.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    var err = field.querySelector('.field-error');
    if (!err) {
      err = doc.createElement('p');
      err.className = 'field-error';
      err.id = input.id + '-error';
      field.appendChild(err);
    }
    err.innerHTML = '<i data-lucide="circle-alert"></i><span></span>';
    err.lastChild.textContent = msg;
    input.setAttribute('aria-describedby', err.id);
  }
  function clearError(input) {
    var field = input.closest('.field');
    field.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    var err = field.querySelector('.field-error');
    if (err) err.remove();
  }
  function emailOK(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

  /* ---------- login checks ---------- */
  function checkLogin() {
    var email = el('email'), pw = el('password');
    var bad = null;
    if (!emailOK(email.value)) { setError(email, 'Email inválido'); bad = bad || email; } else clearError(email);
    if (pw.value.length < 6) { setError(pw, 'Mínimo 6 caracteres'); bad = bad || pw; } else clearError(pw);
    icons();
    return bad;
  }

  /* ---------- busy state of the main form ---------- */
  function setBusy(on) {
    var form = doc.querySelector('.auth-form');
    if (!form) return;
    var btn = form.querySelector('[type="submit"]');
    var label = btn.querySelector('.btn-label');
    btn.classList.toggle('is-loading', on);
    btn.toggleAttribute('aria-busy', on);
    btn.disabled = on;
    if (label) label.textContent = on ? btn.getAttribute('data-loading-label') : btn.getAttribute('data-label');
    Array.prototype.forEach.call(doc.querySelectorAll('.auth-form .input, .pw-toggle, [data-busy-disable]'), function (c) { c.disabled = on; });
  }

  /* ---------- prototype states ---------- */
  function apply(state) {
    if (!window.Proto) return;
    window.Proto.setState(state);
    setBusy(state === 'loading');
    var fields = doc.querySelectorAll('.auth-form .input');
    if (state === 'validation') {
      if (kind === 'login') {
        el('email').value = 'admin@exom';
        el('password').value = '1234';
        checkLogin();
        el('email').focus({ preventScroll: true });
      } else {
        el('first-name').value = '';
        el('last-name').value = '';
        el('first-name').focus({ preventScroll: true });
      }
    } else {
      Array.prototype.forEach.call(fields, function (f) { if (f.closest('.field.is-invalid')) clearError(f); });
      if (state === 'loading' || state === 'error') {
        if (kind === 'login') { el('email').value = 'moises@exom.app'; el('password').value = 'contraseña'; }
        else { el('first-name').value = 'Nerea'; el('last-name').value = 'Blanco Ferrer'; }
      }
      if (state === 'form') {
        Array.prototype.forEach.call(fields, function (f) { f.value = ''; });
      }
      if (state === 'blocked') { var h = el('blocked-title'); if (h) h.focus({ preventScroll: true }); }
    }
    syncBar();
  }

  function icons() { if (window.Proto) window.Proto.icons(); }

  /* ---------- prototype bar (theme + state) ---------- */
  function buildBar() {
    if (new URLSearchParams(location.search).get('embed') === '1') return;
    var theme = doc.documentElement.getAttribute('data-theme');
    function row(label, key, opts) {
      return '<div class="proto-row"><span>' + label + '</span><div class="proto-opts">' +
        opts.map(function (o) { return '<button type="button" data-auth-proto="' + key + '" value="' + o[0] + '">' + o[1] + '</button>'; }).join('') +
        '</div></div>';
    }
    var html = '<div class="proto" role="group" aria-label="Controles del prototipo">' +
      '<div class="proto-panel" id="proto-panel" hidden>' +
        row('Tema', 'theme', [['dark', 'oscuro'], ['light', 'claro']]) +
        row('Estado', 'state', STATES) +
      '</div>' +
      '<button class="proto-pill" type="button" aria-expanded="false" aria-controls="proto-panel">Prototipo <b data-auth-sum></b></button>' +
      '</div>';
    body.insertAdjacentHTML('beforeend', html);
    void theme;
  }
  function syncBar() {
    var vals = { theme: doc.documentElement.getAttribute('data-theme'), state: body.getAttribute('data-state') };
    Array.prototype.forEach.call(doc.querySelectorAll('[data-auth-proto]'), function (b) {
      b.setAttribute('aria-pressed', String(vals[b.getAttribute('data-auth-proto')] === b.value));
    });
    var sum = doc.querySelector('[data-auth-sum]');
    var name = STATES.filter(function (s) { return s[0] === vals.state; })[0];
    if (sum) sum.textContent = (vals.theme === 'light' ? 'claro' : 'oscuro') + ' · ' + (name ? name[1] : '');
  }

  function init() {
    buildBar();

    doc.addEventListener('click', function (e) {
      var t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      var p = t.closest('[data-auth-proto]');
      if (p) {
        if (p.getAttribute('data-auth-proto') === 'theme') window.Proto.setTheme(p.value);
        else apply(p.value);
        syncBar();
        return;
      }
      // .proto-pill toggling, outside click and Esc are handled by proto.js (same ids/classes).
      var setS = t.closest('[data-auth-state]');
      if (setS) { apply(setS.getAttribute('data-auth-state')); return; }

      var tog = t.closest('.pw-toggle');
      if (tog) {
        var input = el(tog.getAttribute('aria-controls'));
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        tog.setAttribute('aria-pressed', String(show));
        tog.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        return;
      }
      var forgot = t.closest('[data-forgot]');
      if (forgot) {
        var email = el('email');
        if (!emailOK(email.value)) { setError(email, 'Email inválido'); icons(); email.focus(); return; }
        clearError(email);
        forgot.classList.add('is-busy');
        forgot.textContent = 'Enviando enlace...';
        window.setTimeout(function () {
          forgot.classList.remove('is-busy');
          forgot.textContent = '¿Has olvidado tu contraseña?';
          window.Proto.toast('Si el email existe, recibirá un enlace para restablecer la contraseña.', 'success');
        }, 900);
      }
    });

    doc.addEventListener('input', function (e) {
      var f = e.target.closest && e.target.closest('.field.is-invalid');
      if (!f) return;
      var input = e.target;
      if (input.id === 'email' && emailOK(input.value)) clearError(input);
      if (input.id === 'password' && input.value.length >= 6) clearError(input);
    });

    var form = doc.querySelector('.auth-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (kind === 'login') {
        var bad = checkLogin();
        if (bad) { bad.focus(); return; }
        apply('loading');
        window.setTimeout(function () { window.location.href = 'dashboard.html'; }, 1000);
      } else {
        var a = el('first-name'), b = el('last-name');
        if (!a.value.trim() || !b.value.trim()) {
          apply('validation');
          (a.value.trim() ? b : a).focus();
          return;
        }
        apply('loading');
        window.setTimeout(function () { window.location.href = 'dashboard.html'; }, 1000);
      }
    });

    var start = params.state;
    var valid = STATES.some(function (s) { return s[0] === start; });
    apply(valid ? start : 'form');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
