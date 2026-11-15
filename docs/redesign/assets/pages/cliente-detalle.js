/* cliente-detalle.html only. Runs before DOMContentLoaded (end of body). */
(function () {
  'use strict';
  var doc = document;
  var params = new URLSearchParams(location.search);
  var S = window.ExomShared, D = window.ExomData;

  /* ---------- Resumen de últimas mediciones (from the shared rows) ---------- */
  var box = doc.querySelector('[data-msum]');
  if (box) {
    var html = '';
    D.metricCols.forEach(function (c) {
      var seen = D.metricRows.filter(function (r) { return r[c.k] != null; });
      if (!seen.length) return;
      var last = seen[0], prev = seen[1];
      var delta = prev
        ? S.signed(Math.round((last[c.k] - prev[c.k]) * 10) / 10, c.dec) + ' ' + c.unit + ' desde la medición anterior'
        : 'Sin medición anterior';
      html += '<div><span class="msum-label">' + c.long + '</span>' +
        '<span class="msum-val"><b>' + S.num(last[c.k], c.dec) + ' ' + c.unit + '</b><time>' + last.d + '</time></span>' +
        '<p class="msum-delta' + (prev ? '' : ' is-none') + '">' + delta + '</p></div>';
    });
    box.innerHTML = html;
  }

  /* ---------- Tabs follow ?tab= ---------- */
  var want = params.get('tab');
  var tabs = doc.querySelectorAll('#cd-tabs [role="tab"]');
  if (want && doc.querySelector('#cd-tabs [data-tab="' + want + '"]')) {
    Array.prototype.forEach.call(tabs, function (t) { t.setAttribute('aria-selected', String(t.getAttribute('data-tab') === want)); });
  }
  doc.addEventListener('tabchange', function (e) {
    if (!e.target.matches('#cd-tabs')) return;
    var p = new URLSearchParams(location.search);
    p.set('tab', e.detail.tab.getAttribute('data-tab'));
    history.replaceState(null, '', '?' + p.toString());
  });

  /* ---------- Blocked variant ---------- */
  var more = doc.getElementById('more-btn');
  var blockedBtns = [];
  function setBlocked(on) {
    doc.body.classList.toggle('is-blocked', on);
    more.setAttribute('data-ctx', on ? 'blocked' : '');
    blockedBtns.forEach(function (b) { b.setAttribute('aria-pressed', String((b.value === '1') === on)); });
    var p = new URLSearchParams(location.search);
    if (on) p.set('blocked', '1'); else p.delete('blocked');
    var q = p.toString();
    history.replaceState(null, '', q ? '?' + q : location.pathname);
  }
  setBlocked(params.get('blocked') === '1');
  // Variant row inside the prototype panel (built by proto.js on DOMContentLoaded, which runs first)
  doc.addEventListener('DOMContentLoaded', function () {
    var panel = doc.getElementById('proto-panel');
    if (!panel) return;
    var row = doc.createElement('div');
    row.className = 'proto-row';
    row.innerHTML = '<span>Variante</span><div class="proto-opts"></div>';
    [['0', 'normal'], ['1', 'cliente bloqueado']].forEach(function (o) {
      var b = doc.createElement('button');
      b.type = 'button'; b.value = o[0]; b.textContent = o[1];
      b.addEventListener('click', function () { setBlocked(o[0] === '1'); });
      row.lastChild.appendChild(b); blockedBtns.push(b);
    });
    panel.appendChild(row);
    setBlocked(doc.body.classList.contains('is-blocked'));
  });
  doc.addEventListener('click', function (e) {
    if (e.target.closest('[data-unblock-confirm]')) {
      setBlocked(false);
      if (window.Proto) window.Proto.toast('Cuenta desbloqueada correctamente', 'success');
    }
  });

  /* ---------- Error variants (?error=403|404|500) ---------- */
  var ERR = {
    '403': ['Cliente no asignado', 'Solo puedes abrir perfiles de clientes asignados a tu cuenta. Vuelve al listado para revisar tu cartera actual.', false],
    '403s': ['Cliente no asignado', 'No tienes permisos para abrir este perfil desde tu sesión actual.', false],
    '404': ['Cliente no encontrado', 'No hemos encontrado el cliente solicitado o este enlace ya no corresponde a un perfil de cliente.', false],
    '500': ['Error del servidor', 'El servidor no ha podido cargar el perfil del cliente. Inténtalo de nuevo en unos segundos.', true]
  };
  var code = params.get('error') || '404';
  if (code === '403' && doc.documentElement.getAttribute('data-role') === 'super') code = '403s';
  var e = ERR[code] || ERR['404'];
  doc.querySelector('[data-err-title]').textContent = e[0];
  doc.querySelector('[data-err-text]').textContent = e[1];
  doc.querySelector('[data-err-retry]').hidden = !e[2];

  /* ---------- Editar datos: the example error blocks saving until fixed ---------- */
  var kcal = doc.getElementById('p-kcal');
  var kField = doc.querySelector('[data-kcal-field]');
  kcal.addEventListener('input', function () {
    var v = kcal.value, ok = v !== '' && /^\d+$/.test(v) && +v >= 0 && +v <= 20000;
    kField.classList.toggle('is-invalid', !ok);
    kcal.setAttribute('aria-invalid', String(!ok));
    kField.querySelector('.field-error').hidden = ok;
  });
  doc.querySelector('[data-profile-save]').addEventListener('click', function () {
    var bad = doc.querySelector('#form-profile .field.is-invalid input');
    if (bad) { bad.focus(); return; }
    var ov = doc.getElementById('dlg-profile');
    ov.querySelector('[data-close]').click();
    if (window.Proto) window.Proto.toast('Datos del cliente actualizados', 'success');
  });

  /* ---------- Gestionar admins: pending changes ---------- */
  var sheet = doc.getElementById('sheet-admins');
  function syncAdmins() {
    var add = 0, rem = 0, keep = 0;
    Array.prototype.forEach.call(sheet.querySelectorAll('[data-adm]'), function (row) {
      var was = row.getAttribute('data-assigned') === '1', now = row._on == null ? was : row._on;
      var chip = row.querySelector('[data-adm-state]'), btn = row.querySelector('[data-adm-toggle]');
      var name = row.querySelector('.entity-name').textContent;
      if (was && now) { keep++; chip.className = 'chip chip-success'; chip.textContent = 'Se mantiene'; btn.textContent = 'Quitar'; btn.setAttribute('aria-label', 'Quitar a ' + name); }
      if (was && !now) { rem++; chip.className = 'chip chip-warning'; chip.textContent = 'Se retira'; btn.textContent = 'Volver a incluir'; btn.setAttribute('aria-label', 'Volver a incluir a ' + name); }
      if (!was && now) { add++; chip.className = 'chip chip-brand'; chip.textContent = 'Se añade'; btn.textContent = 'Quitar'; btn.setAttribute('aria-label', 'Quitar a ' + name); }
      if (!was && !now) { chip.className = 'chip chip-neutral'; chip.textContent = 'Disponible'; btn.textContent = 'Asignar'; btn.setAttribute('aria-label', 'Asignar a ' + name); }
    });
    var total = keep + add;
    sheet.querySelector('[data-adm-add]').textContent = add;
    sheet.querySelector('[data-adm-remove]').textContent = rem;
    sheet.querySelector('[data-adm-keep]').textContent = keep;
    sheet.querySelector('[data-adm-cover]').textContent = total + (total === 1 ? ' admin activo' : ' admins activos') + ' tras guardar';
    var chip = sheet.querySelector('[data-adm-chip]');
    var changed = add + rem > 0;
    chip.className = 'chip ' + (changed ? 'chip-warning' : 'chip-neutral');
    chip.textContent = changed ? 'Cambios pendientes' : 'Sin cambios';
    sheet.querySelector('[data-adm-none]').hidden = total !== 0;
  }
  sheet.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-adm-toggle]');
    if (!b) return;
    var row = b.closest('[data-adm]');
    var was = row.getAttribute('data-assigned') === '1';
    row._on = !(row._on == null ? was : row._on);
    syncAdmins();
  });
})();
