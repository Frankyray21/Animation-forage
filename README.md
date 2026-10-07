# Clam sous tension

Animation 3D de formation sur la **tête de forage Boyles UM-012-100UG** et son **mandrin** (UM-070-142AA / UM-012-142AA, Usinage Marcotte). Elle montre l'énergie emmagasinée dans les 18 ressorts du mandrin, et ce qui arrive quand la séquence de démontage de la procédure **PRO-OP-DD-005** n'est pas respectée.

Comme lors de l'accident, la tête est **à l'horizontale** : axe de broche à 1,25 m du plancher, face du mandrin vers le travailleur debout devant elle, boîte et moteur à côté du mandrin, chariot et mât dessous, le long de l'axe. Les vues éclatées ramènent la tête à la verticale, comme sur les planches.

**Accueil** (`index.html`) : page d'ouverture d'une rencontre sécurité, projetable — « Ce qui s'est passé » (frise de 4 images tirées de la 3D, scénario de l'accident) et « Le danger caché » (ressorts comprimés même cadenassé), avec **Commencer la présentation** (ouvre `animation.html#presenter`, mode Présentation) et **Explorer la 3D** (`animation.html`). Un seul thème, sombre, rouge et jaune d'avertissement ; images dans `img/` et `renders/`.

**Application installable et hors ligne** : bouton **Installer l'application** (accueil, en haut à droite ; animation, à côté de « ← Accueil ») sur Android, Chrome et Edge ; sur iPhone et iPad, le bouton rappelle « Partager → Sur l'écran d'accueil ». Le service worker `sw.js` (enregistré par `pwa.js`, manifeste `manifest.webmanifest`, icônes dans `icons/`) garde une copie locale des pages, des images, de three.js (version figée sur le CDN), des polices et de la vidéo : après une première visite en ligne, le site fonctionne sans réseau. Pages : réseau d'abord, copie locale hors ligne ; changer `VERSION` dans `sw.js` pour forcer le renouvellement des copies. Rien n'est enregistré dans l'aperçu intégré (artefact) ni pendant la capture vidéo.

**Animation 3D** (`animation.html`) : ouvrir dans un navigateur récent ; lien « ← Accueil » en tête. Une connexion Internet est requise : Three.js et les polices sont chargés depuis un CDN.

## Modèle 3D

Sources : manuel de la foreuse STM-1500, pages 2.1 à 2.7 (planches de la tête de forage UM-012-100UG, puis liste de pièces, coupe A-A et vue éclatée du mandrin). Toutes les pièces des listes sont modélisées avec leurs quantités. La tête est rouge, comme sur les planches ; les pièces usinées sont en acier, les ressorts en vert.

Le bouton **Éclaté : tête** écarte les pièces de la tête autour de la boîte ; **Éclaté : mandrin** dispose les pièces du mandrin le long de son axe, comme sur le dessin. Dans les vues éclatées, les étiquettes donnent le numéro de la pièce ; son nom s'affiche dans une info-bulle quand on passe le curseur sur la pièce ou sur son étiquette (sur téléphone : quand on touche la pièce). La **nomenclature** de la page permet de cliquer une pièce pour l'identifier ; on peut aussi la cliquer dans la vue 3D.

### Tête de forage UM-012-100UG (planches 2.1 à 2.4)

| Groupe | Pièces |
| --- | --- |
| Boîte et couvercle | Boîte UM-012-104A (665 × 368 mm, 209,55 mm le long de la broche), couvercle UM-012-113A + B375-1000 (×16) + W375 (×16), UM-012-131 (×2), UM-102-132 (×2), couvercle d'évent UM-1214-121P (détail A : bouchon étagé à deux gorges, bride à méplat) + joint UM-012-167 + B312-1000 (×6 : 1 sur le couvercle d'évent, 4 sur le refroidisseur, 1 sur la tête de filtre) + W312 (×6) |
| Broche | Broche UM-012-101, UM-012-122 (×2), roulements UM-012-128 et UM-012-129, UM-012-121, UM-012-124 (×2), UM-012-120, SHC500-4000 (×10, fixation du mandrin), UM-012-107, UM-012-106, UM-012-126 (×2), UM-012-114, B500-1750 (×10), W500 (×20 ; la liste du mandrin en ajoute 8 sous les B500-1500), nez de broche UM-012-119 / 117 / 118 / 115 / 108 / 110 / 116, SS75-1250 (×9), SHCS312-1500 (×6) |
| Entraînement | Pignons UM-012-102 (28 dents) et UM-012-103 (15 dents), UM-012-169, UM-012-127 (×2), chaîne triple UM-012-130, UM-012-125, UM-012-123, transmission UM-012-143 + B437-1500 (×13) + W437 (×12), UM-012-170, UM-012-192, moteur hydraulique AA6VM + B750-2000 (×4) + W750 (×8), coudes UM-063-290T (×2), UM-063-289T (×4), UM-012-208 (×2) |
| Lubrification | UM-012-111, pompe UM-012-139 + B250-750 (×6) + W250 (×6), tête de filtre UM-012-177 + cartouche UM-012-178, refroidisseur d'huile (visible sur les planches, hors liste), vanne 3 voies UM-10B-TR#6, régulateur NDV-10-N, reniflard A-1199-R-4048, 13 boyaux UM-012-H08C à H25C-UG et leurs raccords |
| Montage | Axe de pivot UM-012-105A, UM-012-171 (×4), HP1000 |

