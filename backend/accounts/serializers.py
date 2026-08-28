from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import (
    AffectationHistory,
    AvanceDemande,
    CongeDemande,
    CongeType,
    FermetureTechnique,
    GradeHistory,
    Organisation,
    Team,
    User,
    create_default_conge_types,
    create_default_teams,
)


class OrganisationSearchSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = ['id', 'name', 'email', 'sector', 'city', 'members']

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
            'phone', 'fonction', 'matricule', 'date_naissance', 'pays', 'ville', 'team',
        ]


class RegisterPersonalOrganisationSerializer(serializers.Serializer):
    organisation_name = serializers.CharField(max_length=200)
    sector = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=30)
    country = serializers.CharField(max_length=100)
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
            city=validated_data['city'],
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
            city=validated_data['city'],
            address=validated_data['address'],
            website=validated_data.get('website', ''),
            registration_number=validated_data['registration_number'],
            headcount=validated_data['headcount'],
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
        fields = ['id', 'first_name', 'last_name', 'email', 'fonction', 'matricule', 'statut', 'is_manager']

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

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'fonction', 'role',
            'matricule', 'date_naissance', 'pays', 'ville', 'statut', 'grade', 'is_active',
            'team', 'date_joined', 'date_embauche',
            'profile_photo', 'cni_document', 'autre_piece_document', 'cv_document', 'contrat_document',
            'type_contrat', 'periode_essai', 'temps_travail',
            'competences_principales', 'competences_secondaires',
            'cnps', 'contribuable', 'banque', 'compte_bancaire', 'groupe_sanguin',
            'contact_urgence_nom', 'contact_urgence_telephone', 'assurance_sante',
            'grade_history', 'affectation_history',
        ]


class EmployeeCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    team_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), source='team', required=False, allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 'password', 'phone', 'fonction',
            'matricule', 'date_naissance', 'pays', 'ville', 'statut', 'grade', 'team_id',
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
            'matricule', 'date_naissance', 'pays', 'ville', 'statut', 'grade', 'team_id',
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
            'date_naissance', 'pays', 'ville', 'statut', 'grade', 'role', 'organisation', 'team',
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


class TeamSerializer(serializers.ModelSerializer):
    manager = TeamMemberSerializer(read_only=True)
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='manager', write_only=True, required=False, allow_null=True,
    )
    members = TeamMemberSerializer(many=True, read_only=True, source='team_members')

    class Meta:
        model = Team
        fields = ['id', 'code', 'name', 'manager', 'manager_id', 'members', 'niveau', 'is_protected', 'created_at']
        read_only_fields = ['id', 'code', 'is_protected', 'created_at']

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

    def create(self, validated_data):
        organisation = self.context['request'].user.organisation
        last = Team.objects.filter(organisation=organisation, code__startswith='EQ-').order_by('-id').first()
        next_num = int(last.code.replace('EQ-', '')) + 1 if last else 1
        validated_data.pop('niveau', None)
        team = Team.objects.create(organisation=organisation, code=f'EQ-{next_num:03d}', niveau=4, **validated_data)
        manager = validated_data.get('manager')
        if manager is not None:
            manager.move_to_team(team)
        return team

    def update(self, instance, validated_data):
        manager = validated_data.get('manager', instance.manager)
        team = super().update(instance, validated_data)
        if manager is not None and manager.team_id != team.id:
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


class AvanceDemandeReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvanceDemande
        fields = ['id', 'statut']
        read_only_fields = ['id']

    def validate_statut(self, value):
        if value not in ('approuvee', 'refusee'):
            raise serializers.ValidationError('Le statut doit être « approuvée » ou « refusée ».')
        return value
