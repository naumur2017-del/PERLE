import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import CompteTresorerie, DemandePaiement, LigneBudgetaire, MouvementTresorerie, Notification, Organisation, Project, ProjectLigne, Team, User


class TresorerieComptesTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name='Trésorerie', org_type='company', currency_code='XAF')
        self.other_org = Organisation.objects.create(name='Autre', org_type='company')
        self.director = User.objects.create_user(email='director@treso.test', password='test', role='directeur', organisation=self.org)
        self.employee = User.objects.create_user(email='employee@treso.test', password='test', role='salarie', organisation=self.org)
        self.stranger = User.objects.create_user(email='stranger@treso.test', password='test', role='salarie', organisation=self.org)
        self.outsider = User.objects.create_user(email='outsider@treso.test', password='test', role='directeur', organisation=self.other_org)
        ressources_team = Team.objects.create(organisation=self.org, code='RES', name='Ressources', niveau=3, is_protected=True)
        pilotage_team = Team.objects.create(organisation=self.org, code='PIL', name='Pilotage', niveau=2, is_protected=True)
        self.ressources = User.objects.create_user(email='res@treso.test', password='test', role='salarie', organisation=self.org, team=ressources_team)
        self.pilotage = User.objects.create_user(email='pil@treso.test', password='test', role='salarie', organisation=self.org, team=pilotage_team)
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

    def post_payment(self, data):
        """Ordonnance établie par les Ressources ; le client revient ensuite à la Direction."""
        self.client.force_authenticate(self.ressources)
        response = self.client.post('/api/paiements/', data, format='json')
        self.client.force_authenticate(self.director)
        return response

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

    def test_only_direction_and_ressources_create_and_replenish(self):
        compte = self.create_compte()
        self.client.force_authenticate(self.ressources)
        self.assertEqual(self.client.post('/api/tresorerie/comptes/', {'nom': 'Caisse', 'code': '571'}, format='json').status_code, 201)
        self.assertEqual(self.client.post(f"/api/tresorerie/comptes/{compte['id']}/rapprovisionner/", {'montant': 10, 'libelle': 'Apport'}, format='json').status_code, 201)
        self.client.force_authenticate(self.pilotage)
        self.assertEqual(self.client.post('/api/tresorerie/comptes/', {'nom': 'Y', 'code': 'Y'}, format='json').status_code, 403)
        self.assertEqual(self.client.post(f"/api/tresorerie/comptes/{compte['id']}/rapprovisionner/", {'montant': 10, 'libelle': 'Apport'}, format='json').status_code, 403)
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.post('/api/tresorerie/comptes/', {'nom': 'X', 'code': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.client.post(f"/api/tresorerie/comptes/{compte['id']}/rapprovisionner/", {'montant': 10, 'libelle': 'Apport'}, format='json').status_code, 403)
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').status_code, 403)

    def test_journal_reserved_to_direction_pilotage_ressources(self):
        self.assertEqual(self.client.get('/api/tresorerie/mouvements/').status_code, 200)
        for user in (self.pilotage, self.ressources):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/tresorerie/mouvements/').status_code, 200)
        # Un simple manager d'équipe voit les comptes mais pas le journal.
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').status_code, 200)
        self.assertEqual(self.client.get('/api/tresorerie/mouvements/').status_code, 403)

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
        # Alerte à chaque mouvement : les Ressources sont prévenues, pas l'auteur du rapprovisionnement.
        self.assertEqual(Notification.objects.filter(user=self.ressources, cible_type='mouvement').count(), 1)
        self.assertFalse(Notification.objects.filter(user=self.director, cible_type='mouvement').exists())

    def test_replenish_rejects_non_positive_amount(self):
        compte = self.create_compte()
        response = self.client.post(f"/api/tresorerie/comptes/{compte['id']}/rapprovisionner/", {'montant': 0, 'libelle': 'Rien'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_submission_requires_account(self):
        data = self.payment_data(None)
        response = self.post_payment(data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('compte', response.data)
        draft = self.post_payment({**data, 'statut': 'brouillon'})
        self.assertEqual(draft.status_code, 201, draft.data)

    def validate_and_execute(self, payment_id, mode='Virement bancaire'):
        """Direction valide, puis Ressources exécutent avec le justificatif ; le client revient à la Direction."""
        response = self.client.post(f'/api/paiements/{payment_id}/validation/', {'decision': 'accepte'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(self.ressources)
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            response = self.client.post(f'/api/paiements/{payment_id}/execution/', {
                'fichier': SimpleUploadedFile('preuve.pdf', b'%PDF-1.4 test', content_type='application/pdf'),
                'mode_paiement': mode, 'commentaire': 'Payé',
            }, format='multipart')
        self.client.force_authenticate(self.director)
        return response

    def test_execution_debits_chosen_account_and_journals_it(self):
        compte = self.create_compte(solde_initial=1000)
        payment = self.post_payment(self.payment_data(compte['id'])).data
        response = self.validate_and_execute(payment['id'])
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['compte_nom'], 'BICEC')
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data[0]['solde_actuel'], 600)
        movement = MouvementTresorerie.objects.get(demande_id=payment['id'])
        self.assertEqual(movement.type_mouvement, 'Sortie')
        self.assertEqual(movement.nature, 'Paiement')
        self.assertEqual(movement.montant, 400)
        self.assertEqual(movement.beneficiaire, 'ETS Bureautique')
        self.assertEqual(movement.projet, self.project)
        self.assertEqual(movement.executeur, self.ressources)
        journal = self.client.get('/api/tresorerie/mouvements/').data
        self.assertEqual(journal[0]['reference'], f"PAY-{movement.created_at.year}-{payment['id']:06d}")
        self.assertEqual(journal[0]['projet_code'], 'PRJ1')

    def test_execution_refused_when_balance_is_insufficient(self):
        compte = self.create_compte(solde_initial=100)
        payment = self.post_payment(self.payment_data(compte['id'])).data
        response = self.validate_and_execute(payment['id'], mode='Espèces')
        self.assertEqual(response.status_code, 400)
        self.assertIn('compte', response.data)
        self.assertEqual(DemandePaiement.objects.get(pk=payment['id']).statut, 'valide')
        self.assertFalse(MouvementTresorerie.objects.exists())
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data[0]['solde_actuel'], 100)

    def test_refusal_does_not_debit(self):
        compte = self.create_compte()
        payment = self.post_payment(self.payment_data(compte['id'])).data
        response = self.client.post(f"/api/paiements/{payment['id']}/validation/", {'decision': 'refuse', 'motif': 'Non'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(MouvementTresorerie.objects.exists())
        self.assertEqual(self.client.get('/api/tresorerie/comptes/').data[0]['solde_actuel'], 1000)
