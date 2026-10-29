/* =========================================================================
   BENKYŌ — Page « Emploi du temps » (refonte)
   Données : state.timetable = [{ id, title, day ('0'=lundi … '6'=dimanche), start, end, desc, place?, color }]
   (même format qu'avant : l'accueil et les autres pages continuent de lire ces créneaux).
   ========================================================================= */

let state = (typeof BenkyoStorage !== 'undefined')
  ? BenkyoStorage.load()
  : { timetable: [], profile: {}, streak: { count: 0, lastLogin: '' } };
if (typeof BenkyoStorage !== 'undefined' && BenkyoStorage.autoFlushOn) BenkyoStorage.autoFlushOn(state);

const EDT_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const EDT_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const EDT_KANJI = ['月', '火', '水', '木', '金', '土', '日'];
const EDT_ROMAJI = ['Getsuyōbi', 'Kayōbi', 'Suiyōbi', 'Mokuyōbi', 'Kin\'yōbi', 'Doyōbi', 'Nichiyōbi'];
const EDT_COLORS = ['#cba6f7', '#a5c8fa', '#94e2d5', '#a6e3a1', '#f9e2af', '#f8bd96', '#f5a3a3', '#f5c2e7'];
const EDT_DURS = [[30, '30 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [180, '3 h']];
const EDT_HOUR_H = 56;      // hauteur d'une heure dans la vue semaine (px)
const EDT_SNAP = 15;        // pas du glisser-déposer (minutes)
const EDT_VIEW_KEY = 'benkyo_edt_view_v1';

let edtView = 'week';
let edtDay = (new Date().getDay() + 6) % 7;
let edtLayout = { lo: 8 * 60, hi: 18 * 60 };
let edtForm = null;          // état de la modale créneau
let edtCopySrc = null;       // jour source de la copie
let edtCopyTargets = new Set();
let edtDrag = null;
let edtJustDragged = false;
let edtToastTimer = null;
let edtClip = null;          // créneau copié (Ctrl+C)
let edtHoverId = null;       // créneau sous la souris
let edtHoverDay = null;      // colonne (jour) sous la souris, vue semaine
let edtHoverMin = null;      // heure sous la souris, vue semaine

/* ---------- Outils ---------- */
const $ = id => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function tm(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ''));
  return m ? (+m[1]) * 60 + (+m[2]) : NaN;
}
function hhmm(min) {
  min = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}
function fmtDur(min) {
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return m + ' min';
  return m ? h + ' h ' + String(m).padStart(2, '0') : h + ' h';
}
function todayIdx() { return (new Date().getDay() + 6) % 7; }
function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }
function items() {
  if (!state.timetable || !Array.isArray(state.timetable)) state.timetable = [];
  return state.timetable;
}
function bounds(it) {
  const s = tm(it.start);
  let e = tm(it.end);
  if (isNaN(s)) return null;
  if (isNaN(e) || e <= s) e = s + 30;
  return { s, e };
}
function dayItems(d) {
  return items()
    .filter(it => parseInt(it.day, 10) === d && bounds(it))
    .sort((a, b) => bounds(a).s - bounds(b).s || bounds(a).e - bounds(b).e);
}
function findItem(id) { return items().find(i => String(i.id) === String(id)); }
let edtSeq = 0;
function newId() { return Date.now() * 100 + (edtSeq++ % 100); }
function save() {
  try {
    if (typeof BenkyoStorage !== 'undefined' && BenkyoStorage.save) BenkyoStorage.save(state);
    else localStorage.setItem('benkyo_state', JSON.stringify(state));
  } catch (e) { /* le stockage est facultatif */ }
}
function toast(msg, opts) {
  opts = opts || {};
  const el = $('edt-toast');
  el.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = msg;
  el.appendChild(span);
  if (opts.action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = opts.action.label;
    b.onclick = () => { el.classList.remove('show'); opts.action.fn(); };
    el.appendChild(b);
  }
  el.classList.toggle('err', !!opts.err);
  el.classList.add('show');
  clearTimeout(edtToastTimer);
  edtToastTimer = setTimeout(() => el.classList.remove('show'), opts.action ? 7000 : 3200);
}

/* ---------- Organisation en colonnes des créneaux qui se chevauchent ---------- */
function layoutLanes(list) {
  const evs = list.map(it => { const b = bounds(it); return { it, s: b.s, e: b.e, lane: 0, lanes: 1 }; });
  let group = [], groupEnd = -1;
  const flush = () => {
    if (!group.length) return;
    const lanes = [];
    group.forEach(ev => {
      let l = lanes.findIndex(end => end <= ev.s);
      if (l < 0) { l = lanes.length; lanes.push(0); }
      lanes[l] = ev.e;
      ev.lane = l;
    });
    group.forEach(ev => { ev.lanes = lanes.length; });
    group = [];
  };
  evs.forEach(ev => {
    if (ev.s >= groupEnd) { flush(); groupEnd = -1; }
    group.push(ev);
    groupEnd = Math.max(groupEnd, ev.e);
  });
  flush();
  return evs;
}

