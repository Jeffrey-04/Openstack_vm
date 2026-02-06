#!/bin/bash

###############################################################################
# Script de Déploiement Automatique - VM Marketplace
# 
# Ce script automatise le déploiement de l'application VM Marketplace
# sur un VPS avec DevStack déjà installé
###############################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          VM Marketplace - Déploiement Automatique          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Vérifier si on est root ou si on a sudo
check_sudo() {
    if [[ $EUID -eq 0 ]]; then
        SUDO=""
    elif command -v sudo &> /dev/null; then
        SUDO="sudo"
        print_info "Ce script nécessite des privilèges sudo"
    else
        print_error "Ni root ni sudo disponible. Installation impossible."
        exit 1
    fi
}

# Vérifier les prérequis
check_prerequisites() {
    print_info "Vérification des prérequis..."
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas installé"
        print_info "Installation de Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
        $SUDO apt install -y nodejs
        print_success "Node.js installé"
    else
        print_success "Node.js trouvé: $(node --version)"
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        print_error "npm n'est pas installé"
        exit 1
    else
        print_success "npm trouvé: $(npm --version)"
    fi
    
    # Vérifier Nginx
    if ! command -v nginx &> /dev/null; then
        print_info "Installation de Nginx..."
        $SUDO apt update
        $SUDO apt install -y nginx
        print_success "Nginx installé"
    else
        print_success "Nginx trouvé"
    fi
}

# Demander les informations de configuration
get_configuration() {
    print_info "Configuration de l'application..."
    echo ""
    
    # Obtenir l'IP du VPS
    DEFAULT_IP=$(hostname -I | awk '{print $1}')
    read -p "Entrez l'IP de votre VPS [$DEFAULT_IP]: " VPS_IP
    VPS_IP=${VPS_IP:-$DEFAULT_IP}
    
    # Obtenir le mot de passe OpenStack admin
    read -sp "Entrez le mot de passe OpenStack admin: " OS_PASSWORD
    echo ""
    
    print_success "Configuration enregistrée"
}

# Configurer le Backend
setup_backend() {
    print_info "Configuration du Backend..."
    
    cd Backend
    
    # Installer les dépendances
    print_info "Installation des dépendances npm..."
    npm install
    print_success "Dépendances installées"
    
    # Créer le fichier .env
    print_info "Création du fichier .env..."
    cat > .env << EOF
# OpenStack Configuration
OS_USERNAME=admin
OS_PASSWORD=${OS_PASSWORD}
OS_PROJECT_NAME=admin
OS_AUTH_URL=http://${VPS_IP}/identity/v3
OS_REGION_NAME=RegionOne

# OpenStack Service URLs
KEYSTONE_URL=http://${VPS_IP}/identity/v3
NOVA_URL=http://${VPS_IP}:8774/v2.1
GLANCE_URL=http://${VPS_IP}:9292
NEUTRON_URL=http://${VPS_IP}:9696

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=http://${VPS_IP}
EOF
    print_success "Fichier .env créé"
    
    cd ..
}

# Configurer le Frontend
setup_frontend() {
    print_info "Configuration du Frontend..."
    
    cd Frontend
    
    # Installer les dépendances
    print_info "Installation des dépendances npm..."
    npm install
    print_success "Dépendances installées"
    
    # Créer le fichier .env
    print_info "Création du fichier .env..."
    cat > .env << EOF
REACT_APP_API_URL=http://${VPS_IP}/api
PORT=3000
EOF
    print_success "Fichier .env créé"
    
    cd ..
}

# Configurer Nginx
setup_nginx() {
    print_info "Configuration de Nginx..."
    
    # Modifier le port d'Apache (Horizon Dashboard)
    if [ -f /etc/apache2/ports.conf ]; then
        print_info "Modification du port Apache pour Horizon..."
        $SUDO sed -i 's/Listen 80/Listen 8080/g' /etc/apache2/ports.conf
        
        if [ -f /etc/apache2/sites-enabled/horizon.conf ]; then
            $SUDO sed -i 's/<VirtualHost \*:80>/<VirtualHost *:8080>/g' /etc/apache2/sites-enabled/horizon.conf
        fi
        
        $SUDO systemctl restart apache2
        print_success "Apache configuré sur le port 8080"
    fi
    
    # Copier la configuration Nginx
    print_info "Installation de la configuration Nginx..."
    $SUDO cp nginx-config.conf /etc/nginx/sites-available/vm-marketplace
    
    # Créer le lien symbolique
    $SUDO ln -sf /etc/nginx/sites-available/vm-marketplace /etc/nginx/sites-enabled/
    
    # Supprimer la config par défaut
    $SUDO rm -f /etc/nginx/sites-enabled/default
    
    # Tester la configuration
    if $SUDO nginx -t; then
        print_success "Configuration Nginx valide"
        $SUDO systemctl restart nginx
        print_success "Nginx redémarré"
    else
        print_error "Erreur dans la configuration Nginx"
        exit 1
    fi
}

