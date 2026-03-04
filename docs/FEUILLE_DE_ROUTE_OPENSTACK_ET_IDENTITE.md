# Donner une âme à la plateforme et exploiter le plein potentiel d’OpenStack

La plateforme repose sur OpenStack mais n’en exploite qu’une partie et peut paraître « sans âme ». Ce document propose des pistes concrètes : **identité / UX** et **fonctionnalités OpenStack** à mettre en avant.

---

## 1. Ce qu’on utilise aujourd’hui (et ce qu’on n’expose pas)

| OpenStack | Utilisé côté app | Exposé à l’utilisateur |
|-----------|------------------|-------------------------|
| **Nova** | Serveurs (CRUD), flavors, images, start/stop/reboot, resize, console noVNC | Liste VMs, détail, création, actions, console (souvent 404) |
| **Glance** | Liste images, détail image | Liste déroulante à la création VM |
| **Neutron** | Liste réseaux, liste IPs flottantes | Presque rien (routes API admin seulement) |
| **Ceilometer** | Métriques CPU, RAM, disque, réseau | Graphiques détail VM, scaling |
| **Keystone** | Auth, option multi-tenant (projet par user) | Invisible |
| **Cinder** | — | Rien (volumes, snapshots FS non utilisés) |

**Manques principaux :**
- Pas de **snapshots** (sauvegarde d’une VM).
- Pas de **gestion des IP flottantes** (attacher/détacher depuis l’UI).
- Pas de **security groups** visibles ou éditables.
- Pas de **keypairs** (création / import de clés SSH).
- Métriques et **activité** peu mises en avant (pas de « dernière activité », pas de tendances claires).
- **Console** souvent perçue comme cassée (noVNC / IDs).
- Pas de **rescue / rebuild** ni de **modes avancés** Nova.

---

## 2. Identité et « âme » de la plateforme (UX)

Objectif : que l’utilisateur perçoive une **plateforme cloud à part entière**, pas un formulaire générique.

### 2.1 Message et positionnement

- **Tagline** visible (ex. « Votre cloud, simple et puissant » ou « Des VPS à la demande, facturés à l’usage »).
- **Page d’accueil / landing** (avant login) : valeur ajoutée (scaling auto, facturation à la demi-heure, support OpenStack), pas seulement un formulaire de connexion.
- **Onboarding** au premier login : court parcours (créer sa première VM, voir la console ou SSH) avec étapes et succès clairs.

### 2.2 Feedback et « vie » de la plateforme

- **Statut global** : indicateur « Plateforme opérationnelle » / « OpenStack connecté » (déjà en partie via health), visible en bas de sidebar ou en header.
- **Activité récente** : bloc « Dernières actions » (création VM, démarrage, arrêt, snapshot, facture générée) sur l’Overview client et admin.
- **États vides** soignés : « Vous n’avez pas encore de VM » avec CTA « Créer ma première VM » et courte explication (avantages, lien doc).
- **Toasts / messages** cohérents et rassurants (succès, en cours, erreur avec piste de résolution).

### 2.3 Mettre le cloud en avant

- **Overview client** : cartes « Mes VMs » avec statut en temps quasi réel (ACTIVE / SHUTOFF), **utilisation** (CPU / RAM / disque) en un coup d’œil, pas seulement un tableau.
- **Détail VM** : la console et l’**accès SSH** (commande + copier) comme actions principales, pas cachées ; métriques (CPU, RAM, disque, réseau) en graphiques lisibles et en tendance (24h, 7j).
- **Création VM** : parcours guidé (image → taille → nom → optionnel réseau/clé) avec aperçu du **coût estimé** (XAF/heure) avant validation.

---

## 3. Exploiter davantage OpenStack (fonctionnalités)

### 3.1 Priorité haute (impact + faisabilité)

| Fonctionnalité | OpenStack | Ce qu’on ajoute | Où |
|----------------|-----------|------------------|-----|
| **Snapshot d’une VM** | Nova `createImage` (server → image) | Bouton « Créer un snapshot » sur détail VM, liste des images « mes snapshots » à la création | Détail VM, Création VM |
| **Attacher / détacher IP flottante** | Neutron FIP + Nova (os-interface ou metadata) | Associer une FIP à une VM, libérer une FIP depuis la fiche VM | Détail VM, section Réseau |
| **Coût estimé à la création** | Nova (flavor) + nos tarifs | Affichage « ~X XAF/heure » selon le flavor choisi | Page Création VM |
| **Activité / logs** | — (côté app) | Table ou feed « Dernières actions » (création, start/stop, snapshot, facture) par user | Overview client, optionnel admin |

