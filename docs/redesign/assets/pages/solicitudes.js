/*
 * solicitudes.html - prototype behaviour.
 * - Status tabs + resource select filter the mock requests.
 * - SUPER_ADMIN sees every request (Solicitante column); ADMIN sees only Nerea Blanco's.
 * - A row (or its action button) opens #req-sheet with the request detail and a sticky decision bar.
 * - Reject: inline reason area (min 10 chars). Approve: alertdialog, then toast.
 */
(function () {
  'use strict';
  var doc = document;
  function $(id) { return doc.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var ME = 'Nerea Blanco';
  var PEOPLE = {
    'Nerea Blanco': { email: 'nerea.blanco@exom.app', ini: 'NB' },
    'Raúl Torres': { email: 'raul.torres@exom.app', ini: 'RT' }
  };
  var STATUS = {
    PENDING: { label: 'Pendiente', cls: 'chip-warning', icon: 'clock' },
    APPROVED: { label: 'Aprobada', cls: 'chip-success', icon: 'check' },
    REJECTED: { label: 'Rechazada', cls: 'chip-danger', icon: 'x' },
    FAILED: { label: 'Fallida', cls: 'chip-warning', icon: 'triangle-alert' }
  };
  var RESOURCE_GROUP = { Entrenamiento: 'Entrenamientos', Dieta: 'Dietas', Ejercicio: 'Ejercicios', Ingrediente: 'Ingredientes', Comida: 'Comidas', Reto: 'Retos', Logro: 'Logros', 'Notificación': 'Notificaciones' };

  var REQS = [
    { id: 'r1', action: 'Modificar entrenamiento', kind: 'update', type: 'Entrenamiento', resource: 'Full body A', status: 'PENDING', by: 'Nerea Blanco',
      rel: 'hace 2 horas', abs: '15/11/2026, 10:05', created: '15/11/2026, 10:05',
      summary: 'Se solicita actualizar entrenamiento "Full body A".',
      reason: 'Javier Ortega ha pasado a nivel avanzado y el entrenamiento lo comparten otros dos clientes de Raúl. Necesito subir el nivel y añadir hip thrust.',
      diff: [
        ['Nombre', 'Full body A', 'Full body A', true],
        ['Descripción', 'Rutina de cuerpo completo para tres días por semana.', 'Rutina de cuerpo completo con énfasis en tren inferior.'],
        ['Nivel', 'Intermedio', 'Avanzado'],
        ['Duración estimada', '60 min', '75 min'],
        ['Ejercicios', '6 ejercicios', '7 ejercicios (añade Hip thrust)'],
        ['Días por semana', '3', '3', true]
      ],
      jsonCurrent: '{\n  "name": "Full body A",\n  "description": "Rutina de cuerpo completo para tres días por semana.",\n  "level": "INTERMEDIATE",\n  "estimated_duration_min": 60,\n  "days_per_week": 3,\n  "exercise_ids": ["ex_014", "ex_022", "ex_031", "ex_040", "ex_052", "ex_067"]\n}',
      jsonPayload: '{\n  "name": "Full body A",\n  "description": "Rutina de cuerpo completo con énfasis en tren inferior.",\n  "level": "ADVANCED",\n  "estimated_duration_min": 75,\n  "days_per_week": 3,\n  "exercise_ids": ["ex_014", "ex_022", "ex_031", "ex_040", "ex_052", "ex_067", "ex_071"]\n}' },
    { id: 'r2', action: 'Eliminar ejercicio', kind: 'delete', type: 'Ejercicio', resource: 'Remo con mancuerna a una mano', status: 'PENDING', by: 'Raúl Torres',
      rel: 'hace 5 horas', abs: '15/11/2026, 07:12', created: '15/11/2026, 07:12',
      summary: 'Se solicita eliminar ejercicio "Remo con mancuerna a una mano".',
      reason: 'Está duplicado con "Remo unilateral con mancuerna", que es el que usamos en todos los planes.',
      current: [['Nombre', 'Remo con mancuerna a una mano'], ['Grupo muscular', 'Espalda'], ['Material', 'Mancuerna'], ['Creado por', 'Moisés Sánchez']],
      jsonCurrent: '{\n  "name": "Remo con mancuerna a una mano",\n  "muscle_group": "BACK",\n  "equipment": "DUMBBELL",\n  "created_by": "usr_0001"\n}' },
    { id: 'r3', action: 'Enviar notificación', kind: 'other', type: 'Notificación', resource: 'Recordatorio recap semanal', status: 'PENDING', by: 'Nerea Blanco',
      rel: 'hace 1 día', abs: '14/11/2026, 18:40', created: '14/11/2026, 18:40',
      summary: 'Se solicita ejecutar enviar notificación "Recordatorio recap semanal".',
      reason: 'Quiero recordar a todos los clientes que el domingo se envía el recap semanal.',
      payload: [['Título', 'Recordatorio recap semanal'], ['Mensaje', 'No olvides enviar tu recap semanal antes del domingo a las 22:00.'], ['Destinatarios', 'Todos los clientes']],
      jsonPayload: '{\n  "title": "Recordatorio recap semanal",\n  "body": "No olvides enviar tu recap semanal antes del domingo a las 22:00.",\n  "audience": "ALL_CLIENTS"\n}',
      jsonCurrent: 'null' },
    { id: 'r4', action: 'Modificar dieta', kind: 'update', type: 'Dieta', resource: 'Definición 1.800 kcal', status: 'APPROVED', by: 'Nerea Blanco',
      rel: 'hace 2 días', abs: '13/11/2026, 12:30', created: '13/11/2026, 12:30', resolved: '13/11/2026, 16:02', reviewer: 'Moisés Sánchez',
      summary: 'Se solicita actualizar dieta "Definición 1.800 kcal".',
      reason: 'Ajuste de la cena para clientes con intolerancia a la lactosa.',
      result: 'Dieta "Definición 1.800 kcal" actualizada.',
      diff: [['Nombre', 'Definición 1.800 kcal', 'Definición 1.800 kcal', true], ['Comidas', '5 comidas', '5 comidas', true], ['Cena', 'Salmón con yogur griego', 'Salmón con hummus']],
      jsonCurrent: '{\n  "name": "Definición 1.800 kcal",\n  "meals": 5\n}', jsonPayload: '{\n  "name": "Definición 1.800 kcal",\n  "meals": 5\n}' },
    { id: 'r5', action: 'Eliminar reto', kind: 'delete', type: 'Reto', resource: 'Reto 10.000 pasos', status: 'REJECTED', by: 'Raúl Torres',
      rel: 'hace 3 días', abs: '12/11/2026, 09:15', created: '12/11/2026, 09:15', resolved: '12/11/2026, 11:48', reviewer: 'Moisés Sánchez',
      summary: 'Se solicita eliminar reto "Reto 10.000 pasos".',
      reason: 'El reto ya no se usa.',
      rejection: 'El reto tiene clientes inscritos esta semana. Archívalo cuando termine en lugar de eliminarlo.',
      current: [['Nombre', 'Reto 10.000 pasos'], ['Duración', '7 días'], ['Participantes', '12 clientes']],
      jsonCurrent: '{\n  "name": "Reto 10.000 pasos",\n  "duration_days": 7,\n  "participants": 12\n}' },
    { id: 'r6', action: 'Otorgar logro', kind: 'other', type: 'Logro', resource: 'Constancia 30 días', status: 'FAILED', by: 'Nerea Blanco',
      rel: 'hace 4 días', abs: '11/11/2026, 17:20', created: '11/11/2026, 17:20', resolved: '11/11/2026, 19:05', reviewer: 'Moisés Sánchez',
      summary: 'Se solicita ejecutar otorgar logro "Constancia 30 días".',
      reason: 'Sara Gil completó 30 días seguidos, pero el logro no se le asignó automáticamente.',
      failure: 'La clienta ya tenía este logro otorgado.',
      payload: [['Logro', 'Constancia 30 días'], ['Cliente', 'Sara Gil']],
      jsonPayload: '{\n  "achievement_id": "ach_030",\n  "client_id": "cli_0107"\n}', jsonCurrent: 'null' },
    { id: 'r7', action: 'Modificar ejercicio', kind: 'update', type: 'Ejercicio', resource: 'Press banca', status: 'APPROVED', by: 'Raúl Torres',
      rel: 'hace 6 días', abs: '09/11/2026, 08:50', created: '09/11/2026, 08:50', resolved: '09/11/2026, 10:10', reviewer: 'Moisés Sánchez', gone: true,
      summary: 'Se solicita actualizar ejercicio "Press banca".',
      reason: 'Corregir el vídeo de técnica.',
      result: 'Ejercicio "Press banca" actualizado.',
      diff: [['Nombre', 'Press banca', 'Press banca', true], ['Vídeo de técnica', 'press-banca-v1.mp4', 'press-banca-v2.mp4']],
      jsonCurrent: '{\n  "name": "Press banca",\n  "video": "press-banca-v1.mp4"\n}', jsonPayload: '{\n  "name": "Press banca",\n  "video": "press-banca-v2.mp4"\n}' }
  ];

  var state = { status: 'PENDING', resource: '' };
  var current = null;

  function role() { return doc.documentElement.getAttribute('data-role') === 'admin' ? 'admin' : 'super'; }
  function icons() { if (window.Proto) window.Proto.icons(); }
  function chip(st) { var s = STATUS[st]; return '<span class="chip no-dot ' + s.cls + '"><i data-lucide="' + s.icon + '"></i>' + s.label + '</span>'; }
  function byId(id) { return REQS.filter(function (r) { return r.id === id; })[0]; }
  function mine(r) { return role() === 'super' || r.by === ME; }

  /* ---------- table ---------- */
  function render() {
    var sup = role() === 'super';
    var rows = REQS.filter(function (r) {
      return mine(r) && (state.status === 'ALL' || r.status === state.status) && (!state.resource || RESOURCE_GROUP[r.type] === state.resource);
    });
    $('rq-rows').innerHTML = rows.map(function (r) {
      var p = PEOPLE[r.by];
      return '<tr data-req="' + r.id + '" class="row-link">' +
        (sup ? '<td class="cell-primary rq-req"><div class="entity"><span class="avatar avatar-32" aria-hidden="true">' + p.ini + '</span>' +
          '<span class="entity-text"><span class="entity-name">' + esc(r.by) + '</span><span class="entity-sub">' + p.email + '</span></span></div></td>' : '') +
        '<td' + (sup ? ' class="rq-act-cell" data-label="Acción"' : ' class="cell-primary"') + '><span class="rq-action">' +
          '<button class="rq-action-btn" type="button" data-open="#req-sheet" aria-haspopup="dialog" data-req-open="' + r.id + '">' + esc(r.action) + '</button>' +
          '<span class="tag">' + r.type + '</span></span></td>' +
        '<td class="p3" data-label="Recurso"><span>' + esc(r.resource) + '</span></td>' +
        '<td class="st-inline" data-label="Estado">' + chip(r.status) + '</td>' +
        '<td class="p2" data-label="Fecha"><span class="rq-date"><time datetime="" title="' + r.abs + '">' + r.rel + '</time><span class="abs">' + r.abs + '</span></span></td>' +
        '<td class="cell-actions"><span class="cell-actions-inner"><i data-lucide="chevron-right" class="row-chevron"></i></span></td>' +
        '</tr>';
    }).join('');
    $('rq-filtered-empty').hidden = rows.length > 0;
    $('rq-table-wrap').hidden = rows.length === 0;
    icons();
  }

  /* ---------- detail ---------- */
  function dl(pairs) {
    return '<dl class="dl">' + pairs.map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl>';
  }
  function tech(r) {
    var blocks = [];
    if (r.jsonCurrent && r.kind !== 'other') blocks.push(['Estado actual', r.jsonCurrent]);
    if (r.jsonPayload) blocks.push(['Payload solicitado', r.jsonPayload]);
    if (r.kind === 'other' && r.jsonCurrent) blocks.push(['Estado actual', r.jsonCurrent]);
    return '<details class="tech"><summary><i data-lucide="chevron-right"></i>Ver datos técnicos (JSON)</summary><div class="tech-grid">' +
      blocks.map(function (b) { return '<div><span class="micro">' + b[0] + '</span><pre>' + esc(b[1]) + '</pre></div>'; }).join('') + '</div></details>';
  }
  function detailBody(r) {
    var sup = role() === 'super';
    var h = '';
    h += '<section class="rq-sec" aria-labelledby="s-res"><h3 class="micro" id="s-res">Resumen</h3><p class="rq-summary">' + esc(r.summary) + '</p></section>';
    if (r.status === 'REJECTED') h += '<section class="rq-sec" aria-labelledby="s-rej"><h3 class="micro" id="s-rej">Motivo de rechazo</h3><div class="banner banner-danger"><i data-lucide="circle-x"></i><span class="banner-text">' + esc(r.rejection) + '</span></div></section>';
    if (r.status === 'FAILED') h += '<section class="rq-sec" aria-labelledby="s-fail"><h3 class="micro" id="s-fail">Resultado</h3><div class="banner banner-warning"><i data-lucide="triangle-alert"></i><span class="banner-text"><b>La ejecución aprobada falló</b> · ' + esc(r.failure) + '</span></div></section>';
    if (r.status === 'APPROVED' && r.result) h += '<section class="rq-sec" aria-labelledby="s-out"><h3 class="micro" id="s-out">Resultado</h3><p>' + esc(r.result) + '</p></section>';
    h += '<section class="rq-sec" aria-labelledby="s-why"><h3 class="micro" id="s-why">Motivo de la solicitud</h3><blockquote class="quote">' + esc(r.reason) + '</blockquote></section>';

    h += '<section class="rq-sec" aria-labelledby="s-aff"><h3 class="micro" id="s-aff">Recurso afectado</h3>' +
      '<p class="rq-resource">' + esc(r.resource) + ' <span class="tag">' + r.type + '</span></p>' +
      (r.gone ? '<div class="banner banner-warning" style="margin-top:12px"><i data-lucide="triangle-alert"></i><span class="banner-text">Este recurso ya no existe en el estado actual del sistema.</span></div>' : '') +
      '</section>';

    if (sup && r.kind === 'update') {
      var changed = r.diff.filter(function (d) { return !d[3]; }).length;
      h += '<section class="rq-sec" aria-labelledby="s-diff"><div class="rq-sec-head"><h3 class="micro" id="s-diff">Cambios propuestos <span class="proposal-tag" title="Hoy se muestra JSON crudo con claves técnicas">Propuesta</span></h3>' +
        '<div class="diff-tools"><span class="caption">' + changed + (changed === 1 ? ' campo cambia' : ' campos cambian') + '</span>' +
        '<label class="switch"><input type="checkbox" role="switch" data-show-same>Mostrar campos sin cambios</label></div></div>' +
        '<table class="diff"><caption class="sr-only">Comparación entre el estado actual y el cambio propuesto</caption><thead><tr><th scope="col">Campo</th><th scope="col">Estado actual</th><th scope="col">Cambio propuesto</th></tr></thead><tbody>' +
        r.diff.map(function (d) {
          return '<tr' + (d[3] ? ' class="is-same" hidden' : '') + '><td>' + esc(d[0]) + '</td>' +
            '<td class="old">' + (d[3] ? '' : '<span class="sr-only">Actual: </span>') + esc(d[1]) + '</td>' +
            '<td class="new">' + (d[3] ? '<span class="sr-only">Sin cambios: </span>' : '<span class="sr-only">Propuesto: </span>') + esc(d[2]) + '</td></tr>';
        }).join('') + '</tbody></table>' + tech(r) + '</section>';
    }
    if (r.kind === 'delete') {
      h += '<section class="rq-sec" aria-labelledby="s-del"><h3 class="micro" id="s-del">Estado actual</h3>' +
        '<div class="banner banner-danger"><i data-lucide="trash-2"></i><span class="banner-text"><b>Se eliminará este recurso</b></span></div>' +
        dl(r.current) + (sup ? tech(r) : '') + '</section>';
    }
    if (r.kind === 'other' && sup) {
      h += '<section class="rq-sec" aria-labelledby="s-pay"><div class="rq-sec-head"><h3 class="micro" id="s-pay">Payload solicitado <span class="proposal-tag" title="Hoy se muestra JSON crudo con claves técnicas">Propuesta</span></h3></div>' +
        dl(r.payload) + tech(r) + '</section>';
    }
    h += '<section class="rq-sec" aria-labelledby="s-ctx"><h3 class="micro" id="s-ctx">Contexto</h3>' + dl([
      ['Acción', r.action], ['Recurso', r.resource], ['Tipo', r.type], ['Solicitante', r.by + ' · ' + PEOPLE[r.by].email],
      ['Creada', r.created], ['Resuelta', r.resolved || '—'], ['Revisada por', r.reviewer || '—']
    ]) + '</section>';
    return h;
  }

  function openDetail(id) {
    var r = byId(id);
    if (!r) return;
    current = r;
    var p = PEOPLE[r.by];
    var sup = role() === 'super';
    $('rq-head').innerHTML =
      '<div class="rq-titlerow"><h2 class="ov-title" id="rq-title">' + esc(r.action) + '</h2><span class="tag">' + r.type + '</span>' + chip(r.status) + '</div>' +
      '<p class="ov-desc" id="rq-desc">' + (sup ? 'Revisa el contexto funcional y el diff técnico antes de aprobar o rechazar esta solicitud.' : 'Consulta el contexto de negocio de tu solicitud, su estado y si todavía puedes cancelarla.') + '</p>' +
      '<div class="rq-requester"><span class="avatar avatar-32" aria-hidden="true">' + p.ini + '</span>' +
        '<span class="entity-text"><span class="entity-name">' + esc(r.by) + '</span><span class="entity-sub">' + p.email + '</span></span>' +
        '<time class="rq-when" title="' + r.abs + '">' + r.rel + '</time></div>';
    $('rq-body').innerHTML = detailBody(r);
    $('rq-body').scrollTop = 0;
    var mode = r.status !== 'PENDING' ? 'resolved' : (sup ? 'super-pending' : 'admin-pending');
    Array.prototype.forEach.call(doc.querySelectorAll('[data-foot]'), function (g) { g.hidden = g.getAttribute('data-foot') !== mode; });
    hideReject();
    $('dlg-approve-d').textContent = r.summary;
    icons();
  }

  function showReject() {
    $('rq-reject').hidden = false;
    $('rq-foot').hidden = true;
    $('rq-reject-open').setAttribute('aria-expanded', 'true');
    $('rq-reason').focus();
  }
  function hideReject() {
    $('rq-reject').hidden = true;
    $('rq-foot').hidden = false;
    $('rq-reject-open').setAttribute('aria-expanded', 'false');
    $('rq-reason').value = '';
    clearReasonError();
  }
  function clearReasonError() {
    var f = $('rq-reason').closest('.field');
    f.classList.remove('is-invalid');
    $('rq-reason').removeAttribute('aria-invalid');
    $('rq-reason').removeAttribute('aria-describedby');
    var e = f.querySelector('.field-error');
    if (e) e.remove();
  }

  function resolve(status, toastMsg) {
    current.status = status;
    current.resolved = '15/11/2026, 12:20';
    current.reviewer = 'Moisés Sánchez';
    var closeBtn = doc.querySelector('#req-sheet .ov-head [data-close]');
    closeBtn.click();
    render();
    window.Proto.toast(toastMsg, 'success');
  }

  function setLoading(btn, on) {
    var label = btn.getAttribute('data-loading-label');
    var node = null;
    Array.prototype.forEach.call(btn.childNodes, function (n) { if (n.nodeType === 3 && n.textContent.trim()) node = n; });
    btn.classList.toggle('is-loading', on);
    if (on) { btn.setAttribute('aria-busy', 'true'); if (label && node) { btn._l = node.textContent; node.textContent = label; } }
    else { btn.removeAttribute('aria-busy'); if (btn._l && node) { node.textContent = btn._l; btn._l = null; } }
  }

  function selectTab(tab, focus) {
    Array.prototype.forEach.call(doc.querySelectorAll('#rq-tabs .tab'), function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    state.status = tab.getAttribute('data-status');
    if (focus) tab.focus();
    render();
  }

  function init() {
    render();
    var params = new URLSearchParams(window.location.search);
    if (params.get('req')) openDetail(params.get('req'));
    else if (params.get('open') === 'req-sheet') openDetail('r1');

    // Re-render when the prototype role changes
    new MutationObserver(function () { render(); }).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-role'] });

    doc.addEventListener('click', function (e) {
      var t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      var opener = t.closest('[data-req-open]');
      if (opener) { openDetail(opener.getAttribute('data-req-open')); return; }
      var row = t.closest('tr[data-req]');
      if (row && !t.closest('button, a, input, label')) {
        // Delegate to the row's real button so proto.js opens the sheet with focus return
        row.querySelector('[data-req-open]').click();
        return;
      }
      var tab = t.closest('#rq-tabs .tab');
      if (tab) { selectTab(tab, false); return; }
      if (t.closest('#rq-reject-open')) { showReject(); return; }
      if (t.closest('#rq-reject-hide')) { hideReject(); $('rq-reject-open').focus(); return; }
      if (t.closest('#rq-reject-ok')) {
        var ta = $('rq-reason');
        if (ta.value.trim().length < 10) {
          var f = ta.closest('.field');
          f.classList.add('is-invalid');
          ta.setAttribute('aria-invalid', 'true');
          if (!f.querySelector('.field-error')) {
            f.insertAdjacentHTML('beforeend', '<p class="field-error" id="rq-reason-err"><i data-lucide="circle-alert"></i><span>El motivo debe tener al menos 10 caracteres</span></p>');
            icons();
          }
          ta.setAttribute('aria-describedby', 'rq-reason-err');
          ta.focus();
          return;
        }
        var okBtn = t.closest('#rq-reject-ok');
        setLoading(okBtn, true);
        window.setTimeout(function () {
          setLoading(okBtn, false);
          current.rejection = ta.value.trim();
          resolve('REJECTED', 'Solicitud rechazada correctamente');
        }, 700);
        return;
      }
      var appr = t.closest('#dlg-approve-ok');
      if (appr) {
        setLoading(appr, true);
        window.setTimeout(function () {
          setLoading(appr, false);
          doc.querySelector('#dlg-approve [data-close]').click();
          current.result = current.summary.replace('Se solicita', 'Se ha ejecutado:');
          resolve('APPROVED', 'Solicitud aprobada y ejecutada correctamente');
        }, 800);
        return;
      }
      var cancel = t.closest('#rq-cancel');
      if (cancel) {
        setLoading(cancel, true);
        window.setTimeout(function () {
          setLoading(cancel, false);
          REQS = REQS.filter(function (r) { return r !== current; });
          doc.querySelector('#req-sheet .ov-head [data-close]').click();
          render();
          window.Proto.toast('Solicitud cancelada correctamente', 'success');
        }, 700);
      }
    }, true);

    doc.addEventListener('change', function (e) {
      if (e.target.id === 'rq-resource') { state.resource = e.target.value; render(); }
      if (e.target.matches('[data-show-same]')) {
        Array.prototype.forEach.call(doc.querySelectorAll('.diff tr.is-same'), function (tr) { tr.hidden = !e.target.checked; });
      }
    });
    doc.addEventListener('input', function (e) {
      if (e.target.id === 'rq-reason' && e.target.value.trim().length >= 10) clearReasonError();
    });

    $('rq-tabs').addEventListener('keydown', function (e) {
      var tabs = Array.prototype.slice.call(doc.querySelectorAll('#rq-tabs .tab'));
      var i = tabs.indexOf(doc.activeElement), n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