/* ---------- En-tête et bandeau « maintenant » ---------- */
function renderHeader() {
  const all = items().filter(bounds);
  const total = all.reduce((n, it) => { const b = bounds(it); return n + (b.e - b.s); }, 0);
  const first = state.profile && state.profile.firstname ? 'Bonjour ' + state.profile.firstname + ' · ' : '';
  $('edt-sub').textContent = all.length
    ? first + all.length + ' créneau' + (all.length > 1 ? 'x' : '') + ' · ' + fmtDur(total) + ' par semaine'
    : first + 'Ajoutez vos cours pour construire votre semaine.';
  $('edt-v-week').classList.toggle('is-active', edtView === 'week');
  $('edt-v-day').classList.toggle('is-active', edtView === 'day');
  $('edt-v-week').setAttribute('aria-pressed', edtView === 'week');
  $('edt-v-day').setAttribute('aria-pressed', edtView === 'day');
}

function renderNow() {
  const box = $('edt-now');
  const d = todayIdx();
  const list = dayItems(d);
  const now = nowMin();
  const live = list.find(it => { const b = bounds(it); return b.s <= now && now < b.e; });
  const next = list.find(it => bounds(it).s > now);
  const weekCount = items().filter(bounds).length;
  const todayTotal = list.reduce((n, it) => { const b = bounds(it); return n + (b.e - b.s); }, 0);
  let cls = 'is-idle', color = '', lab = 'Aujourd\'hui', title = 'Rien de prévu', sub = EDT_DAYS[d] + ' est libre.', bar = '';
  if (live) {
    const b = bounds(live);
    cls = 'is-live'; color = live.color || EDT_COLORS[0];
    lab = 'En cours'; title = live.title;
    sub = 'Jusqu\'à ' + hhmm(b.e) + ' · reste ' + fmtDur(Math.ceil(b.e - now));
    bar = '<div class="edt-bar" aria-hidden="true"><i style="width:' + Math.min(100, Math.max(0, (now - b.s) / (b.e - b.s) * 100)).toFixed(1) + '%"></i></div>';
  } else if (next) {
    const b = bounds(next);
    cls = ''; color = next.color || EDT_COLORS[0];
    lab = 'Prochain cours'; title = next.title;
    sub = 'À ' + hhmm(b.s) + ' · dans ' + fmtDur(Math.ceil(b.s - now));
  } else if (list.length) {
    title = 'Journée terminée'; sub = list.length + ' créneau' + (list.length > 1 ? 'x' : '') + ' aujourd\'hui. Bonne soirée !';
  } else if (!weekCount) {
    title = 'Votre semaine est vide'; sub = 'Cliquez sur « Créneau » pour ajouter votre premier cours.';
  }
  box.className = 'pg-card edt-now ' + cls;
  box.style.setProperty('--c', color || 'var(--rose)');
  box.innerHTML =
    '<div class="edt-now-main"><span class="edt-pulse" aria-hidden="true"></span><div class="edt-now-txt">' +
    '<span class="edt-now-lab">' + esc(lab) + '</span><span class="edt-now-title">' + esc(title) + '</span>' +
    '<span class="edt-now-sub">' + esc(sub) + '</span>' + bar + '</div></div>' +
    '<div class="edt-stats"><div class="edt-stat"><b>' + list.length + '</b><span>Aujourd\'hui</span></div>' +
    '<div class="edt-stat"><b>' + (todayTotal ? fmtDur(todayTotal) : '—') + '</b><span>De cours</span></div></div>';
}

/* ---------- Vue semaine ---------- */
function weekRange() {
  let lo = 8 * 60, hi = 18 * 60;
  items().forEach(it => {
    const b = bounds(it);
    if (!b) return;
    lo = Math.min(lo, b.s);
    hi = Math.max(hi, b.e);
  });
  return { lo: Math.floor(lo / 60) * 60, hi: Math.min(24 * 60, Math.ceil(hi / 60) * 60) };
}

