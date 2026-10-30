# Focus avion — Paris CDG → Japon

Nouveau sous-onglet « Focus avion » de la page « Session de travail » (aussi dans le menu). Même principe que le Focus train : la durée du vol est ta session de focus.

1. **Choisir un vol** au départ de Paris CDG : Tokyo Haneda, Tokyo Narita, Osaka Kansai (tableau des départs, durées indicatives d’environ 14 h).
2. **Choisir la durée de la session** : *Accéléré ×10* (environ 1 h 25, par défaut) ou *Temps réel* (environ 14 h).
3. **Siège** : plan de la cabine (rangées 20 à 44, sièges 3-3-3, hublots en bleu, places occupées fictives mais stables) ; clique un siège libre, ou « Choisir pour moi (hublot) ». Puis « Décoller » : animation de décollage depuis Paris (environ 7 s, bouton « Passer »).
4. **En vol** : carte du monde (Leaflet, grand cercle CDG → Japon), avion qui avance en temps réel, temps restant, progression, distance parcourue. Les cartes **Ambiance** (lofi ou ton propre MP3) et **To-do** du Focus train sont affichées sous la carte (mêmes tâches et même musique que dans le Focus train ; la musique s’arrête à l’atterrissage). Le vol repose sur l’heure réelle : il continue si tu fermes la page. « Annuler le vol » donne zéro tampon.
5. **Atterrissage** : animation d’arrivée au Japon (environ 8 s) puis écran de bienvenue ; tampon de la ville (Tokyo ou Osaka) ajouté à ta collection, et « Cette gare » du Focus train devient la ville d’arrivée (bouton « Continuer en train »).

## Inspiré du Focus train (nouveau)

- **Carte d'embarquement** avec code-barres, numéro de vol, terminal/porte (la porte apparaît aussi dans le tableau des départs).
- **Annonces à bord** : bandeau japonais + traduction française et voix japonaise du navigateur (décollage, altitude de croisière, repas, mi-parcours, décalage horaire, descente). Bouton « Voix active / coupée ».
- **Circuit d'attente (pause)** : fige le temps de focus ; à la reprise, la durée de l'attente s'ajoute au retard, l'heure d'atterrissage prévue est repoussée et un bandeau « 遅延 · Retard cumulé » s'affiche.
- **Carte** : boutons « Suivre l'avion » et « Tout le trajet » ; l'heure d'atterrissage prévue est affichée.
- **Historique** des vols (atterris ou annulés, temps de focus total, retard) sous le tableau des départs : `benkyo_focus_plane_history_v1`.

Données : `benkyo_focus_plane_v1` (vol, siège, heure de décollage, facteur de vitesse).

Fichiers : `focus-plane.js`, `focus-plane.css`, sous-onglet dans `pomodoro.html`, entrée dans `menu-nav.js`.

Limites : tracé en ligne droite sur la sphère (les vrais vols contournent certains espaces aériens) ; pas d’annonces vocales pendant le vol, de pause, d’historique ni de statistiques pour l’instant ; la carte vient des serveurs publics OpenStreetMap (connexion requise).

## Refonte visuelle (3.6)

- **Tableau des départs** façon panneau d'aéroport : bleu nuit et ambre (plus de rose), lettres à volets, horloge, colonnes vol / appareil / porte / durée / statut.
- **Réservation** : durée de la session en deux cartes (accéléré ×10 / temps réel), carte « Ton siège » (type, côté, remarque) et choix rapide Hublot / Couloir / Sortie de secours.
- **Cabine** : fuselage avec nez, cuisine, toilettes, hublots, rangée de sortie (31), ailes (si la place le permet), vrais sièges (hublot en vert d'eau, occupé avec silhouette, ton siège en ambre). Le plan se centre sur ton siège.
- **En vol** : tableau de bord (CDG → destination, avion qui avance sur la barre, temps restant en grand, phase montée / croisière / descente / circuit d'attente) et cartes distance, **vitesse en km/h** (avec Mach), altitude (m et ft) et temps écoulé.
- **Boutons** : « Circuit d'attente » (pause) et « Annuler le vol » sont remontés sous les infos de vol ; l'annulation demande une confirmation intégrée (plus de fenêtre du navigateur).
