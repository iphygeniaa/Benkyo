/* ============================================================
   firebase-config.js — LE SEUL FICHIER À MODIFIER
   ------------------------------------------------------------
   Remplace le bloc ci-dessous par celui que Firebase te donne
   (voir le guide « LISEZ-MOI-CONNEXION.html », étape 4).

   Tant que les valeurs « COLLE_... » sont présentes, la connexion
   est DÉSACTIVÉE et ton site fonctionne exactement comme avant.
   (Ces clés ne sont pas secrètes : c'est normal qu'elles soient
   visibles dans le site.)
   ============================================================ */
window.BENKYO_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDEPq5-O-7WkJvqj64gOmX-yEJ-WHCY0_0",
  authDomain: "benkyo-44e0f.firebaseapp.com",
  databaseURL: "https://benkyo-44e0f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "benkyo-44e0f",
  storageBucket: "benkyo-44e0f.firebasestorage.app",
  messagingSenderId: "1055036172423",
  appId: "1:1055036172423:web:b2d22fd429dabba2dc7022"
};

/* ============================================================
   E-mail de bienvenue (envoyé quand quelqu'un crée un compte)
   ------------------------------------------------------------
   Service gratuit EmailJS (https://www.emailjs.com) :
   remplace les 3 valeurs « COLLE_... » par celles de ton compte
   EmailJS (Public Key, Service ID, Template ID).
   Tant qu'elles sont présentes, aucun mail de bienvenue n'est
   envoyé et l'inscription fonctionne normalement.
   ============================================================ */
window.BENKYO_EMAILJS = {
  publicKey: "COLLE_TA_PUBLIC_KEY",
  serviceId: "COLLE_TON_SERVICE_ID",
  templateId: "COLLE_TON_TEMPLATE_ID"
};
