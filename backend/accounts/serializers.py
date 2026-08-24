from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import Organisation, Team, User


class OrganisationSearchSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()

    class Meta:
        model = Organisation
        fields = ['id', 'name', 'email', 'sector', 'city', 'members']

    def get_members(self, obj):
        return obj.members.count()


class UserSummarySerializer(serializers.ModelSerializer):
    organisation = OrganisationSearchSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'organisation',
            'phone', 'fonction', 'matricule', 'date_naissance', 'pays', 'ville',
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


class TeamSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'code', 'name']


class TeamMemberSerializer(serializers.ModelSerializer):
    is_manager = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'fonction', 'matricule', 'statut', 'is_manager']

    def get_is_manager(self, obj):
        return obj.team_id is not None and obj.team.manager_id == obj.id


class EmployeeSerializer(serializers.ModelSerializer):
    team = TeamSummarySerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'fonction', 'role',
            'matricule', 'date_naissance', 'pays', 'ville', 'statut', 'team', 'date_joined',
        ]


class TeamSerializer(serializers.ModelSerializer):
    manager = TeamMemberSerializer(read_only=True)
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='manager', write_only=True, required=False, allow_null=True,
    )
    members = TeamMemberSerializer(many=True, read_only=True, source='team_members')

    class Meta:
        model = Team
        fields = ['id', 'code', 'name', 'manager', 'manager_id', 'members', 'created_at']
        read_only_fields = ['id', 'code', 'created_at']

    def validate_manager_id(self, value):
        request = self.context['request']
        if value is not None and value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError('Ce manager n’appartient pas à votre organisation.')
        return value

    def create(self, validated_data):
        organisation = self.context['request'].user.organisation
        last = Team.objects.filter(organisation=organisation).order_by('-id').first()
        next_num = int(last.code.replace('EQ-', '')) + 1 if last else 1
        team = Team.objects.create(organisation=organisation, code=f'EQ-{next_num:03d}', **validated_data)
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
