# Pistes d'amélioration – VM Marketplace

Suggestions pour renforcer la cohérence, l’UX et l’identité visuelle de l’application.

---

## 1. Design et identité visuelle

### Palette et design system
- **Variables CSS centralisées** : étendre `:root` (déjà dans `index.css`) avec des tokens pour espacements, rayons de bordure et ombres (ex. `--radius-sm`, `--shadow-card`) pour les réutiliser partout (Auth, Dashboard, Offres, cartes).
- **Couleur primaire unique** : utiliser partout la même teinte (ex. `#6c5ce7` des dashboards) pour les CTA, liens et états actifs, y compris sur les pages Auth (déjà aligné dans Auth.css).
- **Illustrations et états vides** : réutiliser le style géométrique du panneau Auth (formes, dégradés) pour les vides d’état (aucune VM, aucun résultat, erreurs) et les illustrations de la page Offres.

### Cohérence des composants
- **Cartes** : même `border-radius`, `box-shadow` et `border` pour les cartes (ClientOverview, AdminOverview, BillingPage, SettingsPage, PlaceholderPage, Offres).
- **Boutons** : un style primaire (plein) et secondaire (outline) commun, avec états `hover` / `disabled` cohérents.
- **Champs de formulaire** : reprendre le style Auth (champs avec bordure légère, focus violet) sur CreateVM et tout formulaire futur.

---

## 2. Expérience utilisateur (UX)

### Navigation et contexte
- **Fil d’Ariane** : sur les zones Client/Admin, afficher un breadcrumb (ex. Overview > Mes VMs) pour clarifier l’emplacement et permettre un retour rapide.
- **Redirections après action** : après création de VM, déjà redirigé selon le contexte (client/admin). Étendre le principe à « Supprimer une VM » (rester sur la liste ou revenir à l’Overview selon le flux).
- **Messages utilisateur** : remplacer les `alert()` par des toasts ou bannières (succès / erreur) non bloquantes, avec fermeture automatique ou manuelle.

### Accessibilité
- **Contraste** : vérifier les rapports de contraste (texte sur fond clair/sombre), notamment pour les textes gris (`#6b7280`) sur fond blanc.
- **Focus** : s’assurer que tous les boutons et liens ont un contour de focus visible (déjà partiel avec `:focus` sur les inputs Auth).
- **Labels et ARIA** : garder des labels explicites sur les formulaires ; sur les icônes seules (ex. œil mot de passe), garder `aria-label` comme sur les pages Auth.

### Micro-interactions
- **Hover** : légères transitions sur les cartes, boutons et liens (déjà en place en partie ; uniformiser durée et courbe).
- **Chargement** : un même composant de spinner/skeleton (style proche de celui des Auth/Dashboard) sur toutes les pages qui chargent des données.
- **Feedback** : sur les boutons « Copier » (ex. accès SSH), afficher un court message « Copié » au lieu de ne rien changer.

---

## 3. Page Offres (`/offres`)

- **Hero** : renforcer le hero avec une touche géométrique (formes légères en arrière-plan, dégradé discret) pour rappeler le panneau Auth et ancrer la marque.
- **Cartes offres** : au hover, légère élévation et bordure primaire (déjà en partie) ; garder la même grille responsive (1 colonne sur mobile).
- **CTA** : boutons « Choisir » et « Créer un compte » bien visibles ; optionnel : court sous-texte (ex. « Sans engagement »).

---

## 4. Dashboards Client et Admin

- **Vue d’ensemble** : conserver la structure actuelle (KPIs, métriques, sécurité) ; ajouter des tooltips ou un lien « En savoir plus » sur les indicateurs complexes.
- **Tableaux** : sur Admin (liste VPS), garder le tri/filtre si besoin ; sur mobile, envisager des cartes empilées au lieu du tableau pour la lisibilité.
- **Cohérence des libellés** : mêmes termes pour les statuts (Running/Actif, Stopped/Arrêté, etc.) partout (MyVMs, ClientOverview, AdminOverview).

---

## 5. Authentification (déjà en place / à finaliser)

- **Login / Register** : design split-screen avec panneau géométrique, formulaire épuré, toggle mot de passe, « Se souvenir de moi », lien « Mot de passe oublié » et place pour une future connexion Google.
- **Mot de passe oublié** : page dédiée avec message « bientôt disponible » et lien retour connexion ; plus tard : formulaire email + endpoint backend.
- **Google** : bouton présent mais désactivé ; quand le backend le permettra, brancher l’OAuth et retirer le « (bientôt) ».

---

## 6. Technique et maintenabilité

- **Gestion d’erreurs API** : intercepter les erreurs (ex. 401, 500) dans un layer commun (déjà partiel dans `api.js`) et afficher un message utilisateur cohérent ou rediriger vers la login si 401.
- **Variables d’environnement** : documenter dans un `.env.example` à jour (API, option OAuth) pour faciliter le déploiement.
- **Tests** : ajouter des tests (ex. React Testing Library) sur les flux critiques : Login, Register, création VM, liste factures.

---

## 7. Résumé des priorités

| Priorité | Amélioration |
|----------|--------------|
| Haute    | Toasts / bannières à la place des `alert()` |
| Haute    | Design system (variables CSS) et cohérence des cartes/boutons |
| Moyenne  | Fil d’Ariane sur Client/Admin |
| Moyenne  | Hero Offres avec rappel visuel géométrique |
| Basse    | Page « Mot de passe oublié » fonctionnelle (backend + email) |
| Basse    | Connexion Google quand le backend le supporte |

Les pages Auth (Login, Register, Mot de passe oublié) sont déjà alignées avec la maquette type « split-screen » et prêtes à évoluer (Google, réinitialisation mot de passe).
