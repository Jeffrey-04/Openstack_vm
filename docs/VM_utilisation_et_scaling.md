# Utilisation des VMs et tests de scaling

## Utilisation de la VM créée

### Accès terminal : SSH

Il n’y a **pas de terminal intégré** dans l’application. L’utilisateur utilise sa VM depuis son propre ordinateur en **SSH** :

1. Aller sur la page **Mes VMs** puis **Voir détail** sur la VM.
2. Dans la section **Accès root**, copier la commande affichée : `ssh root@<IP>`.
3. Sur sa machine :
   - **Linux / macOS** : ouvrir un terminal et coller la commande, puis entrer le mot de passe root.
   - **Windows** : utiliser PuTTY ou le terminal OpenSSH (Windows 10/11) avec la même commande.
4. Le mot de passe root peut être modifié via **Paramètres** (lien « Modifier » sur la page détail).

### Console navigateur (noVNC)

Si votre déploiement OpenStack expose une console noVNC, l’accès se fait en général depuis le dashboard OpenStack (Horizon), pas depuis cette application. La page détail VM indique cette possibilité à l’utilisateur.

---

## Scale up et scale down : workflow et tests

### Comportement

- **Scale up** : lorsque l’utilisation (CPU ou autre métrique selon la politique) dépasse le **seuil haut**, l’auto-scaler passe la VM à un flavor plus grand (selon la règle globale admin).
- **Scale down** : lorsque l’utilisation redescend sous le **seuil bas**, la VM est redimensionnée vers le **flavor de base** (celui enregistré dans la politique pour cette VM).

### Où voir et configurer la politique

- **Page détail VM** (`/client/vms/:id` ou `/admin/vms/:id`) :
  - Section **Scaling automatique** : affichage des seuils (scale up / scale down) et de l’**historique des scale**.
  - Pour modifier les seuils ou activer/désactiver le scaling, utiliser l’API ou une future page « Politique de scaling » (PUT `/api/vms/:id/scaling-policy`).

### Comment tester le scale up

1. Créer une VM avec une **politique de scaling** (seuil haut ex. 80 %, seuil bas ex. 20 %).
2. S’assurer que la **règle de scale up** est configurée (admin : **Règle de scale up**), avec un flavor cible plus grand que le flavor de base.
3. Sur la VM, générer de la charge (ex. `stress-ng --cpu 2` ou script qui monte le CPU).
4. Attendre que les **métriques** (CPU) remontent dans l’application (section « Utilisation des ressources » et métriques collectées par l’auto-scaler).
5. Quand la moyenne dépasse le seuil haut, l’auto-scaler déclenche un **resize** vers le flavor supérieur.
6. Vérifier dans la page détail : **Plan actuel** (cœurs, RAM, disque) et **Historique des scale** (événement de type scale up).

### Comment tester le scale down

1. Partir d’une VM déjà scale up (flavor agrandi).
2. Arrêter la charge (arrêt de `stress-ng` ou du script).
3. Attendre que les métriques redescendent **sous le seuil bas**.
4. Après le délai de cooldown, l’auto-scaler doit redimensionner la VM vers le **flavor de base**.
5. Vérifier dans la page détail : **Plan actuel** et **Historique des scale** (événement scale down).

### Incohérences à éviter

- **Flavor de base** : la politique doit avoir un `baseFlavorId` cohérent avec le flavor actuel de la VM avant tout scale up ; sinon le scale down peut viser un mauvais flavor.
- **Cooldown** : entre deux scale (up ou down), un cooldown (ex. 5 min) est appliqué pour éviter les aller-retours.
- **Droits** : les routes scaling (politique, métriques, historique) sont protégées et vérifient que la VM appartient à l’utilisateur (`ensureVmOwnership`).

---

## Résumé

| Besoin | Où / Comment |
|--------|------------------|
| Utiliser la VM (terminal) | SSH depuis sa machine : `ssh root@<IP>` (commande sur la page détail VM). |
| Modifier le mot de passe root | Paramètres (lien « Modifier » sur la page détail). |
| Voir ressources (CPU, RAM, etc.) | Page détail VM, section « Utilisation des ressources ». |
| Voir / tester scale up | Politique avec seuil haut ; générer charge ; vérifier « Plan actuel » et « Historique des scale ». |
| Voir / tester scale down | Réduire charge sous seuil bas ; après cooldown, vérifier « Plan actuel » et historique. |
