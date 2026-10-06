// Workflows des modules : qui intervient, dans quel ordre, et comment chaque page s'enchaîne.
// Contenu vérifié contre les règles d'accès du backend (accounts/access.py) et les vues de validation.

export type Ton = 'purple' | 'blue' | 'green' | 'orange' | 'teal' | 'gray'

export interface Acteur {
  nom: string
  ton: Ton
  // Qui il est, en une phrase : périmètre et rôle dans la plateforme.
  role: string
  peut: string[]
  interagitAvec: string[]
}

export interface EtapeFlux {
  titre: string
  acteur: string        // nom d'un Acteur de la liste
  page: string          // page où l'étape se passe
  action: string
  resultat: string
}

export interface PageWorkflow {
  intervenants: string[]   // noms d'acteurs
  pasAPas: string[]
}

export interface Workflow {
  acteurs: Acteur[]
  flux: EtapeFlux[]
  // Branche alternative (ex. refus) affichée sous le flux principal.
  alternative?: { titre: string; description: string }
  // Clé : nom exact de la page (voir guidesModules.ts).
  pages: Record<string, PageWorkflow>
}

export const WORKFLOW_TRESORERIE: Workflow = {
  acteurs: [
    {
      nom: 'Direction / Admin', ton: 'purple', role: 'Décide de l’exécution des paiements, crée les comptes et approuve les avances.',
      peut: ['Créer un compte de trésorerie', 'Rapprovisionner un compte', 'Accepter ou refuser une demande de paiement', 'Approuver les avances et les congés'],
      interagitAvec: ['Demandeur (reçoit les demandes soumises)', 'Salarié (approuve ses avances)', 'Système (déclenche le débit)'],
    },
    {
      nom: 'Demandeur', ton: 'blue', role: 'Membre du back-office ou manager qui saisit les demandes de paiement.',
      peut: ['Créer une demande (brouillon ou soumise)', 'Modifier et supprimer ses brouillons', 'Consulter l’historique et le journal'],
      interagitAvec: ['Direction / Admin (soumet la demande)', 'Salarié (reprend le code de son avance)'],
    },
    {
      nom: 'Pilotage / Ressources', ton: 'teal', role: 'Back-office : consulte la trésorerie, le journal et les comptes sans décider des exécutions.',
      peut: ['Consulter ordonnances, comptes, journal et mercuriales', 'Exporter et imprimer les tableaux'],
      interagitAvec: ['Demandeur (suit les demandes)', 'Direction / Admin (vérifie les décisions)'],
    },
    {
      nom: 'Salarié', ton: 'gray', role: 'Demande une avance sur salaire depuis son espace ; ne saisit pas de paiement lui-même.',
      peut: ['Déposer une demande d’avance sur salaire', 'Suivre le statut de sa demande'],
      interagitAvec: ['Direction / Admin (approuve l’avance)', 'Demandeur (la demande de paiement de l’avance est créée à partir du code)'],
    },
    {
      nom: 'Système', ton: 'orange', role: 'Contrôle les soldes, enregistre les mouvements et calcule les soldes.',
      peut: ['Refuser une exécution si le solde est insuffisant', 'Créer la sortie sur le compte à l’exécution', 'Ajouter chaque opération au journal'],
      interagitAvec: ['Direction / Admin (exécution)', 'Comptes et opérations (soldes)', 'Journal (historique)'],
    },
  ],
  flux: [
    { titre: 'Avance approuvée', acteur: 'Direction / Admin', page: 'Gestion des équipes › Demandes', action: 'Approuve la demande d’avance du salarié.', resultat: 'L’avance reçoit un code (ex. AV-2026-001), réutilisable dans la demande de paiement.' },
    { titre: 'Nouvelle demande', acteur: 'Demandeur', page: 'Ordonnances des paiements', action: 'Saisit le type de dépense, le projet, la ligne, le fournisseur, le montant, la date et le compte à débiter.', resultat: 'Demande enregistrée en brouillon, modifiable.' },
    { titre: 'Soumission', acteur: 'Demandeur', page: 'Ordonnances des paiements', action: 'Clique sur « Soumettre la demande » (compte à débiter obligatoire).', resultat: 'Statut « En attente d’exécution ». Elle apparaît dans Exécutions des paiements.' },
    { titre: 'Décision', acteur: 'Direction / Admin', page: 'Exécutions des paiements', action: 'Choisit le mode de paiement (virement, Mobile Money, espèces, chèque) et accepte.', resultat: 'Statut « Exécuté ».' },
    { titre: 'Débit du compte', acteur: 'Système', page: 'Comptes et opérations', action: 'Vérifie le solde du compte choisi puis enregistre la sortie.', resultat: 'Solde du compte diminué ; mouvement « Paiement » créé.' },
    { titre: 'Suivi', acteur: 'Pilotage / Ressources', page: 'Journal de la trésorerie', action: 'Consulte la période, filtre et exporte le journal.', resultat: 'Chaque transaction est visible, avec sa référence PAY- ou MVT-.' },
  ],
  alternative: {
    titre: 'Si la demande est refusée',
    description: 'La Direction refuse la demande avec un commentaire ou un justificatif. Le statut passe à « Refusé », aucune sortie n’est enregistrée et le solde ne bouge pas.',
  },
  pages: {
    'Ordonnances des paiements': {
      intervenants: ['Demandeur', 'Salarié', 'Direction / Admin'],
      pasAPas: [
        'Ouvrez « Nouvelle demande » et choisissez d’abord le Type de dépense (Transversal ou Non Transversal).',
        'Renseignez le Projet et la Ligne budgétaire (désactivés pour une dépense transversale), puis le Fournisseur et le Montant.',
        'Choisissez le Compte à débiter : il doit exister dans Comptes et opérations.',
        'Renseignez la Date de la dépense et l’Objet, joignez le justificatif si besoin.',
        'Enregistrez un brouillon pour continuer plus tard, ou soumettez la demande.',
        'Suivez le brouillon dans la liste, modifiez-le ou supprimez-le ; l’Historique garde les demandes soumises.',
      ],
    },
    'Exécutions des paiements': {
      intervenants: ['Direction / Admin', 'Demandeur', 'Système'],
      pasAPas: [
        'Ouvrez une demande « En attente » : vérifiez le montant, le fournisseur et le justificatif.',
        'Choisissez le mode de paiement.',
        'Accepter : ajoutez éventuellement une preuve ou un commentaire. Le système vérifie le solde puis débite le compte.',
        'Refuser : ajoutez un commentaire ou un justificatif. Aucun débit n’a lieu.',
        'Si le solde est insuffisant, la décision est refusée avec le montant disponible affiché : rapprovisionnez le compte puis recommencez.',
      ],
    },
    'Comptes et opérations': {
      intervenants: ['Direction / Admin', 'Système', 'Pilotage / Ressources'],
      pasAPas: [
        'Créez le compte (Nom, Code unique, Sous-libellé, Solde initial) avant toute demande.',
        'Rapprovisionnez le compte : montant, libellé, origine des fonds et justificatif facultatif. L’entrée apparaît immédiatement.',
        'Sélectionnez la période pour voir les opérations et les totaux de cette période.',
        'Lisez le tableau : une colonne par compte, les sorties en négatif, le solde actuel en pied de tableau.',
      ],
    },
    'Journal de la trésorerie': {
      intervenants: ['Pilotage / Ressources', 'Direction / Admin', 'Système'],
      pasAPas: [
        'Choisissez la période (mois, trimestre, année ou dates libres).',
        'Filtrez par compte, type, initiateur, bénéficiaire ou ordonnateur, ou recherchez une référence.',
        'Cliquez sur le menu d’une ligne pour voir le détail complet de l’opération.',
        'Exportez en PDF, Excel ou CSV, ou imprimez : le fichier reprend les lignes et les totaux affichés.',
      ],
    },
    'Mercuriales': {
      intervenants: ['Direction / Admin', 'Pilotage / Ressources'],
      pasAPas: [
        'Consultez la liste et filtrez par catégorie, sous-catégorie, unité et statut.',
        'Recherchez un code ou une désignation.',
        'Exportez ou imprimez la liste filtrée. La création, l’import et la modification ne sont pas encore disponibles.',
      ],
    },
  },
}

