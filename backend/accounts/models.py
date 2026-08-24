from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
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
    matricule = models.CharField(max_length=50, blank=True)
    date_naissance = models.DateField(null=True, blank=True)
    pays = models.CharField(max_length=100, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email

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
