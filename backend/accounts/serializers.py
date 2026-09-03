from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from .models import (
    AffectationHistory,
    AvanceDemande,
    CongeDemande,
    CongeType,
    Conversation,
    DirectMessage,
    FermetureTechnique,
    GradeHistory,
    LigneBudgetaire,
    Organisation,
    Project,
    ProjectLigne,
    PublicHoliday,
    Task,
    TaskAssignment,
    TaskMessage,
    TaskTemplate,
    Team,
    User,
    create_default_conge_types,
    create_default_teams,
    next_project_code,
    next_project_ligne_code,
    next_task_code,
)
from .holidays_utils import sync_public_holidays


class OrganisationSearchSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = ['id', 'name', 'email', 'sector', 'country', 'country_code', 'city', 'currency_code', 'members']

    def get_members(self, obj):
        return obj.members.count()


class OrganisationLevelsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = ['team_levels_count']

    def validate_team_levels_count(self, value):
        current = self.instance.team_levels_count
        if value == current:
            return value
        if value < 4:
            raise serializers.ValidationError('Il doit toujours y avoir au moins 4 niveaux (3 équipes par défaut + 1).')
        if value > current + 1:
            raise serializers.ValidationError('Vous ne pouvez ajouter qu’un seul niveau à la fois.')
        if value < current:
            if value != current - 1:
                raise serializers.ValidationError('Vous ne pouvez retirer que le dernier niveau.')
            if self.instance.teams.filter(niveau=current).exists():
                raise serializers.ValidationError('Ce niveau contient encore des équipes : déplacez-les avant de le retirer.')
        return value


class OrganisationEhsSerializer(serializers.ModelSerializer):
    """Taux de conversion EHS → FCFA utilisé par Nouveau staffing pour calculer, pendant le
    staffing d'une tâche, ce que consomme chaque personne (grade × heures × ce taux) — voir
    TaskAssignmentSerializer."""
    class Meta:
        model = Organisation
        fields = ['taux_ehs_fcfa']

    def validate_taux_ehs_fcfa(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le taux doit être supérieur à 0.')
        return value


class TeamSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'code', 'name']


class UserSummarySerializer(serializers.ModelSerializer):
    organisation = OrganisationSearchSerializer(read_only=True)
    team = TeamSummarySerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'organisation',
            'phone', 'fonction', 'matricule', 'date_naissance', 'pays', 'pays_code', 'ville', 'team',
        ]


class RegisterPersonalOrganisationSerializer(serializers.Serializer):
    organisation_name = serializers.CharField(max_length=200)
    sector = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=30)
    country = serializers.CharField(max_length=100)
    country_code = serializers.CharField(max_length=2, required=False, allow_blank=True)
    currency_code = serializers.CharField(max_length=3, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cet e-mail.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        organisation = Organisation.objects.create(
            name=validated_data['organisation_name'],
            org_type='personal',
            sector=validated_data['sector'],
            email=validated_data['email'],
            phone=validated_data['phone'],
            country=validated_data['country'],
            country_code=validated_data.get('country_code', ''),
            city=validated_data['city'],
            **({'currency_code': validated_data['currency_code']} if validated_data.get('currency_code') else {}),
        )
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role='directeur',
            organisation=organisation,
        )
        create_default_teams(organisation, user)
        create_default_conge_types(organisation)
        try:
            sync_public_holidays(organisation)
        except Exception:
            pass  # import des jours fériés best-effort : ne doit jamais bloquer l'inscription
        return user


class RegisterCompanyOrganisationSerializer(serializers.Serializer):
    # Étape 1 — entreprise
    organisation_name = serializers.CharField(max_length=200)
    registration_number = serializers.CharField(max_length=100)
    headcount = serializers.ChoiceField(choices=Organisation.HEADCOUNT_CHOICES)
    sector = serializers.CharField(max_length=150)
    org_email = serializers.EmailField()
    org_phone = serializers.CharField(max_length=30)
    address = serializers.CharField(max_length=255)
    country = serializers.CharField(max_length=100)
    country_code = serializers.CharField(max_length=2, required=False, allow_blank=True)
    currency_code = serializers.CharField(max_length=3, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    website = serializers.URLField(required=False, allow_blank=True)

    # Étape 2 — administrateur
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    fonction = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30)
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cet e-mail.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        validate_password(attrs['password'])
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        organisation = Organisation.objects.create(
            name=validated_data['organisation_name'],
            org_type='company',
            sector=validated_data['sector'],
            email=validated_data['org_email'],
            phone=validated_data['org_phone'],
            country=validated_data['country'],
            country_code=validated_data.get('country_code', ''),
            city=validated_data['city'],
            address=validated_data['address'],
            website=validated_data.get('website', ''),
            registration_number=validated_data['registration_number'],
            headcount=validated_data['headcount'],
            **({'currency_code': validated_data['currency_code']} if validated_data.get('currency_code') else {}),
        )
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data['phone'],
            fonction=validated_data['fonction'],
            role='directeur',
            organisation=organisation,
        )
        create_default_teams(organisation, user)
        create_default_conge_types(organisation)
        try:
            sync_public_holidays(organisation)
        except Exception:
            pass  # import des jours fériés best-effort : ne doit jamais bloquer l'inscription
        return user


class RegisterMemberSerializer(serializers.Serializer):
    organisation = serializers.PrimaryKeyRelatedField(queryset=Organisation.objects.all())
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    fonction = serializers.CharField(max_length=150)
    matricule = serializers.CharField(max_length=50, required=False, allow_blank=True)
    date_naissance = serializers.DateField()
    pays = serializers.CharField(max_length=100)
    pays_code = serializers.CharField(max_length=2, required=False, allow_blank=True)
    ville = serializers.CharField(max_length=100)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cet e-mail.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            fonction=validated_data['fonction'],
            matricule=validated_data.get('matricule', ''),
            date_naissance=validated_data['date_naissance'],
            pays=validated_data['pays'],
            pays_code=validated_data.get('pays_code', ''),
            ville=validated_data['ville'],
            role='salarie',
            organisation=validated_data['organisation'],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(email=attrs['email'], password=attrs['password'])
        if user is None:
            raise serializers.ValidationError('E-mail ou mot de passe incorrect.')
        if not user.is_active:
            raise serializers.ValidationError('Ce compte est désactivé.')
        attrs['user'] = user
        return attrs


class TeamMemberSerializer(serializers.ModelSerializer):
    is_manager = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'fonction', 'matricule', 'statut', 'grade', 'is_manager']

    def get_is_manager(self, obj):
        return obj.team_id is not None and obj.team.manager_id == obj.id


class GradeHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.SerializerMethodField()

    class Meta:
        model = GradeHistory
        fields = ['id', 'ancien_grade', 'nouveau_grade', 'changed_at', 'changed_by']

    def get_changed_by(self, obj):
        return f'{obj.changed_by.first_name} {obj.changed_by.last_name}' if obj.changed_by else None


class AffectationHistorySerializer(serializers.ModelSerializer):
    ancienne_equipe = TeamSummarySerializer(read_only=True)
    nouvelle_equipe = TeamSummarySerializer(read_only=True)
    changed_by = serializers.SerializerMethodField()

    class Meta:
        model = AffectationHistory
        fields = ['id', 'ancienne_equipe', 'nouvelle_equipe', 'changed_at', 'changed_by']

    def get_changed_by(self, obj):
        return f'{obj.changed_by.first_name} {obj.changed_by.last_name}' if obj.changed_by else None


