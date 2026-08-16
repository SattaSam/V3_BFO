# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **16 août 2026**

Cette page est la **seule TODO active**.

## Base de reprise
* [x] Base GitHub courante : `d1796bf312f5e86da65317087b6c58db803bcd3c`.
* [x] Audit Bible documentaire 182 missions.
* [x] Audit CUO / MSC.
* [x] Audit BibleRuntime / MissionManager / ActionBridge.
* [x] Recoupement des solutions MSC historiques.
* [x] Rétablissement des règles d'autonomie BAC `off / movement-only / full`.
* [x] Intégration technique T01 à T08.
* [ ] Validation en jeu T01 à T08.

## Avancement global
**≈ 78 %**

## Priorité immédiate — TESTS P01 À P08
* [ ] P01 — T01 : vérifier activation, observation de la capsule réelle et déblocage suivant.
* [ ] P02 — T02 : vérifier collecte plante / bois / minerais et progression exacte.
* [ ] P03 — T03 : vérifier collecte bois, consommation, spawn du Camp et placement canonique.
* [ ] P04 — T04 : vérifier qu'une **nouvelle collecte de 1 bois pendant T04** valide T04 et rend T05 disponible ; le compteur Refuge doit continuer séparément vers 100.
* [ ] P05 — T05 : vérifier validation à 60 % d'exploration de `crystal`.
* [ ] P06 — T06 : vérifier 3 objets distincts, dont stèle + arche, rapport Journal et guidage vers le Journal.
* [ ] P07 — T07 : vérifier guidage Planète, suggestion direction, semi-autonomie, nouvelle map et cible de curiosité / MSC de secours.
* [ ] P08 — T08 : vérifier guidage « retour au camp », route connue autonome et validation au Camp.
* [ ] Vérifier sauvegarde / F5 / reprise à chaque étape.
* [ ] Vérifier absence d'auto-validation par historique antérieur.
* [ ] Vérifier non-régression BAC / navigation / rations / musique / chargement map.

## P0 — Patrons missionnels + raccords moteur
* [x] Socle de patrons mutualisés en place.
* [x] Ciblage exact d'instance disponible.
* [x] `distinctBy` utilisé pour les objectifs distincts.
* [x] Exploration par seuil de surface.
* [x] Cycle excursion / déplacement / retour.
* [x] Support MSC missionnel existant pour les besoins du tutoriel.
* [ ] Généraliser les effets encore absents : branches, réputation, faits.
* [ ] Ajouter durée/proximité/délai là où les missions futures l'exigent.
* [ ] Auditer patron par patron avant industrialisation massive.

## P1 — CUO / factions / réputation
* [ ] Attribuer `speciesId` aux créatures/PNJ pertinents.
* [ ] Attribuer `factionId`.
* [ ] Porter `cultureId` au niveau CUO ou MSC/instance.
* [ ] Ajouter réputation agressif / neutre / friendly / friendly++.
* [ ] Raccorder ces identités aux ObjectEvents.

## P2 — Survie / ration
* [x] Rations reconnectées au moteur.
* [x] BAC/rations préservés dans le correctif d'autonomie.
* [ ] Revalider en session longue l'absence de rupture.
* [ ] Vérifier équilibrage collecte / craft auto.

## P3 — Tutoriel
* [x] T01 à T08 intégrés techniquement.
* [ ] **Tests P01 à P08 à effectuer.**
* [ ] Corriger uniquement les défauts réellement reproduits.
* [ ] Récupérer les détails canoniques T09 à T12.
* [ ] Intégrer T09 à T12 après validation T01 à T08.
* [ ] Utiliser le tutoriel comme banc d'essai avant industrialisation des 182 missions.

## P4 — GAME-shelter
* [x] Sous-compteur bois utilisé comme support pédagogique T04.
* [ ] Intégrer le projet Refuge complet :
  * 100 plantes fibreuses ;
  * 100 observations/analyses de plantes ;
  * 100 bois ;
  * transformation du Camp en Refuge.
* [ ] Définir le raccord complet sans modifier la logique validée de T04.

## P5 — Industrialisation des 182 missions
* [ ] Affecter chaque mission à un patron.
* [ ] Renseigner les paramètres sans réécrire le sens documentaire.
* [ ] Conserver les associations mission↔MSC.
* [ ] Intégrer par lots homogènes.
* [ ] Auditer chaque lot avant le suivant.

## P6 — MAP_Test / CUO Lab / non-régression
* [ ] Continuer qualification sauvegarde/relecture.
* [ ] Vérifier preview vs moteur production.
* [ ] Maintenir le contrat MSC exact.
* [ ] Réparer uniquement les tests historiques encore pertinents.
* [ ] Ne pas réintroduire de modules hotfix versionnés.

## P7 — Musique adaptative
* [x] Moteur adaptatif raccordé.
* [x] Volumes musique / sons séparés.
* [x] Développements longs et persistance de thème renforcés.
* [x] Choix modulé par activité/BAC.
* [ ] Finaliser l'écoute des segments perfectibles.
* [ ] Vérifier absence totale de silence et impact nul sur changements de map.
* [ ] Geler après validation.

## P8 — Finition / packaging
* [ ] Performance et longues sessions.
* [ ] Nettoyage final des régressions.
* [ ] UI/UX de finition.
* [ ] Packaging PC.
* [ ] Reprise Android/mobile après consolidation PC.
