// Contenu des guides d'utilisation des modules Architecture, Gestion des équipes, Trésorerie et Messagerie.
// Chaque entrée décrit ce que la page affiche réellement : onglets, boutons, colonnes et règles.

export interface GuidePage {
  nom: string
  acces: string
  description: string
  // Actions visibles, dans l'ordre où l'utilisateur les rencontre.
  actions: string[]
}

export interface GuideModule {
  titre: string
  intro: string
  pages: GuidePage[]
  regles: string[]
  exports: string[]
  astuces: string[]
}

const EXPORT_COMMUN = [
  'Le bouton Exporter propose trois formats : PDF, Excel et CSV.',
  'Le fichier reprend exactement le tableau tel qu’il est affiché : filtres, recherche et période appliqués.',
  'Le PDF et l’Excel sont mis en page pour une feuille A4 en paysage : colonnes ajustées à la largeur de la page, texte qui passe à la ligne, entête répété sur chaque page.',
  'Le CSV est séparé par des points-virgules et encodé en UTF-8 : il s’ouvre directement dans Excel avec les accents.',
  'Le bouton Imprimer ouvre la boîte d’impression du navigateur avec le même rapport que le PDF : titre, période, indicateurs (KPI) puis le tableau. Choisissez « A4 » et « Paysage » dans les options d’impression.',
]

export const GUIDE_ARCHITECTURE: GuideModule = {
  titre: 'Architecture',
  intro: 'La page Architecture contient le référentiel de l’organisation : le catalogue des tâches attribuables aux équipes, et l’architecture monétaire (lignes budgétaires) qui sert à budgéter les projets et les dépenses.',
  pages: [
    {
      nom: 'Architecture des tâches',
      acces: 'Référentiel permanent, disponible pour attribution aux équipes depuis Staffing.',
      description: 'Arbre du catalogue des tâches : chaque élément peut avoir un parent, ce qui crée des niveaux (Niveau 1, 2, …) et des sous-éléments.',
      actions: [
        'Rechercher une tâche ou un code dans la barre de recherche.',
        'Nouvelle tâche : code (ex. PI, A01), nom, description fonctionnelle, explication, niveau, parent (ou « Racine » pour le premier niveau), équipe propriétaire, durée estimée, priorité par défaut, fréquence et mode de déclenchement.',
        'Attribuable : Oui ou Non. Seules les tâches attribuables peuvent être affectées à une équipe depuis Staffing.',
        'Récurrente : Oui ou Non. Une tâche récurrente revient selon sa fréquence.',
        'Actif / Inactif : indique si la tâche est active dans le catalogue.',
        'Ouvrir une tâche pour voir son détail (bloc « Détail de la tâche » : identification, description, durée, fréquence, dernière modification) et ses attributions en cours.',
        'Modifier ou Supprimer une tâche depuis sa fiche. Les boutons Développer, Réduire et Fermer agissent sur l’arbre.',
        'Importer depuis Excel : charge le catalogue complet à partir d’un fichier modèle (bouton « Importer le catalogue des tâches »).',
        'Exporter : PDF, Excel ou CSV du catalogue affiché (code, nom, niveau, parent, équipe, type, attribuable, statut, date de création).',
      ],
    },
    {
      nom: 'Architecture monétaire',
      acces: 'Lignes budgétaires de l’organisation, utilisées par les projets (Création de projet) et par la Trésorerie.',
      description: 'Liste des lignes budgétaires, sur trois niveaux maximum : grande catégorie, poste, ligne de détail.',
      actions: [
        'Rechercher une ligne (« Rechercher une ligne budgétaire… ») ou filtrer par niveau et par équipe (Tous / Toutes).',
        'Colonnes : Code, Ligne budgétaire, Déclinaison, Niveau, Équipe, Montant prévu, Statut (Actif ou Inactif), Actions.',
        'Nouvelle ligne : code (ex. A, AA, AA01), nom (ex. Carburant), niveau, parent, déclinaison (sous-ligne de), équipe responsable et montant prévu (ex. 1 000 000). Le code est unique par organisation.',
        'Le menu « Plus d’actions » de chaque ligne permet de modifier la ligne ou de la passer en Actif / Inactif.',
        'Importer l’architecture monétaire depuis Excel (bouton « Importer l’architecture monétaire »).',
        'Réinitialiser : efface la recherche et les filtres. La pagination permet de parcourir les lignes par page.',
        'Exporter : PDF, Excel ou CSV de la liste affichée (filtres appliqués).',
      ],
    },
  ],
  regles: [
    'Le code d’une ligne budgétaire est unique : une deuxième ligne avec le même code est refusée.',
    'Une équipe doit exister pour créer une tâche ou une ligne : sinon la page affiche « Aucune équipe définie : créez-en une depuis Gestion des équipes ».',
    'Les lignes budgétaires sont celles qui alimentent les demandes de paiement : un projet ne peut consommer que les lignes qui lui sont rattachées.',
  ],
  exports: EXPORT_COMMUN,
  astuces: [
    'Importez le catalogue depuis Excel pour créer beaucoup de tâches d’un coup, puis contrôlez l’arbre avant de l’utiliser dans Staffing.',
    'Utilisez Développer / Réduire pour n’afficher que le niveau utile lorsque le catalogue est long.',
  ],
}

