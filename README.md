# Clam sous tension

Animation 3D de formation. Elle montre l'énergie emmagasinée dans les ressorts d'un clam (chuck / mandrin) de foreuse, et ce qui arrive quand la séquence de démontage de la procédure **PRO-OP-DD-005** n'est pas respectée.

Ouvrir `index.html` dans un navigateur récent. Une connexion Internet est requise : Three.js et les polices sont chargés depuis un CDN.

## Modèle 3D : clam UM-079-100AA 12 HH

Toutes les pièces numérotées de la vue éclatée « Explosed rod clamp 12 HH » (UM-079, Usinage Marcotte) sont modélisées. Le bouton **Vue éclatée** les dispose le long de l'axe, comme sur le dessin. La **nomenclature** de la page permet de cliquer une pièce pour l'identifier ; on peut aussi cliquer la pièce dans la vue 3D.

| Groupe | Pièces |
| --- | --- |
| Arrière : vérin hydraulique | 2920452 bague de retenue, B312-1000, 321620 raccord, 2920333 couvercle arrière, B500-2000, 5030274, 2920331 piston, 5035015, 5035017, 2920332 cylindre, SP250, SHCS500-4000, 5030269, 5035016, 5035018 |
| Bâti | 2920455 (pied, poignée), ZNPT250 graisseur, 5020126, 5030250 |
| Avant | 5040192, 3506880, ressorts 5200517, cône 2920390, bushings 3506878, B500-8000 (×3), B500-6500 (×6), couvercle 3506906, B500-2250 (×9), couvert des mâchoires 3506907, B750-1500 (×6), mâchoires UM-021-01-03 H |
| Options | UM-021-15 (GB01, GB02, R3100-354, GB03-N, GB03-N+, GB04-B, GB04-B+), UM-021-06 (7 plaques de guidage), mâchoires UM-021-01-01 B, -02 N, -04 BW |

Le dessin n'est pas à l'échelle (N.T.S.). Les cotes sont estimées d'après ses proportions et rendues cohérentes entre elles. Par exemple, un B500-8000 mesure 6 ½ po (B500-6500) + 1 ½ po de bushing 3506878. Les pièces marquées « à confirmer » dans la nomenclature ont une fonction ou un emplacement déduits.

Correspondance avec la procédure (déduite du dessin) :

- Étape 4 : couvert des mâchoires 3506907, 6 boulons ¾ × 1 ½ (B750-1500), clé 1 1/8.
- Étape 5 : couvercle 3506906, 9 boulons ½ × 2 ¼ (B500-2250), clé ¾.
- Étape 6 : 3 boulons ½ × 8 (B500-8000) et leurs bushings 3506878, remis sans bushing.
- Étape 7 : 6 boulons ½ × 6 ½ (B500-6500), 1 tour à la fois, ordre 1 à 6.

## Scénarios

| Scénario | Ce qui est montré |
| --- | --- |
| Procédure respectée | Étapes 1 à 9. L'énergie des ressorts descend graduellement à 0. |
| Erreur : boulons retirés un par un | Étapes 6 et 7 non respectées. Le dernier boulon porte toute la force, son filet cède et le cône est projeté. |
| Erreur rattrapée par la retenue | Même erreur, mais l'étape 6 a été faite. Les 3 boulons remis sans bushing arrêtent le cône après quelques millimètres. |
| Erreur : cône coincé, sans retenue | Étape 6 omise. Le cône reste coincé, puis se décoince d'un coup et est projeté. |

## Commandes

- Lecture / pause : bouton jaune ou barre d'espace. Étape précédente / suivante : flèches.
- **Coupe** : montre l'intérieur du clam (ressorts, boulons qui traversent le bâti jusqu'au piston).
- **Vue éclatée** : toutes les pièces séparées, avec leur numéro.
- **SI / Impérial** : énergie en J ou en pi·lb, force en kN ou en lbf, compression en mm ou en po, vitesse en m/s ou en pi/s. Les équivalences affichées (masse lâchée d'une hauteur, tonnes) sont données dans les deux systèmes.

## Physique utilisée (estimations)

- Énergie des ressorts : `E = n × ½ k x²` ; force : `F = n × k x`.
- Valeurs par défaut indicatives : 12 ressorts, 200 N/mm (1 142 lbf/po), compression de 6,35 mm (¼ po, selon la procédure). Masse projetée : 16 kg (35 lb), celle du cône et des mâchoires du modèle en acier. Résultat : environ 48 J (36 pi·lb) et 15,2 kN (3 426 lbf). Pour un calcul réel, entrez la fiche du ressort 5200517 et la masse réelle du cône dans « Paramètres des ressorts ».
- Position du cône : plan retenu par les boulons encore engagés (pas ½-13 UNC, 1 tour = 1,95 mm), qui minimise l'énergie des ressorts. Le basculement est limité, parce que le cône est guidé dans son logement.
- Projection : vitesse de départ `v = √(2E/m)`, trajectoire balistique, ralentie ×6 à l'écran.
- La course des ressorts est amplifiée ×6 à l'écran pour être visible.
