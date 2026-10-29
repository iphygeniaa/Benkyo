/* Focus Train — étapes 3 à 5 : embarquement, voyage en temps réel sur la carte du Japon, arrivée.
   Lit et complète le billet enregistré par focus-train.js (clé benkyo_focus_train_journey_v1). */
(function () {
  'use strict';

  var KEY = 'benkyo_focus_train_journey_v1';
  var HISTORY_KEY = 'benkyo_focus_train_history_v1';
  var NS = 'http://www.w3.org/2000/svg';

  // Projection simple : 1 degré de latitude = 100 unités, longitude corrigée pour la latitude de Honshū.
  var SCALE = 100;
  var COS = 0.81;
  var LON0 = 129;
  var LAT0 = 46;
  function project(lon, lat) {
    return [(lon - LON0) * COS * SCALE, (LAT0 - lat) * SCALE];
  }

  var CITIES = {
    tokyo: { name: 'Tokyo', jp: '東京', lon: 139.77, lat: 35.68 },
    yokohama: { name: 'Yokohama', jp: '横浜', lon: 139.62, lat: 35.47 },
    kamakura: { name: 'Kamakura', jp: '鎌倉', lon: 139.55, lat: 35.32 },
    nagoya: { name: 'Nagoya', jp: '名古屋', lon: 136.91, lat: 35.17 },
    kyoto: { name: 'Kyoto', jp: '京都', lon: 135.76, lat: 35.01 },
    nara: { name: 'Nara', jp: '奈良', lon: 135.82, lat: 34.68 },
    osaka: { name: 'Osaka', jp: '大阪', lon: 135.50, lat: 34.73 },
    kobe: { name: 'Kobe', jp: '神戸', lon: 135.20, lat: 34.71 },
    himeji: { name: 'Himeji', jp: '姫路', lon: 134.69, lat: 34.83 },
    okayama: { name: 'Okayama', jp: '岡山', lon: 133.92, lat: 34.67 },
    hiroshima: { name: 'Hiroshima', jp: '広島', lon: 132.46, lat: 34.39 },
    fukuoka: { name: 'Fukuoka', jp: '福岡', lon: 130.42, lat: 33.59 },
    kumamoto: { name: 'Kumamoto', jp: '熊本', lon: 130.69, lat: 32.79 },
    kagoshima: { name: 'Kagoshima', jp: '鹿児島', lon: 130.54, lat: 31.60 },
    kanazawa: { name: 'Kanazawa', jp: '金沢', lon: 136.65, lat: 36.56 },
    toyama: { name: 'Toyama', jp: '富山', lon: 137.21, lat: 36.70 },
    nagano: { name: 'Nagano', jp: '長野', lon: 138.19, lat: 36.65 },
    niigata: { name: 'Niigata', jp: '新潟', lon: 139.06, lat: 37.91 },
    sendai: { name: 'Sendai', jp: '仙台', lon: 140.87, lat: 38.26 },
    morioka: { name: 'Morioka', jp: '盛岡', lon: 141.14, lat: 39.70 },
    aomori: { name: 'Aomori', jp: '青森', lon: 140.69, lat: 40.83 },
    hakodate: { name: 'Hakodate', jp: '函館', lon: 140.65, lat: 41.90 }
  };

  // Lignes de Shinkansen / JR : les trajets proposés suivent ces tracés, gare par gare.
  // Gares intermédiaires : [nom, longitude, latitude]. Les villes du jeu (CITIES) sont des gares aussi.
  var STATIONS = {
    ueno: ['Ueno', 139.777, 35.713], omiya: ['Ōmiya', 139.624, 35.906], shinyokohama: ['Shin-Yokohama', 139.617, 35.507],
    odawara: ['Odawara', 139.155, 35.256], atami: ['Atami', 139.078, 35.104], mishima: ['Mishima', 138.911, 35.127],
    shinfuji: ['Shin-Fuji', 138.664, 35.139], shizuoka: ['Shizuoka', 138.389, 34.972], kakegawa: ['Kakegawa', 137.998, 34.769],
    hamamatsu: ['Hamamatsu', 137.735, 34.704], toyohashi: ['Toyohashi', 137.382, 34.763], mikawaanjo: ['Mikawa-Anjō', 137.062, 34.970],
    gifuhashima: ['Gifu-Hashima', 136.690, 35.315], maibara: ['Maibara', 136.290, 35.314],
    aioi: ['Aioi', 134.470, 34.806], fukuyama: ['Fukuyama', 133.362, 34.489], higashihiroshima: ['Higashi-Hiroshima', 132.744, 34.427],
    shiniwakuni: ['Shin-Iwakuni', 132.162, 34.166], tokuyama: ['Tokuyama', 131.806, 34.052], shinyamaguchi: ['Shin-Yamaguchi', 131.433, 34.092],
    shinshimonoseki: ['Shin-Shimonoseki', 130.945, 33.976], kokura: ['Kokura', 130.883, 33.887], shintosu: ['Shin-Tosu', 130.508, 33.366],
    shinyatsushiro: ['Shin-Yatsushiro', 130.617, 32.502], satsumasendai: ['Satsuma-Sendai', 130.205, 31.825],
    oyama: ['Oyama', 139.800, 36.312], utsunomiya: ['Utsunomiya', 139.906, 36.559], nasushiobara: ['Nasu-Shiobara', 140.011, 36.965],
    shinshirakawa: ['Shin-Shirakawa', 140.200, 37.117], koriyama: ['Kōriyama', 140.388, 37.398], fukushima: ['Fukushima', 140.459, 37.754],
    shiroishi: ['Shiroishi-Zaō', 140.620, 38.002], furukawa: ['Furukawa', 140.956, 38.575], ichinoseki: ['Ichinoseki', 141.134, 38.934],
    mizusawa: ['Mizusawa-Esashi', 141.139, 39.141], kitakami: ['Kitakami', 141.136, 39.290], shinhanamaki: ['Shin-Hanamaki', 141.122, 39.397],
    ninohe: ['Ninohe', 141.303, 40.272], hachinohe: ['Hachinohe', 141.417, 40.510], imabetsu: ['Okutsugaru-Imabetsu', 140.452, 41.181],
    kikonai: ['Kikonai', 140.436, 41.675],
    kumagaya: ['Kumagaya', 139.381, 36.140], honjowaseda: ['Honjō-Waseda', 139.190, 36.221], takasaki: ['Takasaki', 139.012, 36.322],
    annakaharuna: ['Annaka-Haruna', 138.838, 36.343], karuizawa: ['Karuizawa', 138.634, 36.343], sakudaira: ['Sakudaira', 138.480, 36.272],
    ueda: ['Ueda', 138.253, 36.392], iiyama: ['Iiyama', 138.364, 36.850], joetsu: ['Jōetsumyōkō', 138.250, 37.050],
    itoigawa: ['Itoigawa', 137.862, 37.043], kurobe: ['Kurobe-Unazukionsen', 137.462, 36.873], shintakaoka: ['Shin-Takaoka', 136.985, 36.714],
    echigoyuzawa: ['Echigo-Yuzawa', 138.810, 36.931], nagaoka: ['Nagaoka', 138.854, 37.447], tsubamesanjo: ['Tsubame-Sanjō', 138.882, 37.640],
    ofuna: ['Ōfuna', 139.531, 35.354]
  };
  function line(ids) {
    return ids.map(function (id) { return CITIES[id] ? [id] : [id].concat(STATIONS[id]); });
  }
  var LINES = [
    // Tōkaidō · San'yō · Kyūshū Shinkansen
    line(['tokyo', 'shinyokohama', 'odawara', 'atami', 'mishima', 'shinfuji', 'shizuoka', 'kakegawa', 'hamamatsu', 'toyohashi',
      'mikawaanjo', 'nagoya', 'gifuhashima', 'maibara', 'kyoto', 'osaka', 'kobe', 'himeji', 'aioi', 'okayama', 'fukuyama',
      'higashihiroshima', 'hiroshima', 'shiniwakuni', 'tokuyama', 'shinyamaguchi', 'shinshimonoseki', 'kokura', 'fukuoka',
      'shintosu', 'kumamoto', 'shinyatsushiro', 'satsumasendai', 'kagoshima']),
    // Tōhoku · Hokkaidō Shinkansen
    line(['tokyo', 'ueno', 'omiya', 'oyama', 'utsunomiya', 'nasushiobara', 'shinshirakawa', 'koriyama', 'fukushima', 'shiroishi',
      'sendai', 'furukawa', 'ichinoseki', 'mizusawa', 'kitakami', 'shinhanamaki', 'morioka', 'ninohe', 'hachinohe', 'aomori',
      'imabetsu', 'kikonai', 'hakodate']),
    // Hokuriku Shinkansen
    line(['tokyo', 'ueno', 'omiya', 'kumagaya', 'honjowaseda', 'takasaki', 'annakaharuna', 'karuizawa', 'sakudaira', 'ueda',
      'nagano', 'iiyama', 'joetsu', 'itoigawa', 'kurobe', 'toyama', 'shintakaoka', 'kanazawa']),
    // Jōetsu Shinkansen
    line(['tokyo', 'ueno', 'omiya', 'kumagaya', 'honjowaseda', 'takasaki', 'echigoyuzawa', 'nagaoka', 'tsubamesanjo', 'niigata']),
    // Ligne Yokosuka (JR)
    line(['tokyo', 'yokohama', 'ofuna', 'kamakura'])
  ];

  // Contours très simplifiés (longitude, latitude) : une carte stylisée, pas un relevé précis.
  var LAND = [
    [[141.3,41.4],[140.9,41.2],[140.85,40.8],[140.3,41.2],[140.0,40.6],[140.0,40.0],[139.7,39.9],[139.95,39.4],[139.85,38.9],[139.4,38.3],[139.25,38.0],[138.8,37.8],[138.3,37.3],[137.8,37.1],[137.35,37.5],[137.0,37.3],[136.8,36.8],[136.4,36.3],[136.0,35.9],[135.7,35.6],[135.2,35.6],[134.7,35.65],[134.0,35.55],[133.2,35.5],[132.6,35.4],[132.1,35.1],[131.5,34.7],[131.0,34.4],[130.95,34.0],[131.5,34.0],[132.0,33.95],[132.3,34.25],[132.9,34.2],[133.4,34.35],[133.9,34.45],[134.4,34.65],[135.0,34.65],[135.4,34.6],[135.1,34.2],[135.1,33.75],[135.5,33.5],[135.75,33.45],[136.0,33.7],[136.35,34.15],[136.85,34.3],[137.3,34.6],[137.7,34.6],[138.2,34.6],[138.4,34.85],[138.5,34.97],[138.75,34.85],[138.85,34.6],[139.1,34.75],[139.1,35.1],[139.15,35.2],[139.55,35.2],[139.62,35.15],[139.68,35.4],[139.75,35.55],[139.9,35.65],[140.1,35.55],[139.95,35.1],[139.85,34.95],[140.3,35.2],[140.65,35.7],[140.65,36.2],[140.6,36.7],[140.85,37.3],[141.0,37.8],[141.0,38.1],[141.5,38.3],[141.45,38.5],[141.6,38.9],[141.95,39.1],[141.95,39.6],[141.8,40.0],[141.85,40.5],[141.45,40.7],[141.4,41.2]],
    [[130.95,33.95],[131.4,33.7],[131.7,33.6],[131.95,33.2],[131.8,32.7],[131.45,32.0],[131.4,31.5],[131.1,31.3],[130.7,31.0],[130.3,31.25],[130.2,31.6],[130.3,32.2],[130.15,32.7],[130.4,33.0],[129.9,32.75],[129.75,33.15],[129.8,33.55],[130.2,33.65],[130.6,33.9]],
    [[132.45,33.9],[133.0,34.1],[133.6,34.3],[134.2,34.3],[134.65,34.2],[134.7,33.85],[134.3,33.6],[134.2,33.25],[133.6,33.4],[133.15,32.9],[132.9,32.75],[132.5,32.95],[132.45,33.4],[132.65,33.7]],
    [[140.0,41.5],[140.3,41.8],[140.7,41.75],[141.2,41.8],[141.3,42.4],[142.0,42.3],[142.9,42.6],[143.3,42.0],[144.0,42.9],[145.3,43.3],[145.5,43.4],[144.4,43.9],[145.2,44.3],[144.2,44.1],[143.0,44.8],[142.0,45.4],[141.65,45.1],[141.7,44.2],[141.3,43.2],[140.45,43.2],[140.3,42.6],[140.0,42.2]]
  ];

  function byId(id) { return document.getElementById(id); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  function readJourney() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (error) { return null; }
  }
  function writeJourney(journey) {
    try { localStorage.setItem(KEY, JSON.stringify(journey)); return true; } catch (error) { return false; }
  }
  function readHistory() {
    try {
      var list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (error) { return []; }
  }
  function pushHistory(entry) {
    var list = readHistory();
    list.unshift(entry);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 300))); } catch (error) { /* ignoré */ }
  }

  function formatDuration(minutes) {
    var total = Math.max(0, Math.round(minutes));
    var hours = Math.floor(total / 60);
    var rest = total % 60;
    if (!hours) return rest + ' min';
    return hours + ' h ' + pad2(rest);
  }
  function formatCountdown(ms) {
    var seconds = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    return h + ':' + pad2(m) + ':' + pad2(s);
  }
  function formatClock(timestamp) {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  // ——— Pause & retard ———
  // Le temps du voyage = temps réel écoulé − retard accumulé. Pendant une pause le temps est figé ;
  // à la reprise, la durée de la pause s'ajoute à `delayMs` et toutes les heures affichées (arrivée, gares) sont repoussées.
  function delayOf(journey) { return Math.max(0, Number(journey && journey.delayMs) || 0); }
  function elapsedOf(journey, now) {
    var t = now || Date.now();
    return (journey.pausedAt ? journey.pausedAt : t) - journey.departedAt - delayOf(journey);
  }
  function liveDelay(journey, now) {
    var t = now || Date.now();
    return delayOf(journey) + (journey.pausedAt ? Math.max(0, t - journey.pausedAt) : 0);
  }
  // Heure réelle du « temps 0 » du voyage, retard compris : horaire d'une gare = clockStart + st.time.
  function clockStart(journey, now) { return journey.departedAt + liveDelay(journey, now); }
  function delayMinutes(ms) { return Math.round(ms / 60000); }
  function delayWords(ms) {
    var m = delayMinutes(ms);
    return m < 1 ? 'moins d’une minute' : (m === 1 ? '1 minute' : m + ' minutes');
  }
  function formatMmSs(ms) {
    var sec = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(sec / 60) + ':' + pad2(sec % 60);
  }

  function reducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function seatSide(seat) {
    var letter = String(seat).slice(-1);
    return letter === 'A' || letter === 'D' ? 'côté fenêtre' : 'côté couloir';
  }

  // ——— Tracé du trajet ———
  function stationOf(entry) {
    var city = CITIES[entry[0]];
    if (city) return { id: entry[0], name: city.name, lon: city.lon, lat: city.lat, isCity: true };
    return { id: entry[0], name: entry[1], lon: entry[2], lat: entry[3], isCity: false };
  }

  function routeStations(fromId, toId) {
    for (var i = 0; i < LINES.length; i += 1) {
      var ids = LINES[i].map(function (entry) { return entry[0]; });
      var a = ids.indexOf(fromId);
      var b = ids.indexOf(toId);
      if (a !== -1 && b !== -1 && a !== b) {
        var slice = LINES[i].slice(Math.min(a, b), Math.max(a, b) + 1).map(stationOf);
        return a < b ? slice : slice.reverse();
      }
    }
    // Pas de ligne commune (ex. Sendai → Kyoto) : on passe par Tokyo, comme en vrai, si les deux villes sont sur une ligne.
    if (fromId !== 'tokyo' && toId !== 'tokyo' && onAnyLine(fromId) && onAnyLine(toId)) {
      var first = routeStations(fromId, 'tokyo');
      var second = routeStations('tokyo', toId);
      if (first.length > 2 && second.length > 2) return first.concat(second.slice(1));
    }
    return [fromId, toId].map(function (id) { return stationOf([id]); });
  }

  function onAnyLine(id) {
    return LINES.some(function (entries) { return entries.some(function (entry) { return entry[0] === id; }); });
  }


  function unproject(p) {
    return [LAT0 - p[1] / SCALE, LON0 + p[0] / (COS * SCALE)];
  }

  // ——— Étapes du voyage (trajets + pauses de correspondance) ———
  // Un voyage simple = un seul trajet. Avec correspondances, journey.plan.legs liste chaque train
  // (avec sa voiture, sa place et la pause qui le suit) : les pauses servent de temps de repos entre deux sessions.
  function legsOf(journey) {
    if (journey.plan && Array.isArray(journey.plan.legs) && journey.plan.legs.length) return journey.plan.legs;
    return [{ from: journey.from, to: journey.to, train: journey.train, trainType: journey.trainType,
      minutes: journey.durationMinutes, coach: journey.coachNumber, seat: journey.seat, breakAfter: 0 }];
  }
  function totalMinutes(journey) {
    return legsOf(journey).reduce(function (sum, leg) { return sum + leg.minutes + (leg.breakAfter || 0); }, 0);
  }
  function finalCityId(journey) {
    var legs = legsOf(journey);
    return legs[legs.length - 1].to;
  }
  function segmentsOf(journey) {
    var segments = [];
    var t = 0;
    var legs = legsOf(journey);
    legs.forEach(function (leg, index) {
      segments.push({ kind: 'ride', leg: index, start: t * 60000, end: (t + leg.minutes) * 60000 });
      t += leg.minutes;
      if (leg.breakAfter && index < legs.length - 1) {
        segments.push({ kind: 'break', leg: index, start: t * 60000, end: (t + leg.breakAfter) * 60000 });
        t += leg.breakAfter;
      }
    });
    return segments;
  }
  // Temps de focus réellement passé en train (les pauses de correspondance ne comptent pas).
  function focusMinutesElapsed(journey, elapsedMs) {
    var sum = 0;
    segmentsOf(journey).forEach(function (segment) {
      if (segment.kind !== 'ride') return;
      sum += Math.max(0, Math.min(segment.end, elapsedMs) - segment.start);
    });
    return Math.round(sum / 60000);
  }
  function segmentIndexAt(segments, elapsed) {
    for (var i = 0; i < segments.length; i += 1) {
      if (elapsed < segments[i].end) return i;
    }
    return segments.length - 1;
  }

  // Tracé en segments droits gare à gare (les Shinkansen sont quasi rectilignes entre deux gares) :
  // le train passe exactement par chaque gare, ce qui reste juste même en zoomant très près.
  function buildRoute(journey) {
    var legs = legsOf(journey);
    var stations = [];
    var ranges = [];
    legs.forEach(function (leg) {
      var part = routeStations(leg.from, leg.to);
      var startIndex = stations.length ? stations.length - 1 : 0;
      if (stations.length) part = part.slice(1);
      stations = stations.concat(part);
      ranges.push({ startIndex: startIndex, endIndex: stations.length - 1 });
    });
    var points = stations.map(function (st) { return project(st.lon, st.lat); });
    var cumulative = [0];
    for (var i = 1; i < points.length; i += 1) {
      cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
    var total = cumulative[cumulative.length - 1] || 1;
    stations.forEach(function (st, index) {
      st.point = points[index];
      st.latlng = [st.lat, st.lon];
      st.fraction = index === 0 ? 0 : index === stations.length - 1 ? 1 : cumulative[index] / total;
      st.transfer = 0;
    });
    // Distance réelle (km) de chaque tronçon, pour afficher une vitesse cohérente avec le déplacement sur la carte.
    stations.forEach(function (st, index) {
      var nx = stations[index + 1];
      st.kmNext = nx ? haversineKm(st.lat, st.lon, nx.lat, nx.lon) : 0;
    });
    // Heure (en ms depuis le départ) à laquelle le train atteint chaque gare. Le train s'ARRÊTE réellement dans chaque gare
    // intermédiaire (st.dwell) : arrivée = st.arriveT, départ = st.departT. Pause de correspondance en fin de trajet.
    var segments = segmentsOf(journey);
    ranges.forEach(function (range, legIndex) {
      var ride = segments.filter(function (seg) { return seg.kind === 'ride' && seg.leg === legIndex; })[0];
      var rideMs = ride.end - ride.start;
      var inter = Math.max(0, range.endIndex - range.startIndex - 1);
      var dwell = inter ? Math.min(Math.max(rideMs * 0.025, STOP_MIN_MS), STOP_MAX_MS, rideMs * 0.25 / inter) : 0;
      var moving = rideMs - inter * dwell;
      var span = (cumulative[range.endIndex] - cumulative[range.startIndex]) || 1;
      stations[range.startIndex].departT = ride.start;
      stations[range.startIndex].time = ride.start;
      var t = ride.start;
      for (var k = range.startIndex + 1; k <= range.endIndex; k += 1) {
        var segMs = moving * ((cumulative[k] - cumulative[k - 1]) / span);
        stations[k - 1].segMs = segMs;
        t += segMs;
        stations[k].arriveT = t;
        stations[k].time = t;
        if (k < range.endIndex) { stations[k].dwell = dwell; t += dwell; stations[k].departT = t; }
      }
      stations[range.endIndex].arriveT = ride.end;
      stations[range.endIndex].time = ride.end;
      if (legIndex < legs.length - 1 && legs[legIndex].breakAfter) stations[range.endIndex].transfer = legs[legIndex].breakAfter;
    });
    return { stations: stations, dense: points, cumulative: cumulative, total: total, ranges: ranges, segments: segments };
  }

  // Distance entre deux points GPS (km).
  function haversineKm(lat1, lon1, lat2, lon2) {
    var rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // Arrêt en gare intermédiaire : durée mini / maxi (ms). Compté dans la durée du trajet (le temps de focus ne change pas).
  var STOP_MIN_MS = 30000;
  var STOP_MAX_MS = 90000;

  // Profil trapézoïdal : le train accélère en quittant une gare, roule à vitesse de croisière, puis freine avant la suivante.
  // u = avancement (0→1) du tronçon ; renvoie la position s (0→1) et la vitesse relative ds/du (1 = vitesse moyenne du tronçon).
  function easeSegment(u, r) {
    u = Math.max(0, Math.min(1, u));
    var k = r * (1 - r) * 2;
    if (u < r) return { s: u * u / k, v: 2 * u / k };
    if (u > 1 - r) return { s: 1 - (1 - u) * (1 - u) / k, v: 2 * (1 - u) / k };
    return { s: r / (2 * (1 - r)) + (u - r) / (1 - r), v: 1 / (1 - r) };
  }

  // Où est le train à cet instant ? fraction de la distance totale, vitesse (km/h) et état (à l'arrêt / en gare n° …).
  function motionAt(route, elapsed) {
    var segment = route.segments[segmentIndexAt(route.segments, elapsed)];
    var range = route.ranges[segment.leg];
    var cum = route.cumulative;
    var st = route.stations;
    if (segment.kind === 'break') return { fraction: cum[range.endIndex] / route.total, speed: 0, stopped: true, station: range.endIndex, onBreak: true };
    for (var k = range.startIndex; k < range.endIndex; k += 1) {
      if (k > range.startIndex && elapsed < st[k].departT) {
        return { fraction: cum[k] / route.total, speed: 0, stopped: true, station: k, onBreak: false };
      }
      var segMs = st[k].segMs || 1;
      var t0 = st[k].departT;
      if (elapsed < t0 + segMs) {
        var u = (elapsed - t0) / segMs;
        var r = Math.min(0.3, 100000 / segMs);
        var e = easeSegment(u, r);
        var dist = cum[k] + (cum[k + 1] - cum[k]) * e.s;
        var kmh = (st[k].kmNext / (segMs / 3600000)) * e.v;
        return { fraction: dist / route.total, speed: kmh, stopped: false, station: -1, onBreak: false };
      }
    }
    return { fraction: cum[range.endIndex] / route.total, speed: 0, stopped: true, station: range.endIndex, onBreak: false };
  }

  function distanceFractionAt(route, elapsed) {
    return motionAt(route, elapsed).fraction;
  }

  function pointAtFraction(route, fraction) {
    var target = Math.max(0, Math.min(1, fraction)) * route.total;
    var cum = route.cumulative;
    var lo = 0;
    var hi = cum.length - 1;
    while (hi - lo > 1) {
      var m = (lo + hi) >> 1;
      if (cum[m] <= target) lo = m; else hi = m;
    }
    var span = cum[hi] - cum[lo] || 1;
    var t = Math.max(0, Math.min(1, (target - cum[lo]) / span));
    var a = route.dense[lo];
    var b = route.dense[hi];
    var x = a[0] + (b[0] - a[0]) * t;
    var y = a[1] + (b[1] - a[1]) * t;
    return {
      x: x,
      y: y,
      latlng: unproject([x, y]),
      angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI,
      index: lo
    };
  }

  // Partie du tracé déjà parcourue, en coordonnées [lat, lon].
  function travelledLatLngs(route, fraction) {
    var at = pointAtFraction(route, fraction);
    var out = route.stations.slice(0, at.index + 1).map(function (st) { return st.latlng; });
    out.push(at.latlng);
    return out;
  }

  // ——— État de l'écran ———
  var shell = null;
  var els = {};
  var tickTimer = null;
  var boardingTimers = [];
  var map = null;
  var viewMode = 'route';

  function journeyStage(journey) {
    if (!journey || !journey.departedAt) return 'plan';
    return elapsedOf(journey) >= totalMinutes(journey) * 60000 ? 'arrived' : 'travel';
  }

  function setStage(stage) {
    shell.setAttribute('data-ft-stage', stage);
    els.boarding.classList.toggle('hidden', stage !== 'boarding');
    els.travel.classList.toggle('hidden', stage !== 'travel');
    els.arrived.classList.toggle('hidden', stage !== 'arrived');
    renderHistory(stage);
  }

  function stopTick() {
    if (tickTimer) { window.clearInterval(tickTimer); tickTimer = null; }
  }

  function startTick() {
    stopTick();
    tick();
    tickTimer = window.setInterval(tick, 500);
  }

  // ——— Carte (Leaflet + fonds de carte OpenStreetMap) ———
  var LAYER_KEY = 'benkyo_focus_train_map_layer_v1';
  var RAIL_KEY = 'benkyo_focus_train_map_rail_v1';
  var JAPAN_BOUNDS = [[30.6, 128.6], [45.9, 146.6]];
  var FOLLOW_ZOOM = 9;

  function readSetting(key) {
    try { return localStorage.getItem(key) || ''; } catch (error) { return ''; }
  }
  function writeSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* ignoré */ }
  }

  function destroyMap() {
    if (map) {
      try { map.lmap.remove(); } catch (error) { /* ignoré */ }
      map = null;
    }
    if (els.mapNote) els.mapNote.classList.add('hidden');
  }

  function showMapNote(text) {
    if (!els.mapNote) return;
    els.mapNote.textContent = text || '';
    els.mapNote.classList.toggle('hidden', !text);
  }

  function makeBaseLayers(onTile) {
    var osm = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
    function tiles(url, options) {
      var layer = L.tileLayer(url, options);
      layer.on('tileload', function () { onTile(true); });
      layer.on('tileerror', function () { onTile(false); });
      return layer;
    }
    // Fonds Esri (sans clé d'API) : CARTO impose désormais une clé et estampille « API KEY REQUIRED » sur ses tuiles.
    var esri = 'Fond de carte © Esri, HERE, Garmin, OpenStreetMap contributors';
    var plan = tiles('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18, maxNativeZoom: 19, attribution: esri
    });
    var satellite = L.layerGroup([
      tiles('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18, maxNativeZoom: 19, attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics'
      }),
      tiles('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18, maxNativeZoom: 19, attribution: 'Noms © Esri'
      })
    ]);
    var relief = tiles('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc', maxZoom: 18, maxNativeZoom: 17,
      attribution: osm + ' · © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a>'
    });
    var rail = tiles('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
      subdomains: 'abc', maxZoom: 18, maxNativeZoom: 19, opacity: 0.85,
      attribution: '© <a href="https://www.openrailwaymap.org" target="_blank" rel="noopener">OpenRailwayMap</a>'
    });
    return { bases: { 'Plan': plan, 'Satellite': satellite, 'Relief': relief }, rail: rail };
  }

  // Pastille ronde avec un Shinkansen vu de face : lisible à tout zoom, sans rotation du dessin.
  // Une petite flèche autour de la pastille indique la direction ; pendant une pause, la pastille devient une tasse.
  function trainIcon() {
    var train = '<svg class="ft-train-glyph" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M12 2.5c-4.6 0-7 1.3-7 4.2v8.1c0 1.6 1.1 2.7 2.7 2.7h8.6c1.6 0 2.7-1.1 2.7-2.7V6.7c0-2.9-2.4-4.2-7-4.2z" fill="#fff"/>' +
      '<path d="M7.4 6.3c0-.9 1.3-1.4 4.6-1.4s4.6.5 4.6 1.4v3.9c0 .6-.4 1-1 1H8.4c-.6 0-1-.4-1-1V6.3z" fill="#be185d"/>' +
      '<circle cx="8.9" cy="14.2" r="1.2" fill="#be185d"/><circle cx="15.1" cy="14.2" r="1.2" fill="#be185d"/>' +
      '<path d="M7 19.5l-1.7 2M17 19.5l1.7 2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';
    var cup = '<svg class="ft-train-cup" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M5 9h11v5.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5V9z" fill="#fff"/>' +
      '<path d="M16 10.5h1.6a2.2 2.2 0 0 1 0 4.4H16" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M8 3.2c-.8 1 .8 1.6 0 2.8M12 3.2c-.8 1 .8 1.6 0 2.8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
    return L.divIcon({
      className: 'ft-train-icon',
      html: '<span class="ft-train-halo"></span>' +
        '<span class="ft-train-dir"><span class="ft-train-arrow"></span></span>' +
        '<span class="ft-train-disc">' + train + cup + '</span>',
      iconSize: [60, 60],
      iconAnchor: [30, 30]
    });
  }

  function buildMap(journey) {
    destroyMap();
    if (!window.L) {
      showMapNote('La carte n’a pas pu se charger. Le trajet continue : le compte à rebours reste exact.');
      return;
    }
    var route = buildRoute(journey);
    var lmap = L.map(els.map, {
      minZoom: 5, maxZoom: 18, zoomSnap: 0.25, zoomDelta: 1, wheelPxPerZoomLevel: 90,
      maxBounds: [[22, 121], [49, 153]], maxBoundsViscosity: 0.7, attributionControl: true
    });
    lmap.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    lmap.setView([36.2, 138], 6);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(lmap);

    var state = { lmap: lmap, route: route, pendingView: false, passed: 0, tilesOk: false, tileErrors: 0, markers: [] };
    map = state;

    // Fond de secours : si les tuiles ne se chargent pas (hors ligne), le contour du Japon reste visible dessous.
    lmap.createPane('ftland');
    lmap.getPane('ftland').style.zIndex = 150;
    LAND.forEach(function (polygon) {
      L.polygon(polygon.map(function (p) { return [p[1], p[0]]; }), {
        pane: 'ftland', color: '#a9b4cc', weight: 1, fillColor: '#ffffff', fillOpacity: 1, interactive: false
      }).addTo(lmap);
    });

    var layers = makeBaseLayers(function (ok) {
      if (map !== state) return;
      if (ok) {
        state.tilesOk = true;
        showMapNote('');
      } else {
        state.tileErrors += 1;
        if (!state.tilesOk && state.tileErrors >= 4) showMapNote('Fond de carte indisponible (connexion ?). Le trajet reste affiché et le voyage continue.');
      }
    });
    var chosen = readSetting(LAYER_KEY);
    if (!layers.bases[chosen]) chosen = 'Plan';
    layers.bases[chosen].addTo(lmap);
    if (readSetting(RAIL_KEY) === '1') layers.rail.addTo(lmap);
    L.control.layers(layers.bases, { 'Voies ferrées': layers.rail }, { position: 'topright', collapsed: true }).addTo(lmap);
    lmap.on('baselayerchange', function (event) { writeSetting(LAYER_KEY, event.name); });
    lmap.on('overlayadd', function () { writeSetting(RAIL_KEY, '1'); });
    lmap.on('overlayremove', function () { writeSetting(RAIL_KEY, '0'); });

    // Tracé : liseré blanc dessous pour rester lisible sur le plan comme sur le satellite.
    var latlngs = route.stations.map(function (st) { return st.latlng; });
    var round = { lineCap: 'round', lineJoin: 'round', interactive: false };
    L.polyline(latlngs, Object.assign({ color: '#ffffff', weight: 8, opacity: 0.85 }, round)).addTo(lmap);
    L.polyline(latlngs, Object.assign({ color: '#475569', weight: 3.5, opacity: 0.9, dashArray: '8 8' }, round)).addTo(lmap);
    state.doneCasing = L.polyline([], Object.assign({ color: '#ffffff', weight: 10, opacity: 0.85 }, round)).addTo(lmap);
    state.done = L.polyline([], Object.assign({ color: '#be185d', weight: 6, opacity: 0.95 }, round)).addTo(lmap);

    // Autres villes du jeu (hors trajet) : petit point, nom au survol / au toucher.
    var routeIds = route.stations.map(function (st) { return st.id; });
    Object.keys(CITIES).forEach(function (id) {
      if (routeIds.indexOf(id) !== -1) return;
      var city = CITIES[id];
      L.circleMarker([city.lat, city.lon], { radius: 4, color: '#8b95ab', weight: 1.5, fillColor: '#d5dbea', fillOpacity: 1 })
        .bindTooltip(city.name + ' ' + city.jp, { direction: 'right', offset: [6, 0], className: 'ft-tip' })
        .addTo(lmap);
    });

    // Gares du trajet : les noms apparaissent progressivement quand on zoome.
    route.stations.forEach(function (st, index) {
      var isEnd = index === 0 || index === route.stations.length - 1;
      var isTransfer = !isEnd && st.transfer > 0;
      var kind = isEnd ? 'end' : (isTransfer ? 'transfer' : (st.isCity ? 'city' : 'minor'));
      var big = isEnd || isTransfer;
      var label = CITIES[st.id] ? st.name + ' ' + CITIES[st.id].jp : st.name;
      if (isTransfer) label += ' · pause ' + st.transfer + ' min';
      var marker = L.circleMarker(st.latlng, {
        radius: isEnd ? 7 : (isTransfer ? 7 : (st.isCity ? 5 : 3.5)),
        color: isEnd ? '#be185d' : (isTransfer ? '#d97706' : '#64748b'), weight: big ? 3.5 : 2, fillColor: '#ffffff', fillOpacity: 1
      }).bindTooltip(label, {
        permanent: true, direction: 'auto', offset: [big ? 9 : 6, 0], className: 'ft-tip ft-tip-' + kind
      }).addTo(lmap);
      state.markers.push({ marker: marker, fraction: st.fraction, isEnd: isEnd, isTransfer: isTransfer });
    });

    state.train = L.marker(route.stations[0].latlng, { icon: trainIcon(), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(lmap);
    var trainEl = state.train.getElement();
    state.trainEl = trainEl;
    state.trainDir = trainEl ? trainEl.querySelector('.ft-train-dir') : null;

    function updateLabelLevels() {
      var zoom = lmap.getZoom();
      var container = lmap.getContainer();
      container.classList.toggle('ft-map--far', zoom < 7);
      container.classList.toggle('ft-map--mid', zoom < 8.5);
    }
    lmap.on('zoomend', updateLabelLevels);
    updateLabelLevels();

    // Dès que la personne déplace la carte à la main, on arrête de la recadrer toute seule.
    lmap.on('dragstart', function () {
      viewMode = null;
      updateViewButtons();
    });

    viewMode = 'route';
    updateViewButtons();
    positionTrain();
    applyView('route', false);
  }

  function applyView(mode, animate) {
    if (!map || !mode) return;
    var lmap = map.lmap;
    var size = lmap.getSize();
    if (!size.x || !size.y) { map.pendingView = true; return; }
    map.pendingView = false;
    var smooth = animate !== false && !reducedMotion();
    var at = pointAtFraction(map.route, lastFraction);
    if (mode === 'follow') {
      if (smooth) lmap.flyTo(at.latlng, Math.max(lmap.getZoom(), FOLLOW_ZOOM), { duration: 0.9 });
      else lmap.setView(at.latlng, Math.max(lmap.getZoom(), FOLLOW_ZOOM), { animate: false });
      return;
    }
    var bounds = mode === 'japan'
      ? L.latLngBounds(JAPAN_BOUNDS)
      : L.latLngBounds(map.route.stations.map(function (st) { return st.latlng; }));
    var options = { padding: [40, 40], maxZoom: 10 };
    if (smooth) lmap.flyToBounds(bounds, Object.assign({ duration: 0.9 }, options));
    else lmap.fitBounds(bounds, Object.assign({ animate: false }, options));
  }

  var lastFraction = 0;
  var pausedNow = false;
  var stoppedNow = false;
  var segmentIndex = -1;

  function positionTrain() {
    if (!map) return;
    var at = pointAtFraction(map.route, lastFraction);
    var ll = L.latLng(at.latlng);
    map.train.setLatLng(ll);
    if (map.trainDir) map.trainDir.style.transform = 'rotate(' + at.angle.toFixed(1) + 'deg)';
    if (map.trainEl) { map.trainEl.classList.toggle('is-paused', pausedNow); map.trainEl.classList.toggle('is-stopped', stoppedNow); }
    var travelled = lastFraction > 0 ? travelledLatLngs(map.route, lastFraction) : [];
    map.done.setLatLngs(travelled);
    map.doneCasing.setLatLngs(travelled);
    map.markers.forEach(function (item) {
      var passed = lastFraction >= item.fraction - 0.0005;
      if (item.passed === passed) return;
      item.passed = passed;
      if (item.isEnd || item.isTransfer) return;
      item.marker.setStyle({ fillColor: passed ? '#be185d' : '#ffffff', color: passed ? '#be185d' : '#64748b' });
    });
    if (viewMode === 'follow') map.lmap.panTo(ll, { animate: false });
  }

  function updateViewButtons() {
    els.viewRoute.setAttribute('aria-pressed', String(viewMode === 'route'));
    els.viewJapan.setAttribute('aria-pressed', String(viewMode === 'japan'));
    els.viewFollow.setAttribute('aria-pressed', String(viewMode === 'follow'));
  }

  function setView(mode) {
    if (!map) return;
    viewMode = mode;
    updateViewButtons();
    applyView(mode, true);
  }

  // ——— Voyage ———
  function citySummary(id) { return CITIES[id].name; }

  function setupTravel(journey) {
    var legs = legsOf(journey);
    var multi = legs.length > 1;
    var chain = [legs[0].from].concat(legs.map(function (leg) { return leg.to; })).map(citySummary);
    els.travelTitle.textContent = chain.length > 3 ? chain[0] + ' → … → ' + chain[chain.length - 1] : chain.join(' → ');
    els.travelMeta.textContent = multi
      ? legs.length + ' trains · ' + legs.length + ' sessions de focus, ' + (legs.length - 1) + (legs.length > 2 ? ' pauses' : ' pause') + ' de correspondance'
      : journey.train + ' · ' + (journey.trainType || 'Train direct') + ' · Voiture ' + pad2(journey.coachNumber) + ', place ' + journey.seat;
    els.factDeparted.textContent = formatClock(journey.departedAt);
    renderDelay(journey);
    var cls = journey.cabinClass || 'standard';
    var clsPill = '';
    if (cls === 'gran') clsPill = ' · 🌸 Gran Class';
    else if (cls === 'green') clsPill = ' · 🍃 Green Car';
    els.factSeat.textContent = 'Voiture ' + pad2(legs[0].coach) + ' · ' + legs[0].seat + ' (' + seatSide(legs[0].seat) + ')' + clsPill;
    els.leaveConfirm.classList.add('hidden');
    els.leave.classList.remove('hidden');
    els.segment.classList.toggle('hidden', !multi);
    els.itinerary.classList.toggle('hidden', !multi);
    segmentIndex = -1;
    pausedNow = false;
    lastPauseState = null;
    showAnnouncement(journey.ann && journey.ann.last ? journey.ann.last : null);
    buildMap(journey);
  }

  function minutesText(ms) {
    var minutes = Math.ceil(ms / 60000);
    return minutes <= 1 ? 'dans moins d’une minute' : 'dans ' + minutes + ' min';
  }

  function nextPassage(elapsed, journey) {
    var stations = map.route.stations;
    var segments = map.route.segments;
    var legs = legsOf(journey);
    var segment = segments[segmentIndexAt(segments, elapsed)];
    if (segment.kind === 'break') {
      var next = legs[segment.leg + 1];
      return 'Pause à ' + CITIES[legs[segment.leg].to].name + ' · départ du ' + next.train + ' ' + minutesText(segment.end - elapsed);
    }
    for (var j = 1; j < stations.length - 1; j += 1) {
      if (stations[j].dwell && elapsed >= stations[j].time && elapsed < stations[j].departT) {
        return 'En gare de ' + stations[j].name + ' · départ ' + minutesText(stations[j].departT - elapsed);
      }
    }
    for (var i = 1; i < stations.length; i += 1) {
      if (stations[i].time > elapsed + 1000 && stations[i].fraction > distanceFractionAt(map.route, elapsed) + 0.0005) {
        var final = i === stations.length - 1;
        return (final ? 'Arrivée à ' : (stations[i].transfer ? 'Correspondance à ' : '')) + stations[i].name + ' · ' + minutesText(stations[i].time - elapsed);
      }
    }
    return 'Arrivée imminente';
  }

  function updateStopsTimeline(elapsed, journey) {
    var timeline = document.getElementById('ft-all-stops-timeline');
    var chip = document.getElementById('ft-all-stops-chip');
    if (!timeline || !map || !map.route || !map.route.stations) return;
    var stations = map.route.stations;
    var nextFound = false;
    var nextStationName = '';
    var nextStationCountdown = '';
    var base = clockStart(journey);

    var html = '';
    for (var i = 0; i < stations.length; i += 1) {
      var st = stations[i];
      var isStart = (i === 0);
      var isEnd = (i === stations.length - 1);
      var diff = st.time - elapsed;
      var isPassed = !isStart && diff <= 0;
      var isNext = !isStart && !nextFound && diff > 0;

      var statusClass = '';
      var badgeHtml = '';

      if (isStart) {
        statusClass = 'is-start is-passed';
        badgeHtml = '<span class="ft-stop-badge departed">Départ · ' + formatClock(journey.departedAt) + '</span>';
      } else if (isPassed && st.dwell && diff + st.dwell > 0) {
        statusClass = 'is-next';
        nextFound = true;
        nextStationName = st.name;
        nextStationCountdown = 'en gare';
        badgeHtml = '<span class="ft-stop-badge next"><i class="fa-solid fa-train mr-1"></i>En gare · départ dans ' + Math.max(1, Math.ceil((diff + st.dwell) / 1000)) + ' s</span>';
      } else if (isPassed) {
        statusClass = 'is-passed';
        badgeHtml = '<span class="ft-stop-badge passed">Passé ✓ (' + formatClock(base + st.time) + ')</span>';
      } else if (isNext) {
        nextFound = true;
        nextStationName = st.name;
        statusClass = 'is-next';
        var mins = Math.floor(diff / 60000);
        var secs = Math.floor((diff % 60000) / 1000);
        nextStationCountdown = (mins > 0 ? mins + ' min ' : '') + secs + ' s';
        badgeHtml = '<span class="ft-stop-badge next"><i class="fa-solid fa-location-dot mr-1"></i>Dans ' + nextStationCountdown + ' (' + formatClock(base + st.time) + ')</span>';
      } else {
        statusClass = 'is-upcoming';
        var futureMins = Math.ceil(diff / 60000);
        badgeHtml = '<span class="ft-stop-badge upcoming">Dans ~' + futureMins + ' min · ' + formatClock(base + st.time) + '</span>';
      }

      var iconClass = isStart ? 'fa-solid fa-play' : (isEnd ? 'fa-solid fa-flag-checkered' : (isNext ? 'fa-solid fa-bell' : (isPassed ? 'fa-solid fa-check' : 'fa-solid fa-circle-dot')));

      html += '<li class="ft-stop-item ' + statusClass + '">' +
        '<div class="ft-stop-marker"><i class="' + iconClass + '"></i></div>' +
        '<div class="ft-stop-info">' +
          '<span class="ft-stop-name">' + (isEnd ? 'Terminus : ' : '') + st.name + (st.transfer ? ' (Correspondance)' : '') + '</span>' +
          badgeHtml +
        '</div>' +
      '</li>';
    }

    timeline.innerHTML = html;
    if (chip) {
      if (nextStationName) {
        chip.textContent = nextStationCountdown === 'en gare' ? 'En gare : ' + nextStationName : 'Prochain : ' + nextStationName + ' (' + nextStationCountdown + ')';
      } else {
        chip.textContent = 'Arrivée imminente';
      }
    }
  }

  window.toggleFocusTrainStopsCollapse = function() {
    var content = document.getElementById('ft-all-stops-content');
    if (content) content.classList.toggle('hidden');
  };

  // Liste des étapes (trains et pauses) : l'étape en cours est mise en avant, les précédentes cochées.
  function renderItinerary(journey, current) {
    var legs = legsOf(journey);
    var segments = segmentsOf(journey);
    els.itineraryList.replaceChildren();
    segments.forEach(function (segment, index) {
      var leg = legs[segment.leg];
      var li = document.createElement('li');
      li.className = 'ft-step ft-step-' + segment.kind + (index < current ? ' is-done' : index === current ? ' is-current' : '');
      var icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      icon.className = index < current ? 'fa-solid fa-circle-check' : (segment.kind === 'break' ? 'fa-solid fa-mug-hot' : 'fa-solid fa-train');
      var text = document.createElement('span');
      var meta = document.createElement('small');
      if (segment.kind === 'break') {
        text.textContent = 'Pause à ' + CITIES[leg.to].name;
        meta.textContent = leg.breakAfter + ' min · repos avant la prochaine session';
      } else {
        text.textContent = CITIES[leg.from].name + ' → ' + CITIES[leg.to].name + ' · ' + leg.train;
        meta.textContent = formatDuration(leg.minutes) + ' · voiture ' + pad2(leg.coach) + ', place ' + leg.seat;
      }
      var body = document.createElement('span');
      body.className = 'ft-step-body';
      body.appendChild(text);
      body.appendChild(meta);
      li.appendChild(icon);
      li.appendChild(body);
      els.itineraryList.appendChild(li);
    });
  }

  function updateSegment(journey, elapsed) {
    var legs = legsOf(journey);
    if (legs.length < 2) return;
    var segments = segmentsOf(journey);
    var index = segmentIndexAt(segments, elapsed);
    var segment = segments[index];
    var leg = legs[segment.leg];
    if (index !== segmentIndex) {
      var firstTime = segmentIndex === -1;
      segmentIndex = index;
      renderItinerary(journey, index);
      if (!firstTime) chime();
    }
    var onBreak = segment.kind === 'break';
    els.segment.classList.toggle('is-break', onBreak);
    els.segmentTimer.classList.toggle('hidden', !onBreak);
    if (onBreak) {
      var next = legs[segment.leg + 1];
      els.segmentBadge.textContent = 'Pause';
      els.segmentTitle.textContent = 'Pause à ' + CITIES[leg.to].name;
      els.segmentText.textContent = 'Lève-toi, bois un verre d’eau, étire-toi. Ensuite, nouvelle session de focus : ' + next.train +
        ' pour ' + CITIES[next.to].name + ' · voiture ' + pad2(next.coach) + ', place ' + next.seat + '.';
      var left = Math.max(0, Math.ceil((segment.end - elapsed) / 1000));
      els.segmentCount.textContent = Math.floor(left / 60) + ':' + pad2(left % 60);
    } else {
      els.segmentBadge.textContent = 'Session de focus ' + (segment.leg + 1) + '/' + legs.length;
      els.segmentTitle.textContent = leg.train + ' · ' + CITIES[leg.from].name + ' → ' + CITIES[leg.to].name;
      els.segmentText.textContent = 'Voiture ' + pad2(leg.coach) + ' · place ' + leg.seat + ' (' + seatSide(leg.seat) + '). ' +
        (leg.breakAfter && segment.leg < legs.length - 1
          ? 'À ' + CITIES[leg.to].name + ' : pause de ' + leg.breakAfter + ' min avant le prochain train.'
          : 'Dernière étape : plus qu’à travailler jusqu’à ' + CITIES[leg.to].name + '.');
    }
  }

  function getTrainMaxSpeed(trainName, trainType) {
    var name = (trainName || '').toLowerCase();
    var type = (trainType || '').toLowerCase();
    if (name.indexOf('hayabusa') !== -1) return 320;
    if (name.indexOf('nozomi') !== -1 || name.indexOf('mizuho') !== -1) return 285;
    if (name.indexOf('kagayaki') !== -1 || name.indexOf('hakutaka') !== -1) return 260;
    if (name.indexOf('toki') !== -1) return 240;
    if (name.indexOf('hikari') !== -1 || name.indexOf('sakura') !== -1) return 285;
    if (type.indexOf('shinkansen') !== -1) return 285;
    if (type.indexOf('rapid') !== -1 || type.indexOf('line') !== -1 || type.indexOf('jr') !== -1) return 130;
    return 280;
  }

  function calculateCurrentSpeed(journey, elapsed) {
    if (!map || !map.route || !map.route.segments || journey.pausedAt) return 0;
    var m = motionAt(map.route, elapsed);
    if (m.stopped) return 0;
    var seg = map.route.segments[segmentIndexAt(map.route.segments, elapsed)];
    var legs = legsOf(journey);
    var leg = legs[seg.leg] || legs[0];
    var maxSpeed = getTrainMaxSpeed(leg.train, leg.trainType || journey.trainType);
    return Math.max(0, Math.min(maxSpeed, Math.round(m.speed)));
  }

  function tick() {
    var journey = readJourney();
    if (!journey || !journey.departedAt) { stopTick(); return; }
    var duration = totalMinutes(journey) * 60000;
    var elapsed = elapsedOf(journey);
    if (elapsed >= duration) {
      stopTick();
      arrive(true);
      return;
    }
    var progress = Math.max(0, elapsed / duration);
    els.countdown.textContent = formatCountdown(duration - elapsed);
    els.progressBar.style.width = (progress * 100).toFixed(2) + '%';
    var percent = Math.floor(progress * 100);
    els.progress.setAttribute('aria-valuenow', String(percent));
    els.progressText.textContent = percent + ' % du trajet';
    renderDelay(journey);
    updateSegment(journey, elapsed);
    try { announceProgress(journey, elapsed); } catch (error) { /* les annonces sont facultatives */ }
    if (map) {
      els.factNext.textContent = nextPassage(elapsed, journey);
      updateStopsTimeline(elapsed, journey);
      var currentSpeed = calculateCurrentSpeed(journey, elapsed);
      if (els.factSpeed) {
        els.factSpeed.innerHTML = '<span class="ft-speed-val">' + currentSpeed + '</span> <span style="font-size:0.75rem;opacity:0.8">km/h</span>';
      }
      var liveSpeedBadge = document.getElementById('ft-speed-badge-val');
      if (liveSpeedBadge) {
        liveSpeedBadge.textContent = currentSpeed + ' km/h';
      }
      lastFraction = distanceFractionAt(map.route, elapsed);
      var motion = motionAt(map.route, elapsed);
      pausedNow = motion.onBreak;
      stoppedNow = (motion.stopped && !motion.onBreak) || !!journey.pausedAt;
      positionTrain();
    }
  }

  // Bandeau « retard » façon tableau SNCF/JR + bouton pause + heure d'arrivée mise à jour.
  var lastPauseState = null;
  function renderDelay(journey) {
    var now = Date.now();
    var paused = !!journey.pausedAt;
    var total = liveDelay(journey, now);
    var plannedEnd = journey.departedAt + totalMinutes(journey) * 60000;
    var newEnd = plannedEnd + total;
    var shown = total >= 1000;
    els.delay.classList.toggle('hidden', !shown);
    els.delay.classList.toggle('is-paused', paused);
    els.delayTitle.textContent = paused ? 'Train à l’arrêt' : 'Retard cumulé';
    els.delayCount.textContent = '+' + formatMmSs(total);
    els.delayText.textContent = paused
      ? 'Le temps de focus est suspendu. Arrivée prévue désormais à ' + formatClock(newEnd) + '.'
      : 'Arrivée prévue à ' + formatClock(newEnd) + ' au lieu de ' + formatClock(plannedEnd) + '.';
    var min = delayMinutes(total);
    els.factEta.textContent = formatClock(newEnd) + (min >= 1 ? ' (+' + min + ' min)' : '');
    els.factEta.classList.toggle('is-late', min >= 1);
    if (lastPauseState !== paused) {
      lastPauseState = paused;
      els.pause.setAttribute('aria-pressed', String(paused));
      els.pause.classList.toggle('is-paused', paused);
      els.pause.querySelector('i').className = paused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
      els.pause.querySelector('span').textContent = paused ? 'Reprendre le voyage' : 'Mettre en pause';
    }
  }

  function delayAnnouncement(journey, pauseMs) {
    var legs = legsOf(journey);
    var dest = CITIES[finalCityId(journey)];
    var total = delayOf(journey);
    var plannedEnd = journey.departedAt + totalMinutes(journey) * 60000;
    var newEnd = plannedEnd + total;
    var min = delayMinutes(total);
    if (min < 1) {
      return {
        fr: 'Mesdames et messieurs, le train repart. Le retard est inférieur à une minute : arrivée à ' + dest.name + ' toujours prévue à ' + formatClock(newEnd) + '.',
        ja: 'まもなく発車いたします。遅れは、ほとんどございません。'
      };
    }
    var cumul = delayMinutes(total - pauseMs) >= 1;
    var cause = cumul
      ? 'Suite à un nouvel arrêt de ' + delayWords(pauseMs) + ', le retard total atteint ' + delayWords(total) + '.'
      : 'Suite à un arrêt prolongé, ' + (legs.length > 1 ? 'votre voyage' : 'votre train') + ' accuse un retard d’environ ' + delayWords(total) + '.';
    return {
      fr: 'Mesdames et messieurs, nous repartons. ' + cause +
        ' Nouvelle arrivée à ' + dest.name + ' : ' + formatClock(newEnd) + ', au lieu de ' + formatClock(plannedEnd) +
        '. Nous vous prions de bien vouloir nous excuser pour ce retard.',
      ja: 'お待たせいたしました。この列車は、約' + min + '分遅れて運転しております。お急ぎのところ、ご迷惑をおかけし、誠に申し訳ございません。'
    };
  }

  function togglePause() {
    var journey = readJourney();
    if (!journey || !journey.departedAt || journeyStage(journey) !== 'travel') return;
    var now = Date.now();
    journey.ann = journey.ann || {};
    if (!journey.pausedAt) {
      journey.pausedAt = now;
      var stopText = {
        fr: 'Le train est à l’arrêt. Le temps de focus est suspendu, et chaque minute d’arrêt retardera l’arrivée.',
        ja: 'この列車は、ただいま停車しております。'
      };
      journey.ann.last = stopText;
      writeJourney(journey);
      showAnnouncement(stopText);
    } else {
      var pauseMs = Math.max(0, now - journey.pausedAt);
      journey.delayMs = delayOf(journey) + pauseMs;
      journey.pausedAt = null;
      var text = delayAnnouncement(journey, pauseMs);
      journey.ann.last = text;
      writeJourney(journey);
      announce(text);
    }
    tick();
  }

  // ——— Annonces à bord (début du trajet, prochaine gare, pauses, terminus) ———
  // Chaque annonce s'affiche dans le bandeau « Annonce à bord », s'accompagne d'un carillon et peut être lue à voix haute
  // (synthèse vocale du navigateur, en japonais ; le français s'affiche en traduction). Réglages mémorisés ; chaque annonce n'est faite qu'une fois.
  var ANN_KEY = 'benkyo_focus_train_announce_v1';
  var annRoute = null;
  var annSpeakTimer = null;

  function readAnn() {
    try {
      var saved = JSON.parse(localStorage.getItem(ANN_KEY) || '{}') || {};
      return { voice: saved.voice !== false, lang: 'ja' };
    } catch (error) { return { voice: true, lang: 'ja' }; }
  }
  function writeAnn(settings) {
    try { localStorage.setItem(ANN_KEY, JSON.stringify(settings)); } catch (error) { /* ignoré */ }
  }
  function stopSpeech() {
    if (annSpeakTimer) { window.clearTimeout(annSpeakTimer); annSpeakTimer = null; }
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (error) { /* ignoré */ }
  }
  function speak(text, lang) {
    stopSpeech();
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    // Petit délai : le carillon d'abord, puis la voix.
    annSpeakTimer = window.setTimeout(function () {
      annSpeakTimer = null;
      try {
        var utterance = new window.SpeechSynthesisUtterance(text);
        var tag = lang === 'ja' ? 'ja-JP' : 'fr-FR';
        utterance.lang = tag;
        utterance.rate = lang === 'ja' ? 0.95 : 0.97;
        var voices = window.speechSynthesis.getVoices() || [];
        var match = voices.filter(function (v) { return String(v.lang).toLowerCase().indexOf(lang) === 0; })[0];
        if (match) utterance.voice = match;
        window.speechSynthesis.speak(utterance);
      } catch (error) { /* la voix est facultative */ }
    }, 1100);
  }
  function jpName(station) {
    var city = station && station.isCity ? CITIES[station.id] : null;
    return city ? city.jp : station.name;
  }
  function stopWord(min) { return min <= 1 ? '1 minute' : min + ' minutes'; }

  // Textes des annonces : { fr, ja }
  function annText(kind, info) {
    var j = info.journey, st = info.stations, i = info.index, legs = legsOf(j);
    var last = st[st.length - 1];
    if (kind === 'start') {
      var leg0 = legs[0];
      var nextStation = st[1];
      return {
        fr: 'Mesdames et messieurs, bienvenue à bord du ' + leg0.train + ' à destination de ' + CITIES[leg0.to].name +
          '. Durée du trajet : ' + formatDuration(leg0.minutes) + '. Prochain arrêt : ' + nextStation.name + '. Bonne session de focus !',
        ja: 'ご乗車ありがとうございます。この列車は、' + CITIES[leg0.to].jp + '行きです。次は、' + jpName(nextStation) + 'です。'
      };
    }
    if (kind === 'next') {
      var nx = st[i + 1], isLast = i + 1 === st.length - 1;
      return {
        fr: 'Nous venons de passer ' + st[i].name + '. ' + (isLast ? 'Terminus : ' : 'Prochain arrêt : ') + nx.name + '.',
        ja: (isLast ? '次は、終点、' : '次は、') + jpName(nx) + 'です。'
      };
    }
    if (kind === 'soon') {
      return {
        fr: 'Mesdames et messieurs, nous arriverons bientôt à ' + st[i].name + '.' + (st[i].transfer ? ' Correspondance : pensez à vos affaires.' : ' Merci de préparer vos affaires.'),
        ja: 'まもなく、' + jpName(st[i]) + 'です。お忘れ物のないようご注意ください。'
      };
    }
    if (kind === 'break') {
      return {
        fr: 'Nous sommes en gare de ' + st[i].name + '. Pause de ' + stopWord(st[i].transfer) + ' avant le prochain train. Étirez-vous, buvez un verre d’eau.',
        ja: jpName(st[i]) + 'に到着しました。' + st[i].transfer + '分間、休憩です。'
      };
    }
    if (kind === 'resume') {
      var legIndex = info.legIndex;
      var next = legs[legIndex];
      return {
        fr: 'Le ' + next.train + ' à destination de ' + CITIES[next.to].name + ' va partir. Bonne reprise !',
        ja: 'まもなく発車します。この列車は、' + CITIES[next.to].jp + '行きです。'
      };
    }
    // end
    return {
      fr: 'Terminus, ' + last.name + '. Merci d’avoir voyagé avec nous et à bientôt !',
      ja: 'ご乗車ありがとうございました。終点、' + jpName(last) + 'です。'
    };
  }

  function showAnnouncement(text) {
    var box = document.getElementById('ft-announce');
    if (!box) return;
    var fr = document.getElementById('ft-announce-fr');
    var ja = document.getElementById('ft-announce-ja');
    if (fr) fr.textContent = text ? text.fr : 'Les annonces à bord s’afficheront ici : départ, prochaine gare, pauses et arrivée.';
    if (ja) ja.textContent = text ? text.ja : '';
    box.classList.toggle('is-idle', !text);
    if (text) {
      box.classList.remove('is-new');
      void box.offsetWidth;
      box.classList.add('is-new');
    }
  }

  function announce(text) {
    showAnnouncement(text);
    var settings = readAnn();
    chime();
    if (settings.voice) speak(text.ja, 'ja');
  }

  function renderAnnControls() {
    var settings = readAnn();
    var voice = document.getElementById('ft-ann-voice');
    if (voice) {
      voice.setAttribute('aria-pressed', settings.voice ? 'true' : 'false');
      voice.title = settings.voice ? 'Couper la voix des annonces' : 'Activer la voix des annonces';
      var icon = voice.querySelector('i');
      if (icon) icon.className = settings.voice ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }
  }

  function initAnnouncements() {
    var voice = document.getElementById('ft-ann-voice');
    if (voice) voice.addEventListener('click', function () {
      var settings = readAnn();
      settings.voice = !settings.voice;
      writeAnn(settings);
      if (!settings.voice) stopSpeech();
      renderAnnControls();
    });
    renderAnnControls();
    // Les voix du navigateur se chargent parfois après coup.
    if (window.speechSynthesis && window.speechSynthesis.getVoices) window.speechSynthesis.getVoices();
  }

  function annRouteFor(journey) {
    if (!annRoute || annRoute.t !== journey.departedAt) annRoute = { t: journey.departedAt, route: buildRoute(journey) };
    return annRoute.route;
  }

  // Appelée à chaque tick : déclenche une seule fois chaque annonce, et ignore celles qui sont déjà passées
  // (par exemple quand on rouvre la page longtemps après).
  function announceProgress(journey, elapsed) {
    var FRESH = 50000;
    var route = annRouteFor(journey);
    var st = route.stations;
    if (!st || st.length < 2) return;
    var a = journey.ann = journey.ann || {};
    var dirty = false;
    function arrival(i) { return st[i].time - (st[i].transfer || 0) * 60000; }
    function fire(kind, index, extra) {
      a.lastAt = elapsed;
      dirty = true;
      var info = { journey: journey, stations: st, index: index, legIndex: extra };
      var text = annText(kind, info);
      a.last = text;
      announce(text);
    }

    // 1. Début du trajet
    if (!a.start) {
      a.start = true; dirty = true;
      if (elapsed < FRESH + 10000) fire('start', 0);
    }

    // 2. Gare franchie → prochaine gare (ou fin de pause → repart)
    var passed = 0;
    for (var i = 0; i < st.length; i += 1) { if (st[i].time + (st[i].dwell || 0) <= elapsed) passed = i; }
    if (passed > (a.passed || 0)) {
      a.passed = passed; dirty = true;
      if (passed < st.length - 1 && elapsed - st[passed].time - (st[passed].dwell || 0) < FRESH) {
        if (st[passed].transfer) {
          var legIdx = 0;
          route.ranges.forEach(function (range, index) { if (range.startIndex === passed) legIdx = index; });
          fire('resume', passed, legIdx);
        } else if (a.lastAt == null || elapsed < a.lastAt || elapsed - a.lastAt > 150000) {
          fire('next', passed);
        }
      }
    }

    // 3. Pause à une gare de correspondance
    for (var k = 1; k < st.length - 1; k += 1) {
      if (st[k].transfer && arrival(k) <= elapsed && elapsed < st[k].time && a.brk !== k) {
        a.brk = k; dirty = true;
        if (elapsed - arrival(k) < FRESH) fire('break', k);
      }
    }

    // 4. « Nous arriverons bientôt » : avant chaque gare (intermédiaire, correspondance ou terminus)
    for (var m = 1; m < st.length; m += 1) {
      var isStop = m === st.length - 1 || st[m].transfer;
      var left = arrival(m) - elapsed;
      if (left > 0) {
        // Annonce d'arrêt (terminus ou correspondance) : ~2 min avant
        if (isStop && left <= 120000 && a.soon !== m && arrival(m) > 180000) {
          a.soon = m;
          fire('soon', m);
          break;
        }
        // Annonce avant d'arriver dans les gares intermédiaires : ~60s avant
        if (!isStop && left <= 60000 && !a['mid_soon_' + m] && arrival(m) > 90000) {
          a['mid_soon_' + m] = true;
          dirty = true;
          a.lastAt = elapsed;
          var stationObj = st[m];
          var midText = {
            fr: 'Mesdames et messieurs, nous approchons de la gare de ' + stationObj.name + '. Prochain arrêt dans un instant.',
            ja: 'まもなく、' + jpName(stationObj) + '、' + jpName(stationObj) + 'です。お忘れ物のないようご注意ください。'
          };
          a.last = midText;
          announce(midText);
          break;
        }
      }
    }

    if (dirty) { var fresh = readJourney(); if (fresh) { fresh.ann = a; writeJourney(fresh); } }
  }

  function announceEnd(journey) {
    var a = journey.ann = journey.ann || {};
    if (a.end) return;
    a.end = true;
    var st = buildRoute(journey).stations;
    var text = annText('end', { journey: journey, stations: st, index: st.length - 1 });
    a.last = text;
    writeJourney(journey);
    var settings = readAnn();
    if (settings.voice) speak(text.ja, 'ja');
  }

  // ——— Arrivée ———
  function chime() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [[784, 0], [659, 0.45], [523, 0.9]].forEach(function (note) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = note[0];
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + note[1]);
        gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + note[1] + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + note[1] + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + note[1]);
        osc.stop(ctx.currentTime + note[1] + 0.75);
      });
      window.setTimeout(function () { try { ctx.close(); } catch (error) { /* ignoré */ } }, 2200);
    } catch (error) { /* le son est facultatif */ }
  }

  function addRecap(list, label, value) {
    var row = document.createElement('div');
    var dt = document.createElement('dt');
    var dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    row.appendChild(dt);
    row.appendChild(dd);
    list.appendChild(row);
  }

  function arrive(live) {
    var journey = readJourney();
    if (!journey || !journey.departedAt) return;
    try {
      localStorage.setItem('benkyo_focus_train_audio_v1', JSON.stringify({ playing: false, type: 'lofi', title: '' }));
      if (typeof window.stopFocusTrainMusic === 'function') window.stopFocusTrainMusic();
    } catch(e) {}
    destroyMap();
    var legs = legsOf(journey);
    var to = CITIES[finalCityId(journey)];
    var from = CITIES[legs[0].from];
    var total = totalMinutes(journey);
    var rides = legs.reduce(function (sum, leg) { return sum + leg.minutes; }, 0);
    els.arrivedJp.textContent = to.jp;
    els.arrivedTitle.textContent = 'Bienvenue à ' + to.name + ' !';
    els.arrivedText.textContent = legs.length > 1
      ? 'Tu es arrivé·e à destination après ' + legs.length + ' sessions de focus : bravo !'
      : 'Tu es arrivé·e à destination : bravo pour ce temps de focus !';
    els.arrivedRecap.replaceChildren();
    addRecap(els.arrivedRecap, 'Trajet', from.name + ' → ' + to.name);
    var arrClass = journey.cabinClass || 'standard';
    var arrClassLabel = '普通車 · Standard';
    if (arrClass === 'gran') arrClassLabel = '🌸 グランクラス · Gran Class';
    else if (arrClass === 'green') arrClassLabel = '🍃 グリーン車 · Green Car';
    addRecap(els.arrivedRecap, 'Classe', arrClassLabel);
    addRecap(els.arrivedRecap, 'Train', legs.map(function (leg) { return leg.train; }).join(' + '));
    if (legs.length > 1) {
      addRecap(els.arrivedRecap, 'Correspondances', legs.slice(0, -1).map(function (leg) { return CITIES[leg.to].name + ' (' + leg.breakAfter + ' min)'; }).join(', '));
      addRecap(els.arrivedRecap, 'Temps de focus', formatDuration(rides));
      addRecap(els.arrivedRecap, 'Pauses', formatDuration(total - rides));
    } else {
      addRecap(els.arrivedRecap, 'Temps de focus', formatDuration(journey.durationMinutes));
      addRecap(els.arrivedRecap, 'Place', 'Voiture ' + pad2(journey.coachNumber) + ' · ' + journey.seat);
    }
    if (delayOf(journey) >= 60000) {
      addRecap(els.arrivedRecap, 'Retard', '+' + formatDuration(delayMinutes(delayOf(journey))) + ' (' + (delayMinutes(delayOf(journey)) > 1 ? 'arrêts' : 'arrêt') + ' en route)');
    }
    try {
      var rawTodos = localStorage.getItem('benkyo_focus_train_todos_v1');
      if (rawTodos) {
        var todosList = JSON.parse(rawTodos);
        if (todosList && todosList.length) {
          var doneTodos = todosList.filter(function (t) { return t.done; }).length;
          addRecap(els.arrivedRecap, 'Objectifs', doneTodos + ' / ' + todosList.length + ' accomplis (' + Math.round((doneTodos / todosList.length) * 100) + ' %)');
        }
      }
    } catch (e) {}
    if (!journey.logged) {
      pushHistory({
        from: legs[0].from, to: finalCityId(journey), train: legs.map(function (leg) { return leg.train; }).join(' + '),
        planned: total, minutes: total, focus: rides, delay: delayMinutes(delayOf(journey)),
        done: true, at: journey.departedAt + delayOf(journey) + total * 60000
      });
      journey.logged = true;
      writeJourney(journey);
      if (live) { chime(); try { announceEnd(journey); } catch (error) { /* ignoré */ } }
    }
    showCityStamp(journey, to, live);
    setStage('arrived');
  }

  // Tampon de la ville d'arrivée : ajouté à la collection du carnet de tampons (tampons.js).
  function showCityStamp(journey, to, live) {
    var api = window.BenkyoTampons;
    var award = api && typeof api.awardCityStamp === 'function' ? api.awardCityStamp(finalCityId(journey)) : null;
    els.stampBox.classList.toggle('hidden', !award);
    if (!award) return;
    // « Nouveau » reste vrai si on recharge la page avant d'avoir quitté l'écran d'arrivée.
    if (award.isNew && !journey.stampNew) {
      journey.stampNew = true;
      writeJourney(journey);
    }
    var isNew = Boolean(award.isNew || journey.stampNew);
    els.stampArt.innerHTML = api.stampSVG(award.id);
    els.stampBadge.textContent = isNew ? 'Nouveau tampon' : 'Déjà dans ta collection';
    els.stampBadge.classList.toggle('is-new', isNew);
    els.stampTitle.textContent = 'Tampon de ' + to.name + ' ' + to.jp;
    els.stampText.textContent = isNew
      ? 'Il est dans ta collection : tu peux le choisir pour tamponner ton carnet.'
      : 'Tu l’as déjà : refaire ce trajet ne donne pas de second tampon, mais chaque ville a le sien.';
    els.stampBox.classList.remove('is-pressed');
    if (isNew && !reducedMotion()) {
      void els.stampBox.offsetWidth;
      els.stampBox.classList.add('is-pressed');
      if (live && typeof api.celebrate === 'function') api.celebrate();
    }
  }

  function resetJourney() {
    stopSpeech();
    var journey = readJourney();
    if (journey) {
      writeJourney({
        from: journey.from, to: journey.to, train: journey.train, trainType: journey.trainType,
        durationMinutes: journey.durationMinutes, coachNumber: null, seat: null,
        torn: false, stamped: false, departedAt: null, logged: false, savedAt: new Date().toISOString()
      });
    }
    stopTick();
    destroyMap();
    lastFraction = 0;
    setStage('plan');
    window.dispatchEvent(new CustomEvent('ft:journey-changed'));
  }

  function leaveTrain() {
    var journey = readJourney();
    if (journey && journey.departedAt && !journey.logged) {
      var legs = legsOf(journey);
      var planned = totalMinutes(journey);
      var elapsedMin = Math.min(planned, elapsedOf(journey) / 60000);
      pushHistory({
        from: legs[0].from, to: finalCityId(journey), train: legs.map(function (leg) { return leg.train; }).join(' + '),
        planned: planned, minutes: Math.round(elapsedMin), focus: focusMinutesElapsed(journey, elapsedMin * 60000),
        done: false, delay: delayMinutes(liveDelay(journey)), at: Date.now()
      });
    }
    resetJourney();
  }

  // ——— Embarquement ———
  function clearBoardingTimers() {
    boardingTimers.forEach(function (id) { window.clearTimeout(id); });
    boardingTimers = [];
  }

  function later(ms, fn) {
    boardingTimers.push(window.setTimeout(fn, ms));
  }

  function finishBoarding() {
    clearBoardingTimers();
    var journey = readJourney();
    if (!journey) { setStage('plan'); return; }
    journey.departedAt = Date.now();
    journey.delayMs = 0;
    journey.pausedAt = null;
    journey.logged = false;
    var plan = window.FocusTrain && typeof window.FocusTrain.buildPlan === 'function' ? window.FocusTrain.buildPlan(journey) : null;
    if (plan) journey.plan = plan; else delete journey.plan;
    writeJourney(journey);
    lastFraction = 0;
    setStage('travel');
    setupTravel(journey);
    startTick();
    if (els.travel.scrollIntoView) els.travel.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }

  // Livrée du train selon son nom (Shinkansen N700, E5 Hayabusa, W7 Kagayaki…)
  var LIVERIES = {
    nozomi:   { a: '#1f4fa0', b: '#1f4fa0', top: 'transparent', jp: 'のぞみ' },
    hikari:   { a: '#1f4fa0', b: '#1f4fa0', top: 'transparent', jp: 'ひかり' },
    hayabusa: { a: '#ec4a8c', b: '#f4f6fb', top: '#1f8f5f', jp: 'はやぶさ' },
    kagayaki: { a: '#1c3a78', b: '#c28a3c', top: 'transparent', jp: 'かがやき' },
    mizuho:   { a: '#1f4fa0', b: '#d9ad45', top: 'transparent', jp: 'みずほ' },
    sakura:   { a: '#1f4fa0', b: '#f08fb8', top: 'transparent', jp: 'さくら' },
    toki:     { a: '#ef7db0', b: '#8fb7e8', top: 'transparent', jp: 'とき' }
  };
  function applyLivery(train, name) {
    var key = String(name || '').toLowerCase().split(' ')[0];
    var liv = LIVERIES[key] || { a: '#f08c1e', b: '#2c8a4e', top: 'transparent', jp: '' };
    train.style.setProperty('--ftl-a', liv.a);
    train.style.setProperty('--ftl-b', liv.b);
    train.style.setProperty('--ftl-top', liv.top);
    var label = byId('ft-board-train-name');
    if (label) label.textContent = LIVERIES[key] ? String(name).toUpperCase() + ' · ' + liv.jp : String(name || '').toUpperCase();
  }

  function startBoarding() {
    var journey = readJourney();
    if (!journey || !(journey.torn === true || journey.stamped === true) || !journey.seat || journey.departedAt) return;
    if (boardingTimers.length) return;
    var from = CITIES[journey.from];
    var to = CITIES[journey.to];
    var train = byId('ft-board-train');
    var door = byId('ft-board-door');
    var person = byId('ft-board-person');
    byId('ft-board-sign-text').textContent = from.name;
    var signJp = byId('ft-board-sign-jp'); if (signJp) signJp.textContent = from.jp;
    var signDest = byId('ft-board-sign-dest'); if (signDest) signDest.textContent = '→ ' + to.name;
    applyLivery(train, journey.train);
    byId('ft-board-coach').textContent = pad2(journey.coachNumber);
    train.setAttribute('class', 'ft-board-train');
    door.setAttribute('class', 'ft-board-door');
    person.setAttribute('class', 'ft-person');
    var porter = byId('ft-board-porter');
    if (porter) porter.setAttribute('class', 'ft-porter');
    setStage('boarding');
    if (reducedMotion()) {
      els.boardText.textContent = 'Embarquement à ' + from.name + '.';
      finishBoarding();
      return;
    }
    function say(text) { els.boardText.textContent = text; }
    say('Le ' + journey.train + ' à destination de ' + to.name + ' entre en gare…');
    void train.getBoundingClientRect();
    later(60, function () { train.classList.add('is-arriving'); });
    later(2700, function () {
      var clsAnn = '';
      if (journey.cabinClass === 'gran') clsAnn = ' Bienvenue en Gran Class 🌸, thé et confort VIP vous attendent.';
      else if (journey.cabinClass === 'green') clsAnn = ' Bienvenue en Green Car 🍃, installe-toi confortablement.';
      say('Voiture ' + pad2(journey.coachNumber) + ' : les portes s’ouvrent. Le porteur t’accompagne avec tes valises jusqu’à ta place, ' + journey.seat + ' (' + seatSide(journey.seat) + ').' + clsAnn);
      door.classList.add('is-open');
      person.classList.add('is-walking');
      if (porter) porter.classList.add('is-walking');
    });
    later(4900, function () {
      say('Tu montes à bord pendant que le porteur charge tes valises.');
      person.classList.add('is-boarded');
      if (porter) porter.classList.add('is-loading');
    });
    later(7000, function () {
      say('Tout est à bord ! Le porteur te salue : bon voyage.');
      if (porter) porter.classList.add('is-bow', 'is-wave');
    });
    later(8600, function () {
      say('Attention, fermeture des portes. Le train va partir.');
      door.classList.remove('is-open');
    });
    later(9700, function () {
      say('Bon voyage ! Prochain arrêt : ' + to.name + '.');
      train.classList.add('is-leaving');
    });
    later(12500, finishBoarding);
  }

  // ——— Historique ———
  function renderHistory(stage) {
    var history = readHistory();
    var visible = history.length > 0 && (stage === 'plan' || stage === 'arrived');
    els.history.classList.toggle('hidden', !visible);
    if (!visible) return;
    var done = history.filter(function (item) { return item.done; });
    var minutes = history.reduce(function (sum, item) { return sum + (Number(item.minutes) || 0); }, 0);
    els.historySummary.textContent = done.length + (done.length > 1 ? ' voyages terminés' : ' voyage terminé') +
      ' · ' + formatDuration(minutes) + ' passées dans le train';
    els.historyList.replaceChildren();
    history.slice(0, 5).forEach(function (item) {
      var from = CITIES[item.from];
      var to = CITIES[item.to];
      if (!from || !to) return;
      var li = document.createElement('li');
      li.className = item.done ? 'is-done' : 'is-left';
      var icon = document.createElement('i');
      icon.className = item.done ? 'fa-solid fa-circle-check' : 'fa-solid fa-person-walking-arrow-right';
      icon.setAttribute('aria-hidden', 'true');
      var route = document.createElement('span');
      route.className = 'ft-history-route';
      route.textContent = from.name + ' → ' + to.name + ' · ' + item.train;
      var meta = document.createElement('span');
      meta.className = 'ft-history-meta';
      meta.textContent = new Date(item.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' +
        (item.done ? formatDuration(item.minutes) : formatDuration(item.minutes) + ' sur ' + formatDuration(item.planned) + ' · interrompu') +
        (item.delay > 0 ? ' · retard ' + item.delay + ' min' : '');
      li.appendChild(icon);
      li.appendChild(route);
      li.appendChild(meta);
      els.historyList.appendChild(li);
    });
  }

  function init() {
    shell = document.querySelector('.ft-shell');
    var ids = {
      boarding: 'ft-stage-boarding', travel: 'ft-stage-travel', arrived: 'ft-stage-arrived', boardText: 'ft-board-text',
      boardSkip: 'ft-board-skip', map: 'ft-map', travelTitle: 'ft-travel-title', travelMeta: 'ft-travel-meta',
      segment: 'ft-segment', segmentBadge: 'ft-segment-badge', segmentTitle: 'ft-segment-title', segmentText: 'ft-segment-text',
      segmentTimer: 'ft-segment-timer', segmentCount: 'ft-segment-count', itinerary: 'ft-itinerary', itineraryList: 'ft-itinerary-list',
      viewRoute: 'ft-view-route', viewJapan: 'ft-view-japan', viewFollow: 'ft-view-follow', countdown: 'ft-countdown', progress: 'ft-progress-bar',
      progressText: 'ft-progress-text', factDeparted: 'ft-fact-departed', factEta: 'ft-fact-eta', factNext: 'ft-fact-next',
      factSeat: 'ft-fact-seat', factSpeed: 'ft-fact-speed', leave: 'ft-leave', leaveConfirm: 'ft-leave-confirm', leaveStay: 'ft-leave-stay',
      leaveYes: 'ft-leave-yes', arrivedJp: 'ft-arrived-jp', arrivedTitle: 'ft-arrived-title', arrivedText: 'ft-arrived-text',
      arrivedRecap: 'ft-arrived-recap', arrivedNew: 'ft-arrived-new', stampBox: 'ft-arrived-stamp', stampArt: 'ft-arrived-stamp-art',
      stampBadge: 'ft-arrived-stamp-badge', stampTitle: 'ft-arrived-stamp-title', stampText: 'ft-arrived-stamp-text', history: 'ft-history',
      historySummary: 'ft-history-summary', historyList: 'ft-history-list',
      pause: 'ft-pause', delay: 'ft-delay', delayTitle: 'ft-delay-title', delayText: 'ft-delay-text', delayCount: 'ft-delay-count'
    };
    var missing = false;
    Object.keys(ids).forEach(function (key) {
      els[key] = byId(ids[key]);
      if (!els[key]) missing = true;
    });
    if (!shell || missing) return;
    // La barre de progression est le <span> interne : son parent porte le rôle progressbar.
    els.progressBar = els.progress;
    els.progress = els.progressBar.parentNode;

    initAnnouncements();
    window.addEventListener('ft:board', startBoarding);
    els.boardSkip.addEventListener('click', finishBoarding);
    els.viewRoute.addEventListener('click', function () { setView('route'); });
    els.viewJapan.addEventListener('click', function () { setView('japan'); });
    els.viewFollow.addEventListener('click', function () { setView('follow'); });
    els.mapNote = document.createElement('div');
    els.mapNote.className = 'ft-map-note hidden';
    els.mapNote.setAttribute('role', 'status');
    els.map.parentNode.appendChild(els.mapNote);
    els.leave.addEventListener('click', function () {
      els.leaveConfirm.classList.remove('hidden');
      els.leave.classList.add('hidden');
      els.leaveStay.focus();
    });
    els.leaveStay.addEventListener('click', function () {
      els.leaveConfirm.classList.add('hidden');
      els.leave.classList.remove('hidden');
      els.leave.focus();
    });
    els.pause.addEventListener('click', togglePause);
    els.leaveYes.addEventListener('click', leaveTrain);
    els.arrivedNew.addEventListener('click', resetJourney);

    // La carte se recale quand elle devient visible (changement d'onglet) ou quand la fenêtre change de taille.
    if (window.ResizeObserver) {
      var lastWidth = 0;
      new ResizeObserver(function () {
        if (!map) return;
        var width = els.map.clientWidth;
        if (!width) return;
        map.lmap.invalidateSize({ animate: false, pan: false });
        if (map.pendingView || (width !== lastWidth && viewMode)) applyView(viewMode || 'route', false);
        lastWidth = width;
      }).observe(els.map);
    }

    var journey = readJourney();
    var stage = journeyStage(journey);
    if (stage === 'travel') {
      setStage('travel');
      setupTravel(journey);
      startTick();
    } else if (stage === 'arrived') {
      arrive(false);
    } else {
      setStage('plan');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Utilisé par l'onglet « Statistiques d'étude » (pomodoro.html) pour intégrer les voyages.
  window.FocusTrainStats = {
    history: readHistory,
    cityName: function (id) { return CITIES[id] ? CITIES[id].name : id; },
    // Gares intermédiaires entre deux villes (sans le départ ni le terminus), pour le tableau des départs.
    stops: function (from, to) {
      try { return routeStations(from, to).slice(1, -1).map(function (st) { return st.name; }); } catch (error) { return []; }
    }
  };
})();
