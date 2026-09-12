# SMAXO ePOS industriel

L’ePOS charge `tarifs.json` et `tickets_pool.json`, affiche les neuf forfaits officiels et distribue le premier ticket disponible correspondant au profil choisi. Le pool respecte les statuts terrain `disponible` et `utilisé`; les tickets déjà consommés par le routeur sont exclus avant affichage. Le navigateur conserve les codes distribués dans `localStorage` sous `smaxo_epos_sold_tickets_v1` afin d’éviter un doublon sur l’appareil.

Le payload financier envoyé au store REST est :

```json
{
  "ticket": "2H11000",
  "method": "Espèces",
  "amount": 100,
  "timestamp": 1789210000000
}
```

Pour brancher un endpoint cloud authentifié, définir `window.SMAXO_EPOS_API` avant le chargement de `app.js`. L’endpoint doit accepter `POST` pour une vente. Sans endpoint configuré, le fallback `localStorage` et `BroadcastChannel` synchronise immédiatement les onglets ePOS et Dashboard du même navigateur ; il ne constitue pas un registre transactionnel multi-appareils.
