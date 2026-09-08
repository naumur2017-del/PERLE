"""Endpoints d'agrégation des tableaux de bord de la page d'accueil.

- ``DirectionDashboardView`` : vue consolidée de l'organisation (directeur / admin).
- ``ManagerDashboardView`` : vue d'une équipe pour son manager.

Toutes les données sont recalculées à la volée depuis la base (aucun cache, aucun
stockage dédié) et scopées à l'organisation de l'utilisateur connecté. Les montants
renvoyés dans les séries sont exprimés en **milliers** de la devise de l'organisation
pour rester cohérents avec ``formatFcfa`` côté frontend.
"""

from datetime import date, timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DemandePaiement, Project, Task, TaskAssignment, Team
from .views import apply_fermetures_techniques

MONTHS_FR = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.',
             'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']

PERIODS = ('month', 'quarter', 'year')

# Capacité mensuelle de référence d'un collaborateur (heures), faute de champ dédié.
MONTHLY_CAPACITY_HOURS = 151.0

ACTIVE_EXECUTION = ('a_demarrer', 'en_cours', 'en_pause')


# --------------------------------------------------------------------------- #
# Découpage temporel                                                          #
# --------------------------------------------------------------------------- #

def _month_start(d):
    return d.replace(day=1)


def _add_months(d, delta):
    month_index = d.month - 1 + delta
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def period_buckets(period, today):
    """Renvoie ``(buckets, prev_start, prev_end)``.

    ``buckets`` est une liste de dicts ``{label, start, end}`` (bornes incluses / exclues :
    ``start <= d < end``). ``prev_start``/``prev_end`` délimitent la période précédente de
    durée équivalente, pour le calcul des variations.
    """
    if period == 'month':
        # 4 dernières semaines ISO, la semaine courante comprise.
        current_monday = today - timedelta(days=today.weekday())
        buckets = []
        for i in range(3, -1, -1):
            start = current_monday - timedelta(weeks=i)
            end = start + timedelta(weeks=1)
            buckets.append({'label': f'S{start.isocalendar()[1]}', 'start': start, 'end': end})
        span_start = buckets[0]['start']
        return buckets, span_start - timedelta(weeks=4), span_start
    if period == 'quarter':
        first = _add_months(_month_start(today), -2)
        buckets = []
        for i in range(3):
            start = _add_months(first, i)
            end = _add_months(first, i + 1)
            buckets.append({'label': MONTHS_FR[start.month - 1], 'start': start, 'end': end})
        return buckets, _add_months(first, -3), first
    # year : de janvier au mois courant.
    buckets = []
    for m in range(1, today.month + 1):
        start = date(today.year, m, 1)
        end = _add_months(start, 1)
        buckets.append({'label': MONTHS_FR[m - 1], 'start': start, 'end': end})
    span_start = date(today.year, 1, 1)
    return buckets, _add_months(span_start, -len(buckets)), span_start


def _k(value):
    """Montant → milliers, arrondi à 0,1."""
    return round(float(value or 0) / 1000, 1)


def _bucket_of(d, buckets):
    for index, bucket in enumerate(buckets):
        if bucket['start'] <= d < bucket['end']:
            return index
    return None


# --------------------------------------------------------------------------- #
# Helpers projets                                                             #
# --------------------------------------------------------------------------- #

def _progress(done, total):
    return round(100 * done / total) if total else 0


def project_budget_used(project):
    assignments = TaskAssignment.objects.filter(task__project=project).aggregate(
        total=Sum('montant_fcfa'))['total'] or 0
    paiements = DemandePaiement.objects.filter(projet=project, statut='execute').aggregate(
        total=Sum('montant'))['total'] or 0
    return float(assignments) + float(paiements)


def project_status(progress, used, budget, deadline, today):
    if progress >= 100:
        return 'Terminé'
    if deadline and deadline < today:
        return 'En retard'
    if budget and used / budget > 0.9:
        return 'À surveiller'
    return 'En cours'


def project_manager_name(project):
    first_task = Task.objects.filter(project=project).select_related('equipe__manager').first()
    if first_task and first_task.equipe and first_task.equipe.manager:
        manager = first_task.equipe.manager
        return f'{manager.first_name} {manager.last_name}'.strip()
    if project.created_by:
        return f'{project.created_by.first_name} {project.created_by.last_name}'.strip()
    return '—'


