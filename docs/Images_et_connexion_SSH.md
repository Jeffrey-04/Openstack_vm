# Ajouter une nouvelle image et résoudre les problèmes de connexion SSH

## Ajouter une nouvelle image pour la création de VM

Les images disponibles lors de la création d’une VM viennent du catalogue **Glance** (OpenStack). Pour ajouter une nouvelle image :

### 1. Créer l’image dans OpenStack (ligne de commande)

Depuis la machine où le client OpenStack est configuré (ou depuis le nœud DevStack) :

```bash
# Télécharger une image cloud (ex. Ubuntu 22.04)
wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Créer l’image dans Glance
openstack image create "Ubuntu 22.04" \
  --file jammy-server-cloudimg-amd64.img \
  --disk-format qcow2 \
  --container-format bare \
  --visibility public
```

Vous récupérez un **ID d’image** (UUID). C’est cet ID qui doit être utilisé dans l’application (ou dans les templates VM admin).

### 2. Utiliser l’image dans l’application

- **Côté admin** : dans les **Templates VM** (Admin → Templates), créer ou modifier un template en renseignant le `imageId` correspondant à la nouvelle image Glance.
- **Côté création de VM** : si l’interface propose une liste d’images, celle-ci est remplie par l’API Glance (`/images`) ; la nouvelle image apparaît après ajout dans OpenStack.

### 3. Avec DevStack

- Les images peuvent être ajoutées via Horizon (Project → Compute → Images → Create Image) ou en CLI comme ci-dessus.
- Vérifier que le service Glance est bien démarré : `systemctl list-units | grep glance` ou équivalent dans votre installation.

---

## Problèmes de connexion SSH

### Symptômes courants

- **Connexion refusée (Connection refused)** : le port 22 n’est pas ouvert ou le service SSH n’est pas démarré dans la VM.
- **Timeout / pas de réponse** : le réseau (groupe de sécurité, pare-feu, IP flottante) bloque l’accès.
- **Authentification refusée** : clé SSH non reconnue ou mot de passe incorrect.

### 1. Vérifier l’accès réseau

- La VM doit avoir une **IP joignable** depuis votre poste (IP flottante ou réseau public selon le déploiement).
- Dans OpenStack : **Réseau → FIPs** : associer une IP flottante à l’instance si elle n’a que une IP privée.
- **Groupes de sécurité** : la règle **SSH (TCP 22)** doit autoriser l’entrée depuis votre IP (ou 0.0.0.0/0 pour les tests).

### 2. Vérifier SSH dans la VM

- Se connecter via la **console** OpenStack (noVNC) pour ouvrir un terminal dans la VM.
- Vérifier que le service SSH tourne :
  - Debian/Ubuntu : `sudo systemctl status ssh`
  - Si besoin : `sudo systemctl enable ssh && sudo systemctl start ssh`
- Vérifier que le port 22 écoute : `ss -tlnp | grep 22` ou `netstat -tlnp | grep 22`.

### 3. Connexion avec mot de passe (sans clé)

- Les images **cloud** (cloud-init) sont souvent configurées pour n’accepter que les clés SSH. Pour autoriser le mot de passe :
  - Se connecter en console (noVNC), puis :
    - `sudo passwd root` (définir un mot de passe root)
    - Éditer `/etc/ssh/sshd_config` : `PasswordAuthentication yes`, puis `sudo systemctl restart ssh`
- Sous Windows avec **PuTTY** : host = IP de la VM, port 22, connection type SSH ; puis saisir l’utilisateur (ex. `root`) et le mot de passe quand demandé.

### 4. Connexion avec clé SSH

- Lors de la création de la VM (OpenStack), une clé peut être injectée via **Keypair**.
- Sur votre poste : `ssh -i chemin/vers/ma_cle root@<IP_VM>`.
- Sous PuTTY : configurer la clé dans Connection → SSH → Auth → Private key file.

### 5. IPv6

- Si l’application affiche une adresse **IPv6** (ex. `2001:db8::97`) : depuis un client SSH, utiliser `ssh root@2001:db8::97` si votre réseau supporte IPv6.
- Si votre accès n’est qu’en IPv4, utiliser l’**IPv4** de la VM (adresse flottante ou réseau public) affichée sur la page détail VM.

---

## Résumé

| Besoin | Action |
|--------|--------|
| Nouvelle image pour créer des VMs | Créer l’image dans Glance (CLI ou Horizon), puis l’associer à un template VM dans l’admin. |
| SSH refusé / timeout | Vérifier IP flottante, groupe de sécurité (TCP 22), et service SSH dans la VM (console noVNC). |
| Connexion sans clé (mot de passe) | Activer `PasswordAuthentication` dans la VM et définir un mot de passe root. |
| Connexion avec PuTTY | Host = IP de la VM, port 22, puis utilisateur et mot de passe ou clé privée. |
