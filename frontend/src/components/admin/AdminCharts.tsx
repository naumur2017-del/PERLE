// Graphiques de supervision du tableau de bord administrateur.
// Tout est dessiné en SVG natif (aucune dépendance externe) : chaque graphique
// expose un aria-label résumé et un tableau de données accessible associé.

import { useState, type MouseEvent } from 'react'
import {
  AUDIT_CATEGORIES, ERROR_THRESHOLD, celeryStats, storage, storagePercent,
  type ActivityPoint, type AuditCategory, type Backup, type CeleryPoint, type ErrorPoint,
} from './adminData'
import { ChartDataTable } from './AdminUI'
import { useTooltip } from './adminUtils'
import { focusPoint, labelStep, niceMax } from '../dashboard/chartTools'

const CHART_COLORS = {
  blue: '#311cf0',
  violet: '#6b46c1',
  green: '#12864a',
  orange: '#c2691a',
  amber: '#e0a112',
  red: '#d92d20',
  darkRed: '#911d13',
  slate: '#6b7594',
}

const PALETTE = [CHART_COLORS.blue, CHART_COLORS.violet, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.slate, CHART_COLORS.red]

// ---------------------------------------------------------------------------
// 1. Activité et connexions — colonnes (connexions) + courbes (utilisateurs)
// ---------------------------------------------------------------------------

const ACTIVITY_SERIES = [
  { key: 'success', label: 'Connexions réussies', color: CHART_COLORS.blue, kind: 'bar' as const },
  { key: 'failed', label: 'Connexions échouées', color: CHART_COLORS.red, kind: 'bar' as const },
  { key: 'uniqueUsers', label: 'Utilisateurs uniques', color: CHART_COLORS.green, kind: 'line' as const },
  { key: 'sessions', label: 'Sessions simultanées', color: CHART_COLORS.violet, kind: 'line' as const },
]

