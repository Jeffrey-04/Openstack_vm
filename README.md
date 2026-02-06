# VM Marketplace - Plateforme de Vente de Machines Virtuelles

Une application web moderne pour la vente et la gestion de machines virtuelles basée sur OpenStack.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Node](https://img.shields.io/badge/node-20.x-blue.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)
![OpenStack](https://img.shields.io/badge/openstack-DevStack-red.svg)

## 🚀 Fonctionnalités

- **Dashboard Interactif**: Vue d'ensemble complète de votre infrastructure
- **Marketplace**: Catalogue de configurations VM avec tarification
- **Gestion de VMs**: Créer, démarrer, arrêter, redémarrer et supprimer des VMs
- **Intégration OpenStack**: Communication directe avec l'API OpenStack
- **Interface Moderne**: Design responsive et intuitif
- **Gestion en temps réel**: Surveillance de l'état des VMs

## 📋 Prérequis

- VPS avec Ubuntu 22.04 ou 24.04
- 8GB RAM minimum (16GB recommandé)
- 100GB de stockage minimum
- DevStack installé et configuré
- Node.js 20.x ou supérieur
- Nginx

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │
│  Frontend   │────────▶│   Backend   │────────▶│  OpenStack  │
│  (React)    │         │  (Node.js)  │         │  (DevStack) │
│             │         │             │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │
      │                        │
      └────────────┬───────────┘
                   │
              ┌────▼────┐
              │  Nginx  │
              │  Proxy  │
              └─────────┘
```

## 📦 Structure du Projet

```
Devstack/
├── Backend/                    # API Node.js/Express
│   ├── config/                # Configuration OpenStack
│   ├── routes/                # Routes API
│   ├── server.js              # Serveur principal
│   ├── package.json           # Dépendances Backend
│   └── config.example.txt     # Exemple de configuration
│
├── Frontend/                   # Application React
│   ├── public/                # Fichiers statiques
│   ├── src/
│   │   ├── pages/            # Pages de l'application
│   │   ├── services/         # Services API
│   │   ├── App.js            # Composant principal
│   │   └── config.js         # Configuration Frontend
│   └── package.json          # Dépendances Frontend
│
├── nginx-config.conf          # Configuration Nginx
├── deploy.sh                  # Script de déploiement
├── DEPLOYMENT.md              # Guide de déploiement détaillé
├── Guide.md                   # Guide d'installation DevStack
└── README.md                  # Ce fichier
```

## 🚀 Installation Rapide

### Option 1: Installation Automatique (Recommandé)

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Lancer le déploiement
./deploy.sh
```

Le script vous demandera:
- L'adresse IP de votre VPS
- Le mot de passe admin OpenStack

### Option 2: Installation Manuelle

Suivez le guide détaillé dans [DEPLOYMENT.md](DEPLOYMENT.md)

## 🔧 Configuration

### Backend (.env)

```env
OS_USERNAME=admin
OS_PASSWORD=VotreMotDePasse
OS_PROJECT_NAME=admin
KEYSTONE_URL=http://VOTRE_IP/identity/v3
NOVA_URL=http://VOTRE_IP:8774/v2.1
PORT=3001
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://VOTRE_IP/api
PORT=3000
```

## 🎯 Utilisation

### Démarrer les Services

```bash
# Avec PM2 (recommandé)
pm2 start all

# Ou manuellement
cd Backend && npm start &
cd Frontend && npm start &
```

### Accéder à l'Application

- **Marketplace**: http://VOTRE_IP
- **Backend API**: http://VOTRE_IP/api
- **OpenStack Dashboard**: http://VOTRE_IP/dashboard

### Créer une VM

1. Allez dans **Marketplace** ou **Créer VM**
2. Choisissez une **image système** (Ubuntu, CentOS, etc.)
3. Sélectionnez une **configuration** (vCPU, RAM, Disque)
4. Cliquez sur **Créer la VM**
5. Gérez votre VM depuis **Mes VMs**

## 📊 API Endpoints

### Health Check
```
GET /api/health
```

### VMs
```
GET    /api/vms              # Liste des VMs
POST   /api/vms              # Créer une VM
GET    /api/vms/:id          # Détails d'une VM
DELETE /api/vms/:id          # Supprimer une VM
POST   /api/vms/:id/action   # Action sur une VM (start, stop, reboot)
```

### Flavors (Configurations)
```
GET /api/flavors             # Liste des configurations
GET /api/flavors/:id         # Détails d'une configuration
```

### Images
```
GET /api/images              # Liste des images OS
GET /api/images/:id          # Détails d'une image
```

### OpenStack
```
GET /api/openstack/status    # Statut de la connexion
GET /api/openstack/networks  # Liste des réseaux
```

## 🛠️ Commandes Utiles

### PM2 (Gestion des Processus)

```bash
pm2 status              # Statut des applications
pm2 logs                # Voir les logs
pm2 restart all         # Redémarrer tout
pm2 stop all            # Arrêter tout
pm2 monit              # Monitoring en temps réel
```

### Nginx

```bash
sudo nginx -t                    # Tester la configuration
sudo systemctl restart nginx     # Redémarrer Nginx
sudo systemctl status nginx      # Statut de Nginx
```

### OpenStack

```bash
# Se connecter en tant qu'utilisateur stack
sudo su - stack

# Sourcer les credentials
source /opt/stack/devstack/openrc admin admin

# Commandes OpenStack
openstack server list           # Liste des VMs
openstack flavor list           # Liste des configurations
openstack image list            # Liste des images
openstack network list          # Liste des réseaux
```

## 🐛 Dépannage

### Le Backend ne se connecte pas à OpenStack

```bash
# Vérifier que DevStack est en cours d'exécution
sudo systemctl status devstack@*

# Relancer DevStack
cd /opt/stack/devstack
sudo su - stack
./rejoin-stack.sh
```

### Nginx retourne 502 Bad Gateway

```bash
# Vérifier que les services sont en cours d'exécution
pm2 status

# Redémarrer les services
pm2 restart all
```

### Le Dashboard OpenStack n'est plus accessible

```bash
# Vérifier qu'Apache écoute sur le port 8080
sudo netstat -tlnp | grep 8080

# Redémarrer Apache
sudo systemctl restart apache2
```

## 🔒 Sécurité

### Recommandations

1. **Changez tous les mots de passe par défaut**
2. **Configurez un certificat SSL avec Let's Encrypt**
3. **Utilisez un pare-feu (UFW)**
4. **Limitez l'accès SSH par clé**
5. **Mettez à jour régulièrement le système**

### Installation SSL (avec domaine)

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat
sudo certbot --nginx -d votredomaine.com

# Le renouvellement est automatique
```

## 📈 Performance

### Optimisations Recommandées

1. **Build de Production du Frontend**
   ```bash
   cd Frontend
   npm run build
   # Servir le dossier build/ avec Nginx
   ```

2. **Compression Nginx**
   Activez gzip dans la configuration Nginx

3. **Cache des Requêtes API**
   Implémentez un cache Redis pour les requêtes fréquentes

4. **Base de données**
   Ajoutez MongoDB pour stocker les utilisateurs et les commandes

## 🚦 Monitoring

### Surveillance avec PM2

```bash
pm2 install pm2-logrotate    # Rotation des logs
pm2 monit                     # Monitoring en temps réel
```

### Logs

```bash
# Logs PM2
pm2 logs

# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs OpenStack
tail -f /opt/stack/logs/screen/screen-n-api.log
```

## 🔄 Mise à Jour

```bash
# Arrêter les applications
pm2 stop all

# Mettre à jour le code (si Git)
git pull

# Backend
cd Backend
npm install
pm2 restart vm-marketplace-backend

# Frontend
cd ../Frontend
npm install
pm2 restart vm-marketplace-frontend
```

## 💾 Sauvegarde

```bash
# Sauvegarder la configuration
tar -czf backup-$(date +%Y%m%d).tar.gz \
  Backend/.env \
  Frontend/.env \
  /etc/nginx/sites-available/vm-marketplace

# Restaurer
tar -xzf backup-YYYYMMDD.tar.gz
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir des issues ou des pull requests.

## 📝 Licence

Ce projet est sous licence MIT.

## 👨‍💻 Auteur

Créé pour un projet de marketplace de VMs avec OpenStack (DevStack) par Jeffrey Choguen

## 📞 Support

Pour obtenir de l'aide:
1. Consultez [DEPLOYMENT.md](DEPLOYMENT.md) pour les instructions détaillées
2. Vérifiez les logs avec `pm2 logs`
3. Consultez les logs OpenStack dans `/opt/stack/logs/`

## 🎯 Roadmap

- [ ] Authentification utilisateur (JWT)
- [ ] Paiement en ligne (Stripe)
- [ ] Tableau de bord admin
- [ ] Facturation automatique
- [ ] Support multi-régions
- [ ] Monitoring avancé (Grafana)
- [ ] Auto-scaling des VMs
- [ ] API REST documentée (Swagger)
- [ ] Tests unitaires et d'intégration

---

**Author**: Jeffrey CHOGUEN

