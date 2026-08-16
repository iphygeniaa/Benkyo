/* =====================================================================
   Benkyō — Extras cozy
   ---------------------------------------------------------------------
   Ce fichier regroupe les fonctionnalités transversales ajoutées au site :
     1. HUD « Tâches du jour » (barre qui se remplit au fil des cases cochées)
     2. Niveau d'aventure + titres (français / japonais) pour Mon Profil
     3. Ambiance sonore de la Zone de campement (pluie / orage / cheminée)
     4. Bulle de dialogue de la mascotte
   Tout est autonome : aucune dépendance, aucun fichier audio externe
   (les sons sont synthétisés avec la Web Audio API).
   ===================================================================== */
(function () {
  'use strict';

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function todayKey() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }
  function el(id) { return document.getElementById(id); }

  /* ==================================================================
     1) HUD — Tâches du jour
     Les to-do sont stockées par date : { "2026-08-15": [ {done:...} ] }.
     On ne compte donc que les tâches du jour, et la barre se remplit au
     fur et à mesure que les cases sont cochées.
     ================================================================== */
  function refreshDailyTasksHud() {
    var todos = read('benkyo_todos', {}) || {};
    var list = [];
    if (Array.isArray(todos)) list = todos;
    else if (Array.isArray(todos[todayKey()])) list = todos[todayKey()];

    var total = list.length;
    var done = list.filter(function (t) { return t && (t.done || t.completed); }).length;
    var pct = total ? (done / total) * 100 : 0;

    var value = el('hud-tasks');
    if (value) value.textContent = total ? done + '/' + total : '0';
    var bar = el('hud-tasks-bar');
    if (bar) {
      bar.style.transition = 'width .35s ease';
      bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }
    var label = el('hud-tasks-hint');
    if (label) {
      label.textContent = !total
        ? 'Aucune tâche prévue aujourd’hui'
        : done === total
          ? 'Toutes les tâches du jour sont faites !'
          : done + ' sur ' + total + ' terminée' + (done > 1 ? 's' : '');
    }
    return { done: done, total: total, pct: pct };
  }

  /* ==================================================================
     2) Niveau d'aventure
     ================================================================== */
  var ADVENTURE_TITLES = [
    { min: 0,    fr: 'Apprenti Herboriste',  jp: '見習い薬草師', icon: 'fa-seedling' },
    { min: 150,  fr: 'Lecteur de Grimoire',  jp: '古書の読み手', icon: 'fa-book-open' },
    { min: 400,  fr: 'Explorateur du Soir',  jp: '宵の探検家',   icon: 'fa-moon' },
    { min: 800,  fr: 'Gardien des Lanternes', jp: '灯籠の守り人', icon: 'fa-fire-flame-simple' },
    { min: 1500, fr: 'Archiviste Émérite',   jp: '名誉書庫番',   icon: 'fa-scroll' },
    { min: 2600, fr: 'Sage du Campement',    jp: '野営の賢者',   icon: 'fa-torii-gate' }
  ];

  function countDoneTodos() {
    var todos = read('benkyo_todos', {}) || {};
    var n = 0;
    if (Array.isArray(todos)) {
      todos.forEach(function (t) { if (t && (t.done || t.completed)) n++; });
    } else {
      Object.keys(todos).forEach(function (k) {
        (todos[k] || []).forEach(function (t) { if (t && (t.done || t.completed)) n++; });
      });
    }
    return n;
  }
  function countArray(key) {
    var v = read(key, []);
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === 'object') return Object.keys(v).length;
    return 0;
  }

  function computeAdventure() {
    var streak = read('benkyo_streak', null);
    var streakDays = streak && typeof streak.count === 'number' ? streak.count : 0;
    var tasks = countDoneTodos();
    var revisions = countArray('benkyo_revisions');
    var flash = countArray('benkyo_fc_history') + countArray('benkyo_blank_history');
    var stamps = countArray('benkyo_stamp_book') + countArray('benkyo_stickers');
    var goals = 0;
    var g = read('benkyo_goals', []);
    if (Array.isArray(g)) goals = g.filter(function (x) { return x && (x.done || x.completed); }).length;

    var xp = streakDays * 12 + tasks * 5 + revisions * 15 + flash * 8 + goals * 20 + stamps * 10;

    var idx = 0;
    for (var i = 0; i < ADVENTURE_TITLES.length; i++) {
      if (xp >= ADVENTURE_TITLES[i].min) idx = i;
    }
    var current = ADVENTURE_TITLES[idx];
    var next = ADVENTURE_TITLES[idx + 1] || null;
    var pct = next
      ? ((xp - current.min) / (next.min - current.min)) * 100
      : 100;

    return {
      xp: xp,
      level: idx + 1,
      maxLevel: ADVENTURE_TITLES.length,
      title: current,
      next: next,
      progress: Math.max(0, Math.min(100, pct)),
      remaining: next ? Math.max(0, next.min - xp) : 0,
      details: { streakDays: streakDays, tasks: tasks, revisions: revisions, flash: flash, goals: goals, stamps: stamps }
    };
  }

  function renderAdventureCard() {
    var root = el('adventure-level-root');
    if (!root) return;
    var a = computeAdventure();
    var d = a.details;
    root.innerHTML = [
      '<div class="glass-panel p-6 md:p-8 rounded-3xl border border-dark-border space-y-5 card-glow">',
      '  <div class="flex items-start justify-between gap-3 flex-wrap">',
      '    <div>',
      '      <h2 class="text-lg font-bold text-white flex items-center gap-2"><i class="fa-solid fa-compass text-amber-400"></i> 冒険 — Niveau d’aventure</h2>',
      '      <p class="text-slate-400 text-xs mt-1">Votre titre évolue avec vos jours d’étude, vos tâches et vos révisions.</p>',
      '    </div>',
      '    <div class="adv-badge"><i class="fa-solid ' + a.title.icon + '"></i> Niveau ' + a.level + ' / ' + a.maxLevel + '</div>',
      '  </div>',
      '  <div class="adv-title-card">',
      '    <div class="adv-title-fr">' + a.title.fr + '</div>',
      '    <div class="adv-title-jp">' + a.title.jp + '</div>',
      '  </div>',
      '  <div>',
      '    <div class="flex justify-between text-[11px] text-slate-400 mb-1">',
      '      <span>' + a.xp + ' points d’aventure</span>',
      '      <span>' + (a.next ? 'Prochain titre : ' + a.next.fr + ' (' + a.next.jp + ') — ' + a.remaining + ' pts' : 'Titre maximal atteint !') + '</span>',
      '    </div>',
      '    <div class="adv-bar"><span style="width:' + a.progress.toFixed(1) + '%"></span></div>',
      '  </div>',
      '  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">',
      '    <div class="adv-stat"><b>' + d.streakDays + '</b><span>jours de série</span></div>',
      '    <div class="adv-stat"><b>' + d.tasks + '</b><span>tâches cochées</span></div>',
      '    <div class="adv-stat"><b>' + d.revisions + '</b><span>révisions</span></div>',
      '    <div class="adv-stat"><b>' + d.flash + '</b><span>sessions d’apprentissage</span></div>',
      '  </div>',
      '  <ul class="adv-ladder">',
      ADVENTURE_TITLES.map(function (t, i) {
        var state = i + 1 < a.level ? 'is-done' : (i + 1 === a.level ? 'is-current' : '');
        return '<li class="' + state + '"><i class="fa-solid ' + t.icon + '"></i><span class="adv-ladder-fr">' + t.fr + '</span><span class="adv-ladder-jp">' + t.jp + '</span><span class="adv-ladder-xp">' + t.min + ' pts</span></li>';
      }).join(''),
      '  </ul>',
      '</div>'
    ].join('');
  }

  /* ==================================================================
     3) Ambiance sonore : pluie, orage, cheminée (Web Audio, sans fichier)
     ================================================================== */
  var Ambience = (function () {
    var ctx = null, master = null, nodes = [], current = null, timers = [];
    var volume = 0.5;
    try {
      var saved = parseFloat(localStorage.getItem('benkyo_ambience_volume'));
      if (!isNaN(saved)) volume = saved;
    } catch (e) {}

    function ensureCtx() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function noiseBuffer(seconds, brown) {
      var len = ctx.sampleRate * seconds;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) {
        var white = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        } else {
          data[i] = white;
        }
      }
      return buf;
    }

    function noiseSource(brown) {
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer(4, brown);
      src.loop = true;
      nodes.push(src);
      return src;
    }

    function startRain(heavy) {
      var src = noiseSource(false);
      var hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = heavy ? 400 : 620;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = heavy ? 7000 : 5200;
      var g = ctx.createGain();
      g.gain.value = heavy ? 0.45 : 0.32;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
      src.start();
      nodes.push(hp, lp, g);
    }

    function thunder() {
      var src = noiseSource(true);
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 240;
      var g = ctx.createGain();
      var t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      src.connect(lp); lp.connect(g); g.connect(master);
      src.start(t);
      src.stop(t + 3);
      nodes.push(lp, g);
    }

    function scheduleThunder() {
      var delay = 7000 + Math.random() * 14000;
      timers.push(setTimeout(function () {
        if (current !== 'orage') return;
        thunder();
        scheduleThunder();
      }, delay));
    }

    function startFire() {
      var src = noiseSource(true);
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      var g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(lp); lp.connect(g); g.connect(master);
      src.start();
      nodes.push(lp, g);

      // Crépitements aléatoires
      function crackle() {
        if (current !== 'cheminee') return;
        var burst = ctx.createBufferSource();
        burst.buffer = noiseBuffer(0.12, false);
        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 900 + Math.random() * 2600;
        bp.Q.value = 1.2;
        var bg = ctx.createGain();
        var t = ctx.currentTime;
        bg.gain.setValueAtTime(0.0001, t);
        bg.gain.exponentialRampToValueAtTime(0.18 + Math.random() * 0.22, t + 0.01);
        bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1 + Math.random() * 0.12);
        burst.connect(bp); bp.connect(bg); bg.connect(master);
        burst.start(t);
        burst.stop(t + 0.25);
        timers.push(setTimeout(crackle, 90 + Math.random() * 550));
      }
      crackle();
    }

    function stop() {
      current = null;
      timers.forEach(clearTimeout);
      timers = [];
      nodes.forEach(function (n) {
        try { if (n.stop) n.stop(); } catch (e) {}
        try { n.disconnect(); } catch (e) {}
      });
      nodes = [];
      syncUI();
    }

    function play(kind) {
      if (current === kind) { stop(); return; }
      stop();
      if (!ensureCtx()) return;
      current = kind;
      if (kind === 'pluie') startRain(false);
      else if (kind === 'orage') { startRain(true); scheduleThunder(); }
      else if (kind === 'cheminee') startFire();
      syncUI();
    }

    function setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
      try { localStorage.setItem('benkyo_ambience_volume', String(volume)); } catch (e) {}
    }

    function syncUI() {
      ['pluie', 'orage', 'cheminee'].forEach(function (k) {
        var btn = el('amb-btn-' + k);
        if (btn) btn.classList.toggle('is-playing', current === k);
      });
      var status = el('amb-status');
      if (status) {
        status.textContent = current
          ? ({ pluie: 'Pluie douce en cours…', orage: 'Orage lointain en cours…', cheminee: 'Cheminée qui crépite…' })[current]
          : 'Aucune ambiance — choisissez un son.';
      }
    }

    return { play: play, stop: stop, setVolume: setVolume, syncUI: syncUI, getVolume: function () { return volume; }, getCurrent: function () { return current; } };
  })();

  /* ==================================================================
     4) Bulle de dialogue de la mascotte
     ================================================================== */
  var MASCOT_LINES = [
    'Le thé est chaud, la lanterne est allumée : on révise ?',
    'Une tâche cochée, c’est un pas de plus sur le sentier.',
    'Écoute la pluie et respire… puis 25 minutes de concentration.',
    'J’ai rangé tes grimoires près du feu, ils t’attendent.',
    'Pas besoin de courir : un chapitre par jour suffit.',
    'Tu progresses même les jours calmes. 頑張って !',
    'Le campement est prêt, aventurier·ère. Par quoi commence-t-on ?'
  ];

  function mountMascotBubble() {
    var host = el('camp-mascot-bubble');
    if (!host) return;
    var a = computeAdventure();
    var tasks = refreshDailyTasksHud();
    var line;
    if (tasks.total && tasks.done === tasks.total) {
      line = 'Toutes les tâches du jour sont cochées — repose-toi près du feu !';
    } else if (tasks.total) {
      line = 'Il reste ' + (tasks.total - tasks.done) + ' tâche' + (tasks.total - tasks.done > 1 ? 's' : '') + ' aujourd’hui. On s’y met doucement ?';
    } else {
      line = MASCOT_LINES[Math.floor(Math.random() * MASCOT_LINES.length)];
    }
    host.innerHTML =
      '<span class="camp-bubble-name">' + a.title.fr + ' <em>' + a.title.jp + '</em></span>' +
      '<span class="camp-bubble-text">' + line + '</span>';

    host.onclick = function () {
      var l = MASCOT_LINES[Math.floor(Math.random() * MASCOT_LINES.length)];
      var t = host.querySelector('.camp-bubble-text');
      if (t) t.textContent = l;
    };
  }

  /* ================================ init ============================ */
  function init() {
    refreshDailyTasksHud();
    renderAdventureCard();
    mountMascotBubble();

    var vol = el('amb-volume');
    if (vol) {
      vol.value = String(Math.round(Ambience.getVolume() * 100));
      vol.addEventListener('input', function () { Ambience.setVolume(this.value / 100); });
    }
    Ambience.syncUI();

    // La barre se met à jour dès qu'une tâche est cochée (même depuis un autre onglet)
    window.addEventListener('storage', function (e) {
      if (!e.key || e.key === 'benkyo_todos') { refreshDailyTasksHud(); renderAdventureCard(); }
    });
    setInterval(refreshDailyTasksHud, 2000);
    document.addEventListener('click', function () { setTimeout(refreshDailyTasksHud, 120); });
  }

  window.BenkyoAmbience = Ambience;
  window.BenkyoAdventure = { compute: computeAdventure, render: renderAdventureCard, titles: ADVENTURE_TITLES };
  window.refreshDailyTasksHud = refreshDailyTasksHud;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