export const WORKFLOW_ARCHITECTURE: Workflow = {
  acteurs: [
    {
      nom: 'Direction / Admin', ton: 'purple', role: 'Valide la structure des lignes budgétaires et des tâches.',
      peut: ['Créer et modifier les lignes budgétaires', 'Créer et modifier les tâches du catalogue', 'Importer depuis Excel'],
      interagitAvec: ['Pilotage (partage la configuration)', 'Gestion des équipes (fournit les équipes)'],
    },
    {
      nom: 'Pilotage', ton: 'blue', role: 'Membre de l’équipe Pilotage : construit le référentiel utilisé par les projets et le staffing.',
      peut: ['Créer et modifier les lignes budgétaires', 'Créer et modifier les tâches du catalogue', 'Consulter l’arbre et les attributions'],
      interagitAvec: ['Staffing (attribue les tâches)', 'Création de projet (consomme les lignes)', 'Direction / Admin (valide)'],
    },
    {
      nom: 'Gestion des équipes', ton: 'green', role: 'Fournit les équipes propriétaires des tâches et des lignes.',
      peut: ['Créer les équipes', 'Affecter les membres'],
      interagitAvec: ['Architecture (chaque tâche et ligne a une équipe)'],
    },
    {
      nom: 'Staffing', ton: 'orange', role: 'Attribue les tâches du catalogue aux équipes.',
      peut: ['Choisir une tâche attribuable', 'Choisir la ligne budgétaire et l’échéance'],
      interagitAvec: ['Architecture (source des tâches)', 'Manager (reçoit l’attribution)'],
    },
  ],
  flux: [
    { titre: 'Équipes en place', acteur: 'Gestion des équipes', page: 'Gestion des équipes', action: 'Crée les équipes et y affecte les membres.', resultat: 'Chaque tâche et chaque ligne peut avoir une équipe propriétaire.' },
    { titre: 'Lignes budgétaires', acteur: 'Pilotage', page: 'Architecture monétaire', action: 'Crée les lignes (code, nom, niveau, parent, équipe, montant prévu) ou importe l’architecture depuis Excel.', resultat: 'Lignes disponibles pour les projets et la trésorerie.' },
    { titre: 'Catalogue des tâches', acteur: 'Pilotage', page: 'Architecture des tâches', action: 'Crée les tâches (parent, équipe, durée, priorité, attribuable, récurrente) ou importe le catalogue.', resultat: 'Tâches attribuables, visibles dans l’arbre.' },
    { titre: 'Validation', acteur: 'Direction / Admin', page: 'Architecture', action: 'Relit l’arbre et les lignes, corrige ou désactive ce qui n’est plus utilisé.', resultat: 'Référentiel validé.' },
    { titre: 'Utilisation', acteur: 'Staffing', page: 'Staffing des équipes', action: 'Attribue les tâches actives aux équipes.', resultat: 'Les tâches entrent dans le cycle de staffing.' },
  ],
  pages: {
    'Architecture des tâches': {
      intervenants: ['Pilotage', 'Direction / Admin', 'Staffing'],
      pasAPas: [
        'Vérifiez que les équipes existent (sinon la page le signale).',
        'Créez une tâche : code, nom, description et explication, niveau et parent, équipe propriétaire.',
        'Renseignez la durée estimée, la priorité par défaut, la fréquence et le mode de déclenchement.',
        'Indiquez si la tâche est Attribuable (utilisable en staffing) et si elle est Récurrente.',
        'Pour un grand catalogue, importez le fichier Excel puis contrôlez l’arbre (Développer / Réduire).',
        'Exportez ou imprimez le catalogue avant de le communiquer.',
      ],
    },
    'Architecture monétaire': {
      intervenants: ['Pilotage', 'Direction / Admin', 'Création de projet'],
      pasAPas: [
        'Créez une ligne de niveau 1, puis ses sous-lignes (parent, niveau 2 ou 3) ; le code est unique.',
        'Renseignez l’équipe responsable et le montant prévu.',
        'Ouvrez le menu « Plus d’actions » pour modifier ou passer une ligne en Inactif.',
        'Filtrez par niveau ou équipe ; réinitialisez pour revenir à la liste complète.',
      ],
    },
  },
}

