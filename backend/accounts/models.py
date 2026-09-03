from decimal import Decimal

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import FileExtensionValidator
from django.db import models
from django.db.models import Count
from django.utils import timezone

from .managers import UserManager


class Organisation(models.Model):
    ORG_TYPE_CHOICES = [
        ('personal', 'Personnelle'),
        ('company', 'Entreprise'),
    ]
    HEADCOUNT_CHOICES = [
        ('1-10', '1 à 10'),
        ('11-50', '11 à 50'),
        ('51-250', '51 à 250'),
        ('251-1000', '251 à 1000'),
        ('1000+', 'Plus de 1000'),
    ]

    name = models.CharField(max_length=200)
    org_type = models.CharField(max_length=20, choices=ORG_TYPE_CHOICES)
    sector = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    country = models.CharField(max_length=100)
    # Code ISO 3166-1 alpha-2 du pays (ex. « CM ») — sert au drapeau et à dériver currency_code ;
    # `city` contient en réalité la région/l'état du pays choisi (liste dépendante du pays côté
    # frontend), pas une ville précise.
    country_code = models.CharField(max_length=2, blank=True)
    city = models.CharField(max_length=100)
    # Devise réelle de l'organisation (ISO 4217, ex. « XAF », « EUR »), dérivée du pays choisi à
    # l'inscription — remplace le FCFA autrefois figé dans l'affichage de tous les montants.
    currency_code = models.CharField(max_length=3, default='XAF')
    address = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    headcount = models.CharField(max_length=20, choices=HEADCOUNT_CHOICES, blank=True)
    # Nombre de niveaux d’organigramme disponibles pour les équipes : au moins les 3 niveaux
    # protégés (Direction, Pilotage, Ressources) + 1 niveau libre pour les équipes créées ensuite.
    team_levels_count = models.PositiveIntegerField(default=4)
    # Taux de conversion EHS → FCFA utilisé pour le staffing (Nouveau staffing) : une personne
    # consomme, par heure travaillée, un nombre d'EHS égal à son grade (ex. grade 5 → 5 EHS/h) ;
    # ce taux convertit ces EHS en coût réel, décompté du montant que le projet a attribué à la
    # ligne budgétaire de la tâche (voir TaskAssignment).
    taux_ehs_fcfa = models.DecimalField(max_digits=8, decimal_places=2, default=150)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('admin', 'Administrateur PERLE'),
        ('directeur', 'Directeur'),
        ('salarie', 'Salarié'),
    ]
    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('conge', 'En congé'),
        ('inactif', 'Inactif'),
    ]
    TYPE_CONTRAT_CHOICES = [
        ('cdi', 'CDI'),
        ('cdd', 'CDD'),
        ('stage', 'Stage'),
        ('alternance', 'Alternance'),
        ('consultant', 'Consultant'),
    ]
    PERIODE_ESSAI_CHOICES = [
        ('en_cours', 'En cours'),
        ('terminee', 'Terminée'),
    ]
    TEMPS_TRAVAIL_CHOICES = [
        ('temps_plein', 'Temps plein'),
        ('temps_partiel', 'Temps partiel'),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True)
    fonction = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='directeur')
    organisation = models.ForeignKey(
        Organisation, on_delete=models.PROTECT, related_name='members', null=True, blank=True
    )
    team = models.ForeignKey(
        'Team', on_delete=models.SET_NULL, related_name='team_members', null=True, blank=True
    )
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='actif')
    # Renseigné quand le statut « Congé » a été mis en place automatiquement par une fermeture
    # technique active (et non par une CongeDemande individuelle), pour pouvoir le retirer
    # proprement à la fin de la période sans toucher aux congés « réels » de l'employé.
    conge_technique_source = models.ForeignKey(
        'FermetureTechnique', on_delete=models.SET_NULL, null=True, blank=True, related_name='employes_places_en_conge'
    )
    grade = models.PositiveIntegerField(default=0)
    matricule = models.CharField(max_length=50, blank=True)
    date_naissance = models.DateField(null=True, blank=True)
    pays = models.CharField(max_length=100, blank=True)
    pays_code = models.CharField(max_length=2, blank=True)
    # Contient en réalité la région/l'état du pays choisi, pas une ville précise (voir
    # Organisation.city).
    ville = models.CharField(max_length=100, blank=True)
    profile_photo = models.ImageField(upload_to='documents/photos/', null=True, blank=True)
    cni_document = models.ImageField(upload_to='documents/cni/', null=True, blank=True)
    autre_piece_document = models.ImageField(upload_to='documents/autres/', null=True, blank=True)
    cv_document = models.FileField(
        upload_to='documents/cv/', null=True, blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])],
    )
    contrat_document = models.FileField(
        upload_to='documents/contrats/', null=True, blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])],
    )

    # Informations professionnelles
    date_embauche = models.DateField(null=True, blank=True)
    type_contrat = models.CharField(max_length=20, choices=TYPE_CONTRAT_CHOICES, blank=True)
    periode_essai = models.CharField(max_length=20, choices=PERIODE_ESSAI_CHOICES, blank=True)
    temps_travail = models.CharField(max_length=20, choices=TEMPS_TRAVAIL_CHOICES, blank=True)
    competences_principales = models.CharField(max_length=500, blank=True)
    competences_secondaires = models.CharField(max_length=500, blank=True)

    # Autres informations
    cnps = models.CharField(max_length=50, blank=True)
    contribuable = models.CharField(max_length=50, blank=True)
    banque = models.CharField(max_length=150, blank=True)
    compte_bancaire = models.CharField(max_length=100, blank=True)
    groupe_sanguin = models.CharField(max_length=10, blank=True)
    contact_urgence_nom = models.CharField(max_length=150, blank=True)
    contact_urgence_telephone = models.CharField(max_length=30, blank=True)
    assurance_sante = models.CharField(max_length=150, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    # Mis à jour par un battement de cœur léger envoyé par le frontend toutes les ~30 secondes
    # (voir HeartbeatView) tant que la session est active — sert uniquement au statut « en ligne »
    # de la Messagerie (voir UserSummarySerializer.get_is_online) : une personne est considérée en
    # ligne si ce champ date de moins de ONLINE_THRESHOLD_SECONDS.
    last_seen_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email

    def anciennete(self):
        """Durée écoulée depuis la date d'embauche, formatée en années/mois/jours."""
        if not self.date_embauche:
            return None
        from datetime import date
        today = date.today()
        start = self.date_embauche
        if start > today:
            return None
        years = today.year - start.year
        months = today.month - start.month
        days = today.day - start.day
        if days < 0:
            months -= 1
            previous_month = today.month - 1 or 12
            previous_month_year = today.year if today.month > 1 else today.year - 1
            days_in_previous_month = (date(previous_month_year, previous_month % 12 + 1, 1) - date(previous_month_year, previous_month, 1)).days
            days += days_in_previous_month
        if months < 0:
            years -= 1
            months += 12
        parts = []
        if years: parts.append(f"{years} an{'s' if years > 1 else ''}")
        if months: parts.append(f"{months} mois")
        if days or not parts: parts.append(f"{days} jour{'s' if days > 1 else ''}")
        return ', '.join(parts[:-1]) + (' et ' + parts[-1] if len(parts) > 1 else parts[0])

    def move_to_team(self, team, changed_by=None):
        """Reassign this user's team, clearing them as manager of any team they're leaving, and log the change."""
        previous_team = self.team
        if (previous_team.id if previous_team else None) == (team.id if team else None):
            return
        if previous_team and previous_team.manager_id == self.id and previous_team != team:
            previous_team.manager = None
            previous_team.save(update_fields=['manager'])
        self.team = team
        self.save(update_fields=['team'])
        AffectationHistory.objects.create(
            employee=self, ancienne_equipe=previous_team, nouvelle_equipe=team, changed_by=changed_by,
        )

    def change_grade(self, new_grade, changed_by=None):
        """Update this user's grade and log the change."""
        if self.grade == new_grade:
            return
        ancien_grade = self.grade
        self.grade = new_grade
        self.save(update_fields=['grade'])
        GradeHistory.objects.create(
            employee=self, ancien_grade=ancien_grade, nouveau_grade=new_grade, changed_by=changed_by,
        )


class Team(models.Model):
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='teams')
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=150)
    manager = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name='teams_managed', null=True, blank=True
    )
    # Le niveau détermine la ligne de l’équipe dans l’organigramme (1 = le plus haut).
    niveau = models.PositiveIntegerField(default=4)
    # Équipe de direction (hiérarchie) : plusieurs équipes peuvent avoir la même équipe parente,
    # qui apparaît alors comme leur sous-équipe sur l’organigramme. Indépendant du niveau — une
    # équipe sans parent reste une racine affichée sur sa ligne de niveau comme aujourd’hui.
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, related_name='sous_equipes', null=True, blank=True
    )
    is_protected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('organisation', 'code')
        ordering = ['code']

    def __str__(self):
        return f'{self.code} — {self.name}'


