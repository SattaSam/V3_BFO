# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **17 août 2026**

Cette page est la **seule TODO active**.

## Base de reprise

* [x] Base courante auditée : `cd4a5187e40294b3f6680243af8ae9f997c392a6`.
* [x] Restauration complète de `save-ui-bridge.js` après troncature accidentelle.
* [x] Correction dirty-state autosave : retrait du `BF.progression.save()` forcé dans `persistRuntime()`.
* [x] Raccord `special-object-runtime.js` au `RuntimeBudget` existant.
* [x] Règle îlots : garantie ciblée / probabilité magnétique renforcée.
* [x] MSC coralliennes underwater conservées.
* [x] Audit Bible documentaire 182 missions.
* [x] Audit CUO / MSC.
* [x] Audit BibleRuntime / MissionManager / ActionBridge.
* [x] Synthèse consolidée Bible → CUO/MSC → moteur.

## P0 — Préparation technique avant P01→P012

* [x] RuntimeBudget : supprimer l'angle mort des objets spéciaux.
* [x] Sauvegarde : rétablir un dirty-state réellement efficace pour le registre central.
* [x] Vérifier la réparation du bridge de sauvegarde complet.
* [x] Population / MSC : rétablir les règles d'îlots ciblées.
* [x] Préserver les MSC underwater enrichies.
* [x] Formaliser la règle : fichier complet HEAD uniquement, jamais extrait partiel.

## P0 — Intégration missions P01 à P012

**Prochain chantier principal.**

Objectif : utiliser P01→P012 comme banc de validation complet du moteur missionnel avant industrialisation.

* [ ] Repartir strictement du HEAD courant.
* [ ] Auditer les définitions canoniques P01→P012 avant modification moteur.
* [ ] Affecter chaque mission à un patron existant ou à une famille générique nécessaire.
* [ ] Ne créer aucun code spécifique à une mission si un paramètre générique suffit.
* [ ] Propager `targetBinding=instance` jusqu'à ActionBridge lorsque requis.
* [ ] Ajouter `distinctBy` uniquement pour les missions qui le nécessitent, sous forme générique.
* [ ] Supporter agrégation multi-map / multi-biome / multi-instance si le lot l'exige.
* [ ] Généraliser `microScene.spawn` si nécessaire.
* [ ] Ajouter présence/proximité/durée/délai si nécessaire.
* [ ] Ajouter cycle excursion → changement de map → retour si nécessaire.
* [ ] Valider sauvegarde/reprise à chaque étape.
* [ ] Vérifier fan-out multi-missions sans révélation multiple.
* [ ] Vérifier priorité commande joueur / autonomie.
* [ ] Auditer le lot complet avant passage aux missions suivantes.

## P1 — Patrons missionnels mutualisés

* [x] Conserver les trois familles déjà validées comme socle :
  * découvrir / comprendre ;
  * accumuler / atteindre un seuil ;
  * préparer → produire / débloquer.
* [ ] Définir seulement les familles supplémentaires réellement nécessaires après P01→P012.
* [ ] Viser environ 8 familles génériques au total plutôt qu'un patron par mission.
* [ ] Utiliser des interrupteurs communs :
  * `targetBinding = instance|definition`
  * `distinctMode = indifferent|unique`
  * `scope = local|map|global`
  * `sameTarget`
  * `count/threshold`
  * `duration/proximity`
  * `direction`
  * rôle MSC
  * délai
  * effets

## P1 — CUO / factions / réputation

* [ ] Attribuer `speciesId` aux créatures/PNJ pertinents.
* [ ] Attribuer `factionId` aux créatures/PNJ pertinents.
* [ ] Porter `cultureId` au niveau CUO ou MSC/instance selon le contexte.
* [ ] Ajouter réputation simple : agressif / neutre / friendly / friendly++.
* [ ] Raccorder ces identités aux ObjectEvents.
* [ ] Réutiliser les MSC comportementales existantes.

## P2 — Survie / ration

* [ ] Retrouver et auditer `survival.rationRecipe`.
* [ ] Identifier sa source de vérité.
* [ ] Vérifier ingrédients, consommation, inventaire et effet.
* [ ] Raccorder la mission/fiche de recette au patron générique approprié.
* [ ] Ne pas créer une recette parallèle si la définition existante suffit.

## P3 — Industrialisation des 182 missions

* [ ] Affecter chaque mission à un patron.
* [ ] Renseigner ses paramètres sans réécrire le sens documentaire.
* [ ] Conserver les associations mission↔MSC déjà décidées.
* [ ] Réutiliser compositions/alias existants.
* [ ] Ne créer une MSC que si aucun contenu existant ne couvre réellement le besoin.
* [ ] Intégrer par lots homogènes.
* [ ] Auditer chaque lot avant le suivant.

## P4 — MAP_Test / CUO Lab / non-régression

* [ ] Continuer la qualification sauvegarde/relecture.
* [ ] Vérifier preview vs moteur production.
* [ ] Maintenir le contrat MSC exact.
* [ ] Garder les axes principaux dégagés.
* [ ] Réparer les tests historiques encore pertinents.
* [ ] Ne pas réintroduire de modules hotfix versionnés.

## P5 — Musique adaptative

* [x] Moteur adaptatif raccordé au jeu.
* [x] Volumes musique / sons séparés.
* [x] Développements longs et persistance de thème renforcés.
* [x] Choix modulé par activité/BAC sans changement à chaque action.
* [ ] Finaliser l'écoute des segments encore perfectibles.
* [ ] Vérifier absence totale de silence et impact nul sur changement de map.
* [ ] Geler après validation d'écoute.

## Discipline de livraison

* [x] ZIP contenant uniquement les fichiers réellement modifiés.
* [x] Aucun fichier suffixé/versionné destiné au dépôt.
* [x] Aucun bridge parallèle pour un correctif local.
* [x] Toujours partir du fichier complet courant.
* [x] Vérifier diff exact avant livraison.
* [ ] Continuer à appliquer strictement ces règles sur P01→P012.

## Hors priorité immédiate

* Nouvelle vague massive de missions avant validation P01→P012.
* Duplication de missions par espèce avant validation réputation.
* Suite ARCH-40 miroir avant conception narrative dédiée.
* APK Android avant base PC consolidée.
