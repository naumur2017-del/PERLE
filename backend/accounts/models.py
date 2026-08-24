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
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email


class MembershipRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvée'),
        ('rejected', 'Rejetée'),
    ]

    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name='membership_requests'
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    password = models.CharField(max_length=128)
    fonction = models.CharField(max_length=150)
    matricule = models.CharField(max_length=50, blank=True)
    date_naissance = models.DateField()
    pays = models.CharField(max_length=100)
    ville = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.email} -> {self.organisation.name} ({self.status})'
