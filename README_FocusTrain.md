# Focus Train — étapes 1 à 5

Le sous-onglet **Focus train** de la page « Session de travail » de Benkyō permet de préparer un trajet en train au Japon, choisir sa place, déchirer son billet, embarquer, puis suivre son voyage en temps réel sur la carte du Japon jusqu’à l’arrivée.

## Parcours complet

1. **Choisir un trajet** — 39 villes japonaises (de Sapporo à Kagoshima, de grandes métropoles comme Osaka à de petites villes comme Hirosaki ou Matsue), plus de 70 trajets directs avec durée indicative, inversion du sens. Si deux villes n’ont pas de liaison, la liste des destinations possibles depuis la gare de départ est proposée.
2. **Choisir sa place** — le train dessiné à l’horizontale avec ses 8 voitures (places libres et barre de remplissage), puis l’intérieur de la voiture choisie en vue de dessus horizontale : rangées de gauche à droite, sièges 2 + 2 (A/B en haut, C/D en bas), allée au milieu, fenêtres, places déjà occupées (fictives mais stables après rechargement). Le bouton « Choisir pour moi » prend une place libre côté fenêtre.
3. **Déchirer le billet** — on tire horizontalement, vers la droite, le coupon d’embarquement placé à droite du billet, le long de la perforation verticale (souris ou doigt) ; un bouton reste disponible pour le clavier.
4. **Embarquer** *(nouveau)* — bouton « Monter dans le train » : scène de quai japonaise (vrai Shinkansen à la livrée du train choisi — Nozomi/Hikari bleu, Hayabusa vert et rose, Kagayaki blanc et cuivre… —, panneau de gare avec le nom en kanji, panneau de voie, Fuji, pagode, skyline, cerisier en fleurs, distributeur et banc ; le train entre en gare, les portes de ta voiture s’ouvrent, un porteur en uniforme t’accompagne avec son chariot et tes quatre valises, tu montes, les valises sont chargées à bord une à une, le porteur te salue, puis le train repart) avec annonces ; durée d’environ 12 s. Bouton « Passer » pour aller plus vite.
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

9. **Annonces à bord** *(nouveau)* — un bandeau « Annonce à bord » au-dessus de la carte, avec carillon et lecture à voix haute (synthèse vocale du navigateur) : bienvenue au départ (train, destination, durée, prochain arrêt), « Nous venons de passer X, prochain arrêt : Y » à chaque gare franchie, « Nous arriverons bientôt à X » deux minutes avant un arrêt, pause à une correspondance puis départ du train suivant, et terminus à l’arrivée. Boutons haut-parleur (voix on/off) et réglages de la voix japonaise (réglages mémorisés dans `benkyo_focus_train_announce_v1`). Chaque annonce n’est faite qu’une fois ; si on rouvre la page longtemps après, les annonces passées ne sont pas rejouées.

10. **Tableau des départs** *(nouveau)* — le choix du trajet se fait sur un panneau de gare japonaise (発車案内) : une ligne par train (type en japonais, destination en kanji, durée, heure d’arrivée « si tu pars maintenant », quai, remarques). « Cette gare » montre les départs de la gare choisie, « Tout le réseau » tous les trajets ; les puces de durée filtrent et affichent leur vrai nombre de trains. Toucher une ligne sélectionne le train.
11. **Pause et retard** *(nouveau)* — pendant le voyage, « Mettre en pause » fige le temps de focus : le train s’arrête sur la carte (vitesse 0). À la reprise, la durée de la pause est ajoutée au retard : l’heure d’arrivée et les horaires de chaque gare sont repoussés, un bandeau « 遅延 · Retard cumulé » reste affiché, et une annonce (japonais avec traduction française, carillon et voix) donne le retard et la nouvelle heure d’arrivée. Le retard apparaît aussi dans le récapitulatif d’arrivée et l’historique. Les pauses de correspondance prévues ne comptent pas comme retard.

## Données enregistrées (localStorage)

- `benkyo_focus_train_journey_v1` — trajet, voiture, place, billet déchiré, heure de départ (`departedAt`), retard cumulé en ms (`delayMs`) et instant de la pause en cours (`pausedAt`, `null` sinon). Temps de voyage = maintenant − `departedAt` − `delayMs`.
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

## Villes et trajets ajoutés (17 villes, 25 trajets)

