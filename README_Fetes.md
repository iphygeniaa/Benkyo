# Ambiances des jours de fête

Comme le thème selon l'heure (`heure.js` / `heure.css`), mais selon la date. Le jour J (toute la journée, heure locale), le site prend les couleurs de la fête et un décor léger flotte derrière les cartes.

| Jour | Aperçu | Ambiance |
|---|---|---|
| 31 octobre | `?fete=halloween` | violet nuit, lune orange, chauves-souris, fantômes, citrouilles |
| 24 décembre | `?fete=veille-noel` | bleu nuit étoilée, halo doré, flocons, étoiles, sapins |
| 25 décembre | `?fete=noel` | rouge houx et vert sapin, flocons, boules, cadeaux |
| 31 décembre | `?fete=sylvestre` | nuit de feu d'artifice, confettis, étincelles dorées |
| 1er janvier | `?fete=nouvel-an` | premier lever de soleil rouge et or, fleurs d'ume, étincelles |

- Ajouter `?fete=none` désactive le thème (utile pour comparer un jour de fête).
- Les aperçus se combinent avec les autres : `index.html?fete=noel&heure=nuit`.
- Sur l'accueil, le bandeau (kanji, titre, phrase), le titre « Chaque jour, une citrouille de plus. » et la couleur de la barre du navigateur suivent la fête.
- Le thème de fête passe avant le thème de l'heure ; les autres jours, rien ne change.
- Si la page reste ouverte à minuit, le thème arrive (ou repart) tout seul.
- « Réduire les animations » (système) : le décor reste mais immobile et plus discret.

## Fichiers
- `fete.js` : détecte la date, pose `data-fete` sur `<html>`, construit le décor (dessins SVG en ligne, avec dégradés partagés). Chargé sans `defer`, après `heure.js`.
- `fete.css` : variables de chaque fête (même liste que `heure.css`, donc rien ne « fuit ») et animations du décor. Chargé après `heure.css`.
- `rituels.js` : 3 petites lignes pour le bandeau et le titre de l'accueil.
- Les 12 pages HTML : 2 lignes ajoutées sous `heure.js`.

## Pour ajouter une autre fête
1. Une entrée dans `FETES` (date, kanji, texte) et `ALIASES` dans `fete.js`.
2. Sa liste de décor dans `DECOR` (formes : pumpkin, bat, ghost, snow, star, bauble, tree, gift, ume, firework, confetti ; modes : fall, rise, drift, twinkle, burst).
3. Son bloc de variables dans `fete.css` (copier un bloc existant).
