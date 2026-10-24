/* ============================================================
   sakura.js — Pluie de pétales de fleurs de cerisier
   -------------------------------------------------------------
   Remplace complètement l'ancienne librairie "canvas-confetti".
   Toutes les pages appellent déjà `confetti({...})` : ce fichier
   fournit la même fonction, mais elle lance des pétales de
   sakura au lieu de confettis.

   Optimisations (pour que la page ne "bugue" plus) :
     - un seul <canvas> réutilisé pour toute la page
     - la boucle d'animation ne tourne QUE s'il reste des pétales
     - nombre de pétales plafonné (140) et divisé par 2 sur mobile
     - résolution limitée (devicePixelRatio max 2)
     - pause automatique quand l'onglet est en arrière-plan
     - respecte "réduire les animations" (prefers-reduced-motion)
   ============================================================ */
(function (global) {
  'use strict';

  var MAX_PETALS = 140;
  var canvas = null;
  var ctx = null;
  var petals = [];
  var running = false;
  var lastTime = 0;
  var dpr = 1;

  var COLORS = [
    ['#fbe4ec', '#f4bdd2'],
    ['#f9d7e3', '#eaa8c4'],
    ['#fdeef2', '#f6cad9'],
    ['#f7c8dd', '#e39ac0'],
    ['#fff6f8', '#f3d3dd']
  ];

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

  function spawn(count, originX, originY, spread) {
    var w = global.innerWidth;
    var h = global.innerHeight;
    for (var i = 0; i < count; i++) {
      if (petals.length >= MAX_PETALS) break;
      var angle = rand(-spread / 2, spread / 2) * Math.PI / 180;
      var speed = rand(2.2, 5.2);
      var pair = COLORS[(Math.random() * COLORS.length) | 0];
      petals.push({
        x: originX * w + rand(-30, 30),
        y: originY * h + rand(-20, 20),
        vx: Math.sin(angle) * speed,
        vy: -Math.abs(Math.cos(angle)) * speed * rand(0.9, 1.5),
        size: rand(7, 14),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.06, 0.06),
        sway: rand(0.8, 2.4),
        phase: rand(0, Math.PI * 2),
        life: 0,
        ttl: rand(3.6, 6),
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

  function frame(now) {
    if (!running) return;
    var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
    lastTime = now;
    var h = global.innerHeight;
    ctx.clearRect(0, 0, global.innerWidth + 4, h + 4);

    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i];
      p.life += dt;
      p.vy += 5.5 * dt;           // gravité très douce : les pétales flottent
      p.vx *= 0.985;
      p.x += (p.vx + Math.sin(p.phase + p.life * p.sway * 2) * p.sway) * dt * 60;
      p.y += p.vy * dt * 60;
      p.rot += p.vr * dt * 60;

      var fade = p.life > p.ttl - 1.2 ? Math.max(0, (p.ttl - p.life) / 1.2) : Math.min(1, p.life * 6);
      if (p.life >= p.ttl || p.y > h + 40) { petals.splice(i, 1); continue; }
      ctx.globalAlpha = fade;
      drawPetal(p);
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
    spawn(count, ox, oy, Math.max(30, Math.min(spread, 140)));
  }

  sakura.reset = function () { petals.length = 0; stop(); };

  global.BenkyoSakura = sakura;
  global.confetti = sakura;   // remplace les confettis partout sur le site
})(window);
