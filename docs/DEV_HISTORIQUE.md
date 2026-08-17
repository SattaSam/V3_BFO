# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session du 17 août 2026 — Rétablissement V5.2, sécurisation CPU / sauvegarde / population

### Base finale de session
- Commit audité : `cd4a5187e40294b3f6680243af8ae9f997c392a6`.
- Objet principal de la session : rétablir progressivement les comportements validés de la veille et sécuriser la base avant P01→P012.

### RuntimeBudget / CPU
Angle mort confirmé :
- les runtimes flore, faune, PNJ, phénomènes et passifs utilisaient déjà `RuntimeBudget.shouldUpdate()`;
- `special-object-runtime.js` animait encore tous ses objets à chaque `built.update()`.

Correction :
- raccord au `RuntimeBudget` existant, sans second système de throttling ;
- PNJ spéciaux → `npc` ;
- animal nocturne → `fauna` ;
- plante carnivore → `flora` ;
- tempêtes, îlots, cristaux et drones → `phenomenon` ;
- respawns et logique drones à 1 Hz conservés.

### Sauvegarde / dirty-state
Cause confirmée :
- `save-ui-bridge.js` appelait `persistRuntime()` avant la capture de l'état ;
- `persistRuntime()` appelait `BF.progression.save()` ;
- `ProgressionRegistry.save()` mettait systématiquement `updatedAt = Date.now()` ;
- l'autosave créait donc lui-même une différence de signature.

Correction :
- retrait uniquement de `BF.progression.save()` du pré-flush global ;
- les mutations réelles de progression restent sauvegardées par `ProgressionRegistry` ;
- `MissionMemory` conserve son modèle dirty/flush.

### Incident de livraison `save-ui-bridge.js`
Un premier patch a été construit à partir d'un extrait partiel du fichier et a tronqué la fin de `save-ui-bridge.js`.
Cette erreur a été commitée dans `f838d018...`.

Réparation :
- restauration du fichier complet ;
- réapplication de l'unique suppression nécessaire ;
- commit réparé/audité : `cd4a5187...`.

Règle désormais explicite :
- ne jamais construire un fichier destiné au dépôt à partir d'un extrait de lecture partielle ;
- toujours partir du fichier complet du HEAD courant ou d'un fichier complet fourni par l'utilisateur ;
- vérifier le diff exact avant livraison.

### Population / MSC
Règle clarifiée :
- `floating_islands` : îlot suspendu garanti ;
- désert avec roches en lévitation : garantie ;
- marais avec îles flottantes : garantie ;
- autres contextes magnétiques : seulement probabilité renforcée.

Les MSC coralliennes underwater bioluminescentes restent intégrées et leurs transformations locales restent inchangées.

### Autres éléments récupérés / sécurisés
- récupération progressive caméra ;
- récupération bulles de parole ;
- protections CPU précédentes conservées ;
- audio adaptatif non modifié pendant cette passe.

### Conclusion de session
La majeure partie de la journée a consisté à rétablir et sécuriser une base fonctionnelle déjà atteinte la veille, avec trois gains techniques réels :
1. suppression de l'angle mort RuntimeBudget des objets spéciaux ;
2. autosave dirty-state réellement exploitable ;
3. règle population/îlots clarifiée et rétablie.

La base `cd4a5187...` est considérée comme point de départ pour l'intégration P01→P012.

---

## Session du 15 août 2026 — Audit Bible / CUO / moteur et stratégie de patrons

### Base
- V5 Stable : `d59376559e71032b478fb01a84fdb9bdd6611736`.

### Audit documentaire
- Bible principale : 182 missions normalisées.
- Principe confirmé : la narration reste souveraine ; la technique traduit sans réécrire.
- Les formulations « comparer », « comprendre », « reconnaître », « déduire » ne nécessitent pas systématiquement un moteur spécialisé.
- Les MSC associées doivent distinguer trois rôles : triggerContext, objectiveSubject, scenarioSupport.

### Audit moteur
Présent :
- triggers d'interactions et d'exploration ;
- mémoire persistante ;
- plusieurs missions actives ;
- fan-out passif ;
- un événement révèle au maximum une mission ;
- targetBinding contractuel ;
- instanceId/mapId/zoneId dans les événements ;
- mission instanciable par map ;
- infrastructure de spawn MSC via site.establish.

Écarts ciblés :
- targetBinding=instance non propagé jusqu'au choix exact d'ActionBridge ;
- objectifs actifs sans distinctBy générique ;
- agrégation multi-map/biome à ajouter ;
- spawn MSC missionnel à généraliser ;
- durée/proximité/délai ;
- excursion/retour ;
- effets réputation/branche/faits.

### Audit CUO
- ObjectLibrary porte déjà actions, états, familles, tags, recherche, ressources et progression.
- tech_relic, stele, arch et plusieurs objets archéologiques utilisent déjà une sémantique d'instance.
- composants techniques présents : pulse_core, memory_capsule, relay_block, logic_prism, survey_beacon.
- drones fonctionnels et PNJ existants.
- besoin : ajouter speciesId/factionId aux types de créatures/PNJ pertinents.

### Décision architecture missions
- Limiter le nombre de patrons.
- Mutualiser les variantes avec des interrupteurs.
- Développer chaque patron en parallèle du raccord moteur associé.
- Cible de travail : environ 8 familles de patrons au total.
- Après validation : intégrer P01–P012.
- Ensuite seulement industrialiser les 182 missions.

### Discipline documentaire
Les documents officiels sont ceux de `docs/README.txt`.
Les DOCX et TODO historiques ne doivent pas être utilisés comme sources de pilotage.
