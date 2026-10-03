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

## Foreuse STM-1500 (page séparée : `foreuse.html`)

La foreuse, sa console de commande UM-051 et son groupe hydraulique FMX-005 sont sur une page distincte du même dépôt, `foreuse.html` (lien depuis l'en-tête d'`index.html`, et retour). `index.html` ne contient plus que la tête de forage, le mandrin, le banc, le poste CLAM/CHUCK, le travailleur et l'animation. (livre de pièces FBRA-002-100AS, section 1)

La tête de forage a été **retirée de la foreuse et posée sur un banc de travail** (support de pivot boulonné sur le plateau). La foreuse complète est modélisée derrière le banc, mât couché à l'horizontale (position de transport, planche 1.04), sans la tête. Bouton **Foreuse (drill)** : la caméra va sur la foreuse ; un second clic revient à l'étape.

- **Planches utilisées** : 1.00 (liste des ensembles), 1.03 (cotes d'ensemble 147 29/32 × 57 25/32 po), 1.04 (graissage), 1.05 (numéros de série, photos), 1.1 (bâti), 1.2 (support de mât), 1.3 (mât, rallonge, boîtier du foot clamp), 1.4 (base du foot clamp), 1.5 (pivot de poulie), 1.6 (guide de tiges), 1.7 (poulie), 1.8 (table de tête), 1.9 (vérins d'inclinaison et de basculement), 1.10 (pattes et attelage), 1.11 (vérin d'avance), 1.12 (vérin d'avance supérieur « bazooka »), 1.13 à 1.13.2 (garde et arrêt d'urgence) ; manuel complet : sections 3 (groupe hydraulique), 4 (console) et 8 (treuil wire line).
- **Toutes les pièces des listes** sont représentées et cliquables (nom et numéro, EN / FR), regroupées dans la liste des pièces par ensemble ; la quincaillerie d'un même article est réunie en une seule entrée.
- **Foot clamp** (clam UM-079-100A-12 HH) au bout du mât, dans son boîtier FTD-148-300TF, sur la base UM-064-800B, devant la plaque d'appui FBRA-002-305BB. Corps en deux sections (cylindre et bol) avec bride boulonnée (9 × B500-8000), chapeau arrière, 8 mâchoires annulaires WH-525 visibles dans l'alésage Ø 3 13/16, couvercle UM-021-15-GB01 et ses 9 vis, graisseur, reniflard, bouchon (planches « Exploded / List pièce rod clamp 12 HH »).
- **Détails ajoutés (livre de pièces)** : mât en treillis (âmes ajourées entre les montants, goussets d'extrémité, bandes d'usure des rails de la table et vis à tête creuse, cordons de soudure aile / âme) ; goussets et cordons de soudure du bâti (pieds des poteaux, bouts des traverses, oreilles) et du support de mât ; graisseurs des positions B et E de la planche 1.04 ; trous de réglage des pattes ; plaques signalétiques « UM » (planche 1.05 : flasque du treuil, bride du mât, table du foot clamp, groupe hydraulique).
- **Treuil du câble (wire line) UM-032-100A** (planches 8.0 à 8.3, 32 × 27 ½ × 24 ¾ po) : châssis bleu boulonné sur les longerons, flasques profilées avec fenêtre, protecteurs supérieurs avant et arrière cintrés, tambour avec câble enroulé (profil à spires), paliers PFL206 et roulements SB206-20, moteur hydraulique et garde-chaîne UM-032-103A côté opérateur, guide-câble à vis (UM-032-226F, chariot UM-041-014F, bras UM-032-115F / 116F) ; câble tendu du treuil aux deux réas de la poulie du mât, émerillon et crochet au bout.
- **Arrêt d'urgence à câble** (planches 1.13, 1.13.1, 1.13.2 ; groupe « Foreuse : arrêt d'urgence à câble ») : câble (pull cord) le long du mât avec œillets, interrupteur de sécurité XY2-CH, plaque d'ancrage, boîte de commande et lignes pilotes vers la console. La garde jaune UM-064-1200GG n'est pas modélisée (retirée à la demande).
- **Boyaux hydrauliques** (groupe « Foreuse : boyaux hydrauliques (hors listes) », tracés plausibles, longueurs non cotées) : tubes noirs satinés sur courbes lissées avec embouts zinc (virole, écrou, nez) ; vers les blocs YEJ des vérins d'inclinaison (4) et de basculement (2), alimentation des distributeurs mât / câble (2), vérin d'avance supérieur (2, par-dessus la table puis le long du mât), vérin d'avance (4, du distributeur aux coudes des deux bouts par une fenêtre du mât), moteur du treuil (2), pression / retour du groupe vers la console (2, Ø plus grand). Les boyaux vers la console forment un faisceau de 11 voies au sol, côté opérateur, jusqu'aux raccords de cloison du panneau bas.
- **Accessoires hors nomenclature de la foreuse** (groupe « Foreuse : accessoires hors nomenclature », posés au sol et visibles dans la vue Foreuse ; `CAMS.drill` recadrée) :
  - *Console de commande hydraulique UM-051* (manuel section 4, planches 4.1 à 4.5 : 31 ⅛ × 30 ⅝ × 58 29/32 po) : joues de tôle grise avec trou d'accès, pieds et oreilles de levage ; panneau haut avec 5 manomètres (cadran canvas, aiguille à 0) et plaque d'identification ; pupitre incliné portant les blocs de valves SD25 (3 manettes : rotation, vissage, avance rapide) et SDS150 (4 manettes : chuck, clam, avance lente, wire line) ; panneau bas avec bloc eau bleu UM-020-643P et robinet, bloc de retour HA250, plaque bleue UM, 13 raccords de cloison ; accumulateur rouge AM3051003 à l'intérieur ; contrôleur de sécurité UM-CIT-SC-UG (bouton d'arrêt d'urgence et réarmement) et station de commande 10250H sur le dessus.
  - *Groupe hydraulique FMX-005* (manuel section 3, planches 3.0 à 3.3 : 96 ⅞ × 48 ¼ × 60 15/16 po, 5 800 lb ; sans les roues optionnelles) : cadre tubulaire rouge FMX-005-200PP sur patins à nez relevés, 6 montants, 4 oreilles de levage ; réservoir d'huile 110 gal FMX-005-300TD en hauteur (couvercles d'inspection, bouchon, reniflard, niveau), pompe à main FR150, collecteur de retour et filtre UM-064-600PP ; moteur WEG 125 HP gris à ailettes (CT125504NPBBW22, capot de ventilateur, boîte de bornes, plaque WEG) avec accouplement F81 et pompes A11VO130 / A10VO45 ; boîte électrique Hoffman A30HS2412GQRLP (porte, poignée, loquets, plaque) ; 2 refroidisseurs AB-1202 sur leur support ; panneaux grillagés en métal déployé (UM-064-165TD en bas à l'avant, UM-064-235TD sur le toit et au bout).
- **Matériaux** : peinture de la foreuse en `MeshPhysicalMaterial` (rouge brique 0x7e231c, `clearcoat` .25, `clearcoatRoughness` .4, `roughness` .5) avec `roughnessMap` de bruit procédural (canvas 128 × 128 répété 3 ×) ; même famille pour la tôle grise de la console, le bleu du treuil et le jaune de la garde ; arêtes des boîtes adoucies par `RoundedBoxGeometry` ; tiges de vérins en acier chromé (`metalness` 1, `roughness` .15) ; caoutchouc satiné des boyaux (`roughness` .55) ; câble d'acier gris métallique ; cordons de soudure plus foncés que la peinture. Textures canvas uniquement (bruit, plaques, cadrans, grilles, perforations) ; aucune photo.
- **Ombre de contact** : sous la foreuse, le groupe et la console, un plan transparent à dégradé radial (canvas, `depthWrite` désactivé, hors sélection et hors lancer de rayons) donne une ombre douce au sol sans ombres portées (`renderer.shadowMap` reste désactivé).
- **Performance** : chaque pièce est compactée dans `dpart` (fusion des meshes par matériau), la quincaillerie et les boyaux sont fusionnés ; la foreuse complète avec ses accessoires compte environ 330 meshes (446 avant ces ajouts).
- Limites : dessins N.T.S. ; les cotes de détail sont relevées sur les vues et approximatives. Non représentés : swivel optionnel UM-064-800AA (planche 1.15), plateforme rotative (1.14), roues du groupe. La planche 1.00 nomme UM-064-800B « SWIVEL » alors que la planche 1.4 le nomme « FOOT CLAMP BASE ». Références non fournies (tambour, moteur du treuil, câble) : identifiées par des libellés descriptifs et signalées dans la fiche.

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

## Mise en scène (caméra auto)

On doit voir les gestes : chaque étape enchaîne plusieurs plans (`shots` : `{ at, cam, cut }`, `at` = fraction de l'étape). Le plan dépend seulement de l'étape et de sa progression : retour en arrière et ligne de temps donnent le même cadrage. Transitions douces ; une seule coupe franche (passage au cadenas). Plans fixes (`CAMS.walk`, `jawsFront`, `plongee`, `tableJC`, `tablePlate`…) et plans qui suivent l'action (`CAMS.x = { fn }`, recalculés à chaque image depuis la position de l'objet visé, rattrapage plus lent) : `lever` (mains sur les manettes), `lockClose` (cadenas), `tool` (par-dessus l'épaule : mains, clé, boulon ; cible tirée vers le centre de la face pour ne pas sauter d'un boulon à l'autre), `boltL` (boulon long de côté), `pull` (pièce tirée à deux mains).

| Étape | Plans |
|---|---|
| 1 Manettes | large : le travailleur va au poste → profil sur les mains qui ferment CLAM et CHUCK → coupe du vérin quand la pression tombe |
| 2 Mâchoires | face avant, gros plan sur les mâchoires |
| 3 Cadenasser | coupe franche sur le poste : la main pose le cadenas et l'étiquette |
| 4 Jaw cover | large (retour au banc) → par-dessus l'épaule : clé sur J1, J2, J3 → couvert tiré à deux mains → posé sur la table |
| 5 Cap holder | plongée de face (C1 à C9) → suivi de la clé → couvercle tiré → face du cône |
| 6 Boulons longs | gros plan de côté (dévissé, sorti, bushing posé, remis) → face, 3 boulons longs |
| 7 1 tour à la fois | alternance : face (ordre 1 → 6) / clé au boulon actif / coupe (ressorts qui se détendent) |
| 8 Boulons longs | gros plan sur la clé → face |
| 9 Pièces | large (cône tiré à deux mains) → table |

Scénarios B et D : mêmes plans pour les étapes communes ; gros plans sur la clé pendant les retraits au complet et sur le boulon 6 qui va céder, puis plans existants de la projection ou de l'arrêt. Le travailleur marche au poste (étape 1) et revient au banc (étape 4), en contournant la table ; ses mains tiennent les manettes, le cadenas, la clé (un boulon à la fois) et les pièces tirées. Case **Caméra auto (plans variés)** (cochée par défaut) : décochée, un seul cadrage par étape. Toucher la caméra coupe la mise en scène ; **Recentrer** la reprend.

## Ressorts

Les 18 ressorts sont modélisés avec un fil rond de section constante : en compression, seul l'écart entre les spires diminue, comme sur un vrai ressort (course amplifiée ×6 pour être visible). En vue coupée, le bloc des logements est ouvert plus profondément pour montrer deux rangées de ressorts entiers.

## Rendu

- **Matériaux PBR procéduraux** (aucune image téléchargée : textures générées au chargement par canvas, bruit périodique à graine fixe, 3 textures de 512 px et quelques-unes de 256 px ou moins, partagées par tous les matériaux et leurs clones) : peinture rouge « peinture rouge unie (textures retirées pour garder les détails lisibles). Niveau d'usure : machine propre, en service.
- **Environnement d'atelier procédural** pour les reflets (scène PMREM : sol sombre, murs gris, six néons froids au plafond, lampe chaude, armoires sombres) ; mappage de tons ACES.
- **Ombres de contact** douces sous le banc (avec la tête) et sous la table : disques à dégradé radial, transparents, sans écriture de profondeur, non cliquables, effacés dans les vues éclatées. Pas d'occlusion ambiante en post-traitement : les passes GTAO/SSAO de three.js rendent la profondeur avec un matériau de remplacement qui ignore les plans de coupe (la moitié retirée du mandrin occulterait la coupe).
- Cordons de soudure discrets au pied de la poignée et des charnières de la boîte, ligne de joint de coulée sur le boîtier du mandrin.
- La foreuse STM-1500 est d'un rouge brique, moins vif que la tête, et placée plus loin derrière le banc ; le brouillard lointain est repoussé pour ne pas la délaver.
- **Actionner les manettes** : séquence manette → huile sous pression (chambre ambrée dans la vue en coupe, jusqu'au raccord du vérin) → piston, roulement, manchon, boulons et cône reculent de 0,18 po (jeu réel du modèle) → les mâchoires (jaws), retenues par le jaw cover, s'ouvrent radialement ; au relâchement, les ressorts avancent le cône et les jaws se ferment. Pièces en mouvement surlignées brièvement, repères courts dans la scène (« Huile sous pression », « ◀ Cône (bowl) recule », « Ressorts comprimés même fermés »…), gros plan automatique à l'étape 1. L'ouverture des jaws est exagérée ×6 (note dans la scène).
- **Option « Numéros des boulons »** (case sous la ligne de temps) : dès que le couvercle (cap holder) est retiré, les boulons de la prochaine action sont numérotés dans la scène (un seul groupe à la fois) — J1 à J3 (couvert des mâchoires, B750-1500), C1 à C9 (porte-capuchon, B500-2250), 1 à 6 (boulons du cône, B500-6500, ordre de dévissage) et L1 à L3 (boulons longs de retenue, B500-8000) — avec, sous le mandrin, une fiche par groupe (numéro de pièce, quantité, rôle, étape et clé), comme les étiquettes des pièces posées sur la table ; pensé pour les captures d'écran destinées aux travailleurs. Un encadré « procédure » (blanc, bordure orange, gros texte, flèche rouge vers un boulon du groupe) se place à côté du groupe de boulons (position figée : il ne suit pas l'animation ; déplaçable à la souris ou au doigt ; ↺ le replace automatiquement) et indique combien de boulons dévisser et avec quelle clé, selon l'étape : « 3 boulons ¾ à dévisser avec une clé 1 1/8 », « 9 boulons ½ … clé ¾ », « 6 boulons ½ × 6 ½ … 1 tour à la fois, ordre 1 → 6 », « 3 boulons longs ½ × 8 à retirer ».
- **Repères fermables** : chaque repère affiché dans la scène (« Huile sous pression », « Ressorts comprimés même fermés », « Manettes ouvertes »…) porte un × ; un clic ou un toucher le ferme jusqu'au changement d'étape, de scénario ou au redémarrage. Les numéros de boulons ne se ferment pas.
- **Manettes interactives** : cliquer la manette CLAM ou CHUCK la bascule (ouverte ⇄ fermée) ; le vérin, le cône et les mâchoires suivent. Lecture, changement d'étape ou de scénario ramènent l'animation. Foreuse cadenassée : les manettes ne répondent pas et une bulle rappelle que le cadenassage ne libère pas l'énergie des ressorts.
- **Bulle santé-sécurité** : l'info-bulle d'une pièce (clic, ou survol en vue éclatée) ajoute une courte ligne santé-sécurité (encadré jaune, sans titre) qui rappelle l'étape de la procédure liée à la pièce (cadenassage, boulons longs de retenue, dévissage 1 tour à la fois, ne pas se placer devant le cône, etc.).
- Sur téléphone (≤ 600 px) : les boutons de vue tiennent sur une seule ligne défilante avec des libellés courts (Coupe, Éclaté tête, Foreuse, Éclaté chuck, ?, ⛶), sous la puce du scénario ; en plein écran, la liste des étapes est repliée en bas à droite.
- **Aucune ombre portée** (shadowMap désactivé) : lumière principale + lumière de remplissage opposée + lumière d'ambiance ; reflets de l'environnement d'atelier procédural. Fond uni, pas de décor.
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

## Vues réalistes (Blender)

Sous la nomenclature, la section repliable **Vues réalistes (rendu Blender)** montre quatre images fixes tracées en rayons (Cycles, CPU, dénoiseur OpenImageDenoise, 1600 × 1000, caméra 35 mm avec légère profondeur de champ) : tête et mandrin sur le banc ; face avant du mandrin (couvercle, couvert des mâchoires, boulons) ; mandrin en coupe (ressorts verts, piston, cône, mâchoires) ; couvercle retiré avec les 9 boulons du cône. Un clic ouvre l'image en grand (fermeture par ×, Échap ou clic à côté). Les vignettes dont l'image ne charge pas sont masquées.

Les images (`renders/*.jpg`) viennent du **même modèle 3D** : la scène three.js est exportée en GLB (`blender/tete_mandrin.glb`, un maillage par pièce nommé par sa référence), puis `blender/scene.py` refait les matériaux PBR (peinture rouge, fonte, acier usiné, zinc jaune des boulons, zinc gris du couvert, noir mat du couvercle, ressorts verts), l'éclairage d'atelier et la coupe du mandrin, et rend les vues. Voir `blender/README.md` pour rejouer le rendu ; `blender/tete_mandrin.blend` s'ouvre directement dans Blender.

## Éclairage cuit (Blender)

La vue 3D interactive reçoit une **occlusion ambiante douce** calculée dans Blender (Cycles) sur les pièces **fixes** de la tête et du banc : creux, contacts entre pièces, dessous des boyaux, plateau du banc sous la tête. Case **« Éclairage réaliste (Blender) »** (cochée par défaut, ligne d'options sous la ligne de temps) pour comparer avec l'éclairage temps réel seul.

- **Principe** : environnement blanc uniforme et plancher clair, cuisson *Diffuse* (directe + indirecte, sans couleur) : 1 = surface dégagée, moins dans les creux, avec les rebonds de lumière. Le site l'applique en `aoMap` (2e jeu d'UV `uv1`) : seule la lumière d'ambiance (hémisphère et reflets de l'environnement) est atténuée ; les deux lumières directes restent entières, donc aucune ombre portée et les détails restent lisibles. Un `lightMap` de three.js ne fait qu'ajouter de la lumière : il ne peut pas rendre un creux plus sombre.
- **Pièces cuites** : 182 maillages (161 de la tête : boîte, couvercles, broche et roulements, transmission, moteur, pompe, filtre, boyaux… ; 21 du banc et du support de pivot). Restent en temps réel : boulons, rondelles, vis et raccords, très petites pièces, chaînes (InstancedMesh), vis tranchées avec le mandrin, mandrin, travailleur, table.
- **Tête éclatée** : un 2e atlas est cuit avec les pièces écartées (sans banc) ; le passage se fait par un fondu pendant l'animation de l'éclaté (l'intérieur de la boîte n'apparaît pas noir).
- **Fichiers** (`lightmaps/`) : `head_lm.glb` (géométrie des pièces cuites avec la 2e couche UV « LM », compression Draco), `head_a.jpg` (tête assemblée, 2048 px), `head_e.jpg` (tête éclatée, 2048 px), `bench.jpg` (banc, 1024 px), `bake_info.json` (liste des cibles, statistiques). Le maillage `LM_<g>_<i>` correspond au i-ième maillage de `headG` (g = h) ou de `carriage` (g = c) dans l'ordre de `traverse()`, relevé au démarrage. Au chargement, la géométrie du GLB remplace celle de la pièce (même objet : nomenclature, sélection, contour, clic, éclaté inchangés), après contrôle de sa boîte englobante ; sinon la pièce est laissée telle quelle. Si les fichiers manquent (artefact, page sans adresse), la page reste en éclairage temps réel, sans erreur, et la case est masquée.
- **Refaire** (après une modification de la géométrie de la tête ou du banc) :

```bash
node blender/export_static.mjs blender/lm_work          # export des pièces fixes (Playwright + chromium) ; option : dossier local du paquet three@0.160.0
python3 blender/bake_lightmaps.py --src blender/lm_work  # cuisson Cycles CPU (256 échantillons, environ 8 min sur 4 cœurs) → lightmaps/ ; --test : aperçu 512 px, 16 échantillons
```

## Vidéo de la procédure

La section repliable **Vidéo de la procédure** (juste avant les vues réalistes) contient `video/procedure_boyles_h.mp4` : le scénario A « Procédure respectée », étapes 1 à 9, pour former les travailleurs (H.264, 1280 × 720, 24 i/s, 1 min 24 s, sans son ; aperçu `video/procedure_poster.jpg`). Plan : carton titre sur le rendu Blender de l'ensemble ; animation 3D à vitesse 1× (coupe du mandrin, numéros des boulons et encadré procédure, travailleur), numéro et titre de l'étape en bandeau, fin de chaque étape figée 1,5 s ; rendus Blender intercalés avec léger zoom (face avant avant l'étape 4, coupe et couvercle retiré avant l'étape 6) ; carton « À retenir ». Si la vidéo ou son aperçu ne se chargent pas (artefact sans fichiers), ou si le navigateur ne lit pas le H.264, la section est masquée.

Elle est produite par `video/make_video.mjs` : capture image par image, déterministe, de l'animation (`video/capture.mjs`, chromium + Playwright ; dt fixe et horloge virtuelle injectés dans une copie servie de la page, `index.html` n'est pas modifié), cartons rendus en PNG, montage et encodage ffmpeg (fondus enchaînés). Voir `video/README.md` pour la refaire.

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
