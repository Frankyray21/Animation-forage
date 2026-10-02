# Clam sous tension

Animation 3D de formation sur la **tête de forage Boyles UM-012-100UG** et son **mandrin Boyles H** (UM-070-142AA / UM-012-142AA, Usinage Marcotte). Elle montre l'énergie emmagasinée dans les 18 ressorts du mandrin, et ce qui arrive quand la séquence de démontage de la procédure **PRO-OP-DD-005** n'est pas respectée.

Comme lors de l'accident, la tête est **à l'horizontale** : axe de broche à 1,25 m du plancher, face du mandrin vers le travailleur debout devant elle, boîte et moteur à côté du mandrin, chariot et mât dessous, le long de l'axe. Les vues éclatées ramènent la tête à la verticale, comme sur les planches.

Ouvrir `index.html` dans un navigateur récent. Une connexion Internet est requise : Three.js et les polices sont chargés depuis un CDN.

## Modèle 3D

Sources : manuel de la foreuse STM-1500, pages 2.1 à 2.7 (planches de la tête de forage UM-012-100UG, puis liste de pièces, coupe A-A et vue éclatée du mandrin Boyles H). Toutes les pièces des listes sont modélisées avec leurs quantités. La tête est rouge, comme sur les planches ; les pièces usinées sont en acier, les ressorts en vert.

Le bouton **Éclaté : tête** écarte les pièces de la tête autour de la boîte ; **Éclaté : mandrin** dispose les pièces du mandrin le long de son axe, comme sur le dessin. Dans les vues éclatées, les étiquettes donnent le numéro de la pièce ; son nom s'affiche dans une info-bulle quand on passe le curseur sur la pièce ou sur son étiquette (sur téléphone : quand on touche la pièce). La **nomenclature** de la page permet de cliquer une pièce pour l'identifier ; on peut aussi la cliquer dans la vue 3D.

### Tête de forage UM-012-100UG (planches 2.1 à 2.4)

| Groupe | Pièces |
| --- | --- |
| Boîte et couvercle | Boîte UM-012-104A (665 × 368 mm, 209,55 mm le long de la broche), couvercle UM-012-113A + B375-1000 (×16) + W375 (×16), UM-012-131 (×2), UM-102-132 (×2), couvercle d'évent UM-1214-121P (détail A : bouchon étagé à deux gorges, bride à méplat) + joint UM-012-167 + B312-1000 (×6 : 1 sur le couvercle d'évent, 4 sur le refroidisseur, 1 sur la tête de filtre) + W312 (×6) |
| Broche | Broche UM-012-101, UM-012-122 (×2), roulements UM-012-128 et UM-012-129, UM-012-121, UM-012-124 (×2), UM-012-120, SHC500-4000 (×10, fixation du mandrin), UM-012-107, UM-012-106, UM-012-126 (×2), UM-012-114, B500-1750 (×10), W500 (×20 ; la liste du mandrin en ajoute 8 sous les B500-1500), nez de broche UM-012-119 / 117 / 118 / 115 / 108 / 110 / 116, SS75-1250 (×9), SHCS312-1500 (×6) |
| Entraînement | Pignons UM-012-102 (28 dents) et UM-012-103 (15 dents), UM-012-169, UM-012-127 (×2), chaîne triple UM-012-130, UM-012-125, UM-012-123, transmission UM-012-143 + B437-1500 (×13) + W437 (×12), UM-012-170, UM-012-192, moteur hydraulique AA6VM + B750-2000 (×4) + W750 (×8), coudes UM-063-290T (×2), UM-063-289T (×4), UM-012-208 (×2) |
| Lubrification | UM-012-111, pompe UM-012-139 + B250-750 (×6) + W250 (×6), tête de filtre UM-012-177 + cartouche UM-012-178, refroidisseur d'huile (visible sur les planches, hors liste), vanne 3 voies UM-10B-TR#6, régulateur NDV-10-N, reniflard A-1199-R-4048, 13 boyaux UM-012-H08C à H25C-UG et leurs raccords |
| Montage | Axe de pivot UM-012-105A, UM-012-171 (×4), HP1000 |

