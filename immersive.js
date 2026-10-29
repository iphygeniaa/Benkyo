/* =========================================================================
   Session de travail > « Session de travail immersive »
   - lecteur YouTube (vidéo, live, playlist) intégré à la page
   - boisson du jour, humeur, objectifs de la session
   - chronomètre de session (survit à un changement de page)
   - bilan de fin de session : temps travaillé, ce qui a été fait,
     difficultés (concentration, sujet difficile…)
   Utilise le `state` de pomodoro.html (clés immersiveDraft / immersiveSessions).
   ========================================================================= */
(function () {
  'use strict';

  var MOODS = [
    { id: 'great',    emoji: '🤩', label: 'Au top' },
    { id: 'good',     emoji: '🙂', label: 'Bien' },
    { id: 'ok',       emoji: '😐', label: 'Moyen' },
    { id: 'tired',    emoji: '😴', label: 'Fatigué·e' },
    { id: 'stressed', emoji: '😰', label: 'Stressé·e' }
  ];
  var DRINKS = ['☕ Café', '🍵 Thé', '🫖 Tisane', '🍫 Chocolat chaud', '🧃 Jus', '💧 Eau'];
  var CONCENTRATION = [
    { v: 1, label: 'Très dispersé·e' },
    { v: 2, label: 'Dispersé·e' },
    { v: 3, label: 'Moyen' },
    { v: 4, label: 'Concentré·e' },
    { v: 5, label: 'Très concentré·e' }
  ];
  var DIFFICULTIES = [
    { id: 'subject',    label: 'Sujet difficile' },
    { id: 'notion',     label: 'Notion pas comprise' },
    { id: 'volume',     label: 'Trop de travail' },
    { id: 'time',       label: 'Manque de temps' },
    { id: 'motivation', label: 'Manque de motivation' },
    { id: 'distraction', label: 'Distractions' },
    { id: 'other',      label: 'Autre' }
  ];
  var MAX_AUTO_CREDIT_MS = 6 * 3600 * 1000; // une session « en cours » oubliée > 6 h est mise en pause

  var tickTimer = null;
  var bilan = { conc: 0, diffs: [] };
  var flashTimeout = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function todayKey() {
    if (window.BenkyoStorage && BenkyoStorage.dateKeyOf) return BenkyoStorage.dateKeyOf(new Date());
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function defaultDraft() {
    return { url: '', drink: '', mood: '', goals: [], status: 'idle', accSec: 0, lastStart: null, day: todayKey() };
  }

  // ---------- État ----------
  function ensure() {
    if (!Array.isArray(state.immersiveSessions)) state.immersiveSessions = [];
    var d = state.immersiveDraft;
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = state.immersiveDraft = defaultDraft();
    var def = defaultDraft();
    Object.keys(def).forEach(function (k) { if (d[k] === undefined || d[k] === null && k !== 'lastStart') d[k] = def[k]; });
    if (!Array.isArray(d.goals)) d.goals = [];
    return d;
  }
  function persist(now) {
    try {
      if (!now && window.BenkyoStorage && BenkyoStorage.saveDebounced) BenkyoStorage.saveDebounced(state, 300);
      else saveState();
    } catch (e) { console.warn('[Benkyo] sauvegarde session immersive', e); }
  }

  // ---------- Lecteur YouTube ----------
  function parseTime(t) {
    if (!t) return 0;
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    var m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(t);
    if (!m) return 0;
    return (parseInt(m[1] || 0, 10) * 3600) + (parseInt(m[2] || 0, 10) * 60) + parseInt(m[3] || 0, 10);
  }
  // Renvoie l'URL d'intégration ou null si le lien n'est pas reconnu.
  function toEmbedUrl(raw, autoplay) {
    raw = (raw || '').trim();
    if (!raw) return null;
    if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    var u;
    try { u = new URL(raw); } catch (e) { return null; }
    var host = u.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');
    var parts = u.pathname.split('/').filter(Boolean);
    var id = null, list = u.searchParams.get('list'), channel = null;

    if (host === 'youtu.be') {
      id = parts[0];
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (parts[0] === 'watch') id = u.searchParams.get('v');
      else if (['live', 'embed', 'shorts', 'v'].indexOf(parts[0]) !== -1) id = parts[1];
      else if (parts[0] === 'channel' && parts[2] === 'live') channel = parts[1];
      else if (parts[0] !== 'playlist') return null;
    } else {
      return null;
    }

    var q = ['rel=0', 'playsinline=1', 'modestbranding=1', 'autoplay=' + (autoplay ? 1 : 0)];
    var start = parseTime(u.searchParams.get('t') || u.searchParams.get('start'));
    if (start > 0) q.push('start=' + start);

    if (channel) {
      if (!/^UC[\w-]{20,}$/.test(channel)) return null;
      return 'https://www.youtube.com/embed/live_stream?channel=' + channel + '&' + q.join('&');
    }
    if (id) {
      if (!/^[\w-]{6,20}$/.test(id)) return null;
      if (list && /^[\w-]+$/.test(list)) q.push('list=' + list);
      return 'https://www.youtube.com/embed/' + id + '?' + q.join('&');
    }
    if (list && /^[\w-]+$/.test(list)) {
      return 'https://www.youtube.com/embed/videoseries?list=' + list + '&' + q.join('&');
    }
    return null;
  }

  function showUrlError(msg) {
    var box = $('imm-url-error');
    if (!box) return;
    box.textContent = msg || '';
    box.classList.toggle('hidden', !msg);
  }
  function renderPlayer(embedUrl) {
    var wrap = $('imm-player-wrap');
    if (!wrap) return;
    var frame = $('imm-player');
    var empty = $('imm-player-empty');
    if (!embedUrl) {
      if (frame) frame.remove();
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'imm-player';
      frame.title = 'Lecteur YouTube';
      frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      wrap.appendChild(frame);
    }
    frame.src = embedUrl;
  }

  window.immLoadVideo = function () {
    var d = ensure();
    var input = $('imm-url');
    var raw = input ? input.value : '';
    var embed = toEmbedUrl(raw, true);
    if (!embed) {
      showUrlError(raw.trim()
        ? "Lien non reconnu. Colle le lien d'une vidéo, d'un live ou d'une playlist YouTube (ex : youtube.com/watch?v=… ou youtu.be/…)."
        : 'Colle d\'abord un lien YouTube.');
      return;
    }
    showUrlError('');
    // Évite deux sons en même temps : on coupe le lofi / MP3 du Pomodoro.
    try { if (typeof stopAllMedia === 'function') stopAllMedia(); } catch (e) {}
    d.url = raw.trim();
    persist(true);
    renderPlayer(embed);
  };
  window.immClearVideo = function () {
    var d = ensure();
    d.url = '';
    if ($('imm-url')) $('imm-url').value = '';
    showUrlError('');
    renderPlayer(null);
    persist(true);
  };

  // ---------- Chronomètre ----------
  function elapsedSec() {
    var d = ensure();
    var extra = (d.status === 'running' && d.lastStart) ? (Date.now() - d.lastStart) / 1000 : 0;
    return Math.max(0, d.accSec + extra);
  }
  function fmt(sec) {
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function fmtMin(min) {
    min = Math.round(min);
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : '');
  }
  function tick() {
    var el = $('imm-timer');
    if (el) el.textContent = fmt(elapsedSec());
  }
  function startTicking() {
    if (tickTimer) return;
    tickTimer = setInterval(tick, 1000);
  }
  function stopTicking() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  function flash(msg) {
    var el = $('imm-flash');
    if (!el) return;
    el.textContent = msg || '';
    clearTimeout(flashTimeout);
    if (msg) flashTimeout = setTimeout(function () { el.textContent = ''; }, 6000);
  }

  window.immStartPause = function () {
    var d = ensure();
    if (d.status === 'running') {
      d.accSec = elapsedSec();
      d.lastStart = null;
      d.status = 'paused';
    } else {
      d.status = 'running';
      d.lastStart = Date.now();
    }
    flash('');
    persist(true);
    renderTimerControls();
  };

  function renderTimerControls() {
    var d = ensure();
    var status = $('imm-status'), btn = $('imm-start-btn'), end = $('imm-end-btn');
    if (status) {
      status.classList.toggle('is-running', d.status === 'running');
      status.classList.toggle('is-paused', d.status === 'paused');
      status.textContent = d.status === 'running' ? 'En cours' : d.status === 'paused' ? 'En pause' : 'Prêt·e ?';
    }
    if (btn) {
      btn.innerHTML = d.status === 'running'
        ? '<i class="fa-solid fa-pause mr-2"></i>Pause'
        : d.status === 'paused'
          ? '<i class="fa-solid fa-play mr-2"></i>Reprendre'
          : '<i class="fa-solid fa-play mr-2"></i>Démarrer la session';
    }
    if (end) end.classList.toggle('hidden', d.status === 'idle');
    tick();
    if (d.status === 'running') startTicking(); else stopTicking();
  }

  // ---------- Boisson / humeur / objectifs ----------
  window.immSetDrink = function (value) {
    var d = ensure();
    d.drink = String(value || '').slice(0, 60);
    if ($('imm-drink')) $('imm-drink').value = d.drink;
    persist();
  };
  window.immOnDrinkInput = function () {
    var d = ensure();
    d.drink = ($('imm-drink').value || '').slice(0, 60);
    persist();
  };
  window.immSetMood = function (id) {
    var d = ensure();
    d.mood = d.mood === id ? '' : id;
    renderMoods();
    persist();
  };
  function renderMoods() {
    var d = ensure();
    var box = $('imm-moods');
    if (!box) return;
    box.innerHTML = MOODS.map(function (m) {
      return '<button type="button" class="imm-mood' + (d.mood === m.id ? ' is-on' : '') + '" onclick="immSetMood(\'' + m.id + '\')" aria-pressed="' + (d.mood === m.id) + '">' +
        '<span class="imm-emoji">' + m.emoji + '</span>' + esc(m.label) + '</button>';
    }).join('');
  }
  function renderDrinkChips() {
    var box = $('imm-drink-chips');
    if (!box) return;
    box.innerHTML = DRINKS.map(function (dr, i) {
      return '<button type="button" class="imm-chip" data-drink="' + i + '">' + esc(dr) + '</button>';
    }).join('');
    box.onclick = function (ev) {
      var b = ev.target.closest('[data-drink]');
      if (b) immSetDrink(DRINKS[parseInt(b.getAttribute('data-drink'), 10)]);
    };
  }

  window.immAddGoal = function () {
    var d = ensure();
    var input = $('imm-goal-input');
    var text = (input.value || '').trim();
    if (!text) return;
    d.goals.push({ id: Date.now() + Math.floor(Math.random() * 1000), text: text.slice(0, 200), done: false });
    input.value = '';
    input.focus();
    renderGoals();
    persist();
  };
  window.immToggleGoal = function (id) {
    var g = ensure().goals.find(function (x) { return x.id === id; });
    if (g) { g.done = !g.done; renderGoals(); renderBilanGoals(); persist(); }
  };
  window.immDeleteGoal = function (id) {
    var d = ensure();
    d.goals = d.goals.filter(function (x) { return x.id !== id; });
    renderGoals();
    persist();
  };
  function goalsHtml(goals) {
    return goals.map(function (g) {
      return '<li class="imm-goal' + (g.done ? ' is-done' : '') + '">' +
        '<input type="checkbox"' + (g.done ? ' checked' : '') + ' onchange="immToggleGoal(' + g.id + ')" aria-label="Objectif atteint">' +
        '<span>' + esc(g.text) + '</span>' +
        '<button type="button" onclick="immDeleteGoal(' + g.id + ')" title="Supprimer" aria-label="Supprimer l\'objectif"><i class="fa-solid fa-xmark"></i></button>' +
        '</li>';
    }).join('');
  }
  function renderGoals() {
    var d = ensure();
    var list = $('imm-goals');
    if (!list) return;
    list.innerHTML = d.goals.length ? goalsHtml(d.goals) : '<li class="imm-empty">Aucun objectif pour l\'instant. Ajoute-en un pour cadrer ta session 🎯</li>';
  }
  function renderBilanGoals() {
    var d = ensure();
    var list = $('imm-bilan-goals');
    if (!list) return;
    var done = d.goals.filter(function (g) { return g.done; }).length;
    var title = $('imm-bilan-goals-title');
    if (title) title.textContent = d.goals.length ? 'Objectifs atteints (' + done + '/' + d.goals.length + ')' : 'Objectifs';
    list.innerHTML = d.goals.length ? goalsHtml(d.goals) : '<li class="imm-empty">Tu n\'avais pas fixé d\'objectif pour cette session.</li>';
  }

  // ---------- Bilan ----------
  function renderBilanChoices() {
    var conc = $('imm-bilan-conc');
    if (conc) {
      conc.innerHTML = CONCENTRATION.map(function (c) {
        return '<button type="button" class="imm-chip' + (bilan.conc === c.v ? ' is-on' : '') + '" data-conc="' + c.v + '">' + esc(c.label) + '</button>';
      }).join('');
      conc.onclick = function (ev) {
        var b = ev.target.closest('[data-conc]');
        if (!b) return;
        var v = parseInt(b.getAttribute('data-conc'), 10);
        bilan.conc = bilan.conc === v ? 0 : v;
        renderBilanChoices();
      };
    }
    var diffs = $('imm-bilan-diffs');
    if (diffs) {
      diffs.innerHTML = DIFFICULTIES.map(function (df) {
        return '<button type="button" class="imm-chip' + (bilan.diffs.indexOf(df.id) !== -1 ? ' is-on' : '') + '" data-diff="' + df.id + '">' + esc(df.label) + '</button>';
      }).join('');
      diffs.onclick = function (ev) {
        var b = ev.target.closest('[data-diff]');
        if (!b) return;
        var id = b.getAttribute('data-diff');
        var i = bilan.diffs.indexOf(id);
        if (i === -1) bilan.diffs.push(id); else bilan.diffs.splice(i, 1);
        renderBilanChoices();
      };
    }
  }

  window.immFinish = function () {
    var d = ensure();
    // On fige le chronomètre pendant le bilan.
    if (d.status === 'running') {
      d.accSec = elapsedSec();
      d.lastStart = null;
      d.status = 'paused';
      persist(true);
      renderTimerControls();
    }
    bilan = { conc: 0, diffs: [] };
    $('imm-bilan-minutes').value = Math.round(d.accSec / 60);
    $('imm-bilan-done').value = '';
    $('imm-bilan-diff-note').value = '';
    $('imm-bilan-log').checked = true;
    renderBilanChoices();
    renderBilanGoals();
    $('imm-bilan-modal').classList.remove('hidden');
  };
  window.immCloseBilan = function () {
    $('imm-bilan-modal').classList.add('hidden');
  };
  window.immSaveBilan = function () {
    var d = ensure();
    var minutes = Math.max(0, Math.round(parseFloat($('imm-bilan-minutes').value) || 0));
    var entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      minutes: minutes,
      drink: d.drink || '',
      mood: d.mood || '',
      videoUrl: d.url || '',
      goals: d.goals.map(function (g) { return { text: g.text, done: !!g.done }; }),
      done: ($('imm-bilan-done').value || '').trim(),
      concentration: bilan.conc || 0,
      difficulties: bilan.diffs.slice(),
      difficultyNote: ($('imm-bilan-diff-note').value || '').trim()
    };
    state.immersiveSessions.unshift(entry);
    if ($('imm-bilan-log').checked && minutes > 0 && window.BenkyoStorage && BenkyoStorage.logStudyMinutes) {
      BenkyoStorage.logStudyMinutes(state, minutes * 60);
    }
    // Nouvelle session : on garde seulement le lien vidéo.
    var url = d.url;
    state.immersiveDraft = defaultDraft();
    state.immersiveDraft.url = url;
    persist(true);

    immCloseBilan();
    if ($('imm-drink')) $('imm-drink').value = '';
    renderMoods();
    renderGoals();
    renderTimerControls();
    renderHistory();
    flash('Bilan enregistré ✅ Bravo pour cette session !');
  };

  // ---------- Historique ----------
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  function renderHistory() {
    ensure();
    var box = $('imm-history');
    if (!box) return;
    var list = state.immersiveSessions;
    if (!list.length) {
      box.innerHTML = '<div class="imm-empty">Aucune session immersive enregistrée pour le moment. Ton premier bilan apparaîtra ici.</div>';
      return;
    }
    box.innerHTML = list.slice(0, 30).map(function (s) {
      var mood = MOODS.find(function (m) { return m.id === s.mood; });
      var conc = CONCENTRATION.find(function (c) { return c.v === s.concentration; });
      var goalsDone = (s.goals || []).filter(function (g) { return g.done; }).length;
      var tags = [];
      tags.push('<span class="imm-tag">⏱️ ' + esc(fmtMin(s.minutes)) + '</span>');
      if (mood) tags.push('<span class="imm-tag">' + mood.emoji + ' ' + esc(mood.label) + '</span>');
      if (s.drink) tags.push('<span class="imm-tag">' + esc(s.drink) + '</span>');
      if ((s.goals || []).length) tags.push('<span class="imm-tag">🎯 ' + goalsDone + '/' + s.goals.length + ' objectifs</span>');
      if (conc) tags.push('<span class="imm-tag' + (s.concentration <= 2 ? ' is-warn' : '') + '">🧠 ' + esc(conc.label) + '</span>');
      (s.difficulties || []).forEach(function (id) {
        var df = DIFFICULTIES.find(function (x) { return x.id === id; });
        if (df) tags.push('<span class="imm-tag is-warn">⚠️ ' + esc(df.label) + '</span>');
      });
      return '<div class="imm-entry">' +
        '<div class="imm-entry-head"><span class="imm-entry-title">' + esc(fmtDate(s.date)) + '</span>' +
        '<button type="button" class="imm-del" onclick="immDeleteSession(' + s.id + ')" title="Supprimer cette session" aria-label="Supprimer cette session"><i class="fa-solid fa-trash-can"></i></button></div>' +
        '<div class="imm-entry-meta">' + tags.join('') + '</div>' +
        (s.done ? '<p><strong>Fait :</strong> ' + esc(s.done) + '</p>' : '') +
        (s.difficultyNote ? '<p><strong>Difficultés :</strong> ' + esc(s.difficultyNote) + '</p>' : '') +
        '</div>';
    }).join('');
  }
  window.immDeleteSession = function (id) {
    var run = function () {
      state.immersiveSessions = state.immersiveSessions.filter(function (s) { return s.id !== id; });
      persist(true);
      renderHistory();
    };
    if (typeof showConfirmModal === 'function') {
      showConfirmModal('Supprimer cette session ?', 'Le bilan de cette session immersive sera supprimé (le temps déjà ajouté aux statistiques reste compté).', run, 'Supprimer');
    } else {
      run();
    }
  };

  // ---------- Initialisation ----------
  window.immRender = function () {
    var d = ensure();
    if ($('imm-url') && document.activeElement !== $('imm-url')) $('imm-url').value = d.url || '';
    if ($('imm-drink') && document.activeElement !== $('imm-drink')) $('imm-drink').value = d.drink || '';
    renderMoods();
    renderGoals();
    renderTimerControls();
    renderHistory();
  };

  function init() {
    if (!$('pomo-subtab-immersive') || typeof state === 'undefined') return;
    var d = ensure();

    // Nouveau jour sans session en cours : on repart d'une feuille blanche (le lien vidéo est conservé).
    if (d.day !== todayKey() && d.status === 'idle') {
      var url = d.url;
      state.immersiveDraft = defaultDraft();
      state.immersiveDraft.url = url;
      d = state.immersiveDraft;
    }
    // Page fermée pendant très longtemps avec le chrono « en cours » : on ne crédite pas ce temps.
    if (d.status === 'running' && d.lastStart && Date.now() - d.lastStart > MAX_AUTO_CREDIT_MS) {
      d.status = 'paused';
      d.lastStart = null;
      persist(true);
      flash('La session a été mise en pause automatiquement car la page est restée fermée trop longtemps.');
    }

    renderDrinkChips();
    immRender();

    var embed = toEmbedUrl(d.url, false);
    if (embed) renderPlayer(embed);

    var goalInput = $('imm-goal-input');
    if (goalInput) goalInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); immAddGoal(); } });
    var urlInput = $('imm-url');
    if (urlInput) urlInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); immLoadVideo(); } });
    var modal = $('imm-bilan-modal');
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) immCloseBilan(); });
  }

  init();
})();
