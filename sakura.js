/* ============================================================
   sakura.js — Particules de saison (pétales, lucioles, feuilles
               d'érable, flocons) + détection de la saison / période
   -------------------------------------------------------------
   Remplace complètement l'ancienne librairie "canvas-confetti".
   Toutes les pages appellent déjà `confetti({...})` : ce fichier
   fournit la même fonction, mais elle lance des particules de
   saison au lieu de confettis :
     - printemps : pétales de cerisier   - été    : lucioles
     - automne   : feuilles d'érable     - hiver  : flocons

   Ce fichier expose aussi `window.BenkyoSeason` (saison + période
   japonaise en cours : Hanami, Tsukimi, Momijigari…) et pose
   l'attribut data-season sur <html>, utilisé par home.css pour
   changer les couleurs de la page d'accueil.
   Pour prévisualiser : index.html?saison=hiver (ou printemps, ete,
   automne) et, en plus, &periode=tanabata (voir PERIODS ci-dessous).

   Optimisations (pour que la page ne "bugue" plus) :
     - un seul <canvas> réutilisé pour toute la page
     - la boucle d'animation ne tourne QUE s'il reste des particules
     - nombre de particules plafonné (140) et divisé par 2 sur mobile
     - résolution limitée (devicePixelRatio max 2)
     - pause automatique quand l'onglet est en arrière-plan
     - respecte "réduire les animations" (prefers-reduced-motion)
   ============================================================ */
