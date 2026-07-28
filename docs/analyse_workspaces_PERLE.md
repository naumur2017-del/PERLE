# Analyse complète — Application PERLE (ERP NAUMUR)
**Sources analysées :**
- `Cahier_des_Charges_ERP_NAUMUR.docx` (v1.0 – Juin 2026)
- `Cahier_des_charges_Application_Pilotage_Projets_V0.1.docx` (V0.1 – 21 juillet 2026)
- `Project_Plan_2026 V2.xlsm` (21 feuilles, source métier réelle)

Ce document identifie **tous les acteurs, leurs workspaces, les pages qui les composent, les fonctionnalités de chaque page et les boutons/actions attendus**. La numérotation permet de servir de base au backlog frontend et à la matrice de traçabilité.

---

## 1. Cartographie des acteurs (rôles)

Les deux cahiers des charges convergent vers **10 rôles fonctionnels** (fusion des rôles du CDC ERP et du CDC Pilotage). Chaque rôle possède son propre **Workspace** — un espace de travail dédié avec un tableau de bord d'accueil, un menu latéral filtré et un périmètre de données borné.

| # | Rôle | Workspace | Périmètre de données | Vocation principale |
|---|------|-----------|----------------------|----------------------|
| A1 | **Administrateur applicatif** | Admin Workspace | Global | Paramétrage, comptes, référentiels, audit |
| A2 | **Direction / DG / Sponsor** | Direction Workspace | Global (lecture + validation top-niveau) | Vision consolidée, validations stratégiques, clôtures |
| A3 | **Chef de projet** | Project Workspace | Projets affectés | Cycle de vie projet, chiffrage projet, planning, avancement |
| A4 | **Planificateur / Ordonnanceur** | Planning Workspace | Projets/équipes autorisés | WBS, Gantt, ordonnancement, capacité |
| A5 | **Manager d'équipe / Chef d'équipe** | Team Workspace | Son équipe uniquement | Composition équipe, suivi EHS équipe, saisies de son équipe |
| A6 | **Chargé de projet / Ordonnateur FT** | Operations Workspace | Ses activités | Création FT, feuilles de temps, avancement terrain |
| A7 | **Responsable financier / Contrôle de gestion** | Finance Workspace | Périmètre financier | Trésorerie, validation FT, budgets, recettes, clôtures |
| A8 | **Responsable RH** | RH Workspace | Personnel | Fiches employé, contrats, absences, versions matricule |
| A9 | **Responsable HSE / EHS** | HSE Workspace | Événements HSE + calculs EHS | Incidents, actions, indicateurs HSE, dispositif EHS |
| A10 | **Consultation / Auditeur** | Read-only Workspace | Périmètre défini par l'admin | Consultation, exports autorisés |

**Éléments transversaux** présents dans tous les workspaces :
- Barre de navigation supérieure (logo, sélecteur de langue FR/EN, cloche notifications, profil utilisateur, déconnexion)
- Menu latéral gauche filtré par rôle
- Fil d'Ariane (breadcrumb)
- Recherche globale (Ctrl+K)
- Centre de notifications
- Sélecteur d'exercice / de période

---

## 2. Workspace A1 — Administrateur applicatif

**Menu latéral :** Tableau de bord · Utilisateurs · Rôles & permissions · Référentiels · Paramètres globaux · Import/Export · Audit · Sauvegardes

### Page A1.1 — Dashboard Admin
Vue de supervision système.
- **KPI tiles :** Utilisateurs actifs · Sessions en cours · Erreurs 24 h · Dernière sauvegarde · Tâches Celery en cours
- **Widgets :** Journal des connexions récentes · Alertes système · Utilisation stockage
- **Boutons/actions :**
  - `Lancer sauvegarde manuelle`
  - `Purger cache`
  - `Voir journal d'audit` → A1.7
  - `Nouvelle notification broadcast`

### Page A1.2 — Gestion des utilisateurs
Liste paginée + filtres (rôle, statut, dernière connexion).
- Colonnes : Nom · Email · Rôle(s) · Périmètre · Statut · Dernière connexion · Actions
- **Boutons :**
  - `+ Nouvel utilisateur` (ouvre modal : nom, email, rôle(s), équipe rattachée, périmètre projet)
  - `Importer CSV`
  - `Exporter`
  - Ligne : `Éditer` · `Réinitialiser MDP` · `Désactiver` · `Réactiver` · `Voir historique` · `Déléguer temporairement`