export const GUIDE_GESTION: GuideModule = {
  titre: 'Gestion des équipes',
  intro: 'La page Gestion des équipes regroupe les employés, leurs fiches détaillées, leurs documents, leur rémunération et leur historique. Elle est réservée au Pilotage, aux Ressources, à la Direction et aux managers selon leur périmètre.',
  pages: [
    {
      nom: 'Employés',
      acces: 'Liste de tous les employés de l’organisation, avec recherche et filtres.',
      description: 'Vue d’ensemble des collaborateurs : identité, équipe, rôle, fonction, grade, statut et date d’embauche.',
      actions: [
        'Rechercher un employé et filtrer la liste.',
        'Ajouter un employé : Nom, Prénom, Email professionnel, Poste / Fonction, grade, statut, type de contrat, date d’embauche (obligatoire) et équipe. Un compte créé sans date d’embauche reçoit la date du jour.',
        'Ouvrir la fiche d’un employé pour voir le détail.',
        'Modifier le statut d’un employé depuis sa fiche (Actif, En congé, Inactif).',
        'Exporter : PDF, Excel ou CSV de la liste (ID employé, nom, email, statut, équipe, rôle, fonction, grade, manager, téléphone, matricule, date d’embauche).',
      ],
    },
    {
      nom: 'Fiche « Détail employé »',
      acces: 'Ouverte depuis la liste des employés.',
      description: 'Toutes les informations d’un collaborateur, réparties en onglets et blocs.',
      actions: [
        'Infos générales : identité, photo de profil, e-mail, téléphone, fonction, rôle et équipe.',
        'Informations personnelles : sexe, date de naissance, pays, région, ville.',
        'Informations professionnelles : type de contrat (CDI, CDD, Stage, Alternance, Consultant), temps de travail (dont Temps partiel), date d’embauche, compétences principales et secondaires.',
        'Documents officiels : CNI (JPG ou PNG), CV (PDF), Contrat de travail (PDF) et autre pièce d’identité.',
        'Informations complémentaires : assurance santé, groupe sanguin, contacts d’urgence (nom et téléphone), N° CNPS, N° contribuable, banque et N° de compte bancaire.',
        'Rémunération : Primes / Ajustements avec le bouton « Accorder une prime / un ajustement » (montant, motif, accordée par).',
        'Sanctions : « Enregistrer une sanction » (motif, date, enregistrée par).',
        'Historique : Historique de grade (ancien et nouveau grade, modifié par) et Historique des affectations (affectation actuelle et précédente).',
        'Demander un changement de grade : la demande part en « Demande envoyée » et est traitée par un responsable.',
      ],
    },
    {
      nom: 'Équipes et Organigramme',
      acces: 'Équipes de l’organisation et leur hiérarchie.',
      description: 'Chaque employé appartient à une équipe ; l’Organigramme montre la structure et les rattachements.',
      actions: [
        'Un employé « Non affecté » n’appartient à aucune équipe : affectez-le depuis sa fiche.',
        'Ouvrir l’Organigramme pour voir la structure complète.',
        'Exporter l’Organigramme en PDF, Excel ou CSV (liste des employés, fonction, équipe, matricule, e-mail, téléphone, statut) ; le bouton « Imprimer l’organigramme » imprime le schéma lui-même, mis à l’échelle d’une page A4 paysage.',
      ],
    },
  ],
  regles: [
    'La date d’embauche est obligatoire pour tout employé. Elle ne peut pas être vidée : à défaut, la date du jour est retenue.',
    'Le matricule est attribué automatiquement à la création ; une saisie manuelle est ignorée.',
    'Un changement de grade ou une sanction reste visible dans l’historique de la fiche.',
  ],
  exports: EXPORT_COMMUN,
  astuces: [
    'Filtrez la liste (équipe, statut, recherche) avant d’exporter : le fichier ne contient que les employés affichés.',
    'Renseignez les documents officiels dès l’arrivée du collaborateur pour éviter les relances.',
  ],
}

