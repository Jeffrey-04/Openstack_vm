# Critique UI et améliorations (expert interface)

Document de revue de l’interface du VM Marketplace : points faibles identifiés et corrections apportées.

---

## 1. Navigation / Sidebar

### Problèmes identifiés

- **Sidebar non repliable sur desktop** : L’état `sidebarOpen` existait mais aucun bouton ne permettait de replier la barre latérale. L’utilisateur ne pouvait pas gagner de place à l’écran.
- **Lien « VMs » (admin) redondant** : `/admin/vms` affichait la même page que `/admin` (Overview). Le lien « VMs » dans la sidebar donnait l’impression d’une page dédiée alors que c’était un doublon.
- **Lien OpenStack** : Si `OPENSTACK_DASHBOARD_URL` était vide ou `#`, le lien restait affiché et pointait vers une URL invalide.

### Corrections

- **Bouton de repli de la sidebar** : Bouton (chevron gauche/droite) dans le header de la sidebar pour replier/ouvrir le menu sur desktop. Masqué sur mobile (le menu hamburger gère déjà l’ouverture).
- **Page dédiée « Liste des VMs »** : Nouvelle page `AdminVMs` pour la route `/admin/vms`, qui affiche uniquement la liste des VMs avec pagination fonctionnelle. L’Overview admin conserve les KPIs + un extrait de la liste avec lien « Voir rapport » vers `/admin/vms`.
- **Lien OpenStack** : Retiré de la sidebar client (l’accès technique OpenStack n’est plus exposé dans la nav client).

---

## 2. Barre du haut (topbar)

### Problèmes identifiés

- **Champ « Rechercher » non fonctionnel** : Aucune logique de recherche, ce qui peut frustrer l’utilisateur qui s’attend à une recherche globale.
- **Bouton « Notifications » sans action** : Icône cliquable sans dropdown ni message, donnant l’impression d’une fonctionnalité manquante.
- **Zone utilisateur (avatar + chevron)** : Donne l’impression d’un menu déroulant mais aucun menu n’apparaissait au clic.

### Corrections

- **Recherche** : Placeholder mis à jour en « Rechercher (à venir) » et champ désactivé, avec `aria-label` explicite pour l’accessibilité. À terme : brancher une vraie recherche (VMs, utilisateurs, etc.).
- **Notifications** : Dropdown au clic avec le message « Aucune notification ». Fermeture au clic extérieur.
- **Menu utilisateur** : Dropdown au clic avec « Paramètres » (lien vers la page paramètres) et « Déconnexion ». Fermeture au clic extérieur. Utilisation de `aria-expanded` et `aria-haspopup` pour l’accessibilité.

---

## 3. Boutons et états (hover, active, disabled)

### Problèmes identifiés

- **Feedback au clic** : Peu de boutons avec état `:active` (scale ou légère réduction), ce qui réduit le retour visuel au clic.
- **Boutons « Arrêter » / « Démarrer »** : Pas de style hover distinct (danger vs succès), et états disabled peu visibles.
- **Pagination admin** : Les boutons « Précédent » / « Suivant » sur l’Overview et la liste VMs ne modifiaient pas la page affichée (pas de state ni de logique).

### Corrections

- **Design system (App.css)** : `.btn:active:not(:disabled)` avec `transform: translateY(0)` pour annuler le hover au clic ; `.btn:disabled` avec `opacity: 0.65` et `cursor: not-allowed`.
- **Boutons admin (AdminOverview.css)** :
  - `.admin-btn-icon:active:not(:disabled)` avec `transform: scale(0.97)`.
  - `.admin-btn-icon:disabled` avec `opacity: 0.6` et `cursor: not-allowed`.
  - `.admin-btn-stop` en rouge, hover en fond rouge clair.
  - `.admin-btn-start` en vert, hover en fond vert clair.
  - `.admin-btn-add:active` pour éviter que le bouton reste « levé » au clic.
  - Pagination : `.admin-btn-pagination:disabled` avec `opacity: 0.5` et `cursor: not-allowed`.
- **Pagination fonctionnelle** : Sur l’Overview admin et la page AdminVMs, la pagination utilise un state `page` et des boutons Précédent/Suivant actifs (désactivés sur première/dernière page).

---

## 4. Autres points relevés (non traités ou à faire plus tard)

- **Cohérence des couleurs** : Mélange de `#6c5ce7`, `#7c3aed` et `var(--primary)` dans les pages admin. Idéalement tout faire reposer sur le design system (`--primary`, `--danger`, `--success`).
- **Scrollbars cachées** : `scrollbar-width: none` et `::-webkit-scrollbar { display: none }` sur plusieurs zones. Amélioration possible : barres de défilement fines mais visibles pour indiquer le contenu scrollable.
- **Focus visible** : Déjà en place dans `index.css` pour les éléments focusables ; à conserver pour la navigation clavier et l’accessibilité.

---