Les proportions transmission / moteur (carter de transmission de 13 po, corps du moteur raccourci) et la disposition générale (couvercle UM sur le dessus en pose horizontale, transmission et moteur du côté du mandrin, colonne blanche verticale au bout d'entraînement, régulateur et boyaux sur le couvercle) ont été vérifiées sur un rendu 3D de la tête d'Usinage Marcotte. La broche est à 152 mm du centre de la boîte ; l'axe d'entraînement (transmission, pignon moteur, pompe) est à 13,6 po de la broche, décalé de 1,8 po vers le couvercle (vue du nez de la planche 2.1). Le tracé des boyaux (gris tressé, comme sur les planches) et l'emplacement des raccords sont approximatifs (longueurs et extrémités de la liste) ; le chariot et le mât derrière la tête sont schématiques. La coupe ne tranche que le mandrin.

### Mandrin (pages 2.5 à 2.7)

| Groupe | Pièces |
| --- | --- |
| Arrière | Clés 3506881 (×3), ressort de verrouillage 3506879, anneau de retenue 5054078, bague d'appui 3506882, roulement 5000199, goupilles 5222624 (×4), piston 3506908 + 5035015 + 5035017, manchon d'actionnement 3506928, adaptateur 3506910 (tête UM-012) + B500-1500 (×8) + W500 (×8), cylindre 3506909 + 5035016 + 5035018, joint en V 5041022, B500-4500 (×10) + NC500 (×10), raccord 2501-8-6, graisseur ZNPT250 |
| Boîtier | 3506870 |
| Avant | Entretoises inférieures 3506880 (×9), joints d'huile 5040192 (×9), ressorts 5200517 (×18), cône / bol 2920390, entretoises supérieures 3506878 (×3), B500-6500 (×6), B500-8000 (×3), porte-capuchon 3506906 + B500-2250 (×9), adaptateur de capuchon 3506907 + B750-1500 (×3), mâchoires UM-021-01-01 B |
| Options | Adaptateur UM-070-608A (tête UM-070), anneau WH-500, bagues de guidage B (UM-021-06-02 tige, UM-021-06-22 tubage) |

Les mâchoires reprennent le jeu Boyles 12HH : 8 segments coniques, 3 trous de liaison et leurs goupilles entre les segments, 3 plaquettes de carbure moletées sur la face de serrage.

Seule la **grosseur B** (tige BQ) est représentée : jeu de mâchoires B, bagues de guidage B et manchon de guidage BQ UM-012-108 de la tête. Les pièces des grosseurs N, H et BW des listes ne sont pas modélisées.

Les cotes de référence viennent de la coupe A-A : Ø 12 ⅛ po (308 mm), alésage Ø 3 ⅞ po (98 mm). Les cercles de boulons sont mesurés sur la vue de face. Le dessin n'est pas à l'échelle (N.T.S.) : les autres cotes sont relevées sur la coupe. Certaines pièces internes sont marquées « emplacement approximatif » dans la nomenclature.

Correspondance avec la procédure :

- Étape 4 : couvert des mâchoires = adaptateur de capuchon 3506907, boulons ¾ × 1 ½ (B750-1500), clé 1 1/8. La procédure parle de 6 boulons ; la liste de pièces en compte 3.
- Étape 5 : couvercle = porte-capuchon 3506906, 9 boulons ½ × 2 ¼ (B500-2250), clé ¾. Ce sont aussi les 9 boulons neufs des étapes 12 et 13.
- Étape 6 : 3 boulons ½ × 8 (B500-8000) et leurs bushings (entretoises supérieures 3506878), remis sans bushing. 8 po = 6 ½ po + 1 ½ po d'entretoise.
- Étape 7 : 6 boulons ½ × 6 ½ (B500-6500), 1 tour à la fois, ordre 1 à 6.

Les 9 boulons du cône traversent le voile du boîtier (entretoises inférieures 3506880 et joints 5040192) et se vissent dans le manchon d'actionnement 3506928. Ce sont eux qui retiennent le cône contre les 18 ressorts.

## Foreuse STM-1500

La foreuse complète, sa console UM-051 et son groupe hydraulique FMX-005 (page `foreuse.html`) ont été retirés de ce dépôt, centré sur la reconstitution de l'accident ; ils sont destinés au dépôt dédié aux modèles 3D (dernière version dans l'historique git, commit 18e6ac1). La tête de forage reste ici, **retirée de la foreuse et posée sur un banc de travail**, avec le poste de commande (manettes CLAM / CHUCK, cadenas).

