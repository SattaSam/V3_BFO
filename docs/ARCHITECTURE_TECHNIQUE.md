# BlueFox Odyssey — Architecture technique

Référence : **commit `cd4a5187e40294b3f6680243af8ae9f997c392a6` — 17 août 2026**

## Registre canonique des propriétaires

| Domaine                                       | Propriétaire canonique                                       | Rôle / règle                                                 |

| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |

| Objet / métadonnées CUO                       | `engine/object-library.js`                            | Source de vérité des objets                                  |

| Placement / instanciation                     | `engine/object-spawner.js`                                   | Placement global, spawn objets/MSC                           |

| Biomes                                        | `engine/biome-rules.js`                                      | Règles de biome                                              |

| Politique de population                       | `engine/biome-population-policy-r3.js`                       | Pondérations, exclusions, population                         |

| Hiérarchie de population                      | `engine/map-population-hierarchy.js`                         | Organisation des niveaux de population                       |

| Génération de map                             | `engine/map-generator.js` + `engine/map-generation-rules.js` | Génération structurelle des maps                             |

| Prescription Bible des maps                   | \*\*`engine/bible-map-prescription-v19.js`\*\*                   | \*\*Propriétaire des prescriptions Bible appliquées aux maps\*\* |

| Application prescriptions Bible au générateur | `engine/map-generator-bible-overrides-v19.js`                | Traduit/applique les prescriptions au générateur             |

| Exploration Bible / monde                     | `engine/bible-exploration-world-v19.js`                      | Règles exploration issues de la Bible                        |

| Exploration Bible / MSC                       | `engine/bible-exploration-micro-scenes-v19.js`               | Liaison exploration Bible ↔ MSC                              |

| Micro-scènes                                  | `engine/micro-scenes.js`                                     | Orchestration MSC                                            |

| Données MSC custom                            | `data/custom-micro-scenes.js`                                | Compositions MSC enregistrées                                |

| Persistance MSC                               | `engine/persistent-micro-scenes-v20.js`                      | Restaurer/persister les MSC                                  |

| Monde / transitions / autonomie               | `engine/world-engine.js`                                     | État et fonctionnement du monde                              |

| Topologie monde                               | `engine/world-topology-v3.js`                                | Graphe/topologie des maps                                    |

| Persistance topologie                         | `engine/topology-persistence-bridge.js`                      | Sauvegarde/restauration topologie                            |

| Menu planète / topologie UI                   | `engine/planet-topology-ui.js`                               | Représentation topologique dans l’UI                         |

| Globe planète                                 | `engine/planet-globe-ui.js`                                  | Rendu/interactions globe                                     |

| Caméra                                        | \*\*`engine/camera-controller.js`\*\*                            | Propriétaire principal caméra                                |

| Regard caméra étendu                          | `engine/camera-extended-look.js`                             | Extension du contrôleur, pas second système caméra           |

| Déplacement BlueFox                           | `engine/character-controller.js`                             | Mouvement personnage                                         |

| Navigation / chemins                          | \*\*`engine/path-planner.js`\*\*                                 | Calcul/planification des déplacements                        |

| Arbitrage comportemental BAC                  | `engine/behavior-arbitration-core.js`                        | Décision comportementale                                     |

| Intégration BAC au jeu                        | `engine/behavior-arbitration-integration.js`                 | Raccord BAC ↔ runtime                                        |

| Budget CPU                                    | \*\*`engine/runtime-budget.js`\*\*                               | Unique système de throttling adaptatif                       |

| Runtime flore                                 | `engine/flora-runtime.js`                                    | Comportement flore                                           |

| Runtime faune                                 | `engine/fauna-runtime.js`                                    | Comportement faune                                           |

| Runtime PNJ                                   | `engine/npc-runtime.js`                                      | Comportement PNJ                                             |

| Runtime phénomènes                            | `engine/phenomenon-runtime.js`                               | Phénomènes environnementaux                                  |

| Runtime objets passifs                        | `engine/passive-object-runtime.js`                           | Objets passifs                                               |

| Runtime objets spéciaux                       | `engine/special-object-runtime.js`                           | Objets spéciaux, soumis à RuntimeBudget                      |

| Progression centrale                          | \*\*`engine/progression-registry.js`\*\*                         | Registre autoritaire de progression                          |

| Progression multi-système                     | `engine/progression-multisystem.js`                          | Agrégation complémentaire                                    |

| Exploration de map                            | `engine/map-exploration-tracker.js`                          | Mesure/persistance exploration                               |

| Sauvegarde globale / snapshots                | \*\*`engine/save-ui-bridge.js`\*\*                               | Orchestration save/load                                      |

| Buffer d’écriture persistante                 | `engine/persistence-write-buffer.js`                         | Mutualise/temporise les écritures                            |

