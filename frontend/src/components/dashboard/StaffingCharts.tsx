// Graphiques du tableau de bord « Staffing des équipes », mêmes conventions que
// ManagerCharts.tsx/DirectorCharts.tsx (SVG natif, styles partagés dsh-*, aucune
// dépendance de graphique externe). Données calculées côté client à partir de ce
// que la page a déjà chargé (tâches, équipes, projets) — voir StaffingEquipesPage.tsx.

import { type MouseEvent, type ReactNode } from 'react'
import { ChartTable } from './DashboardUI'
import { focusPoint, labelStep, niceMax, useTooltip } from './chartTools'
import { DIR_COLORS, DIR_PALETTE } from './directorData'
import { formatMontant } from '../../utils/currency'

function useStaffingTooltip() {
  const { show, hide, tip } = useTooltip('.dsh-chart-host')
  const node: ReactNode = tip
    ? <div className="dsh-tooltip" style={{ left: tip.x, top: tip.y }} role="presentation">{tip.content}</div>
    : null
  return { show, hide, node }
}

export interface LabelValue { label: string; value: number }

// --------------------------------------------------------------------------- //
// 1. Tâches par équipe (barres verticales)                                     //
// --------------------------------------------------------------------------- //

export function TeamTasksBarChart({ data }: { data: LabelValue[] }) {
  const tooltip = useStaffingTooltip()
  const W = 720, H = 260, PL = 40, PR = 18, PT = 16, PB = 56
  const plotW = W - PL - PR, plotH = H - PT - PB
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)))
  const slot = plotW / Math.max(1, data.length)
  const barWidth = Math.min(40, slot * 0.55)
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return <div className="dsh-chart-host">
    {data.length === 0
      ? <p className="dsh-subhead">Aucune tâche sur la période.</p>
      : <svg viewBox={`0 0 ${W} ${H}`} className="dsh-svg" role="img"
          aria-label={`Tâches par équipe : ${data.map((d) => `${d.label} ${d.value}`).join(', ')}. Total ${total}.`}>
          {Array.from({ length: 5 }, (_, i) => {
            const value = (max / 4) * i
            return <g key={i}>
              <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="dsh-grid" />
              <text x={PL - 8} y={y(value) + 4} className="dsh-axis" textAnchor="end">{Math.round(value)}</text>
            </g>
          })}
          {data.map((d, index) => {
            const x = PL + slot * index + (slot - barWidth) / 2
            const color = DIR_PALETTE[index % DIR_PALETTE.length]
            return <g key={d.label}>
              <rect x={x} y={y(d.value)} width={barWidth} height={Math.max(0, PT + plotH - y(d.value))} fill={color} rx="4" />
              <text x={x + barWidth / 2} y={H - PB + 18} className="dsh-axis" textAnchor="middle">
                {d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label}
              </text>
              <rect x={PL + slot * index} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="dsh-hit"
                aria-label={`${d.label} : ${d.value} tâche(s).`}
                onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <><strong>{d.label}</strong><span>{d.value} tâche{d.value > 1 ? 's' : ''}</span></>)}
                onFocus={(event) => tooltip.show(focusPoint(event), <strong>{d.label} · {d.value}</strong>)}
                onBlur={tooltip.hide}
                onMouseLeave={tooltip.hide}
              />
            </g>
          })}
          <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="dsh-axis-line" />
        </svg>}
    {tooltip.node}
    <ChartTable caption="Tâches par équipe" columns={['Équipe', 'Tâches']} rows={data.map((d) => [d.label, d.value])} />
  </div>
}

// --------------------------------------------------------------------------- //
// 2. Répartition des tâches par statut (donut)                                 //
// --------------------------------------------------------------------------- //

export function TaskStatusDonut({ data }: { data: LabelValue[] }) {
  const tooltip = useStaffingTooltip()
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1
  const cx = 96, cy = 96, outer = 86, inner = 54
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
      percent: total ? Math.round((item.value / total) * 100) : 0,
      path: item.value > 0 ? `M ${point(outer, from)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, to)} L ${point(inner, to)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, from)} Z` : '',
    }
  })

  return <div className="dsh-chart-host">
    <div className="dsh-donut-layout">
      <svg viewBox="0 0 192 192" className="dsh-svg dsh-donut" role="img"
        aria-label={`Répartition des tâches par statut : ${slices.map((s) => `${s.label} ${s.percent} %`).join(', ')}.`}>
        {slices.map((slice) => slice.path && <path
          key={slice.label} d={slice.path} fill={slice.color} className="dsh-slice"
          onMouseMove={(event: MouseEvent<SVGPathElement>) => tooltip.show(event, <><strong>{slice.label}</strong><span>{slice.value} · {slice.percent} %</span></>)}
          onMouseLeave={tooltip.hide}
        />)}
        <text x="96" y="92" className="dsh-donut-value" textAnchor="middle">{total === 1 && data.every((d) => d.value === 0) ? 0 : data.reduce((s, d) => s + d.value, 0)}</text>
        <text x="96" y="112" className="dsh-donut-sub" textAnchor="middle">tâche{data.reduce((s, d) => s + d.value, 0) > 1 ? 's' : ''}</text>
      </svg>
      <ul className="dsh-donut-legend">
        {slices.map((slice) => <li key={slice.label}>
          <button type="button" tabIndex={-1}>
            <i style={{ background: slice.color }} aria-hidden="true" />
            <b>{slice.label}</b>
            <em>{slice.percent} %</em>
            <small>{slice.value}</small>
          </button>
        </li>)}
      </ul>
    </div>
    {tooltip.node}
    <ChartTable caption="Répartition des tâches par statut" columns={['Statut', 'Tâches', 'Part']}
      rows={slices.map((s) => [s.label, s.value, `${s.percent} %`])} />
  </div>
}