function renderWeek() {
  const { lo, hi } = weekRange();
  edtLayout = { lo, hi };
  const H = EDT_HOUR_H;
  const hours = (hi - lo) / 60;
  const totalH = hours * H;
  const today = todayIdx();
  let head = '<div class="edt-hd edt-hd-axis"></div>';
  for (let d = 0; d < 7; d++) {
    const n = dayItems(d).length;
    head += '<button type="button" class="edt-hd' + (d === today ? ' today' : '') + '" data-day="' + d + '" title="Voir ' + EDT_DAYS[d].toLowerCase() + ' en détail">' +
      '<b>' + EDT_DAYS[d] + '</b><small class="jp" lang="ja">' + EDT_KANJI[d] + '曜日</small><small>' + (n ? n + ' cours' : '—') + '</small></button>';
  }
  let axis = '<div class="edt-axis" style="height:' + totalH + 'px">';
  for (let h = lo / 60; h <= hi / 60; h++) axis += '<span style="top:' + ((h * 60 - lo) / 60 * H) + 'px">' + String(h).padStart(2, '0') + ':00</span>';
  axis += '</div>';
  let cols = '';
  for (let d = 0; d < 7; d++) {
    const evs = layoutLanes(dayItems(d));
    let inner = evs.map(ev => {
      const top = (ev.s - lo) / 60 * H + 1;
      const h = Math.max((ev.e - ev.s) / 60 * H - 2, 34);
      const w = 100 / ev.lanes, l = ev.lane * w;
      const it = ev.it, color = it.color || EDT_COLORS[0];
      const tip = it.title + ' — ' + EDT_DAYS[d] + ' ' + hhmm(ev.s) + ' à ' + hhmm(ev.e) + (it.place ? ' — ' + it.place : '') + (it.desc ? '\n' + it.desc : '');
      return '<button type="button" class="edt-evt" data-id="' + esc(it.id) + '" style="--c:' + esc(color) + ';--eh:' + h + 'px;top:' + top + 'px;height:' + h + 'px;left:calc(' + l + '% + 2px);width:calc(' + w + '% - 4px)" title="' + esc(tip) + '" aria-label="' + esc(it.title + ', ' + EDT_DAYS[d] + ' de ' + hhmm(ev.s) + ' à ' + hhmm(ev.e)) + '">' +
        '<span class="t">' + hhmm(ev.s) + (ev.lanes > 1 ? '' : ' – ' + hhmm(ev.e)) + '</span><b>' + esc(it.title) + '</b>' +
        (it.place ? '<small>' + esc(it.place) + '</small>' : '') + '<span class="edt-rs" aria-hidden="true"></span></button>';
    }).join('');
    if (d === today && nowMin() >= lo && nowMin() <= hi) inner += '<div class="edt-nowline" id="edt-nowline" style="top:' + ((nowMin() - lo) / 60 * H) + 'px"></div>';
    cols += '<div class="edt-col' + (d === today ? ' today' : '') + '" data-day="' + d + '" style="height:' + totalH + 'px" aria-label="' + EDT_DAYS[d] + '">' + inner + '</div>';
  }
  $('edt-view').innerHTML =
    '<div class="pg-card edt-week"><div class="edt-week-in">' +
    '<div class="edt-wk-head">' + head + '</div>' +
    '<div class="edt-wk-body" style="--edt-h:' + H + 'px">' + axis + cols + '</div>' +
    '<p class="edt-week-hint">Cliquez dans une colonne pour ajouter un créneau. À la souris, glissez un cours pour le déplacer, ou tirez son bord inférieur pour changer sa durée. Survolez un cours : Suppr le supprime, Ctrl+C le copie, puis Ctrl+V le colle là où se trouve la souris.</p>' +
    '</div></div>';
}

