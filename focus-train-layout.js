/* Focus train — onglets « pendant le trajet » (Gares & itinéraire · Ambiance · Objectifs).
   Ne modifie aucune donnée du voyage : il affiche un panneau à la fois, mémorise l'onglet choisi
   (benkyo_focus_train_dock_v1) et recopie sur les onglets le compteur d'objectifs et l'état de l'ambiance. */
(function () {
  'use strict';
  var KEY = 'benkyo_focus_train_dock_v1';
  var dock = document.getElementById('ft-dock');
  if (!dock) return;
  var tabs = Array.prototype.slice.call(dock.querySelectorAll('.ft-dock-tab'));
  var panels = {};
  tabs.forEach(function (t) { panels[t.dataset.dock] = document.getElementById(t.getAttribute('aria-controls')); });

  function read() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { window.localStorage.setItem(KEY, v); } catch (e) { /* stockage indisponible : on ignore */ } }

  function show(name, focus) {
    if (!panels[name]) name = 'route';
    tabs.forEach(function (t) {
      var on = t.dataset.dock === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    Object.keys(panels).forEach(function (k) { if (panels[k]) panels[k].classList.toggle('hidden', k !== name); });
  }

  /* Le panneau s'ouvre sous les onglets, souvent hors de l'écran : on le fait défiler jusqu'à lui pour qu'il soit visible. */
  function reveal(name) {
    var p = panels[name]; if (!p || !p.scrollIntoView) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(function () { p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(t.dataset.dock); write(t.dataset.dock); reveal(t.dataset.dock); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') d = -99; if (e.key === 'End') d = 99;
      if (!d) return;
      e.preventDefault();
      var n = d === -99 ? 0 : d === 99 ? tabs.length - 1 : (i + d + tabs.length) % tabs.length;
      show(tabs[n].dataset.dock, true); write(tabs[n].dataset.dock);
    });
  });

  /* Pastilles : objectifs « x / y » et ambiance (point vert quand une musique joue). */
  var todoChip = document.getElementById('ft-todo-progress-chip'), todoBadge = document.getElementById('ft-dock-badge-todo');
  var musicChip = document.getElementById('ft-music-chip'), musicBadge = document.getElementById('ft-dock-badge-music');
  function sync() {
    if (todoChip && todoBadge) todoBadge.textContent = todoChip.textContent.trim() || '0 / 0';
    if (musicChip && musicBadge) {
      var txt = musicChip.textContent.trim(), playing = txt !== '' && !/^silence$/i.test(txt);
      musicBadge.classList.toggle('hidden', !playing);
      musicBadge.innerHTML = playing ? '<i class="fa-solid fa-music" aria-hidden="true"></i> ' + (/lofi/i.test(txt) ? 'Lofi' : 'MP3') : '';
    }
  }
  var mo = typeof MutationObserver === 'function' ? new MutationObserver(sync) : null;
  [todoChip, musicChip].forEach(function (el) { if (el && mo) mo.observe(el, { childList: true, characterData: true, subtree: true }); });
  sync();

  show(read() || 'route');
})();