// --------------------------------------------------------------------------- //
// 3. Projets — budget d'exécution vs part attribuée (nuage de points)          //
// --------------------------------------------------------------------------- //

export interface ProjectScatterPoint { label: string; budgetExecution: number; attribuePercent: number }

export function ProjectBudgetScatter({ data }: { data: ProjectScatterPoint[] }) {
  const tooltip = useStaffingTooltip()
  const W = 720, H = 280, PL = 56, PR = 24, PT = 16, PB = 40
  const plotW = W - PL - PR, plotH = H - PT - PB
  const maxBudget = niceMax(Math.max(1, ...data.map((d) => d.budgetExecution)))
  const x = (value: number) => PL + (value / maxBudget) * plotW
  const y = (value: number) => PT + plotH - (Math.min(100, value) / 100) * plotH

  return <div className="dsh-chart-host">
    {data.length === 0
      ? <p className="dsh-subhead">Aucun projet enregistré définitivement pour le moment.</p>
      : <svg viewBox={`0 0 ${W} ${H}`} className="dsh-svg" role="img"
          aria-label={`Projets par budget d'exécution et part attribuée : ${data.map((d) => `${d.label} ${formatMontant(d.budgetExecution)}, ${Math.round(d.attribuePercent)} %`).join(', ')}.`}>
          {Array.from({ length: 5 }, (_, i) => {
            const value = (100 / 4) * i
            return <g key={`y-${i}`}>
              <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="dsh-grid" />
              <text x={PL - 8} y={y(value) + 4} className="dsh-axis" textAnchor="end">{Math.round(value)}%</text>
            </g>
          })}
          {Array.from({ length: 5 }, (_, i) => {
            const value = (maxBudget / 4) * i
            return <g key={`x-${i}`}>
              <text x={x(value)} y={H - PB + 18} className="dsh-axis" textAnchor="middle">{formatMontant(value, undefined, { notation: 'compact' })}</text>
            </g>
          })}
          {/* Seuil des 100 % : au-delà, le projet a plus attribué que son budget d'exécution. */}
          <line x1={PL} x2={W - PR} y1={y(100)} y2={y(100)} className="dsh-axis-line" strokeDasharray="4 4" />
          {data.map((d, index) => {
            const color = DIR_PALETTE[index % DIR_PALETTE.length]
            const over = d.attribuePercent > 100
            return <g key={d.label}>
              <circle cx={x(d.budgetExecution)} cy={y(d.attribuePercent)} r={7} fill={over ? DIR_COLORS.red : color} stroke="var(--dsh-surface)" strokeWidth={2} />
              <circle cx={x(d.budgetExecution)} cy={y(d.attribuePercent)} r={13} fill="transparent" tabIndex={0} role="button" className="dsh-hit"
                aria-label={`${d.label} : budget d'exécution ${formatMontant(d.budgetExecution)}, ${Math.round(d.attribuePercent)} % attribué.`}
                onMouseMove={(event: MouseEvent<SVGCircleElement>) => tooltip.show(event, <>
                  <strong>{d.label}</strong>
                  <span>Budget d’exécution : {formatMontant(d.budgetExecution)}</span>
                  <span>Attribué : {Math.round(d.attribuePercent)} %</span>
                </>)}
                onFocus={(event) => tooltip.show(focusPoint(event), <strong>{d.label} · {Math.round(d.attribuePercent)} %</strong>)}
                onBlur={tooltip.hide}
                onMouseLeave={tooltip.hide}
              />
            </g>
          })}
          <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="dsh-axis-line" />
        </svg>}
    {tooltip.node}
    <ChartTable caption="Projets — budget d'exécution vs part attribuée" columns={['Projet', "Budget d'exécution", 'Attribué']}
      rows={data.map((d) => [d.label, formatMontant(d.budgetExecution), `${Math.round(d.attribuePercent)} %`])} />
  </div>
}
