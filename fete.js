/* ============================================================
   fete.js — Ambiances des jours de fête
   ------------------------------------------------------------
   Même principe que heure.js, mais selon la date : le jour J,
   l'attribut data-fete est posé sur <html> et fete.css change
   l'ambiance (voile de couleur, verre, encre, accent) ; un décor
   léger (citrouilles, flocons, étincelles…) flotte derrière les
   cartes. L'image de fond ne change jamais.

   Jours concernés (date locale, toute la journée) :
     halloween     31 octobre
     veille-noel   24 décembre
     noel          25 décembre
     sylvestre     31 décembre
     nouvel-an     1er janvier

   Prévisualisation : ?fete=halloween | veille-noel | noel
                      | sylvestre | nouvel-an
   (les alias ?fete=24-12, 25-12, 31-10, 31-12, 1-1 marchent aussi)
   À charger SANS « defer » dans le <head>, APRÈS heure.js : le
   thème est posé avant le premier affichage, sans clignotement.
   ============================================================ */
(function (global) {
  'use strict';

  var FETES = {
    'halloween': {
      id: 'halloween', m: 10, d: 31,
      kanji: '魔', jp: 'ハロウィン', romaji: 'Harowin',
      fr: 'Joyeux Halloween', noun: 'une citrouille',
      desc: 'Pas de mauvais sort aujourd\'hui : seulement des révisions bien sucrées.',
      theme: '#2a1636'
    },
    'veille-noel': {
      id: 'veille-noel', m: 12, d: 24,
      kanji: '聖', jp: '聖夜', romaji: 'Seiya',
      fr: 'La veille de Noël', noun: 'une étoile',
      desc: 'Une nuit calme et étoilée : on range les cahiers sans culpabilité.',
      theme: '#16264a'
    },
    'noel': {
      id: 'noel', m: 12, d: 25,
      kanji: '誕', jp: 'クリスマス', romaji: 'Kurisumasu',
      fr: 'Joyeux Noël', noun: 'un cadeau',
      desc: 'Le meilleur cadeau du jour : une vraie pause, sans écran de révision.',
      theme: '#4a1424'
    },
    'sylvestre': {
      id: 'sylvestre', m: 12, d: 31,
      kanji: '年', jp: '大晦日', romaji: 'Ōmisoka',
      fr: 'La Saint-Sylvestre', noun: 'une étincelle',
      desc: 'Dernier jour de l\'année : on fait le bilan, puis on fête ça.',
      theme: '#1d1a45'
    },
    'nouvel-an': {
      id: 'nouvel-an', m: 1, d: 1,
      kanji: '初', jp: '元日', romaji: 'Ganjitsu',
      fr: 'Bonne année', noun: 'un vœu',
      desc: 'Premier jour de l\'année : un vœu, un sourire, et on repart du bon pied.',
      theme: '#5a1a2c'
    }
  };

  var ALIASES = {
    '31-10': 'halloween', '31/10': 'halloween', 'halloween': 'halloween',
    '24-12': 'veille-noel', '24/12': 'veille-noel', 'veille-noel': 'veille-noel', 'veillenoel': 'veille-noel', 'veille': 'veille-noel',
    '25-12': 'noel', '25/12': 'noel', 'noel': 'noel',
    '31-12': 'sylvestre', '31/12': 'sylvestre', 'sylvestre': 'sylvestre', 'saint-sylvestre': 'sylvestre',
    '1-1': 'nouvel-an', '01-01': 'nouvel-an', '1/1': 'nouvel-an', '01/01': 'nouvel-an', 'nouvel-an': 'nouvel-an', 'nouvelan': 'nouvel-an', 'an': 'nouvel-an'
  };

  function ofDate(d) {
    var n = (d.getMonth() + 1) * 100 + d.getDate();
    for (var k in FETES) if (FETES[k].m * 100 + FETES[k].d === n) return FETES[k];
    return null;
  }

  // ?fete=none : permet de voir le site « sans » le thème de fête ce jour-là.
  function preview() {
    try {
      var q = new URLSearchParams(global.location.search);
      if (!q.has('fete')) return undefined;
      var raw = (q.get('fete') || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      if (ALIASES[raw]) return FETES[ALIASES[raw]];
      if (raw === 'none' || raw === 'non' || raw === 'aucune' || raw === '0') return null;
    } catch (e) {}
    return undefined;
  }

  function resolve() {
    var p = preview();
    return p !== undefined ? p : ofDate(new Date());
  }

  function view(f) {
    return f && {
      id: f.id, kanji: f.kanji, jp: f.jp, romaji: f.romaji, fr: f.fr,
      noun: f.noun, desc: f.desc, theme: f.theme
    };
  }

  function current() { return view(resolve()); }

  /* ---------------- Décor (SVG en ligne, sans fichier externe) ---------------- */

  /* Dégradés partagés : un seul bloc <defs> par décor (ids préfixés « fd- »). */
  var DEFS = '<svg class="fete-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>' +
    '<radialGradient id="fd-pk" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ffc062"/><stop offset=".5" stop-color="#f58a1f"/><stop offset="1" stop-color="#b94a08"/></radialGradient>' +
    '<radialGradient id="fd-glow" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fffbc0"/><stop offset=".55" stop-color="#ffd24d"/><stop offset="1" stop-color="#f08a1b"/></radialGradient>' +
    '<linearGradient id="fd-stem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fb04a"/><stop offset="1" stop-color="#2f6a28"/></linearGradient>' +
    '<linearGradient id="fd-bat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2c6e"/><stop offset="1" stop-color="#150b24"/></linearGradient>' +
    '<radialGradient id="fd-ghost" cx=".4" cy=".28" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f1ecff"/><stop offset="1" stop-color="#c9bdee"/></radialGradient>' +
    '<radialGradient id="fd-star" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#ffec9e"/><stop offset="1" stop-color="#f2b13c"/></radialGradient>' +
    '<radialGradient id="fd-starO" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#ffc766"/><stop offset="1" stop-color="#ea7a1c"/></radialGradient>' +
    '<linearGradient id="fd-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#f2c14e"/><stop offset="1" stop-color="#b9831f"/></linearGradient>' +
    '<radialGradient id="fd-red" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#ff8a94"/><stop offset=".5" stop-color="#d63a4a"/><stop offset="1" stop-color="#85131f"/></radialGradient>' +
    '<radialGradient id="fd-green" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#7fe0aa"/><stop offset=".5" stop-color="#2a9a5e"/><stop offset="1" stop-color="#0f4f33"/></radialGradient>' +
    '<radialGradient id="fd-blue" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#9cc4ff"/><stop offset=".5" stop-color="#3a73c9"/><stop offset="1" stop-color="#17386e"/></radialGradient>' +
    '<radialGradient id="fd-goldB" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#fff4c0"/><stop offset=".5" stop-color="#e9b949"/><stop offset="1" stop-color="#98680f"/></radialGradient>' +
    '<linearGradient id="fd-redL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0606e"/><stop offset="1" stop-color="#a21c2b"/></linearGradient>' +
    '<linearGradient id="fd-greenL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43b97a"/><stop offset="1" stop-color="#14673f"/></linearGradient>' +
    '<linearGradient id="fd-blueL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ea2ec"/><stop offset="1" stop-color="#1f4a94"/></linearGradient>' +
    '<linearGradient id="fd-tree" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46c07e"/><stop offset="1" stop-color="#1b7144"/></linearGradient>' +
    '<radialGradient id="fd-shine" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="fd-moon" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="#fff3d0"/><stop offset=".55" stop-color="#ffc56b"/><stop offset="1" stop-color="#f0862a"/></radialGradient>' +
    '</defs></svg>';

  function wingPath(extra) {
    return '<path d="M50 17C58 6 73 3 97 10C92 13 90 19 91 29C85 24 80 24 76 29C72 24 66 24 62 31C59 26 55 24 50 25Z" fill="url(#fd-bat)"' + (extra || '') + '/>' +
      '<path d="M54 17L96 10M54 18L90 28M54 19L76 28M54 20L62 30" stroke="#a37bd6" stroke-opacity=".5" stroke-width="1" stroke-linecap="round" fill="none"/>';
  }

  var GRAD = { red: 'fd-red', green: 'fd-green', blue: 'fd-blue', gold: 'fd-goldB' };
  var GRAD_L = { red: 'fd-redL', green: 'fd-greenL', blue: 'fd-blueL' };

  var SHAPES = {
    // Citrouille kawaii : pastel pêche, contour prune doux, joues roses, petits yeux brillants.
    // Variantes : 'plain' · 'bow' (nœud rose) · 'hat' (chapeau de sorcière lavande) · 'sleepy' (yeux fermés).
    pumpkin: function (v) {
      var K = '#6b3f4f', W = '2';
      var face = v === 'sleepy'
        ? '<path d="M21 38Q24 40.500 27 38M37 38Q40 40.500 43 38" fill="none" stroke="' + K + '" stroke-width="2.200"/>'
        : '<ellipse cx="24" cy="38" rx="2.600" ry="3.200" fill="' + K + '"/><ellipse cx="40" cy="38" rx="2.600" ry="3.200" fill="' + K + '"/>' +
          '<circle cx="25" cy="36.800" r="1" fill="#fff"/><circle cx="41" cy="36.800" r="1" fill="#fff"/>';
      var top = '';
      if (v === 'hat') {
        top = '<path d="M14 22Q32 15 50 22Q44 25 32 24.500Q20 25 14 22Z" fill="#b9a3e8" stroke="' + K + '" stroke-width="' + W + '"/>' +
          '<path d="M21 22C24 14 28 6 38 2C36 8 40 12 43 21Q32 24 21 22Z" fill="#c9b6f2" stroke="' + K + '" stroke-width="' + W + '"/>' +
          '<path d="M22.500 19Q32 21.500 42 18.500" fill="none" stroke="#ff9ec4" stroke-width="3"/>' +
          '<path d="M34 9l1 2 2 .3-1.500 1.400.4 2-1.900-1-1.900 1 .4-2L31 11.300l2-.3z" fill="#ffe08a" stroke="none"/>';
      } else {
        top = '<path d="M30 20C29.500 15 30.500 12 33 10" fill="none" stroke="' + K + '" stroke-width="5"/><path d="M30 20C29.500 15 30.500 12 33 10" fill="none" stroke="#8fcf7a" stroke-width="2.600"/>' +
          '<path d="M33 14C37 9 44 9 47 12C43 16 37 17 33 14Z" fill="#a8dd8f" stroke="' + K + '" stroke-width="1.800"/>' +
          '<path d="M27 15C23 13 21 9 24 7" fill="none" stroke="#8fcf7a" stroke-width="1.600"/>';
      }
      var bow = v === 'bow'
        ? '<path d="M32 21L23 16Q20 21 23 26Z M32 21L41 16Q44 21 41 26Z" fill="#ffb3cf" stroke="' + K + '" stroke-width="1.800"/><circle cx="32" cy="21" r="2.600" fill="#ff8fb8" stroke="' + K + '" stroke-width="1.600"/>'
        : '';
      return '<svg viewBox="0 0 64 64" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M32 20C42 15 57 19 60 33C62 45 55 56 44 58C39 59 35 57.500 32 56C29 57.500 25 59 20 58C9 56 2 45 4 33C7 19 22 15 32 20Z" fill="#ffb27a" stroke="' + K + '" stroke-width="' + W + '"/>' +
        '<path d="M24 21C17 28 17 49 24 57.500M40 21C47 28 47 49 40 57.500" fill="none" stroke="#f08f5c" stroke-width="2.200"/>' +
        '<path d="M32 21C30 32 30 46 32 56" fill="none" stroke="#f08f5c" stroke-width="1.600" stroke-opacity=".7"/>' +
        '<path d="M11 31Q13 26 18 24" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2.600"/><circle cx="10" cy="36" r="1.300" fill="#fff" fill-opacity=".8"/>' +
        top + bow + face +
        '<ellipse cx="18" cy="44" rx="4" ry="2.500" fill="#ff8fb0" fill-opacity=".7"/><ellipse cx="46" cy="44" rx="4" ry="2.500" fill="#ff8fb0" fill-opacity=".7"/>' +
        '<path d="M29 43Q30.500 45.500 32 43Q33.500 45.500 35 43" fill="none" stroke="' + K + '" stroke-width="1.800"/></svg>';
    },
    // Fantôme kawaii : blanc nacré, ombre lavande, petits bras, joues roses.
    // Variantes : 'plain' · 'bow' (nœud rose sur la tête) · 'pumpkin' (tient une mini citrouille) · 'wink' (clin d'œil + langue).
    ghost: function (v) {
      var K = '#6b4f6f';
      var eyes = v === 'wink'
        ? '<ellipse cx="25" cy="29" rx="2.600" ry="3.200" fill="' + K + '"/><circle cx="26" cy="27.800" r="1" fill="#fff"/><path d="M36.500 29.500Q39.500 26.500 42.500 29.500" fill="none" stroke="' + K + '" stroke-width="2.200"/>'
        : '<ellipse cx="25" cy="29" rx="2.600" ry="3.200" fill="' + K + '"/><ellipse cx="39" cy="29" rx="2.600" ry="3.200" fill="' + K + '"/><circle cx="26" cy="27.800" r="1" fill="#fff"/><circle cx="40" cy="27.800" r="1" fill="#fff"/>';
      var mouth = v === 'wink'
        ? '<path d="M28.500 35Q32 38.500 35.500 35Z" fill="' + K + '" stroke="' + K + '" stroke-width="1.400"/><path d="M30.500 36.500Q32 39.500 33.500 36.500" fill="#ff8fb0" stroke="none"/>'
        : '<path d="M29.500 35Q31 37 32 35Q33 37 34.500 35" fill="none" stroke="' + K + '" stroke-width="1.800"/>';
      var extra = '';
      if (v === 'bow') extra = '<path d="M40 9L33 4Q30 9 34 13Z M40 9L48 6Q49 12 44 14Z" fill="#ffb3cf" stroke="' + K + '" stroke-width="1.700"/><circle cx="39.500" cy="9.500" r="2.300" fill="#ff8fb8" stroke="' + K + '" stroke-width="1.500"/>';
      var arms = '<path d="M11 36C7 36 5 39 6 41C9 41 11 40 12.500 38" fill="#fbf8ff" stroke="' + K + '" stroke-width="2"/>' +
        '<path d="M53 36C57 36 59 39 58 41C55 41 53 40 51.500 38" fill="#fbf8ff" stroke="' + K + '" stroke-width="2"/>';
      if (v === 'pumpkin') {
        arms = '<path d="M14 39C18 43 22 45 26 45" fill="none" stroke="' + K + '" stroke-width="2"/><path d="M50 39C46 43 42 45 38 45" fill="none" stroke="' + K + '" stroke-width="2"/>' +
          '<path d="M32 41C37 38.500 43 41 43 47C43 52 38 54 32 52.500C26 54 21 52 21 47C21 41 27 38.500 32 41Z" fill="#ffb27a" stroke="' + K + '" stroke-width="1.800"/>' +
          '<path d="M27 42C25 45 25 50 27 53M37 42C39 45 39 50 37 53" fill="none" stroke="#f08f5c" stroke-width="1.400"/>' +
          '<path d="M32 41C32 38.500 33 37.500 34.500 37" fill="none" stroke="#8fcf7a" stroke-width="2"/>' +
          '<circle cx="29" cy="47" r="1" fill="' + K + '"/><circle cx="35" cy="47" r="1" fill="' + K + '"/>';
      }
      return '<svg viewBox="0 0 64 64" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M32 6C45 6 53 16 53 29V49Q53 56 48 55Q45 52 42 55Q38 59 35 55Q32 52 29 55Q26 59 22 55Q19 52 16 55Q11 56 11 49V29C11 16 19 6 32 6Z" fill="#fbf8ff" stroke="' + K + '" stroke-width="2"/>' +
        '<path d="M47 16C50 21 51 27 51 33V48Q51 52 48 52.500" fill="none" stroke="#dcd0f4" stroke-width="3"/>' +
        '<path d="M18 14Q21 10 25 9" fill="none" stroke="#fff" stroke-width="2.600"/>' +
        eyes + mouth +
        '<ellipse cx="19" cy="34" rx="3.800" ry="2.400" fill="#ffa8c5" fill-opacity=".75"/><ellipse cx="45" cy="34" rx="3.800" ry="2.400" fill="#ffa8c5" fill-opacity=".75"/>' +
        arms + extra + '</svg>';
    },
    bat: function () {
      var K = '#2a1a40', wing = function () {
        return '<path d="M52 17C59 7 74 5 96 11C92 14 90 20 91 29C85 24 80 25 76 30C72 25 66 25 62 32C59 27 55 26 52 27Z" fill="#6a45a0" stroke="' + K + '" stroke-width="1.800"/>';
      };
      return '<svg viewBox="0 0 100 40" stroke-linecap="round" stroke-linejoin="round">' + wing() +
        '<g transform="translate(100 0) scale(-1 1)">' + wing() + '</g>' +
        '<path d="M43 15L44 4.500L49 11L51 11L56 4.500L57 15Z" fill="#6a45a0" stroke="' + K + '" stroke-width="1.800"/>' +
        '<ellipse cx="50" cy="19" rx="9" ry="11" fill="#6a45a0" stroke="' + K + '" stroke-width="1.800"/>' +
        '<circle cx="46.500" cy="17" r="2.300" fill="#fff"/><circle cx="53.500" cy="17" r="2.300" fill="#fff"/><circle cx="46.800" cy="17.300" r="1.100" fill="' + K + '"/><circle cx="53.800" cy="17.300" r="1.100" fill="' + K + '"/>' +
        '<path d="M47.500 22Q50 24.500 52.500 22" fill="none" stroke="' + K + '" stroke-width="1.200"/>' +
        '<ellipse cx="43.800" cy="21" rx="2" ry="1.300" fill="#ff8fb0" fill-opacity=".8" stroke="none"/><ellipse cx="56.200" cy="21" rx="2" ry="1.300" fill="#ff8fb0" fill-opacity=".8" stroke="none"/></svg>';
    },
    snow: function () {
      var arm = '<path d="M20 20V3M20 8.500l-4.200-4M20 8.500l4.200-4M20 13.500l-5.500-5M20 13.500l5.500-5"/><path d="M20 3l-1.800-1.800M20 3l1.800-1.800" />';
      var s = '<svg viewBox="0 0 40 40"><g stroke="#fff" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round" fill="none">';
      for (var i = 0; i < 6; i++) s += '<g transform="rotate(' + (i * 60) + ' 20 20)">' + arm + '</g>';
      return s + '</g><circle cx="20" cy="20" r="2.600" fill="#fff"/><circle cx="20" cy="20" r="5" fill="#cfe6ff" fill-opacity=".45"/></svg>';
    },
    star: function (c) {
      if (c === 'orange') { // étoile « kawaii » d'Halloween : jaune à plat, contour épais
        var pts = [], i, r, a;
        for (i = 0; i < 10; i++) { r = i % 2 ? 8.500 : 17; a = -Math.PI / 2 + i * Math.PI / 5; pts.push((20 + Math.cos(a) * r).toFixed(1) + ',' + (20.800 + Math.sin(a) * r).toFixed(1)); }
        return '<svg viewBox="0 0 40 40"><polygon points="' + pts.join(' ') + '" fill="#ffd23f" stroke="#3b2412" stroke-width="2.200" stroke-linejoin="round"/>' +
          '<path d="M14 15.500L17 12" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/></svg>';
      }
      var g = c === 'orange' ? 'url(#fd-starO)' : 'url(#fd-star)';
      return '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="9" fill="' + (c === 'orange' ? '#ffb347' : '#ffe9a8') + '" fill-opacity=".28"/>' +
        '<path d="M20 0C21.500 11 27 18.500 40 20C27 21.500 21.500 29 20 40C18.500 29 13 21.500 0 20C13 18.500 18.500 11 20 0Z" fill="' + g + '"/>' +
        '<g transform="translate(20 20) rotate(45) scale(.5) translate(-20 -20)"><path d="M20 0C21.500 11 27 18.500 40 20C27 21.500 21.500 29 20 40C18.500 29 13 21.500 0 20C13 18.500 18.500 11 20 0Z" fill="#fff" fill-opacity=".8"/></g></svg>';
    },
    // Noël kawaii : pastel, contour doux, petits visages et joues roses.
    bauble: function (c) {
      var K = '#5b3f55', col = { red: '#ffb3c1', green: '#b5e6c8', gold: '#ffe3a1', blue: '#bcd8ff' }[c] || '#ffb3c1';
      var face = '<ellipse cx="15" cy="33" rx="1.900" ry="2.300" fill="' + K + '"/><ellipse cx="25" cy="33" rx="1.900" ry="2.300" fill="' + K + '"/>' +
        '<circle cx="15.700" cy="32.200" r=".7" fill="#fff"/><circle cx="25.700" cy="32.200" r=".7" fill="#fff"/>' +
        '<path d="M18.500 37Q20 38.600 21.500 37" fill="none" stroke="' + K + '" stroke-width="1.400"/>' +
        '<ellipse cx="11.500" cy="37" rx="2.600" ry="1.600" fill="#ff8fb0" fill-opacity=".6"/><ellipse cx="28.500" cy="37" rx="2.600" ry="1.600" fill="#ff8fb0" fill-opacity=".6"/>';
      return '<svg viewBox="0 0 40 52" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20 1.500V8" stroke="' + K + '" stroke-width="1.400"/>' +
        '<path d="M20 5L14 2Q12 5 14 8Z M20 5L26 2Q28 5 26 8Z" fill="#ff9ec4" stroke="' + K + '" stroke-width="1.300"/>' +
        '<rect x="15" y="9" width="10" height="5" rx="1.600" fill="#ffe08a" stroke="' + K + '" stroke-width="1.500"/>' +
        '<circle cx="20" cy="31" r="16.500" fill="' + col + '" stroke="' + K + '" stroke-width="1.800"/>' +
        '<path d="M4.500 25Q20 20 35.500 25" fill="none" stroke="#fff" stroke-width="2.200" stroke-dasharray="1 4"/>' +
        '<path d="M9 22Q11 18.500 15 17" fill="none" stroke="#fff" stroke-width="2.200"/>' + face + '</svg>';
    },
    tree: function () {
      var K = '#3f4a3c', dots = [[14, 30, '#ffb3c1'], [26, 33, '#bcd8ff'], [11, 43, '#ffe08a'], [29, 44, '#ffb3c1'], [20, 22, '#ffe08a']], d = '';
      dots.forEach(function (p) { d += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.900" fill="' + p[2] + '" stroke="' + K + '" stroke-width="1"/>'; });
      return '<svg viewBox="0 0 40 52" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="16" y="45" width="8" height="6" rx="1.500" fill="#d9a77c" stroke="' + K + '" stroke-width="1.500"/>' +
        '<path d="M20 6C26 14 30 18 32 22Q29 23 27 22.500C31 28 34 32 36 36Q33 37 30 36.500C33 40 36 43 37 46Q20 49 3 46C4 43 7 40 10 36.500Q7 37 4 36C6 32 9 28 13 22.500Q11 23 8 22C10 18 14 14 20 6Z" fill="#a8e0b8" stroke="' + K + '" stroke-width="1.800"/>' +
        '<path d="M12 22.500Q20 26 28 22.500M9 36.500Q20 40 31 36.500" fill="none" stroke="#7fc79a" stroke-width="1.500"/>' +
        '<ellipse cx="16.500" cy="30.500" rx="1.700" ry="2.100" fill="' + K + '"/><ellipse cx="23.500" cy="30.500" rx="1.700" ry="2.100" fill="' + K + '"/>' +
        '<circle cx="17.100" cy="29.800" r=".6" fill="#fff"/><circle cx="24.100" cy="29.800" r=".6" fill="#fff"/>' +
        '<path d="M18.700 33.600Q20 35 21.300 33.600" fill="none" stroke="' + K + '" stroke-width="1.200"/>' +
        '<ellipse cx="13.500" cy="33.500" rx="2" ry="1.300" fill="#ff8fb0" fill-opacity=".65"/><ellipse cx="26.500" cy="33.500" rx="2" ry="1.300" fill="#ff8fb0" fill-opacity=".65"/>' +
        d.replace('<circle cx="14" cy="30"', '<circle cx="9" cy="41.500"').replace('<circle cx="26" cy="33"', '<circle cx="31" cy="41"') +
        '<path d="M20 .5l1.800 3.600 4 .5-2.900 2.800.7 4L20 9.500l-3.600 1.900.7-4-2.900-2.800 4-.5z" fill="#ffe08a" stroke="' + K + '" stroke-width="1.300"/></svg>';
    },
    gift: function (c) {
      var K = '#5b3f55', box = { red: '#ffb3c1', green: '#b5e6c8', blue: '#c9c0f5' }[c] || '#ffb3c1', rib = c === 'green' ? '#ff9ec4' : '#fff4c2';
      return '<svg viewBox="0 0 40 40" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="6" y="17" width="28" height="20" rx="3" fill="' + box + '" stroke="' + K + '" stroke-width="1.700"/>' +
        '<rect x="4" y="11.500" width="32" height="7" rx="2.500" fill="' + box + '" stroke="' + K + '" stroke-width="1.700"/>' +
        '<path d="M20 11.500V37" stroke="' + rib + '" stroke-width="4"/><path d="M17.800 11.500V37M22.200 11.500V37" stroke="' + K + '" stroke-width="1" stroke-opacity=".5"/>' +
        '<path d="M20 11.500C15 4 8 5 10 9.500C11.500 12 17 11.500 20 11.500Z M20 11.500C25 4 32 5 30 9.500C28.500 12 23 11.500 20 11.500Z" fill="' + rib + '" stroke="' + K + '" stroke-width="1.500"/>' +
        '<ellipse cx="12.500" cy="26" rx="1.600" ry="2" fill="' + K + '"/><ellipse cx="27.500" cy="26" rx="1.600" ry="2" fill="' + K + '"/>' +
        '<path d="M12.200 30.500Q13.500 31.800 14.800 30.500" fill="none" stroke="' + K + '" stroke-width="1.100"/>' +
        '<ellipse cx="9.500" cy="29.500" rx="1.800" ry="1.100" fill="#ff8fb0" fill-opacity=".65"/><ellipse cx="30.500" cy="29.500" rx="1.800" ry="1.100" fill="#ff8fb0" fill-opacity=".65"/></svg>';
    },
    snowman: function () {
      var K = '#4f5470';
      return '<svg viewBox="0 0 40 52" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="20" cy="37" r="13" fill="#fdfcff" stroke="' + K + '" stroke-width="1.700"/>' +
        '<circle cx="20" cy="18" r="10" fill="#fdfcff" stroke="' + K + '" stroke-width="1.700"/>' +
        '<path d="M10 14Q20 2 30 14Z" fill="#ffb3c1" stroke="' + K + '" stroke-width="1.500"/><circle cx="20" cy="5.500" r="2.600" fill="#fff" stroke="' + K + '" stroke-width="1.300"/>' +
        '<path d="M9 14Q20 17 31 14" fill="none" stroke="' + K + '" stroke-width="1.500"/>' +
        '<ellipse cx="16.500" cy="19" rx="1.600" ry="2" fill="' + K + '"/><ellipse cx="23.500" cy="19" rx="1.600" ry="2" fill="' + K + '"/>' +
        '<path d="M19 22.500L23 23.300L19 24Z" fill="#ffb27a" stroke="#d98a55" stroke-width=".8"/>' +
        '<ellipse cx="13.500" cy="22.500" rx="2" ry="1.300" fill="#ff8fb0" fill-opacity=".65"/><ellipse cx="26.500" cy="22.500" rx="2" ry="1.300" fill="#ff8fb0" fill-opacity=".65"/>' +
        '<path d="M11 27.500Q20 31.500 29 27.500L28 31Q20 34 12 31Z" fill="#b5e6c8" stroke="' + K + '" stroke-width="1.400"/><path d="M25 31L27 38L23 37Z" fill="#b5e6c8" stroke="' + K + '" stroke-width="1.300"/>' +
        '<circle cx="20" cy="37" r="1.300" fill="' + K + '"/><circle cx="20" cy="42" r="1.300" fill="' + K + '"/></svg>';
    },
    ume: function (c) {
      c = c || '#ffd1de';
      var p = '<circle cx="20" cy="10" r="7.800" fill="' + c + '" stroke="#e0809f" stroke-opacity=".5" stroke-width=".8"/><circle cx="20" cy="10" r="7.800" fill="url(#fd-shine)"/>';
      var s = '<svg viewBox="0 0 40 40">', i;
      for (i = 0; i < 5; i++) s += '<g transform="rotate(' + (i * 72) + ' 20 20)">' + p + '</g>';
      s += '<circle cx="20" cy="20" r="4.600" fill="#ffb3c8" fill-opacity=".8"/>';
      for (i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + .3, x = 20 + Math.cos(a) * 5.500, y = 20 + Math.sin(a) * 5.500;
        s += '<path d="M20 20L' + x.toFixed(1) + ' ' + y.toFixed(1) + '" stroke="#e8a83a" stroke-width=".8"/><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.100" fill="#f4b73e"/>';
      }
      return s + '<circle cx="20" cy="20" r="2" fill="#ffe27a"/></svg>';
    },
    firework: function (c) {
      c = c || '#ffd86b';
      var rays = '', tips = '', i, a, r0, r1;
      for (i = 0; i < 18; i++) {
        a = i * Math.PI * 2 / 18; r0 = 14; r1 = (i % 2 ? 30 : 40);
        rays += 'M' + (50 + Math.cos(a) * r0).toFixed(1) + ' ' + (50 + Math.sin(a) * r0).toFixed(1) + 'L' + (50 + Math.cos(a) * r1).toFixed(1) + ' ' + (50 + Math.sin(a) * r1).toFixed(1);
        tips += '<circle cx="' + (50 + Math.cos(a) * (r1 + 5)).toFixed(1) + '" cy="' + (50 + Math.sin(a) * (r1 + 5)).toFixed(1) + '" r="' + (i % 2 ? 1.400 : 2.200) + '" fill="' + c + '"/>';
      }
      return '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="16" fill="' + c + '" fill-opacity=".22"/><circle cx="50" cy="50" r="6" fill="#fff" fill-opacity=".85"/>' +
        '<path d="' + rays + '" stroke="' + c + '" stroke-width="2.600" stroke-linecap="round" fill="none"/>' + tips + '</svg>';
    },
    confetti: function (c) {
      var k = Math.random();
      if (k < .34) return '<svg viewBox="0 0 10 16"><path d="M3 0Q10 4 3 8Q-4 12 3 16" stroke="' + c + '" stroke-width="2.600" stroke-linecap="round" fill="none"/></svg>';
      if (k < .67) return '<svg viewBox="0 0 10 16"><circle cx="5" cy="8" r="4.500" fill="' + c + '"/><circle cx="3.600" cy="6.500" r="1.600" fill="#fff" fill-opacity=".5"/></svg>';
      return '<svg viewBox="0 0 10 16"><rect width="10" height="16" rx="1.500" fill="' + c + '"/><rect width="4.500" height="16" rx="1.500" fill="#fff" fill-opacity=".3"/></svg>';
    }
  };

  var MOON = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="url(#fd-moon)"/>' +
    '<g fill="#c9650f" fill-opacity=".22"><circle cx="34" cy="38" r="9"/><circle cx="62" cy="30" r="5.500"/><circle cx="64" cy="62" r="11"/><circle cx="38" cy="68" r="5"/><circle cx="78" cy="46" r="3.500"/></g>' +
    '<g fill="#fff" fill-opacity=".22"><circle cx="31" cy="35" r="4"/><circle cx="61" cy="58" r="4.500"/></g></svg>';

  // Chaque fête : une liste d'éléments { shape, arg, mode, count, size:[min,max], op, dur:[min,max] }
  //   mode : fall (tombe) · rise (monte) · drift (traverse l'écran) · twinkle (scintille) · burst (feu d'artifice)
  var DECOR = {
    'halloween': [
      { shape: 'ghost', arg: ['plain', 'bow', 'pumpkin', 'wink'], mode: 'rise', n: 5, size: [40, 66], op: .8, dur: [20, 34] },
      { shape: 'pumpkin', arg: ['plain', 'bow', 'hat', 'sleepy'], mode: 'rise', n: 5, size: [40, 66], op: .85, dur: [24, 40] },
      { shape: 'star', arg: 'orange', mode: 'twinkle', n: 6, size: [10, 20], op: .8, dur: [3, 6] }
    ],
    'veille-noel': [
      { shape: 'snow', mode: 'fall', n: 12, size: [14, 34], op: .85, dur: [12, 24] },
      { shape: 'star', arg: '#ffe9a8', mode: 'twinkle', n: 10, size: [10, 24], op: .95, dur: [3, 7] },
      { shape: 'tree', mode: 'rise', n: 3, size: [44, 64], op: .85, dur: [30, 44] },
      { shape: 'snowman', mode: 'rise', n: 2, size: [44, 62], op: .9, dur: [28, 42] }
    ],
    'noel': [
      { shape: 'snow', mode: 'fall', n: 10, size: [14, 32], op: .85, dur: [12, 24] },
      { shape: 'snowman', mode: 'rise', n: 2, size: [44, 62], op: .9, dur: [28, 42] },
      { shape: 'bauble', arg: ['red', 'green', 'gold', 'blue'], mode: 'fall', n: 5, size: [30, 48], op: .85, dur: [18, 32] },
      { shape: 'gift', arg: ['red', 'green', 'blue'], mode: 'rise', n: 4, size: [34, 54], op: .8, dur: [26, 40] },
      { shape: 'star', arg: '#ffd86b', mode: 'twinkle', n: 6, size: [10, 20], op: .9, dur: [3, 6] }
    ],
    'sylvestre': [
      { shape: 'firework', arg: ['#ffd86b', '#ff8fb8', '#8fe3ff', '#ffffff'], mode: 'burst', n: 6, size: [110, 210], op: .9, dur: [4, 7] },
      { shape: 'confetti', arg: ['#ffd86b', '#ff8fb8', '#8fe3ff', '#ffffff', '#b9a2ff'], mode: 'fall', n: 14, size: [7, 12], op: .9, dur: [9, 18] },
      { shape: 'star', arg: '#ffe9a8', mode: 'twinkle', n: 10, size: [10, 22], op: .95, dur: [2.500, 5] }
    ],
    'nouvel-an': [
      { shape: 'ume', arg: ['#ffd1de', '#ffffff', '#ffb3c8'], mode: 'fall', n: 11, size: [16, 30], op: .85, dur: [14, 26] },
      { shape: 'star', arg: '#ffe9a8', mode: 'twinkle', n: 9, size: [10, 22], op: .95, dur: [3, 6] },
      { shape: 'firework', arg: ['#ffd86b', '#ffffff'], mode: 'burst', n: 2, size: [100, 160], op: .7, dur: [6, 9] }
    ]
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(v) { return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v; }

  function reducedMotion() {
    try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  var decorNode = null;
  var decorFor = null;

  function buildDecor(id) {
    removeDecor();
    var spec = DECOR[id];
    if (!spec || !document.body) return;
    var small = false, reduce = reducedMotion();
    try { small = global.matchMedia('(max-width: 640px)').matches; } catch (e) {}
    var k = reduce ? .4 : (small ? .6 : 1);

    var box = document.createElement('div');
    box.className = 'fete-decor';
    box.setAttribute('aria-hidden', 'true');
    box.setAttribute('data-fete-decor', id);

    box.insertAdjacentHTML('afterbegin', DEFS);
    // Éléments de scène fixes (lune d'Halloween, soleil du 1er janvier…)
    if (id === 'halloween') box.insertAdjacentHTML('beforeend', '<div class="fete-moon">' + MOON + '</div>');
    if (id === 'nouvel-an') box.insertAdjacentHTML('beforeend', '<div class="fete-sun"></div>');
    if (id === 'veille-noel' || id === 'sylvestre') box.insertAdjacentHTML('beforeend', '<div class="fete-glow"></div>');

    spec.forEach(function (g) {
      var count = Math.max(1, Math.round(g.n * k));
      for (var i = 0; i < count; i++) {
        var el = document.createElement('span');
        var size = rnd(g.size[0], g.size[1]);
        var dur = rnd(g.dur[0], g.dur[1]);
        el.className = 'fete-item fete-' + g.mode + ' fs-' + g.shape;
        el.innerHTML = SHAPES[g.shape](pick(g.arg));
        var st = el.style;
        st.setProperty('--s', size.toFixed(0) + 'px');
        st.setProperty('--x', rnd(0, 96).toFixed(1) + 'vw');
        st.setProperty('--y', rnd(6, 86).toFixed(1) + 'vh');
        st.setProperty('--dx', rnd(-9, 9).toFixed(1) + 'vw');
        st.setProperty('--rot', rnd(-200, 200).toFixed(0) + 'deg');
        st.setProperty('--op', String(g.op));
        st.setProperty('--dur', dur.toFixed(1) + 's');
        // Délai négatif : l'animation est déjà « en cours » à l'ouverture de la page.
        st.setProperty('--delay', (-rnd(0, dur)).toFixed(1) + 's');
        if (g.mode === 'drift') st.setProperty('--flip', Math.random() < .5 ? '1' : '-1');
        box.appendChild(el);
      }
    });

    document.body.appendChild(box);
    decorNode = box;
    decorFor = id;
  }

  function removeDecor() {
    if (decorNode && decorNode.parentNode) decorNode.parentNode.removeChild(decorNode);
    decorNode = null; decorFor = null;
  }

  /* ---------------- Application ---------------- */

  var lastId = undefined;
  function apply() {
    var f = resolve();
    var id = f ? f.id : null;
    var root = document.documentElement;
    if (id !== lastId) {
      lastId = id;
      try {
        if (id) root.setAttribute('data-fete', id); else root.removeAttribute('data-fete');
      } catch (e) {}
      if (document.body) { if (id) buildDecor(id); else removeDecor(); }
    }
    if (f) {
      try {
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', f.theme);
      } catch (e) {}
    }
    return view(f);
  }

  global.BenkyoFete = { current: current, fetes: FETES, apply: apply };
  apply();

  document.addEventListener('DOMContentLoaded', function () {
    var f = resolve();
    if (f && decorFor !== f.id) buildDecor(f.id);
    apply();
  });

  // La page reste ouverte à minuit : le thème de fête arrive (ou part) sans recharger.
  if (preview() === undefined) {
    setInterval(apply, 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) apply(); });
  }
})(window);
