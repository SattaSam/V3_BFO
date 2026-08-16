# BLUEFOX ODYSSEY — MASTER

## État de référence
Dernière mise à jour : 2026-08-16

### Version de travail
- Base GitHub de référence : commit `d1796bf312f5e86da65317087b6c58db803bcd3c` — **fix regression 4**.
- Le chantier tutoriel T01 à T08 a été intégré techniquement à partir de cette base dans le cumulatif livré le 16 août 2026.
- Statut tutoriel : **T01 à T08 intégrés techniquement, validation en jeu encore à effectuer**.
- Les tests P01 à P08 sont explicitement à faire avant de considérer ce jalon comme validé.
- Base PC historique : V16.20.
- Version mobile/APK précédente : V16.14, considérée obsolète.
- Développement mobile à reprendre depuis la base PC stable courante.
- Objectif : builds testables régulièrement, Web puis Android.

## Avancement global
Estimation de pilotage au 16 août 2026 : **environ 78 %**.

Le cœur fonctionnel est largement en place : monde 3D, CUO, micro-scènes, génération de maps, navigation/topologie, autonomie/BAC, missions génériques, survie/rations, journal/UI, musique adaptative et chaîne Bible → moteur.

Le reliquat principal porte sur :
- validation en jeu et non-régression longue ;
- tests T01 à T08 ;
- récupération puis intégration T09 à T12 ;
- GAME-shelter complet ;
- factions / réputation ;
- industrialisation progressive des 182 missions ;
- finitions performance, audio, UI et packaging/mobile.

## Gouvernance documentaire officielle
Documents de pilotage actifs :
- `MASTER.md`
- `ARCHITECTURE_TECHNIQUE.md`
- `ROADMAP_TODO.md`
- `DEV_HISTORIQUE.md`
- `MUSIC_SYSTEM_V1.md`

Les DOCX/MD historiques restent des annexes ou sources documentaires et ne doivent pas remplacer ces fichiers pour le pilotage courant.

## Architecture 3D concernée
Fichiers principaux :
- `engine/bluefox3d-core.js`
- `engine/map-registry.js`
- `engine/world-engine.js`
- `engine/object-library.js`
- `engine/object-spawner.js`
- `engine/micro-scenes.js`
- `game.js` uniquement si des réglages restent compilés ou embarqués à la racine.

## Contrat MSC validé
- CUO Lab, MAP_Test et moteur du jeu doivent restituer exactement les mêmes transformations locales enregistrées.
- `ObjectSpawner` choisit uniquement l'ancrage et la rotation globale d'une instance MSC.
- Les scènes déjà créées et les associations mission↔MSC déjà décidées doivent être réutilisées avant toute création nouvelle.
- Les trois MSC coralliennes sous-marines bioluminescentes restent intégrées.
- Les rochers blanchis restent exclus de tout contexte non glace/banquise/neige/toundra.

## Système de missions et progression
- Le Runtime missionnel V0.1 / MissionManager M2 reste la fondation fonctionnelle.
- Une action peut faire progresser plusieurs missions déjà actives.
- Un même événement ne peut révéler qu'une seule nouvelle mission.
- Mission principale et missions secondaires coexistent ; les secondaires progressent passivement.
- `MissionMemory` reste la mémoire persistante des lifecycles, faits, historiques, effets et sites.
- Le registre central de progression reste autoritaire pour les quantités d'inventaire.
- Les modes d'autonomie canoniques restent `off`, `movement-only` et `full`.

## Principe officiel Bible → moteur
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

## Tutoriel T01 à T08 — état courant
Le lot T01 à T08 est maintenant **intégré techniquement** mais reste **à valider en jeu**.

Principes fonctionnels retenus :
- T01 : reconnaissance du Site du crash / capsule réelle de la map `crystal`.
- T02 : premières ressources : plante, bois, minerais.
- T03 : établissement du premier Camp avec la MSC et le placement canonique existants.
- T04 : démonstration de progression parallèle ; la première nouvelle collecte de bois pendant T04 valide T04, tandis que le compteur bois du futur Refuge continue séparément vers 100.
- T05 : exploration à 60 % de la map de départ `crystal` (map à un plateau).
- T06 : analyse de 3 objets différents, incluant la stèle et l'arche ; synthèse dans le Journal.
- T07 : suggestion de direction via le menu Planète, déplacement en semi-autonomie, cible de curiosité sur la nouvelle map et MSC de secours si nécessaire.
- T08 : suggestion explicite de retour au camp puis retour par itinéraire connu.

### Validation obligatoire
- **P01 à P08 : tests en jeu à faire.**
- Vérifier sauvegarde/reprise à chaque étape.
- Vérifier la chaîne des prérequis et l'absence d'auto-validation indue.
- Vérifier les indications UI tutoriel.
- Vérifier les transitions d'autonomie T01-T08.
- Vérifier la non-régression BAC/navigation/rations.

## Direction actuelle
Priorité immédiate :
1. tester P01 à P08 en jeu et corriger uniquement les défauts réellement reproduits ;
2. stabiliser définitivement le lot T01 à T08 ;
3. récupérer les détails canoniques T09 à T12 ;
4. traiter GAME-shelter complet ;
5. poursuivre factions/réputation et industrialisation des 182 missions ;
6. finitions gameplay, audio, performances et packaging.
