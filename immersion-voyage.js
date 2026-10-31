/* Immersion voyage : vue « par la fenêtre » (train + avion), ambiance sonore synthétisée, événements de bord.
   Lit window.BenkyoLive.train / .plane (mis à jour par focus-train-voyage.js et focus-plane.js). Aucun fichier audio : tout est généré (Web Audio). */
(function () {
  'use strict';
  var PREF = 'benkyo_immersion_v1', EVK = 'benkyo_immersion_events_v1', H = 240;
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignoré */ } }
  var pref = load(PREF, { sound: false, vol: 0.5, fold: false });
  if (!pref.sky) pref.sky = 'auto'; if (!pref.wx) pref.wx = 'clear';
  var SKY_H = { morning: 7.1, day: 12, dusk: 18.4, night: 22.5 };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var sstep = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  var hash = function (i) { i = Math.imul(i | 0, 2654435761) ^ Math.imul((i | 0) + 97, 40503); i = Math.imul(i ^ (i >>> 15), 2246822519); return ((i ^ (i >>> 13)) >>> 0) / 4294967296; };
  var hx = function (c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; };
  var lerp = function (a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); };
  var rgb = function (a) { return 'rgb(' + a.map(Math.round).join(',') + ')'; };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ——— Ciel selon l'heure réelle ——— */
  var KEYS = [[0, '#0d1226', '#1c2540'], [5, '#10172e', '#2a3552'], [7.1, '#5a6aa0', '#ffc878'], [8.7, '#5f9bd8', '#dcebf5'], [16.5, '#5f9bd8', '#dcebf5'], [18.4, '#5e5394', '#ff8a4c'], [19.4, '#2a2c5c', '#d26a48'], [20.6, '#10172e', '#2a3552'], [24, '#0d1226', '#1c2540']];
  // Ciel du train : même courbe horaire, mais pastel (bleu-gris doux, crème à l'horizon) pour l'illustration à plat.
  var KEYS_TRAIN = [[0, '#0d1226', '#1c2540'], [4.8, '#10172e', '#2a3552'], [6, '#3f4f86', '#e7a27a'], [7.1, '#8fa6c8', '#ffd08a'], [8.7, '#9cc0dc', '#e9efe2'], [16.5, '#9cc0dc', '#e9efe2'], [17.6, '#a3a9c4', '#f6c890'], [18.4, '#6f5f96', '#ff8a4c'], [19.3, '#2e2f5e', '#d9724e'], [20.4, '#10172e', '#2a3552'], [24, '#0d1226', '#1c2540']];
  function sky(mode) {
    var K = mode === 'train' ? KEYS_TRAIN : KEYS;
    var d = new Date(), h = SKY_H[pref.sky] != null ? SKY_H[pref.sky] : d.getHours() + d.getMinutes() / 60, i = 0;
    while (i < K.length - 2 && h >= K[i + 1][0]) i += 1;
    var a = K[i], b = K[i + 1], t = (h - a[0]) / (b[0] - a[0]);
    var top = lerp(hx(a[1]), hx(b[1]), t), bot = lerp(hx(a[2]), hx(b[2]), t);
    if (pref.wx === 'rain') { top = lerp(top, [118, 128, 142], .5 * (1 - clamp(1 - (top[0] + top[1] + top[2]) / 380, 0, 1))); bot = lerp(bot, [168, 176, 184], .45); }
    return { top: rgb(top), bot: rgb(bot), night: clamp(1 - (top[0] + top[1] + top[2]) / 380, 0, 1), h: h };
  }

  /* ——— Événements de bord (fractions de progression ; visuels purement fonction de p, donc stables au rechargement) ——— */
  var EV = {
    train: [
      { id: 'tun1', at: .16, len: .03, jp: 'トンネル', fr: 'Tunnel : l’écran s’assombrit un instant.', snd: 'whoosh' },
      { id: 'bento', at: .30, jp: '車内販売', fr: 'Le chariot passe : un petit bentō pour la pause ?', snd: 'bell', ch: [['🍱 Bentō', 'Itadakimasu ! Bon appétit.'], ['🍙 Onigiri', 'Itadakimasu ! Un classique.'], ['🍵 Thé vert', 'Une gorgée de thé, et on repart.']] },
      { id: 'fuji', at: .44, len: .09, jp: '富士山が見えます', fr: 'Regarde par la fenêtre : le mont Fuji apparaît.', snd: 'chime' },
      { id: 'tun2', at: .60, len: .025, jp: 'トンネル', fr: 'Encore un tunnel…', snd: 'whoosh' },
      { id: 'tun3', at: .88, len: .02, jp: 'トンネル', fr: 'Dernier tunnel avant l’arrivée.', snd: 'whoosh' }
    ],
    plane: [
      { id: 'belt', at: .10, jp: 'シートベルト着用', fr: 'Le signal « ceinture » s’éteint : tu peux circuler.', snd: 'chime' },
      { id: 'meal', at: .26, jp: '機内食', fr: 'Service du repas : que veux-tu ?', snd: 'bell', ch: [['🍗 Poulet', 'Bon appétit !'], ['🐟 Poisson', 'Bon appétit !'], ['🥗 Végétarien', 'Bon appétit !']] },
      { id: 'clouds', at: .50, len: .12, jp: '雲海', fr: 'Une mer de nuages s’étend sous l’aile.', snd: 'chime' },
      { id: 'desc', at: .90, jp: '降下開始', fr: 'Début de la descente : la côte japonaise approche.', snd: 'chime' }
    ]
  };
  // Turbulences : seulement sur environ un vol sur trois, à un moment et pour une durée qui changent d'un vol à l'autre.
  var TURB_ODDS = .35, turb = null;
  function turbFor(id) {
    var k = Math.floor(Number(id) / 1000) || 0;
    if (hash(k + 11) >= TURB_ODDS) return null;
    return { id: 'turb', at: .28 + hash(k + 12) * .4, len: .035 + hash(k + 13) * .04, jp: '乱気流', fr: 'Turbulences : reste assis, ceinture attachée.', snd: 'belt' };
  }
  function evList(mode) { return mode === 'plane' && turb ? EV.plane.concat([turb]) : EV[mode]; }
  function act(mode, id, p) { var e = evList(mode).filter(function (x) { return x.id === id; })[0]; return e ? sstep(e.at - .004, e.at + .004, p) * (1 - sstep(e.at + e.len - .004, e.at + e.len + .004, p)) : 0; }
  var tunnelK = function (p) { return Math.max(act('train', 'tun1', p), act('train', 'tun2', p), act('train', 'tun3', p)); };

  /* ——— Son : tout est synthétisé ——— */
  var A = { ctx: null, mode: null, next: 0 };
  function ensure() {
    if (A.ctx) return A.ctx;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    A.ctx = new C(); A.master = A.ctx.createGain(); A.master.gain.value = pref.vol; A.master.connect(A.ctx.destination);
    var sr = A.ctx.sampleRate;
    function mk(sec, brown) {
      var n = Math.floor(sr * sec), buf = A.ctx.createBuffer(1, n, sr), d = buf.getChannelData(0), b = 0, i;
      for (i = 0; i < n; i += 1) { var r = Math.random() * 2 - 1; if (brown) { b = (b + .02 * r) / 1.02; d[i] = b * 3.5; } else d[i] = r; }
      // Raccord en fondu entre la fin et le début : la boucle ne produit plus de claquement audible.
      var f = Math.floor(sr * .5); for (i = 0; i < f; i += 1) { var k = i / f; d[n - f + i] = d[n - f + i] * (1 - k) + d[i] * k; }
      return buf;
    }
    var w = mk(6, false), br = mk(11, true);
    A.brownB = mk(17, true); // longueur différente : les deux couches du train ne se répètent jamais en même temps
    A.white = w; A.brown = br; return A.ctx;
  }
  function loop(buf, type, freq) {
    var c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; g.gain.value = 0; s.connect(f); f.connect(g); g.connect(A.master); s.start();
    return { s: s, f: f, g: g };
  }
  function tone(freq, t, dur, type, vol) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + .05);
  }
  function burst(t, dur, freq, q, vol, sweepTo) {
    var c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.white; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.02, dur / 3)); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random(), dur + .05);
  }
  // Passage d'un joint de rail : deux battements sourds et graves (les essieux de la voiture), comme un « ta-tam » étouffé.
  function thump(t, vol, pitch) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain(), k = pitch || 1;
    o.type = 'sine'; o.frequency.setValueAtTime(78 * k, t); o.frequency.exponentialRampToValueAtTime(42 * k, t + .16);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + .2);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + .24);
    burst(t, .11, 190 * k, .7, vol * .5);
  }
  function sfx(kind) {
    if (!pref.sound || !ensure()) return; var t = A.ctx.currentTime + .02;
    if (kind === 'chime') { tone(880, t, .9, 'sine', .22); tone(659, t + .45, 1.2, 'sine', .22); }
    else if (kind === 'belt') { tone(1046, t, .5, 'sine', .22); tone(1046, t + .6, .5, 'sine', .22); }
    else if (kind === 'bell') { for (var i = 0; i < 3; i += 1) tone(1320, t + i * .22, .35, 'triangle', .18); }
    else if (kind === 'whoosh') { burst(t, 2.2, 300, .6, .5, 1400); }
  }
  function startAmb(mode) {
    if (!pref.sound || !ensure()) return; if (A.ctx.state === 'suspended') A.ctx.resume();
    if (A.mode === mode) return; stopAmb(); A.mode = mode;
    if (mode === 'train') { A.a = loop(A.brown, 'lowpass', 140); A.b = loop(A.brownB, 'bandpass', 420); A.b.f.Q.value = .5; A.wob = 0; A.rough = .5; A.nextEvt = A.ctx.currentTime + 12 + Math.random() * 25; }
    else { A.a = loop(A.brown, 'lowpass', 300); A.b = loop(A.white, 'bandpass', 1400); A.hum = A.ctx.createOscillator(); A.hg = A.ctx.createGain(); A.hum.type = 'sine'; A.hum.frequency.value = 92; A.hg.gain.value = 0; A.hum.connect(A.hg); A.hg.connect(A.master); A.hum.start(); }
    A.next = 0;
  }
  function stopAmb() {
    if (!A.ctx || !A.mode) return; var c = A.ctx, nodes = [A.a, A.b], hum = A.hum, hg = A.hg;
    nodes.forEach(function (n) { if (n) { n.g.gain.setTargetAtTime(0, c.currentTime, .15); window.setTimeout(function () { try { n.s.stop(); } catch (e) { /* ignoré */ } }, 900); } });
    if (hum) { hg.gain.setTargetAtTime(0, c.currentTime, .15); window.setTimeout(function () { try { hum.stop(); } catch (e) { /* ignoré */ } }, 900); }
    A.mode = null; A.a = A.b = A.hum = A.hg = null;
  }
  function level(mode, L, p) {
    if (!A.ctx || A.mode !== mode) return; var c = A.ctx, now = c.currentTime, v = clamp((L.v || 0) / (mode === 'train' ? 280 : 900), 0, 1), moving = L.stop ? .12 : 1;
    if (mode === 'train') {
      var tk = tunnelK(p);
      // Le grondement dérive au hasard (marche aléatoire qui revient vers la moyenne) : aucun cycle régulier à reconnaître.
      A.wob = A.wob * .92 + (Math.random() - .5) * .07;
      A.rough = clamp(A.rough + (Math.random() - .5) * .16, 0, 1); // « état de la voie » : tantôt lisse, tantôt plus heurtée
      A.a.g.gain.setTargetAtTime(((.30 + .42 * v) * moving + A.wob * moving) * (1 + tk * .8), now, .6);
      A.b.g.gain.setTargetAtTime((.05 + .16 * v) * moving * (1 + tk * 1.4) * (.85 + .3 * A.rough), now, .6);
      A.a.f.frequency.setTargetAtTime(140 + tk * 120 + v * 30, now, .6);
      A.b.f.frequency.setTargetAtTime(380 + v * 220 + tk * 120 + A.wob * 400, now, .6);
      if (!L.stop && L.v > 5) {
        // Joints de rail : groupes de 1, 2 ou 4 battements (essieux), à intervalles très variables, parfois absents quand la voie est lisse.
        if (A.next < now) A.next = now + .1 + Math.random() * .6;
        // Fenêtre d'ordonnancement > intervalle d'appel (500 ms, ~1 s en onglet caché) : le rythme reste continu entre deux appels.
        while (A.next < now + 2.4) {
          if (Math.random() < .25 + .6 * A.rough) {
            var n = Math.random() < .22 ? 1 : Math.random() < .2 ? 4 : 2, pitch = .85 + Math.random() * .35, amp = (.6 + .4 * v) * (.7 + Math.random() * .5), j;
            for (j = 0; j < n; j += 1) thump(A.next + j * (.14 + Math.random() * .08), .1 * amp * (j ? .75 : 1), pitch * (j ? .96 : 1));
          }
          A.next += clamp(1.6 - v * .9, .6, 1.5) * (.55 + Math.random() * 1.1);
        }
        // De temps en temps, un souffle d'air (pont, croisement) : un balayage doux et bref.
        if (now > A.nextEvt) { burst(now + .2, 1.8 + Math.random() * 1.4, 420 + Math.random() * 300, .45, .12 * (.5 + v), 900 + Math.random() * 500); A.nextEvt = now + 25 + Math.random() * 50; }
      }
    } else {
      var tb = act('plane', 'turb', p);
      A.a.g.gain.setTargetAtTime((.5 + .25 * v) * (1 + tb * .8), now, .4);
      A.b.g.gain.setTargetAtTime(.012 * v + .006 * tb, now, .4);
      A.hg.gain.setTargetAtTime(.025 * (.4 + .6 * v), now, .5);
      if (tb > .2 && A.next < now) { burst(now + .02, .4, 120, .8, .5 * tb, 60); A.next = now + 1.2 + Math.random() * 1.6; }
    }
  }

  /* ——— Dessin de la fenêtre ——— */
  function cols(c, W, base, k, scroll, hf, color) {
    for (var x = 0; x < W; x += 6) { var wx = x + scroll * k, h = hf(wx); if (h > 0) { c.fillStyle = color(wx); c.fillRect(x, base - h, 6.5, h + 2); } }
  }
  var bio = function (wx) { return ((Math.floor(wx / 9000) % 4) + 4) % 4; };
  /* ——— Fenêtre du train : illustration à plat, en couches (parallaxe) ———
     Style : aplats de couleur, collines douces, rizières en patchwork, maisons à toit d'ardoise, poteaux et fils, grain léger.
     Tout est dessiné en proportion de la hauteur (u = H / 240) : la scène garde le même aspect en plein écran. */
  var parseRgb = function (s) { return String(s).match(/\d+/g).map(Number); };
  var NIGHT = [30, 36, 64], ZONE = 6400, TAU = 6.2832;
  // Paysage par zone : 0 ville, 1 rizières, 2 forêt, 3 bord de mer. Palette des carreaux de champs, par paysage.
  var PAL = [
    [[196, 206, 168], [178, 196, 150], [208, 206, 176], [168, 186, 142], [200, 202, 192]],
    [[212, 214, 150], [190, 206, 122], [222, 220, 160], [170, 196, 112], [200, 210, 132], [232, 228, 176]],
    [[110, 160, 106], [92, 148, 98], [124, 168, 110], [84, 138, 92]],
    [[188, 204, 138], [174, 198, 128], [226, 214, 168], [196, 208, 146], [182, 200, 132]]
  ];
  var blob = function (c, x, y, rx, ry) { c.moveTo(x + rx, y); c.ellipse(x, y, rx, ry, 0, 0, TAU); };
  var grainPat = null;
  function grain(c) {
    if (grainPat) return grainPat;
    var g = document.createElement('canvas'), x, im, d, i; g.width = g.height = 110; x = g.getContext('2d'); im = x.createImageData(110, 110); d = im.data;
    for (i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = Math.random() * 255; d[i + 3] = 11; }
    x.putImageData(im, 0, 0); grainPat = c.createPattern(g, 'repeat'); return grainPat;
  }
  // Crête douce : somme de sinus alimentée par la distance parcourue ; les longueurs d'onde suivent la taille de la fenêtre.
  function ridge(c, W, base, amp, k, sc, u, f1, f2, ph, fill) {
    c.beginPath(); c.moveTo(0, H + 8 * u);
    for (var x = 0; x <= W + 10; x += 10) { var wx = (x + sc * k) / u; c.lineTo(x, base - amp * (.5 + .32 * Math.sin(wx * f1 + ph) + .18 * Math.sin(wx * f2 + ph * 2.3))); }
    c.lineTo(W + 10, H + 8 * u); c.closePath(); c.fillStyle = fill; c.fill();
  }
  function cloud(c, x, y, w, fill, shade) {
    var h = w * .3;
    c.beginPath(); blob(c, x, y + h * .12, w * .5, h * .4); blob(c, x - w * .17, y - h * .12, w * .24, h * .46); blob(c, x + w * .1, y - h * .26, w * .27, h * .56); blob(c, x + w * .3, y, w * .2, h * .36);
    c.fillStyle = fill; c.fill();
    c.beginPath(); blob(c, x - w * .04, y + h * .34, w * .36, h * .09); c.fillStyle = shade; c.fill();
  }
  // Maison japonaise vue de côté : mur crème, toit d'ardoise à débord, deux ou trois fenêtres bleues (jaunes et allumées la nuit).
  function house(c, x, y, s, r, K, n, haze) {
    var w = (26 + r[0] * 14) * s, h = (13 + r[1] * 7) * s, rh = (10 + r[2] * 5) * s, nw = w > 34 * s ? 3 : 2, i, wx, wy = y - h + 4.2 * s;
    var wall = r[3] > .7 ? [232, 214, 200] : r[3] > .4 ? [238, 230, 208] : [226, 228, 214];
    var roof = r[2] > .75 ? [92, 104, 112] : r[2] > .35 ? [78, 84, 120] : [86, 78, 112];
    c.fillStyle = 'rgba(20,40,30,' + (.2 * (1 - n * .6)).toFixed(2) + ')'; c.beginPath(); blob(c, x + 2 * s, y + 1.2 * s, w * .62, 2.6 * s); c.fill();
    c.fillStyle = K(wall, haze); c.fillRect(x - w / 2, y - h, w, h);
    c.fillStyle = K([wall[0] - 26, wall[1] - 26, wall[2] - 20], haze); c.fillRect(x + w * .34, y - h, w * .16, h);
    c.fillStyle = K(roof, haze); c.beginPath(); c.moveTo(x - w / 2 - 4 * s, y - h + s); c.lineTo(x - w * .3, y - h - rh); c.lineTo(x + w * .3, y - h - rh); c.lineTo(x + w / 2 + 4 * s, y - h + s); c.closePath(); c.fill();
    c.fillStyle = K([roof[0] + 22, roof[1] + 22, roof[2] + 24], haze); c.beginPath(); c.moveTo(x - w * .3, y - h - rh); c.lineTo(x + w * .3, y - h - rh); c.lineTo(x + w * .26, y - h - rh + 2.4 * s); c.lineTo(x - w * .26, y - h - rh + 2.4 * s); c.closePath(); c.fill();
    c.fillStyle = K([roof[0] - 18, roof[1] - 18, roof[2] - 18], haze); c.fillRect(x - w / 2 - 4 * s, y - h - .8 * s, w + 8 * s, 2.6 * s);
    for (i = 0; i < nw; i += 1) {
      wx = x - w / 2 + w * (i + .5) / nw - 2.6 * s;
      if (n > .25 && r[4 + i] > .3) { c.fillStyle = 'rgba(255,196,100,' + (.2 * n).toFixed(2) + ')'; c.fillRect(wx - 2 * s, wy - 2 * s, 9.2 * s, 10.4 * s); c.fillStyle = '#ffd677'; }
      else c.fillStyle = K([116, 160, 208], haze);
      c.fillRect(wx, wy, 5.2 * s, 6.4 * s);
      c.fillStyle = n > .25 && r[4 + i] > .3 ? 'rgba(190,120,40,.55)' : 'rgba(255,255,255,.55)'; c.fillRect(wx + 2.4 * s, wy, .7 * s, 6.4 * s);
    }
  }
  function roundTree(c, x, y, s, K, haze, sakura) {
    c.fillStyle = 'rgba(20,40,30,.16)'; c.beginPath(); blob(c, x + 2 * s, y + s, 11 * s, 2.4 * s); c.fill();
    c.fillStyle = K([92, 70, 56], haze); c.fillRect(x - 1.7 * s, y - 13 * s, 3.4 * s, 13 * s);
    c.fillStyle = K(sakura ? [240, 168, 198] : [70, 142, 88], haze); c.beginPath(); blob(c, x, y - 19 * s, 11 * s, 10 * s); blob(c, x - 8 * s, y - 13 * s, 7.5 * s, 6.5 * s); blob(c, x + 8 * s, y - 13 * s, 7.5 * s, 6.5 * s); c.fill();
    c.fillStyle = K(sakura ? [252, 206, 224] : [96, 168, 108], haze); c.beginPath(); blob(c, x - 3 * s, y - 22 * s, 6 * s, 5 * s); c.fill();
  }
  function conifer(c, x, y, s, K, haze, hg) {
    c.fillStyle = 'rgba(20,40,30,.16)'; c.beginPath(); blob(c, x + 2 * s, y + s, 9 * s, 2.2 * s); c.fill();
    c.fillStyle = K([92, 70, 56], haze); c.fillRect(x - 1.5 * s, y - 8 * s, 3 * s, 8 * s);
    for (var i = 0; i < 3; i += 1) {
      var by = y - (6 + i * hg * .26) * s, w = (11 - i * 2.6) * s, top = by - hg * .5 * s;
      c.fillStyle = K([44, 112, 80], haze); c.beginPath(); c.moveTo(x - w, by); c.lineTo(x, top); c.lineTo(x + w, by); c.closePath(); c.fill();
      c.fillStyle = K([62, 136, 96], haze); c.beginPath(); c.moveTo(x - w, by); c.lineTo(x, top); c.lineTo(x - w * .1, by); c.closePath(); c.fill();
    }
  }
  function block(c, x, y, w, h, u, K, haze, n, seed) {
    var xx, yy;
    c.fillStyle = K([208, 214, 228], haze); c.fillRect(x, y - h, w, h + 2 * u);
    c.fillStyle = K([186, 194, 214], haze); c.fillRect(x + w * .72, y - h, w * .28, h + 2 * u);
    c.fillStyle = K([168, 176, 198], haze); c.fillRect(x + w * .3, y - h - 3 * u, w * .22, 3 * u);
    for (yy = y - h + 5 * u; yy < y - 4 * u; yy += 7 * u) for (xx = x + 3.5 * u; xx < x + w - 4 * u; xx += 6 * u) {
      c.fillStyle = n > .3 && hash(seed + yy * 3 + xx) > .45 ? 'rgba(255,218,140,.95)' : K([236, 241, 250], haze);
      c.fillRect(xx, yy, 3 * u, 3.6 * u);
    }
  }

  /* ——— Gare vue depuis la fenêtre ———
     sta.d = distance (km) jusqu'à la gare la plus proche : la gare défile avec le premier plan (même vitesse que les poteaux),
     elle arrive donc doucement pendant le freinage et s'immobilise, centrée, quand le train est à quai. */
  var KM_PX = 2040, STA_K = 2.2;
  function station(c, W, u, K, n, sta, t) {
    var Ls = Math.max(W * 1.25, 760 * u), cx = W / 2 + sta.d * KM_PX * STA_K * u, x0 = cx - Ls / 2, x1 = cx + Ls / 2;
    if (x1 < -20 * u || x0 > W + 20 * u) return;
    var roofY = H * .07, roofH = 11 * u, platY = H * .8, wallY = H * .6, i, px, step = 150 * u;
    // mur du fond (bas, on voit encore le paysage au-dessus) et quai
    c.fillStyle = K([214, 206, 190]); c.fillRect(x0, wallY, Ls, platY - wallY);
    c.fillStyle = K([190, 182, 166]); c.fillRect(x0, wallY, Ls, 3 * u);
    for (px = x0 + 40 * u; px < x1 - 30 * u; px += 46 * u) { c.fillStyle = K([200, 192, 176]); c.fillRect(px, wallY + 8 * u, 1.4 * u, platY - wallY - 10 * u); }
    c.fillStyle = K([176, 178, 182]); c.fillRect(x0, platY, Ls, H - platY + 6 * u);
    c.fillStyle = K([200, 202, 206]); c.fillRect(x0, platY, Ls, 4 * u);
    c.fillStyle = K([236, 196, 58]); c.fillRect(x0, H - 16 * u, Ls, 5 * u); // bande podotactile jaune
    c.fillStyle = K([120, 122, 128]); c.fillRect(x0, H - 6 * u, Ls, 8 * u);
    // piliers
    for (px = x0 + step / 2; px < x1; px += step) { c.fillStyle = K([92, 104, 112]); c.fillRect(px - 3.2 * u, roofY + roofH, 6.4 * u, platY - roofY - roofH); c.fillStyle = K([120, 132, 140]); c.fillRect(px - 3.2 * u, roofY + roofH, 2 * u, platY - roofY - roofH); }
    // bancs et distributeur
    function bench(bx) { c.fillStyle = K([120, 160, 196]); c.fillRect(bx - 22 * u, platY - 14 * u, 44 * u, 5 * u); c.fillRect(bx - 22 * u, platY - 24 * u, 44 * u, 4 * u); c.fillStyle = K([70, 76, 86]); c.fillRect(bx - 19 * u, platY - 9 * u, 3 * u, 9 * u); c.fillRect(bx + 16 * u, platY - 9 * u, 3 * u, 9 * u); }
    bench(cx - 230 * u); bench(cx + 230 * u);
    var vx = cx + Ls * .38; c.fillStyle = K([214, 62, 70]); c.fillRect(vx, platY - 50 * u, 26 * u, 50 * u); c.fillStyle = n > .3 ? 'rgba(255,240,200,.9)' : K([236, 240, 246]); c.fillRect(vx + 4 * u, platY - 44 * u, 18 * u, 20 * u);
    // auvent
    c.fillStyle = K([70, 84, 92]); c.fillRect(x0 - 6 * u, roofY, Ls + 12 * u, roofH);
    c.fillStyle = K([232, 234, 236]); c.fillRect(x0 - 6 * u, roofY + roofH, Ls + 12 * u, 3 * u);
    c.fillStyle = K([46, 56, 62]); c.fillRect(x0 - 6 * u, -10 * u, Ls + 12 * u, roofY + 10 * u);
    for (px = x0 + step; px < x1 - 20 * u; px += step) {
      c.fillStyle = n > .3 ? 'rgba(255,236,190,.95)' : K([240, 242, 244]); c.fillRect(px - 16 * u, roofY + roofH + 3 * u, 32 * u, 3 * u);
      if (n > .3) { var lg = c.createRadialGradient(px, roofY + roofH + 6 * u, 2 * u, px, roofY + roofH + 6 * u, 70 * u); lg.addColorStop(0, 'rgba(255,230,170,' + (.28 * n).toFixed(2) + ')'); lg.addColorStop(1, 'rgba(255,230,170,0)'); c.fillStyle = lg; c.fillRect(px - 70 * u, roofY, 140 * u, 140 * u); }
    }
    // panneau du nom de la gare (style JR : blanc, nom japonais en grand, rōmaji, bande verte)
    function sign(sx, sc2) {
      var w = 168 * u * sc2, h = 54 * u * sc2, y = roofY + roofH + 16 * u, jp = sta.jp || '', nm = sta.name || '';
      c.fillStyle = K([60, 66, 72]); c.fillRect(sx - w * .3, roofY + roofH, 2 * u, 16 * u); c.fillRect(sx + w * .3, roofY + roofH, 2 * u, 16 * u);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(sx - w / 2 + 2 * u, y + 3 * u, w, h);
      c.fillStyle = n > .3 ? '#fbf6e6' : '#ffffff'; c.fillRect(sx - w / 2, y, w, h);
      c.fillStyle = '#2f9e5b'; c.fillRect(sx - w / 2, y + h * .68, w, h * .12);
      c.fillStyle = '#1b2433'; c.textAlign = 'center';
      if (jp) { c.font = '700 ' + Math.round(19 * u * sc2) + "px 'Noto Serif JP','Hiragino Mincho ProN',serif"; c.fillText(jp, sx, y + h * .4); c.font = '800 ' + Math.round(9 * u * sc2) + 'px Inter,sans-serif'; c.fillText(nm.toUpperCase(), sx, y + h * .6); }
      else { c.font = '800 ' + Math.round(14 * u * sc2) + 'px Inter,sans-serif'; c.fillText(nm, sx, y + h * .52); }
      c.font = '700 ' + Math.round(7 * u * sc2) + 'px Inter,sans-serif'; c.fillStyle = '#fff';
      c.fillText(sta.start ? 'GARE DE DÉPART' : sta.end ? 'TERMINUS' : 'ARRÊT', sx, y + h * .775 + 2 * u * sc2);
      c.textAlign = 'left';
    }
    sign(cx, 1); sign(cx - Ls * .36, .7); sign(cx + Ls * .3, .7);
    // voyageurs sur le quai (silhouettes simples)
    for (i = 0; i < 4; i += 1) {
      px = cx + (hash(i + 4100) - .5) * Ls * .8; var ph = (30 + hash(i + 4110) * 8) * u, col = [[70, 90, 140], [160, 80, 90], [60, 70, 80], [200, 160, 90]][i];
      c.fillStyle = K(col); c.fillRect(px - 5 * u, platY - ph + 9 * u, 10 * u, ph - 9 * u);
      c.fillStyle = K([232, 196, 170]); c.beginPath(); blob(c, px, platY - ph + 4 * u, 4.4 * u, 4.6 * u); c.fill();
    }
  }
  /* ——— Lumières des villes au loin, la nuit : silhouettes d'immeubles et fenêtres qui scintillent ——— */
  function cityLights(c, W, u, hz, sc, t, n) {
    var k = .045, sl = 26 * u, i0 = Math.floor(sc * k / sl) - 1, i, a = clamp((n - .25) / .5, 0, 1);
    for (i = i0; i < i0 + Math.ceil(W / sl) + 3; i += 1) {
      var z = hash(i * 7 + 5); if (((Math.floor(i / 14) % 3) + 3) % 3 === 2 && z > .25) continue; // campagne : peu de lumières
      var x = i * sl - sc * k, bh = (6 + hash(i + 51) * 22) * u, bw = sl * (.55 + hash(i + 77) * .4), by = hz + 10 * u;
      c.fillStyle = 'rgba(22,26,48,' + (.85 * a).toFixed(2) + ')'; c.fillRect(x, by - bh, bw, bh);
      var rows = Math.floor(bh / (4 * u)), cols2 = Math.max(1, Math.floor(bw / (4 * u))), r, q;
      for (r = 0; r < rows; r += 1) for (q = 0; q < cols2; q += 1) {
        var hv = hash(i * 131 + r * 17 + q); if (hv > .42) continue;
        var tw = .6 + .4 * Math.sin(t * (.6 + hv * 2) + i + q);
        c.fillStyle = (hv < .08 ? 'rgba(255,120,110,' : hv < .2 ? 'rgba(200,225,255,' : 'rgba(255,214,140,') + (a * tw * .9).toFixed(2) + ')';
        c.fillRect(x + q * 4 * u + u, by - bh + r * 4 * u + u, 1.6 * u, 1.6 * u);
      }
      if (z > .93) { c.fillStyle = 'rgba(255,60,60,' + (a * (Math.sin(t * 3 + i) > 0 ? .95 : .2)).toFixed(2) + ')'; c.fillRect(x + bw / 2 - u, by - bh - 2.4 * u, 2 * u, 2 * u); }
    }
    var hg = c.createLinearGradient(0, hz - 30 * u, 0, hz + 12 * u); hg.addColorStop(0, 'rgba(255,170,110,0)'); hg.addColorStop(1, 'rgba(255,170,110,' + (.16 * a).toFixed(2) + ')'); c.fillStyle = hg; c.fillRect(0, hz - 30 * u, W, 42 * u);
  }
  /* ——— Lumière dorée du matin / orangée du crépuscule posée sur tout le paysage ——— */
  function glow(c, W, Hh, sk) {
    var h = sk.h, m = sstep(5.6, 6.8, h) * (1 - sstep(7.8, 9.2, h)), d = sstep(16.8, 18.2, h) * (1 - sstep(19.2, 20.4, h));
    if (pref.wx === 'rain') { m *= .35; d *= .35; }
    if (m > .01) { c.fillStyle = 'rgba(255,196,110,' + (m * .16).toFixed(3) + ')'; c.fillRect(0, 0, W, Hh); }
    if (d > .01) { var g = c.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, 'rgba(255,120,60,' + (d * .1).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,140,70,' + (d * .2).toFixed(3) + ')'); c.fillStyle = g; c.fillRect(0, 0, W, Hh); }
  }
  /* ——— Pluie fine : filets de pluie dehors + gouttes qui glissent sur la vitre ——— */
  function rain(c, W, S, u, dt, v) {
    var Hh = H, i, R = S.rain;
    c.fillStyle = 'rgba(70,82,100,.16)'; c.fillRect(0, 0, W, Hh);
    if (!R || R.W !== W || R.H !== Hh) {
      R = S.rain = { W: W, H: Hh, d: [], s: [] };
      for (i = 0; i < 70; i += 1) R.s.push({ x: Math.random() * W, y: Math.random() * Hh, l: (8 + Math.random() * 14) * u, sp: (240 + Math.random() * 160) * u });
      for (i = 0; i < 46; i += 1) R.d.push({ x: Math.random() * W, y: Math.random() * Hh, r: (.8 + Math.random() * 2.2) * u, vy: 0, st: Math.random() < .3 });
    }
    var slant = .25 + clamp(v || 0, 0, 1.2) * .9, k = reduce ? 0 : dt;
    c.strokeStyle = 'rgba(214,226,240,.32)'; c.lineWidth = .9 * u; c.beginPath();
    R.s.forEach(function (o) {
      o.y += o.sp * k; o.x -= o.sp * k * slant; if (o.y > Hh || o.x < -20 * u) { o.y = -o.l; o.x = Math.random() * (W + 80 * u); }
      c.moveTo(o.x, o.y); c.lineTo(o.x + o.l * slant, o.y - o.l);
    }); c.stroke();
    R.d.forEach(function (o) {
      if (o.st) { o.vy = Math.min(o.vy + 30 * u * k, 60 * u); o.y += o.vy * k; o.x -= (v || 0) * 40 * u * k; if (Math.random() < .01) o.vy *= .2; }
      else if (Math.random() < .002 * (1 + (v || 0) * 3)) o.st = true;
      if (o.y > Hh + 6 * u || o.x < -6 * u) { o.x = Math.random() * W; o.y = Math.random() * Hh * .7; o.vy = 0; o.st = Math.random() < .25; o.r = (.8 + Math.random() * 2.2) * u; }
      if (o.st && o.vy > 8 * u) { c.strokeStyle = 'rgba(230,238,248,.12)'; c.lineWidth = o.r * .9; c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(o.x + (v || 0) * 6 * u, o.y - o.vy * .35); c.stroke(); }
      c.fillStyle = 'rgba(40,50,66,.22)'; c.beginPath(); c.arc(o.x, o.y + o.r * .3, o.r, 0, TAU); c.fill();
      c.fillStyle = 'rgba(235,242,250,.45)'; c.beginPath(); c.arc(o.x - o.r * .3, o.y - o.r * .3, o.r * .45, 0, TAU); c.fill();
    });
  }
  /* ——— Bruit de pluie (synthétisé) : pluie douce et feutrée, sans grésillement ———
     Bruit « rose » (plus doux que le blanc) filtré en passe-bas, deux couches de longueurs différentes
     qui ondulent lentement, et quelques gouttes rondes et graves sur la vitre (pas de clics aigus). */
  function pinkBuf(sec) {
    var c = A.ctx, sr = c.sampleRate, n = Math.floor(sr * sec), buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0), i;
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (i = 0; i < n; i += 1) {
      var w = Math.random() * 2 - 1;
      b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
      b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926;
    }
    var f = Math.floor(sr * .8); for (i = 0; i < f; i += 1) { var k = i / f; d[n - f + i] = d[n - f + i] * (1 - k) + d[i] * k; }
    return buf;
  }
  function rainLayer(buf, hp, lp, rate) {
    var c = A.ctx, s = c.createBufferSource(), h = c.createBiquadFilter(), l = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; s.loop = true; s.playbackRate.value = rate || 1;
    h.type = 'highpass'; h.frequency.value = hp; h.Q.value = .5; l.type = 'lowpass'; l.frequency.value = lp; l.Q.value = .4; g.gain.value = 0;
    s.connect(h); h.connect(l); l.connect(g); g.connect(A.master); s.start(0, Math.random() * 3);
    return { s: s, g: g, l: l };
  }
  function drop(t, vol) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain(), f0 = 700 + Math.random() * 600;
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * .55, t + .07);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + .09);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + .12);
  }
  function rainSound() {
    var on = pref.sound && pref.wx === 'rain' && (st.train.live || st.plane.live);
    if (!on) { if (A.rain) { A.rain.a.g.gain.setTargetAtTime(0, A.ctx.currentTime, .5); A.rain.b.g.gain.setTargetAtTime(0, A.ctx.currentTime, .5); } return; }
    if (!ensure()) return; var c = A.ctx, now = c.currentTime;
    if (!A.rain) {
      if (!A.pinkA) { A.pinkA = pinkBuf(9); A.pinkB = pinkBuf(13); }
      A.rain = { a: rainLayer(A.pinkA, 250, 2200, 1), b: rainLayer(A.pinkB, 90, 900, .9), ph: Math.random() * 6 };
    }
    A.rain.ph += .05;
    var sway = .5 + .5 * Math.sin(A.rain.ph * .37) * Math.sin(A.rain.ph * .13 + 1);
    A.rain.a.g.gain.setTargetAtTime(.16 + .06 * sway, now, 1.2);
    A.rain.b.g.gain.setTargetAtTime(.22 + .05 * (1 - sway), now, 1.2);
    A.rain.a.l.frequency.setTargetAtTime(1900 + 500 * sway, now, 1.5);
    if (!A.nextDrip || A.nextDrip < now) A.nextDrip = now + .2;
    while (A.nextDrip < now + .8) { if (Math.random() < .6) drop(A.nextDrip, .006 + Math.random() * .012); A.nextDrip += .18 + Math.random() * .7; }
  }
  function trainScene(c, W, S, L, p, sk, dt) {
    var u = H / 240, v = L.stop ? 0 : clamp((L.v || 0) / 300, 0, 1.2), i, j, k, x, px, b, hv, r, q;
    S.scroll += reduce ? 0 : v * dt * 170; S.t = (S.t || 0) + (reduce ? 0 : dt);
    var sc = S.scroll * u, t = S.t, n = clamp(sk.night * 1.2, 0, 1), tk = tunnelK(p), fj = act('train', 'fuji', p);
    var bot = parseRgb(sk.bot), hz = H * .5, gm = H * .6, bo = Math.floor(hash(Number(S.id) || 0) * 4);
    var K = function (a, haze) { return rgb(lerp(haze ? lerp(a, bot, haze * (1 - n * .5)) : a, NIGHT, n * .62)); };
    var bm = function (kk, xx) { return (((Math.floor((sc * kk + xx) / (ZONE * kk * u)) + bo) % 4) + 4) % 4; };
    var span = W + 300 * u;
    c.save(); c.translate(0, reduce ? 0 : (Math.sin(t * 7.3) * .35 + Math.sin(t * 2.1) * .5) * u * v);

    // — ciel
    var g = c.createLinearGradient(0, 0, 0, hz + 24 * u); g.addColorStop(0, sk.top); g.addColorStop(1, sk.bot); c.fillStyle = g; c.fillRect(0, -8 * u, W, H + 16 * u);
    if (n > .3) { for (i = 0; i < 64; i += 1) { c.fillStyle = 'rgba(255,255,255,' + (n * (.45 + .45 * Math.sin(t * 1.4 + i * 1.7))).toFixed(2) + ')'; c.fillRect(hash(i) * W, hash(i + 90) * hz * .85, 1.6 * u, 1.6 * u); } }
    if (n < .55) {
      var sa = clamp((sk.h - 6.5) / 12, 0, 1), sx = W * (.1 + .8 * sa), sy = hz - 6 * u - Math.sin(sa * Math.PI) * H * .34, sg = c.createRadialGradient(sx, sy, 2 * u, sx, sy, 120 * u), sv = (1 - n * 1.6) * (pref.wx === 'rain' ? .25 : 1);
      sg.addColorStop(0, 'rgba(255,246,208,' + (.85 * sv).toFixed(2) + ')'); sg.addColorStop(.3, 'rgba(255,240,196,' + (.3 * sv).toFixed(2) + ')'); sg.addColorStop(1, 'rgba(255,240,196,0)');
      c.fillStyle = sg; c.fillRect(sx - 130 * u, sy - 130 * u, 260 * u, 260 * u); c.fillStyle = 'rgba(255,248,214,' + sv.toFixed(2) + ')'; c.beginPath(); c.arc(sx, sy, 15 * u, 0, TAU); c.fill();
    } else {
      var ma = clamp(((sk.h < 12 ? sk.h + 24 : sk.h) - 19.5) / 9.5, 0, 1), mx = W * (.12 + .76 * ma), my = hz - 10 * u - Math.sin(ma * Math.PI) * H * .3, mv = clamp((n - .45) * 3, 0, 1), mg = c.createRadialGradient(mx, my, 2 * u, mx, my, 90 * u);
      mg.addColorStop(0, 'rgba(225,230,255,' + (.35 * mv).toFixed(2) + ')'); mg.addColorStop(1, 'rgba(225,230,255,0)'); c.fillStyle = mg; c.fillRect(mx - 100 * u, my - 100 * u, 200 * u, 200 * u);
      c.globalAlpha = mv; c.fillStyle = '#f1efd8'; c.beginPath(); c.arc(mx, my, 11 * u, 0, TAU); c.fill(); c.fillStyle = 'rgba(190,190,165,.4)'; c.beginPath(); blob(c, mx - 3 * u, my - 2 * u, 2.6 * u, 2.6 * u); blob(c, mx + 3.4 * u, my + 3 * u, 1.8 * u, 1.8 * u); c.fill(); c.globalAlpha = 1;
    }
    // — nuages à plat, qui dérivent lentement
    c.globalAlpha = n > .5 ? .5 : .92;
    for (i = 0; i < 6; i += 1) {
      var cw = (70 + hash(i + 300) * 80) * u, cx = ((((hash(i + 310) * span - sc * (.012 + hash(i + 320) * .01) - t * (2 + hash(i + 340) * 3) * u) % span) + span) % span) - 150 * u, cy = (16 + hash(i + 330) * 70) * u;
      cloud(c, cx, cy, cw, K(pref.wx === 'rain' ? [176, 184, 196] : [255, 255, 255], .05), K(pref.wx === 'rain' ? [140, 150, 166] : [214, 224, 240], .1));
    }
    c.globalAlpha = 1;

    // — collines lointaines, mont Fuji, voile de brume
    ridge(c, W, hz + 4 * u, 70 * u, .03, sc, u, .0042, .0017, 1.2, K([138, 168, 188], .42));
    if (n > .25) cityLights(c, W, u, hz, sc, t, n);
    if (fj > 0) {
      var fx = W * (1.15 - (p - .44) / .09 * 1.35), fb = hz + 12 * u, a = .87 * u; c.globalAlpha = fj;
      c.fillStyle = K([124, 146, 190], .22); c.beginPath(); c.moveTo(fx - 230 * a, fb); c.bezierCurveTo(fx - 120 * a, fb - 20 * a, fx - 70 * a, fb - 100 * a, fx - 26 * a, fb - 138 * a); c.lineTo(fx + 26 * a, fb - 138 * a); c.bezierCurveTo(fx + 70 * a, fb - 100 * a, fx + 120 * a, fb - 20 * a, fx + 230 * a, fb); c.closePath(); c.fill();
      c.fillStyle = K([246, 248, 252], .06); c.beginPath(); c.moveTo(fx - 26 * a, fb - 138 * a); c.lineTo(fx + 26 * a, fb - 138 * a); c.lineTo(fx + 52 * a, fb - 100 * a); c.lineTo(fx + 40 * a, fb - 104 * a); c.lineTo(fx + 30 * a, fb - 90 * a); c.lineTo(fx + 16 * a, fb - 102 * a); c.lineTo(fx + 4 * a, fb - 86 * a); c.lineTo(fx - 8 * a, fb - 100 * a); c.lineTo(fx - 22 * a, fb - 88 * a); c.lineTo(fx - 34 * a, fb - 102 * a); c.lineTo(fx - 52 * a, fb - 98 * a); c.closePath(); c.fill();
      c.fillStyle = 'rgba(70,86,140,.2)'; c.beginPath(); c.moveTo(fx + 26 * a, fb - 138 * a); c.bezierCurveTo(fx + 70 * a, fb - 100 * a, fx + 120 * a, fb - 20 * a, fx + 230 * a, fb); c.lineTo(fx + 40 * a, fb); c.closePath(); c.fill();
      c.globalAlpha = 1;
    }
    ridge(c, W, hz + 14 * u, 46 * u, .07, sc, u, .0062, .0021, 3.1, K([112, 156, 150], .3));
    var hg = c.createLinearGradient(0, hz - 24 * u, 0, hz + 30 * u), hc = bot.map(Math.round).join(',');
    hg.addColorStop(0, 'rgba(' + hc + ',0)'); hg.addColorStop(1, 'rgba(' + hc + ',' + (.34 - n * .2).toFixed(2) + ')'); c.fillStyle = hg; c.fillRect(0, hz - 24 * u, W, 54 * u);

    // — plan moyen (k .22) : ville, rizières, forêt ou mer selon la zone
    k = .22; var cwd = 18 * u, j0 = Math.floor(sc * k / cwd) - 1;
    for (j = j0; j < j0 + Math.ceil(W / cwd) + 3; j += 1) {
      px = j * cwd - sc * k; b = bm(k, px + cwd / 2);
      if (b === 3) {
        c.fillStyle = K([164, 206, 228], .4); c.fillRect(px, hz + 3 * u, cwd + 1, (gm - hz) * .5);
        c.fillStyle = K([120, 178, 210], .3); c.fillRect(px, hz + 3 * u + (gm - hz) * .5, cwd + 1, H);
        c.fillStyle = K([232, 220, 176], .35); c.fillRect(px, gm + 8 * u, cwd + 1, H);
      } else { c.fillStyle = K(b === 2 ? [92, 150, 108] : b === 0 ? [166, 184, 156] : [168, 196, 124], .34); c.fillRect(px, gm, cwd + 1, H); }
    }
    var sl = 44 * u, i0 = Math.floor(sc * k / sl) - 2;
    for (i = i0; i < i0 + Math.ceil(W / sl) + 5; i += 1) {
      px = i * sl - sc * k + sl / 2; b = bm(k, px); hv = hash(i + 400); var by = gm + 12 * u;
      if (b === 0) {
        if (hv < .55) block(c, px - 12 * u, by, (16 + hash(i + 410) * 16) * u, (26 + hash(i + 420) * 70 * (hv > .3 ? 1 : .45)) * u, u, K, .4, n, i * 13);
        else if (hv < .8) house(c, px, by, .55 * u, [hash(i + 1), hash(i + 2), hash(i + 3), hash(i + 4), hash(i + 5), hash(i + 6)], K, n, .42);
      } else if (b === 1) {
        if (hv < .35) roundTree(c, px, by, .5 * u, K, .42, false);
        else if (hv < .5) house(c, px, by, .5 * u, [hash(i + 1), hash(i + 2), hash(i + 3), hash(i + 4), hash(i + 5), hash(i + 6)], K, n, .42);
        else if (hv > .97) { c.fillStyle = K([124, 104, 118], .4); for (q = 0; q < 4; q += 1) c.fillRect(px - (11 - q * 2.2) * u, by - (q * 7 + 6) * u, (22 - q * 4.4) * u, 3 * u); c.fillRect(px - 1.3 * u, by - 38 * u, 2.6 * u, 8 * u); }
      } else if (b === 2) {
        conifer(c, px - 8 * u, by, .62 * u, K, .4, 44 + hv * 20); if (hv > .35) conifer(c, px + 9 * u, by + 2 * u, .5 * u, K, .42, 40 + hash(i + 430) * 18);
      } else if (hv < .09) {
        c.fillStyle = K([244, 240, 232], .3); c.beginPath(); c.moveTo(px, hz + 22 * u); c.lineTo(px + 11 * u, hz + 22 * u); c.lineTo(px + 3.5 * u, hz + 6 * u); c.closePath(); c.fill();
        c.fillStyle = K([108, 88, 84], .3); c.fillRect(px - 3 * u, hz + 22 * u, 19 * u, 2.8 * u);
      } else if (hv < .15) { c.fillStyle = K([104, 146, 150], .45); c.beginPath(); c.moveTo(px - 46 * u, hz + 3 * u); c.quadraticCurveTo(px - 8 * u, hz - 22 * u, px + 40 * u, hz + 3 * u); c.closePath(); c.fill(); }
      else if (hv > .55 && hv < .7) { c.fillStyle = 'rgba(255,255,255,' + (.5 * (1 - n * .7)).toFixed(2) + ')'; c.fillRect(px - 14 * u, hz + 16 * u + hv * 40 * u, (18 + hv * 14) * u, 1.5 * u); }
    }

    // — sol proche : champs en patchwork, par rangées de plus en plus larges (parallaxe)
    var RY = [.72, .775, .84, .92, 1.02], RK = [.34, .5, .66, .86], RW = [70, 86, 104, 130], y0, y1, tw, pal, hh, t0;
    for (r = 0; r < 4; r += 1) {
      y0 = RY[r] * H; y1 = RY[r + 1] * H + 8 * u; tw = RW[r] * u; k = RK[r]; t0 = Math.floor(sc * k / tw) - 1;
      for (i = t0; i < t0 + Math.ceil(W / tw) + 3; i += 1) {
        px = i * tw - sc * k; b = bm(k, px + tw / 2); pal = PAL[b]; hh = hash(i * 7 + r * 131 + 5);
        c.fillStyle = K(pal[Math.floor(hh * pal.length)], .04 + (3 - r) * .05); c.fillRect(px, y0, tw + 1, y1 - y0);
        if (b === 1 && hh > .45) { c.fillStyle = 'rgba(70,110,50,.11)'; for (q = 1; q < 4; q += 1) c.fillRect(px, y0 + (y1 - y0) * q / 4, tw + 1, 1.1 * u); }
        c.fillStyle = 'rgba(255,255,225,' + (.2 * (1 - n * .8)).toFixed(2) + ')'; c.fillRect(px, y0, 1.6 * u, y1 - y0);
      }
      c.fillStyle = 'rgba(255,255,225,' + (.22 * (1 - n * .8)).toFixed(2) + ')'; c.fillRect(0, y0, W, 1.2 * u);
    }
    // maisons, arbres, torii (k .5, posés sur la deuxième rangée)
    var gy = H * .815, sl3 = 52 * u; k = .5; i0 = Math.floor(sc * k / sl3) - 2;
    for (i = i0; i < i0 + Math.ceil(W / sl3) + 5; i += 1) {
      px = i * sl3 - sc * k + sl3 / 2; b = bm(k, px); hv = hash(i + 700);
      var rv = [hash(i + 710), hash(i + 720), hash(i + 730), hash(i + 740), hash(i + 750), hash(i + 760), hash(i + 770)];
      if (b === 0) {
        if (hv < .52) { if (rv[4] > .35) house(c, px + (rv[5] - .3) * 22 * u, gy - 4 * u, .95 * u, [rv[1], rv[2], rv[3], rv[0], rv[6], rv[5], rv[4]], K, n, .14); house(c, px, gy, 1.2 * u, rv, K, n, 0); }
        else if (hv < .66) roundTree(c, px, gy, u, K, 0, false);
        else if (hv < .76) block(c, px - 14 * u, gy, (26 + rv[0] * 10) * u, (56 + rv[1] * 34) * u, u, K, .06, n, i * 7);
      } else if (b === 1) {
        if (hv < .2) house(c, px, gy, u, rv, K, n, 0);
        else if (hv < .46) roundTree(c, px, gy, u * (.85 + rv[1] * .3), K, 0, rv[0] > .82);
        else if (hv < .52) { c.fillStyle = K([200, 70, 50]); c.fillRect(px - 9 * u, gy - 22 * u, 2.6 * u, 24 * u); c.fillRect(px + 6.4 * u, gy - 22 * u, 2.6 * u, 24 * u); c.fillRect(px - 12 * u, gy - 25 * u, 24 * u, 3.2 * u); c.fillRect(px - 9 * u, gy - 18 * u, 18 * u, 2.2 * u); }
      } else if (b === 2) {
        if (hv < .64) { conifer(c, px - 10 * u, gy - 2 * u, .9 * u, K, .04, 56 + rv[0] * 22); conifer(c, px + 10 * u, gy, u, K, 0, 60 + rv[1] * 26); }
        else if (hv < .8) roundTree(c, px, gy, u * (.9 + rv[1] * .3), K, 0, false);
        else if (hv > .95) house(c, px, gy, u, rv, K, n, 0);
      } else {
        if (hv < .14) house(c, px, gy, u, rv, K, n, 0);
        else if (hv < .4) conifer(c, px, gy, u, K, 0, 52 + rv[0] * 22);
      }
    }
    // poteaux lointains (plus petits, plus lents, légèrement embrumés)
    function poles(kk, P, s, topY, botY, sagY, lw, haze) {
      var off = (sc * kk) % P, prev = null, pc = K([44, 50, 64], haze), xx, d, ay = topY + 8 * u * s, dd = [-24, 24, 0];
      c.lineCap = 'round';
      for (xx = -off - P; xx < W + P; xx += P) {
        c.fillStyle = pc; c.fillRect(xx - 3.4 * u * s, topY, 6.8 * u * s, botY - topY); c.fillRect(xx - 30 * u * s, ay, 60 * u * s, 4.4 * u * s);
        dd.forEach(function (o, m) { c.fillRect(xx + o * u * s - 1.6 * u * s, ay - (m === 2 ? 11 : 6) * u * s, 3.2 * u * s, 6 * u * s); });
        if (prev !== null) {
          c.strokeStyle = K([34, 38, 50], haze); c.lineWidth = lw * u;
          dd.forEach(function (o, m) { var y = ay - (m === 2 ? 10 : 5) * u * s; c.beginPath(); c.moveTo(prev + o * u * s, y); c.quadraticCurveTo((prev + xx) / 2 + o * u * s, y + 2 * sagY, xx + o * u * s, y); c.stroke(); });
        }
        prev = xx;
      }
    }
    poles(.9, 330 * u, .5, H * .42, H * .84, H * .03, .9, .38);
    // buissons ronds au premier plan (k 1.15)
    var sl4 = 28 * u; k = 1.15; i0 = Math.floor(sc * k / sl4) - 2;
    c.fillStyle = K([44, 104, 68]); c.fillRect(0, H - 9 * u, W, 14 * u);
    for (i = i0; i < i0 + Math.ceil(W / sl4) + 5; i += 1) {
      hv = hash(i + 900); if (hv > .86) continue;
      px = i * sl4 - sc * k + sl4 / 2; var rb = (10 + hash(i + 910) * 8) * u;
      c.fillStyle = K([52, 122, 78]); c.beginPath(); blob(c, px, H - 2 * u, rb, rb * .9); c.fill();
      c.fillStyle = K([84, 156, 98]); c.beginPath(); blob(c, px - rb * .3, H - 2 * u - rb * .35, rb * .5, rb * .4); c.fill();
    }
    // poteaux et fils du premier plan
    poles(2.2, 400 * u, .8, H * .1, H + 4 * u, H * .09, 1.5, 0);
    // gare : quai, auvent, piliers et panneau du nom, au départ, à chaque arrêt et à l'arrivée
    if (L.sta && tk < .5) station(c, W, u, K, n, L.sta, t);

    c.restore();
    // — tunnel, arrêt en gare
    if (tk > 0) {
      c.fillStyle = 'rgba(8,8,14,' + (tk * .96).toFixed(2) + ')'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,214,140,' + (tk * .5).toFixed(2) + ')'; var lo = (sc * 4) % (140 * u); for (j = -lo; j < W; j += 140 * u) c.fillRect(j, 14 * u, 46 * u, 5 * u);
    }
    glow(c, W, H, sk); if (pref.wx === 'rain') rain(c, W, S, u, dt, v);
    // — finition : vignette, reflet de vitre, grain
    var vg = c.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, W * .62); vg.addColorStop(0, 'rgba(10,20,40,0)'); vg.addColorStop(1, 'rgba(10,20,40,.2)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.beginPath(); c.moveTo(W * .1, 0); c.lineTo(W * .26, 0); c.lineTo(W * .14, H); c.lineTo(W * -.02, H); c.fill();
    c.fillStyle = grain(c); c.fillRect(0, 0, W, H);
    if (L.stop && L.paused && !(L.sta && L.sta.d === 0)) {
      var fs = Math.round(15 * Math.max(1, u * .65)), bw = 12 * fs, bh = 3 * fs;
      c.fillStyle = 'rgba(20,35,63,.72)'; c.fillRect(W * .5 - bw / 2, H * .06, bw, bh); c.fillStyle = '#fff'; c.font = '700 ' + fs + 'px sans-serif'; c.textAlign = 'center'; c.fillText('一時停止 · Pause', W * .5, H * .06 + bh * .63); c.textAlign = 'left';
    }
  }
  /* ——— Hublot de l'avion : illustration à plat (même langage visuel que la fenêtre du train) ———
     Ciel pastel, nuages à fond ombré, mer de nuages, terre en patchwork vue d'en haut au décollage et à l'atterrissage, aile en aplats, grain léger. */
  function planeScene(c, W, S, L, p, sk, dt, t) {
    var u = H / 240, v = clamp((L.v || 0) / 900, 0, 1.1), i, j, x, px, hv, r;
    S.scroll += reduce ? 0 : v * dt * 120;
    var sc = S.scroll * u, n = clamp(sk.night * 1.2, 0, 1), tb = act('plane', 'turb', p), cl = act('plane', 'clouds', p), ts = t / 1000;
    var alt = clamp(Math.min(p / .12, (1 - p) / .1), 0, 1), low = 1 - alt, coast = sstep(.88, .96, p);
    var bot = parseRgb(sk.bot), top = lerp(parseRgb(sk.top), [52, 100, 184], alt * .55 * (1 - n));
    var K = function (a, haze) { return rgb(lerp(haze ? lerp(a, bot, haze * (1 - n * .5)) : a, NIGHT, n * .62)); };
    var span = W + 300 * u, gy = H * (.62 - .3 * alt);

    c.save(); if (tb > 0 && !reduce) c.translate((Math.random() - .5) * 5 * tb * u, (Math.random() - .5) * 7 * tb * u);
    // — ciel, soleil ou lune, étoiles
    var g = c.createLinearGradient(0, 0, 0, H * .75); g.addColorStop(0, rgb(top)); g.addColorStop(1, sk.bot); c.fillStyle = g; c.fillRect(-10 * u, -10 * u, W + 20 * u, H + 20 * u);
    if (n > .3) for (i = 0; i < 70; i += 1) { c.fillStyle = 'rgba(255,255,255,' + (n * (.45 + .45 * Math.sin(ts * 1.4 + i * 1.7))).toFixed(2) + ')'; c.fillRect(hash(i) * W, hash(i + 70) * H * .55, 1.6 * u, 1.6 * u); }
    if (n < .55) {
      var sa = clamp((sk.h - 6.5) / 12, 0, 1), sx = W * (.1 + .8 * sa), sy = H * .5 - Math.sin(sa * Math.PI) * H * .38, sv = 1 - n * 1.6, sg = c.createRadialGradient(sx, sy, 2 * u, sx, sy, 130 * u);
      sg.addColorStop(0, 'rgba(255,246,208,' + (.85 * sv).toFixed(2) + ')'); sg.addColorStop(.3, 'rgba(255,240,196,' + (.28 * sv).toFixed(2) + ')'); sg.addColorStop(1, 'rgba(255,240,196,0)');
      c.fillStyle = sg; c.fillRect(sx - 140 * u, sy - 140 * u, 280 * u, 280 * u); c.fillStyle = 'rgba(255,248,214,' + sv.toFixed(2) + ')'; c.beginPath(); c.arc(sx, sy, 15 * u, 0, TAU); c.fill();
    } else {
      var ma = clamp(((sk.h < 12 ? sk.h + 24 : sk.h) - 19.5) / 9.5, 0, 1), mx = W * (.12 + .76 * ma), my = H * .45 - Math.sin(ma * Math.PI) * H * .3, mv = clamp((n - .45) * 3, 0, 1), mg = c.createRadialGradient(mx, my, 2 * u, mx, my, 90 * u);
      mg.addColorStop(0, 'rgba(225,230,255,' + (.35 * mv).toFixed(2) + ')'); mg.addColorStop(1, 'rgba(225,230,255,0)'); c.fillStyle = mg; c.fillRect(mx - 100 * u, my - 100 * u, 200 * u, 200 * u);
      c.globalAlpha = mv; c.fillStyle = '#f1efd8'; c.beginPath(); c.arc(mx, my, 11 * u, 0, TAU); c.fill(); c.fillStyle = 'rgba(190,190,165,.4)'; c.beginPath(); blob(c, mx - 3 * u, my - 2 * u, 2.6 * u, 2.6 * u); blob(c, mx + 3.4 * u, my + 3 * u, 1.8 * u, 1.8 * u); c.fill(); c.globalAlpha = 1;
    }
    // — nuages lointains (haut dans le ciel), qui dérivent
    c.globalAlpha = n > .5 ? .4 : .75;
    for (i = 0; i < 4; i += 1) {
      var cw = (60 + hash(i + 200) * 70) * u, cx = ((((hash(i + 210) * span - sc * (.02 + hash(i + 220) * .01) - ts * 2 * u) % span) + span) % span) - 150 * u;
      cloud(c, cx, (14 + hash(i + 230) * 60) * u, cw, K([255, 255, 255], .15), K([214, 224, 240], .2));
    }
    c.globalAlpha = 1;

    // — terre vue d'en haut (décollage / atterrissage) : rangées en perspective, champs en patchwork, villages, mer près de l'arrivée
    if (low > .02) {
      c.globalAlpha = clamp(low * 1.6, 0, 1);
      var rows = 8, coastX = p > .5 ? W * .45 * (1 - coast * .2) : -1, y0, y1, tw, pal, hh, ty, t0;
      c.fillStyle = K([186, 204, 150], .3); c.fillRect(0, gy, W, H - gy + 10 * u);
      for (r = 0; r < rows; r += 1) {
        y0 = gy + (H - gy) * Math.pow(r / rows, 1.55); y1 = gy + (H - gy) * Math.pow((r + 1) / rows, 1.55) + 2 * u; tw = (30 + r * 20) * u; var kk = .12 + r * .13; t0 = Math.floor(sc * kk / tw) - 1;
        for (i = t0; i < t0 + Math.ceil(W / tw) + 3; i += 1) {
          px = i * tw - sc * kk; hh = hash(i * 5 + r * 97 + 3);
          if (px + tw / 2 < coastX) { c.fillStyle = K(hh > .5 ? [104, 164, 212] : [116, 176, 218], .1 + (rows - r) * .02); c.fillRect(px, y0, tw + 1, y1 - y0); if (hh > .8) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(px + tw * .2, y0 + (y1 - y0) * .5, tw * .4, 1.2 * u); } continue; }
          pal = PAL[hh > .93 ? 0 : p > .5 ? (hh > .55 ? 1 : 2) : (hh > .5 ? 1 : 2)]; c.fillStyle = K(pal[Math.floor(hash(i + r * 31) * pal.length)], .08 + (rows - r) * .035); c.fillRect(px, y0, tw + 1, y1 - y0);
          c.fillStyle = 'rgba(255,255,225,' + (.2 * (1 - n * .8)).toFixed(2) + ')'; c.fillRect(px, y0, 1.2 * u, y1 - y0);
          if (hh > .72 && hh < .8) { ty = y0 + (y1 - y0) * .4; for (j = 0; j < 4; j += 1) { c.fillStyle = n > .3 ? 'rgba(255,214,120,.9)' : K([236, 228, 212], .1); c.fillRect(px + tw * (.2 + .15 * j), ty + (j % 2) * 2 * u, 2.2 * u * (1 + r * .12), 2 * u * (1 + r * .12)); } }
        }
      }
      var hg = c.createLinearGradient(0, gy - 6 * u, 0, gy + 40 * u), hc = bot.map(Math.round).join(',');
      hg.addColorStop(0, 'rgba(' + hc + ',.0)'); hg.addColorStop(.25, 'rgba(' + hc + ',.55)'); hg.addColorStop(1, 'rgba(' + hc + ',0)'); c.fillStyle = hg; c.fillRect(0, gy - 6 * u, W, 46 * u);
      c.globalAlpha = 1;
    }
    // — couches de nuages en parallaxe (loin → près)
    for (var layer = 0; layer < 3; layer += 1) {
      var k = [.25, .5, 1][layer], size = [46, 70, 110][layer] * u, by = H * [.5, .66, .8][layer] + 8 * u * Math.sin(ts / 3 + layer), dens = [.55, .5, .45][layer] - cl * .2 - low * .3, k0 = Math.floor(sc * k / (150 * u)) - 2;
      c.globalAlpha = n > .5 ? [.3, .4, .5][layer] : [.7, .85, .97][layer] * (1 - low * .5);
      for (i = k0; i < k0 + Math.ceil(W / (150 * u)) + 5; i += 1) {
        if (hash(i * 3 + layer) > dens) continue;
        px = i * 150 * u - sc * k; cloud(c, px, by + (hash(i + layer * 7) - .5) * 24 * u, size * 1.9, K([255, 255, 255], [.18, .08, 0][layer]), K([206, 218, 238], [.2, .12, .05][layer]));
      }
    }
    c.globalAlpha = 1;
    // — mer de nuages (événement) : plateau blanc à bosses, ombré en dessous
    if (cl > 0) {
      c.globalAlpha = cl * (n > .5 ? .5 : .97);
      c.fillStyle = K([248, 250, 255], .05); c.fillRect(0, H * .66, W, H * .4);
      var kc = .6, c0 = Math.floor(sc * kc / (36 * u)) - 2;
      for (i = c0; i < c0 + Math.ceil(W / (36 * u)) + 5; i += 1) { px = i * 36 * u - sc * kc; hh = hash(i + 600); c.fillStyle = K([252, 253, 255], .04); c.beginPath(); blob(c, px, H * .66 - hh * 8 * u, (22 + hh * 20) * u, (11 + hh * 9) * u); c.fill(); }
      for (i = c0; i < c0 + Math.ceil(W / (60 * u)) + 5; i += 1) { px = i * 60 * u - sc * kc * 1.4; hh = hash(i + 650); c.fillStyle = K([214, 226, 244], .08); c.beginPath(); blob(c, px, H * .8 + hh * 10 * u, (30 + hh * 24) * u, (5 + hh * 3) * u); c.fill(); }
      c.globalAlpha = 1;
    }
    c.restore();

    // — aile : aplats, lignes de panneaux, ailette, feu de navigation
    var fl = (tb * 6 * Math.sin(t / 90) + Math.sin(t / 1300) * 1.5) * u, wg, bl = (Math.floor(t / 600) % 2) === 1, st = (t % 1700) < 90;
    c.save(); c.translate(0, fl);
    c.fillStyle = 'rgba(20,30,60,' + (.14 * (1 - n * .5)).toFixed(2) + ')'; c.beginPath(); c.moveTo(-10 * u, H * .9 + 8 * u); c.lineTo(W * .5, H * .63 + 8 * u); c.lineTo(W * .6, H * .67 + 8 * u); c.lineTo(W * .22, H + 18 * u); c.lineTo(-10 * u, H + 18 * u); c.fill();
    wg = c.createLinearGradient(0, H * .62, W * .3, H); wg.addColorStop(0, K([240, 243, 248])); wg.addColorStop(1, K([200, 207, 220]));
    c.fillStyle = wg; c.beginPath(); c.moveTo(-10 * u, H * .9); c.lineTo(W * .5, H * .63); c.quadraticCurveTo(W * .6, H * .63, W * .6, H * .67); c.lineTo(W * .22, H + 10 * u); c.lineTo(-10 * u, H + 10 * u); c.closePath(); c.fill();
    c.fillStyle = K([176, 184, 200]); c.beginPath(); c.moveTo(W * .6, H * .67); c.lineTo(W * .22, H + 10 * u); c.lineTo(W * .12, H + 10 * u); c.lineTo(W * .5, H * .665); c.closePath(); c.fill();
    c.strokeStyle = K([166, 174, 192]); c.lineWidth = 1.1 * u;
    for (i = 1; i < 4; i += 1) { c.beginPath(); c.moveTo(W * (.06 + i * .09), H * (.84 + i * .0) + (3 - i) * 8 * u); c.lineTo(W * (.1 + i * .1), H * .74 - i * 2 * u); c.stroke(); }
    c.fillStyle = K([228, 232, 240]); c.beginPath(); c.moveTo(W * .575, H * .64); c.lineTo(W * .6, H * .67); c.lineTo(W * .604, H * .56); c.lineTo(W * .588, H * .6); c.closePath(); c.fill();
    c.fillStyle = K([186, 194, 210]); c.beginPath(); c.moveTo(W * .596, H * .665); c.lineTo(W * .604, H * .56); c.lineTo(W * .6, H * .67); c.closePath(); c.fill();
    var lx = W * .5995, ly = H * .652, lg = c.createRadialGradient(lx, ly, 1, lx, ly, 22 * u); lg.addColorStop(0, bl ? 'rgba(255,60,48,.75)' : 'rgba(255,60,48,.12)'); lg.addColorStop(1, 'rgba(255,60,48,0)'); c.fillStyle = lg; c.fillRect(lx - 24 * u, ly - 24 * u, 48 * u, 48 * u);
    c.fillStyle = bl ? '#ff4a3c' : '#8a2018'; c.beginPath(); c.arc(lx, ly, 3.2 * u, 0, TAU); c.fill();
    if (st) { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(W * .583, H * .625, 2.6 * u, 0, TAU); c.fill(); }
    c.restore();
    glow(c, W, H, sk); if (pref.wx === 'rain') rain(c, W, S, u, dt, v);
    // — finition : vignette, reflet de hublot, grain
    var vg = c.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, W * .62); vg.addColorStop(0, 'rgba(10,20,40,0)'); vg.addColorStop(1, 'rgba(10,20,40,.2)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.moveTo(W * .7, 0); c.lineTo(W * .86, 0); c.lineTo(W * .74, H); c.lineTo(W * .58, H); c.fill();
    c.fillStyle = grain(c); c.fillRect(0, 0, W, H);
  }

  /* ——— Montage de l'interface ——— */
  var st = { train: { scroll: 0 }, plane: { scroll: 0 } };
  var ANCH = { train: '.ft-travel-grid', plane: '#fp-root .fp-maptools' };
  function mount(mode) {
    var a = document.querySelector(ANCH[mode]); if (!a || !a.parentNode) return false;
    var S = st[mode], el = document.createElement('section'); el.className = 'bi-win bi-' + mode + (pref.fold ? ' is-fold' : ''); el.setAttribute('aria-label', 'Vue par la fenêtre');
    el.innerHTML = '<div class="bi-head"><span class="bi-title"><i class="fa-solid fa-' + (mode === 'train' ? 'train' : 'plane') + '" aria-hidden="true"></i> <span lang="ja">窓</span> · Par la fenêtre</span>' +
      '<span class="bi-tools"><button type="button" class="bi-snd" aria-pressed="false"></button><label class="bi-volw"><span class="bi-sr">Volume</span><input type="range" class="bi-vol" min="0" max="100" step="5"></label><label class="bi-selw"><span class="bi-sr">Ciel</span><select class="bi-sel bi-sky" title="Ciel"><option value="auto">🕒 Heure réelle</option><option value="morning">🌅 Matin doré</option><option value="day">☀️ Journée</option><option value="dusk">🌇 Crépuscule</option><option value="night">🌃 Nuit étoilée</option></select></label><button type="button" class="bi-snd bi-wx" aria-pressed="false"></button><button type="button" class="bi-fsb" aria-pressed="false"></button><button type="button" class="bi-fold" aria-expanded="true"></button></span></div>' +
      '<div class="bi-stage"><canvas class="bi-cv" aria-hidden="true"></canvas><div class="bi-frame" aria-hidden="true"></div><div class="bi-toast hidden" role="status" aria-live="polite"></div>' +
      '<div class="bi-hud"><div class="bi-hud-time"><small>Temps restant</small><b>–</b></div><div class="bi-hud-prog"><div class="bi-hud-bar"><span></span></div><div class="bi-hud-line"><span class="bi-hud-pct">0 %</span><span class="bi-hud-info"></span></div></div><div class="bi-hud-speed"><b>0</b><small>km/h</small></div><button type="button" class="bi-hud-pause"></button></div></div>';
    a.parentNode.insertBefore(el, a); S.el = el; S.cv = el.querySelector('canvas'); S.toast = el.querySelector('.bi-toast');
    var snd = el.querySelector('.bi-snd'), vol = el.querySelector('.bi-vol'), fold = el.querySelector('.bi-fold');
    var fsb = el.querySelector('.bi-fsb'); S.fsb = fsb; S.fsbOn = undefined; S.hudPaused = undefined; S.hud = { time: el.querySelector('.bi-hud-time b'), bar: el.querySelector('.bi-hud-bar span'), pct: el.querySelector('.bi-hud-pct'), info: el.querySelector('.bi-hud-info'), speed: el.querySelector('.bi-hud-speed b'), pause: el.querySelector('.bi-hud-pause') };
    fsb.addEventListener('click', function () { if (S.fs) exitFs(mode); else enterFs(mode); });
    S.hud.pause.addEventListener('click', function () { var b = document.querySelector(mode === 'train' ? '#ft-pause' : '#fp-pause'); if (b) b.click(); });
    fsLabel(mode);
    function label() { snd.innerHTML = pref.sound ? '<i class="fa-solid fa-volume-high"></i> Ambiance activée' : '<i class="fa-solid fa-volume-xmark"></i> Activer l’ambiance'; snd.setAttribute('aria-pressed', String(pref.sound)); fold.innerHTML = pref.fold ? '<i class="fa-solid fa-chevron-down"></i> Déplier' : '<i class="fa-solid fa-chevron-up"></i> Replier'; fold.setAttribute('aria-expanded', String(!pref.fold)); }
    var skyS = el.querySelector('.bi-sky'), wx = el.querySelector('.bi-wx');
    skyS.value = pref.sky; skyS.addEventListener('change', function () { pref.sky = skyS.value; save(PREF, pref); });
    function wxLabel() { var r = pref.wx === 'rain'; wx.innerHTML = r ? '<i class="fa-solid fa-cloud-rain"></i> Pluie' : '<i class="fa-solid fa-sun"></i> Beau temps'; wx.setAttribute('aria-pressed', String(r)); wx.title = r ? 'Revenir au beau temps' : 'Faire tomber une pluie fine'; }
    wxLabel(); wx.addEventListener('click', function () { pref.wx = pref.wx === 'rain' ? 'clear' : 'rain'; save(PREF, pref); wxLabel(); rainSound(); });
    vol.value = Math.round(pref.vol * 100); label();
    snd.addEventListener('click', function () { pref.sound = !pref.sound; save(PREF, pref); if (pref.sound) { ensure(); if (A.ctx) A.ctx.resume(); sfx('chime'); } else stopAmb(); label(); });
    vol.addEventListener('input', function () { pref.vol = vol.value / 100; if (A.master) A.master.gain.value = pref.vol; save(PREF, pref); });
    fold.addEventListener('click', function () { pref.fold = !pref.fold; save(PREF, pref); el.classList.toggle('is-fold', pref.fold); label(); });
    return true;
  }
  /* ——— Plein écran ———
     La fenêtre passe en haut de l'écran, grande, avec un bandeau d'infos (temps restant, progression, vitesse, pause) ; tout le reste
     de la session (carte, annonces, billet, ambiance, objectifs…) reste accessible en faisant défiler. Plein écran du navigateur si
     possible, sinon (iPhone, par exemple) simple affichage plein cadre. */
  var FST = { train: '#ft-stage-travel', plane: '#fp-root' };
  var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement || null; };
  function fsTarget(m) { return document.querySelector(FST[m]); }
  function fsLabel(m) {
    var S = st[m]; if (!S.fsb || S.fsbOn === Boolean(S.fs)) return; S.fsbOn = Boolean(S.fs);
    S.fsb.innerHTML = S.fs ? '<i class="fa-solid fa-compress" aria-hidden="true"></i> Quitter le plein écran' : '<i class="fa-solid fa-expand" aria-hidden="true"></i> Plein écran';
    S.fsb.setAttribute('aria-pressed', String(Boolean(S.fs)));
  }
  function fsResize() { window.setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) { /* ignoré */ } }, 120); }
  function place(m) {
    var S = st[m]; if (!S.el || !S.el.isConnected && !S.fs) return;
    var t = fsTarget(m);
    if (S.fs && t) { if (t.firstChild !== S.el) t.insertBefore(S.el, t.firstChild); }
    else { var a = document.querySelector(ANCH[m]); if (a && a.parentNode && a.previousSibling !== S.el) a.parentNode.insertBefore(S.el, a); }
  }
  function enterFs(m) {
    var S = st[m], t = fsTarget(m); if (!t) return;
    ['train', 'plane'].forEach(function (o) { if (o !== m && st[o].fs) exitFs(o); });
    S.fs = true; S.fake = false; t.classList.add('bi-fs'); place(m); fsLabel(m);
    function fake() { S.fake = true; t.classList.add('bi-fs-fake'); document.documentElement.classList.add('bi-fs-lock'); fsResize(); }
    var req = t.requestFullscreen || t.webkitRequestFullscreen;
    if (!req) { fake(); return; }
    try { var r = req.call(t); if (r && r.catch) r.catch(fake); } catch (e) { fake(); }
    fsResize();
  }
  function exitFs(m) {
    var S = st[m], t = fsTarget(m); if (!S.fs) return;
    S.fs = false; S.fake = false;
    if (t) t.classList.remove('bi-fs', 'bi-fs-fake');
    document.documentElement.classList.remove('bi-fs-lock');
    if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ignoré */ } }
    place(m); fsLabel(m); fsResize();
  }
  function fsSync() { ['train', 'plane'].forEach(function (m) { if (st[m].fs && !st[m].fake && !fsEl()) exitFs(m); }); }
  document.addEventListener('fullscreenchange', fsSync); document.addEventListener('webkitfullscreenchange', fsSync);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || document.body.classList.contains('fp-modal-open') || document.body.classList.contains('pg-modal-open')) return;
    ['train', 'plane'].forEach(function (m) { if (st[m].fs && st[m].fake) exitFs(m); });
  });
  function hud(m) {
    var S = st[m], h = S.hud, L = S.L; if (!h || !S.fs || !L) return;
    var left = Math.max(0, Math.round((L.left || 0) / 1000)), two = function (n) { return (n < 10 ? '0' : '') + n; };
    h.time.textContent = Math.floor(left / 3600) + ':' + two(Math.floor(left / 60) % 60) + ':' + two(left % 60);
    var pct = Math.round(clamp(L.p, 0, 1) * 100); h.bar.style.width = pct + '%'; h.pct.textContent = pct + ' %';
    h.info.textContent = m === 'train' ? (L.next || '') : (L.phase || '');
    h.speed.textContent = String(Math.round(L.v || 0));
    if (S.hudPaused !== Boolean(L.paused)) h.pause.innerHTML = (S.hudPaused = Boolean(L.paused)) ? '<i class="fa-solid fa-play" aria-hidden="true"></i> Reprendre' : '<i class="fa-solid fa-pause" aria-hidden="true"></i> Pause';
  }

  function toast(S, e) {
    var box = S.toast; if (!box) return; window.clearTimeout(S.tt);
    box.innerHTML = '<b lang="ja">' + e.jp + '</b><span>' + e.fr + '</span>' + (e.ch ? '<div class="bi-ch">' + e.ch.map(function (c, i) { return '<button type="button" data-i="' + i + '">' + c[0] + '</button>'; }).join('') + '</div>' : '');
    box.classList.remove('hidden');
    if (e.ch) box.querySelector('.bi-ch').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; box.innerHTML = '<span>' + e.ch[+b.dataset.i][1] + '</span>'; sfx('chime'); S.tt = window.setTimeout(function () { box.classList.add('hidden'); }, 4000); });
    S.tt = window.setTimeout(function () { box.classList.add('hidden'); }, e.ch ? 20000 : 9000);
  }
  function events(mode, L, S) {
    var done = load(EVK, {}), key = mode + ':' + L.id, got = done[key] || [], ch = false;
    evList(mode).forEach(function (e) {
      if (L.p < e.at || got.indexOf(e.id) >= 0) return; got.push(e.id); ch = true;
      if (L.p - e.at < .03 && !L.stop) { toast(S, e); sfx(e.snd); }
    });
    if (ch) { done[key] = got; var ks = Object.keys(done); if (ks.length > 12) delete done[ks[0]]; save(EVK, done); }
  }

  var last = 0;
  function frame(now) {
    window.requestAnimationFrame(frame);
    if (now - last < 33 || document.hidden) return; var dt = Math.min(.1, (now - last) / 1000); last = now;
    ['train', 'plane'].forEach(function (m) {
      var S = st[m]; if (!S.live || !S.cv || !S.cv.offsetParent || S.el.classList.contains('is-fold')) return;
      H = S.fs ? clamp(Math.round(window.innerHeight - 170), 260, 760) : 240; S.cv.style.height = S.fs ? H + 'px' : '';
      var W = S.cv.clientWidth; if (!W) return; if (S.cv.width !== W || S.cv.height !== H) { S.cv.width = W; S.cv.height = H; }
      var c = S.cv.getContext('2d'); S.L && (m === 'train' ? trainScene(c, W, S, S.L, S.L.p, sky('train'), dt) : planeScene(c, W, S, S.L, S.L.p, sky('plane'), dt, now));
    });
  }
  // L'ambiance suit le voyage, pas l'affichage : elle continue quand on change d'onglet dans le site ou de page dans le navigateur.
  // Seule la fenêtre dessinée (canvas) s'arrête quand elle n'est pas visible.
  var LIVE_MAX_AGE = 6000; // les minuteurs des onglets cachés sont ralentis (~1 s) : on tolère un battement plus lent
  function poll() {
    var live = window.BenkyoLive || {}, active = null, newest = 0;
    ['train', 'plane'].forEach(function (m) {
      var L = live[m], S = st[m], ok = L && Date.now() - L.t < LIVE_MAX_AGE;
      if (!ok) { S.live = false; S.L = null; if (S.fs) exitFs(m); if (S.el) S.el.classList.add('hidden'); return; }
      S.live = true; S.L = L;
      if (!S.el || !S.el.isConnected) mount(m);
      if (S.el && S.el.isConnected) S.el.classList.remove('hidden');
      if (S.el) { place(m); fsLabel(m); hud(m); }
      if (L.id !== S.id) { S.id = L.id; S.scroll = L.p * 70000; if (m === 'plane') turb = turbFor(L.id); }
      events(m, L, S);
      if (L.t >= newest) { newest = L.t; active = m; }
    });
    rainSound();
    if (active && pref.sound) { startAmb(active); level(active, st[active].L, st[active].L.p); } else stopAmb();
  }
  function gesture() { if (pref.sound && ensure() && A.ctx.state === 'suspended') A.ctx.resume(); }
  document.addEventListener('pointerdown', gesture, { passive: true }); document.addEventListener('keydown', gesture);
  window.setInterval(poll, 500); window.requestAnimationFrame(frame);
})();
