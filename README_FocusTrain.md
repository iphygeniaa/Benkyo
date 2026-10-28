# Focus Train — étapes 1 à 5

Le sous-onglet **Focus train** de la page « Session de travail » de Benkyō permet de préparer un trajet en train au Japon, choisir sa place, déchirer son billet, embarquer, puis suivre son voyage en temps réel sur la carte du Japon jusqu’à l’arrivée.

## Parcours complet

1. **Choisir un trajet** — 22 villes japonaises (de Hakodate à Kagoshima), une cinquantaine de trajets directs avec durée indicative, inversion du sens. Si deux villes n’ont pas de liaison, la liste des destinations possibles depuis la gare de départ est proposée.
2. **Choisir sa place** — le train dessiné à l’horizontale avec ses 8 voitures (places libres et barre de remplissage), puis l’intérieur de la voiture choisie en vue de dessus horizontale : rangées de gauche à droite, sièges 2 + 2 (A/B en haut, C/D en bas), allée au milieu, fenêtres, places déjà occupées (fictives mais stables après rechargement). Le bouton « Choisir pour moi » prend une place libre côté fenêtre.
3. **Déchirer le billet** — on tire horizontalement, vers la droite, le coupon d’embarquement placé à droite du billet, le long de la perforation verticale (souris ou doigt) ; un bouton reste disponible pour le clavier.
4. **Embarquer** *(nouveau)* — bouton « Monter dans le train » : scène de quai (le train entre en gare, les portes de ta voiture s’ouvrent, tu montes, le train repart) avec annonces. Bouton « Passer » pour aller plus vite.
5. **Voyager sur la carte du Japon** *(nouveau)* — le train avance petit à petit sur la carte, gare par gare (Tokyo → Kyoto passe par Yokohama, Odawara, Shizuoka, Hamamatsu, Nagoya, Maibara…), avec :
   - le temps restant en direct (h:mm:ss), la barre de progression et le pourcentage du trajet ;
   - l’heure de départ, l’heure d’arrivée prévue et le prochain passage ;
   - une **vraie carte du Japon** (Leaflet + OpenStreetMap) : zoom à la molette, au pincement ou avec +/−, déplacement au glisser, échelle, attribution. Le bouton en haut à droite change le fond (**Plan**, **Satellite**, **Relief**) et peut superposer les **voies ferrées** réelles (OpenRailwayMap) ; le choix est mémorisé ;
   - trois vues : « Mon trajet » (cadre la ligne), « Tout le Japon », « Suivre le train » (la carte reste centrée sur le train ; elle se détache dès qu’on la déplace à la main) ;
   - le tracé passe par une cinquantaine de vraies gares de Shinkansen (Shin-Yokohama, Atami, Toyohashi, Gifu-Hashima, Fukuyama, Ueda, Iiyama, Kikonai…), dont les noms apparaissent au fil du zoom ; elles se colorent en rose une fois passées ;
   - « Descendre du train » (avec confirmation) pour interrompre le voyage.
   Le voyage repose sur l’heure réelle : il continue si tu changes d’onglet ou fermes la page, et reprend où il en est à la réouverture.
6. **Arriver** — écran de terminus (nom de la ville en japonais, récapitulatif, petit carillon si la page est ouverte). **Tu gagnes le tampon de la ville d’arrivée** : il rejoint ta collection (Profil → Mes tampons → « Tampons de voyage ») et peut être posé dans le carnet à tamponner. Un voyage interrompu ne donne pas de tampon. Les voyages déjà terminés dans l’historique donnent aussi leur tampon.
7. **Correspondances** *(nouveau)* — sous les trains disponibles, « Ajouter une correspondance » (jusqu’à 3) : on choisit la ville et le train suivants, et la **durée de la pause** (5 à 60 min) à la gare de correspondance. Chaque train est une session de focus ; pendant la pause, le train s’arrête sur la carte (pastille orange avec une tasse), un compte à rebours de pause s’affiche avec un conseil, et un carillon signale le début et la fin de la pause. La place du train suivant est attribuée automatiquement au départ. Le panneau « Ton itinéraire » liste les étapes (cochées au fur et à mesure) et l’écran d’arrivée récapitule temps de focus et pauses. Le tampon obtenu est celui de la ville finale.
8. **Historique** *(nouveau)* — voyages terminés ou interrompus, nombre et temps total passé dans le train.

