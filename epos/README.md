# SMAXO ePOS

L’ePOS émet des tickets de 500 XAF et construit le payload REST suivant :

```json
{
  "ticket": "SMAXO-1234",
  "method": "Espèces",
  "amount": 500,
  "timestamp": 1789210000000
}
```

Pour brancher un store REST réel, définir `window.SMAXO_EPOS_API` avant le chargement de `app.js`. Le endpoint doit accepter `POST` pour une vente et `GET` pour retourner un tableau de ventes, ou un objet contenant `record` ou `sales`.

Sans endpoint configuré, l’application utilise un store asynchrone same-origin basé sur `localStorage` et `BroadcastChannel`. Il synchronise immédiatement les onglets ePOS et Dashboard du même navigateur, sans exposer de clé API. Ce mode ne constitue pas une base cloud multi-appareils ; une API authentifiée est nécessaire pour une synchronisation inter-kiosques.
