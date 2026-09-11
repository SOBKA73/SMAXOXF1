# Rapport d’audit de sécurité — SMAXO Starlink Chad

**Version du rapport :** 1.0  
**Périmètre :** `contracts/StarlinkRwaToken.sol` et ses dépendances OpenZeppelin utilisées par le projet  
**Date de revue :** 11 septembre 2026  
**Réseau de référence :** Arbitrum Sepolia  
**Méthode :** revue manuelle ciblée, compilation Hardhat, tests unitaires et analyse statique Slither

> **Nature du document.** Ce rapport est une revue technique interne gratuite. Il ne constitue pas une certification CertiK, un audit formel OpenZeppelin, une garantie d’absence de vulnérabilité ni un avis juridique ou financier. Une revue indépendante reste recommandée avant toute émission publique, collecte de fonds ou utilisation en production.

## 1. Résumé exécutif

Le contrat `StarlinkRwaToken` implémente un ERC-20 à décimales nulles, un contrôle de transfert par liste blanche et une distribution de dividendes native/stablecoin selon un modèle cumulatif par token. La revue a confirmé l’utilisation de composants OpenZeppelin standards, le contrôle d’accès `Ownable`, la protection `ReentrancyGuard` sur les deux fonctions de réclamation et l’absence de débordement arithmétique exploitable dans le périmètre observé sous Solidity 0.8.x.

Les tests Hardhat du projet passent avec **4 tests réussis**. Slither n’a remonté aucune alerte High ou Medium dans l’analyse exécutée. Il a toutefois remonté des observations Low/Informational documentées dans ce rapport : un appel externe `transferFrom` dans la distribution stablecoin avant la mise à jour du cumul, un appel bas niveau contrôlé pour le paiement ETH, l’usage de plusieurs contraintes pragma provenant notamment d’OpenZeppelin et la version compilateur `^0.8.20` signalée par Slither comme pouvant contenir des bugs connus de Solidity.

## 2. Évaluation globale du risque

**Niveau global proposé : RISQUE FAIBLE — sous réserve des réserves et recommandations de ce rapport.**

Cette appréciation est limitée à la logique revue et aux tests présents dans le dépôt. Elle ne couvre pas la sécurité de la clé Owner, du stablecoin configuré, du navigateur, de MetaMask, des secrets GitHub, des procédures KYC/AML, de l’infrastructure de déploiement ni des hypothèses réglementaires tchadiennes.

## 3. Vérifications effectuées

| Domaine | Vérification | Résultat |
|---|---|---|
| ERC-20 | Héritage OpenZeppelin `ERC20`, supply fixe et décimales nulles | Conforme au périmètre |
| Contrôle d’accès | `Ownable` sur `setWhitelist`, `setWhitelistBatch`, `distributeDividends` et `distributeStablecoin` | Conforme |
| Whitelist | Émetteur et récepteur doivent être whitelistés dans `_update` | Conforme au périmètre testé |
| Réentrance des claims | `nonReentrant` sur `claimNativeDividends` et `claimStableDividends` | Conforme |
| Paiement ETH | État de claim mis à jour avant l’appel externe et résultat booléen contrôlé | Conforme, observation Low-level call documentée |
| Stablecoin | Retour booléen de `transferFrom` et `transfer` contrôlé | Conforme pour un ERC-20 standard |
| Arithmétique | Solidity 0.8.x avec contrôles natifs d’overflow/underflow | Aucun overflow exploitable observé |
| Distribution | Comptabilité cumulative par token et corrections de transfert | Tests pro-rata passants |
| Réception ETH | Fonction `receive()` refuse les dépôts directs | Conforme à l’intention documentée |
| Tests | Compilation et suite Hardhat | **4/4 réussis** |
| Analyse statique | Slither via framework Hardhat, dépendances exclues des résultats principaux | Scan terminé, 5 observations Low/Informational |

## 4. Résultats détaillés

### 4.1. Aucun finding High ou Medium identifié

Slither n’a identifié aucune vulnérabilité classée High ou Medium dans le scan exécuté. La revue manuelle n’a pas identifié de défaut critique dans les contrôles `Ownable`, la restriction de transfert, la comptabilité des dividendes ou la protection des claims.

### 4.2. Réentrance des fonctions de réclamation — contrôle satisfaisant

`claimNativeDividends()` et `claimStableDividends()` sont protégées par `ReentrancyGuard` via le modificateur `nonReentrant`. Dans la fonction native, `nativeDividendsClaimed[msg.sender]` est incrémenté avant l’appel bas niveau payable. Dans la fonction stablecoin, `stableDividendsClaimed[msg.sender]` est incrémenté avant l’appel ERC-20. En cas d’échec du transfert, la transaction est revert et la mise à jour d’état est annulée atomiquement.

**Conclusion :** aucune réentrance exploitable n’a été identifiée sur les fonctions de claim dans le périmètre analysé.

### 4.3. Observation Low — appel externe dans `distributeStablecoin`

Slither signale `reentrancy-benign` et `reentrancy-events` sur `distributeStablecoin(uint256)`, car `dividendStablecoin.transferFrom(...)` est appelé avant l’incrément de `magnifiedStableDividendPerShare`. Le stablecoin est une adresse immutable fournie au constructeur et un ERC-20 standard n’exécute pas de callback arbitraire pendant `transferFrom`. Slither classe cette observation comme bénigne dans ce contexte, mais le risque dépend de la confiance accordée à l’adresse du stablecoin configurée.

**Recommandation :** conserver uniquement une adresse stablecoin officielle et auditée ; envisager l’ajout de `nonReentrant` à `distributeStablecoin` et/ou une bibliothèque SafeERC20 lors d’une prochaine révision, puis re-tester et redéployer si le bytecode change.

