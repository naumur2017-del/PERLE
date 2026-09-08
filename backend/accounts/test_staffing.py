from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    LigneBudgetaire, Organisation, Project, ProjectLigne, Task, TaskAssignment, TaskTemplate, Team, User,
    create_default_teams,
)


class TransversalLigneTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name='Trv', org_type='company', currency_code='EUR')
        self.director = User.objects.create_user(
            email='dir@trv.test', password='x', role='directeur', organisation=self.org,
            first_name='D', last_name='Ir')
        create_default_teams(self.org, self.director)
        self.client.force_authenticate(self.director)

    def test_project_creation_adds_10pct_transversal_ligne_on_ressources(self):
        response = self.client.post('/api/projects/', {
            'nom': 'P1', 'montant': 100000, 'type_montant': 'HT', 'marge_pct': 0,
            'charges_transversales_pct': 0, 'tva_pct': 0, 'ir_pct': 0, 'statut': 'brouillon',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        lignes = response.data['lignes']
        transv = [l for l in lignes if l['is_transversale']]
        self.assertEqual(len(transv), 1)
        self.assertEqual(Decimal(str(transv[0]['montant'])), Decimal('10000.00'))
        self.assertEqual(transv[0]['equipe_code'], 'RES')
        self.assertTrue(transv[0]['montant_auto'])

    def test_montant_resyncs_while_auto(self):
        project = Project.objects.create(organisation=self.org, code='PRJ9', nom='P', montant=100000, statut='brouillon')
        from .models import ensure_project_transversal_ligne
        ensure_project_transversal_ligne(project)
        self.client.patch(f'/api/projects/{project.id}/', {'montant': 200000}, format='json')
        pl = ProjectLigne.objects.get(project=project, is_transversale=True)
        self.assertEqual(pl.montant, Decimal('20000.00'))

    def test_manual_edit_locks_montant_and_blocks_delete(self):
        project = Project.objects.create(organisation=self.org, code='PRJ8', nom='P', montant=100000, statut='brouillon')
        from .models import ensure_project_transversal_ligne
        ensure_project_transversal_ligne(project)
        pl = ProjectLigne.objects.get(project=project, is_transversale=True)
        edit = self.client.patch(f'/api/projects/{project.id}/lignes/{pl.id}/', {'montant': 5000}, format='json')
        self.assertEqual(edit.status_code, 200, edit.data)
        pl.refresh_from_db()
        self.assertFalse(pl.montant_auto)
        # Le montant ne resync plus.
        self.client.patch(f'/api/projects/{project.id}/', {'montant': 300000}, format='json')
        pl.refresh_from_db()
        self.assertEqual(pl.montant, Decimal('5000.00'))
        # Suppression interdite.
        deleted = self.client.delete(f'/api/projects/{project.id}/lignes/{pl.id}/')
        self.assertEqual(deleted.status_code, 400)


class StaffingRulesTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name='Stf', org_type='company', currency_code='EUR')
        self.manager = User.objects.create_user(
            email='m@stf.test', password='x', role='directeur', organisation=self.org, first_name='M', last_name='G')
        self.team = Team.objects.create(organisation=self.org, code='ENG', name='Ingé', manager=self.manager)
        self.worker = User.objects.create_user(
            email='w@stf.test', password='x', role='salarie', organisation=self.org, grade=2,
            first_name='W', last_name='K', team=self.team)
        self.line = LigneBudgetaire.objects.create(organisation=self.org, code='L1', nom='Res', niveau=1, equipe=self.team)
        self.template = TaskTemplate.objects.create(
            organisation=self.org, code='T1', nom='Tâche', equipe=self.team, type_element='tache_elementaire')
        self.task = Task.objects.create(
            organisation=self.org, code='TSK1', template=self.template, ligne_budgetaire=self.line,
            equipe=self.team, statut='acceptee')
        self.client.force_authenticate(self.manager)

    def test_cannot_staff_person_on_leave(self):
        self.worker.statut = 'conge'
        self.worker.save(update_fields=['statut'])
        response = self.client.post('/api/task-assignments/', {
            'task': self.task.id, 'user': self.worker.id, 'heures': 8,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('congé', str(response.data))

    def test_can_staff_active_person(self):
        response = self.client.post('/api/task-assignments/', {
            'task': self.task.id, 'user': self.worker.id, 'heures': 8,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)

    def test_task_accepts_date_debut(self):
        task = Task.objects.create(
            organisation=self.org, code='TSK2', template=self.template, ligne_budgetaire=self.line,
            equipe=self.team, statut='envoyee')
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'date_debut': '2026-09-10', 'echeance': '2026-09-20',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['date_debut'], '2026-09-10')

    def test_task_date_debut_after_echeance_rejected(self):
        task = Task.objects.create(
            organisation=self.org, code='TSK3', template=self.template, ligne_budgetaire=self.line,
            equipe=self.team, statut='envoyee')
        response = self.client.patch(f'/api/tasks/{task.id}/', {
            'date_debut': '2026-09-25', 'echeance': '2026-09-20',
        }, format='json')
        self.assertEqual(response.status_code, 400)