/* ---------- Vue jour ---------- */
function renderDay() {
  const today = todayIdx();
  const bar = EDT_DAYS.map((n, d) => {
    const c = dayItems(d).length;
    return '<button type="button" class="edt-pill' + (d === edtDay ? ' is-on' : '') + (d === today ? ' today' : '') + '" data-day="' + d + '" aria-pressed="' + (d === edtDay) + '">' +
      '<b>' + EDT_SHORT[d] + '</b><small class="jp" lang="ja">' + EDT_KANJI[d] + '</small><small>' + (c ? c + ' cours' : '—') + '</small></button>';
  }).join('');
  const list = dayItems(edtDay);
  const total = list.reduce((n, it) => { const b = bounds(it); return n + (b.e - b.s); }, 0);
  const now = nowMin();
  let cards = '', prevEnd = null;
  list.forEach(it => {
    const b = bounds(it);
    const color = it.color || EDT_COLORS[0];
    const isLive = edtDay === today && b.s <= now && now < b.e;
    const overlap = prevEnd !== null && b.s < prevEnd;
    if (prevEnd !== null && b.s - prevEnd >= 15) cards += '<div class="edt-gap">Pause · ' + fmtDur(b.s - prevEnd) + '</div>';
    prevEnd = prevEnd === null ? b.e : Math.max(prevEnd, b.e);
    cards +=
      '<article class="edt-card' + (isLive ? ' live' : '') + '" data-id="' + esc(it.id) + '" tabindex="0" style="--c:' + esc(color) + '">' +
      '<div class="tm"><b>' + hhmm(b.s) + '</b><span>' + hhmm(b.e) + '</span><i>' + fmtDur(b.e - b.s) + '</i></div>' +
      '<div class="bd"><h4>' + esc(it.title) + '</h4>' +
      ((isLive || overlap || it.place) ? '<div class="meta">' +
        (isLive ? '<span class="edt-tag live">En cours</span>' : '') +
        (overlap ? '<span class="edt-tag warn">Chevauche le créneau précédent</span>' : '') +
        (it.place ? '<span class="edt-tag"><svg class="pg-ico"><use href="#ei-pin"/></svg>' + esc(it.place) + '</span>' : '') + '</div>' : '') +
      (it.desc ? '<p class="note">' + esc(it.desc) + '</p>' : '') + '</div>' +
      '<div class="edt-acts">' +
      '<button type="button" class="edt-act" data-act="left" data-id="' + esc(it.id) + '" title="Déplacer au jour précédent" aria-label="Déplacer au jour précédent"><svg class="pg-ico"><use href="#ei-left"/></svg></button>' +
      '<button type="button" class="edt-act" data-act="right" data-id="' + esc(it.id) + '" title="Déplacer au jour suivant" aria-label="Déplacer au jour suivant"><svg class="pg-ico"><use href="#ei-right"/></svg></button>' +
      '<button type="button" class="edt-act" data-act="edit" data-id="' + esc(it.id) + '" title="Modifier" aria-label="Modifier"><svg class="pg-ico"><use href="#ei-pencil"/></svg></button>' +
      '<button type="button" class="edt-act" data-act="dup" data-id="' + esc(it.id) + '" title="Dupliquer sur d\'autres jours" aria-label="Dupliquer"><svg class="pg-ico"><use href="#ei-copy"/></svg></button>' +
      '<button type="button" class="edt-act del" data-act="del" data-id="' + esc(it.id) + '" title="Supprimer" aria-label="Supprimer"><svg class="pg-ico"><use href="#ei-trash"/></svg></button>' +
      '</div></article>';
  });
  if (!list.length) {
    cards = '<div class="edt-empty"><span class="big" lang="ja" aria-hidden="true">休</span><p>Aucun créneau prévu ' + (edtDay === today ? 'aujourd\'hui' : 'le ' + EDT_DAYS[edtDay].toLowerCase()) + '.</p>' +
      '<button type="button" class="pg-btn primary" data-act="add"><svg class="pg-ico"><use href="#ei-plus"/></svg>Ajouter un cours</button></div>';
  }
  $('edt-view').innerHTML =
    '<div class="edt-day">' +
    '<div class="pg-card edt-daybar" role="group" aria-label="Choisir un jour">' + bar + '</div>' +
    '<div class="pg-card"><div class="edt-day-head"><div><h2 class="pg-title">' + EDT_DAYS[edtDay] + ' <span lang="ja" style="font-size:.8em;color:var(--rose)">' + EDT_KANJI[edtDay] + '曜日</span></h2>' +
    '<p class="pg-muted"><span lang="ja">' + EDT_ROMAJI[edtDay] + '</span> · ' + (list.length ? list.length + ' créneau' + (list.length > 1 ? 'x' : '') + ' · ' + fmtDur(total) : 'Journée libre') + '</p></div>' +
    (list.length ? '<button type="button" class="pg-chip-btn" data-act="copyday"><svg class="pg-ico"><use href="#ei-copy"/></svg>Copier ce jour</button>' : '') +
    '</div><div class="edt-list" style="margin-top:14px">' + cards + '</div>' +
    (list.length ? '<p class="edt-week-hint" style="padding:12px 0 0">Survolez un cours : Suppr le supprime, Ctrl+C le copie, Ctrl+V le colle dans le jour affiché.</p>' : '') +
    '</div></div>';
}

function updatePasteBtn() {
  const b = $('edt-paste');
  if (!b) return;
  b.classList.toggle('hidden', !edtClip);
  if (edtClip) {
    $('edt-paste-lab').textContent = 'Coller';
    b.title = 'Coller « ' + edtClip.title + ' » (Ctrl+V)';
  }
}
function keyTarget() {
  if (edtHoverId != null && findItem(edtHoverId)) return String(edtHoverId);
  const a = document.activeElement;
  const el = a && a.closest ? a.closest('.edt-evt, .edt-card') : null;
  return el && findItem(el.dataset.id) ? String(el.dataset.id) : null;
}
function copySlot(id) {
  const it = findItem(id);
  if (!it) return;
  edtClip = Object.assign({}, it);
  updatePasteBtn();
  toast('Copié : ' + it.title + ' — Ctrl+V pour coller');
}
function pasteSlot() {
  if (!edtClip) { toast('Rien à coller : survolez un cours et faites Ctrl+C', { err: true }); return; }
  const b = bounds(edtClip);
  if (!b) return;
  const dur = b.e - b.s;
  let day = edtDay, s = b.s;
  if (edtView === 'week' && edtHoverDay != null && edtHoverMin != null) {
    day = edtHoverDay;
    s = Math.round(edtHoverMin / EDT_SNAP) * EDT_SNAP;
  }
  s = Math.max(0, Math.min(24 * 60 - 1 - dur, s));
  items().push(Object.assign({}, edtClip, { id: newId(), day: String(day), start: hhmm(s), end: hhmm(s + dur) }));
  save();
  edtDay = day;
  renderAll();
  toast('Collé : ' + edtClip.title + ' · ' + EDT_DAYS[day] + ' ' + hhmm(s));
}
function onKeyDown(e) {
  if (!$('edt-modal').classList.contains('hidden') || !$('edt-copy-modal').classList.contains('hidden')) return;
  const t = e.target;
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
  if (e.altKey) return;
  const mod = e.ctrlKey || e.metaKey;
  const k = (e.key || '').toLowerCase();
  if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
    const id = keyTarget();
    if (id != null) { e.preventDefault(); deleteSlot(id); }
  } else if (mod && k === 'c') {
    if (window.getSelection && String(window.getSelection())) return;
    const id = keyTarget();
    if (id != null) { e.preventDefault(); copySlot(id); }
  } else if (mod && k === 'v') {
    if (edtClip) { e.preventDefault(); pasteSlot(); }
  } else if (e.key === 'Enter' && t && t.classList && t.classList.contains('edt-card')) {
    openSlot(t.dataset.id);
  }
}