### Page A1.3 — Rôles & permissions
Matrice permissions × ressources (consulter/créer/modifier/valider/clôturer/exporter/administrer).
- **Boutons :**
  - `+ Nouveau rôle`
  - `Dupliquer rôle`
  - Case à cocher par cellule (permission)
  - `Enregistrer les modifications`
  - `Annuler`

### Page A1.4 — Référentiels (hub)
Onglets :
1. **Grades** (PI, BO, FO, MO1, MO2, DIR, NUM, RE) — colonnes : code, libellé, taux/coût standard.
2. **Postes de dépense** (BE01, FD01, FD02, FE, FH02, FI01, CH…).
3. **Comptes financiers** (Banque Afriland, Caisse, Compte DG, Compte Julienne, Compte Ajara, Caisse 2).
4. **Clients**.
5. **Types de projets**.
6. **Mercuriales**.
7. **Calendriers** (jours ouvrés, fériés, horaires).
8. **Zones / Sites**.
9. **Unités & catégories budgétaires**.
10. **Types d'incident HSE**.
- **Boutons par onglet :** `+ Ajouter` · `Éditer` · `Fusionner` · `Inactiver` (jamais supprimer si utilisé) · `Importer` · `Exporter` · `Détecter les doublons`

### Page A1.5 — Paramètres globaux
Formulaire :
- Taux EHS (ex. 150 par unité)
- Taux parentaux
- Taux d'imprévu
- Taux de charges financières
- Devise (FCFA)
- Fuseau horaire
- Exercice comptable en cours
- Politique mot de passe (longueur, complexité, expiration)
- Activation MFA/SSO
- Seuils d'alerte (dépassement budget, solde trésorerie)
- **Boutons :** `Enregistrer` · `Rétablir valeurs par défaut` · `Historique des modifications`

### Page A1.6 — Import / Export
- Onglet **Modèles d'import** (versionnés) : télécharger un modèle Excel par entité.
- Onglet **Nouvel import** : sélectionner entité → uploader fichier → *prévisualisation avec staging* → rapport lignes acceptées/rejetées → `Valider` ou `Annuler`.
- Onglet **Historique** : liste des imports (date, auteur, entité, statut, rapport téléchargeable).
- **Boutons :** `+ Nouvel import` · `Télécharger modèle` · `Voir rapport` · `Rejouer` · `Exporter journal`

### Page A1.7 — Journal d'audit
Table filtrable (utilisateur, entité, action, période).
- Colonnes : Date · Utilisateur · Action · Objet · Avant · Après · IP
- **Boutons :** `Filtrer` · `Exporter (CSV/PDF)` · `Voir détail`

### Page A1.8 — Sauvegardes & maintenance
- Liste des sauvegardes automatiques (date, taille, statut).
- **Boutons :** `Sauvegarde manuelle` · `Restaurer` · `Télécharger` · `Configurer planification` · `Tester restauration`

---

## 3. Workspace A2 — Direction (DG / Sponsor)

**Menu latéral :** Dashboard exécutif · Portefeuille · Trésorerie consolidée · EHS consolidé · Validations en attente · Clôtures · Rapports

### Page A2.1 — Dashboard exécutif
- **KPI tiles :** CA à date · Marge portefeuille · Trésorerie totale · Nb projets actifs / retard · Total EHS mois · Actions HSE en retard · Décisions en attente
- **Widgets :** Courbe trésorerie 12 mois · Top 5 projets par marge · Top 5 dépassements budgétaires · Répartition EHS par équipe · Carte des risques
- **Boutons :** `Filtrer période` · `Filtrer client` · `Exporter PDF` · `Exporter Excel` · `Rafraîchir`

### Page A2.2 — Portefeuille projets
Tableau des projets (code, client, dates, budget, réalisé, avancement %, statut, marge).
- **Boutons :** `Filtrer` · `Regrouper par client / équipe / statut` · Ligne → `Ouvrir fiche projet` (A3.2)

### Page A2.3 — Trésorerie consolidée
Vue multi-comptes (Banque Afriland, Caisse, Compte DG, Compte Julienne, Compte Ajara, Caisse 2).
- Graphique : soldes 12 mois · Encaissements vs décaissements
- Tableau : compte × mois avec solde
- **Boutons :** `Exporter` · `Voir mouvements` (drill vers A7.2) · `Comparer prévision/réalisé`

