## DevStack – commandes d’installation et de démarrage

> Ces commandes supposent une **Ubuntu Server 22.04** propre, un utilisateur `stack` (comme recommandé par DevStack) et un accès `sudo`.  
> Adapte l’adresse IP et les mots de passe à ton contexte si nécessaire.

---

### 1. Pré‑requis système (à faire en root ou via sudo)

```bash
# Mettre le système à jour
sudo apt update && sudo apt upgrade -y

# Paquets de base
sudo apt install -y git vim curl wget net-tools python3 python3-pip python3-venv \
  build-essential software-properties-common

# Créer l’utilisateur stack (si pas déjà présent)
sudo useradd -s /bin/bash -d /opt/stack -m stack || true
echo "stack ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/stack
sudo chmod 440 /etc/sudoers.d/stack

# Se connecter en tant que stack
sudo -i -u stack
```

---

### 2. Cloner DevStack et les plugins (en utilisateur `stack`)

```bash
cd ~
git clone https://opendev.org/openstack/devstack
cd devstack

# (Optionnel) Se placer sur la branche utilisée dans ton environnement
git checkout stable/2024.2
```

---

### 3. Créer `local.conf` avec Ceilometer + Gnocchi + Aodh

Tu peux partir du `Local.conf` que nous avons déjà ajusté dans ce projet.  
Sur la machine cible, crée le fichier `local.conf` dans `~/devstack` :

```bash
cd ~/devstack
cat > local.conf << 'EOF'
[[local|localrc]]

ADMIN_PASSWORD=dreilopassword
DATABASE_PASSWORD=$ADMIN_PASSWORD
RABBIT_PASSWORD=$ADMIN_PASSWORD
SERVICE_PASSWORD=$ADMIN_PASSWORD

HOST_IP=$(hostname -I | awk '{print $1}')

export CEILOMETER_BRANCH=stable/2024.2
export AODH_BRANCH=stable/2024.2

enable_plugin ceilometer https://opendev.org/openstack/ceilometer $CEILOMETER_BRANCH
enable_plugin gnocchi https://opendev.org/openstack/gnocchi.git
enable_plugin aodh https://opendev.org/openstack/aodh $AODH_BRANCH

enable_service n-novnc
enable_service n-cauth

enable_service ceilometer-acentral
enable_service ceilometer-acompute
enable_service ceilometer-anotification
enable_service ceilometer-polling
enable_service gnocchi-api
enable_service gnocchi-metricd
enable_service gnocchi-statsd
enable_service aodh-evaluator
enable_service aodh-notifier
enable_service aodh-listener
enable_service aodh-api

disable_service tempest
disable_service swift
EOF
```

Si tu veux modifier des options (réseau, images de base, etc.), fais‑le dans ce `local.conf` avant d’exécuter `stack.sh`.

---

### 4. Lancer l’installation DevStack

```bash
cd ~/devstack
./stack.sh
```

Cette commande peut prendre **10–20 minutes** selon la machine et la connexion.  
En cas d’erreur, consulte les logs dans `/opt/stack/logs/` (par ex. `worlddump-*.txt`).

À la fin, tu dois voir un message du type :

```text
Horizon is now available at http://IP_DU_SERVEUR/dashboard
Keystone is serving at http://IP_DU_SERVEUR/identity/
DevStack Version: 2024.2
stack.sh completed in XXX seconds.
```

---

### 5. Vérifier les services OpenStack de base

Toujours en `stack` :

```bash
cd ~/devstack
source openrc admin admin

# Lister les services
openstack service list

# Vérifier Keystone
curl -s -o /dev/null -w '%{http_code}\n' http://$HOST_IP/identity/v3/

# Vérifier Nova
openstack compute service list

# Vérifier Glance
openstack image list

# Vérifier Cinder
openstack volume service list

# Vérifier Gnocchi (si exposé sur 8041)
curl -s -o /dev/null -w '%{http_code}\n' http://$HOST_IP:8041/v1/status
```

---

### 6. Démarrer/arrêter DevStack

DevStack installe les services sous **systemd**. Pour arrêter ou redémarrer proprement :

```bash
cd ~/devstack

# Arrêter tous les services DevStack
./unstack.sh

# Redémarrer après un unstack
./stack.sh

# Nettoyage complet (supprime la base, les images, etc.)
./clean.sh
```

---

### 7. Points d’intégration avec le Marketplace (DevStack)

- **Horizon (dashboard OpenStack)**:  
  `http://IP_DU_SERVEUR/dashboard`

- **Keystone (Identity v3)**:  
  `http://IP_DU_SERVEUR/identity/`

- Ces URLs sont réutilisées dans le backend du Marketplace via les variables d’environnement :
  - `KEYSTONE_URL=http://IP_DU_SERVEUR/identity/v3`
  - `NOVA_URL=http://IP_DU_SERVEUR/compute/v2.1`
  - `GLANCE_URL=http://IP_DU_SERVEUR/image`
  - `NEUTRON_URL=http://IP_DU_SERVEUR/networking`
  - `GNOCCHI_URL=http://IP_DU_SERVEUR:8041` (si Gnocchi exposé sur ce port)

Assure‑toi que ces URLs correspondent bien à ce que renvoie DevStack dans le récapitulatif de fin de `stack.sh`, puis configure les `.env` du backend/ frontend en conséquence.

---

### 8. Utiliser le Marketplace avec un OpenStack déjà installé (hors DevStack)

Si tu disposes déjà d’un cluster OpenStack (installation packagée ou managée), tu n’as **pas besoin d’installer DevStack**. Il suffit de configurer les variables d’environnement du backend pour pointer vers les endpoints de ton cloud.