export const GUIDE_TRESORERIE: GuideModule = {
  titre: 'Trésorerie',
  intro: 'La Trésorerie suit l’argent de l’organisation de la demande de paiement jusqu’au journal : ordonnances, exécutions, comptes, journal et mercuriales. Les pages sont visibles par la Direction, le Pilotage, les Ressources et les managers.',
  pages: [
    {
      nom: 'Ordonnances des paiements',
      acces: 'Toute personne ayant accès à la Trésorerie peut créer une demande.',
      description: 'Création des demandes de paiement, brouillons et historique.',
      actions: [
        'Nouvelle demande : Type de dépense (Transversal ou Non Transversal) en premier, puis Projet et Ligne budgétaire, Fournisseur / Bénéficiaire, Montant, Compte à débiter, Date de la dépense, Objet et commentaires.',
        'Une dépense Transversale n’est rattachée à aucun projet ni ligne budgétaire : les champs sont alors désactivés.',
        'Compte à débiter : obligatoire pour soumettre la demande. La liste affiche le solde de chaque compte.',
        'Justificatif (image ou PDF, 10 Mo maximum) et Code de la demande d’avance (rempli automatiquement quand la demande vient d’une avance sur salaire approuvée).',
        'Enregistrer le brouillon pour reprendre plus tard, ou Soumettre la demande pour l’envoyer à l’exécution.',
        'Brouillons : liste filtrable par dates, projet, ligne budgétaire et recherche ; Modifier ou Supprimer chaque brouillon.',
        'Historique : toutes les demandes soumises, avec leur statut.',
        'Exporter les brouillons : PDF, Excel ou CSV (N° demande, projet, ligne, compte à débiter, bénéficiaire, montant, devise, statut).',
      ],
    },
    {
      nom: 'Exécutions des paiements',
      acces: 'La décision d’exécution est réservée à l’administrateur et au directeur.',
      description: 'Les demandes soumises attendent ici une décision : accepter (et payer) ou refuser.',
      actions: [
        'Filtrer par projet, ligne budgétaire, fournisseur, mode de paiement et dates.',
        'Ouvrir une demande pour voir son détail et son justificatif (téléchargeable).',
        'Accepter : choisir le mode de paiement (Virement bancaire, Mobile Money, Espèces, Chèque), ajouter une preuve d’exécution ou un commentaire, puis valider.',
        'Refuser : indiquer un commentaire ou joindre un justificatif.',
        'Chaque décision acceptée enregistre une sortie sur le compte choisi (voir Comptes et opérations).',
      ],
    },
    {
      nom: 'Comptes et opérations',
      acces: 'Création de compte et rapprovisionnement réservés à l’administrateur et au directeur.',
      description: 'Les comptes de l’organisation (banque, caisse, mobile money) et leur solde.',
      actions: [
        'Nouveau compte : Nom, Code (unique), Sous-libellé et Solde initial.',
        'Rapprovisionner un compte : montant, libellé, origine des fonds (siège, bailleur, client…) et justificatif facultatif. L’entrée apparaît dans le journal.',
        'Solde initial : choisir un compte pour voir son solde d’ouverture.',
        'Tableau des opérations : une colonne par compte, plus Total mouvement. Les montants négatifs (–) sont des sorties.',
        'Filtres : projet, type d’opération, entrée ou sortie, recherche par libellé, bénéficiaire ou initiateur.',
        'Colonnes : afficher ou masquer les colonnes (Justificatif, Initiateur, Exécuteur et chaque compte).',
        'Totaux : total des entrées, total des sorties et solde actuel de chaque compte.',
      ],
    },
    {
      nom: 'Journal de la trésorerie',
      acces: 'Lecture seule de toutes les opérations de la trésorerie.',
      description: 'Enregistrement chronologique de chaque entrée et sortie, y compris les paiements exécutés et les rapprovisionnements.',
      actions: [
        'Choisir la période : Mensuelle (un mois), Trimestrielle (T1 à T4 et une année), Annuelle, ou Date de début et de fin.',
        'Le libellé de la période s’affiche à côté du sélecteur. Les KPI (total entrées, total sorties, total transferts, nombre d’opérations) se calculent sur la période et les filtres.',
        'Filtres : compte, type d’opération (Entrée, Sortie, Transfert), initiateur, bénéficiaire, ordonnateur, référence et mot-clé du libellé.',
        'Colonnes : Date et heure, Référence (PAY- pour un paiement, MVT- pour un rapprovisionnement), Code projet, Libellé, Type, Ordonnateur, Bénéficiaire, Montant, Justificatif, Exécuteur.',
        'Bénéficiaire : pour une entrée, c’est la structure elle-même ; pour une sortie, c’est le fournisseur payé.',
        'Cliquer sur le menu d’une ligne pour voir son détail complet.',
        'Exporter : PDF, Excel ou CSV de la période, avec les KPI et les lignes affichées.',
        'Imprimer : rapport A4 paysage identique au PDF.',
      ],
    },
    {
      nom: 'Mercuriales',
      acces: 'Prix de référence utilisés pour contrôler les dépenses de trésorerie.',
      description: 'Liste des mercuriales (prix de référence) avec leur période de validité.',
      actions: [
        'Nouvelle mercuriale : le bouton est présent mais la saisie n’est pas encore branchée (code, désignation, catégorie, sous-catégorie, unité, prix et date d’effet à venir).',
        'Le bouton Importer est présent mais son traitement n’est pas encore branché : ne comptez pas l’utiliser pour le moment.',
        'Filtrer par catégorie, sous-catégorie, unité et statut ; rechercher par code ou désignation ; trier.',
        'Exporter : PDF, Excel ou CSV de la liste filtrée (code, désignation, catégorie, sous-catégorie, unité, prix, date d’effet, date de fin, statut).',
      ],
    },
  ],
  regles: [
    'Une demande soumise doit avoir un compte à débiter, un projet et une ligne budgétaire (sauf dépense transversale), un fournisseur, un type de dépense, une date et un objet.',
    'Une demande acceptée ne peut être exécutée que si le solde du compte couvre le montant. Sinon la décision est refusée et rien n’est débité.',
    'Un refus n’enregistre aucune sortie.',
    'Une demande soumise avant l’obligation du compte à débiter est repassée en brouillon : elle doit être refaite avec un compte choisi.',
    'Un paiement exécuté ne peut plus être modifié.',
  ],
  exports: EXPORT_COMMUN,
  astuces: [
    'Pour un rapport mensuel, choisissez « Mensuelle » puis le mois, et exportez en PDF : il contient les KPI du mois et toutes les lignes.',
    'Pour comparer deux périodes, exportez-les séparément en Excel et rapprochez les totaux.',
    'Rapprovisionnez le compte avant d’accepter des paiements : sans solde suffisant, l’acceptation est refusée.',
  ],
}

