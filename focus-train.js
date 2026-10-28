(function () {
  'use strict';

  var STORAGE_KEY = 'benkyo_focus_train_journey_v1';
  var COACHES = 8;
  var ROWS = 12;
  var LETTERS = ['A', 'B', 'C', 'D'];
  // Villes proposées (ordre alphabétique dans les listes). Les coordonnées et les lignes
  // utilisées pour tracer le trajet sur la carte sont dans focus-train-voyage.js.
  var cities = [
    { id: 'aomori', name: 'Aomori', japanese: '青森' },
    { id: 'fukuoka', name: 'Fukuoka', japanese: '福岡' },
    { id: 'hakodate', name: 'Hakodate', japanese: '函館' },
    { id: 'himeji', name: 'Himeji', japanese: '姫路' },
    { id: 'hiroshima', name: 'Hiroshima', japanese: '広島' },
    { id: 'kagoshima', name: 'Kagoshima', japanese: '鹿児島' },
    { id: 'kamakura', name: 'Kamakura', japanese: '鎌倉' },
    { id: 'kanazawa', name: 'Kanazawa', japanese: '金沢' },
    { id: 'kobe', name: 'Kobe', japanese: '神戸' },
    { id: 'kumamoto', name: 'Kumamoto', japanese: '熊本' },
    { id: 'kyoto', name: 'Kyoto', japanese: '京都' },
    { id: 'morioka', name: 'Morioka', japanese: '盛岡' },
    { id: 'nagano', name: 'Nagano', japanese: '長野' },
    { id: 'nagoya', name: 'Nagoya', japanese: '名古屋' },
    { id: 'nara', name: 'Nara', japanese: '奈良' },
    { id: 'niigata', name: 'Niigata', japanese: '新潟' },
    { id: 'okayama', name: 'Okayama', japanese: '岡山' },
    { id: 'osaka', name: 'Osaka', japanese: '大阪' },
    { id: 'sendai', name: 'Sendai', japanese: '仙台' },
    { id: 'tokyo', name: 'Tokyo', japanese: '東京' },
    { id: 'toyama', name: 'Toyama', japanese: '富山' },
    { id: 'yokohama', name: 'Yokohama', japanese: '横浜' }
  ];

  // Temps de trajet indicatifs pour le prototype, pas des horaires en temps réel.
  var SHIN = 'Shinkansen · direct';
  var routes = [
    // Tōkaidō · San'yō · Kyūshū
    { from: 'tokyo', to: 'kyoto', train: 'Nozomi', type: SHIN, minutes: 132 },
    { from: 'tokyo', to: 'kyoto', train: 'Hikari', type: SHIN, minutes: 160 },
    { from: 'tokyo', to: 'osaka', train: 'Nozomi', type: SHIN, minutes: 150 },
    { from: 'tokyo', to: 'osaka', train: 'Hikari', type: SHIN, minutes: 174 },
    { from: 'tokyo', to: 'nagoya', train: 'Nozomi', type: SHIN, minutes: 100 },
    { from: 'tokyo', to: 'kobe', train: 'Nozomi', type: SHIN, minutes: 170 },
    { from: 'tokyo', to: 'okayama', train: 'Nozomi', type: SHIN, minutes: 195 },
    { from: 'tokyo', to: 'hiroshima', train: 'Nozomi', type: SHIN, minutes: 240 },
    { from: 'tokyo', to: 'fukuoka', train: 'Nozomi', type: SHIN, minutes: 300 },
    { from: 'tokyo', to: 'yokohama', train: 'Tōkaidō Line', type: 'Train rapide · direct', minutes: 27 },
    { from: 'nagoya', to: 'kyoto', train: 'Hikari', type: SHIN, minutes: 35 },
    { from: 'nagoya', to: 'osaka', train: 'Nozomi', type: SHIN, minutes: 50 },
    { from: 'nagoya', to: 'hiroshima', train: 'Nozomi', type: SHIN, minutes: 135 },
    { from: 'kyoto', to: 'osaka', train: 'Special Rapid', type: 'JR · direct', minutes: 28 },
    { from: 'kyoto', to: 'kobe', train: 'Special Rapid', type: 'JR · direct', minutes: 52 },
    { from: 'kyoto', to: 'hiroshima', train: 'Nozomi', type: SHIN, minutes: 100 },
    { from: 'osaka', to: 'kobe', train: 'Special Rapid', type: 'JR · direct', minutes: 21 },
    { from: 'osaka', to: 'himeji', train: 'Sakura', type: SHIN, minutes: 30 },
    { from: 'osaka', to: 'okayama', train: 'Sakura', type: SHIN, minutes: 45 },
    { from: 'osaka', to: 'hiroshima', train: 'Sakura', type: SHIN, minutes: 85 },
    { from: 'osaka', to: 'fukuoka', train: 'Mizuho', type: SHIN, minutes: 140 },
    { from: 'osaka', to: 'kumamoto', train: 'Mizuho', type: SHIN, minutes: 185 },
    { from: 'osaka', to: 'kagoshima', train: 'Mizuho', type: SHIN, minutes: 225 },
    { from: 'hiroshima', to: 'okayama', train: 'Sakura', type: SHIN, minutes: 40 },
    { from: 'hiroshima', to: 'fukuoka', train: 'Sakura', type: SHIN, minutes: 65 },
    { from: 'fukuoka', to: 'kumamoto', train: 'Sakura', type: SHIN, minutes: 35 },
    { from: 'fukuoka', to: 'kagoshima', train: 'Mizuho', type: SHIN, minutes: 80 },
    { from: 'kumamoto', to: 'kagoshima', train: 'Sakura', type: SHIN, minutes: 45 },
    // Kansai, trains JR
    { from: 'kyoto', to: 'nara', train: 'Miyakoji Rapid', type: 'JR · direct', minutes: 45 },
    { from: 'osaka', to: 'nara', train: 'Yamatoji Rapid', type: 'JR · direct', minutes: 50 },
    // Tōhoku · Hokkaidō
    { from: 'tokyo', to: 'sendai', train: 'Hayabusa', type: SHIN, minutes: 91 },
    { from: 'tokyo', to: 'morioka', train: 'Hayabusa', type: SHIN, minutes: 135 },
    { from: 'tokyo', to: 'aomori', train: 'Hayabusa', type: SHIN, minutes: 190 },
    { from: 'tokyo', to: 'hakodate', train: 'Hayabusa', type: SHIN, minutes: 245 },
    { from: 'sendai', to: 'morioka', train: 'Hayabusa', type: SHIN, minutes: 45 },
    { from: 'sendai', to: 'aomori', train: 'Hayabusa', type: SHIN, minutes: 100 },
    { from: 'morioka', to: 'aomori', train: 'Hayabusa', type: SHIN, minutes: 55 },
    { from: 'aomori', to: 'hakodate', train: 'Hayabusa', type: SHIN, minutes: 60 },
    // Hokuriku · Jōetsu
    { from: 'tokyo', to: 'nagano', train: 'Kagayaki', type: SHIN, minutes: 80 },
    { from: 'tokyo', to: 'toyama', train: 'Kagayaki', type: SHIN, minutes: 130 },
    { from: 'tokyo', to: 'kanazawa', train: 'Kagayaki', type: SHIN, minutes: 150 },
    { from: 'nagano', to: 'toyama', train: 'Kagayaki', type: SHIN, minutes: 45 },
    { from: 'nagano', to: 'kanazawa', train: 'Kagayaki', type: SHIN, minutes: 70 },
    { from: 'toyama', to: 'kanazawa', train: 'Kagayaki', type: SHIN, minutes: 20 },
    { from: 'tokyo', to: 'niigata', train: 'Toki', type: SHIN, minutes: 100 },
    // Côte de Shōnan
    { from: 'tokyo', to: 'kamakura', train: 'Yokosuka Line', type: 'JR · direct', minutes: 55 },
    { from: 'yokohama', to: 'kamakura', train: 'Yokosuka Line', type: 'JR · direct', minutes: 25 }
  ];

  // Collator FR : les villes restent triées par ordre alphabétique dans les listes déroulantes.
  cities.sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); });

  function byId(id) {
    return document.getElementById(id);
  }

  function readSavedJourney() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function getCity(id) {
    return cities.find(function (city) { return city.id === id; });
  }

  function formatDuration(minutes) {
    var hours = Math.floor(minutes / 60);
    var remainder = minutes % 60;
    if (!hours) return remainder + ' min';
    return hours + ' h ' + String(remainder).padStart(2, '0');
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function makeCityOption(city) {
    var option = document.createElement('option');
    option.value = city.id;
    option.textContent = city.name + ' · ' + city.japanese;
    return option;
  }

  // ——— Places déjà occupées : générées de façon déterministe pour un train et une voiture,
  // afin que le plan reste identique après un rechargement de la page. ———
  function hashString(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var occupancyCache = {};

  function takenSeats(routeKey, coach) {
    var cacheKey = routeKey + '#' + coach;
    if (occupancyCache[cacheKey]) return occupancyCache[cacheKey];
    var random = seededRandom(hashString(cacheKey));
    var rate = 0.34 + random() * 0.34;
    var taken = {};
    var count = 0;
    for (var row = 1; row <= ROWS; row += 1) {
      for (var i = 0; i < LETTERS.length; i += 1) {
        // Les voyageurs arrivent souvent à deux : une place prise attire sa voisine.
        var neighbour = LETTERS[i % 2 === 0 ? i + 1 : i - 1];
        var chance = taken[row + neighbour] ? Math.min(0.85, rate + 0.25) : rate;
        if (random() < chance) {
          taken[row + LETTERS[i]] = true;
          count += 1;
        }
      }
    }
    // Toujours laisser quelques places libres.
    var guard = 0;
    while (ROWS * LETTERS.length - count < 5 && guard < 60) {
      var freeRow = 1 + Math.floor(random() * ROWS);
      var freeLetter = LETTERS[Math.floor(random() * LETTERS.length)];
      if (taken[freeRow + freeLetter]) {
        delete taken[freeRow + freeLetter];
        count -= 1;
      }
      guard += 1;
    }
    occupancyCache[cacheKey] = taken;
    return taken;
  }

  function freeCount(routeKey, coach) {
    return ROWS * LETTERS.length - Object.keys(takenSeats(routeKey, coach)).length;
  }

  function seatPosition(letter) {
    return letter === 'A' || letter === 'D' ? 'côté fenêtre' : 'côté couloir';
  }

  function isTorn(journey) {
    return Boolean(journey && (journey.torn === true || journey.stamped === true));
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // ——— Correspondances ———
  // Les étapes ajoutées après le premier train sont mémorisées à part (clé ci-dessous), rattachées au couple
  // départ>arrivée du premier trajet. Chaque étape = { to, train, breakMinutes } où breakMinutes est la pause
  // à la gare de correspondance, avant de reprendre ce train.
  var TRANSFER_KEY = 'benkyo_focus_train_transfers_v1';
  var BREAK_CHOICES = [5, 10, 15, 20, 30, 45, 60];
  var MAX_TRANSFERS = 3;

  function findRoute(a, b, train) {
    return routes.find(function (route) {
      return route.train === train && ((route.from === a && route.to === b) || (route.from === b && route.to === a));
    }) || null;
  }

  function readTransfers(base) {
    try {
      var data = JSON.parse(localStorage.getItem(TRANSFER_KEY) || 'null');
      if (!data || data.base !== base || !Array.isArray(data.legs)) return [];
      var ends = base.split('>');
      var visited = [ends[0], ends[1]];
      var previous = ends[1];
      var legs = [];
      for (var i = 0; i < data.legs.length && legs.length < MAX_TRANSFERS; i += 1) {
        var leg = data.legs[i];
        if (!leg || visited.indexOf(leg.to) !== -1 || !findRoute(previous, leg.to, leg.train)) break;
        var pause = Number(leg.breakMinutes);
        legs.push({ to: leg.to, train: leg.train, breakMinutes: BREAK_CHOICES.indexOf(pause) !== -1 ? pause : 15 });
        visited.push(leg.to);
        previous = leg.to;
      }
      return legs;
    } catch (error) {
      return [];
    }
  }

  function writeTransfers(base, legs) {
    try { localStorage.setItem(TRANSFER_KEY, JSON.stringify({ base: base, legs: legs })); } catch (error) { /* ignoré */ }
  }

  // Trajets possibles depuis une ville (sans revenir sur ses pas).
  function transferOptions(city, visited) {
    var options = [];
    routes.forEach(function (route) {
      var other = route.from === city ? route.to : route.to === city ? route.from : null;
      if (!other || visited.indexOf(other) !== -1 || !getCity(other)) return;
      options.push({ to: other, train: route.train, type: route.type, minutes: route.minutes });
    });
    options.sort(function (a, b) { return getCity(a.to).name.localeCompare(getCity(b.to).name, 'fr') || a.minutes - b.minutes; });
    return options;
  }

  function transferTotals(firstMinutes, legs, firstFrom, firstTo) {
    var rides = firstMinutes;
    var pauses = 0;
    var previous = firstTo;
    legs.forEach(function (leg) {
      var route = findRoute(previous, leg.to, leg.train);
      rides += route ? route.minutes : 0;
      pauses += leg.breakMinutes;
      previous = leg.to;
    });
    return { rides: rides, pauses: pauses, total: rides + pauses };
  }

  // Plan complet du voyage, figé au moment de monter dans le train : une place est attribuée dans chaque
  // train suivant (déterministe pour ce départ). Utilisé par focus-train-voyage.js.
  function buildPlan(journey) {
    var legs = readTransfers(journey.from + '>' + journey.to);
    if (!legs.length) return null;
    var plan = [{
      from: journey.from, to: journey.to, train: journey.train, trainType: journey.trainType,
      minutes: journey.durationMinutes, coach: journey.coachNumber, seat: journey.seat, breakAfter: legs[0].breakMinutes
    }];
    var previous = journey.to;
    legs.forEach(function (leg, index) {
      var route = findRoute(previous, leg.to, leg.train);
      var key = previous + '-' + leg.to + '-' + leg.train;
      var random = seededRandom(hashString(key + ':' + Date.now()));
      var coach = 1 + Math.floor(random() * COACHES);
      var taken = takenSeats(key, coach);
      var free = [];
      for (var row = 1; row <= ROWS; row += 1) {
        LETTERS.forEach(function (letter) { if (!taken[row + letter]) free.push(row + letter); });
      }
      plan.push({
        from: previous, to: leg.to, train: leg.train, trainType: route.type, minutes: route.minutes,
        coach: coach, seat: free[Math.floor(random() * free.length)] || '1A',
        breakAfter: legs[index + 1] ? legs[index + 1].breakMinutes : 0
      });
      previous = leg.to;
    });
    return { legs: plan };
  }

  window.FocusTrain = { buildPlan: buildPlan };

  // Bord irrégulier du papier déchiré (clip-path généré) : bord droit du billet, bord gauche du coupon.
  function zigzagPolygon(position) {
    var teeth = 14;
    var depth = 6;
    var points = [];
    var i;
    var y;
    var d;
    if (position === 'right') {
      points.push('0 0');
      for (i = 0; i <= teeth; i += 1) {
        y = (i / teeth) * 100;
        d = i % 2 ? depth : (i % 3 === 0 ? 1 : 0);
        points.push('calc(100% - ' + d + 'px) ' + y + '%');
      }
      points.push('0 100%');
    } else {
      for (i = 0; i <= teeth; i += 1) {
        y = (i / teeth) * 100;
        d = i % 2 ? depth : (i % 3 === 0 ? 1 : 0);
        points.push(d + 'px ' + y + '%');
      }
      points.push('100% 100%', '100% 0');
    }
    return 'polygon(' + points.join(',') + ')';
  }

  function render() {
    var origin = byId('ft-origin');
    var destination = byId('ft-destination');
    var optionList = byId('ft-route-options');
    var noRoute = byId('ft-no-route');
    var status = byId('ft-selection-status');
    var chooseButton = byId('ft-choose-route');
    var seatPanel = byId('ft-seat-panel');
    var ticketPanel = byId('ft-ticket-panel');
    var coachOptions = byId('ft-coach-options');
    var cabin = byId('ft-seat-options');
    var ticket = byId('ft-ticket');
    var ticketMain = byId('ft-ticket-main');
    var stub = byId('ft-stub');
    var tearButton = byId('ft-tear-ticket');
    var newTicketButton = byId('ft-new-ticket');
    var boardButton = byId('ft-board-ticket');
    if (!origin || !destination || !optionList || !noRoute || !status || !chooseButton ||
        !seatPanel || !ticketPanel || !coachOptions || !cabin || !ticket || !ticketMain ||
        !stub || !tearButton || !newTicketButton || !boardButton) return;

    var journey = readSavedJourney();
    var selectedRoute = null;
    var selectedCoach = null;
    var selectedSeat = null;
    var coachButtons = [];
    var seatButtons = [];
    var tearInProgress = false;
    var dragState = null;

    cities.forEach(function (city) {
      origin.appendChild(makeCityOption(city));
      destination.appendChild(makeCityOption(city));
    });
    origin.value = journey && getCity(journey.from) ? journey.from : 'tokyo';
    destination.value = journey && getCity(journey.to) ? journey.to : 'kyoto';

    function routeMatches(saved, route) {
      return Boolean(saved && route && saved.from === route.from && saved.to === route.to &&
        saved.train === route.train && saved.durationMinutes === route.minutes);
    }

    function validCoach(value) {
      return Number.isInteger(value) && value >= 1 && value <= COACHES;
    }

    function validSeat(value) {
      return typeof value === 'string' && /^(?:[1-9]|1[0-2])[A-D]$/.test(value);
    }

    function routeKeyOf(route) {
      return route ? route.from + '-' + route.to + '-' + route.train : '';
    }

    function seatIsTaken(route, coach, seat) {
      return Boolean(takenSeats(routeKeyOf(route), coach)[seat]);
    }

    function saveJourney(nextJourney) {
      journey = nextJourney;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextJourney));
        status.classList.remove('is-error');
        return true;
      } catch (error) {
        status.classList.add('is-error');
        status.textContent = 'Le choix est visible, mais n’a pas pu être mémorisé sur cet appareil.';
        return false;
      }
    }

    function isLocked() {
      return routeMatches(journey, selectedRoute) && isTorn(journey);
    }

    // ——— Navigation clavier dans un groupe de boutons radio ———
    function radioKeydown(event, buttons, index, select) {
      var step;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        step = 1;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        step = -1;
      } else {
        return;
      }
      event.preventDefault();
      for (var i = 1; i <= buttons.length; i += 1) {
        var nextIndex = (index + step * i + buttons.length * i) % buttons.length;
        if (!buttons[nextIndex].disabled) {
          select(nextIndex);
          buttons[nextIndex].focus();
          return;
        }
      }
    }

    // ——— Le train (choix de la voiture) ———
    function updateCoachStrip(active) {
      var locked = isLocked();
      var key = routeKeyOf(selectedRoute);
      coachButtons.forEach(function (button, index) {
        var coach = Number(button.dataset.coach);
        var checked = coach === selectedCoach;
        var free = key ? freeCount(key, coach) : 0;
        button.disabled = !active || (locked && !checked);
        button.setAttribute('aria-checked', String(checked));
        button.setAttribute('aria-label', 'Voiture ' + coach + ', ' + free + ' places libres');
        button.querySelector('.ft-car-free').textContent = free + ' libres';
        var fill = button.querySelector('.ft-car-bar i');
        if (fill) fill.style.width = key ? Math.round(((ROWS * LETTERS.length - free) / (ROWS * LETTERS.length)) * 100) + '%' : '0%';
        button.tabIndex = checked || (!selectedCoach && index === 0) ? 0 : -1;
      });
    }

    function setupCoachStrip() {
      for (var coach = 1; coach <= COACHES; coach += 1) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'ft-car';
        button.dataset.coach = String(coach);
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', 'false');
        button.innerHTML = '<span class="ft-car-shell" aria-hidden="true"></span><span class="ft-car-wins" aria-hidden="true"></span><span class="ft-car-wheels" aria-hidden="true"></span><span class="ft-car-num">' + coach + '</span><span class="ft-car-free"></span><span class="ft-car-bar" aria-hidden="true"><i></i></span>';
        button.addEventListener('click', function (event) {
          selectCoach(Number(event.currentTarget.dataset.coach));
        });
        button.addEventListener('keydown', function (event) {
          var index = coachButtons.indexOf(event.currentTarget);
          radioKeydown(event, coachButtons, index, function (nextIndex) {
            selectCoach(Number(coachButtons[nextIndex].dataset.coach));
          });
        });
        coachOptions.appendChild(button);
        coachButtons.push(button);
      }
    }

    // ——— L'intérieur de la voiture (plan des sièges) ———
    function drawCabin() {
      cabin.replaceChildren();
      seatButtons = [];
      var coach = selectedCoach;
      byId('ft-coach-title').textContent = 'Voiture ' + pad2(coach || 1);
      if (!selectedRoute || !coach) return;
      var taken = takenSeats(routeKeyOf(selectedRoute), coach);
      var locked = isLocked();

      // Plan horizontal : rangées de gauche (avant du train) à droite, fenêtres en haut (A) et en bas (D), couloir au milieu.
      var gridRows = { A: 1, B: 2, C: 4, D: 5 };
      var aisle = document.createElement('span');
      aisle.className = 'ft-aisle';
      aisle.setAttribute('aria-hidden', 'true');
      cabin.appendChild(aisle);
      LETTERS.forEach(function (l) {
        var tag = document.createElement('span');
        tag.className = 'ft-seat-letter';
        tag.setAttribute('aria-hidden', 'true');
        tag.style.gridRow = String(gridRows[l]);
        tag.textContent = l;
        cabin.appendChild(tag);
      });
      for (var row = 1; row <= ROWS; row += 1) {
        var label = document.createElement('span');
        label.className = 'ft-row-label';
        label.setAttribute('aria-hidden', 'true');
        label.style.gridColumn = String(row + 1);
        label.textContent = String(row);
        cabin.appendChild(label);
      }
      // Les boutons restent classés par rangée puis lettre (ordre de tabulation et de navigation au clavier).
      for (var r = 1; r <= ROWS; r += 1) {
        for (var i = 0; i < LETTERS.length; i += 1) {
          var letter = LETTERS[i];
          var seat = r + letter;
          var isTaken = Boolean(taken[seat]);
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'ft-seat' + (isTaken ? ' is-taken' : '') + (locked ? ' is-locked' : '');
          button.dataset.seat = seat;
          button.style.gridRow = String(gridRows[letter]);
          button.style.gridColumn = String(r + 1);
          button.setAttribute('role', 'radio');
          button.setAttribute('aria-checked', String(seat === selectedSeat));
          button.setAttribute('aria-label', 'Rangée ' + r + ', place ' + letter + ', ' + seatPosition(letter) +
            (isTaken ? ', occupée' : ', libre'));
          if (isTaken) {
            button.disabled = true;
            button.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i>';
          } else {
            button.disabled = locked;
            button.innerHTML = seat === selectedSeat
              ? '<i class="fa-solid fa-check" aria-hidden="true"></i>'
              : '<span aria-hidden="true">' + letter + '</span>';
            button.addEventListener('click', function (event) {
              selectSeat(event.currentTarget.dataset.seat);
            });
            button.addEventListener('keydown', function (event) {
              var free = seatButtons.filter(function (item) { return !item.disabled; });
              var index = free.indexOf(event.currentTarget);
              radioKeydown(event, free, index, function (nextIndex) {
                selectSeat(free[nextIndex].dataset.seat);
              });
            });
          }
          cabin.appendChild(button);
          seatButtons.push(button);
        }
      }
      updateSeatTabindex();
    }

    function updateSeatTabindex() {
      var free = seatButtons.filter(function (button) { return !button.disabled; });
      var hasChecked = free.some(function (button) { return button.dataset.seat === selectedSeat; });
      seatButtons.forEach(function (button) {
        var checked = button.dataset.seat === selectedSeat;
        button.tabIndex = !button.disabled && (checked || (!hasChecked && button === free[0])) ? 0 : -1;
      });
    }

    function refreshSeatStates() {
      var locked = isLocked();
      seatButtons.forEach(function (button) {
        var seat = button.dataset.seat;
        var checked = seat === selectedSeat;
        button.setAttribute('aria-checked', String(checked));
        button.classList.toggle('is-locked', locked);
        if (!button.classList.contains('is-taken')) {
          button.disabled = locked;
          button.innerHTML = checked
            ? '<i class="fa-solid fa-check" aria-hidden="true"></i>'
            : '<span aria-hidden="true">' + seat.slice(-1) + '</span>';
        }
      });
      updateSeatTabindex();
    }

    function seatSummary() {
      return 'voiture ' + pad2(selectedCoach) + ', place ' + selectedSeat + ' (' + seatPosition(selectedSeat.slice(-1)) + ')';
    }

    function updateSeatTexts() {
      var autoBtn = byId('ft-auto-seat');
      if (autoBtn) autoBtn.disabled = !selectedRoute || isLocked();
      var hint = byId('ft-seat-hint');
      var seatStatus = byId('ft-seat-status');
      if (!selectedCoach) {
        hint.textContent = 'Choisis une voiture.';
        seatStatus.textContent = 'Choisis une voiture, puis une place.';
        return;
      }
      var free = freeCount(routeKeyOf(selectedRoute), selectedCoach);
      hint.textContent = 'Voiture ' + pad2(selectedCoach) + ' : ' + free + ' places libres sur ' + (ROWS * LETTERS.length) + '.';
      if (isLocked() && selectedSeat) {
        seatStatus.textContent = 'Billet déchiré : tu voyages en ' + seatSummary() + '.';
      } else if (selectedSeat) {
        seatStatus.textContent = 'Tu as choisi la ' + seatSummary() + '. Choix mémorisé sur cet appareil.';
      } else {
        seatStatus.textContent = 'Touche une place libre dans la voiture ' + pad2(selectedCoach) + '.';
      }
    }

    // ——— Billet ———
    function resetTearVisuals() {
      stub.classList.remove('is-dragging', 'is-springing', 'is-away');
      stub.style.transform = '';
      stub.style.clipPath = '';
      ticketMain.style.clipPath = '';
    }

    function showTicket() {
      var hasTicket = routeMatches(journey, selectedRoute) &&
        validCoach(journey.coachNumber) && validSeat(journey.seat);
      ticketPanel.classList.toggle('hidden', !hasTicket);
      if (!hasTicket) return;

      var torn = isTorn(journey);
      byId('ft-ticket-from').textContent = getCity(journey.from).name + ' · ' + getCity(journey.from).japanese;
      var extra = readTransfers(journey.from + '>' + journey.to);
      var finalId = extra.length ? extra[extra.length - 1].to : journey.to;
      byId('ft-ticket-to').textContent = getCity(finalId).name + ' · ' + getCity(finalId).japanese;
      byId('ft-ticket-train').textContent = [journey.train].concat(extra.map(function (leg) { return leg.train; })).join(' + ');
      byId('ft-ticket-duration').textContent = extra.length
        ? formatDuration(transferTotals(journey.durationMinutes, extra, journey.from, journey.to).total) + ' · ' + extra.length + ' corresp.'
        : formatDuration(journey.durationMinutes);
      byId('ft-ticket-coach').textContent = pad2(journey.coachNumber);
      byId('ft-ticket-seat').textContent = journey.seat;

      var cabinClass = (journey && journey.cabinClass) || 'standard';
      var ticketClassEl = byId('ft-ticket-class');
      if (ticketClassEl) {
        if (cabinClass === 'gran') {
          ticketClassEl.innerHTML = '<span style="color:#b45309;font-weight:800;">🌸 グランクラス · Gran Class</span>';
        } else if (cabinClass === 'green') {
          ticketClassEl.innerHTML = '<span style="color:#047857;font-weight:800;">🍃 グリーン車 · Green Car</span>';
        } else {
          ticketClassEl.innerHTML = '<span style="color:#be185d;font-weight:700;">🎌 普通車 · Standard</span>';
        }
      }
      ticket.classList.toggle('is-gran-class', cabinClass === 'gran');
      ticket.classList.toggle('is-green-car', cabinClass === 'green');
      byId('ft-stub-seat').innerHTML = 'Voiture ' + pad2(journey.coachNumber) + '<br>Place ' + journey.seat;
      byId('ft-ticket-code').textContent = 'FT-' + String(journey.savedAt || '').slice(0, 10).replace(/-/g, '');

      if (tearInProgress) return;
      resetTearVisuals();
      ticket.classList.toggle('is-torn', torn);
      if (torn) ticketMain.style.clipPath = zigzagPolygon('right');
      byId('ft-ticket-note').textContent = torn ? 'Billet déchiré · bon voyage !' : 'Garde ce billet pour ta session';
      byId('ft-ticket-note').classList.toggle('ft-ticket-note-ok', torn);
      tearButton.disabled = torn;
      tearButton.classList.toggle('hidden', torn);
      newTicketButton.classList.toggle('hidden', !torn);
      boardButton.classList.toggle('hidden', !torn);
      var tearStatus = byId('ft-tear-status');
      tearStatus.classList.toggle('is-saved', torn);
      tearStatus.textContent = torn
        ? 'Billet déchiré : ton embarquement est validé. Monte dans le train quand tu es prêt.'
        : 'Ton billet est prêt à être déchiré.';
    }

    function renderJourney() {
      var active = routeMatches(journey, selectedRoute);
      seatPanel.classList.toggle('hidden', !active);
      if (!active) {
        selectedCoach = null;
        selectedSeat = null;
        updateCoachStrip(false);
        cabin.replaceChildren();
        seatButtons = [];
        ticketPanel.classList.add('hidden');
        return;
      }

      // La voiture 1 est affichée par défaut pour montrer tout de suite l'intérieur du train.
      selectedCoach = validCoach(journey.coachNumber) ? journey.coachNumber : (selectedCoach || 1);
      selectedSeat = validCoach(journey.coachNumber) && validSeat(journey.seat) &&
        !seatIsTaken(selectedRoute, journey.coachNumber, journey.seat) ? journey.seat : null;
      updateCoachStrip(true);
      drawCabin();
      updateSeatTexts();

      var trainName = (selectedRoute && selectedRoute.train) ? selectedRoute.train.toLowerCase() : '';
      var isGranSupported = trainName.indexOf('hayabusa') !== -1 || trainName.indexOf('kagayaki') !== -1;
      var curClass = (journey && journey.cabinClass) || 'standard';
      if (curClass === 'gran' && !isGranSupported) {
        curClass = 'standard';
        if (journey) {
          journey.cabinClass = 'standard';
          saveJourney(journey);
        }
      }
      updateClassCardSelection(curClass, isGranSupported);

      showTicket();
    }

    function updateClassCardSelection(cls, isGranSupported) {
      var coachShell = byId('ft-coach');
      if (coachShell) coachShell.dataset.cls = cls;
      var granCard = byId('ft-class-card-gran');
      var greenCard = byId('ft-class-card-green');
      var stdCard = byId('ft-class-card-standard');
      var granCond = byId('ft-gran-cond-line');
      var warnEl = byId('ft-gran-warn');
      if (warnEl) warnEl.classList.add('hidden');
      if (granCard) {
        granCard.classList.toggle('is-selected', cls === 'gran');
        granCard.classList.toggle('is-disabled', !isGranSupported);
        granCard.setAttribute('aria-checked', String(cls === 'gran'));
      }
      if (granCond) {
        granCond.innerHTML = isGranSupported
          ? '<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Compatible avec ' + (selectedRoute ? selectedRoute.train : 'ce train')
          : '<i class="fa-solid fa-lock" style="color:#d97706;"></i> Hayabusa &amp; Kagayaki uniquement';
      }
      if (greenCard) {
        greenCard.classList.toggle('is-selected', cls === 'green');
        greenCard.setAttribute('aria-checked', String(cls === 'green'));
      }
      if (stdCard) {
        stdCard.classList.toggle('is-selected', cls === 'standard');
        stdCard.setAttribute('aria-checked', String(cls === 'standard'));
      }
    }

    window.setFocusTrainClass = function (cls) {
      var currentTrain = (selectedRoute && selectedRoute.train) || (journey && journey.train) || '';
      var trainName = currentTrain.toLowerCase();
      var isGranSupported = trainName.indexOf('hayabusa') !== -1 || trainName.indexOf('kagayaki') !== -1;
      var warnEl = byId('ft-gran-warn');
      if (cls === 'gran' && !isGranSupported) {
        if (warnEl) warnEl.classList.remove('hidden');
        return;
      }
      if (warnEl) warnEl.classList.add('hidden');

      if (!journey) journey = readSavedJourney() || {};
      journey.cabinClass = cls;
      saveJourney(journey);
      updateClassCardSelection(cls, isGranSupported);
      showTicket();
      window.dispatchEvent(new CustomEvent('ft:journey-changed'));
    };

    function updateSelectedOption() {
      Array.prototype.forEach.call(optionList.querySelectorAll('.ft-route-option'), function (button) {
        button.setAttribute('aria-pressed', String(
          Boolean(selectedRoute && button.querySelector('.ft-train-name').textContent === selectedRoute.train)
        ));
      });
    }

    function updateRouteStatus() {
      status.classList.remove('is-error', 'is-saved');
      if (!selectedRoute) {
        status.textContent = 'Choisis un trajet pour préparer ton voyage.';
        return;
      }
      if (routeMatches(journey, selectedRoute)) {
        status.textContent = 'Trajet mémorisé : ' + getCity(journey.from).name + ' → ' +
          getCity(journey.to).name + ' · ' + journey.train + '. Tu peux modifier ta place.';
        status.classList.add('is-saved');
        return;
      }
      status.textContent = 'Train sélectionné : ' + getCity(selectedRoute.from).name + ' → ' +
        getCity(selectedRoute.to).name + ' · ' + selectedRoute.train + '. Continue pour choisir ta place.';
    }

    function selectRoute(route) {
      selectedRoute = route;
      updateSelectedOption();
      updateRouteStatus();
      renderJourney();
      renderTransfers();
    }

    function selectCoach(coachNumber) {
      if (!selectedRoute || !routeMatches(journey, selectedRoute) || selectedCoach === coachNumber || isLocked()) return;
      selectedCoach = coachNumber;
      selectedSeat = null;
      saveJourney(Object.assign({}, journey, {
        coachNumber: coachNumber,
        seat: null,
        torn: false,
        stamped: false,
        savedAt: new Date().toISOString()
      }));
      updateCoachStrip(true);
      drawCabin();
      updateSeatTexts();
      showTicket();
    }

    // « Choisir pour moi » : une place libre côté fenêtre (sinon n'importe quelle place libre) dans la voiture affichée.
    function pickSeatForMe() {
      if (!selectedRoute || !routeMatches(journey, selectedRoute) || isLocked()) return;
      if (!selectedCoach) selectCoach(1);
      var key = routeKeyOf(selectedRoute);
      var taken = takenSeats(key, selectedCoach);
      var windowSeats = [];
      var anySeats = [];
      for (var r = 1; r <= ROWS; r += 1) {
        LETTERS.forEach(function (l) {
          if (taken[r + l]) return;
          anySeats.push(r + l);
          if (l === 'A' || l === 'D') windowSeats.push(r + l);
        });
      }
      var pool = windowSeats.length ? windowSeats : anySeats;
      if (!pool.length) return;
      selectSeat(pool[Math.floor(Math.random() * pool.length)]);
    }

    function selectSeat(seat) {
      if (!selectedRoute || !selectedCoach || !routeMatches(journey, selectedRoute) || isLocked()) return;
      if (!validSeat(seat) || seatIsTaken(selectedRoute, selectedCoach, seat)) return;
      var firstTicket = !selectedSeat;
      selectedSeat = seat;
      var saved = saveJourney(Object.assign({}, journey, {
        coachNumber: selectedCoach,
        seat: seat,
        torn: false,
        stamped: false,
        savedAt: new Date().toISOString()
      }));
      refreshSeatStates();
      updateSeatTexts();
      if (!saved) {
        byId('ft-seat-status').textContent = 'Place ' + seat + ' sélectionnée, mais la sauvegarde locale a échoué.';
      }
      showTicket();
      if (firstTicket && !ticketPanel.classList.contains('hidden') && ticketPanel.scrollIntoView) {
        ticketPanel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      }
    }

    // ——— Déchirer le billet ———
    // Distance (px) qu'il faut tirer le coupon vers la droite pour le détacher.
    var TEAR_DIST = 120;

    function applyTearProgress(progress) {
      var p = Math.max(0, Math.min(1, progress));
      if (p > 0) {
        stub.style.clipPath = zigzagPolygon('left');
        ticketMain.style.clipPath = zigzagPolygon('right');
      }
      stub.style.transform = 'translateX(' + (p * TEAR_DIST).toFixed(1) + 'px) rotate(' + (p * 7).toFixed(1) + 'deg)';
    }

    function completeTear(animated) {
      if (isTorn(journey) || !routeMatches(journey, selectedRoute) || !validSeat(journey.seat)) return;
      tearInProgress = true;
      var saved = saveJourney(Object.assign({}, journey, { torn: true, stamped: false }));
      var tearStatus = byId('ft-tear-status');
      tearButton.disabled = true;
      ticketMain.style.clipPath = zigzagPolygon('right');
      stub.style.clipPath = zigzagPolygon('left');
      var finish = function () {
        tearInProgress = false;
        showTicket();
        refreshSeatStates();
        updateCoachStrip(true);
        updateSeatTexts();
        if (!saved) {
          tearStatus.textContent = 'Le billet est déchiré à l’écran, mais son état n’a pas pu être mémorisé.';
        }
      };
      if (!animated || prefersReducedMotion()) {
        finish();
        return;
      }
      stub.classList.remove('is-dragging', 'is-springing');
      stub.classList.add('is-away');
      window.setTimeout(finish, 820);
    }

    function animateTear() {
      if (tearInProgress || isTorn(journey)) return;
      if (prefersReducedMotion()) {
        completeTear(false);
        return;
      }
      tearInProgress = true;
      var start = null;
      var duration = 650;
      function step(timestamp) {
        if (start === null) start = timestamp;
        var progress = Math.min(1, (timestamp - start) / duration);
        applyTearProgress(progress);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          tearInProgress = false;
          completeTear(true);
        }
      }
      window.requestAnimationFrame(step);
    }

    function startDrag(event) {
      if (tearInProgress || isTorn(journey) || (event.button !== undefined && event.button > 0)) return;
      dragState = { x: event.clientX, y: event.clientY, progress: 0, id: event.pointerId };
      stub.classList.remove('is-springing');
      stub.classList.add('is-dragging');
      try { stub.setPointerCapture(event.pointerId); } catch (error) { /* ignoré */ }
    }

    function moveDrag(event) {
      if (!dragState || event.pointerId !== dragState.id) return;
      // On tire le coupon horizontalement, vers la droite, comme un vrai billet à talon.
      var dx = event.clientX - dragState.x;
      dragState.progress = Math.max(0, Math.min(1, dx / TEAR_DIST));
      applyTearProgress(dragState.progress);
      var tearStatus = byId('ft-tear-status');
      tearStatus.textContent = dragState.progress > 0.05 ? 'Continue de tirer…' : 'Ton billet est prêt à être déchiré.';
    }

    function endDrag(event) {
      if (!dragState || event.pointerId !== dragState.id) return;
      var progress = dragState.progress;
      dragState = null;
      try { stub.releasePointerCapture(event.pointerId); } catch (error) { /* ignoré */ }
      stub.classList.remove('is-dragging');
      if (progress >= 0.85) {
        completeTear(true);
        return;
      }
      // Pas assez tiré : le coupon revient en place.
      stub.classList.add('is-springing');
      applyTearProgress(0);
      byId('ft-tear-status').textContent = progress > 0.05
        ? 'Un peu plus loin ! Tire le coupon vers la droite jusqu’au bout.'
        : 'Ton billet est prêt à être déchiré.';
      window.setTimeout(function () {
        if (!dragState && !tearInProgress && !isTorn(journey)) resetTearVisuals();
      }, 320);
    }

    function newTicket() {
      if (!routeMatches(journey, selectedRoute)) return;
      selectedSeat = null;
      saveJourney(Object.assign({}, journey, {
        coachNumber: selectedCoach,
        seat: null,
        torn: false,
        stamped: false,
        savedAt: new Date().toISOString()
      }));
      resetTearVisuals();
      ticket.classList.remove('is-torn');
      updateCoachStrip(true);
      drawCabin();
      updateSeatTexts();
      showTicket();
      byId('ft-seat-status').textContent = 'Nouveau billet : choisis une place libre dans la voiture ' + pad2(selectedCoach) + '.';
    }

    // ——— Panneau des correspondances ———
    var transferPanel = byId('ft-transfers');
    var transferList = byId('ft-transfer-list');
    var transferAdd = byId('ft-transfer-add');
    var transferSummary = byId('ft-transfer-summary');

    function transferBase() {
      return selectedRoute ? selectedRoute.from + '>' + selectedRoute.to : '';
    }

    function transferVisited(upTo, legs) {
      var visited = [selectedRoute.from, selectedRoute.to];
      for (var i = 0; i < upTo; i += 1) visited.push(legs[i].to);
      return visited;
    }

    function selectEl(key, labelText, options, value, onChange) {
      var wrap = document.createElement('label');
      wrap.className = 'ft-transfer-field';
      var span = document.createElement('span');
      span.textContent = labelText;
      var select = document.createElement('select');
      options.forEach(function (option) {
        var el = document.createElement('option');
        el.value = option.value;
        el.textContent = option.label;
        select.appendChild(el);
      });
      select.value = value;
      select.dataset.key = key;
      select.addEventListener('change', function () { onChange(select.value); });
      wrap.appendChild(span);
      wrap.appendChild(select);
      return wrap;
    }

    function renderTransfers() {
      if (!transferPanel) return;
      transferPanel.classList.toggle('hidden', !selectedRoute);
      transferList.replaceChildren();
      if (!selectedRoute) return;
      var base = transferBase();
      var legs = readTransfers(base);
      var current = selectedRoute.to;

      legs.forEach(function (leg, index) {
        var options = transferOptions(current, transferVisited(index, legs));
        var li = document.createElement('li');
        li.className = 'ft-transfer';
        var head = document.createElement('div');
        head.className = 'ft-transfer-head';
        var title = document.createElement('strong');
        title.innerHTML = '<i class="fa-solid fa-mug-hot" aria-hidden="true"></i> ';
        title.appendChild(document.createTextNode('Correspondance à ' + getCity(current).name));
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'ft-transfer-remove';
        remove.setAttribute('aria-label', 'Retirer cette correspondance et les suivantes');
        remove.title = 'Retirer';
        remove.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        remove.addEventListener('click', function () {
          writeTransfers(base, legs.slice(0, index));
          afterTransferChange('add');
        });
        head.appendChild(title);
        head.appendChild(remove);
        var fields = document.createElement('div');
        fields.className = 'ft-transfer-fields';
        fields.appendChild(selectEl('break-' + index, 'Pause avant de repartir', BREAK_CHOICES.map(function (m) {
          return { value: String(m), label: m + ' min' };
        }), String(leg.breakMinutes), function (value) {
          var next = legs.slice();
          next[index] = { to: leg.to, train: leg.train, breakMinutes: Number(value) };
          writeTransfers(base, next);
          afterTransferChange('break-' + index);
        }));
        fields.appendChild(selectEl('next-' + index, 'Puis prendre', options.map(function (option) {
          return { value: option.to + '|' + option.train, label: getCity(option.to).name + ' · ' + option.train + ' · ' + formatDuration(option.minutes) };
        }), leg.to + '|' + leg.train, function (value) {
          var parts = value.split('|');
          var next = legs.slice(0, index);
          next.push({ to: parts[0], train: parts[1], breakMinutes: leg.breakMinutes });
          writeTransfers(base, next);
          afterTransferChange('next-' + index);
        }));
        li.appendChild(head);
        li.appendChild(fields);
        transferList.appendChild(li);
        current = leg.to;
      });

      var canAdd = legs.length < MAX_TRANSFERS && transferOptions(current, transferVisited(legs.length, legs)).length > 0;
      transferAdd.disabled = !canAdd;
      transferAdd.textContent = legs.length >= MAX_TRANSFERS
        ? 'Maximum de ' + MAX_TRANSFERS + ' correspondances'
        : canAdd ? '+ Ajouter une correspondance à ' + getCity(current).name : 'Aucune autre ligne depuis ' + getCity(current).name;

      if (!legs.length) {
        transferSummary.textContent = '';
      } else {
        var totals = transferTotals(selectedRoute.minutes, legs, selectedRoute.from, selectedRoute.to);
        var chain = [selectedRoute.from, selectedRoute.to].concat(legs.map(function (leg) { return leg.to; }));
        transferSummary.textContent = chain.map(function (id) { return getCity(id).name; }).join(' → ') +
          ' · ' + (legs.length + 1) + ' trains · ' + formatDuration(totals.rides) + ' de trajet + ' +
          formatDuration(totals.pauses) + ' de pause = ' + formatDuration(totals.total) + ' au total.';
      }
    }

    function afterTransferChange(focusKey) {
      renderTransfers();
      var target = focusKey === 'add' ? transferAdd : transferList.querySelector('[data-key="' + focusKey + '"]');
      if (target && !target.disabled) target.focus();
      if (journey && routeMatches(journey, selectedRoute)) showTicket();
    }

    if (transferAdd) {
      transferAdd.addEventListener('click', function () {
        if (!selectedRoute) return;
        var base = transferBase();
        var legs = readTransfers(base);
        if (legs.length >= MAX_TRANSFERS) return;
        var current = legs.length ? legs[legs.length - 1].to : selectedRoute.to;
        var options = transferOptions(current, transferVisited(legs.length, legs));
        if (!options.length) return;
        legs.push({ to: options[0].to, train: options[0].train, breakMinutes: 15 });
        writeTransfers(base, legs);
        afterTransferChange('next-' + (legs.length - 1));
      });
    }

    function drawOptions() {
      var fromCity = getCity(origin.value);
      var toCity = getCity(destination.value);
      var available = routes.filter(function (route) {
        return (route.from === origin.value && route.to === destination.value) ||
          (route.from === destination.value && route.to === origin.value);
      });
      var currentRoute = selectedRoute && selectedRoute.from === origin.value &&
        selectedRoute.to === destination.value ? selectedRoute : null;
      var savedRouteMatches = journey && journey.from === origin.value && journey.to === destination.value;
      var trainToKeep = currentRoute ? currentRoute.train : savedRouteMatches ? journey.train : null;
      optionList.replaceChildren();
      byId('ft-origin-label').textContent = fromCity ? fromCity.name : 'Départ';
      byId('ft-destination-label').textContent = toCity ? toCity.name : 'Arrivée';
      noRoute.classList.toggle('hidden', available.length > 0);
      if (!available.length && fromCity) {
        // Propose les destinations réellement disponibles depuis la gare de départ.
        var reachable = [];
        routes.forEach(function (route) {
          var other = route.from === origin.value ? route.to : route.to === origin.value ? route.from : null;
          var city = other && getCity(other);
          if (city && reachable.indexOf(city.name) === -1) reachable.push(city.name);
        });
        reachable.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
        noRoute.textContent = 'Pas de trajet direct entre ' + fromCity.name + ' et ' + (toCity ? toCity.name : 'cette ville') + '.' +
          (reachable.length ? ' Depuis ' + fromCity.name + ', tu peux aller à : ' + reachable.join(', ') + '.' : ' Essaie une autre gare de départ.');
      }
      chooseButton.disabled = available.length === 0;
      selectedRoute = null;

      available.forEach(function (route, index) {
        var routeView = {
          id: route.from + '-' + route.to + '-' + route.train,
          from: origin.value,
          to: destination.value,
          train: route.train,
          type: route.type,
          minutes: route.minutes,
          reversed: route.from !== origin.value
        };
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'ft-route-option';
        button.setAttribute('aria-pressed', 'false');
        button.innerHTML =
          '<span><span class="ft-train-name"></span><span class="ft-train-type"></span></span>' +
          '<span class="ft-duration"></span>';
        button.querySelector('.ft-train-name').textContent = route.train;
        button.querySelector('.ft-train-type').textContent = route.type;
        button.querySelector('.ft-duration').textContent = formatDuration(route.minutes);
        button.addEventListener('click', function () {
          selectRoute(routeView);
        });
        optionList.appendChild(button);
        if (route.train === trainToKeep || (!trainToKeep && index === 0)) {
          selectedRoute = routeView;
        }
      });
      updateSelectedOption();
      updateRouteStatus();
      renderJourney();
      renderTransfers();
    }

    setupCoachStrip();
    origin.addEventListener('change', drawOptions);
    destination.addEventListener('change', drawOptions);
    byId('ft-swap').addEventListener('click', function () {
      var oldOrigin = origin.value;
      origin.value = destination.value;
      destination.value = oldOrigin;
      drawOptions();
    });
    chooseButton.addEventListener('click', function () {
      if (!selectedRoute) return;
      var sameJourney = routeMatches(journey, selectedRoute);
      var nextJourney = {
        from: selectedRoute.from,
        to: selectedRoute.to,
        train: selectedRoute.train,
        trainType: selectedRoute.type,
        durationMinutes: selectedRoute.minutes,
        coachNumber: sameJourney && validCoach(journey.coachNumber) ? journey.coachNumber : null,
        seat: sameJourney && validSeat(journey.seat) ? journey.seat : null,
        cabinClass: sameJourney && journey.cabinClass ? journey.cabinClass : ((journey && journey.cabinClass) || 'standard'),
        torn: sameJourney && isTorn(journey),
        savedAt: sameJourney && journey.savedAt ? journey.savedAt : new Date().toISOString()
      };
      var saved = saveJourney(nextJourney);
      updateRouteStatus();
      renderJourney();
      if (saved) {
        byId('ft-seat-status').textContent = nextJourney.seat
          ? 'Place mémorisée : ' + seatSummary() + '.'
          : 'Trajet mémorisé. Choisis une voiture, puis une place libre.';
      }
    });

    stub.addEventListener('pointerdown', startDrag);
    stub.addEventListener('pointermove', moveDrag);
    stub.addEventListener('pointerup', endDrag);
    stub.addEventListener('pointercancel', endDrag);
    tearButton.addEventListener('click', animateTear);
    var autoSeatButton = byId('ft-auto-seat');
    if (autoSeatButton) autoSeatButton.addEventListener('click', pickSeatForMe);
    newTicketButton.addEventListener('click', newTicket);
    boardButton.addEventListener('click', function () {
      if (!routeMatches(journey, selectedRoute) || !isTorn(journey) || !validSeat(journey.seat)) return;
      window.dispatchEvent(new CustomEvent('ft:board'));
    });
    // Le module de voyage prévient quand le billet a été utilisé ou abandonné.
    window.addEventListener('ft:journey-changed', function () {
      journey = readSavedJourney();
      selectedCoach = null;
      selectedSeat = null;
      resetTearVisuals();
      drawOptions();
    });

    // --- Duration Finder & Quick Journey Discovery ---
    var currentDurationFilter = 'all';

    function getCatalogTrips() {
      return routes.map(function (r) {
        var fromCity = getCity(r.from);
        var toCity = getCity(r.to);
        return {
          from: r.from,
          to: r.to,
          fromName: fromCity ? fromCity.name : r.from,
          toName: toCity ? toCity.name : r.to,
          train: r.train,
          type: r.type,
          minutes: r.minutes
        };
      }).sort(function (a, b) {
        return a.minutes - b.minutes;
      });
    }

    function renderSuggestedTray(filter) {
      var tray = byId('ft-suggested-tray');
      var countEl = byId('ft-duration-matches-count');
      if (!tray) return;

      currentDurationFilter = filter || 'all';
      var allTrips = getCatalogTrips();
      var filtered = allTrips.filter(function (t) {
        if (currentDurationFilter === 'short') return t.minutes <= 30;
        if (currentDurationFilter === 'medium') return t.minutes > 30 && t.minutes <= 60;
        if (currentDurationFilter === 'long') return t.minutes > 60 && t.minutes <= 170;
        if (currentDurationFilter === 'marathon') return t.minutes > 170;
        return true;
      });

      if (countEl) {
        countEl.textContent = filtered.length + ' trajet' + (filtered.length > 1 ? 's' : '') + ' disponible' + (filtered.length > 1 ? 's' : '');
      }

      tray.replaceChildren();

      filtered.forEach(function (trip) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'ft-trip-card';
        var isCurrent = (origin.value === trip.from && destination.value === trip.to) ||
                        (origin.value === trip.to && destination.value === trip.from);
        if (isCurrent) card.classList.add('is-selected-card');

        card.innerHTML =
          '<div class="ft-trip-card-top">' +
            '<span class="ft-trip-duration"><i class="fa-solid fa-clock"></i> ' + formatDuration(trip.minutes) + '</span>' +
            '<span class="ft-trip-train">' + trip.train + '</span>' +
          '</div>' +
          '<div class="ft-trip-route">' +
            '<strong>' + trip.fromName + '</strong> <i class="fa-solid fa-arrow-right"></i> <strong>' + trip.toName + '</strong>' +
          '</div>';

        card.addEventListener('click', function () {
          window.selectSuggestedTrip(trip.from, trip.to, trip.train);
        });

        tray.appendChild(card);
      });
    }

    window.filterTrainDuration = function (range) {
      var chips = document.querySelectorAll('.ft-dur-chip');
      chips.forEach(function (chip) {
        chip.classList.toggle('is-active', chip.getAttribute('data-range') === range);
      });
      renderSuggestedTray(range);
    };

    window.selectSuggestedTrip = function (from, to, trainName) {
      origin.value = from;
      destination.value = to;
      drawOptions();

      // Find and select the matching train in optionList
      var buttons = optionList.querySelectorAll('.ft-route-option');
      for (var i = 0; i < buttons.length; i++) {
        var trainNameEl = buttons[i].querySelector('.ft-train-name');
        if (trainNameEl && (!trainName || trainNameEl.textContent === trainName)) {
          buttons[i].click();
          break;
        }
      }

      // Highlight active card in tray
      var cards = document.querySelectorAll('.ft-trip-card');
      cards.forEach(function (c) {
        var rText = c.querySelector('.ft-trip-route');
        var fromCity = getCity(from);
        var toCity = getCity(to);
        var isMatch = rText && fromCity && toCity &&
          rText.textContent.indexOf(fromCity.name) !== -1 &&
          rText.textContent.indexOf(toCity.name) !== -1;
        c.classList.toggle('is-selected-card', Boolean(isMatch));
      });
    };

    drawOptions();
    renderSuggestedTray('all');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
