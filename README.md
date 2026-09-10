# SMAXOXF1 — Modèle de tokenisation RWA Starlink à N’Djamena

## Objet

Ce dépôt contient un modèle financier Python illustratif pour une structure basée à N’Djamena (Tchad), dont l’activité combine la **vente de kits Starlink** et l’**exploitation de points Hotspot internet**. Le modèle est une base de travail pour l’étude d’un fractionnement RWA en tokens ; il ne constitue ni une offre au public, ni une promesse de rendement, ni un avis juridique, fiscal ou financier.

## Structure de tokenisation

| Élément | Valeur |
|---|---:|
| Valeur totale de l’actif / capital initial | 10 000 000 XAF |
| Nombre de tokens | 20 000 |
| Valeur nominale par token | 500 XAF |
| Base de calcul du rendement | Capital tokenisé de 10 000 000 XAF |

## Hypothèses opérationnelles de simulation

Le scénario de base démarre avec 3 kits vendus par mois, au prix de 450 000 XAF par kit et pour un coût d’achat de 320 000 XAF par kit. Les ventes progressent de 2 % par mois. L’activité Hotspot démarre avec 1 800 tickets mensuels à 1 000 XAF, avec une croissance mensuelle de 1,5 %.

Les charges fixes mensuelles comprennent 800 000 XAF d’abonnements Starlink, 200 000 XAF d’amortissement du matériel, 250 000 XAF de protection électrique et 350 000 XAF d’autres charges d’exploitation. Aucun impôt, frais de financement, perte sur créances, capex additionnel ou réserve de liquidité n’est modélisé dans cette étape ; le bénéfice net est donc un bénéfice net **avant ces éléments non inclus**.

## Exécution

```bash
pip install -r requirements.txt
python starlink_financial_model.py
```

Le script produit `financial_model_output.csv`, un détail mensuel réutilisable dans une analyse ultérieure.

## Résultats du scénario de base

Le script a été exécuté et validé avec Python 3.11. Les résultats sont les suivants :

| Indicateur | Résultat |
|---|---:|
| Chiffre d’affaires cumulé sur 12 mois | **41 580 501,71 XAF** |
| Bénéfice net cumulé sur 12 mois | **9 504 895,57 XAF** |
| Rendement annuel net sur capital tokenisé | **95,05 %** |
| Dividende annuel exact par token | **475,244778 XAF** |
| Bénéfice net mensuel moyen | **792 074,63 XAF** |

Le dividende théorique par token est calculé ainsi :

```text
Bénéfice net annuel / nombre de tokens
= 9 504 895,569353852 XAF / 20 000
= 475,24477846769264 XAF par token
```

En cas de distribution intégrale et sans arrondi, le total distribué serait égal à 9 504 895,569353852 XAF. En pratique, toute politique de distribution devrait définir le traitement des fractions de XAF, les réserves, les taxes, les pertes éventuelles et les conditions juridiques applicables au Tchad.

## Fichiers

- `starlink_financial_model.py` : script de simulation Pandas/NumPy sur 12 mois.
- `financial_model_output.csv` : sortie mensuelle générée par le script.
- `requirements.txt` : dépendances Python.

## Limites et prochaines étapes RWA

Le modèle ne vérifie pas la disponibilité commerciale ou réglementaire des services Starlink, les coûts d’importation, la fiscalité tchadienne, les autorisations d’exploitation de hotspots, la conformité AML/KYC, la qualification juridique des tokens, la garde des actifs, ni les droits des porteurs. Ces sujets doivent faire l’objet d’une validation locale avant toute levée de fonds ou commercialisation.

Les prochaines améliorations possibles sont un scénario prudent/base/haut, la fiscalité, le besoin en fonds de roulement, les investissements matériels, une réserve de trésorerie, les règles de distribution et un registre de détention des tokens.
