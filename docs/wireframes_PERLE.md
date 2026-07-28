# Wireframes — Application PERLE (ERP NAUMUR)

Maquettes filaires textuelles (ASCII) de tous les workspaces.
Document compagnon de [analyse_workspaces_PERLE.md](analyse_workspaces_PERLE.md).

**Légende des symboles**

| Symbole | Signification |
|---|---|
| `[ Bouton ]` | Bouton d'action primaire |
| `( Bouton )` | Bouton secondaire / lien |
| `[▾ Champ ]` | Liste déroulante |
| `[_______]` | Champ de saisie texte |
| `[x]` / `[ ]` | Case à cocher (cochée / décochée) |
| `(•)` / `( )` | Bouton radio |
| `▓▓▓░░░` | Barre de progression |
| `●` | Pastille de statut / notification |
| `≡` | Poignée de glisser-déposer |
| `⋮` | Menu contextuel (3 points) |

---

## 0. Structure globale (shell applicatif)

Toutes les pages partagent la même ossature : barre supérieure fixe + menu latéral filtré par rôle + zone de contenu.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  ◆ PERLE   [🔍 Rechercher... (Ctrl+K)_______________]  [▾ Exercice 2026] [▾ FR] ●3🔔 (👤)│
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│                │  Accueil > Projets > PLAN DEV CCM                          [ Exporter ] │
│  ▸ Tableau     │ ┌─────────────────────────────────────────────────────────────────────┐ │
│    de bord     │ │                                                                     │ │
│  ▸ Module 1    │ │                                                                     │ │
│  ▸ Module 2    │ │                     ZONE DE CONTENU                                 │ │
│  ▸ Module 3    │ │                                                                     │ │
│  ▸ Module 4    │ │                                                                     │ │
│  ▸ Module 5    │ │                                                                     │ │
│                │ │                                                                     │ │
│  ───────────   │ │                                                                     │ │
│  ⚙ Paramètres  │ │                                                                     │ │
│  ↩ Déconnexion │ └─────────────────────────────────────────────────────────────────────┘ │
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### 0.1 Écran de connexion

```
                    ┌───────────────────────────────────────────┐
                    │                                           │
                    │              ◆ P E R L E                  │
                    │       Pilotage intégré — NAUMUR SARL      │
                    │                                           │
                    │   Email professionnel                     │
                    │   [_____________________________________] │
                    │                                           │
                    │   Mot de passe                            │
                    │   [_____________________________________] │
                    │                                           │
                    │   [x] Se souvenir de moi                  │
                    │                                           │
                    │   [        S E   C O N N E C T E R      ] │
                    │                                           │
                    │   ( Mot de passe oublié ? )               │
                    │   ─────────── ou ───────────              │
                    │   ( 🔑 Connexion SSO entreprise )         │
                    │                                           │
                    │   [▾ Français ]                           │
                    └───────────────────────────────────────────┘
```

### 0.2 Panneau de notifications (overlay depuis 🔔)

```
                                   ┌──────────────────────────────────────────┐
                                   │ Notifications          ( Tout marquer lu )│
                                   │ [Tout][Non lu][Validations][Alertes][HSE]│
                                   ├──────────────────────────────────────────┤
                                   │ ● FT #2418 en attente de votre validation│
                                   │   PLANDEVCCM · 250 000 FCFA · il y a 2 h │
                                   │   [ Valider ] ( Rejeter ) ( Ouvrir )     │
                                   ├──────────────────────────────────────────┤
                                   │ ● Budget dépassé — activité BOX1 (112 %) │
                                   │   il y a 5 h            ( Ouvrir )       │
                                   ├──────────────────────────────────────────┤
                                   │ ○ 3 feuilles de temps non soumises       │
                                   │   Équipe BO · hier      ( Ouvrir )       │
                                   ├──────────────────────────────────────────┤
                                   │ ○ Action HSE #17 échue depuis 3 j        │
                                   │   il y a 1 j            ( Ouvrir )       │
                                   ├──────────────────────────────────────────┤
                                   │          ( Voir tout ) ( ⚙ Canaux )      │
                                   └──────────────────────────────────────────┘
```

### 0.3 Recherche globale (modale Ctrl+K)

```
        ┌──────────────────────────────────────────────────────────────────┐
        │ 🔍 [ pansfi______________________________________________ ]  ESC │
        │ [Tout] [Projets] [Personnes] [Activités] [FT] [Documents]        │
        ├──────────────────────────────────────────────────────────────────┤
        │ PROJETS                                                          │
        │  📁 ETUDE PANSFI MUFID          ETUPANSFIMUF   · Actif           │
        │  📁 MANUEL PANSFI CCM           MANPANSFICCM   · Clôturé         │
        │  📁 ETUDE PANSFI CAPFI          ETUPANSFICAPFI · Actif           │
        │ ACTIVITÉS                                                        │
        │  ⚙ Élaboration des livrables    BOX1 · ETUPANSFIMUF              │
        │ FICHES DE TRÉSORERIE                                             │
        │  💰 FT #1204 — perdiem descente  140 000 FCFA · 12/07            │
        │ PERSONNES                                                        │
        │  👤 Theodore BESSALA            BO001V1 · Équipe BO              │
        ├──────────────────────────────────────────────────────────────────┤
        │ ↑↓ naviguer · ↵ ouvrir · ESC fermer                              │
        └──────────────────────────────────────────────────────────────────┘
```

---

## 1. Workspace A1 — Administrateur applicatif

