/* ============================================================
   heure.js — Thème selon l'heure de la journée
   ------------------------------------------------------------
   Pose l'attribut data-tod sur <html> (aube, midi, crepuscule,
   nuit). heure.css s'en sert pour changer l'ambiance (voile de
   couleur, verre, encre, ombres). L'image de fond ne change jamais.

   Plages horaires (heure locale) :
     aube        05 h – 09 h 59
     midi        10 h – 16 h 59
     crépuscule  17 h – 20 h 59
     nuit        21 h – 04 h 59
   Le soir (crépuscule et nuit), des lucioles flottent derrière les cartes.

   Prévisualisation : ?heure=aube | midi | crepuscule | nuit
                      ou ?heure=18 (une heure de 0 à 23)
   À charger SANS « defer » dans le <head> : le thème est posé
   avant le premier affichage, donc sans clignotement.
   ============================================================ */
(function (global) {
  'use strict';

  var MOMENTS = {
    aube:       { id: 'aube',       kanji: '暁',  romaji: 'Akatsuki', fr: 'Aube',       theme: '#e6c6e0' },
    midi:       { id: 'midi',       kanji: '昼',  romaji: 'Hiru',     fr: 'Midi',       theme: '#e9d8df' },
    crepuscule: { id: 'crepuscule', kanji: '黄昏', romaji: 'Tasogare', fr: 'Crépuscule', theme: '#5b3a8a' },
    nuit:       { id: 'nuit',       kanji: '夜',  romaji: 'Yoru',     fr: 'Nuit',       theme: '#232a52' }
  };

  function momentOfHour(h) {
    if (h >= 5 && h < 10) return 'aube';
    if (h >= 10 && h < 17) return 'midi';
    if (h >= 17 && h < 21) return 'crepuscule';
    return 'nuit';
  }

  function previewId() {
    try {
      var q = new URLSearchParams(global.location.search);
      var raw = (q.get('heure') || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (MOMENTS[raw]) return raw;
      if (/^\d{1,2}$/.test(raw) && +raw >= 0 && +raw <= 23) return momentOfHour(+raw);
    } catch (e) {}
    return null;
  }

  function current() {
    var id = previewId() || momentOfHour(new Date().getHours());
    var m = MOMENTS[id];
    return { id: m.id, kanji: m.kanji, romaji: m.romaji, fr: m.fr, theme: m.theme };
  }

  /* ---------- Lucioles du soir (crépuscule et nuit) ----------
     Quelques lucioles qui clignotent et dérivent derrière les cartes.
     Pas de lucioles un jour de fête : le décor de fête (fete.js) prend la place. */
  var FLIES = { crepuscule: 14, nuit: 20 };
  var flyNode = null, flyFor = null;

  function fliesWanted(id) {
    if (!FLIES[id]) return false;
    try { if (global.BenkyoFete && global.BenkyoFete.current()) return false; } catch (e) {}
    return true;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function removeFlies() {
    if (flyNode && flyNode.parentNode) flyNode.parentNode.removeChild(flyNode);
    flyNode = null; flyFor = null;
  }
  function buildFlies(id) {
    removeFlies();
    if (!document.body) return;
    var small = false, reduce = false;
    try {
      small = global.matchMedia('(max-width: 640px)').matches;
      reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    var n = Math.round(FLIES[id] * (reduce ? .5 : (small ? .6 : 1)));
    var box = document.createElement('div');
    box.className = 'tod-fireflies';
    box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < n; i++) {
      var f = document.createElement('span');
      f.className = 'tod-fly';
      var st = f.style, mv = rnd(14, 32), bl = rnd(2.4, 5.2);
      st.setProperty('--x', rnd(2, 97).toFixed(1) + 'vw');
      st.setProperty('--y', rnd(32, 96).toFixed(1) + 'vh');
      st.setProperty('--s', rnd(5.5, 10).toFixed(1) + 'px');
      st.setProperty('--dx', (rnd(8, 20) * (Math.random() < .5 ? -1 : 1)).toFixed(1) + 'vw');
      st.setProperty('--dy', rnd(5, 15).toFixed(1) + 'vh');
      st.setProperty('--mv', mv.toFixed(1) + 's');
      st.setProperty('--bl', bl.toFixed(1) + 's');
      st.setProperty('--d1', (-rnd(0, mv)).toFixed(1) + 's');
      st.setProperty('--d2', (-rnd(0, bl)).toFixed(1) + 's');
      st.setProperty('--op', rnd(.7, 1).toFixed(2));
      box.appendChild(f);
    }
    document.body.appendChild(box);
    flyNode = box; flyFor = id;
  }
  function syncFlies(id) {
    if (!document.body) return;
    if (fliesWanted(id)) { if (flyFor !== id) buildFlies(id); }
    else if (flyNode) removeFlies();
  }

  var lastId = null;
  function apply() {
    var m = current();
    syncFlies(m.id);
    if (m.id === lastId) return m;
    lastId = m.id;
    try { document.documentElement.setAttribute('data-tod', m.id); } catch (e) {}
    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', m.theme);
    } catch (e) {}
    return m;
  }

  global.BenkyoHeure = { current: current, moments: MOMENTS, apply: apply };
  apply();

  // La page reste ouverte : on change de thème quand l'heure passe (sans recharger).
  if (!previewId()) {
    setInterval(apply, 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) apply(); });
  }
  // La balise theme-color peut ne pas exister encore au premier appel.
  document.addEventListener('DOMContentLoaded', function () { lastId = null; apply(); });
})(window);
