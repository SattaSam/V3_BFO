# BLUEFOX ODYSSEY — DEV HISTORIQUE

## Session du 16 août 2026 — Intégration tutoriel T01 à T08

### Base
- Commit de référence : `d1796bf312f5e86da65317087b6c58db803bcd3c` — `fix regression 4`.

### Contexte
Le lot tutoriel T01 à T08 a été reconnecté à la chaîne missionnelle existante en réutilisant les éléments déjà présents dans le dépôt : capsule du Site du crash, Camp, placements, événements objets, exploration, Journal, menu Planète, navigation connue et support MSC.

### Décisions fonctionnelles
- T01 : capsule réelle du Site du crash.
- T02 : collecte de trois familles : plante, bois, minerais.
- T03 : premier Camp, avec MSC et placement canoniques existants.
- T04 : démonstration de progression parallèle. Le projet Refuge reste un projet séparé ; une nouvelle collecte de 1 bois pendant T04 valide T04 et rend T05 disponible. Le compteur bois Refuge poursuit indépendamment son objectif de 100.
- T05 : 60 % de la map `crystal`, qui comporte un seul plateau.
- T06 : 3 objets distincts à étudier, dont stèle et arche ; synthèse dans le Journal et guidage vers le Journal.
- T07 : guidage vers le menu Planète, suggestion d'une direction, déplacement en semi-autonomie et cible de curiosité sur la nouvelle map. Une MSC de secours peut garantir la cible si nécessaire.
- T08 : guidage vers la commande de retour au camp et retour autonome par route connue.

### Autonomie / BAC
- Les modes canoniques restent `off`, `movement-only`, `full`.
- Les protections BAC et watchdog ont été réalignées avec ces modes.
- Le comportement `movement-only` doit limiter l'autonomie aux déplacements/exploration.
- Les mécanismes de rations et les optimisations récentes de navigation doivent être préservés.

### Statut
- Intégration technique : **faite**.
- Validation en jeu : **non faite**.
- **Tests P01 à P08 à effectuer avant validation du jalon.**

### Validation attendue
- chaîne complète T01 → T08 ;
- absence d'auto-validation par historique antérieur ;
- sauvegarde/reprise à chaque étape ;
- T04 valide uniquement sur une nouvelle collecte de bois pendant T04 ;
- T06 impose bien 3 objets distincts ;
- T07/T08 fonctionnent sur topologie réelle ;
- UI tutorielle visible et compréhensible ;
- aucune régression BAC/navigation/rations/musique/chargement.

### Avancement projet
Estimation de pilotage après cette intégration : **environ 78 %**.

Le travail restant est principalement de validation et d'industrialisation : tests T01-T08, T09-T12, GAME-shelter complet, factions/réputation, industrialisation des 182 missions, performance/finitions et packaging/mobile.

---

## Session du 15 août 2026 — Audit Bible / CUO / moteur et stratégie de patrons

### Base
- V5 Stable : `d59376559e71032b478fb01a84fdb9bdd6611736`.

### Audit documentaire
- Bible principale : 182 missions normalisées.
- Principe confirmé : la narration reste souveraine ; la technique traduit sans réécrire.
- Les MSC associées doivent distinguer trois rôles : triggerContext, objectiveSubject, scenarioSupport.

### Décision architecture missions
- Limiter le nombre de patrons.
- Mutualiser les variantes avec des interrupteurs.
- Développer chaque patron en parallèle du raccord moteur associé.
- Cible de travail : environ 8 familles de patrons.
- Le tutoriel sert de banc de validation avant industrialisation des 182 missions.
