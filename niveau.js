/* ============================================================
   niveau.js — Barème de notation adapté au niveau d'études
   -------------------------------------------------------------
   Une note de 8/20 n'a pas la même valeur au collège, en classe
   préparatoire ou à l'agrégation. Ce module lit le "Niveau d'étude"
   du profil (champ libre : "Khâgne", "L2", "Terminale"…) et en
   déduit un barème. Tout le site (bulletin, bulletin japonais,
   moyennes, progression du profil) l'utilise pour juger les notes.

   Principe : chaque barème a deux repères
     - pivot : la note qui "vaut" 10/20 au niveau standard (réussite)
     - excel : la note qui "vaut" 16/20 au niveau standard (excellence)
   Les notes sont ramenées sur l'échelle standard par une courbe
   linéaire par morceaux (0→0, pivot→10, excel→16, 20→20), puis jugées
   avec les seuils habituels. Les notes brutes ne sont jamais modifiées.
   ============================================================ */
(function (global) {
  'use strict';

  var SCALES = {
    standard: {
      id: 'standard', pivot: 10, excel: 16, kanji: '標準',
      label: 'Barème standard',
      levels: 'Primaire, collège, lycée'
    },
    superieur: {
      id: 'superieur', pivot: 9, excel: 15, kanji: '大学',
      label: 'Barème supérieur',
      levels: 'Licence, BTS, BUT, master…'
    },
    prepa: {
      id: 'prepa', pivot: 8, excel: 13, kanji: '準備',
      label: 'Barème prépa / grandes écoles',
      levels: 'Classes préparatoires, écoles, médecine…'
    },
    concours: {
      id: 'concours', pivot: 7, excel: 12, kanji: '難関',
      label: 'Barème concours (agrégation, CAPES…)',
      levels: 'Agrégation, CAPES, concours très sélectifs'
    }
  };

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9+]+/g, ' ')
      .trim();
  }

  var RE_CONCOURS = /\b(agreg\w*|capes|capet|caplp|crpe|concours|bac ?\+ ?[5-8])\b/;
  var RE_PREPA = /\b(prepa\w*|cpge|hypokhagne|khagne|hypo|cube|mpsi|mp2i|pcsi|ptsi|tsi|ecg|ecs|ece|bcpst|mpstar|psi|pc|pt|mp|ats|atsi|math sup|math spe|maths sup|maths spe|sup|spe|ens|ingenieur\w*|ecole d ingenieur\w*|ecole de commerce|grande ecole|commerce|medecine|pass|las|pharmacie|dentaire|maieutique|iep|sciences po)\b/;
  var RE_SUP = /\b(l[1-3]|licence|bachelor|bts|but|dut|iut|deug|dcg|dscg|universite|fac|faculte|master|m[12]|doctorat|these|bac ?\+ ?[1-4])\b/;

  // Devine le barème à partir du texte libre du niveau d'études.
  function detect(levelText) {
    var t = normalize(levelText);
    if (!t) return 'standard';
    if (RE_CONCOURS.test(t)) return 'concours';
    if (RE_PREPA.test(t)) return 'prepa';
    if (RE_SUP.test(t)) return 'superieur';
    return 'standard';
  }

  // Barème effectif d'un profil : choix manuel (profile.gradingScale) sinon
  // détection automatique d'après le niveau saisi.
  function getScale(profile) {
    profile = profile || {};
    var manual = profile.gradingScale;
    if (manual && manual !== 'auto' && SCALES[manual]) return SCALES[manual];
    return SCALES[detect(profile.level)];
  }

  function clamp20(v) { return Math.max(0, Math.min(20, v)); }

  // Ramène une note (/20) sur l'échelle standard, pour la juger avec les
  // seuils habituels (10 = réussite, 16 = excellence).
  function adjust(value, scale) {
    var v = clamp20(Number(value) || 0);
    var s = scale || SCALES.standard;
    var out;
    if (v <= s.pivot) out = s.pivot > 0 ? v * 10 / s.pivot : 0;
    else if (v <= s.excel) out = 10 + (v - s.pivot) * 6 / (s.excel - s.pivot);
    else out = 16 + (v - s.excel) * 4 / (20 - s.excel);
    return clamp20(out);
  }

  // Une note est "mauvaise" quand elle est sous le pivot du niveau
  // (ex. < 8/20 en prépa, < 7/20 à l'agrégation, < 10/20 au lycée).
  function isBad(value, scale) {
    return Number(value) < (scale || SCALES.standard).pivot;
  }

  // Note brute (/20) qui équivaut à une note standard donnée.
  function rawFor(standardValue, scale) {
    var s = scale || SCALES.standard;
    var x = clamp20(standardValue);
    if (x <= 10) return x * s.pivot / 10;
    if (x <= 16) return s.pivot + (x - 10) * (s.excel - s.pivot) / 6;
    return s.excel + (x - 16) * (20 - s.excel) / 4;
  }

  function fmt(n) {
    var r = Math.round(n * 10) / 10;
    return (r % 1 === 0 ? String(r) : r.toFixed(1)).replace('.', ',');
  }

  // Phrase courte décrivant le barème appliqué (affichée dans le profil
  // et le bulletin).
  function describe(profile) {
    var s = getScale(profile);
    var level = (profile && profile.level) ? String(profile.level).trim() : '';
    if (s.id === 'standard') {
      return (level ? '« ' + level + ' » · ' : '') + 'barème standard : 10/20 = réussite, 16/20 = excellence.';
    }
    return (level ? '« ' + level + ' » · ' : '') + s.label.toLowerCase() + ' : ' +
      fmt(s.pivot) + '/20 est jugé comme un 10/20 standard, ' + fmt(s.excel) + '/20 comme un 16/20.';
  }

  global.BenkyoLevel = {
    SCALES: SCALES,
    detect: detect,
    getScale: getScale,
    adjust: adjust,
    isBad: isBad,
    rawFor: rawFor,
    describe: describe,
    fmt: fmt
  };
})(window);