| Sauvegarde position                           | `engine/position-save-throttle.js`                           | Cadence spécifique de persistance position                   |

| Missions / orchestration                      | \*\*`engine/mission-manager.js`\*\*                              | Propriétaire du cycle missionnel                             |

| Mémoire mission                               | \*\*`engine/mission-memory.js`\*\*                               | Lifecycles, faits, historique, sites                         |

| Planification mission                         | `engine/mission-planner.js`                                  | Traduit mission en intention/action                          |

| Arbre / objectifs                             | `engine/mission-tree.js`                                     | Structure des objectifs                                      |

| Types mission                                 | `engine/mission-types.js`                                    | Modèle des types/objectifs                                   |

| Contrat Bible                                 | `engine/bible-contract-v0-1.js`                              | Contrat des fiches/patrons                                   |

| Runtime Bible                                 | \*\*`engine/bible-runtime-v0-1-unified.js`\*\*                   | Interprétation Bible                                         |

| Validation Bible                              | `engine/bible-validation-v0-1.js`                            | Validation des données Bible                                 |

| Patrons Bible                                 | `data/bible-patterns.js`                                     | Familles génériques                                          |

| Catalogue Bible                               | `data/bible-catalog.js`                                      | Fiches missionnelles                                         |

| Exécution mission → action                    | `engine/action-bridge.js`                                    | Raccord intention/action réelle                              |

| Événements objets                             | `engine/object-event-registry.js`                            | Normalisation événements                                     |

| Arbitrage cible mission                       | `engine/mission-target-arbitration-v19-12.js`                | Choix/priorité de cible missionnelle                         |

| Intégration runtime missions                  | `engine/mission-runtime-integration-v19-7.js`                | Raccord runtime mission au jeu                               |

| UI missions                                   | \*\*`engine/mission-ui-bridge.js`\*\*                            | Affichage mission uniquement                                 |

| Inventaire UI                                 | `engine/inventory-ui-bridge.js`                              | Raccord UI inventaire                                        |

| Capacité inventaire / IA                      | `engine/inventory-capacity-ai.js`                            | Contraintes capacité pour IA                                 |

| Survie / IA                                   | `engine/survival-ai-bridge.js`                               | Raccord survie ↔ comportement                                |

| Rations                                       | `engine/survival-rations-v0-3.js`                            | Mécanique ration                                             |

| IA ration                                     | `engine/survival-rations-ai-v0-3.js`                         | Utilisation ration par IA                                    |

| Réglages survie                               | `engine/survival-tuning-r3.js`                               | Tuning uniquement                                            |

| Musique adaptative                            | \*\*`engine/adaptive-music-engine-v1.js`\*\*                     | Unique moteur musical                                        |

| Raccord musique ↔ gameplay                    | `engine/adaptive-music-gameplay-bridge-v1.js`                | Contexte gameplay/BAC                                        |

| UI musique                                    | `engine/adaptive-music-ui-v1.js`                             | Volumes/UI                                                   |

| `map-registry.js`                             | \*\*PROTÉGÉ\*\*                                                  | Aucun ajout de logique objet/population/mission              |


## Sources de vérité

* Objet / métadonnées : `engine/object-library.js`
* Placement / instanciation : `engine/object-spawner.js`
* Biomes / population : `engine/biome-rules.js`
* Politique de population : `engine/biome-population-policy-r3.js`
* Micro-scènes : `engine/micro-scenes.js` + `data/custom-micro-scenes.js`
* Monde / transitions / autonomie : `engine/world-engine.js`
* Budget runtime adaptatif : `engine/runtime-budget.js`
* Objets spéciaux runtime : `engine/special-object-runtime.js`
* Sauvegarde UI / snapshot / autosave : `engine/save-ui-bridge.js`
* MissionManager : `engine/mission-manager.js`
* Mémoire mission : `engine/mission-memory.js`
* Patrons Bible : `data/bible-patterns.js`
* Catalogue Bible injecté : `data/bible-catalog.js`
* Contrat Bible : `engine/bible-contract-v0-1.js`
* Runtime Bible : `engine/bible-runtime-v0-1-unified.js`
* Exécution mission : `engine/action-bridge.js`
* Événements objets : `engine/object-event-registry.js`

## Contrat CUO → événements → missions

Le CUO ne sert pas uniquement au rendu 3D. Les définitions normalisées exposent :

* actions ;
* états ;
* familles ;
* tags ;
* connaissances ;
* recherche ;
* ressources ;
* progression ;
* rareté ;
* biomes ;
* spawn.

Ces métadonnées sont projetées dans `userData` puis réinjectées dans les événements consommés par le Runtime Bible.

## Contrat des micro-scènes CUSTOM

* CUO Lab enregistre les transformations locales.
* MAP\_Test et le jeu doivent interpréter exactement les mêmes données.
* `ObjectSpawner` ne réécrit pas les pivots internes.
* Une MSC peut avoir trois rôles missionnels indépendants :

  * `triggerContext`
  * `objectiveSubject`
  * `scenarioSupport`
