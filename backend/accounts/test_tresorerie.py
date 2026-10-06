from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from .models import CompteTresorerie, DemandePaiement, LigneBudgetaire, MouvementTresorerie, Organisation, Project, ProjectLigne, Team, User


class TresorerieComptesTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name='Trésorerie', org_type='company', currency_code='XAF')
        self.other_org = Organisation.objects.create(name='Autre', org_type='company')
        self.director = User.objects.create_user(email='director@treso.test', password='test', role='directeur', organisation=self.org)
        self.employee = User.objects.create_user(email='employee@treso.test', password='test', role='salarie', organisation=self.org)
        self.stranger = User.objects.create_user(email='stranger@treso.test', password='test', role='salarie', organisation=self.org)
        self.outsider = User.objects.create_user(email='outsider@treso.test', password='test', role='directeur', organisation=self.other_org)
        team = Team.objects.create(organisation=self.org, code='T1', name='Finance', manager=self.employee)
        self.employee.team = team
        self.employee.save(update_fields=['team'])
        self.project = Project.objects.create(organisation=self.org, code='PRJ1', nom='Projet')
        self.line = LigneBudgetaire.objects.create(organisation=self.org, code='L1', nom='Achats', niveau=1, equipe=team)
        ProjectLigne.objects.create(project=self.project, ligne_budgetaire=self.line, code='PL1')
        self.client.force_authenticate(self.director)

    def create_compte(self, **overrides):
        data = {'nom': 'BICEC', 'code': '521100', 'sous_libelle': 'Compte principal', 'solde_initial': 1000, **overrides}
        response = self.client.post('/api/tresorerie/comptes/', data, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def payment_data(self, compte, **overrides):
        return {
            'projet': self.project.pk, 'ligne_budgetaire': self.line.pk, 'fournisseur': 'ETS Bureautique',
            'montant': 400, 'type_depense': 'Non Transversal', 'date_depense': '2026-09-08', 'objet': 'Fournitures',
            'statut': 'attente', 'compte': compte, **overrides,
        }

    def test_create_account_and_read_balance(self):
        compte = self.create_compte()
        self.assertEqual(compte['solde_actuel'], 1000)
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data[0]['nom'], 'BICEC')
        duplicate = self.client.post('/api/tresorerie/comptes/', {'nom': 'Autre', 'code': '521100', 'solde_initial': 0}, format='json')
        self.assertEqual(duplicate.status_code, 400)
        negative = self.client.post('/api/tresorerie/comptes/', {'nom': 'Neg', 'code': '1', 'solde_initial': -5}, format='json')
        self.assertEqual(negative.status_code, 400)

    def test_only_director_or_admin_creates_and_replenishes(self):
        compte = self.create_compte()
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.post('/api/tresorerie/comptes/', {'nom': 'X', 'code': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.client.post(f"/api/tresorerie/comptes/{compte['id']}/rapprovisionner/", {'montant': 10, 'libelle': 'Apport'}, format='json').status_code, 403)
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').status_code, 403)

    def test_organisation_isolation(self):
        compte = self.create_compte()
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data, [])
        self.assertEqual(self.client.post(f"/api/tresorerie/comptes/{compte['id']}/rapprovisionner/", {'montant': 10, 'libelle': 'Apport'}, format='json').status_code, 404)

    def test_replenish_adds_entry_and_journal_lists_it(self):
        compte = self.create_compte()
        response = self.client.post(f"/api/tresorerie/comptes/{compte['id']}/rapprovisionner/", {
            'montant': '250000', 'libelle': 'Apport du siège', 'source': 'Siège',
            'justificatif': SimpleUploadedFile('virement.pdf', b'%PDF-1.4 test', content_type='application/pdf'),
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['type_mouvement'], 'Entrée')
        self.assertEqual(response.data['nature'], 'Approvisionnement')
        self.assertTrue(response.data['reference'].startswith('MVT-'))
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data[0]['solde_actuel'], 251000)
        journal = self.client.get('/api/tresorerie/mouvements/').data
        self.assertEqual(len(journal), 1)
        self.assertEqual(journal[0]['compte_nom'], 'BICEC')
        # Une entrée profite à la structure ; la source des fonds est dans `origine`.
        self.assertEqual(journal[0]['beneficiaire'], self.org.name)
        self.assertEqual(journal[0]['origine'], 'Siège')
        self.assertEqual(journal[0]['initiateur_nom'], '')  # le directeur de test n'a pas de nom renseigné

    def test_replenish_rejects_non_positive_amount(self):
        compte = self.create_compte()
        response = self.client.post(f"/api/tresorerie/comptes/{compte['id']}/rapprovisionner/", {'montant': 0, 'libelle': 'Rien'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_submission_requires_account(self):
        data = self.payment_data(None)
        response = self.client.post('/api/paiements/', data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('compte', response.data)
        draft = self.client.post('/api/paiements/', {**data, 'statut': 'brouillon'}, format='json')
        self.assertEqual(draft.status_code, 201, draft.data)

    def test_execution_debits_chosen_account_and_journals_it(self):
        compte = self.create_compte(solde_initial=1000)
        payment = self.client.post('/api/paiements/', self.payment_data(compte['id']), format='json').data
        response = self.client.post(f"/api/paiements/{payment['id']}/decision/", {
            'decision': 'accepte', 'commentaire': 'Payé', 'mode_paiement': 'Virement bancaire',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['compte_nom'], 'BICEC')
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data[0]['solde_actuel'], 600)
        movement = MouvementTresorerie.objects.get(demande_id=payment['id'])
        self.assertEqual(movement.type_mouvement, 'Sortie')
        self.assertEqual(movement.nature, 'Paiement')
        self.assertEqual(movement.montant, 400)
        self.assertEqual(movement.beneficiaire, 'ETS Bureautique')
        self.assertEqual(movement.projet, self.project)
        self.assertEqual(movement.executeur, self.director)
        journal = self.client.get('/api/tresorerie/mouvements/').data
        self.assertEqual(journal[0]['reference'], f"PAY-{movement.created_at.year}-{payment['id']:06d}")
        self.assertEqual(journal[0]['projet_code'], 'PRJ1')

    def test_execution_refused_when_balance_is_insufficient(self):
        compte = self.create_compte(solde_initial=100)
        payment = self.client.post('/api/paiements/', self.payment_data(compte['id']), format='json').data
        response = self.client.post(f"/api/paiements/{payment['id']}/decision/", {
            'decision': 'accepte', 'commentaire': 'Payé', 'mode_paiement': 'Espèces',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('compte', response.data)
        self.assertEqual(DemandePaiement.objects.get(pk=payment['id']).statut, 'attente')
        self.assertFalse(MouvementTresorerie.objects.exists())
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data[0]['solde_actuel'], 100)

    def test_refusal_does_not_debit(self):
        compte = self.create_compte()
        payment = self.client.post('/api/paiements/', self.payment_data(compte['id']), format='json').data
        response = self.client.post(f"/api/paiements/{payment['id']}/decision/", {'decision': 'refuse', 'commentaire': 'Non'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(MouvementTresorerie.objects.exists())
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data[0]['solde_actuel'], 1000)
