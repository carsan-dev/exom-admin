/*
 * feedback.html - review queue behaviour (prototype only).
 * - Renders the queue from mock data, filters by client / status.
 * - >= 1024px: selecting a row fills the detail pane. < 1024px: the row opens #fb-sheet.
 * - Responder: "Enviando...", toast, item becomes Revisado, selection moves to the next pending.
 * - Prototype bar gets a "Detalle" row (?v=pending|answered|expired|filtered).
 */
(function () {
  'use strict';
  var doc = document;

  var ITEMS = [
    { id: 'fb1', client: 'Javier Ortega', exercise: 'Sentadilla búlgara', lastSet: true, training: 'Pierna B', type: 'video', duration: '0:42',
      date: '15/11/2026', long: 'domingo, 15 de noviembre de 2026', status: 'PENDING',
      notes: 'En la última serie noto que la rodilla izquierda se me va hacia dentro al bajar. ¿Bajo el peso o es cuestión de técnica?' },
    { id: 'fb2', client: 'Daniel Vega', exercise: 'Press militar con mancuernas', lastSet: false, training: 'Torso A', type: 'video', duration: '0:31',
      date: '14/11/2026', long: 'sábado, 14 de noviembre de 2026', status: 'PENDING',
      notes: 'Molestias en el hombro derecho en las dos últimas repeticiones. No es dolor fuerte, pero lo noto al subir.' },
    { id: 'fb3', client: 'Lucía Martínez', exercise: 'Hip thrust', lastSet: false, training: 'Pierna A', type: 'image',
      date: '13/11/2026', long: 'viernes, 13 de noviembre de 2026', status: 'PENDING',
      notes: '¿Está bien la posición de la espalda arriba? Me cuesta no arquear la zona lumbar.' },
    { id: 'fb4', client: 'Sara Gil', exercise: 'Peso muerto rumano', lastSet: true, training: 'Full body C', type: 'video', duration: '0:55',
      date: '12/11/2026', long: 'jueves, 12 de noviembre de 2026', status: 'PENDING', notes: '' },
    { id: 'fb5', client: 'Marta Ruiz', exercise: 'Remo con barra', lastSet: false, training: 'Torso A', type: 'video', duration: '0:38',
      date: '10/11/2026', long: 'martes, 10 de noviembre de 2026', status: 'REVIEWED',
      notes: 'Primera vez con 40 kg. ¿Mantengo la espalda bien?',
      reply: 'Buena técnica, Marta. Mantén el pecho alto y controla la bajada en dos segundos. La semana que viene probamos 42,5 kg.' },
    { id: 'fb6', client: 'Pablo Herrera', exercise: 'Dominadas asistidas', lastSet: false, training: 'Torso B', type: 'image',
      date: '09/11/2026', long: 'lunes, 9 de noviembre de 2026', status: 'REVIEWED', notes: '',
      reply: 'La posición de partida es correcta. Baja hasta extender los codos del todo antes de la siguiente repetición.' },
    { id: 'fb7', client: 'Carla Núñez', exercise: 'Zancadas caminando', lastSet: true, training: 'Pierna B', type: 'video', duration: '0:47',
      date: '12/10/2026', long: 'lunes, 12 de octubre de 2026', status: 'REVIEWED', expired: '01/11/2026',
      notes: 'Me tambaleo un poco en la última serie.',
      reply: 'Acorta un poco la zancada y mira al frente: ganarás estabilidad. Si sigues tambaleándote, baja a mancuernas de 8 kg.' }
  ];

  var filter = { client: '', status: 'ALL' };
  var selectedId = 'fb1';
  var mqDesk = window.matchMedia('(min-width: 1024px)');
  var drafts = {};

  function $(id) { return doc.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function byId(id) { return ITEMS.filter(function (i) { return i.id === id; })[0]; }
  function visible() {
    return ITEMS.filter(function (i) {
      return (!filter.client || i.client === filter.client) && (filter.status === 'ALL' || i.status === filter.status);
    });
  }
  function chip(it) {
    return it.status === 'PENDING' ? '<span class="chip chip-warning">Pendiente</span>' : '<span class="chip chip-success">Revisado</span>';
  }
  function icons() { if (window.Proto) window.Proto.icons(); }

  /* ---------- list ---------- */
  function renderList() {
    var list = $('fb-list');
    var rows = visible();
    list.innerHTML = rows.map(function (it) {
      var sel = it.id === selectedId;
      return '<li><button class="fb-row' + (sel ? ' is-selected' : '') + '" type="button" data-id="' + it.id + '"' +
        (sel ? ' aria-current="true"' : '') + (mqDesk.matches ? ' aria-controls="fb-detail"' : ' data-open="#fb-sheet" aria-haspopup="dialog"') + '>' +
        '<i data-lucide="' + (it.type === 'video' ? 'video' : 'image') + '" class="fb-type"></i>' +
        '<span class="fb-text"><span class="fb-name"><span class="sr-only">' + (it.type === 'video' ? 'Vídeo' : 'Imagen') + ' de </span>' + esc(it.client) + '</span>' +
          '<span class="fb-ex"><span>' + esc(it.exercise) + '</span>' + (it.lastSet ? '<span class="tag">Última serie</span>' : '') + '</span></span>' +
        '<span class="fb-side"><span class="fb-date">' + it.date + '</span>' + chip(it) + '</span>' +
        '</button></li>';
    }).join('');
    $('fb-filtered-empty').hidden = rows.length > 0;
    $('fb-pagination').hidden = rows.length === 0;
    var pending = ITEMS.filter(function (i) { return i.status === 'PENDING'; }).length;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-pending-meta]'), function (m) {
      m.textContent = pending === 1 ? '1 pendiente' : pending + ' pendientes';
    });
    icons();
  }

  /* ---------- detail ---------- */
  function headHTML(it, idp) {
    return '<div class="fbd-title-row"><h2 class="fbd-title" id="' + idp + '-t">' + esc(it.client) + '</h2>' + chip(it) + '</div>' +
      '<dl class="fbd-facts">' +
        '<div><dt>Ejercicio</dt><dd>' + esc(it.exercise) + (it.lastSet ? ' <span class="tag" style="margin-left:6px">Última serie</span>' : '') + '</dd></div>' +
        '<div><dt>Entrenamiento</dt><dd>' + esc(it.training) + '</dd></div>' +
        '<div><dt>Fecha programada</dt><dd>' + esc(it.long) + '</dd></div>' +
      '</dl>';
  }
  function mediaHTML(it) {
    var noun = it.type === 'video' ? 'vídeo' : 'imagen';
    if (it.expired) {
      return '<div class="media is-gone"><div class="media-gone">' +
        '<i data-lucide="' + (it.type === 'video' ? 'video-off' : 'image-off') + '"></i>' +
        '<p class="media-gone-title">' + (it.type === 'video' ? 'El vídeo ya no está disponible' : 'La imagen ya no está disponible') + '</p>' +
        '<p class="media-gone-text">Se eliminó automáticamente el ' + it.expired + ' según la política de retención.</p></div></div>';
    }
    if (it.type === 'video') {
      return '<div class="media" role="group" aria-label="Vídeo de ' + esc(it.client) + '">' +
        '<span class="media-kind"><i data-lucide="video"></i>Vídeo</span>' +
        '<button class="media-play" type="button" aria-label="Reproducir vídeo"><i data-lucide="play"></i></button>' +
        '<div class="media-bar" aria-hidden="true"><span>0:00</span><span class="media-track"></span><span>' + it.duration + '</span></div></div>';
    }
    return '<div class="media" role="img" aria-label="Imagen enviada por ' + esc(it.client) + '">' +
      '<span class="media-kind"><i data-lucide="image"></i>Imagen</span>' +
      '<span class="media-image" aria-hidden="true"><i data-lucide="image"></i></span></div>';
    void noun;
  }
  function bodyHTML(it) {
    var html = mediaHTML(it);
    if (it.notes) html += '<div><h3 class="fbd-block-title">Notas del cliente</h3><blockquote class="quote">' + esc(it.notes) + '</blockquote></div>';
    if (it.status === 'REVIEWED') {
      html += '<div><h3 class="fbd-block-title">Respuesta del admin</h3><div class="reply-read">' +
        '<p class="reply-read-head"><i data-lucide="check"></i>Respondido</p>' + esc(it.reply) + '</div></div>';
    }
    return html;
  }
  function footHTML(it, idp) {
    if (it.status !== 'PENDING') return '';
    var hasNext = nextPending(it.id) !== null;
    return '<div class="field">' +
        '<label class="field-label" for="' + idp + '-reply">Respuesta del admin</label>' +
        '<textarea class="textarea" id="' + idp + '-reply" rows="3" placeholder="Escribe tu respuesta o comentario..." data-reply="' + it.id + '">' + esc(drafts[it.id] || '') + '</textarea>' +
      '</div>' +
      '<div class="fbd-foot-row">' +
        '<span class="fbd-next">' + (hasNext ? 'Al responder pasa al siguiente pendiente' : 'Es el último pendiente') +
          ' <span class="proposal-tag" title="Hoy se cierra el diálogo y se vuelve a la tabla">Propuesta</span></span>' +
        '<button class="btn btn-primary" type="button" data-send="' + it.id + '"' + (drafts[it.id] ? '' : ' disabled') + '>' +
          '<i data-lucide="send"></i><span class="btn-label">Responder</span></button>' +
      '</div>';
  }

  function renderPane() {
    var pane = $('fb-detail');
    var it = byId(selectedId);
    var shown = visible().some(function (i) { return i.id === selectedId; });
    if (!it || !shown) {
      pane.innerHTML = '<div class="fbd-none"><div class="empty empty-compact"><span class="empty-x" aria-hidden="true"></span>' +
        '<p class="empty-title">Selecciona un feedback del listado</p></div></div>';
      pane.setAttribute('aria-label', 'Detalle de feedback');
      return;
    }
    pane.setAttribute('aria-labelledby', 'fbp-t');
    pane.removeAttribute('aria-label');
    pane.innerHTML = '<header class="fbd-head">' + headHTML(it, 'fbp') + '</header>' +
      '<div class="fbd-body">' + bodyHTML(it) + '</div>' +
      (it.status === 'PENDING' ? '<footer class="fbd-foot">' + footHTML(it, 'fbp') + '</footer>' : '');
    icons();
  }

  function renderSheet() {
    var it = byId(selectedId);
    if (!it) return;
    var rows = visible();
    var i = rows.indexOf(it);
    $('fb-sheet-body').innerHTML = '<div class="fbd-head">' + headHTML(it, 'fbs') + '</div>' + bodyHTML(it);
    var foot = $('fb-sheet-foot');
    foot.innerHTML = footHTML(it, 'fbs');
    foot.hidden = it.status !== 'PENDING';
    $('fb-sheet-pos').textContent = (i + 1) + ' de ' + rows.length;
    var prev = doc.querySelector('[data-step="-1"]'), next = doc.querySelector('[data-step="1"]');
    prev.disabled = i <= 0; next.disabled = i >= rows.length - 1;
    icons();
  }

  function markSelected() {
    Array.prototype.forEach.call(doc.querySelectorAll('.fb-row'), function (b) {
      var on = b.getAttribute('data-id') === selectedId;
      b.classList.toggle('is-selected', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }
  function select(id, focusRow, keepList) {
    selectedId = id;
    if (keepList) markSelected(); else renderList();
    renderPane();
    renderSheet();
    if (focusRow) {
      var b = doc.querySelector('.fb-row[data-id="' + id + '"]');
      if (b) b.focus({ preventScroll: false });
    }
  }

  function nextPending(fromId) {
    var rows = visible();
    var start = rows.findIndex(function (r) { return r.id === fromId; });
    for (var k = 1; k <= rows.length; k++) {
      var r = rows[(start + k) % rows.length];
      if (r.status === 'PENDING' && r.id !== fromId) return r;
    }
    return null;
  }

  /* ---------- send reply ---------- */
  function send(btn) {
    var id = btn.getAttribute('data-send');
    var it = byId(id);
    var text = (drafts[id] || '').trim();
    if (!text) return;
    var label = btn.querySelector('.btn-label');
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    label.textContent = 'Enviando...';
    window.setTimeout(function () {
      it.status = 'REVIEWED';
      it.reply = text;
      delete drafts[id];
      window.Proto.toast('Respuesta enviada correctamente', 'success');
      var nxt = nextPending(id);
      var inSheet = !!btn.closest('#fb-sheet');
      select(nxt ? nxt.id : id, false);
      if (inSheet) {
        var ta = doc.querySelector('#fb-sheet textarea');
        (ta || doc.querySelector('#fb-sheet [data-close]')).focus({ preventScroll: true });
      } else {
        var t2 = doc.querySelector('#fb-detail textarea');
        if (t2) t2.focus({ preventScroll: true });
      }
    }, 800);
  }

  /* ---------- prototype variant row ---------- */
  var VARIANTS = [['pending', 'pendiente'], ['answered', 'respondido'], ['expired', 'vídeo caducado'], ['filtered', 'filtros sin resultados']];
  function setVariant(v) {
    filter = { client: '', status: 'ALL' };
    $('fb-client').value = '';
    if (v === 'answered') selectedId = 'fb5';
    else if (v === 'expired') selectedId = 'fb7';
    else selectedId = 'fb1';
    if (v === 'filtered') { filter.client = 'Pablo Herrera'; filter.status = 'PENDING'; $('fb-client').value = 'Pablo Herrera'; }
    Array.prototype.forEach.call(doc.querySelectorAll('#fb-status .seg-btn'), function (b) {
      b.setAttribute('aria-pressed', String(b.value === filter.status));
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-pv]'), function (b) { b.setAttribute('aria-pressed', String(b.value === v)); });
    select(selectedId, false);
  }
  function addVariantRow(current) {
    var panel = $('proto-panel');
    if (!panel) return;
    panel.insertAdjacentHTML('beforeend', '<div class="proto-row"><span>Detalle</span><div class="proto-opts">' +
      VARIANTS.map(function (o) { return '<button type="button" data-pv value="' + o[0] + '" aria-pressed="' + (o[0] === current) + '">' + o[1] + '</button>'; }).join('') +
      '</div></div>');
  }

  /* ---------- wiring ---------- */
  function init() {
    var params = new URLSearchParams(window.location.search);
    var v = params.get('v') || 'pending';
    addVariantRow(v);
    setVariant(v);
    if (params.get('open') === 'fb-sheet') renderSheet();

    doc.addEventListener('click', function (e) {
      var t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      var pv = t.closest('[data-pv]');
      if (pv) { setVariant(pv.value); return; }
      var row = t.closest('.fb-row');
      if (row) { select(row.getAttribute('data-id'), false, true); return; }
      var seg = t.closest('#fb-status .seg-btn');
      if (seg) { filter.status = seg.value; renderList(); renderPane(); return; }
      var step = t.closest('[data-step]');
      if (step) {
        var rows = visible();
        var i = rows.findIndex(function (r) { return r.id === selectedId; }) + Number(step.getAttribute('data-step'));
        if (rows[i]) { select(rows[i].id, false, true); }
        return;
      }
      var sendBtn = t.closest('[data-send]');
      if (sendBtn && !sendBtn.disabled) send(sendBtn);
      var tg = t.closest('.stats-toggle');
      if (tg) {
        var open = tg.getAttribute('aria-expanded') !== 'true';
        tg.setAttribute('aria-expanded', String(open));
        $('fb-stats').classList.toggle('is-collapsed', !open);
      }
    }, true);

    doc.addEventListener('input', function (e) {
      var ta = e.target.closest && e.target.closest('[data-reply]');
      if (!ta) return;
      var id = ta.getAttribute('data-reply');
      drafts[id] = ta.value;
      var scope = ta.closest('.fbd-foot, .ov-foot');
      var b = scope && scope.querySelector('[data-send]');
      if (b) b.disabled = !ta.value.trim();
    });

    $('fb-client').addEventListener('change', function () { filter.client = this.value; renderList(); renderPane(); });

    // Arrow keys move through the queue
    $('fb-list').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var rows = Array.prototype.slice.call(doc.querySelectorAll('.fb-row'));
      var i = rows.indexOf(doc.activeElement);
      var n = rows[i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (n) { e.preventDefault(); n.focus(); }
    });

    var onMQ = function () { renderList(); renderPane(); };
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', onMQ); else mqDesk.addListener(onMQ);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