DEFAULT_TEAMS = (
    ('DG', 'Direction Générale'),
    ('PIL', 'Pilotage'),
    ('RES', 'Ressources'),
)


def create_default_teams(organisation, dg_user):
    """Seed the 3 protected default teams on their own levels (Direction Générale=1,
    Pilotage=2, Ressources=3) for a newly created organisation, and make dg_user the DG
    (manager of Direction Générale)."""
    direction = None
    for niveau, (code, name) in enumerate(DEFAULT_TEAMS, start=1):
        team = Team.objects.create(
            organisation=organisation, code=code, name=name, niveau=niveau, is_protected=True,
        )
        if direction is None:
            direction = team
    direction.manager = dg_user
    direction.save(update_fields=['manager'])
    dg_user.team = direction
    dg_user.save(update_fields=['team'])


class GradeHistory(models.Model):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grade_history')
    ancien_grade = models.PositiveIntegerField(null=True, blank=True)
    nouveau_grade = models.PositiveIntegerField()
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f'{self.employee} : G{self.ancien_grade} → G{self.nouveau_grade}'


class AffectationHistory(models.Model):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='affectation_history')
    ancienne_equipe = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    nouvelle_equipe = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['-changed_at']
        verbose_name_plural = 'Affectation histories'

    def __str__(self):
        return f'{self.employee} : {self.ancienne_equipe} → {self.nouvelle_equipe}'