### 4.4. Observation Informational — appel bas niveau ETH contrôlé

Slither signale l’appel bas niveau de `claimNativeDividends`. Cet appel est nécessaire pour envoyer de l’ETH à un bénéficiaire payable. Le retour booléen est vérifié, et le compteur de dividendes est mis à jour avant l’appel. La présence de `ReentrancyGuard` limite le risque de réentrée dans le contrat.

**Recommandation :** conserver le contrôle du retour et documenter que le claim peut échouer si le bénéficiaire est un contrat qui refuse l’ETH.

### 4.5. Observations Informational — pragma et version Solidity

Slither relève plusieurs contraintes de version provenant de Solidity et des interfaces OpenZeppelin (`^0.8.20`, `>=0.8.4`, `>=0.4.16`, `>=0.6.2`). Il relève également des bugs connus associés à la plage `^0.8.20`.

**Recommandation :** verrouiller une version de compilateur précise et validée dans la configuration de build lors d’une prochaine release, puis vérifier la compatibilité avec les contrats OpenZeppelin retenus. Toute mise à niveau doit faire l’objet d’une nouvelle compilation, d’une nouvelle suite de tests et, si le bytecode change, d’un nouveau déploiement.

## 5. Contrôles fonctionnels exécutés

La suite Hardhat du dépôt a produit le résultat suivant :

```text
4 passing
```

Les scénarios couverts vérifient la supply exacte de 20 000 tokens avec zéro décimale, le blocage d’un destinataire non whitelisté, l’autorisation d’un transfert après whitelist, la distribution native pro-rata avec claim et la distribution stablecoin pro-rata.

## 6. Limites de la revue

La revue ne comprend pas de fuzzing approfondi, d’analyse formelle, de test de propriétés avec Echidna, de test d’invariant sur une longue séquence de transferts, d’audit de l’implémentation stablecoin réellement configurée, de revue juridique de la tokenisation RWA, de test économique du rendement ou de vérification exhaustive de l’infrastructure GitHub/MetaMask.

Le contrat ne contient pas de pause d’urgence, de mécanisme multisignature ou de récupération administrative des fonds. La perte ou la compromission de la clé Owner est donc un risque opérationnel important, même si aucun défaut d’accès n’a été identifié dans le code revu.

## 7. Recommandations avant production

Avant toute utilisation avec des fonds ayant une valeur réelle, il est recommandé de faire auditer une version figée par un tiers indépendant, de placer l’Owner derrière une multisignature, de documenter une procédure de rotation de clés, de valider l’adresse du stablecoin sur le réseau exact, d’ajouter des tests de fuzzing et d’invariants, de considérer `SafeERC20`, de traiter l’observation sur `distributeStablecoin` et de formaliser la gouvernance KYC/AML et la conformité ARCEP/CEMAC.

## 8. Conclusion

Sur la base de la revue manuelle, des tests Hardhat et du scan Slither exécuté, le contrat présente un **risque technique global faible dans son périmètre actuel**, sans finding High ou Medium identifié. Les fonctions de claim sont protégées contre la réentrance par `ReentrancyGuard`, les fonctions sensibles sont restreintes par `Ownable`, et les transferts sont conditionnés par la whitelist. Les observations Low/Informational listées ci-dessus doivent néanmoins être traitées ou acceptées explicitement avant une utilisation en production.

## 9. Remédiations post-audit — version renforcée du code

Une version renforcée de `StarlinkRwaToken.sol` a été préparée après la revue Slither. Le pragma du contrat principal est maintenant figé sur `0.8.20`, `SafeERC20` est utilisé pour les transferts du stablecoin, et `distributeStablecoin()` est protégé par `nonReentrant`. Les observations Low liées à `transferFrom` et aux appels externes du stablecoin sont ainsi remédiées au niveau du contrat principal.

Le module opérationnel ajoute également `Pausable`, avec `pause()` et `unpause()` réservées à l’Owner. La fonction `emergencyRecoverTokens(lostAddress, newAddress)` est utilisable uniquement lorsque le contrat est en pause, exige que les deux adresses soient whitelistées et transfère le solde de l’adresse perdue en conservant le chemin comptable interne des dividendes. Cette fonction doit être utilisée uniquement après une validation KYC/AML et une preuve hors chaîne de perte de clé.

La suite Hardhat renforcée compte désormais **6 tests réussis** : supply et décimales, whitelist et transferts, dividendes natifs, dividendes stablecoin avec SafeERC20, pause/contrôle Owner et récupération d’un portefeuille perdu.

Le nouveau scan Slither ne remonte plus les observations Low de réentrance sur `distributeStablecoin`. Il conserve uniquement des observations Informational : l’appel bas niveau nécessaire au paiement ETH dans `claimNativeDividends()` et les contraintes pragma des dépendances OpenZeppelin/interfaces. Ces éléments sont documentés, contrôlés et acceptés dans le périmètre actuel ; ils ne constituent pas des findings High, Medium ou Low sur le contrat principal.

## 10. Statut de déploiement de la version renforcée

La version renforcée a été redéployée avec succès sur Arbitrum Sepolia. L’adresse officielle V2 est [`0x8f08e75BaAA54987cB5C0894d55817c41120f418`](https://sepolia.arbiscan.io/address/0x8f08e75BaAA54987cB5C0894d55817c41120f418). L’ABI publiée dans `frontend/deployment.json` contient `pause`, `unpause` et `emergencyRecoverTokens`.

Le code renforcé, les tests, le frontend et cette documentation sont publiés dans le dépôt. Le déploiement V2 remint la supply initiale et ne migre pas automatiquement les soldes ni les droits économiques de V1. Une procédure de migration des détenteurs V1 doit donc être validée par l’Owner avant toute distribution économique V2.