export const WORKFLOW_GESTION: Workflow = {
  acteurs: [
    {
      nom: 'Ressources', ton: 'green', role: 'Gère les dossiers des salariés : création, documents, affectations.',
      peut: ['Ajouter un employé', 'Modifier la fiche et les documents', 'Affecter une équipe', 'Enregistrer une sanction'],
      interagitAvec: ['Salarié (reçoit le dossier)', 'Direction / Admin (valide le grade)', 'Manager (propose les affectations)'],
    },
    {
      nom: 'Manager', ton: 'orange', role: 'Responsable d’une équipe : suit ses membres et propose les changements.',
      peut: ['Consulter son équipe', 'Demander un changement de grade'],
      interagitAvec: ['Ressources (affectations)', 'Direction / Admin (valide)'],
    },
    {
      nom: 'Direction / Admin', ton: 'purple', role: 'Valide les changements de grade et les demandes de congé ou d’avance.',
      peut: ['Valider ou refuser une demande de changement de grade', 'Approuver congés et avances'],
      interagitAvec: ['Ressources', 'Manager', 'Salarié'],
    },
    {
      nom: 'Salarié', ton: 'gray', role: 'Consulte son dossier, ses documents et ses demandes.',
      peut: ['Consulter son profil', 'Déposer une demande de changement de grade', 'Déposer congés et avances'],
      interagitAvec: ['Ressources (dossier)', 'Direction / Admin (décisions)'],
    },
  ],
  flux: [
    { titre: 'Création du dossier', acteur: 'Ressources', page: 'Employés', action: 'Ajoute l’employé : identité, poste, grade, statut, type de contrat et date d’embauche (obligatoire).', resultat: 'Compte créé, matricule attribué automatiquement.' },
    { titre: 'Affectation', acteur: 'Ressources', page: 'Fiche « Détail employé »', action: 'Affecte l’équipe et complète les informations professionnelles.', resultat: 'Le salarié apparaît dans son équipe et dans l’Organigramme.' },
    { titre: 'Documents', acteur: 'Ressources', page: 'Fiche « Détail employé »', action: 'Téléverse la CNI, le CV, le contrat et les autres pièces.', resultat: 'Dossier complet.' },
    { titre: 'Changement de grade', acteur: 'Manager', page: 'Fiche « Détail employé »', action: 'Demande un changement de grade depuis la fiche de l’employé.', resultat: 'Demande « Envoyée » visible par la Direction.' },
    { titre: 'Décision', acteur: 'Direction / Admin', page: 'Gestion des équipes › Demandes', action: 'Valide ou refuse la demande.', resultat: 'Grade mis à jour et ajouté à l’historique, ou demande refusée.' },
  ],
  alternative: {
    titre: 'Un salarié sans date d’embauche',
    description: 'La date ne peut pas être vidée : un dossier sans date reçoit la date du jour, et les congés sont calculés à partir de là.',
  },
  pages: {
    'Employés': {
      intervenants: ['Ressources', 'Manager', 'Direction / Admin'],
      pasAPas: [
        'Filtrez la liste par équipe, statut ou recherche.',
        'Cliquez sur « Ajouter un employé » (réservé aux Ressources) et renseignez les champs obligatoires.',
        'Ouvrez la fiche pour compléter les informations et les documents.',
        'Exportez la liste filtrée ou imprimez-la en A4.',
      ],
    },
    'Fiche « Détail employé »': {
      intervenants: ['Ressources', 'Manager', 'Direction / Admin', 'Salarié'],
      pasAPas: [
        'Vérifiez les informations générales et professionnelles.',
        'Ajoutez ou consultez les documents officiels.',
        'Accordez une prime ou un ajustement, ou enregistrez une sanction, avec le motif.',
        'Consultez l’historique de grade et des affectations.',
        'Demandez un changement de grade : la Direction le valide ou le refuse.',
      ],
    },
  },
}

