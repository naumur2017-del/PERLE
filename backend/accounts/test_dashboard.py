from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    LigneBudgetaire, Organisation, Project, Task, TaskAssignment, TaskTemplate, Team, User,
)


class DashboardTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name='Dash', org_type='company', currency_code='EUR')
        self.other_org = Organisation.objects.create(name='Autre', org_type='company')
        self.director = User.objects.create_user(
            email='dir@dash.test', password='x', role='directeur', organisation=self.org)
        self.manager = User.objects.create_user(
            email='mgr@dash.test', password='x', role='salarie', organisation=self.org,
            first_name='Mina', last_name='Kere')
        self.worker = User.objects.create_user(
            email='wrk@dash.test', password='x', role='salarie', organisation=self.org, grade=3,
            first_name='Yao', last_name='Ndong')
        self.outsider = User.objects.create_user(
            email='out@dash.test', password='x', role='salarie', organisation=self.other_org)

        self.team = Team.objects.create(organisation=self.org, code='ENG', name='Ingénierie', manager=self.manager)
        self.worker.team = self.team
        self.worker.save(update_fields=['team'])

        self.project = Project.objects.create(
            organisation=self.org, code='PRJ1', nom='Refonte', montant=100000, marge_pct=20,
            statut='definitif', date_debut=timezone.localdate() - timedelta(days=20),
            date_fin=timezone.localdate() + timedelta(days=30))
        self.line = LigneBudgetaire.objects.create(
            organisation=self.org, code='L1', nom='Ressources', niveau=1, equipe=self.team)
        self.template = TaskTemplate.objects.create(
            organisation=self.org, code='TPL1', nom='Analyse', equipe=self.team, type_element='tache_elementaire')
        self.task = Task.objects.create(
            organisation=self.org, code='TSK1', template=self.template, project=self.project,
            ligne_budgetaire=self.line, equipe=self.team, statut='acceptee',
            echeance=timezone.localdate() + timedelta(days=10))
        self.assignment = TaskAssignment.objects.create(
            task=self.task, user=self.worker, heures=40, grade_snapshot=3, taux_snapshot=150,
            ehs_consomme=120, montant_fcfa=18000, execution_statut='en_cours')

    # --- direction ------------------------------------------------------
    def test_direction_ok_for_director(self):
        self.client.force_authenticate(self.director)
        response = self.client.get('/api/dashboard/direction/?period=year')
        self.assertEqual(response.status_code, 200, response.data)
        body = response.data
        self.assertEqual(body['currency_code'], 'EUR')
        self.assertEqual(body['kpi']['active_projects'], 1)
        self.assertTrue(any(p['code'] == 'PRJ1' for p in body['projects']))
        self.assertTrue(any(t['label'] == 'Ingénierie' for t in body['team_load']))
        for key in ('finance', 'cash', 'deliverables', 'budget_by_nature', 'ehs', 'alerts'):
            self.assertIn(key, body)

    def test_direction_forbidden_for_employee(self):
        self.client.force_authenticate(self.worker)
        response = self.client.get('/api/dashboard/direction/')
        self.assertEqual(response.status_code, 403)

    def test_direction_periods(self):
        self.client.force_authenticate(self.director)
        for period in ('month', 'quarter', 'year'):
            response = self.client.get(f'/api/dashboard/direction/?period={period}')
            self.assertEqual(response.status_code, 200, period)

    # --- manager -------------------------------------------------------
    def test_manager_ok_for_team_manager(self):
        self.client.force_authenticate(self.manager)
        response = self.client.get('/api/dashboard/manager/')
        self.assertEqual(response.status_code, 200, response.data)
        body = response.data
        self.assertEqual(body['team']['code'], 'ENG')
        self.assertEqual(body['kpi']['active_tasks'], 1)
        self.assertTrue(any(m['name'].strip() for m in body['members']))
        self.assertTrue(any(p['code'] == 'PRJ1' for p in body['projects']))
        self.assertEqual(len(body['tasks_trend']), 7)

    def test_manager_forbidden_for_non_manager(self):
        self.client.force_authenticate(self.worker)
        response = self.client.get('/api/dashboard/manager/')
        self.assertEqual(response.status_code, 403)

    # --- session exposes managed_teams -------------------------------
    def test_login_exposes_managed_teams(self):
        response = self.client.post('/api/auth/login/', {'email': 'mgr@dash.test', 'password': 'x'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([t['code'] for t in response.data['user']['managed_teams']], ['ENG'])
        response = self.client.post('/api/auth/login/', {'email': 'wrk@dash.test', 'password': 'x'}, format='json')
        self.assertEqual(response.data['user']['managed_teams'], [])
