import tempfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import (
    CompteTresorerie, DemandePaiement, LigneBudgetaire, MouvementTresorerie, Notification, Organisation, Project,
    ProjectLigne, Team, User,
)


def preuve(nom='preuve.pdf', contenu=b'%PDF-1.4 test', content_type='application/pdf'):
    return SimpleUploadedFile(nom, contenu, content_type=content_type)


class PaiementTests(APITestCase):
    """Circuit d'une ordonnance : un manager (ou les Ressources) la soumet, la Direction la valide
    ou la refuse avec un motif, puis les Ressources l'exécutent en joignant le justificatif."""

    def setUp(self):
        self.org = Organisation.objects.create(name='Paiements', org_type='company', currency_code='EUR')
        self.other_org = Organisation.objects.create(name='Autre', org_type='company')
        self.director = User.objects.create_user(email='director@payments.test', password='test', role='directeur', organisation=self.org)
        self.manager = User.objects.create_user(email='manager@payments.test', password='test', role='salarie', organisation=self.org)
        self.other_manager = User.objects.create_user(email='manager2@payments.test', password='test', role='salarie', organisation=self.org)
        # Un salarié sans équipe ni management : aucune visibilité sur la trésorerie.
        self.stranger = User.objects.create_user(email='stranger@payments.test', password='test', role='salarie', organisation=self.org)
        self.outsider = User.objects.create_user(email='outsider@payments.test', password='test', role='directeur', organisation=self.other_org)
        ressources_team = Team.objects.create(organisation=self.org, code='RES', name='Ressources', niveau=3, is_protected=True)
        self.ressources = User.objects.create_user(email='res@payments.test', password='test', role='salarie', organisation=self.org, team=ressources_team)
        team = Team.objects.create(organisation=self.org, code='T1', name='Finance', manager=self.manager)
        Team.objects.create(organisation=self.org, code='T2', name='Achats', manager=self.other_manager)
        self.manager.team = team
        self.manager.save(update_fields=['team'])
        self.project = Project.objects.create(organisation=self.org, code='PRJ1', nom='Projet')
        self.line = LigneBudgetaire.objects.create(organisation=self.org, code='L1', nom='Achats', niveau=1, equipe=team)
        ProjectLigne.objects.create(project=self.project, ligne_budgetaire=self.line, code='PL1')
        self.compte = CompteTresorerie.objects.create(organisation=self.org, nom='BICEC', code='521100', solde_initial=1000)
        self.data = dict(projet=self.project.pk, ligne_budgetaire=self.line.pk, fournisseur='Fournisseur',
                         montant=150.25, type_depense='Non Transversal', date_depense='2026-09-08', objet='Achat', statut='attente',
                         compte=self.compte.pk)

    def submit(self, user=None, **overrides):
        self.client.force_authenticate(user or self.manager)
        response = self.client.post('/api/paiements/', {**self.data, **overrides}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def validate(self, pk, decision='accepte', motif='', user=None):
        self.client.force_authenticate(user or self.director)
        return self.client.post(f'/api/paiements/{pk}/validation/', {'decision': decision, 'motif': motif}, format='json')

    def execute(self, pk, user=None, **overrides):
        self.client.force_authenticate(user or self.ressources)
        data = {'fichier': preuve(), 'mode_paiement': 'Virement bancaire', 'commentaire': 'Payé', **overrides}
        return self.client.post(f'/api/paiements/{pk}/execution/', data, format='multipart')

    def alertes(self, user, cible_type):
        return list(Notification.objects.filter(user=user, cible_type=cible_type).values_list('message', flat=True))

    def test_full_workflow_with_alerts_at_each_step(self):
        # 1. Le manager prépare un brouillon puis le soumet : la Direction est alertée.
        self.client.force_authenticate(self.manager)
        response = self.client.post('/api/paiements/', {}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        pk = response.data['id']
        url = f'/api/paiements/{pk}/'
        self.assertEqual(self.alertes(self.director, 'paiement_validation'), [])
        response = self.client.patch(url, self.data, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['statut'], 'attente')
        self.assertEqual(response.data['devise'], 'EUR')
        self.assertEqual(len(self.alertes(self.director, 'paiement_validation')), 1)
        # Soumise : elle n'est plus en exécution tant que la Direction ne l'a pas validée.
        self.assertEqual(self.execute(pk).status_code, 400)

        # 2. La Direction valide : le manager et les Ressources sont alertés.
        response = self.validate(pk)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['statut'], 'valide')
        self.assertEqual(response.data['valide_par_nom'], '')  # directeur de test sans nom
        self.assertIsNotNone(response.data['valide_le'])
        self.assertEqual(len(self.alertes(self.manager, 'paiement')), 1)
        self.assertEqual(len(self.alertes(self.ressources, 'paiement_execution')), 1)
        self.assertEqual(self.validate(pk).status_code, 400)  # plus en attente de validation

        # 3. Les Ressources exécutent avec le justificatif : compte débité, journal alimenté, alertes.
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            response = self.execute(pk)
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data['statut'], 'execute')
            self.assertEqual(response.data['mode_paiement'], 'Virement bancaire')
            payment = DemandePaiement.objects.get(pk=pk)
            self.assertEqual(payment.decided_by, self.ressources)
            self.assertIsNotNone(payment.decided_at)
            movement = MouvementTresorerie.objects.get(demande=payment)
            self.assertEqual(movement.type_mouvement, 'Sortie')
            self.assertEqual(movement.executeur, self.ressources)
            self.assertEqual(self.execute(pk).status_code, 400)  # déjà exécutée
            # Le manager télécharge le justificatif depuis son historique.
            self.client.force_authenticate(self.manager)
            download = self.client.get(url + 'justificatif/')
            self.assertEqual(download.status_code, 200)
            self.assertEqual(b''.join(download.streaming_content), b'%PDF-1.4 test')
            download.close()
            self.assertEqual(len(list(Path(media).rglob('*.pdf'))), 1)
        self.assertEqual(len(self.alertes(self.manager, 'paiement')), 2)
        self.assertEqual(len(self.alertes(self.director, 'paiement_execute')), 1)
        # Personne n'est alerté de sa propre action.
        self.assertEqual(self.alertes(self.ressources, 'paiement_execute'), [])

        # 4. Le manager suit l'évolution dans son historique.
        self.client.force_authenticate(self.manager)
        mine = self.client.get('/api/paiements/').data
        self.assertEqual([(p['id'], p['statut']) for p in mine], [(pk, 'execute')])
        self.assertEqual(self.client.patch(url, {'montant': 1}).status_code, 400)
        self.assertEqual(self.client.delete(url).status_code, 400)

    def test_refusal_requires_a_reason_and_notifies_the_requester(self):
        payment = self.submit()
        self.assertEqual(self.validate(payment['id'], 'refuse').status_code, 400)
        self.assertEqual(self.validate(payment['id'], 'refuse', '   ').status_code, 400)
        response = self.validate(payment['id'], 'refuse', 'Facture incorrecte')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['statut'], 'refuse')
        self.assertEqual(response.data['motif_refus'], 'Facture incorrecte')
        [alerte] = self.alertes(self.manager, 'paiement')
        self.assertIn('Facture incorrecte', alerte)
        self.assertEqual(self.alertes(self.ressources, 'paiement_execution'), [])
        self.assertEqual(self.execute(payment['id']).status_code, 400)

    def test_roles_in_the_workflow(self):
        payment = self.submit()
        pk = payment['id']
        # Ni le manager ni les Ressources ne valident ; la Direction n'établit ni n'exécute.
        self.assertEqual(self.validate(pk, user=self.manager).status_code, 403)
        self.assertEqual(self.validate(pk, user=self.ressources).status_code, 403)
        self.client.force_authenticate(self.director)
        self.assertEqual(self.client.post('/api/paiements/', self.data, format='json').status_code, 403)
        self.assertEqual(self.validate(pk).status_code, 200)
        self.assertEqual(self.execute(pk, user=self.director).status_code, 403)
        self.assertEqual(self.execute(pk, user=self.manager).status_code, 403)
        self.assertEqual(self.execute(pk).status_code, 200)
        # Les Ressources établissent aussi des ordonnances.
        self.submit(user=self.ressources)
        # Un salarié sans équipe ni management ne voit pas du tout la trésorerie.
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get('/api/paiements/').status_code, 403)
        self.assertEqual(self.client.post('/api/paiements/', self.data, format='json').status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/paiements/').status_code, 401)

    def test_visibility_and_draft_ownership(self):
        submitted = self.submit()
        draft = self.submit(statut='brouillon')
        other = self.submit(user=self.other_manager)
        # Un manager ne voit que ses propres ordonnances.
        self.client.force_authenticate(self.other_manager)
        self.assertEqual([p['id'] for p in self.client.get('/api/paiements/').data], [other['id']])
        self.assertEqual(self.client.get(f"/api/paiements/{submitted['id']}/").status_code, 404)
        # La Direction et les Ressources voient toutes les ordonnances soumises, pas les brouillons des autres.
        for user in (self.director, self.ressources):
            self.client.force_authenticate(user)
            ids = {p['id'] for p in self.client.get('/api/paiements/').data}
            self.assertEqual(ids, {submitted['id'], other['id']})
        # Seul l'auteur modifie ou supprime son brouillon.
        self.client.force_authenticate(self.manager)
        url = f"/api/paiements/{draft['id']}/"
        self.assertEqual(self.client.patch(url, {'commentaires': 'Modifié'}).status_code, 200)
        self.assertEqual(self.validate(draft['id']).status_code, 404)  # brouillon invisible pour la Direction
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(DemandePaiement.objects.filter(pk=draft['id']).exists())

    def test_validation_and_organisation_isolation(self):
        self.client.force_authenticate(self.manager)
        for overrides in ({'montant': 0}, {'montant': -1}, {'objet': ' '}, {'statut': 'execute'}, {'statut': 'valide'}, {'date_depense': None}):
            response = self.client.post('/api/paiements/', {**self.data, **overrides}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        foreign = Project.objects.create(organisation=self.other_org, code='OTHER', nom='Autre')
        self.assertEqual(self.client.post('/api/paiements/', {**self.data, 'projet': foreign.pk}, format='json').status_code, 400)
        unlinked = Project.objects.create(organisation=self.org, code='UNLINKED', nom='Sans ligne')
        self.assertEqual(self.client.post('/api/paiements/', {**self.data, 'projet': unlinked.pk}, format='json').status_code, 400)
        payment = self.submit()
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.post('/api/paiements/', self.data, format='json').status_code, 403)
        self.assertEqual(self.client.get('/api/paiements/').data, [])
        url = f"/api/paiements/{payment['id']}/"
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.validate(payment['id'], user=self.outsider).status_code, 404)

    def test_transversal_ignores_project_and_line(self):
        self.client.force_authenticate(self.manager)
        # Une dépense transversale ne requiert ni projet ni ligne budgétaire...
        response = self.client.post('/api/paiements/', {
            **self.data, 'type_depense': 'Transversal', 'projet': None, 'ligne_budgetaire': None,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data['projet'])
        self.assertIsNone(response.data['ligne_budgetaire'])

        # ...et même si un projet/une ligne est quand même envoyé, le serveur les ignore (defense
        # contre un appel API direct qui contournerait le formulaire).
        response = self.client.post('/api/paiements/', {**self.data, 'type_depense': 'Transversal'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data['projet'])
        self.assertIsNone(response.data['ligne_budgetaire'])

        # Une dépense non transversale, elle, continue d'exiger le projet et la ligne budgétaire.
        response = self.client.post('/api/paiements/', {**self.data, 'projet': None, 'ligne_budgetaire': None}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('projet', response.data)
        self.assertIn('ligne_budgetaire', response.data)

    def test_execution_requires_justificatif_and_valid_file(self):
        payment = self.submit()
        self.validate(payment['id'])
        self.client.force_authenticate(self.ressources)
        response = self.client.post(f"/api/paiements/{payment['id']}/execution/", {'mode_paiement': 'Espèces'}, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('fichier', response.data)
        response = self.execute(payment['id'], fichier=preuve('script.html', b'<script/>', 'text/html'))
        self.assertEqual(response.status_code, 400)
        response = self.execute(payment['id'], mode_paiement='')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(DemandePaiement.objects.get(pk=payment['id']).statut, 'valide')
        self.assertFalse(MouvementTresorerie.objects.exists())