DEMANDE_STATUT_CHOICES = [
    ('attente', 'En attente'),
    ('approuvee', 'Approuvée'),
    ('refusee', 'Refusée'),
]


class CongeType(models.Model):
    """Politique de congé configurable par l'organisation : nom, quota de jours ouvrables
    (par mois ou par année), et qui choisit la période (le salarié ou l'entreprise).

    Deux catégories spéciales existent en plus des types « standard » créés librement par
    l'admin : « maladie » et « technique ». Elles sont amorcées automatiquement pour chaque
    organisation (voir create_default_conge_types) et ne peuvent pas être recréées depuis le
    formulaire normal — seule la catégorie « standard » l'est."""
    UNITE_CHOICES = [
        ('mois', 'Par mois'),
        ('annee', 'Par année'),
    ]
    MODE_PERIODE_CHOICES = [
        ('employe', 'Le salarié choisit la période'),
        ('entreprise', "L'entreprise définit la période"),
    ]
    CATEGORIE_CHOICES = [
        ('standard', 'Standard'),
        ('maladie', 'Congé maladie'),
        ('technique', 'Congé technique'),
    ]

    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='conge_types')
    nom = models.CharField(max_length=100)
    categorie = models.CharField(max_length=10, choices=CATEGORIE_CHOICES, default='standard')
    description = models.CharField(max_length=255, blank=True)
    # Sans objet pour la catégorie « technique » (aucun quota) ; sans quota non plus pour
    # « maladie ». Nul dans ces deux cas.
    jours_alloues = models.PositiveIntegerField(null=True, blank=True)
    unite = models.CharField(max_length=10, choices=UNITE_CHOICES, null=True, blank=True)
    mode_periode = models.CharField(max_length=20, choices=MODE_PERIODE_CHOICES, null=True, blank=True)
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
        unique_together = ('organisation', 'nom')

    def __str__(self):
        return f'{self.nom} ({self.organisation})'


class PublicHoliday(models.Model):
    """Jour férié propre au pays de l'organisation. La majorité sont importés automatiquement
    (source='auto') via le package `holidays`, à partir du country_code de l'organisation —
    voir accounts.holidays_utils.sync_public_holidays. L'admin/directeur peut aussi en ajouter,
    modifier ou supprimer manuellement (source='manuel'), y compris pour ajuster/retirer un jour
    importé automatiquement."""
    SOURCE_AUTO = 'auto'
    SOURCE_MANUEL = 'manuel'
    SOURCE_CHOICES = [(SOURCE_AUTO, 'Automatique'), (SOURCE_MANUEL, 'Manuel')]

    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='public_holidays')
    nom = models.CharField(max_length=150)
    date = models.DateField()
    recurrente_annuelle = models.BooleanField(default=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default=SOURCE_MANUEL)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']
        unique_together = ('organisation', 'date', 'nom')

    def __str__(self):
        return f'{self.nom} — {self.date}'