### 3.2 Priorité moyenne

| Fonctionnalité | OpenStack | Ce qu’on ajoute |
|----------------|-----------|------------------|
| **Clés SSH (keypairs)** | Nova keypairs API | Créer / importer une clé, choisir la clé à l’injection à la création VM |
| **Security groups** | Neutron / Nova | Afficher les SGs de l’instance, lien doc « Ouvrir le port 22 » |
| **Rebuild VM** | Nova rebuild | Bouton « Réinstaller (garder le disque) » ou « Rebuild from image » avec choix d’image |
| **Métriques sur 24h / 7j** | Ceilometer (déjà utilisé) | Sélecteur de période + graphiques sur la page détail VM |
| **Résumé réseau** | Neutron | Sur détail VM : réseau(s), IP fixe, IP flottante, lien « Gérer les IP » |

### 3.3 Priorité basse (plus technique)

| Fonctionnalité | OpenStack |
|----------------|-----------|
| **Volumes Cinder** | Attacher/détacher un volume à une VM (stockage additionnel) |
| **Mode rescue** | Nova rescue / unrescue pour dépannage |
| **Shelve / unshelve** | Éteindre et libérer les ressources en gardant l’état sur stockage |

---

## 4. Plan d’action recommandé (ordre de mise en œuvre)

### Phase 1 – Identité et confiance (rapide)

1. **Tagline + sous-titre** sur la page login et dans la sidebar (ex. « VM Marketplace – VPS à la demande »).
2. **États vides** : message + CTA sur « Mes VMs » et Overview quand 0 VM.
3. **Indicateur de santé** : petit badge « OpenStack OK » ou « Service opérationnel » (basé sur `/api/health` ou `/api/openstack/status`) en bas de la sidebar ou en header.
4. **Console** : corriger définitivement (IDs, logs, doc) et mettre le bouton « Accéder à la console » en avant sur la fiche VM.

### Phase 2 – Valeur perçue (court terme)

5. **Coût estimé** à la création VM (flavor → XAF/heure).
6. **Bloc « Dernières actions »** sur Overview (création, start/stop, snapshot si implémenté), même basique (table en base + API + composant React).
7. **Snapshot** : bouton « Créer un snapshot » sur détail VM (Nova createImage), puis afficher « Mes snapshots » dans la liste d’images à la création.
8. **IP flottante** : sur détail VM, afficher l’IP flottante si présente ; bouton « Attacher une IP flottante » / « Détacher » (appels Neutron + Nova si besoin).

### Phase 3 – Profondeur OpenStack (moyen terme)

9. **Keypairs** : page ou modal « Mes clés SSH », création/import, choix à la création VM.
10. **Security groups** : affichage sur la VM + lien doc (ex. « Ouvrir le port 22 pour SSH »).
11. **Graphiques métriques** avec période 24h / 7j sur la page détail VM.
12. **Rebuild** : bouton « Réinstaller depuis une image » avec liste d’images (dont les snapshots utilisateur).

### Phase 4 – Optionnel

13. Volumes Cinder (attacher un volume à une VM).
14. Mode rescue (doc + bouton si l’API est stable).
15. Améliorer la **landing** (page d’accueil publique) avec témoignages, comparaison offres, lien vers la doc.

---

## 5. Résumé : avant / après

| Aujourd’hui | Après mise en œuvre (phases 1–2) |
|-------------|-----------------------------------|
| Liste de VMs + formulaire de création | Overview avec activité, coût estimé, états vides clairs, indicateur de santé |
| Console perçue comme cassée | Console fiable + bouton mis en avant |
| Pas de sauvegarde visible | Snapshot en un clic, réutilisable à la création |
| IP et réseau opaques | Affichage FIP + attacher/détacher depuis l’UI |
| Peu de « vie » | Dernières actions, toasts, messages de succès explicites |

En priorisant **identité (tagline, vides, santé, console)** puis **snapshots, coût estimé, activité, IP flottantes**, la plateforme exploite mieux OpenStack et donne une expérience plus cohérente et « vivante ».
