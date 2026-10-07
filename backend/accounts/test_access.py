import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .access import (
    can_access_config, can_access_new_staffing, can_manage_employee_documents,
    can_create_payment_orders, can_manage_projects, can_manage_teams, can_manage_treasury_accounts,
    can_view_treasury_journal, can_view_treasury, feature_permissions,
    is_org_supervisor, is_team_structure_in_place,
)
from .models import Organisation, Team, User, create_default_teams


class ProjectAccessTests(APITestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name='Acc', org_type='company', currency_code='EUR')
        self.director = User.objects.create_user(
            email='dir@acc.test', password='x', role='directeur', organisation=self.org,
            first_name='D', last_name='I')
        create_default_teams(self.org, self.director)
        self.direction = Team.objects.get(organisation=self.org, code='DG')
        self.pilotage = Team.objects.get(organisation=self.org, code='PIL')
        self.ressources = Team.objects.get(organisation=self.org, code='RES')

        # De simples membres (aucun n'est manager de son équipe) : l'accès doit leur être
        # ouvert au même titre qu'à un manager.
        self.direction_member = User.objects.create_user(
            email='dg@acc.test', password='x', role='salarie', organisation=self.org,
            first_name='G', last_name='M', team=self.direction)
        self.pilotage_member = User.objects.create_user(
            email='pil@acc.test', password='x', role='salarie', organisation=self.org,
            first_name='P', last_name='M', team=self.pilotage)
        self.ressources_member = User.objects.create_user(
            email='res@acc.test', password='x', role='salarie', organisation=self.org,
            first_name='R', last_name='M', team=self.ressources)
        self.no_team = User.objects.create_user(
            email='none@acc.test', password='x', role='salarie', organisation=self.org,
            first_name='N', last_name='T')

    # --- règle -------------------------------------------------------
    def test_rule(self):
        self.assertTrue(can_manage_projects(self.director))
        self.assertTrue(can_manage_projects(self.direction_member))   # simple membre de la Direction
        self.assertTrue(can_manage_projects(self.pilotage_member))    # simple membre du Pilotage
        self.assertFalse(can_manage_projects(self.ressources_member))
        self.assertFalse(can_manage_projects(self.no_team))

    def test_plain_members_get_team_access_not_just_managers(self):
        """Ces utilisateurs ne managent aucune équipe : l'accès doit tout de même passer par
        leur simple appartenance à l'équipe."""
        for member in (self.direction_member, self.pilotage_member, self.ressources_member):
            self.assertFalse(member.teams_managed.exists())
        self.assertTrue(is_org_supervisor(self.direction_member))
        self.assertTrue(is_org_supervisor(self.pilotage_member))
        self.assertTrue(is_org_supervisor(self.ressources_member))
        self.assertFalse(is_org_supervisor(self.no_team))
        # Direction + Pilotage → création de projet et configuration
        self.assertTrue(can_access_config(self.direction_member))
        self.assertTrue(can_access_config(self.pilotage_member))
        # Pilotage + Ressources → gestion des équipes
        self.assertTrue(can_manage_teams(self.pilotage_member))
        self.assertTrue(can_manage_teams(self.ressources_member))

    def test_manager_of_direction_gets_access(self):
        # Le directeur manage déjà la Direction Générale (create_default_teams) : on vérifie
        # un manager non-directeur d'une équipe pilotage.
        self.pilotage.manager = self.ressources_member
        self.pilotage.save(update_fields=['manager'])
        self.ressources_member.refresh_from_db()
        self.assertTrue(can_manage_projects(self.ressources_member))

    # --- nouveau staffing -----------------------------------------
    def test_new_staffing_rule(self):
        # Back-office : Direction + Pilotage + Ressources (simples membres compris).
        self.assertTrue(can_access_new_staffing(self.director))
        self.assertTrue(can_access_new_staffing(self.direction_member))
        self.assertTrue(can_access_new_staffing(self.pilotage_member))
        self.assertTrue(can_access_new_staffing(self.ressources_member))
        self.assertFalse(can_access_new_staffing(self.no_team))
        # En plus : le manager de n'importe quelle équipe y a accès.
        team = Team.objects.create(organisation=self.org, code='OPS', name='Opérations', manager=self.no_team)
        self.no_team.refresh_from_db()
        self.assertTrue(can_access_new_staffing(self.no_team))
        self.assertFalse(can_manage_projects(self.no_team))  # mais pas la création de projet
        self.assertFalse(is_org_supervisor(self.no_team))    # ni le back-office
        team.delete()

    # --- gestion des équipes -------------------------------------
    def test_manage_teams_rule(self):
        self.assertTrue(can_manage_teams(self.director))
        self.assertTrue(can_manage_teams(self.pilotage_member))
        self.assertTrue(can_manage_teams(self.ressources_member))  # Ressources = niveau 3
        self.assertFalse(can_manage_teams(self.no_team))

    # --- trésorerie ---------------------------------------------
    def test_view_treasury_rule(self):
        self.assertTrue(can_view_treasury(self.director))
        self.assertTrue(can_view_treasury(self.pilotage_member))
        self.assertTrue(can_view_treasury(self.ressources_member))
        self.assertFalse(can_view_treasury(self.no_team))
        team = Team.objects.create(organisation=self.org, code='OPS', name='Opérations', manager=self.no_team)
        self.no_team.refresh_from_db()
        self.assertTrue(can_view_treasury(self.no_team))  # manager d'équipe
        team.delete()

    def test_treasury_endpoint_blocks_plain_member(self):
        self.client.force_authenticate(self.no_team)
        self.assertEqual(self.client.get('/api/paiements/').status_code, 403)
        self.client.force_authenticate(self.pilotage_member)
        self.assertEqual(self.client.get('/api/paiements/').status_code, 200)

    # --- architecture & paramètres ------------------------------
    def test_access_config_rule(self):
        self.assertTrue(can_access_config(self.director))
        self.assertTrue(can_access_config(self.pilotage_member))
        self.assertFalse(can_access_config(self.ressources_member))  # Ressources = niveau 3
        self.assertFalse(can_access_config(self.no_team))

    def test_config_endpoints(self):
        # Un membre du Pilotage peut configurer l'architecture des tâches.
        self.client.force_authenticate(self.pilotage_member)
        created = self.client.post('/api/task-templates/', {
            'code': 'TPL-A', 'nom': 'Analyse', 'equipe': self.pilotage.id, 'type_element': 'dossier',
        }, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        # Un membre des Ressources n'y touche pas.
        self.client.force_authenticate(self.ressources_member)
        forbidden = self.client.post('/api/task-templates/', {
            'code': 'TPL-B', 'nom': 'X', 'equipe': self.pilotage.id, 'type_element': 'dossier',
        }, format='json')
        self.assertEqual(forbidden.status_code, 403)
        self.assertEqual(self.client.patch('/api/organisations/ehs/', {'taux_ehs_fcfa': 200}, format='json').status_code, 403)

    # --- payload session -------------------------------------------
    def test_login_exposes_permissions(self):
        for email, expected in (
            ('pil@acc.test', ['config:view', 'equipes:manage', 'projets:create', 'staffing:new', 'tresorerie:journal', 'tresorerie:view']),
            ('res@acc.test', ['employes:contrat', 'employes:create', 'equipes:manage', 'staffing:new', 'tresorerie:execution', 'tresorerie:journal', 'tresorerie:manage_comptes', 'tresorerie:ordonnances', 'tresorerie:view']),
            ('dg@acc.test', ['config:view', 'projets:create', 'staffing:new', 'tresorerie:journal', 'tresorerie:manage_comptes', 'tresorerie:validation', 'tresorerie:view']),
            ('none@acc.test', []),
        ):
            response = self.client.post('/api/auth/login/', {'email': email, 'password': 'x'}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data['user']['permissions'], expected)

    def test_feature_permissions_helper(self):
        self.assertEqual(
            feature_permissions(self.pilotage_member),
            ['config:view', 'equipes:manage', 'projets:create', 'staffing:new', 'tresorerie:journal', 'tresorerie:view'],
        )
        self.assertEqual(
            feature_permissions(self.ressources_member),
            ['employes:contrat', 'employes:create', 'equipes:manage', 'staffing:new', 'tresorerie:execution', 'tresorerie:journal', 'tresorerie:manage_comptes', 'tresorerie:ordonnances', 'tresorerie:view'],
        )
        self.assertEqual(
            feature_permissions(self.direction_member),
            ['config:view', 'projets:create', 'staffing:new', 'tresorerie:journal', 'tresorerie:manage_comptes', 'tresorerie:validation', 'tresorerie:view'],
        )
        self.assertEqual(feature_permissions(self.no_team), [])

    # --- endpoints ------------------------------------------------
    def test_pilotage_member_can_create_project(self):
        self.client.force_authenticate(self.pilotage_member)
        response = self.client.post('/api/projects/', {
            'nom': 'P', 'montant': 1000, 'type_montant': 'HT', 'marge_pct': 0,
            'charges_transversales_pct': 0, 'tva_pct': 0, 'ir_pct': 0, 'statut': 'brouillon',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)

    def test_other_member_cannot_create_project(self):
        self.client.force_authenticate(self.ressources_member)
        response = self.client.post('/api/projects/', {
            'nom': 'P', 'montant': 1000, 'type_montant': 'HT', 'marge_pct': 0,
            'charges_transversales_pct': 0, 'tva_pct': 0, 'ir_pct': 0, 'statut': 'brouillon',
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_team_reads_open_to_all(self):
        self.client.force_authenticate(self.no_team)
        response = self.client.get('/api/teams/')
        self.assertEqual(response.status_code, 200, response.data)

    def test_ressources_member_can_create_and_edit_team(self):
        self.client.force_authenticate(self.ressources_member)
        created = self.client.post('/api/teams/', {'code': 'OPS', 'name': 'Opérations'}, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        edited = self.client.patch(f'/api/teams/{created.data["id"]}/', {'name': 'Ops 2'}, format='json')
        self.assertEqual(edited.status_code, 200, edited.data)
        deleted = self.client.delete(f'/api/teams/{created.data["id"]}/')
        self.assertEqual(deleted.status_code, 204)

    def test_plain_member_cannot_write_teams(self):
        team = Team.objects.create(organisation=self.org, code='OPS', name='Opérations')
        self.client.force_authenticate(self.no_team)
        self.assertEqual(self.client.post('/api/teams/', {'code': 'X', 'name': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.client.patch(f'/api/teams/{team.id}/', {'name': 'Z'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/teams/{team.id}/').status_code, 403)
        self.assertEqual(
            self.client.post(f'/api/teams/{team.id}/add-member/', {'user_id': self.no_team.id}, format='json').status_code,
            403,
        )
        self.assertEqual(self.client.patch('/api/organisations/levels/', {'team_levels_count': 5}, format='json').status_code, 403)


class EmployeeContractAccessTests(APITestCase):
    """Page Profil › Documents : le contrat de travail est téléversé par les Ressources (ou le
    directeur/admin), jamais par le salarié lui-même, qui peut seulement le consulter/télécharger."""

    def setUp(self):
        self.org = Organisation.objects.create(name='Contrat', org_type='company', currency_code='EUR')
        self.director = User.objects.create_user(
            email='dir@contrat.test', password='x', role='directeur', organisation=self.org,
            first_name='D', last_name='I')
        create_default_teams(self.org, self.director)
        self.ressources = Team.objects.get(organisation=self.org, code='RES')
        self.pilotage = Team.objects.get(organisation=self.org, code='PIL')

        self.rh_member = User.objects.create_user(
            email='rh@contrat.test', password='x', role='salarie', organisation=self.org,
            first_name='R', last_name='H', team=self.ressources)
        self.pilotage_member = User.objects.create_user(
            email='pil@contrat.test', password='x', role='salarie', organisation=self.org,
            first_name='P', last_name='M', team=self.pilotage)
        self.employee = User.objects.create_user(
            email='emp@contrat.test', password='x', role='salarie', organisation=self.org,
            first_name='E', last_name='M')

    def test_rule(self):
        self.assertTrue(can_manage_employee_documents(self.director))
        self.assertTrue(can_manage_employee_documents(self.rh_member))
        self.assertFalse(can_manage_employee_documents(self.pilotage_member))
        self.assertFalse(can_manage_employee_documents(self.employee))

    def test_ressources_can_upload_contract(self):
        self.client.force_authenticate(self.rh_member)
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            response = self.client.patch(
                f'/api/employees/{self.employee.id}/contrat/',
                {'contrat_document': SimpleUploadedFile('contrat.pdf', b'%PDF-1.4 test', content_type='application/pdf')},
                format='multipart',
            )
            self.assertEqual(response.status_code, 200, response.data)
            self.employee.refresh_from_db()
            self.assertTrue(bool(self.employee.contrat_document))

    def test_pilotage_and_employee_cannot_upload_contract(self):
        pdf = lambda: SimpleUploadedFile('contrat.pdf', b'%PDF-1.4 test', content_type='application/pdf')
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            self.client.force_authenticate(self.pilotage_member)
            response = self.client.patch(
                f'/api/employees/{self.employee.id}/contrat/', {'contrat_document': pdf()}, format='multipart',
            )
            self.assertEqual(response.status_code, 403)

            self.client.force_authenticate(self.employee)
            response = self.client.patch(
                f'/api/employees/{self.employee.id}/contrat/', {'contrat_document': pdf()}, format='multipart',
            )
            self.assertEqual(response.status_code, 403)

    def test_employee_cannot_set_own_contract_via_me_endpoint(self):
        self.client.force_authenticate(self.employee)
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            response = self.client.patch(
                '/api/employees/me/',
                {'contrat_document': SimpleUploadedFile('contrat.pdf', b'%PDF-1.4 test', content_type='application/pdf')},
                format='multipart',
            )
            # Champ en lecture seule : la requête réussit mais le fichier n'est pas pris en compte.
            self.assertEqual(response.status_code, 200, response.data)
            self.employee.refresh_from_db()
            self.assertFalse(bool(self.employee.contrat_document))

    def test_employee_can_read_and_download_contract_once_uploaded(self):
        self.client.force_authenticate(self.rh_member)
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            self.client.patch(
                f'/api/employees/{self.employee.id}/contrat/',
                {'contrat_document': SimpleUploadedFile('contrat.pdf', b'%PDF-1.4 test', content_type='application/pdf')},
                format='multipart',
            )
            self.client.force_authenticate(self.employee)
            response = self.client.get('/api/employees/me/')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertTrue(response.data['contrat_document'])


class TeamStructureLockTests(APITestCase):
    """Une fois les équipes créées et les managers du Pilotage et des Ressources nommés, la
    Direction et le Pilotage perdent la gestion des équipes : seules les Ressources la gardent."""

    def setUp(self):
        self.org = Organisation.objects.create(name='Lock', org_type='company', currency_code='EUR')
        self.director = User.objects.create_user(
            email='dir@lock.test', password='x', role='directeur', organisation=self.org,
            first_name='D', last_name='I')
        create_default_teams(self.org, self.director)
        self.pilotage = Team.objects.get(organisation=self.org, code='PIL')
        self.ressources = Team.objects.get(organisation=self.org, code='RES')
        self.pil_manager = User.objects.create_user(
            email='pil@lock.test', password='x', role='salarie', organisation=self.org,
            first_name='P', last_name='M', team=self.pilotage)
        self.res_manager = User.objects.create_user(
            email='res@lock.test', password='x', role='salarie', organisation=self.org,
            first_name='R', last_name='M', team=self.ressources)
        self.res_member = User.objects.create_user(
            email='res2@lock.test', password='x', role='salarie', organisation=self.org,
            first_name='R', last_name='2', team=self.ressources)

    def _put_structure_in_place(self):
        Team.objects.create(organisation=self.org, code='OPS', name='Opérations', niveau=4)
        self.pilotage.manager = self.pil_manager
        self.pilotage.save(update_fields=['manager'])
        self.ressources.manager = self.res_manager
        self.ressources.save(update_fields=['manager'])

    def test_before_structure_direction_and_pilotage_manage_teams(self):
        self.assertFalse(is_team_structure_in_place(self.org))
        self.assertTrue(can_manage_teams(self.director))
        self.assertTrue(can_manage_teams(self.pil_manager))
        self.assertTrue(can_manage_teams(self.res_member))

    def test_managers_without_extra_team_do_not_lock(self):
        self.pilotage.manager = self.pil_manager
        self.pilotage.save(update_fields=['manager'])
        self.ressources.manager = self.res_manager
        self.ressources.save(update_fields=['manager'])
        self.assertFalse(is_team_structure_in_place(self.org))
        self.assertTrue(can_manage_teams(self.director))

    def test_after_structure_only_ressources_manage_teams(self):
        self._put_structure_in_place()
        self.assertTrue(is_team_structure_in_place(self.org))
        self.assertFalse(can_manage_teams(self.director))
        self.assertFalse(can_manage_teams(self.pil_manager))
        self.assertTrue(can_manage_teams(self.res_manager))
        self.assertTrue(can_manage_teams(self.res_member))
        self.assertNotIn('equipes:manage', feature_permissions(self.director))
        # La Direction garde sa vue globale.
        self.assertTrue(is_org_supervisor(self.director))

    def test_director_cannot_create_team_once_structure_in_place(self):
        self._put_structure_in_place()
        self.client.force_authenticate(self.director)
        response = self.client.post('/api/teams/', {'name': 'Nouvelle', 'niveau': 4}, format='json')
        self.assertEqual(response.status_code, 403)
        self.client.force_authenticate(self.res_member)
        response = self.client.post('/api/teams/', {'name': 'Nouvelle', 'niveau': 4}, format='json')
        self.assertEqual(response.status_code, 201, response.data)

    def test_removing_a_manager_unlocks(self):
        self._put_structure_in_place()
        self.ressources.manager = None
        self.ressources.save(update_fields=['manager'])
        self.assertFalse(is_team_structure_in_place(self.org))
        self.assertTrue(can_manage_teams(self.director))

    def test_direction_keeps_projects_and_config_after_structure(self):
        self._put_structure_in_place()
        self.assertTrue(can_manage_projects(self.director))
        self.assertTrue(can_access_config(self.director))

    def test_treasury_rules(self):
        self._put_structure_in_place()
        # Comptes (création, rapprovisionnement) : Direction + Ressources.
        self.assertTrue(can_manage_treasury_accounts(self.director))
        self.assertTrue(can_manage_treasury_accounts(self.res_member))
        self.assertFalse(can_manage_treasury_accounts(self.pil_manager))
        # Ordonnances de paiement : managers d'équipe et Ressources ; la Direction les valide.
        self.assertTrue(can_create_payment_orders(self.res_member))
        self.assertTrue(can_create_payment_orders(self.pil_manager))
        self.assertFalse(can_create_payment_orders(self.director))
        # Journal : Direction, Pilotage et Ressources — pas un simple manager d'équipe.
        ops = Team.objects.get(organisation=self.org, code='OPS')
        ops_manager = User.objects.create_user(
            email='ops@lock.test', password='x', role='salarie', organisation=self.org,
            first_name='O', last_name='M')
        ops.manager = ops_manager
        ops.save(update_fields=['manager'])
        for user in (self.director, self.pil_manager, self.res_member):
            self.assertTrue(can_view_treasury_journal(user))
        self.assertFalse(can_view_treasury_journal(ops_manager))
        self.assertTrue(can_view_treasury(ops_manager))