DEFAULT_CONGE_TYPES = (
    (
        'Congé annuel payé', 'standard', 2, 'mois', 'employe',
        '',
    ),
    (
        'Congé maladie', 'maladie', None, None, None,
        "Pas de quota. Le salarié indique uniquement une date de début : le congé reste "
        "ouvert jusqu'à ce qu'il déclare sa reprise du travail, qui en fixe alors la fin.",
    ),
    (
        'Congé Technique', 'technique', None, None, None,
        "Fermeture collective configurée depuis Demandes > Congé Technique (période et "
        "exceptions par équipe ou par salarié). N'apparaît pas dans le formulaire de demande "
        "et ne consomme aucun quota personnel.",
    ),
)


def create_default_conge_types(organisation):
    """Amorce les types de congé de base (standard, maladie, technique) pour qu'une nouvelle
    organisation ne parte pas avec un formulaire de demande vide ; l'admin peut ensuite ajouter
    des types standard depuis Paramètres. get_or_create ne touche jamais une ligne déjà
    existante : si l'admin a déjà personnalisé un type portant l'un de ces noms, il n'est pas
    écrasé — ceci permet aussi de « rattraper » les organisations existantes sans risque."""
    for nom, categorie, jours, unite, mode, description in DEFAULT_CONGE_TYPES:
        CongeType.objects.get_or_create(
            organisation=organisation, nom=nom,
            defaults={
                'categorie': categorie, 'jours_alloues': jours, 'unite': unite,
                'mode_periode': mode, 'description': description,
            },
        )


class CongeDemande(models.Model):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conge_demandes')
    type_conge = models.ForeignKey(CongeType, on_delete=models.PROTECT, related_name='demandes')
    # Non renseignées tant que le type est « défini par l'entreprise » : c'est alors l'admin
    # qui les saisit au moment de l'approbation.
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    motif = models.TextField(blank=True)
    statut = models.CharField(max_length=20, choices=DEMANDE_STATUT_CHOICES, default='attente')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    # Le salarié a déclaré reprendre le service avant (ou à) la date de fin prévue — c'est aussi
    # le mécanisme utilisé pour clore un congé maladie (date_fin nulle jusque-là).
    cloture = models.BooleanField(default=False)
    # Demi-journées : réservé aux types « standard » (ex. 2,5 jours au lieu de 3).
    demi_journee_debut = models.BooleanField(default=False)
    demi_journee_fin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee} : {self.type_conge} ({self.date_debut} → {self.date_fin})'

    @property
    def duree(self):
        """Nombre de jours ouvrés (hors samedis et dimanches) entre date_debut et date_fin, inclus,
        avec prise en compte des demi-journées de départ/retour. 0 tant que date_debut n'est pas
        renseignée. Pour un congé maladie encore ouvert (date_fin nulle), compte jusqu'à
        aujourd'hui, à titre indicatif tant que la reprise n'est pas déclarée."""
        if not self.date_debut:
            return 0
        from datetime import timedelta
        end = self.date_fin
        if not end:
            end = timezone.localdate()
            if end < self.date_debut:
                return 0
        days = (end - self.date_debut).days + 1
        full_weeks, remainder = divmod(days, 7)
        total = full_weeks * 5
        for i in range(remainder):
            if (self.date_debut + timedelta(days=full_weeks * 7 + i)).weekday() < 5:
                total += 1
        if total <= 0:
            return total
        deduction = 0
        if self.demi_journee_debut and self.date_debut.weekday() < 5:
            deduction += 0.5
        if self.date_fin and self.demi_journee_fin and self.date_fin.weekday() < 5 and self.date_fin != self.date_debut:
            deduction += 0.5
        return max(0, total - deduction)


class AvanceDemande(models.Model):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='avance_demandes')
    montant = models.PositiveIntegerField()
    motif = models.TextField(blank=True)
    nombre_mois = models.PositiveIntegerField(default=1)
    statut = models.CharField(max_length=20, choices=DEMANDE_STATUT_CHOICES, default='attente')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee} : {self.montant} FCFA'


