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
    flashcardHistory: 'benkyo_fc_history',
    stats: 'benkyo_stats',
    streak: 'benkyo_streak',
    vacation: 'benkyo_vacation'
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
      flashcardHistory: [],
      stats: { todayMinutes: 0, weeklyMinutes: [0, 0, 0, 0, 0, 0, 0] },
      streak: { count: 1, lastLogin: new Date().toDateString() },
      vacation: { supplies: [], books: [], latin: [] }
    };
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

  global.BenkyoStorage = {
    STORAGE_KEYS: STORAGE_KEYS,
    defaultState: defaultState,
    load: load,
    save: save,
    saveDebounced: saveDebounced,
    flush: flush,
    autoFlushOn: autoFlushOn,
    exportBackup: exportBackup,
    importBackup: importBackup
  };
})(window);
