/* Benkyō — Flashcards façon Anki : répétition espacée (Encore/Difficile/Bien/Facile),
   cartes inversées, à trous et à saisir, étiquettes, suspendre/enterrer/marquer,
   annuler, explorateur de cartes, options par paquet. */
(function () {
  'use strict';
  var MIN = 60000, DAY = 86400000;
  var DEF = { nw: 20, rv: 200, steps: '1 10', grad: 1, easy: 4, ease: 250, mod: 100, lsteps: '10', leech: 8 };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var html = function (s) { return esc(s).replace(/\n/g, '<br>').replace(/\[img:([\w-]+)\]/g, function (m, id) { var u = (state.fcMedia || {})[id]; return u ? '<img class="fca-img" src="' + u + '">' : ''; }); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var dk = function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  var eod = function () { var d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
  var st = function (c) { return c.st || 'new'; };
  var isLearn = function (c) { return st(c) === 'learn' || st(c) === 'relearn'; };
  var byDue = function (a, b) { return (a.due || 0) - (b.due || 0); };
  var steps = function (s) { return String(s).split(/[\s,]+/).map(Number).filter(function (n) { return n > 0; }); };
  function opts(d) { var o = Object.assign({}, DEF, d.opts || {}); return o; }
  function daily() { if (!state.fcDaily || state.fcDaily.d !== dk()) state.fcDaily = { d: dk(), nw: {}, rv: {} }; return state.fcDaily; }
  function fmt(ms) {
    var m = ms / MIN; if (m < 1) return '<1 min'; if (m < 60) return Math.round(m) + ' min';
    var h = m / 60; if (h < 24) return Math.round(h) + ' h';
    var d = h / 24; if (d < 30) return Math.round(d) + ' j';
    return d < 365 ? (d / 30).toFixed(1).replace('.', ',') + ' mois' : (d / 365).toFixed(1).replace('.', ',') + ' an';
  }

  /* ───────── Algorithme de répétition espacée (type SM-2 / Anki) ───────── */
  function sched(c, r, o, now) {
    var s = st(c), mod = o.mod / 100;
    c.reps = (c.reps || 0) + 1; c.ease = c.ease || o.ease / 100;
    if (s === 'new') { c.st = s = 'learn'; c.step = 0; }
    if (s === 'learn' || s === 'relearn') {
      var arr = steps(s === 'learn' ? o.steps : o.lsteps), i = c.step || 0;
      if (r === 1) i = 0; else if (r === 3) i++; else if (r === 4) i = arr.length;
      if (i >= arr.length) {
        c.st = 'review'; c.step = 0;
        if (s === 'learn') c.ivl = r === 4 ? +o.easy : +o.grad;
        c.ivl = Math.max(1, c.ivl || 1); c.due = now + c.ivl * DAY;
      } else {
        c.step = i;
        c.due = now + (r === 2 && i === 0 && arr.length > 1 ? (arr[0] + arr[1]) / 2 : arr[i]) * MIN;
      }
      return;
    }
    var ivl = c.ivl || 1;
    if (r === 1) {
      c.lapses = (c.lapses || 0) + 1; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = 1;
      var rs = steps(o.lsteps);
      if (rs.length) { c.st = 'relearn'; c.step = 0; c.due = now + rs[0] * MIN; } else c.due = now + DAY;
      if (c.lapses >= o.leech && !c.susp) { c.susp = true; c.tags = (c.tags || []).filter(function (t) { return t !== 'leech'; }).concat('leech'); c.leech = true; }
      return;
    }
    if (r === 2) { c.ease = Math.max(1.3, c.ease - 0.15); c.ivl = Math.max(ivl + 1, Math.round(ivl * 1.2 * mod)); }
    else if (r === 3) c.ivl = Math.max(ivl + 1, Math.round(ivl * c.ease * mod));
    else { c.ease += 0.15; c.ivl = Math.max(ivl + 2, Math.round(ivl * c.ease * 1.3 * mod)); }
    c.ivl = Math.min(c.ivl, 36500); c.due = now + c.ivl * DAY;
  }
  function preview(c, o) {
    return [1, 2, 3, 4].map(function (r) { var x = clone(c), n = Date.now(); sched(x, r, o, n); return fmt(x.due - n); });
  }
  function counts(d) {
    var o = opts(d), D = daily(), now = Date.now(), n = 0, l = 0, r = 0;
    cardsOf(d).forEach(function (c) {
      if (c.susp || c.bu === dk()) return;
      var s = st(c);
      if (s === 'new') n++; else if (isLearn(c)) { if (c.due <= now + 20 * MIN) l++; } else if (c.due <= eod()) r++;
    });
    return { n: Math.min(n, Math.max(0, o.nw - (D.nw[d.id] || 0))), l: l, r: Math.min(r, Math.max(0, o.rv - (D.rv[d.id] || 0))) };
  }

  /* ───────── Rendu des faces d'une carte ───────── */
  function clozeHtml(t, n, reveal) {
    var out = '', last = 0, re = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g, m;
    while ((m = re.exec(t))) {
      out += html(t.slice(last, m.index));
      out += +m[1] === n ? (reveal ? '<b class="fca-cloze on">' + esc(m[2]) + '</b>' : '<b class="fca-cloze">[' + esc(m[3] || '…') + ']</b>') : esc(m[2]);
      last = re.lastIndex;
    }
    return out + html(t.slice(last));
  }
  function face(c) {
    if (c.type === 'cloze') return { f: clozeHtml(c.q, c.cl || 1, false), b: clozeHtml(c.q, c.cl || 1, true) + (c.a ? '<div class="fca-extra">' + html(c.a) + '</div>' : ''), one: true };
    return c.rv ? { f: html(c.a), b: html(c.q) } : { f: html(c.q), b: html(c.a) };
  }
  function typedDiff(t, e) {
    t = t.trim(); e = (e || '').trim(); var a = '';
    for (var i = 0; i < t.length; i++) a += '<span class="' + (t[i] === e[i] ? 'fca-ok' : 'fca-ko') + '">' + esc(t[i]) + '</span>';
    return '<div class="fca-typed">' + (a || '<span class="fca-ko">(vide)</span>') + '</div><div class="fca-exp">' + esc(e) + '</div>';
  }

  /* ───────── Session d'étude ───────── */
  var S = null;
  function pick() {
    var d = S.deck, o = opts(d), D = daily(), now = Date.now(), tdy = dk();
    var live = cardsOf(d).filter(function (c) { return !c.susp && c.bu !== tdy; });
    var learn = live.filter(function (c) { return isLearn(c) && c.due <= now; }).sort(byDue);
    if (learn.length) return learn[0];
    if ((D.rv[d.id] || 0) < o.rv) { var rv = live.filter(function (c) { return st(c) === 'review' && c.due <= eod(); }).sort(byDue); if (rv.length) return rv[0]; }
    if ((D.nw[d.id] || 0) < o.nw) { var nw = live.filter(function (c) { return st(c) === 'new'; }); if (nw.length) return nw[0]; }
    return live.filter(function (c) { return isLearn(c) && c.due <= now + 20 * MIN; }).sort(byDue)[0] || null;
  }
  function study(di) {
    var d = state.decks[di]; if (!d) return;
    S = { di: di, deck: d, o: opts(d), n: 0, ok: 0, undo: null, shown: false };
    $('fca-modal').classList.remove('hidden'); next();
  }
  function next() { S.cur = pick(); S.shown = false; draw(); }
  function draw() {
    var d = S.deck, k = counts(d), c = S.cur, T = $('fca-body'), A = $('fca-actions');
    $('fca-title').textContent = d.title;
    var cur = c ? (st(c) === 'new' ? 'n' : isLearn(c) ? 'l' : 'r') : '';
    $('fca-counts').innerHTML = [['n', 'Nouvelles', k.n], ['l', 'À apprendre', k.l], ['r', 'À réviser', k.r]].map(function (x) {
      return '<span class="fca-cnt ' + x[0] + (cur === x[0] ? ' cur' : '') + '" title="' + x[1] + '">' + x[2] + '</span>';
    }).join('');
    $('fca-undo').disabled = !S.undo;
    if (!c) {
      var lg = (state.fcLog || {})[dk()] || { n: 0, ok: 0 };
      T.innerHTML = '<div class="fca-done"><i class="fa-solid fa-circle-check"></i><h4>Paquet terminé pour aujourd’hui</h4><p>Aujourd’hui : ' + lg.n + ' carte' + (lg.n > 1 ? 's' : '') + ' étudiée' + (lg.n > 1 ? 's' : '') + (lg.n ? ', ' + Math.round(lg.ok / lg.n * 100) + ' % de réussite' : '') + '.</p></div>';
      A.innerHTML = '<button class="pg-btn primary" onclick="FCAnki.close()">Fermer</button>'; $('fca-tools').style.visibility = 'hidden'; return;
    }
    $('fca-tools').style.visibility = '';
    $('fca-flag').classList.toggle('on', !!c.flag);
    var f = face(c), typed = c.type === 'type' && !S.shown;
    T.innerHTML = '<div class="fca-face">' + f.f + '</div>' + (typed ? '<input id="fca-typed" class="pg-input" autocomplete="off" placeholder="Tapez la réponse…">' : '') +
      (S.shown ? '<hr>' + (c.type === 'type' ? typedDiff(S.typed || '', c.a) : '') + '<div class="fca-face">' + f.b + '</div>' : '') +
      ((c.tags && c.tags.length) ? '<div class="fca-tags">' + c.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '');
    if (S.shown) {
      var p = preview(c, S.o);
      A.innerHTML = ['Encore', 'Difficile', 'Bien', 'Facile'].map(function (n, i) {
        return '<button class="fca-r r' + (i + 1) + '" onclick="FCAnki.rate(' + (i + 1) + ')"><small>' + p[i] + '</small>' + n + '</button>';
      }).join('');
    } else A.innerHTML = '<button class="pg-btn primary fca-show" onclick="FCAnki.reveal()">Afficher la réponse</button>';
    var inp = $('fca-typed'); if (inp) inp.focus();
  }
  function reveal() { if (!S || !S.cur || S.shown) return; var i = $('fca-typed'); S.typed = i ? i.value : ''; S.shown = true; draw(); }
  function rate(r) {
    var c = S.cur; if (!c || !S.shown) return;
    var D = daily(), id = S.deck.id, wasNew = st(c) === 'new', wasRev = st(c) === 'review', day = dk();
    state.fcLog = state.fcLog || {};
    var u = { c: c, snap: JSON.stringify(c), daily: JSON.stringify(D), log: JSON.stringify(state.fcLog[day] || null), sib: [] };
    sched(c, r, S.o, Date.now());
    if (wasNew) D.nw[id] = (D.nw[id] || 0) + 1; else if (wasRev) D.rv[id] = (D.rv[id] || 0) + 1;
    if (c.grp) cardsOf(S.deck).forEach(function (x) { if (x !== c && x.grp === c.grp && !isLearn(x) && x.bu !== day) { x.bu = day; u.sib.push(x); } });
    var lg = state.fcLog[day] = state.fcLog[day] || { n: 0, ok: 0 }; lg.n++; if (r > 1) lg.ok++;
    S.undo = u; saveState(); next(); refreshOthers();
  }
  function undo() {
    var u = S && S.undo; if (!u) return;
    Object.keys(u.c).forEach(function (k) { delete u.c[k]; }); Object.assign(u.c, JSON.parse(u.snap));
    state.fcDaily = JSON.parse(u.daily); var l = JSON.parse(u.log), day = dk();
    if (l) state.fcLog[day] = l; else delete state.fcLog[day];
    u.sib.forEach(function (x) { delete x.bu; });
    S.undo = null; S.cur = u.c; S.shown = false; saveState(); draw(); refreshOthers();
  }
  function toggle(key, val) { var c = S && S.cur; if (!c) return; if (val === undefined) c[key] = c[key] ? 0 : 1; saveState(); draw(); refreshOthers(); }
  function flag() { toggle('flag'); }
  function suspend() { var c = S.cur; if (!c) return; c.susp = true; saveState(); next(); refreshOthers(); }
  function bury() { var c = S.cur; if (!c) return; c.bu = dk(); saveState(); next(); refreshOthers(); }
  function edit() { var c = S && S.cur; if (!c) return; editCard(c); }
  function close() { $('fca-modal').classList.add('hidden'); S = null; renderDecks(); }
  function refreshOthers() { if (B) browse(); }

  document.addEventListener('keydown', function (e) {
    if (!S || $('fca-modal').classList.contains('hidden') || !$('card-modal').classList.contains('hidden')) return;
    var typing = /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || ''), k = e.key;
    if (typing && !(e.target.id === 'fca-typed' && k === 'Enter')) return;
    if (k === ' ' || k === 'Enter') { e.preventDefault(); S.shown ? rate(3) : reveal(); }
    else if (S.shown && /^[1-4]$/.test(k)) rate(+k);
    else if (k === 'z' || k === 'Z') undo(); else if (k === '*' || k === 'm') flag();
    else if (k === '@') suspend(); else if (k === '-') bury(); else if (k === 'e') edit();
    else if (k === 'Escape') close();
  });

  /* ───────── Liste des paquets (avec compteurs) ───────── */
  window.renderDecks = function () {
    var c = $('decks-container'); if (!c) return;
    if (!state.decks || !state.decks.length) {
      c.innerHTML = '<div class="pg-card col-span-full p-8 text-center text-slate-500 text-sm"><i class="fa-solid fa-layer-group text-3xl mb-2 block text-rose-400"></i><p class="font-bold text-slate-700">Aucun paquet de flashcards pour l’instant.</p><p class="text-xs text-slate-400 mt-1">Créez votre premier paquet ou importez un fichier .txt pour commencer.</p></div>';
      return;
    }
    c.innerHTML = state.decks.map(function (d, i) { return { d: d, i: i }; }).sort(function (a, b) { return a.d.title.localeCompare(b.d.title); }).map(function (x) {
      var d = x.d, i = x.i, k = counts(d), t = esc(d.title.split('::').pop()), path = d.title.indexOf('::') > -1 ? esc(d.title.split('::').slice(0, -1).join(' › ')) + ' › ' : '', nc = cardsOf(d).length;
      return '<div class="pg-card p-5 space-y-3 relative flex flex-col justify-between"><div class="flex justify-between items-start gap-2"><div class="min-w-0"><h3 class="font-bold text-base text-slate-800 line-clamp-1" title="' + esc(d.title) + '">' + (path ? '<small class="text-slate-400 font-semibold">' + path + '</small>' : '') + t + '</h3><span class="text-xs text-slate-500 font-semibold">' + nc + ' carte' + (nc > 1 ? 's' : '') + '</span></div>' +
        '<div class="flex gap-1 shrink-0"><button class="fca-ico" onclick="FCAnki.sub(' + i + ')" title="Nouveau sous-paquet"><i class="fa-solid fa-folder-plus"></i></button><button class="fca-ico" onclick="FCAnki.options(' + i + ')" title="Options du paquet"><i class="fa-solid fa-gear"></i></button><button class="fca-ico" onclick="exportDeckToTxt(' + i + ')" title="Exporter en .txt"><i class="fa-solid fa-file-export"></i></button><button class="fca-ico" onclick="deleteDeck(' + i + ')" title="Supprimer le paquet"><i class="fa-solid fa-trash"></i></button></div></div>' +
        '<div class="fca-counts"><span class="fca-cnt n" title="Nouvelles">' + k.n + '</span><span class="fca-cnt l" title="À apprendre">' + k.l + '</span><span class="fca-cnt r" title="À réviser">' + k.r + '</span></div>' +
        '<button onclick="FCAnki.study(' + i + ')" class="pg-btn primary sm w-full">Étudier</button>' +
        '<div class="grid grid-cols-2 gap-1.5"><button onclick="startStudyMode(' + i + ',\'quiz\')" class="pg-btn sm">Quiz QCM</button><button onclick="startStudyMode(' + i + ',\'eval\')" class="pg-btn sm">S’évaluer</button></div>' +
        '<div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-rose-100/60"><button onclick="openCardModal(' + i + ')" class="pg-btn sm"><i class="fa-solid fa-plus"></i> Ajouter</button><button onclick="FCAnki.browse(' + i + ')" class="pg-btn sm"><i class="fa-solid fa-table-list"></i> Parcourir</button></div></div>';
    }).join('');
  };
  var origStart = window.startStudyMode;
  window.startStudyMode = function (i, mode) {   // quiz / évaluation : uniquement cartes recto-verso simples
    if (mode === 'learning') return study(i);
    var d = state.decks[i], cp = Object.assign({}, d, { cards: cardsOf(d).filter(function (c) { return !c.rv && c.type !== 'cloze' && !/\[img:/.test(c.q + c.a); }) });
    state.decks[i] = cp; try { origStart(i, mode); } finally { state.decks[i] = d; }
  };

  /* ───────── Fenêtre d'ajout / modification d'une carte ───────── */
  function initCardModal() {
    var form = $('card-modal').querySelector('form'), row = document.createElement('div');
    row.className = 'space-y-3';
    row.innerHTML = '<div class="grid grid-cols-2 gap-3"><div><label class="pg-label">Type de carte</label><select id="card-modal-type" aria-label="Type de carte" class="pg-select" onchange="FCAnki.typeChanged()"><option value="basic">Recto / verso</option><option value="reversed">Recto / verso + inversée</option><option value="cloze">Texte à trous</option><option value="type">Réponse à saisir</option></select></div><div><label class="pg-label">Étiquettes</label><input id="card-modal-tags" class="pg-input" placeholder="chap1 dates"></div></div><button type="button" id="card-modal-cloze" class="pg-btn sm hidden" onclick="FCAnki.addCloze()">Masquer la sélection {{c1::…}}</button><button type="button" class="pg-btn sm" onclick="document.getElementById(\'card-modal-img\').click()"><i class="fa-solid fa-image"></i> Ajouter une image</button><input type="file" id="card-modal-img" accept="image/*" class="hidden" onchange="FCAnki.pickImg(this)">';
    form.insertBefore(row, form.lastElementChild);
    $('card-modal-q').addEventListener('input', function () { this.setCustomValidity(''); });
    ['card-modal-q', 'card-modal-a'].forEach(function (id) {
      var t = $(id); t.addEventListener('focus', function () { lastTA = t; });
      t.addEventListener('paste', function (e) { var f = e.clipboardData && e.clipboardData.files[0]; if (f && /^image\//.test(f.type)) { e.preventDefault(); putImage(f, t); } });
    });
  }
  function typeChanged() {
    var t = $('card-modal-type').value, cl = t === 'cloze';
    $('card-modal-cloze').classList.toggle('hidden', !cl); $('card-modal-a').required = !cl;
    $('card-modal-a').placeholder = cl ? 'Infos complémentaires (facultatif)' : 'Entrez la réponse...';
    $('card-modal-q').placeholder = cl ? 'Ex : La {{c1::Révolution}} française commence en {{c2::1789}}.' : 'Entrez la question...';
  }
  function addCloze() {
    var q = $('card-modal-q'), a = q.selectionStart, b = q.selectionEnd, v = q.value, n = 1, re = /\{\{c(\d+)::/g, m;
    if (a === b) { q.focus(); return; }
    while ((m = re.exec(v))) n = Math.max(n, +m[1] + 1);
    q.value = v.slice(0, a) + '{{c' + n + '::' + v.slice(a, b) + '}}' + v.slice(b); q.focus();
  }
  function fillCardModal(c) {
    $('card-modal-q').value = c.q; $('card-modal-a').value = c.a || '';
    $('card-modal-tags').value = (c.tags || []).join(' ');
    $('card-modal-type').value = c.type || 'basic'; $('card-modal-type').disabled = true; typeChanged();
    $('card-modal-title').innerHTML = '<i class="fa-solid fa-pen text-rose-500 mr-2"></i>Modifier la carte';
    $('card-modal-submit-label').innerText = 'Enregistrer les modifications';
    $('card-modal').classList.remove('hidden');
  }
  var origOpen = window.openCardModal;
  window.openCardModal = function (i) {
    origOpen(i); $('card-modal-tags').value = ''; $('card-modal-type').value = 'basic'; $('card-modal-type').disabled = false; typeChanged();
  };
  window.editCardFromManage = function (i) { currentEditingDeckIdx = currentManagingDeckIdx; editingCardIdx = i; fillCardModal(state.decks[currentManagingDeckIdx].cards[i]); };
  function clozeNums(q) { var o = {}, re = /\{\{c(\d+)::/g, m; while ((m = re.exec(q))) o[m[1]] = 1; return Object.keys(o).map(Number); }
  window.saveCardModal = function (e) {
    e.preventDefault();
    var q = $('card-modal-q').value.trim(), a = $('card-modal-a').value.trim(), t = $('card-modal-type').value;
    var tags = $('card-modal-tags').value.split(/[\s,]+/).filter(Boolean), deck = state.decks[currentEditingDeckIdx];
    if (!q || !deck || (t !== 'cloze' && !a)) return;
    if (t === 'cloze' && !clozeNums(q).length) { var f = $('card-modal-q'); f.setCustomValidity('Ajoutez au moins un trou, par exemple {{c1::mot}}.'); f.reportValidity(); return; }
    var base;
    if (editingCardIdx !== null) {
      var c = deck.cards[editingCardIdx]; base = c;
      deck.cards.forEach(function (x) { if (x === c || (c.grp && x.grp === c.grp)) { x.q = q; x.a = a; x.tags = tags.slice(); } });
      if (c.type === 'cloze') clozeNums(q).forEach(function (n) {
        if (!deck.cards.some(function (x) { return x.grp === c.grp && x.cl === n; })) deck.cards.push(Object.assign({}, clone(c), { cl: n, st: 'new', due: 0, ivl: 0, lapses: 0, reps: 0, susp: false, bu: 0 }));
      });
    } else {
      var g = Date.now() + '-' + Math.floor(Math.random() * 1000); base = { q: q, a: a, level: 0, tags: tags, type: t, grp: g };
      if (t === 'cloze') clozeNums(q).forEach(function (n) { deck.cards.push(Object.assign({ cl: n }, base)); });
      else { deck.cards.push(Object.assign({}, base)); if (t === 'reversed') deck.cards.push(Object.assign({ rv: true }, base)); }
    }
    saveState(); renderDecks();
    if (currentManagingDeckIdx !== null && !$('manage-cards-modal').classList.contains('hidden')) renderManageCardsList();
    closeCardModal(); if (S) draw(); if (B) browse();
  };
  var origClose = window.closeCardModal;
  window.closeCardModal = function () { origClose(); var t = $('card-modal-type'); if (t) t.disabled = false; };

  /* ───────── Explorateur de cartes ───────── */
  var B = null, FILTERS = [['all', 'Toutes'], ['new', 'Nouvelles'], ['learn', 'Apprentissage'], ['review', 'À réviser'], ['susp', 'Suspendues'], ['flag', 'Marquées'], ['leech', 'Sangsues']];
  function match(c, f) {
    var s = st(c);
    return f === 'all' || (f === 'new' && s === 'new') || (f === 'learn' && isLearn(c)) || (f === 'review' && s === 'review' && c.due <= eod()) ||
      (f === 'susp' && c.susp) || (f === 'flag' && c.flag) || (f === 'leech' && c.leech);
  }
  function label(c) {
    if (c.susp) return 'Suspendue'; var s = st(c);
    if (s === 'new') return 'Nouvelle'; if (isLearn(c)) return 'Apprentissage';
    var d = Math.round((c.due - Date.now()) / DAY); return d <= 0 ? 'À réviser' : 'Dans ' + d + ' j';
  }
  function browse(di) {
    if (di !== undefined) B = { di: di, q: '', f: 'all', sel: [] };
    var d = state.decks[B.di], all = cardsOf(d), q = B.q.toLowerCase().trim(), tag = /^tag:/.test(q) ? q.slice(4) : null;
    var rows = all.filter(function (c) {
      if (!match(c, B.f)) return false; if (!q) return true;
      if (tag !== null) return (c.tags || []).some(function (t) { return t.toLowerCase().indexOf(tag) > -1; });
      return (c.q + ' ' + (c.a || '') + ' ' + (c.tags || []).join(' ')).toLowerCase().indexOf(q) > -1;
    });
    B.rows = rows; var ns = B.sel.length;
    $('fcb-title').textContent = d.title + ' · ' + rows.length + ' / ' + all.length;
    $('fcb-chips').innerHTML = FILTERS.map(function (f) { return '<button class="pg-chip-btn' + (B.f === f[0] ? ' accent' : '') + '" onclick="FCAnki.filter(\'' + f[0] + '\')">' + f[1] + '</button>'; }).join('');
    $('fcb-bulk').style.display = ns ? '' : 'none'; $('fcb-nsel').textContent = ns + ' sélectionnée' + (ns > 1 ? 's' : '');
    $('fcb-list').innerHTML = rows.length ? rows.map(function (c, k) {
      var txt = (c.type === 'cloze' ? c.q.replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, '[$1]') : (c.rv ? c.a : c.q)).replace(/\[img:[\w-]+\]/g, '🖼');
      return '<div class="fcb-row' + (c.susp ? ' susp' : '') + '"><input type="checkbox" ' + (B.sel.indexOf(c) > -1 ? 'checked' : '') + ' onchange="FCAnki.sel(' + k + ',this.checked)"><div class="min-w-0 flex-1"><div class="fcb-q">' + (c.flag ? '<i class="fa-solid fa-star fcb-star"></i> ' : '') + esc(txt) + '</div><div class="fcb-meta">' +
        esc(label(c)) + (c.type && c.type !== 'basic' ? ' · ' + ({ reversed: 'inversée', cloze: 'trou ' + (c.cl || 1), type: 'saisie' }[c.type] || '') : '') + (c.lapses ? ' · ' + c.lapses + ' échec' + (c.lapses > 1 ? 's' : '') : '') + (c.tags && c.tags.length ? ' · ' + c.tags.map(esc).join(' ') : '') + '</div></div>' +
        '<button class="fca-ico" onclick="FCAnki.editAt(' + k + ')" title="Modifier"><i class="fa-solid fa-pen"></i></button></div>';
    }).join('') : '<p class="text-center text-sm text-slate-500 py-8">Aucune carte ne correspond.</p>';
  }
  function bulk(fn) { B.sel.forEach(fn); B.sel = []; saveState(); browse(); renderDecks(); }
  function bulkAct(a) {
    var cs = B.sel.slice(); if (!cs.length) return;
    if (a === 'susp') { var on = !cs.every(function (c) { return c.susp; }); bulk(function (c) { c.susp = on; if (!on) c.leech = false; }); }
    else if (a === 'flag') { var f = !cs.every(function (c) { return c.flag; }); bulk(function (c) { c.flag = f ? 1 : 0; }); }
    else if (a === 'reset') bulk(function (c) { c.st = 'new'; c.due = 0; c.ivl = 0; c.ease = 0; c.lapses = 0; c.reps = 0; c.step = 0; c.susp = false; c.leech = false; delete c.bu; });
    else if (a === 'tag') showInputModal({ title: 'Ajouter une étiquette', subtitle: 'S’applique aux cartes sélectionnées', placeholder: 'Ex : chap3', icon: 'fa-tags', onSubmit: function (v) { var t = v.replace(/\s+/g, '_'); bulk(function (c) { c.tags = c.tags || []; if (c.tags.indexOf(t) < 0) c.tags.push(t); }); } });
    else if (a === 'del') showConfirmModal('Supprimer ces cartes ?', cs.length + ' carte(s) seront définitivement supprimées.', function () {
      fam(state.decks[B.di]).forEach(function (x) { x.cards = x.cards.filter(function (c) { return cs.indexOf(c) < 0; }); }); B.sel = []; saveState(); browse(); renderDecks();
    });
  }
  /* ───────── Images (stockées en JPEG réduit, référencées par [img:id]) ───────── */
  function shrink(src, cb) {
    var im = new Image();
    im.onload = function () {
      var m = Math.min(1, 700 / Math.max(im.width, im.height, 1)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(im.width * m)); cv.height = Math.max(1, Math.round(im.height * m));
      var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(im, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL('image/jpeg', 0.65));
    };
    im.onerror = function () { cb(null); }; im.src = src;
  }
  function addMedia(url) { var id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); state.fcMedia = state.fcMedia || {}; state.fcMedia[id] = url; return id; }
  var lastTA = null;
  function putImage(file, ta) {
    if (!file || !/^image\//.test(file.type)) return; ta = ta || lastTA || $('card-modal-q');
    shrink(URL.createObjectURL(file), function (u) {
      if (!u) return; var id = addMedia(u), p = ta.selectionStart || ta.value.length;
      ta.value = ta.value.slice(0, p) + '[img:' + id + ']' + ta.value.slice(p); saveState();
    });
  }

  /* ───────── Sous-paquets ("Parent::Enfant") ───────── */
  function fam(d) { var p = d.title + '::'; return state.decks.filter(function (x) { return x === d || x.title.indexOf(p) === 0; }); }
  function cardsOf(d) { return fam(d).reduce(function (a, x) { return a.concat(x.cards); }, []); }
  function own(c) { return state.decks.filter(function (d) { return d.cards.indexOf(c) > -1; })[0]; }
  function editCard(c) { var od = own(c); if (!od) return; currentEditingDeckIdx = state.decks.indexOf(od); editingCardIdx = od.cards.indexOf(c); fillCardModal(c); }
  function sub(i) {
    var d = state.decks[i];
    showInputModal({ title: 'Nouveau sous-paquet', subtitle: 'Dans « ' + d.title + ' »', placeholder: 'Ex : Chapitre 1', icon: 'fa-folder-plus', onSubmit: function (v) { state.decks.push({ id: Date.now(), title: d.title + '::' + v.replace(/::/g, ' '), cards: [] }); saveState(); renderDecks(); } });
  }
  window.deleteDeck = function (i) {
    var d = state.decks[i], f = fam(d);
    showConfirmModal('Supprimer ce paquet ?', '« ' + d.title + ' »' + (f.length > 1 ? ' et ses ' + (f.length - 1) + ' sous-paquet(s)' : '') + ' seront définitivement supprimés.', function () {
      state.decks = state.decks.filter(function (x) { return f.indexOf(x) < 0; }); saveState(); renderDecks();
    });
  };

  /* ───────── Import : .apkg (Anki) et export texte d'Anki ───────── */
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  function loadLib(src) { return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error('lib')); }; document.head.appendChild(s); }); }
  function libs() {
    return Promise.all([window.JSZip || loadLib(CDN + 'jszip/3.10.1/jszip.min.js'), window.initSqlJs || loadLib(CDN + 'sql.js/1.8.0/sql-wasm.js')])
      .then(function () { return window.initSqlJs({ locateFile: function (f) { return CDN + 'sql.js/1.8.0/' + f; } }); });
  }
  function clean(s, imgs) {
    s = String(s || '').replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, function (m, f) { var id = imgs[f] || imgs[decodeURIComponent(f)]; return id ? ' [img:' + id + '] ' : ''; })
      .replace(/<br\s*\/?>|<\/(div|p|li)>/gi, '\n').replace(/\[sound:[^\]]*\]/g, '');
    return new DOMParser().parseFromString(s, 'text/html').body.textContent.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function done(n, k) { showConfirmModal('Import terminé', n + ' carte' + (n > 1 ? 's' : '') + ' importée' + (n > 1 ? 's' : '') + ' dans ' + k + ' paquet' + (k > 1 ? 's' : '') + '.', function () {}, 'OK'); }
  function fail(e) {
    var m = e && e.message === 'new' ? 'Ce fichier utilise le nouveau format d’Anki. Dans Anki, exportez-le à nouveau en cochant « Prendre en charge les anciennes versions d’Anki ».'
      : e && e.message === 'lib' ? 'Impossible de charger les outils d’import : une connexion internet est nécessaire pour la première importation .apkg.' : 'Ce fichier n’a pas pu être lu comme un paquet Anki (.apkg).';
    showConfirmModal('Import impossible', m, function () {}, 'OK');
  }
  function importApkg(file) {
    return libs().then(function (SQL) {
      return JSZip.loadAsync(file).then(function (zip) {
        var f = zip.file('collection.anki21') || zip.file('collection.anki2');
        if (!f) throw new Error(zip.file('collection.anki21b') ? 'new' : 'bad');
        return Promise.all([f.async('uint8array'), zip.file('media') ? zip.file('media').async('string') : '{}']).then(function (r) {
          var db = new SQL.Database(r[0]), map = JSON.parse(r[1] || '{}'), imgs = {}, jobs = [];
          Object.keys(map).forEach(function (k) {
            if (!/\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(map[k]) || !zip.file(k)) return;
            jobs.push(zip.file(k).async('blob').then(function (b) { return new Promise(function (ok) { shrink(URL.createObjectURL(new Blob([b], { type: /svg/i.test(map[k]) ? 'image/svg+xml' : 'image/' + map[k].split('.').pop().toLowerCase().replace('jpg', 'jpeg') })), ok); }); }).then(function (u) { if (u) imgs[map[k]] = addMedia(u); }));
          });
          return Promise.all(jobs).then(function () {
            var q = function (sql) { var x = db.exec(sql); return x.length ? x[0].values : []; };
            var col = q('select crt, decks, models from col')[0], decks = JSON.parse(col[1]), models = JSON.parse(col[2]), notes = {}, by = {}, n = 0;
            q('select id, mid, flds, tags from notes').forEach(function (x) { notes[x[0]] = { mid: x[1], f: x[2].split('\x1f'), tags: x[3].split(/\s+/).filter(Boolean) }; });
            q('select nid, did, ord, type, queue, due, ivl, factor, reps, lapses from cards').forEach(function (x) {
              var nt = notes[x[0]]; if (!nt || !decks[x[1]]) return;
              var cloze = (models[nt.mid] || {}).type === 1;
              var c = { q: clean(nt.f[0], imgs), a: clean(nt.f.slice(1).join('\n'), imgs), level: 0, tags: nt.tags.slice(), grp: 'ap' + x[0], type: 'basic' };
              if (cloze) { c.type = 'cloze'; c.cl = x[2] + 1; } else if (x[2] > 0) { c.type = 'reversed'; c.rv = true; }
              if (!c.q || (!c.a && !cloze)) return;
              if (x[4] === -1) c.susp = true;
              if (x[3] === 1) { c.st = 'learn'; c.step = 0; c.due = Date.now(); }
              else if (x[3] === 3) { c.st = 'relearn'; c.step = 0; c.due = Date.now(); c.ivl = Math.max(1, x[6]); }
              else if (x[3] === 2) { c.st = 'review'; c.ivl = Math.max(1, x[6]); c.ease = (x[7] || 2500) / 1000; c.due = (col[0] + x[5] * 86400) * 1000; c.reps = x[8]; c.lapses = x[9]; }
              (by[decks[x[1]].name] = by[decks[x[1]].name] || []).push(c); n++;
            });
            var names = Object.keys(by); if (!n) throw new Error('bad');
            names.forEach(function (nm, i) { state.decks.push({ id: Date.now() + i, title: nm, cards: by[nm] }); });
            saveState(); renderDecks(); done(n, names.length);
          });
        });
      });
    });
  }
  function importFile(e) {
    var file = e.target.files[0]; if (!file) return;
    if (/\.apkg$/i.test(file.name)) { importApkg(file).catch(fail).then(function () { e.target.value = ''; }); return; }
    var rd = new FileReader();
    rd.onload = function (ev) {
      var lines = String(ev.target.result).split(/\r?\n/).filter(function (l) { return l.trim() && l[0] !== '#'; });
      if (!lines.length || lines[0].indexOf('\t') < 0) { origImport(e); return; }
      var cards = []; lines.forEach(function (l) { var p = l.split('\t'), q = clean(p[0], {}), a = clean(p[1], {}); if (q && a) cards.push({ q: q, a: a, level: 0, type: 'basic', grp: 'tx' + Math.random().toString(36).slice(2) }); });
      e.target.value = '';
      if (!cards.length) return fail();
      state.decks.push({ id: Date.now(), title: file.name.replace(/\.[^.]+$/, ''), cards: cards }); saveState(); renderDecks(); done(cards.length, 1);
    };
    rd.readAsText(file);
  }
  var origImport = window.importDeckFromTxt;

  function initBrowser() {
    var el = document.createElement('div'); el.id = 'fcb-modal'; el.className = 'pg-modal hidden';
    el.innerHTML = '<div class="fc-modal-sheet fca-sheet flex flex-col" style="max-height:88vh"><div class="flex justify-between items-center border-b border-rose-100/60 pb-3 shrink-0"><h3 class="pg-title text-base font-bold"><i class="fa-solid fa-table-list text-rose-500 mr-2"></i><span id="fcb-title"></span></h3><button onclick="FCAnki.closeBrowse()" aria-label="Fermer" class="text-slate-400 hover:text-rose-600 text-lg"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="space-y-2 py-3 shrink-0"><input id="fcb-search" type="search" class="pg-input" placeholder="Rechercher (ou tag:chap1)…" oninput="FCAnki.search(this.value)"><div id="fcb-chips" class="flex flex-wrap gap-1.5"></div>' +
      '<div id="fcb-bulk" class="fcb-bulk" style="display:none"><span id="fcb-nsel"></span><button class="pg-btn sm" onclick="FCAnki.bulk(\'susp\')">Suspendre / réactiver</button><button class="pg-btn sm" onclick="FCAnki.bulk(\'flag\')">Marquer</button><button class="pg-btn sm" onclick="FCAnki.bulk(\'tag\')">Étiqueter</button><button class="pg-btn sm" onclick="FCAnki.bulk(\'reset\')">Réinitialiser</button><button class="pg-btn sm danger" onclick="FCAnki.bulk(\'del\')">Supprimer</button></div></div>' +
      '<div id="fcb-list" class="overflow-y-auto custom-scrollbar flex-1 space-y-1.5" style="min-height:160px"></div></div>';
    document.body.insertBefore(el, $('card-modal'));
  }

  /* ───────── Options du paquet ───────── */
  var FIELDS = [['nw', 'Nouvelles cartes par jour'], ['rv', 'Révisions maximum par jour'], ['steps', 'Étapes d’apprentissage (minutes)'], ['grad', 'Intervalle de graduation (jours)'], ['easy', 'Intervalle « Facile » (jours)'], ['ease', 'Facilité de départ (%)'], ['mod', 'Modificateur d’intervalle (%)'], ['lsteps', 'Étapes de réapprentissage (minutes)'], ['leech', 'Seuil de sangsue (échecs)']];
  var OD = null;
  function options(di) {
    OD = di; var o = opts(state.decks[di]);
    $('fco-fields').innerHTML = FIELDS.map(function (f) { return '<div><label class="pg-label">' + f[1] + '</label><input class="pg-input" data-k="' + f[0] + '" value="' + esc(o[f[0]]) + '"></div>'; }).join('');
    $('fco-modal').classList.remove('hidden');
  }
  function saveOptions(reset) {
    var d = state.decks[OD], o = {};
    if (!reset) FIELDS.forEach(function (f) {
      var v = $('fco-fields').querySelector('[data-k="' + f[0] + '"]').value.trim();
      if (f[0] === 'steps' || f[0] === 'lsteps') o[f[0]] = steps(v).join(' ') || (f[0] === 'steps' ? DEF.steps : '');
      else o[f[0]] = Math.max(f[0] === 'ease' ? 130 : 1, +v || DEF[f[0]]);
    });
    d.opts = o; saveState(); $('fco-modal').classList.add('hidden'); renderDecks();
  }
  function initOptions() {
    var el = document.createElement('div'); el.id = 'fco-modal'; el.className = 'pg-modal hidden';
    el.innerHTML = '<div class="fc-modal-sheet space-y-4 flex flex-col" style="max-height:88vh"><div class="flex justify-between items-center border-b border-rose-100/60 pb-3"><h3 class="pg-title text-base font-bold"><i class="fa-solid fa-gear text-rose-500 mr-2"></i>Options du paquet</h3><button onclick="document.getElementById(\'fco-modal\').classList.add(\'hidden\')" aria-label="Fermer" class="text-slate-400 hover:text-rose-600 text-lg"><i class="fa-solid fa-xmark"></i></button></div><div id="fco-fields" class="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto"></div><div class="flex justify-between gap-2"><button class="pg-btn sm" onclick="FCAnki.saveOptions(true)">Valeurs par défaut</button><button class="pg-btn primary sm" onclick="FCAnki.saveOptions()">Enregistrer</button></div></div>';
    document.body.insertBefore(el, $('card-modal'));
  }

  function initStudy() {
    var el = document.createElement('div'); el.id = 'fca-modal'; el.className = 'pg-modal hidden';
    el.innerHTML = '<div class="fc-modal-sheet fca-sheet flex flex-col gap-4"><div class="flex justify-between items-center gap-3"><h3 id="fca-title" class="pg-title text-base font-bold truncate"></h3><div class="flex items-center gap-3"><div id="fca-counts" class="fca-counts"></div><button onclick="FCAnki.close()" class="text-slate-400 hover:text-rose-600 text-xl" title="Fermer (Échap)"><i class="fa-solid fa-xmark"></i></button></div></div>' +
      '<div id="fca-body" class="fca-card"></div><div id="fca-actions" class="fca-actions"></div>' +
      '<div id="fca-tools" class="fca-tools"><button id="fca-undo" onclick="FCAnki.undo()" title="Annuler (Z)"><i class="fa-solid fa-rotate-left"></i> Annuler</button><button id="fca-flag" onclick="FCAnki.flag()" title="Marquer (*)"><i class="fa-solid fa-star"></i> Marquer</button><button onclick="FCAnki.edit()" title="Modifier (E)"><i class="fa-solid fa-pen"></i> Modifier</button><button onclick="FCAnki.bury()" title="Enterrer jusqu’à demain (-)"><i class="fa-solid fa-moon"></i> Enterrer</button><button onclick="FCAnki.suspend()" title="Suspendre (@)"><i class="fa-solid fa-pause"></i> Suspendre</button></div></div>';
    document.body.insertBefore(el, $('card-modal'));
  }

  window.FCAnki = {
    study: study, reveal: reveal, rate: rate, undo: undo, flag: flag, suspend: suspend, bury: bury, edit: edit, close: close,
    browse: function (i) { browse(i); $('fcb-search').value = ''; $('fcb-modal').classList.remove('hidden'); },
    closeBrowse: function () { $('fcb-modal').classList.add('hidden'); B = null; renderDecks(); },
    filter: function (f) { B.f = f; B.sel = []; browse(); }, search: function (v) { B.q = v; browse(); },
    sel: function (k, on) { var c = B.rows[k], i = B.sel.indexOf(c); if (on && i < 0) B.sel.push(c); else if (!on && i > -1) B.sel.splice(i, 1); browse(); }, bulk: bulkAct,
    sub: sub, importFile: importFile, pickImg: function (inp) { putImage(inp.files[0]); inp.value = ''; },
    editAt: function (k) { editCard(B.rows[k]); },
    options: options, saveOptions: saveOptions, typeChanged: typeChanged, addCloze: addCloze, counts: counts, sched: sched, _fmt: fmt
  };
  function init() { initCardModal(); initStudy(); initBrowser(); initOptions(); renderDecks(); }
  if (typeof document !== 'undefined' && document.getElementById && document.getElementById('card-modal')) init();
  else if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
})();
