# BLUEFOX ODYSSEY — SYSTÈME MUSICAL ADAPTATIF

Statut : **raccordé au jeu, finalisation d'écoute en cours**

Référence documentaire : 14 août 2026

Base GitHub observée : `a0ca8dc9664966f5b9ffcc7a5e80c2c03af286d2`

## 1. Intention

La musique doit installer durablement une ambiance et traduire l'évolution du gameplay sans changer de thème à chaque interaction. Le contexte réel choisit une famille et une séquence ; le BAC module ensuite l'intensité et la variante, sans décider seul de la musique.

```text
activité + mission + biome + survie
                 ↓
       contexte et priorité
                 ↓
       activité récente dominante
                 ↓
          état réel du BAC
                 ↓
 catalogue → séquence → segment → fondu
```

## 2. Sources de vérité

- `data/music-catalog.js` : familles, contextes, pistes, segments, séquences, profils et minutages.
- `engine/adaptive-music-engine-v1.js` : lecture double deck, préchargement, fondus, reprise, anti-répétition et réglages.
- `engine/adaptive-music-gameplay-bridge-v1.js` : traduction des événements jeu, missions, survie et activité en contextes musicaux.
- `engine/adaptive-music-ui-v1.js` et sa feuille de style : bouton musique et positionnement avec les commandes caméra/bulles.
- BAC : priorités et émotions réelles ; aucune copie de profil musical indépendante.

Aucune association piste/situation ne doit être codée dans `world-engine.js` ou l'interface.

## 3. État implémenté

- Lecteur à deux decks audio avec fondu croisé.
- Démarrage après déverrouillage audio par interaction utilisateur.
- Réglage activé/coupé et volume persistants dans `bluefox_music_settings_v1`.
- Arrêt lorsque l'onglet devient invisible et reprise contrôlée au retour.
- Diagnostics publics : `BlueFox3D.getMusicDiagnostics()` et `BlueFox3D.getMusicBridgeDiagnostics()`.
- Quatorze pistes déclarées, dont douze actives et deux sources longues volontairement désactivées tant que leurs découpes ne sont pas calées.
- Séquences composées d'intros, boucles, développements, ponts et inserts.

## 4. Familles et contextes

Familles : `motif`, `main`, `drift`, `dynamics`, `relic`.

Contextes : `exploration_calm`, `exploration_significant`, `map_discovery`, `contemplation`, `action_dynamic`, `danger`, `research`, `archaeology`, `craft`, `civilization`, `narrative_milestone`, `camp`, `rest`.

Ordre de priorité : événement narratif, danger, action urgente, interaction, mission, exploration/camp/repos, modulation BAC, variété.

## 5. Stabilisation des changements

Une collecte ou une observation isolée ne change plus immédiatement le thème.

- Série : changement possible après **trois actions similaires consécutives**.
- Dominance : changement durable si une activité représente **plus de 50 %** d'au moins **six actions**.
- Fenêtre d'analyse : **cinq minutes**.
- Durée indicative d'une dominance : **150 secondes**.
- Une transition de map efface l'historique local d'activité.

Activités reconnues : collecte, observation, recherche et reliques/micro-scènes/ruines.

## 6. BAC et intensité

Axes réellement exploités : `survival`, `exploration`, `collection`, `research`, `relations`.

Émotions réellement exploitées lorsqu'elles existent dans les diagnostics BAC : `curiosity`, `serenity`, `concern`, `determination`, `frustration`.

Le contexte reste dominant. Les pondérations BAC sont modérées et servent surtout à sélectionner un développement ou une variation compatible. Le niveau sonore ne doit pas devenir le principal vecteur d'intensité.

## 7. Continuité musicale

- Écoute minimale : 20 secondes, sauf priorité supérieure.
- Fondu standard : 4 secondes ; fondu urgent : 1,5 seconde.
- Une intro protégée n'est interrompue que par danger, priorité suffisante ou découverte de map.
- Maximum indicatif : trois répétitions consécutives d'une boucle simple.
- Historique anti-répétition : trois séquences récentes.
- Les développements longs sont préférés lorsque l'activité se maintient.
- Une entrée de nouvelle map utilise une ponctuation temporaire puis revient au contexte dominant.
- Le choix d'entrée doit varier ; une exploration longue ne doit pas exposer une boucle courte facilement identifiable.

## 8. Décisions d'écoute validées

- **Main A** est conservé comme référence.
- **Quiet B** est abandonné.
- **Relic E** reste exploitable en isolant les trois notes centrales par de courts fondus.
- Les micro-sons doivent être normalisés avant attribution aux micro-événements BAC.
- Les boutons musique, caméra et bulles doivent rester regroupés près de la barre des menus.

## 9. Réglages restant à finaliser

- E2 : prolonger d'environ deux secondes et renforcer légèrement le niveau.
- F : conserver la note finale et déplacer le fondu après celle-ci.
- Relic E : caler précisément les fondus autour des trois notes centrales.
- Éliminer les arrêts audio occasionnels et vérifier la reprise après erreur.
- Réduire encore la monotonie des entrées de map et de l'autonomie prolongée.
- Vérifier qu'aucun préchargement ou changement musical ne ralentit le moteur 3D lors d'un changement de map.
- Finaliser l'inventaire des micro-sons et leur règle d'attribution aux événements BAC.
- Normaliser les niveaux perçus de toutes les sources retenues.

## 10. Critères de gel

Le système pourra être gelé lorsque :

1. aucune session longue ne produit de silence inattendu ;
2. aucune entrée de map n'est ralentie par l'audio ;
3. les thèmes restent stables malgré l'alternance normale observation/collecte ;
4. les séquences autonomes développent une ambiance sans boucle évidente ;
5. les variations de map restent perceptibles et suffisamment diverses ;
6. E2, F, Relic E et les micro-sons sont validés à l'écoute ;
7. les niveaux sonores sont homogènes et le réglage joueur reste persistant.