## Clam et chuck

- **Chuck (mandrin)** : sur la tête de forage, tourne avec la broche ; serre la tige pour la faire tourner et la pousser ou la tirer. C'est la pièce modélisée ici (UM-070-142AA, sur la tête UM-012-100UG).
- **Clam (rod clamp, foot clamp)** : fixé à l'avant du mât, près du trou, ne tourne pas ; retient le train de tiges quand le chuck s'ouvre (recul de la tête, ajout ou retrait de tiges) pour qu'il ne glisse pas dans le trou. Non modélisé (vue éclatée UM-079-100AA « rod clamp 12 HH »).
- Les deux sont fermés par ressorts et ouverts par le vérin hydraulique : même danger d'énergie résiduelle, même procédure PRO-OP-DD-005.

## Scénarios

| Scénario | Ce qui est montré |
| --- | --- |
| Procédure respectée | Étapes 1 à 9. L'énergie des ressorts descend graduellement à 0. |
| Sans les boulons longs : cône projeté | Pire cas, pour comparaison : étapes 6 et 7 non respectées. Le dernier boulon porte toute la force, il casse et le cône est projeté. |
| Boulons retirés un par un : cône retenu — **reconstitution de l'accident** (étiquette rouge, scénario affiché par défaut) | Même erreur, mais l'étape 6 a été faite. Le dernier boulon, desserré à l'impact drill, casse : l'outil est projeté au thorax du travailleur ; les 3 boulons remis sans bushing arrêtent le cône après quelques millimètres. |