## 5. Résumé des fichiers modifiés / ajoutés

| Fichier | Modification |
|--------|---------------|
| `Frontend/src/layouts/DashboardLayout.jsx` | Toggle sidebar, dropdown user (Paramètres + Déconnexion), dropdown notifications, lien OpenStack conditionnel, fermeture dropdowns au clic extérieur. |
| `Frontend/src/layouts/DashboardLayout.css` | Styles sidebar-collapse-toggle, topbar-dropdown, topbar-dropdown-item, topbar-dropdown-item-danger. |
| `Frontend/src/pages/admin/AdminVMs.jsx` | **Nouveau** : page dédiée liste des VMs avec pagination fonctionnelle. |
| `Frontend/src/pages/admin/AdminOverview.jsx` | Pagination de la liste (overviewPage, Précédent/Suivant actifs). |
| `Frontend/src/pages/admin/AdminOverview.css` | Hover/active/disabled pour admin-btn-icon, admin-btn-stop, admin-btn-start, admin-btn-add, admin-btn-pagination. |
| `Frontend/src/App.js` | Route `/admin/vms` pointe vers `AdminVMs` au lieu de `AdminDashboard`. Import `AdminVMs`. |
| `Frontend/src/App.css` | .btn:active et .btn:disabled. |
| `docs/UI_CRITIQUE_ET_AMELIORATIONS.md` | **Nouveau** : ce document. |

---

## 6. Recommandations futures

1. **Recherche globale** : Implémenter la recherche (VMs, factures, utilisateurs selon le rôle) et réactiver le champ topbar.
2. **Notifications** : Brancher des événements réels (nouvelle facture, VM arrêtée, etc.) et afficher une liste dans le dropdown.
3. **Design system** : Centraliser les couleurs et les espacements dans `:root` et utiliser systématiquement les variables CSS dans les pages admin.
4. **Tests E2E** : Ajouter des tests (ex. Playwright) sur la navigation sidebar, les dropdowns et la pagination.

---

## 7. Inspiration Hostinger & Contabo (fournisseurs VPS)

Éléments que l’on peut s’inspirer de **Hostinger** et **Contabo** pour faire évoluer le VM Marketplace.

### Hostinger (hPanel VPS)

- **Overview** : Statut, IP, uptime, localisation du serveur — *à renforcer sur notre Overview client (résumé par VM).*
- **Paramètres centralisés** : Mot de passe root, mode urgence, pare-feu, accès SSH, hostname — *notre page Paramètres couvre déjà le mot de passe ; on peut ajouter bloc « SSH / hostname » si besoin.*
- **OS / Réinstallation** : Infos OS actuelles + réinstallation — *équivalent : déploiement avec une autre image (côté création VM ou détail).*
- **Backup & Monitoring** : Snapshots, backups, stats (CPU, RAM, charge, trafic, processus), logs d’actions, vues 24h / semaine / mois / année — *à développer : graphiques par période, logs d’actions VM, snapshots si l’API OpenStack le permet.*
- **Sécurité** : Pare-feu, anti-malware — *idée : section « Sécurité » (règles pare-feu, liens doc) sur la page détail VM.*
- **Assistant / tutoriels** : Contenu d’aide intégré — *à ajouter : liens vers la doc (ex. `docs/VM_utilisation_et_scaling.md`, `Images_et_connexion_SSH.md`) ou court guide dans l’app.*

### Contabo (Customer Control Panel)

- **Contrôle serveur** : Démarrer / arrêter, mode rescue, snapshots — *déjà : actions start/stop/reboot ; à ajouter si possible : rescue, snapshots (selon API).*
- **Facturation** : Historique paiements, solde, factures, moyens de paiement — *notre Facturation va dans ce sens ; on peut ajouter « Moyens de paiement » et historique.*
- **Compte** : Identifiants, 2FA — *Paramètres : déjà mot de passe ; 2FA à prévoir.*
- **Vue responsive + dark mode** : Panel utilisable mobile, option sombre — *responsive déjà travaillé ; dark mode en recommandation future.*
- **Actions rapides** : Moins de clics pour les tâches courantes — *sidebar épurée (client sans OpenStack, admin uniquement gestion), boutons « Créer une VM » sur Overview / liste VMs.*

### Synthèse : à prioriser

| Idée | Source | Priorité |
|------|--------|----------|
| Stats VM par période (24h, 7j, 30j) | Hostinger | Haute |
| Logs d’actions (création, start, stop) | Hostinger | Moyenne |
| Section Sécurité (pare-feu / SSH) sur détail VM | Hostinger | Moyenne |
| Liens aide / tutoriels dans l’app | Hostinger | Basse |
| Snapshots / backup (si API) | Les deux | Moyenne |
| 2FA (compte) | Contabo | Moyenne |
| Dark mode | Contabo | Basse |
| Historique paiements + moyens de paiement | Contabo | Moyenne |