export const WORKFLOW_MESSAGERIE: Workflow = {
  acteurs: [
    {
      nom: 'Membre', ton: 'blue', role: 'Tout membre de l’organisation peut écrire à n’importe quel autre membre.',
      peut: ['Rechercher un membre dans l’Annuaire', 'Écrire en tête-à-tête', 'Créer un groupe'],
      interagitAvec: ['Autre membre (conversation directe ou groupe)'],
    },
    {
      nom: 'Groupe', ton: 'teal', role: 'Discussion à plusieurs membres, créée par un membre.',
      peut: ['Recevoir les messages de tous ses membres'],
      interagitAvec: ['Membres du groupe'],
    },
  ],
  flux: [
    { titre: 'Trouver le membre', acteur: 'Membre', page: 'Annuaire', action: 'Recherche le nom de la personne.', resultat: 'Le membre apparaît dans la liste.' },
    { titre: 'Ouvrir la conversation', acteur: 'Membre', page: 'Conversations', action: 'Clique sur le membre.', resultat: 'Le fil de discussion s’ouvre à droite.' },
    { titre: 'Écrire', acteur: 'Membre', page: 'Conversations', action: 'Rédige et envoie le message.', resultat: 'Le destinataire est notifié ; l’indicateur « en train d’écrire » s’affiche.' },
    { titre: 'Répondre', acteur: 'Autre membre', page: 'Conversations', action: 'Ouvre la conversation depuis la cloche de notifications.', resultat: 'La conversation s’ouvre et les messages s’affichent.' },
  ],
  pages: {
    'Conversations': {
      intervenants: ['Membre'],
      pasAPas: [
        'Sélectionnez une conversation dans la liste à gauche.',
        'Écrivez votre message dans le champ en bas, puis envoyez-le.',
        'Sur petit écran, « Retour à la liste » revient aux conversations.',
      ],
    },
    'Annuaire': {
      intervenants: ['Membre'],
      pasAPas: ['Recherchez le nom de la personne.', 'Cliquez pour ouvrir la discussion.'],
    },
    'Nouveau groupe': {
      intervenants: ['Membre', 'Groupe'],
      pasAPas: [
        'Cliquez sur « Nouveau groupe ».',
        'Donnez un nom explicite (ex. « Équipe Projet X ») et sélectionnez les membres.',
        'Validez : le groupe apparaît dans vos conversations. Annuler ne crée rien.',
      ],
    },
  },
}