* Une MSC associée à une mission n'est donc pas automatiquement un objectif.
* Les trois MSC `MSC-CUSTOM-CORAILBIOLUMINESCENT1/2/3` restent intégrées pour les traitements underwater bioluminescents.
* Les transformations sauvegardées restent intouchables.

## Contrat population / îlots

* `floating\_islands` : îlot suspendu garanti.
* Désert avec roches en lévitation : îlot suspendu garanti.
* Marais avec îles flottantes : îlot suspendu garanti.
* Autres contextes magnétiques : probabilité renforcée, sans garantie générale.
* Les cartes tutoriel / départ restent protégées par leurs règles existantes.

## RuntimeBudget

`engine/runtime-budget.js` est l'unique budget adaptatif de runtime.

Principes :

* cadence modulée par distance ;
* adaptation au niveau de performance / FPS ;
* quotas par catégorie et par frame ;
* anti-starvation intégré.

Catégories existantes réutilisées :

* `passive`
* `npc`
* `fauna`
* `flora`
* `phenomenon`

`engine/special-object-runtime.js` ne crée aucun second système :

* `npc\_translucent`, `npc\_rocky` → `npc`
* `nocturnal\_animal` → `fauna`
* `carnivorous\_plant` → `flora`
* autres objets spéciaux animés → `phenomenon`

Le second passage à 1 Hz pour respawns et drones reste logique métier et n'est pas remplacé par le RuntimeBudget.

## Sauvegarde / dirty-state

Chaîne d'autosave :

```text
persistRuntime()
→ captureState()
→ stateSignature()
→ comparaison à lastAutoStateSignature
→ écriture seulement si nécessaire
```

Règle :

* `persistRuntime()` ne doit pas produire artificiellement un changement d'état.
* `BF.progression.save()` ne doit donc pas être appelé par ce pré-flush, car `ProgressionRegistry.save()` met à jour `updatedAt`.
* Les vraies mutations du registre de progression se sauvegardent déjà à leur source.
* `MissionMemory` conserve son mécanisme dirty/flush.

## Discipline de modification de fichiers

Règle renforcée après l'incident du 17 août 2026 :

* toujours partir du fichier complet du HEAD courant ;
* ou du fichier complet explicitement fourni par l'utilisateur ;
* ne jamais reconstruire un fichier destiné au dépôt à partir d'un extrait de lecture partielle ;
* vérifier le diff exact avant livraison ;
* un fichier modifié doit conserver tout le contenu hors lignes réellement visées ;
* aucun bridge parallèle ou fichier versionné ne doit être créé pour un correctif local.

## Contrat missionnel actuel

Le moteur possède déjà :

* missions simultanément actives ;
* mission primaire / secondaires ;
* prérequis ;
* persistance ;
* séquences d'objectifs ;
* triggers interaction, mouvement, exploration et progression ;
* filtres `objectId`, `family`, `subject`, `mapId`, `zoneId`, `biome`, tags ;
* `uniqueOnly` sur les triggers ;
* `targetBinding = instance | definition` dans le contrat ;
* mission instanciable par map ;
* fan-out passif d'une action vers plusieurs missions actives.

### Ciblage exact d'instance

Le Runtime mémorise `instanceId` et le contrat autorise `targetBinding=instance`, mais l'ActionBridge doit garantir que la cible choisie est précisément cette instance.

Chaîne visée :

```text
bibleTarget.instanceId
→ MissionPlanner
→ ActionBridge
→ candidat interactable exact
```

### Distinction sur objectifs actifs

Extension requise :

* `distinctBy: instanceId`
* `distinctBy: mapId`
* `distinctBy: biomeId`
* `distinctBy: speciesId`

avec mémoire persistante des valeurs déjà comptées.

### Portée

Paramètre commun recommandé :

* `local`
* `map`
* `global`

### Spawn MSC missionnel

L'infrastructure `site.establish` reste la preuve de chaîne :

```text
mission effect
→ placement
→ ObjectSpawner.spawnMicroScene()
→ rattachement map
→ persistance
→ restauration
```

À généraliser en effet de type `microScene.spawn` si nécessaire pendant l'intégration P01→P012.

## Non-régression

Tout correctif missionnel doit préserver :

* un événement révèle au plus une mission ;
* une action peut progresser plusieurs missions actives ;
* commandes joueur prioritaires ;
* MSC identiques entre CUO Lab / MAP\_Test / jeu ;
* camps jamais spontanés ;
* navigation persistante ;
* aucune logique objet dans `map-registry.js` ;
* aucun second système de throttling ;
* aucun faux dirty-state provoqué par l'autosave ;
* aucun fichier complet reconstruit depuis un extrait partiel.

