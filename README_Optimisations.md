# Optimisations (29 oct. 2026)

## Chargement
- `html2pdf.js` retiré des 9 pages qui le chargeaient : il n'était appelé nulle part.
- `Chart.js` retiré des 7 pages sans graphique (calendrier, apprentissage, fournitures, grandes vacances, résultats, pense-bête, profil) ; conservé sur Session de travail, Révisions et To-do.
- `Chart.js` figé en version 4.4.1 (avant : « dernière version », qui pouvait casser les graphiques un jour).

## Fluidité
- `fluidite.css` (chargé en dernier sur les 12 pages) :
  - flou d'arrière-plan réduit à 10 px sur téléphone/tablette (22 règles) ; aucun changement sur ordinateur ;
  - `touch-action: manipulation` : plus de délai au toucher ;
  - anneau de focus visible au clavier sur boutons et liens.

## Clarté / accessibilité
- Titres d'onglet distincts (« Révisions — Benkyō », « To-do — Benkyō »…), au lieu de « Application d'Études » partout.
- `meta description` sur les 12 pages.
- 34 `aria-label` ajoutés : boutons « Fermer » (icône seule), lecture/pause de l'ambiance, listes déroulantes et champs numériques sans libellé.

## Vérifié
Chromium, ordinateur + mobile (390 px), 12 pages : 0 erreur JS, 0 débordement horizontal, menu opérationnel.

## Chauffe de l'ordinateur (Focus train et soirs)
Cause trouvée en mesurant le rendu : les lucioles du thème du soir, le décor de fête et le point qui pulse sur le billet de train flottant bougent en continu derrière les cartes « verre ». À chaque image, l'ordinateur refaisait le gros flou de la grande carte du voyage (~1180 × 1470 px) : ~93 % d'un cœur de processeur graphique, alors que le JavaScript n'en prenait que 4 %.
- `fluidite.js` (nouveau, 12 pages) : après 20 s sans souris, clavier, toucher ni défilement, les lucioles et le décor de fête s'estompent et se figent, le point du billet se fige ; tout repart au premier geste. Minuteur, voyage, annonces et sons ne sont pas touchés.
- `fluidite.css` : sur l'onglet « Focus train », lucioles et décor de fête sont masqués (la carte les recouvre presque entièrement).
- `focus-train-voyage.js` : la liste des gares n'est reconstruite que si son texte a changé (avant : 2 fois par seconde pour rien).
- Mesures (Chromium, voyage en cours, thème nuit) : Focus train 98 % → 13 % ; minuteur au repos 97 % → 4 %. Mêmes résultats avec le thème Halloween.

## Allègement du Focus train (29 oct. 2026, suite)
Aucune fonctionnalité modifiée ; mêmes textes, même tracé, même comportement (comparé avant/après sur 9 instantanés avec horloge simulée, pause comprise).
- `focus-train-voyage.js` (boucle du voyage, toutes les 500 ms) :
  - le mouvement du train n'est calculé qu'une fois par tick (avant : 4 fois, plus une fois par gare restante dans « prochain passage ») ;
  - les textes (compte à rebours, pourcentage, prochain passage, vitesse, retard, étape) ne sont réécrits que s'ils ont changé, au lieu de 2 écritures DOM sur 2 ;
  - train à l'arrêt (gare, pause, correspondance) : le marqueur et le tracé parcouru ne sont plus redessinés tant que la position ne bouge pas.
- `focus-train.css` : suppression de ~1,4 Ko de styles `.ft-trip-card*` (ancienne carte de trajet, plus utilisée nulle part).

## Tableau des départs et correspondances (29 oct. 2026)
- **Tableau des départs** : choisir un train ne remet plus la liste en haut ; la position de défilement est conservée (elle repart du haut seulement quand on change d'étendue « Cette gare / Tout le réseau » ou de filtre de durée).
- **Correspondances plus logiques** : une correspondance n'est plus proposée si elle mène à une ville déjà traversée par le voyage (Tokyo → Kobe passe par Nagoya, Kyoto et Osaka : plus de « correspondance » vers Osaka) ni si elle repasserait par une ville déjà traversée. Le tracé de chaque train vient de `focus-train-voyage.js` (`FocusTrainStats.path`). Une correspondance enregistrée auparavant qui n'a plus de sens est retirée. Quand aucune suite n'a de sens (ex. Tokyo → Kobe), le bouton indique « Aucune autre ligne depuis … ».

## Statistiques d'étude : lisibilité (29 oct. 2026)
- `pomodoro-stats.css` : le titre « Statistiques d'étude », sa phrase d'intro et la semaine affichée (« Cette semaine (26 oct. - 1 nov.) ») étaient en texte sombre posé directement sur la photo de fond sombre. Ils sont maintenant sur un panneau en verre clair, comme les cartes.
- Étiquettes des cartes (« Aujourd'hui », « Cette semaine », « Jours d'affilée », « Objectif du jour ») : texte plus grand et plus foncé, fond de carte plus opaque.
