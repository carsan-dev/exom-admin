/* Plantillas: master-detail editor with one unified save. Boots after proto.js. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var VARS = {
    nombre: ['Nombre del cliente', 'Lucía'],
    entrenamiento: ['Nombre del entrenamiento del día', 'Torso A'],
    comida: ['Tipo de comida: Desayuno, Comida, Snack o Cena', 'Comida'],
    reto: ['Título del reto completado', 'Completa 4 entrenos esta semana'],
    logro: ['Nombre del logro desbloqueado', '30 días de fuerza']
  };
  var ROUTES = { '/trainings': 'Entrenamiento', '/diet': 'Dieta', '/recap': 'Recap', '/calendar': 'Calendario', '/challenges': 'Reto', '/profile': 'Perfil', '/feedback': 'Feedback', '/': 'Inicio', '': 'Inicio' };
  var DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  var T = [
    { key: 'training_daily', name: 'Recordatorio de entreno', desc: 'Aviso diario a los clientes con entrenamiento asignado ese día.', cat: 'Entrenamiento', auto: true, del: 'schedule', kind: 'daily', times: ['09:00'], cron: '0 9 * * *',
      title: 'Hoy toca {entrenamiento}', body: '{nombre}, tu entrenamiento de hoy ya está listo. ¡A por ello!', route: '/trainings', on: true, sched: true, vars: ['nombre', 'entrenamiento'], custom: true, updated: '12/11/2026 14:20' },
    { key: 'meal_daily', name: 'Recordatorio de comidas', desc: 'Avisa en cada comida del plan nutricional.', cat: 'Nutrición', auto: true, del: 'schedule', kind: 'meal_daily', times: ['08:30', '14:00', '17:30', '21:00'], cron: '30 8 * * * · 0 14 * * * · 30 17 * * * · 0 21 * * *',
      title: 'Hora de tu {comida}', body: '{nombre}, marca tu {comida} en la app cuando la termines.', route: '/diet', on: true, sched: true, vars: ['nombre', 'comida'], custom: false, updated: null },
    { key: 'recap_weekly', name: 'Recordatorio de recap semanal', desc: 'Recuerda enviar el recap antes del cierre de semana.', cat: 'Recap', auto: true, del: 'schedule', kind: 'weekly', weekday: 0, times: ['19:00'], cron: '0 19 * * 0',
      title: 'Tu recap semanal te espera', body: '{nombre}, envía tu recap antes de las 21:00 para revisar tu semana.', route: '/recap', on: true, sched: true, vars: ['nombre'], custom: false, updated: null },
    { key: 'plan_assigned', name: 'Nuevo plan asignado', desc: 'Se envía al guardar una planificación nueva para el cliente.', cat: 'Entrenamiento', auto: true, del: 'event', evLabel: 'Al guardar una planificación',
      title: 'Tu nueva semana está lista', body: '{nombre}, ya tienes tu planificación de la semana en el calendario.', route: '/calendar', on: true, vars: ['nombre'], custom: false, updated: null },
    { key: 'challenge_completed', name: 'Reto completado', desc: 'Felicita al cliente cuando completa un reto.', cat: 'Retos', auto: true, del: 'event', evLabel: 'Al completar un reto',
      title: '¡Reto completado!', body: 'Has completado «{reto}». Sigue así, {nombre}.', route: '/challenges', on: true, vars: ['nombre', 'reto'], custom: true, updated: '03/11/2026 10:05' },
    { key: 'achievement_unlocked', name: 'Logro desbloqueado', desc: 'Avisa de un logro nuevo en el perfil.', cat: 'Retos', auto: true, del: 'event', evLabel: 'Al desbloquear un logro',
      title: 'Nuevo logro: {logro}', body: '{nombre}, acabas de desbloquear un logro. Míralo en tu perfil.', route: '/profile', on: true, vars: ['nombre', 'logro'], custom: false, updated: null },
    { key: 'feedback_reply', name: 'Respuesta a tu feedback', desc: 'Se envía cuando el entrenador responde un feedback.', cat: 'Feedback', auto: true, del: 'event', evLabel: 'Al responder un feedback',
      title: 'Tu entrenador ha respondido', body: '{nombre}, tienes una respuesta nueva a tu feedback.', route: '/feedback', on: true, vars: ['nombre'], custom: false, updated: null },
    { key: 'recap_reviewed', name: 'Recap revisado', desc: 'Se envía cuando el recap queda revisado.', cat: 'Recap', auto: true, del: 'event', evLabel: 'Al revisar un recap',
      title: 'Recap revisado', body: '{nombre}, ya puedes ver los comentarios de tu recap.', route: '/recap', on: true, vars: ['nombre'], custom: false, updated: null },
    { key: 'streak_risk', name: 'Racha en peligro', desc: 'Aviso nocturno si el cliente aún no ha completado el día.', cat: 'Retos', auto: true, del: 'schedule', kind: 'daily', times: ['20:00'], cron: '0 20 * * *',
      title: 'No pierdas tu racha', body: '{nombre}, aún estás a tiempo de completar el día.', route: '/', on: false, sched: false, vars: ['nombre'], custom: false, updated: '28/10/2026 09:12' },
    { key: 'welcome', name: 'Bienvenida', desc: 'Primer mensaje al activar la cuenta.', cat: 'Cuenta', auto: true, del: 'event', evLabel: 'Al activar la cuenta',
      title: 'Bienvenida a EXOM', body: '{nombre}, tu plan ya está listo. Abre Inicio para empezar.', route: '/', on: true, vars: ['nombre'], custom: false, updated: null },
    { key: 'm_weekly', name: 'Felicitación semanal', desc: 'Para cerrar una semana completa.', cat: 'Manual', auto: false, del: 'manual',
      title: '¡Buen trabajo esta semana!', body: 'Has cumplido tu plan. Descansa bien y a por la próxima.', route: '/', on: true, vars: [], custom: false, updated: '10/11/2026 18:02' },
    { key: 'm_monthly', name: 'Revisión mensual', desc: 'Aviso previo a la revisión del mes.', cat: 'Manual', auto: false, del: 'manual',
      title: 'Revisión mensual', body: 'Esta semana revisamos tu progreso del mes. Prepara tus fotos y medidas.', route: '/recap', on: true, vars: [], custom: false, updated: '02/11/2026 12:40' }
  ];
  var TOTAL = 18; // the backend holds more templates than the visible page

  var DEL = { schedule: ['Programada', 'clock', 'chip-info'], event: ['Por evento', 'zap', 'chip-neutral'], manual: ['Manual', 'hand', 'chip-neutral'] };
  var SYMBOL_PATH = 'M46 110C20 106 0 84 0 56C0 33 14 12 35 3C48-2 60 4 62 16C66 29 57 39 44 39C36 39 28 35 23 28C11 38 5 51 7 65C9 86 24 103 46 109Z';
  var SYMBOL = '<svg viewBox="0 0 120 112" aria-hidden="true" focusable="false"><path class="half-a" d="' + SYMBOL_PATH + '"/><path class="half-b" transform="rotate(180 60 56)" d="' + SYMBOL_PATH + '"/></svg>';

  var st = { cur: T[0].key, dirty: false, pending: null, filters: { cat: [], del: [], org: [], st: [] }, q: '' };
  function tpl(k) { return T.filter(function (t) { return t.key === k; })[0]; }
  function isNarrow() { return window.matchMedia('(max-width: 1099px)').matches; }

  function joinY(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; }
  function sentence(t) {
    if (t.del === 'event') return t.evLabel + '.';
    if (t.del === 'manual') return 'Se envía a mano desde Notificaciones, como plantilla rápida.';
    var when = t.kind === 'weekly' ? 'Cada ' + DAYS[t.weekday].toLowerCase() + ' a las ' + t.times[0] : 'Cada día a las ' + joinY(t.times);
    return when + ' · Europe/Madrid' + (t.sched ? '' : ' · programación pausada');
  }
  function fill(text, marks) {
    return esc(text).replace(/\{(\w+)\}/g, function (m, k) { return VARS[k] ? (marks ? '<mark title="{' + k + '}">' + esc(VARS[k][1]) + '</mark>' : VARS[k][1]) : m; });
  }

  function visibleList() {
    var f = st.filters, q = st.q.toLowerCase();
    return T.filter(function (t) {
      if (f.cat.length && f.cat.indexOf(t.cat) < 0) return false;
      if (f.del.length && f.del.indexOf(t.del) < 0) return false;
      if (f.org.length && f.org.indexOf(t.auto ? 'auto' : 'manual') < 0) return false;
      if (f.st.length && f.st.indexOf(t.on ? 'on' : 'off') < 0) return false;
      if (q && (t.name + t.desc + t.cat + t.title + t.body + t.key + DEL[t.del][0]).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function renderList() {
    var empty = doc.body.getAttribute('data-state') === 'empty';
    var list = empty ? [] : visibleList();
    $('[data-tp-visible]').textContent = list.length + ' visibles de ' + (empty ? 0 : TOTAL);
    $('#tp-list').innerHTML = list.length ? list.map(function (t) {
      var d = DEL[t.del];
      return '<li><button class="tp-row" type="button" data-tp="' + t.key + '" aria-current="' + (t.key === st.cur && !empty) + '">' +
        '<span class="tp-row-name">' + esc(t.name) + '</span>' +
        '<span class="tp-row-meta"><span class="tag">' + esc(t.cat) + '</span><span class="tp-row-marks">' +
        (st.dirty && t.key === st.cur ? '<span class="tp-dirty-dot" data-tip="Cambios sin guardar"><span class="sr-only">Cambios sin guardar</span></span>' : '') +
        (t.on ? '' : '<span class="chip chip-neutral">Pausada</span>') +
        '<span data-tip="' + d[0] + '"><i data-lucide="' + d[1] + '"></i><span class="sr-only">' + d[0] + '</span></span></span></span>' +
        '<span class="tp-row-title">' + esc(t.title) + '</span></button></li>';
    }).join('') : '<li class="tp-empty">No hay plantillas con esos filtros.</li>';
    Proto.icons();
  }
  function renderCats() {
    var counts = {};
    T.forEach(function (t) { counts[t.cat] = (counts[t.cat] || 0) + 1; });
    $('#tp-cat-opts').innerHTML = Object.keys(counts).sort().map(function (c) {
      return '<label class="check"><input type="checkbox" data-f-cat="' + esc(c) + '">' + esc(c) + ' <span class="count count-muted">' + counts[c] + '</span></label>';
    }).join('');
  }

  function renderEditor() {
    var ed = $('#tp-editor');
    if (doc.body.getAttribute('data-state') === 'empty') {
      ed.innerHTML = '<div class="tp-noselect empty empty-compact"><span class="empty-x" aria-hidden="true"></span><p class="empty-title">Selecciona una plantilla para editarla.</p></div>';
      return;
    }
    var t = tpl(st.cur), d = DEL[t.del];
    var h = '<div class="tp-ed-body"><div class="tp-ed-head">' +
      '<button class="btn btn-ghost btn-sm tp-back" type="button" data-tp-back><i data-lucide="arrow-left"></i>Plantillas</button>' +
      '<div class="tp-ed-title"><h2 class="h2" id="tp-name">' + esc(t.name) + '</h2></div>' +
      '<p class="secondary text-2">' + esc(t.desc) + '</p>' +
      '<div class="tp-ed-tags"><span class="tag">' + esc(t.cat) + '</span><span class="tag">' + (t.auto ? 'Automática' : 'Manual') + '</span>' +
      (t.auto ? '<span class="tag">' + (t.custom ? 'Editada' : 'Por defecto') + '</span>' : '') +
      '<span class="caption">Último cambio: ' + (t.updated || 'Sin cambios') + '</span></div></div>';

    h += '<div class="tp-switch"><label class="switch"><input type="checkbox" role="switch" data-dirty id="tp-on"' + (t.on ? ' checked' : '') + '>Activa</label>' +
      '<p class="field-help">' + (t.auto ? 'Al pausar, el evento automático no enviará nada.' : 'Al pausar, no aparecerá como plantilla rápida al enviar.') + '</p></div>';

    h += '<section class="tp-sec" aria-labelledby="tp-txt"><h3 class="h3" id="tp-txt">Texto</h3>' +
      '<div class="tp-grid"><div class="field"><label class="field-label" for="tp-title">Título</label>' +
      '<input class="input" id="tp-title" maxlength="120" value="' + esc(t.title) + '" data-dirty data-live>' +
      '<div class="field-foot"><span></span><span class="field-count" data-cnt="tp-title">' + t.title.length + '/120</span></div></div>' +
      '<div class="field"><label class="field-label" for="tp-route">Pantalla de destino <span class="proposal-tag">Propuesta</span></label>' +
      '<input class="input" id="tp-route" value="' + esc(t.route) + '" placeholder="/trainings" data-dirty data-live aria-describedby="tp-route-h">' +
      '<p class="field-help" id="tp-route-h">Ruta de la app; empieza por / o queda vacía.</p></div></div>' +
      '<div class="field"><label class="field-label" for="tp-body">Cuerpo</label>' +
      '<textarea class="textarea" id="tp-body" rows="4" maxlength="500" data-dirty data-live>' + esc(t.body) + '</textarea>' +
      '<div class="field-foot"><span></span><span class="field-count" data-cnt="tp-body">' + t.body.length + '/500</span></div>' +
      (t.vars.length ? '<div class="tp-vars" role="group" aria-label="Insertar variable"><span class="micro">Variables</span>' + t.vars.map(function (v) {
        return '<button class="var-btn" type="button" data-var="' + v + '" data-tip="' + esc(VARS[v][0]) + '" aria-label="Insertar {' + v + '}: ' + esc(VARS[v][0]) + '">{' + v + '}</button>';
      }).join('') + '</div>' : '<p class="field-help">Esta plantilla no recibe datos dinámicos. El texto se enviará tal como está escrito.</p>') +
      '</div></section>';

    h += '<section class="tp-sec" aria-labelledby="tp-when-t"><h3 class="h3" id="tp-when-t">Cuándo se envía</h3>' +
      '<p class="tp-when"><span class="chip ' + d[2] + '">' + d[0] + '</span><span data-sentence>' + esc(sentence(t)) + '</span>' + (t.del === 'schedule' ? '<span class="proposal-tag">Propuesta</span>' : '') + '</p>';
    if (t.del === 'schedule') {
      h += '<div><label class="switch"><input type="checkbox" role="switch" id="tp-sched-on" data-dirty' + (t.sched ? ' checked' : '') + '>Programación activa</label></div>' +
        '<div class="tp-sched">' +
        (t.kind === 'weekly' ? '<div class="field field-wide"><label class="field-label" for="tp-wd">Día de la semana</label><select class="select" id="tp-wd" data-dirty>' +
          DAYS.map(function (n, i) { return '<option value="' + i + '"' + (i === t.weekday ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div>' : '') +
        (t.kind === 'meal_daily' ? ['Desayuno', 'Comida', 'Snack', 'Cena'].map(function (m, i) {
          return '<div class="field"><label class="field-label" for="tp-t' + i + '">' + m + '</label><input class="input" type="time" id="tp-t' + i + '" value="' + t.times[i] + '" data-dirty data-time="' + i + '"></div>';
        }).join('') : '<div class="field"><label class="field-label" for="tp-t0">Hora</label><input class="input" type="time" id="tp-t0" value="' + t.times[0] + '" data-dirty data-time="0"></div>') +
        '</div><p class="field-help">El cambio se aplica en la siguiente comprobación del programador.</p>' +
        '<details class="tech"><summary><i data-lucide="chevron-right"></i>Datos técnicos</summary><div class="tech-grid">' +
        '<div class="field"><label class="field-label" for="tp-tz">Huso horario</label><input class="input" id="tp-tz" value="Europe/Madrid" data-dirty></div>' +
        '<div><span class="field-label">Cron</span><code>' + esc(t.cron) + '</code></div></div></details>';
    }
    h += '</section>';

    h += '<section class="tp-sec" aria-labelledby="tp-pv-t"><h3 class="h3" id="tp-pv-t">Vista previa <span class="proposal-tag">Propuesta</span></h3>' +
      '<div class="tp-preview"><div class="lockline"><div class="push" aria-hidden="true"><div class="push-top"><span class="push-icon">' + SYMBOL + '</span><span class="push-app">EXOM</span><span class="push-when">ahora</span></div>' +
      '<p class="push-title" data-pv-title></p><p class="push-body" data-pv-body></p></div></div>' +
      '<div class="tp-preview-notes"><p class="sr-only" data-pv-sr></p><p>Las variables se sustituyen por valores de ejemplo, resaltados.</p><p>Al abrir, lleva a: <b data-pv-route></b></p></div></div></section>';
    h += '</div>';

    h += '<div class="tp-foot">' +
      (t.auto ? '<button class="btn btn-ghost" type="button" data-open="#dlg-restore" aria-haspopup="dialog"' + (t.custom ? '' : ' disabled') + '><i data-lucide="rotate-ccw"></i>Restaurar defecto</button>'
        : '<button class="btn btn-danger" type="button" data-open="#dlg-del" aria-haspopup="dialog"><i data-lucide="trash-2"></i>Eliminar plantilla</button>') +
      '<span class="spacer"></span><span class="tp-dirty" data-dirty-mark hidden>Cambios sin guardar</span>' +
      '<span class="proposal-tag" data-tip="Un solo guardado para texto y horario: llama a los dos endpoints existentes.">Guardado único · Propuesta</span>' +
      '<button class="btn btn-primary" type="button" id="tp-save" data-loading-label="Guardando..." disabled>Guardar cambios</button></div>';
    ed.innerHTML = h;
    $$('[data-tp-fill]').forEach(function (el) { el.textContent = t.name; });
    syncPreview();
    Proto.icons();
  }
  function syncPreview() {
    var ti = $('#tp-title'), bo = $('#tp-body'), ro = $('#tp-route');
    if (!ti) return;
    $('[data-pv-title]').innerHTML = fill(ti.value, true);
    $('[data-pv-body]').innerHTML = fill(bo.value, true);
    $('[data-pv-sr]').textContent = 'Vista previa: ' + fill(ti.value, false) + '. ' + fill(bo.value, false);
    var r = ro.value.trim();
    $('[data-pv-route]').textContent = (ROUTES[r] || 'Pantalla personalizada') + (r ? ' (' + r + ')' : '');
    $('[data-cnt="tp-title"]').textContent = ti.value.length + '/120';
    $('[data-cnt="tp-body"]').textContent = bo.value.length + '/500';
    var bad = r && r.charAt(0) !== '/';
    var f = ro.closest('.field');
    f.classList.toggle('is-invalid', !!bad);
    $('#tp-route-h').textContent = bad ? 'La ruta debe empezar por / o quedar vacía' : 'Ruta de la app; empieza por / o queda vacía.';
    $('#tp-route-h').className = bad ? 'field-error' : 'field-help';
  }
  function setDirty(v) {
    st.dirty = v;
    var m = $('[data-dirty-mark]'); if (m) m.hidden = !v;
    var s = $('#tp-save'); if (s) s.disabled = !v;
    var row = $('.tp-row[data-tp="' + st.cur + '"] .tp-row-marks');
    if (row) {
      var dot = row.querySelector('.tp-dirty-dot');
      if (v && !dot) row.insertAdjacentHTML('afterbegin', '<span class="tp-dirty-dot" data-tip="Cambios sin guardar"><span class="sr-only">Cambios sin guardar</span></span>');
      if (!v && dot) dot.remove();
    }
  }
  function select(k, fromUser) {
    st.cur = k; setDirty(false);
    renderList(); renderEditor();
    if (fromUser && isNarrow()) openSheet();
  }
  function openSheet() { doc.body.classList.add('tp-open'); setTimeout(function () { var b = $('[data-tp-back]'); if (b) b.focus(); }, 30); }
  function closeSheet() {
    doc.body.classList.remove('tp-open');
    var r = $('.tp-row[data-tp="' + st.cur + '"]'); if (r) r.focus();
  }
  function openOv(id, from) {
    var had = from.getAttribute('data-open');
    from.setAttribute('data-open', '#' + id); from.click();
    if (had === null) from.removeAttribute('data-open'); else from.setAttribute('data-open', had);
  }
  function closeOv(id) { var c = $('#' + id + ' [data-close]'); if (c) c.click(); }
  function busy(btn, ms, fn) {
    var label = btn.getAttribute('data-loading-label'), node = null;
    btn.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.textContent.trim()) node = n; });
    var old = node && node.textContent;
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    if (label && node) node.textContent = label;
    setTimeout(function () { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); if (node) node.textContent = old; fn(); }, ms || 800);
  }
  function syncFilterCount() {
    var f = st.filters, n = f.cat.length + f.del.length + f.org.length + f.st.length;
    var c = $('[data-tp-fcount]'); c.textContent = n; c.hidden = n === 0;
  }

  function boot() {
    renderCats(); renderList(); renderEditor();
    new MutationObserver(function () { renderList(); renderEditor(); }).observe(doc.body, { attributes: true, attributeFilter: ['data-state'] });

    var pendingRow = null;
    doc.addEventListener('click', function (e) {
      var el = e.target;
      if (!(el instanceof Element)) return;
      var row = el.closest('[data-tp]');
      if (row) {
        var k = row.getAttribute('data-tp');
        if (k === st.cur) { if (isNarrow()) openSheet(); return; }
        if (st.dirty) { st.pending = k; pendingRow = row; openOv('dlg-unsaved', row); return; }
        select(k, true); return;
      }
      if (el.closest('#un-leave')) { closeOv('dlg-unsaved'); if (st.pending) select(st.pending, true); st.pending = null; return; }
      if (el.closest('[data-tp-back]')) {
        if (st.dirty) { st.pending = null; openOv('dlg-unsaved', el.closest('[data-tp-back]')); return; }
        closeSheet(); return;
      }
      var vb = el.closest('[data-var]');
      if (vb) {
        var ta = $('#tp-body'), v = '{' + vb.getAttribute('data-var') + '}';
        var s0 = ta.selectionStart != null ? ta.selectionStart : ta.value.length, s1 = ta.selectionEnd != null ? ta.selectionEnd : s0;
        if (ta.value.length + v.length <= 500) {
          ta.value = ta.value.slice(0, s0) + v + ta.value.slice(s1);
          ta.focus(); ta.setSelectionRange(s0 + v.length, s0 + v.length);
          syncPreview(); setDirty(true);
        }
        return;
      }
      if (el.closest('#tp-save')) {
        var b = $('#tp-save'), t = tpl(st.cur);
        if ($('#tp-route').closest('.field').classList.contains('is-invalid')) { $('#tp-route').focus(); return; }
        if (!$('#tp-title').value.trim() || !$('#tp-body').value.trim()) { Proto.toast('Título y cuerpo son obligatorios', 'danger'); return; }
        busy(b, 900, function () {
          t.title = $('#tp-title').value; t.body = $('#tp-body').value; t.route = $('#tp-route').value; t.on = $('#tp-on').checked;
          if (t.del === 'schedule') { t.sched = $('#tp-sched-on').checked; $$('[data-time]').forEach(function (i) { t.times[+i.getAttribute('data-time')] = i.value; }); if ($('#tp-wd')) t.weekday = +$('#tp-wd').value; }
          if (t.auto) t.custom = true;
          t.updated = '15/11/2026 13:05';
          setDirty(false); renderList(); renderEditor();
          Proto.toast('Plantilla actualizada', 'success', t.del === 'schedule' ? 'Texto y horario guardados.' : null);
        });
        return;
      }
      if (el.closest('#rs-ok')) busy($('#rs-ok'), 800, function () { var t = tpl(st.cur); t.custom = false; t.updated = '15/11/2026 13:06'; closeOv('dlg-restore'); setDirty(false); renderEditor(); Proto.toast('Plantilla restaurada', 'success'); });
      if (el.closest('#dt-ok')) busy($('#dt-ok'), 800, function () { T = T.filter(function (x) { return x.key !== st.cur; }); TOTAL--; closeOv('dlg-del'); if (isNarrow()) doc.body.classList.remove('tp-open'); select(T[0].key, false); Proto.toast('Plantilla eliminada', 'success'); });
      if (el.closest('[data-f-clear]')) { $$('#pop-filters input').forEach(function (i) { i.checked = false; }); st.filters = { cat: [], del: [], org: [], st: [] }; syncFilterCount(); renderList(); }
    });
    doc.addEventListener('input', function (e) {
      var t = e.target;
      if (t.closest && t.closest('#tp-editor') && t.matches('[data-dirty]')) setDirty(true);
      if (t.matches('[data-live]')) syncPreview();
      if (t.matches('[data-tp-search]')) { st.q = t.value.trim(); renderList(); }
    });
    doc.addEventListener('change', function (e) {
      var t = e.target;
      if (t.closest && t.closest('#tp-editor') && t.matches('[data-dirty]')) {
        setDirty(true);
        var tt = tpl(st.cur);
        if (tt.del === 'schedule') {
          var tmp = JSON.parse(JSON.stringify(tt));
          tmp.sched = $('#tp-sched-on').checked;
          $$('[data-time]').forEach(function (i) { tmp.times[+i.getAttribute('data-time')] = i.value; });
          if ($('#tp-wd')) tmp.weekday = +$('#tp-wd').value;
          $('[data-sentence]').textContent = sentence(tmp);
        }
      }
      if (t.closest && t.closest('#pop-filters')) {
        var f = st.filters;
        f.cat = $$('[data-f-cat]:checked').map(function (i) { return i.getAttribute('data-f-cat'); });
        f.del = $$('[data-f-del]:checked').map(function (i) { return i.getAttribute('data-f-del'); });
        f.org = $$('[data-f-org]:checked').map(function (i) { return i.getAttribute('data-f-org'); });
        f.st = $$('[data-f-st]:checked').map(function (i) { return i.getAttribute('data-f-st'); });
        syncFilterCount(); renderList();
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && doc.body.classList.contains('tp-open') && !doc.querySelector('.overlay[data-state="open"]') && !doc.querySelector('.menu[data-state="open"], .popover[data-state="open"]')) {
        if (st.dirty) { openOv('dlg-unsaved', $('[data-tp-back]')); return; }
        closeSheet();
      }
    }, true);
    window.addEventListener('beforeunload', function (e) { if (st.dirty) { e.preventDefault(); e.returnValue = ''; } });

    var sel = params.get('tpl');
    if (sel && tpl(sel)) select(sel, false);
    if (params.get('sheet') === '1') openSheet();
    if (params.get('dirty') === '1') { var ti = $('#tp-title'); ti.value = '{nombre}, hoy toca {entrenamiento}'; syncPreview(); setDirty(true); }
  }
  doc.addEventListener('DOMContentLoaded', boot);
})();
