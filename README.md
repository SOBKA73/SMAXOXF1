# SMAXOXF1 — Tokenisation RWA Starlink / Hotspot à N’Djamena

## État actuel du projet

Le projet dispose désormais d’un modèle financier recalibré, d’un smart contract ERC-20 permissionné déployé sur **Arbitrum Sepolia** et d’un dashboard Web3 connecté à ce contrat via Ethers.js. Le site public permet de connecter MetaMask, de lire les soldes on-chain, de vérifier la whitelist et d’appeler les fonctions de réclamation et d’administration lorsque les conditions du contrat sont remplies.

> **Avertissement.** Ce dépôt est un prototype technique et financier. Il ne constitue ni une offre au public, ni une promesse de rendement, ni un avis juridique, fiscal ou réglementaire. La commercialisation d’une activité Hotspot, la conformité ARCEP, les droits des tokens, la fiscalité et les procédures KYC/AML doivent être confirmés avec des conseils qualifiés au Tchad et dans la zone CEMAC.

## Accès au dashboard

Le site GitHub Pages est accessible ici :

**[https://sobka73.github.io/SMAXOXF1/](https://sobka73.github.io/SMAXOXF1/)**

Pour utiliser les fonctions on-chain, il faut installer MetaMask, sélectionner **Arbitrum Sepolia**, disposer d’un peu d’ETH de test pour le gas et utiliser le portefeuille Owner lorsque l’action demande un privilège administrateur. Le dernier déploiement Pages réussi est consultable dans [GitHub Actions](https://github.com/SOBKA73/SMAXOXF1/actions/workflows/deploy-pages.yml).

## Contrat actuellement déployé

Le contrat `StarlinkRwaToken` est déployé sur Arbitrum Sepolia et son bytecode a été vérifié via JSON-RPC.

| Paramètre | Valeur |
|---|---|
| Réseau | Arbitrum Sepolia |
| Chain ID | `421614` |
| Adresse du contrat V2 | [`0x8f08e75BaAA54987cB5C0894d55817c41120f418`](https://sepolia.arbiscan.io/address/0x8f08e75BaAA54987cB5C0894d55817c41120f418) |
| Nom | `SMAXO Starlink Chad` |
| Symbole | `SMAXOF1` |
| Décimales | `0` |
| Offre totale | `20 000` tokens |
| Valeur économique de référence | `500 XAF / token` |
| Stablecoin configuré | `0x75Faf114eAFb1bdbe2F772238734f1841c610214` |
| Owner actuel | `0x7FC05911B8EE165da41F60fb90A971af14b6F7c5` |

La propriété a été transférée depuis le déployeur vers le portefeuille Owner ci-dessus. La transaction de transfert est visible sur [Arbiscan](https://sepolia.arbiscan.io/tx/0x9ff712900634f24b0df3640deeee8efdfb2c6ef243a15eccfa658a7bea7d6c2e). Le fichier [`frontend/deployment.json`](frontend/deployment.json) contient l’adresse, le réseau et l’ABI utilisés par le frontend.

## Fonctionnement du smart contract

Le contrat Solidity [`contracts/StarlinkRwaToken.sol`](contracts/StarlinkRwaToken.sol) utilise OpenZeppelin `ERC20`, `Ownable` et `ReentrancyGuard`. Les tokens ont zéro décimale afin de représenter exactement 20 000 parts entières.

La restriction KYC est appliquée dans `_update`. Une adresse émettrice et une adresse réceptrice doivent être whitelistées pour effectuer un transfert. L’Owner peut appeler `setWhitelist(address, bool)` ou `setWhitelistBatch(address[], bool)` après la procédure KYC/AML hors chaîne.

Les dividendes fonctionnent selon un modèle pull-based. `distributeDividends()` accepte l’ETH natif d’Arbitrum, tandis que `distributeStablecoin(uint256)` prélève le stablecoin configuré après approbation ERC-20. Les investisseurs peuvent ensuite appeler `claimNativeDividends()` ou `claimStableDividends()`. Le contrat ne boucle pas sur les détenteurs, ce qui évite une limite de gas lorsque le nombre d’investisseurs augmente.

## Dashboard Web3

Le dossier [`frontend`](frontend/) contient une Single Page Application en HTML, CSS et JavaScript natif, avec Ethers.js chargé depuis un CDN. Le fichier [`frontend/app.js`](frontend/app.js) :

- demande les comptes via `eth_requestAccounts` ;
- propose le passage vers Arbitrum Sepolia ;
- lit `balanceOf`, `isWhitelisted` et `stableDividendsOwed` ;
- appelle `claimStableDividends()` avec confirmation MetaMask ;
- vérifie `owner()` avant d’appeler `setWhitelist()` ;
- normalise les adresses Ethereum et affiche les erreurs du contrat de manière lisible.

Les actions administratives nécessitent que le portefeuille connecté soit l’Owner on-chain. La réclamation nécessite une entitlement stablecoin effectivement disponible. Le frontend ne promet pas de dividende et ne simule plus les appels lorsque les métadonnées de déploiement sont disponibles.

Pour lancer le frontend localement :

```bash
npx serve frontend -l 4173
```

Puis ouvrir `http://localhost:4173` dans un navigateur compatible avec MetaMask.

## Modèle financier RWA

Le modèle Python représente une activité de vente et d’installation de kits Starlink ainsi que cinq Hotspots Wi-Fi communautaires à N’Djamena. L’allocation initiale modélisée est la suivante :

| Emploi du capital | Montant |
|---|---:|
| 15 kits Starlink à 400 000 XAF | 6 000 000 XAF |
| Onduleurs, batteries et sécurisation électrique | 1 500 000 XAF |
| Frais initiaux de conformité légale | 500 000 XAF |
| Fonds de roulement | 2 000 000 XAF |
| **Total** | **10 000 000 XAF** |

La structure tokenisée est de 20 000 tokens de 500 XAF. Le scénario financier suppose 15 kits vendus sur douze mois, cinq Hotspots actifs, 20 tickets par Hotspot et par jour, 26 jours d’exploitation mensuels, un ticket de 500 XAF, 32 000 XAF d’abonnement mensuel par Hotspot, 15 000 XAF de maintenance mensuelle par Hotspot et une déduction fiscale simulée de 25 % du résultat d’exploitation positif.

| Indicateur du scénario | Résultat |
|---|---:|
| Chiffre d’affaires annuel | **23 100 000 XAF** |
| Résultat d’exploitation annuel | **14 280 000 XAF** |
| Impôts simulés à 25 % | **3 570 000 XAF** |
| Bénéfice net après impôts | **10 710 000 XAF** |
| Yield net sur le capital tokenisé | **107,10 %** |
| Dividende théorique par token | **535,50 XAF** |

Ces chiffres sont des hypothèses de scénario. Le rendement élevé dépend notamment du taux d’utilisation des Hotspots et doit être remplacé par des données terrain avant toute décision d’investissement.

## Conformité et risques

Le paiement d’un abonnement Starlink ne suffit pas à démontrer le droit de revendre ou de partager une connexion à des tiers. Il faut confirmer les autorisations ARCEP applicables, les conditions contractuelles Starlink, l’identification et la sécurité des utilisateurs, la conservation des données, la facturation, l’importation des équipements, la fiscalité et le régime juridique des tokens.

Avant toute levée de fonds réelle, il faut également faire auditer le contrat, vérifier le stablecoin et son réseau, définir une gouvernance multisignature, formaliser les droits économiques, sécuriser la clé Owner, documenter la réserve de trésorerie et faire valider les procédures KYC/AML et les règles relatives aux valeurs mobilières.

## Fichiers principaux

| Fichier | Rôle |
|---|---|
| `starlink_financial_model.py` | Modèle financier Pandas/NumPy sur douze mois |
| `financial_model_output.csv` | Sortie mensuelle du modèle financier |
| `requirements.txt` | Dépendances Python |
| `contracts/StarlinkRwaToken.sol` | Smart contract ERC-20 permissionné |
| `frontend/index.html` | Structure du dashboard |
| `frontend/style.css` | Design sombre responsive |
| `frontend/app.js` | Connexion MetaMask et appels Ethers.js |
| `frontend/deployment.json` | Adresse, réseau et ABI du déploiement |
| `hardhat.config.js` | Configuration Hardhat et Arbitrum Sepolia |
| `.github/workflows/deploy-pages.yml` | Publication automatique du frontend |
| `.github/workflows/deploy-contract.yml` | Déploiement contrôlé du contrat avec secrets GitHub |

## Tests et commandes

```bash
# Modèle financier
pip install -r requirements.txt
python starlink_financial_model.py

# Contrat Solidity
npm install
npm run compile
npm test

# Déploiement contrôlé sur Arbitrum Sepolia
npm run deploy:sepolia
```

Les secrets de déploiement ne doivent jamais être commités : `DEPLOYER_PRIVATE_KEY`, `ARBITRUM_SEPOLIA_RPC_URL` et `DIVIDEND_STABLECOIN` sont utilisés uniquement par GitHub Actions ou un environnement local sécurisé.

## Hardening post-audit et module de secours

Une version renforcée du contrat est maintenant présente dans `contracts/StarlinkRwaToken.sol`. Elle fige le pragma du contrat principal sur Solidity `0.8.20`, utilise `SafeERC20`, protège `distributeStablecoin()` par `nonReentrant` et ajoute `Pausable` ainsi que `emergencyRecoverTokens(lostAddress, newAddress)`. La récupération est volontairement limitée au mode pause, à l’Owner et à deux adresses whitelistées.

La suite de tests renforcée comporte six tests passants. Le frontend contient les contrôles Owner **Urgence : Geler le contrat** et **Récupération d’un portefeuille perdu**. Ces contrôles utilisent désormais l’ABI et l’adresse du contrat V2 publiées dans `frontend/deployment.json`.

> **Migration V1 → V2.** Le contrat V2 remint sa supply initiale lors du déploiement et ne migre pas automatiquement les soldes ni les droits économiques de l’ancien contrat V1. Les détenteurs V1 doivent donc être onboardés et whitelistés selon une procédure de migration documentée avant toute émission ou distribution économique V2.

## Simulation cloud du marché SMAXOF1

Le fichier [`market_cron.py`](market_cron.py) met à jour un index indicatif du prix SMAXOF1 à partir du dernier prix enregistré dans [`market_state.json`](market_state.json). Chaque exécution applique une variation aléatoire bornée entre **-1,2 % et +1,8 %**, selon un tirage normal centré sur une légère dérive positive. Cet index est une simulation transparente pour la présentation : il ne constitue pas un oracle de prix, ne crée aucune transaction et ne garantit aucune valeur de marché.

Le même état publie le bilan RWA de démonstration : **8 000 000 XAF** de capital physique, **2 000 000 XAF** de trésorerie opérationnelle, **10 710 000 XAF** de liquidité disponible simulée et une cap table **50 % fondateur / 50 % investisseurs**, soit 10 000 000 XAF par bloc.

Le workflow [`market-simulation.yml`](.github/workflows/market-simulation.yml) s’exécute toutes les heures à la minute 17 ou manuellement via `workflow_dispatch`. Il installe Python, exécute le script, puis commit uniquement `market_state.json` avec le message `🤖 Cloud Cron: Update SMAXOF1 market price`. Le push déclenche ensuite la publication GitHub Pages.

Le dashboard charge `market_state.json` sans cache, affiche le dernier prix et sa variation en vert ou rouge, trace l’historique avec Chart.js et présente les quatre cartes de transparence du bilan. Une exécution horaire peut donc générer une nouvelle publication du dashboard sans intervention manuelle.