### Page A2.4 — EHS consolidé
- Tableau : Équipe × mois → Potentiel / Budget / Crédit EHS
- Graphique évolution annuelle
- **Boutons :** `Drill équipe` (A5.3) · `Drill employé` · `Exporter`

### Page A2.5 — Validations en attente
File d'attente des dépenses > seuil, révisions budgétaires, clôtures.
- Ligne : Type · Objet · Montant · Demandeur · Date · Statut
- **Boutons :** `Approuver` · `Rejeter (motif obligatoire)` · `Demander complément` · `Voir détail` · `Déléguer`

### Page A2.6 — Clôtures
- Onglet **Périodes** : mois × modules (temps, budget, trésorerie, EHS) → statut ouvert/clôturé/verrouillé.
- **Boutons :** `Clôturer période` (avec confirmation double) · `Réouvrir` (motif obligatoire, audité) · `Verrouiller définitivement` · `Générer rapport de clôture`

### Page A2.7 — Rapports direction
Catalogue de rapports figés (RAP-01 à RAP-10) déclinés en direction :
- Situation globale hebdo/mensuel · Marge par projet · Trésorerie · HSE
- **Boutons :** `Générer` · `Programmer envoi récurrent` · `Télécharger PDF/Excel` · `Archiver`

---

## 4. Workspace A3 — Chef de projet

**Menu latéral :** Mes projets · Nouveau projet · Chiffrage · Planning · Activités · Feuilles de temps · Budget projet · FT projet · Rapports projet

### Page A3.1 — Liste de mes projets
Tableau filtrable (statut, client, échéance).
- **Boutons :** `+ Nouveau projet` · `Importer depuis modèle` · `Dupliquer structure` · `Archiver` · `Filtrer`

### Page A3.2 — Fiche projet (onglets)
Onglets : **Général · Chiffrage · Planning · Activités · Équipe · Budget · FT · Avancement · Documents · Historique**

#### Onglet Général
- Champs : code projet (ex. PLANDEVCCM) · libellé · client · site/zone · dates début/fin · devise · statut (brouillon/planifié/actif/suspendu/terminé/clôturé) · équipe principale · responsables · description · type (client/transversal) · flag facturable
- **Boutons :** `Enregistrer` · `Changer de statut` · `Dupliquer` · `Archiver` · `Supprimer` (si brouillon uniquement)

