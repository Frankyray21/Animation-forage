# Clam sous tension

Animation 3D de formation sur la **tête de forage Boyles UM-012-100UG** et son **mandrin Boyles H** (UM-070-142AA / UM-012-142AA, Usinage Marcotte). Elle montre l'énergie emmagasinée dans les 18 ressorts du mandrin, et ce qui arrive quand la séquence de démontage de la procédure **PRO-OP-DD-005** n'est pas respectée.

Comme lors de l'accident, la tête est **à l'horizontale** : axe de broche à 1,25 m du plancher, face du mandrin vers le travailleur debout devant elle, boîte et moteur à côté du mandrin, chariot et mât dessous, le long de l'axe. Les vues éclatées ramènent la tête à la verticale, comme sur les planches.

Ouvrir `index.html` dans un navigateur récent. Une connexion Internet est requise : Three.js et les polices sont chargés depuis un CDN.

## Modèle 3D

Sources : manuel de la foreuse STM-1500, pages 2.1 à 2.7 (planches de la tête de forage UM-012-100UG, puis liste de pièces, coupe A-A et vue éclatée du mandrin Boyles H). Toutes les pièces des listes sont modélisées avec leurs quantités. La tête est rouge, comme sur les planches ; les pièces usinées sont en acier, les ressorts en vert.

Le bouton **Éclaté : tête** écarte les pièces de la tête autour de la boîte ; **Éclaté : mandrin** dispose les pièces du mandrin le long de son axe, comme sur le dessin. Dans les vues éclatées, les étiquettes donnent le numéro de la pièce ; son nom s'affiche dans une info-bulle quand on passe le curseur sur la pièce ou sur son étiquette. La **nomenclature** de la page permet de cliquer une pièce pour l'identifier ; on peut aussi la cliquer dans la vue 3D.

### Tête de forage UM-012-100UG (planches 2.1 à 2.4)

| Groupe | Pièces |
| --- | --- |
| Boîte et couvercle | Boîte UM-012-104A (665 × 368 mm, 209,55 mm le long de la broche), couvercle UM-012-113A + B375-1000 (×16) + W375 (×16), UM-012-131 (×2), UM-102-132 (×2), couvercle d'évent UM-1214-121P (détail A : bouchon étagé à deux gorges, bride à méplat) + joint UM-012-167 + B312-1000 (×6 : 1 sur le couvercle d'évent, 4 sur le refroidisseur, 1 sur la tête de filtre) + W312 (×6) |
| Broche | Broche UM-012-101, UM-012-122 (×2), roulements UM-012-128 et UM-012-129, UM-012-121, UM-012-124 (×2), UM-012-120, SHC500-4000 (×10, fixation du mandrin), UM-012-107, UM-012-106, UM-012-126 (×2), UM-012-114, B500-1750 (×10), W500 (×20 ; la liste du mandrin en ajoute 8 sous les B500-1500), nez de broche UM-012-119 / 117 / 118 / 115 / 108 / 110 / 116, SS75-1250 (×9), SHCS312-1500 (×6) |
| Entraînement | Pignons UM-012-102 (28 dents) et UM-012-103 (15 dents), UM-012-169, UM-012-127 (×2), chaîne triple UM-012-130, UM-012-125, UM-012-123, transmission UM-012-143 + B437-1500 (×13) + W437 (×12), UM-012-170, UM-012-192, moteur hydraulique AA6VM + B750-2000 (×4) + W750 (×8), coudes UM-063-290T (×2), UM-063-289T (×4), UM-012-208 (×2) |
| Lubrification | UM-012-111, pompe UM-012-139 + B250-750 (×6) + W250 (×6), tête de filtre UM-012-177 + cartouche UM-012-178, refroidisseur d'huile (visible sur les planches, hors liste), vanne 3 voies UM-10B-TR#6, régulateur NDV-10-N, reniflard A-1199-R-4048, 13 boyaux UM-012-H08C à H25C-UG et leurs raccords |
| Montage | Axe de pivot UM-012-105A, UM-012-171 (×4), HP1000 |

La broche est à 152 mm du centre de la boîte ; l'axe d'entraînement (transmission, pignon moteur, pompe) est à 13,6 po de la broche, décalé de 1,8 po vers le couvercle (vue du nez de la planche 2.1). Le tracé des boyaux (gris tressé, comme sur les planches) et l'emplacement des raccords sont approximatifs (longueurs et extrémités de la liste) ; le chariot et le mât derrière la tête sont schématiques. La coupe ne tranche que le mandrin.

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