class FermetureTechnique(models.Model):
    """Période de fermeture technique définie par l'entreprise (congé technique) : une simple
    annonce de période avec exceptions par équipe et/ou par salarié, configurée depuis
    Demandes > Congé Technique. Ne crée aucune CongeDemande individuelle, mais met bien les
    employés couverts (hors exceptions) en statut « Congé » pendant la période — voir
    apply_fermetures_techniques et User.conge_technique_source."""
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='fermetures_techniques')
    date_debut = models.DateField()
    date_fin = models.DateField()
    description = models.CharField(max_length=255, blank=True)
    equipes_exceptees = models.ManyToManyField(Team, blank=True, related_name='+')
    employes_exceptes = models.ManyToManyField(User, blank=True, related_name='+')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_debut']

    def __str__(self):
        return f'Fermeture technique {self.date_debut} → {self.date_fin} ({self.organisation})'


class LigneBudgetaire(models.Model):
    """Référentiel des lignes budgétaires (Architecture monétaire), organisé en arborescence sur
    3 niveaux maximum : niveau 1 = grande catégorie (ex. RENTREES FINANCIERES), niveau 2 = poste,
    niveau 3 = ligne de détail. Le code est saisi librement par l'utilisateur à la création
    (unique par organisation) — voir LigneBudgetaireCreateSerializer."""
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='lignes_budgetaires')
    code = models.CharField(max_length=20)
    nom = models.CharField(max_length=200)
    niveau = models.PositiveSmallIntegerField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='enfants')
    equipe = models.ForeignKey(Team, on_delete=models.PROTECT, related_name='lignes_budgetaires')
    declinaison = models.CharField(max_length=255, blank=True)
    # Plafond consommable par un projet donné sur cette ligne (voir ProjectLigne) — vide = pas de
    # plafond. Ce n'est pas un budget global partagé entre projets : chaque projet peut, chacun de
    # son côté, attribuer jusqu'à ce montant sur la ligne.
    montant_prevu = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']
        unique_together = ('organisation', 'code')

    def __str__(self):
        return f'{self.code} — {self.nom}'


class Project(models.Model):
    """Un projet créé depuis Création de projet : informations générales + budget, plus ses
    lignes budgétaires/tâches (voir ProjectLigne). « brouillon » et « définitif » sont le même
    enregistrement, distingué uniquement par le statut — les onglets Brouillon/Historique de la
    page ne sont qu'un filtre sur ce statut."""
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('definitif', 'Définitif'),
    ]
    TYPE_MONTANT_CHOICES = [
        ('HT', 'HT'),
        ('TTC', 'TTC'),
    ]

    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='projects')
    code = models.CharField(max_length=30)
    nom = models.CharField(max_length=255)
    client = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    montant = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    type_montant = models.CharField(max_length=5, choices=TYPE_MONTANT_CHOICES, default='HT')
    marge_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    charges_transversales_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tva_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    ir_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    reserve_montant = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='brouillon')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ('organisation', 'code')

    def __str__(self):
        return f'{self.code} — {self.nom}'

    @property
    def montant_marge(self):
        return (self.montant * self.marge_pct / 100).quantize(Decimal('0.01'))

    @property
    def montant_charges(self):
        return (self.montant * self.charges_transversales_pct / 100).quantize(Decimal('0.01'))

    @property
    def montant_tva(self):
        return (self.montant * self.tva_pct / 100).quantize(Decimal('0.01'))

    @property
    def montant_ir(self):
        return (self.montant * self.ir_pct / 100).quantize(Decimal('0.01'))

    @property
    def budget_execution(self):
        return self.montant - self.montant_marge - self.montant_charges


def next_project_code(organisation):
    """PRJ-<année>-<numéro séquentiel dans l'organisation pour cette année>."""
    year = timezone.localdate().year
    prefix = f'PRJ-{year}-'
    count = Project.objects.filter(organisation=organisation, code__startswith=prefix).count()
    return f'{prefix}{str(count + 1).zfill(3)}'


class ProjectLigne(models.Model):
    """Attribution d'une ligne budgétaire réelle (Architecture monétaire, tout niveau confondu) à
    un projet : combien d'argent ce projet va consommer sur cette ligne. Le montant est plafonné
    par LigneBudgetaire.montant_prevu, propre à chaque projet (pas un pot partagé entre projets) —
    voir ProjectLigneSerializer.validate."""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='lignes')
    code = models.CharField(max_length=20)
    ligne_budgetaire = models.ForeignKey(LigneBudgetaire, on_delete=models.PROTECT, related_name='project_lignes')
    montant = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']
        unique_together = [('project', 'code'), ('project', 'ligne_budgetaire')]

    def __str__(self):
        return f'{self.code} — {self.ligne_budgetaire.nom}'


