/* ============================================================
   tampons.js — 印帳 Carnet de tampons, stickers "Kibi dango"
                et moral du jour.
   -------------------------------------------------------------
   Chargé par toutes les pages (après app.js). Il gère :
     - la collection de tampons (offerts + achetés avec des stickers)
     - le carnet mensuel : un tampon par jour, au bon jour du bon mois
     - la petite notification quotidienne "pose ton tampon du jour"
     - les stickers Kibi dango (gagnés puis échangés contre des tampons)
     - le moral du jour (une couleur par sentiment)
     - le temps d'étude ajouté à la main, qui s'additionne au Pomodoro
   Les données sont enregistrées dans localStorage (et incluses dans
   la sauvegarde .json grâce aux clés déclarées dans app.js).
   ============================================================ */
(function (global) {
  'use strict';

  var KEYS = {
    stampBook: 'benkyo_stamp_book',
    stickers: 'benkyo_stickers',
    moods: 'benkyo_moods',
    manualStudy: 'benkyo_manual_study'
  };

  // ------------------------------------------------------------
  // Catalogue des tampons — tous différents du tampon 済 utilisé
  // pour la validation des résultats dans "Mes résultats".
  // ------------------------------------------------------------
  // Le grain d'encre (feTurbulence) est coûteux à calculer : avant, il était
  // appliqué à CHAQUE forme (jusqu'à 17 fois par tampon !), ce qui faisait
  // ramer la modale « tampon du jour » qui en affiche une dizaine.
  // Maintenant : un seul filtre, appliqué une seule fois au groupe entier,
  // et le résultat HTML est mis en cache par tampon.
  var SEAL_CACHE = {};
  function seal(opts) {
    if (SEAL_CACHE[opts.id]) return SEAL_CACHE[opts.id];
    var ink = opts.ink;
    var uid = 'tp_' + opts.id;
    var shape = '';
    if (opts.shape === 'square') {
      shape = '<rect x="10" y="10" width="100" height="100" rx="16" fill="' + ink + '"/>' +
        '<rect x="19" y="19" width="82" height="82" rx="10" fill="none" stroke="#fff" stroke-width="2.6" opacity="0.9"/>';
    } else if (opts.shape === 'flower') {
      var petals = '';
      for (var i = 0; i < 8; i++) {
        petals += '<ellipse cx="60" cy="16" rx="17" ry="20" fill="' + ink + '" transform="rotate(' + (i * 45) + ' 60 60)"/>';
      }
      shape = petals + '<circle cx="60" cy="60" r="40" fill="' + ink + '"/>' +
        '<circle cx="60" cy="60" r="33" fill="none" stroke="#fff" stroke-width="2.4" opacity="0.9"/>';
    } else if (opts.shape === 'scallop') {
      var scal = '';
      for (var j = 0; j < 16; j++) {
        scal += '<circle cx="60" cy="12" r="9" fill="' + ink + '" transform="rotate(' + (j * 22.5) + ' 60 60)"/>';
      }
      shape = scal + '<circle cx="60" cy="60" r="46" fill="' + ink + '"/>' +
        '<circle cx="60" cy="60" r="37" fill="none" stroke="#fff" stroke-width="2.4" opacity="0.9"/>';
    } else {
      shape = '<circle cx="60" cy="60" r="52" fill="' + ink + '"/>' +
        '<circle cx="60" cy="60" r="52" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="2.4" opacity="0.5"/>' +
        '<circle cx="60" cy="60" r="42" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.9"/>';
    }
    var svg = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tampon ' + opts.name + '">' +
      '<defs><filter id="' + uid + '" x="-15%" y="-15%" width="130%" height="130%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="' + (opts.seed || 12) + '" result="g"/>' +
      '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0" result="ga"/>' +
      '<feComponentTransfer in="ga" result="gb"><feFuncA type="linear" slope="0.4" intercept="0.64"/></feComponentTransfer>' +
      '<feComposite in="SourceGraphic" in2="gb" operator="in"/></filter></defs>' +
      '<g filter="url(#' + uid + ')">' +
      '<g transform="rotate(-7 60 60) translate(60 60) scale(0.82) translate(-60 -60)">' + shape +
      '<text x="60" y="78" text-anchor="middle" font-family="\'Noto Serif JP\',\'Hiragino Mincho ProN\',serif" font-size="' + (opts.size || 46) + '" fill="#ffffff" font-weight="700">' + opts.kanji + '</text>' +
      '</g></g></svg>';
    SEAL_CACHE[opts.id] = svg;
    return svg;
  }


  var STAMPS = [
    { id: 'sakura', name: 'Sakura', jp: '桜', kanji: '桜', ink: '#C97D5D', shape: 'flower', cost: 0, seed: 3 },
    { id: 'hinode', name: 'Soleil levant', jp: '日', kanji: '日', ink: '#C97D5D', shape: 'circle', cost: 0, seed: 7 },
    { id: 'mikazuki', name: 'Croissant de lune', jp: '月', kanji: '月', ink: '#526B4E', shape: 'circle', cost: 1, seed: 11 },
    { id: 'hoshi', name: 'Étoile', jp: '星', kanji: '星', ink: '#526B4E', shape: 'square', cost: 1, seed: 15 },
    { id: 'neko', name: 'Chat porte-bonheur', jp: '猫', kanji: '猫', ink: '#C97D5D', shape: 'scallop', cost: 1, seed: 19 },
    { id: 'ame', name: 'Pluie douce', jp: '雨', kanji: '雨', ink: '#526B4E', shape: 'circle', cost: 1, seed: 23 },
    { id: 'koi', name: 'Carpe koï', jp: '鯉', kanji: '鯉', ink: '#C97D5D', shape: 'scallop', cost: 2, seed: 27 },
    { id: 'kame', name: 'Tortue de longévité', jp: '亀', kanji: '亀', ink: '#526B4E', shape: 'square', cost: 2, seed: 31 },
    { id: 'tori', name: 'Torii', jp: '鳥', kanji: '鳥', ink: '#C97D5D', shape: 'flower', cost: 2, seed: 35 },
    { id: 'yuki', name: 'Flocon d\'hiver', jp: '雪', kanji: '雪', ink: '#8FA58B', shape: 'scallop', cost: 2, seed: 39 },
    { id: 'ryu', name: 'Dragon', jp: '龍', kanji: '龍', ink: '#3E352D', shape: 'square', cost: 3, seed: 43 },
    { id: 'fuji', name: 'Mont Fuji', jp: '富', kanji: '富', ink: '#526B4E', shape: 'flower', cost: 3, seed: 47 },
    { id: 'kin', name: 'Sceau d\'or', jp: '金', kanji: '金', ink: '#8A5F3E', shape: 'scallop', cost: 3, seed: 51 }
  ];

  function stampById(id) {
    for (var i = 0; i < STAMPS.length; i++) if (STAMPS[i].id === id) return STAMPS[i];
    return STAMPS[0];
  }
  function stampSVG(id) { return seal(stampById(id)); }

  // Sticker "Kibi dango" (団子) : trois boulettes sur une brochette.
  function stickerSVG() {
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" class="tp-sticker" role="img" aria-label="Sticker Kibi dango">' +
      '<rect x="57" y="12" width="6" height="96" rx="3" fill="#B88758"/>' +
      '<circle cx="60" cy="34" r="21" fill="#E4A982" stroke="#E4A982" stroke-width="2.5"/>' +
      '<circle cx="60" cy="62" r="21" fill="#FAF8F0" stroke="#E9E1D0" stroke-width="2.5"/>' +
      '<circle cx="60" cy="90" r="21" fill="#B7C5A3" stroke="#B7C5A3" stroke-width="2.5"/>' +
      '<circle cx="53" cy="28" r="4" fill="#fff" opacity="0.75"/>' +
      '</svg>';
  }


  // ------------------------------------------------------------
  // Accord en genre (fille / garçon / autre) d'après "Mon profil"
  // ------------------------------------------------------------
  function profileGender() {
    try {
      var p = JSON.parse(localStorage.getItem('benkyo_profile') || 'null');
      var g = p && p.gender ? String(p.gender).toLowerCase() : '';
      if (g.indexOf('fille') === 0 || g === 'f') return 'f';
      if (g.indexOf('gar') === 0 || g === 'm') return 'm';
      if (g) return 'n';
    } catch (e) {}
    return 'n';
  }
  // g('motivé','motivée','motivé·e')
  function g(masc, fem, neutre) {
    var gd = profileGender();
    if (gd === 'f') return fem;
    if (gd === 'm') return masc;
    return neutre === undefined ? masc : neutre;
  }

  // ------------------------------------------------------------
  // Humeurs (une couleur par sentiment)
  // ------------------------------------------------------------
  var MOODS = [
    { id: 'productive', m: 'Productif', f: 'Productive', n: 'Productif·ve', color: '#B7C5A3', hard: false },
    { id: 'sereine', m: 'Serein', f: 'Sereine', n: 'Serein·e', color: '#B7C5A3', hard: false },
    { id: 'motivee', m: 'Motivé', f: 'Motivée', n: 'Motivé·e', color: '#E4A982', hard: false },
    { id: 'stressee', m: 'Stressé', f: 'Stressée', n: 'Stressé·e', color: '#D9C58C', hard: true },
    { id: 'triste', m: 'Triste', f: 'Triste', n: 'Triste', color: '#B7C5A3', hard: true },
    { id: 'pas_productive', m: 'Pas productif', f: 'Pas productive', n: 'Pas productif·ve', color: '#B7C5A3', hard: true },
    { id: 'fatiguee', m: 'Fatigué', f: 'Fatiguée', n: 'Fatigué·e', color: '#E9E1D0', hard: true }
  ];
  function moodLabel(mood) { return mood ? g(mood.m, mood.f, mood.n) : ''; }
  MOODS.forEach(function (mo) {
    Object.defineProperty(mo, 'label', { get: function () { return moodLabel(this); } });
  });
  function moodById(id) {
    for (var i = 0; i < MOODS.length; i++) if (MOODS[i].id === id) return MOODS[i];
    return null;
  }

  // ------------------------------------------------------------
  // Stockage
  // ------------------------------------------------------------
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      var v = JSON.parse(raw);
      return (v === null || v === undefined) ? fallback : v;
    } catch (e) { return fallback; }
  }

  var data = {
    stampBook: read(KEYS.stampBook, null) || { entries: {}, owned: ['sakura', 'hinode'], selected: 'sakura' },
    stickers: read(KEYS.stickers, null) || { awarded: {}, spent: 0 },
    moods: read(KEYS.moods, null) || {},
    manualStudy: read(KEYS.manualStudy, null) || {}
  };
  if (!data.stampBook.entries) data.stampBook.entries = {};
  if (!data.stampBook.owned || !data.stampBook.owned.length) data.stampBook.owned = ['sakura', 'hinode'];
  if (!data.stampBook.selected) data.stampBook.selected = data.stampBook.owned[0];
  if (!data.stickers.awarded) data.stickers.awarded = {};
  if (typeof data.stickers.spent !== 'number') data.stickers.spent = 0;

  // Recharge depuis le localStorage (une autre page/onglet a pu écrire).
  function reload() {
    var sb = read(KEYS.stampBook, null);
    if (sb && sb.entries) {
      Object.keys(sb.entries).forEach(function (k) {
        if (!data.stampBook.entries[k]) data.stampBook.entries[k] = sb.entries[k];
      });
      if (sb.owned && sb.owned.length) {
        sb.owned.forEach(function (id) {
          if (data.stampBook.owned.indexOf(id) === -1) data.stampBook.owned.push(id);
        });
      }
    }
  }

  function persist() {
    reload();
    try {
      localStorage.setItem(KEYS.stampBook, JSON.stringify(data.stampBook));
      localStorage.setItem(KEYS.stickers, JSON.stringify(data.stickers));
      localStorage.setItem(KEYS.moods, JSON.stringify(data.moods));
      localStorage.setItem(KEYS.manualStudy, JSON.stringify(data.manualStudy));
    } catch (e) {
      console.error('[Benkyo] Sauvegarde du carnet de tampons impossible', e);
    }
    // Si la page garde un objet `state` global, on le tient à jour aussi.
    if (global.state) {
      global.state.stampBook = data.stampBook;
      global.state.stickers = data.stickers;
      global.state.moods = data.moods;
      global.state.manualStudy = data.manualStudy;
    }
  }

  // Les pages sauvegardent leur propre copie du `state` (chargée avant nos
  // modifications) : on injecte systématiquement nos données à jour pour
  // qu'elles ne soient jamais écrasées par une version périmée.
  function guardStorage() {
    if (!global.BenkyoStorage) return;
    ['save', 'saveDebounced', 'flush'].forEach(function (fn) {
      var orig = global.BenkyoStorage[fn];
      if (typeof orig !== 'function') return;
      global.BenkyoStorage[fn] = function (st) {
        if (st && typeof st === 'object') {
          st.stampBook = data.stampBook;
          st.stickers = data.stickers;
          st.moods = data.moods;
          st.manualStudy = data.manualStudy;
        }
        return orig.apply(this, arguments);
      };
    });
    // Le temps ajouté à la main s'additionne au temps Pomodoro partout dans
    // le site (résultats, progression, bilans...).
    var origRange = global.BenkyoStorage.getStudyMinutesInRange;
    if (typeof origRange === 'function') {
      global.BenkyoStorage.getStudyMinutesInRange = function (st, from, to) {
        return origRange.apply(this, arguments) + manualMinutesInRange(from, to);
      };
    }
  }

  // ------------------------------------------------------------
  // Dates & calculs
  // ------------------------------------------------------------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) {
    var p = String(k).split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }
  function todayKey() { return dateKey(new Date()); }

  function manualMinutesInRange(from, to) {
    var total = 0;
    Object.keys(data.manualStudy).forEach(function (k) {
      var d = parseKey(k);
      if (!d) return;
      if (from && d < new Date(from.getFullYear(), from.getMonth(), from.getDate())) return;
      if (to && d > to) return;
      total += Number(data.manualStudy[k]) || 0;
    });
    return total;
  }

  function pomodoroLog() { return (read('benkyo_stats', {}) || {}).dailyLog || {}; }

  function minutesOnDay(key) {
    return (Number(pomodoroLog()[key]) || 0) + (Number(data.manualStudy[key]) || 0);
  }
  function totalMinutes() {
    var log = pomodoroLog();
    var sum = 0;
    Object.keys(log).forEach(function (k) { sum += Number(log[k]) || 0; });
    Object.keys(data.manualStudy).forEach(function (k) { sum += Number(data.manualStudy[k]) || 0; });
    return sum;
  }
  function pomodoroMinutes() {
    var log = pomodoroLog();
    var sum = 0;
    Object.keys(log).forEach(function (k) { sum += Number(log[k]) || 0; });
    return sum;
  }
  function formatMinutes(m) {
    m = Math.max(0, Math.round(Number(m) || 0));
    var h = Math.floor(m / 60);
    return h > 0 ? (h + ' h ' + pad(m % 60)) : (m + ' min');
  }

  function stampKeys() { return Object.keys(data.stampBook.entries); }
  function stampCount() { return stampKeys().length; }
  function hasStampedToday() { return !!data.stampBook.entries[todayKey()]; }

  // Plus longue série de jours tamponnés consécutifs.
  function bestStreak() {
    var keys = stampKeys().sort();
    var best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var d = parseKey(k);
      if (!d) return;
      if (prev && (d - prev) === 86400000) run++;
      else run = 1;
      prev = d;
      if (run > best) best = run;
    });
    return best;
  }
  function currentStreak() {
    var run = 0;
    var d = new Date();
    if (!data.stampBook.entries[dateKey(d)]) d.setDate(d.getDate() - 1);
    while (data.stampBook.entries[dateKey(d)]) { run++; d.setDate(d.getDate() - 1); }
    return run;
  }

  // ------------------------------------------------------------
  // Stickers Kibi dango
  // ------------------------------------------------------------
  var AWARD_LABELS = {
    stamp20: '20 jours tamponnés',
    streak30: '30 jours de travail d\'affilée',
    pomo25h: '25 h d\'étude au Pomodoro',
    total100h: '100 h de travail au total',
    day4h: '4 h de travail dans la journée',
    sept1: 'Tampon du 1er septembre',
    jan1: 'Tampon du 1er janvier',
    mood: 'Travaillé malgré un moral difficile'
  };

  function grant(key, label) {
    if (data.stickers.awarded[key]) return false;
    data.stickers.awarded[key] = { label: label, at: new Date().toISOString() };
    return true;
  }

  function stickerBalance() {
    return Object.keys(data.stickers.awarded).length - (data.stickers.spent || 0);
  }

  // Recalcule tous les stickers mérités. Retourne les nouveaux libellés.
  function computeAwards() {
    var newly = [];
    var add = function (key, label) { if (grant(key, label)) newly.push(label); };

    var stamps = stampCount();
    for (var n = 1; n <= Math.floor(stamps / 20); n++) {
      add('stamp20-' + n, AWARD_LABELS.stamp20 + ' (×' + n + ')');
    }
    var streak = bestStreak();
    for (var s = 1; s <= Math.floor(streak / 30); s++) {
      add('streak30-' + s, AWARD_LABELS.streak30 + ' (×' + s + ')');
    }
    if (pomodoroMinutes() >= 25 * 60) add('pomo25h', AWARD_LABELS.pomo25h);
    if (totalMinutes() >= 100 * 60) add('total100h', AWARD_LABELS.total100h);

    var log = pomodoroLog();
    var days = {};
    Object.keys(log).forEach(function (k) { days[k] = true; });
    Object.keys(data.manualStudy).forEach(function (k) { days[k] = true; });
    Object.keys(days).forEach(function (k) {
      if (minutesOnDay(k) >= 240) add('day4h-' + k, AWARD_LABELS.day4h + ' — ' + k);
      var mood = moodById(data.moods[k]);
      if (mood && mood.hard && minutesOnDay(k) >= 20) {
        add('mood-' + k, AWARD_LABELS.mood + ' (' + mood.label.toLowerCase() + ')');
      }
    });

    stampKeys().forEach(function (k) {
      var d = parseKey(k);
      if (!d) return;
      if (d.getMonth() === 8 && d.getDate() === 1) add('sept1-' + d.getFullYear(), AWARD_LABELS.sept1 + ' ' + d.getFullYear());
      if (d.getMonth() === 0 && d.getDate() === 1) add('jan1-' + d.getFullYear(), AWARD_LABELS.jan1 + ' ' + d.getFullYear());
    });

    if (newly.length) persist();
    return newly;
  }

  // Point d'entrée unique : recalcule et annonce TOUT nouveau sticker,
  // quelle qu'en soit la raison (tampon, moral, heures, pomodoro, dates...).
  function checkAwards(silent) {
    var newly = computeAwards();
    if (newly.length && !silent) {
      renderSidebarBadge();
      announceStickers(newly);
    }
    return newly;
  }

  // ------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------
  function selectStamp(id) {
    if (data.stampBook.owned.indexOf(id) === -1) return false;
    data.stampBook.selected = id;
    persist();
    refreshAll();
    return true;
  }

  function stampToday(stampId) {
    var key = todayKey();
    if (data.stampBook.entries[key]) return false;
    var id = stampId || data.stampBook.selected;
    if (data.stampBook.owned.indexOf(id) === -1) id = data.stampBook.owned[0];
    data.stampBook.entries[key] = { stampId: id, at: new Date().toISOString() };
    data.stampBook.selected = id;
    persist();
    checkAwards();
    celebrate();
    refreshAll();
    return true;
  }

  function buyStamp(id) {
    var stamp = stampById(id);
    if (data.stampBook.owned.indexOf(id) !== -1) return false;
    if (stickerBalance() < stamp.cost) return false;
    data.stickers.spent = (data.stickers.spent || 0) + stamp.cost;
    data.stampBook.owned.push(id);
    data.stampBook.selected = id;
    persist();
    refreshAll();
    celebrate();
    return true;
  }

  function setMood(id, key) {
    var k = key || todayKey();
    if (data.moods[k] === id) delete data.moods[k];
    else data.moods[k] = id;
    persist();
    checkAwards();
    refreshAll();
  }

  function setManualMinutes(key, minutes) {
    var k = key || todayKey();
    var m = Math.max(0, Math.round(Number(minutes) || 0));
    if (m === 0) delete data.manualStudy[k];
    else data.manualStudy[k] = m;
    persist();
    checkAwards();
    refreshAll();
  }
  function addManualMinutes(minutes, key) {
    var k = key || todayKey();
    setManualMinutes(k, (Number(data.manualStudy[k]) || 0) + Number(minutes || 0));
  }

  function celebrate() {
    if (typeof global.confetti === 'function') {
      global.confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 }, colors: ['#C97D5D', '#E4A982', '#B7C5A3'] });
    }
  }

  // ------------------------------------------------------------
  // Rendu — carnet
  // ------------------------------------------------------------
  var viewMonth = new Date();
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);

  function shiftMonth(delta) {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
    renderCarnet();
    renderMood();
  }

  function monthGrid(base, cellRenderer) {
    var first = new Date(base.getFullYear(), base.getMonth(), 1);
    var offset = (first.getDay() + 6) % 7; // lundi en premier
    var daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    var html = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (d) {
      return '<div class="tp-dow">' + d + '</div>';
    }).join('');
    for (var i = 0; i < offset; i++) html += '<div class="tp-day is-empty"></div>';
    for (var day = 1; day <= daysInMonth; day++) {
      html += cellRenderer(new Date(base.getFullYear(), base.getMonth(), day));
    }
    return html;
  }

  function renderCarnet() {
    var root = document.getElementById('tp-carnet-root');
    if (!root) return;
    var monthLabel = viewMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    var today = todayKey();
    var stampedThisMonth = 0;

    var grid = monthGrid(viewMonth, function (d) {
      var k = dateKey(d);
      var entry = data.stampBook.entries[k];
      if (entry) stampedThisMonth++;
      var mood = moodById(data.moods[k]);
      var cls = 'tp-day' + (entry ? ' is-stamped' : '') + (k === today ? ' is-today' : '');
      var inner = entry ? stampSVG(entry.stampId) : '';
      var dot = mood ? '<span class="tp-mood-dot" style="background:' + mood.color + '" title="' + mood.label + '"></span>' : '';
      return '<div class="' + cls + '" title="' + d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (entry ? ' — ' + stampById(entry.stampId).name : '') + '">' +
        '<span class="tp-day-num">' + d.getDate() + '</span>' + inner + dot + '</div>';
    });

    root.innerHTML =
      '<div class="tp-card">' +
        '<div class="tp-notebook-head">' +
          '<div>' +
            '<h2 class="tp-title">Mon carnet de tampons</h2>' +
            '<p class="tp-sub">Un tampon par jour travaillé, posé au bon jour du bon mois.</p>' +
          '</div>' +
          '<div class="tp-badges">' +
            '<span class="tp-badge">' + stampCount() + ' tampon' + (stampCount() > 1 ? 's' : '') + '</span>' +
            '<span class="tp-badge">Série : ' + currentStreak() + ' j</span>' +
          '</div>' +
        '</div>' +
        '<div class="tp-notebook">' +
          '<div class="tp-notebook-head">' +
            '<button class="tp-nav-btn" onclick="BenkyoTampons.shiftMonth(-1)" aria-label="Mois précédent">‹</button>' +
            '<span class="tp-month">' + monthLabel + ' · ' + stampedThisMonth + ' tampon' + (stampedThisMonth > 1 ? 's' : '') + '</span>' +
            '<button class="tp-nav-btn" onclick="BenkyoTampons.shiftMonth(1)" aria-label="Mois suivant">›</button>' +
          '</div>' +
          '<div class="tp-grid">' + grid + '</div>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:16px;">' +
          (hasStampedToday()
            ? '<span class="tp-badge">Tampon du jour déjà posé</span>'
            : '<button class="tp-btn tp-btn-primary" onclick="BenkyoTampons.openStampModal()">Poser mon tampon du jour</button>') +
          '<span class="tp-sub">Le carnet garde la trace du tampon choisi chaque jour.</span>' +
        '</div>' +
      '</div>';
  }

  // ------------------------------------------------------------
  // Rendu — collection & boutique
  // ------------------------------------------------------------
  function renderCollection() {
    var root = document.getElementById('tp-collection-root');
    if (!root) return;
    var balance = stickerBalance();

    var owned = STAMPS.filter(function (s) { return data.stampBook.owned.indexOf(s.id) !== -1; });
    var shop = STAMPS.filter(function (s) { return data.stampBook.owned.indexOf(s.id) === -1; });

    var ownedHTML = owned.map(function (s) {
      var sel = data.stampBook.selected === s.id;
      return '<div class="tp-shop-item is-owned' + (sel ? ' is-selected' : '') + '">' +
        stampSVG(s.id) +
        '<div class="tp-shop-name">' + s.name + '</div>' +
        '<div class="tp-shop-jp">' + s.jp + '</div>' +
        (sel ? '<div class="tp-shop-cost">Tampon actuel</div>'
             : '<button class="tp-btn tp-btn-ghost" style="margin-top:8px" onclick="BenkyoTampons.selectStamp(\'' + s.id + '\')">Utiliser</button>') +
        '</div>';
    }).join('');

    var shopHTML = shop.map(function (s) {
      var can = balance >= s.cost;
      return '<div class="tp-shop-item' + (can ? '' : ' is-locked') + '">' +
        stampSVG(s.id) +
        '<div class="tp-shop-name">' + s.name + '</div>' +
        '<div class="tp-shop-jp">' + s.jp + '</div>' +
        '<div class="tp-shop-cost">' + s.cost + ' sticker' + (s.cost > 1 ? 's' : '') + '</div>' +
        '<button class="tp-btn ' + (can ? 'tp-btn-primary' : 'tp-btn-ghost') + '" style="margin-top:8px"' + (can ? '' : ' disabled') +
          ' onclick="BenkyoTampons.buyStamp(\'' + s.id + '\')">' + (can ? 'Échanger' : 'Bloqué') + '</button>' +
        '</div>';
    }).join('');

    var history = Object.keys(data.stickers.awarded).map(function (k) {
      return data.stickers.awarded[k];
    }).sort(function (a, b) { return new Date(b.at) - new Date(a.at); }).slice(0, 12).map(function (a) {
      return '<li><span>' + a.label + '</span><span>' + new Date(a.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + '</span></li>';
    }).join('');

    var stickersHTML =
      '<div class="tp-card">' +
        '<h2 class="tp-title">Mes stickers Kibi dango</h2>' +
        '<p class="tp-sub">Gagne des stickers, puis échange-les contre de nouveaux tampons.</p>' +
        '<div class="tp-inner" style="margin-top:14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">' +
          stickerSVG() +
          '<div>' +
            '<div style="font-size:1.6rem;font-weight:800;color:var(--bento-text-primary)">' + balance + ' sticker' + (balance > 1 ? 's' : '') + '</div>' +
            '<div class="tp-sub">' + Object.keys(data.stickers.awarded).length + ' gagné(s) · ' + (data.stickers.spent || 0) + ' dépensé(s)</div>' +
          '</div>' +
        '</div>' +
        '<div class="tp-inner" style="margin-top:14px">' +
          '<div style="font-weight:800;font-size:0.8rem;color:var(--bento-text-primary)">Comment en gagner ?</div>' +
          '<ul style="margin:8px 0 0;padding-left:18px;font-size:0.74rem;color:var(--bento-text-muted);line-height:1.7">' +
            '<li>20 jours tamponnés dans le carnet (puis tous les 20 jours)</li>' +
            '<li>30 jours de travail d\'affilée</li>' +
            '<li>25 h d\'étude cumulées au Pomodoro</li>' +
            '<li>100 h de travail au total</li>' +
            '<li>4 h de travail dans une même journée</li>' +
            '<li>Travailler malgré un moral difficile (triste, stressée, pas productive…)</li>' +
            '<li>Le tampon du 1er septembre et celui du 1er janvier</li>' +
          '</ul>' +
          (history ? '<ul class="tp-history">' + history + '</ul>' : '') +
        '</div>' +
      '</div>';

    var collectionHTML =
      '<div class="tp-card">' +
        '<h2 class="tp-title">Ma collection de tampons</h2>' +
        '<p class="tp-sub">Choisis le tampon que tu utiliseras pour ta prochaine journée.</p>' +
        '<div class="tp-shop-grid" style="margin-top:14px">' + ownedHTML + '</div>' +
      '</div>';

    var boutiqueHTML =
      (shopHTML ?
      '<div class="tp-card">' +
        '<h2 class="tp-title">Boutique de tampons</h2>' +
        '<p class="tp-sub">Les plus beaux tampons coûtent 2 ou 3 stickers Kibi dango.</p>' +
        '<div class="tp-shop-grid" style="margin-top:14px">' + shopHTML + '</div>' +
      '</div>' : '');

    var stickersRoot = document.getElementById('tp-stickers-root');
    var shopRoot = document.getElementById('tp-shop-root');
    if (stickersRoot) stickersRoot.innerHTML = stickersHTML;
    if (shopRoot) shopRoot.innerHTML = boutiqueHTML;
    root.innerHTML =
      (stickersRoot ? '' : stickersHTML) +
      collectionHTML +
      (shopRoot ? '' : boutiqueHTML);
  }

  // ------------------------------------------------------------
  // Rendu — moral du jour
  // ------------------------------------------------------------
  function renderMood() {
    var root = document.getElementById('tp-mood-root');
    if (!root) return;
    var today = todayKey();
    var current = data.moods[today];

    var buttons = MOODS.map(function (m) {
      var active = current === m.id;
      return '<button class="tp-mood-btn' + (active ? ' is-active' : '') + '"' +
        (active ? ' style="background:' + m.color + '"' : '') +
        ' onclick="BenkyoTampons.setMood(\'' + m.id + '\')">' +
        '<span class="tp-mood-swatch" style="background:' + (active ? '#ffffff' : m.color) + '"></span>' +
        m.label + '</button>';
    }).join('');

    var grid = monthGrid(viewMonth, function (d) {
      var k = dateKey(d);
      var mood = moodById(data.moods[k]);
      var style = mood ? ' style="background:' + mood.color + '22;border-color:' + mood.color + '"' : '';
      return '<div class="tp-day' + (k === today ? ' is-today' : '') + '"' + style +
        ' title="' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + (mood ? ' — ' + mood.label : '') + '">' +
        '<span class="tp-day-num">' + d.getDate() + '</span>' +
        (mood ? '<span class="tp-mood-fill" style="background:' + mood.color + '"></span>' : '') +
        '</div>';
    });

    var legend = MOODS.map(function (m) {
      return '<span><span class="tp-mood-swatch" style="background:' + m.color + '"></span>' + m.label + '</span>';
    }).join('');

    var pickerHTML =
      '<div class="tp-card">' +
        '<h2 class="tp-title">Mon moral du jour</h2>' +
        '<p class="tp-sub">Une couleur par sentiment. Si tu travailles quand même un jour difficile, tu gagnes un sticker Kibi dango.</p>' +
        '<div class="tp-mood-list" style="margin-top:14px">' + buttons + '</div>' +
        '<div class="tp-legend" style="margin-top:16px">' + legend + '</div>' +
      '</div>';

    var calendarHTML =
      '<div class="tp-card">' +
        '<h2 class="tp-title">Mon mois en couleur</h2>' +
        '<p class="tp-sub">Chaque jour se colore selon l\'humeur notée.</p>' +
        '<div class="tp-notebook" style="margin-top:14px">' +
          '<div class="tp-notebook-head">' +
            '<button class="tp-nav-btn" onclick="BenkyoTampons.shiftMonth(-1)" aria-label="Mois précédent">‹</button>' +
            '<span class="tp-month">' + viewMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</span>' +
            '<button class="tp-nav-btn" onclick="BenkyoTampons.shiftMonth(1)" aria-label="Mois suivant">›</button>' +
          '</div>' +
          '<div class="tp-grid">' + grid + '</div>' +
        '</div>' +
      '</div>';

    var calRoot = document.getElementById('tp-mood-cal-root');
    if (calRoot) {
      root.innerHTML = pickerHTML;
      calRoot.innerHTML = calendarHTML;
    } else {
      root.innerHTML = pickerHTML + calendarHTML;
    }
  }

  // ------------------------------------------------------------
  // Rendu — temps d'étude ajouté à la main
  // ------------------------------------------------------------
  function renderManual() {
    var root = document.getElementById('tp-manual-root');
    if (!root) return;
    var today = todayKey();
    var manual = Number(data.manualStudy[today]) || 0;
    var pomo = Number(pomodoroLog()[today]) || 0;

    root.innerHTML =
      '<div class="tp-card">' +
        '<h2 class="tp-title">Mon temps d\'étude du jour</h2>' +
        '<p class="tp-sub">Le Pomodoro compte automatiquement. Ajoute ici le temps travaillé sans Pomodoro : il s\'additionne au total.</p>' +
        '<div class="tp-inner" style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;text-align:center">' +
          '<div><div style="font-size:1.2rem;font-weight:800;color:var(--bento-text-primary)">' + formatMinutes(pomo) + '</div><div class="tp-sub">Pomodoro</div></div>' +
          '<div><div style="font-size:1.2rem;font-weight:800;color:var(--bento-text-primary)">' + formatMinutes(manual) + '</div><div class="tp-sub">Ajouté à la main</div></div>' +
          '<div><div style="font-size:1.2rem;font-weight:800;color:#8A5F3E">' + formatMinutes(pomo + manual) + '</div><div class="tp-sub">Total du jour</div></div>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px">' +
          '<button class="tp-btn tp-btn-ghost" onclick="BenkyoTampons.addManualMinutes(15)">+15 min</button>' +
          '<button class="tp-btn tp-btn-ghost" onclick="BenkyoTampons.addManualMinutes(30)">+30 min</button>' +
          '<button class="tp-btn tp-btn-ghost" onclick="BenkyoTampons.addManualMinutes(60)">+1 h</button>' +
          '<label class="tp-sub" for="tp-manual-input">Total du jour à la main :</label>' +
          '<input id="tp-manual-input" type="number" min="0" max="1440" step="5" value="' + manual + '" ' +
            'onchange="BenkyoTampons.setManualMinutes(null, this.value)" ' +
            'style="width:88px;padding:8px;border-radius:12px;border:1px solid var(--bento-border);text-align:center;font-weight:700">' +
          '<span class="tp-sub">min</span>' +
        '</div>' +
        '<p class="tp-sub" style="margin-top:10px">Cumul total (Pomodoro + ajouté) : <strong>' + formatMinutes(totalMinutes()) + '</strong></p>' +
      '</div>';
  }

  // ------------------------------------------------------------
  // Modale de tamponnage + notification quotidienne
  // ------------------------------------------------------------
  var pickerChoice = null;

  function ensureModal() {
    var el = document.getElementById('tp-stamp-modal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'tp-stamp-modal';
    el.className = 'tp-modal';
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  function openStampModal() {
    var el = ensureModal();
    pickerChoice = data.stampBook.selected;
    el.hidden = false;
    renderStampModal();
  }
  function closeStampModal() {
    var el = document.getElementById('tp-stamp-modal');
    if (el) el.hidden = true;
  }
  function pick(id) { pickerChoice = id; renderStampModal(); }

  function renderStampModal() {
    var el = document.getElementById('tp-stamp-modal');
    if (!el || el.hidden) return;
    var done = hasStampedToday();
    var todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    if (done) {
      var entry = data.stampBook.entries[todayKey()];
      el.innerHTML = '<div class="tp-modal-box">' +
        '<div style="width:150px;margin:0 auto" class="tp-stamping">' + stampSVG(entry.stampId) + '</div>' +
        '<h3 style="font-size:1.15rem;font-weight:800;margin:12px 0 4px">Tampon posé ! ' + stampById(entry.stampId).jp + '</h3>' +
        '<p class="tp-sub">' + todayLabel + ' — ton carnet est à jour. Continue comme ça !</p>' +
        '<button class="tp-btn tp-btn-primary" style="margin-top:16px" onclick="BenkyoTampons.closeStampModal()">Fermer</button>' +
        '</div>';
      return;
    }

    var picker = data.stampBook.owned.map(function (id) {
      var s = stampById(id);
      return '<button class="' + (pickerChoice === id ? 'is-active' : '') + '" onclick="BenkyoTampons.pick(\'' + id + '\')">' +
        stampSVG(id) + '<div class="tp-shop-name">' + s.name + '</div></button>';
    }).join('');

    el.innerHTML = '<div class="tp-modal-box">' +
      '<h3 style="font-size:1.2rem;font-weight:800;margin:0">Ton tampon du jour</h3>' +
      '<p class="tp-sub">' + todayLabel + ' · choisis le tampon à poser dans ton carnet.</p>' +
      '<div class="tp-picker">' + picker + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
        '<button class="tp-btn tp-btn-ghost" onclick="BenkyoTampons.closeStampModal()">Plus tard</button>' +
        '<button class="tp-btn tp-btn-primary" onclick="BenkyoTampons.stampToday(BenkyoTampons.currentPick())">Tamponner ce jour</button>' +
      '</div>' +
      '</div>';
  }

  function showDailyToast() {
    if (hasStampedToday()) return;
    if (document.getElementById('tp-daily-toast')) return;
    var el = document.createElement('div');
    el.id = 'tp-daily-toast';
    el.className = 'tp-toast';
    el.style.position = 'fixed';
    el.innerHTML =
      '<button class="tp-toast-close" onclick="this.parentNode.remove()" aria-label="Fermer"></button>' +
      stampSVG(data.stampBook.selected) +
      '<div class="tp-toast-body">' +
        '<div class="tp-toast-title">Ton tampon du jour t\'attend !</div>' +
        '<div class="tp-toast-text">Première visite de la journée : pose un tampon dans ton carnet pour marquer le coup.</div>' +
        '<button class="tp-btn tp-btn-primary" onclick="document.getElementById(\'tp-daily-toast\').remove();BenkyoTampons.openStampModal()">Choisir mon tampon</button>' +
      '</div>';
    document.body.appendChild(el);
  }

  // Animation plein écran (pastel / japon) à la réception d'un sticker
  function celebrateSticker(label) {
    var wrap = document.createElement('div');
    wrap.className = 'tp-celebrate';
    var petals = '';
    var colors = ['#E4A982', '#E4A982', '#B7C5A3', '#FAF8F0', '#E9E1D0'];
    for (var i = 0; i < 18; i++) {
      var left = Math.round(Math.random() * 96) + 2;
      var dur = (3 + Math.random() * 2.4).toFixed(2);
      var delay = (Math.random() * 1.2).toFixed(2);
      var size = 10 + Math.round(Math.random() * 10);
      petals += '<span class="tp-petal" style="left:' + left + '%;width:' + size + 'px;height:' + size +
        'px;background:' + colors[i % colors.length] + ';animation-duration:' + dur + 's;animation-delay:' + delay + 's"></span>';
    }
    wrap.innerHTML = petals +
      '<div class="tp-celebrate-core">' +
        // Le halo rose est placé DANS le même bloc que le dango pour que le
        // dango soit exactement au centre du cercle (avant, le halo était
        // centré sur l'ensemble « dango + étiquette », donc décalé).
        '<div class="tp-celebrate-dango">' +
          '<div class="tp-celebrate-halo"></div>' +
          stickerSVG() +
        '</div>' +
        '<div class="tp-celebrate-label">Sticker Kibi dango gagn\u00e9 !' +
          (label ? '<div style="font-weight:600;font-size:0.75rem;margin-top:4px;opacity:0.85">' + label + '</div>' : '') +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    setTimeout(function () { if (wrap.parentNode) wrap.remove(); }, 3800);
  }

  function announceStickers(labels) {
    (labels || ['']).forEach(function (lb, i) {
      setTimeout(function () { celebrateSticker(lb); }, i * 900);
    });
    var el = document.createElement('div');
    el.className = 'tp-toast';
    el.innerHTML =
      '<button class="tp-toast-close" onclick="this.parentNode.remove()" aria-label="Fermer"></button>' +
      stickerSVG() +
      '<div class="tp-toast-body">' +
        '<div class="tp-toast-title">Sticker Kibi dango gagné !</div>' +
        '<div class="tp-toast-text">' + labels.join('<br>') + '</div>' +
      '</div>';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 9000);
  }

  // ------------------------------------------------------------
  // Compteur de la barre latérale (remplace l'ancienne série de jours)
  // ------------------------------------------------------------
  // Petites icônes pastel pour les compteurs
  function miniStampIco() {
    return '<svg class="tp-badge-ico" viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="3" y="3" width="18" height="18" rx="5" fill="#E4A982" stroke="#E4A982" stroke-width="1.4"/>' +
      '<rect x="6" y="6" width="12" height="12" rx="3" fill="none" stroke="#fff" stroke-width="1.1" opacity="0.9"/>' +
      '<path d="M12 8.2v7.6M8.6 12h6.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' +
      '</svg>';
  }
  function miniDangoIco() {
    return '<svg class="tp-badge-ico" viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="11.1" y="2.5" width="1.8" height="19" rx="0.9" fill="#D9C58C"/>' +
      '<circle cx="12" cy="6.6" r="4" fill="#E4A982" stroke="#E4A982" stroke-width="1.1"/>' +
      '<circle cx="12" cy="12" r="4" fill="#FAF8F0" stroke="#E9E1D0" stroke-width="1.1"/>' +
      '<circle cx="12" cy="17.4" r="4" fill="#B7C5A3" stroke="#B7C5A3" stroke-width="1.1"/>' +
      '</svg>';
  }

  function badgesHTML() {
    return '<span class="tp-badge" title="Tampons posés dans le carnet">' + miniStampIco() + stampCount() +
      ' tampon' + (stampCount() > 1 ? 's' : '') + '</span>' +
      '<span class="tp-badge tp-badge--sticker" title="Stickers Kibi dango">' + miniDangoIco() + stickerBalance() +
      ' sticker' + (stickerBalance() > 1 ? 's' : '') + '</span>';
  }

  function renderSidebarBadge() {
    if (document.querySelector('[data-tp-badge]')) return;
    var old = document.getElementById('streak-count');
    var pill = old ? old.parentNode : null;
    if (!pill) return;
    var header = pill.parentNode;            // la ligne qui contient le nom "Benkyō"
    if (pill.parentNode) pill.parentNode.removeChild(pill);
    var bar = document.createElement('div');
    bar.className = 'tp-badges tp-badges-bar';
    bar.dataset.tpBadge = '1';
    bar.innerHTML = badgesHTML();
    bar.style.cursor = 'pointer';
    bar.onclick = function () {
      if (/profil\.html/.test(location.pathname)) {
        if (typeof global.switchProfileSubtab === 'function') global.switchProfileSubtab('tampons');
      } else {
        location.href = 'profil.html#tampons';
      }
    };
    if (header && header.parentNode) header.parentNode.insertBefore(bar, header.nextSibling);
  }

  // Accorde les mots marqués dans le HTML : data-g-m / data-g-f / data-g-n
  function applyGenderDom() {
    var nodes = document.querySelectorAll('[data-g-m]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.textContent = g(n.getAttribute('data-g-m'), n.getAttribute('data-g-f'), n.getAttribute('data-g-n'));
    }
  }

  function refreshAll() {
    applyGenderDom();
    renderCarnet();
    renderCollection();
    renderMood();
    renderManual();
    renderStampModal();
    var badgeHost = document.querySelector('[data-tp-badge]');
    if (badgeHost) badgeHost.innerHTML = badgesHTML();
  }

  function init() {
    guardStorage();
    checkAwards(true);
    renderSidebarBadge();
    refreshAll();
    watchAwards();
    // Notification de la première visite de la journée.
    var lastSeen = null;
    try { lastSeen = localStorage.getItem('benkyo_stamp_prompt'); } catch (e) {}
    if (lastSeen !== todayKey()) {
      try { localStorage.setItem('benkyo_stamp_prompt', todayKey()); } catch (e) {}
      setTimeout(showDailyToast, 900);
    }
  }

  // Surveillance continue : Pomodoro, changement de jour, autre onglet...
  function watchAwards() {
    var tick = function () {
      var got = checkAwards();
      if (got.length) refreshAll();
    };
    setInterval(tick, 8000);
    global.addEventListener('focus', tick);
    global.addEventListener('storage', tick);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) tick();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.BenkyoTampons = {
    STAMPS: STAMPS,
    MOODS: MOODS,
    data: data,
    stampSVG: stampSVG,
    stickerSVG: stickerSVG,
    celebrateSticker: celebrateSticker,
    stampCount: stampCount,
    stickerBalance: stickerBalance,
    hasStampedToday: hasStampedToday,
    currentStreak: currentStreak,
    totalMinutes: totalMinutes,
    manualMinutesInRange: manualMinutesInRange,
    formatMinutes: formatMinutes,
    selectStamp: selectStamp,
    stampToday: stampToday,
    buyStamp: buyStamp,
    setMood: setMood,
    setManualMinutes: setManualMinutes,
    addManualMinutes: addManualMinutes,
    shiftMonth: shiftMonth,
    openStampModal: openStampModal,
    closeStampModal: closeStampModal,
    pick: pick,
    currentPick: function () { return pickerChoice; },
    checkAwards: checkAwards,
    refresh: refreshAll,
    gender: profileGender,
    applyGender: applyGenderDom,
    g: g
  };
  global.benkyoG = g;
  global.applyBenkyoGender = applyGenderDom;
})(window);
