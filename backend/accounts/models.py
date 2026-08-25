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
    departement = models.CharField(max_length=150, blank=True)
    responsable_hierarchique = models.CharField(max_length=150, blank=True)
    date_embauche = models.DateField(null=True, blank=True)
    type_contrat = models.CharField(max_length=20, choices=TYPE_CONTRAT_CHOICES, blank=True)
    periode_essai = models.CharField(max_length=20, choices=PERIODE_ESSAI_CHOICES, blank=True)
    lieu_travail = models.CharField(max_length=150, blank=True)
    temps_travail = models.CharField(max_length=20, choices=TEMPS_TRAVAIL_CHOICES, blank=True)
    horaire = models.CharField(max_length=150, blank=True)
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

    def move_to_team(self, team):
        """Reassign this user's team, clearing them as manager of any team they're leaving."""
        previous_team = self.team
        if previous_team and previous_team.manager_id == self.id and previous_team != team:
            previous_team.manager = None
            previous_team.save(update_fields=['manager'])
        self.team = team
        self.save(update_fields=['team'])


class Team(models.Model):
    organisation = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='teams')
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=150)
    manager = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name='teams_managed', null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('organisation', 'code')
        ordering = ['code']

    def __str__(self):
        return f'{self.code} — {self.name}'