def next_project_ligne_code(project):
    return f'PRJ.{str(project.lignes.count() + 1).zfill(3)}'


TASK_PRIORITE_CHOICES = [
    ('haute', 'Haute'),
    ('moyenne', 'Moyenne'),
    ('basse', 'Basse'),
]

# Type de pièce jointe d'un message (TaskMessage ou DirectMessage) — dérivé côté serveur du
# content-type du fichier envoyé (voir validate_attachment dans les serializers), jamais fourni
# tel quel par le client.
MESSAGE_ATTACHMENT_TYPE_CHOICES = [
    ('image', 'Image'),
    ('video', 'Vidéo'),
    ('audio', 'Audio'),
    ('fichier', 'Fichier'),
]


class TaskTemplate(models.Model):
    """Catalogue des tâches (onglet Catalogue des tâches) : arborescence libre (dossiers puis
    tâches élémentaires en feuilles). Le premier niveau (racine, sans parent) représente une
    équipe réelle de l'organisation (`equipe`) ; les niveaux suivants héritent automatiquement de
    l'équipe de leur racine. Tout élément actif du catalogue — dossier ou tâche élémentaire, à
    n'importe quel niveau — peut être choisi depuis Attribution des tâches (voir Task.template),
    pour éviter de redéfinir le même intitulé à chaque équipe ; `type_element`/`attribuable`
    restent des métadonnées, sans effet sur cette sélection. Le code est saisi manuellement (pas
    d'auto-génération) : voir TaskTemplateSerializer.validate_code."""
    TYPE_CHOICES = [
        ('dossier', 'Dossier'),
        ('tache_elementaire', 'Tâche élémentaire'),
    ]
    FREQUENCE_CHOICES = [
        ('ponctuelle', 'Ponctuelle'),
        ('recurrente', 'Récurrente'),
    ]
    DECLENCHEMENT_CHOICES = [
        ('manuel', 'Manuel'),
        ('automatique', 'Automatique'),
    ]

    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='task_templates')
    code = models.CharField(max_length=30)
    nom = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='enfants')
    niveau = models.PositiveSmallIntegerField(default=1)
    equipe = models.ForeignKey(Team, on_delete=models.PROTECT, null=True, blank=True, related_name='task_templates')
    type_element = models.CharField(max_length=20, choices=TYPE_CHOICES, default='dossier')
    attribuable = models.BooleanField(default=True)
    recurrente = models.BooleanField(default=False)
    details = models.TextField(blank=True)
    explication = models.TextField(blank=True)
    frequence = models.CharField(max_length=20, choices=FREQUENCE_CHOICES, default='ponctuelle')
    mode_declenchement = models.CharField(max_length=20, choices=DECLENCHEMENT_CHOICES, default='manuel')
    priorite_defaut = models.CharField(max_length=10, choices=TASK_PRIORITE_CHOICES, default='moyenne')
    duree_estimee_heures = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    actif = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        unique_together = ('organisation', 'code')

    def __str__(self):
        return f'{self.code} — {self.nom}'


class Task(models.Model):
    """Attribution d'une tâche de la banque (TaskTemplate) à une équipe réelle. La ligne
    budgétaire est choisie directement (dérive l'équipe destinataire) ; le projet est facultatif
    — une tâche « transversale » n'en a aucun. À la création la tâche est envoyée au manager de
    l'équipe, qui doit explicitement l'Accepter ou la Refuser (statut) avant qu'elle apparaisse
    dans Nouveau staffing pour être répartie (voir TaskAssignment) entre lui-même et/ou des
    membres de son équipe, chacun avec ses propres heures."""
    PRIORITE_CHOICES = TASK_PRIORITE_CHOICES
    STATUT_CHOICES = [
        ('envoyee', 'Envoyée'),
        ('acceptee', 'Acceptée'),
        ('refusee', 'Refusée'),
    ]
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='tasks')
    code = models.CharField(max_length=30)
    template = models.ForeignKey(TaskTemplate, on_delete=models.PROTECT, related_name='attributions')
    description = models.TextField(blank=True)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    ligne_budgetaire = models.ForeignKey(LigneBudgetaire, on_delete=models.PROTECT, related_name='taches')
    equipe = models.ForeignKey(Team, on_delete=models.PROTECT, related_name='tasks')
    echeance = models.DateField(null=True, blank=True)
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='moyenne')
    # Circuit de validation par le manager de l'équipe destinataire, avant staffing.
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='envoyee')
    statut_decide_le = models.DateTimeField(null=True, blank=True)
    actif = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('organisation', 'code')

    def __str__(self):
        return f'{self.code} — {self.template.nom}'


