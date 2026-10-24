/* ============================================================
   auth.js — Connexion (e-mail + mot de passe) et synchronisation
   ------------------------------------------------------------
   Chargé en tout premier sur chaque page (après firebase-config.js).
   Il fait 3 choses :
     1. Protège les pages : si personne n'est connecté, redirection
        vers connexion.html.
     2. Gère la connexion / création de compte / mot de passe oublié
        (via Firebase Authentication).
     3. Synchronise les données Benkyo (clés « benkyo_… » du
        localStorage) avec le compte, pour les retrouver sur n'importe
        quel appareil (via Firebase Realtime Database).

   Si firebase-config.js n'est pas rempli, ce fichier ne fait RIEN :
   le site fonctionne comme avant, sans connexion.
   ============================================================ */
(function (global) {
  'use strict';

  var FB_VERSION = '10.12.2';
  var FB_BASE = 'https://www.gstatic.com/firebasejs/' + FB_VERSION + '/';
  var LOGIN_PAGE = 'connexion.html';

  // Marqueurs internes (jamais envoyés dans le cloud)
  var K_UID = 'benkyo_uid';            // compte auquel appartiennent les données locales
  var K_AT = 'benkyo_sync_at';         // date (serveur) de la dernière synchro
  var K_DIRTY = 'benkyo_sync_dirty';   // '1' = modifications locales pas encore envoyées
  var META = [K_UID, K_AT, K_DIRTY];

  // Clés qui changent en continu (minuteurs) : elles sont envoyées avec le
  // reste, mais ne déclenchent pas d'envoi à elles seules.
  var VOLATILE = ['benkyo_pomo_session', 'benkyo_immersive_draft', 'benkyo_exam_training_session'];

  var cfg = global.BENKYO_FIREBASE_CONFIG || {};
  var enabled = !!(cfg.apiKey && cfg.databaseURL &&
    String(cfg.apiKey).indexOf('COLLE_') !== 0 && String(cfg.databaseURL).indexOf('COLLE_') !== 0);

  var path = location.pathname.split('/').pop() || 'index.html';
  var isLoginPage = /^connexion\.html$/i.test(path);

  var api = {
    enabled: enabled,
    user: null,
    ready: null,
    logout: function () { location.replace(LOGIN_PAGE); }
  };
  global.BenkyoAuth = api;

  // ---- Connexion non configurée : on ne touche à rien ----------------
  if (!enabled) {
    api.ready = Promise.resolve(null);
    if (isLoginPage) location.replace('index.html');
    return;
  }

  var rawSet = Storage.prototype.setItem;
  var rawRemove = Storage.prototype.removeItem;
  var ls = global.localStorage;

  function isSyncKey(k) {
    return typeof k === 'string' && k.indexOf('benkyo_') === 0 && META.indexOf(k) === -1;
  }
  function setMeta(k, v) { try { rawSet.call(ls, k, String(v)); } catch (e) {} }

  var auth = null, db = null, ref = null;
  var syncReady = false;      // true quand on a vérifié le cloud (on peut envoyer)
  var frozen = false;         // true juste avant un rechargement : on n'écrit plus rien
  var changeSeq = 0;
  var pushing = false;
  var pushTimer = null;
  var lastJson = null;
  var dirtyAtStart = false;
  var revealed = false;

  // ---- Page masquée tant qu'on ne sait pas si on est connecté --------
  if (!isLoginPage) {
    try { dirtyAtStart = ls.getItem(K_DIRTY) === '1'; } catch (e) {}
    document.documentElement.style.visibility = 'hidden';
    setTimeout(function () {
      // Filet de sécurité (hors ligne, serveur injoignable…)
      if (revealed) return;
      var known = null;
      try { known = ls.getItem(K_UID); } catch (e) {}
      if (known) reveal(); else goLogin();
    }, 10000);
  }
  function reveal() {
    revealed = true;
    document.documentElement.style.visibility = '';
  }
  function goLogin() {
    location.replace(LOGIN_PAGE + '?retour=' + encodeURIComponent(path));
  }
  function goAfterLogin() {
    var m = /[?&]retour=([^&]+)/.exec(location.search);
    var dest = m ? decodeURIComponent(m[1]) : '';
    if (!/^[a-z0-9\-]+\.html$/i.test(dest) || /^connexion\.html$/i.test(dest)) dest = 'index.html';
    location.replace(dest);
  }

  // ---- Surveillance des modifications locales ------------------------
  if (!isLoginPage) {
    Storage.prototype.setItem = function (k, v) {
      if (this === ls && isSyncKey(k)) {
        if (frozen) return;
        var changed = false;
        try { changed = ls.getItem(k) !== String(v); } catch (e) {}
        rawSet.apply(this, arguments);
        if (changed) onLocalChange(k);
        return;
      }
      return rawSet.apply(this, arguments);
    };
    Storage.prototype.removeItem = function (k) {
      if (this === ls && isSyncKey(k)) {
        if (frozen) return;
        var had = false;
        try { had = ls.getItem(k) !== null; } catch (e) {}
        rawRemove.apply(this, arguments);
        if (had) onLocalChange(k);
        return;
      }
      return rawRemove.apply(this, arguments);
    };
    global.addEventListener('pagehide', function () { if (syncReady) pushNow(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && syncReady) pushNow();
    });
  }

  function onLocalChange(k) {
    if (VOLATILE.indexOf(k) !== -1) return;
    changeSeq++;
    setMeta(K_DIRTY, '1');
    if (syncReady) schedulePush();
  }
  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 3000);
  }

  function collect() {
    var d = {};
    for (var i = 0; i < ls.length; i++) {
      var k = ls.key(i);
      if (isSyncKey(k)) d[k] = ls.getItem(k);
    }
    return d;
  }

  // Envoie tout dans le cloud. Résout true si c'est bien parti (ou s'il n'y avait rien à envoyer).
  function pushNow() {
    clearTimeout(pushTimer);
    if (!api.user || !ref || !syncReady) return Promise.resolve(false);
    if (pushing) { schedulePush(); return Promise.resolve(false); }
    var seq = changeSeq;
    var data = collect();
    var json = JSON.stringify(data);
    if (json === lastJson) {
      if (seq === changeSeq) setMeta(K_DIRTY, '0');
      return Promise.resolve(true);
    }
    pushing = true;
    setStatus('Enregistrement…');
    return ref.set({ updatedAt: firebase.database.ServerValue.TIMESTAMP, data: data })
      .then(function () {
        lastJson = json;
        if (seq === changeSeq) setMeta(K_DIRTY, '0');
        setStatus('Données synchronisées ✓');
        return ref.child('updatedAt').once('value').then(function (s) {
          if (s.val()) setMeta(K_AT, s.val());
        }).catch(function () {});
      })
      .then(function () { pushing = false; if (changeSeq !== seq) schedulePush(); return true; },
            function (e) {
              pushing = false;
              console.warn('[Benkyo] Envoi impossible pour le moment', e);
              setStatus('Hors ligne — les données seront envoyées plus tard');
              return false;
            });
  }

  // Remplace les données locales par celles du cloud, puis recharge la page
  function applyCloudAndReload(cloudData, cloudAt, uid) {
    frozen = true;   // empêche la page (encore ancienne) de réécrire par-dessus
    var toRemove = [];
    for (var i = 0; i < ls.length; i++) { if (isSyncKey(ls.key(i))) toRemove.push(ls.key(i)); }
    toRemove.forEach(function (k) { rawRemove.call(ls, k); });
    Object.keys(cloudData || {}).forEach(function (k) {
      if (isSyncKey(k) && typeof cloudData[k] === 'string') rawSet.call(ls, k, cloudData[k]);
    });
    setMeta(K_UID, uid);
    setMeta(K_AT, cloudAt || 0);
    setMeta(K_DIRTY, '0');
    location.reload();
  }

  function startSync(user) {
    var uid = user.uid;
    var localUid = null;
    try { localUid = ls.getItem(K_UID); } catch (e) {}
    var sameUser = (localUid === uid);
    ref = db.ref('users/' + uid);
    updateUI();

    if (sameUser) reveal();   // pas d'attente : on vérifie le cloud en arrière-plan

    ref.child('updatedAt').once('value').then(function (snap) {
      var cloudAt = snap.val();
      var lastSync = +(ls.getItem(K_AT) || 0);

      // Rien dans le cloud pour ce compte
      if (cloudAt === null) {
        if (localUid && !sameUser) {
          // Données d'un autre compte sur cet appareil : on repart à zéro
          frozen = true;
          var del = [];
          for (var i = 0; i < ls.length; i++) { if (isSyncKey(ls.key(i))) del.push(ls.key(i)); }
          del.forEach(function (k) { rawRemove.call(ls, k); });
          setMeta(K_UID, uid); setMeta(K_AT, 0); setMeta(K_DIRTY, '0');
          location.reload();
          return;
        }
        // Premier compte : il reprend les données déjà présentes sur cet appareil
        setMeta(K_UID, uid);
        syncReady = true;
        if (Object.keys(collect()).length) { setMeta(K_DIRTY, '1'); pushNow(); }
        reveal();
        return;
      }

      // Le cloud contient des données
      if (sameUser && dirtyAtStart) {
        // Modifications faites hors ligne : on les envoie
        syncReady = true; pushNow(); reveal(); return;
      }
      if (sameUser && cloudAt <= lastSync) {
        syncReady = true; reveal();
        if (ls.getItem(K_DIRTY) === '1') schedulePush();
        return;
      }
      // Le cloud est plus récent (autre appareil) ou compte différent : le cloud gagne
      return ref.child('data').once('value').then(function (ds) {
        applyCloudAndReload(ds.val() || {}, cloudAt, uid);
      });
    }).catch(function (e) {
      console.warn('[Benkyo] Synchronisation impossible', e);
      var denied = e && (e.code === 'PERMISSION_DENIED' || /permission_denied/i.test(String(e.message || e)));
      setStatus(denied ? 'Synchronisation inactive : règles de sécurité à configurer (voir le guide, étape 3)' : 'Hors ligne');
      reveal();
    });
  }

  // ---- Petits éléments d'interface (page Profil) ---------------------
  function setStatus(txt) {
    var els = document.querySelectorAll('[data-auth-status]');
    for (var i = 0; i < els.length; i++) els[i].textContent = txt;
  }
  function updateUI() {
    var els = document.querySelectorAll('[data-auth-email]');
    for (var i = 0; i < els.length; i++) els[i].textContent = api.user ? api.user.email : '';
  }
  document.addEventListener('DOMContentLoaded', updateUI);

  // ---- Déconnexion ---------------------------------------------------
  api.logout = function () {
    if (!api.user) { goLogin(); return Promise.resolve(); }
    var done = function () {
      return auth.signOut().then(function () { location.replace(LOGIN_PAGE); });
    };
    var dirty = false;
    try { dirty = ls.getItem(K_DIRTY) === '1'; } catch (e) {}
    if (!dirty && syncReady) return done();
    return pushNow().then(function (ok) {
      if (ok) return done();
      if (global.confirm('Tes dernières modifications n\'ont pas pu être envoyées (pas de connexion ?).\n\nTe déconnecter quand même ? Elles seront envoyées à ta prochaine connexion sur cet appareil.')) return done();
    });
  };

  // ---- Fonctions pour la page de connexion ---------------------------
  function whenAuth(fn) {
    return api.ready.then(function () {
      if (!auth) return Promise.reject({ code: 'auth/network-request-failed' });
      return fn();
    });
  }
  api.signIn = function (email, password) {
    return whenAuth(function () { return auth.signInWithEmailAndPassword(email, password); });
  };
  api.signUp = function (email, password) {
    return whenAuth(function () { return auth.createUserWithEmailAndPassword(email, password); });
  };
  api.resetPassword = function (email) {
    return whenAuth(function () { return auth.sendPasswordResetEmail(email); });
  };
  api.errorMessage = function (err) {
    var code = (err && err.code) || '';
    var map = {
      'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
      'auth/missing-email': 'Écris ton adresse e-mail.',
      'auth/missing-password': 'Écris ton mot de passe.',
      'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
      'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
      'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
      'auth/invalid-login-credentials': 'E-mail ou mot de passe incorrect.',
      'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse. Essaie de te connecter.',
      'auth/weak-password': 'Mot de passe trop court : il faut au moins 6 caractères.',
      'auth/too-many-requests': 'Trop d\'essais. Patiente quelques minutes puis réessaie.',
      'auth/network-request-failed': 'Pas de connexion internet. Vérifie ton réseau.',
      'auth/user-disabled': 'Ce compte a été désactivé.',
      'auth/operation-not-allowed': 'La connexion par e-mail n\'est pas activée dans Firebase (voir le guide, étape 2).',
      'auth/unauthorized-domain': 'Ce site n\'est pas autorisé dans Firebase (voir le guide, étape 5).',
      'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'La clé Firebase est incorrecte (vérifie firebase-config.js).',
      'auth/invalid-api-key': 'La clé Firebase est incorrecte (vérifie firebase-config.js).',
      'auth/configuration-not-found': 'La connexion par e-mail n\'est pas activée dans Firebase (voir le guide, étape 2).'
    };
    return map[code] || ('Une erreur est survenue (' + (code || 'inconnue') + ').');
  };

  // ---- Chargement de Firebase puis démarrage -------------------------
  var resolveReady;
  api.ready = new Promise(function (res) { resolveReady = res; });

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  loadScript(FB_BASE + 'firebase-app-compat.js')
    .then(function () { return loadScript(FB_BASE + 'firebase-auth-compat.js'); })
    .then(function () { return loadScript(FB_BASE + 'firebase-database-compat.js'); })
    .then(function () {
      firebase.initializeApp(cfg);
      auth = firebase.auth();
      auth.languageCode = 'fr';
      db = firebase.database();

      auth.onAuthStateChanged(function (user) {
        api.user = user;
        if (isLoginPage) {
          if (user) { goAfterLogin(); return; }
          resolveReady(null);
          return;
        }
        resolveReady(user);
        if (!user) { goLogin(); return; }
        startSync(user);
      });
    })
    .catch(function (e) {
      console.warn('[Benkyo] Impossible de charger le service de connexion', e);
      resolveReady(null);
      if (isLoginPage) return;
      // Hors ligne : on laisse l'accès si ce compte s'est déjà connecté sur cet appareil
      var known = null;
      try { known = ls.getItem(K_UID); } catch (e2) {}
      if (known) reveal(); else goLogin();
    });

})(window);
