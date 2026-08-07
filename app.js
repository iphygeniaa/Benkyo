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
    examTrainings: 'benkyo_exam_trainings'
  };

  // Valeurs par défaut, utilisées uniquement la toute première fois
  // (ou si une donnée a été effacée / corrompue)
  function defaultState() {
    return {
      profile: { firstname: "Étudiant", gender: "Garçon", level: "Terminale", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" },
      timetable: [],
      categories: ["Cours", "Session de travail", "Rendez-vous"],
      events: [],
      todos: {},
      notes: [],
      grades: [],
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
      stats: { todayMinutes: 0, weeklyMinutes: [0, 0, 0, 0, 0, 0, 0] },
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
      // État du minuteur Pomodoro, partagé entre les pages (Dashboard,
      // Pomodoro, Mode Focus) afin qu'il reste cohérent où que l'on soit.
      pomodoroSession: {
        phase: 'work',           // 'work' | 'break'
        isRunning: false,
        phaseEndTimestamp: null, // epoch ms
        remainingSeconds: 25 * 60, // temps restant figé quand la session est en pause
        workMinutes: 25,
        breakMinutes: 5,
        musicChoice: 'none'      // 'none' | 'lofi'
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

  // Sauvegarde immédiate de tout le state dans localStorage
  function save(state) {
    Object.keys(STORAGE_KEYS).forEach(function (key) {
      try {
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
  // Widget flottant de musique Pomodoro — visible sur toutes les pages
  // (sauf Pomodoro elle-même, qui a déjà son propre lecteur intégré)
  // afin de pouvoir garder / relancer la musique lofi en naviguant.
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

    var session = readSession();
    // On n'affiche le widget que si une musique lofi est active ou qu'une
    // session Pomodoro est en cours (pour pouvoir l'activer facilement).
    if (session.musicChoice !== 'lofi' && !session.isRunning) return;

    var btn = document.createElement('button');
    btn.id = 'benkyo-global-audio-widget';
    btn.type = 'button';
    btn.title = 'Musique Pomodoro (lofi)';
    btn.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:9999;width:48px;height:48px;border-radius:9999px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);color:#fff;border:none;box-shadow:0 8px 22px rgba(139,92,246,0.45);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:transform .15s ease;';
    btn.onmouseenter = function () { btn.style.transform = 'scale(1.08)'; };
    btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };
    btn.innerHTML = '<i class="fa-solid fa-music"></i>';

    var audio = null;
    function setIcon(iconClass) { btn.innerHTML = '<i class="fa-solid ' + iconClass + '"></i>'; }

    function play() {
      if (!audio) {
        audio = new Audio(LOFI_STREAM_URL);
        audio.crossOrigin = 'anonymous';
      }
      audio.play().then(function () {
        setIcon('fa-volume-high');
      }).catch(function () {
        // Lecture automatique bloquée par le navigateur : l'utilisateur devra cliquer.
        setIcon('fa-play');
      });
    }
    function pause() {
      if (audio) audio.pause();
      setIcon('fa-volume-xmark');
    }

    btn.addEventListener('click', function () {
      var s = readSession();
      if (audio && !audio.paused) {
        pause();
        s.musicChoice = 'none';
      } else {
        play();
        s.musicChoice = 'lofi';
      }
      writeSession(s);
    });

    document.body.appendChild(btn);

    if (session.musicChoice === 'lofi') {
      play();
    } else {
      setIcon('fa-music');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalPomodoroWidget);
  } else {
    initGlobalPomodoroWidget();
  }

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
    getChaptersNeedingRevision: getChaptersNeedingRevision
  };
})(window);
