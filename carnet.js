/* =====================================================================
   Carnet "Mon profil" — pagination des feuillets
   Chaque .tp-pane contient plusieurs .nb-sheet. On en affiche deux à la
   fois (page de gauche / page de droite) sur grand écran, une seule sur
   petit écran, et le pager permet de tourner les pages du carnet.
   ===================================================================== */
(function (global) {
  'use strict';

  var index = {}; // { nomDuPane: premierFeuilletAffiché }

  function activePane() {
    var panes = document.querySelectorAll('.nb-page .tp-pane');
    for (var i = 0; i < panes.length; i++) {
      if (!panes[i].hidden) return panes[i];
    }
    return null;
  }

  function sheetsOf(pane) {
    return Array.prototype.filter.call(pane.children, function (el) {
      return el.classList && el.classList.contains('nb-sheet');
    });
  }

  function perView() {
    return global.matchMedia('(min-width:1000px)').matches ? 2 : 1;
  }

  /* Regroupe les feuillets en pages : un feuillet "pleine largeur"
     (le calendrier des tampons) occupe une page à lui tout seul. */
  function pagesOf(sheets) {
    var per = perView();
    var pages = [], cur = [];
    sheets.forEach(function (sheet) {
      var wide = sheet.classList.contains('nb-sheet--wide');
      if (wide) {
        if (cur.length) { pages.push(cur); cur = []; }
        pages.push([sheet]);
        return;
      }
      cur.push(sheet);
      if (cur.length >= per) { pages.push(cur); cur = []; }
    });
    if (cur.length) pages.push(cur);
    return pages;
  }

  function render() {
    var pane = activePane();
    var pager = document.getElementById('nb-pager');
    if (!pane) { if (pager) pager.hidden = true; return; }

    var sheets = sheetsOf(pane);
    var pages = pagesOf(sheets);
    var id = pane.id || 'pane';
    var page = index[id] || 0;
    if (page > pages.length - 1) page = pages.length - 1;
    if (page < 0) page = 0;
    index[id] = page;

    var visible = pages[page] || [];
    sheets.forEach(function (sheet) {
      sheet.hidden = visible.indexOf(sheet) === -1;
    });

    var book = document.querySelector('.nb-book');
    if (book) {
      var isWide = visible.length === 1 && visible[0].classList.contains('nb-sheet--wide');
      book.classList.toggle('is-wide-page', isWide);
    }

    if (!pager) return;
    if (pages.length <= 1) { pager.hidden = true; return; }

    pager.hidden = false;
    var label = document.getElementById('nb-pager-label');
    var prev = document.getElementById('nb-pager-prev');
    var next = document.getElementById('nb-pager-next');
    if (label) label.textContent = 'Page ' + (page + 1) + ' / ' + pages.length + ' du carnet';
    if (prev) prev.disabled = page <= 0;
    if (next) next.disabled = page >= pages.length - 1;
  }

  function move(delta) {
    var pane = activePane();
    if (!pane) return;
    var id = pane.id || 'pane';
    index[id] = (index[id] || 0) + delta;
    if (index[id] < 0) index[id] = 0;
    render();
    var book = document.querySelector('.nb-book');
    if (book) book.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reset() {
    var pane = activePane();
    if (pane) index[pane.id || 'pane'] = 0;
    render();
  }

  global.BenkyoCarnet = {
    refresh: render,
    reset: reset,
    next: function () { move(1); },
    prev: function () { move(-1); }
  };

  document.addEventListener('DOMContentLoaded', render);
  global.addEventListener('resize', function () {
    clearTimeout(global.__nbPagerTimer);
    global.__nbPagerTimer = setTimeout(render, 150);
  });
  render();
})(window);
