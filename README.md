# SMAXOXF1 — SMAXO Starlink Tchad

## Dossier de présentation du projet

**SMAXOXF1** est un prototype de plateforme RWA (*Real-World Assets*) qui relie une activité de connectivité Wi-Fi à N’Djamena, un tableau de bord financier et un jeton ERC-20 déployé sur **Arbitrum Sepolia**, réseau de test.

Ce dépôt est destiné à la revue technique, financière et opérationnelle du projet. Les chiffres financiers sont des hypothèses de scénario. Le contrat et les flux de paiement sont actuellement utilisés dans un environnement de test. Le dépôt ne constitue pas une offre au public, une garantie de rendement ou un avis juridique, fiscal et réglementaire.

## 1. Accès rapide

| Ressource | Accès |
|---|---|
| **Dashboard Web3** | [Ouvrir le dashboard public](https://sobka73.github.io/SMAXOXF1/) |
| **ePOS commerçant** | [Ouvrir l’ePOS](https://sobka73.github.io/SMAXOXF1/epos/) |
| **Dépôt GitHub** | [SOBKA73/SMAXOXF1](https://github.com/SOBKA73/SMAXOXF1) |
| **Déploiements Pages** | [GitHub Actions — Deploy Pages](https://github.com/SOBKA73/SMAXOXF1/actions/workflows/deploy-pages.yml) |
| **Simulation de marché** | [GitHub Actions — Market Simulation](https://github.com/SOBKA73/SMAXOXF1/actions/workflows/market-simulation.yml) |
| **Contrat Arbitrum Sepolia** | [Voir le contrat sur Arbiscan](https://sepolia.arbiscan.io/address/0x8f08e75BaAA54987cB5C0894d55817c41120f418) |
| **Rapport de sécurité** | [`SECURITY_AUDIT_REPORT.md`](SECURITY_AUDIT_REPORT.md) |

## 2. Résumé exécutif

Le projet modélise un réseau de **15 kits Starlink professionnels** et de **cinq Hotspots Wi-Fi communautaires**. L’ePOS permet à un commerçant de sélectionner un forfait, d’enregistrer le mode de paiement et de délivrer un code d’accès MikroTik disponible.

Le dashboard présente l’état indicatif du marché SMAXOF1, l’historique de prix simulé, des indicateurs financiers de démonstration et des contrôles Web3. Le smart contract représente une supply fixe de **20 000 tokens** avec zéro décimale dans le déploiement documenté.

L’architecture actuelle sépare clairement les composants suivants :

| Composant | Rôle | Technologie |
|---|---|---|
| Dashboard | Visualisation financière et interactions Web3 | HTML, CSS, JavaScript, Ethers.js, Chart.js |
| ePOS | Vente de forfaits et distribution de tickets MikroTik | HTML, CSS, JavaScript |
| Pool de tickets | Catalogue des codes et statuts terrain | `epos/tickets_pool.json` |
| Tarifs | Grille officielle des neuf forfaits | `epos/tarifs.json` |
| Contrat | Token SMAXOF1, whitelist, dividendes et gouvernance | Solidity, OpenZeppelin |
| Marché cloud | Mise à jour horaire d’un index indicatif | Python, GitHub Actions |
| Publication | Déploiement du frontend statique | GitHub Pages |

## 3. Démonstration recommandée au DG

### 3.1 Ouvrir le produit

Commencer par le [dashboard public](https://sobka73.github.io/SMAXOXF1/), puis ouvrir l’[ePOS commerçant](https://sobka73.github.io/SMAXOXF1/epos/) dans un second onglet.

### 3.2 Effectuer une vente ePOS

Dans l’ePOS, sélectionner un mode de paiement, puis choisir un forfait. Le système affiche le prix et le nombre de tickets disponibles pour ce profil. Après validation, il distribue le premier code disponible du pool, enregistre la vente et affiche le ticket généré.

Le catalogue actuellement versionné comprend **135 codes**. Les statuts terrain déjà identifiés comme utilisés sont exclus de l’offre. Le pool publié contient notamment **5 tickets disponibles pour le profil 2h** et **13 tickets disponibles pour le profil 4h**.

### 3.3 Vérifier la cohérence financière

Le montant de la vente est transmis sous la forme d’un payload de trésorerie contenant le ticket, le mode de paiement, le montant en XAF et l’horodatage. Le dashboard peut lire les ventes du store configuré ou, en mode de démonstration, le store local asynchrone partagé entre onglets du même navigateur.

### 3.4 Vérifier les fonctions Web3

Pour tester les fonctions on-chain, installer MetaMask, sélectionner **Arbitrum Sepolia** et utiliser un portefeuille disposant d’ETH de test. Les fonctions administratives exigent le portefeuille Owner. Les transferts et opérations soumises à whitelist doivent respecter les règles du contrat.

## 4. ePOS et catalogue MikroTik

### 4.1 Grille tarifaire

| Profil | Libellé | Prix |
|---|---|---:|
| `2h` | 2 heures | 100 XAF |
| `4h` | 4 heures | 150 XAF |
| `6h` | 6 heures | 200 XAF |
| `12h` | 12 heures | 300 XAF |
| `24h` | 24 heures | 500 XAF |
| `3j` | 3 jours | 850 XAF |
| `7j` | 7 jours | 1 350 XAF |
| `14j` | 14 jours | 2 250 XAF |
| `30j` | 30 jours | 4 200 XAF |

La grille complète est dans [`epos/tarifs.json`](epos/tarifs.json).

### 4.2 Distribution des tickets

Le fichier [`epos/tickets_pool.json`](epos/tickets_pool.json) contient le serveur, le code, le profil, l’uptime initial et le statut du ticket. Le moteur ePOS ne génère plus de code aléatoire. Il sélectionne le premier code du profil demandé dont le statut est `disponible` et qui n’a pas déjà été vendu sur l’appareil.

Après une vente, le code est ajouté au registre local des tickets vendus et son statut passe en mémoire à `utilisé`. Cette protection empêche une double distribution sur le même appareil. Pour une exploitation multi-kiosques, cette logique doit être remplacée ou complétée par une API transactionnelle centralisée avec verrouillage atomique.

### 4.3 Limite importante de la version actuelle

GitHub Pages est un hébergement statique. Il ne peut pas modifier directement un fichier du dépôt depuis le navigateur. Le store local et `BroadcastChannel` permettent une démonstration immédiate entre onglets du même navigateur. Une synchronisation réellement multi-kiosques nécessite un endpoint REST authentifié, une base de données et un mécanisme anti-concurrence côté serveur.

L’ePOS accepte une API configurable via `window.SMAXO_EPOS_API`. L’endpoint doit accepter `POST` pour une vente. La documentation technique se trouve dans [`epos/README.md`](epos/README.md).

## 5. Smart contract et réseau

Le contrat documenté est `StarlinkRwaToken` sur **Arbitrum Sepolia**.

| Paramètre | Valeur |
|---|---|
| Réseau | Arbitrum Sepolia |
| Chain ID | `421614` |
| Adresse du contrat V2 | [`0x8f08e75BaAA54987cB5C0894d55817c41120f418`](https://sepolia.arbiscan.io/address/0x8f08e75BaAA54987cB5C0894d55817c41120f418) |
| Nom | `SMAXO Starlink Chad` |
| Symbole | `SMAXOF1` |
| Décimales | `0` |
| Supply documentée | `20 000` tokens |
| Valeur économique de référence du scénario | `500 XAF / token` |
| ABI et métadonnées | [`frontend/deployment.json`](frontend/deployment.json) |

Le contrat utilise des contrôles de propriété, une whitelist et des fonctions de dividendes. Les fonctions d’administration doivent être testées uniquement sur le réseau de test et avec les autorisations appropriées.

## 6. Simulation financière

Le modèle financier est un scénario de présentation et non une comptabilité certifiée. Il suppose notamment 15 kits, cinq Hotspots actifs, une activité de vente de tickets et une fiscalité simulée.

| Indicateur du scénario | Valeur modélisée |
|---|---:|
| Chiffre d’affaires annuel | 23 100 000 XAF |
| Résultat d’exploitation annuel | 14 280 000 XAF |
| Impôts simulés à 25 % | 3 570 000 XAF |
| Bénéfice net après impôts | 10 710 000 XAF |
| Yield net du scénario | 107,10 % |
| Dividende théorique par token | 535,50 XAF |

Ces valeurs doivent être remplacées par les données comptables, fiscales, contractuelles et opérationnelles vérifiées avant toute décision d’investissement ou présentation comme résultat réalisé.

## 7. Architecture cloud et déploiement

Le workflow [`market-simulation.yml`](.github/workflows/market-simulation.yml) exécute périodiquement [`market_cron.py`](market_cron.py). Le script met à jour [`market_state.json`](market_state.json), un index indicatif du prix SMAXOF1, puis le frontend est publié par GitHub Pages.

Le workflow [`deploy-pages.yml`](.github/workflows/deploy-pages.yml) assemble le dossier `frontend`, y copie l’application `epos/`, puis utilise `actions/deploy-pages`. Les permissions Pages sont déclarées au niveau du workflow.

Le déploiement n’est pas un oracle de prix et ne constitue pas une transaction financière. Il publie un état de démonstration destiné à l’interface et aux tests.

## 8. Structure du dépôt

| Chemin | Description |
|---|---|
| `frontend/` | Dashboard Web3 public |
| `epos/` | Application commerçant ePOS |
| `epos/index.html` | Interface mobile ePOS |
| `epos/app.js` | Sélection, distribution et synchronisation des ventes |
| `epos/tarifs.json` | Neuf tarifs officiels |
| `epos/tickets_pool.json` | Catalogue et statuts des tickets MikroTik |
| `epos/README.md` | Configuration et limites de l’ePOS |
| `contracts/StarlinkRwaToken.sol` | Smart contract Solidity |
| `test/StarlinkRwaToken.js` | Tests Hardhat du contrat |
| `scripts/deploy.js` | Script de déploiement contrôlé |
| `market_cron.py` | Générateur d’état de marché indicatif |
| `market_state.json` | Dernier état cloud publié |
| `SECURITY_AUDIT_REPORT.md` | Rapport de sécurité du prototype |
| `.github/workflows/` | Workflows de simulation, Pages et déploiement |

## 9. Installation et tests locaux

Prérequis : Node.js, npm, Python 3 et un navigateur compatible avec MetaMask.

```bash
# Installer les dépendances JavaScript
npm install

# Compiler le contrat
npm run compile

# Exécuter les tests Solidity
npm test

# Servir le dashboard
npx serve frontend -l 4173
```

Pour tester l’ePOS localement avec son catalogue, servir directement le dossier `epos` afin que les fichiers JSON soient accessibles par `fetch` :

```bash
npx serve epos -l 4174
```

Puis ouvrir `http://localhost:4174/epos/` ou l’URL indiquée par `serve`.

## 10. Points de contrôle avant production

Avant un déploiement commercial, il faut obtenir les autorisations applicables à l’activité télécom et à la revente de connectivité. Il faut également vérifier les conditions contractuelles du fournisseur Starlink, les obligations fiscales et les règles relatives aux données personnelles.

Le modèle de tokenisation doit être revu par des conseils qualifiés pour déterminer le régime applicable aux tokens, à la levée de fonds, aux dividendes et aux investisseurs transfrontaliers dans la zone CEMAC.

L’ePOS doit être relié à une base de données serveur authentifiée. Cette base doit assurer l’unicité des tickets, la journalisation des ventes, la gestion des rôles commerçants, la reprise sur incident et la séparation entre les données de démonstration et les données de production.

Les clés Owner, les secrets GitHub et les accès aux routeurs MikroTik ne doivent jamais être commités. Les opérations administratives doivent être protégées par une gouvernance multisignature ou une procédure équivalente avant utilisation en production.

## 11. Références du dépôt

- [1] [Dashboard SMAXO public](https://sobka73.github.io/SMAXOXF1/)
- [2] [Application ePOS publique](https://sobka73.github.io/SMAXOXF1/epos/)
- [3] [Contrat SMAXOF1 sur Arbiscan Sepolia](https://sepolia.arbiscan.io/address/0x8f08e75BaAA54987cB5C0894d55817c41120f418)
- [4] [Actions de déploiement GitHub Pages](https://github.com/SOBKA73/SMAXOXF1/actions/workflows/deploy-pages.yml)
- [5] [Actions de simulation de marché](https://github.com/SOBKA73/SMAXOXF1/actions/workflows/market-simulation.yml)
- [6] [Dépôt GitHub SMAXOXF1](https://github.com/SOBKA73/SMAXOXF1)
