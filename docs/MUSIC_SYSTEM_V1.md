# BLUEFOX ODYSSEY — CONTRAT MUSICAL V1

Statut : base déclarative préparatoire, non raccordée au lecteur audio.  
Date : 2026-08-13.

## Objet et chaîne de décision

Le contexte de jeu choisit les familles compatibles. Le BAC module leur intensité et départage les variantes ; il ne choisit jamais seul un morceau.

```text
Gameplay + mission + biome
            ↓
     contexte musical
            ↓
 intensité de base (0..1)
            ↓
 pondération BAC / émotion
            ↓
 catalogue + historique récent
            ↓
 segment et transition
```

## Sources de vérité

- `data/music-catalog.js` : familles, contextes, règles, segments et fiches des pistes.
- Le futur moteur audio : lecture, préchargement, transitions et historique.
- Le BAC : valeurs normalisées, sans connaître les fichiers audio.
- Les réglages joueur : volumes, activation et accessibilité.

Aucune association morceau/situation ne doit être codée en dur dans `world-engine.js`, le BAC ou l'interface.

## Familles validées

| Famille | Fonction | Intensité |
|---|---|---:|
| `motif` | Identité de BlueFox, rappels et transitions | 0.25–0.70 |
| `main` | Thème principal et jalons narratifs | 0.30–0.80 |
| `drift` | Exploration calme et contemplation | 0.10–0.45 |
| `dynamics` | Action rapide, tension et danger | 0.55–1.00 |
| `relic` | Recherche, archéologie, craft et civilisations | 0.25–0.75 |

`relic` peut préparer un enchaînement `motif` ou `main`. V1 reste monoflux : aucune superposition n'est imposée.

## Contextes V1

`exploration_calm`, `exploration_significant`, `contemplation`, `action_dynamic`, `danger`, `research`, `archaeology`, `craft`, `civilization`, `narrative_milestone`, `camp`, `rest`.

Chaque contexte fournit une intensité de base. Une mission ou un événement narratif peut temporairement augmenter sa priorité sans modifier le BAC.

## Entrée BAC V1

```js
{
  axes: {
    survival: 0,
    exploration: 0,
    collectionLogistics: 0,
    researchKnowledge: 0,
    constructionTechnology: 0
  },
  emotions: {
    curiosity: 0,
    serenity: 0,
    tension: 0,
    wonder: 0,
    fatigue: 0
  }
}
```

Toutes les valeurs sont bornées entre `0` et `1`; une valeur absente vaut `0`.

```text
intensité finale =
  clamp(intensité contexte
      + somme(axe × poids famille)
      + somme(émotion × poids famille),
      minimum famille,
      maximum famille)
```

Les poids BAC restent modérés : le contexte pèse toujours davantage qu'une émotion isolée.

## Segments

Une piste peut déclarer `intro`, `development`, `loop` et `outro`, avec plusieurs variantes d'un même rôle. Chaque segment possède `startSec`, `endSec`, `loopable` et, si nécessaire, `loopInSec` / `loopOutSec`.

Une boucle peut se répéter, alterner avec une autre boucle compatible, céder la place à un développement ou sortir par fondu. Les intros longues et les développements doivent conserver leur progression musicale utile.

## Transitions V1

- Ne pas interrompre une intro, sauf danger ou événement narratif prioritaire.
- Respecter une durée minimale d'écoute.
- Privilégier un point de sortie déclaré.
- Utiliser un fondu standard entre contextes voisins et un fondu urgent vers l'action/danger.
- Éviter la répétition immédiate quand une alternative compatible existe.
- Ne pas relancer une intro longue après une simple variation BAC.

| Paramètre | Valeur |
|---|---:|
| Fondu standard | 4 s |
| Fondu urgent | 1.5 s |
| Écoute minimale | 20 s |
| Répétitions maximales d'une boucle | 3 |
| Historique anti-répétition | 3 pistes |

## Priorités

1. Événement narratif musical explicite.
2. Danger ou action urgente.
3. Interaction/mécanique active.
4. Mission prioritaire.
5. Exploration, camp ou repos.
6. Modulation BAC.
7. Variété et historique récent.

## Contrat d'une piste

Une piste exploitable possède un `id` stable, un titre, une famille connue, un chemin relatif, au moins un contexte, une plage d'intensité cohérente et au moins un segment valide.

Les noms et minutages des 24 découpes seront ajoutés après inventaire des fichiers validés. Aucun fichier fictif n'est déclaré dans cette passe.

## Prototype suivant

Le premier lecteur testera uniquement :

1. `exploration_calm` → `drift` ;
2. `archaeology/research` → `relic`, puis préférence `motif/main` ;
3. `action_dynamic` → `dynamics`.

Validation : démarrage après interaction joueur, boucle propre, changement de contexte, pondération BAC bornée, anti-répétition et retour à l'exploration calme.