### A1.1 Dashboard Admin

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍 Rechercher...]                    [▾ 2026] [▾ FR] ●1🔔 (👤 Admin)         │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Dashboard  ◀ │ Administration › Tableau de bord                                        │
│ ▸ Utilisateurs │                                                                         │
│ ▸ Rôles/Perms  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ ▸ Référentiels │ │ UTILIS.  │ │ SESSIONS │ │ ERREURS  │ │ DERNIÈRE │ │ TÂCHES   │        │
│ ▸ Paramètres   │ │ ACTIFS   │ │ EN COURS │ │   24 H   │ │ SAUVEG.  │ │ CELERY   │        │
│ ▸ Import/Exp.  │ │    47    │ │    12    │ │    3 ●   │ │ 03:00 ✓  │ │    2 ⟳   │        │
│ ▸ Audit        │ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│ ▸ Sauvegardes  │                                                                         │
│                │ ┌───────────────────────────────┐ ┌───────────────────────────────────┐ │
│ ───────────    │ │ CONNEXIONS RÉCENTES           │ │ ALERTES SYSTÈME                   │ │
│ ⚙ Paramètres   │ │ 09:41 T. BESSALA    ✓ OK      │ │ ⚠ Stockage à 78 % (390 Go/500)   │ │
│ ↩ Déconnexion  │ │ 09:38 J. EKOUMA     ✓ OK      │ │ ⚠ 3 échecs de connexion (A. LAM.)│ │
│                │ │ 09:12 A. LAMARE     ✗ Échec×3 │ │ ✓ Restauration testée le 12/07    │ │
│                │ │ 08:55 M. NKOA       ✓ OK      │ │                                   │ │
│                │ │            ( Voir tout )      │ │        ( Voir le journal )        │ │
│                │ └───────────────────────────────┘ └───────────────────────────────────┘ │
│                │                                                                         │
│                │ [ Lancer sauvegarde ] [ Purger cache ] [ Journal d'audit ] [ Broadcast ]│
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A1.2 Gestion des utilisateurs

```
│ Administration › Utilisateurs                                                            │
│                                                                                          │
│ [▾ Rôle: Tous ] [▾ Statut: Actifs ] [▾ Équipe: Toutes ] [🔍 Nom/email____]  ( Réinit. )  │
│                                          [ + Nouvel utilisateur ] ( Importer ) ( Export )│
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │[ ]│ NOM              │ EMAIL              │ RÔLE(S)        │PÉRIM.│STATUT│ DERN.CONN.│⋮││
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │[ ]│ Ajara LAMARE     │ a.lamare@naumur.cm │ Direction      │Global│ ●Actif│ 28/07 09:12│⋮││
│ │[ ]│ Theodore BESSALA │ t.bessala@...      │ Chef projet,   │ 4 prj│ ●Actif│ 28/07 09:41│⋮││
│ │   │                  │                    │ Manager BO     │      │       │           │⋮││
│ │[ ]│ Julienne EKOUMA  │ j.ekouma@...       │ Finance        │Financ│ ●Actif│ 28/07 09:38│⋮││
│ │[ ]│ Marc NKOA        │ m.nkoa@...         │ Opérations     │ 2 prj│ ●Actif│ 28/07 08:55│⋮││
│ │[ ]│ Paul ATANGANA    │ p.atangana@...     │ Lecture seule  │ 1 prj│ ○Inact│ 12/06 14:20│⋮││
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ 2 sélectionnés → [ Désactiver ] [ Changer rôle ] [ Exporter ]     ◀ 1 2 3 ▶  47 résultats│
│                                                                                          │
│ Menu ⋮ : Éditer · Réinitialiser MDP · Désactiver · Voir historique · Déléguer            │
```

**Modal « + Nouvel utilisateur »**

```
        ┌─────────────────────────────────────────────────────────────┐
        │ Nouvel utilisateur                                      [✕] │
        ├─────────────────────────────────────────────────────────────┤
        │ Prénom *          [___________________]                     │
        │ Nom *             [___________________]                     │
        │ Email pro *       [___________________________________]     │
        │ Employé lié       [▾ Rechercher un matricule...      ]      │
        │                                                             │
        │ RÔLES *  [x] Chef de projet   [ ] Direction                 │
        │          [ ] Planificateur    [ ] Manager d'équipe          │
        │          [ ] Opérations       [ ] Finance                   │
        │          [ ] RH               [ ] HSE                       │
        │          [ ] Lecture seule    [ ] Administrateur            │
        │                                                             │
        │ PÉRIMÈTRE                                                   │
        │ (•) Projets affectés  ( ) Équipe  ( ) Global                │
        │ Projets  [▾ PLANDEVCCM ✕] [▾ ETUPANSFIMUF ✕] [ + Ajouter ]  │
        │                                                             │
        │ [x] Envoyer un email d'invitation                           │
        │ [x] Forcer le changement de mot de passe à la 1re connexion │
        ├─────────────────────────────────────────────────────────────┤
        │                          ( Annuler )  [ Créer l'utilisateur]│
        └─────────────────────────────────────────────────────────────┘
```

### A1.3 Rôles & permissions (matrice)

```
│ Administration › Rôles & permissions            [ + Nouveau rôle ] ( Dupliquer )         │
│                                                                                          │
│ Rôle sélectionné : [▾ Chef de projet ]                        7 utilisateurs concernés   │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ RESSOURCE          │Consult.│ Créer │Modif. │Valider│Clôtur.│Export.│ Admin │        │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Projets            │  [x]   │  [x]  │  [x]  │  [ ]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ Activités          │  [x]   │  [x]  │  [x]  │  [x]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ Chiffrage unitaire │  [x]   │  [ ]  │  [ ]  │  [ ]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ Chiffrage projet   │  [x]   │  [x]  │  [x]  │  [ ]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ Planning / Gantt   │  [x]   │  [x]  │  [x]  │  [ ]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ Feuilles de temps  │  [x]   │  [x]  │  [x]  │  [x]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ Fiches trésorerie  │  [x]   │  [x]  │  [ ]  │  [ ]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ Budgets            │  [x]   │  [ ]  │  [ ]  │  [ ]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ Personnel          │  [x]   │  [ ]  │  [ ]  │  [ ]  │  [ ]  │  [ ]  │  [ ]  │        │ │
│ │ Dispositif EHS     │  [x]   │  [ ]  │  [ ]  │  [ ]  │  [ ]  │  [x]  │  [ ]  │        │ │
│ │ HSE / Incidents    │  [x]   │  [x]  │  [ ]  │  [ ]  │  [ ]  │  [ ]  │  [ ]  │        │ │
│ │ Journal d'audit    │  [ ]   │  [ ]  │  [ ]  │  [ ]  │  [ ]  │  [ ]  │  [ ]  │        │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⚠ 4 modifications non enregistrées          ( Annuler )  [ Enregistrer les modifications ]│
```

### A1.4 Référentiels (hub à onglets)

```
│ Administration › Référentiels                                                            │
│ ┌────────┬─────────┬────────┬────────┬───────────┬────────────┬───────┬───────┬────────┐ │
│ │ Grades │ Postes  │Comptes │Clients │Types proj.│Mercuriales │Calend.│ Zones │ + 3 ▾  │ │
│ └────────┴─────────┴────────┴────────┴───────────┴────────────┴───────┴───────┴────────┘ │
│  ▲ onglet actif : Grades                                                                 │
│                                    [ + Ajouter ] ( Importer ) ( Export ) ( Doublons ? )  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ CODE │ LIBELLÉ                    │ TAUX STD (FCFA/j) │ COÛT STD │ ORDRE │ ÉTAT  │ ⋮ │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ PI   │ Pilotage / Intégration     │        25 000     │  18 000  │   1   │●Actif │ ⋮ │ │
│ │ DIR  │ Direction                  │        40 000     │  32 000  │   2   │●Actif │ ⋮ │ │
│ │ BO   │ Back Office                │        15 000     │  11 000  │   3   │●Actif │ ⋮ │ │
│ │ FO   │ Front Office               │        14 000     │  10 500  │   4   │●Actif │ ⋮ │ │
│ │ MO1  │ Maîtrise d'œuvre niveau 1  │        12 000     │   9 000  │   5   │●Actif │ ⋮ │ │
│ │ MO2  │ Maîtrise d'œuvre niveau 2  │        10 000     │   7 500  │   6   │●Actif │ ⋮ │ │
│ │ NUM  │ Maîtrise d'œuvre numérique │        18 000     │  13 000  │   7   │●Actif │ ⋮ │ │
│ │ RE   │ Ressources / Régie         │         9 000     │   7 000  │   8   │●Actif │ ⋮ │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Un référentiel utilisé ne peut pas être supprimé — utilisez « Inactiver » ou « Fusionner ».│
│ Menu ⋮ : Éditer · Fusionner vers... · Inactiver · Voir usages (12 objets liés)            │
```

### A1.5 Paramètres globaux

```
│ Administration › Paramètres globaux                     ( Historique ) [ Enregistrer ]   │
│ ┌────────────────────────────────────────┐ ┌───────────────────────────────────────────┐ │
│ │ CALCULS MÉTIER                         │ │ SÉCURITÉ                                  │ │
│ │ Taux EHS (par unité)   [ 150______] FCFA│ │ Longueur min. mot de passe  [ 12___]     │ │
│ │ Taux parentaux         [ 5______] %     │ │ [x] Majuscule + chiffre + spécial requis  │ │
│ │ Taux d'imprévu         [ 3______] %     │ │ Expiration mot de passe     [ 90___] j    │ │
│ │ Taux charges financ.   [ 2______] %     │ │ [ ] Authentification MFA obligatoire      │ │
│ │ Arrondi montants       [▾ Entier ]      │ │ [ ] SSO / OIDC activé                     │ │
│ └────────────────────────────────────────┘ │ Durée session inactive      [ 30___] min  │ │
│ ┌────────────────────────────────────────┐ └───────────────────────────────────────────┘ │
│ │ LOCALISATION                           │ ┌───────────────────────────────────────────┐ │
│ │ Devise         [▾ FCFA (XAF) ]         │ │ SEUILS D'ALERTE                           │ │
│ │ Fuseau horaire [▾ Africa/Douala ]      │ │ Dépassement budget activité  [ 90__] %    │ │
│ │ Format date    [▾ JJ/MM/AAAA ]         │ │ Solde trésorerie plancher  [ 500000_]FCFA │ │
│ │ Langue défaut  [▾ Français ]           │ │ Retard planning            [ 5___] jours  │ │
│ │ Langues actives [x]FR [x]EN [ ]ES      │ │ Action HSE échue           [ 0___] jours  │ │
│ └────────────────────────────────────────┘ └───────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ EXERCICE & PÉRIODES                                                                  │ │
│ │ Exercice en cours [▾ 2026 ]   Début exercice [ 01/01/2026 ]  Fin [ 31/12/2026 ]      │ │
│ │ [x] Verrouiller automatiquement les mois clôturés                                    │ │
│ │ [x] Interdire la saisie sur période clôturée (sauf ajustement tracé)                 │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                     ( Rétablir valeurs par défaut )  [ Enregistrer ]     │
```

### A1.6 Import / Export (assistant en 4 étapes)

```
│ Administration › Import                                                                  │
│  ①Fichier ──── ②Correspondance ──── ③Prévisualisation ──── ④Validation                  │
│  ●━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━○                              │
│                          ▲ étape courante : Prévisualisation (staging)                   │
│ Entité : Fiches de trésorerie   ·   Fichier : FT_juillet_2026.xlsx   ·   1 317 lignes    │
│                                                                                          │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                             │
│ │ ✓ ACCEPTÉES│ │ ⚠ ALERTES  │ │ ✗ REJETÉES │ │ ⧉ DOUBLONS │                             │
│ │    1 254   │ │     38     │ │     25     │ │     12     │                             │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘                             │
│ [Tout] [Acceptées] [Alertes] [Rejetées] [Doublons]                                       │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ L. │ÉTAT│ CODE PROJET  │ACTIVITÉ│ ORDONN.│ MONTANT │ MOTIF                           │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 47 │ ✗  │ NAUTRAJUI24  │ FA07   │ RE001  │   2 000 │ Activité FA07 inconnue          │ │
│ │ 52 │ ⚠  │ NAUTRAJUIN24 │ FH02   │ BO001V1│  10 000 │ Justificatif = NON              │ │
│ │ 88 │ ⧉  │ PLANDEVCCM   │ BOX1   │ BO001V1│ 140 000 │ Doublon probable de la ligne 61 │ │
│ │103 │ ✗  │ (vide)       │ MOA    │ MO002  │  50 000 │ Code projet obligatoire         │ │
│ │121 │ ⚠  │ ETUPANSFIMUF │ FOX43  │ FO001  │ 250 000 │ Dépasse le budget activité (108%)│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Aucune donnée validée ne sera écrasée silencieusement (règle IMP-05).                  │
│  ( ◀ Retour ) ( Télécharger le rapport ) ( Annuler l'import )  [ Valider 1 254 lignes ▶ ]│
```

### A1.7 Journal d'audit

```
│ Administration › Journal d'audit                                                         │
│ [▾ Utilisateur: Tous][▾ Entité: Toutes][▾ Action: Toutes][ 01/07/26 ]→[ 28/07/26 ][🔍___]│
│                                                       ( Exporter CSV ) ( Exporter PDF )  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ DATE/HEURE       │ UTILISATEUR   │ ACTION   │ OBJET              │ AVANT → APRÈS │ ⋮ │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 28/07/26 09:41:12│ T. BESSALA    │ VALIDER  │ FT #2418           │ Attente→Validé│ 👁 │ │
│ │ 28/07/26 09:22:05│ J. EKOUMA     │ MODIFIER │ Budget BOX1        │ 140000→160000 │ 👁 │ │
│ │ 28/07/26 08:57:33│ A. LAMARE     │ CLÔTURER │ Période juin 2026  │ Ouvert→Clôturé│ 👁 │ │
│ │ 27/07/26 17:04:18│ M. NKOA       │ CRÉER    │ FT #2417           │ —             │ 👁 │ │
│ │ 27/07/26 16:30:00│ admin         │ EXPORTER │ Synth EHS (2 542 l)│ —             │ 👁 │ │
│ │ 27/07/26 15:12:44│ T. BESSALA    │ REJETER  │ FDT S29 M.NKOA     │ Soumis→Rejeté │ 👁 │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Journal immuable — aucune suppression possible.        ◀ 1 2 3 … 84 ▶  4 187 entrées  │
```

### A1.8 Sauvegardes & maintenance

```
│ Administration › Sauvegardes                     [ Sauvegarde manuelle ] ( ⚙ Planifier ) │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Planification active : quotidienne à 03:00 · rétention 30 jours · chiffrement AES-256│ │
│ │ RPO cible : 24 h  ·  RTO cible : 8 h  ·  Dernier test de restauration : 12/07/26 ✓   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ DATE             │ TYPE      │ TAILLE  │ DURÉE  │ STATUT    │ ACTIONS                │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 28/07/26 03:00   │ Auto      │ 2,4 Go  │ 4 min  │ ✓ Succès  │ (↓) (⟲ Restaurer) (🗑) │ │
│ │ 27/07/26 03:00   │ Auto      │ 2,4 Go  │ 4 min  │ ✓ Succès  │ (↓) (⟲ Restaurer) (🗑) │ │
│ │ 26/07/26 14:22   │ Manuelle  │ 2,3 Go  │ 5 min  │ ✓ Succès  │ (↓) (⟲ Restaurer) (🗑) │ │
│ │ 26/07/26 03:00   │ Auto      │ 2,3 Go  │ —      │ ✗ Échec   │ ( Voir l'erreur )      │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                        [ Tester une restauration à blanc ]│
```

---

## 2. Workspace A2 — Direction (DG / Sponsor)

### A2.1 Dashboard exécutif

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                                  [▾ 2026] [▾ FR] ●5🔔 (👤 A. LAMARE — DG)│
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Dashboard  ◀ │ Direction › Tableau de bord exécutif                                    │
│ ▸ Portefeuille │ [▾ Période: Juil. 2026 ][▾ Client: Tous ][▾ Équipe: Toutes ] ( Réinit. )│
│ ▸ Trésorerie   │                                    [ ⟳ Rafraîchir ] ( PDF ) ( Excel )   │
│ ▸ EHS consol.  │ ┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐ │
│ ▸ Validations●5│ │ CA À DATE  ││   MARGE    ││ TRÉSORERIE ││  PROJETS   ││  EHS MOIS  │ │
│ ▸ Clôtures     │ │ 48,2 M     ││  49,7 %    ││  12,4 M    ││ 14 actifs  ││  186 400   │ │
│ ▸ Rapports     │ │ FCFA ▲12 % ││   ▲2,1 pt  ││ FCFA ▼3 %  ││ 3 en retard││ FCFA ▲8 %  │ │
│                │ └────────────┘└────────────┘└────────────┘└────────────┘└────────────┘ │
│ ───────────    │ ┌─────────────────────────────────────┐┌──────────────────────────────┐ │
│ ⚙ Paramètres   │ │ TRÉSORERIE — 12 DERNIERS MOIS       ││ TOP 5 PROJETS PAR MARGE      │ │
│ ↩ Déconnexion  │ │  M                                  ││ ETUPANSFICOOPECFO   49,9 % ▓▓│ │
│                │ │ 20┤        ╭─╮      ╭──╮            ││ MANPANSFICCM        50,3 % ▓▓│ │
│                │ │ 15┤   ╭────╯ ╰──────╯  ╰─╮          ││ ETUPANSFIMUF        49,7 % ▓▓│ │
│                │ │ 10┤╭──╯                  ╰──        ││ PLANDEVCCM          40,0 % ▓ │ │
│                │ │  5┤╯                                ││ ETUPANSFICAPFI      38,2 % ▓ │ │
│                │ │  0└┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬─ ││                              │ │
│                │ │    A  S  O  N  D  J  F  M  A  M  J  ││       ( Voir tout )          │ │
│                │ │  ── Solde  ┄┄ Prévision                                             │ │
│                │ └─────────────────────────────────────┘└──────────────────────────────┘ │
│                │ ┌─────────────────────────────────────┐┌──────────────────────────────┐ │
│                │ │ DÉPASSEMENTS BUDGÉTAIRES            ││ EHS PAR ÉQUIPE (mois)        │ │
│                │ │ ⚠ BOX1  ETUPANSFIMUF  112 % ▓▓▓▓▓▓░ ││ BO  ▓▓▓▓▓▓▓▓▓▓▓▓  62 400     │ │
│                │ │ ⚠ MOA   PLANDEVCCM    108 % ▓▓▓▓▓▓░ ││ MO  ▓▓▓▓▓▓▓▓▓     48 100     │ │
│                │ │ ⚠ FOX43 MANPANSFICCM  103 % ▓▓▓▓▓░░ ││ FO  ▓▓▓▓▓▓▓       36 800     │ │
│                │ │ ⚠ FA07  NAUTRAJUI24   101 % ▓▓▓▓▓░░ ││ PI  ▓▓▓▓▓         24 600     │ │
│                │ │            ( Voir tout )            ││ RE  ▓▓▓           14 500     │ │
│                │ └─────────────────────────────────────┘└──────────────────────────────┘ │
│                │ ┌──────────────────────────────────────────────────────────────────────┐│
│                │ │ DÉCISIONS EN ATTENTE                                            ●5   ││
│                │ │ ● Révision budgétaire ETUPANSFIMUF (+20 M)   J. EKOUMA  [Voir]       ││
│                │ │ ● FT #2418 — 850 000 FCFA > seuil           M. NKOA    [Voir]       ││
│                │ │ ● Clôture période juin 2026                 J. EKOUMA  [Voir]       ││
│                │ └──────────────────────────────────────────────────────────────────────┘│
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A2.2 Portefeuille projets

```
│ Direction › Portefeuille                                                                 │
│ [▾ Statut: Actifs ][▾ Client: Tous ][▾ Équipe ][ Regrouper par: ▾ Client ]  [🔍_______]  │
│                                                     ( Exporter ) [ Vue: ▣ Table │ ▤ Carte]│
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ CODE           │ PROJET             │CLIENT│ DÉBUT   │ FIN     │ BUDGET │ RÉALISÉ │AVANC.│MARGE│STATUT│
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │▾ CLIENT CCM (3 projets · 9,8 M · marge 46,2 %)                                       │ │
│ │  PLANDEVCCM    │ PLAN DEV CCM       │ CCM  │15/06/24 │28/02/25 │  1,00 M│  0,60 M │▓▓▓▓▓░ 78%│40,0%│●Actif│
│ │  MANPANSFICCM  │ MANUEL PANSFI CCM  │ CCM  │07/07/24 │28/02/25 │  4,40 M│  2,19 M │▓▓▓▓▓▓ 92%│50,3%│●Actif│
│ │  ETUPANSFICCM  │ ETUDE PANSFI CCM   │ CCM  │05/07/24 │30/07/24 │  4,40 M│  4,40 M │▓▓▓▓▓▓100%│49,1%│○Clôt.│
│ │▾ CLIENT MUFID (1 projet · 2,1 M · marge 49,7 %)                                      │ │
│ │  ETUPANSFIMUF  │ ETUDE PANSFI MUFID │MUFID │05/07/24 │28/02/25 │  2,10 M│  1,05 M │▓▓▓▓░░ 65%│49,7%│●Actif│
│ │▾ TRANSVERSAL (2 projets · 0,3 M)                                                     │ │
│ │  NAUTRAJUIN24  │ TRANSVERSAL juin   │  —   │01/06/24 │30/06/24 │  0,15 M│  0,14 M │▓▓▓▓▓▓100%│  —  │○Clôt.│
│ │  NAUTRAFÉVR25  │ TRANSVERSAL février│  —   │01/02/25 │28/02/25 │  0,16 M│  0,09 M │▓▓▓▓░░ 58%│  —  │●Actif│
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ TOTAUX               14 projets              12,21 M   8,47 M    ▓▓▓▓▓░ 81 %  49,7 %     │
```

### A2.5 Validations en attente

```
│ Direction › Validations en attente                                                 ●5    │
│ [Tout ●5] [Dépenses ●2] [Budgets ●1] [Clôtures ●1] [Autres ●1]        ( Tout exporter )  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │[ ]│ TYPE       │ OBJET                       │ MONTANT   │ DEMANDEUR │ DEPUIS │      │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │[x]│ 💰 Dépense │ FT #2418 — Location salle   │  850 000  │ M. NKOA   │  2 h   │ ▾    │ │
│ │   │ ┌────────────────────────────────────────────────────────────────────────────┐   │ │
│ │   │ │ Projet ETUPANSFIMUF · Activité BOX1 · Compte Banque Afriland               │   │ │
│ │   │ │ Justificatifs : ✓ OUI (2 pièces)   Mercuriale : ✗ NON conforme  ⚠         │   │ │
│ │   │ │ Budget activité : 780 000 / 2 100 000 → après validation 1 630 000 (78 %)  │   │ │
│ │   │ │ Circuit : M.NKOA (saisie) → T.BESSALA ✓ → J.EKOUMA ✓ → ● Vous              │   │ │
│ │   │ │ ( 👁 Voir justificatifs )  ( Voir la FT complète )                          │   │ │
│ │   │ └────────────────────────────────────────────────────────────────────────────┘   │ │
│ │[ ]│ 📊 Budget  │ Révision ETUPANSFIMUF v3    │+20 000 000│ J. EKOUMA │  1 j   │ ▸    │ │
│ │[ ]│ 🔒 Clôture │ Période juin 2026 (finance) │     —     │ J. EKOUMA │  3 j   │ ▸    │ │
│ │[ ]│ 💰 Dépense │ FT #2401 — Experts externes │  600 000  │ T. BESSALA│  4 j ⚠ │ ▸    │ │
│ │[ ]│ 👤 Accès   │ Élévation droits P.ATANGANA │     —     │ admin     │  5 j ⚠ │ ▸    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ 1 sélectionné →  [ ✓ Approuver ]  [ ✗ Rejeter ]  ( Demander un complément )  ( Déléguer )│
```

### A2.6 Clôtures

```
│ Direction › Clôtures de périodes                                     [▾ Exercice 2026 ]  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MOIS      │ TEMPS   │ BUDGET  │ TRÉSORERIE │ EHS     │ PRODUCTION │ ÉTAT GLOBAL │    │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Janv. 26  │ 🔒 Verr.│ 🔒 Verr.│  🔒 Verr.  │ 🔒 Verr.│  🔒 Verr.  │ 🔒 Verrouillé│   │ │
│ │ Févr. 26  │ 🔒 Verr.│ 🔒 Verr.│  🔒 Verr.  │ 🔒 Verr.│  🔒 Verr.  │ 🔒 Verrouillé│   │ │
│ │ Mars 26   │ 🔒 Verr.│ 🔒 Verr.│  🔒 Verr.  │ 🔒 Verr.│  🔒 Verr.  │ 🔒 Verrouillé│   │ │
│ │ Avril 26  │ ✓ Clôt. │ ✓ Clôt. │  ✓ Clôt.   │ ✓ Clôt. │  ✓ Clôt.   │ ✓ Clôturé   │[🔒]│ │
│ │ Mai 26    │ ✓ Clôt. │ ✓ Clôt. │  ✓ Clôt.   │ ✓ Clôt. │  ✓ Clôt.   │ ✓ Clôturé   │[🔒]│ │
│ │ Juin 26   │ ✓ Clôt. │ ● Ouvert│  ● Ouvert  │ ✓ Clôt. │  ✓ Clôt.   │ ⏳ En cours │[✓] │ │
│ │ Juil. 26  │ ● Ouvert│ ● Ouvert│  ● Ouvert  │ ● Ouvert│  ● Ouvert  │ ● Ouvert    │[✓] │ │
│ │ Août 26   │ ○ Futur │ ○ Futur │  ○ Futur   │ ○ Futur │  ○ Futur   │ ○ À venir   │    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Actions ligne : [✓ Clôturer]  [🔒 Verrouiller]  ( ⟲ Réouvrir — motif obligatoire, audité)│
│                                                          [ Générer rapport de clôture ]  │
```

**Modal de confirmation de clôture (double validation)**

```
        ┌─────────────────────────────────────────────────────────────┐
        │ ⚠ Clôturer la période Juin 2026                         [✕] │
        ├─────────────────────────────────────────────────────────────┤
        │ Cette action est irréversible sans droit de réouverture.    │
        │                                                             │
        │ Contrôles préalables :                                      │
        │  ✓ Toutes les feuilles de temps sont validées (128/128)     │
        │  ✓ Aucune FT en attente de validation                       │
        │  ⚠ 2 activités sans avancement déclaré  ( Voir )            │
        │  ✓ Rapprochement des comptes effectué                       │
        │                                                             │
        │ Modules à clôturer :                                        │
        │  [x] Budget      [x] Trésorerie                             │
        │                                                             │
        │ Motif / commentaire *                                       │
        │ [_________________________________________________________] │
        │                                                             │
        │ Saisir « CLOTURER » pour confirmer *  [___________]          │
        ├─────────────────────────────────────────────────────────────┤
        │                     ( Annuler )  [ Confirmer la clôture ]   │
        └─────────────────────────────────────────────────────────────┘
```

---

---

## 3. Workspace A3 — Chef de projet

### A3.1 Liste de mes projets

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                             [▾ 2026] [▾ FR] ●3🔔 (👤 T. BESSALA — Chef pj)│
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Mes projets ◀│ Projets › Mes projets                                                   │
│ ▸ Chiffrage    │ [▾ Statut: Actifs ][▾ Client ][▾ Échéance ]   [🔍_______]  ( Réinit. )  │
│ ▸ Planning     │              [ + Nouveau projet ] ( Depuis modèle ) ( Importer ) (Export)│
│ ▸ Activités    │ ┌────────────────────────────────────────────────────────────────────┐  │
│ ▸ Feuilles tps │ │ CODE          │ PROJET            │CLIENT│ ÉCHÉANCE │AVANCEMENT│ ⚠ │⋮│ │
│ ▸ Budget       │ ├────────────────────────────────────────────────────────────────────┤  │
│ ▸ FT projet    │ │ PLANDEVCCM    │ PLAN DEV CCM      │ CCM  │ 28/02/25 │▓▓▓▓▓░ 78%│ ⚠2│⋮│ │
│ ▸ Rapports     │ │ ETUPANSFIMUF  │ ETUDE PANSFI MUFID│MUFID │ 28/02/25 │▓▓▓▓░░ 65%│ ⚠1│⋮│ │
│                │ │ MANPANSFICCM  │ MANUEL PANSFI CCM │ CCM  │ 28/02/25 │▓▓▓▓▓▓ 92%│   │⋮│ │
│ ───────────    │ │ ETUPANSFICOOP.│ ETUDE PANSFI COOP.│COOPEC│ 15/03/25 │▓▓▓░░░ 41%│   │⋮│ │
│ ⚙ Paramètres   │ │ NAUTRAFÉVR25  │ TRANSVERSAL févr. │  —   │ 28/02/25 │▓▓▓▓░░ 58%│   │⋮│ │
│ ↩ Déconnexion  │ └────────────────────────────────────────────────────────────────────┘  │
│                │ 5 projets · budget cumulé 12,21 M FCFA          ◀ 1 ▶                    │
│                │ Menu ⋮ : Ouvrir · Dupliquer structure · Changer statut · Archiver        │
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A3.2 Fiche projet — Onglet Général

```
│ Projets › PLAN DEV CCM (PLANDEVCCM)                              ●Actif   ( ⋮ Actions )  │
│ ┌────────┬──────────┬─────────┬───────────┬────────┬────────┬──────┬──────────┬────────┐ │
│ │Général │ Chiffrage│ Planning│ Activités │ Équipe │ Budget │  FT  │Avancement│ + 2 ▾  │ │
│ └────────┴──────────┴─────────┴───────────┴────────┴────────┴──────┴──────────┴────────┘ │
│  ▲ onglet actif                                                                          │
│ ┌───────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │
│ │ IDENTIFICATION                            │ │ SYNTHÈSE                               │ │
│ │ Code projet *   [ PLANDEVCCM__________]   │ │ Avancement     ▓▓▓▓▓░░ 78 %            │ │
│ │ Libellé *       [ PLAN DEV CCM________]   │ │ Budget         600 000 / 1 000 000     │ │
│ │ Client *        [▾ CCM                ]   │ │ Consommé       ▓▓▓▓▓░░ 60 %            │ │
│ │ Site / Zone     [▾ Yaoundé            ]   │ │ Marge courante 40,0 %                  │ │
│ │ Type de projet  [▾ Client facturable  ]   │ │ Potentiel EHS  1 260 unités            │ │
│ │ [x] Projet facturable                     │ │ FT enregistrées 34 (2 en attente)      │ │
│ │ [ ] Projet transversal (frais généraux)   │ │ Activités       6 (1 en retard ⚠)      │ │
│ └───────────────────────────────────────────┘ └────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │
│ │ PLANIFICATION                             │ │ RESPONSABLES                           │ │
│ │ Date de début * [ 15/06/2024 ] 📅         │ │ Chef de projet * [▾ T. BESSALA (BO001)]│ │
│ │ Date de fin *   [ 28/02/2025 ] 📅         │ │ Équipe principale*[▾ BO               ]│ │
│ │ Durée calculée   185 jours                │ │ Sponsor          [▾ A. LAMARE (PI001) ]│ │
│ │ Statut *        [▾ Actif              ]   │ │ Réf. financier   [▾ J. EKOUMA (RE001) ]│ │
│ │  brouillon→planifié→actif→suspendu→       │ │ Manager terrain  [▾ M. NKOA (MO001)   ]│ │
│ │  terminé→clôturé                          │ │                                        │ │
│ │ Devise          [▾ FCFA (XAF)         ]   │ │                                        │ │
│ └───────────────────────────────────────────┘ └────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ DESCRIPTION                                                                          │ │
│ │ [__________________________________________________________________________________]│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│  ( Annuler )  [ Enregistrer ]     ⋮ Actions : Changer statut · Dupliquer · Archiver      │
```

### A3.2b Fiche projet — Onglet Chiffrage

```
│ Projets › PLAN DEV CCM › Chiffrage                          Version v2 ● Approuvé        │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ RÉFÉRENCE                                                                            │ │
│ │ Chiffrage unitaire * [▾ PLANDEVCCM — 1 000 000 FCFA — Équipe BO1 ] ( 👁 Voir fiche ) │ │
│ │ Volume * [ 1____]   Indice [ ______]   Début [15/06/2024] 📅  Fin [28/02/2025] 📅    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ ┌──────────────────────────────────────────┐ │
│ │ POSTES DE DÉPENSES DIRECTES             │ │ ▸ CALCULS AUTOMATIQUES                   │ │
│ │ Hébergement équipe     [ 0________]     │ │ ┌──────────────────────────────────────┐ │ │
│ │ Location salle conf.   [ 0________]     │ │ │ Montant HT           1 000 000 FCFA  │ │ │
│ │ Nutrition              [ 0________]     │ │ │ Quote-part                       0   │ │ │
│ │ Experts                [ 100 000__]     │ │ │ ───────────────────────────────────  │ │ │
│ │ Perdiem                [ 0________]     │ │ │ NET À PAYER            978 000 FCFA  │ │ │
│ │ Communication          [ 2 000____]     │ │ │ TOTAL DÉPENSES DIR.    222 000 FCFA  │ │ │
│ │ Transport urbain       [ 6 000____]     │ │ │ TOTAL COÛT             600 000 FCFA  │ │ │
│ │ Coût voyage            [ 0________]     │ │ │ MARGE                       40,0 %   │ │ │
│ │ Descente               [ 114 000__]     │ │ │ ───────────────────────────────────  │ │ │
│ │ Impression             [ 0________]     │ │ │ RESTE                  378 000 FCFA  │ │ │
│ │ Abonnement             [ 0________]     │ │ │ RESTE EHS              189 000 FCFA  │ │ │
│ │ Démarches admin.       [ 0________]     │ │ │ POTENTIEL CRÉDIT EHS     1 260 u     │ │ │
│ │ IR                     [ 0________]     │ │ │ RESTE EHS hors transv.   1 100 u     │ │ │
│ │ Voyage de dépôt        [ 0________]     │ │ └──────────────────────────────────────┘ │ │
│ │ Primes                 [ 80 000___]     │ │    [ ⟳ Recalculer ]  ( ƒ Voir formule )  │ │
│ │ Imprévus               [ 0________]     │ └──────────────────────────────────────────┘ │
│ │ Pertes financières     [ 0________]     │                                              │
│ └─────────────────────────────────────────┘                                              │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ VENTILATION PAR GRADE ET PAR NATURE                                                  │ │
│ │ NATURE                            │TYPE│ BO  │ MO1 │ MO2 │ FO  │ DIR │ NUM │ TOTAL   │ │
│ │ ──────────────────────────────────┼────┼─────┼─────┼─────┼─────┼─────┼─────┼──────   │ │
│ │ Élaboration des livrables         │ E  │ 513 │  —  │  —  │  —  │  —  │  —  │   513   │ │
│ │ Dépenses pour les descentes       │ D  │  —  │114k │  —  │  —  │  —  │  —  │  114k   │ │
│ │ Pilotage des opérations terrain   │ E  │  —  │ 150 │  —  │  —  │  —  │  —  │   150   │ │
│ │ Transcription                     │ E  │  —  │  —  │ 100 │  —  │  —  │  —  │   100   │ │
│ │ Suivi des bénéficiaires           │ E  │  —  │  —  │  —  │  64 │  —  │  —  │    64   │ │
│ │ Primes                            │ D  │  —  │  —  │  —  │  —  │ 80k │  —  │   80k   │ │
│ │ Démarches administratives         │ D  │  —  │  —  │  —  │  —  │  —  │  —  │    —    │ │
│ │ Maîtrise d'œuvre numérique        │ E  │  —  │  —  │  —  │  —  │  —  │  —  │    —    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ [ ⟳ Recalculer ] [ ✓ Approuver ] ( Nouvelle version ) ( Comparer v1/v2 ) ( → Budget init.)│
```

### A3.2c Fiche projet — Onglet Planning (Gantt)

```
│ Projets › PLAN DEV CCM › Planning         [Vue: ▤ Gantt │ ▣ Tableau]  Réf. figée v1 ✓    │
│ [ + Activité ] [ + Jalon ] ( Dépendances ) ( Figer référence ) ( Comparer ) ( Import/Exp.)│
│ [◀ Auj. ▶]  Zoom: (Jour) (Semaine) (•Mois) (Trimestre)          [x] Afficher la référence │
│ ┌──────────────────────────────────────────┬───────────────────────────────────────────┐ │
│ │ WBS / ACTIVITÉ         │CODE │RESP│DURÉE │ JUIN JUIL AOÛT SEPT OCTO NOVE DÉCE JANV FÉV│ │
│ ├──────────────────────────────────────────┼───────────────────────────────────────────┤ │
│ │▾ 1. PLAN DEV CCM       │     │ BO │185 j │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │ │
│ │  ▾ 1.1 Élaboration     │BOX1 │ BO │185 j │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ⚠112% │ │
│ │      ┄ référence v1    │     │    │      │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄          │ │
│ │    ◆ Jalon : livrable 1│ J1  │ BO │  —   │           ◆                               │ │
│ │  ▾ 1.2 Descentes       │  C  │ MO │185 j │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │ │
│ │    1.2.1 Pilotage terr.│ MOA │ MO │185 j │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │ │
│ │    1.2.2 Transcription │MOB1 │MO2 │120 j │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │ │
│ │  ▸ 1.3 Suivi bénéfic.  │FOX43│ FO │185 j │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │ │
│ │    ◆ Jalon : clôture   │ J2  │ BO │  —   │                                    ◆      │ │
│ └──────────────────────────────────────────┴───────────────────────────────────────────┘ │
│ Légende : ▓ prévu · ▒ réalisé · ┄ référence · ◆ jalon · ⚠ dépassement · ≡ glisser        │
│ Chemin critique : BOX1 → MOA → J2   ·   Marge totale : 0 j   ·   3 activités en retard   │
```

### A3.2d Fiche projet — Onglet Activités

```
│ Projets › PLAN DEV CCM › Activités                       [ + Activité ] ( Import ) (Exp.)│
│ [▾ Type: Tous ][▾ Grade: Tous ][▾ Statut: Tous ]                          [🔍________]   │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │CODE │ ACTIVITÉ                   │TYPE│GRADE│NIV│ DÉBUT  │DURÉE│ DEADLINE │B.EHS│B.MON.│AVANC.│⋮│
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │BOX1 │ Élaboration des livrables  │ E  │ BO  │ 1 │15/06/24│185 j│ 28/02/25 │513 u│    0 │▓▓▓▓░82%│⋮│
│ │ C   │ Dépenses pour les descentes│ D  │ MO  │ 1 │15/06/24│185 j│ 28/02/25 │  0 u│114000│▓▓▓░░70%│⋮│
│ │ MOA │ Pilotage opérations terrain│ E  │ MO  │ 2 │15/06/24│185 j│ 28/02/25 │150 u│    0 │▓▓▓▓░76%│⋮│
│ │MOB1 │ Transcription              │ E  │ MO2 │ 2 │01/08/24│120 j│ 28/02/25 │100 u│    0 │▓▓░░░45%│⋮│
│ │FOX43│ Suivi des bénéficiaires    │ E  │ FO  │ 2 │15/06/24│185 j│ 28/02/25 │ 64 u│    0 │▓▓▓▓▓90%│⋮│
│ │ PR1 │ Primes                     │ D  │ DIR │ 3 │01/02/25│ 28 j│ 28/02/25 │  0 u│ 80000│░░░░░ 0%│⋮│
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ TOTAUX                                                        827 u   194 000     78 %   │
│ Menu ⋮ : Éditer · Saisir avancement · Voir affectations · Marquer terminée · Bloquer     │
```

**Modal « + Activité »**

```
        ┌─────────────────────────────────────────────────────────────┐
        │ Nouvelle activité — PLAN DEV CCM                        [✕] │
        ├─────────────────────────────────────────────────────────────┤
        │ Code activité *   [ BOX2______]  ⓘ unique dans le projet    │
        │ Libellé *         [ Rédaction du rapport final___________]  │
        │ Activité parente  [▾ 1.1 Élaboration des livrables       ]  │
        │ Type *            (•) E — Élaboration   ( ) D — Descente    │
        │ Grade responsable*[▾ BO — Back Office                    ]  │
        │ Niveau            [ 2___]                                   │
        │                                                             │
        │ Début *   [ 01/09/2024 ] 📅    Durée [ 60__] j              │
        │ Deadline  [ 31/10/2024 ] 📅    (calculée automatiquement)   │
        │                                                             │
        │ Budget EHS       [ 240______] unités                        │
        │ Budget monétaire [ 0________] FCFA                          │
        │ Quantité prévue  [ 1________] [▾ livrable ]                 │
        │ Poids avancement [ 15_______] %                             │
        │                                                             │
        │ Dépendances [▾ BOX1 — Fin→Début, décalage 0 j ✕][+ Ajouter] │
        ├─────────────────────────────────────────────────────────────┤
        │           ( Annuler )  ( Enregistrer et créer une autre )   │
        │                                        [ Créer l'activité ] │
        └─────────────────────────────────────────────────────────────┘
```

### A3.2e Fiche projet — Onglet Budget

```
│ Projets › PLAN DEV CCM › Budget                        Version v2 ● Approuvée le 12/07/26│
│ [ Nouvelle version ] ( Enregistrer engagement ) ( Comparer versions ) ( Exporter )        │
│ ┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐    │
│ │  BUDGET    ││  ENGAGÉ    ││  DÉPENSÉ   ││ RESTE À    ││  COÛT À    ││   ÉCART    │    │
│ │  INITIAL   ││            ││  (RÉALISÉ) ││  ENGAGER   ││TERMINAISON ││ PRÉVISION. │    │
│ │ 1 000 000  ││  180 000   ││  600 000   ││  220 000   ││ 1 020 000  ││ -20 000 ⚠  │    │
│ └────────────┘└────────────┘└────────────┘└────────────┘└────────────┘└────────────┘    │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ACTIVITÉ / CATÉGORIE      │ BUDGET  │ ENGAGÉ │DÉPENSÉ │ RESTE  │ CONSO.   │ CAT   │ ⚠ │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │▾ BOX1 Élaboration        │ 200 000 │ 20 000 │204 000 │-24 000 │▓▓▓▓▓▓112%│224 000│ ⚠ │ │
│ │    · Experts             │ 100 000 │      0 │104 000 │ -4 000 │▓▓▓▓▓▓104%│       │ ⚠ │ │
│ │    · Communication       │   2 000 │      0 │  2 000 │      0 │▓▓▓▓▓▓100%│       │   │ │
│ │    · Impression          │  98 000 │ 20 000 │ 98 000 │-20 000 │▓▓▓▓▓▓120%│       │ ⚠ │ │
│ │▾ C Descentes             │ 114 000 │ 60 000 │ 80 000 │-26 000 │▓▓▓▓▓░123%│140 000│ ⚠ │ │
│ │▸ MOA Pilotage terrain    │ 300 000 │ 40 000 │210 000 │ 50 000 │▓▓▓▓░░ 83%│260 000│   │ │
│ │▸ MOB1 Transcription      │ 150 000 │ 30 000 │ 66 000 │ 54 000 │▓▓▓░░░ 64%│110 000│   │ │
│ │▸ FOX43 Suivi bénéfic.    │ 156 000 │ 30 000 │ 40 000 │ 86 000 │▓▓░░░░ 45%│ 96 000│   │ │
│ │▸ PR1 Primes              │  80 000 │      0 │      0 │ 80 000 │░░░░░░  0%│ 80 000│   │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL                    │1 000 000│180 000 │600 000 │220 000 │▓▓▓▓▓░ 78%│1020000│ ⚠ │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⚠ 3 activités dépassent le seuil d'alerte (90 %).   ( Voir les alertes )                 │
```

### A3.2f Fiche projet — Onglet Avancement

```
│ Projets › PLAN DEV CCM › Avancement                          Déclaration Juillet 2026    │
│ [▾ Période: Juillet 2026 ]                              ( Historique ) [ Enregistrer ]   │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ACTIVITÉ │POIDS│ AV. PHYSIQUE   │ AV. TEMPOREL │ AV. FINANCIER │ COMMENTAIRE          │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ BOX1    │ 30% │ [ 82_]% ▓▓▓▓░  │  85 % (calc) │ 112 % (calc)  │[ RAS_______________]│ │
│ │ C       │ 15% │ [ 70_]% ▓▓▓░░  │  85 % (calc) │  70 % (calc)  │[ 2 descentes______]│ │
│ │ MOA     │ 20% │ [ 76_]% ▓▓▓▓░  │  85 % (calc) │  70 % (calc)  │[___________________]│ │
│ │ MOB1    │ 15% │ [ 45_]% ▓▓░░░  │  62 % (calc) │  44 % (calc)  │[ Retard audio_____]│ │
│ │ FOX43   │ 15% │ [ 90_]% ▓▓▓▓▓  │  85 % (calc) │  26 % (calc)  │[___________________]│ │
│ │ PR1     │  5% │ [  0_]% ░░░░░  │   0 % (calc) │   0 % (calc)  │[ Non démarré______]│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ PROJET  │100% │  78 % pondéré  │  81 %        │  78 %         │                      │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ physique = saisi · temporel = jours écoulés/durée · financier = dépensé/budget         │
│                          ( Enregistrer brouillon )  [ Soumettre pour validation ]        │
```

### A3.3 Bibliothèque des chiffrages unitaires

```
│ Chiffrage › Bibliothèque des chiffrages unitaires                                        │
│ [▾ Équipe: Toutes ][▾ Statut: Approuvés ]        [🔍_______]   [ + Nouveau chiffrage ]   │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │CODE UNITAIRE     │ÉQUIPE│ MONTANT HT │Q.PART│VOL│NET À PAYER │ MARGE │ TOTAL COÛT │VER│⋮│
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │PLANDEVCCM        │ BO1  │  1 000 000 │  0   │ 1 │    978 000 │ 40,0% │    600 000 │v2 │⋮│
│ │ETUPANSFIMUF      │ BO1  │  2 096 436 │  0   │ 1 │  2 050 314 │ 49,7% │  1 053 945 │v1 │⋮│
│ │MANPANSFICCM      │ BO1  │  4 402 516 │  0   │ 1 │  4 305 660 │ 50,3% │  2 189 652 │v1 │⋮│
│ │ETUPANSFICOOPECFO │ BO1  │  3 438 155 │  0   │ 1 │  3 362 516 │ 49,9% │  1 721 700 │v3 │⋮│
│ │ETUPANSFICAPFI    │ BO1  │  2 850 000 │  0   │ 1 │  2 793 000 │ 38,2% │  1 761 300 │v1 │⋮│
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Menu ⋮ : Ouvrir · Dupliquer · Nouvelle version · Comparer · Voir usages · Archiver        │
```

---

## 4. Workspace A4 — Planificateur / Ordonnanceur

### A4.1 Vue portefeuille (Gantt multi-projets)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                            [▾ 2026] [▾ FR] ●2🔔 (👤 P. MBALLA — Planif.) │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Portefeuille◀│ Planification › Vue portefeuille                                        │
│ ▸ Gantt projet │ [▾ Projets: Tous ][▾ Équipes: Toutes ][ 01/06/24 ]→[ 31/03/25 ]         │
│ ▸ Capacité     │ Zoom: (Jour)(Semaine)(•Mois)  [◀ Auj ▶]  [x] Jalons  [ ] Réf.  (Export) │
│ ▸ Ordonnancem. │ ┌────────────────────────────┬─────────────────────────────────────────┐│
│ ▸ Scénarios    │ │ PROJET / ÉQUIPE            │ J  J  A  S  O  N  D  J  F  M            ││
│ ▸ Conflits ●7  │ ├────────────────────────────┼─────────────────────────────────────────┤│
│                │ │▾ PLAN DEV CCM         BO   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓◆              ││
│ ───────────    │ │▾ ETUDE PANSFI MUFID   BO   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓◆               ││
│ ⚙ Paramètres   │ │▾ MANUEL PANSFI CCM    BO   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓◆  ⚠ surcharge  ││
│ ↩ Déconnexion  │ │▾ ETUDE PANSFI COOPEC  FO   │      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓◆          ││
│                │ │▾ TRANSVERSAL février  RE   │                          ▓▓▓            ││
│                │ │▾ ETUDE PANSFI CAPFI   MO   │   ▓▓▓▓▓▓▓▓▓▓                            ││
│                │ └────────────────────────────┴─────────────────────────────────────────┘│
│                │ ⚠ Chevauchement : équipe BO sur 3 projets en juillet-août                │
│                │                                            ( Voir les conflits ▸ )      │
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A4.3 Capacité vs charge

```
│ Planification › Capacité / Charge                                                        │
│ [▾ Granularité: Semaine ][▾ Équipe: Toutes ][ S26 ]→[ S35 ]     ( Exporter ) ( Détail )  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ÉQUIPE │CAPA.│ S26  │ S27  │ S28  │ S29  │ S30  │ S31  │ S32  │ S33  │ S34  │ S35   │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ PI  (1)│ 40 h│ ▓ 28 │ ▓ 32 │ ▓ 30 │ ▓ 24 │ ▓ 36 │ ▓ 40 │ ▓ 38 │ ▓ 20 │ ▓ 28 │ ▓ 30  │ │
│ │ BO  (4)│160 h│ ▓152 │ █178 │ █192 │ █186 │ ▓158 │ ▓160 │ █174 │ ▓140 │ ▓148 │ ▓152  │ │
│ │        │     │  95% │⚠111% │⚠120% │⚠116% │  99% │ 100% │⚠109% │  88% │  93% │  95%  │ │
│ │ FO  (2)│ 80 h│ ▓ 64 │ ▓ 72 │ ▓ 76 │ ▓ 80 │ ▓ 68 │ ░ 32 │ ░ 28 │ ░ 24 │ ▓ 60 │ ▓ 72  │ │
│ │        │     │  80% │  90% │  95% │ 100% │  85% │ ⚠40% │ ⚠35% │ ⚠30% │  75% │  90%  │ │
│ │ MO  (3)│120 h│ ▓108 │ ▓116 │ ▓120 │ ▓112 │ ▓104 │ ▓ 96 │ ▓110 │ ▓118 │ ▓120 │ ▓114  │ │
│ │ RE  (1)│ 40 h│ ▓ 36 │ ▓ 38 │ ▓ 40 │ ▓ 34 │ ▓ 32 │ ▓ 36 │ ▓ 40 │ ▓ 38 │ ▓ 36 │ ▓ 34  │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL  │440 h│  388 │  436 │  458 │  436 │  398 │  364 │  390 │  340 │  392 │  402  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Légende : ░ sous-charge (<60 %) · ▓ nominal (60-100 %) · █ surcharge (>100 %)            │
│ ⚠ 4 semaines en surcharge (BO)  ·  ⚠ 3 semaines en sous-charge (FO)   ( Rééquilibrer )   │
```

### A4.4 Ordonnancement (matrice activité × grade)

```
│ Planification › Ordonnancement                        [▾ Projet: Tous ][▾ Période: 2026 ]│
│ [ ⟳ Recalculer ] ( Éditer manuellement ) ( Détecter conflits ) ( Échéancier ) ( Exporter )│
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ CAPACITÉ (h-j) │ 28 │  0 │  0 │  8 │  0 │  0 │  0 │  0 │  0 │  0 │ 17 │  0 │ 37 │... │ │
│ │ CUMUL          │ 28 │ 28 │ 28 │ 36 │ 36 │ 36 │ 36 │ 36 │ 36 │ 36 │ 53 │ 53 │ 90 │... │ │
│ ├────────────────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤ │
│ │ CODE ACTIVITÉ  │ PI │ CG │ ME │ BO │BO1 │BO2 │BO3 │BO4 │BO5 │BO6 │ FO │FO1 │ MO │... │ │
│ ├────────────────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤ │
│ │ 1  BOX1        │  1 │  0 │  0 │  4 │  2 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │... │ │
│ │ 2  C           │  2 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  3 │... │ │
│ │ 3  MOA         │  3 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  5 │... │ │
│ │ 4  MOB1        │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  4 │... │ │
│ │ 5  FOX43       │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  6 │  2 │  0 │... │ │
│ │ 6  EA          │  1 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │... │ │
│ │ 7  PIA11       │  4 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │  0 │... │ │
│ ├────────────────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤ │
│ │ CHARGE TOTALE  │ 11 │  0 │  0 │  4 │  2 │  0 │  0 │  0 │  0 │  0 │  6 │  2 │ 12 │... │ │
│ │ ÉCART CAPACITÉ │+17 │  0 │  0 │ +4 │ -2⚠│  0 │  0 │  0 │  0 │  0 │+11 │ -2⚠│+25 │... │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ◀ ▶ défilement horizontal (45 colonnes de grades)   ·   ⚠ 2 grades en dépassement        │
```

### A4.5 Scénarios d'ordonnancement

```
│ Planification › Scénarios                                        [ + Nouveau scénario ]  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ SCÉNARIO           │ BASE      │ CRÉÉ PAR  │ CONFLITS │ FIN PROJETÉE │ COÛT   │ ÉTAT │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ ● Planning approuvé│ —         │ P. MBALLA │    7 ⚠   │  28/02/2025  │ 1,00 M │ RÉF. │ │
│ │ ○ Sc.A — Renfort BO│ Approuvé  │ P. MBALLA │    2     │  20/02/2025  │ 1,12 M │Simulé│ │
│ │ ○ Sc.B — Décalage  │ Approuvé  │ P. MBALLA │    0 ✓   │  15/03/2025  │ 1,00 M │Simulé│ │
│ │ ○ Sc.C — Sous-trait│ Approuvé  │ T.BESSALA │    1     │  25/02/2025  │ 1,18 M │Ébauche│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Sélection : Sc.B  →  [ ⚙ Simuler ] ( Comparer avec réf. ) [ ▲ Promouvoir en approuvé ]   │
│ ⓘ Un scénario ne modifie jamais le planning approuvé tant qu'il n'est pas promu.         │
```

### A4.6 Conflits & activités orphelines

```
│ Planification › Conflits                                                          ●7     │
│ [Tous ●7][Doubles affect. ●3][Indispos ●2][Sans ressource ●1][Surcharge ●1]              │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │SÉV│ TYPE              │ DESCRIPTION                             │PÉRIODE  │ ACTIONS  │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 🔴│ Double affectation│ T. BESSALA sur BOX1 (PLANDEVCCM) et     │S28-S30  │[Résoudre]│ │
│ │   │                   │ BOX1 (ETUPANSFIMUF) — 120 % de charge   │         │(Ignorer) │ │
│ │ 🔴│ Double affectation│ M. NKOA sur MOA et MOB1 simultanément   │S27-S29  │[Résoudre]│ │
│ │ 🔴│ Indisponibilité   │ J. EKOUMA affectée FOX43 pendant congé  │12→22/08 │[Résoudre]│ │
│ │   │                   │ validé                                  │         │(Dérogat.)│ │
│ │ 🟠│ Indisponibilité   │ Équipement PC-03 en maintenance affecté │05→09/08 │[Résoudre]│ │
│ │ 🟠│ Sans ressource    │ Activité PR1 (Primes) sans affectation  │Févr. 25 │[Affecter]│ │
│ │ 🟠│ Surcharge équipe  │ Équipe BO à 120 % sur S28               │  S28    │[Lisser]  │ │
│ │ 🟡│ Sous-charge équipe│ Équipe FO à 30 % sur S31-S33            │S31-S33  │[Affecter]│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Une dérogation nécessite un motif et est tracée dans le journal d'audit.               │
```

---

---

## 5. Workspace A5 — Manager / Chef d'équipe

### A5.1 Pilotage équipe (dashboard)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                        [▾ 2026] [▾ FR] ●4🔔 (👤 T. BESSALA — Manager BO)  │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Pilotage   ◀ │ Équipe BO › Pilotage                                                    │
│ ▸ Composition  │ Période : [ 01/02/2025 ] 📅 → [ 28/02/2025 ] 📅   [▾ Équipe: BO ] (⟳)   │
│ ▸ FDT équipe ●3│                                                                         │
│ ▸ EHS équipe   │ ┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐        │
│ ▸ Absences     │ │  EFFECTIF    ││ POTENTIEL EHS││  BUDGET EHS  ││ TAUX SAISIE  │        │
│ ▸ Alertes  ●4  │ │      4       ││    2 560     ││   7 818,50   ││    75 % ⚠    │        │
│                │ │  personnes   ││   unités     ││   unités     ││  (3/4 FDT)   │        │
│ ───────────    │ └──────────────┘└──────────────┘└──────────────┘└──────────────┘        │
│ ⚙ Paramètres   │ ┌──────────────────────────────────────────────────────────────────────┐│
│ ↩ Déconnexion  │ │ MEMBRES DE L'ÉQUIPE                          ( Ajouter ) ( Exporter ) ││
│                │ │ MATRICULE│MATR.VERS.│ NOM COMPLET      │INTÉGR. │GRADE│TITRE  │STATUT ││
│                │ ├──────────────────────────────────────────────────────────────────────┤│
│                │ │ BO001    │ BO001V1  │ Theodore BESSALA │01/02/21│ BO  │Manager│●Actif ││
│                │ │ BO002    │ BO002V2  │ Sylvie MBIDA     │15/03/23│ BO  │Analyst│●Actif ││
│                │ │ BO003    │ BO003V1  │ Alain FOKOU      │01/09/24│ BO  │Junior │●Actif ││
│                │ │ BO004    │ BO004V1  │ Nadia TCHOUTA    │10/01/25│ BO  │Junior │●Actif ││
│                │ └──────────────────────────────────────────────────────────────────────┘│
│                │ ┌───────────────────────────────┐ ┌─────────────────────────────────────┐│
│                │ │ EHS PAR MEMBRE (février)      │ │ CHARGE PAR MEMBRE (février)         ││
│                │ │ T. BESSALA  ▓▓▓▓▓▓▓▓ 2 890 u  │ │ T. BESSALA  ▓▓▓▓▓▓▓▓  152 h /160 h  ││
│                │ │ S. MBIDA    ▓▓▓▓▓▓   2 140 u  │ │ S. MBIDA    ▓▓▓▓▓▓▓▓█ 178 h /160 h ⚠││
│                │ │ A. FOKOU    ▓▓▓▓     1 620 u  │ │ A. FOKOU    ▓▓▓▓▓▓    128 h /160 h  ││
│                │ │ N. TCHOUTA  ▓▓▓      1 168 u  │ │ N. TCHOUTA  ▓▓▓▓░░     96 h /160 h  ││
│                │ └───────────────────────────────┘ └─────────────────────────────────────┘│
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A5.2 Composition de l'équipe (historisée)

```
│ Équipe BO › Composition par période                    [ + Affecter un membre ] (Exporter)│
│ [▾ Année: 2025 ]                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MEMBRE (matr. versionné)│ JAN │ FÉV │ MAR │ AVR │ MAI │ JUIN│ JUIL│ AOÛT│ SEP │ OCT  │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ BO001V1 T. BESSALA      │ ███ │ ███ │ ███ │ ███ │ ███ │ ███ │ ███ │ ███ │ ███ │ ███  │ │
│ │ BO002V1 S. MBIDA        │ ███ │ ███ │ ███ │     │     │     │     │     │     │      │ │
│ │ BO002V2 S. MBIDA (→MO1) │     │     │     │ ▒▒▒ │ ▒▒▒ │ ▒▒▒ │ ▒▒▒ │ ▒▒▒ │ ▒▒▒ │ ▒▒▒  │ │
│ │ BO003V1 A. FOKOU        │     │ ███ │ ███ │ ███ │ ███ │ ███ │ ███ │ ███ │ ███ │ ███  │ │
│ │ BO004V1 N. TCHOUTA      │ ███ │ ███ │ ███ │ ███ │ ███ │ ███ │     │     │     │      │ │
│ │ ── ancien membre ──                                                                   │ │
│ │ BO005V1 P. ATANGANA     │ ███ │ ███ │     │     │     │     │     │     │     │      │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ EFFECTIF DU MOIS        │  4  │  5  │  4  │  4  │  4  │  4  │  3  │  3  │  3  │  3   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Légende : ███ affecté à BO · ▒▒▒ changement de version (grade/équipe) · vide = hors équipe│
│ ⓘ Un changement de grade ou d'équipe crée une nouvelle version de matricule (BO002V1→V2).│
```

### A5.3 EHS de l'équipe (Synth EHS EQ)

```
│ Équipe BO › Synthèse EHS                    [ ⟳ Recalculer EHS ] ( Comparer N-1 ) (Export)│
│ [▾ Année: 2025 ][▾ Vue: Par équipe │ Par membre ][ ] Inclure le transversal               │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MATR. MGR│ÉQUIPE│ JAN │ FÉV │ MAR │ AVR │ MAI │ JUIN│ JUIL│ AOÛT│ SEP │ TOTAL ANNÉE  │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ PI001    │  PI  │ 1240│ 1310│ 1180│ 1420│ 1390│ 1250│ 1180│ 1300│ 1260│    11 530    │ │
│ │ BO001    │  BO  │ 7420│ 7818│ 7210│ 8140│ 7960│ 7530│ 7280│ 7690│ 7440│    68 488  ◀ │ │
│ │ RE001    │  RE  │ 1450│ 1520│ 1380│ 1610│ 1580│ 1490│ 1420│ 1550│ 1500│    13 500    │ │
│ │   —      │  FO  │ 3680│ 3820│ 3540│ 4010│ 3940│ 3720│ 3600│ 3810│ 3690│    33 810    │ │
│ │   —      │  MO  │ 4810│ 5040│ 4680│ 5290│ 5180│ 4900│ 4740│ 5020│ 4860│    44 520    │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL    │      │18600│19508│17990│20470│20050│18890│18220│19370│18750│   171 848    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ▸ Détail équipe BO (clic sur la ligne) :                                                 │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MATRICULE│ NOM              │ JAN │ FÉV │ MAR │ ... │ POTENTIEL │ BUDGET │ CRÉDIT    │ │
│ │ BO001V1  │ Theodore BESSALA │ 2740│ 2890│ 2660│ ... │   2 560   │ 2 890  │  2 740 ✓  │ │
│ │ BO002V2  │ Sylvie MBIDA     │ 2030│ 2140│ 1970│ ... │   1 980   │ 2 140  │  2 030 ✓  │ │
│ │ BO003V1  │ Alain FOKOU      │ 1540│ 1620│ 1490│ ... │   1 500   │ 1 620  │  1 540 ✓  │ │
│ │ BO004V1  │ Nadia TCHOUTA    │ 1110│ 1168│ 1090│ ... │   1 080   │ 1 168  │  1 110 ✓  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Potentiel = issu des marges de chiffrage · Budget = planifié · Crédit = après FT réelles│
```

### A5.4 Feuilles de temps de mon équipe

```
│ Équipe BO › Feuilles de temps                                                      ●3    │
│ [▾ Période: S30 (21-27 juil.) ][▾ Statut: Tous ]        ( Rappel groupé ) ( Exporter )   │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │[ ]│ EMPLOYÉ          │ PÉRIODE │ H. SAISIES │ H. ATTENDUES │ STATUT      │ ANOMALIES │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │[x]│ Theodore BESSALA │  S30    │   40,0 h   │    40,0 h    │ ● Soumis    │     —     │ │
│ │[x]│ Sylvie MBIDA     │  S30    │   44,5 h   │    40,0 h    │ ● Soumis    │ ⚠ 4,5 h sup│ │
│ │[ ]│ Alain FOKOU      │  S30    │   32,0 h   │    40,0 h    │ ○ Brouillon │ ⚠ incomplet│ │
│ │[ ]│ Nadia TCHOUTA    │  S30    │    0,0 h   │    40,0 h    │ ○ Non saisi │ ⚠ absent   │ │
│ │   │ ── semaine précédente ──                                                          │ │
│ │[ ]│ Theodore BESSALA │  S29    │   40,0 h   │    40,0 h    │ ✓ Validé    │     —     │ │
│ │[ ]│ Sylvie MBIDA     │  S29    │   38,0 h   │    40,0 h    │ ✗ Rejeté    │ Motif ▸   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ 2 sélectionnés → [ ✓ Contrôler ] [ ✓ Valider ] [ ✗ Rejeter (motif) ] ( Relancer )        │
│                                                                                          │
│ ▸ Détail d'une FDT (clic) :                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Sylvie MBIDA — S30                                                                   │ │
│ │ PROJET / ACTIVITÉ           │TYPE H.│ LUN │ MAR │ MER │ JEU │ VEN │ SAM │ TOTAL      │ │
│ │ PLANDEVCCM / BOX1           │Normale│ 8,0 │ 8,0 │ 6,0 │ 8,0 │ 8,0 │  —  │  38,0      │ │
│ │ ETUPANSFIMUF / BOX1         │Normale│  —  │  —  │ 2,0 │  —  │  —  │  —  │   2,0      │ │
│ │ PLANDEVCCM / BOX1           │ Sup   │  —  │ 2,5 │  —  │ 2,0 │  —  │  —  │   4,5 ⚠    │ │
│ │ ────────────────────────────┴───────┴─────┴─────┴─────┴─────┴─────┴─────┴──────      │ │
│ │ TOTAL                                8,0  10,5   8,0  10,0   8,0    —    44,5        │ │
│ │ Commentaire employé : « Rattrapage livrable 2 avant échéance »                       │ │
│ │        ( 👁 Justificatifs ) ( Historique )  [ ✓ Valider ] [ ✗ Rejeter ]              │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
```

**Modal « Rejeter »**

```
        ┌─────────────────────────────────────────────────────────────┐
        │ Rejeter la feuille de temps — S. MBIDA / S30            [✕] │
        ├─────────────────────────────────────────────────────────────┤
        │ Motif du rejet *  (obligatoire, visible par l'employé)      │
        │ [▾ Heures supplémentaires non autorisées                ]   │
        │                                                             │
        │ Commentaire complémentaire                                  │
        │ [_________________________________________________________] │
        │ [_________________________________________________________] │
        │                                                             │
        │ Retourner au niveau : (•) Brouillon (saisie)                │
        │                       ( ) Contrôlé                          │
        │ [x] Notifier l'employé par email                            │
        ├─────────────────────────────────────────────────────────────┤
        │                     ( Annuler )  [ Confirmer le rejet ]     │
        └─────────────────────────────────────────────────────────────┘
```

### A5.5 Absences & disponibilités

```
│ Équipe BO › Absences                       [ + Déclarer une absence ] ( Exporter )        │
│ [▾ Mois: Août 2026 ]                                        [◀ Précédent  Suivant ▶]     │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MEMBRE          │ 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 …     │ │
│ │                 │ S D           S  D              S  D              S  D            │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ T. BESSALA      │ ░ ░ ▓ ▓ ▓ ▓ ▓ ░ ░  ▓  ▓  ▓  ▓  ▓  ░  ░  ▓  ▓  ▓  ▓  ▓  ░  ░  …   │ │
│ │ S. MBIDA        │ ░ ░ ▓ ▓ ▓ ▓ ▓ ░ ░  ▓  ▓  ▓  ▓  ▓  ░  ░  ▓  ▓  ▓  ▓  ▓  ░  ░  …   │ │
│ │ A. FOKOU        │ ░ ░ ▓ ▓ ▓ █ █ ░ ░  █  █  ▓  ▓  ▓  ░  ░  ▓  ▓  ▓  ▓  ▓  ░  ░  …   │ │
│ │ N. TCHOUTA      │ ░ ░ ▓ ▓ ▓ ▓ ▓ ░ ░  ▓  ▓  ▒  ▒  ▒  ░  ░  ▒  ▒  ▒  ▒  ▒  ░  ░  …   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Légende : ▓ présent · █ congé validé · ▒ congé demandé (à valider) · ░ week-end/férié     │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ DEMANDES EN ATTENTE                                                            ●1    │ │
│ │ N. TCHOUTA · Congé annuel · 12→22/08/2026 (7 j ouvrés) · solde restant 11 j          │ │
│ │ ⚠ Conflit : affectée à l'activité FOX43 sur cette période    ( Voir le planning )    │ │
│ │                                       [ ✓ Approuver ] [ ✗ Refuser ] ( Détail )       │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
```

---

## 6. Workspace A6 — Opérations (Chargé de projet / Ordonnateur / Terrain)

### A6.1 Ma journée

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                            [▾ 2026] [▾ FR] ●2🔔 (👤 M. NKOA — Opérations) │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Ma journée ◀ │ Mardi 28 juillet 2026                                                   │
│ ▸ Mes activités│ ┌──────────────────────────────────────────────────────────────────────┐│
│ ▸ Ma FDT    ●1 │ │ ⚡ ACTIONS RAPIDES                                                    ││
│ ▸ Nouvelle FT  │ │ [ ⏱ Saisir mes heures ] [ 💰 Nouvelle FT ] [ ⚠ Signaler incident HSE]││
│ ▸ Production   │ └──────────────────────────────────────────────────────────────────────┘│
│ ▸ Mes documents│ ┌────────────────────────────────────┐┌───────────────────────────────┐ │
│                │ │ MES AFFECTATIONS DU JOUR           ││ À FAIRE                    ●2 │ │
│ ───────────    │ │ 08:00-12:00  MOA — Pilotage terrain││ ● FDT S30 non soumise (jeu.)  │ │
│ ⚙ Paramètres   │ │              PLAN DEV CCM  📍Yaoundé││ ● Avancement MOB1 à déclarer  │ │
│ ↩ Déconnexion  │ │ 13:00-17:00  MOB1 — Transcription  ││ ○ Justificatif FT #2417 manqu.│ │
│                │ │              PLAN DEV CCM  📍Bureau ││                               │ │
│                │ │        ( Voir mon planning ▸ )     ││       ( Tout voir ▸ )         │ │
│                │ └────────────────────────────────────┘└───────────────────────────────┘ │
│                │ ┌────────────────────────────────────┐┌───────────────────────────────┐ │
│                │ │ MES HEURES CETTE SEMAINE           ││ MES DERNIÈRES FT              │ │
│                │ │ LUN ▓▓▓▓▓▓▓▓ 8,0 h                 ││ #2418 Location salle  850 000 │ │
│                │ │ MAR ▓▓▓▓▓▓▓▓ 8,0 h  (en cours)     ││       ● En attente DG         │ │
│                │ │ MER ░░░░░░░░ —                     ││ #2417 Perdiem descente 140 000│ │
│                │ │ JEU ░░░░░░░░ —                     ││       ⚠ Justificatif manquant │ │
│                │ │ VEN ░░░░░░░░ —                     ││ #2411 Transport urbain   6 000│ │
│                │ │ ──────────────────────             ││       ✓ Validée               │ │
│                │ │ TOTAL 16,0 h / 40,0 h attendues    ││       ( Toutes mes FT ▸ )     │ │
│                │ └────────────────────────────────────┘└───────────────────────────────┘ │
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A6.3 Nouvelle Fiche de Trésorerie (FT)

```
│ Trésorerie › Nouvelle fiche                                          Brouillon · non émise│
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ IMPUTATION                                                                           │ │
│ │ Code projet *      [▾ PLANDEVCCM — PLAN DEV CCM                                   ]  │ │
│ │ Code activité *    [▾ BOX1 — Élaboration des livrables                            ]  │ │
│ │ Nom du projet        PLAN DEV CCM                        (auto-rempli, non éditable) │ │
│ │ Nom de l'activité    Élaboration des livrables           (auto-rempli, non éditable) │ │
│ │ Niveau             [ 5___]  (auto depuis l'activité)                                 │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MOUVEMENT                                                                            │ │
│ │ Sens *             (•) Décaissement (sortie)   ( ) Encaissement (entrée)             │ │
│ │ Montant *          [ 850 000________] FCFA                                           │ │
│ │ Libellé libre *    [ Location salle de conférence — atelier de restitution________]  │ │
│ │ Date *             [ 28/07/2026 ] 📅                                                 │ │
│ │ Compte * [▾ Banque Afriland — solde 8 420 000 FCFA                                ]  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ACTEURS                                                                              │ │
│ │ Matricule ordonnateur *  [ MO001V1 ] Marc NKOA          (vous — auto)                │ │
│ │ Matricule destinataire * [▾ Rechercher matricule ou « N/A »...                    ]  │ │
│ │ Nom du destinataire        Hôtel Le Diplomate           (auto ou saisie libre)       │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ CONFORMITÉ                                                                           │ │
│ │ Justificatifs *   (•) OUI  ( ) NON      📎 [ Joindre un fichier ]                    │ │
│ │                   Pièces jointes : facture_diplomate.pdf ✕ · devis_signe.pdf ✕       │ │
│ │ Mercuriale *      ( ) OUI  (•) NON      [▾ Aucune mercuriale correspondante       ]  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠ CONTRÔLES AUTOMATIQUES                                                             │ │
│ │ ✓ Justificatif fourni (2 pièces)                                                     │ │
│ │ ⚠ Dépense NON conforme à la mercuriale — validation DG requise                       │ │
│ │ ⚠ Budget activité BOX1 : 780 000 / 2 100 000 → après cette FT : 1 630 000 (78 %)     │ │
│ │ ✓ Période juillet 2026 ouverte                                                       │ │
│ │ ✓ Solde du compte suffisant                                                          │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ CIRCUIT DE VALIDATION PRÉVU                                                          │ │
│ │ ① M. NKOA (saisie) → ② T. BESSALA (chef projet) → ③ J. EKOUMA (finance)              │ │
│ │ → ④ A. LAMARE (DG — montant > 500 000 & hors mercuriale)                             │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ( Annuler ) ( Dupliquer ) [ Enregistrer brouillon ] [ ▶ Soumettre pour validation ]      │
```

### A6.4 Ma feuille de temps (saisie hebdomadaire)

```
│ Temps › Ma feuille de temps                        Semaine 30 · 21→27 juillet 2026        │
│ [◀ S29]  [ S30 ]  [S31 ▶]                Statut : ○ Brouillon   ( Copier semaine préc. )  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ PROJET          │ ACTIVITÉ            │TYPE H.   │ LUN │ MAR │ MER │ JEU │ VEN │TOTAL│⋮│ │
│ │                 │                     │          │ 21  │ 22  │ 23  │ 24  │ 25  │     │ │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │[▾PLANDEVCCM   ] │[▾ MOA Pilotage ter.]│[▾Normale]│[4,0]│[4,0]│[4,0]│[4,0]│[4,0]│20,0 │✕│ │
│ │[▾PLANDEVCCM   ] │[▾ MOB1 Transcript. ]│[▾Normale]│[4,0]│[4,0]│[4,0]│[4,0]│[4,0]│20,0 │✕│ │
│ │[▾ETUPANSFIMUF ] │[▾ C Descentes      ]│[▾Sup    ]│[   ]│[2,0]│[   ]│[   ]│[   ]│ 2,0 │✕│ │
│ │[▾ Sélectionner]│[▾ ...              ]│[▾ ...   ]│[   ]│[   ]│[   ]│[   ]│[   ]│  —  │✕│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL PAR JOUR                                    │ 8,0 │10,0 │ 8,0 │ 8,0 │ 8,0 │42,0 │ │
│ │ ATTENDU                                           │ 8,0 │ 8,0 │ 8,0 │ 8,0 │ 8,0 │40,0 │ │
│ │ ÉCART                                             │  —  │+2,0⚠│  —  │  —  │  —  │+2,0 │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                       [ + Ajouter une ligne ]            │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠ CONTRÔLES                                                                          │ │
│ │ ⚠ Mardi 22/07 : 10,0 h > 8,0 h — 2,0 h supplémentaires à justifier                   │ │
│ │ ✓ Aucun doublon détecté   ✓ Tous les projets sont ouverts   ✓ Période non verrouillée│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Commentaire  [ Dépassement lié à la restitution client du 22/07__________________]       │
│ 📎 ( Joindre un justificatif )                                                           │
│                        ( Enregistrer brouillon )  [ ▶ Soumettre pour validation ]        │
```

### A6.5 Suivi de production

```
│ Production › Saisie des relevés                            [▾ Période: Juillet 2026 ]    │
│ [▾ Projet: PLAN DEV CCM ]                                          [ Enregistrer ]       │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ACTIVITÉ│ UNITÉ    │ QTÉ PRÉVUE│ QTÉ RÉALISÉE│ RESTE│ H. PRÉVUES│H. CONSOM.│PRODUCTIV.│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ BOX1   │ livrable │     4     │ [ 3______]  │  1   │   160 h   │  178 h   │ 0,017 ⚠  │ │
│ │ MOA    │ descente │    12     │ [ 9______]  │  3   │   240 h   │  216 h   │ 0,042 ✓  │ │
│ │ MOB1   │ page     │   180     │ [ 82_____]  │  98  │   120 h   │   68 h   │ 1,206 ✓  │ │
│ │ FOX43  │ bénéfic. │   350     │ [ 315____]  │  35  │   200 h   │  184 h   │ 1,712 ✓  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⚠ BOX1 : productivité inférieure de 22 % à la référence.                                 │
│   Cause d'écart * [▾ Ressource — absence non remplacée                               ]   │
│   Commentaire     [ 1 analyste en congé sur 2 semaines_______________________________]   │
│                                    ( Enregistrer brouillon )  [ ▶ Soumettre ]            │
```

---

---

## 7. Workspace A7 — Finance / Contrôle de gestion

### A7.1 Dashboard finance

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                          [▾ 2026] [▾ FR] ●8🔔 (👤 J. EKOUMA — Finance)   │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Dashboard  ◀ │ Finance › Tableau de bord                     [▾ Période: Juillet 2026 ] │
│ ▸ Fiches trés.●8│                                                                        │
│ ▸ Comptes      │ ┌───────────┐┌───────────┐┌───────────┐┌───────────┐┌───────────┐      │
│ ▸ Budgets      │ │  SOLDE    ││ENCAISSEM. ││DÉCAISSEM. ││FT EN ATT. ││ BUDGET    │      │
│ ▸ Recettes     │ │  TOTAL    ││   MOIS    ││   MOIS    ││           ││ CONSOMMÉ  │      │
│ ▸ Récap (RECP) ││ 12,42 M   ││  1,53 M   ││  2,75 M   ││     8 ●   ││   78 %    │      │
│ ▸ Validations●8│ │ FCFA ▼3 % ││   FCFA    ││ FCFA ▲12 %││ 3 > 3 j ⚠ ││ ▓▓▓▓▓░    │      │
│ ▸ Clôtures     │ └───────────┘└───────────┘└───────────┘└───────────┘└───────────┘      │
│ ▸ Exports compt│ ┌─────────────────────────────────────┐┌──────────────────────────────┐ │
│                │ │ SOLDES PAR COMPTE                   ││ ÉCART PRÉVISION / RÉALISÉ    │ │
│ ───────────    │ │ Banque Afriland ▓▓▓▓▓▓▓▓  8 420 000 ││  M                           │ │
│ ⚙ Paramètres   │ │ Caisse          ▓▓        1 240 000 ││ 3┤   ╭╮      ╭╮              │ │
│ ↩ Déconnexion  │ │ Compte DG       ▓▓▓       1 850 000 ││ 2┤╭──╯╰──╮╭──╯╰─╮  ── prévu  │ │
│                │ │ Compte Julienne ▓           520 000 ││ 1┤╯       ╰╯     ╰  ┄┄ réalisé│ │
│                │ │ Compte Ajara    ▓           310 000 ││ 0└┬──┬──┬──┬──┬──┬─          │ │
│                │ │ Caisse 2        ░            80 000 ││   F  M  A  M  J  J           │ │
│                │ └─────────────────────────────────────┘└──────────────────────────────┘ │
│                │ ┌──────────────────────────────────────────────────────────────────────┐│
│                │ │ TOP 10 DÉPENSES DU MOIS                                              ││
│                │ │ 850 000  Location salle conf.  ETUPANSFIMUF/BOX1  M.NKOA    ●Attente ││
│                │ │ 600 000  Experts externes      PLANDEVCCM/BOX1    T.BESSALA ●Attente ││
│                │ │ 308 176  Primes                MANPANSFICCM/PR1   J.EKOUMA  ✓Validée ││
│                │ │ 167 715  Primes                ETUPANSFIMUF/PR1   J.EKOUMA  ✓Validée ││
│                │ │ 140 000  Descente              ETUPANSFICCM/C     M.NKOA    ✓Validée ││
│                │ │                              ( Voir toutes les FT ▸ )                ││
│                │ └──────────────────────────────────────────────────────────────────────┘│
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A7.2 Fiches de trésorerie (liste globale)

```
│ Finance › Fiches de trésorerie                                                           │
│ [▾ Projet ][▾ Activité ][▾ Ordonnateur ][▾ Compte ][▾ Statut: Tous ][01/07]→[31/07][🔍__]│
│ [x] Justificatif manquant  [ ] Hors mercuriale  [ ] Dépassement budget    ( Réinitialiser)│
│                              [ + Nouvelle FT ] ( Rapprochement ) ( Export Excel ) ( PDF ) │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │[ ]│ N°   │CODE PROJET  │ACT. │ORDONN. │ LIBELLÉ LIBRE      │ MONTANT │JUST│MERC│NIV│VALID.│DESTINATAIRE   │ DATE   │⋮│
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │[ ]│ 2418 │ETUPANSFIMUF │BOX1 │MO001V1 │Location salle conf.│ 850 000 │OUI │NON⚠│ 5 │●Att. │Hôtel Diplomate│28/07/26│⋮│
│ │[ ]│ 2417 │PLANDEVCCM   │ C   │MO001V1 │Perdiem descente    │ 140 000 │NON⚠│OUI │ 5 │●Att. │N/A            │27/07/26│⋮│
│ │[ ]│ 2411 │NAUTRAJUIN24 │FD01 │BO001V1 │Frais d'appels      │   1 000 │OUI │NON │ 5 │✓Val. │Theodore BESSALA│10/06/26│⋮│
│ │[ ]│ 2409 │NAUTRAJUIN24 │FG02 │BO001V1 │Réinit. mot de passe│   4 000 │OUI │NON │ 5 │✓Val. │Theodore BESSALA│05/06/26│⋮│
│ │[ ]│ 2408 │NAUTRAJUIN24 │FH02 │BO001V1 │Approvi. de la caisse│ 10 000 │OUI │NON │ 5 │✓Val. │Theodore BESSALA│05/06/26│⋮│
│ │[ ]│ 2405 │NAUTRAJUI24  │FA07 │RE001   │Réparation écran PC1│   2 000 │NON⚠│NON⚠│ 5 │✗Rej. │N/A            │03/06/26│⋮│
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Sélection : 0 →  [ ✓ Valider ] [ ✗ Rejeter ] [ ↑ Escalader ] ( Exporter la sélection )   │
│ TOTAL période : 1 007 000 FCFA (dont 990 000 en attente)     ◀ 1 2 3 … 45 ▶  1 317 FT    │
│ Menu ⋮ : Ouvrir · Éditer · Voir justificatifs · Historique du workflow · Dupliquer       │
```

### A7.3 Comptes financiers

```
│ Finance › Comptes                                     [ + Transfert inter-comptes ]      │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ COMPTE            │TYPE   │SOLDE OUVERT.│ ENTRÉES  │ SORTIES  │ SOLDE ACTUEL│RAPPR.│⋮│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Banque Afriland   │Banque │  9 200 000  │ 1 533 635│ 2 313 635│   8 420 000 │ ✓ 27/07│⋮│ │
│ │ Caisse            │Caisse │  1 400 000  │   300 000│   460 000│   1 240 000 │ ✓ 27/07│⋮│ │
│ │ Compte DG         │Interne│  2 000 000  │         0│   150 000│   1 850 000 │ ⚠ 30/06│⋮│ │
│ │ Compte Julienne   │Interne│    600 000  │    50 000│   130 000│     520 000 │ ✓ 27/07│⋮│ │
│ │ Compte Ajara      │Interne│    400 000  │         0│    90 000│     310 000 │ ⚠ 15/07│⋮│ │
│ │ Caisse 2          │Caisse │    120 000  │         0│    40 000│      80 000 │ ✓ 27/07│⋮│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL             │       │ 13 720 000  │ 1 883 635│ 3 183 635│  12 420 000 │       │ │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⚠ 2 comptes non rapprochés depuis plus de 15 jours.                                      │
│ Menu ⋮ : Voir mouvements · Rapprocher · Approvisionner · Exporter relevé · Historique    │
```

### A7.4 Budgets (vue consolidée + budget monétaire)

```
│ Finance › Budgets                    [ Onglets: ▸Par projet │ Budget monétaire │ Recettes]│
│ [▾ Exercice: 2026 ][▾ Projet: Tous ][▾ Équipe ]              ( Exporter ) ( Comparer )   │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │PROJET        │ACTIVITÉ│TYPE│CODE│ÉQUIPE│NIV│ DÉBUT  │DURÉE│ DEADLINE │BUDGET MON.│CONSOM.│RESTE │PROGR.│
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ETUPANSFICCEFI│Descentes│ D │ C  │  MO  │ 1 │15/06/24│25 j │ 20/07/24 │  140 000  │     0 │140000│░ 0% │
│ │ETUPANSFICCM  │Descentes│ D │ C  │  MO  │ 1 │05/07/24│18 j │ 30/07/24 │  140 000  │     0 │140000│░ 0% │
│ │ETUPANSFICAPFI│Descentes│ D │ C  │  MO  │ 1 │07/07/24│18 j │ 31/07/24 │  140 000  │     0 │140000│░ 0% │
│ │MANPANSFICAPFI│Descentes│ D │ C  │  MO  │ 1 │15/07/24│35 j │ 31/08/24 │  140 000  │     0 │140000│░ 0% │
│ │NAUTRAJUI24   │Eau      │ D │FA01│  RE  │ 4 │01/07/24│23 j │ 31/07/24 │    1 000  │     0 │  1000│░ 0% │
│ │PLANDEVCCM    │Élaborat.│ E │BOX1│  BO  │ 1 │15/06/24│185 j│ 28/02/25 │  200 000  │204 000│-24000│█112%│
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL                                                        │ 12 210 000│8 470 000│3 740 000│▓78%│
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                          │
│ ▸ Onglet « Budget monétaire » (lignes budgétaires transversales)                         │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │CODE│ LIGNE BUDGÉTAIRE      │ÉQUIPE│NIV│  FÉV   │  MAR   │  AVR   │ ...  │  TOTAL     │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ BA │ Parentaux             │  DG  │ 2 │ 50 000 │ 50 000 │ 50 000 │ ...  │  100 000   │ │
│ │ BB │ Relations publiques   │ DIR  │ 2 │ 10 000 │ 10 000 │ 10 000 │ ...  │   10 000   │ │
│ │BE01│ Imprévus transversaux │  DG  │ 3 │ 20 000 │ 20 000 │ 20 000 │ ...  │  160 000   │ │
│ │ DA │ Relations publiques   │  FO  │ 2 │ 30 000 │ 30 000 │ 30 000 │ ...  │  160 000   │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │    │ TOTAL                 │      │   │510 250 │510 250 │510 250 │ ...  │1 530 750   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ [ + Ligne budgétaire ] ( Nouvelle version ) ( Approuver révision ) [ 🔒 Verrouiller mois ]│
```

### A7.5 Recettes

```
│ Finance › Recettes monétaires                                    [ + Nouvelle recette ]  │
│ [▾ Exercice: 2024-2025 ][▾ Client ][▾ Statut ]                ( Importer ) ( Exporter )  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │CODE PROJET   │ NOM DU PROJET       │ACT.│LIGNE BUDGÉTAIRE     │ÉQ.│NIV│  JUIL   │AOÛT │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ETUPANSFICCEFI│ETUDE PANSFI CCEFI   │AA02│Avance sur paiement  │ RE│ 3 │       — │  —  │ │
│ │ETUPANSFICAPFI│ETUDE PANSFI CAPFI   │AA02│Avance sur paiement  │ RE│ 3 │  861 132│  —  │ │
│ │MANPANSFICAPFI│MANUEL PANSFI CAPFI  │AA02│Avance sur paiement  │ RE│ 3 │  672 503│  —  │ │
│ │ETUPANSFICCM  │MANUEL PANSFI CCM    │AA02│  —                  │ RE│ 3 │       — │  —  │ │
│ │PLANDEVCCM    │PLAN DEV CCM         │AA01│Solde de mission     │ RE│ 3 │       — │1 200 000│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL                                                          │   │1 533 635│1 200 000│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Menu ligne : Éditer · Rapprocher facture · Marquer encaissée · Supprimer (si brouillon)   │
```

### A7.6 Récapitulatif (RECP)

```
│ Finance › Récapitulatif (RECP)                                                           │
│ Période :  Date début [ 01/07/2024 ] 📅   →   Date de fin [ 31/08/2024 ] 📅   [ Calculer ]│
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                          │  BUDGET MONÉTAIRE  │   BUDGET EHS    │                    │ │
│ │ ─────────────────────────┼────────────────────┼─────────────────┤                    │ │
│ │ Dépenses EHS             │             0 FCFA │        0 unités │                    │ │
│ │ Dépenses monétaires      │     2 753 647 FCFA │   18 357,65 u   │                    │ │
│ │ Recettes                 │     1 533 635 FCFA │   10 224,23 u   │                    │ │
│ │ ─────────────────────────┼────────────────────┼─────────────────┤                    │ │
│ │ SOLDE DE PÉRIODE         │    -1 220 012 FCFA │   -8 133,42 u   │  ⚠ déficitaire     │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │
│ │ RÉPARTITION DES DÉPENSES                  │ │ ÉVOLUTION MENSUELLE                    │ │
│ │ Descentes      ▓▓▓▓▓▓▓▓▓▓  1 120 000 (41%)│ │ 2M┤ ▓  ▓                               │ │
│ │ Experts        ▓▓▓▓▓▓       780 000 (28%) │ │ 1M┤ ▓  ▓  ┄  ┄       ▓ dépenses        │ │
│ │ Primes         ▓▓▓▓         475 891 (17%) │ │  0└─┬──┬──┬──┬──     ┄ recettes        │ │
│ │ Transversal    ▓▓           228 756 (8%)  │ │     J  A  S  O                         │ │
│ │ Autres         ▓            148 000 (6%)  │ │                                        │ │
│ └───────────────────────────────────────────┘ └────────────────────────────────────────┘ │
│                                        ( Comparer périodes ) ( Export PDF ) ( Export XLS )│
```

### A7.9 Exports comptables

```
│ Finance › Exports comptables                                                             │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ GÉNÉRER UN EXPORT                                                                    │ │
│ │ Format *   (•) OHADA/SYSCOHADA (CSV)  ( ) Excel détaillé  ( ) FEC                    │ │
│ │ Période *  [ 01/07/2026 ] 📅 → [ 31/07/2026 ] 📅                                     │ │
│ │ Contenu    [x] Fiches de trésorerie validées  [x] Recettes encaissées                │ │
│ │            [ ] Écritures d'engagement          [ ] Provisions EHS                    │ │
│ │ Comptes    [▾ Tous les comptes                                                    ]  │ │
│ │ ⚠ Seules les périodes clôturées peuvent être exportées définitivement.               │ │
│ │                                              [ Générer l'export ]                    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ HISTORIQUE DES EXPORTS                                                               │ │
│ │ DATE       │ PÉRIODE       │ FORMAT  │ LIGNES │ AUTEUR    │ EMPREINTE │ ACTIONS      │ │
│ │ 05/07/2026 │ Juin 2026     │ OHADA   │   428  │ J. EKOUMA │ a3f7…c21  │ (↓) (Journal)│ │
│ │ 04/06/2026 │ Mai 2026      │ OHADA   │   391  │ J. EKOUMA │ 9b2e…f04  │ (↓) (Journal)│ │
│ │ 06/05/2026 │ Avril 2026    │ OHADA   │   367  │ J. EKOUMA │ 44c1…8ab  │ (↓) (Journal)│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
```

---

## 8. Workspace A8 — Ressources Humaines

### A8.1 Liste du personnel

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                              [▾ 2026] [▾ FR] ●2🔔 (👤 C. MENGUE — RH)     │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Personnel  ◀ │ RH › Liste du personnel                                                 │
│ ▸ Équipes      │ [▾ Équipe: Toutes ][▾ Grade: Tous ][▾ Statut: Actifs ]      [🔍_______] │
│ ▸ Absences  ●2 │                       [ + Nouvel employé ] ( Importer ) ( Exporter )    │
│ ▸ Contrats     │ ┌────────────────────────────────────────────────────────────────────┐  │
│ ▸ Compétences  │ │[ ]│MATRIC.│MATR.VERS.│ NOM COMPLET      │GRADE│ÉQUIPE│INTÉGRAT.│STAT│⋮│ │
│ ▸ Versions     │ ├────────────────────────────────────────────────────────────────────┤  │
│                │ │[ ]│PI001  │ PI001V1  │ Ajara LAMARE     │ PI  │  PI  │01/02/2021│●Act│⋮│ │
│ ───────────    │ │[ ]│BO001  │ BO001V1  │ Theodore BESSALA │ BO  │  BO  │01/02/2021│●Act│⋮│ │
│ ⚙ Paramètres   │ │[ ]│RE001  │ RE001V1  │ Julienne EKOUMA  │ RE  │  RE  │01/02/2021│●Act│⋮│ │
│ ↩ Déconnexion  │ │[ ]│BO002  │ BO002V2  │ Sylvie MBIDA     │ MO1 │  MO  │15/03/2023│●Act│⋮│ │
│                │ │[ ]│BO003  │ BO003V1  │ Alain FOKOU      │ BO  │  BO  │01/09/2024│●Act│⋮│ │
│                │ │[ ]│MO001  │ MO001V1  │ Marc NKOA        │ MO  │  MO  │12/06/2022│●Act│⋮│ │
│                │ │[ ]│FO001  │ FO001V1  │ Paul ATANGANA    │ FO  │  FO  │03/04/2023│○Ina│⋮│ │
│                │ └────────────────────────────────────────────────────────────────────┘  │
│                │ 7 employés (6 actifs)                        ◀ 1 ▶                       │
│                │ Menu ⋮ : Ouvrir · Nouvelle version · Changer équipe · Désactiver         │
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A8.2 Fiche employé — Onglet Général

```
│ RH › Theodore BESSALA (BO001V1)                                 ●Actif   ( ⋮ Actions )   │
│ ┌────────┬──────────────┬─────────┬──────────┬────────────┬──────────┬─────────┬───────┐ │
│ │Général │Grade/Équipe  │Versions │ Absences │Compétences │ Contrats │Hist. EHS│Docum. │ │
│ └────────┴──────────────┴─────────┴──────────┴────────────┴──────────┴─────────┴───────┘ │
│ ┌───────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │
│ │ IDENTITÉ                                  │ │       ┌──────────┐                     │ │
│ │ Matricule *        [ BO001_______]        │ │       │   👤     │  Theodore BESSALA   │ │
│ │ Matricule versionné  BO001V1  (auto)      │ │       │  photo   │  BO001V1            │ │
│ │ Prénom (un seul) * [ Theodore______]      │ │       └──────────┘  Manager équipe BO  │ │
│ │ Nom (un seul) *    [ BESSALA_______]      │ │       ( Changer la photo )             │ │
│ │ Nom complet          Theodore BESSALA     │ │ Ancienneté      5 ans 5 mois           │ │
│ │ Date d'intégration*[ 01/02/2021 ] 📅      │ │ EHS cumulé 2025  68 488 unités         │ │
│ │ Mail pro *         [ t.bessala@naumur.cm] │ │ Heures 2025      1 872 h               │ │
│ │ Téléphone          [ +237 6__________]    │ │ Projets actifs   4                     │ │
│ └───────────────────────────────────────────┘ └────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │
│ │ POSITION                                  │ │ RÉMUNÉRATION / COÛT                    │ │
│ │ Grade *          [▾ BO — Back Office   ]  │ │ Coût de référence [ 11 000___] FCFA/j  │ │
│ │ Équipe *         [▾ BO                 ]  │ │ Taux facturation  [ 15 000___] FCFA/j  │ │
│ │ Titre            [ Manager équipe______]  │ │ Coefficient EHS   [ 1,00_____]         │ │
│ │ Manager          [▾ A. LAMARE (PI001)  ]  │ │ ⓘ Utilisé pour le calcul du potentiel  │ │
│ │ Statut *         [▾ Actif              ]  │ │   EHS et des coûts de projet.          │ │
│ │ [x] Est manager d'équipe                  │ │                                        │ │
│ └───────────────────────────────────────────┘ └────────────────────────────────────────┘ │
│  ( Annuler )  [ Enregistrer ]   ⋮ : Nouvelle version · Réinit. MDP · Désactiver          │
```

### A8.2c Fiche employé — Onglet Versions

```
│ RH › Theodore BESSALA › Versions du matricule            [ + Nouvelle version ] (Export) │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │VERSION │ MATR. VERS. │ DÉBUT      │ FIN VERSION │GRADE│ÉQUIPE│ TITRE          │ ÉTAT  │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │  V1    │ BO001V1     │ 01/02/2021 │      —      │ BO  │  BO  │ Manager équipe │●Courante│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Toute modification de grade ou d'équipe clôture la version courante et en crée une     │
│   nouvelle. L'historique EHS et les heures restent rattachés à la version d'origine.     │
│                                                                                          │
│ ▸ Exemple : Sylvie MBIDA (BO002)                                                         │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │  V1    │ BO002V1     │ 15/03/2023 │  31/03/2025 │ BO  │  BO  │ Analyste       │○Close │ │
│ │  V2    │ BO002V2     │ 01/04/2025 │      —      │ MO1 │  MO  │ Chef de mission│●Courante│ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
```

**Modal « + Nouvelle version »**

```
        ┌─────────────────────────────────────────────────────────────┐
        │ Nouvelle version — Theodore BESSALA (BO001)             [✕] │
        ├─────────────────────────────────────────────────────────────┤
        │ Version courante  BO001V1 · BO · Équipe BO · depuis 01/02/21│
        │                                                             │
        │ Motif du changement *                                       │
        │ (•) Changement de grade   ( ) Changement d'équipe            │
        │ ( ) Changement de statut  ( ) Autre                          │
        │                                                             │
        │ Date d'effet *      [ 01/08/2026 ] 📅                        │
        │ Nouveau matricule     BO001V2  (généré automatiquement)      │
        │                                                             │
        │ Nouveau grade *     [▾ DIR — Direction              ]        │
        │ Nouvelle équipe *   [▾ DIR                          ]        │
        │ Nouveau titre       [ Directeur des opérations______]        │
        │ Nouveau coût réf.   [ 32 000____] FCFA/j                     │
        │                                                             │
        │ Commentaire         [_______________________________]        │
        │                                                             │
        │ ⚠ La version BO001V1 sera clôturée au 31/07/2026.           │
        │   L'historique EHS et les heures antérieures restent liés    │
        │   à BO001V1 et ne seront pas recalculés.                     │
        ├─────────────────────────────────────────────────────────────┤
        │              ( Annuler )  [ Créer la version BO001V2 ]      │
        └─────────────────────────────────────────────────────────────┘
```

### A8.2g Fiche employé — Onglet Historique EHS

```
│ RH › Theodore BESSALA › Historique EHS                    [ ⟳ Recalculer ] ( Exporter )  │
│ [▾ Année: 2025 ]                                                                         │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MOIS      │ POTENTIEL │  BUDGET   │  CRÉDIT   │  ÉCART   │ HEURES │ ACTIVITÉS        │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Janvier   │   2 500   │   2 740   │   2 740   │     0 ✓  │ 160 h  │ 4                │ │
│ │ Février   │   2 560   │   2 890   │   2 890   │     0 ✓  │ 152 h  │ 5                │ │
│ │ Mars      │   2 480   │   2 660   │   2 610   │   -50 ⚠  │ 168 h  │ 4                │ │
│ │ Avril     │   2 700   │   2 950   │   2 950   │     0 ✓  │ 160 h  │ 5                │ │
│ │ Mai       │   2 650   │   2 880   │   2 880   │     0 ✓  │ 152 h  │ 4                │ │
│ │ Juin      │   2 540   │   2 720   │   2 700   │   -20 ⚠  │ 160 h  │ 4                │ │
│ │ Juillet   │   2 480   │   2 640   │   2 640   │     0 ✓  │ 168 h  │ 3                │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL     │  17 910   │  19 480   │  19 410   │   -70    │1 120 h │                  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Potentiel = marge de chiffrage attribuée · Budget = planifié · Crédit = après FT réelles│
│ ▸ Détail d'un mois (clic) → ventilation par projet et activité                           │
```

### A8.3 Équipes

```
│ RH › Équipes                                                    [ + Nouvelle équipe ]    │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ CODE │ LIBELLÉ                    │ MANAGER          │EFFECTIF│POTENT. EHS│BUDGET EHS│⋮│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │  PI  │ Pilotage / Intégration     │ Ajara LAMARE     │   1    │   1 240   │   1 310  │⋮│ │
│ │  BO  │ Back Office                │ Theodore BESSALA │   4    │   2 560   │   7 818  │⋮│ │
│ │  FO  │ Front Office               │ (non désigné) ⚠  │   2    │   3 680   │   3 820  │⋮│ │
│ │  MO  │ Maîtrise d'œuvre           │ Marc NKOA        │   3    │   4 810   │   5 040  │⋮│ │
│ │  RE  │ Ressources / Régie         │ Julienne EKOUMA  │   1    │   1 450   │   1 520  │⋮│ │
│ │ DIR  │ Direction                  │ Ajara LAMARE     │   1    │       —   │       —  │⋮│ │
│ │ NUM  │ Maîtrise d'œuvre numérique │ (non désigné) ⚠  │   0    │       —   │       —  │⋮│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL│                            │                  │  12    │  13 740   │  19 508  │ │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⚠ 2 équipes sans manager désigné.                                                        │
│ Menu ⋮ : Ouvrir · Désigner un manager · Composition par période · Sous-équipes · Archiver │
```

---

---

## 9. Workspace A9 — HSE / EHS

### A9.1 Dashboard HSE

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                             [▾ 2026] [▾ FR] ●3🔔 (👤 D. OWONA — HSE)     │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Dashboard  ◀ │ HSE › Tableau de bord                          [▾ Période: Juillet 2026 ]│
│ ▸ Incidents    │ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐            │
│ ▸ Inspections  │ │INCIDENTS ││   TAUX   ││   TAUX   ││ ACTIONS  ││ BUDGET   │            │
│ ▸ Actions   ●3 │ │  MOIS    ││FRÉQUENCE ││ GRAVITÉ  ││EN RETARD ││   HSE    │            │
│ ▸ Indicateurs  │ │    4     ││   2,14   ││   0,08   ││   3 ⚠    ││   62 %   │            │
│ ▸ Dispositif   │ │  ▼ -2    ││  ▼ -0,3  ││  ▬ =     ││  ▲ +1    ││ ▓▓▓▓░    │            │
│   EHS          │ └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘            │
│ ▸ Budget HSE   │ ┌────────────────────────────────────┐┌────────────────────────────────┐│
│                │ │ PYRAMIDE DE BIRD (année)           ││ INCIDENTS PAR TYPE (12 mois)   ││
│ ───────────    │ │            ▲  1  Accident grave    ││ Presque-accident ▓▓▓▓▓▓▓▓ 24   ││
│ ⚙ Paramètres   │ │          ▲▲▲  3  Accidents légers  ││ Observation      ▓▓▓▓▓▓  18    ││
│ ↩ Déconnexion  │ │        ▲▲▲▲▲  9  Presque-accidents ││ Non-conformité   ▓▓▓▓    12    ││
│                │ │      ▲▲▲▲▲▲▲ 27  Observations      ││ Accident léger   ▓▓       6    ││
│                │ │    ▲▲▲▲▲▲▲▲▲ 81  Comportements     ││ Accident grave   ▓        1    ││
│                │ └────────────────────────────────────┘└────────────────────────────────┘│
│                │ ┌──────────────────────────────────────────────────────────────────────┐│
│                │ │ ÉVOLUTION DES INDICATEURS (12 MOIS)                                  ││
│                │ │  4┤    ╭╮                                                             ││
│                │ │  3┤ ╭──╯╰╮   ╭╮                        ── Incidents                   ││
│                │ │  2┤─╯    ╰───╯╰──╮   ╭──╮                ┄┄ Taux de fréquence         ││
│                │ │  1┤┄┄┄┄┄┄┄┄┄┄┄┄┄┄╰───╯  ╰┄┄                                           ││
│                │ │  0└┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬                                 ││
│                │ │    A  S  O  N  D  J  F  M  A  M  J  J                                 ││
│                │ └──────────────────────────────────────────────────────────────────────┘│
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A9.2 Incidents

```
│ HSE › Incidents et événements                              [ + Déclarer un événement ]   │
│ [▾ Type: Tous ][▾ Gravité ][▾ Projet ][▾ Statut ][01/01/26]→[28/07/26]  ( Exporter )     │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ N°  │ DATE     │ TYPE              │ PROJET       │ LIEU     │GRAV.│ACTIONS│ STATUT  │⋮│
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │HSE24│ 26/07/26 │ Presque-accident  │ PLANDEVCCM   │ Yaoundé  │ 🟡 2│  2/2  │●En cours│⋮│
│ │HSE23│ 18/07/26 │ Observation       │ ETUPANSFIMUF │ Douala   │ 🟢 1│  1/1  │✓Clôturé │⋮│
│ │HSE22│ 12/07/26 │ Non-conformité    │ MANPANSFICCM │ Yaoundé  │ 🟠 3│  1/3 ⚠│●En cours│⋮│
│ │HSE21│ 04/07/26 │ Accident léger    │ PLANDEVCCM   │ Terrain  │ 🟠 3│  3/3  │✓Clôturé │⋮│
│ │HSE20│ 28/06/26 │ Presque-accident  │ ETUPANSFICOOP│ Bafoussam│ 🟡 2│  0/2 ⚠│●Ouvert  │⋮│
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ Gravité : 🟢 1 mineure · 🟡 2 modérée · 🟠 3 importante · 🔴 4 grave · ⚫ 5 critique      │
│ ⚠ 2 événements avec actions correctives en retard.                                       │
```

**Formulaire « Déclarer un événement »**

```
        ┌──────────────────────────────────────────────────────────────┐
        │ Déclarer un événement HSE                                [✕] │
        ├──────────────────────────────────────────────────────────────┤
        │ Type d'événement *                                           │
        │ ( ) Accident      ( ) Accident léger   (•) Presque-accident  │
        │ ( ) Observation   ( ) Non-conformité                          │
        │                                                              │
        │ Date * [ 28/07/2026 ] 📅   Heure [ 14:30 ]                   │
        │ Projet *  [▾ PLAN DEV CCM (PLANDEVCCM)                    ]  │
        │ Activité  [▾ MOA — Pilotage des opérations terrain        ]  │
        │ Lieu *    [ Site de Yaoundé — zone de stockage___________]   │
        │                                                              │
        │ Gravité * ( )1  (•)2  ( )3  ( )4  ( )5                       │
        │                                                              │
        │ Personnes concernées                                         │
        │ [▾ M. NKOA (MO001V1) ✕] [▾ A. FOKOU (BO003V1) ✕] [+ Ajouter] │
        │ [ ] Témoins uniquement (pas de personne blessée)             │
        │                                                              │
        │ Description des faits *                                      │
        │ [__________________________________________________________] │
        │ [__________________________________________________________] │
        │                                                              │
        │ Causes présumées                                             │
        │ [x] Organisation  [ ] Matériel  [ ] Humain  [ ] Environnement│
        │                                                              │
        │ 📎 Pièces jointes  ( Ajouter une photo / un document )       │
        │    photo_zone.jpg ✕                                          │
        │                                                              │
        │ Confidentialité * (•) Standard  ( ) Restreinte (HSE + DG)    │
        ├──────────────────────────────────────────────────────────────┤
        │  ( Annuler ) ( Enregistrer brouillon ) [ Déclarer l'événement]│
        └──────────────────────────────────────────────────────────────┘
```

### A9.4 Actions correctives (kanban)

```
│ HSE › Actions correctives              [Vue: ▤ Kanban │ ▣ Liste]   [ + Nouvelle action ] │
│ [▾ Responsable: Tous ][▾ Projet ][▾ Priorité ]                          ( Exporter )     │
│ ┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────────────┐│
│ │ À FAIRE  (4)  │ EN COURS (3)  │ EN RETARD (3)⚠│ À VALIDER (2) │ CLÔTURÉES (18)        ││
│ ├───────────────┼───────────────┼───────────────┼───────────────┼───────────────────────┤│
│ │┌─────────────┐│┌─────────────┐│┌─────────────┐│┌─────────────┐│┌─────────────────────┐││
│ ││ ACT-041     │││ ACT-038     │││ ACT-033  ⚠  │││ ACT-036     │││ ACT-029          ✓  │││
│ ││ Baliser la  │││ Formation   │││ Réparer le  │││ Remplacer   │││ Signalétique zone   │││
│ ││ zone stock. │││ EPI équipe  │││ garde-corps │││ extincteur  │││ de circulation      │││
│ ││ HSE24       │││ HSE22       │││ HSE20       │││ HSE21       │││ HSE18               │││
│ ││ 🔴 Haute    │││ 🟠 Moyenne  │││ 🔴 Haute    │││ 🟠 Moyenne  │││ 🟢 Basse            │││
│ ││ 👤 M. NKOA  │││ 👤 D. OWONA │││ 👤 M. NKOA  │││ 👤 D. OWONA │││ 👤 T. BESSALA       │││
│ ││ 📅 05/08    │││ 📅 15/08    │││ 📅 10/07 -18j│││ 📅 30/07   │││ ✓ Efficacité validée│││
│ │└─────────────┘│└─────────────┘│└─────────────┘│└─────────────┘│└─────────────────────┘││
│ │┌─────────────┐│┌─────────────┐│┌─────────────┐│┌─────────────┐│                       ││
│ ││ ACT-042     │││ ACT-039     │││ ACT-034  ⚠  │││ ACT-037     ││   ( Voir les 18 ▸ )   ││
│ ││ Note de     │││ Audit du    │││ Mise à jour │││ Causerie    ││                       ││
│ ││ service     │││ stockage    │││ du registre │││ sécurité S30││                       ││
│ │└─────────────┘│└─────────────┘│└─────────────┘│└─────────────┘│                       ││
│ │ + 2 autres    │ + 1 autre     │ + 1 autre     │               │                       ││
│ └───────────────┴───────────────┴───────────────┴───────────────┴───────────────────────┘│
│ ≡ Glisser une carte pour changer son statut. Actions : Assigner · Marquer faite ·        │
│   Valider l'efficacité · Réouvrir                                                        │
```

### A9.6 Dispositif EHS (cœur calculatoire)

```
│ EHS › Dispositif de crédit EHS                                                           │
│ [▾ Période: Février 2025 ][▾ Vue: Par employé ][ ] Inclure le transversal                │
│ [ ⟳ Recalculer le potentiel ] [ ⟳ Recalculer le budget ] [ ⟳ Recalculer le crédit ]      │
│ ┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐                  │
│ │ POTENTIEL  ││   BUDGET   ││   CRÉDIT   ││ TAUX EHS   ││   ÉCART    │                  │
│ │    EHS     ││    EHS     ││    EHS     ││  APPLIQUÉ  ││ BUDG/CRÉD  │                  │
│ │   13 740   ││   19 508   ││   19 380   ││  150 /u    ││   -128 ⚠   │                  │
│ └────────────┘└────────────┘└────────────┘└────────────┘└────────────┘                  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ VUE PAR ACTIVITÉ (source : feuille Budget EHS)                                       │ │
│ │ SIGNE │ NOM DE L'ACTIVITÉ              │ÉQUIPE│NIV│  FÉV  │  MAR  │  AVR  │  MAI     │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ PIA11 │ Apurement des TODO (PI, Wrike) │ PIA  │ 4 │   60  │   60  │   60  │   60     │ │
│ │PIA111 │ Apurement de la TODO PI        │ PIA  │ 5 │    0  │    0  │    0  │    0     │ │
│ │PIA112 │ Apurement de la TODO Réunions  │ PIA  │ 5 │    0  │    0  │    0  │    0     │ │
│ │PIA121 │ Planification réunions DG/DIR  │ PIA  │ 5 │   60  │   60  │   60  │   60     │ │
│ │PIA122 │ Support réunion DIR            │ PIA  │ 5 │  360  │  360  │  360  │  360     │ │
│ │ BOX1  │ Élaboration des livrables      │  BO  │ 1 │  513  │  513  │  513  │  513     │ │
│ │ MOA   │ Pilotage opérations terrain    │  MO  │ 2 │  150  │  151  │  150  │  150     │ │
│ │ MOB1  │ Transcription                  │ MO2  │ 2 │  100  │  100  │  100  │  100     │ │
│ │ FOX43 │ Suivi des bénéficiaires        │  FO  │ 2 │   64  │   64  │   64  │   64     │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL │                                │      │   │ 1 890 │ 1 891 │ 1 890 │ 1 890    │ │
│ │ ENVELOPPE MENSUELLE                    │      │   │249 000│249 000│249 000│249 000   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ VUE PAR EMPLOYÉ                                                                      │ │
│ │MATRICULE│ NOM              │ÉQUIPE│POTENTIEL│ BUDGET │ CRÉDIT │ÉCART│TRANSV.│H.TRANSV.│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │PI001V1  │ Ajara LAMARE     │  PI  │  1 240  │  1 310 │  1 310 │  0 ✓│   480 │    830  │ │
│ │BO001V1  │ Theodore BESSALA │  BO  │  2 560  │  2 890 │  2 890 │  0 ✓│   360 │  2 530  │ │
│ │BO002V2  │ Sylvie MBIDA     │  MO  │  1 980  │  2 140 │  2 090 │-50 ⚠│   240 │  1 850  │ │
│ │BO003V1  │ Alain FOKOU      │  BO  │  1 500  │  1 620 │  1 620 │  0 ✓│   120 │  1 500  │ │
│ │RE001V1  │ Julienne EKOUMA  │  RE  │  1 450  │  1 520 │  1 442 │-78 ⚠│   600 │    842  │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ TOTAL   │                  │      │ 13 740  │ 19 508 │ 19 380 │-128 │ 4 200 │ 15 180  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Écart = Crédit − Budget. Un écart négatif signale des dépenses réelles (FT) supérieures│
│   au potentiel attribué.       ( ƒ Voir la formule ) ( Comparer prévu/réalisé ) ( Export )│
```

**Panneau « ƒ Voir la formule »**

```
        ┌──────────────────────────────────────────────────────────────┐
        │ Formule de calcul — Crédit EHS                           [✕] │
        ├──────────────────────────────────────────────────────────────┤
        │ ① POTENTIEL EHS (par activité)                               │
        │    RESTE = NET À PAYER − TOTAL DES DÉPENSES DIRECTES         │
        │    RESTE EHS = RESTE × quote-part EHS                        │
        │    POTENTIEL CRÉDIT EHS = RESTE EHS ÷ taux EHS (150)         │
        │                                                              │
        │ ② BUDGET EHS (par employé × mois)                            │
        │    = Σ (potentiel de l'activité × poids de l'affectation)    │
        │      pour toutes les activités du mois                       │
        │                                                              │
        │ ③ CRÉDIT EHS (effectif)                                      │
        │    = BUDGET EHS − (dépenses réelles issues des FT validées   │
        │                    imputées à l'employé ÷ taux EHS)          │
        │                                                              │
        │ ④ VENTILATION                                                │
        │    EHS transversal     = activités des projets NAUTRA*       │
        │    EHS hors transversal = activités des projets clients      │
        │                                                              │
        │ Propriétaire métier : Direction · Dernière validation 12/07/26│
        │                                        ( Voir le calcul détaillé)│
        └──────────────────────────────────────────────────────────────┘
```

---

## 10. Workspace A10 — Consultation / Auditeur (lecture seule)

### A10.1 Dashboards autorisés

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ PERLE   [🔍]                       [▾ 2026] [▾ FR] 🔔 (👤 P. ATANGANA — Lecture seule) │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ ▸ Dashboards ◀ │ Consultation › Tableaux de bord autorisés          🔒 Mode lecture seule │
│ ▸ Rapports     │ [▾ Périmètre: Projet PLANDEVCCM ][▾ Période: Juillet 2026 ]  ( Exporter )│
│ ▸ Exports      │ ┌──────────────────────────────────────────────────────────────────────┐│
│ ▸ Historique   │ │ ⓘ Votre périmètre : 1 projet (PLANDEVCCM) · données financières       ││
│                │ │   masquées · pas d'accès aux données personnelles ni HSE sensibles    ││
│ ───────────    │ └──────────────────────────────────────────────────────────────────────┘│
│ ⚙ Préférences  │ ┌────────────┐┌────────────┐┌────────────┐┌────────────┐                │
│ ↩ Déconnexion  │ │ AVANCEMENT ││ ACTIVITÉS  ││   HEURES   ││   JALONS   │                │
│                │ │    78 %    ││     6      ││  1 120 h   ││    1 / 2   │                │
│                │ │ ▓▓▓▓▓░     ││ 1 en retard││            ││  atteints  │                │
│                │ └────────────┘└────────────┘└────────────┘└────────────┘                │
│                │ ┌──────────────────────────────────────────────────────────────────────┐│
│                │ │ AVANCEMENT PAR ACTIVITÉ                                              ││
│                │ │ BOX1  Élaboration des livrables   ▓▓▓▓▓▓▓▓░░  82 %                   ││
│                │ │ C     Dépenses pour les descentes ▓▓▓▓▓▓▓░░░  70 %                   ││
│                │ │ MOA   Pilotage opérations terrain ▓▓▓▓▓▓▓░░░  76 %                   ││
│                │ │ MOB1  Transcription               ▓▓▓▓░░░░░░  45 % ⚠                  ││
│                │ │ FOX43 Suivi des bénéficiaires     ▓▓▓▓▓▓▓▓▓░  90 %                   ││
│                │ │ PR1   Primes                      ░░░░░░░░░░   0 %                   ││
│                │ └──────────────────────────────────────────────────────────────────────┘│
│                │ ⓘ Aucun bouton de modification n'est disponible dans ce mode.           │
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### A10.2 Catalogue de rapports

```
│ Consultation › Rapports                                          🔒 Mode lecture seule   │
│ [▾ Catégorie: Toutes ][▾ Périodicité ]                                     [🔍_______]   │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ID     │ RAPPORT                          │ PÉRIODICITÉ      │ DERNIÈRE VERSION│ACTION│ │
│ ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ RAP-01 │ Situation globale du projet      │ Hebdo / mensuel  │ 27/07/2026 ✓    │(↓PDF)│ │
│ │ RAP-02 │ Planning et jalons               │ À la demande     │ 21/07/2026      │(↓PDF)│ │
│ │ RAP-03 │ Rapport des heures               │ Jour/semaine/mois│ 27/07/2026 ✓    │(↓XLS)│ │
│ │ RAP-04 │ Charge et affectations d'équipes │ Semaine / mois   │ 🔒 Non autorisé │  —   │ │
│ │ RAP-05 │ Production et productivité       │ Jour/semaine/mois│ 26/07/2026      │(↓PDF)│ │
│ │ RAP-06 │ Budget et contrôle des coûts     │ Mois / clôture   │ 🔒 Non autorisé │  —   │ │
│ │ RAP-07 │ Plan de trésorerie               │ Semaine / mois   │ 🔒 Non autorisé │  —   │ │
│ │ RAP-08 │ Utilisation des équipements      │ Semaine / mois   │ 20/07/2026      │(↓PDF)│ │
│ │ RAP-09 │ Rapport HSE                      │ Semaine / mois   │ 🔒 Non autorisé │  —   │ │
│ │ RAP-10 │ Qualité des données et anomalies │ Hebdomadaire     │ 🔒 Non autorisé │  —   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│ ⓘ Chaque export inclut : critères, date, auteur et périmètre (exigence RPT-04).          │
│ ⚠ Tous vos exports sont journalisés dans l'audit.                                        │
```

---

## 11. Version mobile / tablette (écrans terrain prioritaires)

Conformément à NFR-UX-01, les écrans terrain (saisie des heures, FT, incident HSE, avancement) sont utilisables sur mobile.

### M1 — Accueil mobile (rôle Opérations)

```
        ┌───────────────────────┐
        │ ☰   ◆ PERLE      🔔●2 │
        ├───────────────────────┤
        │ Mardi 28 juillet      │
        │ Bonjour Marc          │
        │                       │
        │ ┌───────────────────┐ │
        │ │ ⏱  SAISIR MES     │ │
        │ │    HEURES         │ │
        │ └───────────────────┘ │
        │ ┌───────────────────┐ │
        │ │ 💰 NOUVELLE FT    │ │
        │ └───────────────────┘ │
        │ ┌───────────────────┐ │
        │ │ ⚠  SIGNALER UN    │ │
        │ │    INCIDENT       │ │
        │ └───────────────────┘ │
        │                       │
        │ AUJOURD'HUI           │
        │ ┌───────────────────┐ │
        │ │ 08:00-12:00       │ │
        │ │ MOA Pilotage terr.│ │
        │ │ 📍 Yaoundé        │ │
        │ ├───────────────────┤ │
        │ │ 13:00-17:00       │ │
        │ │ MOB1 Transcription│ │
        │ │ 📍 Bureau         │ │
        │ └───────────────────┘ │
        │                       │
        │ À FAIRE            ●2 │
        │ ● FDT S30 non soumise │
        │ ● Avancement MOB1     │
        ├───────────────────────┤
        │ 🏠   📋   ⏱   💰   👤 │
        └───────────────────────┘
```

### M2 — Saisie rapide des heures (mobile)

```
        ┌───────────────────────┐
        │ ‹ Retour   MES HEURES │
        ├───────────────────────┤
        │ ◀  Mardi 28/07  ▶     │
        │                       │
        │ ┌───────────────────┐ │
        │ │ Projet            │ │
        │ │ [▾ PLAN DEV CCM ] │ │
        │ │ Activité          │ │
        │ │ [▾ MOA Pilotage ] │ │
        │ │ Type d'heure      │ │
        │ │ [▾ Normale      ] │ │
        │ │                   │ │
        │ │ Heures            │ │
        │ │   ( − )  4,0  ( + )│ │
        │ └───────────────────┘ │
        │      [ + Ajouter ]    │
        │                       │
        │ SAISIES DU JOUR       │
        │ ┌───────────────────┐ │
        │ │ MOA Pilotage 4,0 h│ │
        │ │ PLANDEVCCM     ✕  │ │
        │ ├───────────────────┤ │
        │ │ MOB1 Transcr. 4,0h│ │
        │ │ PLANDEVCCM     ✕  │ │
        │ └───────────────────┘ │
        │ TOTAL      8,0 / 8,0 ✓│
        │                       │
        │ [    ENREGISTRER    ] │
        │ [    SOUMETTRE S30  ] │
        └───────────────────────┘
```

### M3 — Déclaration d'incident HSE (mobile)

```
        ┌───────────────────────┐
        │ ‹ Retour   INCIDENT   │
        ├───────────────────────┤
        │ Type *                │
        │ ( ) Accident          │
        │ ( ) Accident léger    │
        │ (•) Presque-accident  │
        │ ( ) Observation       │
        │ ( ) Non-conformité    │
        │                       │
        │ Gravité *             │
        │ ①  ❷  ③  ④  ⑤        │
        │                       │
        │ Date / heure *        │
        │ [ 28/07/26 ] [14:30]  │
        │                       │
        │ Projet *              │
        │ [▾ PLAN DEV CCM     ] │
        │                       │
        │ Lieu * 📍 (GPS auto)  │
        │ [ Yaoundé — stockage ]│
        │                       │
        │ Description *         │
        │ ┌───────────────────┐ │
        │ │                   │ │
        │ │                   │ │
        │ └───────────────────┘ │
        │                       │
        │ [ 📷 Prendre photo  ] │
        │  photo_zone.jpg   ✕   │
        │                       │
        │ [     DÉCLARER      ] │
        │ ( Enregistrer brouillon)│
        └───────────────────────┘
```

---

## 12. Parcours utilisateurs clés (enchaînement des écrans)

### P1 — Cycle de vie d'une fiche de trésorerie

```
 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
 │ A6.3        │   │ A5.4 / A3.2 │   │ A7.2        │   │ A2.5        │   │ A7.3        │
 │ Ordonnateur │──▶│ Chef projet │──▶│ Finance     │──▶│ Direction   │──▶│ Mouvement   │
 │ saisit la FT│   │ contrôle    │   │ valide      │   │ approuve    │   │ comptabilisé│
 │             │   │             │   │             │   │ (si > seuil)│   │ solde MAJ   │
 └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
       │                  │                 │                 │
       │                  ▼                 ▼                 ▼
       │            ┌───────────────────────────────────┐
       └────────────│  ✗ Rejet (motif obligatoire)      │
                    │  → retour à l'ordonnateur         │
                    │  → notification + journal d'audit │
                    └───────────────────────────────────┘
```

### P2 — Cycle de vie d'une feuille de temps

```
 ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐
 │ Brouillon│─▶│  Soumis  │─▶│  Contrôlé  │─▶│  Validé  │─▶│ Clôturé  │
 │  A6.4    │  │  A6.4    │  │   A5.4     │  │  A5.4    │  │  A7.8    │
 │ Employé  │  │ Employé  │  │ Conducteur │  │Chef proj.│  │RH/Finance│
 └──────────┘  └────┬─────┘  └─────┬──────┘  └────┬─────┘  └──────────┘
       ▲            │              │              │              │
       │            ▼              ▼              ▼              ▼
       │      ┌──────────────────────────────┐   ┌─────────────────────┐
       └──────│  ✗ Rejeté (motif obligatoire)│   │ Correction possible │
              └──────────────────────────────┘   │ par ajustement tracé│
                                                  └─────────────────────┘
```

### P3 — Du chiffrage au crédit EHS (chaîne de valeur)

```
 ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
 │ A3.3           │   │ A3.2b          │   │ A3.2c          │
 │ Chiffrage      │──▶│ Chiffrage      │──▶│ Planning /     │
 │ unitaire       │   │ projet         │   │ Ordonnancement │
 │ → POTENTIEL EHS│   │ → ventilation  │   │ → étalement    │
 └────────────────┘   │   par grade    │   │   mensuel      │
                      └────────────────┘   └───────┬────────┘
                                                    │
        ┌───────────────────────────────────────────┘
        ▼
 ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
 │ A9.6           │   │ A6.3 / A7.2    │   │ A9.6           │
 │ BUDGET EHS     │◀──│ FT réelles     │──▶│ CRÉDIT EHS     │
 │ mensuel par    │   │ (dépenses      │   │ = Budget       │
 │ employé        │   │  validées)     │   │   − dépenses   │
 └───────┬────────┘   └────────────────┘   └───────┬────────┘
         │                                          │
         ▼                                          ▼
 ┌────────────────────────────────────────────────────────────┐
 │ A5.3 Synthèse EHS équipe  ·  A8.2g Historique EHS employé  │
 │ A2.4 EHS consolidé direction                                │
 └────────────────────────────────────────────────────────────┘
```

### P4 — Cycle de vie d'un projet

```
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ Brouillon│▶│ Planifié │▶│  Actif   │▶│ Suspendu │▶│ Terminé  │▶│ Clôturé  │
 │  A3.2    │ │  A3.2c   │ │A6.x/A7.x │ │  A3.2    │ │  A3.2f   │ │  A2.6    │
 │ Cadrage  │ │ WBS+réf. │ │Exécution │ │ (option) │ │Validation│ │Archivage │
 │ Chiffrage│ │ Budget   │ │ FDT/FT   │ │          │ │ finale   │ │+ rapports│
 └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
   Chef proj.   Planific.    Équipes      Direction    Chef proj.   Direction
```

---

## 13. Récapitulatif des écrans maquettés

| # | Workspace | Écrans maquettés |
|---|-----------|------------------|
| 0 | Shell global | Ossature · Connexion · Notifications · Recherche globale |
| A1 | Administrateur | Dashboard · Utilisateurs (+modal) · Permissions · Référentiels · Paramètres · Import · Audit · Sauvegardes |
| A2 | Direction | Dashboard exécutif · Portefeuille · Validations · Clôtures (+modal) |
| A3 | Chef de projet | Liste projets · Fiche (Général, Chiffrage, Planning, Activités +modal, Budget, Avancement) · Bibliothèque chiffrages |
| A4 | Planificateur | Gantt portefeuille · Capacité/charge · Ordonnancement · Scénarios · Conflits |
| A5 | Manager d'équipe | Pilotage · Composition historisée · EHS équipe · FDT équipe (+modal rejet) · Absences |
| A6 | Opérations | Ma journée · Nouvelle FT · Feuille de temps · Production |
| A7 | Finance | Dashboard · Fiches de trésorerie · Comptes · Budgets · Recettes · RECP · Exports comptables |
| A8 | RH | Liste personnel · Fiche (Général, Versions +modal, Historique EHS) · Équipes |
| A9 | HSE / EHS | Dashboard · Incidents (+formulaire) · Actions kanban · Dispositif EHS (+formule) |
| A10 | Consultation | Dashboards autorisés · Catalogue de rapports |
| M | Mobile | Accueil terrain · Saisie des heures · Déclaration d'incident |
| P | Parcours | FT · Feuille de temps · Chaîne EHS · Cycle de vie projet |

**Total : 45 écrans + 6 modales + 4 parcours.**

---

## 14. Notes de conception à arbitrer

| # | Point | Recommandation |
|---|-------|----------------|
| 1 | Vocabulaire EHS vs HSE | Les deux CDC utilisent « EHS » différemment (dispositif de crédit vs hygiène-sécurité). Recommandation : réserver **EHS** au dispositif de crédit et **HSE** à la sécurité, comme dans ces maquettes. |
| 2 | Matricule versionné | Le versionnement (BO001V1 → V2) doit être visible partout où un employé est référencé, sinon l'historique EHS devient incohérent. |
| 3 | Densité des tableaux | Les vues type « Ordonnancement » (45 colonnes) et « Synth EHS » (15 921 colonnes dans Excel) doivent être **paginées et filtrées côté serveur**, jamais rendues intégralement. |
| 4 | Seuils de validation | Le circuit FT (4 niveaux) doit être paramétrable par montant et par conformité mercuriale — voir A1.5. |
| 5 | Mode hors ligne | Hors périmètre MVP, mais les écrans mobiles M1-M3 devraient bufferiser localement une saisie en cas de coupure réseau. |
| 6 | Accessibilité | Les codes couleur (🔴🟠🟡🟢) doivent toujours être doublés d'un libellé texte (NFR-UX-04). |

---

*Wireframes générés à partir de l'analyse croisée des deux cahiers des charges et des données réelles du classeur `Project_Plan_2026 V2.xlsm`. À valider avant passage en maquettes haute fidélité (Figma) puis en composants React.*
