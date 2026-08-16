/* =====================================================================
   Décor pixel art — sème des petits pains, gâteaux, plantes, bocaux et
   fleurs pixel dans tous les onglets du site (purement décoratif).

   Correctif "guirlande invisible en ligne" :
   les images étaient chargées avec un chemin relatif ("pixel/food/...").
   Selon l'hébergeur, l'adresse d'une page publiée peut être /todo,
   /todo/ ou /dossier/todo.html — le chemin relatif ne pointait alors
   plus vers le bon dossier et les images restaient vides.
   On calcule désormais l'adresse à partir de celle de ce script
   (pixel-deco.js), et on essaie plusieurs emplacements de secours si la
   première tentative échoue.
   ===================================================================== */
(function () {
  /* ---- Résolution robuste du dossier des images ---------------------- */
  var SELF =
    (document.currentScript && document.currentScript.src) ||
    (function () {
      var s = document.querySelector('script[src*="pixel-deco.js"]');
      return s ? s.src : '';
    })();

  // Dossier qui contient pixel-deco.js (donc aussi le dossier "pixel/")
  var BASE = SELF ? SELF.replace(/[^/]*$/, '') : '';

  // Emplacements testés dans l'ordre pour chaque image
  function candidates(rel) {
    var list = [];
    if (BASE) list.push(BASE + rel);
    list.push(new URL(rel, location.href).href); // relatif à la page
    list.push(location.origin + '/' + rel); // racine du site
    var out = [], seen = {};
    for (var i = 0; i < list.length; i++) {
      if (!seen[list[i]]) { seen[list[i]] = 1; out.push(list[i]); }
    }
    return out;
  }

  // Applique une image avec repli automatique si l'URL renvoie une erreur
  function setSrcWithFallback(el, rel) {
    var urls = candidates(rel);
    var i = 0;
    el.addEventListener('error', function () {
      i++;
      if (i < urls.length) el.src = urls[i];
      else el.style.display = 'none'; // image vraiment absente : on n'affiche pas de vignette cassée
    });
    el.src = urls[0];
  }

  var FOOD = [
    'pixel/food/food-01.png', 'pixel/food/food-02.png', 'pixel/food/food-03.png',
    'pixel/food/food-04.png', 'pixel/food/food-05.png', 'pixel/food/food-06.png',
    'pixel/food/food-07.png', 'pixel/food/food-08.png', 'pixel/food/food-09.png',
    'pixel/food/food-10.png', 'pixel/food/flower.png'
  ];

  // Plantes suspendues, pots, bougies, bocaux et petites fioles
  var DECO = [];
  for (var d = 2; d <= 35; d++) {
    if (d === 3) continue; // sprite tronqué
    DECO.push('pixel/deco/deco-' + (d < 10 ? '0' + d : d) + '.png');
  }
  var PLANTS = DECO.slice(0, 10);   // plantes & pots
  var OBJECTS = DECO.slice(10);     // bougies, bocaux, fioles, tasse…

  function pageSeed() {
    var name = (location.pathname.split('/').pop() || 'index.html');
    var s = 0;
    for (var i = 0; i < name.length; i++) s = (s * 31 + name.charCodeAt(i)) % 9973;
    return s;
  }

  function pick(list, seed, count) {
    var out = [], used = {};
    var i = 0;
    while (out.length < count && i < 200) {
      var idx = (seed + i * 7 + out.length * 3) % list.length;
      if (!used[idx]) { used[idx] = 1; out.push(list[idx]); }
      i++;
    }
    return out;
  }

  function img(src, width) {
    var el = document.createElement('img');
    el.alt = '';
    el.setAttribute('aria-hidden', 'true');
    if (width) { el.style.width = width + 'px'; el.style.height = 'auto'; }
    // Pas de lazy-loading : la guirlande est décorative et doit apparaître
    // tout de suite, même en bas de page.
    setSrcWithFallback(el, src);
    return el;
  }

  function isDashboard() {
    var name = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return name === '' || name === 'index' || name === 'index.html';
  }

  // Répare aussi les images pixel écrites en dur dans le HTML (profil.html…)
  function fixStaticSprites() {
    var nodes = document.querySelectorAll('img[src*="pixel/"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var rel = el.getAttribute('src');
      if (!rel || /^(https?:)?\/\//.test(rel) || rel.charAt(0) === '/') continue;
      rel = rel.replace(/^\.\//, '');
      if (el.getAttribute('loading') === 'lazy') el.removeAttribute('loading');
      setSrcWithFallback(el, rel);
    }
  }

  function decorate() {
    if (/[?&]embed=1/.test(location.search)) return;
    if (document.body.classList.contains('embed-mode')) return;

    fixStaticSprites();

    if (document.querySelector('.px-ribbon')) return;
    if (isDashboard()) return; // pas de déco pixel sur le dashboard

    var seed = pageSeed();

    // 1) Un petit pixel art à côté du titre de la page
    var head = document.querySelector('.rpg-questbar-title, .rpg-parchment h1, main h1');
    if (head && !head.querySelector('.px-title-sprite')) {
      var sprite = img(pick(FOOD.concat(PLANTS), seed + 5, 1)[0]);
      sprite.className = 'px-title-sprite';
      head.insertBefore(sprite, head.firstChild);
    }

    // 2) Petite frise (guirlande) de gourmandises en bas du contenu principal
    var host = document.querySelector('.rpg-parchment') || document.querySelector('main');
    if (host) {
      var ribbon = document.createElement('div');
      ribbon.className = 'px-ribbon';
      ribbon.setAttribute('aria-hidden', 'true');
      pick(FOOD, seed, 5).forEach(function (src) { ribbon.appendChild(img(src, 40)); });
      host.appendChild(ribbon);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorate);
  } else {
    decorate();
  }
})();

/* Mode embarqué (iframe du carnet) : on masque la barre latérale. */
(function () {
  try {
    if (/[?&]embed=1/.test(location.search)) {
      document.documentElement.classList.add('embed-mode');
      var apply = function () { document.body.classList.add('embed-mode'); };
      if (document.body) apply(); else document.addEventListener('DOMContentLoaded', apply);
    }
  } catch (e) {}
})();
