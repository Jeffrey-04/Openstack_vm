# Guide de Déploiement - VM Marketplace

Ce guide explique comment déployer l'application VM Marketplace sur votre VPS Hostinger.

## Prérequis

- VPS Hostinger avec Ubuntu 22.04/24.04
- DevStack déjà installé
- Accès root ou sudo
- Node.js 20.x ou supérieur

## Structure du Projet

```
Devstack/
├── Backend/              # API Node.js/Express
├── Frontend/             # Application React
├── nginx-config.conf     # Configuration Nginx
├── deploy.sh            # Script de déploiement automatique
└── Guide.md             # Guide d'installation DevStack
```

## Étape 1: Installer Node.js (si pas déjà fait)

```bash
# Installer Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

## Étape 2: Configuration du Backend

```bash
cd Backend

# Installer les dépendances
npm install

# Copier et configurer le fichier .env
cp config.example.txt .env

# Éditer le fichier .env avec vos informations
nano .env
```

**Configuration .env importante:**
```bash
OS_USERNAME=admin
OS_PASSWORD=VotreMotDePasse
OS_PROJECT_NAME=admin
KEYSTONE_URL=http://VOTRE_IP_VPS/identity/v3
NOVA_URL=http://VOTRE_IP_VPS:8774/v2.1
GLANCE_URL=http://VOTRE_IP_VPS:9292
NEUTRON_URL=http://VOTRE_IP_VPS:9696
PORT=3001
CORS_ORIGIN=http://VOTRE_IP_VPS
```

**Remplacez:**
- `VotreMotDePasse` par le mot de passe admin d'OpenStack
- `VOTRE_IP_VPS` par l'adresse IP de votre VPS

## Étape 3: Configuration du Frontend

```bash
cd ../Frontend

# Installer les dépendances
npm install

# Créer le fichier .env pour le frontend
echo "REACT_APP_API_URL=http://VOTRE_IP_VPS/api" > .env
echo "PORT=3000" >> .env

# Remplacer VOTRE_IP_VPS par votre IP réelle
```

## Étape 4: Corriger le problème Nginx/OpenStack Dashboard

Le problème vient du fait que Nginx et le dashboard OpenStack (Apache) essaient tous les deux d'utiliser le port 80.

### Solution 1: Changer le port d'Apache (Horizon Dashboard)

```bash
# Se connecter en tant qu'utilisateur stack
sudo su - stack

# Modifier la configuration Apache
sudo nano /etc/apache2/ports.conf
```

Changez:
```apache
Listen 80
```

En:
```apache
Listen 8080
```

Puis modifiez le VirtualHost:
```bash
sudo nano /etc/apache2/sites-enabled/horizon.conf
```

Changez la première ligne de:
```apache
<VirtualHost *:80>
```

En:
```apache
<VirtualHost *:8080>
```

Redémarrez Apache:
```bash
sudo systemctl restart apache2
```

### Solution 2: Configuration Nginx

```bash
# Copier la configuration Nginx
sudo cp nginx-config.conf /etc/nginx/sites-available/vm-marketplace

# Créer le lien symbolique
sudo ln -sf /etc/nginx/sites-available/vm-marketplace /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

## Étape 5: Installer et Configurer PM2

PM2 est un gestionnaire de processus qui maintiendra vos applications en fonctionnement.

```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Démarrer le Backend
cd ~/path/to/Backend
pm2 start server.js --name vm-marketplace-backend

# Démarrer le Frontend
cd ../Frontend
pm2 start npm --name vm-marketplace-frontend -- start

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Exécutez la commande affichée par PM2

# Vérifier le statut
pm2 status
pm2 logs
```

## Étape 6: Configuration du Firewall

```bash
# Autoriser les ports nécessaires
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS (pour SSL futur)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 8080/tcp    # OpenStack Dashboard
sudo ufw status
```

## Étape 7: Vérification

Vérifiez que tout fonctionne:

1. **Backend API**: `curl http://localhost:3001/api/health`
2. **Frontend**: `curl http://localhost:3000`
3. **OpenStack Dashboard**: `http://VOTRE_IP_VPS/dashboard`
4. **Votre Marketplace**: `http://VOTRE_IP_VPS`

## Étape 8: SSL (Optionnel mais recommandé)

Si vous avez un nom de domaine:

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d votredomaine.com

# Le renouvellement automatique est configuré automatiquement
```

## Commandes Utiles

### Gestion des services

```bash
# Voir les logs du backend
pm2 logs vm-marketplace-backend

# Voir les logs du frontend
pm2 logs vm-marketplace-frontend

# Redémarrer le backend
pm2 restart vm-marketplace-backend

# Redémarrer le frontend
pm2 restart vm-marketplace-frontend

# Voir l'utilisation des ressources
pm2 monit
```

### Gestion Nginx

```bash
# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

# Voir les logs Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### OpenStack/DevStack

```bash
# Se connecter en tant que stack
sudo su - stack

# Source des credentials
source /opt/stack/devstack/openrc admin admin

# Tester OpenStack
openstack server list
openstack flavor list
openstack image list

# Voir les logs DevStack
tail -f /opt/stack/logs/screen/screen-n-api.log
```

## Dépannage

### Le backend ne se connecte pas à OpenStack

```bash
# Vérifier que les services OpenStack sont démarrés
sudo systemctl status devstack@*

# Relancer DevStack si nécessaire
cd /opt/stack/devstack
sudo su - stack
./rejoin-stack.sh
```

### Le frontend ne charge pas

```bash
# Vérifier les logs PM2
pm2 logs vm-marketplace-frontend

# Reconstruire le frontend
cd Frontend
npm run build

# Redémarrer
pm2 restart vm-marketplace-frontend
```

### Nginx retourne 502 Bad Gateway

```bash
# Vérifier que le backend et frontend sont en cours d'exécution
pm2 status

# Vérifier que les ports sont corrects dans la config Nginx
sudo nginx -t
```

### Erreur "Cannot connect to OpenStack"

```bash
# Vérifier la configuration .env
cat Backend/.env

# Vérifier que l'IP est correcte
# Tester l'authentification OpenStack
curl -i -X POST http://VOTRE_IP:5000/v3/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "auth": {
      "identity": {
        "methods": ["password"],
        "password": {
          "user": {
            "name": "admin",
            "domain": {"id": "default"},
            "password": "VotreMotDePasse"
          }
        }
      },
      "scope": {
        "project": {
          "name": "admin",
          "domain": {"id": "default"}
        }
      }
    }
  }'
```

## Script de Déploiement Automatique

Un script `deploy.sh` est fourni pour automatiser le déploiement:

```bash
chmod +x deploy.sh
./deploy.sh
```

## Mise à Jour de l'Application

```bash
# Arrêter les applications
pm2 stop all

# Mettre à jour le code
git pull  # Si vous utilisez Git

# Backend
cd Backend
npm install
pm2 restart vm-marketplace-backend

# Frontend
cd ../Frontend
npm install
pm2 restart vm-marketplace-frontend
```

## Sauvegarde

Il est recommandé de sauvegarder régulièrement:

```bash
# Sauvegarder la configuration
tar -czf backup-$(date +%Y%m%d).tar.gz \
  Backend/.env \
  Frontend/.env \
  /etc/nginx/sites-available/vm-marketplace

# Sauvegarder OpenStack (si nécessaire)
# Voir la documentation OpenStack pour les sauvegardes
```

## Support

Pour obtenir de l'aide:
- Consultez les logs avec `pm2 logs`
- Vérifiez la configuration Nginx avec `sudo nginx -t`
- Consultez les logs OpenStack dans `/opt/stack/logs/`

