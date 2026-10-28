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
    // Édition limitée : anneau doré en pointillés + millésime sous le kanji.
    var ltdRing = opts.limited
      ? '<circle cx="60" cy="60" r="57" fill="none" stroke="#e0b450" stroke-width="2.2" stroke-dasharray="3 4.2" stroke-linecap="round"/>'
      : '';
    var kanjiY = opts.sub ? 72 : 78;
    var kanjiSize = opts.sub ? Math.min(opts.size || 46, 40) : (opts.size || 46);
    var subTxt = opts.sub
      ? '<text x="60" y="99" text-anchor="middle" font-family="\'Noto Serif JP\',\'Hiragino Mincho ProN\',serif" font-size="13" fill="#ffffff" font-weight="700" letter-spacing="1">' + opts.sub + '</text>'
      : '';
    var svg = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tampon ' + opts.name + '">' +
      '<defs><filter id="' + uid + '" x="-15%" y="-15%" width="130%" height="130%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="' + (opts.seed || 12) + '" result="g"/>' +
      '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0" result="ga"/>' +
      '<feComponentTransfer in="ga" result="gb"><feFuncA type="linear" slope="0.4" intercept="0.64"/></feComponentTransfer>' +
      '<feComposite in="SourceGraphic" in2="gb" operator="in"/></filter></defs>' +
      '<g filter="url(#' + uid + ')">' +
      '<g transform="rotate(-7 60 60) translate(60 60) scale(0.82) translate(-60 -60)">' + ltdRing + shape +
      '<text x="60" y="' + kanjiY + '" text-anchor="middle" font-family="\'Noto Serif JP\',\'Hiragino Mincho ProN\',serif" font-size="' + kanjiSize + '" fill="#ffffff" font-weight="700">' + opts.kanji + '</text>' +
      subTxt +
      '</g></g></svg>';
    SEAL_CACHE[opts.id] = svg;
    return svg;
  }


  // --- Tampons de la boutique (toujours disponibles) ---
  var STAMPS = [
    { id: 'sakura', name: 'Sakura', jp: '桜', kanji: '桜', ink: '#e05a86', shape: 'flower', cost: 0, seed: 3 },
    { id: 'hinode', name: 'Soleil levant', jp: '日', kanji: '日', ink: '#c1272d', shape: 'circle', cost: 0, seed: 7 },
    { id: 'mikazuki', name: 'Croissant de lune', jp: '月', kanji: '月', ink: '#4c5fd7', shape: 'circle', cost: 1, seed: 11 },
    { id: 'hoshi', name: 'Étoile', jp: '星', kanji: '星', ink: '#8b5cf6', shape: 'square', cost: 1, seed: 15 },
    { id: 'neko', name: 'Chat porte-bonheur', jp: '猫', kanji: '猫', ink: '#e08a2e', shape: 'scallop', cost: 1, seed: 19 },
    { id: 'ame', name: 'Pluie douce', jp: '雨', kanji: '雨', ink: '#0f8ea8', shape: 'circle', cost: 1, seed: 23 },
    { id: 'koi', name: 'Carpe koï', jp: '鯉', kanji: '鯉', ink: '#d9484b', shape: 'scallop', cost: 2, seed: 27 },
    { id: 'kame', name: 'Tortue de longévité', jp: '亀', kanji: '亀', ink: '#2f7d5d', shape: 'square', cost: 2, seed: 31 },
    { id: 'tori', name: 'Torii', jp: '鳥', kanji: '鳥', ink: '#b3312f', shape: 'flower', cost: 2, seed: 35 },
    { id: 'yuki', name: 'Flocon d\'hiver', jp: '雪', kanji: '雪', ink: '#5aa9e6', shape: 'scallop', cost: 2, seed: 39 },
    { id: 'ryu', name: 'Dragon', jp: '龍', kanji: '龍', ink: '#1f2a52', shape: 'square', cost: 3, seed: 43 },
    { id: 'fuji', name: 'Mont Fuji', jp: '富', kanji: '富', ink: '#7b4bd1', shape: 'flower', cost: 3, seed: 47 },
    { id: 'kin', name: 'Sceau d\'or', jp: '金', kanji: '金', ink: '#c9962b', shape: 'scallop', cost: 3, seed: 51 },
    // Nouveautés (permanentes, pas en édition limitée)
    { id: 'cha', name: 'Thé vert', jp: '茶', kanji: '茶', ink: '#5f8f3e', shape: 'circle', cost: 1, seed: 55 },
    { id: 'hon', name: 'Livre ouvert', jp: '本', kanji: '本', ink: '#8a5a3b', shape: 'square', cost: 1, seed: 59 },
    { id: 'egao', name: 'Sourire', jp: '笑', kanji: '笑', ink: '#e8a33d', shape: 'scallop', cost: 1, seed: 63 },
    { id: 'hi', name: 'Flamme de courage', jp: '火', kanji: '火', ink: '#d9482b', shape: 'circle', cost: 2, seed: 67 },
    { id: 'kaze', name: 'Vent frais', jp: '風', kanji: '風', ink: '#3f9aa8', shape: 'flower', cost: 2, seed: 71 },
    { id: 'tsuru', name: 'Grue en origami', jp: '鶴', kanji: '鶴', ink: '#d0587a', shape: 'scallop', cost: 2, seed: 75 },
    { id: 'kitsune', name: 'Renard kitsune', jp: '狐', kanji: '狐', ink: '#d9732b', shape: 'square', cost: 2, seed: 79 },
    { id: 'nami', name: 'Grande vague', jp: '波', kanji: '波', ink: '#1d5fa8', shape: 'circle', cost: 3, seed: 83 },
    { id: 'tora', name: 'Tigre', jp: '虎', kanji: '虎', ink: '#b9780f', shape: 'square', cost: 3, seed: 87 },
    { id: 'yume', name: 'Rêve', jp: '夢', kanji: '夢', ink: '#9b59b6', shape: 'flower', cost: 3, seed: 91 },
    { id: 'fuku', name: 'Bonne fortune', jp: '福', kanji: '福', ink: '#b8860b', shape: 'scallop', cost: 4, seed: 95 },
    { id: 'saiwai', name: 'Bonheur', jp: '幸', kanji: '幸', ink: '#2c7a6b', shape: 'flower', cost: 4, seed: 99 }
  ];

  // --- Tampons d'événements : un par période de l'année japonaise ---
  // On le gagne en posant un tampon dans le carnet pendant la période.
  // (mêmes dates que PERIODS dans sakura.js, recopiées ici car sakura.js
  //  n'est chargé que sur l'accueil ; r = [mois, jour, mois, jour])
  var EVENTS = [
    { id: 'shogatsu', name: 'Nouvel An', romaji: 'Shōgatsu', jp: '正', ink: '#c1272d', shape: 'square', r: [[12, 26, 12, 31], [1, 1, 1, 7]] },
    { id: 'kan', name: 'Grand froid', romaji: 'Kan no uchi', jp: '寒', ink: '#4a78b5', shape: 'circle', r: [[1, 8, 1, 31]] },
    { id: 'setsubun', name: 'Setsubun', romaji: 'Setsubun', jp: '鬼', ink: '#b8342b', shape: 'scallop', r: [[2, 1, 2, 4]] },
    { id: 'ume', name: 'Pruniers en fleurs', romaji: 'Ume', jp: '梅', ink: '#c0587f', shape: 'flower', r: [[2, 5, 3, 19]] },
    { id: 'hanami', name: 'Hanami', romaji: 'Hanami', jp: '花', ink: '#e0709a', shape: 'flower', r: [[3, 20, 4, 15]] },
    { id: 'shinryoku', name: 'Vert tendre', romaji: 'Shinryoku', jp: '緑', ink: '#4f9a52', shape: 'circle', r: [[4, 16, 5, 31]] },
    { id: 'tsuyu', name: 'Saison des pluies', romaji: 'Tsuyu', jp: '傘', ink: '#3b8fa8', shape: 'scallop', r: [[6, 1, 6, 30], [7, 9, 7, 14]] },
    { id: 'tanabata', name: 'Tanabata', romaji: 'Tanabata', jp: '七', ink: '#5b5fd1', shape: 'square', r: [[7, 1, 7, 8]] },
    { id: 'natsumatsuri', name: 'Festival d\'été', romaji: 'Natsu matsuri', jp: '祭', ink: '#d9552b', shape: 'scallop', r: [[7, 15, 8, 10]] },
    { id: 'obon', name: 'Obon', romaji: 'Obon', jp: '盆', ink: '#a8742f', shape: 'circle', r: [[8, 11, 8, 17]] },
    { id: 'zansho', name: 'Dernières chaleurs', romaji: 'Zansho', jp: '暑', ink: '#d98a1f', shape: 'square', r: [[8, 18, 9, 7]] },
    { id: 'tsukimi', name: 'Lune d\'automne', romaji: 'Tsukimi', jp: '兎', ink: '#6c63c7', shape: 'circle', r: [[9, 8, 10, 15]] },
    { id: 'momijigari', name: 'Feuilles rouges', romaji: 'Momijigari', jp: '紅', ink: '#c0392b', shape: 'flower', r: [[10, 16, 11, 30]] },
    { id: 'shiwasu', name: 'Shiwasu', romaji: 'Shiwasu', jp: '走', ink: '#2f5d8a', shape: 'scallop', r: [[12, 1, 12, 25]] }
  ];
  EVENTS.forEach(function (ev, i) {
    ev.stampId = 'ev-' + ev.id;
    ev.seed = 101 + i * 4;
  });
  var EVENT_STAMPS = EVENTS.map(function (ev) {
    return { id: ev.stampId, name: ev.name, jp: ev.jp, kanji: ev.jp, ink: ev.ink, shape: ev.shape, cost: 0, seed: ev.seed, event: ev.id };
  });

  // --- Tampons de voyage : un par ville d'arrivée du Focus train ---
  // On le gagne en arrivant à destination (voyage terminé, pas interrompu) ; il rejoint la
  // collection et peut ensuite être posé dans le carnet comme n'importe quel autre tampon.
  var CITY_STAMPS = [
    ['tokyo', 'Tokyo', '東京', '#c1272d', 'square'], ['yokohama', 'Yokohama', '横浜', '#1d5fa8', 'circle'],
    ['kamakura', 'Kamakura', '鎌倉', '#2f7d5d', 'scallop'], ['nagoya', 'Nagoya', '名古屋', '#c9962b', 'scallop'],
    ['kyoto', 'Kyoto', '京都', '#b3312f', 'flower'], ['nara', 'Nara', '奈良', '#5f8f3e', 'circle'],
    ['osaka', 'Osaka', '大阪', '#e08a2e', 'square'], ['kobe', 'Kobe', '神戸', '#3b8fa8', 'flower'],
    ['himeji', 'Himeji', '姫路', '#7b8aa6', 'circle'], ['okayama', 'Okayama', '岡山', '#d0587a', 'scallop'],
    ['hiroshima', 'Hiroshima', '広島', '#c0392b', 'circle'], ['fukuoka', 'Fukuoka', '福岡', '#4c5fd7', 'square'],
    ['kumamoto', 'Kumamoto', '熊本', '#d9482b', 'flower'], ['kagoshima', 'Kagoshima', '鹿児島', '#8b5a2b', 'scallop'],
    ['kanazawa', 'Kanazawa', '金沢', '#b8860b', 'square'], ['toyama', 'Toyama', '富山', '#0f8ea8', 'circle'],
    ['nagano', 'Nagano', '長野', '#5aa9e6', 'flower'], ['niigata', 'Niigata', '新潟', '#2c7a6b', 'scallop'],
    ['sendai', 'Sendai', '仙台', '#7b4bd1', 'square'], ['morioka', 'Morioka', '盛岡', '#8e7cc3', 'circle'],
    ['aomori', 'Aomori', '青森', '#d9484b', 'flower'], ['hakodate', 'Hakodate', '函館', '#1f2a52', 'scallop']
  ].map(function (c, i) {
    return {
      id: 'city-' + c[0], city: c[0], name: c[1], jp: c[2], kanji: c[2], ink: c[3], shape: c[4], cost: 0,
      seed: 301 + i * 4, size: c[2].length === 1 ? 46 : c[2].length === 2 ? (c[4] === 'flower' ? 30 : 36) : 24
    };
  });
  function cityStampOf(cityId) {
    for (var i = 0; i < CITY_STAMPS.length; i++) if (CITY_STAMPS[i].city === cityId) return CITY_STAMPS[i];
    return null;
  }

  // --- Éditions limitées : 2 tampons par saison et par année ---
  // Achetables uniquement pendant la saison (saisons comme sur l'accueil :
  // printemps mars-mai, été juin-août, automne sept.-nov., hiver déc.-fév.).
  // Une fois achetés, on les garde pour toujours.
  var SEASON_INFO = {
    printemps: { fr: 'Printemps', kanji: '春' },
    ete: { fr: 'Été', kanji: '夏' },
    automne: { fr: 'Automne', kanji: '秋' },
    hiver: { fr: 'Hiver', kanji: '冬' }
  };
  var SEASON_ORDER = ['printemps', 'ete', 'automne', 'hiver'];
  var LTD_DESIGNS = {
    printemps: [
      { n: 1, name: 'Danse des pétales', kanji: '舞', ink: '#e7799f', shape: 'scallop', cost: 3, seed: 201 },
      { n: 2, name: 'Papillon', kanji: '蝶', ink: '#8e7cc3', shape: 'circle', cost: 4, seed: 205 }
    ],
    ete: [
      { n: 1, name: 'Luciole', kanji: '蛍', ink: '#4aa37a', shape: 'circle', cost: 3, seed: 209 },
      { n: 2, name: 'Brise fraîche', kanji: '涼', ink: '#2e9bb5', shape: 'scallop', cost: 4, seed: 213 }
    ],
    automne: [
      { n: 1, name: 'Érable rouge', kanji: '楓', ink: '#cf4a2a', shape: 'square', cost: 3, seed: 217 },
      { n: 2, name: 'Châtaigne', kanji: '栗', ink: '#8b5a2b', shape: 'scallop', cost: 4, seed: 221 }
    ],
    hiver: [
      { n: 1, name: 'Givre', kanji: '霜', ink: '#5f8fd0', shape: 'circle', cost: 3, seed: 225 },
      { n: 2, name: 'Lanterne', kanji: '灯', ink: '#d0892b', shape: 'square', cost: 4, seed: 229 }
    ]
  };

  // Saison d'une date (+ année « de départ » : l'hiver de janvier 2027 est l'hiver 2026).
  function seasonOf(d) {
    var m = d.getMonth(), y = d.getFullYear(), id;
    if (m >= 2 && m <= 4) id = 'printemps';
    else if (m >= 5 && m <= 7) id = 'ete';
    else if (m >= 8 && m <= 10) id = 'automne';
    else { id = 'hiver'; if (m <= 1) y -= 1; }
    return { id: id, year: y };
  }
  function seasonRange(id, year) {
    if (id === 'printemps') return { start: new Date(year, 2, 1), end: new Date(year, 5, 0, 23, 59, 59) };
    if (id === 'ete') return { start: new Date(year, 5, 1), end: new Date(year, 8, 0, 23, 59, 59) };
    if (id === 'automne') return { start: new Date(year, 8, 1), end: new Date(year, 11, 0, 23, 59, 59) };
    return { start: new Date(year, 11, 1), end: new Date(year + 1, 2, 0, 23, 59, 59) };
  }
  // « Aujourd'hui » : ?saison=hiver dans l'adresse permet de prévisualiser la boutique d'une autre saison.
  function nowDate() {
    try {
      var q = new URLSearchParams(global.location.search);
      var sai = (q.get('saison') || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      var fake = { printemps: [3, 1], ete: [6, 20], automne: [9, 20], hiver: [0, 15] };
      if (fake[sai]) return new Date(new Date().getFullYear(), fake[sai][0], fake[sai][1]);
    } catch (e) {}
    return new Date();
  }

  function ltdStamp(id) {
    var m = /^ltd-(printemps|ete|automne|hiver)(\d)-(\d{4})$/.exec(id);
    if (!m) return null;
    var list = LTD_DESIGNS[m[1]], d = null;
    for (var i = 0; i < list.length; i++) if (String(list[i].n) === m[2]) d = list[i];
    if (!d) return null;
    return {
      id: id, name: d.name + ' ' + m[3], jp: d.kanji, kanji: d.kanji, ink: d.ink, shape: d.shape,
      cost: d.cost, seed: d.seed, limited: true, sub: m[3], season: m[1], year: +m[3], baseName: d.name
    };
  }
  // Les éditions limitées en vente en ce moment.
  function currentLimited() {
    var se = seasonOf(nowDate());
    return LTD_DESIGNS[se.id].map(function (d) { return ltdStamp('ltd-' + se.id + d.n + '-' + se.year); });
  }

  function stampById(id) {
    for (var i = 0; i < STAMPS.length; i++) if (STAMPS[i].id === id) return STAMPS[i];
    for (var j = 0; j < EVENT_STAMPS.length; j++) if (EVENT_STAMPS[j].id === id) return EVENT_STAMPS[j];
    for (var c = 0; c < CITY_STAMPS.length; c++) if (CITY_STAMPS[c].id === id) return CITY_STAMPS[c];
    return ltdStamp(id) || STAMPS[0];
  }
  function stampSVG(id) { return seal(stampById(id)); }

  // ---- Événements : dates ----
  function eventOfDate(d) {
    var n = (d.getMonth() + 1) * 100 + d.getDate();
    for (var i = 0; i < EVENTS.length; i++) {
      var rs = EVENTS[i].r;
      for (var j = 0; j < rs.length; j++) {
        if (n >= rs[j][0] * 100 + rs[j][1] && n <= rs[j][2] * 100 + rs[j][3]) return EVENTS[i];
      }
    }
    return null;
  }
  var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function dayMonth(m, d) { return (d === 1 ? '1er' : d) + ' ' + MONTHS_FR[m - 1]; }
  function eventDatesLabel(ev) {
    return ev.r.map(function (r) { return 'du ' + dayMonth(r[0], r[1]) + ' au ' + dayMonth(r[2], r[3]); }).join(' et ');
  }

  // Sticker "Kibi dango" (団子) : trois boulettes sur une brochette.
  function stickerSVG() {
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" class="tp-sticker" role="img" aria-label="Sticker Kibi dango">' +
      '<rect x="57" y="12" width="6" height="96" rx="3" fill="#c8a26a"/>' +
      '<circle cx="60" cy="34" r="21" fill="#f7c8dd" stroke="#e39ac0" stroke-width="2.5"/>' +
      '<circle cx="60" cy="62" r="21" fill="#fdfaf2" stroke="#e2dbc9" stroke-width="2.5"/>' +
      '<circle cx="60" cy="90" r="21" fill="#bfe0a8" stroke="#93c479" stroke-width="2.5"/>' +
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
    { id: 'productive', m: 'Productif', f: 'Productive', n: 'Productif·ve', color: '#a8d8b9', hard: false },
    { id: 'sereine', m: 'Serein', f: 'Sereine', n: 'Serein·e', color: '#a9d6e5', hard: false },
    { id: 'motivee', m: 'Motivé', f: 'Motivée', n: 'Motivé·e', color: '#f6cfa6', hard: false },
    { id: 'stressee', m: 'Stressé', f: 'Stressée', n: 'Stressé·e', color: '#f3dca4', hard: true },
    { id: 'triste', m: 'Triste', f: 'Triste', n: 'Triste', color: '#b9c4ea', hard: true },
    { id: 'pas_productive', m: 'Pas productif', f: 'Pas productive', n: 'Pas productif·ve', color: '#d9c6ef', hard: true },
    { id: 'fatiguee', m: 'Fatigué', f: 'Fatiguée', n: 'Fatigué·e', color: '#d3d7e0', hard: true }
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

  // Tampons d'événements : poser un tampon dans le carnet un jour qui tombe
  // pendant une période (Hanami, Tsukimi, Tanabata…) débloque le tampon de
  // cette période. Les jours déjà tamponnés dans le passé comptent aussi.
  function computeEventStamps() {
    var got = [];
    stampKeys().forEach(function (k) {
      var d = parseKey(k);
      if (!d) return;
      var ev = eventOfDate(d);
      if (ev && data.stampBook.owned.indexOf(ev.stampId) === -1) {
        data.stampBook.owned.push(ev.stampId);
        got.push(ev);
      }
    });
    if (got.length) persist();
    return got;
  }

  // Tampons de voyage : chaque voyage de Focus train terminé (historique du Focus train)
  // débloque le tampon de la ville d'arrivée. Silencieux : l'écran d'arrivée du Focus train
  // met lui-même le tampon en scène.
  function computeCityStamps() {
    var history = read('benkyo_focus_train_history_v1', []);
    var got = [];
    if (!Array.isArray(history)) return got;
    history.forEach(function (trip) {
      var st = trip && trip.done ? cityStampOf(trip.to) : null;
      if (st && data.stampBook.owned.indexOf(st.id) === -1) {
        data.stampBook.owned.push(st.id);
        got.push(st);
      }
    });
    if (got.length) persist();
    return got;
  }

  // Appelé par le Focus train à l'arrivée. Renvoie { id, name, jp, isNew }.
  function awardCityStamp(cityId) {
    var st = cityStampOf(cityId);
    if (!st) return null;
    var isNew = data.stampBook.owned.indexOf(st.id) === -1;
    if (isNew) {
      data.stampBook.owned.push(st.id);
      persist();
      refreshAll();
    }
    return { id: st.id, name: st.name, jp: st.jp, isNew: isNew };
  }

  function announceEventStamps(events) {
    var el = document.createElement('div');
    el.className = 'tp-toast';
    el.style.bottom = (18 + 130 * document.querySelectorAll('.tp-toast').length) + 'px';
    var names = events.map(function (ev) { return ev.jp + ' ' + ev.name; }).join(' · ');
    el.innerHTML =
      '<button class="tp-toast-close" onclick="this.parentNode.remove()" aria-label="Fermer">✕</button>' +
      stampSVG(events[0].stampId) +
      '<div class="tp-toast-body">' +
        '<div class="tp-toast-title">' + (events.length > 1 ? 'Nouveaux tampons d\'événement !' : 'Nouveau tampon d\'événement !') + '</div>' +
        '<div class="tp-toast-text">' + names + '<br>Il est dans ta collection : tu peux le poser dans ton carnet.</div>' +
      '</div>';
    document.body.appendChild(el);
    celebrate();
    setTimeout(function () { if (el.parentNode) el.remove(); }, 9000);
  }

  // Point d'entrée unique : recalcule et annonce TOUT nouveau sticker et tout
  // nouveau tampon d'événement, quelle qu'en soit la raison (tampon, moral,
  // heures, pomodoro, dates...).
  function checkAwards(silent) {
    var newly = computeAwards();
    var events = computeEventStamps();
    if (computeCityStamps().length) setTimeout(refreshAll, 0);
    if (events.length) {
      // annonce même au chargement : un tampon d'événement est toujours une bonne surprise
      setTimeout(function () { announceEventStamps(events); refreshAll(); }, silent ? 1400 : 0);
    }
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
    if (stamp.event || stamp.city) return false;         // les tampons d'événement et de voyage se gagnent, ils ne s'achètent pas
    if (stamp.limited && !currentLimited().some(function (l) { return l.id === id; })) return false;  // saison terminée
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
    try { global.dispatchEvent(new CustomEvent('benkyo:manual-study-changed', { detail: { key: k, minutes: m } })); } catch (e) {}
  }
  function addManualMinutes(minutes, key) {
    var k = key || todayKey();
    setManualMinutes(k, (Number(data.manualStudy[k]) || 0) + Number(minutes || 0));
  }

  function celebrate() {
    if (typeof global.confetti === 'function') {
      global.confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 }, colors: ['#c1272d', '#f7c8dd', '#bfe0a8'] });
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
  function shopItemHTML(s, balance) {
    var can = balance >= s.cost;
    return '<div class="tp-shop-item' + (can ? '' : ' is-locked') + (s.limited ? ' is-limited' : '') + '">' +
      (s.limited ? '<div class="tp-tag tp-tag--ltd">Édition limitée</div>' : '') +
      stampSVG(s.id) +
      '<div class="tp-shop-name">' + s.name + '</div>' +
      '<div class="tp-shop-jp">' + s.jp + '</div>' +
      '<div class="tp-shop-cost">' + s.cost + ' sticker' + (s.cost > 1 ? 's' : '') + '</div>' +
      '<button class="tp-btn ' + (can ? 'tp-btn-primary' : 'tp-btn-ghost') + '" style="margin-top:8px"' + (can ? '' : ' disabled') +
        ' onclick="BenkyoTampons.buyStamp(\'' + s.id + '\')">' + (can ? 'Échanger' : 'Bloqué') + '</button>' +
      '</div>';
  }

  function stampTagHTML(s) {
    if (s.limited) return '<div class="tp-tag tp-tag--ltd">Édition limitée · ' + SEASON_INFO[s.season].fr + ' ' + s.year + '</div>';
    if (s.event) return '<div class="tp-tag tp-tag--event">Événement</div>';
    if (s.city) return '<div class="tp-tag tp-tag--city">Voyage</div>';
    return '';
  }

  // Bloc « Édition limitée de la saison » (boutique)
  function limitedShopHTML(balance) {
    var now = nowDate();
    var se = seasonOf(now);
    var info = SEASON_INFO[se.id];
    var range = seasonRange(se.id, se.year);
    var daysLeft = Math.max(0, Math.ceil((range.end - now) / 86400000));
    var left = daysLeft <= 1 ? 'dernier jour !' : 'plus que ' + daysLeft + ' jours';
    var endLabel = range.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    var avail = currentLimited().filter(function (s) { return data.stampBook.owned.indexOf(s.id) === -1; });
    var next = SEASON_ORDER[(SEASON_ORDER.indexOf(se.id) + 1) % 4];
    var nextYear = se.id === 'hiver' ? se.year + 1 : se.year;   // hiver 2026 → printemps 2027
    var body = avail.length
      ? '<div class="tp-shop-grid" style="margin-top:14px">' + avail.map(function (s) { return shopItemHTML(s, balance); }).join('') + '</div>'
      : '<div class="tp-inner" style="margin-top:14px"><p class="tp-sub" style="margin:0">Tu as déjà les deux tampons de cette saison. Ils sont dans ta collection pour toujours !</p></div>';
    return '<div class="tp-card tp-card--ltd">' +
      '<div class="tp-ltd-head"><div class="tp-ltd-kanji" lang="ja">' + info.kanji + '</div><div>' +
        '<h2 class="tp-title">Édition limitée · ' + info.fr + ' ' + se.year + '</h2>' +
        '<p class="tp-sub">Deux tampons disponibles jusqu\'au ' + endLabel + ' (' + left + '). Une fois la saison finie, ils ne reviennent plus : ceux que tu as pris restent à toi.</p>' +
      '</div></div>' + body +
      '<p class="tp-sub" style="margin-top:12px">Prochaine édition : ' + SEASON_INFO[next].fr + ' ' + nextYear + ', dès le ' + (next === 'printemps' ? '1er mars' : next === 'ete' ? '1er juin' : next === 'automne' ? '1er septembre' : '1er décembre') + '.</p>' +
      '</div>';
  }

  // Bloc « Tampons d'événements »
  function eventsHTML() {
    var today = nowDate();
    var cur = eventOfDate(today);
    var owned = data.stampBook.owned;
    var gained = EVENTS.filter(function (ev) { return owned.indexOf(ev.stampId) !== -1; }).length;
    var items = EVENTS.map(function (ev) {
      var has = owned.indexOf(ev.stampId) !== -1;
      var isNow = cur && cur.id === ev.id;
      return '<div class="tp-shop-item' + (has ? ' is-owned' : ' is-locked') + (isNow && !has ? ' is-now' : '') + '">' +
        (isNow && !has ? '<div class="tp-tag tp-tag--now">En cours</div>' : '') +
        stampSVG(ev.stampId) +
        '<div class="tp-shop-name">' + ev.name + '</div>' +
        '<div class="tp-shop-jp">' + ev.romaji + '</div>' +
        '<div class="tp-shop-cost" style="' + (has ? '' : 'color:var(--bento-text-muted,#5b6478)') + '">' +
          (has ? 'Obtenu ✓' : eventDatesLabel(ev)) + '</div>' +
        '</div>';
    }).join('');
    return '<div class="tp-card">' +
      '<h2 class="tp-title">Tampons d\'événements</h2>' +
      '<p class="tp-sub">Pose un tampon dans ton carnet pendant une fête ou une période de l\'année japonaise : le tampon de l\'événement est à toi, gratuitement (' + gained + '/' + EVENTS.length + ' obtenus).' +
        (cur && owned.indexOf(cur.stampId) === -1 ? ' <strong>' + cur.name + ' est en cours : pose ton tampon du jour pour l\'obtenir !</strong>' : '') + '</p>' +
      '<div class="tp-shop-grid" style="margin-top:14px">' + items + '</div>' +
      '</div>';
  }

  // Bloc « Tampons de voyage » (Focus train)
  function cityStampsHTML() {
    var owned = data.stampBook.owned;
    var gained = CITY_STAMPS.filter(function (st) { return owned.indexOf(st.id) !== -1; }).length;
    var items = CITY_STAMPS.map(function (st) {
      var has = owned.indexOf(st.id) !== -1;
      return '<div class="tp-shop-item' + (has ? ' is-owned' : ' is-locked') + '">' +
        stampSVG(st.id) +
        '<div class="tp-shop-name">' + st.name + '</div>' +
        '<div class="tp-shop-jp">' + st.jp + '</div>' +
        '<div class="tp-shop-cost" style="' + (has ? '' : 'color:var(--bento-text-muted,#5b6478)') + '">' +
          (has ? 'Obtenu ✓' : 'Arrive ici en train') + '</div>' +
        '</div>';
    }).join('');
    return '<div class="tp-card">' +
      '<h2 class="tp-title">Tampons de voyage</h2>' +
      '<p class="tp-sub">Termine un voyage du Focus train (Session de travail) : en arrivant à destination, tu gagnes le tampon de la ville, gratuitement (' + gained + '/' + CITY_STAMPS.length + ' obtenus). Un voyage interrompu ne compte pas.</p>' +
      '<div class="tp-shop-grid" style="margin-top:14px">' + items + '</div>' +
      '</div>';
  }

  function renderCollection() {
    var root = document.getElementById('tp-collection-root');
    if (!root) return;
    var balance = stickerBalance();

    // Collection : tout ce qu'on possède (les éditions limitées passées restent ici)
    var owned = data.stampBook.owned.map(stampById);
    var ownedHTML = owned.map(function (s) {
      var sel = data.stampBook.selected === s.id;
      return '<div class="tp-shop-item is-owned' + (sel ? ' is-selected' : '') + '">' +
        stampTagHTML(s) +
        stampSVG(s.id) +
        '<div class="tp-shop-name">' + s.name + '</div>' +
        '<div class="tp-shop-jp">' + s.jp + '</div>' +
        (sel ? '<div class="tp-shop-cost">Tampon actuel</div>'
             : '<button class="tp-btn tp-btn-ghost" style="margin-top:8px" onclick="BenkyoTampons.selectStamp(\'' + s.id + '\')">Utiliser</button>') +
        '</div>';
    }).join('');

    var shop = STAMPS.filter(function (s) { return data.stampBook.owned.indexOf(s.id) === -1; });
    var shopHTML = shop.map(function (s) { return shopItemHTML(s, balance); }).join('');

    var history = Object.keys(data.stickers.awarded).map(function (k) {
      return data.stickers.awarded[k];
    }).sort(function (a, b) { return new Date(b.at) - new Date(a.at); }).slice(0, 12).map(function (a) {
      return '<li><span>' + a.label + '</span><span>' + new Date(a.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + '</span></li>';
    }).join('');

    root.innerHTML =
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
      '</div>' +
      '<div class="tp-card">' +
        '<h2 class="tp-title">Ma collection de tampons</h2>' +
        '<p class="tp-sub">Choisis le tampon que tu utiliseras pour ta prochaine journée. (' + owned.length + ' tampon' + (owned.length > 1 ? 's' : '') + ')</p>' +
        '<div class="tp-shop-grid" style="margin-top:14px">' + ownedHTML + '</div>' +
      '</div>' +
      eventsHTML() +
      cityStampsHTML() +
      limitedShopHTML(balance) +
      (shopHTML ?
      '<div class="tp-card">' +
        '<h2 class="tp-title">Boutique de tampons</h2>' +
        '<p class="tp-sub">Toujours en vente : les plus beaux tampons coûtent 2 à 4 stickers Kibi dango.</p>' +
        '<div class="tp-shop-grid" style="margin-top:14px">' + shopHTML + '</div>' +
      '</div>' : '');
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

    root.innerHTML =
      '<div class="tp-card">' +
        '<h2 class="tp-title">Mon moral du jour</h2>' +
        '<p class="tp-sub">Une couleur par sentiment. Si tu travailles quand même un jour difficile, tu gagnes un sticker Kibi dango.</p>' +
        '<div class="tp-mood-list" style="margin-top:14px">' + buttons + '</div>' +
        '<div class="tp-notebook" style="margin-top:18px">' +
          '<div class="tp-notebook-head">' +
            '<button class="tp-nav-btn" onclick="BenkyoTampons.shiftMonth(-1)" aria-label="Mois précédent">‹</button>' +
            '<span class="tp-month">' + viewMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '</span>' +
            '<button class="tp-nav-btn" onclick="BenkyoTampons.shiftMonth(1)" aria-label="Mois suivant">›</button>' +
          '</div>' +
          '<div class="tp-grid">' + grid + '</div>' +
          '<div class="tp-legend">' + legend + '</div>' +
        '</div>' +
      '</div>';
  }

  // ------------------------------------------------------------
  // Rendu — temps d'étude ajouté à la main
  // ------------------------------------------------------------
  var manualDayKey = null;   // jour affiché dans la carte (aujourd'hui par défaut)

  function manualSelectedKey() {
    var k = manualDayKey || todayKey();
    return k > todayKey() ? todayKey() : k;
  }
  function setManualDay(key) {
    manualDayKey = (key && parseKey(key)) ? key : null;
    renderManual();
  }
  // Valeur saisie en heures + minutes pour le jour choisi
  function saveManualFromForm() {
    var hEl = document.getElementById('tp-manual-h');
    var mEl = document.getElementById('tp-manual-m');
    var h = Math.max(0, Math.min(24, Number(hEl && hEl.value) || 0));
    var m = Math.max(0, Math.min(59, Number(mEl && mEl.value) || 0));
    setManualMinutes(manualSelectedKey(), Math.min(1440, Math.round(h * 60 + m)));
  }
  function addManualToSelected(minutes) {
    addManualMinutes(minutes, manualSelectedKey());
  }

  function renderManual() {
    var root = document.getElementById('tp-manual-root');
    if (!root) return;
    var key = manualSelectedKey();
    var isToday = key === todayKey();
    var manual = Number(data.manualStudy[key]) || 0;
    var pomo = Number(pomodoroLog()[key]) || 0;
    var dayLabel = (parseKey(key) || new Date()).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Les 7 derniers jours saisis à la main, pour corriger facilement
    var recent = Object.keys(data.manualStudy)
      .filter(function (k) { return Number(data.manualStudy[k]) > 0; })
      .sort().reverse().slice(0, 7)
      .map(function (k) {
        var d = parseKey(k);
        return '<button type="button" class="pz-man-chip' + (k === key ? ' is-on' : '') + '" onclick="BenkyoTampons.setManualDay(\'' + k + '\')">' +
          (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : k) + ' · <b>' + formatMinutes(data.manualStudy[k]) + '</b></button>';
      }).join('');

    root.innerHTML =
      '<div class="glass-panel pz-card pz-manual">' +
        '<h3><i class="fa-solid fa-pen-to-square"></i>Heures travaillées hors Pomodoro</h3>' +
        '<p class="sub">Le Pomodoro compte tout seul. Ajoute ici le temps travaillé en dehors du Pomodoro et de Benkyō (cours, devoirs sur papier, lecture…) : il s\'additionne à ton total, à ton objectif et à ta régularité.</p>' +
        '<div class="pz-man-grid">' +
          '<div class="pz-man-form">' +
            '<label class="pz-man-lab" for="tp-manual-date">Jour</label>' +
            '<input id="tp-manual-date" type="date" value="' + key + '" max="' + todayKey() + '" onchange="BenkyoTampons.setManualDay(this.value)" class="pz-man-in">' +
            '<span class="pz-man-lab">Temps travaillé</span>' +
            '<div class="pz-man-hm">' +
              '<input id="tp-manual-h" type="number" min="0" max="24" step="1" value="' + Math.floor(manual / 60) + '" class="pz-man-in" aria-label="Heures"><span>h</span>' +
              '<input id="tp-manual-m" type="number" min="0" max="59" step="5" value="' + (manual % 60) + '" class="pz-man-in" aria-label="Minutes"><span>min</span>' +
              '<button type="button" class="pz-man-save" onclick="BenkyoTampons.saveManualFromForm()"><i class="fa-solid fa-check"></i>Enregistrer</button>' +
            '</div>' +
            '<div class="pz-man-quick">' +
              '<button type="button" onclick="BenkyoTampons.addManualToSelected(15)">+15 min</button>' +
              '<button type="button" onclick="BenkyoTampons.addManualToSelected(30)">+30 min</button>' +
              '<button type="button" onclick="BenkyoTampons.addManualToSelected(60)">+1 h</button>' +
              (manual > 0 ? '<button type="button" class="del" onclick="BenkyoTampons.setManualMinutes(\'' + key + '\', 0)">Effacer</button>' : '') +
            '</div>' +
          '</div>' +
          '<div class="pz-man-sum">' +
            '<div class="pz-man-day">' + (isToday ? 'Aujourd\'hui' : dayLabel) + '</div>' +
            '<div class="pz-man-row"><span>Pomodoro</span><b>' + formatMinutes(pomo) + '</b></div>' +
            '<div class="pz-man-row"><span>Hors Pomodoro</span><b>' + formatMinutes(manual) + '</b></div>' +
            '<div class="pz-man-row tot"><span>Total du jour</span><b>' + formatMinutes(pomo + manual) + '</b></div>' +
          '</div>' +
        '</div>' +
        (recent ? '<div class="pz-man-recent"><span class="pz-man-lab">Dernières saisies</span><div>' + recent + '</div></div>' : '') +
        '<p class="sub" style="margin:12px 0 0">Cumul total (Pomodoro + hors Pomodoro) : <strong>' + formatMinutes(totalMinutes()) + '</strong></p>' +
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
      '<button class="tp-toast-close" onclick="this.parentNode.remove()" aria-label="Fermer">✕</button>' +
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
    var colors = ['#f7d3de', '#fbe3e6', '#d3ebc4', '#fdf1d6', '#e7dcf3'];
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
      '<button class="tp-toast-close" onclick="this.parentNode.remove()" aria-label="Fermer">✕</button>' +
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
      '<rect x="3" y="3" width="18" height="18" rx="5" fill="#f6c9cf" stroke="#e0a9b3" stroke-width="1.4"/>' +
      '<rect x="6" y="6" width="12" height="12" rx="3" fill="none" stroke="#fff" stroke-width="1.1" opacity="0.9"/>' +
      '<path d="M12 8.2v7.6M8.6 12h6.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' +
      '</svg>';
  }
  function miniDangoIco() {
    return '<svg class="tp-badge-ico" viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="11.1" y="2.5" width="1.8" height="19" rx="0.9" fill="#dcc39a"/>' +
      '<circle cx="12" cy="6.6" r="4" fill="#f7d3de" stroke="#e6aec4" stroke-width="1.1"/>' +
      '<circle cx="12" cy="12" r="4" fill="#fffaf0" stroke="#e6ddca" stroke-width="1.1"/>' +
      '<circle cx="12" cy="17.4" r="4" fill="#d3ebc4" stroke="#a9cf95" stroke-width="1.1"/>' +
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
        if (typeof global.switchProfileSubtab === 'function') global.switchProfileSubtab('carnet');
      } else {
        location.href = 'profil.html#carnet';
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
    EVENTS: EVENTS,
    CITY_STAMPS: CITY_STAMPS,
    awardCityStamp: awardCityStamp,
    celebrate: celebrate,
    currentLimited: currentLimited,
    stampById: stampById,
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
    setManualDay: setManualDay,
    saveManualFromForm: saveManualFromForm,
    addManualToSelected: addManualToSelected,
    manualByDay: function () { return Object.assign({}, data.manualStudy); },
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