def next_task_code(organisation):
    year = timezone.localdate().year
    prefix = f'TSK-{year}-'
    count = Task.objects.filter(organisation=organisation, code__startswith=prefix).count()
    return f'{prefix}{str(count + 1).zfill(3)}'


class TaskAssignment(models.Model):
    """Une personne staffée sur une tâche (Nouveau staffing), avec ses propres heures — une
    tâche peut être répartie entre plusieurs personnes, chacune avec sa propre exécution
    (À démarrer/En cours/En pause/Terminée, voir TaskAssignmentExecutionView). La consommation en
    EHS (grade de la personne × heures) et son équivalent FCFA (× Organisation.taux_ehs_fcfa) sont
    figés au moment de l'attribution : un changement de grade ou de taux plus tard ne doit pas
    modifier rétroactivement des attributions déjà faites. Décliner (voir la vue d'exécution)
    supprime l'attribution, ce qui libère le montant consommé sur la ligne budgétaire du projet."""
    EXECUTION_STATUT_CHOICES = [
        ('a_demarrer', 'À démarrer'),
        ('en_cours', 'En cours'),
        ('en_pause', 'En pause'),
        ('terminee', 'Terminée'),
    ]
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='task_assignments')
    heures = models.DecimalField(max_digits=6, decimal_places=2)
    grade_snapshot = models.PositiveIntegerField()
    taux_snapshot = models.DecimalField(max_digits=8, decimal_places=2)
    ehs_consomme = models.DecimalField(max_digits=10, decimal_places=2)
    montant_fcfa = models.DecimalField(max_digits=14, decimal_places=2)
    execution_statut = models.CharField(max_length=12, choices=EXECUTION_STATUT_CHOICES, default='a_demarrer')
    # `demarree_le` marque le début du segment actif en cours (réinitialisé à chaque reprise, pas
    # seulement au tout premier démarrage) ; `temps_travaille_secondes` cumule les segments déjà
    # clos (figé à chaque pause/fin) — le temps réellement travaillé « live » pendant l'exécution
    # est donc `temps_travaille_secondes + (maintenant - demarree_le)`. Voir
    # TaskAssignmentExecutionView, qui est seul responsable de ces deux champs.
    demarree_le = models.DateTimeField(null=True, blank=True)
    terminee_le = models.DateTimeField(null=True, blank=True)
    temps_travaille_secondes = models.PositiveIntegerField(default=0)
    # Évaluation de la personne staffée par son manager (Suivi des staffings), possible seulement
    # une fois la tâche terminée — alimente l'onglet Notes & Performance.
    note = models.PositiveSmallIntegerField(null=True, blank=True)
    note_commentaire = models.TextField(blank=True)
    notee_le = models.DateTimeField(null=True, blank=True)
    notee_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('task', 'user')

    def __str__(self):
        return f'{self.task.code} — {self.user.email} ({self.heures} h)'


class TaskMessage(models.Model):
    """Un message dans l'espace de discussion d'une tâche (Task) — un seul fil PAR TÂCHE, partagé
    par toutes les personnes qui y sont engagées : le manager qui l'a créée/attribuée et tous les
    salariés qui y sont staffés (TaskAssignment), même si une tâche est répartie entre plusieurs
    personnes. Voir _can_access_task_messages dans les vues pour qui peut lire/écrire. Peut porter
    une pièce jointe (image, vidéo ou note vocale) en plus ou à la place d'un texte. Modifiable ou
    supprimable seulement par son auteur (voir TaskMessageDetailView)."""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='messages')
    auteur = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    contenu = models.TextField(blank=True)
    attachment = models.FileField(upload_to='task_messages/%Y/%m/', null=True, blank=True)
    attachment_type = models.CharField(max_length=10, choices=MESSAGE_ATTACHMENT_TYPE_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.task.code} — {self.auteur.email if self.auteur else "?"} @ {self.created_at:%Y-%m-%d %H:%M}'


