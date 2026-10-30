/* menu-nav.js — le bouton « Menu » (en haut à gauche des pages) ouvre un petit
   déroulant avec toutes les pages et leurs sous-onglets. Un sous-onglet de la page
   en cours s'ouvre directement ; pour une autre page, on y arrive via
   page.html#sous-onglet (lu ici au chargement). */
(function () {
  'use strict';
  // [page, nom, kanji, fonction de bascule, [[clé, libellé], …]]
  var PAGES = [
    ['emploi-du-temps.html', 'Emploi du temps', '時間割'],
    ['calendrier.html', 'Calendrier', '暦'],
    ['todo.html', 'To-do', '課題'],
    ['revisions.html', 'Révisions', '復習', 'switchRevisionSubtab', [['courses', 'Cours & chapitres'], ['planning', 'Planning de révisions'], ['suivi', 'Suivi des séances'], ['difficultes', 'Mes difficultés']]],
    ['pense-bete.html', 'Pense-bête', '付箋'],
    ['notes-moyennes.html', 'Résultats', '成績'],
    ['flashcards.html', 'Apprentissage', '学習', 'switchLearningSubtab', [['flashcards', 'Flashcards'], ['blanks', 'Texte à trous'], ['quotes', 'Citations']]],
    ['pomodoro.html', 'Session de travail', '集中', 'switchPomodoroSubtab', [['timer', 'Pomodoro'], ['immersive', 'Session immersive'], ['focus-train', 'Focus train'], ['focus-plane', 'Focus avion'], ['training', 'Entraînement (concours blanc)'], ['stats', 'Statistiques d’étude']]],
    ['fournitures.html', 'Fournitures & achats', '買物'],
    ['profil.html', 'Mon profil', '私', 'switchProfileSubtab', [['profil', 'Profil & résultats'], ['carnet', 'Mon carnet'], ['tampons', 'Mes tampons'], ['moral', 'Mon moral']]]
  ];
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var tab = document.querySelector('.bk-menu-tab');
  if (!tab) return;

  function el(tag, cls, txt, attrs) {
    var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt;
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    return e;
  }
  var panel = el('nav', 'bk-menu-panel', '', { id: 'bk-menu-panel', 'aria-label': 'Navigation du site' });
  panel.hidden = true;

  function row(href, name, kanji, cur) {
    var a = el('a', 'bkm-row' + (cur ? ' cur' : ''), '', { href: href });
    if (cur) a.setAttribute('aria-current', 'page');
    a.appendChild(el('span', '', name));
    if (kanji) a.appendChild(el('small', '', kanji, { lang: 'ja', 'aria-hidden': 'true' }));
    return a;
  }
  panel.appendChild(row('index.html', 'Accueil', '家', false));
  PAGES.forEach(function (p) {
    var cur = p[0] === here, r = row(p[0], p[1], p[2], cur);
    if (cur) r.addEventListener('click', function (e) { e.preventDefault(); close(); });
    panel.appendChild(r);
    if (!p[4]) return;
    var sub = el('div', 'bkm-sub');
    p[4].forEach(function (s) {
      var a = el('a', '', s[1], { href: p[0] + '#' + s[0] });
      if (cur) a.addEventListener('click', function (e) {
        var fn = window[p[3]]; if (typeof fn !== 'function') return;   // sinon : navigation classique
        e.preventDefault(); fn(s[0]); try { history.replaceState(null, '', '#' + s[0]); } catch (x) {} close();
      });
      sub.appendChild(a);
    });
    panel.appendChild(sub);
  });
  document.body.appendChild(panel);

  // Petit chevron sur le bouton + comportement de déroulant
  tab.insertAdjacentHTML('beforeend', '<svg class="bk-menu-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>');
  tab.setAttribute('aria-haspopup', 'true'); tab.setAttribute('aria-expanded', 'false'); tab.setAttribute('aria-controls', 'bk-menu-panel');
  tab.setAttribute('aria-label', 'Menu — ouvrir la navigation');
  function open() { panel.hidden = false; tab.setAttribute('aria-expanded', 'true'); var f = panel.querySelector('a.cur') || panel.querySelector('a'); if (f) f.focus({ preventScroll: true }); }
  function close() { if (panel.hidden) return; panel.hidden = true; tab.setAttribute('aria-expanded', 'false'); }
  tab.addEventListener('click', function (e) { e.preventDefault(); panel.hidden ? open() : (close(), tab.focus()); });
  document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !tab.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { close(); tab.focus(); } });

  // Arrivée par page.html#sous-onglet : on ouvre le bon sous-onglet une fois la page prête
  var cur = PAGES.filter(function (p) { return p[0] === here; })[0], key = (location.hash || '').slice(1);
  if (cur && cur[4] && cur[4].some(function (s) { return s[0] === key; })) {
    window.addEventListener('load', function () { setTimeout(function () { if (typeof window[cur[3]] === 'function') window[cur[3]](key); }, 150); });
  }
})();
