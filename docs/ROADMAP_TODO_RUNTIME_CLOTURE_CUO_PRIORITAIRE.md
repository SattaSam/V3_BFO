# BlueFox Odyssey — Roadmap et TODO

Mise à jour : **14 août 2026**

Cette page est la **seule TODO active**.

## Étape 5 — correctifs supplémentaires

État : **en cours, base cumulative `a0ca8dc`**.

- [x] Spores immobiles et comportement rotatif des créatures supprimé.
- [x] Coutures et sous-plateaux opaques ; brouillards améliorés.
- [x] Catalogues et rendu MSC cohérents entre CUO Lab, MAP_Test et le jeu.
- [x] Dosage fongique allégé : moins de champignons-lanternes, davantage de spores et de champignons géants.
- [x] Placement rouge/bleu et dégagement des axes principaux sur les maps de 4 et 6 plateaux.
- [x] Persistance caméra et position de la carte Planète ; premier centrage sur BlueFox.
- [x] Volet droit du menu Planète ancré en haut et repères BlueFox/base/balise/drone préparés.
- [x] Trois MSC coralliennes raccordées au moteur et injectées par défaut dans les mondes sous-marins bioluminescents à la place des arches droites isolées.
- [x] Rochers blanchis limités explicitement aux contextes glace, banquise, neige et toundra.
- [ ] Valider visuellement en jeu la répartition des trois MSC coralliennes et l'absence de roche blanche sous-marine.
- [x] Choix de la ressource réellement la plus proche.
- [ ] Collecte après observation.
- [ ] Priorité donnée à la commande manuelle.
- [ ] Fatigue, récupération et annonces de repos.
- [ ] MAP_Test : finir la qualification sauvegarde/relecture et dosage.
- [ ] Menu Planète : validation finale du scroll limité sur les formats d'écran ciblés.

### Musique adaptative — finalisation en cours

- [x] Raccorder le catalogue, le lecteur double deck, le pont gameplay/BAC et la commande de volume.
- [x] Remplacer les changements à chaque action par un seuil de trois actions similaires et une dominance d'activité sur cinq minutes.
- [x] Ajouter des séquences longues, développements, ponts, retours et anti-répétition.
- [x] Marquer l'entrée d'une nouvelle map par une variation temporaire, sans imposer toujours la même introduction.
- [ ] Finaliser E2 : prolongation d'environ deux secondes et niveau légèrement renforcé.
- [ ] Finaliser F : conserver la dernière note et repousser le fondu.
- [ ] Finaliser Relic E : isoler proprement les trois notes centrales par de petits fondus.
- [x] Conserver Main A ; abandonner Quiet B comme variante retenue.
- [ ] Normaliser le niveau des micro-sons validés et définir leur attribution aux micro-événements BAC.
- [ ] Garantir des développements longs en autonomie et supprimer les boucles trop facilement reconnaissables.
- [ ] Vérifier qu'aucune transition ou entrée de map ne provoque de silence ni de ralentissement du chargement 3D.
- [ ] Geler les minutages et règles seulement après validation d'écoute en jeu.

## JALON GELÉ — Bible + Runtime V0.1

Le chantier de preuve de concept **Bible + Runtime** est clôturé.

Quatre missions représentatives ont été intégrées, testées et validées en jeu avec leurs patrons correspondants :

- [x] `BIBLE-V01-CAMP` — collecte → consommation de ressources → effet persistant / établissement du camp.
- [x] `BIBLE-V01-DISCOVERY` — observation → analyse → synchronisation progression / UI.
- [x] `BIBLE-V01-ARCHAEOLOGY` — observation → inspection → analyse avec cible missionnelle cohérente.
- [x] `BIBLE-V01-RECONNAISSANCE` — exploration multi-map → apparition d’une relique → observation → retour au camp.

Ces quatre validations démontrent les briques nécessaires à l’industrialisation du catalogue de missions : déclenchement déclaratif, objectifs compilés depuis des patrons, progression multi-étapes, interaction avec le CUO, effets persistants, génération de contenu de map et retour vers un abri.

**Décision de référence :** le Runtime missionnel V0.1 est gelé comme base fonctionnelle. Les prochains travaux missionnels doivent partir des modules canoniques actuels et ne doivent pas recréer de branche parallèle V12/V15/V19/V20.

Les anciens correctifs V12/V15/V19/V20 sont considérés comme absorbés par la base cumulative actuelle. Une vérification de non-régression peut continuer au fil des développements, mais elle ne constitue plus un chantier autonome.

### Persistance / rechargement