class TaskMessageRead(models.Model):
    """Marque de dernière lecture du fil de discussion d'une tâche par un utilisateur — évite de
    stocker un état lu/non-lu par message : le voyant « non lu » compare juste created_at du
    dernier message à last_read_at (voir la vue TaskMessageUnreadCounts)."""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='message_reads')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='+')
    last_read_at = models.DateTimeField()

    class Meta:
        unique_together = ('task', 'user')


class Conversation(models.Model):
    """Conversation directe entre membres de la même organisation (page Messagerie) — 1:1 ou
    groupe (`is_group`). Un 1:1 n'a pas de nom (`nom` vide, l'interface affiche le nom de l'autre
    participant, voir ConversationSerializer.get_display_nom) ; un groupe en a un, choisi à la
    création. Toujours créée via get_or_create_conversation (1:1) ou create_group_conversation
    (groupe), jamais directement, pour garantir qu'on ne duplique pas une conversation 1:1
    existante entre les deux mêmes personnes."""
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='conversations')
    participants = models.ManyToManyField(User, related_name='conversations')
    is_group = models.BooleanField(default=False)
    nom = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.nom if self.is_group else f'conversation#{self.pk}'

    def other_participant(self, user):
        """Pour un 1:1 uniquement — l'autre personne de la conversation."""
        return self.participants.exclude(id=user.id).first()


def get_or_create_conversation(organisation, user_a, user_b):
    """Point d'entrée unique pour obtenir la conversation 1:1 entre deux membres — ne crée jamais
    deux fois la même paire, peu importe qui démarre la discussion en premier (une recherche par
    ensemble de participants, pas par ordre, puisque Conversation n'a plus de colonnes dédiées
    participant_1/participant_2 depuis l'ajout des groupes)."""
    existing = (
        Conversation.objects.filter(organisation=organisation, is_group=False, participants=user_a)
        .filter(participants=user_b)
        .annotate(nb_participants=Count('participants'))
        .filter(nb_participants=2)
        .first()
    )
    if existing:
        return existing
    conversation = Conversation.objects.create(organisation=organisation, is_group=False, created_by=user_a)
    conversation.participants.set([user_a, user_b])
    return conversation


def create_group_conversation(organisation, creator, nom, members):
    """Crée une discussion de groupe — `members` doit inclure le créateur (voir
    ConversationGroupCreateView), sans quoi il ne verrait pas sa propre conversation."""
    conversation = Conversation.objects.create(organisation=organisation, is_group=True, nom=nom, created_by=creator)
    conversation.participants.set(members)
    return conversation


class DirectMessage(models.Model):
    """Un message dans une conversation directe (Conversation) — texte et/ou pièce jointe (image,
    vidéo, note vocale). Modifiable ou supprimable seulement par son auteur (voir
    DirectMessageDetailView)."""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    auteur = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')
    contenu = models.TextField(blank=True)
    attachment = models.FileField(upload_to='direct_messages/%Y/%m/', null=True, blank=True)
    attachment_type = models.CharField(max_length=10, choices=MESSAGE_ATTACHMENT_TYPE_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'conv#{self.conversation_id} — {self.auteur.email if self.auteur else "?"} @ {self.created_at:%Y-%m-%d %H:%M}'


class ConversationRead(models.Model):
    """Marque de dernière lecture d'une conversation par un utilisateur — même principe que
    TaskMessageRead, pour le voyant « non lu » de la page Messagerie."""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='reads')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='+')
    last_read_at = models.DateTimeField()

    class Meta:
        unique_together = ('conversation', 'user')


class TypingStatus(models.Model):
    """Signal éphémère « X est en train d'écrire » sur un fil de tâche ou une conversation —
    écrasé à chaque frappe (throttlé côté frontend, voir MessageComposer), lu par les autres
    participants avec un TTL de quelques secondes appliqué dans la vue (voir TYPING_TTL_SECONDS) :
    pas de tâche de nettoyage, une ligne plus vieille que le TTL est simplement ignorée à la
    lecture puis écrasée à la prochaine frappe de son auteur."""
    SCOPE_TASK = 'task'
    SCOPE_CONVERSATION = 'conversation'
    SCOPE_CHOICES = [(SCOPE_TASK, 'Tâche'), (SCOPE_CONVERSATION, 'Conversation')]
    scope = models.CharField(max_length=12, choices=SCOPE_CHOICES)
    scope_id = models.PositiveIntegerField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('scope', 'scope_id', 'user')