9. **Annonces à bord** *(nouveau)* — un bandeau « Annonce à bord » au-dessus de la carte, avec carillon et lecture à voix haute (synthèse vocale du navigateur) : bienvenue au départ (train, destination, durée, prochain arrêt), « Nous venons de passer X, prochain arrêt : Y » à chaque gare franchie, « Nous arriverons bientôt à X » deux minutes avant un arrêt, pause à une correspondance puis départ du train suivant, et terminus à l’arrivée. Boutons haut-parleur (voix on/off) et FR / 日本語 (réglages mémorisés dans `benkyo_focus_train_announce_v1`). Chaque annonce n’est faite qu’une fois ; si on rouvre la page longtemps après, les annonces passées ne sont pas rejouées.

## Données enregistrées (localStorage)

- `benkyo_focus_train_journey_v1` — trajet, voiture, place, billet déchiré, heure de départ (`departedAt`).
- `benkyo_focus_train_history_v1` — historique des voyages (300 derniers) ; chaque entrée contient `focus` (minutes de focus hors pauses).
- `benkyo_focus_train_transfers_v1` — correspondances choisies (rattachées au couple départ>arrivée du premier train) ; le plan complet avec places est figé dans le voyage au moment du départ (`plan`).
- `benkyo_focus_train_announce_v1` — voix des annonces (on/off) et langue (fr/ja).
- `benkyo_focus_train_map_layer_v1` / `benkyo_focus_train_map_rail_v1` — fond de carte choisi et affichage des voies ferrées.

## Limites connues

- Les durées sont des estimations de démonstration, pas des horaires en temps réel ; les places occupées sont fictives.
- Le fond de carte est précis, mais le tracé du train relie les gares en segments droits (coordonnées saisies à la main) : il peut s’écarter un peu de la vraie voie. Activer « Voies ferrées » permet de comparer. Quand deux villes n’ont pas de ligne commune (ex. Sendai → Kyoto), le tracé passe par Tokyo.
- Les fonds de carte viennent de serveurs publics (Esri, OpenTopoMap, OpenRailwayMap) et demandent une connexion ; hors ligne, un message s’affiche et un contour simplifié du Japon sert de secours. Convient à un projet perso ; pour un site très fréquenté, prévoir un fournisseur de tuiles avec clé.
- Les voyages sont intégrés aux statistiques d’étude (temps de focus en train, hors pauses de correspondance). Ils ne sont pas reliés au minuteur Pomodoro : si tu lances les deux en même temps, le temps est compté deux fois.

## Fichiers concernés

- `pomodoro.html` — sous-onglet Focus train (sélection, plan de voiture, billet, scène de quai, carte, arrivée, historique).
- `focus-train.css` — thème « bento clair » du site (verre blanc, halos rose pastel) et styles de toutes les étapes.
- `focus-train.js` — villes, trajets, places, billet à déchirer.
- `focus-train-voyage.js` — embarquement, carte Leaflet (villes, gares, lignes, fonds), compte à rebours, arrivée, tampon de ville, historique.
- `leaflet.js`, `leaflet.css` et les images `layers*.png`, `marker-*.png` — Leaflet 1.9.4 (licence BSD-2), servi en local, sans CDN, tous à la racine (aucun sous-dossier).
- `tampons.js` — catalogue des tampons de ville (`CITY_STAMPS`), `BenkyoTampons.awardCityStamp(ville)`, section « Tampons de voyage ».