**Bilan de fin** : à la dernière étape de chaque scénario (étape « Bilan » en B et D ; fin de l'étape 9 en A, une fois le cône posé sur la table), une carte au haut de la vue résume le résultat, avec ✓ / ✗ pour les étapes clés 6 et 7 (sans valeurs de force) :

- A : « Procédure respectée : l'énergie des ressorts a été libérée lentement, le cône est resté retenu. » ✓ étape 6, ✓ étape 7.
- B : « Étapes 6 et 7 non respectées : boulons retirés au complet sous charge → projection du cône. » ✗ étape 6, ✗ étape 7.
- D : « Étape 7 non respectée mais étape 6 respectée : les 3 boulons longs ont retenu le cône. » ✓ étape 6, ✗ étape 7.

Textes dans `SCEN[k].bilan` ; la carte (`#bilanCard`, `updateBilan`) est masquée dans les vues éclatées et remplace l'encadré « procédure ». En plein écran (ordinateur), elle passe à gauche pour laisser la liste des étapes.

## Travailleur (modèle 3D)

Travailleur procédural (affiché tant que `worker.glb` est absent) : casque de mineur avec lampe, **lunettes de sécurité** (monture noire, verres teintés, écrans latéraux), coquilles, combinaison à bandes réfléchissantes, gants et bottes.

Le travailleur est chargé depuis une **copie locale** : `public/models/worker.glb` (modèle CC0 1.0, 0,698 × 1,83 × 0,337 m, axe Y vertical, source : https://cdn.3dassets.dev/assets/36355/v1/model.glb). Il n'est jamais chargé depuis le CDN. Si le fichier est absent, le travailleur procédural articulé (avec ses ÉPI) est affiché.

- Chargement : `GLTFLoader`, matériaux d'origine conservés, ombres projetées et reçues, mise à la hauteur réelle (1,83 m) et pieds au plancher.
- Réglages par défaut dans `WORKER_GLB` (animation.html) : `position`, `rotY` (orientation), `scale`.
- En direct : `__clam.worker.set({ x, y, z, rotYdeg, scale })` et `__clam.worker.get()`.
- Sélection : clic sur le travailleur dans la vue 3D (raycaster). Sélectionné, une poignée apparaît : **T** déplacer, **R** tourner, **E** échelle. Les trajectoires et les zones d'impact suivent sa nouvelle position.
- Animation : recul et chute du corps entier lors d'une projection (le modèle n'est pas animé membre par membre).

Pour ajouter le fichier : `curl -L -o public/models/worker.glb https://cdn.3dassets.dev/assets/36355/v1/model.glb`, puis commit.

## Outil

Le travailleur dévisse les boulons avec une clé à chocs électrique à fil (d'après la photo du chantier) : corps métallique usé, nez conique, douille longue 12 pans, poignée arrière fermée avec gâchette, anneau latéral et cordon. Seule la douille tourne avec le boulon.

La clé n'apparaît plus dans les mains : elle est **accrochée à la ceinture** (étui sur la hanche droite, douille en bas, poignée vers l'extérieur) dès le début. Le travailleur la sort au début de l'étape 4 (la main droite va à la poignée, la porte au mandrin, la main gauche se pose sur le corps de la clé) et la range à la ceinture avant chaque transport de pièces ; à la fin de l'étape 8 il la range pour de bon (le cône de l'étape 9 se tire à deux mains). Le cordon est recalculé à chaque image : de la poignée, une boucle molle jusqu'au plancher, puis à plat jusqu'à une prise devant le banc (il suit le travailleur quand il marche).

## Gestes : pièces portées à la table

Les pièces retirées ne glissent plus seules vers la table : le travailleur les **porte**. Tout reste fonction de l'étape et de sa progression (rejouable, ligne de temps et retour en arrière compris) ; les places sur la table ne changent pas.

- **Couvert des mâchoires (étape 4) et couvercle (étape 5)** : clé rangée, la pièce est tirée à deux mains hors du mandrin, ramenée devant le corps, portée jusqu'à la table (trajet par l'allée, face à la table), posée à plat en se penchant ; ses boulons dévissés restent dans leurs trous pendant le transport, puis la main gauche les range un à un en rangée.
- **Boulons du cône et bushings** : sortis des filets à la clé, tirés à la main gauche et gardés en poignée (tenus en travers devant la ceinture) pendant que la clé passe au boulon suivant ; à la fin, clé rangée, la poignée est portée à deux mains jusqu'à la table et chaque pièce y est posée par la main. Étape 6 : les 3 bushings ; étape 7 : les 6 boulons ½ × 6 ½ (retrait depuis le boulon 6, où se trouve la clé) ; étape 8 : les 3 boulons longs.
- **Cône et mâchoires (étape 9)** : tirés à deux mains, portés au bout de la table et posés face vers le bas.
- **Scénarios B et D** : mêmes gestes à l'étape 6 (boulons longs et bushings portés à la table en B, bushings en D) ; à l'étape 7 non respectée, chaque boulon sorti au complet reste dans la main gauche pendant que la droite tient la clé. Lors de la projection (B), le travailleur lâche tout : la clé est arrachée, les boulons tombent au sol. Le résumé « Étapes 1 à 5 faites » pose les pièces d'un coup, sans transport.
- Code : `S.wd` (clé sortie de l'étui), `S.spot` (place sur un trajet `TRIP`), `carryPose` (pièce à deux mains : tirée, portée, posée), `boltsWithPart` (boulons dans les trous d'une pièce portée), `handPose` (pièce tirée à la main, tenue, posée), `placeWrench` et `updateCord`.

## Mise en scène (caméra auto)

On doit voir les gestes : chaque étape enchaîne plusieurs plans (`shots` : `{ at, cam, cut }`, `at` = fraction de l'étape). Le plan dépend seulement de l'étape et de sa progression : retour en arrière et ligne de temps donnent le même cadrage. Transitions douces ; une seule coupe franche (passage au cadenas). Plans fixes (`CAMS.walk`, `jawsFront`, `plongee`, `tableJC`, `tablePlate`…) et plans qui suivent l'action (`CAMS.x = { fn }`, recalculés à chaque image depuis la position de l'objet visé, rattrapage plus lent) : `lever` (mains sur les manettes), `lockClose` (cadenas), `tool` (par-dessus l'épaule : mains, clé, boulon ; cible tirée vers le centre de la face pour ne pas sauter d'un boulon à l'autre), `boltL` (boulon long de côté), `pull` (pièce tirée à deux mains).

| Étape | Plans |
|---|---|
| 1 Manettes | large : le travailleur va au poste → profil sur les mains qui ferment CLAM et CHUCK → coupe du vérin quand la pression tombe |
| 2 Mâchoires | face avant, gros plan sur les mâchoires |
| 3 Cadenasser | coupe franche sur le poste : la main pose le cadenas et l'étiquette |
| 4 Jaw cover | large (retour au banc) → par-dessus l'épaule : clé sortie de l'étui, J1, J2, J3, rangée → couvert tiré à deux mains → large : porté à la table → bout de la table : posé, boulons rangés → large : retour |
| 5 Cap holder | plongée de face → suivi de la clé (C1 à C9) → couvercle tiré → porté → posé, boulons rangés → face du cône |
| 6 Boulons longs | gros plan de côté (dévissé, sorti, bushing dans la main, remis) → face → bushings posés au bout de la table → face, 3 boulons longs |
| 7 1 tour à la fois | alternance : face (ordre 1 → 6) / clé au boulon actif / coupe (ressorts qui se détendent) → retrait (clé et main gauche) → boulons portés et posés sur la table → face |
| 8 Boulons longs | gros plan sur la clé → face (clé rangée) → boulons posés au bout de la table → face |
| 9 Pièces | cône tiré à deux mains → porté et posé au bout de la table → large |

Scénarios B et D : mêmes plans pour les étapes communes ; gros plans sur la clé pendant les retraits au complet et sur le boulon 6 qui va céder, puis plans existants de la projection ou de l'arrêt. Le travailleur marche au poste (étape 1) et revient au banc (étape 4), en contournant la table ; ses mains tiennent les manettes, le cadenas, la clé (un boulon à la fois) et les pièces qu'il porte à la table (plans `tableJC`, `tableCV`, `tablePB`, `tableL`, `tablePlate`, vus du bout de la table pour voir ses mains). Case **Caméra auto (plans variés)** (cochée par défaut) : décochée, un seul cadrage par étape. Toucher la caméra coupe la mise en scène ; **Recentrer** la reprend. Mouvements de caméra amortis (ressort critique : départ et arrivée en douceur, sans balayage brusque) ; pendant la capture vidéo, un changement de plan plus grand que 35 % de la distance de visée devient une coupe franche.

## Ressorts

Les 18 ressorts sont modélisés avec un fil rond de section constante : en compression, seul l'écart entre les spires diminue, comme sur un vrai ressort (course amplifiée ×6 pour être visible). En vue coupée, le bloc des logements est ouvert plus profondément pour montrer deux rangées de ressorts entiers.

## Rendu

- **Matériaux PBR procéduraux** (aucune image téléchargée : textures générées au chargement par canvas, bruit périodique à graine fixe, 3 textures de 512 px et quelques-unes de 256 px ou moins, partagées par tous les matériaux et leurs clones) : peinture rouge « peinture rouge unie (textures retirées pour garder les détails lisibles). Niveau d'usure : machine propre, en service.
- **Environnement d'atelier procédural** pour les reflets (scène PMREM : sol sombre, murs gris, six néons froids au plafond, lampe chaude, armoires sombres) ; mappage de tons ACES.
- **Ombres de contact** douces sous le banc (avec la tête) et sous la table : disques à dégradé radial, transparents, sans écriture de profondeur, non cliquables, effacés dans les vues éclatées. Pas d'occlusion ambiante en post-traitement : les passes GTAO/SSAO de three.js rendent la profondeur avec un matériau de remplacement qui ignore les plans de coupe (la moitié retirée du mandrin occulterait la coupe).
- Cordons de soudure discrets au pied de la poignée et des charnières de la boîte, ligne de joint de coulée sur le boîtier du mandrin.
- **Actionner les manettes** : séquence manette → huile sous pression (chambre ambrée dans la vue en coupe, jusqu'au raccord du vérin) → piston, roulement, manchon, boulons et cône reculent de 0,18 po (jeu réel du modèle) → les mâchoires (jaws), retenues par le jaw cover, s'ouvrent radialement ; au relâchement, les ressorts avancent le cône et les jaws se ferment. Pièces en mouvement surlignées brièvement, repères courts dans la scène (« Huile sous pression », « ◀ Cône (bowl) recule », « Ressorts comprimés même fermés »…), gros plan automatique à l'étape 1. L'ouverture des jaws est exagérée ×6 (note dans la scène).
- **Option « Numéros et consignes »** (case sous la ligne de temps, anciennement « Numéros des boulons ») : dès que le couvercle (cap holder) est retiré, les boulons de la prochaine action sont numérotés dans la scène (un seul groupe à la fois) — J1 à J3 (couvert des mâchoires, B750-1500), C1 à C9 (porte-capuchon, B500-2250), 1 à 6 (boulons du cône, B500-6500, ordre de dévissage) et L1 à L3 (boulons longs de retenue, B500-8000) — avec, sous le mandrin, une fiche par groupe (numéro de pièce, quantité, rôle, étape et clé), comme les étiquettes des pièces posées sur la table ; pensé pour les captures d'écran destinées aux travailleurs. Un encadré « procédure » (blanc, bordure orange, gros texte, flèche rouge vers un boulon du groupe) se place à côté du groupe de boulons (position figée : il ne suit pas l'animation ; déplaçable à la souris ou au doigt ; ↺ le replace automatiquement) et indique combien de boulons dévisser et avec quelle clé, selon l'étape : « 3 boulons ¾ à dévisser avec une clé 1 1/8 », « 9 boulons ½ … clé ¾ », « 6 boulons ½ × 6 ½ … 1 tour à la fois, ordre 1 → 6 », « 3 boulons longs ½ × 8 à retirer ». L'encadré s'affiche aussi aux étapes sans boulons, avec la consigne de PRO-OP-DD-005 et une flèche vers l'objet : étape 1 « Manettes CLAM et CHUCK en position fermée » (flèche vers les poignées des manettes), étape 2 « Mâchoires (jaws) fermées » (vers les mâchoires), étape 3 « Cadenasser la foreuse — le cadenassage ne libère pas l'énergie des ressorts » (vers le cadenas), étape 9 « Ressorts détendus : retirer le cône (bowl) et les mâchoires, changer les pièces » (vers le cône). Si l'objet est hors du cadre (gros plan), l'encadré reste dans un coin, sans flèche. Il est masqué pendant la projection, l'arrêt du cône et le bilan.
- **Repères fermables** : chaque repère affiché dans la scène (« Huile sous pression », « Ressorts comprimés même fermés », « Manettes ouvertes »…) porte un × ; un clic ou un toucher le ferme jusqu'au changement d'étape, de scénario ou au redémarrage. Les numéros de boulons ne se ferment pas.
- **Manettes interactives** : cliquer la manette CLAM ou CHUCK la bascule (ouverte ⇄ fermée) ; le vérin, le cône et les mâchoires suivent. Lecture, changement d'étape ou de scénario ramènent l'animation. Foreuse cadenassée : les manettes ne répondent pas et une bulle rappelle que le cadenassage ne libère pas l'énergie des ressorts.
- **Bulle santé-sécurité** : l'info-bulle d'une pièce (clic, ou survol en vue éclatée) ajoute une courte ligne santé-sécurité (encadré jaune, sans titre) qui rappelle l'étape de la procédure liée à la pièce (cadenassage, boulons longs de retenue, dévissage 1 tour à la fois, ne pas se placer devant le cône, etc.).
- Sur téléphone (≤ 600 px) : les boutons de vue tiennent sur une seule ligne défilante avec des libellés courts (Coupe, Éclaté tête, Éclaté chuck, Présenter, ?, ⛶), sous la puce du scénario ; en plein écran, la liste des étapes est repliée en bas à droite.
- **Aucune ombre portée** (shadowMap désactivé) : lumière principale + lumière de remplissage opposée + lumière d'ambiance ; reflets de l'environnement d'atelier procédural. Fond uni, pas de décor.
- Arêtes légèrement arrondies sur les pièces prismatiques.
- Anticrénelage MSAA + SMAA, toujours en haute qualité.
- Les surfaces coïncidentes reçoivent un décalage de profondeur par matériau pour éviter le scintillement.
- **Pièces interactives partout** : un clic (ou toucher) sur une pièce la sélectionne et affiche son nom et son numéro quelques secondes, dans la vue normale, pendant l'animation et en vue éclatée. En vue éclatée, le simple survol suffit. Aucun numéro permanent. La pièce sélectionnée garde sa couleur d'origine et reçoit un **contour jaune** (qui respecte la coupe du mandrin) ; les autres pièces passent en transparence.
- Termes de métier anglais entre parenthèses : mandrin (chuck), tête (drill head), cône (bowl), mâchoires (jaws), couvert des mâchoires (jaw cover), couvercle (cap holder), ressorts (springs).
- **Noms des pièces** : en anglais par défaut (désignations des listes de pièces), bouton **EN / FR** sous « Nom des pièces au clic » (mémorisé).
- **Pièces retirées** : elles sortent dans l'axe en surbrillance, puis sont rangées sur une petite table de travail à côté du mandrin (couvert, couvercle et cône à plat, boulons et bushings couchés en rangées). Une étiquette posée dans la scène, au-dessus de chaque groupe sur la table, dit ce qui a été retiré (jaune : retiré à l'étape en cours ; sombre avec ✓ : déjà retiré).
- **Manettes et mécanisme** : banc de valves à 2 sections (CLAM, CHUCK), manettes à poignée rouge, repère FERMÉ / OUVERT. Manettes ouvertes, le vérin est sous pression : piston, roulement, manchon d'actionnement, 9 boulons et cône sont reculés (course illustrative de 0,35 po), les ressorts plus comprimés et les mâchoires ouvertes. À l'étape 1, les manettes se ferment, tout avance et les mâchoires se resserrent.
- Boulons à tête hexagonale réelle (pans à arêtes vives, chanfrein à 30° sur le dessus, portée sous tête, bout de tige chanfreiné) ; vis à tête creuse à arête chanfreinée.
- Pastilles « R » retirées des boulons longs.
- **Plein écran** : la liste des étapes de la procédure s'affiche dans la scène (✓ fait, ✗ erreur, en cours), repliable.
- **Séquence** : chaque étape faite reste marquée : « ✓ Fait » en vert pour la bonne méthode, « ✗ À éviter » ou « ✗ Dangereux » pour une erreur de méthode.
- Coupe sans scintillement : la teinte de coupe (faces arrière) est repoussée d'environ 1 mm derrière les faces avant, et les faces en contact orientées dans le même sens sont décalées de quelques centièmes de pouce.
- Bout du mandrin d'après la planche « Complete assembly UM-070-142AA » et une photo : le couvert des mâchoires 3506907 forme un **disque surélevé de 0,9 po** (arête chanfreinée, ligne de joint au pied) au-dessus de la couronne du porte-capuchon et de ses 9 boulons ; couvercle et couvert peints comme le boîtier, boulons zingués.
- **Alésage traversant** : aucune tige dans la tête ; on voit au travers de la broche, du mandrin jusqu'au nez de broche.
- Roulement 5000199 à rouleaux cylindriques (rouleaux et cage en laiton visibles) ; mâchoires en acier gris avec 2 × 2 plaquettes dentées, encoche centrale, rainures de guidage et anneau élastique.

## Rendus Blender (`renders/`)

Les quatre images fixes `renders/*.jpg` (Cycles, à partir du même modèle 3D exporté en GLB) servent aux cartons de la vidéo. La galerie « Vues réalistes » et le dossier `blender/` (fichier .blend, GLB, scripts de rendu et de cuisson) ont été retirés de ce dépôt et sont destinés au dépôt dédié aux modèles 3D (dernière version dans l'historique git, commit 28aa9ed).

## Éclairage cuit (Blender)

Retiré (option « Éclairage réaliste », dossier `lightmaps/`, scripts de cuisson) : la scène est éclairée en temps réel seulement. Dernière version dans l'historique git (commit 18e6ac1).

## Vidéo de la procédure

La section repliable **Vidéo de la procédure** contient `video/procedure_boyles_h.mp4` : le scénario A « Procédure respectée », étapes 1 à 9, pour former les travailleurs (H.264, 1280 × 720, 24 i/s, 1 min 35 s, sans son ; aperçu `video/procedure_poster.jpg`). Plan : carton titre sur le rendu Blender de l'ensemble ; animation 3D à vitesse 1× avec la caméra auto à plans variés (coupe du mandrin, numéros des boulons et encadré procédure, travailleur), numéro et titre de l'étape en bandeau, fin de chaque étape figée 1,5 s ; rendus Blender intercalés avec léger zoom (face avant avant l'étape 4, coupe et couvercle retiré avant l'étape 6) ; carton « À retenir ». La vidéo a été produite avant la clé à la ceinture et le transport des pièces à la table : ces gestes n'y figurent pas encore (la refaire avec la même chaîne pour les montrer). Si la vidéo ou son aperçu ne se chargent pas (artefact sans fichiers), ou si le navigateur ne lit pas le H.264, la section est masquée.

Elle est produite par `video/make_video.mjs` : capture image par image, déterministe, de l'animation (`video/capture.mjs`, chromium + Playwright ; dt fixe et horloge virtuelle injectés dans une copie servie de la page, `animation.html` n'est pas modifié), cartons rendus en PNG, montage et encodage ffmpeg (fondus enchaînés). Voir `video/README.md` pour la refaire.

## Textes

Tous les textes à l'écran sont courts et s'adressent aux travailleurs : une consigne par étape, sans numéros de pièces ni valeurs calculées. Les numéros et les noms des pièces restent accessibles au survol et au clic.

## Commandes

- Lecture / pause : bouton jaune ou barre d'espace. Étape précédente / suivante : flèches.
- **Coupe du mandrin** : montre l'intérieur du mandrin (ressorts, boulons, voile, manchon, piston, roulement). La tête reste entière ; une pièce retirée du mandrin sort de la coupe. **Coupe automatique** (« · auto » sur le bouton) : vue entière par défaut ; la coupe s'affiche seulement pour montrer que les ressorts sont comprimés — gros plan du mandrin à l'étape 1 et à l'étape 7, fin de l'étape 5, fin de l'étape 6, fin du résumé « Étapes 1 à 5 » (B, D) et cône arrêté par les boulons longs (D) — puis la vue redevient entière. Un clic force la coupe (ou la vue entière) ; **Recentrer** ou **Recommencer** rétablit l'automatique.
- **Éclaté : tête** : les pièces de la tête écartées de la boîte, le mandrin soulevé d'un bloc. Survoler une pièce pour voir son numéro et son nom, cliquer pour la sélectionner.
- **Éclaté : mandrin** : toutes les pièces du mandrin séparées ; même principe (survol, clic).
- **?** : aide illustrée pour naviguer dans la 3D (souris, molette, tablette), affichée au premier passage ; se ferme avec ×, Compris, Échap ou un clic à côté.
- **Plein écran** : la vue 3D et ses commandes occupent tout l'écran (Échap pour sortir).
- **Présenter aux travailleurs** (bouton rouge sous le titre, ou **Présenter** dans la vue) : plein écran, gros caractères, lecture continue (Espace pour mettre en pause). Un seul bouton **Scénario : … ▾** en haut à gauche ouvre la liste des quatre choix : 1 · l'accident (« Boulons retirés un par un : cône retenu », reconstitution), 2 · la bonne méthode (procédure respectée), 3 · sans les boulons longs (pire cas : projection), 4 · comparaison des trois issues avec « Revoir ». Touches : Espace lecture, → / ← ou Page suivante / précédente (télécommande) étape suivante / précédente, 1 à 4 chapitres, Échap pour quitter.
- **Pause à chaque étape** (case sous la ligne de temps, décochée par défaut) : à la fin de chaque étape, la lecture s'arrête sur une carte « Étape n · fait » ancrée sur l'action dans la 3D, avec un bouton **Suivant ▶** pour passer à l'étape suivante. Le mode Présentation ne l'active pas : la lecture y est continue.
- **Pièces** : un clic (ou un toucher) sur une pièce de la 3D affiche son numéro, son nom (anglais par défaut, français au choix sous « Nom des pièces au clic ») et, pour les pièces de la procédure, une bulle santé-sécurité ; la pièce est mise en évidence. La liste complète des pièces est réservée au dépôt dédié aux modèles 3D.

## Physique utilisée (estimations)

- **Les calculs de force et d'énergie des ressorts ont été retirés de l'affichage** : la raideur du ressort 5200517 n'est pas publiée et n'a pas été validée (aucune fiche technique, aucune mesure). La page ne montre donc ni joules, ni kN, ni vitesse. Pour une valeur certaine : compter les spires d'un ressort 5200517 et mesurer sa charge à une longueur connue.
- L'animation garde une physique interne (ressorts de raideur égale, loi de Hooke) uniquement pour que les mouvements soient cohérents : position du cône retenue par les boulons encore engagés (pas ½-13 UNC, 1 tour = 1,95 mm), détente graduelle quand on dévisse 1 tour à la fois, projection dans l'axe du mandrin quand le dernier filet cède. Ces valeurs internes ne sont pas affichées.
- Nombre de ressorts : 18, selon la liste de pièces. Compression libérée : ¼ po, selon la procédure.
- Projection : trajectoire balistique à l'horizontale dans l'axe du mandrin, ralentie ×6 à l'écran. Le cône frappe d'abord les mains sur la clé, puis le corps du travailleur à la hauteur qu'il a encore (tronc, hanches, jambes…), et se pose au sol.
- La course des ressorts est amplifiée ×6 à l'écran pour être visible.