#### Onglet Chiffrage
- Sélection d'un **chiffrage unitaire** de référence
- Champs : volume · indice · dates
- Ventilation par grade (BO, MO1, MO2, FO, DIR, NUM) et par nature (Descente / Élaboration / Transcription / Suivi bénéficiaires / Primes / Démarches admin / Maîtrise d'œuvre numérique)
- Calculs auto affichés : NET À PAYER · TOTAL COÛT · TOTAL DÉPENSES DIRECTES · RESTE · RESTE EHS · POTENTIEL CRÉDIT EHS · RESTE EHS hors transversal
- **Boutons :** `Recalculer` · `Approuver chiffrage` · `Nouvelle version` · `Comparer versions` · `Transformer en budget initial`

#### Onglet Planning (Gantt)
- Vue Gantt + vue tableau
- Ligne = activité (code, nom, type D/E, grade responsable, début, durée, deadline, budget EHS, budget monétaire, niveau)
- **Boutons :** `+ Activité` · `+ Jalon` · `+ Sous-activité` · `Déplacer` (drag) · `Gérer dépendances` · `Figer référence` · `Comparer référence / courant` · `Importer planning` · `Exporter planning`

#### Onglet Activités
Liste des activités (code activité ex. BOX1, FOX43, MOA, MOB1, C) avec statut et avancement.
- **Boutons :** `+ Activité` · `Éditer` · `Saisir avancement` · `Marquer terminée` · `Bloquer` · `Voir affectations`

#### Onglet Équipe
Membres du projet + dates de validité + rôle sur le projet.
- **Boutons :** `+ Membre` · `Retirer` · `Changer rôle` · `Voir disponibilité`

#### Onglet Budget
Budget initial vs consommation vs reste vs coût à terminaison, par activité et par catégorie.
- **Boutons :** `Nouvelle version budgétaire` (motif obligatoire) · `Enregistrer engagement` · `Valider révision` · `Alertes` (seuils dépassés) · `Exporter`

#### Onglet FT (Fiches de trésorerie)
Sous-liste des FT du projet.
- **Boutons :** `+ Nouvelle FT` (raccourci vers A6.3) · `Filtrer par activité` · `Exporter`

#### Onglet Avancement
Saisie avancement physique / temporel / financier par activité.
- **Boutons :** `Enregistrer avancement` · `Soumettre pour validation` · `Historique déclarations`

#### Onglet Documents
Pièces jointes (mercuriales, contrats, PV).
- **Boutons :** `+ Ajouter document` · `Télécharger` · `Supprimer` · `Renommer`

#### Onglet Historique
Journal du projet (audit).
- **Boutons :** `Filtrer` · `Exporter`

### Page A3.3 — Chiffrages unitaires (bibliothèque)
Bibliothèque de chiffrages réutilisables (PLANDEVCCM, ETUPANSFIMUF, MANPANSFICCM, etc.).
Colonnes : code · équipe principale · montant HT · quote-part · volume · NET À PAYER · marge · TOTAL COÛT
- **Boutons :** `+ Nouveau chiffrage unitaire` · `Éditer` · `Dupliquer` · `Nouvelle version` · `Comparer versions` · `Archiver`

#### Formulaire chiffrage unitaire
- Section identité : code · équipe principale · montant HT · quote-part · volume
- Section postes de dépense (hébergement, salle, nutrition, experts, perdiem, communication, transport urbain, coût voyage, descente, impression, abonnement, démarches admin, IR, voyage de dépôt, primes, imprévus, pertes financières)
- Section calculs auto : NET À PAYER · TOTAL COÛT · TOTAL DÉPENSES DIRECTES · marge · RESTE · POTENTIEL CRÉDIT EHS
- **Boutons :** `Recalculer` · `Enregistrer` · `Approuver` · `Historique`

---

## 5. Workspace A4 — Planificateur / Ordonnanceur

**Menu latéral :** Vue portefeuille · Gantt multi-projets · Capacité/charge · Ordonnancement · Scénarios · Conflits

### Page A4.1 — Vue portefeuille (planning)
Gantt multi-projets superposé.
- **Boutons :** `Filtrer projets/équipes/période` · `Zoom jour/semaine/mois` · `Aujourd'hui` · `Exporter`

### Page A4.2 — Gantt d'un projet (drill)
Comme A3.2 onglet Planning mais éditable en pleine page.

### Page A4.3 — Capacité vs charge
Vue équipe × période (jour/semaine/mois) → capacité disponible vs charge planifiée.
- Code couleur : sous-charge / OK / surcharge
- **Boutons :** `Filtrer équipe` · `Zoom` · `Voir détail affectations` · `Exporter`

### Page A4.4 — Ordonnancement
Table de la feuille « Ordonnacement » : Code × grades (PI, CG, ME, BO, BO1…BO7, FO, FO1, MO, MO1, MO2, DIR, NUM…)
- Chaque cellule = charge en homme-jours pour un grade sur une activité
- **Boutons :** `Recalculer ordonnancement` · `Éditer manuellement` · `Détecter conflits` · `Voir échéancier mensuel` · `Exporter`

### Page A4.5 — Scénarios
Création de scénarios alternatifs sans impacter le planning validé.
- **Boutons :** `+ Nouveau scénario` · `Dupliquer scénario` · `Simuler` · `Comparer` · `Promouvoir en scénario retenu`

### Page A4.6 — Conflits & activités orphelines
Liste des : doubles affectations · indisponibilités enfreintes · activités sans ressource · équipes surchargées / sous-chargées.
- **Boutons :** `Résoudre` · `Réaffecter` · `Ignorer avec motif (dérogation tracée)`

---

## 6. Workspace A5 — Manager / Chef d'équipe

**Menu latéral :** Pilotage équipe · Composition · Feuilles de temps équipe · EHS équipe · Absences · Alertes équipe

### Page A5.1 — Pilotage équipe (dashboard)
Reproduit la feuille « Pilotage Equipe » :
- Bloc en-tête : Date début · Date fin · Équipe · Nbre personne · **Potentiel EHS** · **Budget EHS**
- Tableau membres : Matricule · Matricule versionné · Prénom · Nom · Nom complet · Date d'intégration · Mail pro · Statut · Grade · Titre · Manager
- **Boutons :** `Sélectionner période` · `Ajouter membre` (renvoie RH) · `Exporter` · `Ouvrir fiche membre`

### Page A5.2 — Composition équipe (historisée)
Vue « qui est dans l'équipe sur quel mois » (feuille « Détails des Equipes »).
- **Boutons :** `+ Affecter membre à période` · `Retirer d'une période` · `Voir historique complet` · `Exporter`

### Page A5.3 — EHS équipe
Reproduit « Synth EHS EQ » : Matricule Manager · Équipe · Total par mois (janvier → décembre) · Total année.
- **Boutons :** `Recalculer EHS` · `Drill employé` · `Comparer année N-1` · `Exporter`

### Page A5.4 — Feuilles de temps de mon équipe
Liste FT à contrôler.
- Colonnes : employé · période · heures saisies · statut (brouillon/soumis/contrôlé/validé/rejeté/clôturé)
- **Boutons :** `Contrôler` · `Valider` · `Rejeter (motif)` · `Voir détail` · `Rappel employé` · `Exporter`

### Page A5.5 — Absences & disponibilités
Calendrier équipe (congés, absences, indisponibilités).
- **Boutons :** `+ Déclarer absence` · `Approuver` · `Refuser` · `Exporter`

### Page A5.6 — Alertes équipe
Notifications : FT non soumises · dépassements EHS · surcharge · saisies incohérentes.
- **Boutons :** `Marquer traité` · `Ouvrir élément lié` · `Ignorer`

---

## 7. Workspace A6 — Opérations (Chargé de projet / Ordonnateur / Terrain)

**Menu latéral :** Ma journée · Mes activités · Ma feuille de temps · Nouvelle FT · Suivi de production · Documents

### Page A6.1 — Ma journée (dashboard)
- Affectations du jour · FT à saisir · Notifications urgentes · Actions HSE à réaliser
- **Boutons :** `Saisir mes heures aujourd'hui` · `+ Nouvelle FT` · `Signaler incident HSE`

### Page A6.2 — Mes activités
Liste des activités dont l'utilisateur est responsable ou membre.
- **Boutons :** `Filtrer` · `Marquer avancement` · `Ouvrir projet` · `Saisir production`

### Page A6.3 — Nouvelle Fiche de Trésorerie (formulaire)
Formulaire reproduisant la feuille « FT Trésorerie » :
- Code projet · Code activité · **Matricule ordonnateur** (auto-rempli) · Libellé libre · **Matricule destinataire** · Montant · **Justificatifs Oui/Non** · **Conformité mercuriale Oui/Non** · Nom du projet (auto) · Nom de l'activité (auto) · Niveau · Nom du destinataire · Date · Compte source (Banque/Caisse/Compte DG…)
- Contrôles temps réel :
  - alerte si justificatif manquant
  - alerte si non conforme à mercuriale
  - alerte si dépassement budget activité
- **Boutons :** `Enregistrer brouillon` · `Soumettre pour validation` · `Joindre justificatif` · `Dupliquer` · `Annuler`

### Page A6.4 — Ma feuille de temps (saisie hebdo)
Grille jours × projets/activités.
- Types d'heure : Normale · Sup · Nuit · Absence
- Contrôles : doublons, dépassement journalier, projet clôturé, période verrouillée
- **Boutons :** `Enregistrer` · `Soumettre` · `Ajouter ligne` · `Copier semaine précédente` · `Importer depuis modèle` · `Voir motif de rejet`

### Page A6.5 — Suivi de production
Saisie quantités prévues/réalisées par activité et période.
- **Boutons :** `Enregistrer relevé` · `Soumettre` · `Associer cause d'écart` (ressource, équipement, appro, qualité, météo)

### Page A6.6 — Mes documents
Documents rattachés à ses activités.
- **Boutons :** `+ Ajouter` · `Télécharger` · `Supprimer`

---

## 8. Workspace A7 — Finance / Contrôle de gestion

**Menu latéral :** Dashboard finance · Trésorerie (FT) · Comptes · Budgets · Recettes · Récapitulatifs · Validations · Clôtures financières · Exports comptables

### Page A7.1 — Dashboard finance
- KPI : solde total · encaissements mois · décaissements mois · FT en attente · budget consommé % · écart trésorerie
- Widgets : évolution soldes · top 10 dépenses · alertes seuil

### Page A7.2 — Fiches de trésorerie (FT)
Liste globale reproduisant « FT Trésorerie ».
- Colonnes : Code projet · Code activité · Matricule ordonnateur · Libellé libre · Matricule destinataire · Montant · Justificatifs · Mercuriale · Nom projet · Nom activité · Niveau · **Validation** · Nom destinataire · Date · Compte
- Filtres : projet, activité, ordonnateur, période, statut, compte
- **Boutons :** `+ Nouvelle FT` · `Éditer` · `Valider` · `Rejeter (motif)` · `Escalader` · `Exporter Excel/PDF` · `Voir justificatif` · `Rapprochement bancaire`

### Page A7.3 — Comptes financiers
Liste des comptes (Banque Afriland, Caisse, Compte DG, Compte Julienne, Compte Ajara, Caisse 2).
- Pour chaque : solde en temps réel · mouvements du mois
- **Boutons :** `Voir mouvements` · `Rapprocher` · `Approvisionner (transfert inter-compte)` · `Exporter relevé`

### Page A7.4 — Budgets
Reproduit la feuille « Budget » : projets × activités × budget monétaire · consommation · reste · progression.
Sous-onglet **Budget Monétaire** (BA parentaux, BB relations pub, BE01 imprévus, DA…) : codes × équipes × niveaux × montants mensuels × total.
- **Boutons :** `+ Nouvelle ligne budgétaire` · `Nouvelle version` (motif) · `Approuver révision` · `Verrouiller période` · `Alertes seuils` · `Exporter`

### Page A7.5 — Recettes
Reproduit « Recettes Monétaire » : encaissements clients, financements par projet × mois.
- **Boutons :** `+ Nouvelle recette` · `Éditer` · `Importer` · `Exporter` · `Rapprocher facture`

### Page A7.6 — Récapitulatifs (RECP)
Vue synthétique : Dépenses EHS · Dépenses monétaires · Recettes · Budgets EHS/monétaire sur période.
- **Boutons :** `Sélectionner période` · `Exporter PDF` · `Comparer périodes`

### Page A7.7 — Validations en attente (finance)
File d'attente FT + révisions budgétaires + demandes d'approvisionnement.
- **Boutons :** `Approuver` · `Rejeter` · `Escalader vers DG` · `Voir détail` · `Bloc traitement`

### Page A7.8 — Clôtures financières
Périodes financières : mois · statut ouvert/clôturé/verrouillé.
- **Boutons :** `Clôturer` · `Réouvrir (motif)` · `Verrouiller définitivement`

### Page A7.9 — Exports comptables
Exports vers l'outil comptable externe (OHADA/SYSCOHADA) — Excel/CSV.
- **Boutons :** `Générer export période` · `Télécharger` · `Historique exports`

---

## 9. Workspace A8 — Ressources Humaines

**Menu latéral :** Personnel · Nouvel employé · Équipes · Absences · Contrats · Compétences · Versions matricule

### Page A8.1 — Liste du personnel
Reproduit « Liste du personnel » : Matricule · Nom · Prénom · Grade · Équipe · Statut · Date d'intégration · Mail pro.
- **Boutons :** `+ Nouvel employé` · `Éditer` · `Désactiver` · `Importer CSV` · `Exporter` · `Filtrer par équipe/grade/statut`

### Page A8.2 — Fiche employé (onglets)
Onglets : **Général · Grade/Équipe · Versions · Absences · Compétences · Contrats · Historique EHS · Documents**

#### Onglet Général
- Matricule · Matricule versionné (ex. BO001V1) · Prénom · Nom · Nom complet · Date d'intégration · Mail pro · Statut · Grade · Titre · Manager · Coût de référence · Coordonnées
- **Boutons :** `Enregistrer` · `Réinitialiser mot de passe` · `Générer nouvelle version` · `Désactiver`

#### Onglet Grade / Équipe
Affectation actuelle + historique.
- **Boutons :** `Changer de grade` (crée une nouvelle version) · `Changer d'équipe` (idem) · `Voir historique`

#### Onglet Versions
Historique versionné des matricules (VersionEmploye) avec date de début/fin, grade, équipe.
- **Boutons :** `+ Nouvelle version` · `Clôturer version` · `Exporter historique`

#### Onglet Absences
Calendrier des absences validées.
- **Boutons :** `+ Déclarer` · `Valider` · `Refuser` · `Exporter`

#### Onglet Compétences & habilitations
Liste des compétences requises/disponibles.
- **Boutons :** `+ Ajouter compétence` · `Certifier` · `Retirer` · `Voir échéance`

#### Onglet Contrats
Liste des contrats opérationnels (type, dates, taux).
- **Boutons :** `+ Nouveau contrat` · `Éditer` · `Terminer`

#### Onglet Historique EHS
Reproduit ligne de « Synth EHS » : Matricule · Nom · Total mois × 12 · Total année.
- **Boutons :** `Recalculer` · `Exporter`

### Page A8.3 — Équipes
Liste des équipes (PI, BO, BO1..BO7, FO, FO1, MO, MO1, MO2, DIR, NUM, RE).
- **Boutons :** `+ Nouvelle équipe` · `Désigner manager` · `Ajouter membre` · `Retirer` · `Voir composition par période`

### Page A8.4 — Absences (vue globale)
Calendrier consolidé + soldes de congés.
- **Boutons :** `Filtrer` · `Approuver en masse` · `Exporter`

---

## 10. Workspace A9 — HSE / EHS

**Menu latéral :** Dashboard HSE · Incidents · Inspections · Actions correctives · Indicateurs · Dispositif EHS · Budget HSE

### Page A9.1 — Dashboard HSE
- KPI : nb incidents mois · taux fréquence · taux gravité · actions ouvertes/en retard · budget HSE consommé
- Widgets : incidents par type · pyramide de Bird · évolution 12 mois

### Page A9.2 — Incidents
Liste : date · lieu · projet · type (incident/accident/presque-accident/observation/non-conformité) · gravité · statut.
- **Boutons :** `+ Déclarer` (formulaire : date, lieu, projet, personnes concernées, gravité, description, pièces jointes) · `Éditer` · `Clôturer` · `Exporter`

### Page A9.3 — Inspections & causeries
- **Boutons :** `+ Nouvelle inspection` · `+ Causerie sécurité` · `+ Visite chantier` · `Planifier` · `Clôturer`

### Page A9.4 — Actions correctives
Kanban ou liste (à faire / en cours / en retard / fait / clôturée).
- **Boutons :** `+ Nouvelle action` (responsable, échéance, priorité) · `Assigner` · `Marquer faite` · `Valider efficacité` · `Réouvrir` · `Exporter`

### Page A9.5 — Indicateurs HSE
Calculs automatiques (TF, TG, TCA, taux de clôture actions).
- **Boutons :** `Recalculer` · `Exporter rapport HSE mensuel`

### Page A9.6 — Dispositif EHS (calculs)
Cœur différenciant. Reproduit « Budget EHS » + « Synth EHS » + « Synth EHS EQ ».
- Sélection période (mois, année)
- Tableau : employé × mois → Potentiel EHS · Budget EHS · Crédit EHS
- Sous-onglets : Par employé · Par équipe · Transversal vs Hors transversal
- **Boutons :** `Recalculer potentiel` · `Recalculer budget` · `Recalculer crédit` · `Voir formule` · `Comparer prévision/réalisé` · `Exporter`

### Page A9.7 — Budget HSE
Suivi coûts EHS/HSE spécifiques.
- **Boutons :** `+ Ligne budgétaire` · `Suivi consommation` · `Exporter`

---

## 11. Workspace A10 — Consultation / Auditeur (lecture seule)

**Menu latéral :** Dashboards autorisés · Rapports · Exports · Historique

### Page A10.1 — Dashboards autorisés
Vue des tableaux de bord auxquels l'utilisateur a droit (filtrés par admin).
- **Boutons :** `Filtrer` · `Exporter` · `Consulter`

### Page A10.2 — Rapports
Catalogue de rapports figés RAP-01 à RAP-10.
- **Boutons :** `Télécharger PDF` · `Télécharger Excel` · `Historique versions`

### Page A10.3 — Exports
- **Boutons :** `Générer export période` · `Télécharger` · `Voir journal d'exports`

### Page A10.4 — Historique audité
Visualisation du journal d'audit (limité à son périmètre).
- **Boutons :** `Filtrer` · `Exporter`

---

## 12. Modules techniques transverses (visible partout)

### Barre supérieure — Éléments et actions
| Élément | Action / bouton |
|--------|-----------------|
| Logo NAUMUR/PERLE | Retour dashboard workspace |
| Recherche globale (`Ctrl+K`) | Recherche projets, personnes, activités, FT, documents |
| Sélecteur d'exercice | Choix année comptable |
| Sélecteur de langue | FR / EN (autres langues déjà ajoutées d'après le commit) |
| Cloche notifications | Ouvre panneau : validations attendues, alertes, rappels, mentions |
| Avatar / Profil | Menu : Mon profil · Préférences · Sécurité (MFA) · Déconnexion |

### Centre de notifications (panneau)
- Filtre : Tout · Non lu · Validations · Alertes · Retards · HSE
- Actions par notif : `Ouvrir` · `Marquer lu` · `Archiver` · `Regrouper` · `Configurer canaux` (in-app, email)

### Recherche globale (modale)
- Onglets : Projets · Personnes · Activités · FT · Documents
- Résultats cliquables avec accès direct

### Composants récurrents
- **Tables** : tri, filtres avancés, colonnes configurables, pagination, export CSV/Excel/PDF, vues favorites
- **Formulaires** : validation champs obligatoires, tooltip d'aide, contrôles serveur, message d'erreur métier explicite
- **Timeline / audit** : sur chaque fiche, onglet « Historique » listant qui a fait quoi et quand

---

## 13. Matrice croisée — Feuilles Excel → Pages de l'application

| Feuille Excel source | Workspace / Page cible |
|----------------------|-------------------------|
| Chiffrage Unitaire | A3.3 Bibliothèque chiffrages unitaires |
| Chiffrage projets | A3.2 Onglet Chiffrage de la fiche projet |
| Project Plan / Project Plan brut | A3.2 Onglet Planning + A4.2 Gantt |
| Ordonnacement | A4.4 Ordonnancement |
| FT | A6.3 Formulaire FT + A7.2 Liste FT |
| FT Trésorerie | A7.2 Fiches de trésorerie |
| Budget EHS | A9.6 Dispositif EHS |
| Pilotage Equipe & Pilotage Equipe (2) | A5.1 Pilotage équipe |
| Détails des Equipes | A5.2 Composition équipe historisée |
| Liste du personnel | A8.1 Liste du personnel |
| Synth H | A8.2 Onglet Historique heures / RAP-03 |
| Synth EQ | A5.3 EHS équipe (variante heures) |
| Synth EHS | A8.2 Onglet Historique EHS |
| Synth EHS EQ | A5.3 EHS équipe |
| Recettes Monétaire | A7.5 Recettes |
| Budget Monétaire / Budget | A7.4 Budgets |
| RECP | A7.6 Récapitulatifs |
| Feuil2 | A1.4 Référentiels (technique / paramétrage) |

---

## 14. Synthèse quantitative

- **10 workspaces** (un par rôle)
- **~55 pages** au total (moyenne 5 à 8 pages par workspace)
- **~180 boutons/actions** identifiés
- **Environ 30 entités métier** en base (Employe, VersionEmploye, Equipe, ChiffrageUnitaire, ChiffrageProjet, Projet, Activite, LignePlanning, FicheTresorerie, CompteFinancier, BudgetLigne, Recette, PotentielEHS, BudgetEHS, CreditEHS, SyntheseEHSEmploye, SyntheseEHSEquipe, IncidentHSE, ActionCorrective, Utilisateur, Rôle, Permission, Client, Grade, PosteDepense, Mercuriale, ParametreGlobal, JournalAudit, Notification, PieceJointe)

---

## 15. Recommandations de priorisation (MVP)

**Phase 1 — MVP** (workspaces essentiels)
- A1 (partiel : utilisateurs, référentiels, audit)
- A3 (fiche projet, chiffrage, planning)
- A5 (pilotage équipe)
- A6 (feuille de temps, FT)
- A8 (personnel, équipes)

**Phase 2 — Contrôle financier**
- A7 complet (trésorerie, budgets, recettes, clôtures)
- A2 partiel (validations, trésorerie consolidée)

**Phase 3 — Pilotage avancé**
- A4 (ordonnancement, capacité, scénarios)
- A9 (HSE complet + dispositif EHS)
- A2 complet (dashboard exécutif)
- A10 (consultation)
- A1 complet (sauvegardes, exports, notifications broadcast)

---

*Document généré à partir de l'analyse croisée des deux cahiers des charges et du classeur Excel source. À valider par les responsables métier avant intégration au backlog frontend.*