1. **Backend – fichier `Backend/.env`**

   Pars du fichier `Backend/.env.example` et adapte les valeurs suivantes :

   - Identifiants Keystone (compte de service ou admin) :
     - `OS_USERNAME`
     - `OS_PASSWORD`
     - `OS_PROJECT_NAME`
   - Endpoints de ton cloud (souvent visibles via `openstack endpoint list`) :
     - `KEYSTONE_URL` (ex: `http://CONTROLLER/identity/v3` ou `https://public-cloud/identity/v3`)
     - `NOVA_URL` (ex: `https://public-cloud/compute/v2.1`)
     - `GLANCE_URL` (ex: `https://public-cloud/image`)
     - `NEUTRON_URL` (ex: `https://public-cloud/networking` ou `/v2.0`)
   - Sécurité & options :
     - `JWT_SECRET` (valeur longue et aléatoire, obligatoire en prod)
     - `KEYSTONE_MULTI_TENANT=true` si tu souhaites créer un projet OpenStack par utilisateur
     - `GNOCCHI_URL` si ton cloud expose Gnocchi (ex: `http://CONTROLLER:8041`)

   Le script `deploy.sh` copie automatiquement `.env.example` vers `.env` si aucun `.env` n’existe encore, puis remplace l’IP d’exemple par celle de ton serveur. Ensuite, **tu dois vérifier/ajuster manuellement** toutes les URLs et identifiants pour qu’ils correspondent à ton OpenStack.

2. **Frontend – fichier `Frontend/.env`**

   - `REACT_APP_API_URL` doit pointer vers le backend Node derrière Nginx. Par exemple :

     ```bash
     REACT_APP_API_URL=http://MON_DOMAINE/api
     ```

   - `PORT=3000` est le port interne utilisé par React; Nginx publie ensuite sur le port 80.

3. **Nginx – reverse proxy**

   Le fichier `nginx-config.conf` fourni dans le projet configure :

   - `/` → frontend React (port 3000)
   - `/api` → backend Node (port 3001)
   - `/dashboard` et `/static` → Horizon (Apache sur 8080)
   - `/identity` → proxy vers Keystone (port 5000)

   Adapte au besoin si ton OpenStack expose déjà ses services derrière un autre proxy ou sous un autre chemin.

---

### 9. Intégration métriques (Gnocchi / Ceilometer) et facturation

Pour que la facturation basée sur la consommation fonctionne :

1. **Côté OpenStack**

   - Vérifie que les services de télémétrie sont actifs (selon ta distro) :
     - Gnocchi pour le stockage des séries temporelles.
     - Ceilometer ou un équivalent pour pousser les métriques Nova vers Gnocchi.
   - Confirme que les métriques d’instances existent (par exemple en ligne de commande ou via l’API Gnocchi) :
     - `cpu_util`
     - `memory.usage`
     - `disk.usage`
     - `network.incoming.bytes`
     - `network.outgoing.bytes`

2. **Côté backend (`Backend/.env`)**

   - Renseigne `GNOCCHI_URL` (ex: `http://CONTROLLER:8041`).
   - Optionnel: `CEILOMETER_URL` si tu veux aussi tester l’API Ceilometer.

3. **Chaîne technique dans le backend**

   - `services/gnocchi.js` lit les métriques depuis Gnocchi en utilisant `GNOCCHI_URL` et un token obtenu via Keystone (`config/openstack.js`).
   - `services/metricsCollector.js` appelle `gnocchi.getInstanceMetrics(...)` périodiquement et stocke les métriques dans `ResourceUsage`.
   - `services/billingEngine.js` lit `ResourceUsage`, applique les `PricingRule` et génère des `Invoice`/`UsageSlice` toutes les 30 minutes.

En environnement de test, si Gnocchi n’est pas disponible, le backend utilise des **heuristiques de repli** (métriques simulées à partir de l’état de la VM et du flavor) afin que la facturation reste fonctionnelle, mais les montants refléteront moins fidèlement la charge réelle.

---

### 10. Scénarios de tests de bout-en-bout

Voici une checklist simple pour valider que le Marketplace fonctionne correctement avec ton OpenStack (DevStack ou installation existante) :

1. **Connexion OpenStack**
   - Démarrer le backend (`cd Backend && npm start` ou via PM2).
   - Appeler `GET /api/openstack/status` (via `curl` ou Postman) et vérifier que `connected: true`.

2. **Catalogue de ressources**
   - Depuis l’UI, vérifier que la liste des flavors et images est correctement chargée.
   - Créer une VM depuis le catalogue (choisir un flavor et une image valides).

3. **Cycle de vie VM**
   - Démarrer / arrêter / supprimer la VM depuis le Marketplace.
   - Vérifier dans Horizon (ou `openstack server list`) que les opérations se reflètent côté OpenStack.

4. **Métriques & facturation**
   - Laisser une VM active pendant au moins 30–60 minutes.
   - Vérifier que des enregistrements apparaissent dans `ResourceUsage` (ou via l’UI si des écrans existent pour les métriques).
   - Confirmer que des `Invoice` et `UsageSlice` sont générés (page de facturation UI ou base de données).

5. **Paiement & désactivation**
   - Sur la page de facturation, marquer une facture comme payée.
   - Activer le mode de paiement automatique et associer une carte de test (si souhaité).
   - Simuler (dans la base) plusieurs factures impayées et vérifier que les comptes concernés peuvent être désactivés suivant la logique métier.

6. **Sécurité & durcissement**
   - Vérifier que `JWT_SECRET` est correctement configuré et que les endpoints protégés exigent un token JWT valide.
   - Tester les limites de taux (rate limiting) en envoyant plusieurs requêtes rapides sur `/api/auth`.

Une fois tous ces points validés, ton Marketplace est correctement intégré à ton OpenStack et prêt pour des usages plus avancés (multi‑tenant, billing réel, supervision). 

