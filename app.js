/* ============================================================
   app.js — Système de sauvegarde centralisé de Benkyo
   -------------------------------------------------------------
   Ce fichier est chargé par les 11 pages du site. Il regroupe :
     - la liste des données sauvegardées (STORAGE_KEYS)
     - les valeurs par défaut (si rien n'a encore été sauvegardé)
     - le chargement du state (BenkyoStorage.load)
     - la sauvegarde immédiate ou différée (save / saveDebounced)
     - une sauvegarde de secours à la fermeture de l'onglet
     - l'export / import d'une sauvegarde en fichier .json,
       pour ne jamais perdre les données même si le navigateur
       efface son cache.
   Toute page qui modifie `state` doit appeler `saveState()`
   (définie localement dans chaque page, qui elle-même appelle
   BenkyoStorage.save ou saveDebounced).
   ============================================================ */

(function (global) {
  'use strict';

  // Association clé du state <-> clé localStorage
  var STORAGE_KEYS = {
    profile: 'benkyo_profile',
    timetable: 'benkyo_timetable',
    categories: 'benkyo_categories',
    events: 'benkyo_events',
    todos: 'benkyo_todos',
    notes: 'benkyo_notes',
    grades: 'benkyo_grades',
    // Liste des matières avec leur coefficient, utilisée pour calculer la
    // moyenne générale pondérée (onglet "Notes & Moyennes").
    subjectCoefficients: 'benkyo_subject_coeffs',
    periods: 'benkyo_periods',
    evalTypes: 'benkyo_evalTypes',
    decks: 'benkyo_decks',
    revisions: 'benkyo_revisions',
    courses: 'benkyo_courses',
    flashcardHistory: 'benkyo_fc_history',
    stats: 'benkyo_stats',
    streak: 'benkyo_streak',
    vacation: 'benkyo_vacation',
    examCountdown: 'benkyo_exam_countdown',
    goals: 'benkyo_goals',
    pomodoroSession: 'benkyo_pomo_session',
    revisionPlannings: 'benkyo_revision_plannings',
    examTrainings: 'benkyo_exam_trainings',
    // Session de travail > « Session de travail immersive » : brouillon de la
    // session en cours (lien vidéo, boisson, humeur, objectifs, chrono) et
    // historique des bilans.
    immersiveDraft: 'benkyo_immersive_draft',
    immersiveSessions: 'benkyo_immersive_sessions',
    // État en direct de l'entraînement (examen blanc) en cours, pour qu'il
    // continue de tourner (minuteur + musique) même en changeant de page.
    examTrainingSession: 'benkyo_exam_training_session',
    // Onglet "Apprentissage" > section "Texte à trous" : cours / chapitres /
    // questions à trous + cartes mentales, et l'historique des révisions.
    blankCourses: 'benkyo_blank_courses',
    blankHistory: 'benkyo_blank_history',
    // Onglet "Mon profil" > "Mes résultats" : historique des tampons "hanko"
    // de validation (bilan hebdomadaire du dimanche + bilan mensuel du
    // dernier jour du mois), un tampon par période.
    hankoValidations: 'benkyo_hanko_validations',
    // Onglet "Mon profil" > "Mon carnet" / "Mes tampons" / "Mon moral" :
    // carnet de tampons quotidiens, stickers Kibi dango, moral du jour et
    // temps d'étude ajouté à la main (voir tampons.js).
    stampBook: 'benkyo_stamp_book',
    stickers: 'benkyo_stickers',
    moods: 'benkyo_moods',
    manualStudy: 'benkyo_manual_study',
    // Onglet "Révisions" > "Suivi des séances de travail" : étiquettes de
    // matières (nom + couleur) et journal des séances (date, matière, texte
    // mis en forme).
    sessionSubjects: 'benkyo_session_subjects',
    workSessions: 'benkyo_work_sessions',
    // Onglet "Révisions" > "Mes difficultés" : difficultés par matière
    // (étiquettes partagées avec sessionSubjects), plan d'action et statut.
    difficulties: 'benkyo_difficulties',
    // Page d'accueil > « Gâteau de la chance » (un message ouvert par jour)
    // et « Daruma » (objectif en cours + objectifs atteints). Voir rituels.js.
    fortune: 'benkyo_fortune',
    daruma: 'benkyo_daruma'
  };

  // Valeurs par défaut, utilisées uniquement la toute première fois
  // (ou si une donnée a été effacée / corrompue)
  function defaultState() {
    return {
      profile: { firstname: "Étudiant", gender: "Garçon", level: "Terminale", img: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMTAwIiB5Mj0iMTAwIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjOGI1Y2Y2Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzNiODJmNiIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9InVybCgjZykiLz4KICA8cGF0aCBkPSJNNTAgMjIgTDU5IDQxIEw4MCA1MCBMNTkgNTkgTDUwIDc4IEw0MSA1OSBMMjAgNTAgTDQxIDQxIFoiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuOTIiLz4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI2IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=" },
      timetable: [],
      categories: ["Cours", "Session de travail", "Rendez-vous"],
      events: [],
      todos: {},
      notes: [],
      grades: [],
      // Matières et coefficients (ex: { name: "Mathématiques", coeff: 5 }),
      // servant à pondérer la moyenne générale entre matières.
      subjectCoefficients: [],
      periods: ["Semestre 1", "Semestre 2"],
      evalTypes: ["Khôlle", "DM", "DST", "Évaluation"],
      decks: [
        { id: 1, title: "Vocabulaire Francais", cards: [{ q: "Élocution", a: "Manière de s'exprimer oralement", level: 0 }] }
      ],
      revisions: [
        { id: 1, subject: "Histoire", title: "La Guerre Froide", status: "to_revise", difficultyNotes: "", lastReviewed: "Jamais" }
      ],
      courses: [
        {
          id: 1,
          subject: "Histoire",
          title: "La Guerre Froide",
          chapters: [
            { id: 1, title: "Chapitre 1 - Origines du conflit", status: "to_revise", difficultyNotes: "", lastRevised: new Date().toISOString() }
          ]
        }
      ],
      flashcardHistory: [],
      stats: { todayMinutes: 0, weeklyMinutes: [0, 0, 0, 0, 0, 0, 0], dailyLog: {} },
      streak: { count: 1, lastLogin: new Date().toDateString() },
      vacation: { supplies: [], books: [], latin: [] },
      examCountdown: null,
      goals: [],
      // Plannings de révisions organisés par plage de dates, avec des
      // créneaux (matière + objectifs + horaires) que l'on peut éditer.
      revisionPlannings: [],
      // Sessions d'entraînement chronométrées (examens blancs) lancées
      // depuis l'onglet Pomodoro.
      examTrainings: [],
      immersiveDraft: {},
      immersiveSessions: [],
      // Entraînement (examen blanc) actuellement en cours, partagé entre les
      // pages afin qu'il ne s'arrête pas lorsqu'on change d'onglet du site.
      examTrainingSession: {
        isRunning: false,
        name: '',
        hours: 0,
        endTimestamp: null,
        musicChoice: 'none', // 'none' | 'lofi' | 'custom'
        customTrackName: ''  // nom du fichier MP3/MP4 perso utilisé pendant l'entraînement, le cas échéant
      },
      // Section "Texte à trous" de l'onglet Apprentissage : un cours contient
      // des chapitres, chaque chapitre contient des questions à trous et/ou
      // une carte mentale (arbre de branches) à faire revivre de mémoire.
      blankCourses: [],
      blankHistory: [],
      // Historique des tampons "hanko" de validation des résultats.
      // Chaque entrée : { type: 'weekly'|'monthly', periodKey, label, validatedAt }
      hankoValidations: [],
      // Carnet de tampons : un tampon par jour ({ 'AAAA-MM-JJ': { stampId, at } }),
      // la collection possédée et le tampon actuellement choisi.
      stampBook: { entries: {}, owned: ['sakura', 'hinode'], selected: 'sakura' },
      // Stickers Kibi dango gagnés (clé -> { label, at }) et nombre dépensé.
      stickers: { awarded: {}, spent: 0 },
      // Moral du jour : { 'AAAA-MM-JJ': 'triste' | 'productive' | ... }
      moods: {},
      // Temps d'étude saisi à la main, en minutes : { 'AAAA-MM-JJ': 45 }
      manualStudy: {},
      // Suivi des séances de travail : étiquettes de matières { id, name, color }
      // et séances { id, date: 'AAAA-MM-JJ', subjectId, title, html, createdAt, updatedAt }.
      sessionSubjects: [],
      workSessions: [],
      // Mes difficultés : { id, subjectId, topic, difficulty, encouragement, plan,
      // status: 'open'|'overcome', overcomeAt, createdAt, updatedAt }
      difficulties: [],
      // Gâteau de la chance : { opened: { 'AAAA-MM-JJ': numéro du message } }
      fortune: { opened: {} },
      // Daruma : objectif en cours { goal, startedAt, doneAt } et objectifs atteints
      daruma: { current: null, done: [] },
      // État du minuteur Pomodoro, partagé entre les pages (Dashboard,
      // Pomodoro, Mode Focus) afin qu'il reste cohérent où que l'on soit.
      pomodoroSession: {
        phase: 'work',           // 'work' | 'break' | 'longbreak'
        isRunning: false,
        phaseEndTimestamp: null, // epoch ms
        remainingSeconds: 25 * 60, // temps restant figé quand la session est en pause
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,    // pause longue après plusieurs cycles de travail
        cycleCount: 0,           // nombre de sessions de travail terminées depuis la dernière pause longue
        musicChoice: 'none',     // 'none' | 'lofi' | 'custom'
        musicPaused: false,      // true si l'utilisateur a explicitement mis la musique en pause
        customTrackName: '',     // nom du fichier audio/vidéo personnalisé en cours (affiché partout)
        // Position de lecture (en secondes) du média perso au moment de la dernière
        // sauvegarde : permet de reprendre exactement là où on en était après un
        // changement d'onglet du site (Pomodoro <-> Mode Focus <-> autre page),
        // au lieu de repartir du début à chaque rechargement du lecteur.
        customMediaPosition: 0,
        bgImage: ''              // image de fond personnalisée (URL ou data URL), partagée Pomodoro <-> Mode Focus
      }
    };
  }

  // ------------------------------------------------------------
  // Répétition espacée / courbe d'oubli (Ebbinghaus simplifiée)
  // ------------------------------------------------------------
  // "Stabilité" en jours selon le statut du chapitre : plus un chapitre
  // est maîtrisé, plus la mémoire met de temps à se dégrader.
  function getChapterStabilityDays(status) {
    switch (status) {
      case 'mastered': return 12;
      case 'in_progress': return 6;
      case 'difficulties': return 2;
      case 'to_revise':
      default: return 3.5;
    }
  }

  // Calcule la rétention mémoire théorique actuelle d'un chapitre,
  // selon la formule d'Ebbinghaus R(t) = e^(-t / stabilité)
  function getChapterRetention(chapter) {
    var stability = getChapterStabilityDays(chapter && chapter.status);
    var lastDate = (chapter && chapter.lastRevised) ? new Date(chapter.lastRevised) : new Date();
    if (isNaN(lastDate.getTime())) lastDate = new Date();
    var daysSince = Math.max(0, (Date.now() - lastDate.getTime()) / 86400000);
    var retention = Math.exp(-daysSince / stability);
    return { daysSince: daysSince, stability: stability, retention: retention };
  }

  // Retourne la liste des chapitres (avec leur cours parent) dont la
  // rétention mémoire estimée est passée sous le seuil donné (0.6 par défaut),
  // triés du plus urgent (rétention la plus faible) au moins urgent.
  function getChaptersNeedingRevision(state, thresholdPercent) {
    var threshold = (typeof thresholdPercent === 'number') ? thresholdPercent : 0.6;
    var results = [];
    ((state && state.courses) || []).forEach(function (course) {
      (course.chapters || []).forEach(function (chapter) {
        var r = getChapterRetention(chapter);
        if (r.retention < threshold) {
          results.push({
            course: course,
            chapter: chapter,
            retention: r.retention,
            daysSince: r.daysSince,
            stability: r.stability
          });
        }
      });
    });
    results.sort(function (a, b) { return a.retention - b.retention; });
    return results;
  }

  // ------------------------------------------------------------
  // 認印 — Tampon "Hanko" de validation des résultats
  // -------------------------------------------------------------
  // Un tampon hebdomadaire est dû chaque dimanche, un tampon mensuel est dû
  // le dernier jour du mois. Chaque période n'est validée qu'une seule fois
  // (identifiée par une clé unique : "2026-W32" pour une semaine ISO,
  // "2026-08" pour un mois).
  // ------------------------------------------------------------
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // Clé ISO-8601 de la semaine (ex: "2026-W32").
  function getISOWeekKey(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + '-W' + pad2(weekNo);
  }

  // Clé "année-mois" (ex: "2026-08").
  function getMonthKey(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1);
  }

  // Vrai si `date` est le dernier jour du mois en cours.
  function isLastDayOfMonth(date) {
    var next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return next.getMonth() !== date.getMonth();
  }

  function hasHankoValidation(state, periodKey) {
    return ((state && state.hankoValidations) || []).some(function (v) { return v.periodKey === periodKey; });
  }

  // Ajoute un tampon "hanko" pour la période donnée (une seule fois par
  // période : un doublon est ignoré et null est retourné).
  function addHankoValidation(state, type, periodKey, label) {
    if (!state.hankoValidations) state.hankoValidations = [];
    if (hasHankoValidation(state, periodKey)) return null;
    var entry = { type: type, periodKey: periodKey, label: label || '', validatedAt: new Date().toISOString() };
    state.hankoValidations.push(entry);
    return entry;
  }

  // Retourne les échéances "hanko" dues aujourd'hui et pas encore validées :
  // bilan hebdomadaire (chaque dimanche) et bilan mensuel (dernier jour du mois).
  function getPendingHankoDeadlines(state) {
    var now = new Date();
    var pending = [];
    if (now.getDay() === 0) {
      var weekKey = getISOWeekKey(now);
      if (!hasHankoValidation(state, weekKey)) pending.push({ type: 'weekly', periodKey: weekKey });
    }
    if (isLastDayOfMonth(now)) {
      var monthKey = getMonthKey(now);
      if (!hasHankoValidation(state, monthKey)) pending.push({ type: 'monthly', periodKey: monthKey });
    }
    // Bilan annuel : le 1er janvier, on valide l'année civile écoulée.
    if (now.getMonth() === 0 && now.getDate() === 1) {
      var yearKey = (now.getFullYear() - 1) + '-Y';
      if (!hasHankoValidation(state, yearKey)) pending.push({ type: 'yearly', periodKey: yearKey });
    }
    // Bilan de fin d'année scolaire : le 30 juin.
    if (now.getMonth() === 5 && now.getDate() === 30) {
      var schoolKey = now.getFullYear() + '-SY';
      if (!hasHankoValidation(state, schoolKey)) pending.push({ type: 'schoolyear', periodKey: schoolKey });
    }
    return pending;
  }

  // ------------------------------------------------------------
  // Agrégation du travail réalisé sur une période (semaine, mois, année)
  // ------------------------------------------------------------
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function endOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }

  function getWeekRange(ref) {
    var now = ref ? new Date(ref) : new Date();
    var idx = (now.getDay() + 6) % 7; // 0 = lundi
    var from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - idx);
    var to = endOfDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6));
    return { from: from, to: to };
  }
  function getMonthRange(ref) {
    var now = ref ? new Date(ref) : new Date();
    var from = new Date(now.getFullYear(), now.getMonth(), 1);
    var to = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { from: from, to: to };
  }
  function getYearRange(year) {
    var y = year || new Date().getFullYear();
    return { from: new Date(y, 0, 1), to: endOfDay(new Date(y, 11, 31)) };
  }
  // Année scolaire : 1er septembre -> 30 juin.
  function getSchoolYearRange(ref) {
    var now = ref ? new Date(ref) : new Date();
    var startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: new Date(startYear, 8, 1), to: endOfDay(new Date(startYear + 1, 5, 30)) };
  }

  function parseDateKey(key) {
    var parts = String(key).split('-');
    if (parts.length !== 3) return null;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  // Minutes de Pomodoro / travail enregistrées entre deux dates.
  function getStudyMinutesInRange(state, from, to) {
    ensureDailyLog(state);
    var log = (state.stats && state.stats.dailyLog) || {};
    var total = 0;
    Object.keys(log).forEach(function (key) {
      var d = parseDateKey(key);
      if (d && d >= startOfDay(from) && d <= to) total += Number(log[key]) || 0;
    });
    return total;
  }

  // Minutes passées en entraînement (examens blancs) entre deux dates.
  function getTrainingMinutesInRange(state, from, to) {
    return ((state && state.examTrainings) || []).reduce(function (sum, t) {
      var d = t && t.date ? new Date(t.date) : null;
      if (!d || isNaN(d.getTime()) || d < startOfDay(from) || d > to) return sum;
      return sum + Math.round((Number(t.hours) || 0) * 60);
    }, 0);
  }

  // Nombre de tâches cochées dans la To-do list entre deux dates.
  function getCompletedTodosInRange(state, from, to) {
    var todos = (state && state.todos) || {};
    var count = 0;
    Object.keys(todos).forEach(function (key) {
      var d = parseDateKey(key);
      if (!d || d < startOfDay(from) || d > to) return;
      (todos[key] || []).forEach(function (item) { if (item && item.done) count++; });
    });
    return count;
  }

  // Résumé complet du travail d'une période.
  function getWorkSummary(state, from, to) {
    var study = getStudyMinutesInRange(state, from, to);
    var training = getTrainingMinutesInRange(state, from, to);
    return {
      studyMinutes: study,
      trainingMinutes: training,
      totalMinutes: study + training,
      todosDone: getCompletedTodosInRange(state, from, to)
    };
  }

  // Le bilan annuel n'est proposé qu'à partir du mois de décembre
  // (et jusqu'au 1er janvier, jour de la validation au tampon).
  function isAnnualSummaryAvailable(ref) {
    var now = ref ? new Date(ref) : new Date();
    return now.getMonth() === 11 || (now.getMonth() === 0 && now.getDate() === 1);
  }

  function formatMinutes(mins) {
    var m = Math.max(0, Math.round(Number(mins) || 0));
    var h = Math.floor(m / 60);
    var r = m % 60;
    return h > 0 ? (h + 'h' + pad2(r)) : (r + ' min');
  }

  function safeParse(raw, fallback) {
    if (raw === null || raw === undefined) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return (parsed === null || parsed === undefined) ? fallback : parsed;
    } catch (e) {
      console.warn('[Benkyo] Donnée illisible ignorée, valeur par défaut utilisée à la place.', e);
      return fallback;
    }
  }

  // Charge tout le state depuis localStorage (une fois par page, au chargement)
  function load() {
    var defaults = defaultState();
    var state = {};
    Object.keys(STORAGE_KEYS).forEach(function (key) {
      state[key] = safeParse(localStorage.getItem(STORAGE_KEYS[key]), defaults[key]);
    });
    return state;
  }

  // Données pilotées en direct par tampons.js (carnet de tampons, stickers
  // Kibi dango, moral du jour, temps ajouté à la main) et par rituels.js
  // (gâteau de la chance, daruma). Chaque page charge
  // son `state` une seule fois au chargement : si on réécrivait ces clés
  // depuis cette copie périmée (par exemple via le filet de sécurité
  // autoFlushOn() au moment de quitter la page), le tampon posé juste avant
  // serait effacé et il faudrait le reposer. On laisse donc tampons.js seul
  // maître de ces clés dès qu'elles existent déjà dans le localStorage.
  var LIVE_KEYS = ['stampBook', 'stickers', 'moods', 'manualStudy', 'fortune', 'daruma'];
  function isLiveKey(key) { return LIVE_KEYS.indexOf(key) !== -1; }

  // Sauvegarde immédiate de tout le state dans localStorage
  function save(state) {
    Object.keys(STORAGE_KEYS).forEach(function (key) {
      try {
        if (isLiveKey(key) && localStorage.getItem(STORAGE_KEYS[key]) !== null) {
          // Valeur déjà gérée en direct : on ne l'écrase jamais.
          // On rafraîchit au passage la copie en mémoire de la page.
          try { state[key] = safeParse(localStorage.getItem(STORAGE_KEYS[key]), state[key]); } catch (e2) {}
          return;
        }
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(state[key]));
      } catch (e) {
        console.error('[Benkyo] Échec de la sauvegarde de "' + key + '" (stockage plein ou navigation privée ?)', e);
      }
    });
    try {
      global.dispatchEvent(new CustomEvent('benkyo:saved', { detail: { at: Date.now() } }));
    } catch (e) { /* ignore navigateurs anciens */ }
  }

  // Sauvegarde différée : regroupe les écritures rapprochées (évite de
  // réécrire le localStorage à chaque frappe de clavier)
  var saveTimer = null;
  function saveDebounced(state, delay) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { save(state); }, delay || 300);
  }

  // Force l'écriture immédiate (annule le délai en attente)
  function flush(state) {
    clearTimeout(saveTimer);
    save(state);
  }

  // Sauvegarde automatiquement dès que l'utilisateur quitte la page ou
  // change d'onglet : filet de sécurité pour ne jamais perdre les
  // dernières modifications, même si une saveDebounced() était en attente.
  function autoFlushOn(state) {
    global.addEventListener('pagehide', function () { flush(state); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush(state);
    });
  }

  // Export : télécharge un fichier .json avec toutes les données actuelles.
  // Sert de vraie sauvegarde "portable" (le localStorage seul disparaît si
  // l'utilisateur efface les données de son navigateur).
  function exportBackup(state) {
    var payload = {
      app: 'benkyo',
      exportedAt: new Date().toISOString(),
      data: state
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'benkyo-sauvegarde-' + date + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Import : restaure les données à partir d'un fichier .json exporté
  // précédemment. Retourne une Promise résolue avec le nouveau state.
  function importBackup(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('Aucun fichier fourni')); return; }
      var reader = new FileReader();
      reader.onload = function (evt) {
        try {
          var payload = JSON.parse(evt.target.result);
          var data = (payload && payload.data) ? payload.data : payload;
          var defaults = defaultState();
          var restored = {};
          Object.keys(STORAGE_KEYS).forEach(function (key) {
            var value = (data[key] !== undefined) ? data[key] : defaults[key];
            localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
            restored[key] = value;
          });
          resolve(restored);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = function () { reject(new Error('Lecture du fichier impossible')); };
      reader.readAsText(file);
    });
  }

  // ============================================================
  // Stockage du fichier audio/vidéo personnalisé (IndexedDB) — permet de
  // garder la musique perso "en mémoire" d'une page à l'autre (contrairement
  // à localStorage, IndexedDB peut stocker de gros fichiers binaires), pour
  // pouvoir la reprendre ailleurs que sur l'onglet Pomodoro et afficher son
  // nom dans le petit widget flottant.
  // ============================================================
  var CUSTOM_MEDIA_DB_NAME = 'benkyo_custom_media';
  var CUSTOM_MEDIA_STORE = 'files';
  function openCustomMediaDB() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('IndexedDB indisponible')); return; }
      var req = global.indexedDB.open(CUSTOM_MEDIA_DB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(CUSTOM_MEDIA_STORE)) {
          req.result.createObjectStore(CUSTOM_MEDIA_STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  // Sauvegarde le fichier choisi par l'utilisateur (unique emplacement "current")
  function saveCustomMediaFile(file) {
    return openCustomMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(CUSTOM_MEDIA_STORE, 'readwrite');
        tx.objectStore(CUSTOM_MEDIA_STORE).put({ blob: file, name: file.name, type: file.type }, 'current');
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function (e) { console.warn('[Benkyo] Stockage du média personnalisé impossible', e); });
  }
  function getCustomMediaFile() {
    return openCustomMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(CUSTOM_MEDIA_STORE, 'readonly');
        var req = tx.objectStore(CUSTOM_MEDIA_STORE).get('current');
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return null; });
  }
  // Suit périodiquement la position de lecture (currentTime) d'un élément
  // audio/vidéo et transmet la valeur via callback, pour que chaque page
  // puisse la sauvegarder dans son state. Sans cela, recréer l'élément
  // <audio>/<video> après un changement d'onglet du site (ce que fait chaque
  // page, faute de pouvoir garder l'élément DOM d'une page à l'autre) faisait
  // toujours repartir la musique perso du tout début. Retourne l'ID de
  // l'intervalle, à nettoyer via clearInterval() quand le média s'arrête.
  function trackMediaPosition(mediaEl, onTick, intervalMs) {
    return global.setInterval(function () {
      if (document.hidden) return;
      if (mediaEl && !mediaEl.paused && typeof onTick === 'function') {
        onTick(mediaEl.currentTime);
      }
    }, intervalMs || 5000);
  }

  function clearCustomMediaFile() {
    return openCustomMediaDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(CUSTOM_MEDIA_STORE, 'readwrite');
        tx.objectStore(CUSTOM_MEDIA_STORE).delete('current');
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    }).catch(function () {});
  }

  // Réinitialisation complète des données (bouton "Supprimer mes données" du
  // profil). Utilisée à la place d'un simple localStorage.removeItem() en
  // boucle car deux pièges rendaient l'ancienne version inefficace :
  //   1) Chaque page appelle BenkyoStorage.autoFlushOn(state) au chargement,
  //      qui réenregistre automatiquement `state` dans le localStorage dès
  //      que la page est quittée/masquée (évènements "pagehide" et
  //      "visibilitychange", cf. autoFlushOn ci-dessus). Si on se contente
  //      de vider le localStorage puis de rediriger vers une autre page, ce
  //      filet de sécurité réécrit aussitôt les anciennes données en
  //      mémoire par-dessus le localStorage qu'on vient de vider : la
  //      suppression semblait "ne rien faire". On neutralise donc aussi
  //      l'objet `state` en mémoire (remis à ses valeurs par défaut) pour
  //      qu'une éventuelle sauvegarde automatique déclenchée après coup
  //      réécrive des données vierges plutôt que les anciennes.
  //   2) Le fichier audio/vidéo personnalisé du Pomodoro est stocké à part,
  //      dans IndexedDB (cf. saveCustomMediaFile plus haut), et n'est donc
  //      pas touché par un simple nettoyage du localStorage.
  function resetAllData(state) {
    var defaults = defaultState();
    Object.keys(STORAGE_KEYS).forEach(function (key) {
      try { localStorage.removeItem(STORAGE_KEYS[key]); } catch (e) {}
      // Neutralise le state en mémoire de la page courante pour empêcher
      // le filet de sécurité autoFlushOn() de ressusciter les anciennes
      // données lors de la navigation qui suit la réinitialisation.
      if (state && Object.prototype.hasOwnProperty.call(state, key)) {
        state[key] = defaults[key];
      }
    });
    // Nettoyage best-effort du fichier média personnalisé (IndexedDB) ;
    // ignoré silencieusement si IndexedDB est indisponible.
    try { clearCustomMediaFile(); } catch (e) {}
  }

  // ============================================================
  // Widget flottant Pomodoro — visible sur toutes les pages (sauf
  // Pomodoro elle-même, qui a déjà son propre lecteur/minuteur intégré)
  // afin de garder / relancer la musique (lofi ou perso) et de voir le temps
  // restant (minuteur Pomodoro ou entraînement) en un coup d'œil, sans
  // déranger le reste de la page.
  // ============================================================
  var LOFI_STREAM_URL = 'https://stream.zeno.fm/f3wvbbqmdg8uv';

  function initGlobalPomodoroWidget() {
    if (/pomodoro\.html$/i.test(global.location.pathname)) return;
    if (document.getElementById('benkyo-global-audio-widget')) return;

    function readSession() {
      return safeParse(localStorage.getItem(STORAGE_KEYS.pomodoroSession), defaultState().pomodoroSession);
    }
    function writeSession(session) {
      try { localStorage.setItem(STORAGE_KEYS.pomodoroSession, JSON.stringify(session)); } catch (e) {}
    }
    function readTraining() {
      return safeParse(localStorage.getItem(STORAGE_KEYS.examTrainingSession), defaultState().examTrainingSession);
    }
    function writeTraining(t) {
      try { localStorage.setItem(STORAGE_KEYS.examTrainingSession, JSON.stringify(t)); } catch (e) {}
    }

    var session = readSession();
    var training = readTraining();
    var trainingActive = !!(training && training.isRunning && training.endTimestamp && training.endTimestamp > Date.now());
    // On n'affiche le widget que si une musique est active, qu'une session
    // Pomodoro est en cours, ou qu'un entraînement (examen blanc) est en cours.
    if (session.musicChoice === 'none' && !session.isRunning && !trainingActive) return;

    var wrap = document.createElement('div');
    wrap.id = 'benkyo-global-audio-widget';
    wrap.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:9999;display:flex;align-items:center;gap:8px;font-family:inherit;max-width:calc(100vw - 40px);';

    // Petite pastille de temps restant (Pomodoro ou entraînement) : discrète, ne gêne pas la page
    var timerPill = document.createElement('div');
    timerPill.id = 'benkyo-global-pomo-timer';
    timerPill.style.cssText = 'display:none;align-items:center;gap:6px;background:rgba(19,25,39,0.92);border:1px solid rgba(232, 142, 178,0.4);color:#fff;padding:7px 12px;border-radius:9999px;font-size:12px;font-weight:700;box-shadow:0 8px 22px rgba(0,0,0,0.35);white-space:nowrap;backdrop-filter:blur(4px);';
    timerPill.innerHTML = '<i class="fa-solid fa-stopwatch" style="color:#cba6f7;font-size:11px;"></i><span id="benkyo-global-pomo-timer-text">--:--</span>';
    wrap.appendChild(timerPill);

    // Pastille avec le nom du morceau personnalisé en cours (masquée sinon)
    var trackPill = document.createElement('div');
    trackPill.id = 'benkyo-global-track-pill';
    trackPill.style.cssText = 'display:none;align-items:center;gap:6px;background:rgba(19,25,39,0.92);border:1px solid rgba(166, 227, 161,0.35);color:#a7f3d0;padding:7px 12px;border-radius:9999px;font-size:11px;font-weight:600;box-shadow:0 8px 22px rgba(0,0,0,0.35);max-width:170px;overflow:hidden;backdrop-filter:blur(4px);';
    trackPill.innerHTML = '<i class="fa-solid fa-music" style="color:#a6e3a1;font-size:11px;flex-shrink:0;"></i><span id="benkyo-global-track-text" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>';
    wrap.appendChild(trackPill);

    var btn = document.createElement('button');
    btn.id = 'benkyo-global-audio-toggle';
    btn.type = 'button';
    btn.title = 'Musique Pomodoro';
    btn.style.cssText = 'width:44px;height:44px;border-radius:9999px;background:linear-gradient(135deg,#cba6f7,#89b4fa);color:#fff;border:none;box-shadow:0 8px 22px rgba(232, 142, 178,0.45);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:transform .15s ease;flex-shrink:0;';
    btn.onmouseenter = function () { btn.style.transform = 'scale(1.08)'; };
    btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };
    btn.innerHTML = '<i class="fa-solid fa-music"></i>';
    wrap.appendChild(btn);

    var audio = null;
    var currentKind = 'none'; // 'lofi' | 'custom'
    var customObjectUrl = null;
    function setIcon(iconClass) { btn.innerHTML = '<i class="fa-solid ' + iconClass + '"></i>'; }

    function showTrackName(name) {
      var trackText = document.getElementById('benkyo-global-track-text');
      if (trackText) trackText.textContent = name || 'Musique personnalisée';
      trackPill.style.display = 'flex';
    }
    function hideTrackName() { trackPill.style.display = 'none'; }

    function playLofi() {
      currentKind = 'lofi';
      hideTrackName();
      if (customObjectUrl) { URL.revokeObjectURL(customObjectUrl); customObjectUrl = null; }
      if (!audio || !audio.src || audio.src.indexOf('zeno.fm') === -1) {
        if (audio) audio.pause();
        audio = new Audio(LOFI_STREAM_URL);
        audio.crossOrigin = 'anonymous';
      }
      audio.play().then(function () {
        setIcon('fa-volume-high');
      }).catch(function () {
        // Lecture automatique bloquée par le navigateur : l'utilisateur devra cliquer.
        setIcon('fa-play');
      });
      // Empêche Safari/macOS de couper la radio quand on change d'onglet
      // du navigateur : on relance dès qu'elle est mise en veille.
      if (stopKeepPlaying) stopKeepPlaying();
      stopKeepPlaying = keepMediaPlaying(audio, function () { return !readSession().musicPaused; });
      keepAudioSessionAlive();
    }

    var customPositionInterval = null;
    var stopKeepPlaying = null;

    // Reprend la musique/vidéo personnalisée depuis l'IndexedDB partagée : elle
    // reste ainsi "présente" (nom visible + reprise possible) même en changeant
    // d'onglet du site, sans avoir à retourner sur l'onglet Pomodoro. La lecture
    // reprend à la position mémorisée (session.customMediaPosition) plutôt que
    // de repartir du début.
    function playCustom() {
      currentKind = 'custom';
      setIcon('fa-spinner fa-spin');
      getCustomMediaFile().then(function (record) {
        if (!record || !record.blob) { setIcon('fa-triangle-exclamation'); return; }
        showTrackName(record.name);
        if (customObjectUrl) URL.revokeObjectURL(customObjectUrl);
        customObjectUrl = URL.createObjectURL(record.blob);
        if (audio) audio.pause();
        audio = new Audio(customObjectUrl);
        audio.loop = true;
        var resumeAt = readSession().customMediaPosition || 0;
        audio.addEventListener('loadedmetadata', function () {
          if (resumeAt > 0 && resumeAt < (audio.duration || Infinity)) audio.currentTime = resumeAt;
        });
        audio.play().then(function () {
          setIcon('fa-volume-high');
        }).catch(function () {
          setIcon('fa-play');
        });
        if (customPositionInterval) global.clearInterval(customPositionInterval);
        customPositionInterval = trackMediaPosition(audio, function (t) {
          var s = readSession();
          s.customMediaPosition = t;
          writeSession(s);
        });
        // Reprise automatique après une mise en veille de l'onglet
        if (stopKeepPlaying) stopKeepPlaying();
        stopKeepPlaying = keepMediaPlaying(audio, function () { return !readSession().musicPaused; });
        keepAudioSessionAlive();
      }).catch(function () { setIcon('fa-triangle-exclamation'); });
    }

    // Met en pause la musique SANS la décharger : un simple clic la relance
    // exactement là où elle en était (contrairement à un arrêt complet).
    function pauseAudio() {
      if (stopKeepPlaying) { stopKeepPlaying(); stopKeepPlaying = null; }
      if (audio) {
        audio.pause();
        if (currentKind === 'custom') {
          var s = readSession();
          s.customMediaPosition = audio.currentTime;
          writeSession(s);
        }
      }
      setIcon(currentKind === 'custom' ? 'fa-play' : 'fa-volume-xmark');
    }

    btn.addEventListener('click', function () {
      var s = readSession();
      if (audio && !audio.paused) {
        pauseAudio();
        s.musicPaused = true;
        writeSession(s);
        return;
      }
      s.musicPaused = false;
      if (s.musicChoice === 'custom') {
        playCustom();
      } else {
        playLofi();
        s.musicChoice = 'lofi';
      }
      writeSession(s);
    });

    document.body.appendChild(wrap);

    if (session.musicChoice === 'lofi') {
      if (session.musicPaused) {
        // La musique avait été explicitement mise en pause : on ne la relance
        // pas toute seule en changeant de page, on reflète juste l'état "pause".
        currentKind = 'lofi';
        setIcon('fa-volume-xmark');
      } else {
        playLofi();
      }
    } else if (session.musicChoice === 'custom') {
      if (session.customTrackName) showTrackName(session.customTrackName);
      if (session.musicPaused) {
        currentKind = 'custom';
        setIcon('fa-play');
      } else {
        // Tentative de reprise automatique : si le navigateur bloque l'autoplay,
        // l'utilisateur n'a qu'à cliquer une fois sur le bouton musique.
        playCustom();
      }
    } else {
      setIcon('fa-music');
    }

    // Rafraîchit le temps restant chaque seconde, et masque le widget
    // dès qu'il n'y a plus ni musique, ni minuteur, ni entraînement en cours.
    function formatRemaining(totalSeconds) {
      var s = Math.max(0, Math.round(totalSeconds));
      var m = Math.floor(s / 60);
      var sec = s % 60;
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
    function formatRemainingLong(totalSeconds) {
      var s = Math.max(0, Math.round(totalSeconds));
      var h = Math.floor(s / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
    function tick() {
      // Onglet en arrière-plan : inutile de lire le stockage et de repeindre
      // chaque seconde, l'affichage sera remis à jour au retour.
      if (document.hidden) return;
      var s = readSession();
      var t = readTraining();
      var tActive = !!(t && t.isRunning && t.endTimestamp && t.endTimestamp > Date.now());
      var timerText = document.getElementById('benkyo-global-pomo-timer-text');

      if (tActive) {
        var remainingT = (t.endTimestamp - Date.now()) / 1000;
        timerPill.style.display = 'flex';
        if (timerText) timerText.textContent = 'Entraînement ' + formatRemainingLong(remainingT);
      } else if (s.isRunning && s.phaseEndTimestamp) {
        var remaining = (s.phaseEndTimestamp - Date.now()) / 1000;
        timerPill.style.display = 'flex';
        var phaseLabel = s.phase === 'break' ? 'Pause' : (s.phase === 'longbreak' ? 'Pause+' : 'Focus');
        if (timerText) timerText.textContent = phaseLabel + ' ' + formatRemaining(remaining);
      } else {
        timerPill.style.display = 'none';
        // Un entraînement vient éventuellement de se terminer pendant qu'on était sur cette page :
        // on le marque comme arrêté pour que le widget se referme correctement.
        if (t && t.isRunning && t.endTimestamp && t.endTimestamp <= Date.now()) {
          t.isRunning = false;
          writeTraining(t);
        }
      }

      // Si plus rien n'est actif (ni musique, ni minuteur, ni entraînement), on retire le widget
      if (s.musicChoice === 'none' && !s.isRunning && !tActive && (!audio || audio.paused)) {
        wrap.remove();
        clearInterval(pollInterval);
        if (customPositionInterval) clearInterval(customPositionInterval);
        if (customObjectUrl) URL.revokeObjectURL(customObjectUrl);
      }
    }
    tick();
    var pollInterval = setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalPomodoroWidget);
  } else {
    initGlobalPomodoroWidget();
  }

  // ============================================================
  // Menu de navigation en accordéon sur mobile / petite fenêtre
  // ------------------------------------------------------------
  // Le menu latéral liste 11 onglets : sur téléphone (ou fenêtre
  // très réduite), les afficher tous en permanence prend trop de
  // place et gêne la lecture de la page. On les masque par défaut
  // et on ajoute une barre "menu" qui les affiche en liste
  // déroulante au clic, uniquement en dessous du seuil `md` (768px).
  // Au-delà de ce seuil, le menu reste affiché normalement.
  // ============================================================
  // ============================================================
  // Cloche de temple japonais (synthétisée via Web Audio, aucun fichier
  // externe requis) + phrases d'encouragement japonaises traduites.
  // Utilisées par l'onglet Pomodoro, le Mode Focus, et l'entraînement.
  // ============================================================
  var bellAudioCtx = null;
  function playTempleBellSound(intensity) {
    try {
      if (!bellAudioCtx) bellAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (bellAudioCtx.state === 'suspended') bellAudioCtx.resume();
      var ctx = bellAudioCtx;
      var now = ctx.currentTime;
      var vol = (typeof intensity === 'number') ? intensity : 0.5;
      var baseFreq = 440;
      // Ratios inharmoniques typiques d'une cloche/bol tibétain-japonais (timbre métallique clair)
      var partials = [
        { ratio: 1,    gain: 0.55, decay: 3.2 },
        { ratio: 1.51, gain: 0.28, decay: 2.4 },
        { ratio: 2.0,  gain: 0.18, decay: 1.8 },
        { ratio: 2.74, gain: 0.12, decay: 1.3 },
        { ratio: 4.2,  gain: 0.07, decay: 0.9 }
      ];
      var master = ctx.createGain();
      master.gain.value = vol;
      master.connect(ctx.destination);

      partials.forEach(function (p) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * p.ratio;
        osc.connect(gain);
        gain.connect(master);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
        osc.start(now);
        osc.stop(now + p.decay + 0.1);
      });

      // Petit transitoire de frappe (bruit filtré très bref) pour l'attaque métallique
      var noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      var noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      var noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 2500;
      var noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.18 * vol;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch (e) { console.error('[Benkyo] Impossible de jouer la cloche :', e); }
  }

  // ------------------------------------------------------------
  // Carillon d'école japonais (synthétisé via Web Audio, aucun fichier
  // externe requis) : reprend le motif mélodique classique "Kiin Koon Kaan
  // Koon" (motif "Westminster") utilisé pour marquer la fin des cours au
  // Japon. Chaque note résonne comme une cloche, pour un son long (~4s) et
  // mélodieux. Utilisé pour la fin d'une session Pomodoro / d'un
  // entraînement (examen blanc), et joué deux fois de suite (repeat=true)
  // pour célébrer la fin d'un cycle complet de 4 sessions.
  // ------------------------------------------------------------
  var chimeAudioCtx = null;
  function playSchoolChimeSound(repeat) {
    try {
      if (!chimeAudioCtx) chimeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (chimeAudioCtx.state === 'suspended') chimeAudioCtx.resume();
      var ctx = chimeAudioCtx;

      // Motif "Kiin Koon Kaan Koon" (4 notes, comme le carillon Westminster)
      var notes = [659.25, 554.37, 587.33, 440.00]; // Mi5, Do#5, Ré5, La4
      var noteInterval = 1.05; // écart entre le début de chaque note
      var decay = 1.7;         // durée de résonance de chaque note

      function ringNote(freq, startAt) {
        var partials = [
          { ratio: 1,    gain: 0.5,  decay: decay },
          { ratio: 2.01, gain: 0.22, decay: decay * 0.7 },
          { ratio: 2.4,  gain: 0.14, decay: decay * 0.5 },
          { ratio: 4.05, gain: 0.06, decay: decay * 0.35 }
        ];
        var master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
        partials.forEach(function (p) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq * p.ratio;
          osc.connect(gain);
          gain.connect(master);
          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(p.gain, startAt + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + p.decay);
          osc.start(startAt);
          osc.stop(startAt + p.decay + 0.1);
        });
      }

      function playSequence(offsetSeconds) {
        var startTime = ctx.currentTime + offsetSeconds;
        notes.forEach(function (freq, i) {
          ringNote(freq, startTime + i * noteInterval);
        });
        return notes.length * noteInterval;
      }

      // Fin d'un cycle complet (ou d'un entraînement) : on joue le carillon
      // de Westminster en entier (~11 s) au lieu du motif court.
      if (repeat) { playWestminsterChime(); return; }
      playSequence(0);
    } catch (e) { console.error('[Benkyo] Impossible de jouer le carillon d\'école :', e); }
  }

  // ------------------------------------------------------------
  // Carillon de Westminster « long » (~11 s) : les 4 phrases complètes
  // du carillon, jouées à la fin d'un cycle Pomodoro complet (4 sessions)
  // et à la fin d'un entraînement (examen blanc).
  // ------------------------------------------------------------
  // Notes du carillon de Westminster : Si3, Mi4, Fa#4, Sol#4
  var WM = { B: 246.94, E: 329.63, FS: 369.99, GS: 415.30 };
  var WESTMINSTER_PHRASES = [
    [WM.GS, WM.FS, WM.E, WM.B],
    [WM.E, WM.GS, WM.FS, WM.B],
    [WM.E, WM.FS, WM.GS, WM.E],
    [WM.GS, WM.E, WM.FS, WM.B]
  ];

  // Fait sonner une note de cloche (partiels inharmoniques) à un instant
  // absolu du contexte audio : la note est *programmée*, donc elle sonnera
  // même si l'onglet passe en arrière-plan entre-temps.
  function ringBellNote(ctx, freq, startAt, decay, volume) {
    var partials = [
      { ratio: 1,    gain: 0.5,  decay: decay },
      { ratio: 2.01, gain: 0.22, decay: decay * 0.7 },
      { ratio: 2.4,  gain: 0.14, decay: decay * 0.5 },
      { ratio: 4.05, gain: 0.06, decay: decay * 0.35 }
    ];
    var master = ctx.createGain();
    master.gain.value = (typeof volume === 'number') ? volume : 0.55;
    master.connect(ctx.destination);
    partials.forEach(function (p) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * p.ratio;
      osc.connect(gain);
      gain.connect(master);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(p.gain, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + p.decay);
      osc.start(startAt);
      osc.stop(startAt + p.decay + 0.1);
    });
  }

  // Joue le carillon complet. `startAt` (optionnel) permet de le programmer
  // à l'avance sur l'horloge audio. Durée totale ≈ 11 secondes.
  function playWestminsterChime(startAt) {
    try {
      var ctx = getChimeCtx();
      if (!ctx) return 0;
      var t = (typeof startAt === 'number') ? startAt : ctx.currentTime + 0.05;
      var noteInterval = 0.62;
      var phrasePause = 0.36;
      var cursor = t;
      WESTMINSTER_PHRASES.forEach(function (phrase) {
        phrase.forEach(function (freq, i) {
          ringBellNote(ctx, freq, cursor + i * noteInterval, 2.1, 0.5);
        });
        cursor += phrase.length * noteInterval + phrasePause;
      });
      // Coup grave final, qui fait durer la résonance jusqu'à ~11 s
      ringBellNote(ctx, WM.B / 2, cursor, 3.2, 0.55);
      return (cursor + 3.2) - t;
    } catch (e) {
      console.error('[Benkyo] Impossible de jouer le carillon de Westminster :', e);
      return 0;
    }
  }

  // ============================================================
  // BenkyoAudio — sons fiables même quand l'onglet est en arrière-plan
  // ------------------------------------------------------------
  // Deux problèmes réglés ici :
  //  1) Safari/macOS suspend le contexte audio et coupe la musique quand
  //     l'onglet n'est plus au premier plan : on garde une « session audio »
  //     vivante (piste silencieuse en boucle) et on réveille le contexte
  //     dès que possible.
  //  2) Les minuteurs JS sont fortement ralentis en arrière-plan : les
  //     sonneries de fin de session sont donc *programmées à l'avance* sur
  //     l'horloge du contexte audio (précise et non ralentie), avec en plus
  //     une notification système.
  // ============================================================
  var SILENT_LOOP_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';
  var keepAliveAudio = null;
  var keepAliveOsc = null;

  function getChimeCtx() {
    try {
      if (!chimeAudioCtx) chimeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (chimeAudioCtx.state === 'suspended') chimeAudioCtx.resume();
      return chimeAudioCtx;
    } catch (e) { return null; }
  }

  // Maintient la « session audio » de l'onglet active : tant qu'un média
  // silencieux tourne en boucle, le navigateur (Safari en particulier)
  // considère l'onglet comme un lecteur audio et ne le met pas en veille.
  function keepAudioSessionAlive() {
    // Optimisation : on se contente de réveiller le contexte audio quand
    // c'est nécessaire. L'ancienne version faisait tourner en permanence un
    // son silencieux en boucle + un oscillateur, ce qui empêchait le
    // navigateur de mettre l'onglet en veille et saturait le processeur.
    try {
      var ctx = chimeAudioCtx;
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }

  function stopAudioSessionKeepAlive() {
    try { if (keepAliveAudio) { keepAliveAudio.pause(); keepAliveAudio = null; } } catch (e) {}
    try { if (keepAliveOsc) { keepAliveOsc.stop(); keepAliveOsc.disconnect(); keepAliveOsc = null; } } catch (e) {}
  }

  // À appeler sur un geste utilisateur (clic « Démarrer », etc.) : débloque
  // le son pour toute la suite, y compris en arrière-plan.
  function unlockAudio() {
    getChimeCtx();
    if (!bellAudioCtx) { try { bellAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (bellAudioCtx && bellAudioCtx.state === 'suspended') bellAudioCtx.resume();
    keepAudioSessionAlive();
    requestAlarmNotifications();
  }

  function requestAlarmNotifications() {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(function () {});
      }
    } catch (e) {}
  }

  function notifyAlarm(title, body) {
    try {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      var n = new Notification(title, { body: body || '', tag: 'benkyo-alarm', renotify: true, icon: 'icon-192.png' });
      n.onclick = function () { try { window.focus(); n.close(); } catch (e) {} };
    } catch (e) {}
  }

  function playAlarmSound(kind) {
    if (kind === 'westminster') return playWestminsterChime();
    if (kind === 'bell') { playTempleBellSound(0.55); return 3.3; }
    playSchoolChimeSound(false);
    return 4.5;
  }

  // Sonneries programmées : chaque alarme est déclenchée par une horloge
  // vérifiée chaque seconde, et *pré-programmée* sur le contexte audio dès
  // qu'il reste moins de 25 s, pour rester fiable en arrière-plan.
  var scheduledAlarms = [];
  var alarmClock = null;

  function ensureAlarmClock() {
    if (alarmClock) return;
    alarmClock = global.setInterval(function () {
      var now = Date.now();
      scheduledAlarms = scheduledAlarms.filter(function (a) {
        if (a.cancelled) return false;
        var msLeft = a.at - now;
        if (!a.preScheduled && msLeft <= 25000) {
          var ctx = getChimeCtx();
          if (ctx) {
            var at = ctx.currentTime + Math.max(0, msLeft) / 1000;
            if (a.kind === 'westminster') playWestminsterChime(at);
            else {
              // Motif court : 4 notes de cloche programmées
              [659.25, 554.37, 587.33, 440.0].forEach(function (f, i) {
                ringBellNote(ctx, f, at + i * 1.05, 1.7, 0.55);
              });
            }
            a.preScheduled = true;
          }
        }
        if (msLeft <= 0) {
          if (!a.preScheduled) playAlarmSound(a.kind);
          if (a.title) notifyAlarm(a.title, a.body);
          if (typeof a.onFire === 'function') { try { a.onFire(); } catch (e) {} }
          return false;
        }
        return true;
      });
      if (!scheduledAlarms.length) { global.clearInterval(alarmClock); alarmClock = null; }
    }, 1000);
  }

  // Programme une sonnerie pour un instant donné (timestamp epoch ms).
  // Retourne un identifiant à passer à cancelAlarm().
  var alarmSeq = 1;
  function scheduleAlarm(atTimestamp, options) {
    var opts = options || {};
    var alarm = {
      id: alarmSeq++,
      at: atTimestamp,
      kind: opts.kind || 'chime',
      title: opts.title || '',
      body: opts.body || '',
      onFire: opts.onFire || null,
      preScheduled: false,
      cancelled: false
    };
    keepAudioSessionAlive();
    scheduledAlarms.push(alarm);
    ensureAlarmClock();
    return alarm.id;
  }

  function cancelAlarm(id) {
    scheduledAlarms.forEach(function (a) { if (a.id === id) a.cancelled = true; });
    scheduledAlarms = scheduledAlarms.filter(function (a) { return !a.cancelled; });
  }

  function cancelAllAlarms() {
    scheduledAlarms = [];
    if (alarmClock) { global.clearInterval(alarmClock); alarmClock = null; }
  }

  // Relance un média mis en veille par le navigateur quand l'onglet
  // redevient visible — ET tant que l'onglet est en arrière-plan.
  // Safari/Chrome mettent en pause les onglets d'arrière-plan : on écoute
  // l'événement "pause" pour relancer immédiatement (plusieurs tentatives,
  // car le navigateur refuse parfois la toute première), on surveille en
  // continu via un intervalle de secours, et on déclare une "Media Session"
  // pour que le système considère l'onglet comme un vrai lecteur audio.
  function keepMediaPlaying(mediaEl, shouldPlay) {
    if (!mediaEl) return function () {};

    var stopped = false;
    var retryTimers = [];

    function allowed() {
      return !stopped && (typeof shouldPlay !== 'function' || shouldPlay());
    }

    function resume() {
      try {
        if (!allowed()) return;
        var ctx = chimeAudioCtx;
        if (ctx && ctx.state === 'suspended') ctx.resume();
        if (mediaEl.paused && !mediaEl.ended) {
          var p = mediaEl.play();
          if (p && p.catch) p.catch(function () {});
        }
      } catch (e) {}
    }

    // Plusieurs tentatives échelonnées : la première peut être refusée juste
    // après la mise en veille de l'onglet par le navigateur.
    function resumeWithRetries() {
      [0, 250, 800, 2000, 5000].forEach(function (delay) {
        retryTimers.push(global.setTimeout(resume, delay));
      });
    }

    var onVisibility = function () { resumeWithRetries(); };
    var onPause = function () { resumeWithRetries(); };

    document.addEventListener('visibilitychange', onVisibility);
    global.addEventListener('focus', onVisibility);
    global.addEventListener('pageshow', onVisibility);
    mediaEl.addEventListener('pause', onPause);
    mediaEl.addEventListener('stalled', onPause);
    mediaEl.addEventListener('suspend', onPause);

    // Filet de sécurité : on vérifie régulièrement que la lecture continue.
    var watchdog = global.setInterval(resume, 3000);

    // Media Session : l'onglet est reconnu comme lecteur audio par le système
    // (touches média, centre de contrôle macOS) et est bien moins souvent
    // suspendu quand il passe en arrière-plan.
    try {
      if (global.navigator && global.navigator.mediaSession) {
        var ms = global.navigator.mediaSession;
        if (global.MediaMetadata) {
          ms.metadata = new global.MediaMetadata({
            title: 'Benkyō — musique d\'étude',
            artist: 'Benkyō',
            album: 'Lofi Focus'
          });
        }
        ms.playbackState = 'playing';
        ms.setActionHandler('play', function () { resume(); });
        ms.setActionHandler('pause', function () { try { mediaEl.pause(); } catch (e) {} });
      }
    } catch (e) {}

    return function () {
      stopped = true;
      retryTimers.forEach(function (t) { global.clearTimeout(t); });
      retryTimers = [];
      global.clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVisibility);
      global.removeEventListener('focus', onVisibility);
      global.removeEventListener('pageshow', onVisibility);
      mediaEl.removeEventListener('pause', onPause);
      mediaEl.removeEventListener('stalled', onPause);
      mediaEl.removeEventListener('suspend', onPause);
      try {
        if (global.navigator && global.navigator.mediaSession) {
          global.navigator.mediaSession.playbackState = 'paused';
        }
      } catch (e) {}
    };
  }

  // Petites phrases d'encouragement japonaises (expressions courantes), avec traduction française
  var JAPANESE_ENCOURAGEMENTS = [
    { kanji: 'お疲れ様でした', romaji: 'Otsukaresama deshita', fr: 'Merci pour tes efforts !' },
    { kanji: 'よく頑張ったね', romaji: 'Yoku ganbatta ne', fr: 'Tu as vraiment bien travaillé !' },
    { kanji: '素晴らしい', romaji: 'Subarashii', fr: 'Formidable !' },
    { kanji: 'さすがだね', romaji: 'Sasuga da ne', fr: 'Tu es vraiment doué(e) !' },
    { kanji: 'その調子', romaji: 'Sono chōshi', fr: 'Continue comme ça !' },
    { kanji: '完璧', romaji: 'Kanpeki', fr: 'Parfait !' }
  ];
  function getRandomJapaneseEncouragement() {
    return JAPANESE_ENCOURAGEMENTS[Math.floor(Math.random() * JAPANESE_ENCOURAGEMENTS.length)];
  }

  // ============================================================
  // Journal quotidien du temps d'étude — partagé entre les pages
  // (Pomodoro, Mode Focus) pour que les statistiques restent cohérentes
  // partout où l'on peut enregistrer du temps de travail.
  // ============================================================
  function dateKeyOf(d) {
    var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function ensureDailyLog(state) {
    if (!state.stats) state.stats = defaultState().stats;
    if (!state.stats.dailyLog) {
      state.stats.dailyLog = {};
      if (state.stats.todayMinutes) {
        state.stats.dailyLog[dateKeyOf(new Date())] = state.stats.todayMinutes;
      }
    }
  }
  function logStudyMinutes(state, seconds) {
    var mins = Math.round(seconds / 60);
    if (mins <= 0) return;
    ensureDailyLog(state);
    var key = dateKeyOf(new Date());
    state.stats.dailyLog[key] = (state.stats.dailyLog[key] || 0) + mins;
  }

  function initMobileNav() {
    var aside = document.querySelector('aside');
    if (!aside) return;
    var nav = aside.querySelector('nav');
    if (!nav || aside.querySelector('.benkyo-mobile-nav-toggle')) return;

    var activeBtn = nav.querySelector('.nav-btn.active');
    var labelSpan = activeBtn ? activeBtn.querySelector('span') : null;
    var label = labelSpan ? labelSpan.textContent : 'Menu';
    var iconEl = activeBtn ? activeBtn.querySelector('i') : null;
    var iconHTML = iconEl ? iconEl.outerHTML : '<i class="fa-solid fa-bars"></i>';

    var bar = document.createElement('button');
    bar.type = 'button';
    bar.setAttribute('aria-label', 'Ouvrir le menu de navigation');
    bar.className = 'benkyo-mobile-nav-toggle md:hidden w-full flex items-center justify-between px-4 py-3 border-b border-dark-border text-sm font-semibold text-white bg-[#05070c]';
    bar.innerHTML =
      '<span class="flex items-center gap-2.5"><span class="text-brand-purple">' + iconHTML + '</span><span>' + label + '</span></span>' +
      '<i class="fa-solid fa-chevron-down text-slate-400 transition-transform duration-200" data-benkyo-chevron></i>';

    nav.classList.add('hidden', 'md:block');
    nav.parentNode.insertBefore(bar, nav);

    var chevron = bar.querySelector('[data-benkyo-chevron]');
    bar.addEventListener('click', function () {
      var willOpen = nav.classList.contains('hidden');
      if (willOpen) {
        nav.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
      } else {
        nav.classList.add('hidden');
        chevron.style.transform = '';
      }
    });

    // Referme le menu automatiquement après avoir choisi un onglet
    nav.addEventListener('click', function (evt) {
      if (evt.target.closest('.nav-btn')) {
        nav.classList.add('hidden');
        chevron.style.transform = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }

  // ==========================================================================
  // FAVICON — affichage fiable sur Safari / macOS
  // --------------------------------------------------------------------------
  // Safari ne redemande pas toujours l'icône déclarée en lien relatif : selon
  // le cache, certains onglets restaient sans favicon. On réinjecte donc ici,
  // sur CHAQUE page, une icône SVG intégrée directement dans le code (data URI)
  // : aucune requête réseau, aucun cache à rafraîchir, l'onglet affiche
  // toujours le sceau 勉強. Les fichiers .ico/.png restent déclarés pour les
  // autres navigateurs et pour l'écran d'accueil iOS.
  // ==========================================================================
  var BENKYO_FAVICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<g transform="rotate(-3 50 50)">' +
    '<rect x="8" y="8" width="84" height="84" rx="10" fill="%23c1272d"/>' +
    '<rect x="14" y="14" width="72" height="72" rx="7" fill="none" stroke="%23ffffff" stroke-width="1.6" opacity="0.85"/>' +
    '<text x="50" y="41" text-anchor="middle" dominant-baseline="middle" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" font-size="33" fill="%23ffffff" font-weight="700">%E5%8B%89</text>' +
    '<text x="50" y="75" text-anchor="middle" dominant-baseline="middle" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" font-size="33" fill="%23ffffff" font-weight="700">%E5%BC%B7</text>' +
    '</g></svg>';

  function applyBenkyoFavicon() {
    try {
      var head = document.head || document.getElementsByTagName('head')[0];
      if (!head) return;

      // Safari ne retient que le dernier lien d'icône valide : on repositionne
      // les nôtres proprement, en supprimant d'éventuels doublons dynamiques.
      var stale = head.querySelectorAll('link[data-benkyo-favicon]');
      for (var i = 0; i < stale.length; i++) head.removeChild(stale[i]);

      var svgLink = document.createElement('link');
      svgLink.rel = 'icon';
      svgLink.type = 'image/svg+xml';
      svgLink.setAttribute('data-benkyo-favicon', 'svg');
      svgLink.href = 'data:image/svg+xml;charset=utf-8,' + BENKYO_FAVICON_SVG;
      head.appendChild(svgLink);

      // Repli PNG (Safari ancien, Chrome, Firefox) avec le même rendu.
      var pngLink = document.createElement('link');
      pngLink.rel = 'icon';
      pngLink.type = 'image/png';
      pngLink.sizes = '32x32';
      pngLink.setAttribute('data-benkyo-favicon', 'png');
      pngLink.href = 'favicon-32x32.png';
      head.appendChild(pngLink);

      var touchLink = document.createElement('link');
      touchLink.rel = 'apple-touch-icon';
      touchLink.setAttribute('sizes', '180x180');
      touchLink.setAttribute('data-benkyo-favicon', 'apple');
      touchLink.href = 'apple-touch-icon.png';
      head.appendChild(touchLink);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBenkyoFavicon);
  } else {
    applyBenkyoFavicon();
  }
  // Certains onglets Safari repeignent la barre d'onglets au retour de veille :
  // on réapplique l'icône à ce moment-là.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) applyBenkyoFavicon();
  });

  global.BenkyoStorage = {
    STORAGE_KEYS: STORAGE_KEYS,
    defaultState: defaultState,
    load: load,
    save: save,
    saveDebounced: saveDebounced,
    flush: flush,
    autoFlushOn: autoFlushOn,
    exportBackup: exportBackup,
    importBackup: importBackup,
    getChapterStabilityDays: getChapterStabilityDays,
    getChapterRetention: getChapterRetention,
    getChaptersNeedingRevision: getChaptersNeedingRevision,
    playTempleBellSound: playTempleBellSound,
    playSchoolChimeSound: playSchoolChimeSound,
    playWestminsterChime: playWestminsterChime,
    unlockAudio: unlockAudio,
    keepAudioSessionAlive: keepAudioSessionAlive,
    stopAudioSessionKeepAlive: stopAudioSessionKeepAlive,
    keepMediaPlaying: keepMediaPlaying,
    scheduleAlarm: scheduleAlarm,
    cancelAlarm: cancelAlarm,
    cancelAllAlarms: cancelAllAlarms,
    requestAlarmNotifications: requestAlarmNotifications,
    notifyAlarm: notifyAlarm,
    getRandomJapaneseEncouragement: getRandomJapaneseEncouragement,
    dateKeyOf: dateKeyOf,
    ensureDailyLog: ensureDailyLog,
    logStudyMinutes: logStudyMinutes,
    saveCustomMediaFile: saveCustomMediaFile,
    getCustomMediaFile: getCustomMediaFile,
    clearCustomMediaFile: clearCustomMediaFile,
    trackMediaPosition: trackMediaPosition,
    resetAllData: resetAllData,
    getISOWeekKey: getISOWeekKey,
    getMonthKey: getMonthKey,
    isLastDayOfMonth: isLastDayOfMonth,
    hasHankoValidation: hasHankoValidation,
    addHankoValidation: addHankoValidation,
    getPendingHankoDeadlines: getPendingHankoDeadlines,
    getWeekRange: getWeekRange,
    getMonthRange: getMonthRange,
    getYearRange: getYearRange,
    getSchoolYearRange: getSchoolYearRange,
    getStudyMinutesInRange: getStudyMinutesInRange,
    getTrainingMinutesInRange: getTrainingMinutesInRange,
    getCompletedTodosInRange: getCompletedTodosInRange,
    getWorkSummary: getWorkSummary,
    isAnnualSummaryAvailable: isAnnualSummaryAvailable,
    formatMinutes: formatMinutes,
    applyFavicon: applyBenkyoFavicon
  };
})(window);

