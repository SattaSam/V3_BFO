# BlueFox Odyssey — Architecture technique

Référence : **commit `d1796bf312f5e86da65317087b6c58db803bcd3c` — 16 août 2026**

## Sources de vérité
- Objet / métadonnées : `engine/object-library.js`
- Placement / instanciation : `engine/object-spawner.js`
- Biomes / population : `engine/biome-rules.js`
- Micro-scènes : `engine/micro-scenes.js` + `data/custom-micro-scenes.*`
- Monde / transitions / autonomie : `engine/world-engine.js`
- MissionManager : `engine/mission-manager.js`
- Mémoire mission : `engine/mission-memory.js`
- Patrons Bible : `data/bible-patterns.js`
- Catalogue Bible injecté : `data/bible-catalog.js`
- Contrat Bible : `engine/bible-contract-v0-1.js`
- Runtime Bible : `engine/bible-runtime-v0-1-unified.js`
- Exécution mission : `engine/action-bridge.js`
- Événements objets : `engine/object-event-registry.js`
- Autonomie utilisateur : `engine/settings-ui-bridge.js`
- Arbitrage BAC : `engine/behavior-arbitration-integration.js`

## Contrat CUO → événements → missions
Le CUO expose actions, états, familles, tags, connaissances, recherche, ressources, progression, rareté, biomes et spawn. Ces métadonnées sont projetées dans `userData` puis réinjectées dans les événements consommés par le Runtime Bible.

## Contrat des micro-scènes CUSTOM
- CUO Lab enregistre les transformations locales.
- MAP_Test et le jeu doivent interpréter exactement les mêmes données.
- `ObjectSpawner` ne réécrit pas les pivots internes.
- Une MSC peut avoir trois rôles missionnels indépendants : `triggerContext`, `objectiveSubject`, `scenarioSupport`.
- Une MSC associée à une mission n'est donc pas automatiquement un objectif.

## Contrat missionnel courant
Le moteur dispose de :
- missions simultanément actives ;
- mission primaire / secondaires ;
- prérequis ;
- persistance ;
- séquences d'objectifs ;
- triggers interaction, mouvement, exploration et progression ;
- filtres `objectId`, `family`, `subject`, `mapId`, `zoneId`, `biome`, tags ;
- `uniqueOnly` sur les triggers ;
- ciblage exact par instance ;
- `distinctBy` sur les objectifs d'étude ;
- exploration par seuil de surface ;
- cycle de déplacement / retour ;
- spawn MSC persistant de soutien missionnel ;
- fan-out passif d'une action vers plusieurs missions actives.

## Autonomie
Source de vérité unique :
- `off`
- `movement-only`
- `full`

Le BAC et le watchdog doivent respecter ce mode. En `movement-only`, seules les décisions de navigation/exploration sont autorisées ; les décisions de collecte, recherche, relations et routines restent bloquées.

## Tutoriel T01 à T08
Le lot T01 à T08 est intégré techniquement sur la base courante mais n'est pas encore validé en jeu.

Raccords utilisés :
- capsule réelle du Site du crash ;
- collecte plante / bois / minerais ;
- Camp canonique et placement canonique ;
- compteur parallèle bois du futur Refuge ;
- exploration 60 % de `crystal` ;
- étude de 3 objets distincts ;
- Journal ;
- guidage UI ;
- menu Planète / suggestion de direction ;
- semi-autonomie de déplacement ;
- MSC de relique de secours ;
- itinéraire connu de retour au camp.

### Règle T04
T04 ne demande pas 100 bois. Elle utilise le projet Refuge comme compteur parallèle : **une nouvelle collecte de bois effectuée pendant T04 suffit à valider T04**, tandis que le compteur Refuge continue indépendamment vers 100.

## Non-régression obligatoire
Tout correctif missionnel doit préserver :
- un événement révèle au plus une mission ;
- une action peut progresser plusieurs missions actives ;
- commandes joueur prioritaires ;
- modes `off / movement-only / full` respectés partout ;
- MSC identiques entre CUO Lab / MAP_Test / jeu ;
- camps jamais spontanés ;
- navigation persistante ;
- rations/BAC inchangés hors correction explicitement visée ;
- aucune logique objet dans `map-registry.js`.

## Validation en attente
- **P01 à P08 : tests en jeu à effectuer.**
- Vérifier sauvegarde/reprise.
- Vérifier les prérequis entre missions.
- Vérifier le Journal et les surbrillances UI.
- Vérifier T07/T08 avec changements de maps réels.
- Vérifier absence de régression BAC/navigation/rations.
