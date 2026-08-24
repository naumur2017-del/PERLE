from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Organisation, Team, User


@admin.register(Organisation)
class OrganisationAdmin(admin.ModelAdmin):
    list_display = ('name', 'org_type', 'email', 'city', 'country')
    search_fields = ('name', 'email')
    list_filter = ('org_type',)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'organisation', 'manager')
    search_fields = ('code', 'name')
    list_filter = ('organisation',)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    ordering = ('email',)
    list_display = ('email', 'first_name', 'last_name', 'role', 'organisation', 'team', 'statut', 'is_active', 'is_staff')
    list_filter = ('role', 'statut', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'phone', 'fonction', 'matricule', 'date_naissance', 'pays', 'ville')}),
        ('Organisation', {'fields': ('role', 'organisation', 'team', 'statut')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'role', 'organisation'),
        }),
    )
    filter_horizontal = ('groups', 'user_permissions')
