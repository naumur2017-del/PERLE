import tempfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import DemandePaiement, LigneBudgetaire, Organisation, Project, ProjectLigne, Team, User


class PaiementTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name='Paiements', org_type='company', currency_code='EUR')
        self.other_org = Organisation.objects.create(name='Autre', org_type='company')
        self.director = User.objects.create_user(email='director@payments.test', password='test', role='directeur', organisation=self.org)
        self.employee = User.objects.create_user(email='employee@payments.test', password='test', role='salarie', organisation=self.org)
        self.outsider = User.objects.create_user(email='outsider@payments.test', password='test', role='directeur', organisation=self.other_org)
        self.client.force_authenticate(self.director)
        team = Team.objects.create(organisation=self.org, code='T1', name='Finance')
        self.project = Project.objects.create(organisation=self.org, code='PRJ1', nom='Projet')
        self.line = LigneBudgetaire.objects.create(organisation=self.org, code='L1', nom='Achats', niveau=1, equipe=team)
        ProjectLigne.objects.create(project=self.project, ligne_budgetaire=self.line, code='PL1')
        self.data = dict(projet=self.project.pk, ligne_budgetaire=self.line.pk, fournisseur='Fournisseur',
                         montant=150.25, type_depense='Non Transversal', date_depense='2026-09-08', objet='Achat', statut='attente')

    def create_payment(self, **overrides):
        response = self.client.post('/api/paiements/', {**self.data, **overrides}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_draft_submit_execute_and_download(self):
        response = self.client.post('/api/paiements/', {}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        pk = response.data['id']
        url = f'/api/paiements/{pk}/'
        response = self.client.patch(url, self.data, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['devise'], 'EUR')
        self.assertEqual(response.data['statut'], 'attente')
        self.assertTrue(response.data['numero'].startswith('DP-'))
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            response = self.client.post(url + 'decision/', {
                'decision': 'accepte', 'commentaire': 'Payé', 'mode_paiement': 'Virement bancaire',
                'fichier': SimpleUploadedFile('preuve.pdf', b'%PDF-1.4 test', content_type='application/pdf'),
            }, format='multipart')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data['statut'], 'execute')
            payment = DemandePaiement.objects.get(pk=pk)
            self.assertEqual(payment.decided_by, self.director)
            self.assertIsNotNone(payment.decided_at)
            download = self.client.get(url + 'justificatif/')
            self.assertEqual(download.status_code, 200)
            self.assertEqual(b''.join(download.streaming_content), b'%PDF-1.4 test')
            download.close()
            response = self.client.post(url + 'decision/', {'decision': 'refuse', 'commentaire': 'Deuxième décision'}, format='json')
            self.assertEqual(response.status_code, 400)
            self.assertEqual(len(list(Path(media).rglob('*.pdf'))), 1)
        self.assertEqual(self.client.patch(url, {'montant': 1}).status_code, 400)
        self.assertEqual(self.client.delete(url).status_code, 400)
        self.assertEqual(self.client.get('/api/paiements/').data[0]['statut'], 'execute')

    def test_refusal_and_required_execution_details(self):
        payment = self.create_payment()
        url = f"/api/paiements/{payment['id']}/decision/"
        self.assertEqual(self.client.post(url, {'decision': 'accepte'}).status_code, 400)
        self.assertEqual(self.client.post(url, {'decision': 'accepte', 'commentaire': 'OK'}).status_code, 400)
        response = self.client.post(url, {'decision': 'refuse', 'commentaire': 'Facture incorrecte'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['statut'], 'refuse')

    def test_validation_and_organisation_isolation(self):
        for overrides in ({'montant': 0}, {'montant': -1}, {'objet': ' '}, {'statut': 'execute'}, {'date_depense': None}):
            response = self.client.post('/api/paiements/', {**self.data, **overrides}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        foreign = Project.objects.create(organisation=self.other_org, code='OTHER', nom='Autre')
        self.assertEqual(self.client.post('/api/paiements/', {**self.data, 'projet': foreign.pk}, format='json').status_code, 400)
        unlinked = Project.objects.create(organisation=self.org, code='UNLINKED', nom='Sans ligne')
        self.assertEqual(self.client.post('/api/paiements/', {**self.data, 'projet': unlinked.pk}, format='json').status_code, 400)
        payment = self.create_payment()
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get('/api/paiements/').data, [])
        url = f"/api/paiements/{payment['id']}/"
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {}).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.assertEqual(self.client.post(url + 'decision/', {'decision': 'refuse', 'commentaire': 'Non'}).status_code, 404)

    def test_draft_edit_delete_and_permissions(self):
        payment = self.create_payment(statut='brouillon')
        url = f"/api/paiements/{payment['id']}/"
        self.assertEqual(self.client.patch(url, {'commentaires': 'Modifié'}).status_code, 200)
        self.assertEqual(self.client.post(url + 'decision/', {'decision': 'refuse', 'commentaire': 'Non'}).status_code, 400)
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.get('/api/paiements/').data, [])
        own = self.create_payment()
        self.assertEqual(self.client.post(f"/api/paiements/{own['id']}/decision/", {'decision': 'refuse', 'commentaire': 'Non'}).status_code, 403)
        self.client.force_authenticate(self.director)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(DemandePaiement.objects.filter(pk=payment['id']).exists())
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/paiements/').status_code, 401)

    def test_transversal_ignores_project_and_line(self):
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

    def test_invalid_upload_leaves_payment_pending(self):
        payment = self.create_payment()
        response = self.client.post(f"/api/paiements/{payment['id']}/decision/", {
            'decision': 'accepte', 'mode_paiement': 'Espèces',
            'fichier': SimpleUploadedFile('script.html', b'<script/>', content_type='text/html'),
        }, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(DemandePaiement.objects.get(pk=payment['id']).statut, 'attente')