export const WORKFLOW_STAFFING: Workflow = {
  acteurs: [
    {
      nom: 'Pilotage / Contrôle de gestion', ton: 'blue', role: 'Attribue les tâches du catalogue aux équipes et clôture définitivement les tâches.',
      peut: ['Attribuer une tâche à une équipe', 'Choisir la ligne budgétaire, l’échéance et la priorité', 'Passer une tâche en « Terminée » (verrouillage)'],
      interagitAvec: ['Manager (reçoit l’attribution)', 'Architecture (source des tâches)'],
    },
    {
      nom: 'Manager', ton: 'orange', role: 'Accepte les tâches reçues et répartit le travail de son équipe.',
      peut: ['Accepter ou refuser une tâche', 'Staffer des collaborateurs (y compris en renfort)', 'Valider une tâche en attente'],
      interagitAvec: ['Pilotage (envoie la validation)', 'Employés (répartition)'],
    },
    {
      nom: 'Employé', ton: 'gray', role: 'Exécute sa part de la tâche staffée.',
      peut: ['Démarrer, mettre en pause et reprendre', 'Décliner une tâche', 'Marquer sa part « Terminée »'],
      interagitAvec: ['Manager (répartition)', 'Système (fin automatique)'],
    },
    {
      nom: 'Système', ton: 'teal', role: 'Calcule les statuts automatiques.',
      peut: ['Basculer la tâche « En attente » quand tout le monde a terminé'],
      interagitAvec: ['Manager (action de validation)'],
    },
  ],
  flux: [
    { titre: 'Attribution', acteur: 'Pilotage / Contrôle de gestion', page: 'Staffing des équipes', action: 'Attribue une tâche du catalogue à une équipe avec ligne, échéance et priorité.', resultat: 'La tâche arrive dans « À valider » du manager.' },
    { titre: 'Acceptation et staffing', acteur: 'Manager', page: 'Nouveau staffing', action: 'Accepte la tâche puis répartit le travail entre ses collaborateurs.', resultat: 'Tâche « Prête », puis « En cours ».' },
    { titre: 'Exécution', acteur: 'Employé', page: 'Exécuté staffing', action: 'Démarre, peut mettre en pause, puis marque sa part « Terminée ».', resultat: 'Son avancement est visible par le manager.' },
    { titre: 'Attente de validation', acteur: 'Système', page: 'Suivi des staffings', action: 'Dès que toutes les personnes staffées ont terminé.', resultat: 'Tâche « En attente » (signal, pas une décision).' },
    { titre: 'Validation', acteur: 'Manager', page: 'Suivi des staffings', action: 'Clique « Valider » après avoir contrôlé le travail.', resultat: 'Tâche « En revue », visible au Pilotage.' },
    { titre: 'Clôture', acteur: 'Pilotage / Contrôle de gestion', page: 'Staffing des équipes', action: 'Passe la tâche à « Terminée ».', resultat: 'Statut verrouillé partout dans le système.' },
  ],
  pages: {},
}

