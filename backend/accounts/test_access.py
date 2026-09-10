from rest_framework.test import APITestCase

from .access import (
    can_access_config, can_access_new_staffing, can_manage_projects, can_manage_teams,
    can_view_treasury, feature_permissions, is_org_supervisor,
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
            ('pil@acc.test', ['config:view', 'equipes:manage', 'projets:create', 'staffing:new', 'tresorerie:view']),
            ('res@acc.test', ['equipes:manage', 'staffing:new', 'tresorerie:view']),
            ('dg@acc.test', ['config:view', 'projets:create', 'staffing:new', 'tresorerie:view']),
            ('none@acc.test', []),
        ):
            response = self.client.post('/api/auth/login/', {'email': email, 'password': 'x'}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data['user']['permissions'], expected)

    def test_feature_permissions_helper(self):
        self.assertEqual(
            feature_permissions(self.pilotage_member),
            ['config:view', 'equipes:manage', 'projets:create', 'staffing:new', 'tresorerie:view'],
        )
        self.assertEqual(
            feature_permissions(self.ressources_member),
            ['equipes:manage', 'staffing:new', 'tresorerie:view'],
        )
        self.assertEqual(
            feature_permissions(self.direction_member),
            ['config:view', 'projets:create', 'staffing:new', 'tresorerie:view'],
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