def _ligne_root_name(ligne):
    seen = set()
    current = ligne
    while current and current.parent_id and current.id not in seen:
        seen.add(current.id)
        current = current.parent
    return current.nom if current else ligne.nom


# --------------------------------------------------------------------------- #
# Vue direction                                                               #
# --------------------------------------------------------------------------- #

class DirectionDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        organisation = user.organisation
        if user.role not in ('directeur', 'admin'):
            raise PermissionDenied("Réservé à la direction.")
        if not organisation:
            raise PermissionDenied("Votre compte n'est rattaché à aucune organisation.")

        apply_fermetures_techniques(organisation)
        today = timezone.localdate()
        period = request.query_params.get('period', 'year')
        if period not in PERIODS:
            period = 'year'
        buckets, prev_start, prev_end = period_buckets(period, today)
        span_start = buckets[0]['start']
        span_end = buckets[-1]['end']

        projects = list(Project.objects.filter(organisation=organisation, statut='definitif'))
        assignments = list(
            TaskAssignment.objects.filter(task__organisation=organisation)
            .select_related('task', 'task__equipe', 'task__ligne_budgetaire', 'user')
        )
        paiements = list(
            DemandePaiement.objects.filter(organisation=organisation, statut='execute')
        )
        tasks = list(Task.objects.filter(organisation=organisation, actif=True).select_related('equipe'))
        teams = list(Team.objects.filter(organisation=organisation).prefetch_related('team_members'))

        # --- séries finance / trésorerie -------------------------------------
        finance = [{'label': b['label'], 'revenue': 0.0, 'costs': 0.0} for b in buckets]
        for project in projects:
            d = project.date_debut or project.created_at.date()
            index = _bucket_of(d, buckets)
            if index is not None:
                finance[index]['revenue'] += float(project.montant or 0)
        for paiement in paiements:
            d = paiement.date_depense or (paiement.decided_at.date() if paiement.decided_at else paiement.created_at.date())
            index = _bucket_of(d, buckets)
            if index is not None:
                finance[index]['costs'] += float(paiement.montant or 0)
        for assignment in assignments:
            index = _bucket_of(assignment.created_at.date(), buckets)
            if index is not None:
                finance[index]['costs'] += float(assignment.montant_fcfa or 0)

        cash = []
        balance = 0.0
        for point in finance:
            inflow = point['revenue'] * 0.92
            outflow = point['costs']
            balance += inflow - outflow
            cash.append({
                'label': point['label'],
                'inflow': _k(inflow), 'outflow': _k(outflow), 'balance': _k(balance),
            })
        finance = [{'label': p['label'], 'revenue': _k(p['revenue']), 'costs': _k(p['costs'])} for p in finance]

        # --- variations période précédente ---------------------------------
        def _window_revenue(start, end):
            return sum(float(p.montant or 0) for p in projects
                       if start <= (p.date_debut or p.created_at.date()) < end)

        def _window_costs(start, end):
            total = sum(float(p.montant or 0) for p in paiements
                        if start <= (p.date_depense or (p.decided_at.date() if p.decided_at else p.created_at.date())) < end)
            total += sum(float(a.montant_fcfa or 0) for a in assignments
                         if start <= a.created_at.date() < end)
            return total

        rev_now = _window_revenue(span_start, span_end)
        rev_prev = _window_revenue(prev_start, prev_end)
        costs_now = _window_costs(span_start, span_end)
        costs_prev = _window_costs(prev_start, prev_end)
        revenue_delta = round(100 * (rev_now - rev_prev) / rev_prev, 1) if rev_prev else 0.0
        margin_now = round(100 * (rev_now - costs_now) / rev_now, 1) if rev_now else 0.0
        margin_prev = round(100 * (rev_prev - costs_prev) / rev_prev, 1) if rev_prev else 0.0

        # --- portefeuille de projets --------------------------------------
        project_rows = []
        for project in projects:
            task_qs = [t for t in tasks if t.project_id == project.id]
            proj_assignments = [a for a in assignments if a.task.project_id == project.id]
            done = sum(1 for a in proj_assignments if a.execution_statut == 'terminee')
            progress = _progress(done, len(proj_assignments))
            budget = float(project.budget_execution or 0)
            used = project_budget_used(project)
            margin = round(100 * (budget - used) / budget, 1) if budget else 0.0
            status = project_status(progress, used, budget, project.date_fin, today)
            project_rows.append({
                'code': project.code, 'name': project.nom,
                'manager': project_manager_name(project),
                'progress': progress,
                'budget_used': _k(used), 'budget': _k(budget),
                'margin': margin, 'status': status,
                'deadline': project.date_fin.strftime('%d/%m/%Y') if project.date_fin else '—',
                '_budget_raw': budget,
            })
        project_rows.sort(key=lambda r: r['_budget_raw'], reverse=True)
        top_projects = [{k: v for k, v in row.items() if k != '_budget_raw'} for row in project_rows[:6]]
        active_projects = sum(1 for r in project_rows if r['status'] != 'Terminé')
        watch_projects = sum(1 for r in project_rows if r['status'] in ('À surveiller', 'En retard'))

        # --- répartition budget -----------------------------------------
        by_nature = {}
        by_department = {}
        for assignment in assignments:
            montant = float(assignment.montant_fcfa or 0)
            ligne = assignment.task.ligne_budgetaire
            if ligne:
                by_nature[_ligne_root_name(ligne)] = by_nature.get(_ligne_root_name(ligne), 0.0) + montant
            equipe = assignment.task.equipe
            if equipe:
                by_department[equipe.name] = by_department.get(equipe.name, 0.0) + montant
        budget_by_nature = [{'label': k, 'value': _k(v)} for k, v in
                            sorted(by_nature.items(), key=lambda kv: kv[1], reverse=True)]
        budget_by_department = [{'label': k, 'value': _k(v)} for k, v in
                                sorted(by_department.items(), key=lambda kv: kv[1], reverse=True)]

        # --- charge des équipes ----------------------------------------
        staffed_user_ids = {a.user_id for a in assignments if a.execution_statut in ACTIVE_EXECUTION}
        team_load = []
        headcount = 0
        occupied = 0
        for team in teams:
            members = list(team.team_members.all())
            if team.manager and team.manager not in members:
                members.append(team.manager)
            staffed = available = unavailable = 0
            for member in members:
                if member.statut in ('conge', 'inactif'):
                    unavailable += 1
                elif member.id in staffed_user_ids:
                    staffed += 1
                else:
                    available += 1
            if members:
                team_load.append({'label': team.name, 'staffed': staffed,
                                  'available': available, 'unavailable': unavailable})
            headcount += len(members)
            occupied += staffed
        occupancy = round(100 * occupied / headcount) if headcount else 0

        # --- EHS -----------------------------------------------------
        ehs_by_dep = {}
        ehs_consumed = ehs_planned = 0.0
        for assignment in assignments:
            consumed = float(assignment.ehs_consomme or 0)
            ehs_planned += consumed
            name = assignment.task.equipe.name if assignment.task.equipe else '—'
            entry = ehs_by_dep.setdefault(name, {'label': name, 'consumed': 0.0, 'planned': 0.0})
            entry['planned'] += consumed
            if assignment.execution_statut == 'terminee':
                ehs_consumed += consumed
                entry['consumed'] += consumed
        ehs = {
            'consumed': round(ehs_consumed, 1), 'planned': round(ehs_planned, 1),
            'by_department': [
                {'label': e['label'], 'consumed': round(e['consumed'], 1), 'planned': round(e['planned'], 1)}
                for e in sorted(ehs_by_dep.values(), key=lambda e: e['planned'], reverse=True)
            ],
        }

        # --- livrables et échéances ----------------------------------
        deliverables = [{'label': b['label'], 'delivered': 0, 'in_progress': 0, 'late': 0} for b in buckets]
        for assignment in assignments:
            if assignment.execution_statut == 'terminee' and assignment.terminee_le:
                index = _bucket_of(assignment.terminee_le.date(), buckets)
                if index is not None:
                    deliverables[index]['delivered'] += 1
            elif assignment.execution_statut == 'en_cours':
                deliverables[-1]['in_progress'] += 1
        late_task_ids = set()
        for task in tasks:
            if task.echeance and task.echeance < today:
                task_assignments = [a for a in assignments if a.task_id == task.id]
                if not task_assignments or any(a.execution_statut != 'terminee' for a in task_assignments):
                    late_task_ids.add(task.id)
        if deliverables:
            deliverables[-1]['late'] = len(late_task_ids)

        # --- alertes -----------------------------------------------
        alerts = []
        for row in project_rows:
            if row['_budget_raw'] and row['budget_used'] * 1000 / row['_budget_raw'] > 0.95 and row['progress'] < 60:
                alerts.append({
                    'id': f'DA-{row["code"]}', 'level': 'high',
                    'title': f'Budget critique sur {row["code"]}',
                    'detail': f'{row["name"]} : {row["progress"]} % d\'avancement pour un budget quasi consommé.',
                    'target': 'pilotage',
                })
        late_projects = [r for r in project_rows if r['status'] == 'En retard']
        if late_projects:
            alerts.append({
                'id': 'DA-late', 'level': 'high',
                'title': f'{len(late_projects)} projet(s) en retard de livraison',
                'detail': ', '.join(r['code'] for r in late_projects[:5]) + ' dépassent leur échéance.',
                'target': 'pilotage',
            })
        for team in team_load:
            total = team['staffed'] + team['available']
            if total and team['available'] / total > 0.5:
                alerts.append({
                    'id': f'DA-team-{team["label"]}', 'level': 'medium',
                    'title': f'Équipe {team["label"]} sous-staffée',
                    'detail': f'{team["available"]} collaborateur(s) disponible(s) sur {total}.',
                    'target': 'staffing',
                })
        if cash and cash[-1]['balance'] < 80000:
            alerts.append({
                'id': 'DA-cash', 'level': 'medium',
                'title': 'Trésorerie sous le seuil de confort',
                'detail': 'Le solde projeté passe sous le seuil de 80 M sur la période.',
                'target': 'tresorerie',
            })
        soon = sum(1 for t in tasks if t.echeance and today <= t.echeance <= today + timedelta(days=15))
        if soon:
            alerts.append({
                'id': 'DA-soon', 'level': 'info',
                'title': f'{soon} échéance(s) dans les 15 jours',
                'detail': f'{soon} tâche(s) arrivent à terme avant le {(today + timedelta(days=15)).strftime("%d/%m/%Y")}.',
                'target': 'pilotage',
            })

        cash_final = cash[-1]['balance'] if cash else 0
        cash_prev = cash[-2]['balance'] if len(cash) > 1 else 0
        cash_delta = round(100 * (cash_final - cash_prev) / cash_prev, 1) if cash_prev else 0.0

        return Response({
            'period': period,
            'currency_code': organisation.currency_code,
            'generated_at': timezone.now().isoformat(),
            'kpi': {
                'revenue': _k(rev_now), 'revenue_delta': revenue_delta,
                'margin': margin_now, 'margin_delta': round(margin_now - margin_prev, 1),
                'active_projects': active_projects, 'watch_projects': watch_projects,
                'occupancy': occupancy, 'headcount': headcount,
                'cash': cash_final, 'cash_delta': cash_delta,
                'late_tasks': len(late_task_ids), 'late_tasks_delta': 0,
            },
            'finance': finance,
            'cash': cash,
            'budget_by_nature': budget_by_nature,
            'budget_by_department': budget_by_department,
            'projects': top_projects,
            'team_load': team_load,
            'ehs': ehs,
            'deliverables': deliverables,
            'alerts': alerts,
        })