export const WORKFLOW_SALARIE: Workflow = {
  acteurs: [
    {
      nom: 'Salarié', ton: 'gray', role: 'Gère ses propres demandes, consulte sa rémunération et son profil.',
      peut: ['Déposer une demande de congé et désigner son délégué', 'Déposer une demande d’avance sur salaire', 'Retirer une demande encore en attente'],
      interagitAvec: ['Délégué (tâches déléguées)', 'Direction / Admin (décision)', 'Trésorerie (avance payée)'],
    },
    {
      nom: 'Délégué', ton: 'green', role: 'Collègue ou manager qui reprend les tâches du salarié pendant son congé.',
      peut: ['Recevoir les tâches déléguées à l’approbation'],
      interagitAvec: ['Salarié (absent)'],
    },
    {
      nom: 'Direction / Admin', ton: 'purple', role: 'Approuve ou refuse les congés et les avances.',
      peut: ['Approuver ou refuser une demande de congé', 'Approuver une avance sur salaire'],
      interagitAvec: ['Salarié', 'Trésorerie (l’avance approuvée devient une demande de paiement)'],
    },
    {
      nom: 'Trésorerie', ton: 'blue', role: 'Exécute le paiement de l’avance approuvée.',
      peut: ['Créer la demande de paiement avec le code de l’avance', 'Décider de l’exécution (Direction)'],
      interagitAvec: ['Direction / Admin', 'Salarié (reçoit le paiement)'],
    },
  ],
  flux: [
    { titre: 'Demande de congé', acteur: 'Salarié', page: 'Demandes › Congés', action: 'Choisit le type, les dates et le délégué.', resultat: 'Demande « En attente ».' },
    { titre: 'Approbation', acteur: 'Direction / Admin', page: 'Gestion des équipes › Demandes', action: 'Approuve ou refuse le congé.', resultat: 'Congé approuvé : le délégué est prévenu et le solde est mis à jour.' },
    { titre: 'Demande d’avance', acteur: 'Salarié', page: 'Demandes › Avances', action: 'Saisit le montant et le nombre de salaires de remboursement (1, 2, 3 ou 6).', resultat: 'Demande « En attente ».' },
    { titre: 'Approbation de l’avance', acteur: 'Direction / Admin', page: 'Gestion des équipes › Demandes', action: 'Approuve l’avance.', resultat: 'L’avance reçoit un code et passe à la trésorerie.' },
    { titre: 'Paiement', acteur: 'Trésorerie', page: 'Ordonnances des paiements', action: 'Crée la demande de paiement avec le code de l’avance, puis elle est exécutée.', resultat: 'Le salarié est payé ; l’opération apparaît dans le journal.' },
  ],
  alternative: {
    titre: 'Demande retirée ou refusée',
    description: 'Tant qu’une demande est « En attente », le salarié peut la retirer. Une fois la décision prise, elle ne peut plus être annulée.',
  },
  pages: {},
}