(function (global) {
  'use strict';

  // ------------------------------------------------------------
  // Saisons et périodes
  // Les saisons suivent les mois (comme l'agence météo japonaise) :
  // printemps mars-mai, été juin-août, automne sept.-nov., hiver déc.-fév.
  // ------------------------------------------------------------
  var SEASONS = {
    printemps: { id: 'printemps', kanji: '春', romaji: 'Haru',  fr: 'Printemps', noun: 'un pétale',   kind: 'petal',   theme: '#e9c9d3' },
    ete:       { id: 'ete',       kanji: '夏', romaji: 'Natsu', fr: 'Été',       noun: 'une luciole', kind: 'firefly', theme: '#cde5ea' },
    automne:   { id: 'automne',   kanji: '秋', romaji: 'Aki',   fr: 'Automne',   noun: 'une feuille', kind: 'maple',   theme: '#ebd1b8' },
    hiver:     { id: 'hiver',     kanji: '冬', romaji: 'Fuyu',  fr: 'Hiver',     noun: 'un flocon',   kind: 'snow',    theme: '#dce5f0' }
  };

  // Périodes de l'année japonaise. r = plages [mois, jour, mois, jour].
  var PERIODS = [
    { id: 'shogatsu',   kanji: '正月',   romaji: 'Shōgatsu',   fr: 'Le Nouvel An japonais',          desc: 'On commence l\'année du bon pied.',                          r: [[12, 26, 12, 31], [1, 1, 1, 7]] },
    { id: 'kan',        kanji: '寒の内', romaji: 'Kan no uchi', fr: 'Le grand froid',                desc: 'Au chaud avec un thé, on avance doucement.',                 r: [[1, 8, 1, 31]] },
    { id: 'setsubun',   kanji: '節分',   romaji: 'Setsubun',   fr: 'La fête de la fin de l\'hiver',  desc: 'On chasse les démons, et la procrastination avec.',          r: [[2, 1, 2, 4]] },
    { id: 'ume',        kanji: '梅',     romaji: 'Ume',        fr: 'Les pruniers en fleurs',         desc: 'Les premières fleurs annoncent le printemps.',               r: [[2, 5, 3, 19]] },
    { id: 'hanami',     kanji: '花見',   romaji: 'Hanami',     fr: 'Les cerisiers en fleurs',        desc: 'Un instant pour lever les yeux de ses cahiers.',             r: [[3, 20, 4, 15]] },
    { id: 'shinryoku',  kanji: '新緑',   romaji: 'Shinryoku',  fr: 'Le vert tendre',                 desc: 'Les feuilles toutes neuves : de quoi repartir du bon pied.', r: [[4, 16, 5, 31]] },
    { id: 'tsuyu',      kanji: '梅雨',   romaji: 'Tsuyu',      fr: 'La saison des pluies',           desc: 'Il pleut dehors : le moment idéal pour réviser au sec.',     r: [[6, 1, 6, 30], [7, 9, 7, 14]] },
    { id: 'tanabata',   kanji: '七夕',   romaji: 'Tanabata',   fr: 'La fête des étoiles',            desc: 'On écrit un vœu et on l\'accroche à un bambou.',             r: [[7, 1, 7, 8]] },
    { id: 'natsumatsuri', kanji: '夏祭り', romaji: 'Natsu matsuri', fr: 'Les festivals d\'été',      desc: 'Lanternes, feux d\'artifice, et un peu de révision à l\'ombre.', r: [[7, 15, 8, 10]] },
    { id: 'obon',       kanji: 'お盆',   romaji: 'Obon',       fr: 'La fête d\'Obon',                desc: 'On pense à ceux qui nous ont précédés.',                     r: [[8, 11, 8, 17]] },
    { id: 'zansho',     kanji: '残暑',   romaji: 'Zansho',     fr: 'Les dernières chaleurs',         desc: 'L\'été s\'attarde, la rentrée approche.',                    r: [[8, 18, 9, 7]] },
    { id: 'tsukimi',    kanji: '月見',   romaji: 'Tsukimi',    fr: 'La lune d\'automne',             desc: 'Une soirée calme, une tasse de thé, la pleine lune.',        r: [[9, 8, 10, 15]] },
    { id: 'momijigari', kanji: '紅葉狩り', romaji: 'Momijigari', fr: 'La chasse aux feuilles rouges', desc: 'Les érables rougissent : on ramasse les plus belles.',     r: [[10, 16, 11, 30]] },
    { id: 'shiwasu',    kanji: '師走',   romaji: 'Shiwasu',    fr: 'Le mois où même les maîtres courent', desc: 'Fin d\'année chargée : on respire, on s\'organise.',    r: [[12, 1, 12, 25]] }
  ];

  function seasonIdOfMonth(m) { // m : 0 à 11
    if (m >= 2 && m <= 4) return 'printemps';
    if (m >= 5 && m <= 7) return 'ete';
    if (m >= 8 && m <= 10) return 'automne';
    return 'hiver';
  }

  function periodOf(d) {
    var n = (d.getMonth() + 1) * 100 + d.getDate();
    for (var i = 0; i < PERIODS.length; i++) {
      var rs = PERIODS[i].r;
      for (var j = 0; j < rs.length; j++) {
        if (n >= rs[j][0] * 100 + rs[j][1] && n <= rs[j][2] * 100 + rs[j][3]) return PERIODS[i];
      }
    }
    return null;
  }

  // Prévisualisation : ?saison=hiver et/ou ?periode=tanabata dans l'adresse.
  function previewDate() {
    try {
      var q = new URLSearchParams(global.location.search);
      var per = (q.get('periode') || '').toLowerCase();
      var i, y = new Date().getFullYear();
      for (i = 0; i < PERIODS.length; i++) {
        if (PERIODS[i].id === per) return new Date(y, PERIODS[i].r[0][0] - 1, PERIODS[i].r[0][1]);
      }
      var sai = (q.get('saison') || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      var fake = { printemps: [3, 1], ete: [6, 20], automne: [9, 20], hiver: [0, 15] };
      if (fake[sai]) return new Date(y, fake[sai][0], fake[sai][1]);
    } catch (e) {}
    return null;
  }

  function currentSeason() {
    var d = previewDate() || new Date();
    var s = SEASONS[seasonIdOfMonth(d.getMonth())];
    return {
      id: s.id, kanji: s.kanji, romaji: s.romaji, fr: s.fr,
      noun: s.noun, kind: s.kind, theme: s.theme,
      period: periodOf(d)
    };
  }

  global.BenkyoSeason = { current: currentSeason, seasons: SEASONS, periods: PERIODS };
  try { document.documentElement.setAttribute('data-season', currentSeason().id); } catch (e) {}

  var MAX_PETALS = 140;
  var canvas = null;
  var ctx = null;
  var petals = [];
  var running = false;
  var lastTime = 0;
  var dpr = 1;

  var PALETTES = {
    petal: [
      ['#fbe4ec', '#f4bdd2'],
      ['#f9d7e3', '#eaa8c4'],
      ['#fdeef2', '#f6cad9'],
      ['#f7c8dd', '#e39ac0'],
      ['#fff6f8', '#f3d3dd']
    ],
    maple: [
      ['#f6a04d', '#d9531e'],
      ['#f4c15a', '#e07a1f'],
      ['#e9663a', '#b7311b'],
      ['#f2b36b', '#cf5a22'],
      ['#d9482b', '#9f2a1a']
    ],
    snow: [
      ['#ffffff', '#c3d6ee'],
      ['#f7fbff', '#b4cbe8'],
      ['#ffffff', '#cddff3']
    ],
    firefly: [
      ['#fff8b0', '#f1dd3c'],
      ['#f4ffb8', '#b9e65a'],
      ['#fffbd0', '#ffd95e']
    ]
  };
  // Réglages propres à chaque type de particule
  var KINDS = {
    petal:   { g: 1,    speed: 1,   ttl: 1,   size: [7, 14] },
    maple:   { g: 1.1,  speed: 1,   ttl: 1,   size: [8, 14] },
    snow:    { g: 0.5,  speed: 0.8, ttl: 1.2, size: [3, 6.5] },
    firefly: { g: 0.1,  speed: 0.5, ttl: 1.4, size: [5, 9] }
  };

  function reduced() {
    try {
      return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  function ensureCanvas() {
    if (canvas && canvas.parentNode) return canvas;
    canvas = document.createElement('canvas');
    canvas.className = 'sakura-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    return canvas;
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(global.innerWidth * dpr);
    canvas.height = Math.floor(global.innerHeight * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var resizeTimer = null;
  global.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn(count, originX, originY, spread, kind) {
    var w = global.innerWidth;
    var h = global.innerHeight;
    var cfg = KINDS[kind] || KINDS.petal;
    var colors = PALETTES[kind] || PALETTES.petal;
    for (var i = 0; i < count; i++) {
      if (petals.length >= MAX_PETALS) break;
      var angle = rand(-spread / 2, spread / 2) * Math.PI / 180;
      var speed = rand(2.2, 5.2) * cfg.speed;
      var pair = colors[(Math.random() * colors.length) | 0];
      petals.push({
        kind: kind,
        g: cfg.g,
        x: originX * w + rand(-30, 30),
        y: originY * h + rand(-20, 20),
        vx: Math.sin(angle) * speed,
        vy: -Math.abs(Math.cos(angle)) * speed * rand(0.9, 1.5),
        size: rand(cfg.size[0], cfg.size[1]),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.06, 0.06),
        sway: rand(0.8, 2.4),
        phase: rand(0, Math.PI * 2),
        life: 0,
        ttl: rand(3.6, 6) * cfg.ttl,
        light: pair[0],
        dark: pair[1],
        flip: rand(0.45, 1)
      });
    }
    start();
  }

  // Un pétale : deux courbes de Bézier + une petite échancrure claire.
  function drawPetal(p) {
    var s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(p.flip * (0.6 + 0.4 * Math.abs(Math.cos(p.phase + p.life * 2))), 1);
    var grad = ctx.createLinearGradient(0, -s, 0, s);
    grad.addColorStop(0, p.light);
    grad.addColorStop(1, p.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.95, -s * 0.7, s * 0.8, s * 0.6, 0, s);
    ctx.bezierCurveTo(-s * 0.8, s * 0.6, -s * 0.95, -s * 0.7, 0, -s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Une feuille d'érable : cinq lobes pointus + une petite tige.
  function lobe(len, wid, ang) {
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * wid * 1.6, -len * 0.55, 0, -len);
    ctx.quadraticCurveTo(-len * wid * 1.6, -len * 0.55, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  function drawMaple(p) {
    var s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(p.flip * (0.6 + 0.4 * Math.abs(Math.cos(p.phase + p.life * 2))), 1);
    var grad = ctx.createLinearGradient(0, -s, 0, s * 0.6);
    grad.addColorStop(0, p.light);
    grad.addColorStop(1, p.dark);
    ctx.fillStyle = grad;
    lobe(s * 1.05, 0.38, 0);
    lobe(s * 0.85, 0.34, -0.95);
    lobe(s * 0.85, 0.34, 0.95);
    lobe(s * 0.55, 0.26, -2.25);
    lobe(s * 0.55, 0.26, 2.25);
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = Math.max(1, s * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s * 0.7);
    ctx.stroke();
    ctx.restore();
  }

  // Un flocon : petit disque clair avec un fin contour bleuté.
  function drawSnow(p) {
    var s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = p.light;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.dark;
    ctx.stroke();
    ctx.restore();
  }

  // Une luciole : petit halo lumineux avec un cœur jaune.
  function drawFirefly(p) {
    var s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.2);
    g.addColorStop(0, 'rgba(255,245,140,.95)');
    g.addColorStop(0.35, 'rgba(214,236,88,.55)');
    g.addColorStop(1, 'rgba(214,236,88,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, s * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.dark;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticle(p) {
    if (p.kind === 'maple') drawMaple(p);
    else if (p.kind === 'snow') drawSnow(p);
    else if (p.kind === 'firefly') drawFirefly(p);
    else drawPetal(p);
  }

  function frame(now) {
    if (!running) return;
    var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
    lastTime = now;
    var h = global.innerHeight;
    ctx.clearRect(0, 0, global.innerWidth + 4, h + 4);

    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i];
      p.life += dt;
      p.vy += 5.5 * p.g * dt;     // gravité très douce : les particules flottent
      p.vx *= 0.985;
      p.x += (p.vx + Math.sin(p.phase + p.life * p.sway * 2) * p.sway) * dt * 60;
      p.y += p.vy * dt * 60;
      p.rot += p.vr * dt * 60;

      var fade = p.life > p.ttl - 1.2 ? Math.max(0, (p.ttl - p.life) / 1.2) : Math.min(1, p.life * 6);
      if (p.life >= p.ttl || p.y > h + 40) { petals.splice(i, 1); continue; }
      ctx.globalAlpha = p.kind === 'firefly' ? fade * (0.6 + 0.4 * Math.sin(p.phase + p.life * 4)) : fade;
      drawParticle(p);
    }
    ctx.globalAlpha = 1;

    if (!petals.length) { stop(); return; }
    global.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    global.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    lastTime = 0;
    if (ctx) ctx.clearRect(0, 0, global.innerWidth + 4, global.innerHeight + 4);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    ctx = null;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { petals.length = 0; stop(); }
  });

  // API compatible avec les anciens appels `confetti({...})`
  function sakura(opts) {
    opts = opts || {};
    if (reduced()) return;
    var mobile = global.innerWidth < 640;
    var asked = Number(opts.particleCount);
    if (!isFinite(asked) || asked <= 0) asked = 60;
    var count = Math.min(Math.round(asked * (mobile ? 0.45 : 0.7)), mobile ? 40 : 80);
    var origin = opts.origin || {};
    var ox = typeof origin.x === 'number' ? origin.x : 0.5;
    var oy = typeof origin.y === 'number' ? origin.y : 0.7;
    var spread = Number(opts.spread) || 70;
    ensureCanvas();
    // La nuit, ce sont des lucioles qui s'envolent, quelle que soit la saison.
    var T = global.BenkyoHeure && global.BenkyoHeure.current();
    spawn(count, ox, oy, Math.max(30, Math.min(spread, 140)), T && T.id === 'nuit' ? 'firefly' : currentSeason().kind);
  }

  sakura.reset = function () { petals.length = 0; stop(); };

  global.BenkyoSakura = sakura;
  global.confetti = sakura;   // remplace les confettis partout sur le site
})(window);
