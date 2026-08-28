from decimal import Decimal

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import FileExtensionValidator
from django.db import models
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
    city = models.CharField(max_length=100)
    address = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    headcount = models.CharField(max_length=20, choices=HEADCOUNT_CHOICES, blank=True)
    # Nombre de niveaux d’organigramme disponibles pour les équipes : au moins les 3 niveaux
    # protégés (Direction, Pilotage, Ressources) + 1 niveau libre pour les équipes créées ensuite.
    team_levels_count = models.PositiveIntegerField(default=4)
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
    niveau 3 = ligne de détail. Le code (A, AA, AA01…) est généré automatiquement à la création,
    voir next_ligne_budgetaire_code."""
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


def next_ligne_budgetaire_code(organisation, parent):
    """A, B, C… pour une ligne de niveau 1 ; AA, AB… pour une sous-ligne de niveau 1 ;
    AA01, AA02… pour une sous-ligne de niveau 2."""
    if parent is None:
        count = LigneBudgetaire.objects.filter(organisation=organisation, niveau=1).count()
        return chr(65 + count)
    siblings = LigneBudgetaire.objects.filter(parent=parent).count()
    if parent.niveau == 1:
        return parent.code + chr(65 + siblings)
    return parent.code + str(siblings + 1).zfill(2)


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


class TaskTemplate(models.Model):
    """Banque de tâches réutilisables (onglet Architecture des tâches) : un simple intitulé, sans
    équipe, ligne budgétaire, heures ni montant. Sert de modèle choisi depuis Attribution staffing
    (voir Task.template) pour éviter de redéfinir le même intitulé de tâche à chaque fois qu'elle
    est attribuée à une équipe différente."""
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='task_templates')
    code = models.CharField(max_length=30)
    nom = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    actif = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
        unique_together = ('organisation', 'code')

    def __str__(self):
        return f'{self.code} — {self.nom}'


def next_task_template_code(organisation):
    count = TaskTemplate.objects.filter(organisation=organisation).count()
    return f'BQ-{str(count + 1).zfill(3)}'


class Task(models.Model):
    """Attribution d'une tâche de la banque (TaskTemplate) à une équipe réelle (dérivée de la
    ligne budgétaire choisie à la création) — c'est cette attribution qui « affecte » la tâche à
    un projet et à un financement. À la création, la tâche revient au manager de l'équipe ;
    `assignee` reste disponible pour que Staffing l'attribue plus tard à un membre précis."""
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='tasks')
    code = models.CharField(max_length=30)
    template = models.ForeignKey(TaskTemplate, on_delete=models.PROTECT, related_name='attributions')
    equipe = models.ForeignKey(Team, on_delete=models.PROTECT, related_name='tasks')
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='taches_assignees')
    project_ligne = models.ForeignKey(ProjectLigne, on_delete=models.PROTECT, related_name='taches')
    heures = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    # « Lancée » : rendue visible dans Nouveau staffing pour le manager de l'équipe, qui décide
    # alors de se l'attribuer ou de l'attribuer à un membre de son équipe.
    lancee = models.BooleanField(default=False)
    lancee_le = models.DateTimeField(null=True, blank=True)
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
