from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import FileExtensionValidator
from django.db import models

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


class CongeDemande(models.Model):
    TYPE_CHOICES = [
        ('annuel', 'Congé annuel payé'),
        ('exceptionnel', 'Congé exceptionnel'),
        ('maladie', 'Congé maladie'),
        ('sans_solde', 'Congé sans solde'),
    ]

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conge_demandes')
    type_conge = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date_debut = models.DateField()
    date_fin = models.DateField()
    motif = models.TextField(blank=True)
    statut = models.CharField(max_length=20, choices=DEMANDE_STATUT_CHOICES, default='attente')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    # Le salarié a déclaré reprendre le service avant (ou à) la date de fin prévue.
    cloture = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.employee} : {self.type_conge} ({self.date_debut} → {self.date_fin})'

    @property
    def duree(self):
        """Nombre de jours ouvrés (hors samedis et dimanches) entre date_debut et date_fin, inclus."""
        from datetime import timedelta
        days = (self.date_fin - self.date_debut).days + 1
        full_weeks, remainder = divmod(days, 7)
        total = full_weeks * 5
        for i in range(remainder):
            if (self.date_debut + timedelta(days=full_weeks * 7 + i)).weekday() < 5:
                total += 1
        return total


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
