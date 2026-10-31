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
- **Confirmation d'annulation (3.7)** : vraie fenêtre modale centrée avec fond flouté, rappel de la progression (% accompli, temps de focus, reste à voler), liste de ce qui est perdu (tampon, progression, mention « Annulé » dans l'historique), bouton principal « Continuer le vol » (focus par défaut) et bouton secondaire « Oui, annuler le vol ». Se ferme avec Échap, un clic à côté ou « Continuer le vol » ; le focus clavier reste piégé dans la fenêtre.

## Immersion (3.8) — voir aussi README_FocusTrain.md

Le Focus avion et le Focus train partagent `immersion-voyage.js` / `immersion-voyage.css` : une **vue « par la fenêtre »** (hublot avec aile, nuages en parallaxe, ciel selon l'heure réelle, terre puis côte au décollage et à la descente), une **ambiance sonore** synthétisée (bruit de cabine, turbulences, carillons ; bouton « Activer l'ambiance » et volume, désactivés par défaut) et des **événements de bord** (ceinture, repas à choisir, turbulences, mer de nuages, descente). Les deux onglets publient leur état dans `window.BenkyoLive.plane` / `.train` ; réglages dans `benkyo_immersion_v1`.

### Turbulences (3.8)

Plus de turbulences à chaque vol : environ un vol sur trois seulement, et à un moment (28 à 68 % du vol) et pour une durée qui changent d'un vol à l'autre. Le tirage dépend de l'heure de décollage, donc il reste stable si on recharge la page.

### En vol : écran en deux colonnes (3.8)

Toutes les infos sont conservées, mais l'écran de vol ne s'étire plus sur toute la hauteur. Sur écran large (panneau d'au moins ~860 px) : à gauche le suivi du vol, les quatre tuiles (distance, vitesse, altitude, temps écoulé en 2 × 2), les boutons et les annonces ; à droite la vue par la fenêtre et la carte ; en dessous l'ambiance et les objectifs côte à côte. Sur mobile ou fenêtre étroite, tout reste empilé comme avant, avec des tuiles et une carte plus compactes. La mise en page s'adapte à la largeur du panneau (container query), pas à celle de la fenêtre.

### Ambiance qui continue hors de l'onglet (3.8)

Le bruit d'ambiance (avion et train) suit le voyage et non l'affichage : il continue quand on passe à un autre onglet du site ou à une autre page du navigateur. Seule la fenêtre dessinée se met en veille quand elle n'est pas visible. Limite : certains navigateurs mobiles (iOS surtout) coupent le son d'une page passée en arrière-plan ; rien à faire côté site.

### Plein écran (3.8, train + avion)

Bouton « Plein écran » dans l'en-tête de la fenêtre (« Par la fenêtre »), en train comme en avion. La fenêtre passe en haut de l'écran, très grande, avec un bandeau : temps restant, progression (barre et %), prochain passage (train) ou phase du vol (avion), vitesse, et bouton Pause / Reprendre. Tout le reste de la session (carte, annonces, billet, ambiance, objectifs, boutons d'annulation) est juste en dessous : on y accède en faisant défiler, rien n'est retiré. « Quitter le plein écran » ou Échap pour revenir ; le plein écran se ferme tout seul à l'arrivée.

Plein écran natif du navigateur quand il existe ; sinon (iPhone, notamment) affichage plein cadre dans la page, qui se ferme aussi avec Échap. L'ambiance sonore continue normalement. Fichiers : `immersion-voyage.js` / `.css` (bouton, bandeau, placement), `BenkyoLive` enrichi de `left`, `next` / `phase`, `paused`.


## Hublot (illustration à plat)

La vue par le hublot (`immersion-voyage.js`, fonction `planeScene`) reprend le style de la fenêtre du train : ciel pastel selon l'heure réelle (soleil, lune, étoiles), nuages à fond ombré en trois couches de parallaxe, mer de nuages, terre en patchwork vue d'en haut au décollage et à l'atterrissage (mer près de l'arrivée, lumières la nuit), aile en aplats avec ailette, feu de navigation clignotant et strobe, turbulences, grain léger.
