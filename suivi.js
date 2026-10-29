/* ============================================================
   suivi.js — Révisions > "Suivi des séances de travail" (勉強記録)
   -------------------------------------------------------------
   - Étiquettes de matières créées par l'utilisateur (nom + couleur)
   - Journal des séances : date, matière, titre, texte mis en forme
     (gras, italique, surlignage, couleur, police, taille, listes…)
   - Visualisation par date ou par matière, filtre et recherche
   Données : state.sessionSubjects et state.workSessions
   (sauvegardées via saveState(), comme le reste du site).
   ============================================================ */
(function (global) {
  'use strict';

  var PALETTE = ['#e88eb2', '#89b4fa', '#94e2d5', '#f9e2af', '#cba6f7', '#f8bd96', '#a6e3a1', '#f2a7a7'];
  var TEXT_COLORS = [
    ['#4a2838', 'Encre'], ['#c1272d', 'Vermillon'], ['#1b6ca8', 'Indigo'],
    ['#297623', 'Matcha'], ['#b8860b', 'Or'], ['#7a1fa2', 'Glycine']
  ];
  var HILITES = [
    ['#fef08a', 'Jaune'], ['#bbf7d0', 'Vert'], ['#bfdbfe', 'Bleu'], ['#fbcfe8', 'Rose'], ['#fed7aa', 'Orange']
  ];
  var FONTS = [
    ['', 'Police du site'],
    ['Georgia, serif', 'Serif'],
    ["'Noto Serif JP', 'Hiragino Mincho ProN', serif", 'Mincho 明朝'],
    ["'Klee One', 'Hiragino Maru Gothic ProN', cursive", 'Manuscrit 手書き'],
    ["'Segoe Script', 'Brush Script MT', cursive", 'Cursive'],
    ["'Courier New', monospace", 'Machine']
  ];
  var SIZES = [['2', 'Petit'], ['3', 'Normal'], ['5', 'Grand'], ['6', 'Très grand']];
  var MONTHS_KANJI = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  var DAYS_KANJI = ['日', '月', '火', '水', '木', '金', '土'];
  var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  var state = null;
  var save = function () {};
  var mounted = false;
  var ui = { filter: 'all', view: 'date', search: '', editingId: null, bilanEditingId: null, bilanOpen: false };
  var savedRange = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  // ------------------------------------------------------------
  // Nettoyage du HTML (le contenu vient d'un champ éditable : on ne
  // garde que la mise en forme inoffensive, jamais de scripts)
  // ------------------------------------------------------------
  var ALLOWED_TAGS = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'SPAN', 'FONT', 'DIV', 'P', 'BR',
    'UL', 'OL', 'LI', 'H3', 'H4', 'BLOCKQUOTE', 'HR', 'MARK', 'SUB', 'SUP'];
  var DROP_TAGS = ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TEMPLATE', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'];
  var ALLOWED_CSS = ['color', 'background-color', 'background', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align'];

  function cleanStyle(style) {
    return String(style || '').split(';').map(function (decl) {
      var i = decl.indexOf(':');
      if (i < 0) return '';
      var prop = decl.slice(0, i).trim().toLowerCase();
      var val = decl.slice(i + 1).trim();
      if (ALLOWED_CSS.indexOf(prop) === -1) return '';
      if (/url\s*\(|expression|javascript|@import|<|>/i.test(val)) return '';
      return prop + ':' + val;
    }).filter(Boolean).join(';');
  }

  function sanitize(html) {
    var doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) return;
        if (child.nodeType !== 1) { node.removeChild(child); return; }
        var tag = child.tagName;
        if (DROP_TAGS.indexOf(tag) !== -1) { node.removeChild(child); return; }
        walk(child);
        if (ALLOWED_TAGS.indexOf(tag) === -1) {
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
          return;
        }
        Array.prototype.slice.call(child.attributes).forEach(function (a) {
          var n = a.name.toLowerCase();
          if (n === 'style') {
            var cs = cleanStyle(a.value);
            if (cs) child.setAttribute('style', cs); else child.removeAttribute('style');
          } else if (tag === 'FONT' && (n === 'color' || n === 'face' || n === 'size')) {
            if (/[<>"']/.test(a.value) || /url\s*\(|javascript/i.test(a.value)) child.removeAttribute(a.name);
          } else {
            child.removeAttribute(a.name);
          }
        });
      });
    })(doc.body);
    return doc.body.innerHTML;
  }

  function plainText(html) {
    var d = document.createElement('div');
    d.innerHTML = sanitize(html);
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  // ------------------------------------------------------------
  // Données
  // ------------------------------------------------------------
  function subjects() { return state.sessionSubjects; }
  function sessions() { return state.workSessions; }
  function subjectById(id) {
    for (var i = 0; i < subjects().length; i++) if (subjects()[i].id === id) return subjects()[i];
    return null;
  }
  function isBilan(s) { return !!s && s.kind === 'bilan'; }
  function countFor(id) {
    return sessions().filter(function (s) { return !isBilan(s) && (s.subjectId || null) === id; }).length;
  }
  function bilans() { return sessions().filter(isBilan); }

  // ---- Bilan du dimanche (hansei 反省 · kaizen 改善) ----
  var BILAN_QUESTIONS = [
    { key: 'worked', k: '良', label: 'Ce qui a marché', jp: 'うまくいったこと', ph: 'Une méthode, un horaire, un chapitre bien compris… ce qui t’a fait avancer cette semaine.' },
    { key: 'blocked', k: '難', label: 'Ce qui a bloqué', jp: 'つまずいたこと', ph: 'Distractions, notion confuse, manque d’énergie, retards… sans te juger, juste constater.' },
    { key: 'improve', k: '改', label: 'Une seule amélioration pour la semaine prochaine', jp: '来週の改善はひとつだけ', ph: 'Un seul petit changement concret. Ex : commencer à 17 h, téléphone dans une autre pièce.' }
  ];
  function lastSundayKey(from) {
    var d = from ? new Date(from.getTime()) : new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function bilanOnDate(date) {
    return bilans().filter(function (b) { return b.date === date; })[0] || null;
  }
  function lastBilan(beforeDate) {
    return bilans().filter(function (b) { return !beforeDate || b.date < beforeDate; }).sort(sortDesc)[0] || null;
  }
  function bilanHtml(b) {
    var parts = BILAN_QUESTIONS.map(function (q) {
      var txt = (b[q.key] || '').trim();
      return '<h3>' + esc(q.k + ' · ' + q.label) + '</h3><div>' + (txt ? esc(txt).replace(/\n/g, '<br>') : '—') + '</div>';
    });
    return parts.join('');
  }
  function nextColor() { return PALETTE[subjects().length % PALETTE.length]; }

  // ------------------------------------------------------------
  // Squelette
  // ------------------------------------------------------------
  function shell() {
    var colorBtns = TEXT_COLORS.map(function (c) {
      return '<button type="button" class="sv-swatch" style="background:' + c[0] + '" title="Texte ' + c[1] + '" data-svcolor="' + c[0] + '"></button>';
    }).join('');
    var hiBtns = HILITES.map(function (c) {
      return '<button type="button" class="sv-swatch" style="background:' + c[0] + '" title="Surligner en ' + c[1].toLowerCase() + '" data-svhi="' + c[0] + '"></button>';
    }).join('');
    var fontOpts = FONTS.map(function (f) { return '<option value="' + esc(f[0]) + '">' + esc(f[1]) + '</option>'; }).join('');
    var sizeOpts = SIZES.map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === '3' ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('');

    return '' +
      '<div class="sv-hero">' +
        '<div class="sv-hanko" aria-hidden="true">記</div>' +
        '<div><h2><small>勉強記録 · BENKYŌ KIROKU</small>Suivi des séances de travail</h2>' +
        '<p>Note ce que tu as fait aujourd’hui, matière par matière, et retrouve tout avec les dates.</p></div>' +
      '</div>' +

      '<div class="sv-layout">' +
        '<div class="sv-main">' +

          // ----- Éditeur
          '<section class="glass-panel sv-card" id="sv-editor-card">' +
            '<div class="sv-card-title"><span class="sv-k">書</span><span id="sv-editor-title">Nouvelle séance</span>' +
              '<span id="sv-editing-badge" class="sv-editing-badge hidden"><i class="fa-solid fa-pen"></i> Modification</span></div>' +
            '<div class="sv-row">' +
              '<div class="sv-field"><label for="sv-date">日付 · Date</label><input id="sv-date" type="date" class="sv-input"></div>' +
              '<div class="sv-field"><label for="sv-subject">教科 · Matière</label><select id="sv-subject" class="sv-select"></select></div>' +
              '<div class="sv-field sv-grow"><label for="sv-title">題 · Titre (facultatif)</label><input id="sv-title" type="text" class="sv-input" maxlength="120" placeholder="Ex : Chapitre 3, exercices de dérivation…"></div>' +
            '</div>' +
            '<div class="sv-toolbar" id="sv-toolbar" role="toolbar" aria-label="Mise en forme">' +
              '<div class="sv-tb-group">' +
                '<button type="button" class="sv-tb-btn" data-svcmd="bold" title="Gras (Ctrl+B)"><b>B</b></button>' +
                '<button type="button" class="sv-tb-btn" data-svcmd="italic" title="Italique (Ctrl+I)"><i>I</i></button>' +
                '<button type="button" class="sv-tb-btn" data-svcmd="underline" title="Souligné (Ctrl+U)"><u>U</u></button>' +
                '<button type="button" class="sv-tb-btn" data-svcmd="strikeThrough" title="Barré"><s>S</s></button>' +
              '</div>' +
              '<div class="sv-tb-group">' +
                '<select id="sv-font" class="sv-tb-select" title="Police">' + fontOpts + '</select>' +
                '<select id="sv-size" class="sv-tb-select" title="Taille" style="max-width:96px">' + sizeOpts + '</select>' +
              '</div>' +
              '<div class="sv-tb-group"><span class="sv-tb-label">Texte</span>' + colorBtns +
                '<input type="color" id="sv-color-custom" class="sv-color-input" value="#4a2838" title="Autre couleur de texte"></div>' +
              '<div class="sv-tb-group"><span class="sv-tb-label">Surligner</span>' + hiBtns +
                '<button type="button" class="sv-swatch sv-swatch-none" title="Retirer le surlignage" data-svhi="transparent"></button></div>' +
              '<div class="sv-tb-group">' +
                '<button type="button" class="sv-tb-btn" data-svcmd="insertUnorderedList" title="Liste à puces">•≡</button>' +
                '<button type="button" class="sv-tb-btn" data-svcmd="insertOrderedList" title="Liste numérotée">1.</button>' +
                '<button type="button" class="sv-tb-btn" data-svblock="H3" title="Titre de section">題</button>' +
                '<button type="button" class="sv-tb-btn" data-svblock="BLOCKQUOTE" title="Citation / remarque">❝</button>' +
                '<button type="button" class="sv-tb-btn" data-svcmd="removeFormat" title="Effacer la mise en forme">⌫</button>' +
              '</div>' +
            '</div>' +
            '<div id="sv-editor" class="sv-editor custom-scrollbar" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Qu’as-tu fait aujourd’hui ? Chapitres relus, exercices, difficultés, ce qu’il reste à revoir…"></div>' +
            '<div class="sv-editor-actions">' +
              '<button type="button" class="sv-btn sv-btn-primary" id="sv-save"><i class="fa-solid fa-stamp"></i><span id="sv-save-label">Enregistrer la séance</span></button>' +
              '<button type="button" class="sv-btn sv-btn-ghost hidden" id="sv-cancel">Annuler</button>' +
              '<span id="sv-error" class="sv-error"></span>' +
              '<span class="sv-hint">Ctrl + Entrée pour enregistrer</span>' +
            '</div>' +
          '</section>' +

          // ----- Bilan du dimanche
          '<section class="glass-panel sv-card sv-bilan" id="sv-bilan-card">' +
            '<div class="sv-card-title"><span class="sv-k">省</span><span>Bilan du dimanche</span>' +
              '<span id="sv-bilan-badge" class="sv-bilan-badge hidden"></span>' +
              '<button type="button" class="sv-btn sv-btn-ghost sv-btn-sm sv-bilan-toggle" id="sv-bilan-toggle" aria-expanded="false" aria-controls="sv-bilan-body"><i class="fa-solid fa-chevron-down"></i><span>Faire mon bilan</span></button></div>' +
            '<p class="sv-sub"><b>Hansei</b> (反省) : regarder la semaine en face. <b>Kaizen</b> (改善) : en tirer un petit pas, un seul.</p>' +
            '<div class="sv-bilan-body hidden" id="sv-bilan-body">' +
              '<div id="sv-bilan-prev" class="sv-bilan-prev hidden"></div>' +
              '<div class="sv-row"><div class="sv-field"><label for="sv-bilan-date">日付 · Dimanche du bilan</label><input id="sv-bilan-date" type="date" class="sv-input"></div></div>' +
              BILAN_QUESTIONS.map(function (q, i) {
                return '<div class="sv-bilan-q">' +
                  '<label for="sv-bilan-' + q.key + '"><span class="sv-bilan-n">' + (i + 1) + '</span><span class="sv-bilan-k" lang="ja">' + q.k + '</span>' + esc(q.label) + '<small lang="ja">' + q.jp + '</small></label>' +
                  '<textarea id="sv-bilan-' + q.key + '" class="sv-input sv-bilan-text" rows="' + (q.key === 'improve' ? 2 : 3) + '" maxlength="' + (q.key === 'improve' ? 220 : 600) + '" placeholder="' + esc(q.ph) + '"></textarea>' +
                '</div>';
              }).join('') +
              '<div class="sv-editor-actions">' +
                '<button type="button" class="sv-btn sv-btn-primary" id="sv-bilan-save"><i class="fa-solid fa-stamp"></i><span id="sv-bilan-save-label">Ranger dans mon journal</span></button>' +
                '<button type="button" class="sv-btn sv-btn-ghost hidden" id="sv-bilan-cancel">Annuler</button>' +
                '<span id="sv-bilan-error" class="sv-error"></span>' +
              '</div>' +
            '</div>' +
          '</section>' +

          // ----- Journal
          '<section class="glass-panel sv-card">' +
            '<div class="sv-card-title"><span class="sv-k">記録</span><span>Mon journal de travail</span></div>' +
            '<div class="sv-filters" id="sv-filters" style="margin-top:14px"></div>' +
            '<div class="sv-toolrow">' +
              '<div class="sv-search"><i class="fa-solid fa-magnifying-glass"></i><input id="sv-search" type="search" class="sv-input" placeholder="Rechercher dans mes séances…"></div>' +
              '<div class="sv-seg" role="group" aria-label="Affichage">' +
                '<button type="button" id="sv-view-date" data-svview="date">Par date</button>' +
                '<button type="button" id="sv-view-subject" data-svview="subject">Par matière</button>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<div id="sv-timeline" class="sv-timeline"></div>' +
        '</div>' +

        // ----- Colonne latérale
        '<aside class="sv-side">' +
          '<section class="glass-panel sv-card">' +
            '<div class="sv-card-title"><span class="sv-k">札</span><span>Mes matières (étiquettes)</span></div>' +
            '<p class="sv-sub">Crée une étiquette par matière pour classer tes séances.</p>' +
            '<form class="sv-add-row" id="sv-add-form" autocomplete="off">' +
              '<input type="color" id="sv-new-color" class="sv-color-input" value="#e88eb2" title="Couleur de l’étiquette">' +
              '<input type="text" id="sv-new-name" class="sv-input" maxlength="40" placeholder="Ex : Histoire, Maths…">' +
              '<button type="submit" class="sv-btn sv-btn-primary sv-btn-sm" title="Ajouter l’étiquette" aria-label="Ajouter l’étiquette">＋</button>' +
            '</form>' +
            '<div id="sv-subjects" class="sv-subjects"></div>' +
            '<div id="sv-import" class="sv-muted"></div>' +
          '</section>' +
          '<section class="glass-panel sv-card">' +
            '<div class="sv-card-title"><span class="sv-k">統</span><span>Aperçu</span></div>' +
            '<div id="sv-stats" class="sv-stats"></div>' +
          '</section>' +
        '</aside>' +
      '</div>';
  }

  // ------------------------------------------------------------
  // Rendu des différentes parties
  // ------------------------------------------------------------
  function renderSubjectSelect(selectedId) {
    var sel = $('sv-subject');
    if (!sel) return;
    var current = selectedId !== undefined ? selectedId : (sel.value || '');
    var opts = '<option value="">Sans étiquette</option>' + subjects().map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>';
    }).join('');
    sel.innerHTML = opts;
    sel.value = subjectById(current) ? current : '';
  }

  function renderSubjectsPanel() {
    var box = $('sv-subjects');
    if (!box) return;
    if (!subjects().length) {
      box.innerHTML = '<p class="sv-muted" style="margin-top:0">Aucune étiquette pour l’instant. Ajoute ta première matière ci-dessus.</p>';
    } else {
      box.innerHTML = subjects().map(function (s) {
        return '<div class="sv-subject-row" data-id="' + esc(s.id) + '">' +
          '<input type="color" class="sv-color-input" value="' + esc(s.color) + '" data-svsubcolor="' + esc(s.id) + '" title="Changer la couleur">' +
          '<input type="text" value="' + esc(s.name) + '" maxlength="40" data-svsubname="' + esc(s.id) + '" aria-label="Nom de la matière">' +
          '<span class="sv-count">' + countFor(s.id) + '</span>' +
          '<button type="button" class="sv-icon-btn is-danger" data-svsubdel="' + esc(s.id) + '" title="Supprimer l’étiquette"><i class="fa-solid fa-trash"></i></button>' +
        '</div>';
      }).join('');
    }
    // Import depuis les cours existants
    var imp = $('sv-import');
    if (imp) {
      var known = {};
      subjects().forEach(function (s) { known[s.name.toLowerCase()] = true; });
      var found = {};
      (state.courses || []).forEach(function (c) {
        var n = (c && c.subject || '').trim();
        if (n && !known[n.toLowerCase()]) found[n.toLowerCase()] = n;
      });
      var names = Object.keys(found).map(function (k) { return found[k]; });
      imp.innerHTML = names.length
        ? '<button type="button" class="sv-btn sv-btn-ghost sv-btn-sm" id="sv-import-btn"><i class="fa-solid fa-file-import"></i> Importer mes matières de cours (' + names.length + ')</button>'
        : '';
      var b = $('sv-import-btn');
      if (b) b.onclick = function () {
        names.forEach(function (n) { subjects().push({ id: uid(), name: n, color: nextColor() }); });
        save(); renderAll();
      };
    }
  }

  function renderFilters() {
    var box = $('sv-filters');
    if (!box) return;
    var total = sessions().length;
    var html = '<button type="button" class="sv-chip sv-chip-all' + (ui.filter === 'all' ? ' is-active' : '') + '" data-svfilter="all">Toutes <b>' + total + '</b></button>';
    subjects().forEach(function (s) {
      html += '<button type="button" class="sv-chip' + (ui.filter === s.id ? ' is-active' : '') + '" style="--c:' + esc(s.color) + '" data-svfilter="' + esc(s.id) + '">' + esc(s.name) + ' <b>' + countFor(s.id) + '</b></button>';
    });
    var none = countFor(null);
    if (none) html += '<button type="button" class="sv-chip sv-chip-all' + (ui.filter === 'none' ? ' is-active' : '') + '" data-svfilter="none">Sans étiquette <b>' + none + '</b></button>';
    var nb = bilans().length;
    if (nb) html += '<button type="button" class="sv-chip sv-chip-bilan' + (ui.filter === 'bilan' ? ' is-active' : '') + '" data-svfilter="bilan">省 Bilans <b>' + nb + '</b></button>';
    box.innerHTML = html;
    var d = $('sv-view-date'), s2 = $('sv-view-subject');
    if (d) d.classList.toggle('is-active', ui.view === 'date');
    if (s2) s2.classList.toggle('is-active', ui.view === 'subject');
  }

  function entryHtml(s) {
    var sub = subjectById(s.subjectId);
    var d = parseKey(s.date);
    var stamp = d
      ? '<div class="sv-stamp" title="' + esc(d.getDate() + ' ' + MONTHS_FR[d.getMonth()] + ' ' + d.getFullYear()) + '"><b>' + d.getDate() + '</b><span>' + MONTHS_KANJI[d.getMonth()] + '</span><i>' + DAYS_KANJI[d.getDay()] + '</i></div>'
      : '<div class="sv-stamp"><b>?</b></div>';
    var tag = isBilan(s)
      ? '<span class="sv-tag sv-tag-bilan">省 Bilan du dimanche</span>'
      : sub
      ? '<span class="sv-tag" style="--c:' + esc(sub.color) + '">' + esc(sub.name) + '</span>'
      : '<span class="sv-tag is-none">Sans étiquette</span>';
    var longDate = d ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
    return '<article class="sv-entry' + (isBilan(s) ? ' sv-entry-bilan' : '') + '" style="--c:' + esc(isBilan(s) ? '#c1272d' : (sub ? sub.color : '#d9c3cc')) + '" data-id="' + esc(s.id) + '">' +
      stamp +
      '<div style="min-width:0">' +
        '<div class="sv-entry-head">' + tag +
          (s.title && !isBilan(s) ? '<span class="sv-entry-title">' + esc(s.title) + '</span>' : '') +
          '<span class="sv-entry-date">' + esc(longDate) + '</span>' +
          '<span class="sv-entry-actions">' +
            '<button type="button" class="sv-icon-btn" data-svedit="' + esc(s.id) + '" title="Modifier"><i class="fa-solid fa-pen"></i></button>' +
            '<button type="button" class="sv-icon-btn is-danger" data-svdel="' + esc(s.id) + '" title="Supprimer"><i class="fa-solid fa-trash"></i></button>' +
          '</span>' +
        '</div>' +
        '<div class="sv-content">' + (isBilan(s) && s.bilan ? bilanHtml(s.bilan) : sanitize(s.html)) + '</div>' +
      '</div>' +
    '</article>';
  }

  function sortDesc(a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  }

  function visibleSessions() {
    var q = ui.search.trim().toLowerCase();
    return sessions().filter(function (s) {
      if (ui.filter === 'bilan') return isBilan(s) && matchesSearch(s, q);
      if (ui.filter === 'none' && (s.subjectId || isBilan(s))) return false;
      if (ui.filter !== 'all' && ui.filter !== 'none' && s.subjectId !== ui.filter) return false;
      return matchesSearch(s, q);
    }).sort(sortDesc);
  }
  function matchesSearch(s, q) {
    if (!q) return true;
    var sub = subjectById(s.subjectId);
    var extra = isBilan(s) && s.bilan ? ' bilan dimanche hansei kaizen ' + (s.bilan.worked || '') + ' ' + (s.bilan.blocked || '') + ' ' + (s.bilan.improve || '') : '';
    var hay = ((s.title || '') + ' ' + plainText(s.html) + ' ' + (sub ? sub.name : '') + extra).toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function renderTimeline() {
    var box = $('sv-timeline');
    if (!box) return;
    var list = visibleSessions();
    if (!list.length) {
      box.innerHTML = sessions().length
        ? '<div class="sv-empty"><span class="sv-big">無</span>Aucune séance ne correspond à ce filtre.</div>'
        : '<div class="sv-empty"><span class="sv-big">始</span>Ton journal est vide. Écris ta première séance ci-dessus : ce que tu as travaillé, aujourd’hui.</div>';
      return;
    }
    var html = '';
    if (ui.view === 'subject') {
      var groups = [];
      subjects().forEach(function (s) { groups.push({ sub: s, items: [] }); });
      var none = { sub: null, items: [] };
      var bil = { sub: null, bilan: true, items: [] };
      list.forEach(function (s) {
        if (isBilan(s)) { bil.items.push(s); return; }
        var g = groups.filter(function (x) { return x.sub.id === s.subjectId; })[0];
        (g || none).items.push(s);
      });
      if (none.items.length) groups.push(none);
      if (bil.items.length) groups.push(bil);
      groups.forEach(function (g) {
        if (!g.items.length) return;
        var last = parseKey(g.items[0].date);
        html += '<div class="sv-group-head" style="--c:' + esc(g.bilan ? '#c1272d' : (g.sub ? g.sub.color : '#d9c3cc')) + '">' +
          '<h3>' + esc(g.bilan ? 'Bilans du dimanche' : (g.sub ? g.sub.name : 'Sans étiquette')) + '</h3>' +
          '<span>' + g.items.length + ' séance' + (g.items.length > 1 ? 's' : '') +
          (last ? ' · dernière le ' + last.getDate() + ' ' + MONTHS_FR[last.getMonth()] + ' ' + last.getFullYear() : '') + '</span>' +
          '<span class="sv-k">' + (g.bilan ? '省' : (g.sub ? '科' : '無')) + '</span></div>';
        html += g.items.map(entryHtml).join('');
      });
    } else {
      var lastMonth = '';
      list.forEach(function (s) {
        var d = parseKey(s.date);
        var key = d ? d.getFullYear() + '-' + d.getMonth() : '';
        if (key !== lastMonth) {
          lastMonth = key;
          if (d) html += '<div class="sv-month">' + d.getFullYear() + '年 ' + MONTHS_KANJI[d.getMonth()] + ' <small>' + MONTHS_FR[d.getMonth()] + ' ' + d.getFullYear() + '</small></div>';
        }
        html += entryHtml(s);
      });
    }
    box.innerHTML = html;
  }

  function renderStats() {
    var box = $('sv-stats');
    if (!box) return;
    var all = sessions().filter(function (s) { return !isBilan(s); });
    var days = {};
    all.forEach(function (s) { days[s.date] = true; });
    var now = new Date();
    var monthPrefix = now.getFullYear() + '-' + pad(now.getMonth() + 1);
    var thisMonth = all.filter(function (s) { return (s.date || '').indexOf(monthPrefix) === 0; }).length;
    var best = null;
    subjects().forEach(function (s) {
      var c = countFor(s.id);
      if (c && (!best || c > best.c)) best = { name: s.name, c: c };
    });
    box.innerHTML =
      '<div class="sv-stat"><b>' + all.length + '</b><span>séances notées</span></div>' +
      '<div class="sv-stat"><b>' + Object.keys(days).length + '</b><span>jours de travail</span></div>' +
      '<div class="sv-stat"><b>' + thisMonth + '</b><span>ce mois-ci</span></div>' +
      '<div class="sv-stat"><b>' + subjects().length + '</b><span>matières</span></div>' +
      '<div class="sv-stat is-wide"><b>' + (best ? esc(best.name) + ' · ' + best.c : '—') + '</b><span>matière la plus travaillée</span></div>' +
      (function () {
        var lb = lastBilan();
        var imp = lb && lb.bilan && (lb.bilan.improve || '').trim();
        return '<div class="sv-stat is-wide"><b class="sv-stat-kaizen">' + (imp ? '改 ' + esc(imp) : '—') + '</b><span>' + bilans().length + ' bilan' + (bilans().length > 1 ? 's' : '') + ' · amélioration en cours (kaizen)</span></div>';
      })();
  }

  function renderAll() {
    renderSubjectSelect();
    renderSubjectsPanel();
    renderFilters();
    renderTimeline();
    renderStats();
    renderBilanCard();
  }

  // ------------------------------------------------------------
  // Bilan du dimanche
  // ------------------------------------------------------------
  function setBilanOpen(open) {
    ui.bilanOpen = open;
    var body = $('sv-bilan-body'), tg = $('sv-bilan-toggle');
    if (!body || !tg) return;
    body.classList.toggle('hidden', !open);
    tg.setAttribute('aria-expanded', String(open));
    tg.classList.toggle('is-open', open);
    tg.querySelector('span').textContent = open ? 'Replier' : (ui.bilanEditingId ? 'Modifier mon bilan' : 'Faire mon bilan');
  }

  function renderBilanCard() {
    var card = $('sv-bilan-card');
    if (!card) return;
    var today = new Date();
    var isSunday = today.getDay() === 0;
    var todayK = todayKey();
    var doneToday = isSunday && !!bilanOnDate(todayK);
    var badge = $('sv-bilan-badge');
    if (isSunday && !doneToday) { badge.textContent = 'C’est dimanche : l’heure du bilan'; badge.classList.remove('hidden'); badge.classList.remove('is-done'); }
    else if (doneToday) { badge.textContent = 'Bilan du jour rangé ✓'; badge.classList.remove('hidden'); badge.classList.add('is-done'); }
    else badge.classList.add('hidden');
    card.classList.toggle('is-due', isSunday && !doneToday);
    renderBilanPrev();
    if (!ui.bilanOpen) setBilanOpen(false);
  }

  // Rappel de la dernière amélioration choisie : on s'en sert pour juger la semaine.
  function renderBilanPrev() {
    var box = $('sv-bilan-prev');
    if (!box) return;
    var date = $('sv-bilan-date') ? $('sv-bilan-date').value : '';
    var prev = lastBilan(date || undefined);
    if (ui.bilanEditingId) {
      var cur = sessions().filter(function (x) { return x.id === ui.bilanEditingId; })[0];
      prev = lastBilan(cur ? cur.date : undefined);
    }
    var imp = prev && prev.bilan && (prev.bilan.improve || '').trim();
    if (!imp) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    var d = parseKey(prev.date);
    box.classList.remove('hidden');
    box.innerHTML = '<span lang="ja">改</span><div><small>Ton kaizen de la semaine précédente' + (d ? ' (' + d.getDate() + ' ' + MONTHS_FR[d.getMonth()] + ')' : '') + '</small><b>' + esc(imp) + '</b><em>L’as-tu tenu ? Dis-le dans « Ce qui a marché » ou « Ce qui a bloqué ».</em></div>';
  }

  function fillBilanForm(b) {
    BILAN_QUESTIONS.forEach(function (q) { $('sv-bilan-' + q.key).value = b ? (b.bilan[q.key] || '') : ''; });
  }

  function resetBilanForm() {
    ui.bilanEditingId = null;
    $('sv-bilan-date').value = lastSundayKey();
    var existing = bilanOnDate($('sv-bilan-date').value);
    fillBilanForm(null);
    if (existing) { ui.bilanEditingId = existing.id; fillBilanForm(existing); }
    $('sv-bilan-error').textContent = '';
    $('sv-bilan-save-label').textContent = ui.bilanEditingId ? 'Mettre à jour le bilan' : 'Ranger dans mon journal';
    $('sv-bilan-cancel').classList.toggle('hidden', !ui.bilanEditingId);
    renderBilanPrev();
  }

  function onBilanDateChange() {
    var date = $('sv-bilan-date').value;
    var existing = date ? bilanOnDate(date) : null;
    ui.bilanEditingId = existing ? existing.id : null;
    if (existing) fillBilanForm(existing);
    $('sv-bilan-save-label').textContent = existing ? 'Mettre à jour le bilan' : 'Ranger dans mon journal';
    $('sv-bilan-cancel').classList.toggle('hidden', !existing);
    renderBilanPrev();
  }

  function startBilanEdit(id) {
    var b = sessions().filter(function (x) { return x.id === id; })[0];
    if (!b || !isBilan(b)) return;
    ui.bilanEditingId = id;
    $('sv-bilan-date').value = b.date;
    fillBilanForm(b);
    $('sv-bilan-error').textContent = '';
    $('sv-bilan-save-label').textContent = 'Mettre à jour le bilan';
    $('sv-bilan-cancel').classList.remove('hidden');
    renderBilanPrev();
    setBilanOpen(true);
    var card = $('sv-bilan-card');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveBilan() {
    var data = {};
    BILAN_QUESTIONS.forEach(function (q) { data[q.key] = $('sv-bilan-' + q.key).value.trim(); });
    if (!data.worked && !data.blocked && !data.improve) {
      $('sv-bilan-error').textContent = 'Réponds au moins à une des trois questions.';
      return;
    }
    if (!data.improve) {
      $('sv-bilan-error').textContent = 'Choisis ton amélioration : une seule, même toute petite.';
      $('sv-bilan-improve').focus();
      return;
    }
    var date = $('sv-bilan-date').value || lastSundayKey();
    var now = Date.now();
    var existing = ui.bilanEditingId
      ? sessions().filter(function (x) { return x.id === ui.bilanEditingId; })[0]
      : bilanOnDate(date);
    if (existing) {
      existing.date = date; existing.bilan = data; existing.html = bilanHtml(data); existing.updatedAt = now;
    } else {
      sessions().push({ id: uid(), kind: 'bilan', date: date, subjectId: null, title: 'Bilan du dimanche', bilan: data, html: bilanHtml(data), createdAt: now, updatedAt: now });
    }
    save();
    ui.bilanEditingId = null;
    ui.filter = 'all'; ui.search = '';
    var se = $('sv-search'); if (se) se.value = '';
    setBilanOpen(false);
    renderAll();
    resetBilanForm();
  }

  // ------------------------------------------------------------
  // Éditeur riche
  // ------------------------------------------------------------
  function editor() { return $('sv-editor'); }

  function rememberSelection() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var r = sel.getRangeAt(0);
    var ed = editor();
    if (ed && ed.contains(r.commonAncestorContainer)) savedRange = r.cloneRange();
  }
  function restoreSelection() {
    var ed = editor();
    if (!ed) return;
    var cur = window.getSelection();
    // Sélection déjà valide dans l'éditeur : on n'y touche pas.
    if (document.activeElement === ed && cur && cur.rangeCount && ed.contains(cur.getRangeAt(0).commonAncestorContainer)) return;
    ed.focus();
    if (savedRange) {
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  }
  function exec(cmd, val) {
    restoreSelection();
    try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
    document.execCommand(cmd, false, val == null ? null : val);
    rememberSelection();
    refreshToolbarState();
  }
  function refreshToolbarState() {
    var tb = $('sv-toolbar');
    if (!tb) return;
    ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].forEach(function (c) {
      var b = tb.querySelector('[data-svcmd="' + c + '"]');
      if (!b) return;
      var on = false;
      try { on = document.queryCommandState(c); } catch (e) {}
      b.classList.toggle('is-on', !!on);
    });
  }

  function setEditorHtml(html) { editor().innerHTML = sanitize(html); savedRange = null; }

  function resetEditor() {
    ui.editingId = null;
    editor().innerHTML = '';
    $('sv-title').value = '';
    $('sv-date').value = todayKey();
    renderSubjectSelect(ui.filter !== 'all' && ui.filter !== 'none' ? ui.filter : '');
    $('sv-error').textContent = '';
    $('sv-editor-title').textContent = 'Nouvelle séance';
    $('sv-save-label').textContent = 'Enregistrer la séance';
    $('sv-editing-badge').classList.add('hidden');
    $('sv-cancel').classList.add('hidden');
    savedRange = null;
  }

  function startEdit(id) {
    var s = sessions().filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    if (isBilan(s)) { startBilanEdit(id); return; }
    ui.editingId = id;
    $('sv-date').value = s.date || todayKey();
    $('sv-title').value = s.title || '';
    renderSubjectSelect(s.subjectId || '');
    setEditorHtml(s.html || '');
    $('sv-error').textContent = '';
    $('sv-editor-title').textContent = 'Modifier la séance';
    $('sv-save-label').textContent = 'Mettre à jour';
    $('sv-editing-badge').classList.remove('hidden');
    $('sv-cancel').classList.remove('hidden');
    var card = $('sv-editor-card');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { editor().focus(); }, 250);
  }

  function saveSession() {
    var html = sanitize(editor().innerHTML);
    var text = plainText(html);
    var title = $('sv-title').value.trim();
    var date = $('sv-date').value || todayKey();
    if (!text && !title) {
      $('sv-error').textContent = 'Écris au moins quelques mots ou un titre avant d’enregistrer.';
      editor().focus();
      return;
    }
    var subjectId = $('sv-subject').value || null;
    var now = Date.now();
    if (ui.editingId) {
      var s = sessions().filter(function (x) { return x.id === ui.editingId; })[0];
      if (s) { s.date = date; s.title = title; s.subjectId = subjectId; s.html = html; s.updatedAt = now; }
    } else {
      sessions().push({ id: uid(), date: date, subjectId: subjectId, title: title, html: html, createdAt: now, updatedAt: now });
    }
    save();
    resetEditor();
    // Le filtre actif ne doit pas masquer la séance qu'on vient d'ajouter
    if (ui.filter !== 'all' && ui.filter !== (subjectId || 'none')) ui.filter = 'all';
    ui.search = '';
    var se = $('sv-search'); if (se) se.value = '';
    renderAll();
    var firstEntry = document.querySelector('#sv-timeline .sv-entry');
    if (firstEntry && firstEntry.scrollIntoView && !ui.editingId) { /* garde la position de la page */ }
  }

  function deleteSession(id) {
    var s = sessions().filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var run = function () {
      state.workSessions = sessions().filter(function (x) { return x.id !== id; });
      if (ui.editingId === id) resetEditor();
      if (ui.bilanEditingId === id) resetBilanForm();
      save(); renderAll();
    };
    if (typeof showConfirmModal === 'function') {
      showConfirmModal(isBilan(s) ? 'Supprimer ce bilan ?' : 'Supprimer cette séance ?', (isBilan(s) ? 'Le bilan du ' + (s.date || '') + ' sera définitivement supprimé.' : 'La séance du ' + (s.date || '') + (s.title ? ' « ' + s.title + ' »' : '') + ' sera définitivement supprimée.'), run);
    } else { run(); }
  }

  function addSubject(name, color) {
    name = (name || '').trim();
    if (!name) return false;
    var exists = subjects().some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); });
    if (exists) return false;
    var s = { id: uid(), name: name, color: color || nextColor() };
    subjects().push(s);
    save();
    return s;
  }

  function deleteSubject(id) {
    var s = subjectById(id);
    if (!s) return;
    var n = countFor(id);
    var run = function () {
      state.sessionSubjects = subjects().filter(function (x) { return x.id !== id; });
      sessions().forEach(function (x) { if (x.subjectId === id) x.subjectId = null; });
      if (ui.filter === id) ui.filter = 'all';
      save(); renderAll();
    };
    var msg = n
      ? 'L’étiquette « ' + s.name + ' » sera supprimée. Tes ' + n + ' séance' + (n > 1 ? 's' : '') + ' seront conservées, mais sans étiquette.'
      : 'L’étiquette « ' + s.name + ' » sera supprimée.';
    if (typeof showConfirmModal === 'function') showConfirmModal('Supprimer l’étiquette ?', msg, run);
    else run();
  }

  // ------------------------------------------------------------
  // Événements
  // ------------------------------------------------------------
  function bind(root) {
    // Barre d'outils : ne pas voler la sélection du texte
    var tb = $('sv-toolbar');
    tb.addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) e.preventDefault();
    });
    tb.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.svcmd) exec(b.dataset.svcmd);
      else if (b.dataset.svcolor) exec('foreColor', b.dataset.svcolor);
      else if (b.dataset.svhi) exec('hiliteColor', b.dataset.svhi);
      else if (b.dataset.svblock) {
        restoreSelection();
        var cur = '';
        try { cur = String(document.queryCommandValue('formatBlock') || '').toUpperCase(); } catch (er) {}
        document.execCommand('formatBlock', false, cur === b.dataset.svblock ? 'DIV' : b.dataset.svblock);
        rememberSelection();
      }
    });
    $('sv-font').addEventListener('change', function () {
      if (this.value) exec('fontName', this.value);
      else { restoreSelection(); document.execCommand('fontName', false, 'inherit'); }
    });
    $('sv-size').addEventListener('change', function () { exec('fontSize', this.value); });
    $('sv-color-custom').addEventListener('input', function () { exec('foreColor', this.value); });

    var ed = editor();
    ed.addEventListener('keyup', function () { rememberSelection(); refreshToolbarState(); });
    ed.addEventListener('mouseup', function () { rememberSelection(); refreshToolbarState(); });
    ed.addEventListener('blur', rememberSelection);
    ed.addEventListener('input', function () { $('sv-error').textContent = ''; });
    ed.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveSession(); }
    });
    // Collage en texte brut : pas de styles venus d'ailleurs
    ed.addEventListener('paste', function (e) {
      var cd = e.clipboardData || window.clipboardData;
      if (!cd) return;
      e.preventDefault();
      var txt = cd.getData('text/plain');
      document.execCommand('insertText', false, txt);
    });

    $('sv-save').addEventListener('click', saveSession);
    $('sv-bilan-toggle').addEventListener('click', function () { setBilanOpen(!ui.bilanOpen); });
    $('sv-bilan-save').addEventListener('click', saveBilan);
    $('sv-bilan-cancel').addEventListener('click', function () { resetBilanForm(); });
    $('sv-bilan-date').addEventListener('change', onBilanDateChange);
    $('sv-bilan-body').addEventListener('input', function () { $('sv-bilan-error').textContent = ''; });
    $('sv-cancel').addEventListener('click', resetEditor);

    // Matières
    $('sv-add-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('sv-new-name');
      var created = addSubject(inp.value, $('sv-new-color').value);
      if (created) {
        inp.value = '';
        $('sv-new-color').value = nextColor();
        renderAll();
        $('sv-subject').value = created.id;
      } else {
        inp.focus();
      }
    });
    $('sv-new-color').value = nextColor();

    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.svsubname) {
        var s = subjectById(t.dataset.svsubname);
        var v = t.value.trim();
        var dup = subjects().some(function (x) { return x.id !== s.id && x.name.toLowerCase() === v.toLowerCase(); });
        if (s && v && !dup) { s.name = v; save(); renderAll(); } else if (s) { t.value = s.name; }
      } else if (t.dataset.svsubcolor) {
        var s2 = subjectById(t.dataset.svsubcolor);
        if (s2) { s2.color = t.value; save(); renderAll(); }
      }
    });

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-svfilter],[data-svview],[data-svedit],[data-svdel],[data-svsubdel]');
      if (!t) return;
      if (t.dataset.svfilter) { ui.filter = t.dataset.svfilter; renderFilters(); renderTimeline(); }
      else if (t.dataset.svview) { ui.view = t.dataset.svview; renderFilters(); renderTimeline(); }
      else if (t.dataset.svedit) startEdit(t.dataset.svedit);
      else if (t.dataset.svdel) deleteSession(t.dataset.svdel);
      else if (t.dataset.svsubdel) deleteSubject(t.dataset.svsubdel);
    });

    $('sv-search').addEventListener('input', function () { ui.search = this.value; renderTimeline(); });
    document.addEventListener('selectionchange', function () {
      if (document.activeElement === editor()) { rememberSelection(); refreshToolbarState(); }
    });
  }

  // ------------------------------------------------------------
  // API publique
  // ------------------------------------------------------------
  function init(appState, saveFn, rootId) {
    state = appState;
    save = saveFn || function () {};
    if (!Array.isArray(state.sessionSubjects)) state.sessionSubjects = [];
    if (!Array.isArray(state.workSessions)) state.workSessions = [];
    var root = $(rootId || 'sv-mount');
    if (!root || mounted) return;
    mounted = true;
    root.innerHTML = shell();
    bind(root);
    $('sv-date').value = todayKey();
    renderAll();
    resetBilanForm();
    // Le dimanche, si le bilan n'est pas encore fait, la carte s'ouvre toute seule.
    if (new Date().getDay() === 0 && !bilanOnDate(todayKey())) setBilanOpen(true);
  }

  global.SuiviSeances = { init: init, sanitize: sanitize, refresh: function () { if (mounted) renderAll(); } };
})(window);
