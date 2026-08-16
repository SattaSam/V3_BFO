FIRST FILE TO READ — Any AI or developer working on this repository MUST read this file before inspecting any other project file.

RÈGLE ABSOLUE — DOCUMENTS DE RÉFÉRENCE
Ne jamais deviner les documents de référence.
Ne jamais utiliser un DOCX ou une TODO historique comme référentiel par défaut.
Avant toute mise à jour documentaire, lire docs/README.txt.
Seuls les fichiers listés dans docs/README.txt comme “documents de référence officiels maintenus” peuvent être modifiés dans ce cadre.
Si la liste de docs/README.txt et ce fichier divergent, docs/README.txt fait foi.
Si l'utilisateur dit “mets à jour les documents de référence”, ne chercher aucun autre document : lire docs/README.txt, utiliser exactement sa liste, et rien d'autre.

RÈGLE ABSOLUE — BASE DE TRAVAIL
Toujours repartir du dépôt GitHub courant / commit explicitement indiqué.
Ne jamais repartir d’un ZIP local ancien ou d’un fichier issu d’une conversation précédente.

RÈGLE ABSOLUE — DÉMARRAGE DE CHAQUE NOUVEAU CHANTIER

1. Le SHA du dernier commit fourni par l'utilisateur est la source de vérité et le point de départ obligatoire.
2. Avant toute modification, auditer ce commit et reconstituer la dernière base stable à partir de CE commit.
3. Interdiction de remplacer un fichier du commit par une copie locale, un ancien ZIP ou un fichier d'une conversation précédente.
4. Un fichier local ne peut servir de copie technique que si son Git blob SHA est vérifié identique au blob du commit de départ ; sinon il est rejeté.
5. Avant livraison d'un cumulatif, comparer chaque fichier modifié à sa version du commit de départ et vérifier que les fonctions déjà validées présentes dans ce même fichier n'ont pas régressé.
6. Si la version exacte d'un fichier du commit ne peut pas être obtenue ou vérifiée, ne pas reconstruire approximativement : demander le fichier ou refuser la livraison.
7. Un correctif cumulatif doit cumuler les travaux validés depuis le dernier commit de référence ; il ne doit jamais réinjecter une version antérieure d'un fichier partagé.
pas de fichiers versionnés dans les patchs committables ;
ZIP = uniquement fichiers modifiés ;
pas de README parasite ;
pas de .bat/.ps1/.patch sauf demande explicite ;
ne jamais réintroduire une tentative rejetée ;
vérifier la TODO active avant de déclarer un chantier terminé ;
lire MASTER.md, ARCHITECTURE\_TECHNIQUE.md, la TODO active et les autres références officielles avant toute passe structurante ;
BlueFox Odyssey - Référence projet
Méthode de travail
* Avant toute correction : diagnostic approfondi.
* Audit complet du fichier concerné.
* Audit de son interaction avec le reste du projet.
* Exécution de tests dans l'environnement disponible.
* Demande des fichiers manquants si nécessaire.
* Livraison uniquement après validation technique.
Engagement qualité
* Ne plus annoncer un correctif comme terminé avant validation.
* Signaler explicitement les hypothèses restantes.
* Privilégier un refus de livraison à une livraison non vérifiée.
* CUO Lab / MAP Test / jeu : même rendu MSC ;
map-registry.js protégé ;

DOCUMENT SOURCE
Cahier\_des\_Charges\_BlueFox\_Odyssey updated
BlueFox\_BIBLE\_MAIN\_MISSIONS\_NORMALISEES\_V1
BlueFox\_CUO\_v2\_Production\_complet
CUM  \& CUM V2
CUO\_Lab\_BANC\_VALIDATION\_3D
CONVENTIONS\_MAPS\_IMAGES

IMI — CONTRAT IA D'INTÉGRATION DES MISSIONS

