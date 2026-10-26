/* ============================================================
   rituels.js — Les petits rituels de la page d'accueil
   -------------------------------------------------------------
   Chargé par index.html (après app.js et sakura.js). Il gère :
     - le gâteau de la chance : un message japonais (avec lecture
       et traduction française) à ouvrir une fois par jour
     - le daruma : on écrit un objectif, on colorie le premier œil,
       puis le deuxième quand l'objectif est atteint
     - le bandeau de saison / période (Hanami, Tsukimi, Momijigari…)
       et le texte du titre qui change avec la saison

   Les données sont enregistrées dans localStorage (clés
   benkyo_fortune et benkyo_daruma, incluses dans la sauvegarde
   .json). Comme tampons.js, ce fichier est seul maître de ces clés :
   app.js ne les réécrit jamais depuis la copie en mémoire d'une page.
   ============================================================ */
(function (global) {
  'use strict';

  var K_FORTUNE = 'benkyo_fortune';
  var K_DARUMA = 'benkyo_daruma';

  // ------------------------------------------------------------
  // Les messages du gâteau : [japonais, lecture, français, proverbe ?]
  // 1 = proverbe ou expression traditionnelle, 0 = petit mot d'encouragement
  // ------------------------------------------------------------
  var FORTUNES = [
    ['七転び八起き', 'Nanakorobi yaoki', 'Tombe sept fois, relève-toi huit.', 1],
    ['継続は力なり', 'Keizoku wa chikara nari', 'La persévérance est une force.', 1],
    ['千里の道も一歩から', 'Senri no michi mo ippo kara', 'Un voyage de mille lieues commence par un seul pas.', 1],
    ['塵も積もれば山となる', 'Chiri mo tsumoreba yama to naru', 'À force de s\'accumuler, même la poussière devient montagne.', 1],
    ['急がば回れ', 'Isogaba maware', 'Si tu es pressé, prends le chemin le plus sûr.', 1],
    ['失敗は成功のもと', 'Shippai wa seikō no moto', 'L\'échec est à la source du succès.', 1],
    ['為せば成る', 'Naseba naru', 'Quand on s\'y met, on y arrive.', 1],
    ['初心忘るべからず', 'Shoshin wasuru bekarazu', 'N\'oublie jamais ton envie du début.', 1],
    ['石の上にも三年', 'Ishi no ue ni mo sannen', 'Même sur une pierre froide, trois ans de patience finissent par la réchauffer.', 1],
    ['好きこそ物の上手なれ', 'Suki koso mono no jōzu nare', 'On devient bon dans ce qu\'on aime.', 1],
    ['習うより慣れろ', 'Narau yori narero', 'La pratique vaut mieux que la théorie.', 1],
    ['猿も木から落ちる', 'Saru mo ki kara ochiru', 'Même le singe tombe de son arbre : tout le monde se trompe.', 1],
    ['案ずるより産むが易し', 'Anzuru yori umu ga yasushi', 'C\'est souvent plus facile de s\'y mettre que de s\'en inquiéter.', 1],
    ['果報は寝て待て', 'Kahō wa nete mate', 'Le bonheur vient à celui qui sait attendre.', 1],
    ['百聞は一見に如かず', 'Hyakubun wa ikken ni shikazu', 'Voir une fois vaut mieux qu\'entendre cent fois.', 1],
    ['温故知新', 'Onko chishin', 'En revisitant l\'ancien, on découvre le neuf.', 1],
    ['雨降って地固まる', 'Ame futte ji katamaru', 'Après la pluie, la terre se raffermit.', 1],
    ['笑う門には福来る', 'Warau kado ni wa fuku kitaru', 'Le bonheur entre chez ceux qui rient.', 1],
    ['花より団子', 'Hana yori dango', 'Les dango avant les fleurs : le concret avant le décor.', 1],
    ['二兎を追う者は一兎をも得ず', 'Nito o ou mono wa itto o mo ezu', 'Qui court après deux lièvres n\'en attrape aucun.', 1],
    ['思い立ったが吉日', 'Omoitatta ga kichijitsu', 'Le meilleur jour pour commencer, c\'est celui où l\'idée te vient.', 1],
    ['負けるが勝ち', 'Makeru ga kachi', 'Parfois, perdre, c\'est gagner.', 1],
    ['良薬は口に苦し', 'Ryōyaku wa kuchi ni nigashi', 'Les bons remèdes sont amers : les conseils qui piquent sont utiles.', 1],
    ['光陰矢の如し', 'Kōin ya no gotoshi', 'Le temps file comme une flèche.', 1],
    ['学問に王道なし', 'Gakumon ni ōdō nashi', 'Il n\'y a pas de voie royale pour apprendre.', 1],
    ['三人寄れば文殊の知恵', 'Sannin yoreba Monju no chie', 'À plusieurs, on devient plus sage que seul.', 1],
    ['一石二鳥', 'Isseki nichō', 'Une pierre, deux oiseaux.', 1],
    ['楽あれば苦あり、苦あれば楽あり', 'Raku areba ku ari, ku areba raku ari', 'Après le plaisir vient la peine, après la peine vient le plaisir.', 1],
    ['十人十色', 'Jūnin toiro', 'Dix personnes, dix couleurs : chacun son rythme.', 1],
    ['早起きは三文の徳', 'Hayaoki wa sanmon no toku', 'Se lever tôt est toujours un petit gain.', 1],
    ['大器晩成', 'Taiki bansei', 'Les grands talents mûrissent lentement.', 1],
    ['勝って兜の緒を締めよ', 'Katte kabuto no o o shimeyo', 'Même après une victoire, resserre les lacets de ton casque.', 1],
    ['明日は明日の風が吹く', 'Ashita wa ashita no kaze ga fuku', 'Demain, un autre vent soufflera.', 1],
    ['実るほど頭を垂れる稲穂かな', 'Minoru hodo kōbe o tareru inaho kana', 'Plus l\'épi est mûr, plus il s\'incline : plus on sait, plus on reste humble.', 1],
    ['弘法にも筆の誤り', 'Kōbō ni mo fude no ayamari', 'Même un maître calligraphe se trompe de trait.', 1],
    ['努力は裏切らない', 'Doryoku wa uragiranai', 'L\'effort ne trahit jamais.', 0],
    ['焦らず、慌てず、諦めず', 'Aserazu, awatezu, akiramezu', 'Sans te presser, sans paniquer, sans abandonner.', 0],
    ['自分を信じて', 'Jibun o shinjite', 'Crois en toi.', 0],
    ['今を大切に', 'Ima o taisetsu ni', 'Chéris l\'instant présent.', 0],
    ['小さな努力、大きな成果', 'Chiisana doryoku, ōkina seika', 'Petits efforts, grands résultats.', 0],
    ['休むことも勉強のうち', 'Yasumu koto mo benkyō no uchi', 'Se reposer fait aussi partie d\'apprendre.', 0],
    ['目標は高く、一歩は小さく', 'Mokuhyō wa takaku, ippo wa chiisaku', 'Vise haut, avance à petits pas.', 0],
    ['今日の一歩が明日の力', 'Kyō no ippo ga ashita no chikara', 'Le pas d\'aujourd\'hui est la force de demain.', 0],
    ['疑問は学びの入口', 'Gimon wa manabi no iriguchi', 'Une question est la porte d\'entrée de l\'apprentissage.', 0],
    ['間違いは学びのチャンス', 'Machigai wa manabi no chansu', 'Une erreur est une chance d\'apprendre.', 0],
    ['一日一歩', 'Ichinichi ippo', 'Un jour, un pas.', 0],
    ['心を込めて', 'Kokoro o komete', 'Fais-le de tout ton cœur.', 0],
    ['深呼吸', 'Shinkokyū', 'Respire profondément.', 0],
    ['好奇心は最高の先生', 'Kōkishin wa saikō no sensei', 'La curiosité est le meilleur des professeurs.', 0],
    ['完璧より完了', 'Kanpeki yori kanryō', 'Mieux vaut fini que parfait.', 0],
    ['今日も一日がんばろう', 'Kyō mo ichinichi ganbarō', 'Courage pour cette journée !', 0],
    ['君ならできる', 'Kimi nara dekiru', 'Toi, tu peux y arriver.', 0],
    ['焦りは禁物', 'Aseri wa kinmotsu', 'Surtout, ne te précipite pas.', 0],
    ['続けることが一番の近道', 'Tsuzukeru koto ga ichiban no chikamichi', 'Continuer, c\'est le plus court chemin.', 0],
    ['一つずつ、少しずつ', 'Hitotsu zutsu, sukoshi zutsu', 'Une chose à la fois, petit à petit.', 0],
    ['夢への扉は、今日開く', 'Yume e no tobira wa, kyō hiraku', 'La porte vers ton rêve s\'ouvre aujourd\'hui.', 0],
    ['努力の花はきっと咲く', 'Doryoku no hana wa kitto saku', 'La fleur de l\'effort finira par éclore.', 0],
    ['桜も一日では咲かない', 'Sakura mo ichinichi de wa sakanai', 'Même les cerisiers ne fleurissent pas en un jour.', 0],
    ['静かな心が、よく学ぶ', 'Shizuka na kokoro ga, yoku manabu', 'Un esprit calme apprend mieux.', 0],
    ['休んだら、また歩き出そう', 'Yasundara, mata arukidasō', 'Quand tu auras repris des forces, repars.', 0]
  ];

  // ------------------------------------------------------------
  // Dessins (SVG intégré : aucune image à charger)
  // ------------------------------------------------------------
  var COOKIE_SVG =
    '<svg viewBox="0 0 220 150" role="img" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="ckGrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f6cd7a"/><stop offset="1" stop-color="#d9993c"/></linearGradient></defs>' +
    '<ellipse cx="110" cy="132" rx="78" ry="9" fill="rgba(60,30,10,.16)"/>' +
    '<g class="ck-paper"><rect x="62" y="64" width="96" height="26" rx="3" fill="#fffaf0" stroke="#dccfb4" stroke-width="1.5"/>' +
    '<rect x="62" y="64" width="96" height="5" rx="2" fill="#c1272d"/></g>' +
    '<g class="ck-half ck-left"><path d="M110 40 C70 25 20 50 30 90 C40 125 80 130 110 112 Z" fill="url(#ckGrad)" stroke="#b9792a" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M44 82 C58 58 84 50 104 54" fill="none" stroke="#fbe3a6" stroke-width="3" stroke-linecap="round" opacity=".75"/></g>' +
    '<g class="ck-half ck-right"><path d="M110 40 C150 25 200 50 190 90 C180 125 140 130 110 112 Z" fill="url(#ckGrad)" stroke="#b9792a" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M176 82 C162 58 136 50 116 54" fill="none" stroke="#fbe3a6" stroke-width="3" stroke-linecap="round" opacity=".75"/></g>' +
    '</svg>';

  var DARUMA_SVG =
    '<svg viewBox="0 0 200 230" role="img" aria-label="Daruma" focusable="false">' +
    '<defs><radialGradient id="dBody" cx="38%" cy="28%" r="85%">' +
    '<stop offset="0" stop-color="#ee4a42"/><stop offset=".65" stop-color="#cf2b2e"/><stop offset="1" stop-color="#9e1a20"/></radialGradient></defs>' +
    '<path d="M100 14 C150 14 186 60 186 124 C186 184 150 218 100 218 C50 218 14 184 14 124 C14 60 50 14 100 14 Z" fill="url(#dBody)" stroke="#7d1519" stroke-width="3"/>' +
    '<path d="M100 42 C142 42 164 70 164 104 C164 134 140 152 100 152 C60 152 36 134 36 104 C36 70 58 42 100 42 Z" fill="#fff4e6" stroke="#7d1519" stroke-width="2"/>' +
    '<path d="M50 80 C60 62 82 60 93 71" fill="none" stroke="#1d1210" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M150 80 C140 62 118 60 107 71" fill="none" stroke="#1d1210" stroke-width="5" stroke-linecap="round"/>' +
    '<g class="d-eye" data-eye="1"><ellipse cx="72" cy="98" rx="16" ry="13" fill="#fff" stroke="#1d1210" stroke-width="2.5"/>' +
    '<circle class="d-pupil" cx="72" cy="98" r="8.5" fill="#1d1210"/></g>' +
    '<g class="d-eye" data-eye="2"><ellipse cx="128" cy="98" rx="16" ry="13" fill="#fff" stroke="#1d1210" stroke-width="2.5"/>' +
    '<circle class="d-pupil" cx="128" cy="98" r="8.5" fill="#1d1210"/></g>' +
    '<path d="M100 119 C88 109 70 113 58 127 C72 125 88 127 100 125 Z" fill="#1d1210"/>' +
    '<path d="M100 119 C112 109 130 113 142 127 C128 125 112 127 100 125 Z" fill="#1d1210"/>' +
    '<path d="M44 112 C44 130 56 142 70 147" fill="none" stroke="#1d1210" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M156 112 C156 130 144 142 130 147" fill="none" stroke="#1d1210" stroke-width="2.5" stroke-linecap="round"/>' +
    '<text id="d-kanji" x="100" y="196" text-anchor="middle" dominant-baseline="middle" font-family="\'Noto Serif JP\',\'Hiragino Mincho ProN\',\'Yu Mincho\',serif" font-size="38" font-weight="700" fill="#f6d36b">福</text>' +
    '</svg>';

  // ------------------------------------------------------------
  // Utilitaires
  // ------------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function niceDate(k) {
    var d = parseKey(k);
    if (!d) return '';
    var opts = { day: 'numeric', month: 'long' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('fr-FR', opts);
  }
  function shortDate(k) {
    var d = parseKey(k);
    return d ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) : '';
  }
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      var v = JSON.parse(raw);
      return (v && typeof v === 'object') ? v : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* stockage plein : on ignore */ }
  }
  function reduced() {
    try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function petals(opts) { if (typeof global.confetti === 'function') global.confetti(opts); }

  // Un message par jour, qui change chaque jour et ne se répète pas
  // avant d'avoir parcouru toute la liste (7 est premier avec 60).
  function todayIndex(d) {
    var days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return ((days * 7) % FORTUNES.length + FORTUNES.length) % FORTUNES.length;
  }

  // ------------------------------------------------------------
  // Saison : bandeau + titre + couleur de la barre du navigateur
  // ------------------------------------------------------------
  function initSeason() {
    var S = global.BenkyoSeason && global.BenkyoSeason.current();
    if (!S) return;
    var h1 = $('hero-title');
    if (h1) h1.innerHTML = 'Chaque jour,<br>' + esc(S.noun) + ' de plus.';
    var box = $('season');
    if (box) {
      var p = S.period;
      box.querySelector('.s-kanji').textContent = S.kanji;
      box.querySelector('.s-kanji').setAttribute('title', S.fr + ' (' + S.romaji + ')');
      if (p) {
        $('s-title').textContent = p.fr;
        $('s-sub').innerHTML = '<span lang="ja">' + esc(p.kanji) + '</span> (' + esc(p.romaji) + '). ' + esc(p.desc);
      } else {
        $('s-title').textContent = S.fr;
        $('s-sub').innerHTML = '<span lang="ja">' + esc(S.kanji) + '</span> (' + esc(S.romaji) + ')';
      }
      box.hidden = false;
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', S.theme);
  }

  // ------------------------------------------------------------
  // Gâteau de la chance
  // ------------------------------------------------------------
  function initFortune() {
    var box = $('fortune-box');
    if (!box) return;
    var hint = $('ritual-hint');
    var key, data;

    function load() {
      key = dayKey(new Date());
      data = readJSON(K_FORTUNE, { opened: {} });
      if (!data.opened || typeof data.opened !== 'object') data.opened = {};
    }
    function slipHTML(idx, animate) {
      var f = FORTUNES[idx];
      if (!f) return '';
      return '<div class="fortune' + (animate ? ' enter' : '') + '">' +
        '<div class="jp" lang="ja">' + esc(f[0]) + '</div>' +
        '<div class="ro">' + esc(f[1]) + '</div>' +
        '<div class="fr">' + esc(f[2]) + '</div>' +
        '<div class="kind">' + (f[3] ? 'Proverbe japonais' : 'Petit mot du gâteau') + '</div></div>';
    }
    function footHTML() {
      var keys = Object.keys(data.opened).sort().reverse();
      if (!keys.length) return '';
      var items = keys.slice(0, 7).map(function (k) {
        var f = FORTUNES[data.opened[k]];
        if (!f) return '';
        return '<li><span class="when">' + esc(shortDate(k)) + '</span><span class="txt"><span lang="ja">' + esc(f[0]) + '</span> ' + esc(f[2]) + '</span></li>';
      }).join('');
      return '<details class="recueil"><summary>' + keys.length + (keys.length > 1 ? ' gâteaux ouverts' : ' gâteau ouvert') +
        ', relire mes derniers messages</summary><ul>' + items + '</ul></details>';
    }
    function render() {
      load();
      var opened = data.opened[key] !== undefined;
      box.innerHTML =
        '<button type="button" class="cookie-stage' + (opened ? ' open' : '') + '" id="ck-btn"' + (opened ? ' disabled' : '') +
        ' aria-label="' + (opened ? 'Gâteau du jour ouvert' : 'Ouvrir le gâteau de la chance du jour') + '">' + COOKIE_SVG + '</button>' +
        '<div id="ck-slip" aria-live="polite">' + (opened ? slipHTML(data.opened[key], false) :
          '<p class="r-hint">Touche le gâteau pour le casser et lire le message du jour.</p>') + '</div>' +
        '<div class="r-foot" id="ck-foot">' + footHTML() + '</div>';
      if (hint) hint.hidden = opened;
      if (!opened) $('ck-btn').addEventListener('click', open);
    }
    function open() {
      load();
      if (data.opened[key] !== undefined) { render(); return; }
      var idx = todayIndex(new Date());
      data.opened[key] = idx;
      writeJSON(K_FORTUNE, data);
      var btn = $('ck-btn');
      btn.disabled = true;
      btn.classList.add('shake');
      setTimeout(function () {
        btn.classList.remove('shake');
        btn.classList.add('open');
        btn.setAttribute('aria-label', 'Gâteau du jour ouvert');
        $('ck-slip').innerHTML = slipHTML(idx, true);
        $('ck-foot').innerHTML = footHTML();
        if (hint) hint.hidden = true;
        petals({ particleCount: 36, spread: 70, origin: { x: 0.5, y: 0.4 } });
      }, reduced() ? 0 : 520);
    }

    render();
    // Si l'onglet reste ouvert après minuit, le gâteau du nouveau jour apparaît.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && key !== dayKey(new Date())) render();
    });
  }

  // ------------------------------------------------------------
  // Daruma
  // L'objectif en cours peut être modifié ou supprimé à tout moment ;
  // les objectifs déjà atteints (liste « objectifs atteints ») aussi.
  // ------------------------------------------------------------
  var ICON_EDIT = '<svg class="icon" aria-hidden="true"><use href="#i-pencil"/></svg>';
  var ICON_DEL = '<svg class="icon" aria-hidden="true"><use href="#i-x"/></svg>';
  var ICON_OK = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>';

  function initDaruma(opts) {
    var box = $('daruma-box');
    if (!box) return;
    var toast = (opts && opts.toast) || function () {};
    var data, dropTimer = null;
    // Ce qui est en cours de modification : null, 'current' ou { done: index }
    var editing = null;

    function load() {
      data = readJSON(K_DARUMA, { current: null, done: [] });
      if (!Array.isArray(data.done)) data.done = [];
      if (!data.current || typeof data.current.goal !== 'string') data.current = null;
    }
    function save() { writeJSON(K_DARUMA, data); }
    function status() { return !data.current ? 'none' : (data.current.doneAt ? 'done' : 'set'); }

    // Formulaire de modification (objectif en cours)
    function editFormHTML() {
      return '<form class="d-form" id="d-edit-form" autocomplete="off">' +
        '<label class="d-label" for="d-edit-input">Modifier mon objectif</label>' +
        '<input id="d-edit-input" type="text" maxlength="120" value="' + esc(data.current.goal) + '" required>' +
        '<div class="d-actions d-actions-row"><button class="btn primary" type="submit">Enregistrer</button>' +
        '<button class="btn ghost" type="button" id="d-edit-cancel">Annuler</button></div></form>';
    }
    function manageHTML(delLabel) {
      return '<div class="d-manage"><button class="d-link" type="button" id="d-edit">' + ICON_EDIT + 'Modifier</button>' +
        '<button class="d-link d-link-del" type="button" id="d-drop">' + ICON_DEL + delLabel + '</button></div>';
    }

    function sideHTML() {
      var st = status(), c = data.current;
      if (st === 'none') {
        return '<form class="d-form" id="d-form" autocomplete="off">' +
          '<label class="d-label" for="d-input">Mon objectif</label>' +
          '<input id="d-input" type="text" maxlength="120" placeholder="Ex. : 14 de moyenne en maths avant Noël" required>' +
          '<div class="d-actions"><button class="btn primary" type="submit">Colorier le premier œil</button></div></form>' +
          '<p class="d-note">Écris ton objectif, colorie le premier œil, et garde-le en tête jusqu\'au deuxième.</p>';
      }
      if (editing === 'current') return editFormHTML();
      if (st === 'set') {
        return '<p class="d-label">Mon objectif</p>' +
          '<div class="d-goal">' + esc(c.goal) + '<div class="d-meta">Commencé le ' + esc(niceDate(c.startedAt)) + '</div></div>' +
          '<div class="d-actions"><button class="btn primary" type="button" id="d-done">Objectif atteint : colorier le 2<sup>e</sup> œil</button></div>' +
          manageHTML('Supprimer');
      }
      return '<p class="d-label">Objectif atteint</p>' +
        '<div class="d-goal done">' + esc(c.goal) + '<div class="d-meta">Commencé le ' + esc(niceDate(c.startedAt)) +
        ', atteint le ' + esc(niceDate(c.doneAt)) + '</div></div>' +
        '<div class="d-actions"><button class="btn primary" type="button" id="d-new">Nouveau daruma</button></div>' +
        manageHTML('Supprimer');
    }
    function footHTML(wasOpen) {
      if (!data.done.length) return '';
      var items = [];
      for (var i = data.done.length - 1; i >= 0 && items.length < 10; i--) {
        var g = data.done[i];
        if (editing && typeof editing === 'object' && editing.done === i) {
          items.push('<li class="rec-edit"><input class="rec-input" type="text" maxlength="120" value="' + esc(g.goal) + '" data-rec="' + i + '" aria-label="Modifier l\'objectif">' +
            '<span class="rec-acts"><button type="button" class="act ok" data-rec-save="' + i + '" aria-label="Enregistrer">' + ICON_OK + '</button>' +
            '<button type="button" class="act" data-rec-cancel="1" aria-label="Annuler">' + ICON_DEL + '</button></span></li>');
        } else {
          items.push('<li><span class="when">' + esc(shortDate(g.doneAt)) + '</span><span class="txt">' + esc(g.goal) + '</span>' +
            '<span class="rec-acts"><button type="button" class="act" data-rec-edit="' + i + '" aria-label="Modifier">' + ICON_EDIT + '</button>' +
            '<button type="button" class="act" data-rec-del="' + i + '" aria-label="Supprimer">' + ICON_DEL + '</button></span></li>');
        }
      }
      var open = wasOpen || (editing && typeof editing === 'object');
      return '<details class="recueil"' + (open ? ' open' : '') + '><summary>' + data.done.length + (data.done.length > 1 ? ' objectifs atteints' : ' objectif atteint') +
        '</summary><ul>' + items.join('') + '</ul></details>';
    }
    function ariaLabel() {
      var st = status();
      return st === 'none' ? 'Daruma, aucun œil colorié' : (st === 'set' ? 'Daruma, premier œil colorié' : 'Daruma, les deux yeux coloriés');
    }

    // Met à jour les yeux, le kanji du ventre et le panneau de droite.
    function apply() {
      var st = status(), fig = $('d-fig');
      var eyes = fig.querySelectorAll('.d-eye');
      var det = $('d-foot').querySelector('details');
      var wasOpen = !!(det && det.open);
      eyes[0].classList.toggle('on', st !== 'none');
      eyes[1].classList.toggle('on', st === 'done');
      eyes[0].classList.toggle('can', st === 'none');
      eyes[1].classList.toggle('can', st === 'set');
      $('d-kanji').textContent = st === 'none' ? '福' : (st === 'set' ? '願' : '叶');
      fig.querySelector('svg').setAttribute('aria-label', ariaLabel());
      $('d-side').innerHTML = sideHTML();
      $('d-foot').innerHTML = footHTML(wasOpen);
      bind();
      var inp = $('d-edit-input') || document.querySelector('.rec-input');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
    function rock() {
      var fig = $('d-fig');
      fig.classList.remove('rock');
      void fig.offsetWidth;   // relance l'animation
      fig.classList.add('rock');
    }

    function setGoal(text) {
      text = String(text || '').trim();
      if (!text) return;
      load();
      if (status() !== 'none') { apply(); return; }
      data.current = { goal: text.slice(0, 120), startedAt: dayKey(new Date()), doneAt: null };
      save();
      apply(); rock();
      toast('Premier œil colorié. Bon courage !');
    }
    function finish() {
      load();
      if (status() !== 'set') { apply(); return; }
      editing = null;
      data.current.doneAt = dayKey(new Date());
      data.done.push({ goal: data.current.goal, startedAt: data.current.startedAt, doneAt: data.current.doneAt });
      save();
      apply(); rock();
      petals({ particleCount: 90, spread: 100, origin: { x: 0.35, y: 0.5 } });
      toast('Objectif atteint, bravo !');
    }

    // Retrouve l'entrée de la liste « atteints » qui correspond à l'objectif en cours (déjà atteint).
    function doneIndexOfCurrent() {
      var c = data.current;
      if (!c || !c.doneAt) return -1;
      for (var i = data.done.length - 1; i >= 0; i--) {
        var g = data.done[i];
        if (g.goal === c.goal && g.doneAt === c.doneAt && g.startedAt === c.startedAt) return i;
      }
      return -1;
    }
    function saveEdit(text) {
      text = String(text || '').trim().slice(0, 120);
      load();
      editing = null;
      if (text && data.current) {
        var i = doneIndexOfCurrent();
        if (i > -1) data.done[i].goal = text;
        data.current.goal = text;
        save();
        toast('Objectif modifié.');
      }
      apply();
    }
    function drop() {
      var b = $('d-drop');
      if (!b) return;
      if (!b.dataset.armed) {
        b.dataset.armed = '1';
        b.innerHTML = ICON_DEL + 'Confirmer la suppression';
        clearTimeout(dropTimer);
        dropTimer = setTimeout(function () { if ($('d-drop')) { b.dataset.armed = ''; b.innerHTML = ICON_DEL + 'Supprimer'; } }, 4000);
        return;
      }
      load();
      var i = doneIndexOfCurrent();
      if (i > -1) data.done.splice(i, 1);
      data.current = null;
      editing = null;
      save();
      apply();
      toast('Objectif supprimé.');
    }
    function fresh() {
      load();
      data.current = null;
      editing = null;
      save();
      apply();
    }
    function recSave(i) {
      var inp = document.querySelector('.rec-input');
      var t = inp ? inp.value.trim().slice(0, 120) : '';
      load();
      editing = null;
      if (t && data.done[i]) {
        // si c'est aussi l'objectif affiché (atteint), on garde les deux synchronisés
        if (i === doneIndexOfCurrent()) data.current.goal = t;
        data.done[i].goal = t;
        save();
      }
      apply();
    }
    function recDel(i) {
      load();
      if (!data.done[i]) { apply(); return; }
      if (i === doneIndexOfCurrent()) { data.current = null; }
      data.done.splice(i, 1);
      editing = null;
      save();
      apply();
    }

    function bind() {
      var f = $('d-form');
      if (f) f.addEventListener('submit', function (e) { e.preventDefault(); setGoal($('d-input').value); });
      var ef = $('d-edit-form');
      if (ef) ef.addEventListener('submit', function (e) { e.preventDefault(); saveEdit($('d-edit-input').value); });
      if ($('d-edit-cancel')) $('d-edit-cancel').addEventListener('click', function () { editing = null; apply(); });
      if ($('d-edit')) $('d-edit').addEventListener('click', function () { editing = 'current'; apply(); });
      if ($('d-done')) $('d-done').addEventListener('click', finish);
      if ($('d-drop')) $('d-drop').addEventListener('click', drop);
      if ($('d-new')) $('d-new').addEventListener('click', fresh);
    }

    load();
    box.innerHTML = '<div class="daruma-wrap"><div class="daruma still" id="d-fig">' + DARUMA_SVG + '</div>' +
      '<div class="d-side" id="d-side"></div></div><div class="r-foot" id="d-foot"></div>';
    apply();
    setTimeout(function () { $('d-fig').classList.remove('still'); }, 80);

    // Liste des objectifs atteints : modifier / supprimer (délégation, la liste est re-générée)
    $('d-foot').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      if (b.hasAttribute('data-rec-edit')) { editing = { done: +b.getAttribute('data-rec-edit') }; apply(); }
      else if (b.hasAttribute('data-rec-del')) recDel(+b.getAttribute('data-rec-del'));
      else if (b.hasAttribute('data-rec-save')) recSave(+b.getAttribute('data-rec-save'));
      else if (b.hasAttribute('data-rec-cancel')) { editing = null; apply(); }
    });
    $('d-foot').addEventListener('keydown', function (e) {
      var inp = e.target.closest ? e.target.closest('.rec-input') : null;
      if (!inp) return;
      if (e.key === 'Enter') { e.preventDefault(); recSave(+inp.getAttribute('data-rec')); }
      else if (e.key === 'Escape') { editing = null; apply(); }
    });

    // On peut aussi toucher l'œil directement.
    $('d-fig').addEventListener('click', function (e) {
      var eye = e.target.closest ? e.target.closest('.d-eye') : null;
      if (!eye) return;
      var st = status();
      if (eye.dataset.eye === '1' && st === 'none') {
        var inp = $('d-input');
        if (inp && inp.value.trim()) setGoal(inp.value); else if (inp) inp.focus();
      } else if (eye.dataset.eye === '2' && st === 'set') {
        finish();
      }
    });
  }

  global.BenkyoRituels = {
    init: function (opts) {
      initSeason();
      initFortune();
      initDaruma(opts);
    },
    fortunes: FORTUNES
  };
})(window);
