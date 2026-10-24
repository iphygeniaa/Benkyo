/* ============================================================
   difficultes.js — Révisions > "Mes difficultés" (難)
   -------------------------------------------------------------
   Pour chaque matière (étiquettes partagées avec "Suivi des séances"
   et "Notes & Moyennes") : le sujet, la difficulté, un mot
   encourageant, comment s'améliorer, et si on l'a déjouée.
   Données : state.difficulties (+ state.sessionSubjects partagé).
   ============================================================ */
(function (global) {
  'use strict';

  var PALETTE = ['#e88eb2', '#89b4fa', '#94e2d5', '#f9e2af', '#cba6f7', '#f8bd96', '#a6e3a1', '#f2a7a7'];
  var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var KIND_WORDS = [
    '頑張って — Courage ! Chaque erreur te montre exactement où progresser.',
    '一歩一歩 — Pas à pas : une difficulté nommée est déjà à moitié apprivoisée.',
    '大丈夫 — Ça va aller. Tu as déjà surmonté bien d’autres obstacles.',
    '諦めないで — N’abandonne pas, la régularité finit toujours par payer.',
    '七転び八起き — Tomber sept fois, se relever huit.',
    'Ce n’est pas que tu ne sais pas, c’est que tu ne sais pas encore.',
    'Même les meilleurs ont buté sur ce point. Tu es sur la bonne voie.'
  ];

  var state = null, save = function () {}, mounted = false;
  var ui = { subject: 'all', status: 'all', editingId: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function subjects() { return state.sessionSubjects; }
  function list() { return state.difficulties; }
  function subjectById(id) {
    for (var i = 0; i < subjects().length; i++) if (subjects()[i].id === id) return subjects()[i];
    return null;
  }
  function frDate(ts) {
    var d = new Date(ts);
    return d.getDate() + ' ' + MONTHS_FR[d.getMonth()] + ' ' + d.getFullYear();
  }

  function shell() {
    return '' +
      '<div class="sv-hero">' +
        '<div class="sv-hanko" aria-hidden="true">難</div>' +
        '<div><h2><small>難題 · NANDAI</small>Mes difficultés</h2>' +
        '<p>Nomme ce qui te résiste, encourage-toi, prépare ton plan… puis célèbre chaque difficulté déjouée.</p></div>' +
      '</div>' +
      '<div class="sv-layout">' +
        '<div class="sv-main">' +
          '<section class="glass-panel sv-card" id="df-form-card">' +
            '<div class="sv-card-title"><span class="sv-k">書</span><span id="df-form-title">Nouvelle difficulté</span>' +
              '<span id="df-editing-badge" class="sv-editing-badge hidden">Modification</span></div>' +
            '<div class="sv-row">' +
              '<div class="sv-field"><label for="df-subject">教科 · Matière</label><select id="df-subject" class="sv-select"></select></div>' +
              '<div class="sv-field sv-grow"><label for="df-topic">題 · Sujet / chapitre</label><input id="df-topic" type="text" class="sv-input" maxlength="120" placeholder="Ex : Les intégrales, la dissertation, le subjonctif…"></div>' +
              '<div class="sv-field sv-full"><label for="df-difficulty">難 · Quelle est la difficulté ?</label>' +
                '<textarea id="df-difficulty" class="sv-input sv-textarea" placeholder="Qu’est-ce qui bloque exactement ? Quand cela arrive-t-il ?"></textarea></div>' +
              '<div class="sv-field sv-full"><div class="sv-label-row"><label for="df-kind">励 · Un mot encourageant</label>' +
                '<button type="button" class="sv-link-btn" id="df-idea">✨ Une idée</button></div>' +
                '<textarea id="df-kind" class="sv-input sv-textarea" placeholder="Ce que tu dirais à un ami à ta place…"></textarea></div>' +
              '<div class="sv-field sv-full"><label for="df-plan">策 · Comment m’améliorer ?</label>' +
                '<textarea id="df-plan" class="sv-input sv-textarea" placeholder="Refaire 3 exercices par jour, demander de l’aide, fiche de synthèse, vidéo…"></textarea></div>' +
            '</div>' +
            '<div class="sv-editor-actions">' +
              '<button type="button" class="sv-btn sv-btn-primary" id="df-save"><span id="df-save-label">Ajouter cette difficulté</span></button>' +
              '<button type="button" class="sv-btn sv-btn-ghost hidden" id="df-cancel">Annuler</button>' +
              '<span id="df-error" class="sv-error"></span>' +
            '</div>' +
          '</section>' +
          '<section class="glass-panel sv-card">' +
            '<div class="sv-card-title"><span class="sv-k">札</span><span>Mes difficultés par matière</span></div>' +
            '<div class="sv-filters" id="df-filters" style="margin-top:14px"></div>' +
            '<div class="sv-toolrow"><div class="sv-seg" role="group" aria-label="Statut" id="df-status"></div></div>' +
          '</section>' +
          '<div id="df-list" class="sv-timeline"></div>' +
        '</div>' +
        '<aside class="sv-side">' +
          '<section class="glass-panel sv-card">' +
            '<div class="sv-card-title"><span class="sv-k">統</span><span>Ma progression</span></div>' +
            '<div id="df-stats"></div>' +
          '</section>' +
          '<section class="glass-panel sv-card">' +
            '<div class="sv-card-title"><span class="sv-k">札</span><span>Étiquettes de matières</span></div>' +
            '<p class="sv-sub">Les mêmes que dans « Suivi des séances » et « Notes & Moyennes ».</p>' +
            '<form class="sv-add-row" id="df-add-form" autocomplete="off">' +
              '<input type="color" id="df-new-color" class="sv-color-input" value="#e88eb2" title="Couleur">' +
              '<input type="text" id="df-new-name" class="sv-input" maxlength="40" placeholder="Nouvelle matière…">' +
              '<button type="submit" class="sv-btn sv-btn-primary sv-btn-sm" aria-label="Ajouter l’étiquette">＋</button>' +
            '</form>' +
            '<div id="df-tags" class="sv-filters" style="margin-top:12px"></div>' +
          '</section>' +
        '</aside>' +
      '</div>';
  }

  function count(pred) { return list().filter(pred).length; }

  function renderSelect(selected) {
    var sel = $('df-subject');
    var cur = selected !== undefined ? selected : sel.value;
    sel.innerHTML = '<option value="">Sans étiquette</option>' + subjects().map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>';
    }).join('');
    sel.value = subjectById(cur) ? cur : '';
  }

  function renderFilters() {
    var html = '<button type="button" class="sv-chip sv-chip-all' + (ui.subject === 'all' ? ' is-active' : '') + '" data-dfsubject="all">Toutes <b>' + list().length + '</b></button>';
    subjects().forEach(function (s) {
      var n = count(function (d) { return d.subjectId === s.id; });
      html += '<button type="button" class="sv-chip' + (ui.subject === s.id ? ' is-active' : '') + '" style="--c:' + esc(s.color) + '" data-dfsubject="' + esc(s.id) + '">' + esc(s.name) + ' <b>' + n + '</b></button>';
    });
    var none = count(function (d) { return !d.subjectId; });
    if (none) html += '<button type="button" class="sv-chip sv-chip-all' + (ui.subject === 'none' ? ' is-active' : '') + '" data-dfsubject="none">Sans étiquette <b>' + none + '</b></button>';
    $('df-filters').innerHTML = html;

    var open = count(function (d) { return d.status !== 'overcome'; });
    var done = count(function (d) { return d.status === 'overcome'; });
    $('df-status').innerHTML =
      '<button type="button" data-dfstatus="all" class="' + (ui.status === 'all' ? 'is-active' : '') + '">Toutes</button>' +
      '<button type="button" data-dfstatus="open" class="' + (ui.status === 'open' ? 'is-active' : '') + '">En cours (' + open + ')</button>' +
      '<button type="button" data-dfstatus="overcome" class="' + (ui.status === 'overcome' ? 'is-active' : '') + '">Déjouées (' + done + ')</button>';

    $('df-tags').innerHTML = subjects().length
      ? subjects().map(function (s) { return '<span class="sv-tag" style="--c:' + esc(s.color) + '">' + esc(s.name) + '</span>'; }).join('')
      : '<span class="sv-muted" style="margin:0">Aucune étiquette pour l’instant.</span>';
  }

  function block(kanji, title, text, kind) {
    return '<div class="sv-block' + (kind ? ' is-kind' : '') + '"><h4><b>' + kanji + '</b>' + title + '</h4>' +
      (text ? '<p>' + esc(text) + '</p>' : '<p class="sv-none">Non renseigné</p>') + '</div>';
  }

  function cardHtml(d) {
    var sub = subjectById(d.subjectId);
    var done = d.status === 'overcome';
    var tag = sub ? '<span class="sv-tag" style="--c:' + esc(sub.color) + '">' + esc(sub.name) + '</span>' : '<span class="sv-tag is-none">Sans étiquette</span>';
    return '<article class="sv-diff' + (done ? ' is-done' : '') + '" style="--c:' + esc(sub ? sub.color : '#d9c3cc') + '">' +
      (done ? '<div class="sv-seal" aria-label="Difficulté déjouée">克服<small>DÉJOUÉE</small></div>' : '') +
      '<div class="sv-diff-head">' + tag +
        '<span class="sv-diff-topic">' + esc(d.topic || 'Sans titre') + '</span>' +
        '<span class="sv-entry-actions">' +
          '<button type="button" class="sv-icon-btn" data-dfedit="' + esc(d.id) + '" title="Modifier"><i class="fa-solid fa-pen"></i></button>' +
          '<button type="button" class="sv-icon-btn is-danger" data-dfdel="' + esc(d.id) + '" title="Supprimer"><i class="fa-solid fa-trash"></i></button>' +
        '</span>' +
      '</div>' +
      '<div class="sv-diff-blocks">' +
        block('難', 'La difficulté', d.difficulty) +
        block('励', 'Un mot encourageant', d.encouragement, true) +
        block('策', 'Pour m’améliorer', d.plan) +
      '</div>' +
      '<div class="sv-diff-foot">' +
        (done
          ? '<button type="button" class="sv-btn sv-btn-ghost sv-btn-sm" data-dftoggle="' + esc(d.id) + '">↩ Elle revient…</button><small>Déjouée le ' + esc(frDate(d.overcomeAt || d.updatedAt)) + '</small>'
          : '<button type="button" class="sv-btn sv-btn-win sv-btn-sm" data-dftoggle="' + esc(d.id) + '">🎉 Je l’ai déjouée !</button><small>Notée le ' + esc(frDate(d.createdAt)) + '</small>') +
      '</div>' +
    '</article>';
  }

  function renderList() {
    var items = list().filter(function (d) {
      if (ui.subject === 'none' && d.subjectId) return false;
      if (ui.subject !== 'all' && ui.subject !== 'none' && d.subjectId !== ui.subject) return false;
      if (ui.status === 'open' && d.status === 'overcome') return false;
      if (ui.status === 'overcome' && d.status !== 'overcome') return false;
      return true;
    }).sort(function (a, b) {
      var da = a.status === 'overcome' ? 1 : 0, db = b.status === 'overcome' ? 1 : 0;
      if (da !== db) return da - db;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    $('df-list').innerHTML = items.length
      ? items.map(cardHtml).join('')
      : '<div class="sv-empty"><span class="sv-big">' + (list().length ? '無' : '始') + '</span>' +
        (list().length ? 'Aucune difficulté ne correspond à ce filtre.' : 'Rien à signaler ? Ajoute la première difficulté que tu rencontres : la nommer, c’est déjà avancer.') + '</div>';
  }

  function renderStats() {
    var total = list().length;
    var done = count(function (d) { return d.status === 'overcome'; });
    var pct = total ? Math.round(done / total * 100) : 0;
    var rows = subjects().map(function (s) {
      var t = count(function (d) { return d.subjectId === s.id; });
      var o = count(function (d) { return d.subjectId === s.id && d.status === 'overcome'; });
      return t ? '<div><span class="sv-dot" style="background:' + esc(s.color) + '"></span>' + esc(s.name) + '<em>' + o + '/' + t + ' déjouée' + (o > 1 ? 's' : '') + '</em></div>' : '';
    }).join('');
    $('df-stats').innerHTML =
      '<div class="sv-stats">' +
        '<div class="sv-stat"><b>' + (total - done) + '</b><span>en cours</span></div>' +
        '<div class="sv-stat"><b>' + done + '</b><span>déjouées 🎉</span></div>' +
      '</div>' +
      '<div class="sv-bar" title="' + pct + ' %"><i style="width:' + pct + '%"></i></div>' +
      '<p class="sv-muted">' + (total ? pct + ' % de tes difficultés sont déjouées.' : 'Ta progression apparaîtra ici.') + '</p>' +
      (rows ? '<div class="sv-mini">' + rows + '</div>' : '');
  }

  function renderAll() { renderSelect(); renderFilters(); renderList(); renderStats(); $('df-new-color').value = PALETTE[subjects().length % PALETTE.length]; }

  function resetForm() {
    ui.editingId = null;
    ['df-topic', 'df-difficulty', 'df-kind', 'df-plan'].forEach(function (id) { $(id).value = ''; });
    renderSelect(ui.subject !== 'all' && ui.subject !== 'none' ? ui.subject : '');
    $('df-error').textContent = '';
    $('df-form-title').textContent = 'Nouvelle difficulté';
    $('df-save-label').textContent = 'Ajouter cette difficulté';
    $('df-editing-badge').classList.add('hidden');
    $('df-cancel').classList.add('hidden');
  }

  function startEdit(id) {
    var d = list().filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    ui.editingId = id;
    renderSelect(d.subjectId || '');
    $('df-topic').value = d.topic || '';
    $('df-difficulty').value = d.difficulty || '';
    $('df-kind').value = d.encouragement || '';
    $('df-plan').value = d.plan || '';
    $('df-form-title').textContent = 'Modifier la difficulté';
    $('df-save-label').textContent = 'Mettre à jour';
    $('df-editing-badge').classList.remove('hidden');
    $('df-cancel').classList.remove('hidden');
    $('df-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveForm() {
    var topic = $('df-topic').value.trim(), diff = $('df-difficulty').value.trim();
    if (!topic && !diff) { $('df-error').textContent = 'Indique au moins le sujet ou la difficulté.'; return; }
    var data = {
      subjectId: $('df-subject').value || null, topic: topic, difficulty: diff,
      encouragement: $('df-kind').value.trim(), plan: $('df-plan').value.trim(), updatedAt: Date.now()
    };
    if (ui.editingId) {
      var d = list().filter(function (x) { return x.id === ui.editingId; })[0];
      if (d) Object.keys(data).forEach(function (k) { d[k] = data[k]; });
    } else {
      data.id = uid(); data.status = 'open'; data.createdAt = data.updatedAt; data.overcomeAt = null;
      list().push(data);
    }
    save(); resetForm(); renderAll();
  }

  function toggle(id) {
    var d = list().filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    if (d.status === 'overcome') { d.status = 'open'; d.overcomeAt = null; }
    else {
      d.status = 'overcome'; d.overcomeAt = Date.now();
      try { if (global.confetti) global.confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 } }); } catch (e) {}
    }
    d.updatedAt = Date.now();
    save(); renderAll();
  }

  function remove(id) {
    var d = list().filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    var run = function () {
      state.difficulties = list().filter(function (x) { return x.id !== id; });
      if (ui.editingId === id) resetForm();
      save(); renderAll();
    };
    if (typeof showConfirmModal === 'function') showConfirmModal('Supprimer cette difficulté ?', '« ' + (d.topic || 'Sans titre') + ' » sera définitivement supprimée.', run);
    else run();
  }

  function bind(root) {
    $('df-save').addEventListener('click', saveForm);
    $('df-cancel').addEventListener('click', resetForm);
    ['df-topic', 'df-difficulty', 'df-kind', 'df-plan'].forEach(function (id) {
      $(id).addEventListener('input', function () { $('df-error').textContent = ''; });
    });
    $('df-idea').addEventListener('click', function () {
      var ta = $('df-kind'), cur = ta.value;
      var pool = KIND_WORDS.filter(function (w) { return w !== cur; });
      ta.value = pool[Math.floor(Math.random() * pool.length)];
    });
    $('df-add-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('df-new-name').value.trim();
      if (!name) return;
      var exists = subjects().some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); });
      if (!exists) {
        var s = { id: uid(), name: name, color: $('df-new-color').value };
        subjects().push(s); save();
        $('df-new-name').value = '';
        renderAll(); $('df-subject').value = s.id;
      }
    });
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-dfsubject],[data-dfstatus],[data-dfedit],[data-dfdel],[data-dftoggle]');
      if (!t) return;
      if (t.dataset.dfsubject) { ui.subject = t.dataset.dfsubject; renderFilters(); renderList(); }
      else if (t.dataset.dfstatus) { ui.status = t.dataset.dfstatus; renderFilters(); renderList(); }
      else if (t.dataset.dfedit) startEdit(t.dataset.dfedit);
      else if (t.dataset.dfdel) remove(t.dataset.dfdel);
      else if (t.dataset.dftoggle) toggle(t.dataset.dftoggle);
    });
  }

  function init(appState, saveFn, rootId) {
    state = appState;
    save = saveFn || function () {};
    if (!Array.isArray(state.sessionSubjects)) state.sessionSubjects = [];
    if (!Array.isArray(state.difficulties)) state.difficulties = [];
    var root = $(rootId || 'df-mount');
    if (!root || mounted) return;
    mounted = true;
    root.innerHTML = shell();
    bind(root);
    renderAll();
  }

  global.MesDifficultes = { init: init, refresh: function () { if (mounted) renderAll(); } };
})(window);
