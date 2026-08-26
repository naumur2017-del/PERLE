from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Organisation, Team, User


class EmployeeCreationTests(APITestCase):
    def setUp(self):
        self.organisation = Organisation.objects.create(
            name='PERLE Test', org_type='company', sector='Conseil', email='contact@perle.test',
            phone='+237600000000', country='Cameroun', city='Douala',
        )
        self.director = User.objects.create_user(
            email='direction@perle.test', password='DirectorPass!42', first_name='Direction',
            last_name='Test', role='directeur', organisation=self.organisation,
        )
        token = Token.objects.create(user=self.director)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.url = '/api/employees/'

    def test_director_can_create_employee_in_own_organisation(self):
        response = self.client.post(self.url, {
            'first_name': 'Amina',
            'last_name': 'Njoya',
            'email': 'amina@perle.test',
            'password': 'EmployeePass!42',
            'phone': '+237611111111',
            'fonction': 'Analyste',
            'grade': 2,
            'date_embauche': '2026-08-26',
            'type_contrat': 'cdi',
            'temps_travail': 'temps_plein',
            'competences_principales': 'Excel, Power BI',
            'banque': 'BICEC',
        }, format='multipart')

        self.assertEqual(response.status_code, 201, response.data)
        employee = User.objects.get(email='amina@perle.test')
        self.assertEqual(employee.organisation, self.organisation)
        self.assertEqual(employee.role, 'salarie')
        self.assertTrue(employee.check_password('EmployeePass!42'))
        self.assertNotIn('password', response.data)

    def test_employee_cannot_create_another_employee(self):
        employee = User.objects.create_user(
            email='employee@perle.test', password='EmployeePass!42', first_name='Simple',
            last_name='Employe', role='salarie', organisation=self.organisation,
        )
        token = Token.objects.create(user=employee)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.post(self.url, {
            'first_name': 'Another', 'last_name': 'Employee', 'email': 'another@perle.test',
            'password': 'EmployeePass!43',
        }, format='multipart')

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(email='another@perle.test').exists())

    def test_team_must_belong_to_directors_organisation(self):
        other_organisation = Organisation.objects.create(
            name='Autre', org_type='company', sector='Tech', email='other@perle.test',
            phone='+237622222222', country='Cameroun', city='Yaoundé',
        )
        other_team = Team.objects.create(organisation=other_organisation, code='EQ-001', name='Externe')

        response = self.client.post(self.url, {
            'first_name': 'Amina', 'last_name': 'Njoya', 'email': 'amina@perle.test',
            'password': 'EmployeePass!42', 'team_id': other_team.id,
        }, format='multipart')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='amina@perle.test').exists())
