from rest_framework.test import APITestCase

from .models import (
    LigneBudgetaire, Notification, Organisation, Task, TaskAssignment, TaskMessage, Team, User,
)


class TaskMessagesLifecycleTests(APITestCase):
    """Mention automatique : chaque étape clé du cycle de vie d'une tâche (attribution, décision,
    staffing, déstaffage, exécution) doit poser un TaskMessage système (est_systeme=True) dans le
    fil de discussion de la tâche."""

    def setUp(self):
        self.org = Organisation.objects.create(name='TM', org_type='company', currency_code='EUR')
        self.director = User.objects.create_user(
            email='dir@tm.test', password='x', role='directeur', organisation=self.org,
            first_name='Yai', last_name='Mongapse')
        self.manager = User.objects.create_user(
            email='mgr@tm.test', password='x', role='salarie', organisation=self.org,
            first_name='M', last_name='G')
        self.team = Team.objects.create(organisation=self.org, code='BO', name='Back Office', manager=self.manager)
        self.worker = User.objects.create_user(
            email='w@tm.test', password='x', role='salarie', organisation=self.org, grade=2,
            first_name='W', last_name='K', team=self.team)
        self.line = LigneBudgetaire.objects.create(organisation=self.org, code='L1', nom='Res', niveau=1, equipe=self.team)

    def _system_messages(self, task):
        return list(TaskMessage.objects.filter(task=task, est_systeme=True).order_by('id'))

    def _staff(self, task):
        """Crée une TaskAssignment via l'API (en tant que manager) plutôt qu'en base directement,
        pour ne pas avoir à reproduire ici le calcul des snapshots (grade, taux) fait par
        TaskAssignmentSerializer.create()."""
        response = self.client.post('/api/task-assignments/', {
            'task': task.id, 'user': self.worker.id, 'heures': 8,
        }, format='json')
        assert response.status_code == 201, response.data
        TaskMessage.objects.filter(task=task, est_systeme=True).delete()
        return TaskAssignment.objects.get(pk=response.data['id'])

    def test_task_creation_logs_attribution_and_priority(self):
        self.client.force_authenticate(self.director)
        response = self.client.post('/api/tasks/', {
            'description': 'Conception de cahier de charge', 'ligne_budgetaire': self.line.id,
            'echeance': '2026-10-15', 'priorite': 'haute',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        task = Task.objects.get(pk=response.data['id'])

        messages = self._system_messages(task)
        contenus = [m.contenu for m in messages]
        self.assertTrue(any('attribué' in c and 'Back Office' in c for c in contenus))
        self.assertTrue(any('échéance' in c for c in contenus))
        self.assertTrue(any('priorité' in c for c in contenus))
        self.assertTrue(all(m.auteur_id == self.director.id for m in messages))

    def test_task_creation_without_dates_skips_optional_messages(self):
        self.client.force_authenticate(self.director)
        response = self.client.post('/api/tasks/', {
            'description': 'Tâche libre', 'ligne_budgetaire': self.line.id,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        task = Task.objects.get(pk=response.data['id'])

        contenus = [m.contenu for m in self._system_messages(task)]
        self.assertFalse(any('échéance' in c for c in contenus))
        self.assertFalse(any('début' in c for c in contenus))
        self.assertTrue(any('priorité' in c for c in contenus))

    def test_decision_accept_logs_message_and_notifies_creator(self):
        task = Task.objects.create(
            organisation=self.org, code='TSK1', ligne_budgetaire=self.line, equipe=self.team,
            statut='envoyee', created_by=self.director,
        )
        self.client.force_authenticate(self.manager)
        response = self.client.post(f'/api/tasks/{task.id}/decision/', {'decision': 'acceptee'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

        messages = self._system_messages(task)
        self.assertEqual(len(messages), 1)
        self.assertIn('accepté', messages[0].contenu)
        self.assertEqual(messages[0].auteur_id, self.manager.id)
        self.assertTrue(Notification.objects.filter(user=self.director, cible_type='task', cible_id=task.id).exists())

    def test_decision_refuse_logs_message(self):
        task = Task.objects.create(
            organisation=self.org, code='TSK2', ligne_budgetaire=self.line, equipe=self.team,
            statut='envoyee', created_by=self.director,
        )
        self.client.force_authenticate(self.manager)
        response = self.client.post(f'/api/tasks/{task.id}/decision/', {'decision': 'refusee'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

        messages = self._system_messages(task)
        self.assertEqual(len(messages), 1)
        self.assertIn('refusé', messages[0].contenu)

    def test_staffing_logs_message(self):
        task = Task.objects.create(
            organisation=self.org, code='TSK3', ligne_budgetaire=self.line, equipe=self.team, statut='acceptee',
        )
        self.client.force_authenticate(self.manager)
        response = self.client.post('/api/task-assignments/', {
            'task': task.id, 'user': self.worker.id, 'heures': 8,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)

        messages = self._system_messages(task)
        self.assertEqual(len(messages), 1)
        self.assertIn('W K', messages[0].contenu)
        self.assertIn('8', messages[0].contenu)

    def test_destaffing_logs_message_and_notifies_removed_person(self):
        task = Task.objects.create(
            organisation=self.org, code='TSK4', ligne_budgetaire=self.line, equipe=self.team, statut='acceptee',
        )
        self.client.force_authenticate(self.manager)
        assignment = self._staff(task)
        response = self.client.delete(f'/api/task-assignments/{assignment.id}/')
        self.assertEqual(response.status_code, 204)

        messages = self._system_messages(task)
        self.assertEqual(len(messages), 1)
        self.assertIn('retiré', messages[0].contenu)
        self.assertIn('W K', messages[0].contenu)
        self.assertTrue(Notification.objects.filter(user=self.worker, cible_type='task', cible_id=task.id).exists())

    def test_execution_actions_log_messages(self):
        task = Task.objects.create(
            organisation=self.org, code='TSK5', ligne_budgetaire=self.line, equipe=self.team, statut='acceptee',
        )
        self.client.force_authenticate(self.manager)
        assignment = self._staff(task)
        self.client.force_authenticate(self.worker)

        response = self.client.post(f'/api/task-assignments/{assignment.id}/execution/', {'action': 'demarrer'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.post(f'/api/task-assignments/{assignment.id}/execution/', {'action': 'pause'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.post(f'/api/task-assignments/{assignment.id}/execution/', {'action': 'reprendre'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.post(f'/api/task-assignments/{assignment.id}/execution/', {'action': 'terminer'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

        contenus = [m.contenu for m in self._system_messages(task)]
        self.assertEqual(len(contenus), 4)
        self.assertIn('a démarré la tâche.', contenus)
        self.assertIn('a mis en pause la tâche.', contenus)
        self.assertIn('a repris la tâche.', contenus)
        self.assertIn('a terminé la tâche.', contenus)

    def test_decline_logs_message(self):
        task = Task.objects.create(
            organisation=self.org, code='TSK6', ligne_budgetaire=self.line, equipe=self.team, statut='acceptee',
        )
        self.client.force_authenticate(self.manager)
        assignment = self._staff(task)
        self.client.force_authenticate(self.worker)
        response = self.client.post(f'/api/task-assignments/{assignment.id}/execution/', {'action': 'decliner'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

        messages = self._system_messages(task)
        self.assertEqual(len(messages), 1)
        self.assertIn('a décliné la tâche.', messages[0].contenu)