export const GUIDE_MESSAGERIE: GuideModule = {
  titre: 'Messagerie',
  intro: 'La Messagerie permet de discuter avec n’importe quel membre de l’organisation, en tête-à-tête ou en groupe.',
  pages: [
    {
      nom: 'Conversations',
      acces: 'Tous les membres de l’organisation.',
      description: 'Liste de vos discussions, avec les plus récentes en haut.',
      actions: [
        'Cliquer sur une conversation pour l’ouvrir ; le panneau de droite affiche les messages.',
        'Sélectionnez une personne pour commencer à écrire ; un indicateur signale quand votre interlocuteur est en train d’écrire.',
        'Sur petit écran, « Retour à la liste » revient aux conversations.',
      ],
    },
    {
      nom: 'Annuaire',
      acces: 'Tous les membres de l’organisation.',
      description: 'Recherche de n’importe quel membre pour lui écrire.',
      actions: [
        'Rechercher un membre (« Rechercher… ») par nom.',
        'Cliquer sur un membre pour ouvrir la discussion avec lui.',
        'Si aucun membre ne correspond, la page indique « Aucun membre ne correspond à cette recherche ».',
      ],
    },
    {
      nom: 'Nouveau groupe',
      acces: 'Tous les membres de l’organisation.',
      description: 'Discussion à plusieurs membres à la fois.',
      actions: [
        'Bouton « Nouveau groupe » : donnez un nom (ex. « Équipe Projet X ») et ajoutez les membres.',
        'Valider crée le groupe ; Annuler ferme sans rien créer.',
      ],
    },
  ],
  regles: [
    'Les messages non lus sont signalés dans la cloche de notifications.',
  ],
  exports: [
    'La Messagerie ne propose pas d’export ni d’impression : les conversations restent dans l’application.',
  ],
  astuces: [
    'Pour une information d’équipe, créez un groupe nommé d’après le projet : tous les échanges restent au même endroit.',
  ],
}