# --------------------------------------------------------------------------- #
# Vue manager                                                                 #
# --------------------------------------------------------------------------- #

EXECUTION_LABELS = [
    ('a_demarrer', 'À démarrer'),
    ('en_cours', 'En cours'),
    ('en_pause', 'En pause'),
    ('terminee', 'Terminée'),
]
VALIDATION_LABELS = [('envoyee', 'Envoyée'), ('acceptee', 'Acceptée'), ('refusee', 'Refusée')]


class ManagerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        organisation = user.organisation
        if not organisation:
            raise PermissionDenied("Votre compte n'est rattaché à aucune organisation.")

        apply_fermetures_techniques(organisation)
        managed = list(Team.objects.filter(organisation=organisation, manager=user)
                       .prefetch_related('team_members'))
        if not managed:
            raise PermissionDenied("Vous ne gérez aucune équipe.")

        today = timezone.localdate()
        period = request.query_params.get('period', 'quarter')
        if period not in PERIODS:
            period = 'quarter'

        team_param = request.query_params.get('team')
        team = None
        if team_param and team_param.isdigit():
            team = next((t for t in managed if t.id == int(team_param)), None)
        if team is None:
            team = managed[0]

        members = list(team.team_members.all())
        if team.manager and team.manager.id not in {m.id for m in members}:
            members.append(team.manager)
        member_ids = {m.id for m in members}

        team_tasks = list(
            Task.objects.filter(organisation=organisation, equipe=team)
            .select_related('project')
        )
        task_ids = {t.id for t in team_tasks}
        assignments = list(
            TaskAssignment.objects.filter(task__equipe=team)
            .select_related('task', 'user')
        )

        # --- KPIs -----------------------------------------------------
        active_by_task = {}
        for assignment in assignments:
            active_by_task.setdefault(assignment.task_id, []).append(assignment)
        active_tasks = 0
        for task in team_tasks:
            if task.statut != 'acceptee':
                continue
            group = active_by_task.get(task.id, [])
            if not group or any(a.execution_statut != 'terminee' for a in group):
                active_tasks += 1

        late_tasks = 0
        for task in team_tasks:
            if task.echeance and task.echeance < today:
                group = active_by_task.get(task.id, [])
                if not group or any(a.execution_statut != 'terminee' for a in group):
                    late_tasks += 1

        done_cutoff = today - timedelta(days=30)
        tasks_done_30d = sum(1 for a in assignments
                             if a.execution_statut == 'terminee' and a.terminee_le
                             and a.terminee_le.date() >= done_cutoff)
        notes = [a.note for a in assignments if a.note]
        avg_note = round(sum(notes) / len(notes), 1) if notes else None
        hours_in_progress = round(sum(float(a.heures or 0) for a in assignments
                                      if a.execution_statut in ACTIVE_EXECUTION), 1)
        active_project_ids = {t.project_id for t in team_tasks if t.project_id}

        members_available = sum(1 for m in members if m.statut == 'actif')

        # --- membres -------------------------------------------------
        member_rows = []
        for member in sorted(members, key=lambda m: (m.first_name, m.last_name)):
            m_assignments = [a for a in assignments if a.user_id == member.id]
            m_active = [a for a in m_assignments if a.execution_statut != 'terminee']
            m_notes = [a.note for a in m_assignments if a.note]
            member_rows.append({
                'id': member.id,
                'name': f'{member.first_name} {member.last_name}'.strip(),
                'fonction': member.fonction or '—',
                'grade': member.grade,
                'statut': member.get_statut_display(),
                'active_tasks': len(m_active),
                'hours': round(sum(float(a.heures or 0) for a in m_active), 1),
                'avg_note': round(sum(m_notes) / len(m_notes), 1) if m_notes else None,
            })

        # --- répartitions -------------------------------------------
        exec_counts = {key: 0 for key, _ in EXECUTION_LABELS}
        for assignment in assignments:
            if assignment.execution_statut in exec_counts:
                exec_counts[assignment.execution_statut] += 1
        task_status = [{'label': label, 'value': exec_counts[key]} for key, label in EXECUTION_LABELS]

        val_counts = {key: 0 for key, _ in VALIDATION_LABELS}
        for task in team_tasks:
            if task.statut in val_counts:
                val_counts[task.statut] += 1
        task_validation = [{'label': label, 'value': val_counts[key]} for key, label in VALIDATION_LABELS]

        # --- tendance mensuelle ------------------------------------
        trend_months = []
        cursor = _add_months(_month_start(today), -6)
        for i in range(7):
            start = _add_months(cursor, i)
            end = _add_months(cursor, i + 1)
            trend_months.append({'label': MONTHS_FR[start.month - 1], 'start': start, 'end': end,
                                 'done': 0, 'created': 0})
        for task in team_tasks:
            d = task.created_at.date()
            for bucket in trend_months:
                if bucket['start'] <= d < bucket['end']:
                    bucket['created'] += 1
                    break
        for assignment in assignments:
            if assignment.execution_statut == 'terminee' and assignment.terminee_le:
                d = assignment.terminee_le.date()
                for bucket in trend_months:
                    if bucket['start'] <= d < bucket['end']:
                        bucket['done'] += 1
                        break
        tasks_trend = [{'label': b['label'], 'done': b['done'], 'created': b['created']} for b in trend_months]

        # --- projets traités par l'équipe --------------------------
        project_rows = []
        projects_seen = {}
        for task in team_tasks:
            if task.project_id:
                projects_seen.setdefault(task.project_id, task.project)
        for project_id, project in projects_seen.items():
            proj_tasks = [t for t in team_tasks if t.project_id == project_id]
            proj_assignments = [a for a in assignments if a.task.project_id == project_id]
            done = sum(1 for a in proj_assignments if a.execution_statut == 'terminee')
            progress = _progress(done, len(proj_assignments))
            all_done = proj_assignments and all(a.execution_statut == 'terminee' for a in proj_assignments)
            overdue = any(t.echeance and t.echeance < today for t in proj_tasks) and not all_done
            status = 'Terminé' if all_done else ('En retard' if overdue else 'En cours')
            last_activity = max(
                [a.terminee_le or a.created_at for a in proj_assignments] +
                [t.created_at for t in proj_tasks],
                default=None,
            )
            tasks_done = sum(
                1 for t in proj_tasks
                if active_by_task.get(t.id)
                and all(a.execution_statut == 'terminee' for a in active_by_task[t.id])
            )
            project_rows.append({
                'code': project.code, 'name': project.nom,
                'tasks_total': len(proj_tasks), 'tasks_done': tasks_done,
                'progress': progress, 'status': status,
                'last_activity': last_activity.strftime('%d/%m/%Y') if last_activity else '—',
            })
        project_rows.sort(key=lambda r: r['code'])

        # --- EHS ---------------------------------------------------
        ehs_consumed = round(sum(float(a.ehs_consomme or 0) for a in assignments
                                 if a.execution_statut == 'terminee'), 1)
        ehs_by_month = []
        for bucket in trend_months:
            total = sum(float(a.ehs_consomme or 0) for a in assignments
                        if a.execution_statut == 'terminee' and a.terminee_le
                        and bucket['start'] <= a.terminee_le.date() < bucket['end'])
            ehs_by_month.append({'label': bucket['label'], 'value': round(total, 1)})

        # --- charge par membre -----------------------------------
        workload = []
        for row in member_rows:
            workload.append({'label': row['name'], 'hours': row['hours'], 'capacity': MONTHLY_CAPACITY_HOURS})

        # --- alertes --------------------------------------------
        alerts = []
        for row in member_rows:
            if row['hours'] > MONTHLY_CAPACITY_HOURS:
                alerts.append({
                    'id': f'MA-load-{row["id"]}', 'level': 'medium',
                    'title': f'{row["name"]} en surcharge',
                    'detail': f'{row["hours"]} h staffées pour une capacité de {int(MONTHLY_CAPACITY_HOURS)} h.',
                    'target': 'staffing-suivi',
                })
        if late_tasks:
            alerts.append({
                'id': 'MA-late', 'level': 'high',
                'title': f'{late_tasks} tâche(s) de l\'équipe en retard',
                'detail': 'Des tâches ont dépassé leur échéance sans être terminées.',
                'target': 'staffing-execute',
            })
        stale_cutoff = timezone.now() - timedelta(days=3)
        pending = sum(1 for t in team_tasks if t.statut == 'envoyee' and t.created_at <= stale_cutoff)
        if pending:
            alerts.append({
                'id': 'MA-pending', 'level': 'medium',
                'title': f'{pending} tâche(s) en attente d\'acceptation',
                'detail': 'Des tâches vous sont envoyées depuis plus de 3 jours.',
                'target': 'controle-taches',
            })
        idle = [row['name'] for row in member_rows if row['active_tasks'] == 0 and row['statut'] == 'Actif']
        if idle:
            alerts.append({
                'id': 'MA-idle', 'level': 'info',
                'title': f'{len(idle)} collaborateur(s) sans tâche active',
                'detail': ', '.join(idle[:5]) + '.',
                'target': 'staffing',
            })

        return Response({
            'teams': [{'id': t.id, 'code': t.code, 'name': t.name} for t in managed],
            'team': {'id': team.id, 'code': team.code, 'name': team.name},
            'currency_code': organisation.currency_code,
            'period': period,
            'generated_at': timezone.now().isoformat(),
            'kpi': {
                'members': len(members), 'members_available': members_available,
                'active_tasks': active_tasks, 'late_tasks': late_tasks,
                'tasks_done_30d': tasks_done_30d, 'avg_note': avg_note,
                'hours_in_progress': hours_in_progress,
                'projects_active': len(active_project_ids),
            },
            'members': member_rows,
            'task_status': task_status,
            'task_validation': task_validation,
            'tasks_trend': tasks_trend,
            'projects': project_rows,
            'ehs': {'consumed': ehs_consumed, 'by_month': ehs_by_month},
            'workload': workload,
            'alerts': alerts,
        })
