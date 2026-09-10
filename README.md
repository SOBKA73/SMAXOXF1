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

## Étape 2 — Infrastructure Blockchain Arbitrum

### Contrat

Le contrat [`contracts/StarlinkRwaToken.sol`](contracts/StarlinkRwaToken.sol) implémente un ERC-20 permissionné avec OpenZeppelin `ERC20`, `Ownable` et `ReentrancyGuard`.

| Paramètre | Valeur |
|---|---:|
| Nom | `SMAXO Starlink Chad` |
| Symbole | `SMAXOF1` |
| Décimales | `0` |
| Offre fixe | `20 000` tokens |
| Valeur économique de référence | `500 XAF / token` |
| Capital fondateur physique | `10 000 000 XAF` |
| Levée représentée par les tokens | `10 000 000 XAF` |
| Capital global d’exploitation cible | `20 000 000 XAF` |

Le contrat ne crée pas et ne transfère pas automatiquement les 10 000 000 XAF physiques du fondateur : cette composante reste un apport hors chaîne qui doit être documenté, vérifié et comptabilisé. Le smart contract représente la tranche tokenisée de 20 000 unités.

### Whitelist KYC / restriction de transfert

Le gérant, détenteur de l’ownership, utilise `setWhitelist(address, bool)` ou `setWhitelistBatch(address[], bool)` après validation KYC/AML. Un transfert est accepté uniquement si l’adresse émettrice et l’adresse réceptrice sont whitelistées. Cette vérification est placée dans `_update`, ce qui couvre les transferts ERC-20 et les opérations de mint/burn selon leur origine. Le déploiement whitelist automatiquement l’owner afin qu’il puisse distribuer les tokens aux investisseurs approuvés.

La whitelist on-chain ne remplace pas un dossier KYC, un contrôle de sanctions, les obligations de tenue de registre ou une autorisation ARCEP. La révocation d’une adresse empêche ses transferts ultérieurs, mais ne supprime pas son solde ni ses droits économiques déjà accumulés ; la politique juridique correspondante doit être arrêtée avant déploiement.

### Distribution des rendements

Deux mécanismes sont disponibles :

1. `distributeDividends()` accepte de l’ETH natif Arbitrum et crédite un cumul de dividende par token.
2. `distributeStablecoin(uint256)` prélève un stablecoin préconfiguré auprès de l’owner après approbation ERC-20.

Les investisseurs utilisent ensuite `claimNativeDividends()` ou `claimStableDividends()`. Le calcul est strictement proportionnel au solde détenu au moment de la distribution et conserve les droits lors des transferts grâce à une comptabilité par corrections magnifiées. Le modèle est volontairement **pull-based** : il ne boucle pas sur toutes les adresses whitelistées, ce qui évite une transaction impossible à exécuter lorsque le nombre d’investisseurs augmente. Les montants non réclamés restent dans le contrat jusqu’à la réclamation.

Le stablecoin est injecté au constructeur et doit être l’adresse officielle du réseau ciblé. Aucun stablecoin n’est hardcodé dans le contrat afin d’éviter un mauvais réseau ou une adresse obsolète.

### Compilation, tests et déploiement

Les commandes suivantes sont disponibles :

```bash
npm install
npm run compile
npm test

# Testnet Arbitrum Sepolia
export ARBITRUM_SEPOLIA_RPC_URL="..."
export DEPLOYER_PRIVATE_KEY="..."
export DIVIDEND_STABLECOIN="0x..."
npm run deploy:sepolia
```

Le script [`scripts/deploy.js`](scripts/deploy.js) refuse de démarrer sans adresse de stablecoin explicite. Pour Arbitrum One, utiliser `npm run deploy:mainnet` après vérification indépendante de l’adresse officielle du stablecoin, du réseau, des paramètres KYC et des audits.

### Contrôles avant production

Cette implémentation est une base technique et n’est pas un audit. Avant un déploiement réel, il faut notamment faire auditer le contrat, vérifier le stablecoin choisi, tester la récupération de fonds et les scénarios de perte de clé owner, définir une gouvernance multisignature, établir une procédure de pause/réponse aux incidents, formaliser les droits économiques des tokens et confirmer la conformité CEMAC/Tchad, ARCEP, AML/KYC et valeurs mobilières. Le contrat ne contient volontairement aucune fonction de confiscation ou de gel discrétionnaire des soldes.

## Étape 3 — Dashboard Web3 interactif

Le dossier [`frontend`](frontend/) contient une Single Page Application en JavaScript natif, sans framework ni backend. Elle adopte une direction visuelle sombre, épurée et dégradée inspirée des dashboards SaaS modernes.

### Ouvrir le prototype

Depuis la racine du dépôt, ouvrir directement `frontend/index.html` dans un navigateur moderne, ou lancer un serveur statique :

```bash
npx serve frontend -l 4173
```

Puis visiter `http://localhost:4173`.

### Interactions disponibles

- **Connecter le portefeuille** : bascule vers le portefeuille simulé `0xSOBK...73`, affiche 100 tokens `SMAXOF1`, une valeur nominale de 50 000 XAF et le statut KYC vérifié.
- **Réclamer mes dividendes** : déclenche une animation de chargement, confirme la réclamation simulée de 53 550 XAF et remet le compteur à zéro.
- **Gestionnaire / KYC** : le formulaire ajoute visuellement une adresse ou un alias à la liste blanche simulée.
- **Performance RWA** : affiche le capital global de 20 000 000 XAF, les 20 000 tokens, le bénéfice net de 10 710 000 XAF et le Yield net réel de 107,10 %.

Cette interface est une démonstration locale : elle ne demande aucune signature, ne se connecte pas réellement à Arbitrum et ne transfère aucun actif. Le branchement à `StarlinkRwaToken.sol` devra être ajouté après configuration du réseau, de l’adresse du contrat, du stablecoin officiel et des procédures KYC/AML.

## Publication permanente du frontend

Le prototype est versionné dans `main` et accessible via le CDN public jsDelivr, qui sert directement les fichiers du dépôt :

**https://cdn.jsdelivr.net/gh/SOBKA73/SMAXOXF1@main/frontend/index.html**

Cette URL suit la version publiée sur `main` et permet d’ouvrir le dashboard sans serveur local. Le workflow [`deploy-pages.yml`](.github/workflows/deploy-pages.yml) est également présent pour une publication GitHub Pages officielle dès que Pages est activé dans **Settings → Pages → Source: GitHub Actions** du dépôt.

