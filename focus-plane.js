/* Focus avion — Paris CDG → Japon. Même principe que le Focus train : on choisit un vol, un siège, on décolle,
   et le temps de vol (réel ou accéléré) est ta session de focus. Données : localStorage `benkyo_focus_plane_v1`. */
(function () {
  'use strict';
  var KEY = 'benkyo_focus_plane_v1';
  var CDG = { name: 'Paris Charles-de-Gaulle', lat: 49.0097, lng: 2.5479 };
  // Durées indicatives (vols directs, estimations de démonstration).
  var FLIGHTS = [
    { id: 'hnd', city: 'tokyo', name: 'Tokyo Haneda', jp: '東京（羽田）', code: 'HND', airline: 'Air France', plane: 'Boeing 777', minutes: 835, lat: 35.5494, lng: 139.7798 },
    { id: 'nrt', city: 'tokyo', name: 'Tokyo Narita', jp: '東京（成田）', code: 'NRT', airline: 'Japan Airlines', plane: 'Boeing 787', minutes: 850, lat: 35.772, lng: 140.3929 },
    { id: 'kix', city: 'osaka', name: 'Osaka Kansai', jp: '大阪（関西）', code: 'KIX', airline: 'Air France', plane: 'Airbus A350', minutes: 870, lat: 34.4347, lng: 135.244 }
  ];
  var root, state, tick = null, map = null, planeMarker = null, sceneTimers = [];
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'J', 'K'], ROWS = [20, 44];
  var CARD_IDS = ['ft-music-card', 'ft-todo-card'], cardHomes = {};

  // Ambiance (lofi / MP3) et to-do : on réutilise les cartes du Focus train (mêmes données, même musique).
  function adoptCards(box) {
    CARD_IDS.forEach(function (id) {
      var c = document.getElementById(id);
      if (!c || !box) return;
      if (!cardHomes[id]) cardHomes[id] = { parent: c.parentNode, next: c.nextSibling };
      box.appendChild(c);
    });
  }
  function restoreCards() {
    CARD_IDS.forEach(function (id) {
      var c = document.getElementById(id), h = cardHomes[id];
      if (c && h && h.parent) { h.parent.insertBefore(c, h.next && h.next.parentNode === h.parent ? h.next : null); }
    });
    cardHomes = {};
  }
  function hash(str) { var h = 0, i; for (i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function taken(flightId, seat) { return hash(flightId + seat) % 100 < 58 && seat !== state.seat; }

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ } }
  function flightOf(id) { return FLIGHTS.filter(function (f) { return f.id === id; })[0] || null; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dur(min) { return Math.floor(min / 60) + ' h ' + pad(Math.round(min % 60)); }
  function totalMs(s) { return flightOf(s.flight).minutes * 60000 / (s.factor || 1); }
  // Temps de vol écoulé : le circuit d'attente (pause) fige le compteur, puis la durée de l'attente devient du retard.
  function elapsed(x) { return (x.pausedAt || Date.now()) - x.departedAt - (x.delayMs || 0); }
  function stage() {
    if (!state.flight || !flightOf(state.flight)) return 'plan';
    if (!state.departedAt) return 'plan';
    return elapsed(state) >= totalMs(state) ? 'arrived' : 'flight';
  }
  function gate(x) { return 'K' + (30 + hash(x.id) % 40); }
  function flightNo(x) { return (x.airline === 'Air France' ? 'AF' : 'JL') + (100 + hash(x.id + 'n') % 900); }
  function clock(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function hm(ms) { var m = Math.max(0, Math.round(ms / 60000)); return Math.floor(m / 60) + ' h ' + pad(m % 60); }
  function ease(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
  // Profil de vol : montée, croisière (~890 km/h à 11 000 m), descente ; circuit d'attente en pause.
  function profile(frac, paused) {
    if (paused) return { phase: 'Circuit d’attente', icon: 'fa-rotate', speed: 460 + Math.round(18 * Math.sin(Date.now() / 4000)), alt: 4500 };
    if (frac < .045) { var u = ease(frac / .045); return { phase: 'Montée', icon: 'fa-arrow-trend-up', speed: Math.round(280 + 610 * u), alt: Math.round(11000 * u) }; }
    if (frac > .94) { var d = ease((1 - frac) / .06); return { phase: 'Descente', icon: 'fa-arrow-trend-down', speed: Math.round(250 + 640 * d), alt: Math.round(11000 * d) }; }
    return { phase: 'Croisière', icon: 'fa-plane', speed: Math.round(886 + 14 * Math.sin(frac * 60)), alt: 11000 };
  }
  function nfr(n) { return Math.round(n).toLocaleString('fr-FR'); }

  // Historique des vols
  var HKEY = 'benkyo_focus_plane_history_v1';
  function readHist() { try { var l = JSON.parse(localStorage.getItem(HKEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function pushHist(done) {
    var f = flightOf(state.flight); if (!f || !state.departedAt) return;
    var l = readHist();
    l.unshift({ code: f.code, name: f.name, done: done, minutes: Math.round(Math.min(totalMs(state), Math.max(0, elapsed(state))) / 60000), seat: state.seat, delay: Math.round((state.delayMs || 0) / 60000), at: Date.now() });
    try { localStorage.setItem(HKEY, JSON.stringify(l.slice(0, 100))); } catch (e) { /* ignoré */ }
  }
  function historyHtml() {
    var l = readHist(); if (!l.length) return '';
    var ok = l.filter(function (d) { return d.done; }).length, tot = l.reduce(function (n, d) { return n + (d.minutes || 0); }, 0);
    return '<div class="fp-history"><div class="fp-history-head"><b>Historique des vols</b><span>' + ok + (ok > 1 ? ' vols terminés' : ' vol terminé') + ' · ' + dur(tot) + ' de focus</span></div><ul>' +
      l.slice(0, 5).map(function (d) {
        return '<li><span>Paris CDG → ' + d.name + '</span><span>' + dur(d.minutes) + (d.delay ? ' · retard +' + d.delay + ' min' : '') + ' · siège ' + d.seat + '</span><em class="' + (d.done ? 'is-ok' : 'is-ko') + '">' + (d.done ? 'Atterri' : 'Annulé') + '</em></li>';
      }).join('') + '</ul></div>';
  }

  // Carte d'embarquement avec code-barres (généré à partir du vol et du siège).
  function barcode(seed) {
    var h = '', x = 0, i, n = hash(seed), w;
    for (i = 0; i < 48; i += 1) { n = (n * 1103515245 + 12345) >>> 0; w = 1 + (n >>> 8) % 3; if (i % 2 === 0) h += '<rect x="' + x + '" y="0" width="' + w + '" height="36"/>'; x += w; }
    return '<svg class="fp-barcode" viewBox="0 0 ' + x + ' 36" preserveAspectRatio="none" aria-hidden="true">' + h + '</svg>';
  }
  function passHtml(f) {
    var city = f.name.split(' ')[0];
    return '<div class="fp-pass" aria-label="Carte d’embarquement"><div class="fp-pass-main"><div class="fp-pass-top"><b>' + f.airline + '</b><span>CARTE D’EMBARQUEMENT · <span lang="ja">搭乗券</span></span></div>' +
      '<div class="fp-pass-route"><div><small>DE</small><strong>CDG</strong><em>Paris</em></div><i class="fa-solid fa-plane"></i><div><small>À</small><strong>' + f.code + '</strong><em>' + city + '</em></div></div>' +
      '<div class="fp-pass-info"><div><small>VOL</small><b>' + flightNo(f) + '</b></div><div><small>TERMINAL · PORTE</small><b>2E · ' + gate(f) + '</b></div><div><small>AVION</small><b>' + f.plane + '</b></div></div></div>' +
      '<div class="fp-pass-stub"><small>SIÈGE</small><strong>' + state.seat + '</strong>' + barcode(f.id + state.seat) + '</div></div>';
  }

  // Annonces à bord : bandeau (japonais + traduction française) et voix japonaise du navigateur.
  var lastAnn = null, follow = false, routeBounds = null;
  function events(f) {
    return [
      { at: .012, jp: '離陸しました。ご搭乗ありがとうございます。', fr: 'Nous venons de décoller de Paris. Merci d’avoir choisi ce vol vers ' + f.name + '.' },
      { at: .07, jp: '当機は巡航高度に達しました。', fr: 'Nous avons atteint notre altitude de croisière, environ 11 000 mètres.' },
      { at: .25, jp: 'まもなく機内食をお配りします。', fr: 'Le service des repas va commencer : bon appétit.' },
      { at: .5, jp: '飛行は順調です。日本まであと半分です。', fr: 'Nous avons parcouru la moitié du trajet, sans turbulence.' },
      { at: .75, jp: '日本はフランスより七、八時間進んでいます。', fr: 'Au Japon, il est 7 à 8 heures de plus qu’en France : pense à ajuster ta montre !' },
      { at: .92, jp: 'まもなく着陸態勢に入ります。シートベルトをお締めください。', fr: 'Nous allons bientôt entamer notre descente. Merci d’attacher votre ceinture.' }
    ];
  }
  function say(fr, jp) {
    lastAnn = { fr: fr, jp: jp };
    var a = root && root.querySelector('#fp-ann-fr'), j = root && root.querySelector('#fp-ann-jp');
    if (a) a.textContent = fr; if (j) j.textContent = jp;
    if (state.mute || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(jp), v = window.speechSynthesis.getVoices().filter(function (x) { return /^ja/i.test(x.lang); });
      u.lang = 'ja-JP'; u.rate = .9; if (v[0]) u.voice = v[0];
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignoré */ }
  }
  function checkAnnouncements(frac, total) {
    var f = flightOf(state.flight); state.ann = state.ann || {};
    events(f).forEach(function (ev, i) {
      if (frac < ev.at || state.ann[i]) return;
      state.ann[i] = 1; save();
      if ((frac - ev.at) * total < 120000) say(ev.fr, ev.jp); else lastAnn = { fr: ev.fr, jp: ev.jp };
    });
  }

  // Grand cercle : point à la fraction f du trajet.
  function gc(a, b, f) {
    var r = Math.PI / 180, p1 = a.lat * r, l1 = a.lng * r, p2 = b.lat * r, l2 = b.lng * r;
    var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((p2 - p1) / 2), 2) + Math.cos(p1) * Math.cos(p2) * Math.pow(Math.sin((l2 - l1) / 2), 2)));
    if (!d) return { lat: a.lat, lng: a.lng };
    var A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    var x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    var y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    var z = A * Math.sin(p1) + B * Math.sin(p2);
    return { lat: Math.atan2(z, Math.sqrt(x * x + y * y)) / r, lng: Math.atan2(y, x) / r };
  }
  function distanceKm(a, b) {
    var r = Math.PI / 180, dp = (b.lat - a.lat) * r, dl = (b.lng - a.lng) * r;
    var h = Math.pow(Math.sin(dp / 2), 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.pow(Math.sin(dl / 2), 2);
    return 12742 * Math.asin(Math.sqrt(h));
  }
  function bearing(a, b) {
    var r = Math.PI / 180, y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
    var x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
    return (Math.atan2(y, x) / r + 360) % 360;
  }

  function stopTick() { if (tick) { window.clearInterval(tick); tick = null; } }
  function destroyMap() { if (map) { map.remove(); map = null; planeMarker = null; } }

  var STATUS = ['À l’heure', 'Embarquement', 'À l’heure'];
  var EXIT_ROW = 31, boardTimer = null;
  function stopBoardClock() { if (boardTimer) { window.clearInterval(boardTimer); boardTimer = null; } }
  function flaps(code) { return code.split('').map(function (c) { return '<i>' + c + '</i>'; }).join(''); }
  function seatInfo(id) {
    var L = id.slice(-1), r = Number(id.slice(0, -1)), kind = (L === 'A' || L === 'K') ? 'Hublot' : (L === 'B' || L === 'E' || L === 'J') ? 'Milieu' : 'Couloir';
    var side = L < 'D' ? 'côté gauche' : L < 'H' ? 'au centre' : 'côté droit';
    var note = r === EXIT_ROW ? 'Rangée de sortie : plus de place pour les jambes' : r >= 43 ? 'Près des toilettes, dossier peu inclinable' : r <= 21 ? 'Proche de la cuisine de bord' : 'Cabine économique, rangée ' + r;
    return { kind: kind, side: side, note: note };
  }
  function freeSeats(pred) {
    var out = [], r, i;
    for (r = ROWS[0]; r <= ROWS[1]; r += 1) { for (i = 0; i < LETTERS.length; i += 1) { var id = r + LETTERS[i]; if (!taken(state.flight, id) && pred(LETTERS[i], r)) out.push(id); } }
    return out;
  }

  // Centre le plan de cabine sur le siège choisi (impossible tant que l'onglet est caché : on réessaie à l'affichage).
  function centerSeat(sc) {
    if (!sc || sc.getAttribute('data-seated') === '1' || !sc.clientHeight) return;
    var mine = sc.querySelector('.is-mine');
    if (mine) sc.scrollTop = Math.max(0, mine.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - sc.clientHeight / 2 + 20);
    sc.setAttribute('data-seated', '1');
  }

  function renderPlan() {
    var f = flightOf(state.flight), fast = state.factor !== 1;
    var h = '<div class="ft-heading"><span class="ft-eyebrow"><i class="fa-solid fa-plane-departure"></i> TON PROCHAIN VOL DE FOCUS</span>' +
      '<h2 id="fp-title">Paris CDG → Japon <span lang="ja">日本</span></h2>' +
      '<p>Choisis un vol direct depuis Roissy : la durée du vol est ta session de focus. Les durées sont indicatives.</p></div>' +
      '<div class="fp-board" role="radiogroup" aria-label="Vols au départ de Paris CDG">' +
      '<div class="fp-board-head"><span class="fp-board-title"><i class="fa-solid fa-plane-departure" aria-hidden="true"></i><b lang="ja">出発</b>Départs<em>Paris Charles-de-Gaulle</em></span><span class="fp-board-clock" id="fp-board-clock" aria-hidden="true">' + clock(Date.now()) + '</span></div>' +
      '<div class="fp-board-cols" aria-hidden="true"><span>Destination</span><span>Vol</span><span>Appareil</span><span>Porte</span><span>Durée</span><span>Statut</span></div>';
    FLIGHTS.forEach(function (x, i) {
      var sel = f && f.id === x.id, st = STATUS[i % STATUS.length], boarding = st === 'Embarquement';
      h += '<button type="button" class="fp-row' + (sel ? ' is-selected' : '') + '" role="radio" aria-checked="' + Boolean(sel) + '" data-flight="' + x.id + '">' +
        '<span class="fp-flaps" aria-hidden="true">' + flaps(x.code) + '</span>' +
        '<span class="fp-dest"><b>' + x.name + '</b><small lang="ja">' + x.jp + '</small></span>' +
        '<span class="fp-no">' + flightNo(x) + '</span>' +
        '<span class="fp-ac">' + x.airline + '<small>' + x.plane + '</small></span>' +
        '<span class="fp-gate">' + gate(x) + '</span>' +
        '<span class="fp-dur">' + dur(x.minutes) + '</span>' +
        '<span class="fp-status ' + (boarding ? 'is-boarding' : 'is-ok') + '"><i aria-hidden="true"></i>' + (sel ? 'Sélectionné' : st) + '</span></button>';
    });
    h += '</div>';
    if (!f) {
      h += '<p class="fp-hint"><i class="fa-regular fa-hand-pointer" aria-hidden="true"></i> Choisis d’abord un vol sur le tableau pour ouvrir la cabine et réserver ton siège.</p>';
    } else {
      var si = state.seat ? seatInfo(state.seat) : null;
      h += '<div class="fp-booking"><div class="fp-side">' +
        '<div class="fp-card"><h3>Durée de la session</h3><div class="fp-seg" role="radiogroup" aria-label="Durée de la session">' +
        '<button type="button" role="radio" aria-checked="' + fast + '" data-factor="10" class="' + (fast ? 'is-on' : '') + '"><i class="fa-solid fa-forward" aria-hidden="true"></i><b>Accéléré ×10</b><span>environ ' + hm(f.minutes * 6000) + ' de focus</span></button>' +
        '<button type="button" role="radio" aria-checked="' + !fast + '" data-factor="1" class="' + (!fast ? 'is-on' : '') + '"><i class="fa-regular fa-clock" aria-hidden="true"></i><b>Temps réel</b><span>environ ' + hm(f.minutes * 60000) + ' de focus</span></button></div></div>' +
        '<div class="fp-card"><h3>Ton siège</h3><div class="fp-seatcard"><span class="fp-seatno' + (si ? ' is-set' : '') + '" id="fp-seat-val">' + (state.seat || '—') + '</span>' +
        '<div class="fp-seatcard-txt">' + (si ? '<b>' + si.kind + ' · ' + si.side + '</b><small>' + si.note + '</small>' : '<b>Aucun siège choisi</b><small>Touche un siège libre sur le plan, ou laisse-nous choisir.</small>') + '</div></div>' +
        '<div class="fp-quick" role="group" aria-label="Choisir pour moi"><button type="button" data-pick="window"><i class="fa-regular fa-window-maximize" aria-hidden="true"></i>Hublot</button>' +
        '<button type="button" data-pick="aisle"><i class="fa-solid fa-person-walking" aria-hidden="true"></i>Couloir</button>' +
        '<button type="button" data-pick="exit"><i class="fa-solid fa-door-open" aria-hidden="true"></i>Sortie de secours</button></div>' +
        '<p class="fp-pick-note" id="fp-pick-note" role="status" aria-live="polite"></p></div>' +
        (state.seat ? passHtml(f) : '') +
        '<button type="button" id="fp-go" class="fp-btn"' + (state.seat ? '' : ' disabled') + '><i class="fa-solid fa-plane-departure" aria-hidden="true"></i> ' + (state.seat ? 'Décoller' : 'Choisis un siège pour décoller') + '</button>' +
        '</div><div class="fp-cabin-col">' + cabinHtml(f) + '</div></div>';
    }
    h += historyHtml();
    var prev = root.querySelector('.fp-cabin-scroll'), keep = prev ? prev.scrollTop : null;
    root.innerHTML = h;
    var sc = root.querySelector('.fp-cabin-scroll');
    if (sc) {
      if (keep !== null) { sc.scrollTop = keep; sc.setAttribute('data-seated', '1'); } else centerSeat(sc);
    }
    stopBoardClock(); boardTimer = window.setInterval(function () { var c = document.getElementById('fp-board-clock'); if (c) c.textContent = clock(Date.now()); }, 20000);
    Array.prototype.forEach.call(root.querySelectorAll('.fp-row'), function (b) {
      b.addEventListener('click', function () { state.flight = b.getAttribute('data-flight'); state.seat = null; save(); render(); });
    });
    Array.prototype.forEach.call(root.querySelectorAll('.fp-seg button'), function (b) {
      b.addEventListener('click', function () { state.factor = Number(b.getAttribute('data-factor')); save(); render(); });
    });
    Array.prototype.forEach.call(root.querySelectorAll('.fp-quick button'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-pick');
        var pool = freeSeats(function (L, r) { return k === 'window' ? (L === 'A' || L === 'K') : k === 'aisle' ? 'CDFH'.indexOf(L) >= 0 : r === EXIT_ROW; });
        if (!pool.length) { var n = root.querySelector('#fp-pick-note'); if (n) n.textContent = 'Plus de place libre dans cette catégorie sur ce vol.'; return; }
        state.seat = pool[Math.floor(Math.random() * pool.length)]; save(); render();
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('.fp-seat-s[data-seat]'), function (b) {
      b.addEventListener('click', function () { state.seat = b.getAttribute('data-seat'); save(); render(); });
    });
    var go = root.querySelector('#fp-go');
    if (go) go.addEventListener('click', function () {
      if (!state.flight || !state.seat) return;
      if (!state.factor) state.factor = 10;
      playScene('takeoff', function () { state.departedAt = Date.now(); state.logged = false; state.ann = {}; state.delayMs = 0; state.pausedAt = null; lastAnn = null; save(); render(); });
    });
  }

  // Cabine économique 3-3-3 (rangées 20 à 44) dans un fuselage : nez, cuisine, hublots, rangée de sortie, ailes.
  // Places occupées fictives mais stables (même vol = mêmes places).
  function cabinHtml(f) {
    var h = '<div class="fp-cabin-wrap"><div class="fp-cabin-legend"><span><i class="fp-seat-s"></i>Libre</span><span><i class="fp-seat-s is-window"></i>Hublot</span><span><i class="fp-seat-s is-taken"></i>Occupé</span><span><i class="fp-seat-s is-mine"></i>Ton siège</span></div>' +
      '<div class="fp-cabin-scroll"><div class="fp-hullwrap"><span class="fp-wing fp-wing-l" aria-hidden="true"></span><span class="fp-wing fp-wing-r" aria-hidden="true"></span><div class="fp-hull" role="group" aria-label="Plan de la cabine, ' + f.plane + '">' +
      '<div class="fp-nose"><span class="fp-jet-cockpit" aria-hidden="true"><i class="fa-solid fa-plane"></i></span><small>Avant · ' + f.plane + '</small></div>' +
      '<div class="fp-galley" aria-hidden="true"><span><i class="fa-solid fa-mug-saucer"></i>Cuisine</span><span><i class="fa-solid fa-restroom"></i>Toilettes</span></div>' +
      '<div class="fp-class" aria-hidden="true"><span>Classe économique</span></div>' +
      '<div class="fp-seatblock">' +
      '<div class="fp-row-c fp-cabin-top" aria-hidden="true">';
    LETTERS.forEach(function (L, i) { h += (i === 3 || i === 6 ? '<i class="fp-aisle"></i>' : '') + '<i>' + L + '</i>'; });
    h += '</div>';
    for (var r = ROWS[0]; r <= ROWS[1]; r += 1) {
      var hasMine = state.seat && state.seat.slice(0, -1) === String(r);
      h += '<div class="fp-row-c' + (r === EXIT_ROW ? ' is-exit' : '') + (hasMine ? ' has-mine' : '') + '">';
      LETTERS.forEach(function (L, i) {
        var id = r + L, t = taken(f.id, id), mine = state.seat === id, win = (L === 'A' || L === 'K'), info = seatInfo(id);
        if (i === 3 || i === 6) h += '<i class="fp-aisle">' + r + '</i>';
        h += '<button type="button" class="fp-seat-s' + (t ? ' is-taken' : '') + (mine ? ' is-mine' : '') + (win ? ' is-window' : '') + '" data-seat="' + id + '"' + (t ? ' disabled' : '') +
          ' title="' + (t ? 'Siège ' + id + ' occupé' : 'Siège ' + id + ' · ' + info.kind.toLowerCase()) + '" aria-label="Siège ' + id + (t ? ', occupé' : ', ' + info.kind.toLowerCase() + (r === EXIT_ROW ? ', rangée de sortie' : '')) + '" aria-pressed="' + Boolean(mine) + '">' +
          (t ? '<i class="fa-solid fa-user" aria-hidden="true"></i>' : mine ? '<i class="fa-solid fa-check" aria-hidden="true"></i>' : '') + '</button>';
      });
      h += '</div>';
    }
    return h + '</div><div class="fp-galley fp-galley-rear" aria-hidden="true"><span><i class="fa-solid fa-restroom"></i>Toilettes</span><span><i class="fa-solid fa-mug-saucer"></i>Cuisine arrière</span></div><div class="fp-tail" aria-hidden="true"></div></div></div></div></div>';
  }

  function renderFlight() {
    var f = flightOf(state.flight), total = distanceKm(CDG, f);
    root.innerHTML = '<div class="ft-heading"><span class="ft-eyebrow"><i class="fa-solid fa-plane"></i> EN VOL · ' + f.airline.toUpperCase() + '</span>' +
      '<h2>Paris CDG → ' + f.name + '</h2><p>Reste concentré·e jusqu’à l’atterrissage.</p></div>' +
      '<div class="fp-flight"><div class="fp-col fp-col-info">' +
      '<section class="fp-hero" id="fp-hero" aria-label="Suivi du vol">' +
        '<div class="fp-hero-top"><span class="fp-phase" id="fp-phase"><i class="fa-solid fa-plane" aria-hidden="true"></i><span>Croisière</span></span><span class="fp-hero-id">Vol ' + flightNo(f) + ' · ' + f.plane + ' · siège ' + state.seat + '</span></div>' +
        '<div class="fp-route"><div class="fp-end"><strong>CDG</strong><span>Paris</span><em>Décollage <b id="fp-dep">–</b></em></div>' +
        '<div class="fp-track" role="progressbar" aria-label="Progression du vol" aria-valuemin="0" aria-valuemax="100" id="fp-track"><div class="fp-track-line"><span class="fp-track-fill" id="fp-bar-fill"></span>' +
        '<span class="fp-dot" style="left:25%"></span><span class="fp-dot" style="left:50%"></span><span class="fp-dot" style="left:75%"></span>' +
        '<span class="fp-track-plane" id="fp-track-plane"><span class="fp-pct" id="fp-pct">0 %</span><i class="fa-solid fa-plane" aria-hidden="true"></i></span></div></div>' +
        '<div class="fp-end fp-end-r"><strong>' + f.code + '</strong><span>' + f.name.split(' ')[0] + '</span><em>Arrivée <b id="fp-eta">–</b></em></div></div>' +
        '<div class="fp-count"><div><small>Temps restant</small><b id="fp-left" role="timer" aria-live="off">–</b></div>' +
        '<p>' + (state.factor === 1 ? 'Temps réel · ' + dur(f.minutes) + ' de vol' : 'Session accélérée ×' + state.factor + ' · ' + dur(f.minutes) + ' de vol simulé') + '</p></div>' +
      '</section>' +
      '<div id="fp-delay" class="fp-delay hidden" role="status"></div>' +
      '<div class="fp-tiles">' +
        '<div class="fp-tile"><i class="fa-solid fa-route" aria-hidden="true"></i><small>Distance parcourue</small><b id="fp-km">–</b><span>sur ' + nfr(total) + ' km</span></div>' +
        '<div class="fp-tile"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i><small>Vitesse</small><b id="fp-speed">–</b><span id="fp-mach">–</span></div>' +
        '<div class="fp-tile"><i class="fa-solid fa-mountain-sun" aria-hidden="true"></i><small>Altitude</small><b id="fp-alt">–</b><span id="fp-ft">–</span></div>' +
        '<div class="fp-tile"><i class="fa-regular fa-hourglass-half" aria-hidden="true"></i><small>Temps écoulé</small><b id="fp-elapsed">–</b><span id="fp-of">–</span></div>' +
      '</div>' +
      '<div class="fp-controls"><button type="button" id="fp-pause" class="fp-pause"></button><button type="button" id="fp-abort" class="fp-abort"><i class="fa-solid fa-ban" aria-hidden="true"></i><span><b>Annuler le vol</b><small>Pas de tampon</small></span></button></div>' +
      '<div id="fp-confirm" class="pg-modal hidden" aria-hidden="true"><div class="pg-sheet pg-confirm" role="alertdialog" aria-modal="true" aria-labelledby="fp-c-title" aria-describedby="fp-c-desc">' +
        '<div class="pg-seal" lang="ja">注意</div>' +
        '<h3 id="fp-c-title" class="pg-title">Annuler ce vol ?</h3>' +
        '<p id="fp-c-desc">Tu es en plein vol <b id="fp-c-route"></b> (<span id="fp-c-pct">–</span> du trajet, <span id="fp-c-time">–</span> de focus). Si tu annules, aucun tampon ne sera attribué et le vol sera noté « Annulé » dans l’historique.</p>' +
        '<div class="pg-actions"><button type="button" id="fp-stay" class="pg-btn">Continuer le vol</button><button type="button" id="fp-yes" class="pg-btn danger-fill">Oui, annuler le vol</button></div>' +
        '</div></div>' +
      '<div class="fp-ann"><div class="fp-ann-head"><span><i class="fa-solid fa-bullhorn"></i> Annonce à bord</span><button type="button" id="fp-voice" class="fp-btn-ghost" aria-pressed="' + !state.mute + '"></button></div>' +
      '<p id="fp-ann-jp" lang="ja"></p><p id="fp-ann-fr"></p></div>' +
      '</div><div class="fp-col fp-col-view">' +
      '<div class="fp-maptools"><button type="button" id="fp-follow" class="fp-btn-ghost"><i class="fa-solid fa-location-crosshairs"></i> Suivre l’avion</button><button type="button" id="fp-fit" class="fp-btn-ghost"><i class="fa-solid fa-route"></i> Tout le trajet</button></div>' +
      '<div id="fp-map" class="fp-map" aria-label="Carte du vol"></div>' +
      '</div></div>' +
      '<div id="fp-extras" class="fp-extras"></div>';
    adoptCards(root.querySelector('#fp-extras'));
    function voiceLabel() { var v = root.querySelector('#fp-voice'); if (v) { v.innerHTML = state.mute ? '<i class="fa-solid fa-volume-xmark"></i> Voix coupée' : '<i class="fa-solid fa-volume-high"></i> Voix active'; v.setAttribute('aria-pressed', String(!state.mute)); } }
    voiceLabel();
    root.querySelector('#fp-voice').addEventListener('click', function () {
      state.mute = !state.mute; save(); voiceLabel();
      if (state.mute && 'speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignoré */ } }
    });
    root.querySelector('#fp-pause').addEventListener('click', function () {
      if (state.pausedAt) {
        state.delayMs = (state.delayMs || 0) + Date.now() - state.pausedAt; state.pausedAt = null; save();
        say('Fin du circuit d’attente : le vol reprend. Retard cumulé : ' + Math.round(state.delayMs / 60000) + ' min.', '待機が終わりました。まもなく飛行を再開します。');
      } else {
        state.pausedAt = Date.now(); save();
        say('Nous sommes en circuit d’attente. Le temps de focus est suspendu, et chaque minute retardera l’atterrissage.', '現在、上空で待機しています。');
      }
      update();
    });
    var conf = root.querySelector('#fp-confirm'), abortBtn = root.querySelector('#fp-abort');
    function confirmKeys(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeConfirm(); return; }
      if (e.key !== 'Tab') return;
      var b = conf.querySelectorAll('button'), first = b[0], last = b[b.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function openConfirm() {
      var el = Math.max(0, elapsed(state)), tot = totalMs(state), frac = Math.max(0, Math.min(1, el / tot)), left = Math.max(0, Math.ceil((tot - el) / 1000));
      function set(id, v) { var n = conf.querySelector('#' + id); if (n) n.textContent = v; }
      set('fp-c-route', 'Paris CDG → ' + f.name);
      set('fp-c-pct', Math.round(frac * 100) + ' %');
      set('fp-c-time', Math.floor(el / 3600000) > 0 ? Math.floor(el / 3600000) + ' h ' + pad(Math.floor(el / 60000) % 60) : Math.floor(el / 60000) + ' min');
      set('fp-c-left', Math.floor(left / 3600) + ' h ' + pad(Math.floor(left / 60) % 60));
      (document.fullscreenElement || document.webkitFullscreenElement || document.body).appendChild(conf);
      conf.classList.remove('hidden'); conf.setAttribute('aria-hidden', 'false');
      document.body.classList.add('fp-modal-open');
      document.addEventListener('keydown', confirmKeys);
      conf.querySelector('#fp-stay').focus();
    }
    function closeConfirm() {
      conf.classList.add('hidden'); conf.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('fp-modal-open');
      document.removeEventListener('keydown', confirmKeys);
      root.appendChild(conf); abortBtn.focus();
    }
    abortBtn.addEventListener('click', openConfirm);
    conf.querySelector('#fp-stay').addEventListener('click', closeConfirm);
    conf.addEventListener('mousedown', function (e) { if (e.target === conf) closeConfirm(); });
    conf.querySelector('#fp-yes').addEventListener('click', function () {
      conf.remove(); document.removeEventListener('keydown', confirmKeys); document.body.classList.remove('fp-modal-open');
      pushHist(false); state.departedAt = null; state.pausedAt = null; save(); render();
    });
    root.querySelector('#fp-follow').addEventListener('click', function () {
      if (!map || !planeMarker) return; follow = true; map.setView(planeMarker.getLatLng(), Math.max(map.getZoom(), 4));
    });
    root.querySelector('#fp-fit').addEventListener('click', function () { follow = false; if (map && routeBounds) map.fitBounds(routeBounds, { padding: [30, 30] }); });
    follow = false; buildMap(f);
    if (lastAnn) say(lastAnn.fr, lastAnn.jp);
    update();
    stopTick(); tick = window.setInterval(update, 1000);
  }

  function buildMap(f) {
    if (typeof L === 'undefined') { root.querySelector('#fp-map').textContent = 'La carte n’a pas pu se charger.'; return; }
    map = L.map('fp-map', { worldCopyJump: true, minZoom: 2 }).setView([42, 70], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 8, attribution: '© OpenStreetMap' }).addTo(map);
    var pts = [], i;
    for (i = 0; i <= 80; i += 1) { var p = gc(CDG, f, i / 80); pts.push([p.lat, p.lng]); }
    L.polyline(pts, { color: '#2563eb', weight: 3, dashArray: '6 8', opacity: .85 }).addTo(map);
    L.circleMarker([CDG.lat, CDG.lng], { radius: 6, color: '#1d4ed8', fillOpacity: 1 }).addTo(map).bindTooltip('Paris CDG');
    L.circleMarker([f.lat, f.lng], { radius: 7, color: '#b45309', fillColor: '#f2a93a', fillOpacity: 1 }).addTo(map).bindTooltip(f.name);
    planeMarker = L.marker(pts[0], { interactive: false, icon: L.divIcon({ className: 'fp-plane', iconSize: [30, 30], iconAnchor: [15, 15],
      html: '<svg viewBox="0 0 24 24" width="30" height="30"><path fill="#10213f" stroke="#fff" stroke-width=".9" d="M12 1.5c.9 0 1.6.9 1.6 2v6.3l8.4 5v2.2l-8.4-2.4v4.6l2.2 1.7V22L12 21l-3.8 1V20.3l2.2-1.7V14l-8.4 2.4v-2.2l8.4-5V3.5c0-1.1.7-2 1.6-2z"/></svg>' }) }).addTo(map);
    routeBounds = L.latLngBounds(pts); map.fitBounds(routeBounds, { padding: [30, 30] });
    map.on('dragstart', function () { follow = false; });
  }

  function update() {
    if (stage() === 'arrived') { stopTick(); playScene('landing', render); return; }
    var f = flightOf(state.flight), total = totalMs(state), paused = Boolean(state.pausedAt), now = Date.now();
    var el = Math.max(0, elapsed(state)), frac = Math.max(0, Math.min(1, el / total)), left = Math.max(0, Math.ceil((total - el) / 1000));
    function set(id, v) { var n = root.querySelector('#' + id); if (n) n.textContent = v; }
    var pr = profile(frac, paused), mach = pr.speed / (1225 - 163 * pr.alt / 11000);
    window.BenkyoLive = window.BenkyoLive || {};
    window.BenkyoLive.plane = { t: now, id: state.departedAt, p: frac, v: pr.speed, alt: pr.alt, stop: false, left: Math.max(0, total - el), phase: pr.phase, paused: paused };
    set('fp-left', Math.floor(left / 3600) + ':' + pad(Math.floor(left / 60) % 60) + ':' + pad(left % 60));
    set('fp-pct', Math.round(frac * 100) + ' %');
    set('fp-km', nfr(distanceKm(CDG, f) * frac) + ' km');
    set('fp-speed', nfr(pr.speed) + ' km/h');
    set('fp-mach', 'Mach ' + mach.toFixed(2).replace('.', ','));
    set('fp-alt', nfr(pr.alt) + ' m');
    set('fp-ft', '≈ ' + nfr(Math.round(pr.alt * 3.281 / 100) * 100) + ' ft');
    set('fp-elapsed', hm(el));
    set('fp-of', 'sur ' + hm(total) + ' de session');
    set('fp-dep', clock(state.departedAt));
    var extra = paused ? now - state.pausedAt : 0, delay = (state.delayMs || 0) + extra;
    set('fp-eta', clock(state.departedAt + (state.delayMs || 0) + total + extra));
    var ph = root.querySelector('#fp-phase');
    if (ph) { ph.querySelector('span').textContent = pr.phase; ph.querySelector('i').className = 'fa-solid ' + pr.icon; ph.classList.toggle('is-hold', paused); }
    var hero = root.querySelector('#fp-hero'); if (hero) hero.classList.toggle('is-paused', paused);
    var tr = root.querySelector('#fp-track'); if (tr) tr.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
    var d = root.querySelector('#fp-delay');
    if (d) {
      d.classList.toggle('hidden', !paused && delay < 60000);
      d.innerHTML = '<b lang="ja">遅延</b> ' + (paused ? 'Circuit d’attente : le temps de focus est suspendu · ' : '') + 'Retard cumulé +' + Math.floor(delay / 60000) + ' min';
    }
    var pb = root.querySelector('#fp-pause');
    if (pb) {
      pb.classList.toggle('is-paused', paused);
      pb.innerHTML = paused
        ? '<i class="fa-solid fa-play" aria-hidden="true"></i><span><b>Reprendre le vol</b><small>L’attente s’ajoute au retard</small></span>'
        : '<i class="fa-solid fa-pause" aria-hidden="true"></i><span><b>Circuit d’attente</b><small>Mettre le focus en pause</small></span>';
    }
    var bar = root.querySelector('#fp-bar-fill'); if (bar) bar.style.width = (frac * 100) + '%';
    var tp = root.querySelector('#fp-track-plane'); if (tp) tp.style.left = (frac * 100) + '%';
    if (planeMarker) {
      var a = gc(CDG, f, frac), b = gc(CDG, f, Math.min(1, frac + .01));
      planeMarker.setLatLng([a.lat, a.lng]);
      var svg = planeMarker.getElement(), inner = svg && svg.firstChild; if (inner) inner.style.transform = 'rotate(' + bearing(a, b) + 'deg)';
      if (follow && map) map.panTo([a.lat, a.lng], { animate: true });
    }
    if (!paused) checkAnnouncements(frac, total);
  }

  function renderArrived() {
    var f = flightOf(state.flight), award = null;
    try { if (typeof window.stopFocusTrainMusic === 'function') window.stopFocusTrainMusic(); } catch (e) { /* ignoré */ }
    if (!state.logged) {
      state.logged = true; save(); pushHist(true);
      // La gare « Cette gare » du Focus train devient la ville d'arrivée (sauf trajet en cours).
      try {
        var tj = JSON.parse(localStorage.getItem('benkyo_focus_train_journey_v1') || 'null');
        if (!tj || !tj.departedAt || tj.logged) {
          localStorage.setItem('benkyo_focus_train_journey_v1', JSON.stringify({ from: f.city, to: 'kyoto', train: null, trainType: null, durationMinutes: null, coachNumber: null, seat: null, torn: false, departedAt: null, logged: false, savedAt: new Date().toISOString() }));
          window.dispatchEvent(new CustomEvent('ft:journey-changed', { detail: { arrived: true, station: f.city } }));
        }
      } catch (e) { /* ignoré */ }
    }
    try { if (window.BenkyoTampons && window.BenkyoTampons.awardCityStamp) award = window.BenkyoTampons.awardCityStamp(f.city); } catch (e) { /* ignoré */ }
    root.innerHTML = '<div class="ft-heading"><span class="ft-eyebrow"><i class="fa-solid fa-plane-arrival"></i> ATTERRISSAGE</span>' +
      '<h2>Bienvenue au Japon ! <span lang="ja">ようこそ</span></h2><p>Tu as atterri à ' + f.name + ' (' + f.code + ') après ' + dur(f.minutes) + ' de vol' + (state.factor === 1 ? '' : ' (accéléré ×' + state.factor + ')') + ', siège ' + state.seat + '.' +
      (award ? (award.isNew ? ' Nouveau tampon : ' : ' Tampon déjà dans ta collection : ') + f.city.charAt(0).toUpperCase() + f.city.slice(1) + '.' : '') + '</p></div>' +
      '<div class="fp-actions"><button type="button" id="fp-train" class="fp-btn"><i class="fa-solid fa-train"></i> Continuer en train</button>' +
      '<button type="button" id="fp-new" class="fp-btn-ghost">Nouveau vol</button></div>';
    root.querySelector('#fp-train').addEventListener('click', function () { if (typeof window.switchPomodoroSubtab === 'function') window.switchPomodoroSubtab('focus-train'); });
    root.querySelector('#fp-new').addEventListener('click', function () { state.departedAt = null; state.flight = null; state.seat = null; save(); render(); });
  }

  // Animation de décollage (Paris) et d'atterrissage (Japon) : scène SVG cinématique (caméra qui suit l'avion,
  // décor en parallaxe, feux de piste, traversée des nuages), avec bouton « Passer ».
  function playScene(kind, done) {
    sceneTimers.forEach(window.clearTimeout); sceneTimers = [];
    stopTick(); stopBoardClock(); destroyMap(); restoreCards();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    var f = flightOf(state.flight), up = kind === 'takeoff';
    var sky = up ? ['#0b1730', '#24406e', '#e9a35a'] : ['#1a2747', '#5a5f86', '#f4b25c'];
    var i, far = '';
    if (up) {
      // Silhouette de Paris : immeubles + tour Eiffel, répétés.
      for (i = 0; i < 4; i++) {
        var o = i * 700;
        far += '<g transform="translate(' + o + ',0)"><path d="M0 262V236h40v-12h30v20h26v-30h22v38h40v-16h34v-10h30v26h50v-18h36v28h44v-22h30v-8h26v30h40v-14h30v24h40v-30h26v20h40v-16h36v28h20v12z"/>' +
          '<path d="M520 262l22-70 6-60 4-50 4 50 6 60 22 70h-14l-12-34h-12l-12 34z"/><circle cx="556" cy="82" r="2.4" class="fp-beacon"/></g>';
      }
    } else {
      for (i = 0; i < 3; i++) {
        var p = i * 900;
        far += '<g transform="translate(' + p + ',0)"><path d="M60 262 300 120q20-12 40 0l240 142z" class="fp-fuji"/><path d="M268 140l32-20q20-12 40 0l32 20-22-6-14 12-16-10-14 12-14-12z" fill="#f4f1ea" opacity=".92"/>' +
          '<path d="M560 262v-22h30v-36h24v58h36v-30h28v-14h22v44h40v-26h30v26h40v-40h18v-20h6v20h18v60z" opacity=".9"/></g>';
      }
    }
    var ground = '<rect x="-200" y="262" width="12000" height="200" class="fp-g-grass"/>' +
      '<rect x="-200" y="266" width="12000" height="34" class="fp-g-rwy"/>' +
      '<line x1="-200" y1="283" x2="12000" y2="283" class="fp-g-center"/>' +
      '<line x1="-200" y1="266" x2="12000" y2="266" class="fp-g-lights fp-g-lights--far"/>' +
      '<line x1="-200" y1="301" x2="12000" y2="301" class="fp-g-lights"/>';
    for (i = 0; i < 40; i++) ground += '<g transform="translate(' + (i * 380 + 120) + ',0)"><rect y="306" width="3" height="16" class="fp-g-sign"/><rect x="-14" y="300" width="30" height="8" rx="2" class="fp-g-sign"/></g>';
    var cloud = function (x, y, s, o) { return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')" opacity="' + o + '"><ellipse cx="0" cy="0" rx="120" ry="34"/><ellipse cx="-50" cy="-18" rx="60" ry="34"/><ellipse cx="40" cy="-26" rx="70" ry="40"/></g>'; };
    var clouds = cloud(200, 120, 1.4, .95) + cloud(620, 230, 1.8, .9) + cloud(1050, 140, 1.5, .95) + cloud(1450, 260, 2, .9) + cloud(1850, 160, 1.6, .95);
    var plane = '<g class="fp-jet"><g transform="scale(1.25)"><g class="fp-jet-body">' +
      '<g class="fp-gear"><path d="M0-18v14M70-18v14" class="fp-gear-strut"/><circle cx="-4" cy="-4" r="4.2" class="fp-wheel"/><circle cx="5" cy="-4" r="4.2" class="fp-wheel"/><circle cx="70" cy="-4" r="3.4" class="fp-wheel"/></g>' +
      '<path d="M-40-22 6-22-34-6h-14z" class="fp-jet-wing-far"/>' +
      '<path d="M-92-36-116-74h12l38 38z" class="fp-fin"/><path d="M-118-30-134-26-126-24-100-28z" class="fp-jet-wing-far"/>' +
      '<path d="M-124-34q4-4 18-4H64q22 0 32 10 3 3 0 6-12 8-34 8H-70q-26 0-54-20z" fill="url(#fpHull)"/>' +
      '<path d="M-110-26H72q14 0 22-4" class="fp-livery"/>' +
      '<line x1="-82" y1="-32" x2="54" y2="-32" class="fp-windows"/><path d="M76-33h10q4 1 6 4h-15z" class="fp-jet-cockpit"/>' +
      '<path d="M-26-22 22-22-30 4h-12z" class="fp-jet-wing"/>' +
      '<rect x="-20" y="-20" width="30" height="11" rx="5.5" class="fp-engine"/><ellipse cx="-22" cy="-14.5" rx="6" ry="4" class="fp-exhaust"/>' +
      '<circle cx="-30" cy="4" r="1.6" class="fp-strobe"/><circle cx="-116" cy="-74" r="1.6" class="fp-strobe fp-strobe--b"/>' +
      '</g><g class="fp-smoke"><circle cx="0" cy="-3" r="6"/><circle cx="-14" cy="-6" r="9"/><circle cx="-30" cy="-8" r="12"/></g></g></g>';
    var lines = up
      ? [[0, 'En tête de piste', 'Paris Charles-de-Gaulle · piste 27R. Personnel navigant, aux portes.'], [2600, 'Mise en puissance', 'Accrochez vos ceintures, nous prenons notre envol.'], [3900, 'Rotation', 'L’avion quitte la piste et entame sa montée.'], [6300, 'Cap à l’est', f.name + ' dans ' + dur(f.minutes) + ' de vol.']]
      : [[0, 'Approche finale', 'Descente à travers la couche nuageuse vers ' + f.name + '.'], [3200, 'Piste en vue', 'Train sorti, volets en position atterrissage.'], [5200, 'Toucher des roues', 'Inversion de poussée, freinage.'], [7200, 'Bienvenue au Japon', '日本へようこそ · heure locale ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }) + '.']];
    root.innerHTML = '<div class="fp-scene fp-scene--' + kind + '"><svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + (up ? 'Décollage de Paris' : 'Atterrissage au Japon') + '">' +
      '<defs><linearGradient id="fpSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset=".62" stop-color="' + sky[1] + '"/><stop offset="1" stop-color="' + sky[2] + '"/></linearGradient>' +
      '<radialGradient id="fpSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3d1"/><stop offset=".25" stop-color="#ffd38a" stop-opacity=".8"/><stop offset="1" stop-color="#f2b84b" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="fpHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef2f8"/><stop offset="1" stop-color="#aeb9cc"/></linearGradient>' +
      '<radialGradient id="fpVig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>' +
      '<filter id="fpBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter><filter id="fpGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>' +
      '<rect width="800" height="360" fill="url(#fpSky)"/><g class="fp-stars">' + Array.apply(null, Array(26)).map(function (_, k) { return '<circle cx="' + ((k * 137) % 800) + '" cy="' + ((k * 53) % 150) + '" r="' + (k % 3 ? .7 : 1.1) + '"/>'; }).join('') + '</g>' +
      '<circle cx="' + (up ? 600 : 230) + '" cy="236" r="140" fill="url(#fpSun)" class="fp-sun"/>' +
      '<g class="fp-world"><g class="fp-far">' + far + '</g><g class="fp-ground">' + ground + '</g></g>' +
      '<g class="fp-haze"><rect y="200" width="800" height="70" fill="' + sky[2] + '" opacity=".18" filter="url(#fpBlur)"/></g>' +
      '<g transform="translate(330,270)">' + plane + '</g>' +
      '<g class="fp-clouds" filter="url(#fpBlur)">' + clouds + '</g>' +
      '<rect width="800" height="360" fill="url(#fpVig)" pointer-events="none"/><rect width="800" height="360" class="fp-flash" pointer-events="none"/></svg>' +
      '<div class="fp-hud"><span>' + (up ? 'CDG' : f.code) + '</span><i></i><span>' + (up ? 'DÉPART' : 'ARRIVÉE') + '</span></div>' +
      '<div class="fp-caption" aria-live="polite"><small id="fp-scene-k"></small><p class="fp-scene-text" id="fp-scene-text"></p></div>' +
      '<div class="fp-progress"><span style="animation-duration:' + (up ? 8 : 9) + 's"></span></div>' +
      '<button type="button" class="fp-skip" id="fp-skip">Passer <i class="fa-solid fa-forward" aria-hidden="true"></i></button></div>';
    var finished = false;
    function finish() { if (finished) return; finished = true; sceneTimers.forEach(window.clearTimeout); sceneTimers = []; done(); }
    var cap = root.querySelector('.fp-caption');
    lines.forEach(function (l) { sceneTimers.push(window.setTimeout(function () {
      if (!cap) return; cap.classList.remove('is-in'); void cap.offsetWidth;
      root.querySelector('#fp-scene-k').textContent = l[1]; root.querySelector('#fp-scene-text').textContent = l[2]; cap.classList.add('is-in');
    }, l[0])); });
    sceneTimers.push(window.setTimeout(finish, up ? 8100 : 9300));
    root.querySelector('#fp-skip').addEventListener('click', finish);
  }

  function render() {
    var stale = document.body.querySelector(':scope > #fp-confirm'); if (stale) stale.remove(); document.body.classList.remove('fp-modal-open');
    stopTick(); stopBoardClock(); destroyMap(); restoreCards();
    var s = stage();
    if (s === 'flight') renderFlight(); else if (s === 'arrived') renderArrived(); else renderPlan();
  }

  function init() {
    root = document.getElementById('fp-root'); if (!root) return;
    state = load(); render();
    // La carte doit être redessinée quand l'onglet redevient visible.
    window.addEventListener('resize', function () { if (map) map.invalidateSize(); centerSeat(root.querySelector('.fp-cabin-scroll')); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
