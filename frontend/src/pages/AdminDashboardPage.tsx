// Tableau de bord Administrateur — PERLE / NAUMUR SARL.
// Supervision de l'activité, de la sécurité et de la santé du système.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './AdminDashboardPage.css'
import AnimatedLogo from '../components/AnimatedLogo'
import DatePicker from '../components/DatePicker'
import { useI18n, type Language } from '../i18n/I18nContext'
import {
  ActivityChart, AuditActivityChart, BackupsChart, CeleryChart, ErrorsChart, StorageChart, UsersDonut,
} from '../components/admin/AdminCharts'
import {
  ConfirmDialog, DetailDrawer, SeverityBadge, StatusDot, ToastStack, Widget,
  type ConfirmRequest, type Toast,
} from '../components/admin/AdminUI'
import { downloadCsv } from '../components/dashboard/chartTools'
import {
  PERIOD_LABELS, activitySeries, alerts as seedAlerts, auditActivitySeries, auditLog, backups,
  celerySeries, connections, errorIncidentIndex, errorSeries, kpiSnapshot, storagePercent,
  usersByRole, usersByStatus,
  type Alert, type AuditEntry, type Backup, type Connection, type PeriodKey, type Severity, type WidgetState,
} from '../components/admin/adminData'

const OPERATOR = 'Y. DIEUDONNE — Administrateur applicatif'
const FILTERS_KEY = 'perle-admin-filters'

const MENU = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '▤' },
  { id: 'users', label: 'Utilisateurs', icon: '☰' },
  { id: 'roles', label: 'Rôles et permissions', icon: '⚿' },
  { id: 'referentiels', label: 'Référentiels', icon: '▧' },
  { id: 'settings', label: 'Paramètres globaux', icon: '⚙' },
  { id: 'transfer', label: 'Import / Export', icon: '⇅' },
  { id: 'audit', label: 'Journal d’audit', icon: '▦' },
  { id: 'maintenance', label: 'Sauvegardes et maintenance', icon: '⛁' },
] as const

type SectionId = (typeof MENU)[number]['id']

const clock = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const stamp = () => new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })

export default function AdminDashboardPage({ onExit, onLogout }: { onExit?: () => void; onLogout?: () => void }) {
  const { language, setLanguage } = useI18n()

  const stored = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(FILTERS_KEY) ?? '{}') } catch { return {} }
  }, [])

  const [section, setSection] = useState<SectionId>('dashboard')
  const [prefilter, setPrefilter] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodKey>(stored.period ?? 'today')
  const [range, setRange] = useState<{ from: string; to: string }>(stored.range ?? { from: '2026-07-01', to: '2026-07-30' })
  const [autoRefresh, setAutoRefresh] = useState<string>(stored.autoRefresh ?? '0')
  const [demoState, setDemoState] = useState<WidgetState>('ready')
  const [loading, setLoading] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(stamp())
  const [clockLabel, setClockLabel] = useState(clock())

  const [alertList, setAlertList] = useState<Alert[]>(seedAlerts)
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [drawer, setDrawer] = useState<{ title: string; body: React.ReactNode } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Les filtres choisis sont conservés pendant toute la session.
  useEffect(() => {
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ period, range, autoRefresh }))
  }, [period, range, autoRefresh])

  const notify = useCallback((tone: Toast['tone'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, tone, message }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 6000)
  }, [])

  const refresh = useCallback((silent = false) => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setRefreshedAt(stamp())
      setClockLabel(clock())
      if (!silent) notify('info', `Données actualisées à ${clock()}.`)
    }, 700)
  }, [notify])

  useEffect(() => {
    if (autoRefresh === '0') return
    const timer = setInterval(() => refresh(true), Number(autoRefresh) * 1000)
    return () => clearInterval(timer)
  }, [autoRefresh, refresh])

  // Recherche globale : Ctrl+K.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const data = useMemo(() => ({
    activity: activitySeries(period),
    errors: errorSeries(period),
    celery: celerySeries(period),
    audit: auditActivitySeries(period),
  }), [period])

  const widgetState = (base: WidgetState = 'ready'): WidgetState => loading ? 'loading' : demoState === 'ready' ? base : demoState
  const kpiLoading = loading || demoState === 'loading'

  const drill = (target: SectionId, filter: string) => {
    setSection(target)
    setPrefilter(filter)
    setMenuOpen(false)
    notify('info', `Vue ouverte : ${MENU.find((item) => item.id === target)?.label} — filtre « ${filter} ».`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setAlertStatus = (id: string, status: Alert['status'], owner?: string) => {
    setAlertList((current) => current.map((alert) => alert.id === id ? { ...alert, status, owner: owner ?? alert.owner } : alert))
  }

  const periodLabel = period === 'custom' ? `${range.from} → ${range.to}` : PERIOD_LABELS[period]

  return <div className="adm-root" data-section={section}>
    {/* ------------------------------------------------------------------ */}
    {/* Barre supérieure fixe                                               */}
    {/* ------------------------------------------------------------------ */}
    <header className="adm-topbar">
      <button type="button" className="adm-burger adm-icon-btn" aria-label="Ouvrir le menu d’administration" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>☰</button>

      <button type="button" className="adm-brand" onClick={() => { setSection('dashboard'); setPrefilter(null) }} aria-label="PERLE — revenir au tableau de bord">
        <AnimatedLogo size={30} uid="admin-logo" />
        <span><b>PERLE</b><small>NAUMUR SARL</small></span>
      </button>

      <div className="adm-search">
        <label htmlFor="adm-global-search" className="adm-visually-hidden">Recherche globale</label>
        <i aria-hidden="true">⌕</i>
        <input id="adm-global-search" ref={searchRef} type="search" placeholder="Rechercher un utilisateur, un rôle, un événement…" />
        <kbd>Ctrl</kbd><kbd>K</kbd>
      </div>

      <div className="adm-topbar-tools">
        <label className="adm-select-inline">
          <span className="adm-visually-hidden">Exercice comptable</span>
          <select defaultValue="2026" aria-label="Exercice comptable">
            <option value="2026">Exercice 2026</option>
            <option value="2025">Exercice 2025</option>
            <option value="2024">Exercice 2024</option>
          </select>
        </label>

        <label className="adm-select-inline">
          <span aria-hidden="true">🌐</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Langue de l’interface">
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </label>

        <button type="button" className="adm-icon-btn adm-bell" aria-label="Notifications : 4 non lues" onClick={() => drill('audit', 'Notifications non lues')}>
          🔔<span className="adm-badge" aria-hidden="true">4</span>
        </button>

        <div className="adm-profile">
          <button type="button" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen(!profileOpen)}>
            <span className="adm-avatar" aria-hidden="true">YD</span>
            <span className="adm-profile-id"><b>Y. DIEUDONNE</b><small>Administrateur</small></span>
            <em aria-hidden="true">▾</em>
          </button>
          {profileOpen && <ul className="adm-menu-pop" role="menu">
            <li><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); notify('info', 'Ouverture de « Mon profil ».') }}>Mon profil</button></li>
            <li><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); notify('info', 'Ouverture des préférences.') }}>Préférences</button></li>
            <li><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); notify('info', 'Ouverture de « Sécurité et MFA ».') }}>Sécurité et MFA</button></li>
            <li><button type="button" role="menuitem" className="adm-menu-danger" onClick={() => { setProfileOpen(false); onLogout?.() }}>Déconnexion</button></li>
          </ul>}
        </div>
      </div>
    </header>

    <div className="adm-shell">
      {/* ---------------------------------------------------------------- */}
      {/* Menu latéral gauche (drawer sur mobile)                           */}
      {/* ---------------------------------------------------------------- */}
      {menuOpen && <div className="adm-scrim" onClick={() => setMenuOpen(false)} />}
      <nav className={`adm-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation de l’administration">
        <div className="adm-sidebar-head">
          <p>Administration</p>
          <button type="button" className="adm-icon-btn adm-sidebar-close" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <ul>
          {MENU.map((item) => <li key={item.id}>
            <button
              type="button"
              className={section === item.id ? 'is-active' : ''}
              aria-current={section === item.id ? 'page' : undefined}
              onClick={() => { setSection(item.id); setPrefilter(null); setMenuOpen(false) }}
            >
              <i aria-hidden="true">{item.icon}</i>{item.label}
            </button>
          </li>)}
        </ul>
        {onExit && <button type="button" className="adm-back-link" onClick={onExit}>← Retour à PERLE</button>}
      </nav>

      <main className="adm-main">
        {section === 'dashboard' ? <>
          {/* -------------------------------------------------------------- */}
          {/* En-tête du contenu                                              */}
          {/* -------------------------------------------------------------- */}
          <div className="adm-page-head">
            <nav className="adm-breadcrumb" aria-label="Fil d’Ariane">
              <button type="button" onClick={() => setSection('dashboard')}>Administration</button>
              <span aria-hidden="true">›</span>
              <span aria-current="page">Tableau de bord</span>
            </nav>

            <div className="adm-page-title">
              <div>
                <h1>Tableau de bord administrateur</h1>
                <p>Supervision de l’activité, de la sécurité et de la santé du système</p>
                <small className="adm-refreshed">
                  <i aria-hidden="true">⟳</i>
                  Données actualisées à {clockLabel} · dernière actualisation : {refreshedAt}
                </small>
              </div>
              <div className="adm-head-actions">
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => window.print()}>⎙ Exporter en PDF</button>
                <button type="button" className="adm-btn adm-btn-primary" onClick={() => refresh()} disabled={loading}>
                  {loading ? '⟳ Actualisation…' : '⟳ Actualiser'}
                </button>
              </div>
            </div>

            <div className="adm-filters" role="group" aria-label="Filtres du tableau de bord">
              <div className="adm-segmented" role="group" aria-label="Période">
                {(['today', '7d', '30d', 'custom'] as PeriodKey[]).map((key) => <button
                  key={key}
                  type="button"
                  className={period === key ? 'is-active' : ''}
                  aria-pressed={period === key}
                  onClick={() => { setPeriod(key); refresh(true) }}
                >{PERIOD_LABELS[key]}</button>)}
              </div>

              {period === 'custom' && <div className="adm-range">
                <DatePicker label="Du" value={range.from} onChange={(v) => setRange({ ...range, from: v })} />
                <DatePicker label="Au" value={range.to} min={range.from || undefined} onChange={(v) => setRange({ ...range, to: v })} />
              </div>}

              <label className="adm-select-labelled">
                <span>Actualisation automatique</span>
                <select value={autoRefresh} onChange={(event) => setAutoRefresh(event.target.value)}>
                  <option value="0">Arrêtée</option>
                  <option value="30">30 secondes</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                </select>
              </label>

              <label className="adm-select-labelled adm-demo-select">
                <span>États des widgets (démo)</span>
                <select value={demoState} onChange={(event) => setDemoState(event.target.value as WidgetState)}>
                  <option value="ready">Données disponibles</option>
                  <option value="loading">Chargement</option>
                  <option value="empty">Aucune donnée</option>
                  <option value="error">Erreur de chargement</option>
                </select>
              </label>

              <p className="adm-filter-note">Période appliquée : <b>{periodLabel}</b></p>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* 1. Indicateurs clés                                             */}
          {/* -------------------------------------------------------------- */}
          <section className="adm-section" aria-labelledby="adm-kpi-title">
            <h2 id="adm-kpi-title" className="adm-section-title">Indicateurs clés</h2>
            <div className="adm-kpi-grid">
              <KpiCard
                loading={kpiLoading}
                icon="☰"
                tone="neutral"
                label="Utilisateurs actifs"
                value={String(kpiSnapshot.activeUsers)}
                trend={{ direction: 'up', text: `+${kpiSnapshot.activeUsersDelta} vs période précédente` }}
                details={[`${kpiSnapshot.totalAccounts} comptes au total`, `${kpiSnapshot.disabledAccounts} comptes désactivés`]}
                onOpen={() => drill('users', 'Statut = Actifs')}
              />
              <KpiCard
                loading={kpiLoading}
                icon="◉"
                tone="neutral"
                label="Sessions en cours"
                value={String(kpiSnapshot.sessions)}
                trend={{ direction: 'flat', text: `${kpiSnapshot.uniqueConnected} utilisateurs uniques connectés` }}
                details={[`Pic du jour : ${kpiSnapshot.sessionPeak} sessions`]}
                onOpen={() => setDrawer({ title: 'Sessions actives', body: <SessionsDetail /> })}
              />
              <KpiCard
                loading={kpiLoading}
                icon={kpiSnapshot.errorsCritical > 0 ? '⛔' : '▲'}
                tone={kpiSnapshot.errorsCritical > 0 ? 'danger' : 'warn'}
                label="Erreurs (24 h)"
                value={String(kpiSnapshot.errors24h)}
                trend={{ direction: 'down', text: `${kpiSnapshot.errorsDelta} vs 24 h précédentes` }}
                details={[
                  `${kpiSnapshot.errorsCritical} critiques · ${kpiSnapshot.errorsMajor} majeures · ${kpiSnapshot.errorsMinor} mineures`,
                ]}
                onOpen={() => drill('audit', 'Journal technique · Niveau = Erreur')}
              />
              <KpiCard
                loading={kpiLoading}
                icon="⛁"
                tone="ok"
                label="Dernière sauvegarde"
                value={kpiSnapshot.lastBackup.slice(-5)}
                trend={{ direction: 'flat', text: `Statut : ${kpiSnapshot.lastBackupStatus}` }}
                details={[`${kpiSnapshot.lastBackupSizeGo} Go`, `Il y a ${kpiSnapshot.sinceLastBackup}`]}
                onOpen={() => { setSection('maintenance'); setPrefilter('Sauvegardes récentes') }}
              />
              <KpiCard
                loading={kpiLoading}
                icon="⚙"
                tone={kpiSnapshot.celeryFailed > 0 ? 'warn' : 'ok'}
                label="Tâches Celery"
                value={String(kpiSnapshot.celeryRunning)}
                trend={{ direction: 'flat', text: `${kpiSnapshot.celeryPending} en attente · ${kpiSnapshot.celeryFailed} échouée` }}
                details={[`Durée moyenne : ${kpiSnapshot.celeryAverage}`]}
                onOpen={() => drill('maintenance', 'Moniteur des tâches Celery')}
              />
              <KpiCard
                loading={kpiLoading}
                icon="●"
                tone="ok"
                label="État global du système"
                value={kpiSnapshot.systemStatus}
                trend={{ direction: 'flat', text: `Disponibilité ${kpiSnapshot.availability}` }}
                details={[`Temps de réponse moyen : ${kpiSnapshot.responseTime}`]}
                onOpen={() => drill('maintenance', 'Santé du système')}
              />
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* 2. Graphiques de supervision                                    */}
          {/* -------------------------------------------------------------- */}
          <section className="adm-section" aria-labelledby="adm-charts-title">
            <h2 id="adm-charts-title" className="adm-section-title">Graphiques de supervision</h2>

            <div className="adm-grid-12">
              <Widget
                className="adm-col-8"
                title="Activité et connexions"
                subtitle={`Connexions, utilisateurs uniques et sessions · ${periodLabel}`}
                state={widgetState()}
                onRetry={() => refresh()}
                actions={<button type="button" className="adm-btn adm-btn-link" onClick={() => downloadCsv(
                  'perle-activite-connexions.csv',
                  ['Intervalle', 'Réussies', 'Échouées', 'Utilisateurs uniques', 'Sessions'],
                  data.activity.map((point) => [point.label, point.success, point.failed, point.uniqueUsers, point.sessions]),
                )}>Export CSV</button>}
              >
                <ActivityChart data={data.activity} onPointClick={(point) => drill('audit', `Connexions · ${point.label}`)} />
              </Widget>

              <Widget
                className="adm-col-4"
                title="Utilisation du stockage"
                subtitle={`${storagePercent} % occupés · seuils 70 % / 85 %`}
                state={widgetState()}
                onRetry={() => refresh()}
              >
                <StorageChart onCategoryClick={(label) => drill('maintenance', `Stockage · ${label}`)} />
              </Widget>

              <Widget
                className="adm-col-7"
                title="Évolution des erreurs"
                subtitle="Critiques, majeures, avertissements et erreurs applicatives"
                state={widgetState()}
                onRetry={() => refresh()}
                actions={<button type="button" className="adm-btn adm-btn-link" onClick={() => drill('audit', 'Journal technique')}>Voir les logs</button>}
              >
                <ErrorsChart
                  data={data.errors}
                  incidentIndex={errorIncidentIndex(period)}
                  onZoneClick={(point, level) => drill('audit', `Logs · ${point.label} · ${level}`)}
                />
              </Widget>

              <Widget
                className="adm-col-5"
                title="Répartition des utilisateurs"
                subtitle="Par rôle ou par statut"
                state={widgetState()}
                onRetry={() => refresh()}
              >
                <UsersDonut
                  byRole={usersByRole}
                  byStatus={usersByStatus}
                  onSliceClick={(view, label) => drill('users', `${view === 'role' ? 'Rôle' : 'Statut'} = ${label}`)}
                />
              </Widget>

              <Widget
                className="adm-col-7"
                title="Santé des tâches Celery"
                subtitle={`Taux de réussite 98,4 % · ${periodLabel}`}
                state={widgetState()}
                onRetry={() => refresh()}
              >
                <CeleryChart data={data.celery} onBucketClick={(point) => drill('maintenance', `Tâches Celery · ${point.label}`)} />
              </Widget>

              <Widget
                className="adm-col-5"
                title="État des sauvegardes"
                subtitle="7 derniers jeux de sauvegarde"
                state={widgetState()}
                onRetry={() => refresh()}
                actions={<button type="button" className="adm-btn adm-btn-link" onClick={() => { setSection('maintenance'); setPrefilter('Sauvegardes') }}>Ouvrir la maintenance</button>}
              >
                <BackupsChart data={backups} onBackupClick={(backup) => setDrawer({ title: `Sauvegarde ${backup.id}`, body: <BackupDetail backup={backup} /> })} />
              </Widget>

              <Widget
                className="adm-col-12"
                title="Actions administratives et audit"
                subtitle="Volume quotidien des actions sensibles"
                state={widgetState()}
                onRetry={() => refresh()}
                actions={<button type="button" className="adm-btn adm-btn-link" onClick={() => drill('audit', 'Toutes les actions sensibles')}>Ouvrir le journal d’audit</button>}
              >
                <AuditActivityChart data={data.audit} onDayClick={(label) => drill('audit', `Actions du ${label}`)} />
              </Widget>
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* 3 & 4. Connexions récentes + alertes système                    */}
          {/* -------------------------------------------------------------- */}
          <section className="adm-section adm-grid-12" aria-labelledby="adm-security-title">
            <h2 id="adm-security-title" className="adm-section-title adm-col-12">Sécurité et supervision opérationnelle</h2>

            <Widget
              className="adm-col-7"
              title="Connexions récentes"
              subtitle="Dernières tentatives d’authentification"
              state={widgetState()}
              skeleton="table"
              onRetry={() => refresh()}
              actions={<button type="button" className="adm-btn adm-btn-link" onClick={() => downloadCsv(
                'perle-connexions-recentes.csv',
                ['Date et heure', 'Utilisateur', 'Email', 'Adresse IP', 'Appareil', 'Localisation', 'Résultat', 'Tentatives'],
                connections.map((row) => [row.datetime, row.user, row.email, row.ip, row.device, row.location, row.result, row.attempts]),
              )}>Export CSV</button>}
              footer={<button type="button" className="adm-btn adm-btn-ghost adm-btn-block" onClick={() => drill('audit', 'Toutes les connexions')}>Voir toutes les connexions</button>}
            >
              <ConnectionsTable
                rows={connections}
                onDetail={(row) => setDrawer({ title: `Connexion ${row.id}`, body: <ConnectionDetail row={row} /> })}
                onOpenUser={(row) => drill('users', `Utilisateur = ${row.user}`)}
                onRevoke={(row) => setConfirm({
                  title: 'Révoquer la session',
                  action: `Révoquer la session active de ${row.user} (${row.ip})`,
                  consequences: [
                    'L’utilisateur est immédiatement déconnecté de tous ses onglets.',
                    'Les tâches non enregistrées de cette session sont perdues.',
                    'L’opération est tracée dans le journal d’audit.',
                  ],
                  confirmLabel: 'Révoquer la session',
                  tone: 'danger',
                  onConfirm: () => notify('success', `Session de ${row.user} révoquée.`),
                })}
                onLock={(row) => setConfirm({
                  title: 'Verrouiller temporairement le compte',
                  action: `Verrouiller le compte ${row.email} pendant 30 minutes`,
                  consequences: [
                    'L’utilisateur ne pourra plus se connecter jusqu’au déverrouillage.',
                    'Une notification est envoyée à l’utilisateur et à son manager.',
                    'Le motif saisi est conservé dans le journal d’audit.',
                  ],
                  needsReason: true,
                  reasonLabel: 'Motif du verrouillage',
                  confirmLabel: 'Verrouiller le compte',
                  tone: 'danger',
                  onConfirm: (reason) => notify('warning', `Compte ${row.user} verrouillé. Motif : ${reason}`),
                })}
              />
            </Widget>

            <Widget
              className="adm-col-5"
              title="Alertes système"
              subtitle={`${alertList.filter((alert) => alert.status === 'Nouvelle').length} alertes nouvelles sur ${alertList.length}`}
              state={widgetState()}
              skeleton="list"
              onRetry={() => refresh()}
              footer={<button type="button" className="adm-btn adm-btn-ghost adm-btn-block" onClick={() => drill('audit', 'Toutes les alertes')}>Voir toutes les alertes</button>}
            >
              <div className="adm-alert-filters" role="group" aria-label="Filtrer les alertes par gravité">
                {(['all', 'critical', 'high', 'medium', 'info'] as const).map((key) => <button
                  key={key}
                  type="button"
                  className={severityFilter === key ? 'is-active' : ''}
                  aria-pressed={severityFilter === key}
                  onClick={() => setSeverityFilter(key)}
                >{key === 'all' ? 'Toutes' : { critical: 'Critique', high: 'Élevé', medium: 'Moyen', info: 'Information' }[key]}</button>)}
              </div>
              <AlertsPanel
                alerts={alertList.filter((alert) => severityFilter === 'all' || alert.severity === severityFilter)}
                onOpen={(alert) => setDrawer({ title: alert.title, body: <AlertDetail alert={alert} /> })}
                onTake={(alert) => { setAlertStatus(alert.id, 'Prise en charge', OPERATOR.split(' —')[0]); notify('success', `Alerte ${alert.id} prise en charge.`) }}
                onResolve={(alert) => { setAlertStatus(alert.id, 'Résolue'); notify('success', `Alerte ${alert.id} marquée comme résolue.`) }}
                onIgnore={(alert) => setConfirm({
                  title: 'Ignorer l’alerte',
                  action: `Ignorer l’alerte ${alert.id} — ${alert.title}`,
                  consequences: [
                    'L’alerte disparaît du panneau prioritaire.',
                    'Elle reste consultable dans l’historique des alertes.',
                    'Le motif est obligatoire et sera tracé.',
                  ],
                  needsReason: true,
                  reasonLabel: 'Motif de l’abandon',
                  confirmLabel: 'Ignorer l’alerte',
                  onConfirm: (reason) => { setAlertStatus(alert.id, 'Ignorée'); notify('info', `Alerte ${alert.id} ignorée. Motif : ${reason}`) },
                })}
                onLog={(alert) => drill('audit', `Journal · ${alert.source}`)}
              />
            </Widget>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* 5. Actions rapides                                              */}
          {/* -------------------------------------------------------------- */}
          <section className="adm-section" aria-labelledby="adm-quick-title">
            <h2 id="adm-quick-title" className="adm-section-title">Actions rapides</h2>
            <div className="adm-quick-grid">
              <QuickAction icon="⛁" label="Lancer une sauvegarde manuelle" hint="Instantané complet de la base et des pièces jointes" onClick={() => setConfirm({
                title: 'Lancer une sauvegarde manuelle',
                action: 'Créer immédiatement une sauvegarde complète (base de données + pièces jointes)',
                consequences: [
                  'L’opération mobilise environ 12 minutes et 43 Go d’espace disque.',
                  'Les performances de l’application peuvent être ralenties pendant l’export.',
                  'Le stockage passera d’environ 78 % à 87 % d’occupation.',
                ],
                needsReason: true,
                reasonLabel: 'Motif de la sauvegarde',
                confirmLabel: 'Lancer la sauvegarde',
                onConfirm: (reason) => notify('success', `Sauvegarde manuelle lancée. Motif : ${reason}`),
              })} />

              <QuickAction icon="⟲" label="Purger le cache" hint="Référentiels, permissions et fragments de pages" onClick={() => setConfirm({
                title: 'Purger le cache applicatif',
                action: 'Vider l’intégralité du cache applicatif (2 148 clés)',
                consequences: [
                  'Les premières requêtes après la purge seront plus lentes.',
                  'Les sessions utilisateurs ne sont pas interrompues.',
                  'Aucune donnée métier n’est supprimée.',
                ],
                needsReason: true,
                reasonLabel: 'Motif de la purge',
                confirmLabel: 'Purger le cache',
                onConfirm: (reason) => notify('success', `Cache purgé (2 148 clés). Motif : ${reason}`),
              })} />

              <QuickAction icon="▦" label="Voir le journal d’audit" hint="Historique complet des actions sensibles" onClick={() => { setSection('audit'); setPrefilter(null) }} />

              <QuickAction icon="📣" label="Nouvelle notification broadcast" hint="Message diffusé à tous les utilisateurs connectés" onClick={() => setConfirm({
                title: 'Diffuser une notification',
                action: 'Envoyer une notification à l’ensemble des 47 utilisateurs actifs',
                consequences: [
                  'Le message apparaît immédiatement dans la cloche de chaque utilisateur.',
                  'La diffusion ne peut pas être annulée une fois envoyée.',
                  'L’envoi est tracé dans le journal d’audit.',
                ],
                needsReason: true,
                reasonLabel: 'Contenu du message',
                confirmLabel: 'Diffuser le message',
                onConfirm: (reason) => notify('success', `Notification diffusée à 47 utilisateurs : « ${reason} »`),
              })} />

              <QuickAction icon="＋" label="Ajouter un utilisateur" hint="Créer un compte et lui affecter un rôle" onClick={() => drill('users', 'Création d’un compte')} />

              <QuickAction icon="⛔" label="Consulter les erreurs" hint="Journal technique filtré sur les erreurs" onClick={() => drill('audit', 'Journal technique · Niveau = Erreur')} />

              <QuickAction icon="⇱" label="Tester une restauration" hint="Se poursuit sur la page de maintenance" onClick={() => {
                setSection('maintenance')
                setPrefilter('Test de restauration')
                notify('info', 'Sélectionnez la sauvegarde à restaurer sur la page de maintenance : aucune restauration n’est lancée depuis le tableau de bord.')
              }} />
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* 6. Journal d'audit récent                                       */}
          {/* -------------------------------------------------------------- */}
          <section className="adm-section" aria-labelledby="adm-audit-title">
            <h2 id="adm-audit-title" className="adm-section-title">Journal d’audit récent</h2>
            <Widget
              title="10 derniers événements administratifs"
              subtitle="Actions sensibles réalisées sur l’application"
              state={widgetState()}
              skeleton="table"
              onRetry={() => refresh()}
              actions={<button type="button" className="adm-btn adm-btn-link" onClick={() => downloadCsv(
                'perle-journal-audit.csv',
                ['Date', 'Utilisateur', 'Action', 'Objet', 'Résumé', 'Adresse IP', 'Sensibilité'],
                auditLog.map((entry) => [entry.date, entry.user, entry.action, entry.entity, entry.summary, entry.ip, entry.sensitivity]),
              )}>Export CSV</button>}
              footer={<button type="button" className="adm-btn adm-btn-ghost adm-btn-block" onClick={() => { setSection('audit'); setPrefilter(null) }}>Voir le journal d’audit complet</button>}
            >
              <AuditTable rows={auditLog} onDetail={(entry) => setDrawer({ title: `Événement ${entry.id}`, body: <AuditDetail entry={entry} /> })} />
            </Widget>
          </section>
        </> : (
          <SubSection
            section={section}
            prefilter={prefilter}
            onBack={() => { setSection('dashboard'); setPrefilter(null) }}
            onDetail={(entry) => setDrawer({ title: `Événement ${entry.id}`, body: <AuditDetail entry={entry} /> })}
            onRestore={(backup) => setConfirm({
              title: 'Tester la restauration',
              action: `Restaurer la sauvegarde ${backup.id} du ${backup.date} sur l’environnement de test`,
              consequences: [
                'L’environnement de test est intégralement écrasé par cette sauvegarde.',
                'L’opération dure environ 25 minutes et bloque les exports pendant ce temps.',
                'La production n’est pas affectée.',
              ],
              needsReason: true,
              reasonLabel: 'Motif de la restauration',
              confirmLabel: 'Lancer le test de restauration',
              tone: 'danger',
              onConfirm: (reason) => notify('success', `Test de restauration de ${backup.id} lancé. Motif : ${reason}`),
            })}
          />
        )}

        <footer className="adm-footer">
          <p>PERLE — Pilotage par les EHS · © {new Date().getFullYear()} NAUMUR SARL</p>
          <p>Données actualisées à {clockLabel}</p>
        </footer>
      </main>
    </div>

    {confirm && <ConfirmDialog request={confirm} operator={OPERATOR} onClose={() => setConfirm(null)} />}
    {drawer && <DetailDrawer title={drawer.title} onClose={() => setDrawer(null)}>{drawer.body}</DetailDrawer>}
    <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
  </div>
}

// ---------------------------------------------------------------------------
// Carte KPI
// ---------------------------------------------------------------------------

function KpiCard({ icon, tone, label, value, trend, details, onOpen, loading }: {
  icon: string
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
  label: string
  value: string
  trend: { direction: 'up' | 'down' | 'flat'; text: string }
  details: string[]
  onOpen: () => void
  loading: boolean
}) {
  if (loading) return <div className="adm-kpi adm-kpi-skeleton" role="status"><span className="adm-visually-hidden">Chargement de l’indicateur {label}</span><i /><i /><i /></div>

  const arrow = { up: '↑', down: '↓', flat: '→' }[trend.direction]
  return <button type="button" className={`adm-kpi adm-kpi-${tone}`} onClick={onOpen}>
    <span className="adm-kpi-head">
      <i className="adm-kpi-icon" aria-hidden="true">{icon}</i>
      <span className="adm-kpi-label">{label}</span>
    </span>
    <strong className="adm-kpi-value">{value}</strong>
    <span className={`adm-kpi-trend adm-trend-${trend.direction}`}><i aria-hidden="true">{arrow}</i>{trend.text}</span>
    <ul className="adm-kpi-details">{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
    <span className="adm-kpi-cta" aria-hidden="true">Ouvrir le détail →</span>
  </button>
}

function QuickAction({ icon, label, hint, onClick }: { icon: string; label: string; hint: string; onClick: () => void }) {
  return <button type="button" className="adm-quick" onClick={onClick}>
    <i aria-hidden="true">{icon}</i>
    <span><b>{label}</b><small>{hint}</small></span>
    <em aria-hidden="true">→</em>
  </button>
}

// ---------------------------------------------------------------------------
// Connexions récentes
// ---------------------------------------------------------------------------

const FLAG_TONE: Record<string, 'danger' | 'warn'> = {
  'Échecs répétés': 'danger',
  'Compte verrouillé': 'danger',
  'Nouvelle adresse IP': 'warn',
  'Connexion inhabituelle': 'warn',
}

function ConnectionsTable({ rows, onDetail, onOpenUser, onRevoke, onLock }: {
  rows: Connection[]
  onDetail: (row: Connection) => void
  onOpenUser: (row: Connection) => void
  onRevoke: (row: Connection) => void
  onLock: (row: Connection) => void
}) {
  return <div className="adm-table-scroll adm-cards-on-mobile">
    <table className="adm-table">
      <caption className="adm-visually-hidden">Connexions récentes des utilisateurs</caption>
      <thead>
        <tr>
          <th scope="col">Date et heure</th>
          <th scope="col">Utilisateur</th>
          <th scope="col">Adresse IP</th>
          <th scope="col">Appareil</th>
          <th scope="col">Localisation</th>
          <th scope="col">Résultat</th>
          <th scope="col">Tent.</th>
          <th scope="col">Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => <tr key={row.id} className={row.result === 'Échouée' ? 'adm-row-danger' : ''}>
          <td data-label="Date et heure">{row.datetime}</td>
          <td data-label="Utilisateur">
            <b>{row.user}</b>
            <small>{row.email}</small>
            {row.flags.length > 0 && <span className="adm-flags">
              {row.flags.map((flag) => <em key={flag} className={`adm-flag adm-flag-${FLAG_TONE[flag] ?? 'warn'}`}>
                <i aria-hidden="true">{FLAG_TONE[flag] === 'danger' ? '⛔' : '▲'}</i>{flag}
              </em>)}
            </span>}
          </td>
          <td data-label="Adresse IP"><code>{row.ip}</code></td>
          <td data-label="Appareil">{row.device}</td>
          <td data-label="Localisation">{row.location}</td>
          <td data-label="Résultat">
            <StatusDot tone={row.result === 'Réussie' ? 'ok' : 'danger'} label={row.result} />
          </td>
          <td data-label="Tentatives"><b className={row.attempts >= 3 ? 'adm-bad' : ''}>{row.attempts}</b></td>
          <td data-label="Action">
            <div className="adm-row-actions">
              <button type="button" className="adm-icon-btn" aria-label={`Voir le détail de la connexion de ${row.user}`} title="Voir le détail" onClick={() => onDetail(row)}>◱</button>
              <button type="button" className="adm-icon-btn" aria-label={`Ouvrir la fiche utilisateur de ${row.user}`} title="Ouvrir l’utilisateur" onClick={() => onOpenUser(row)}>☰</button>
              <button type="button" className="adm-icon-btn" aria-label={`Révoquer la session de ${row.user}`} title="Révoquer la session" onClick={() => onRevoke(row)}>⏻</button>
              <button type="button" className="adm-icon-btn adm-icon-danger" aria-label={`Verrouiller temporairement le compte de ${row.user}`} title="Verrouiller le compte" onClick={() => onLock(row)}>⚿</button>
            </div>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

function ConnectionDetail({ row }: { row: Connection }) {
  return <dl className="adm-detail-list">
    <div><dt>Date et heure</dt><dd>{row.datetime}</dd></div>
    <div><dt>Utilisateur</dt><dd>{row.user}</dd></div>
    <div><dt>Identifiant</dt><dd>{row.email}</dd></div>
    <div><dt>Adresse IP</dt><dd><code>{row.ip}</code></dd></div>
    <div><dt>Appareil / navigateur</dt><dd>{row.device}</dd></div>
    <div><dt>Localisation approximative</dt><dd>{row.location}</dd></div>
    <div><dt>Résultat</dt><dd><StatusDot tone={row.result === 'Réussie' ? 'ok' : 'danger'} label={row.result} /></dd></div>
    <div><dt>Tentatives</dt><dd>{row.attempts}</dd></div>
    <div><dt>Signalements</dt><dd>{row.flags.length ? row.flags.join(' · ') : 'Aucun'}</dd></div>
    <div><dt>Identifiant de corrélation</dt><dd><code>{row.id}</code></dd></div>
  </dl>
}

function SessionsDetail() {
  const sessions = [
    ['T. BESSALA', '09:41', '41.202.219.14', 'Chrome · Windows', '2 h 14'],
    ['J. EKOUMA', '09:38', '41.202.219.87', 'Edge · Windows', '2 h 17'],
    ['M. NKOA', '08:55', '41.202.219.14', 'Safari · iPhone', '3 h 00'],
    ['H. TSAFFOCK', '08:31', '102.244.17.9', 'Chrome · macOS', '11 h 04'],
  ]
  return <>
    <p className="adm-drawer-lead">12 sessions ouvertes · 11 utilisateurs uniques · pic du jour à 19 sessions.</p>
    <div className="adm-table-scroll">
      <table className="adm-table adm-table-compact">
        <caption className="adm-visually-hidden">Détail des sessions actives</caption>
        <thead><tr><th scope="col">Utilisateur</th><th scope="col">Ouverture</th><th scope="col">IP</th><th scope="col">Appareil</th><th scope="col">Durée</th></tr></thead>
        <tbody>{sessions.map((session) => <tr key={session[0]}>
          <th scope="row">{session[0]}</th>
          {session.slice(1).map((cell, index) => <td key={index}>{cell}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </>
}

// ---------------------------------------------------------------------------
// Alertes système
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, info: 3 }

function AlertsPanel({ alerts, onOpen, onTake, onResolve, onIgnore, onLog }: {
  alerts: Alert[]
  onOpen: (alert: Alert) => void
  onTake: (alert: Alert) => void
  onResolve: (alert: Alert) => void
  onIgnore: (alert: Alert) => void
  onLog: (alert: Alert) => void
}) {
  if (alerts.length === 0) return <p className="adm-inline-empty">Aucune alerte pour ce niveau de gravité.</p>

  return <ul className="adm-alerts">
    {[...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).map((alert) => <li key={alert.id} className={`adm-alert adm-alert-${alert.severity}`}>
      <div className="adm-alert-head">
        <SeverityBadge severity={alert.severity} />
        <span className={`adm-status adm-status-${alert.status === 'Nouvelle' ? 'new' : alert.status === 'Prise en charge' ? 'wip' : alert.status === 'Résolue' ? 'done' : 'muted'}`}>{alert.status}</span>
      </div>
      <h4>{alert.title}</h4>
      <p>{alert.description}</p>
      <p className="adm-alert-meta">{alert.datetime} · Source : {alert.source} · Responsable : {alert.owner}</p>
      <div className="adm-alert-actions">
        <button type="button" className="adm-btn adm-btn-mini" onClick={() => onOpen(alert)}>Ouvrir</button>
        <button type="button" className="adm-btn adm-btn-mini" disabled={alert.status !== 'Nouvelle'} onClick={() => onTake(alert)}>Prendre en charge</button>
        <button type="button" className="adm-btn adm-btn-mini" disabled={alert.status === 'Résolue'} onClick={() => onResolve(alert)}>Marquer résolue</button>
        <button type="button" className="adm-btn adm-btn-mini" disabled={alert.status === 'Ignorée'} onClick={() => onIgnore(alert)}>Ignorer</button>
        <button type="button" className="adm-btn adm-btn-mini" onClick={() => onLog(alert)}>Voir le journal</button>
      </div>
    </li>)}
  </ul>
}

function AlertDetail({ alert }: { alert: Alert }) {
  return <>
    <div className="adm-drawer-badges"><SeverityBadge severity={alert.severity} /><span className="adm-status adm-status-new">{alert.status}</span></div>
    <p className="adm-drawer-lead">{alert.description}</p>
    <dl className="adm-detail-list">
      <div><dt>Identifiant</dt><dd><code>{alert.id}</code></dd></div>
      <div><dt>Date et heure</dt><dd>{alert.datetime}</dd></div>
      <div><dt>Source</dt><dd>{alert.source}</dd></div>
      <div><dt>Responsable</dt><dd>{alert.owner}</dd></div>
    </dl>
  </>
}

// ---------------------------------------------------------------------------
// Journal d'audit
// ---------------------------------------------------------------------------

function AuditTable({ rows, onDetail }: { rows: AuditEntry[]; onDetail: (entry: AuditEntry) => void }) {
  return <div className="adm-table-scroll adm-cards-on-mobile">
    <table className="adm-table">
      <caption className="adm-visually-hidden">Derniers événements du journal d’audit</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Utilisateur</th>
          <th scope="col">Action</th>
          <th scope="col">Objet</th>
          <th scope="col">Résumé</th>
          <th scope="col">Adresse IP</th>
          <th scope="col">Sensibilité</th>
          <th scope="col">Détail</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry) => <tr key={entry.id}>
          <td data-label="Date">{entry.date}</td>
          <td data-label="Utilisateur"><b>{entry.user}</b></td>
          <td data-label="Action">{entry.action}</td>
          <td data-label="Objet">{entry.entity}</td>
          <td data-label="Résumé">{entry.summary}</td>
          <td data-label="Adresse IP"><code>{entry.ip}</code></td>
          <td data-label="Sensibilité">
            <span className={`adm-sensitivity adm-sensitivity-${entry.sensitivity === 'Élevée' ? 'high' : entry.sensitivity === 'Moyenne' ? 'medium' : 'low'}`}>
              <i aria-hidden="true">{entry.sensitivity === 'Élevée' ? '▲' : entry.sensitivity === 'Moyenne' ? '◆' : '●'}</i>{entry.sensitivity}
            </span>
          </td>
          <td data-label="Détail">
            <button type="button" className="adm-btn adm-btn-mini" onClick={() => onDetail(entry)}>Voir détail</button>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

function AuditDetail({ entry }: { entry: AuditEntry }) {
  return <>
    <p className="adm-drawer-lead">{entry.action} — {entry.entity}</p>
    <div className="adm-diff">
      <div className="adm-diff-before"><p>Valeur avant modification</p><code>{entry.before}</code></div>
      <div className="adm-diff-after"><p>Valeur après modification</p><code>{entry.after}</code></div>
    </div>
    <dl className="adm-detail-list">
      <div><dt>Auteur</dt><dd>{entry.user}</dd></div>
      <div><dt>Date</dt><dd>{entry.date}</dd></div>
      <div><dt>Adresse IP</dt><dd><code>{entry.ip}</code></dd></div>
      <div><dt>Contexte ou motif</dt><dd>{entry.context}</dd></div>
      <div><dt>Sensibilité</dt><dd>{entry.sensitivity}</dd></div>
      <div><dt>Identifiant de corrélation</dt><dd><code>{entry.correlationId}</code></dd></div>
    </dl>
  </>
}

function BackupDetail({ backup }: { backup: Backup }) {
  return <dl className="adm-detail-list">
    <div><dt>Identifiant</dt><dd><code>{backup.id}</code></dd></div>
    <div><dt>Date et heure</dt><dd>{backup.date} à {backup.time}</dd></div>
    <div><dt>Type</dt><dd>{backup.type}</dd></div>
    <div><dt>Statut</dt><dd><StatusDot tone={backup.status === 'Réussie' ? 'ok' : backup.status === 'En cours' ? 'warn' : 'danger'} label={backup.status} /></dd></div>
    <div><dt>Durée</dt><dd>{backup.duration}</dd></div>
    <div><dt>Taille</dt><dd>{backup.sizeGo} Go</dd></div>
    <div><dt>Dernier test de restauration</dt><dd>{backup.restoreTest}</dd></div>
  </dl>
}

// ---------------------------------------------------------------------------
// Sections secondaires du menu (vues préfiltrées issues du drill-down)
// ---------------------------------------------------------------------------

function SubSection({ section, prefilter, onBack, onDetail, onRestore }: {
  section: SectionId
  prefilter: string | null
  onBack: () => void
  onDetail: (entry: AuditEntry) => void
  onRestore: (backup: Backup) => void
}) {
  const meta = MENU.find((item) => item.id === section)!

  return <>
    <div className="adm-page-head">
      <nav className="adm-breadcrumb" aria-label="Fil d’Ariane">
        <button type="button" onClick={onBack}>Administration</button>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{meta.label}</span>
      </nav>
      <div className="adm-page-title">
        <div>
          <h1>{meta.label}</h1>
          <p>Vue ouverte depuis le tableau de bord administrateur.</p>
        </div>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onBack}>← Retour au tableau de bord</button>
      </div>
      {prefilter && <p className="adm-prefilter">
        <i aria-hidden="true">▽</i> Filtre appliqué : <b>{prefilter}</b>
        <button type="button" className="adm-btn adm-btn-link" onClick={onBack}>Réinitialiser</button>
      </p>}
    </div>

    {section === 'audit' && <Widget title="Journal d’audit complet" subtitle="Tous les événements administratifs tracés" state="ready" skeleton="table">
      <AuditTable rows={auditLog} onDetail={onDetail} />
    </Widget>}

    {section === 'maintenance' && <Widget
      title="Sauvegardes et maintenance"
      subtitle="La restauration se confirme ici, jamais depuis le tableau de bord"
      state="ready"
      skeleton="table"
    >
      <div className="adm-table-scroll adm-cards-on-mobile">
        <table className="adm-table">
          <caption className="adm-visually-hidden">Sauvegardes disponibles</caption>
          <thead><tr>
            <th scope="col">Identifiant</th><th scope="col">Date</th><th scope="col">Type</th>
            <th scope="col">Statut</th><th scope="col">Durée</th><th scope="col">Taille</th>
            <th scope="col">Restauration</th><th scope="col">Action</th>
          </tr></thead>
          <tbody>{backups.map((backup) => <tr key={backup.id} className={backup.status === 'Échouée' ? 'adm-row-danger' : ''}>
            <td data-label="Identifiant"><code>{backup.id}</code></td>
            <td data-label="Date">{backup.date} · {backup.time}</td>
            <td data-label="Type">{backup.type}</td>
            <td data-label="Statut"><StatusDot tone={backup.status === 'Réussie' ? 'ok' : backup.status === 'En cours' ? 'warn' : 'danger'} label={backup.status} /></td>
            <td data-label="Durée">{backup.duration}</td>
            <td data-label="Taille">{backup.sizeGo} Go</td>
            <td data-label="Restauration">{backup.restoreTest}</td>
            <td data-label="Action">
              <button type="button" className="adm-btn adm-btn-mini" disabled={backup.status !== 'Réussie'} onClick={() => onRestore(backup)}>
                Tester la restauration
              </button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </Widget>}

    {section !== 'audit' && section !== 'maintenance' && <Widget
      title={meta.label}
      subtitle="Écran de destination du drill-down"
      state="empty"
      emptyLabel={`La vue « ${meta.label} » recevra ici la liste préfiltrée${prefilter ? ` sur « ${prefilter} »` : ''}.`}
      skeleton="table"
    ><span /></Widget>}
  </>
}