La « matrice de rechargement » évoquée auparavant ne désigne **ni un patron de mission ni le format d’une fiche Bible**. Il s’agissait uniquement d’une grille de tests de persistance : mission active, progression partielle, mission terminée, changement de map, micro-scène persistante, fermeture puis rechargement.

Aucun document supplémentaire n’est requis pour cela. Les contrôles de persistance restent intégrés aux tests de non-régression du moteur et aux validations de MAP_Test.

## P0 — Harmonisation CUO ↔ Bible ↔ moteur

**Prochain chantier principal.**

Objectif : faire du CUO la source d’objets fiable consommable par les missions, les maps, les micro-scènes, l’inventaire et les interactions.

- [ ] Auditer exhaustivement les objets déclarés dans le CUO par rapport à `ObjectLibrary`.
- [ ] Identifier les doublons d’ID, de type, de famille ou de définition fonctionnelle.
- [ ] Comparer toutes les références d’objets de la Bible de missions avec le CUO.
- [ ] Repérer les objectifs de mission qui demandent un objet absent, ambigu ou insuffisamment défini dans le CUO.
- [ ] Distinguer les objets réellement manquants des simples différences de nommage ou d’identifiant.
- [ ] Créer les nouveaux objets nécessaires lorsque les objectifs missionnels ne peuvent pas être couverts par un objet existant.
- [ ] Vérifier pour chaque objet : famille, sous-catégorie, taille, interactions autorisées, collectabilité, analyse/inspection, ressource éventuelle, respawn et liens missionnels.
- [ ] Raccorder chaque objet validé aux constructeurs 3D et à `ObjectSpawner` sans créer de doublon avec les objets existants.
- [ ] Contrôler les micro-scènes qui référencent des objets CUO et corriger les références obsolètes.
- [ ] Contrôler visuellement et fonctionnellement chaque famille dans CUO Lab / MAP_Test.
- [ ] Intégrer les objets manquants par lots contrôlés avant toute nouvelle vague massive de missions.

### Livrable attendu du chantier CUO

- catalogue CUO sans doublons fonctionnels ;
- correspondance explicite **Bible mission → objectif → objet CUO → ObjectLibrary → constructeur 3D / ObjectSpawner** ;
- liste des objets manquants et statut de création ;
- validation visuelle et fonctionnelle des familles d’objets ;
- liste des missions dont tous les objets requis sont désormais exécutables.

## P1 — MAP_Test comme banc officiel du moteur

Le raccord technique au pipeline réel est désormais présent : MAP_Test utilise le générateur de production en mode preview et les mécanismes d’intégrité/prescription de map.

La qualification finale se fait en conditions réelles de jeu :

- [ ] Valider des générations de 1, 2, 3, 4 et 6 plateaux.
- [ ] Vérifier les biomes et leurs textures associées.
- [ ] Vérifier les micro-scènes normales et persistantes.
- [ ] Tester la sauvegarde puis la relecture des maps CUSTOM.
- [ ] Modifier une map CUSTOM, sauvegarder, fermer/recharger et contrôler la restitution.
- [ ] Vérifier qu’une preview MAP_Test ne pollue pas la liste des maps générées du joueur.
- [ ] Contrôler la cohérence entre preview MAP_Test et génération réelle du moteur.
- [ ] Utiliser MAP_Test comme banc visuel du chantier d’harmonisation CUO.

## P2 — Banc de validation CUO / CUO Lab

- [x] Créer un point d’entrée de test séparé du jeu principal.
- [x] Construire une Map de test dédiée au catalogue et au placement d’objets.
- [x] Charger le catalogue pour inspection et placement manuel.
- [x] Ajouter une caméra libre pour le travail de laboratoire.
- [x] Permettre la sélection et le repositionnement d’instances de test.
- [ ] Réparer et fiabiliser le déplacement des objets dans CUO Lab.
- [ ] Ajouter une prévisualisation claire de l’objet sélectionné depuis la liste.
- [ ] Ajouter annulation `Ctrl+Z` et suppression par clic droit.
- [ ] Ajouter sélection multiple, copie/collage et déplacement groupé.
- [ ] Garantir que la liste du Lab est alimentée par le même catalogue CUO / ObjectLibrary que le moteur.
- [ ] Afficher et contrôler hitbox, collisions, rayons d’interaction et points d’approche.
- [ ] Tester chaque objet avant activation dans les biomes du jeu.

Référence détaillée historique : `docs/CUO_BANC_VALIDATION_3D.md`.

## P3 — Non-régression du socle 3D

Ces contrôles accompagnent les chantiers actifs mais ne bloquent plus la clôture du Runtime missionnel.

### Chantier identifié — remise en conformité du banc de tests

