from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class MigrationTresorerieDonneesExistantesTests(TransactionTestCase):
    avant = [('accounts', '0071_employe_date_embauche_obligatoire')]
    apres = [('accounts', '0072_mouvement_origine_demandes_sans_compte')]

    def test_donnees_existantes_sont_converties(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.avant)
        old = executor.loader.project_state(self.avant).apps
        org = old.get_model('accounts', 'Organisation').objects.create(name='Structure Test', org_type='company', currency_code='XAF')
        compte = old.get_model('accounts', 'CompteTresorerie').objects.create(organisation=org, nom='BICEC', code='521100', solde_initial=0)
        Demande = old.get_model('accounts', 'DemandePaiement')
        sans_compte = Demande.objects.create(organisation=org, statut='attente', montant=10, devise='XAF', fournisseur='F', objet='O')
        avec_compte = Demande.objects.create(organisation=org, statut='attente', compte=compte, montant=10, devise='XAF', fournisseur='F', objet='O')
        Mouvement = old.get_model('accounts', 'MouvementTresorerie')
        entree = Mouvement.objects.create(organisation=org, compte=compte, type_mouvement='Entrée', nature='Approvisionnement', libelle='Apport', montant=5, beneficiaire='Siège')
        sortie = Mouvement.objects.create(organisation=org, compte=compte, type_mouvement='Sortie', nature='Paiement', libelle='Achat', montant=3, beneficiaire='ETS Fournisseur')

        executor = MigrationExecutor(connection)
        executor.migrate(self.apres)
        new = executor.loader.project_state(self.apres).apps
        try:
            Demande = new.get_model('accounts', 'DemandePaiement')
            self.assertEqual(Demande.objects.get(pk=sans_compte.pk).statut, 'brouillon')
            self.assertEqual(Demande.objects.get(pk=avec_compte.pk).statut, 'attente')
            Mouvement = new.get_model('accounts', 'MouvementTresorerie')
            e = Mouvement.objects.get(pk=entree.pk)
            self.assertEqual((e.origine, e.beneficiaire), ('Siège', ''))
            s = Mouvement.objects.get(pk=sortie.pk)
            self.assertEqual((s.origine, s.beneficiaire), ('', 'ETS Fournisseur'))
        finally:
            executor = MigrationExecutor(connection)
            executor.migrate(executor.loader.graph.leaf_nodes())