function renderView() { if (edtView === 'week') renderWeek(); else renderDay(); }
function renderAll() { renderHeader(); renderNow(); renderView(); updatePasteBtn(); }

function setView(v) {
  edtView = v === 'day' ? 'day' : 'week';
  try { localStorage.setItem(EDT_VIEW_KEY, edtView); } catch (e) { /* facultatif */ }
  renderAll();
}
function goToday() {
  edtDay = todayIdx();
  renderAll();
  const col = document.querySelector('.edt-col.today');
  if (col && col.scrollIntoView) col.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

/* ---------- Modale « créneau » ---------- */
function overlapsFor(days, s, e, ignoreId) {
  const out = [];
  days.forEach(d => {
    items().forEach(it => {
      if (ignoreId != null && String(it.id) === String(ignoreId)) return;
      if (parseInt(it.day, 10) !== d) return;
      const b = bounds(it);
      if (b && s < b.e && e > b.s) out.push(it.title + ' (' + EDT_SHORT[d] + ' ' + hhmm(b.s) + '–' + hhmm(b.e) + ')');
    });
  });
  return out;
}

function renderFormChips() {
  const multi = !edtForm.id;
  $('edt-days-label').textContent = multi ? 'Jours (un ou plusieurs)' : 'Jour';
  $('edt-f-days').innerHTML = EDT_DAYS.map((n, d) =>
    '<button type="button" class="rv-chip' + (edtForm.days.has(d) ? ' is-on' : '') + '" data-d="' + d + '" aria-pressed="' + edtForm.days.has(d) + '">' + EDT_SHORT[d] + '</button>').join('');
  const s = tm($('edt-f-start').value), e = tm($('edt-f-end').value);
  $('edt-f-durs').innerHTML = EDT_DURS.map(d =>
    '<button type="button" class="rv-chip' + (!isNaN(s) && !isNaN(e) && e - s === d[0] ? ' is-on' : '') + '" data-dur="' + d[0] + '">' + d[1] + '</button>').join('');
  const known = EDT_COLORS.some(c => c.toLowerCase() === edtForm.color.toLowerCase());
  $('edt-f-colors').innerHTML = EDT_COLORS.map(c =>
    '<button type="button" class="edt-sw' + (c.toLowerCase() === edtForm.color.toLowerCase() ? ' is-on' : '') + '" data-color="' + c + '" style="--c:' + c + '" aria-label="Couleur ' + c + '"></button>').join('') +
    '<input type="color" class="edt-sw-custom' + (known ? '' : ' is-on') + '" id="edt-f-color-custom" value="' + esc(edtForm.color) + '" aria-label="Autre couleur">';
}
function updateHint() {
  const s = tm($('edt-f-start').value), e = tm($('edt-f-end').value);
  const hint = $('edt-f-hint');
  if (isNaN(s) || isNaN(e) || e <= s || !edtForm.days.size) { hint.classList.add('hidden'); return; }
  const o = overlapsFor(Array.from(edtForm.days), s, e, edtForm.id);
  if (o.length) {
    hint.textContent = 'Attention, ce créneau chevauche : ' + o.slice(0, 3).join(', ') + (o.length > 3 ? '…' : '') + '. Vous pouvez quand même l\'enregistrer.';
    hint.classList.remove('hidden');
  } else hint.classList.add('hidden');
}
function showError(msg) {
  const el = $('edt-f-error');
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

// openSlot(id) = modifier ; openSlot(null, {…}) = nouveau (éventuellement pré-rempli)
function openSlot(id, pre) {
  pre = pre || {};
  const it = id != null ? findItem(id) : null;
  if (id != null && !it) return;
  const titles = Array.from(new Set(items().map(i => (i.title || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'));
  $('edt-titles').innerHTML = titles.map(t => '<option value="' + esc(t) + '"></option>').join('');
  let day, start, end;
  if (it) { day = parseInt(it.day, 10); start = it.start; end = it.end; }
  else {
    day = pre.day != null ? pre.day : edtDay;
    if (pre.start) start = pre.start;
    else {
      const n = Math.ceil(nowMin() / 60) * 60;
      start = (day === todayIdx() && n >= 7 * 60 && n <= 20 * 60) ? hhmm(n) : '08:00';
    }
    end = pre.end || hhmm(Math.min(24 * 60 - 1, tm(start) + 60));
  }
  edtForm = {
    id: it ? it.id : null,
    days: new Set([isNaN(day) ? 0 : day]),
    color: (it && it.color) || pre.color || EDT_COLORS[0],
    colorTouched: !!(it || pre.color)
  };
  $('edt-modal-eyebrow').textContent = it ? 'Modifier' : 'Créneau';
  $('edt-modal-title').textContent = it ? 'Modifier le créneau' : 'Nouveau créneau';
  $('edt-f-title').value = it ? (it.title || '') : (pre.title || '');
  $('edt-f-start').value = start;
  $('edt-f-end').value = end;
  $('edt-f-place').value = it ? (it.place || '') : (pre.place || '');
  $('edt-f-desc').value = it ? (it.desc || '') : (pre.desc || '');
  $('edt-f-delete').classList.toggle('hidden', !it);
  $('edt-f-save').textContent = it ? 'Enregistrer' : 'Ajouter';
  showError('');
  renderFormChips();
  updateHint();
  $('edt-modal').classList.remove('hidden');
  setTimeout(() => { try { $('edt-f-title').focus(); } catch (e) { /* ignoré */ } }, 30);
}
function closeSlot() { $('edt-modal').classList.add('hidden'); edtForm = null; }

function saveSlot(e) {
  if (e) e.preventDefault();
  if (!edtForm) return;
  const title = $('edt-f-title').value.trim();
  const start = $('edt-f-start').value, end = $('edt-f-end').value;
  if (!title) { showError('Donnez un nom au cours ou à l\'activité.'); $('edt-f-title').focus(); return; }
  if (!edtForm.days.size) { showError('Choisissez au moins un jour.'); return; }
  if (isNaN(tm(start)) || isNaN(tm(end))) { showError('Indiquez une heure de début et de fin.'); return; }
  if (tm(end) <= tm(start)) { showError('L\'heure de fin doit être après l\'heure de début.'); return; }
  const data = {
    title, start, end,
    desc: $('edt-f-desc').value.trim(),
    place: $('edt-f-place').value.trim(),
    color: edtForm.color
  };
  const days = Array.from(edtForm.days).sort((a, b) => a - b);
  if (edtForm.id != null) {
    const it = findItem(edtForm.id);
    if (it) Object.assign(it, data, { day: String(days[0]) });
    toast('Créneau modifié ✓');
  } else {
    days.forEach(d => items().push(Object.assign({ id: newId(), day: String(d) }, data)));
    toast(days.length > 1 ? days.length + ' créneaux ajoutés ✓' : 'Créneau ajouté ✓');
  }
  save();
  edtDay = days[0];
  closeSlot();
  renderAll();
}

function deleteSlot(id) {
  const arr = items();
  const idx = arr.findIndex(i => String(i.id) === String(id));
  if (idx < 0) return;
  const removed = arr.splice(idx, 1)[0];
  save();
  renderAll();
  toast('Créneau supprimé', {
    action: { label: 'Annuler', fn: () => { items().push(removed); save(); renderAll(); } }
  });
}
function shiftSlot(id, delta) {
  const it = findItem(id);
  if (!it) return;
  it.day = String((parseInt(it.day, 10) + delta + 7) % 7);
  save();
  edtDay = parseInt(it.day, 10);
  renderAll();
}

/* ---------- Copier un jour ---------- */
function openCopy(src) {
  edtCopySrc = src;
  edtCopyTargets = new Set();
  const n = dayItems(src).length;
  if (!n) return;
  $('edt-copy-title').textContent = 'Copier ' + EDT_DAYS[src].toLowerCase();
  $('edt-copy-info').textContent = n + ' créneau' + (n > 1 ? 'x' : '') + ' seront copiés. Les créneaux identiques déjà présents sont ignorés.';
  renderCopyChips();
  $('edt-copy-modal').classList.remove('hidden');
}
function renderCopyChips() {
  $('edt-copy-days').innerHTML = EDT_DAYS.map((n, d) => d === edtCopySrc ? '' :
    '<button type="button" class="rv-chip' + (edtCopyTargets.has(d) ? ' is-on' : '') + '" data-d="' + d + '" aria-pressed="' + edtCopyTargets.has(d) + '">' + n + '</button>').join('');
}
function doCopy() {
  if (!edtCopyTargets.size) { toast('Choisissez au moins un jour', { err: true }); return; }
  let added = 0;
  const src = dayItems(edtCopySrc);
  edtCopyTargets.forEach(d => {
    src.forEach(it => {
      const dup = items().some(o => parseInt(o.day, 10) === d && o.title === it.title && o.start === it.start && o.end === it.end);
      if (dup) return;
      items().push(Object.assign({}, it, { id: newId(), day: String(d) }));
      added++;
    });
  });
  save();
  $('edt-copy-modal').classList.add('hidden');
  renderAll();
  toast(added ? added + ' créneau' + (added > 1 ? 'x' : '') + ' copié' + (added > 1 ? 's' : '') + ' ✓' : 'Rien à copier : tout existe déjà', { err: !added });
}

/* ---------- Glisser-déposer (souris / stylet) dans la vue semaine ---------- */
function colAt(x) {
  const cols = Array.from(document.querySelectorAll('.edt-col'));
  return cols.find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right; }) || null;
}
function onPointerDown(e) {
  const el = e.target.closest ? e.target.closest('.edt-evt') : null;
  if (!el || e.button !== 0 || e.pointerType === 'touch') return;
  const it = findItem(el.dataset.id);
  const b = it && bounds(it);
  if (!b) return;
  edtDrag = {
    el, id: it.id, mode: e.target.closest('.edt-rs') ? 'resize' : 'move',
    x: e.clientX, y: e.clientY, moved: false, s: b.s, e: b.e, day: parseInt(it.day, 10), h0: el.offsetHeight, pid: e.pointerId
  };
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
}
function onPointerMove(e) {
  const d = edtDrag;
  if (!d || e.pointerId !== d.pid) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (!d.moved && Math.hypot(dx, dy) < 5) return;
  d.moved = true;
  d.el.classList.add('dragging');
  if (d.mode === 'resize') {
    d.el.style.setProperty('height', Math.max(30, d.h0 + dy) + 'px', 'important');
  } else {
    d.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const col = colAt(e.clientX);
    document.querySelectorAll('.edt-col').forEach(c => c.classList.toggle('drop', c === col));
  }
}
function onPointerUp(e) {
  const d = edtDrag;
  if (!d || e.pointerId !== d.pid) return;
  edtDrag = null;
  try { d.el.releasePointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
  document.querySelectorAll('.edt-col.drop').forEach(c => c.classList.remove('drop'));
  if (!d.moved) return;
  edtJustDragged = true;
  setTimeout(() => { edtJustDragged = false; }, 80);
  const it = findItem(d.id);
  if (!it) { renderAll(); return; }
  const deltaMin = Math.round(((e.clientY - d.y) / EDT_HOUR_H * 60) / EDT_SNAP) * EDT_SNAP;
  if (d.mode === 'resize') {
    const ne = Math.max(d.s + EDT_SNAP, Math.min(24 * 60 - 1, d.e + deltaMin));
    it.end = hhmm(ne);
    toast(it.title + ' · ' + fmtDur(ne - d.s));
  } else {
    const dur = d.e - d.s;
    const ns = Math.max(0, Math.min(24 * 60 - 1 - dur, d.s + deltaMin));
    const col = colAt(e.clientX);
    const nd = col ? parseInt(col.dataset.day, 10) : d.day;
    it.start = hhmm(ns); it.end = hhmm(ns + dur); it.day = String(nd);
    toast(it.title + ' → ' + EDT_DAYS[nd] + ' ' + hhmm(ns));
  }
  save();
  renderAll();
}

/* ---------- Évènements ---------- */
function bind() {
  $('edt-add').addEventListener('click', () => openSlot(null));
  $('edt-today').addEventListener('click', goToday);
  $('edt-v-week').addEventListener('click', () => setView('week'));
  $('edt-v-day').addEventListener('click', () => setView('day'));

  const view = $('edt-view');
  $('edt-paste').addEventListener('click', pasteSlot);
  document.addEventListener('keydown', onKeyDown);
  view.addEventListener('mouseover', e => {
    const el = e.target.closest ? e.target.closest('.edt-evt, .edt-card') : null;
    edtHoverId = el ? el.dataset.id : null;
  });
  view.addEventListener('mousemove', e => {
    const col = e.target.closest ? e.target.closest('.edt-col') : null;
    if (!col) { edtHoverDay = null; edtHoverMin = null; return; }
    edtHoverDay = parseInt(col.dataset.day, 10);
    edtHoverMin = edtLayout.lo + (e.clientY - col.getBoundingClientRect().top) / EDT_HOUR_H * 60;
  });
  view.addEventListener('mouseleave', () => { edtHoverId = null; edtHoverDay = null; edtHoverMin = null; });
  view.addEventListener('pointerdown', onPointerDown);
  view.addEventListener('pointermove', onPointerMove);
  view.addEventListener('pointerup', onPointerUp);
  view.addEventListener('pointercancel', e => { if (edtDrag) { edtDrag = null; renderAll(); } });
  view.addEventListener('click', e => {
    if (edtJustDragged) return;
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act, id = act.dataset.id;
      if (a === 'edit') openSlot(id);
      else if (a === 'del') deleteSlot(id);
      else if (a === 'left') shiftSlot(id, -1);
      else if (a === 'right') shiftSlot(id, 1);
      else if (a === 'add') openSlot(null);
      else if (a === 'copyday') openCopy(edtDay);
      else if (a === 'dup') {
        const it = findItem(id);
        if (it) openSlot(null, { day: parseInt(it.day, 10), start: it.start, end: it.end, title: it.title, color: it.color, desc: it.desc, place: it.place });
      }
      return;
    }
    const evt = e.target.closest('.edt-evt');
    if (evt) { openSlot(evt.dataset.id); return; }
    const hd = e.target.closest('.edt-hd[data-day]');
    if (hd) { edtDay = parseInt(hd.dataset.day, 10); setView('day'); return; }
    const pill = e.target.closest('.edt-pill');
    if (pill) { edtDay = parseInt(pill.dataset.day, 10); renderView(); return; }
    const col = e.target.closest('.edt-col');
    if (col && e.target === col) {
      const r = col.getBoundingClientRect();
      const min = edtLayout.lo + Math.floor(((e.clientY - r.top) / EDT_HOUR_H * 60) / 30) * 30;
      const s = Math.max(0, Math.min(24 * 60 - 60, min));
      const d = parseInt(col.dataset.day, 10);
      edtDay = d;
      openSlot(null, { day: d, start: hhmm(s), end: hhmm(s + 60) });
    }
  });

  // Modale créneau
  $('edt-form').addEventListener('submit', saveSlot);
  $('edt-f-cancel').addEventListener('click', closeSlot);
  $('edt-f-delete').addEventListener('click', () => { const id = edtForm && edtForm.id; closeSlot(); if (id != null) deleteSlot(id); });
  $('edt-modal').addEventListener('mousedown', e => { if (e.target === $('edt-modal')) closeSlot(); });
  $('edt-f-days').addEventListener('click', e => {
    const b = e.target.closest('[data-d]');
    if (!b || !edtForm) return;
    const d = parseInt(b.dataset.d, 10);
    if (edtForm.id != null) edtForm.days = new Set([d]);
    else if (edtForm.days.has(d)) edtForm.days.delete(d);
    else edtForm.days.add(d);
    renderFormChips(); updateHint();
  });
  $('edt-f-durs').addEventListener('click', e => {
    const b = e.target.closest('[data-dur]');
    if (!b) return;
    const s = tm($('edt-f-start').value);
    const base = isNaN(s) ? 8 * 60 : s;
    if (isNaN(s)) $('edt-f-start').value = hhmm(base);
    $('edt-f-end').value = hhmm(Math.min(24 * 60 - 1, base + parseInt(b.dataset.dur, 10)));
    renderFormChips(); updateHint();
  });
  $('edt-f-colors').addEventListener('click', e => {
    const b = e.target.closest('[data-color]');
    if (!b || !edtForm) return;
    edtForm.color = b.dataset.color; edtForm.colorTouched = true;
    renderFormChips();
  });
  $('edt-f-colors').addEventListener('input', e => {
    if (e.target.id === 'edt-f-color-custom' && edtForm) { edtForm.color = e.target.value; edtForm.colorTouched = true; }
  });
  ['edt-f-start', 'edt-f-end'].forEach(id => $(id).addEventListener('input', () => { if (edtForm) { renderFormChips(); updateHint(); } }));
  $('edt-f-title').addEventListener('input', e => {
    if (!edtForm || edtForm.colorTouched) return;
    const v = e.target.value.trim().toLowerCase();
    const same = items().find(i => (i.title || '').trim().toLowerCase() === v && i.color);
    if (same) { edtForm.color = same.color; renderFormChips(); }
  });

  // Modale copie
  $('edt-copy-cancel').addEventListener('click', () => $('edt-copy-modal').classList.add('hidden'));
  $('edt-copy-ok').addEventListener('click', doCopy);
  $('edt-copy-modal').addEventListener('mousedown', e => { if (e.target === $('edt-copy-modal')) $('edt-copy-modal').classList.add('hidden'); });
  $('edt-copy-days').addEventListener('click', e => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    const d = parseInt(b.dataset.d, 10);
    if (edtCopyTargets.has(d)) edtCopyTargets.delete(d); else edtCopyTargets.add(d);
    renderCopyChips();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('edt-modal').classList.contains('hidden')) closeSlot();
    else if (!$('edt-copy-modal').classList.contains('hidden')) $('edt-copy-modal').classList.add('hidden');
  });

  // Mise à jour du « maintenant » toutes les 30 s
  setInterval(() => {
    if (document.hidden || edtDrag) return;
    renderNow();
    const line = $('edt-nowline');
    if (line) line.style.top = ((nowMin() - edtLayout.lo) / 60 * EDT_HOUR_H) + 'px';
  }, 30000);
}

function checkStreak() {
  if (!state.streak) state.streak = { count: 0, lastLogin: '' };
  const today = new Date().toDateString();
  if (state.streak.lastLogin !== today) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    state.streak.count = state.streak.lastLogin === y.toDateString() ? state.streak.count + 1 : 1;
    state.streak.lastLogin = today;
    save();
  }
  const el = $('streak-count');
  if (el) el.innerText = state.streak.count;
}

function edtInit() {
  try { checkStreak(); } catch (e) { /* ignoré */ }
  let saved = null;
  try { saved = localStorage.getItem(EDT_VIEW_KEY); } catch (e) { /* ignoré */ }
  edtView = saved === 'day' || saved === 'week' ? saved : (window.innerWidth < 720 ? 'day' : 'week');
  bind();
  renderAll();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', edtInit);
else edtInit();
