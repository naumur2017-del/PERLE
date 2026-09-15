from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Organisation, User, next_matricule


class NextMatriculeTests(APITestCase):
    """<3 initiales de l'organisation>-<année de la date d'embauche>-<NNN>, ex. NAU-2026-001."""

    def setUp(self):
        self.org = Organisation.objects.create(
            name='Naumur SARL', org_type='company', sector='Conseil', email='c@naumur.test',
            phone='+237600000000', country='Cameroun', city='Douala',
        )

    def test_format_and_initials(self):
        self.assertEqual(next_matricule(self.org, None), 'NAU-2026-001')

    def test_year_comes_from_date_embauche(self):
        from datetime import date
        self.assertEqual(next_matricule(self.org, date(2025, 1, 10)), 'NAU-2025-001')

    def test_increments_per_organisation_and_year(self):
        from datetime import date
        User.objects.create_user(
            email='a@naumur.test', password='x', organisation=self.org,
            first_name='A', last_name='A', matricule='NAU-2026-001',
        )
        self.assertEqual(next_matricule(self.org, date(2026, 3, 1)), 'NAU-2026-002')
        # Une année différente reprend à 001, indépendamment du nombre d'employés déjà créés.
        self.assertEqual(next_matricule(self.org, date(2027, 1, 1)), 'NAU-2027-001')

    def test_scoped_per_organisation(self):
        other = Organisation.objects.create(
            name='Pilote Corp', org_type='company', sector='Tech', email='c@pilote.test',
            phone='+237611111111', country='Cameroun', city='Yaoundé',
        )
        User.objects.create_user(
            email='a@naumur.test', password='x', organisation=self.org,
            first_name='A', last_name='A', matricule='NAU-2026-001',
        )
        self.assertEqual(next_matricule(other, None), 'PIL-2026-001')


class EmployeeMatriculeEndpointTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(
            name='Naumur SARL', org_type='company', sector='Conseil', email='c@naumur.test',
            phone='+237600000000', country='Cameroun', city='Douala',
        )
        self.director = User.objects.create_user(
            email='dir@naumur.test', password='DirectorPass!42', first_name='D', last_name='I',
            role='directeur', organisation=self.org,
        )
        token = Token.objects.create(user=self.director)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_matricule_is_auto_generated_and_manual_input_ignored(self):
        response = self.client.post('/api/employees/', {
            'first_name': 'Amina', 'last_name': 'Njoya', 'email': 'amina@naumur.test',
            'password': 'EmployeePass!42', 'date_embauche': '2026-08-26',
            'matricule': 'JE-CHOISIS-MOI-MEME',
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['matricule'], 'NAU-2026-001')

    def test_matricule_increments_for_second_employee_same_year(self):
        self.client.post('/api/employees/', {
            'first_name': 'Amina', 'last_name': 'Njoya', 'email': 'amina@naumur.test',
            'password': 'EmployeePass!42', 'date_embauche': '2026-08-26',
        }, format='multipart')
        response = self.client.post('/api/employees/', {
            'first_name': 'Bello', 'last_name': 'Tanko', 'email': 'bello@naumur.test',
            'password': 'EmployeePass!42', 'date_embauche': '2026-09-01',
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['matricule'], 'NAU-2026-002')

    def test_admin_can_edit_matricule_after_creation(self):
        created = self.client.post('/api/employees/', {
            'first_name': 'Amina', 'last_name': 'Njoya', 'email': 'amina@naumur.test',
            'password': 'EmployeePass!42', 'date_embauche': '2026-08-26',
        }, format='multipart').data
        response = self.client.patch(f"/api/employees/{created['id']}/edit/", {'matricule': 'NAU-2026-999'}, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['matricule'], 'NAU-2026-999')

    def test_employee_cannot_edit_own_matricule(self):
        created = self.client.post('/api/employees/', {
            'first_name': 'Amina', 'last_name': 'Njoya', 'email': 'amina@naumur.test',
            'password': 'EmployeePass!42', 'date_embauche': '2026-08-26',
        }, format='multipart').data
        employee = User.objects.get(pk=created['id'])
        token = Token.objects.create(user=employee)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.patch('/api/employees/me/', {'matricule': 'HACKED-000'}, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        employee.refresh_from_db()
        self.assertEqual(employee.matricule, 'NAU-2026-001')

    def test_region_and_ville_are_distinct_fields(self):
        response = self.client.post('/api/employees/', {
            'first_name': 'Amina', 'last_name': 'Njoya', 'email': 'amina@naumur.test',
            'password': 'EmployeePass!42', 'pays': 'Cameroun', 'region': 'Littoral', 'ville': 'Douala',
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['region'], 'Littoral')
        self.assertEqual(response.data['ville'], 'Douala')


class RegisterMemberMatriculeTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(
            name='Naumur SARL', org_type='company', sector='Conseil', email='c@naumur.test',
            phone='+237600000000', country='Cameroun', city='Douala',
        )

    def test_member_registration_gets_auto_matricule_and_region_ville(self):
        response = self.client.post('/api/organisations/register/member/', {
            'organisation': self.org.id, 'first_name': 'Amina', 'last_name': 'Njoya',
            'email': 'amina@naumur.test', 'password': 'EmployeePass!42', 'fonction': 'Analyste',
            'date_naissance': '1995-05-05', 'pays': 'Cameroun', 'region': 'Littoral', 'ville': 'Douala',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['user']['matricule'], 'NAU-2026-001')
        self.assertEqual(response.data['user']['region'], 'Littoral')
        self.assertEqual(response.data['user']['ville'], 'Douala')
