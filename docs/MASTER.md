# BLUEFOX ODYSSEY — MASTER

## État de référence
Dernière mise à jour : 2026-08-17

### Version de travail
- Base GitHub de référence : commit `cd4a5187e40294b3f6680243af8ae9f997c392a6`.
- Ce commit restaure le bridge de sauvegarde complet après la troncature accidentelle du commit précédent et conserve les correctifs CPU / population / sauvegarde validés.
- Base PC historique : V16.20.
- Version mobile/APK précédente : V16.14, considérée obsolète.
- Développement mobile à reprendre depuis la base PC stable courante.
- Objectif : builds testables régulièrement, Web puis Android.

## Gouvernance documentaire officielle
Les seuls documents de référence officiels maintenus sont ceux listés dans `docs/README.txt` :
- `MASTER.md`
- `ARCHITECTURE_TECHNIQUE.md`
- `ROADMAP_TODO.md`
- `DEV_HISTORIQUE.md`
- `MUSIC_SYSTEM_V1.md`

Les autres DOCX/MD présents dans `docs/` sont des annexes, archives ou sources historiques et ne doivent pas être utilisés pour piloter le chantier courant.

## Architecture 3D concernée
Fichiers principaux :
- `engine/bluefox3d-core.js`
- `engine/map-registry.js`
- `engine/world-engine.js`
- `engine/object-library.js`
- `engine/object-spawner.js`
- `engine/micro-scenes.js`
- `engine/runtime-budget.js`
- `engine/special-object-runtime.js`
- `engine/save-ui-bridge.js`
- `game.js` uniquement si des réglages restent compilés ou embarqués à la racine.

## Contrat MSC validé
- CUO Lab, MAP_Test et moteur du jeu doivent restituer exactement les mêmes transformations locales enregistrées.
- `ObjectSpawner` choisit uniquement l'ancrage et la rotation globale d'une instance MSC.
- Les trois MSC coralliennes sous-marines bioluminescentes restent intégrées.
- Les rochers blanchis restent exclus de tout contexte non glace/banquise/neige/toundra.
- Les scènes déjà créées et les associations mission↔MSC déjà décidées doivent être réutilisées avant toute création nouvelle.
- Règle îlots suspendus :
  - garantie sur `floating_islands` ;
  - garantie sur les déserts à roches en lévitation ;
  - garantie sur les marais à îles flottantes ;
  - probabilité renforcée seulement sur les autres contextes magnétiques.

## Performance / RuntimeBudget
- `engine/runtime-budget.js` reste l'unique système de throttling adaptatif.
- Flore, faune, PNJ, phénomènes et objets passifs l'utilisent déjà.
- `engine/special-object-runtime.js` est désormais raccordé au même budget :
  - PNJ spéciaux → `npc`
  - animal nocturne → `fauna`
  - plante carnivore → `flora`
  - tempêtes, îlots, cristaux et drones → `phenomenon`
- La logique métier à 1 Hz (respawns / drones) reste indépendante de l'animation frame par frame.

## Sauvegarde
- `MissionMemory` conserve son modèle dirty/flush.
- `save-ui-bridge.js` ne force plus `BF.progression.save()` avant la capture d'état.
- Le mécanisme de signature d'autosave peut ainsi réellement ignorer un état inchangé.
- `ProgressionRegistry` continue de sauvegarder ses vraies mutations à leur source.
- Incident du 17 août : un patch préparé depuis un extrait partiel avait tronqué `save-ui-bridge.js`.
- Règle renforcée : tout fichier modifié doit être construit depuis le fichier complet du HEAD courant ou depuis un fichier complet fourni par l'utilisateur ; jamais depuis un extrait de lecture partielle.

## Système de missions et progression
- Le Runtime missionnel V0.1 / MissionManager M2 reste la fondation fonctionnelle.
- Une action peut faire progresser plusieurs missions déjà actives.
- Un même événement ne peut révéler qu'une seule nouvelle mission.
- Mission principale et missions secondaires coexistent ; les secondaires progressent passivement.
- `MissionMemory` reste la mémoire persistante des lifecycles, faits, historiques, effets et sites.
- Le registre central de progression reste autoritaire pour les quantités d'inventaire.

## Principe officiel Bible → moteur
La Bible documentaire reste la source narrative humaine et souveraine.

Chaîne officielle :

```text
BIBLE DOCUMENTAIRE
  ↓
PATRON DE MISSION
  ↓
FICHE DE MISSION PARAMÉTRÉE
  ↓
BibleRuntime
  ↓
MissionManager + ObjectEvents + BAC
  ↓
Moteur du jeu
```

Le patron porte la mécanique commune. La fiche ne contient que les paramètres propres à une mission.

### Stratégie de patrons
L'objectif n'est pas de créer un patron par mission, mais un nombre réduit de familles génériques couvrant un maximum de cas avec des interrupteurs.

Interrupteurs de référence :
- `targetBinding = instance | definition`
- `distinctMode = indifferent | unique`
- `scope = local | map | global`
- `sameTarget = true | false`
- `count` / `threshold`
- `duration` / `proximity`
- `direction`
- `contextRole = triggerContext | objectiveSubject | scenarioSupport`
- effets / délai / prérequis

Les trois patrons de preuve actuels restent la base :
1. découvrir / comprendre ;
2. accumuler / atteindre un seuil ;
3. préparer → produire / débloquer.

Ils doivent être complétés par quelques familles supplémentaires seulement lorsque les besoins documentaires l'exigent.

## Audit Bible / CUO / moteur
Conclusion : le moteur générique est largement suffisant ; les principaux manques sont des raccords ciblés.

Déjà disponibles :
- triggers interaction/exploration/progression ;
- `instanceId`, `mapId`, `zoneId`, `factionId` dans les événements ;
- `targetBinding` au contrat ;
- mission instanciable par map ;
- `uniqueOnly` sur les triggers ;
- persistance des faits/historiques ;
- infrastructure de spawn MSC via `site.establish` ;
- fan-out multi-missions ;
- métadonnées CUO riches et propagées au runtime.

Raccords à compléter :
- faire suivre réellement `targetBinding=instance` jusqu'à ActionBridge ;
- ajouter `distinctBy` sur les objectifs actifs ;
- agréger plusieurs maps/biomes/instances dans une mission globale ;
- généraliser le spawn MSC missionnel ;
- durée/proximité/délai ;
- cycle excursion→retour ;
- effets génériques de branche, réputation et faits.

## CUO / factions / réputation
- Chaque type de créature/PNJ pertinent doit porter un `speciesId` et un `factionId`.
- `cultureId` peut être porté par la MSC/instance si le contexte l'exige.
- Réputation simple attendue : agressif, neutre, friendly, friendly++.
- Ne pas recréer les PNJ : enrichir leur identité fonctionnelle.

## Ration
La brique `survival.rationRecipe` existe déjà dans le moteur et doit être retrouvée/auditée avant toute nouvelle création de recette ou de patron dédié.

## Tutoriel
Après les patrons/raccords génériques :
- implanter P01 à P012 comme lot de validation ;
- séquence dirigée au départ, autonomie progressive ensuite ;
- valider sauvegarde/reprise à chaque étape.

Le tutoriel est le banc de validation avant industrialisation des 182 missions.

## Direction actuelle
Priorité immédiate :
1. intégration contrôlée de P01 à P012 sur la base `cd4a5187…` ;
2. raccords missionnels génériques nécessaires révélés par ce lot ;
3. factions/réputation + ration ;
4. industrialisation progressive des 182 missions ;
5. finitions gameplay, audio, performances et packaging.
