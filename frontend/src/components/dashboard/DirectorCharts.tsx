// Graphiques du tableau de bord de direction, dessinés en SVG natif.
// Chaque graphique porte un résumé aria et un tableau de données associé.

import { useState, type MouseEvent, type ReactNode } from 'react'
import { ChartTable } from './DashboardUI'
import { focusPoint, labelStep, niceMax, useTooltip } from './chartTools'
import {
  DIR_COLORS, DIR_PALETTE, budgetByDepartment, budgetByNature, ehs, ehsRate,
  formatFcfa, marginPercent, projects, teamLoad,
  type CashPoint, type DeliverablePoint, type FinancePoint, type Project,
} from './directorData'
import { currencySuffix } from '../../utils/currency'

/** Infobulle habillée aux styles du tableau de bord de direction. */
function useDirTooltip() {
  const { show, hide, tip } = useTooltip('.dsh-chart-host')
  const node: ReactNode = tip
    ? <div className="dsh-tooltip" style={{ left: tip.x, top: tip.y }} role="presentation">{tip.content}</div>
    : null
  return { show, hide, node }
}

const Legend = ({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) => <ul className="dsh-legend">
  {items.map((item) => <li key={item.label}>
    <i style={item.dashed ? { borderTop: `2px dashed ${item.color}` } : { background: item.color }} className={item.dashed ? 'dsh-legend-line' : ''} aria-hidden="true" />
    {item.label}
  </li>)}
</ul>

// ---------------------------------------------------------------------------
// 1. Performance financière — recettes / dépenses en colonnes, marge en courbe
// ---------------------------------------------------------------------------

export function FinanceChart({ data, onPointClick }: { data: FinancePoint[]; onPointClick: (point: FinancePoint) => void }) {
  const tooltip = useDirTooltip()
  const W = 760, H = 280, PL = 56, PR = 46, PT = 18, PB = 38
  const plotW = W - PL - PR, plotH = H - PT - PB
  const max = niceMax(Math.max(...data.map((point) => point.revenue)))
  const slot = plotW / Math.max(1, data.length)
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const yMargin = (percent: number) => PT + plotH - (percent / 40) * plotH
  const step = labelStep(data.length)
  const barWidth = Math.min(26, slot * 0.3)

  const total = data.reduce((sum, point) => sum + point.revenue, 0)
  const totalCosts = data.reduce((sum, point) => sum + point.costs, 0)

  return <div className="dsh-chart-host">
    <Legend items={[
      { label: 'Recettes', color: DIR_COLORS.primary },
      { label: 'Dépenses', color: DIR_COLORS.slate },
      { label: 'Taux de marge (%)', color: DIR_COLORS.green, dashed: true },
    ]} />

    <svg viewBox={`0 0 ${W} ${H}`} className="dsh-svg" role="img"
      aria-label={`Performance financière : ${formatFcfa(total)} de recettes pour ${formatFcfa(totalCosts)} de dépenses, soit un taux de marge moyen de ${(((total - totalCosts) / total) * 100).toFixed(1)} %.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="dsh-grid" />
          <text x={PL - 8} y={y(value) + 4} className="dsh-axis" textAnchor="end">{Math.round(value / 1000)} M</text>
          <text x={W - PR + 8} y={yMargin((40 / 4) * i) + 4} className="dsh-axis" textAnchor="start">{(40 / 4) * i} %</text>
        </g>
      })}

      {data.map((point, index) => {
        const x = PL + slot * index
        return <g key={point.label}>
          <rect x={x + slot / 2 - barWidth - 2} y={y(point.revenue)} width={barWidth} height={Math.max(0, PT + plotH - y(point.revenue))} fill={DIR_COLORS.primary} rx="3" />
          <rect x={x + slot / 2 + 2} y={y(point.costs)} width={barWidth} height={Math.max(0, PT + plotH - y(point.costs))} fill={DIR_COLORS.slate} rx="3" />
          {index % step === 0 && <text x={x + slot / 2} y={H - PB + 18} className="dsh-axis" textAnchor="middle">{point.label}</text>}
          <rect
            x={x} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="dsh-hit"
            aria-label={`${point.label} : ${formatFcfa(point.revenue)} de recettes, ${formatFcfa(point.costs)} de dépenses, marge ${marginPercent(point).toFixed(1)} %. Ouvrir le pilotage.`}
            onClick={() => onPointClick(point)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPointClick(point) } }}
            onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <>
              <strong>{point.label}</strong>
              <span><i style={{ background: DIR_COLORS.primary }} />Recettes : {formatFcfa(point.revenue)}</span>
              <span><i style={{ background: DIR_COLORS.slate }} />Dépenses : {formatFcfa(point.costs)}</span>
              <span><i style={{ background: DIR_COLORS.green }} />Marge : {marginPercent(point).toFixed(1)} %</span>
            </>)}
            onFocus={(event) => tooltip.show(focusPoint(event), <strong>{point.label} · marge {marginPercent(point).toFixed(1)} %</strong>)}
            onBlur={tooltip.hide}
            onMouseLeave={tooltip.hide}
          />
        </g>
      })}

      <path
        d={data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${PL + slot * index + slot / 2} ${yMargin(marginPercent(point))}`).join(' ')}
        fill="none" stroke={DIR_COLORS.green} strokeWidth="2" strokeDasharray="5 3"
      />
      {data.map((point, index) => <circle key={point.label} cx={PL + slot * index + slot / 2} cy={yMargin(marginPercent(point))} r="3" fill={DIR_COLORS.green} />)}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="dsh-axis-line" />
    </svg>
    {tooltip.node}

    <ChartTable
      caption="Recettes, dépenses et taux de marge par période"
      columns={['Période', 'Recettes', 'Dépenses', 'Résultat', 'Taux de marge']}
      rows={data.map((point) => [point.label, formatFcfa(point.revenue), formatFcfa(point.costs), formatFcfa(point.revenue - point.costs), `${marginPercent(point).toFixed(1)} %`])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 2. Portefeuille de projets — avancement contre budget consommé
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<Project['status'], 'ok' | 'warn' | 'danger'> = {
  'En cours': 'ok', 'Terminé': 'ok', 'À surveiller': 'warn', 'En retard': 'danger',
}

export function PortfolioChart({ onProjectClick }: { onProjectClick: (project: Project) => void }) {
  return <div className="dsh-chart-host">
    <Legend items={[
      { label: 'Avancement', color: DIR_COLORS.primary },
      { label: 'Budget consommé', color: DIR_COLORS.amber },
    ]} />

    <ul className="dsh-portfolio" aria-label="Avancement et consommation budgétaire par projet">
      {projects.map((project) => {
        const used = Math.round((project.budgetUsed / project.budget) * 100)
        // Un budget consommé nettement au-delà de l'avancement signale une dérive.
        const drift = used - project.progress
        return <li key={project.code}>
          <button
            type="button"
            onClick={() => onProjectClick(project)}
            aria-label={`${project.name}, ${project.code}. Avancement ${project.progress} %, budget consommé ${used} %, marge ${project.margin} %, statut ${project.status}. Ouvrir le pilotage du projet.`}
          >
            <span className="dsh-portfolio-head">
              <b>{project.name}</b>
              <em className={`dsh-tag dsh-tag-${STATUS_TONE[project.status]}`}>
                <i aria-hidden="true">{STATUS_TONE[project.status] === 'ok' ? '●' : STATUS_TONE[project.status] === 'warn' ? '▲' : '⛔'}</i>{project.status}
              </em>
            </span>
            <span className="dsh-portfolio-meta">{project.code} · {project.manager} · échéance {project.deadline}</span>
            <span className="dsh-track"><i style={{ width: `${project.progress}%`, background: DIR_COLORS.primary }} /><b>{project.progress} %</b></span>
            <span className="dsh-track"><i style={{ width: `${Math.min(100, used)}%`, background: drift > 12 ? DIR_COLORS.red : DIR_COLORS.amber }} /><b>{used} %</b></span>
            <span className="dsh-portfolio-foot">
              {formatFcfa(project.budgetUsed)} / {formatFcfa(project.budget)}
              <em className={project.margin < 0 ? 'dsh-bad' : project.margin < 10 ? 'dsh-warn' : 'dsh-good'}>Marge {project.margin} %</em>
            </span>
          </button>
        </li>
      })}
    </ul>

    <ChartTable
      caption="Portefeuille de projets"
      columns={['Projet', 'Responsable', 'Avancement', 'Budget consommé', 'Budget total', 'Marge', 'Statut']}
      rows={projects.map((project) => [
        `${project.code} — ${project.name}`, project.manager, `${project.progress} %`,
        formatFcfa(project.budgetUsed), formatFcfa(project.budget), `${project.margin} %`, project.status,
      ])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 3. Répartition du budget — donut avec bascule nature / département
// ---------------------------------------------------------------------------

export function BudgetDonut({ onSliceClick }: { onSliceClick: (view: string, label: string) => void }) {
  const [view, setView] = useState<'nature' | 'department'>('nature')
  const tooltip = useDirTooltip()
  const data = view === 'nature' ? budgetByNature : budgetByDepartment
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const cx = 108, cy = 108, outer = 96, inner = 62
  const offsets = data.map((_, index) => data.slice(0, index).reduce((sum, item) => sum + item.value, 0))
  const slices = data.map((item, index) => {
    const sweep = (item.value / total) * Math.PI * 2
    const from = -Math.PI / 2 + (offsets[index] / total) * Math.PI * 2
    const to = from + sweep
    const point = (radius: number, angle: number) => `${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)}`
    const large = sweep > Math.PI ? 1 : 0
    return {
      ...item,
      color: DIR_PALETTE[index % DIR_PALETTE.length],
      percent: Math.round((item.value / total) * 100),
      path: `M ${point(outer, from)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, to)} L ${point(inner, to)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, from)} Z`,
    }
  })

  return <div className="dsh-chart-host">
    <div className="dsh-toggle" role="group" aria-label="Vue de la répartition du budget">
      <button type="button" className={view === 'nature' ? 'is-active' : ''} aria-pressed={view === 'nature'} onClick={() => setView('nature')}>Par nature</button>
      <button type="button" className={view === 'department' ? 'is-active' : ''} aria-pressed={view === 'department'} onClick={() => setView('department')}>Par département</button>
    </div>

    <div className="dsh-donut-layout">
      <svg viewBox="0 0 216 216" className="dsh-svg dsh-donut" role="img"
        aria-label={`Répartition du budget ${view === 'nature' ? 'par nature de charge' : 'par département'} : ${slices.map((slice) => `${slice.label} ${slice.percent} %`).join(', ')}. Total ${formatFcfa(total)}.`}>
        {slices.map((slice) => <path
          key={slice.label} d={slice.path} fill={slice.color} className="dsh-slice" tabIndex={0} role="button"
          aria-label={`${slice.label} : ${formatFcfa(slice.value)}, soit ${slice.percent} %. Ouvrir le détail.`}
          onClick={() => onSliceClick(view, slice.label)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSliceClick(view, slice.label) } }}
          onMouseMove={(event: MouseEvent<SVGPathElement>) => tooltip.show(event, <><strong>{slice.label}</strong><span>{formatFcfa(slice.value)} · {slice.percent} %</span></>)}
          onMouseLeave={tooltip.hide}
        />)}
        <text x="108" y="104" className="dsh-donut-value" textAnchor="middle">{(total / 1000).toFixed(0)} M</text>
        <text x="108" y="124" className="dsh-donut-sub" textAnchor="middle">{currencySuffix()} engagés</text>
      </svg>

      <ul className="dsh-donut-legend">
        {slices.map((slice) => <li key={slice.label}>
          <button type="button" onClick={() => onSliceClick(view, slice.label)}>
            <i style={{ background: slice.color }} aria-hidden="true" />
            <b>{slice.label}</b>
            <em>{slice.percent} %</em>
            <small>{formatFcfa(slice.value)}</small>
          </button>
        </li>)}
      </ul>
    </div>
    {tooltip.node}

    <ChartTable
      caption={`Répartition du budget ${view === 'nature' ? 'par nature' : 'par département'}`}
      columns={[view === 'nature' ? 'Nature de charge' : 'Département', 'Montant', 'Part']}
      rows={slices.map((slice) => [slice.label, formatFcfa(slice.value), `${slice.percent} %`])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 4. Trésorerie — aire du solde et barres du flux net
// ---------------------------------------------------------------------------

export function CashChart({ data, onPointClick }: { data: CashPoint[]; onPointClick: (point: CashPoint) => void }) {
  const tooltip = useDirTooltip()
  const W = 760, H = 260, PL = 56, PR = 18, PT = 18, PB = 38
  const plotW = W - PL - PR, plotH = H - PT - PB
  const max = niceMax(Math.max(...data.map((point) => point.balance)))
  const slot = plotW / Math.max(1, data.length - 1 || 1)
  const x = (index: number) => PL + slot * index
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const step = labelStep(data.length)
  const netMax = Math.max(...data.map((point) => Math.abs(point.inflow - point.outflow)))

  const area = [
    ...data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.balance)}`),
    `L ${x(data.length - 1)} ${PT + plotH}`, `L ${x(0)} ${PT + plotH}`, 'Z',
  ].join(' ')
  const last = data[data.length - 1]

  return <div className="dsh-chart-host">
    <Legend items={[
      { label: 'Solde de trésorerie', color: DIR_COLORS.teal },
      { label: 'Flux net positif', color: DIR_COLORS.green },
      { label: 'Flux net négatif', color: DIR_COLORS.red },
    ]} />

    <svg viewBox={`0 0 ${W} ${H}`} className="dsh-svg" role="img"
      aria-label={`Trésorerie : solde de ${formatFcfa(last.balance)} en fin de période, contre ${formatFcfa(data[0].balance)} en début de période.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="dsh-grid" />
          <text x={PL - 8} y={y(value) + 4} className="dsh-axis" textAnchor="end">{Math.round(value / 1000)} M</text>
        </g>
      })}

      <path d={area} fill={DIR_COLORS.teal} fillOpacity="0.16" />
      <path d={data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.balance)}`).join(' ')} fill="none" stroke={DIR_COLORS.teal} strokeWidth="2.5" />

      {data.map((point, index) => {
        const net = point.inflow - point.outflow
        const height = (Math.abs(net) / netMax) * (plotH * 0.22)
        return <g key={point.label}>
          <rect
            x={x(index) - 7} y={PT + plotH - height} width="14" height={height}
            fill={net >= 0 ? DIR_COLORS.green : DIR_COLORS.red} fillOpacity="0.75" rx="2"
          />
          <circle cx={x(index)} cy={y(point.balance)} r="3.5" fill={DIR_COLORS.teal} />
          {index % step === 0 && <text x={x(index)} y={H - PB + 18} className="dsh-axis" textAnchor="middle">{point.label}</text>}
          <rect
            x={x(index) - slot / 2} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="dsh-hit"
            aria-label={`${point.label} : encaissements ${formatFcfa(point.inflow)}, décaissements ${formatFcfa(point.outflow)}, solde ${formatFcfa(point.balance)}. Ouvrir la trésorerie.`}
            onClick={() => onPointClick(point)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPointClick(point) } }}
            onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <>
              <strong>{point.label}</strong>
              <span><i style={{ background: DIR_COLORS.green }} />Encaissements : {formatFcfa(point.inflow)}</span>
              <span><i style={{ background: DIR_COLORS.red }} />Décaissements : {formatFcfa(point.outflow)}</span>
              <span><i style={{ background: DIR_COLORS.teal }} />Solde : {formatFcfa(point.balance)}</span>
            </>)}
            onFocus={(event) => tooltip.show(focusPoint(event), <strong>{point.label} · solde {formatFcfa(point.balance)}</strong>)}
            onBlur={tooltip.hide}
            onMouseLeave={tooltip.hide}
          />
        </g>
      })}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="dsh-axis-line" />
    </svg>
    {tooltip.node}

    <ChartTable
      caption="Flux de trésorerie par période"
      columns={['Période', 'Encaissements', 'Décaissements', 'Flux net', 'Solde']}
      rows={data.map((point) => [point.label, formatFcfa(point.inflow), formatFcfa(point.outflow), formatFcfa(point.inflow - point.outflow), formatFcfa(point.balance)])}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 5. Charge des équipes — barres horizontales empilées par département
// ---------------------------------------------------------------------------

const TEAM_SERIES = [
  { key: 'staffed', label: 'Staffés', color: DIR_COLORS.primary },
  { key: 'available', label: 'Disponibles', color: DIR_COLORS.green },
  { key: 'unavailable', label: 'Indisponibles', color: DIR_COLORS.slate },
] as const

export function TeamLoadChart({ onTeamClick }: { onTeamClick: (label: string) => void }) {
  const max = Math.max(...teamLoad.map((team) => team.staffed + team.available + team.unavailable))

  return <div className="dsh-chart-host">
    <Legend items={TEAM_SERIES.map((series) => ({ label: series.label, color: series.color }))} />

    <ul className="dsh-teams" aria-label="Charge et disponibilité par département">
      {teamLoad.map((team) => {
        const total = team.staffed + team.available + team.unavailable
        const rate = Math.round((team.staffed / total) * 100)
        return <li key={team.label}>
          <button
            type="button"
            onClick={() => onTeamClick(team.label)}
            aria-label={`${team.label} : ${team.staffed} staffés, ${team.available} disponibles, ${team.unavailable} indisponibles sur ${total}. Taux d’occupation ${rate} %. Ouvrir le staffing.`}
          >
            <span className="dsh-teams-head"><b>{team.label}</b><em>{rate} % occupé</em></span>
            <span className="dsh-stack" style={{ width: `${(total / max) * 100}%` }}>
              {TEAM_SERIES.map((series) => team[series.key] > 0 && <i
                key={series.key}
                style={{ flex: team[series.key], background: series.color }}
                title={`${series.label} : ${team[series.key]}`}
              >{team[series.key]}</i>)}
            </span>
          </button>
        </li>
      })}
    </ul>

    <ChartTable
      caption="Charge et disponibilité des équipes par département"
      columns={['Département', 'Staffés', 'Disponibles', 'Indisponibles', 'Effectif', 'Taux d’occupation']}
      rows={teamLoad.map((team) => {
        const total = team.staffed + team.available + team.unavailable
        return [team.label, team.staffed, team.available, team.unavailable, total, `${Math.round((team.staffed / total) * 100)} %`]
      })}
    />
  </div>
}

// ---------------------------------------------------------------------------
// 6. Consommation EHS — jauge semi-circulaire et ventilation par département
// ---------------------------------------------------------------------------

export function EhsChart({ onDepartmentClick }: { onDepartmentClick: (label: string) => void }) {
  const tone = ehsRate > 90 ? 'danger' : ehsRate >= 75 ? 'warn' : 'ok'
  const color = { ok: DIR_COLORS.green, warn: DIR_COLORS.orange, danger: DIR_COLORS.red }[tone]
  const toneLabel = { ok: 'Sous contrôle', warn: 'À surveiller', danger: 'Dépassement' }[tone]
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

  return <div className="dsh-ehs">
    <div className="dsh-gauge">
      <svg viewBox={`0 0 ${W} ${H}`} className="dsh-svg" role="img"
        aria-label={`Consommation EHS : ${ehs.consumed.toLocaleString('fr-FR')} EHS consommés sur ${ehs.planned.toLocaleString('fr-FR')} planifiés, soit ${ehsRate} %. Niveau ${toneLabel}.`}>
        <path d={arc(0, 1)} fill="none" stroke="#eae5f7" strokeWidth="20" strokeLinecap="round" />
        <path d={arc(0, ehsRate / 100)} fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" />
        <text x={cx} y={cy - 34} className="dsh-donut-value" textAnchor="middle">{ehsRate} %</text>
        <text x={cx} y={cy - 12} className="dsh-donut-sub" textAnchor="middle">du volume EHS planifié</text>
      </svg>
      <p className={`dsh-tag dsh-tag-${tone}`}><i aria-hidden="true">{toneIcon}</i>{toneLabel}</p>
      <dl className="dsh-facts">
        <div><dt>EHS consommés</dt><dd>{ehs.consumed.toLocaleString('fr-FR')}</dd></div>
        <div><dt>EHS planifiés</dt><dd>{ehs.planned.toLocaleString('fr-FR')}</dd></div>
        <div><dt>Reste disponible</dt><dd>{(ehs.planned - ehs.consumed).toLocaleString('fr-FR')}</dd></div>
      </dl>
    </div>

    <div className="dsh-breakdown">
      <p className="dsh-subhead">Consommation par département</p>
      <ul>
        {ehs.byDepartment.map((item) => {
          const rate = Math.round((item.consumed / item.planned) * 100)
          return <li key={item.label}>
            <button type="button" onClick={() => onDepartmentClick(item.label)}
              aria-label={`${item.label} : ${item.consumed.toLocaleString('fr-FR')} EHS consommés sur ${item.planned.toLocaleString('fr-FR')} planifiés, soit ${rate} %. Ouvrir la gestion des équipes.`}>
              <span className="dsh-breakdown-head"><b>{item.label}</b><em>{rate} %</em></span>
              <span className="dsh-track"><i style={{ width: `${rate}%`, background: rate > 90 ? DIR_COLORS.red : rate >= 75 ? DIR_COLORS.orange : DIR_COLORS.primary }} /></span>
              <small>{item.consumed.toLocaleString('fr-FR')} / {item.planned.toLocaleString('fr-FR')} EHS</small>
            </button>
          </li>
        })}
      </ul>
      <ChartTable
        caption="Consommation EHS par département"
        columns={['Département', 'EHS consommés', 'EHS planifiés', 'Taux']}
        rows={ehs.byDepartment.map((item) => [item.label, item.consumed, item.planned, `${Math.round((item.consumed / item.planned) * 100)} %`])}
      />
    </div>
  </div>
}

// ---------------------------------------------------------------------------
// 7. Livrables et échéances — barres empilées par période
// ---------------------------------------------------------------------------

const DELIVERABLE_SERIES = [
  { key: 'delivered', label: 'Livrés', color: DIR_COLORS.green },
  { key: 'inProgress', label: 'En cours', color: DIR_COLORS.primary },
  { key: 'late', label: 'En retard', color: DIR_COLORS.red },
] as const

export function DeliverablesChart({ data, onBucketClick }: { data: DeliverablePoint[]; onBucketClick: (label: string) => void }) {
  const tooltip = useDirTooltip()
  const W = 760, H = 250, PL = 40, PR = 18, PT = 18, PB = 38
  const plotW = W - PL - PR, plotH = H - PT - PB
  const totals = data.map((point) => point.delivered + point.inProgress + point.late)
  const max = niceMax(Math.max(...totals))
  const slot = plotW / Math.max(1, data.length)
  const barWidth = Math.min(44, slot * 0.5)
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const step = labelStep(data.length)

  return <div className="dsh-chart-host">
    <Legend items={DELIVERABLE_SERIES.map((series) => ({ label: series.label, color: series.color }))} />

    <svg viewBox={`0 0 ${W} ${H}`} className="dsh-svg" role="img"
      aria-label={`Livrables par période : ${data.reduce((sum, point) => sum + point.delivered, 0)} livrés et ${data.reduce((sum, point) => sum + point.late, 0)} en retard au total.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="dsh-grid" />
          <text x={PL - 8} y={y(value) + 4} className="dsh-axis" textAnchor="end">{Math.round(value)}</text>
        </g>
      })}

      {data.map((point, index) => {
        const x = PL + slot * index + (slot - barWidth) / 2
        // Empilement cumulatif du bas vers le haut, sans variable mutée hors du rendu.
        const tops = DELIVERABLE_SERIES.map((_, seriesIndex) =>
          DELIVERABLE_SERIES.slice(0, seriesIndex + 1).reduce((sum, series) => sum + point[series.key], 0))
        return <g key={point.label}>
          {DELIVERABLE_SERIES.map((series, seriesIndex) => point[series.key] > 0 && <rect
            key={series.key}
            x={x} y={y(tops[seriesIndex])} width={barWidth}
            height={(point[series.key] / max) * plotH} fill={series.color}
          />)}
          {index % step === 0 && <text x={x + barWidth / 2} y={H - PB + 18} className="dsh-axis" textAnchor="middle">{point.label}</text>}
          <rect
            x={PL + slot * index} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="dsh-hit"
            aria-label={`${point.label} : ${point.delivered} livrés, ${point.inProgress} en cours, ${point.late} en retard. Ouvrir le pilotage.`}
            onClick={() => onBucketClick(point.label)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onBucketClick(point.label) } }}
            onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <>
              <strong>{point.label} · {totals[index]} livrables</strong>
              {DELIVERABLE_SERIES.map((series) => <span key={series.key}><i style={{ background: series.color }} />{series.label} : {point[series.key]}</span>)}
            </>)}
            onFocus={(event) => tooltip.show(focusPoint(event), <strong>{point.label} · {totals[index]} livrables</strong>)}
            onBlur={tooltip.hide}
            onMouseLeave={tooltip.hide}
          />
        </g>
      })}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="dsh-axis-line" />
    </svg>
    {tooltip.node}

    <ChartTable
      caption="Livrables par période"
      columns={['Période', 'Livrés', 'En cours', 'En retard', 'Total']}
      rows={data.map((point, index) => [point.label, point.delivered, point.inProgress, point.late, totals[index]])}
    />
  </div>
}