export function ActivityChart({ data, onPointClick }: { data: ActivityPoint[]; onPointClick: (point: ActivityPoint) => void }) {
  const [hidden, setHidden] = useState<string[]>([])
  const [zoom, setZoom] = useState({ start: 0, size: data.length })
  const tooltip = useTooltip()

  const size = Math.min(zoom.size, data.length)
  const start = Math.min(zoom.start, Math.max(0, data.length - size))
  const view = data.slice(start, start + size)
  const visible = (key: string) => !hidden.includes(key)
  const toggle = (key: string) => setHidden((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])

  const W = 780, H = 300, PL = 44, PR = 18, PT = 18, PB = 40
  const plotW = W - PL - PR, plotH = H - PT - PB
  const max = niceMax(Math.max(1, ...view.flatMap((point) => ACTIVITY_SERIES.filter((s) => visible(s.key)).map((s) => point[s.key as keyof ActivityPoint] as number))))
  const slot = plotW / Math.max(1, view.length)
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const step = labelStep(view.length)

  const linePath = (key: keyof ActivityPoint) => view
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${PL + slot * index + slot / 2} ${y(point[key] as number)}`)
    .join(' ')

  return <div className="adm-chart-host">
    <div className="adm-chart-toolbar">
      <ul className="adm-legend">
        {ACTIVITY_SERIES.map((series) => <li key={series.key}>
          <button type="button" className={visible(series.key) ? '' : 'is-off'} aria-pressed={visible(series.key)} onClick={() => toggle(series.key)}>
            <i style={{ background: series.color, borderRadius: series.kind === 'line' ? '50%' : '2px' }} aria-hidden="true" />
            {series.label}
          </button>
        </li>)}
      </ul>
      <div className="adm-zoom" role="group" aria-label="Zoom temporel">
        <button type="button" className="adm-icon-btn" aria-label="Reculer dans le temps" disabled={start === 0} onClick={() => setZoom({ start: Math.max(0, start - 2), size })}>‹</button>
        <button type="button" className="adm-icon-btn" aria-label="Zoom arrière" disabled={size >= data.length} onClick={() => setZoom({ start: Math.max(0, start - 1), size: Math.min(data.length, size + 4) })}>−</button>
        <button type="button" className="adm-icon-btn" aria-label="Zoom avant" disabled={size <= 4} onClick={() => setZoom({ start, size: Math.max(4, size - 4) })}>+</button>
        <button type="button" className="adm-icon-btn" aria-label="Avancer dans le temps" disabled={start + size >= data.length} onClick={() => setZoom({ start: start + 2, size })}>›</button>
      </div>
    </div>

    <svg viewBox={`0 0 ${W} ${H}`} className="adm-svg" role="img"
      aria-label={`Graphique combiné de l’activité : ${view.reduce((sum, p) => sum + p.success, 0)} connexions réussies et ${view.reduce((sum, p) => sum + p.failed, 0)} connexions échouées sur la plage affichée.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="adm-grid" />
          <text x={PL - 8} y={y(value) + 4} className="adm-axis" textAnchor="end">{Math.round(value)}</text>
        </g>
      })}

      {view.map((point, index) => {
        const x = PL + slot * index
        const barWidth = Math.max(2, slot * 0.28)
        return <g key={point.label}>
          {visible('success') && <rect x={x + slot / 2 - barWidth - 1} y={y(point.success)} width={barWidth} height={Math.max(0, PT + plotH - y(point.success))} fill={CHART_COLORS.blue} rx="2" />}
          {visible('failed') && <rect x={x + slot / 2 + 1} y={y(point.failed)} width={barWidth} height={Math.max(0, PT + plotH - y(point.failed))} fill={CHART_COLORS.red} rx="2" />}
          {index % step === 0 && <text x={x + slot / 2} y={H - PB + 18} className="adm-axis" textAnchor="middle">{point.label}</text>}
          <rect
            x={x} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button"
            aria-label={`${point.label} : ${point.success} réussies, ${point.failed} échouées, ${point.uniqueUsers} utilisateurs uniques, ${point.sessions} sessions. Ouvrir les connexions correspondantes.`}
            className="adm-hit"
            onClick={() => onPointClick(point)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPointClick(point) } }}
            onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <>
              <strong>{point.label}</strong>
              <span><i style={{ background: CHART_COLORS.blue }} />Réussies : {point.success}</span>
              <span><i style={{ background: CHART_COLORS.red }} />Échouées : {point.failed}</span>
              <span><i style={{ background: CHART_COLORS.green }} />Utilisateurs uniques : {point.uniqueUsers}</span>
              <span><i style={{ background: CHART_COLORS.violet }} />Sessions simultanées : {point.sessions}</span>
              <em>Cliquer pour ouvrir le détail</em>
            </>)}
            onFocus={(event) => tooltip.show(focusPoint(event), <strong>{point.label} · {point.success} connexions réussies</strong>)}
            onBlur={tooltip.hide}
            onMouseLeave={tooltip.hide}
          />
        </g>
      })}

      {visible('uniqueUsers') && <path d={linePath('uniqueUsers')} fill="none" stroke={CHART_COLORS.green} strokeWidth="2" />}
      {visible('sessions') && <path d={linePath('sessions')} fill="none" stroke={CHART_COLORS.violet} strokeWidth="2" strokeDasharray="5 3" />}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="adm-axis-line" />
    </svg>
    {tooltip.node}

    <ChartDataTable
      caption="Activité et connexions par intervalle"
      columns={['Intervalle', 'Réussies', 'Échouées', 'Utilisateurs uniques', 'Sessions']}
      rows={view.map((point) => [point.label, point.success, point.failed, point.uniqueUsers, point.sessions])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 2. Évolution des erreurs — aires empilées + seuil + annotation d'incident
// ---------------------------------------------------------------------------

const ERROR_SERIES = [
  { key: 'critical', label: 'Erreurs critiques', color: CHART_COLORS.darkRed },
  { key: 'major', label: 'Erreurs majeures', color: CHART_COLORS.red },
  { key: 'warning', label: 'Avertissements', color: CHART_COLORS.amber },
  { key: 'app', label: 'Erreurs applicatives non bloquantes', color: CHART_COLORS.slate },
]

export function ErrorsChart({ data, incidentIndex, onZoneClick }: { data: ErrorPoint[]; incidentIndex: number; onZoneClick: (point: ErrorPoint, level: string) => void }) {
  const tooltip = useTooltip()
  const W = 780, H = 300, PL = 44, PR = 18, PT = 24, PB = 40
  const plotW = W - PL - PR, plotH = H - PT - PB
  const totals = data.map((point) => point.critical + point.major + point.warning + point.app)
  const max = niceMax(Math.max(ERROR_THRESHOLD + 2, ...totals))
  const slot = plotW / Math.max(1, data.length - 1)
  const x = (index: number) => PL + slot * index
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const step = labelStep(data.length)

  // Empilement cumulatif, tracé du bas (critique) vers le haut : chaque bande
  // s'appuie sur la borne supérieure de la précédente.
  const bands = ERROR_SERIES.reduce<{ lower: number[]; items: (typeof ERROR_SERIES[number] & { path: string; line: string })[] }>((acc, series) => {
    const upper = data.map((point, index) => acc.lower[index] + (point[series.key as keyof ErrorPoint] as number))
    const line = upper.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ')
    const path = [
      line,
      ...[...acc.lower].reverse().map((value, index) => `L ${x(data.length - 1 - index)} ${y(value)}`),
      'Z',
    ].join(' ')
    return { lower: upper, items: [...acc.items, { ...series, path, line }] }
  }, { lower: data.map(() => 0), items: [] }).items

  const peak = totals.indexOf(Math.max(...totals))

  return <div className="adm-chart-host">
    <ul className="adm-legend">
      {ERROR_SERIES.map((series) => <li key={series.key}><span><i style={{ background: series.color }} aria-hidden="true" />{series.label}</span></li>)}
      <li><span><i className="adm-legend-threshold" aria-hidden="true" />Seuil d’alerte ({ERROR_THRESHOLD})</span></li>
    </ul>

    <svg viewBox={`0 0 ${W} ${H}`} className="adm-svg" role="img"
      aria-label={`Aires empilées de l’évolution des erreurs. Total sur la période : ${totals.reduce((a, b) => a + b, 0)} erreurs, pic de ${Math.max(...totals)} à ${data[peak]?.label}. Seuil d’alerte fixé à ${ERROR_THRESHOLD}.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="adm-grid" />
          <text x={PL - 8} y={y(value) + 4} className="adm-axis" textAnchor="end">{Math.round(value)}</text>
        </g>
      })}

      {bands.map((band) => <g key={band.key}>
        <path d={band.path} fill={band.color} fillOpacity="0.72" />
        <path d={band.line} fill="none" stroke={band.color} strokeWidth="1.5" />
      </g>)}

      <line x1={PL} x2={W - PR} y1={y(ERROR_THRESHOLD)} y2={y(ERROR_THRESHOLD)} className="adm-threshold" />
      <text x={W - PR} y={y(ERROR_THRESHOLD) - 6} className="adm-axis adm-axis-strong" textAnchor="end">Seuil d’alerte</text>

      {data[incidentIndex] && <g className="adm-annotation">
        <line x1={x(incidentIndex)} x2={x(incidentIndex)} y1={PT} y2={PT + plotH} />
        <circle cx={x(incidentIndex)} cy={PT + 6} r="5" />
        <text x={Math.min(x(incidentIndex) + 10, W - 150)} y={PT + 10} className="adm-axis adm-axis-strong">Incident INC-2026-114</text>
      </g>}

      {data.map((point, index) => <g key={point.label}>
        {index % step === 0 && <text x={x(index)} y={H - PB + 18} className="adm-axis" textAnchor="middle">{point.label}</text>}
        <rect
          x={x(index) - slot / 2} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="adm-hit"
          aria-label={`${point.label} : ${point.critical} critiques, ${point.major} majeures, ${point.warning} avertissements, ${point.app} applicatives. Ouvrir les journaux filtrés.`}
          onClick={() => onZoneClick(point, point.critical > 0 ? 'Critique' : 'Toutes gravités')}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onZoneClick(point, 'Toutes gravités') } }}
          onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <>
            <strong>{point.label}</strong>
            {ERROR_SERIES.map((series) => <span key={series.key}><i style={{ background: series.color }} />{series.label} : {point[series.key as keyof ErrorPoint] as number}</span>)}
            <em>Cliquer pour ouvrir les logs</em>
          </>)}
          onFocus={(event) => tooltip.show(focusPoint(event), <strong>{point.label} · {totals[index]} erreurs</strong>)}
          onBlur={tooltip.hide}
          onMouseLeave={tooltip.hide}
        />
      </g>)}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="adm-axis-line" />
    </svg>
    {tooltip.node}

    <ChartDataTable
      caption="Évolution des erreurs par niveau de gravité"
      columns={['Intervalle', 'Critiques', 'Majeures', 'Avertissements', 'Applicatives', 'Total']}
      rows={data.map((point, index) => [point.label, point.critical, point.major, point.warning, point.app, totals[index]])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 3. Utilisation du stockage — jauge semi-circulaire + ventilation
// ---------------------------------------------------------------------------

const storageTone = (percent: number) => percent > 85 ? 'danger' : percent >= 70 ? 'warn' : 'ok'

export function StorageChart({ onCategoryClick }: { onCategoryClick: (label: string) => void }) {
  const tone = storageTone(storagePercent)
  const color = { ok: CHART_COLORS.green, warn: CHART_COLORS.orange, danger: CHART_COLORS.red }[tone]
  const toneLabel = { ok: 'Normal', warn: 'Avertissement', danger: 'Critique' }[tone]
  const toneIcon = { ok: '●', warn: '▲', danger: '⛔' }[tone]

  const W = 320, H = 176, cx = 160, cy = 148, r = 118
  const arc = (from: number, to: number) => {
    const point = (ratio: number) => {
      const angle = Math.PI * (1 - ratio)
      return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)]
    }
    const [x1, y1] = point(from)
    const [x2, y2] = point(to)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x2} ${y2}`
  }
  const delta = storage.usedGo - storage.previousUsedGo
  const maxCategory = Math.max(...storage.breakdown.map((item) => item.usedGo))

  return <div className="adm-storage">
    <div className="adm-gauge">
      <svg viewBox={`0 0 ${W} ${H}`} className="adm-svg" role="img"
        aria-label={`Jauge de stockage : ${storage.usedGo} Go utilisés sur ${storage.totalGo} Go, soit ${storagePercent} %. Niveau ${toneLabel}.`}>
        <path d={arc(0, 1)} fill="none" stroke="#e6e9f2" strokeWidth="20" strokeLinecap="round" />
        <path d={arc(0, 0.7)} fill="none" stroke="#dff0e6" strokeWidth="20" />
        <path d={arc(0.7, 0.85)} fill="none" stroke="#fbe9d3" strokeWidth="20" />
        <path d={arc(0.85, 1)} fill="none" stroke="#fbdcd9" strokeWidth="20" />
        <path d={arc(0, storagePercent / 100)} fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" />
        <text x={cx} y={cy - 34} className="adm-gauge-value" textAnchor="middle">{storagePercent} %</text>
        <text x={cx} y={cy - 12} className="adm-gauge-sub" textAnchor="middle">{storage.usedGo} Go / {storage.totalGo} Go</text>
      </svg>
      <p className={`adm-dot adm-dot-${tone}`}><i aria-hidden="true">{toneIcon}</i>{toneLabel} · seuils 70 % / 85 %</p>
      <dl className="adm-gauge-facts">
        <div><dt>Espace utilisé</dt><dd>{storage.usedGo} Go</dd></div>
        <div><dt>Espace disponible</dt><dd>{storage.totalGo - storage.usedGo} Go</dd></div>
        <div><dt>Capacité totale</dt><dd>{storage.totalGo} Go</dd></div>
        <div><dt>Évolution</dt><dd className={delta > 0 ? 'adm-up' : 'adm-down'}>{delta > 0 ? '+' : ''}{delta} Go</dd></div>
      </dl>
    </div>

    <div className="adm-breakdown">
      <p className="adm-subhead">Ventilation par catégorie</p>
      <ul>
        {storage.breakdown.map((item) => <li key={item.label}>
          <button type="button" onClick={() => onCategoryClick(item.label)} aria-label={`${item.label} : ${item.usedGo} Go, soit ${Math.round((item.usedGo / storage.usedGo) * 100)} % du stockage utilisé. Ouvrir le détail.`}>
            <span className="adm-breakdown-head"><b>{item.label}</b><em>{item.usedGo} Go</em></span>
            <span className="adm-bar"><i style={{ width: `${(item.usedGo / maxCategory) * 100}%`, background: color }} /></span>
            <small>{item.hint} · {Math.round((item.usedGo / storage.usedGo) * 100)} %</small>
          </button>
        </li>)}
      </ul>
      <ChartDataTable
        caption="Répartition du stockage par catégorie"
        columns={['Catégorie', 'Volume (Go)', 'Part du stockage utilisé']}
        rows={storage.breakdown.map((item) => [item.label, item.usedGo, `${Math.round((item.usedGo / storage.usedGo) * 100)} %`])}
      />
    </div>
  </div>
}

// ---------------------------------------------------------------------------
// 4. Santé des tâches Celery — barres empilées
// ---------------------------------------------------------------------------

const CELERY_SERIES = [
  { key: 'done', label: 'Terminées avec succès', color: CHART_COLORS.green },
  { key: 'running', label: 'En cours', color: CHART_COLORS.blue },
  { key: 'pending', label: 'En attente', color: CHART_COLORS.slate },
  { key: 'retried', label: 'Réessayées', color: CHART_COLORS.amber },
  { key: 'failed', label: 'Échouées', color: CHART_COLORS.red },
]

export function CeleryChart({ data, onBucketClick }: { data: CeleryPoint[]; onBucketClick: (point: CeleryPoint) => void }) {
  const tooltip = useTooltip()
  const W = 780, H = 280, PL = 44, PR = 18, PT = 18, PB = 38
  const plotW = W - PL - PR, plotH = H - PT - PB
  const totals = data.map((point) => CELERY_SERIES.reduce((sum, series) => sum + (point[series.key as keyof CeleryPoint] as number), 0))
  const max = niceMax(Math.max(1, ...totals))
  const slot = plotW / Math.max(1, data.length)
  const barWidth = Math.min(38, slot * 0.6)
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const step = labelStep(data.length)

  return <div className="adm-chart-host">
    <ul className="adm-legend">
      {CELERY_SERIES.map((series) => <li key={series.key}><span><i style={{ background: series.color }} aria-hidden="true" />{series.label}</span></li>)}
    </ul>

    <svg viewBox={`0 0 ${W} ${H}`} className="adm-svg" role="img"
      aria-label={`Barres empilées des tâches Celery. ${totals.reduce((a, b) => a + b, 0)} tâches traitées, taux de réussite ${celeryStats.successRate} %.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="adm-grid" />
          <text x={PL - 8} y={y(value) + 4} className="adm-axis" textAnchor="end">{Math.round(value)}</text>
        </g>
      })}

      {data.map((point, index) => {
        let offset = 0
        const x = PL + slot * index + (slot - barWidth) / 2
        return <g key={point.label}>
          {CELERY_SERIES.map((series) => {
            const value = point[series.key as keyof CeleryPoint] as number
            const height = (value / max) * plotH
            offset += height
            return value > 0 ? <rect key={series.key} x={x} y={PT + plotH - offset} width={barWidth} height={height} fill={series.color} /> : null
          })}
          {index % step === 0 && <text x={x + barWidth / 2} y={H - PB + 18} className="adm-axis" textAnchor="middle">{point.label}</text>}
          <rect
            x={PL + slot * index} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="adm-hit"
            aria-label={`${point.label} : ${point.done} terminées, ${point.running} en cours, ${point.pending} en attente, ${point.retried} réessayées, ${point.failed} échouées. Ouvrir le moniteur.`}
            onClick={() => onBucketClick(point)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onBucketClick(point) } }}
            onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <>
              <strong>{point.label}</strong>
              {CELERY_SERIES.map((series) => <span key={series.key}><i style={{ background: series.color }} />{series.label} : {point[series.key as keyof CeleryPoint] as number}</span>)}
            </>)}
            onFocus={(event) => tooltip.show(focusPoint(event), <strong>{point.label} · {totals[index]} tâches</strong>)}
            onBlur={tooltip.hide}
            onMouseLeave={tooltip.hide}
          />
        </g>
      })}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="adm-axis-line" />
    </svg>
    {tooltip.node}

    <dl className="adm-metric-row">
      <div><dt>Taux de réussite</dt><dd className="adm-good">{celeryStats.successRate} %</dd></div>
      <div><dt>Durée moyenne</dt><dd>{celeryStats.averageDuration}</dd></div>
      <div><dt>Tâche la plus longue</dt><dd>{celeryStats.longestTask}</dd></div>
      <div><dt>Tâches bloquées</dt><dd className={celeryStats.blocked ? 'adm-bad' : ''}>{celeryStats.blocked}</dd></div>
    </dl>

    <ChartDataTable
      caption="Santé des tâches Celery par période"
      columns={['Période', 'Terminées', 'En cours', 'En attente', 'Réessayées', 'Échouées']}
      rows={data.map((point) => [point.label, point.done, point.running, point.pending, point.retried, point.failed])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 5. État des sauvegardes — chronologie quotidienne
// ---------------------------------------------------------------------------

export function BackupsChart({ data, onBackupClick }: { data: Backup[]; onBackupClick: (backup: Backup) => void }) {
  const tooltip = useTooltip()
  const max = Math.max(...data.map((backup) => backup.sizeGo), 10)
  const statusTone = (status: Backup['status']) => status === 'Réussie' ? 'ok' : status === 'En cours' ? 'warn' : 'danger'
  const statusIcon = (status: Backup['status']) => status === 'Réussie' ? '✓' : status === 'En cours' ? '◔' : '⛔'

  return <div className="adm-chart-host adm-backups">
    <ol className="adm-timeline">
      {data.map((backup) => {
        const tone = statusTone(backup.status)
        return <li key={backup.id} className={`adm-timeline-item adm-tone-${tone}`}>
          <button
            type="button"
            aria-label={`Sauvegarde ${backup.id} du ${backup.date} à ${backup.time}, ${backup.type.toLowerCase()}, statut ${backup.status}, durée ${backup.duration}, taille ${backup.sizeGo} Go, restauration : ${backup.restoreTest}.`}
            onClick={() => onBackupClick(backup)}
            onMouseMove={(event) => tooltip.show(event, <>
              <strong>{backup.date} · {backup.time}</strong>
              <span>Type : {backup.type}</span>
              <span>Statut : {backup.status}</span>
              <span>Durée : {backup.duration}</span>
              <span>Taille : {backup.sizeGo} Go</span>
              <span>Restauration : {backup.restoreTest}</span>
            </>)}
            onMouseLeave={tooltip.hide}
          >
            <span className="adm-timeline-bar">
              <i style={{ height: `${Math.max(8, (backup.sizeGo / max) * 100)}%` }} />
            </span>
            <span className="adm-timeline-status"><i aria-hidden="true">{statusIcon(backup.status)}</i>{backup.status}</span>
            <span className="adm-timeline-date">{backup.date.slice(0, 5)}<em>{backup.time}</em></span>
            <span className="adm-timeline-type">{backup.type === 'Manuelle' ? 'Manuelle' : 'Auto'}</span>
          </button>
        </li>
      })}
    </ol>
    {tooltip.node}
    <ChartDataTable
      caption="Historique des sauvegardes"
      columns={['Date', 'Heure', 'Type', 'Statut', 'Durée', 'Taille (Go)', 'Dernier test de restauration']}
      rows={data.map((backup) => [backup.date, backup.time, backup.type, backup.status, backup.duration, backup.sizeGo, backup.restoreTest])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 6. Répartition des utilisateurs — donut avec bascule rôle / statut
// ---------------------------------------------------------------------------

export function UsersDonut({ byRole, byStatus, onSliceClick }: {
  byRole: { label: string; value: number }[]
  byStatus: { label: string; value: number }[]
  onSliceClick: (view: 'role' | 'status', label: string) => void
}) {
  const [view, setView] = useState<'role' | 'status'>('role')
  const tooltip = useTooltip()
  const data = view === 'role' ? byRole : byStatus
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const cx = 108, cy = 108, outer = 96, inner = 60
  // Angle de départ de chaque part : somme des parts précédentes, à partir de midi.
  const offsets = data.map((_, index) => data.slice(0, index).reduce((sum, item) => sum + item.value, 0))
  const slices = data.map((item, index) => {
    const sweep = (item.value / total) * Math.PI * 2
    const from = -Math.PI / 2 + (offsets[index] / total) * Math.PI * 2
    const to = from + sweep
    const point = (radius: number, a: number) => `${cx + radius * Math.cos(a)} ${cy + radius * Math.sin(a)}`
    const large = sweep > Math.PI ? 1 : 0
    return {
      ...item,
      color: PALETTE[index % PALETTE.length],
      percent: Math.round((item.value / total) * 100),
      path: `M ${point(outer, from)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, to)} L ${point(inner, to)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, from)} Z`,
    }
  })

  return <div className="adm-chart-host adm-donut-host">
    <div className="adm-toggle" role="group" aria-label="Vue de la répartition des utilisateurs">
      <button type="button" className={view === 'role' ? 'is-active' : ''} aria-pressed={view === 'role'} onClick={() => setView('role')}>Par rôle</button>
      <button type="button" className={view === 'status' ? 'is-active' : ''} aria-pressed={view === 'status'} onClick={() => setView('status')}>Par statut</button>
    </div>

    <div className="adm-donut-layout">
      <svg viewBox="0 0 216 216" className="adm-svg adm-donut" role="img"
        aria-label={`Répartition des utilisateurs ${view === 'role' ? 'par rôle' : 'par statut'} : ${slices.map((slice) => `${slice.label} ${slice.value}`).join(', ')}. Total ${total}.`}>
        {slices.map((slice) => <path
          key={slice.label} d={slice.path} fill={slice.color} className="adm-slice" tabIndex={0} role="button"
          aria-label={`${slice.label} : ${slice.value} utilisateurs (${slice.percent} %). Ouvrir la liste filtrée.`}
          onClick={() => onSliceClick(view, slice.label)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSliceClick(view, slice.label) } }}
          onMouseMove={(event: MouseEvent<SVGPathElement>) => tooltip.show(event, <><strong>{slice.label}</strong><span>{slice.value} utilisateurs · {slice.percent} %</span></>)}
          onMouseLeave={tooltip.hide}
        />)}
        <text x="108" y="102" className="adm-gauge-value" textAnchor="middle">{total}</text>
        <text x="108" y="122" className="adm-gauge-sub" textAnchor="middle">utilisateurs</text>
      </svg>

      <ul className="adm-donut-legend">
        {slices.map((slice) => <li key={slice.label}>
          <button type="button" onClick={() => onSliceClick(view, slice.label)}>
            <i style={{ background: slice.color }} aria-hidden="true" />
            <b>{slice.label}</b>
            <em>{slice.value}</em>
            <small>{slice.percent} %</small>
          </button>
        </li>)}
      </ul>
    </div>
    {tooltip.node}

    <ChartDataTable
      caption={`Répartition des utilisateurs ${view === 'role' ? 'par rôle' : 'par statut'}`}
      columns={[view === 'role' ? 'Rôle' : 'Statut', 'Utilisateurs', 'Part']}
      rows={slices.map((slice) => [slice.label, slice.value, `${slice.percent} %`])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 7. Actions administratives et audit — barres verticales par jour
// ---------------------------------------------------------------------------

export function AuditActivityChart({ data, onDayClick }: {
  data: { label: string; values: Record<AuditCategory, number> }[]
  onDayClick: (label: string) => void
}) {
  const tooltip = useTooltip()
  const W = 780, H = 260, PL = 40, PR = 18, PT = 18, PB = 38
  const plotW = W - PL - PR, plotH = H - PT - PB
  const totals = data.map((day) => AUDIT_CATEGORIES.reduce((sum, category) => sum + day.values[category], 0))
  const max = niceMax(Math.max(1, ...totals))
  const slot = plotW / Math.max(1, data.length)
  const barWidth = Math.min(30, slot * 0.58)
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const step = labelStep(data.length)

  return <div className="adm-chart-host">
    <ul className="adm-legend">
      {AUDIT_CATEGORIES.map((category, index) => <li key={category}>
        <span><i style={{ background: PALETTE[index % PALETTE.length] }} aria-hidden="true" />{category}</span>
      </li>)}
    </ul>

    <svg viewBox={`0 0 ${W} ${H}`} className="adm-svg" role="img"
      aria-label={`Actions administratives sensibles par jour : ${totals.reduce((a, b) => a + b, 0)} actions au total sur la période.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="adm-grid" />
          <text x={PL - 8} y={y(value) + 4} className="adm-axis" textAnchor="end">{Math.round(value)}</text>
        </g>
      })}

      {data.map((day, index) => {
        let offset = 0
        const x = PL + slot * index + (slot - barWidth) / 2
        return <g key={day.label}>
          {AUDIT_CATEGORIES.map((category, categoryIndex) => {
            const value = day.values[category]
            const height = (value / max) * plotH
            offset += height
            return value > 0 ? <rect key={category} x={x} y={PT + plotH - offset} width={barWidth} height={height} fill={PALETTE[categoryIndex % PALETTE.length]} /> : null
          })}
          {index % step === 0 && <text x={x + barWidth / 2} y={H - PB + 18} className="adm-axis" textAnchor="middle">{day.label}</text>}
          <rect
            x={PL + slot * index} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="adm-hit"
            aria-label={`${day.label} : ${totals[index]} actions sensibles. Ouvrir le journal d’audit de cette journée.`}
            onClick={() => onDayClick(day.label)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onDayClick(day.label) } }}
            onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <>
              <strong>{day.label} · {totals[index]} actions</strong>
              {AUDIT_CATEGORIES.map((category, categoryIndex) => <span key={category}><i style={{ background: PALETTE[categoryIndex % PALETTE.length] }} />{category} : {day.values[category]}</span>)}
              <em>Cliquer pour ouvrir le journal d’audit</em>
            </>)}
            onFocus={(event) => tooltip.show(focusPoint(event), <strong>{day.label} · {totals[index]} actions</strong>)}
            onBlur={tooltip.hide}
            onMouseLeave={tooltip.hide}
          />
        </g>
      })}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="adm-axis-line" />
    </svg>
    {tooltip.node}

    <ChartDataTable
      caption="Actions administratives sensibles par jour"
      columns={['Jour', ...AUDIT_CATEGORIES, 'Total']}
      rows={data.map((day, index) => [day.label, ...AUDIT_CATEGORIES.map((category) => day.values[category]), totals[index]])}
    />
  </div>
}
