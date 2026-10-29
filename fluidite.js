/* fluidite.js — met les décors animés en pause quand on ne touche à rien.

   Pourquoi : les lucioles du soir, le décor de fête et le point qui pulse sur le
   billet de train flottant tournent en continu derrière des cartes « verre »
   (flou d'arrière-plan). Tant que quelque chose bouge, l'ordinateur redessine ce
   flou à chaque image : c'est ce qui le fait chauffer pendant une longue session
   (Focus train, Pomodoro…).

   Règle : après 20 s sans souris, clavier, toucher ni défilement, on ajoute la
   classe « benkyo-idle » sur <html> (cf. fluidite.css : les décors s'estompent et
   se figent). Au moindre geste, la classe disparaît et tout repart.
   Aucune fonction du site n'est concernée : minuteur, voyage, annonces et sons
   continuent normalement. */
(function () {
  'use strict';
  var IDLE_MS = 20000;
  var root = document.documentElement;
  var last = Date.now();
  var idle = false;

  function wake() {
    var now = Date.now();
    if (!idle && now - last < 250) return;      // pointermove tire très souvent : on ne fait presque rien
    last = now;
    if (idle) { idle = false; root.classList.remove('benkyo-idle'); }
  }

  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (type) {
    window.addEventListener(type, wake, { passive: true, capture: true });
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = 0; wake(); } });

  setInterval(function () {
    if (!idle && !document.hidden && Date.now() - last > IDLE_MS) {
      idle = true;
      root.classList.add('benkyo-idle');
    }
  }, 3000);
})();