- **Hokkaidō** — Sapporo, Otaru, Asahikawa, Noboribetsu. Pas de Shinkansen au-delà de Hakodate (il n’arrivera à Sapporo que vers 2038) : on prend donc l’express *Hokuto* (Hakodate → Noboribetsu → Sapporo), le *Rapid Airport* (Sapporo → Otaru) et le *Kamui* (Sapporo → Asahikawa). Une correspondance Tokyo → Hakodate → Sapporo est possible.
- **Tōhoku** — Akita (Shinkansen *Komachi* depuis Tokyo, Sendai ou Morioka, rame rouge) et Hirosaki (express *Tsugaru* depuis Aomori).
- **Kantō** — Nikko (ligne JR via Utsunomiya) et Hakone (*Romancecar* d’Odakyū).
- **Chūbu** — Matsumoto (*Azusa* depuis Tokyo, *Shinano* depuis Nagoya ou Nagano), Takayama (*Hida* depuis Nagoya ou Toyama), Hamamatsu (Hikari depuis Tokyo ou Nagoya).
- **Chūgoku** — Kurashiki (Okayama, 16 min) et Matsue (*Yakumo*, côté mer du Japon).
- **Shikoku** — Takamatsu (*Marine Liner*) et Matsuyama (*Shiokaze*, *Ishizuchi*), par le pont Seto-Ōhashi.
- **Kyūshū** — Nagasaki (*Kamome*) et Beppu (*Sonic*).

Chaque ville a ses gares intermédiaires sur la carte, son nom en japonais pour l’annonce et le tableau des départs, et **son tampon de voyage** (17 tampons de plus dans la collection, 39 au total). Les nouveaux noms de trains ont leur écriture japonaise ; Komachi, Azusa et Romancecar ont aussi leur livrée sur le quai. Les trains express ne dépassent pas 130 km/h au compteur.

Pour en ajouter d’autres : une ville dans `cities` (`focus-train.js`) et dans `CITIES` (`focus-train-voyage.js`), ses trajets dans `routes`, ses gares dans `STATIONS` / `LINES`, et une entrée dans `CITY_STAMPS` (`tampons.js`, à la fin de la liste pour ne pas décaler les tampons existants).

Les durées et les coordonnées des petites gares sont des estimations, comme pour les autres trajets.

## Voix des annonces (améliorée)

La voix vient de la synthèse vocale du navigateur : sa qualité dépend donc des voix installées sur l’appareil. Ce qui a changé :

- **Meilleure voix choisie automatiquement** : les voix neuronales (Microsoft « Natural » dans Edge, Google dans Chrome, voix « Améliorée », « Premium » ou Siri sur Mac et iPhone) sont préférées ; les voix de base très robotiques (compactes, eSpeak…) sont écartées.
- **Réglages** (bouton curseurs du bandeau « Annonce à bord ») : choix de la voix japonaise, vitesse lente / normale / rapide, bouton « Écouter ». Un conseil s’affiche si seule une voix de base est disponible. Les voix de qualité sont marquées d’une étoile.
- **Annonce en japonais** (pas de bouton de langue) : seule la voix japonaise parle ; la transcription japonaise et la traduction française restent affichées dans le bandeau.
- **Diction plus naturelle** : l’annonce est lue phrase par phrase avec une courte respiration, au rythme posé d’un chef de gare, ce qui évite aussi que Chrome coupe les longues annonces.
- **Noms de gares en kanji** pour la voix japonaise (森, 洞爺, 田沢湖, 新横浜…) :: avant, elle épelait les lettres latines avec un fort accent.
- Réglages mémorisés dans `benkyo_focus_train_announce_v1` (anciens réglages compatibles).

Limite : sans voix naturelle installée, le navigateur n’a rien de mieux à proposer. Une voix de qualité constante partout demanderait des fichiers audio générés à l’avance (ou un service de synthèse en ligne).


## « Cette gare » suit ta position (nouveau)

Après un voyage terminé, tu es dans la gare d’arrivée : en cliquant sur « Nouveau voyage » à l’écran d’arrivée, le départ passe sur la ville où tu viens d’arriver (mémorisé, il survit au rechargement). Le bouton « Cette gare » du tableau des départs affiche donc ses trains, et non plus ceux de Tokyo. La destination proposée est la ville de départ du voyage précédent (trajet retour) ; sans liaison directe, c’est le départ le plus court depuis la nouvelle gare. Avec correspondances, c’est la gare finale qui compte. Descendre du train en cours de route (voyage interrompu) ne déplace pas : on reste à la gare de départ.

## Correctif (3.6)

- Pendant l'embarquement, le trajet et l'arrivée, le plan de voyage (tableau des départs, choix de billet, siège, correspondances) est bien masqué : seul l'écran du trajet reste affiché. La cause était que le script de voyage s'accrochait au premier bloc `.ft-shell` de la page, celui du Focus avion ; le bloc du Focus train a maintenant l'id `ft-shell`.