## Scénarios

| Scénario | Ce qui est montré |
| --- | --- |
| Procédure respectée | Étapes 1 à 9. L'énergie des ressorts descend graduellement à 0. |
| Erreur : boulons retirés un par un | Étapes 6 et 7 non respectées. Le dernier boulon porte toute la force, son filet cède et le cône est projeté. |
| Erreur rattrapée par la retenue | Même erreur, mais l'étape 6 a été faite. Les 3 boulons remis sans bushing arrêtent le cône après quelques millimètres. |
| Erreur : cône coincé, sans retenue | Étape 6 omise. Le cône reste coincé, puis se décoince d'un coup et est projeté. |

## Commandes

- Lecture / pause : bouton jaune ou barre d'espace. Étape précédente / suivante : flèches.
- **Coupe du mandrin** : montre l'intérieur du mandrin (ressorts, boulons, voile, manchon, piston, roulement). La tête reste entière ; une pièce retirée du mandrin sort de la coupe.
- **Éclaté : tête** : les pièces de la tête écartées de la boîte, le mandrin soulevé d'un bloc. Les pièces principales sont étiquetées ; les autres le sont quand on les sélectionne.
- **Éclaté : mandrin** : toutes les pièces du mandrin séparées, avec leur numéro.
- **SI / Impérial** : énergie en J ou en pi·lb, force en kN ou en lbf, compression en mm ou en po, vitesse en m/s ou en pi/s. Les équivalences (masse lâchée d'une hauteur, tonnes) sont données dans les deux systèmes.

## Physique utilisée (estimations)

- Énergie des ressorts : `E = n × ½ k x²` ; force : `F = n × k x`.
- Nombre de ressorts : 18, selon la liste de pièces. Compression : 6,35 mm (¼ po), selon la procédure.
- **Raideur du ressort 5200517 : 350 N/mm (2 000 lbf/po), calculée.** Les distributeurs donnent ses cotes : Ø 1 ½ po, Ø int. ¾ po, longueur 6 po (Geo Mines ; équivalent Mirow Regent 18100155, « Spring for 12HH & P Chuck »). Fil de ⅜ po, diamètre moyen 1 ⅛ po, acier G = 79,3 GPa, environ 10 spires actives (non publié : 8 à 12 spires donnent 440 à 290 N/mm) : `k = G d⁴ / (8 D³ n)`.
- Résultat à ¼ po : environ 127 J (94 pi·lb) et 40 kN (9 000 lbf), soit 4,4 kN par boulon du cône quand les 9 sont serrés. Il faudrait environ 20 bar (290 psi) sur le piston 3506908 (≈ 198 cm², 31 po²) pour retenir cette force.
- Contrôle : JKS Boyles annonce 26 000 lb de serrage pour le mandrin 12HH (mâchoires 12,5°). Avec un coin de 12,5° et des frottements estimés (0,1 bol/mâchoires, 0,3 plaquettes/tige), cela demande environ 120 kN de poussée axiale, soit environ 0,8 po de compression des ressorts en service : cohérent avec un ressort de 6 po. Aucune fiche ne donne la raideur elle-même : mesurez un ressort ou demandez sa fiche pour un calcul exact (réglable dans « Paramètres des ressorts »).
- Masse projetée : 22 kg (49 lb), celle du cône et des mâchoires du modèle en acier. Vitesse de départ à 127 J : environ 3,4 m/s (12 km/h).
- Position du cône : plan retenu par les boulons encore engagés (pas ½-13 UNC, 1 tour = 1,95 mm), qui minimise l'énergie des ressorts. Le basculement est limité, parce que le cône est guidé dans le boîtier.
- Projection : vitesse de départ `v = √(2E/m)` dans l'axe du mandrin, donc à l'horizontale ; trajectoire balistique (le cône de 22 kg retombe pendant son vol), ralentie ×6 à l'écran. Il frappe d'abord les mains sur la clé, puis le corps du travailleur à la hauteur qu'il a encore (hanches, jambes…), et se pose à plat au sol.
- La course des ressorts est amplifiée ×6 à l'écran pour être visible.