class EmployeeSerializer(serializers.ModelSerializer):
    team = TeamSummarySerializer(read_only=True)
    grade_history = GradeHistorySerializer(many=True, read_only=True)
    affectation_history = AffectationHistorySerializer(many=True, read_only=True)
    # Statut « en ligne » pour l'annuaire de la page Messagerie — voir _is_online.
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'fonction', 'role',
            'matricule', 'date_naissance', 'pays', 'pays_code', 'ville', 'statut', 'grade', 'is_active',
            'team', 'date_joined', 'date_embauche', 'last_seen_at', 'is_online',
            'profile_photo', 'cni_document', 'autre_piece_document', 'cv_document', 'contrat_document',
            'type_contrat', 'periode_essai', 'temps_travail',
            'competences_principales', 'competences_secondaires',
            'cnps', 'contribuable', 'banque', 'compte_bancaire', 'groupe_sanguin',
            'contact_urgence_nom', 'contact_urgence_telephone', 'assurance_sante',
            'grade_history', 'affectation_history',
        ]

    def get_is_online(self, obj):
        return _is_online(obj)


class EmployeeCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='team', required=False, allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 'password', 'phone', 'fonction',
            'matricule', 'date_naissance', 'pays', 'pays_code', 'ville', 'statut', 'grade', 'team_id',
            'profile_photo', 'cni_document', 'autre_piece_document', 'cv_document',
            'contrat_document', 'date_embauche', 'type_contrat', 'periode_essai',
            'temps_travail', 'competences_principales', 'competences_secondaires',
            'cnps', 'contribuable', 'banque', 'compte_bancaire', 'groupe_sanguin',
            'contact_urgence_nom', 'contact_urgence_telephone', 'assurance_sante',
        ]
        read_only_fields = ['id']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cet e-mail.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_team_id(self, value):
        request = self.context['request']
        if value is not None and value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette équipe n’appartient pas à votre organisation.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        request = self.context['request']
        return User.objects.create_user(
            password=password,
            role='salarie',
            organisation=request.user.organisation,
            **validated_data,
        )


class EmployeeAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'grade', 'is_active', 'statut']
        read_only_fields = ['id']

    def validate(self, attrs):
        request = self.context.get('request')
        if attrs.get('is_active') is False and request and self.instance == request.user:
            raise serializers.ValidationError({'is_active': 'Vous ne pouvez pas désactiver votre propre compte.'})
        return attrs

    def update(self, instance, validated_data):
        grade = validated_data.pop('grade', None)
        request = self.context.get('request')
        changed_by = request.user if request else None
        instance = super().update(instance, validated_data)
        if grade is not None:
            instance.change_grade(grade, changed_by=changed_by)
        return instance


class EmployeeAdminEditSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='team', required=False, allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 'password', 'phone', 'fonction',
            'matricule', 'date_naissance', 'pays', 'pays_code', 'ville', 'statut', 'grade', 'team_id',
            'profile_photo', 'cni_document', 'autre_piece_document', 'cv_document',
            'contrat_document', 'date_embauche', 'type_contrat', 'periode_essai',
            'temps_travail', 'competences_principales', 'competences_secondaires',
            'cnps', 'contribuable', 'banque', 'compte_bancaire', 'groupe_sanguin',
            'contact_urgence_nom', 'contact_urgence_telephone', 'assurance_sante',
        ]
        read_only_fields = ['id']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cet e-mail.')
        return value

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def validate_team_id(self, value):
        request = self.context['request']
        if value is not None and value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette équipe n’appartient pas à votre organisation.')
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        grade = validated_data.pop('grade', None)
        team_provided = 'team' in validated_data
        team = validated_data.pop('team', None)
        request = self.context.get('request')
        changed_by = request.user if request else None

        instance = super().update(instance, validated_data)

        if password:
            instance.set_password(password)
            instance.save(update_fields=['password'])
        if grade is not None:
            instance.change_grade(grade, changed_by=changed_by)
        if team_provided:
            instance.move_to_team(team, changed_by=changed_by)
        return instance


class EmployeeMeSerializer(serializers.ModelSerializer):
    organisation = OrganisationSearchSerializer(read_only=True)
    team = TeamSummarySerializer(read_only=True)
    anciennete = serializers.SerializerMethodField()
    departement = serializers.SerializerMethodField()
    responsable_hierarchique = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone', 'fonction', 'matricule',
            'date_naissance', 'pays', 'pays_code', 'ville', 'statut', 'grade', 'role', 'organisation', 'team',
            'profile_photo', 'cni_document', 'autre_piece_document', 'cv_document', 'contrat_document', 'date_joined',
            'departement', 'responsable_hierarchique', 'date_embauche', 'type_contrat',
            'periode_essai', 'temps_travail', 'anciennete',
            'competences_principales', 'competences_secondaires',
            'cnps', 'contribuable', 'banque', 'compte_bancaire', 'groupe_sanguin',
            'contact_urgence_nom', 'contact_urgence_telephone', 'assurance_sante',
        ]
        read_only_fields = [
            'id', 'role', 'organisation', 'team', 'date_joined', 'statut', 'grade',
            'departement', 'responsable_hierarchique',
        ]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cet e-mail.')
        return value

    def get_anciennete(self, obj):
        return obj.anciennete()

    def get_departement(self, obj):
        return obj.team.name if obj.team else None

    def get_responsable_hierarchique(self, obj):
        if obj.team and obj.team.manager:
            return f'{obj.team.manager.first_name} {obj.team.manager.last_name}'
        return None


def _validate_team_parent(value, request, instance):
    """Commun à la création et à la modification : le parent doit appartenir à la même
    organisation, et (en modification) ne doit créer aucune boucle hiérarchique."""
    if value is None:
        return value
    if value.organisation_id != request.user.organisation_id:
        raise serializers.ValidationError('Cette équipe n’appartient pas à votre organisation.')
    if instance is not None:
        if value.id == instance.id:
            raise serializers.ValidationError('Une équipe ne peut pas être sa propre équipe de direction.')
        ancestor = value
        while ancestor is not None:
            if ancestor.id == instance.id:
                raise serializers.ValidationError('Cette affectation créerait une boucle hiérarchique entre équipes.')
            ancestor = ancestor.parent
    return value


