from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import MembershipRequest, Organisation, User


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
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'organisation']


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


class MembershipRequestSerializer(serializers.ModelSerializer):
    organisation = serializers.PrimaryKeyRelatedField(queryset=Organisation.objects.all())

    class Meta:
        model = MembershipRequest
        fields = [
            'id', 'organisation', 'first_name', 'last_name', 'email', 'password',
            'fonction', 'matricule', 'date_naissance', 'pays', 'ville', 'status',
        ]
        read_only_fields = ['id', 'status']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return MembershipRequest.objects.create(**validated_data)


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
