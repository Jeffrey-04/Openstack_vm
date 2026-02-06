#!/bin/bash

###############################################################################
# Script de Test de l'Installation - VM Marketplace
# 
# Ce script vérifie que tous les composants sont correctement installés
###############################################################################

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Test de l'Installation - VM Marketplace            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Compteurs
PASSED=0
FAILED=0

# Test 1: Node.js
print_info "Test 1/12: Vérification de Node.js..."
if command -v node &> /dev/null; then
    VERSION=$(node --version)
    print_success "Node.js installé: $VERSION"
    ((PASSED++))
else
    print_error "Node.js non installé"
    ((FAILED++))
fi

# Test 2: npm
print_info "Test 2/12: Vérification de npm..."
if command -v npm &> /dev/null; then
    VERSION=$(npm --version)
    print_success "npm installé: $VERSION"
    ((PASSED++))
else
    print_error "npm non installé"
    ((FAILED++))
fi

# Test 3: PM2
print_info "Test 3/12: Vérification de PM2..."
if command -v pm2 &> /dev/null; then
    print_success "PM2 installé"
    ((PASSED++))
else
    print_warning "PM2 non installé (optionnel)"
    ((FAILED++))
fi

# Test 4: Nginx
print_info "Test 4/12: Vérification de Nginx..."
if command -v nginx &> /dev/null; then
    print_success "Nginx installé"
    if systemctl is-active --quiet nginx; then
        print_success "Nginx est en cours d'exécution"
        ((PASSED++))
    else
        print_warning "Nginx installé mais non démarré"
        ((FAILED++))
    fi
else
    print_error "Nginx non installé"
    ((FAILED++))
fi

# Test 5: Fichiers Backend
print_info "Test 5/12: Vérification des fichiers Backend..."
if [ -f "Backend/package.json" ] && [ -f "Backend/server.js" ]; then
    print_success "Fichiers Backend présents"
    ((PASSED++))
else
    print_error "Fichiers Backend manquants"
    ((FAILED++))
fi

# Test 6: Dépendances Backend
print_info "Test 6/12: Vérification des dépendances Backend..."
if [ -d "Backend/node_modules" ]; then
    print_success "Dépendances Backend installées"
    ((PASSED++))
else
    print_warning "Dépendances Backend non installées (exécutez: cd Backend && npm install)"
    ((FAILED++))
fi

# Test 7: Configuration Backend
print_info "Test 7/12: Vérification de la configuration Backend..."
if [ -f "Backend/.env" ]; then
    print_success "Fichier .env Backend présent"
    ((PASSED++))
else
    print_warning "Fichier .env Backend manquant"
    ((FAILED++))
fi

# Test 8: Fichiers Frontend
print_info "Test 8/12: Vérification des fichiers Frontend..."
if [ -f "Frontend/package.json" ] && [ -f "Frontend/src/App.js" ]; then
    print_success "Fichiers Frontend présents"
    ((PASSED++))
else
    print_error "Fichiers Frontend manquants"
    ((FAILED++))
fi

# Test 9: Dépendances Frontend
print_info "Test 9/12: Vérification des dépendances Frontend..."
if [ -d "Frontend/node_modules" ]; then
    print_success "Dépendances Frontend installées"
    ((PASSED++))
else
    print_warning "Dépendances Frontend non installées (exécutez: cd Frontend && npm install)"
    ((FAILED++))
fi

# Test 10: Backend en cours d'exécution
print_info "Test 10/12: Vérification du Backend..."
if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
    RESPONSE=$(curl -s http://localhost:3001/api/health)
    print_success "Backend accessible sur le port 3001"
    echo "   Réponse: $RESPONSE"
    ((PASSED++))
else
    print_warning "Backend non accessible (démarrez avec: cd Backend && npm start ou pm2 start)"
    ((FAILED++))
fi

# Test 11: Frontend en cours d'exécution
print_info "Test 11/12: Vérification du Frontend..."
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend accessible sur le port 3000"
    ((PASSED++))
else
    print_warning "Frontend non accessible (démarrez avec: cd Frontend && npm start ou pm2 start)"
    ((FAILED++))
fi

# Test 12: Connexion OpenStack
print_info "Test 12/12: Vérification de la connexion OpenStack..."
if curl -f -s http://localhost:3001/api/openstack/status > /dev/null 2>&1; then
    RESPONSE=$(curl -s http://localhost:3001/api/openstack/status)
    if echo "$RESPONSE" | grep -q '"connected":true'; then
        print_success "Connexion OpenStack OK"
        ((PASSED++))
    else
        print_error "OpenStack non connecté"
        echo "   Réponse: $RESPONSE"
        ((FAILED++))
    fi
else
    print_warning "Impossible de tester la connexion OpenStack (Backend non démarré?)"
    ((FAILED++))
fi

# Résumé
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Tests réussis: $PASSED${NC}"
echo -e "${RED}Tests échoués: $FAILED${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Tests supplémentaires (informatifs)
echo -e "${BLUE}Informations Supplémentaires:${NC}"
echo ""

# Services PM2
if command -v pm2 &> /dev/null; then
    print_info "État des services PM2:"
    pm2 status
    echo ""
fi

# Ports en écoute
print_info "Ports en écoute:"
if command -v netstat &> /dev/null; then
    echo "Port 80 (Nginx):"
    sudo netstat -tlnp | grep :80 || echo "  Aucun service"
    echo "Port 3000 (Frontend):"
    netstat -tlnp 2>/dev/null | grep :3000 || echo "  Aucun service"
    echo "Port 3001 (Backend):"
    netstat -tlnp 2>/dev/null | grep :3001 || echo "  Aucun service"
    echo "Port 8080 (OpenStack Dashboard):"
    sudo netstat -tlnp | grep :8080 || echo "  Aucun service"
else
    echo "  netstat non disponible"
fi
echo ""

# URLs d'accès
VPS_IP=$(hostname -I | awk '{print $1}')
print_info "URLs d'accès (remplacez localhost par votre IP publique si nécessaire):"
echo ""
echo "  🌐 Marketplace Frontend:    http://$VPS_IP"
echo "  🔌 Backend API:             http://$VPS_IP/api/health"
echo "  🔧 OpenStack Dashboard:     http://$VPS_IP/dashboard"
echo ""

# Recommandations
if [ $FAILED -gt 0 ]; then
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Recommandations:${NC}"
    echo ""
    echo "1. Si les dépendances ne sont pas installées:"
    echo "   cd Backend && npm install"
    echo "   cd Frontend && npm install"
    echo ""
    echo "2. Si les services ne sont pas démarrés:"
    echo "   cd Backend && npm start &"
    echo "   cd Frontend && npm start &"
    echo "   Ou utilisez PM2: ./deploy.sh"
    echo ""
    echo "3. Si OpenStack n'est pas connecté:"
    echo "   - Vérifiez le fichier Backend/.env"
    echo "   - Vérifiez que DevStack est démarré"
    echo "   - Testez: source /opt/stack/devstack/openrc admin admin && openstack server list"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
else
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ Tous les tests sont passés!${NC}"
    echo -e "${GREEN}Votre installation est complète et fonctionnelle.${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
fi

exit $FAILED