Les proportions transmission / moteur (carter de transmission de 13 po, corps du moteur raccourci) et la disposition générale (couvercle UM sur le dessus en pose horizontale, transmission et moteur du côté du mandrin, colonne blanche verticale au bout d'entraînement, régulateur et boyaux sur le couvercle) ont été vérifiées sur un rendu 3D de la tête Boyles H d'Usinage Marcotte. La broche est à 152 mm du centre de la boîte ; l'axe d'entraînement (transmission, pignon moteur, pompe) est à 13,6 po de la broche, décalé de 1,8 po vers le couvercle (vue du nez de la planche 2.1). Le tracé des boyaux (gris tressé, comme sur les planches) et l'emplacement des raccords sont approximatifs (longueurs et extrémités de la liste) ; le chariot et le mât derrière la tête sont schématiques. La coupe ne tranche que le mandrin.

### Mandrin Boyles H (pages 2.5 à 2.7)

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

## Foreuse STM-1500 (livre de pièces FBRA-002-100AS, section 1)

La tête de forage a été **retirée de la foreuse et posée sur un banc de travail** (support de pivot boulonné sur le plateau). La foreuse complète est modélisée derrière le banc, mât couché à l'horizontale (position de transport, planche 1.04), sans la tête. Bouton **Foreuse (drill)** : la caméra va sur la foreuse ; un second clic revient à l'étape.

- **Planches utilisées** : 1.00 (liste des ensembles), 1.03 (cotes d'ensemble 147 29/32 × 57 25/32 po), 1.04, 1.1 (bâti), 1.2 (support de mât), 1.3 (mât, rallonge, boîtier du foot clamp), 1.4 (base du foot clamp), 1.5 (pivot de poulie), 1.6 (guide de tiges), 1.7 (poulie), 1.8 (table de tête), 1.9 (vérins d'inclinaison et de basculement), 1.10 (pattes et attelage), 1.11 (vérin d'avance), 1.12 (vérin d'avance supérieur « bazooka »).
- **Toutes les pièces des listes** sont représentées et cliquables (nom et numéro, EN / FR), regroupées dans la liste des pièces par ensemble ; la quincaillerie d'un même article est réunie en une seule entrée.
- **Foot clamp** (clam UM-079-100A-12 HH) au bout du mât, dans son boîtier FTD-148-300TF, sur la base UM-064-800B, devant la plaque d'appui FBRA-002-305BB.
- Limites : dessins N.T.S. ; les cotes de détail sont relevées sur les vues et approximatives. Non représentés : carters (planche 1.13), swivel optionnel UM-064-800AA (planche 1.15) et détail du treuil (section 2), absents du livre fourni. La planche 1.00 nomme UM-064-800B « SWIVEL » alors que la planche 1.4 le nomme « FOOT CLAMP BASE ».

## Clam et chuck

- **Chuck (mandrin)** : sur la tête de forage, tourne avec la broche ; serre la tige pour la faire tourner et la pousser ou la tirer. C'est la pièce modélisée ici (Boyles H, UM-070-142AA, sur la tête UM-012-100UG).
- **Clam (rod clamp, foot clamp)** : fixé à l'avant du mât, près du trou, ne tourne pas ; retient le train de tiges quand le chuck s'ouvre (recul de la tête, ajout ou retrait de tiges) pour qu'il ne glisse pas dans le trou. Non modélisé (vue éclatée UM-079-100AA « rod clamp 12 HH »).
- Les deux sont fermés par ressorts et ouverts par le vérin hydraulique : même danger d'énergie résiduelle, même procédure PRO-OP-DD-005.

## Scénarios

| Scénario | Ce qui est montré |
| --- | --- |
| Procédure respectée | Étapes 1 à 9. L'énergie des ressorts descend graduellement à 0. |
| Erreur : boulons retirés un par un | Étapes 6 et 7 non respectées. Le dernier boulon porte toute la force, son filet cède et le cône est projeté. |
| Erreur rattrapée : cône retenu | Même erreur, mais l'étape 6 a été faite. Les 3 boulons remis sans bushing arrêtent le cône après quelques millimètres. |
| Erreur : cône coincé, sans retenue | Étape 6 omise. Le cône reste coincé, puis se décoince d'un coup et est projeté. |

## Travailleur (modèle 3D)

Travailleur procédural (affiché tant que `worker.glb` est absent) : casque de mineur avec lampe, **lunettes de sécurité** (monture noire, verres teintés, écrans latéraux), coquilles, combinaison à bandes réfléchissantes, gants et bottes.

Le travailleur est chargé depuis une **copie locale** : `public/models/worker.glb` (modèle CC0 1.0, 0,698 × 1,83 × 0,337 m, axe Y vertical, source : https://cdn.3dassets.dev/assets/36355/v1/model.glb). Il n'est jamais chargé depuis le CDN. Si le fichier est absent, le travailleur procédural articulé (avec ses ÉPI) est affiché.

- Chargement : `GLTFLoader`, matériaux d'origine conservés, ombres projetées et reçues, mise à la hauteur réelle (1,83 m) et pieds au plancher.
- Réglages par défaut dans `WORKER_GLB` (index.html) : `position`, `rotY` (orientation), `scale`.
- En direct : `__clam.worker.set({ x, y, z, rotYdeg, scale })` et `__clam.worker.get()`.
- Sélection : clic sur le travailleur dans la vue 3D (raycaster). Sélectionné, une poignée apparaît : **T** déplacer, **R** tourner, **E** échelle. Les trajectoires et les zones d'impact suivent sa nouvelle position.
- Animation : recul et chute du corps entier lors d'une projection (le modèle n'est pas animé membre par membre).

Pour ajouter le fichier : `curl -L -o public/models/worker.glb https://cdn.3dassets.dev/assets/36355/v1/model.glb`, puis commit.

## Outil

Le travailleur dévisse les boulons avec une clé à chocs électrique à fil (d'après la photo du chantier) : corps métallique usé, nez conique, douille longue 12 pans, poignée arrière fermée avec gâchette, anneau latéral et cordon. Seule la douille tourne avec le boulon.

## Ressorts

Les 18 ressorts sont modélisés avec un fil rond de section constante : en compression, seul l'écart entre les spires diminue, comme sur un vrai ressort (course amplifiée ×6 pour être visible). En vue coupée, le bloc des logements est ouvert plus profondément pour montrer deux rangées de ressorts entiers.

## Rendu

- Matériaux unis (acier, peinture rouge), sans textures, pour que chaque pièce reste lisible.
- La foreuse STM-1500 est d'un rouge brique, moins vif que la tête, et placée plus loin derrière le banc ; le brouillard lointain est repoussé pour ne pas la délaver.
- **Manettes interactives** : cliquer la manette CLAM ou CHUCK la bascule (ouverte ⇄ fermée) ; le vérin, le cône et les mâchoires suivent. Lecture, changement d'étape ou de scénario ramènent l'animation. Foreuse cadenassée : les manettes ne répondent pas et une bulle rappelle que le cadenassage ne libère pas l'énergie des ressorts.
- **Bulle santé-sécurité** : l'info-bulle d'une pièce (clic, ou survol en vue éclatée) ajoute une courte ligne santé-sécurité (encadré jaune, sans titre) qui rappelle l'étape de la procédure liée à la pièce (cadenassage, boulons longs de retenue, dévissage 1 tour à la fois, ne pas se placer devant le cône, etc.).
- Sur téléphone (≤ 600 px) : les boutons de vue tiennent sur une seule ligne défilante avec des libellés courts (Coupe, Éclaté tête, Foreuse, Éclaté chuck, ?, ⛶), sous la puce du scénario ; en plein écran, la liste des étapes est repliée en bas à droite.
- **Aucune ombre portée** : lumière principale + lumière de remplissage opposée + lumière d'ambiance ; reflets neutres d'atelier. Fond uni, pas de décor.
- Arêtes légèrement arrondies sur les pièces prismatiques.
- Anticrénelage MSAA + SMAA, toujours en haute qualité.
- Les surfaces coïncidentes reçoivent un décalage de profondeur par matériau pour éviter le scintillement.
- **Pièces interactives partout** : un clic (ou toucher) sur une pièce la sélectionne et affiche son nom et son numéro quelques secondes, dans la vue normale, pendant l'animation et en vue éclatée. En vue éclatée, le simple survol suffit. Aucun numéro permanent. La pièce sélectionnée garde sa couleur d'origine et reçoit un **contour jaune** (qui respecte la coupe du mandrin) ; les autres pièces passent en transparence.
- Termes de métier anglais entre parenthèses : mandrin (chuck), tête (drill head), cône (bowl), mâchoires (jaws), couvert des mâchoires (jaw cover), couvercle (cap holder), ressorts (springs).
- **Noms des pièces** : en anglais par défaut (désignations des listes de pièces), bouton **EN / FR** au-dessus de la liste des pièces (mémorisé).
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

## Textes

Tous les textes à l'écran sont courts et s'adressent aux travailleurs : une consigne par étape, sans numéros de pièces ni valeurs calculées. Les numéros et les fiches de pièces restent accessibles au survol et au clic.

## Commandes

- Lecture / pause : bouton jaune ou barre d'espace. Étape précédente / suivante : flèches.
- **Coupe du mandrin** : montre l'intérieur du mandrin (ressorts, boulons, voile, manchon, piston, roulement). La tête reste entière ; une pièce retirée du mandrin sort de la coupe.
- **Éclaté : tête** : les pièces de la tête écartées de la boîte, le mandrin soulevé d'un bloc. Survoler une pièce pour voir son numéro et son nom, cliquer pour la sélectionner.
- **Éclaté : mandrin** : toutes les pièces du mandrin séparées ; même principe (survol, clic).
- **?** : aide illustrée pour naviguer dans la 3D (souris, molette, tablette), affichée au premier passage ; se ferme avec ×, Compris, Échap ou un clic à côté.
- **Plein écran** : la vue 3D et ses commandes occupent tout l'écran (Échap pour sortir).
- **Pause à chaque étape** : à la fin de chaque étape, une carte « Étape n · fait » (formulation de PRO-OP-DD-005) est ancrée sur l'action dans la 3D ; Lecture pour continuer.
- **Liste des pièces** : repliée par défaut, s'ouvre au clic.

## Physique utilisée (estimations)

- **Les calculs de force et d'énergie des ressorts ont été retirés de l'affichage** : la raideur du ressort 5200517 n'est pas publiée et n'a pas été validée (aucune fiche technique, aucune mesure). La page ne montre donc ni joules, ni kN, ni vitesse. Pour une valeur certaine : compter les spires d'un ressort 5200517 et mesurer sa charge à une longueur connue.
- L'animation garde une physique interne (ressorts de raideur égale, loi de Hooke) uniquement pour que les mouvements soient cohérents : position du cône retenue par les boulons encore engagés (pas ½-13 UNC, 1 tour = 1,95 mm), détente graduelle quand on dévisse 1 tour à la fois, projection dans l'axe du mandrin quand le dernier filet cède. Ces valeurs internes ne sont pas affichées.
- Nombre de ressorts : 18, selon la liste de pièces. Compression libérée : ¼ po, selon la procédure.
- Projection : trajectoire balistique à l'horizontale dans l'axe du mandrin, ralentie ×6 à l'écran. Le cône frappe d'abord les mains sur la clé, puis le corps du travailleur à la hauteur qu'il a encore (tronc, hanches, jambes…), et se pose au sol.
- La course des ressorts est amplifiée ×6 à l'écran pour être visible.