# Installer et configurer PM2
setup_pm2() {
    print_info "Configuration de PM2..."
    
    # Installer PM2 globalement
    if ! command -v pm2 &> /dev/null; then
        print_info "Installation de PM2..."
        $SUDO npm install -g pm2
        print_success "PM2 installé"
    else
        print_success "PM2 déjà installé"
    fi
    
    # Arrêter les processus PM2 existants
    pm2 delete all 2>/dev/null || true
    
    # Démarrer le Backend
    print_info "Démarrage du Backend..."
    cd Backend
    pm2 start server.js --name vm-marketplace-backend
    cd ..
    print_success "Backend démarré"
    
    # Démarrer le Frontend
    print_info "Démarrage du Frontend..."
    cd Frontend
    pm2 start npm --name vm-marketplace-frontend -- start
    cd ..
    print_success "Frontend démarré"
    
    # Sauvegarder la configuration PM2
    pm2 save
    
    # Configurer le démarrage automatique
    print_info "Configuration du démarrage automatique..."
    $SUDO env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    print_success "Démarrage automatique configuré"
}

# Configurer le Firewall
setup_firewall() {
    print_info "Configuration du pare-feu..."
    
    if command -v ufw &> /dev/null; then
        $SUDO ufw allow 80/tcp comment 'HTTP'
        $SUDO ufw allow 443/tcp comment 'HTTPS'
        $SUDO ufw allow 8080/tcp comment 'OpenStack Dashboard'
        $SUDO ufw allow 22/tcp comment 'SSH'
        
        # Activer UFW si pas déjà fait (avec précaution)
        print_warning "Le pare-feu UFW va être activé. Assurez-vous que le port SSH (22) est autorisé!"
        $SUDO ufw --force enable
        
        print_success "Pare-feu configuré"
    else
        print_warning "UFW n'est pas installé, pare-feu non configuré"
    fi
}

# Vérifier l'installation
verify_installation() {
    print_info "Vérification de l'installation..."
    
    sleep 5  # Attendre que les services démarrent
    
    # Vérifier le Backend
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        print_success "Backend: OK"
    else
        print_warning "Backend: Impossible de se connecter"
    fi
    
    # Vérifier le Frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend: OK"
    else
        print_warning "Frontend: Impossible de se connecter"
    fi
    
    # Vérifier Nginx
    if curl -f http://localhost > /dev/null 2>&1; then
        print_success "Nginx: OK"
    else
        print_warning "Nginx: Impossible de se connecter"
    fi
    
    # Afficher le statut PM2
    echo ""
    pm2 status
}

# Afficher le résumé
show_summary() {
    echo ""
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║            Déploiement Terminé avec Succès! 🎉            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    print_info "Votre application est maintenant accessible:"
    echo ""
    echo -e "  ${BLUE}Marketplace Frontend:${NC}    http://${VPS_IP}"
    echo -e "  ${BLUE}Backend API:${NC}             http://${VPS_IP}/api"
    echo -e "  ${BLUE}OpenStack Dashboard:${NC}     http://${VPS_IP}/dashboard"
    echo ""
    print_info "Commandes utiles:"
    echo ""
    echo "  pm2 status           - Voir l'état des applications"
    echo "  pm2 logs             - Voir les logs en temps réel"
    echo "  pm2 restart all      - Redémarrer toutes les applications"
    echo "  sudo nginx -t        - Tester la configuration Nginx"
    echo ""
    print_warning "Prochaines étapes recommandées:"
    echo ""
    echo "  1. Configurez un nom de domaine (optionnel)"
    echo "  2. Installez un certificat SSL avec Let's Encrypt"
    echo "  3. Configurez des sauvegardes régulières"
    echo "  4. Surveillez les ressources système"
    echo ""
}

# Fonction principale
main() {
    print_header
    
    check_sudo
    check_prerequisites
    get_configuration
    setup_backend
    setup_frontend
    setup_nginx
    setup_pm2
    setup_firewall
    verify_installation
    show_summary
}

# Exécuter le script
main