class TeamSerializer(serializers.ModelSerializer):
    """Lecture et modification d'une équipe existante : le code ne se modifie pas depuis ce
    formulaire, mais l'équipe de direction (parent) le peut — c'est ce qui la fait apparaître
    comme sous-équipe sur l'organigramme."""
    manager = TeamMemberSerializer(read_only=True)
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='manager', write_only=True, required=False, allow_null=True,
    )
    members = TeamMemberSerializer(many=True, read_only=True, source='team_members')
    parent_code = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'id', 'code', 'name', 'manager', 'manager_id', 'members', 'niveau', 'parent',
            'parent_code', 'parent_name', 'is_protected', 'created_at',
        ]
        read_only_fields = ['id', 'code', 'is_protected', 'created_at']

    def get_parent_code(self, obj):
        return obj.parent.code if obj.parent else None

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None

    def validate_manager_id(self, value):
        request = self.context['request']
        if value is not None and value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Ce manager n’appartient pas à votre organisation.')
        return value

    def validate_name(self, value):
        if self.instance and self.instance.is_protected and value != self.instance.name:
            raise serializers.ValidationError('Cette équipe est protégée : son nom ne peut pas être modifié.')
        return value

    def validate_niveau(self, value):
        if self.instance and self.instance.is_protected and value != self.instance.niveau:
            raise serializers.ValidationError('Cette équipe est protégée : son niveau ne peut pas être modifié.')
        request = self.context['request']
        organisation = request.user.organisation
        max_niveau = organisation.team_levels_count if organisation else 4
        if value < 1 or value > max_niveau:
            raise serializers.ValidationError(f'Le niveau doit être compris entre 1 et {max_niveau}.')
        return value

    def validate_parent(self, value):
        return _validate_team_parent(value, self.context['request'], self.instance)

    def update(self, instance, validated_data):
        manager = validated_data.get('manager', instance.manager)
        team = super().update(instance, validated_data)
        if manager is not None and manager.team_id != team.id:
            manager.move_to_team(team)
        return team


class TeamCreateSerializer(serializers.ModelSerializer):
    """Création d'une équipe : le code est saisi librement par l'utilisateur (unique par
    organisation), le niveau démarre toujours au plus bas (à ajuster ensuite si besoin), et une
    équipe de direction (parent) peut être choisie dès la création."""
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='manager', write_only=True, required=False, allow_null=True,
    )

    class Meta:
        model = Team
        fields = ['id', 'code', 'name', 'manager_id', 'parent']
        read_only_fields = ['id']

    def validate_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Le code est obligatoire.')
        organisation = self.context['request'].user.organisation
        if Team.objects.filter(organisation=organisation, code__iexact=value).exists():
            raise serializers.ValidationError('Ce code est déjà utilisé par une autre équipe.')
        return value

    def validate_manager_id(self, value):
        request = self.context['request']
        if value is not None and value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Ce manager n’appartient pas à votre organisation.')
        return value

    def validate_parent(self, value):
        return _validate_team_parent(value, self.context['request'], None)

    def create(self, validated_data):
        organisation = self.context['request'].user.organisation
        manager = validated_data.pop('manager', None)
        team = Team.objects.create(organisation=organisation, niveau=4, manager=manager, **validated_data)
        if manager is not None:
            manager.move_to_team(team)
        return team


class CongeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CongeType
        fields = ['id', 'nom', 'categorie', 'description', 'jours_alloues', 'unite', 'mode_periode', 'actif']
        read_only_fields = ['id', 'categorie']

    def validate_nom(self, value):
        request = self.context['request']
        organisation = request.user.organisation
        qs = CongeType.objects.filter(organisation=organisation, nom__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Un type de congé porte déjà ce nom.')
        return value

    def validate(self, attrs):
        # Seule la catégorie « standard » se crée/modifie librement depuis ce formulaire ;
        # maladie/technique sont amorcés automatiquement et gardent des quotas/périodes vides.
        categorie = self.instance.categorie if self.instance else 'standard'
        if categorie == 'standard':
            jours_alloues = attrs.get('jours_alloues', getattr(self.instance, 'jours_alloues', None))
            unite = attrs.get('unite', getattr(self.instance, 'unite', None))
            mode_periode = attrs.get('mode_periode', getattr(self.instance, 'mode_periode', None))
            if jours_alloues is None or not unite or not mode_periode:
                raise serializers.ValidationError('Merci de renseigner le quota, l’unité et le mode de période.')
        return attrs

    def create(self, validated_data):
        organisation = self.context['request'].user.organisation
        validated_data['categorie'] = 'standard'
        return CongeType.objects.create(organisation=organisation, **validated_data)


class PublicHolidaySerializer(serializers.ModelSerializer):
    """Jour férié propre au pays de l'organisation — la plupart importés automatiquement
    (source='auto'), le reste ajouté à la main par l'admin/directeur (Paramètres > Jours fériés)."""
    created_by_nom = serializers.SerializerMethodField()

    class Meta:
        model = PublicHoliday
        fields = ['id', 'nom', 'date', 'recurrente_annuelle', 'source', 'created_by_nom', 'created_at']
        read_only_fields = ['id', 'source', 'created_at']

    def get_created_by_nom(self, obj):
        return f'{obj.created_by.first_name} {obj.created_by.last_name}' if obj.created_by else None

    def validate(self, attrs):
        request = self.context['request']
        organisation = request.user.organisation
        nom = attrs.get('nom', getattr(self.instance, 'nom', None))
        date = attrs.get('date', getattr(self.instance, 'date', None))
        qs = PublicHoliday.objects.filter(organisation=organisation, date=date, nom__iexact=nom)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ce jour férié est déjà enregistré à cette date.')
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        return PublicHoliday.objects.create(
            organisation=request.user.organisation, created_by=request.user, **validated_data,
        )


class CongeDemandeSerializer(serializers.ModelSerializer):
    employee_nom = serializers.SerializerMethodField()
    employee_fonction = serializers.CharField(source='employee.fonction', read_only=True)
    reviewed_by_nom = serializers.SerializerMethodField()
    reviewed_by_role = serializers.SerializerMethodField()
    duree = serializers.ReadOnlyField()
    type_conge_detail = CongeTypeSerializer(source='type_conge', read_only=True)

    class Meta:
        model = CongeDemande
        fields = [
            'id', 'employee', 'employee_nom', 'employee_fonction', 'type_conge', 'type_conge_detail',
            'date_debut', 'date_fin', 'duree', 'demi_journee_debut', 'demi_journee_fin', 'motif',
            'statut', 'cloture', 'reviewed_by_nom', 'reviewed_by_role', 'reviewed_at', 'created_at',
        ]
        read_only_fields = [
            'id', 'employee', 'statut', 'cloture', 'reviewed_by_nom', 'reviewed_by_role', 'reviewed_at', 'created_at',
        ]

    def get_employee_nom(self, obj):
        return f'{obj.employee.first_name} {obj.employee.last_name}'

    def get_reviewed_by_nom(self, obj):
        return f'{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}' if obj.reviewed_by else None

    def get_reviewed_by_role(self, obj):
        return obj.reviewed_by.get_role_display() if obj.reviewed_by else None

    def validate_type_conge(self, value):
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Ce type de congé n’appartient pas à votre organisation.')
        return value

    def validate(self, attrs):
        type_conge = attrs.get('type_conge', getattr(self.instance, 'type_conge', None))
        date_debut = attrs.get('date_debut', getattr(self.instance, 'date_debut', None))
        date_fin = attrs.get('date_fin', getattr(self.instance, 'date_fin', None))
        if self.instance is None and type_conge and type_conge.categorie == 'technique':
            raise serializers.ValidationError(
                {'type_conge': 'Le congé technique n’est pas une demande individuelle : il est configuré depuis Demandes > Congé Technique.'}
            )
        if self.instance is None and type_conge and type_conge.categorie == 'maladie':
            if not date_debut:
                raise serializers.ValidationError({'date_debut': 'Merci d’indiquer la date de début de votre congé maladie.'})
            # Ouvert par nature : seule la reprise du travail en fixera la fin.
            attrs['date_fin'] = None
        elif self.instance is None and type_conge and type_conge.mode_periode == 'employe':
            if not date_debut or not date_fin:
                raise serializers.ValidationError({'date_debut': 'Merci d’indiquer les dates de votre congé.'})
        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError({'date_fin': 'La date de fin doit être postérieure à la date de début.'})
        return attrs


class CongeDemandeReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CongeDemande
        fields = ['id', 'statut', 'date_debut', 'date_fin']
        read_only_fields = ['id']
        extra_kwargs = {
            'date_debut': {'required': False},
            'date_fin': {'required': False},
        }

    def validate_statut(self, value):
        if value not in ('approuvee', 'refusee'):
            raise serializers.ValidationError('Le statut doit être « approuvée » ou « refusée ».')
        return value

    def validate(self, attrs):
        statut = attrs.get('statut')
        instance = self.instance
        type_conge = instance.type_conge if instance else None
        date_debut = attrs.get('date_debut', instance.date_debut if instance else None)
        date_fin = attrs.get('date_fin', instance.date_fin if instance else None)
        if statut == 'approuvee' and type_conge and type_conge.mode_periode == 'entreprise':
            if not date_debut or not date_fin:
                raise serializers.ValidationError(
                    {'date_debut': 'Ce type de congé est défini par l’entreprise : indiquez les dates avant d’approuver.'}
                )
        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError({'date_fin': 'La date de fin doit être postérieure à la date de début.'})
        return attrs


class FermetureTechniqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = FermetureTechnique
        fields = ['id', 'date_debut', 'date_fin', 'description', 'equipes_exceptees', 'employes_exceptes', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        organisation = self.context['request'].user.organisation
        date_debut = attrs.get('date_debut', getattr(self.instance, 'date_debut', None))
        date_fin = attrs.get('date_fin', getattr(self.instance, 'date_fin', None))
        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError({'date_fin': 'La date de fin doit être postérieure à la date de début.'})
        for equipe in attrs.get('equipes_exceptees') or []:
            if equipe.organisation_id != organisation.id:
                raise serializers.ValidationError('Une équipe sélectionnée n’appartient pas à votre organisation.')
        for employe in attrs.get('employes_exceptes') or []:
            if employe.organisation_id != organisation.id:
                raise serializers.ValidationError('Un salarié sélectionné n’appartient pas à votre organisation.')
        return attrs

    def create(self, validated_data):
        organisation = self.context['request'].user.organisation
        equipes = validated_data.pop('equipes_exceptees', [])
        employes = validated_data.pop('employes_exceptes', [])
        instance = FermetureTechnique.objects.create(
            organisation=organisation, created_by=self.context['request'].user, **validated_data
        )
        instance.equipes_exceptees.set(equipes)
        instance.employes_exceptes.set(employes)
        return instance


class AvanceDemandeSerializer(serializers.ModelSerializer):
    employee_nom = serializers.SerializerMethodField()
    employee_fonction = serializers.CharField(source='employee.fonction', read_only=True)
    reviewed_by_nom = serializers.SerializerMethodField()
    reviewed_by_role = serializers.SerializerMethodField()

    class Meta:
        model = AvanceDemande
        fields = [
            'id', 'employee', 'employee_nom', 'employee_fonction', 'montant', 'motif', 'nombre_mois',
            'statut', 'reviewed_by_nom', 'reviewed_by_role', 'reviewed_at', 'created_at',
        ]
        read_only_fields = ['id', 'employee', 'statut', 'reviewed_by_nom', 'reviewed_by_role', 'reviewed_at', 'created_at']

    def get_employee_nom(self, obj):
        return f'{obj.employee.first_name} {obj.employee.last_name}'

    def get_reviewed_by_nom(self, obj):
        return f'{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}' if obj.reviewed_by else None

    def get_reviewed_by_role(self, obj):
        return obj.reviewed_by.get_role_display() if obj.reviewed_by else None


class LigneBudgetaireSerializer(serializers.ModelSerializer):
    """Lecture et modification limitée (nom, équipe, déclinaison, actif) d'une ligne existante :
    la structure (parent, niveau, code) ne se modifie pas depuis ce formulaire."""
    equipe_nom = serializers.CharField(source='equipe.name', read_only=True)
    equipe_code = serializers.CharField(source='equipe.code', read_only=True)

    class Meta:
        model = LigneBudgetaire
        fields = [
            'id', 'code', 'nom', 'niveau', 'parent', 'equipe', 'equipe_nom', 'equipe_code',
            'declinaison', 'montant_prevu', 'actif', 'created_at',
        ]
        read_only_fields = ['id', 'code', 'niveau', 'parent', 'created_at']

    def validate_equipe(self, value):
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette équipe n’appartient pas à votre organisation.')
        return value


class LigneBudgetaireCreateSerializer(serializers.ModelSerializer):
    """Création d'une ligne (racine si parent est vide, sous-ligne sinon) : le niveau est calculé
    automatiquement à partir du parent, mais le code est saisi librement par l'utilisateur
    (unique par organisation)."""
    class Meta:
        model = LigneBudgetaire
        fields = ['id', 'code', 'nom', 'equipe', 'declinaison', 'montant_prevu', 'parent']
        read_only_fields = ['id']

    def validate_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Le code est obligatoire.')
        organisation = self.context['request'].user.organisation
        if LigneBudgetaire.objects.filter(organisation=organisation, code__iexact=value).exists():
            raise serializers.ValidationError('Ce code est déjà utilisé par une autre ligne.')
        return value

    def validate_equipe(self, value):
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette équipe n’appartient pas à votre organisation.')
        return value

    def validate_parent(self, value):
        if value is None:
            return value
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette ligne parente n’appartient pas à votre organisation.')
        if value.niveau >= 3:
            raise serializers.ValidationError('Impossible d’ajouter une sous-ligne à une ligne de niveau 3.')
        return value

    def create(self, validated_data):
        organisation = self.context['request'].user.organisation
        parent = validated_data.pop('parent', None)
        niveau = (parent.niveau + 1) if parent else 1
        return LigneBudgetaire.objects.create(organisation=organisation, parent=parent, niveau=niveau, **validated_data)


class AvanceDemandeReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvanceDemande
        fields = ['id', 'statut']
        read_only_fields = ['id']

    def validate_statut(self, value):
        if value not in ('approuvee', 'refusee'):
            raise serializers.ValidationError('Le statut doit être « approuvée » ou « refusée ».')
        return value


class ProjectLigneSerializer(serializers.ModelSerializer):
    """Attribution d'une ligne budgétaire réelle (Architecture monétaire) à un projet, avec le
    montant que ce projet va y consommer. Le montant est plafonné par le montant_prevu de la
    ligne, propre à chaque projet (voir validate)."""
    ligne_budgetaire_nom = serializers.CharField(source='ligne_budgetaire.nom', read_only=True)
    ligne_budgetaire_code = serializers.CharField(source='ligne_budgetaire.code', read_only=True)
    ligne_budgetaire_declinaison = serializers.CharField(source='ligne_budgetaire.declinaison', read_only=True)
    ligne_budgetaire_montant_prevu = serializers.DecimalField(source='ligne_budgetaire.montant_prevu', max_digits=16, decimal_places=2, read_only=True, allow_null=True)
    equipe = serializers.IntegerField(source='ligne_budgetaire.equipe_id', read_only=True)
    equipe_nom = serializers.CharField(source='ligne_budgetaire.equipe.name', read_only=True)
    equipe_code = serializers.CharField(source='ligne_budgetaire.equipe.code', read_only=True)
    montant_consomme_fcfa = serializers.SerializerMethodField()
    montant_reste_fcfa = serializers.SerializerMethodField()

    class Meta:
        model = ProjectLigne
        fields = [
            'id', 'code', 'ligne_budgetaire', 'ligne_budgetaire_nom', 'ligne_budgetaire_code',
            'ligne_budgetaire_declinaison', 'ligne_budgetaire_montant_prevu', 'equipe', 'equipe_nom',
            'equipe_code', 'montant', 'montant_consomme_fcfa', 'montant_reste_fcfa',
            'date_debut', 'date_fin', 'created_at',
        ]
        read_only_fields = ['id', 'code', 'created_at']

    def get_montant_consomme_fcfa(self, obj):
        # Somme des heures déjà staffées (Nouveau staffing) sur toutes les tâches de ce projet
        # rattachées à cette même ligne budgétaire — voir TaskAssignment.
        return TaskAssignment.objects.filter(
            task__project=obj.project, task__ligne_budgetaire=obj.ligne_budgetaire,
        ).aggregate(total=Sum('montant_fcfa'))['total'] or 0

    def get_montant_reste_fcfa(self, obj):
        return obj.montant - self.get_montant_consomme_fcfa(obj)

    def get_project(self):
        return self.context['project'] if self.instance is None else self.instance.project

    def validate_ligne_budgetaire(self, value):
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette ligne budgétaire n’appartient pas à votre organisation.')
        return value

    def validate(self, attrs):
        ligne_budgetaire = attrs.get('ligne_budgetaire', getattr(self.instance, 'ligne_budgetaire', None))
        montant = attrs.get('montant', getattr(self.instance, 'montant', None)) or 0
        if self.instance is None and ligne_budgetaire and ProjectLigne.objects.filter(project=self.get_project(), ligne_budgetaire=ligne_budgetaire).exists():
            raise serializers.ValidationError({
                'ligne_budgetaire': 'Cette ligne budgétaire est déjà attribuée à ce projet : modifiez l’attribution existante plutôt que d’en créer une nouvelle.',
            })
        if ligne_budgetaire and ligne_budgetaire.montant_prevu is not None:
            qs = ProjectLigne.objects.filter(project=self.get_project(), ligne_budgetaire=ligne_budgetaire)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            deja_attribue = qs.aggregate(total=Sum('montant'))['total'] or 0
            if deja_attribue + montant > ligne_budgetaire.montant_prevu:
                disponible = ligne_budgetaire.montant_prevu - deja_attribue
                raise serializers.ValidationError({
                    'montant': f'Ce montant dépasse ce qui est prévu pour cette ligne budgétaire dans ce projet. Disponible : {disponible} FCFA.',
                })
        return attrs

    def create(self, validated_data):
        project = self.context['project']
        code = next_project_ligne_code(project)
        return ProjectLigne.objects.create(project=project, code=code, **validated_data)


class ProjectSerializer(serializers.ModelSerializer):
    lignes = ProjectLigneSerializer(many=True, read_only=True)
    created_by_nom = serializers.SerializerMethodField()
    montant_marge = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    montant_charges = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    montant_tva = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    montant_ir = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    budget_execution = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'code', 'nom', 'client', 'description', 'montant', 'type_montant', 'marge_pct',
            'charges_transversales_pct', 'tva_pct', 'ir_pct', 'reserve_montant', 'date_debut', 'date_fin',
            'statut', 'created_by_nom', 'created_at', 'updated_at', 'lignes',
            'montant_marge', 'montant_charges', 'montant_tva', 'montant_ir', 'budget_execution',
        ]
        read_only_fields = ['id', 'code', 'created_at', 'updated_at']

    def get_created_by_nom(self, obj):
        return f'{obj.created_by.first_name} {obj.created_by.last_name}' if obj.created_by else None

    def validate(self, attrs):
        date_debut = attrs.get('date_debut', getattr(self.instance, 'date_debut', None))
        date_fin = attrs.get('date_fin', getattr(self.instance, 'date_fin', None))
        if date_debut and date_fin and date_fin < date_debut:
            raise serializers.ValidationError({'date_fin': 'La date de fin doit être postérieure à la date de début.'})
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        organisation = request.user.organisation
        code = next_project_code(organisation)
        return Project.objects.create(organisation=organisation, code=code, created_by=request.user, **validated_data)


class TaskTemplateSerializer(serializers.ModelSerializer):
    """Catalogue des tâches (onglet Catalogue des tâches) : arborescence libre de dossiers et de
    tâches élémentaires. Le premier niveau (racine) porte l'équipe réelle (choisie dans une liste
    déroulante) ; les niveaux suivants l'héritent automatiquement — voir TaskSerializer.template
    pour ce qui « affecte » réellement une tâche élémentaire à une équipe et un financement. Le
    code est saisi manuellement à la création (voir validate_code)."""
    parent_nom = serializers.CharField(source='parent.nom', read_only=True, default=None)
    parent_code = serializers.CharField(source='parent.code', read_only=True, default=None)
    equipe_nom = serializers.CharField(source='equipe.name', read_only=True, default=None)
    equipe_code = serializers.CharField(source='equipe.code', read_only=True, default=None)
    type_element_display = serializers.CharField(source='get_type_element_display', read_only=True)
    frequence_display = serializers.CharField(source='get_frequence_display', read_only=True)
    mode_declenchement_display = serializers.CharField(source='get_mode_declenchement_display', read_only=True)
    priorite_defaut_display = serializers.CharField(source='get_priorite_defaut_display', read_only=True)
    created_by_nom = serializers.SerializerMethodField()
    updated_by_nom = serializers.SerializerMethodField()
    enfants_count = serializers.SerializerMethodField()
    attributions_count = serializers.SerializerMethodField()

    class Meta:
        model = TaskTemplate
        fields = [
            'id', 'code', 'nom', 'parent', 'parent_nom', 'parent_code', 'niveau',
            'equipe', 'equipe_nom', 'equipe_code',
            'type_element', 'type_element_display', 'attribuable', 'recurrente',
            'details', 'explication', 'frequence', 'frequence_display',
            'mode_declenchement', 'mode_declenchement_display', 'priorite_defaut', 'priorite_defaut_display',
            'duree_estimee_heures', 'actif', 'created_by_nom', 'created_at', 'updated_by_nom', 'updated_at',
            'enfants_count', 'attributions_count',
        ]
        read_only_fields = ['id', 'niveau', 'created_at', 'updated_at']

    def get_created_by_nom(self, obj):
        return f'{obj.created_by.first_name} {obj.created_by.last_name}' if obj.created_by else None

    def get_updated_by_nom(self, obj):
        return f'{obj.updated_by.first_name} {obj.updated_by.last_name}' if obj.updated_by else None

    def get_enfants_count(self, obj):
        return obj.enfants.count()

    def get_attributions_count(self, obj):
        return obj.attributions.count()

    def validate_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Le code est obligatoire.')
        request = self.context['request']
        organisation = request.user.organisation
        qs = TaskTemplate.objects.filter(organisation=organisation, code__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ce code est déjà utilisé dans le catalogue.')
        return value

    def validate_equipe(self, value):
        if value is None:
            return value
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette équipe n’appartient pas à votre organisation.')
        return value

    def validate_parent(self, value):
        if value is None:
            return value
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Ce nœud parent n’appartient pas à votre organisation.')
        if value.type_element == 'tache_elementaire':
            raise serializers.ValidationError('Une tâche élémentaire ne peut pas recevoir de sous-éléments : changez-la d’abord en dossier.')
        if self.instance and value.pk == self.instance.pk:
            raise serializers.ValidationError('Un nœud ne peut pas être son propre parent.')
        return value

    def validate(self, attrs):
        if self.instance is not None and 'parent' in attrs and attrs['parent'] != self.instance.parent:
            raise serializers.ValidationError({'parent': 'Le déplacement d’un nœud dans l’arborescence n’est pas pris en charge : supprimez-le et recréez-le sous le bon parent.'})
        parent = attrs.get('parent', getattr(self.instance, 'parent', None)) if self.instance else attrs.get('parent')
        if parent is None:
            equipe = attrs.get('equipe', getattr(self.instance, 'equipe', None))
            if equipe is None:
                raise serializers.ValidationError({'equipe': 'Une équipe est obligatoire pour un nœud racine (premier niveau).'})
        nom = attrs.get('nom', getattr(self.instance, 'nom', None))
        if nom:
            request = self.context['request']
            organisation = request.user.organisation
            qs = TaskTemplate.objects.filter(organisation=organisation, parent=parent, nom__iexact=nom)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'nom': 'Un élément porte déjà ce nom à cet emplacement de l’arborescence.'})
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        organisation = request.user.organisation
        parent = validated_data.get('parent')
        niveau = 1 if parent is None else parent.niveau + 1
        if parent is not None:
            validated_data['equipe'] = parent.equipe
        return TaskTemplate.objects.create(
            organisation=organisation, niveau=niveau,
            created_by=request.user, updated_by=request.user, **validated_data,
        )

    def update(self, instance, validated_data):
        if instance.parent is not None:
            validated_data.pop('equipe', None)
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class TaskAssignmentSerializer(serializers.ModelSerializer):
    """Une personne staffée sur une tâche (Nouveau staffing), avec ses propres heures — une tâche
    peut être répartie entre plusieurs personnes. La consommation en EHS (grade de la personne ×
    heures) et son équivalent FCFA (× Organisation.taux_ehs_fcfa) sont calculés et figés à la
    création (voir create/update) : un changement de grade ou de taux plus tard ne modifie pas
    rétroactivement une attribution déjà faite. Le staffing est plafonné par ce qu'il reste sur
    la ligne budgétaire du projet (voir validate) — sauf tâche transversale, sans suivi budgétaire."""
    user_nom = serializers.SerializerMethodField()
    user_grade = serializers.IntegerField(source='grade_snapshot', read_only=True)
    execution_statut_display = serializers.CharField(source='get_execution_statut_display', read_only=True)
    created_by_nom = serializers.SerializerMethodField()
    # Résumé de la tâche portée, pour qu'Exécuté staffing n'ait besoin que d'un seul appel
    # (?user=<moi>) sans avoir à recouper avec /tasks/ séparément.
    task_code = serializers.CharField(source='task.code', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    template_nom = serializers.CharField(source='task.template.nom', read_only=True)
    template_code = serializers.CharField(source='task.template.code', read_only=True)
    project_nom = serializers.CharField(source='task.project.nom', read_only=True, default=None)
    project_code = serializers.CharField(source='task.project.code', read_only=True, default=None)
    equipe_nom = serializers.CharField(source='task.equipe.name', read_only=True)
    equipe_code = serializers.CharField(source='task.equipe.code', read_only=True)
    ligne_budgetaire_nom = serializers.CharField(source='task.ligne_budgetaire.nom', read_only=True)
    ligne_budgetaire_code = serializers.CharField(source='task.ligne_budgetaire.code', read_only=True)
    echeance = serializers.DateField(source='task.echeance', read_only=True)
    priorite_display = serializers.CharField(source='task.get_priorite_display', read_only=True)
    task_created_by_nom = serializers.SerializerMethodField()
    notee_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = TaskAssignment
        # Le doublon (task, user) est déjà vérifié « à la main » dans validate(), avec un message
        # clair — on désactive le UniqueTogetherValidator auto-généré par DRF pour ne pas le
        # doubler d'une erreur générique moins lisible.
        validators = []
        fields = [
            'id', 'task', 'user', 'user_nom', 'user_grade', 'heures', 'ehs_consomme', 'montant_fcfa',
            'execution_statut', 'execution_statut_display', 'demarree_le', 'terminee_le',
            'temps_travaille_secondes', 'note', 'note_commentaire', 'notee_le', 'notee_par_nom',
            'created_by_nom', 'created_at',
            'task_code', 'task_description', 'template_nom', 'template_code',
            'project_nom', 'project_code', 'equipe_nom', 'equipe_code',
            'ligne_budgetaire_nom', 'ligne_budgetaire_code', 'echeance', 'priorite_display',
            'task_created_by_nom',
        ]
        read_only_fields = [
            'id', 'ehs_consomme', 'montant_fcfa', 'execution_statut', 'demarree_le', 'terminee_le',
            'temps_travaille_secondes', 'notee_le', 'created_at',
        ]

    def get_user_nom(self, obj):
        return f'{obj.user.first_name} {obj.user.last_name}'

    def get_created_by_nom(self, obj):
        return f'{obj.created_by.first_name} {obj.created_by.last_name}' if obj.created_by else None

    def get_task_created_by_nom(self, obj):
        creator = obj.task.created_by
        return f'{creator.first_name} {creator.last_name}' if creator else None

    def get_notee_par_nom(self, obj):
        return f'{obj.notee_par.first_name} {obj.notee_par.last_name}' if obj.notee_par else None

    def validate_note(self, value):
        if value is None:
            return value
        if not (1 <= value <= 5):
            raise serializers.ValidationError('La note doit être comprise entre 1 et 5.')
        instance = self.instance
        if instance is None or instance.execution_statut != 'terminee':
            raise serializers.ValidationError('Seule une tâche terminée peut être notée.')
        return value

    def validate_task(self, value):
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette tâche n’appartient pas à votre organisation.')
        if value.statut != 'acceptee':
            raise serializers.ValidationError('Cette tâche doit être acceptée par le manager avant d’être staffée.')
        return value

    def validate_user(self, value):
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Ce membre n’appartient pas à votre organisation.')
        return value

    def validate_heures(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Le nombre d’heures doit être supérieur à 0.')
        return value

    def validate(self, attrs):
        task = attrs.get('task', getattr(self.instance, 'task', None))
        user = attrs.get('user', getattr(self.instance, 'user', None))
        heures = attrs.get('heures', getattr(self.instance, 'heures', None))
        if task and user:
            equipe = task.equipe
            # Le manager peut se staffer lui-même, même s'il n'est pas lui-même membre de
            # l'équipe, ou staffer un membre réel de l'équipe.
            if user.id != equipe.manager_id and user.team_id != equipe.id:
                raise serializers.ValidationError({'user': 'Ce membre doit être le manager de l’équipe ou l’un de ses membres.'})
            if self.instance is None and TaskAssignment.objects.filter(task=task, user=user).exists():
                raise serializers.ValidationError({'user': 'Cette personne est déjà staffée sur cette tâche : modifiez plutôt son allocation d’heures.'})
        if task and user and heures:
            taux = task.organisation.taux_ehs_fcfa
            ehs = user.grade * heures
            montant = ehs * taux
            if task.project_id:
                project_ligne = ProjectLigne.objects.filter(project_id=task.project_id, ligne_budgetaire_id=task.ligne_budgetaire_id).first()
                if project_ligne is not None:
                    qs = TaskAssignment.objects.filter(task__project_id=task.project_id, task__ligne_budgetaire_id=task.ligne_budgetaire_id)
                    if self.instance:
                        qs = qs.exclude(pk=self.instance.pk)
                    deja_consomme = qs.aggregate(total=Sum('montant_fcfa'))['total'] or 0
                    reste = project_ligne.montant - deja_consomme
                    if montant > reste:
                        raise serializers.ValidationError({
                            'heures': f'Cette allocation ({montant} FCFA, {ehs} EHS) dépasse le reste disponible sur la ligne budgétaire du projet : {reste} FCFA.',
                        })
            self._ehs = ehs
            self._montant = montant
            self._taux = taux
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        user = validated_data['user']
        return TaskAssignment.objects.create(
            grade_snapshot=user.grade, taux_snapshot=self._taux, ehs_consomme=self._ehs, montant_fcfa=self._montant,
            created_by=request.user, **validated_data,
        )

    def update(self, instance, validated_data):
        user = validated_data.get('user', instance.user)
        instance.grade_snapshot = user.grade
        instance.taux_snapshot = self._taux
        instance.ehs_consomme = self._ehs
        instance.montant_fcfa = self._montant
        return super().update(instance, validated_data)


MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024  # 50 Mo


def _detect_attachment_type(uploaded_file):
    """Le type de pièce jointe est toujours dérivé du content-type réel du fichier envoyé, jamais
    fourni tel quel par le client (attachment_type est en lecture seule dans les serializers)."""
    content_type = getattr(uploaded_file, 'content_type', '') or ''
    if content_type.startswith('image/'):
        return 'image'
    if content_type.startswith('video/'):
        return 'video'
    if content_type.startswith('audio/'):
        return 'audio'
    return 'fichier'


def _absolute_media_url(request, file_field):
    if not file_field:
        return None
    try:
        return request.build_absolute_uri(file_field.url)
    except ValueError:
        return None


# Une personne est considérée « en ligne » si le battement de cœur envoyé par le frontend (voir
# HeartbeatView, appelé toutes les ~30 secondes tant qu'une session est active) date de moins de
# ONLINE_THRESHOLD_SECONDS — aucun état stocké à part ce timestamp, pas de tâche périodique.
ONLINE_THRESHOLD_SECONDS = 90


def _is_online(user):
    if not user.last_seen_at:
        return False
    return (timezone.now() - user.last_seen_at).total_seconds() <= ONLINE_THRESHOLD_SECONDS


class TaskMessageSerializer(serializers.ModelSerializer):
    """Un message de l'espace de discussion partagé d'une tâche (TaskMessage) — texte et/ou
    pièce jointe (image, vidéo, note vocale). Voir _can_access_task_messages dans les vues pour
    qui peut lire/écrire dans ce fil, et TaskMessageDetailView pour qui peut le modifier/supprimer
    (son auteur uniquement)."""
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = TaskMessage
        fields = ['id', 'task', 'auteur', 'auteur_nom', 'contenu', 'attachment', 'attachment_type', 'created_at', 'edited_at']
        read_only_fields = ['id', 'task', 'auteur', 'auteur_nom', 'attachment_type', 'created_at', 'edited_at']

    def get_auteur_nom(self, obj):
        return f'{obj.auteur.first_name} {obj.auteur.last_name}' if obj.auteur else None

    def validate_contenu(self, value):
        return value.strip()

    def validate_attachment(self, value):
        if value and value.size > MAX_ATTACHMENT_SIZE:
            raise serializers.ValidationError('Le fichier est trop volumineux (50 Mo maximum).')
        return value

    def validate(self, attrs):
        # En modification partielle (édition), un champ absent du payload garde sa valeur
        # actuelle — un message qui a déjà une pièce jointe reste valide même si on ne modifie
        # que le texte (ou qu'on le vide entièrement).
        contenu = attrs.get('contenu', self.instance.contenu if self.instance else '')
        has_attachment = attrs.get('attachment') is not None or bool(self.instance and self.instance.attachment)
        if not contenu and not has_attachment:
            raise serializers.ValidationError({'contenu': 'Le message ne peut pas être vide.'})
        if len(contenu) > 4000:
            raise serializers.ValidationError({'contenu': 'Le message est trop long (4000 caractères maximum).'})
        return attrs

    def create(self, validated_data):
        attachment = validated_data.get('attachment')
        if attachment:
            validated_data['attachment_type'] = _detect_attachment_type(attachment)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['edited_at'] = timezone.now()
        return super().update(instance, validated_data)


class DirectMessageSerializer(serializers.ModelSerializer):
    """Un message d'une conversation directe (DirectMessage, page Messagerie) — texte et/ou
    pièce jointe (image, vidéo, note vocale). Voir DirectMessageDetailView pour qui peut le
    modifier/supprimer (son auteur uniquement)."""
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = ['id', 'conversation', 'auteur', 'auteur_nom', 'contenu', 'attachment', 'attachment_type', 'created_at', 'edited_at']
        read_only_fields = ['id', 'conversation', 'auteur', 'auteur_nom', 'attachment_type', 'created_at', 'edited_at']

    def get_auteur_nom(self, obj):
        return f'{obj.auteur.first_name} {obj.auteur.last_name}' if obj.auteur else None

    def validate_contenu(self, value):
        return value.strip()

    def validate_attachment(self, value):
        if value and value.size > MAX_ATTACHMENT_SIZE:
            raise serializers.ValidationError('Le fichier est trop volumineux (50 Mo maximum).')
        return value

    def validate(self, attrs):
        contenu = attrs.get('contenu', self.instance.contenu if self.instance else '')
        has_attachment = attrs.get('attachment') is not None or bool(self.instance and self.instance.attachment)
        if not contenu and not has_attachment:
            raise serializers.ValidationError({'contenu': 'Le message ne peut pas être vide.'})
        if len(contenu) > 4000:
            raise serializers.ValidationError({'contenu': 'Le message est trop long (4000 caractères maximum).'})
        return attrs

    def create(self, validated_data):
        attachment = validated_data.get('attachment')
        if attachment:
            validated_data['attachment_type'] = _detect_attachment_type(attachment)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['edited_at'] = timezone.now()
        return super().update(instance, validated_data)


class ConversationSerializer(serializers.ModelSerializer):
    """Résumé d'une conversation (1:1 ou groupe) pour la liste de la page Messagerie : nom
    affiché, participants, un aperçu du dernier message, et si elle a des messages non lus par
    request.user (voir ConversationRead — comparaison de dates, pas d'état par message)."""
    other_user = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    display_nom = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'is_group', 'nom', 'display_nom', 'other_user', 'participants', 'last_message', 'unread', 'created_at']

    def _user_summary(self, request, user):
        return {
            'id': user.id,
            'nom': f'{user.first_name} {user.last_name}',
            'fonction': user.fonction,
            'profile_photo': _absolute_media_url(request, user.profile_photo),
            'is_online': _is_online(user),
        }

    def get_participants(self, obj):
        request = self.context['request']
        return [self._user_summary(request, u) for u in obj.participants.all()]

    def get_other_user(self, obj):
        """Uniquement pour un 1:1 — None pour un groupe (voir display_nom pour le nom à afficher
        dans ce cas)."""
        if obj.is_group:
            return None
        request = self.context['request']
        other = obj.other_participant(request.user)
        return self._user_summary(request, other) if other else None

    def get_display_nom(self, obj):
        if obj.is_group:
            return obj.nom or 'Groupe sans nom'
        request = self.context['request']
        other = obj.other_participant(request.user)
        return f'{other.first_name} {other.last_name}' if other else '—'

    def _last_message(self, obj):
        if not hasattr(obj, '_last_message_cache'):
            obj._last_message_cache = obj.messages.order_by('-created_at').first()
        return obj._last_message_cache

    def get_last_message(self, obj):
        last = self._last_message(obj)
        if not last:
            return None
        return {
            'contenu': last.contenu,
            'attachment_type': last.attachment_type or None,
            'auteur_id': last.auteur_id,
            'created_at': last.created_at,
        }

    def get_unread(self, obj):
        request = self.context['request']
        last = self._last_message(obj)
        if not last or last.auteur_id == request.user.id:
            return False
        read = obj.reads.filter(user=request.user).first()
        return read is None or last.created_at > read.last_read_at


class TaskSerializer(serializers.ModelSerializer):
    """Attribution d'une tâche de la banque (TaskTemplate) à une équipe (onglet Attribution des
    tâches). L'équipe est dérivée automatiquement de la ligne budgétaire choisie : elle n'est pas
    saisie directement. Le projet est facultatif — une tâche « transversale » n'en a aucun. La
    tâche est envoyée (statut « envoyee ») au manager de l'équipe, qui doit l'Accepter ou la
    Refuser avant qu'elle apparaisse dans Nouveau staffing pour être répartie entre une ou
    plusieurs personnes (voir TaskAssignmentSerializer et TaskDecisionView)."""
    template_nom = serializers.CharField(source='template.nom', read_only=True)
    template_code = serializers.CharField(source='template.code', read_only=True)
    template_details = serializers.CharField(source='template.details', read_only=True)
    template_priorite_defaut = serializers.CharField(source='template.priorite_defaut', read_only=True)
    project_nom = serializers.CharField(source='project.nom', read_only=True, default=None)
    project_code = serializers.CharField(source='project.code', read_only=True, default=None)
    ligne_budgetaire_nom = serializers.CharField(source='ligne_budgetaire.nom', read_only=True)
    ligne_budgetaire_code = serializers.CharField(source='ligne_budgetaire.code', read_only=True)
    equipe_nom = serializers.CharField(source='equipe.name', read_only=True)
    equipe_code = serializers.CharField(source='equipe.code', read_only=True)
    equipe_manager_nom = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    priorite_display = serializers.CharField(source='get_priorite_display', read_only=True)
    created_by_nom = serializers.SerializerMethodField()
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    budget_ligne_montant = serializers.SerializerMethodField()
    budget_reste_fcfa = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'code', 'template', 'template_nom', 'template_code', 'template_details',
            'template_priorite_defaut',
            'description', 'project', 'project_nom', 'project_code',
            'ligne_budgetaire', 'ligne_budgetaire_nom', 'ligne_budgetaire_code',
            'equipe', 'equipe_nom', 'equipe_code', 'equipe_manager_nom',
            'echeance', 'priorite', 'priorite_display',
            'statut', 'statut_display', 'statut_decide_le',
            'assignments', 'budget_ligne_montant', 'budget_reste_fcfa',
            'actif', 'created_by_nom', 'created_at',
        ]
        read_only_fields = ['id', 'code', 'equipe', 'statut', 'statut_decide_le', 'created_at']

    def get_equipe_manager_nom(self, obj):
        manager = obj.equipe.manager
        return f'{manager.first_name} {manager.last_name}' if manager else None

    def get_created_by_nom(self, obj):
        return f'{obj.created_by.first_name} {obj.created_by.last_name}' if obj.created_by else None

    def _get_project_ligne(self, obj):
        if not obj.project_id:
            return None
        return ProjectLigne.objects.filter(project_id=obj.project_id, ligne_budgetaire_id=obj.ligne_budgetaire_id).first()

    def get_budget_ligne_montant(self, obj):
        project_ligne = self._get_project_ligne(obj)
        return project_ligne.montant if project_ligne else None

    def get_budget_reste_fcfa(self, obj):
        project_ligne = self._get_project_ligne(obj)
        if project_ligne is None:
            return None
        consomme = TaskAssignment.objects.filter(
            task__project_id=obj.project_id, task__ligne_budgetaire_id=obj.ligne_budgetaire_id,
        ).aggregate(total=Sum('montant_fcfa'))['total'] or 0
        return project_ligne.montant - consomme

    def validate_template(self, value):
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette tâche du catalogue n’appartient pas à votre organisation.')
        if not value.actif:
            raise serializers.ValidationError('Cette tâche du catalogue est inactive.')
        return value

    def validate_project(self, value):
        if value is None:
            return value
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Ce projet n’appartient pas à votre organisation.')
        return value

    def validate_ligne_budgetaire(self, value):
        request = self.context['request']
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Cette ligne budgétaire n’appartient pas à votre organisation.')
        return value

    def validate(self, attrs):
        project = attrs.get('project', getattr(self.instance, 'project', None))
        ligne_budgetaire = attrs.get('ligne_budgetaire', getattr(self.instance, 'ligne_budgetaire', None))
        # Tâche non transversale : la ligne budgétaire doit être une ligne effectivement
        # attribuée à ce projet (voir Création de projet, étape 2).
        if project is not None and ligne_budgetaire is not None:
            if not ProjectLigne.objects.filter(project=project, ligne_budgetaire=ligne_budgetaire).exists():
                raise serializers.ValidationError({
                    'ligne_budgetaire': 'Cette ligne budgétaire n’est pas attribuée à ce projet.',
                })
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        organisation = request.user.organisation
        ligne_budgetaire = validated_data['ligne_budgetaire']
        equipe = ligne_budgetaire.equipe
        code = next_task_code(organisation)
        return Task.objects.create(
            organisation=organisation, equipe=equipe, code=code, created_by=request.user, **validated_data
        )

    def update(self, instance, validated_data):
        # `equipe` est dérivée de la ligne budgétaire : si celle-ci change (ex. l'admin corrige
        # l'attribution), l'équipe destinataire doit être recalculée pour rester cohérente.
        ligne_budgetaire = validated_data.get('ligne_budgetaire', instance.ligne_budgetaire)
        instance.equipe = ligne_budgetaire.equipe
        return super().update(instance, validated_data)