État de référence au commit `b15c7f5` : **29 tests, 20 réussis, 9 en échec**. Les mêmes neuf échecs sont déjà présents sur la base antérieure `185a400` (`Music+`) ; ils ne sont pas une régression du contrat canonique MSC, mais ne doivent pas rester durablement hors surveillance.

- [ ] Réparer les quatre tests d'interactions avec la flore : observation puis analyse d'une flore connue, analyse autonome, première observation d'une plante fibreuse et arbitrage `observe` plutôt que `collect` pour un objectif d'analyse.
- [ ] Réparer les trois tests Bible/Runtime : filtrage `type`/`kind`, compilation des trois fiches cumulatives et chaîne collecte → activation → progression → narration.
- [ ] Vérifier si le catalogue Bible vide dans l'environnement de test provient d'un chargement incomplet du banc ou d'une attente devenue obsolète, puis corriger la cause sans modifier le comportement validé en jeu.
- [ ] Réviser les deux tests historiques de MAP_Test : préréglage `evolution-preset` et ancienne attente texture/capsule.
- [ ] Supprimer ou réécrire uniquement les attentes réellement obsolètes ; ne pas masquer un défaut moteur par un assouplissement des assertions.
- [ ] Ajouter au banc un test permanent du contrat MSC : 37 scènes, 1 306 objets, transformations locales exactes, échelles CUO préservées et instances ObjectSpawner à ancrages indépendants.
- [ ] Conserver `MSC-CUSTOM-CARRIEREDECRISTAUX1`, `MSC-CUSTOM-CAMP-BASE` et `MSC-CUSTOM-CAMP-BASE-REINFORCED` comme témoins de non-régression des rotations, inclinaisons et hauteurs.
- [ ] Critère de clôture : suite entièrement verte ou chaque exclusion restante explicitement documentée, justifiée et isolée du moteur de production.

- [ ] Vérifier l’absence d’erreur JavaScript au chargement après chaque lot CUO.
- [ ] Recharger la page et vérifier les persistances importantes.
- [ ] Vérifier que commandes joueur, caméra et menus restent fonctionnels pendant une action de mission.
- [ ] Contrôler objets, ressources, collisions et interactables.
- [ ] Tester régulièrement des transitions N/S/E/O et la cohérence carte Planète.
- [ ] Vérifier déplacement, zoom et « Centrer sur BlueFox ».
- [ ] Vérifier le cyclorama sur 16:9, tablette et smartphone.
- [ ] Mesurer les blocages près des portails, ressources et arches.

## P4 — Industrialisation des missions — après harmonisation CUO

- [x] Fondation technique des missions hiérarchiques persistantes — M0.
- [x] Raccorder le catalogue de missions au registre central.
- [x] Ajouter cycle de vie, priorité, reprise et progression persistante.
- [x] Valider quatre patrons représentatifs Bible + Runtime.
- [x] Restaurer la Bible documentaire complète à partir du CUM et récupérer les missions manquantes/orphelines.
- [ ] Ne lancer la nouvelle vague d’intégration qu’après audit CUO ↔ Bible.
- [ ] Sélectionner des lots de missions dont tous les objets requis existent et sont validés.
- [ ] Compiler les fiches Bible vers les patrons Runtime sans logique missionnelle codée en dur.
- [ ] Ajouter progressivement les missions composées et sous-missions dynamiques.
- [ ] Étendre ActionBridge uniquement lorsque de nouvelles familles d’actions réelles le nécessitent.

## P5 — Gameplay et narration

- [ ] Définir les conditions futures d’activation de la mission énergie douce.
- [ ] Relier les projets prioritaires aux besoins réels.
- [ ] Alimentation et repos avec effets mesurés.
- [ ] Recherche et connaissances persistantes.
- [ ] Créatures et protocole de contact.
- [ ] Conséquences graduelles des choix du joueur.
- [ ] Enrichir les connaissances seulement après découverte.
- [ ] Produire des synthèses liées aux observations réelles.
- [ ] Développer émotions, événements et souvenirs.
- [x] Implémenter la carte 2D déplaçable dans un faux globe.
- [ ] Valider et ajuster visuellement la carte Planète en conditions réelles.

## Hors priorité immédiate

- Nouvelle vague massive de missions avant harmonisation CUO.
- APK Android à reconstruire depuis une base PC validée, jamais depuis une ancienne APK.
- Refonte lourde du terrain ou shaders complexes.
- Modification de `map-registry.js` pour ajouter des objets.

## Jalon suivant

> **MAP_Test qualifié comme banc officiel du moteur ; CUO audité et harmonisé avec la Bible ; objets manquants identifiés puis créés par lots contrôlés ; chaque objectif de mission important raccordé à un objet moteur réellement disponible.**
