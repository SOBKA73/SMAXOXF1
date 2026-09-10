# SMAXOXF1 — Modèle RWA Starlink / Hotspot à N’Djamena

## Objet et avertissement

Ce dépôt contient une simulation financière Python pour une structure basée à N’Djamena (Tchad), combinant la vente-installation de kits Starlink et l’exploitation de cinq Hotspots Wi-Fi communautaires. Le modèle est un outil de pré-modélisation RWA : il ne constitue ni une offre au public, ni une promesse de rendement, ni un avis juridique, fiscal ou réglementaire.

Les paramètres tarifaires et les obligations d’autorisation doivent être confirmés directement avec Starlink, l’ARCEP et les conseils locaux avant toute exploitation commerciale, collecte de fonds ou émission de tokens.

## Allocation initiale du capital

Le modèle réconcilie intégralement les 10 000 000 XAF de capital tokenisé :

| Emploi du capital | Montant |
|---|---:|
| Achat de 15 kits Starlink à 400 000 XAF | 6 000 000 XAF |
| Onduleurs, batteries et sécurisation électrique | 1 500 000 XAF |
| Frais initiaux de conformité légale | 500 000 XAF |
| Fonds de roulement conservé en trésorerie | 2 000 000 XAF |
| **Total** | **10 000 000 XAF** |

La structure de tokenisation reste fixée à **20 000 tokens de 500 XAF**. Le fonds de roulement est conservé comme trésorerie de départ et n’est pas distribué dans la simulation.

## Hypothèses commerciales recalibrées

### Vente de kits

Le scénario vend 15 kits sur 12 mois selon le rythme suivant : `1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 2`. Le coût unitaire est de 400 000 XAF. La contrainte de marge brute de 20 % est appliquée sur le prix de vente :

```text
Prix de vente = 400 000 / (1 - 20 %) = 500 000 XAF
Marge brute par kit = 500 000 - 400 000 = 100 000 XAF
```

Cette convention évite de confondre une marge de 20 % sur le prix de vente avec une majoration de 20 % du coût.

### Hotspots communautaires

Le modèle comprend cinq Hotspots actifs. Comme le nombre de micro-tickets et leur prix n’étaient pas précisés, une hypothèse opérationnelle explicite est utilisée : **20 tickets par Hotspot et par jour**, **26 jours d’exploitation par mois**, à **500 XAF le ticket**. Cela représente 2 600 tickets et 1 300 000 XAF de recettes Hotspot par mois.

Cette hypothèse doit être remplacée par des données terrain : comptage des utilisateurs, taux de conversion, durée moyenne de session, saisonnalité, prix acceptable par quartier et taux d’impayés.

## Charges et fiscalité

Les charges mensuelles modélisées sont :

| Charge | Calcul mensuel |
|---|---:|
| Abonnements Starlink illimités | 5 × 32 000 = 160 000 XAF |
| Maintenance | 5 × 15 000 = 75 000 XAF |
| **Total charges récurrentes hors coût des kits** | **235 000 XAF** |

Le montant de **32 000 XAF par Hotspot et par mois** est traité comme l’hypothèse réglementaire et tarifaire fournie pour cette étape. Des sources publiques rapportent une offre illimitée Starlink au Tchad à 32 000 XAF mensuels, tandis que l’encadrement de la revente et des zones Wi-Fi reste un sujet de conformité à documenter localement ([TchadInfos, 2025](https://tchadinfos.com/2025/07/04/larcep-annonce-loperationnalisation-de-starlink-au-tchad-avec-un-acces-internet-haut-debit-a-des-prix-competitifs/), [Logistics Cluster, contexte réglementaire](https://logcluster.org/fr/node/48156)). Ces références publiques ne remplacent pas une confirmation écrite de l’ARCEP.

Le résultat d’exploitation est calculé après coût des kits vendus, abonnements et maintenance. Une déduction automatique de **25 %** est ensuite appliquée uniquement lorsque le résultat d’exploitation est positif :

```text
Impôt = max(0, résultat d’exploitation × 25 %)
Bénéfice net distribuable = résultat d’exploitation - impôt
```

## Résultats du scénario recalibré

Le script a été exécuté sur 12 mois avec Python 3.11 et validé par des contrôles de cohérence : allocation du capital à 10 000 000 XAF, 15 kits vendus au maximum, 12 périodes mensuelles et absence d’impôt négatif.

| Indicateur | Résultat |
|---|---:|
| Chiffre d’affaires annuel | **23 100 000,00 XAF** |
| Résultat d’exploitation annuel | **14 280 000,00 XAF** |
| Impôts locaux simulés à 25 % | **3 570 000,00 XAF** |
| Bénéfice net après impôts | **10 710 000,00 XAF** |
| Yield net réel / capital tokenisé | **107,10 %** |
| Dividende exact par token | **535,50 XAF** |
| Trésorerie fin M12 avant distribution | **12 710 000,00 XAF** |

Le dividende théorique est donc :

```text
10 710 000 XAF / 20 000 tokens = 535,50 XAF par token
```

Le rendement élevé est principalement expliqué par l’hypothèse de cinq Hotspots générant chacun 20 tickets payants par jour à 500 XAF. Il s’agit d’un résultat de scénario, pas d’un rendement garanti. Une analyse de sensibilité sur l’utilisation réelle des Hotspots est indispensable avant toute tokenisation.

## Exécution

```bash
pip install -r requirements.txt
python starlink_financial_model.py
```

Le script génère `financial_model_output.csv`, qui contient le détail mensuel des ventes, recettes, coûts, impôts, bénéfices cumulés, stock résiduel et trésorerie avant distribution.

## Conformité ARCEP et risques à traiter avant les smart contracts

L’exploitation d’une zone Wi-Fi qui revend ou partage une connexion Starlink doit être validée avec l’ARCEP et les autorités compétentes. Le modèle ne présume pas que le paiement d’un abonnement Starlink autorise automatiquement la revente d’accès à des tiers. Il faut notamment confirmer la licence ou l’autorisation applicable, l’identification des utilisateurs, les obligations de conservation ou de sécurité des données, les règles de facturation, les conditions contractuelles Starlink, l’importation des équipements, la fiscalité locale et la conformité de l’offre de tokens.

Les smart contracts ne doivent être développés qu’après validation documentaire de ces points, ainsi que de la nature juridique des tokens, des droits économiques, de la politique de réserve, du mécanisme de distribution et des procédures KYC/AML.

## Fichiers

- `starlink_financial_model.py` : modèle Pandas/NumPy recalibré sur 12 mois.
- `financial_model_output.csv` : nouvelle base de données mensuelle générée par le script.
- `requirements.txt` : dépendances Python.