/* ============================================================
   FOCUS TRAIN COMPANION — Billet flottant & Musique inter-onglets
   Affiche un rappel discret (mini-billet japonais) quand le train
   roule et que l'utilisateur navigue sur un autre onglet/page.
   Permet également de continuer d'écouter la musique (Lofi / MP3)
   et de la couper/relancer depuis n'importe quel onglet.
   ============================================================ */
(function(window) {
  'use strict';
  var JOURNEY_KEY = 'benkyo_focus_train_journey_v1';
  var AUDIO_KEY = 'benkyo_focus_train_audio_v1';
  var companionAudio = null;
  var tickerTimer = null;
  var isMinimized = false;
  var isClosedByUser = false;

  var CITIES = {
    tokyo: 'Tōkyō', kyoto: 'Kyōto', osaka: 'Ōsaka', nagoya: 'Nagoya',
    kobe: 'Kōbe', hiroshima: 'Hiroshima', fukuoka: 'Fukuoka', sendai: 'Sendai',
    sapporo: 'Sapporo', kanazawa: 'Kanazawa', nara: 'Nara', yokohama: 'Yokohama',
    kagoshima: 'Kagoshima', aomori: 'Aomori', hakodate: 'Hakodate', kumamoto: 'Kumamoto',
    okayama: 'Okayama', takamatsu: 'Takamatsu', matsue: 'Matsue', nagano: 'Nagano'
  };

  function cityName(id) {
    if (!id) return '';
    return CITIES[id] || (String(id).charAt(0).toUpperCase() + String(id).slice(1));
  }

  function readJourney() {
    try {
      var raw = localStorage.getItem(JOURNEY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function readAudioState() {
    try {
      var raw = localStorage.getItem(AUDIO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function saveAudioState(state) {
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify(state));
    } catch(e) {}
  }

  function getJourneyProgress(journey) {
    if (!journey || !journey.departedAt) return null;
    var legs = (journey.plan && Array.isArray(journey.plan.legs) && journey.plan.legs.length)
      ? journey.plan.legs
      : [{ from: journey.from, to: journey.to, minutes: journey.durationMinutes || journey.minutes || 25, breakAfter: 0 }];
    var totalMinutes = legs.reduce(function(sum, l) { return sum + (l.minutes || 0) + (l.breakAfter || 0); }, 0);
    var duration = totalMinutes * 60000;
    var elapsed = Date.now() - journey.departedAt;
    if (elapsed >= duration) return null; // Trajet terminé

    var remainingMs = Math.max(0, duration - elapsed);
    var remainingTotalSec = Math.floor(remainingMs / 1000);
    var h = Math.floor(remainingTotalSec / 3600);
    var m = Math.floor((remainingTotalSec % 3600) / 60);
    var s = remainingTotalSec % 60;
    var timeStr = (h > 0 ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;

    var trainName = (journey.train || '').toLowerCase();
    var maxSpeed = 285;
    if (trainName.indexOf('hayabusa') !== -1) maxSpeed = 320;
    else if (trainName.indexOf('kagayaki') !== -1) maxSpeed = 260;
    else if (trainName.indexOf('rapid') !== -1 || trainName.indexOf('line') !== -1) maxSpeed = 130;

    var speed = maxSpeed;
    if (elapsed < 25000) speed = Math.round(maxSpeed * Math.max(0.1, elapsed / 25000));
    else if (remainingMs < 35000) speed = Math.round(maxSpeed * Math.max(0, remainingMs / 35000));
    else speed = Math.round(maxSpeed + Math.sin(Date.now() / 3200) * 2);

    return {
      journey: journey,
      legs: legs,
      from: cityName(legs[0].from),
      to: cityName(legs[legs.length - 1].to),
      train: journey.train || 'Shinkansen',
      coach: journey.coachNumber || (legs[0] && legs[0].coach) || 1,
      seat: journey.seat || (legs[0] && legs[0].seat) || '12A',
      remainingMs: remainingMs,
      timeStr: timeStr,
      speed: speed,
      progressPercent: Math.min(100, Math.floor((elapsed / duration) * 100))
    };
  }

  function isViewingFocusTrainDashboard() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('pomodoro.html') === -1) return false;
    var trainSubtab = document.getElementById('pomo-subtab-focus-train');
    return Boolean(trainSubtab && !trainSubtab.classList.contains('hidden'));
  }

  function injectTicketStyles() {
    if (document.getElementById('benkyo-train-floating-ticket-style')) return;
    var style = document.createElement('style');
    style.id = 'benkyo-train-floating-ticket-style';
    style.textContent = `
      .bk-train-ticket {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
      }
      .bk-train-ticket.hidden { display: none !important; }
      .bk-train-ticket .bk-tt-full {
        position: relative;
        width: 300px;
        background: #fdfbf7;
        border: 1.5px solid #e7d8c9;
        border-radius: 20px;
        padding: 16px 18px;
        box-shadow: 0 16px 40px -8px rgba(92, 40, 62, 0.28), 0 4px 12px rgba(0,0,0,0.06);
        color: #1e293b;
        overflow: hidden;
      }
      .bk-train-ticket.is-minimized .bk-tt-full { display: none; }
      .bk-train-ticket.is-minimized .bk-tt-minimized { display: flex; }
      .bk-train-ticket .bk-tt-minimized {
        display: none;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        background: #fffcf8;
        border: 1.5px solid #e2d5c8;
        border-radius: 999px;
        box-shadow: 0 8px 24px -4px rgba(92, 40, 62, 0.22);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .bk-train-ticket .bk-tt-minimized:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px -4px rgba(92, 40, 62, 0.28);
      }
      .bk-tt-min-text { font-size: 0.75rem; font-weight: 700; color: #1e293b; }
      .bk-tt-min-timer { font-size: 0.75rem; font-weight: 800; color: #be185d; background: #fce7f3; padding: 2px 7px; border-radius: 6px; }
      .bk-tt-min-music-btn {
        border: 0; background: #f3f4f6; color: #4b5563; width: 26px; height: 26px; border-radius: 50%;
        cursor: pointer; display: grid; place-items: center; font-size: 0.7rem; transition: all 0.15s ease;
      }
      .bk-tt-min-music-btn:hover { background: #be185d; color: #fff; }
      .bk-tt-watermark {
        position: absolute; top: 12px; right: 14px; font-family: 'Noto Serif JP', serif;
        font-size: 2.8rem; font-weight: 900; color: rgba(190, 24, 93, 0.05); pointer-events: none; line-height: 1; user-select: none;
      }
      .bk-tt-notch {
        position: absolute; top: 50%; width: 14px; height: 14px; border-radius: 50%;
        background: #faf8f5; border: 1.5px solid #e7d8c9; transform: translateY(-50%); pointer-events: none;
      }
      .bk-tt-notch-left { left: -8px; }
      .bk-tt-notch-right { right: -8px; }
      .bk-tt-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
      .bk-tt-train-badge { display: flex; align-items: center; gap: 7px; font-size: 0.78rem; color: #be185d; }
      .bk-tt-pulse {
        width: 7px; height: 7px; border-radius: 50%; background: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25); animation: bkPulse 2s infinite;
      }
      @keyframes bkPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.75; } }
      .bk-tt-window-ctrls { display: flex; align-items: center; gap: 4px; }
      .bk-tt-ctrl-btn {
        border: 0; background: transparent; color: #94a3b8; cursor: pointer; padding: 3px 6px;
        border-radius: 6px; font-size: 0.7rem; transition: all 0.15s ease;
      }
      .bk-tt-ctrl-btn:hover { background: #f1f5f9; color: #1e293b; }
      .bk-tt-route {
        display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0;
        border-top: 1px dashed #e2d5c8; border-bottom: 1px dashed #e2d5c8; margin-bottom: 8px;
      }
      .bk-tt-city { font-size: 0.95rem; font-weight: 800; color: #0f172a; }
      .bk-tt-arrow { color: #be185d; font-size: 0.75rem; }
      .bk-tt-details { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
      .bk-tt-pill { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; }
      .bk-tt-pill.live { background: #fdf2f8; color: #be185d; }
      .bk-tt-timer-box {
        background: #fff; border: 1px solid #f0e6dc; border-radius: 12px; padding: 8px 12px;
        text-align: center; margin-bottom: 10px;
      }
      .bk-tt-timer-label { font-size: 0.62rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.08em; display: block; }
      .bk-tt-timer-val { font-size: 1.35rem; font-weight: 900; color: #be185d; font-family: 'Plus Jakarta Sans', monospace; letter-spacing: -0.02em; }
      .bk-tt-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .bk-tt-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 10px;
        border-radius: 10px; font-size: 0.72rem; font-weight: 700; cursor: pointer; text-decoration: none; transition: all 0.15s ease;
      }
      .bk-tt-audio { border: 1px solid #fbcfe8; background: #fdf2f8; color: #be185d; }
      .bk-tt-audio:hover { background: #fce7f3; }
      .bk-tt-train-link { border: 0; background: #be185d; color: #fff; }
      .bk-tt-train-link:hover { background: #9d174d; }
    `;
    document.head.appendChild(style);
  }

  function createTicketDOM() {
    var existing = document.getElementById('benkyo-train-floating-ticket');
    if (existing) return existing;

    var container = document.createElement('div');
    container.id = 'benkyo-train-floating-ticket';
    container.className = 'bk-train-ticket hidden';
    container.innerHTML = `
      <div class="bk-tt-minimized" onclick="window.expandTrainTicket()" title="Agrandir le billet de train">
        <span class="bk-tt-icon">🚅</span>
        <span class="bk-tt-min-text" id="bk-tt-min-text">Voyage en cours</span>
        <span class="bk-tt-min-timer" id="bk-tt-min-timer">00:00</span>
        <button type="button" class="bk-tt-min-music-btn" id="bk-tt-min-music-btn" onclick="event.stopPropagation(); window.toggleCompanionMusic();" title="Couper / Relancer la musique">
          <i class="fa-solid fa-music"></i>
        </button>
      </div>

      <div class="bk-tt-full">
        <div class="bk-tt-notch bk-tt-notch-left"></div>
        <div class="bk-tt-notch bk-tt-notch-right"></div>
        <div class="bk-tt-watermark">乗車券</div>
        <div class="bk-tt-head">
          <div class="bk-tt-train-badge">
            <span class="bk-tt-pulse"></span>
            <i class="fa-solid fa-train-subway"></i>
            <strong id="bk-tt-train-name">Focus Train</strong>
          </div>
          <div class="bk-tt-window-ctrls">
            <button type="button" onclick="window.minimizeTrainTicket()" class="bk-tt-ctrl-btn" title="Réduire en pilule"><i class="fa-solid fa-minus"></i></button>
            <button type="button" onclick="window.closeTrainTicket()" class="bk-tt-ctrl-btn" title="Masquer"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>

        <div class="bk-tt-route">
          <span class="bk-tt-city" id="bk-tt-from">Départ</span>
          <i class="fa-solid fa-arrow-right-long bk-tt-arrow"></i>
          <span class="bk-tt-city" id="bk-tt-to">Arrivée</span>
        </div>

        <div class="bk-tt-details">
          <span id="bk-tt-seat-info" class="bk-tt-pill">Voiture 01</span>
          <span class="bk-tt-pill live"><i class="fa-solid fa-gauge-high"></i> <strong id="bk-tt-speed">0</strong> km/h</span>
          <span id="bk-tt-class-badge" class="bk-tt-pill"></span>
        </div>

        <div class="bk-tt-timer-box">
          <span class="bk-tt-timer-label">TEMPS RESTANT À BORD</span>
          <div class="bk-tt-timer-val" id="bk-tt-countdown">00:00</div>
        </div>

        <div class="bk-tt-actions">
          <button type="button" id="bk-tt-audio-btn" onclick="window.toggleCompanionMusic()" class="bk-tt-btn bk-tt-audio">
            <i class="fa-solid fa-headphones"></i> <span id="bk-tt-audio-label">Musique</span>
          </button>
          <a href="pomodoro.html?tab=focus-train#focus-train" class="bk-tt-btn bk-tt-train-link">
            <span>À bord</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    return container;
  }

  function setupCompanionAudio(audioState) {
    if (!audioState || !audioState.playing) {
      if (companionAudio) {
        companionAudio.pause();
        companionAudio = null;
      }
      return;
    }
    if (isViewingFocusTrainDashboard()) {
      if (companionAudio) {
        companionAudio.pause();
        companionAudio = null;
      }
      return;
    }
    if (companionAudio && !companionAudio.paused) return;

    if (audioState.type === 'lofi') {
      companionAudio = new Audio('https://stream.zeno.fm/f3wvbbqmdg8uv');
      companionAudio.crossOrigin = 'anonymous';
      companionAudio.play().catch(function() {});
    } else if (audioState.type === 'custom') {
      if (window.BenkyoStorage && BenkyoStorage.getCustomMediaFile) {
        BenkyoStorage.getCustomMediaFile().then(function(record) {
          if (record && record.blob) {
            companionAudio = new Audio(URL.createObjectURL(record.blob));
            companionAudio.loop = true;
            companionAudio.play().catch(function() {});
          }
        });
      }
    }
  }

  window.toggleCompanionMusic = function() {
    var audioState = readAudioState() || { playing: false, type: 'lofi', title: 'Radio Lofi studieux' };
    if (companionAudio && !companionAudio.paused) {
      companionAudio.pause();
      audioState.playing = false;
      saveAudioState(audioState);
      updateCompanionUI();
    } else {
      audioState.playing = true;
      saveAudioState(audioState);
      if (companionAudio) {
        companionAudio.play().catch(function() {});
      } else {
        setupCompanionAudio(audioState);
      }
      updateCompanionUI();
    }
  };

  window.minimizeTrainTicket = function() {
    isMinimized = true;
    var el = document.getElementById('benkyo-train-floating-ticket');
    if (el) el.classList.add('is-minimized');
  };

  window.expandTrainTicket = function() {
    isMinimized = false;
    var el = document.getElementById('benkyo-train-floating-ticket');
    if (el) el.classList.remove('is-minimized');
  };

  window.closeTrainTicket = function() {
    isClosedByUser = true;
    var el = document.getElementById('benkyo-train-floating-ticket');
    if (el) el.classList.add('hidden');
  };

  function updateCompanionUI() {
    var journey = readJourney();
    var progress = getJourneyProgress(journey);
    var el = document.getElementById('benkyo-train-floating-ticket');
    if (!progress || isClosedByUser || isViewingFocusTrainDashboard()) {
      if (el) el.classList.add('hidden');
      return;
    }

    if (!el) el = createTicketDOM();
    el.classList.remove('hidden');
    el.classList.toggle('is-minimized', isMinimized);

    var trainName = document.getElementById('bk-tt-train-name');
    if (trainName) trainName.textContent = progress.train;

    var fromEl = document.getElementById('bk-tt-from');
    if (fromEl) fromEl.textContent = progress.from;

    var toEl = document.getElementById('bk-tt-to');
    if (toEl) toEl.textContent = progress.to;

    var minText = document.getElementById('bk-tt-min-text');
    if (minText) minText.textContent = progress.from + ' ➔ ' + progress.to + ' · ' + progress.speed + ' km/h';

    var seatInfo = document.getElementById('bk-tt-seat-info');
    if (seatInfo) seatInfo.textContent = 'Voiture ' + String(progress.coach).padStart(2, '0') + ' · Place ' + progress.seat;

    var speedEl = document.getElementById('bk-tt-speed');
    if (speedEl) speedEl.textContent = progress.speed;

    var classBadge = document.getElementById('bk-tt-class-badge');
    if (classBadge) {
      var cls = (progress.journey && progress.journey.cabinClass) || 'standard';
      if (cls === 'gran') {
        classBadge.textContent = '🌸 Gran Class';
        classBadge.style.cssText = 'background:#fef3c7; color:#92400e; font-weight:800; border:1px solid #fde68a;';
      } else if (cls === 'green') {
        classBadge.textContent = '🍃 Green Car';
        classBadge.style.cssText = 'background:#d1fae5; color:#065f46; font-weight:800; border:1px solid #a7f3d0;';
      } else {
        classBadge.textContent = '🎌 Standard';
        classBadge.style.cssText = 'background:#f1f5f9; color:#475569; font-weight:700;';
      }
    }

    var countdown = document.getElementById('bk-tt-countdown');
    if (countdown) countdown.textContent = progress.timeStr;

    var minTimer = document.getElementById('bk-tt-min-timer');
    if (minTimer) minTimer.textContent = progress.timeStr;

    var audioState = readAudioState();
    var isPlaying = Boolean(audioState && audioState.playing);
    var audioLabel = document.getElementById('bk-tt-audio-label');
    var minMusicBtn = document.getElementById('bk-tt-min-music-btn');

    if (audioLabel) {
      audioLabel.textContent = isPlaying ? 'Couper' : 'Musique';
    }
    if (minMusicBtn) {
      minMusicBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      minMusicBtn.title = isPlaying ? 'Couper la musique' : 'Relancer la musique';
    }
  }

  function initCompanion() {
    injectTicketStyles();
    createTicketDOM();

    var journey = readJourney();
    var progress = getJourneyProgress(journey);
    if (progress) {
      var audioState = readAudioState();
      setupCompanionAudio(audioState);
      updateCompanionUI();

      if (!tickerTimer) {
        tickerTimer = setInterval(function() {
          var j = readJourney();
          var p = getJourneyProgress(j);
          if (!p) {
            clearInterval(tickerTimer);
            tickerTimer = null;
            if (companionAudio) { companionAudio.pause(); companionAudio = null; }
            var el = document.getElementById('benkyo-train-floating-ticket');
            if (el) el.classList.add('hidden');
            return;
          }
          updateCompanionUI();
        }, 1000);
      }
    }
  }

  window.updateFocusTrainCompanionVisibility = function() {
    updateCompanionUI();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompanion);
  } else {
    initCompanion();
  }
})(window);

