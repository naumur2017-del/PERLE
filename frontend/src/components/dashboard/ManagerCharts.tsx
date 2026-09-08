// Graphiques du tableau de bord manager, dessinés en SVG natif et habillés aux
// styles partagés « dsh-* » (voir dashboard.css). Données fournies par
// backend/accounts/dashboard.py via src/api/dashboard.ts.

import { type MouseEvent, type ReactNode } from 'react'
import { ChartTable } from './DashboardUI'
import { focusPoint, labelStep, niceMax, useTooltip } from './chartTools'
import { DIR_COLORS, DIR_PALETTE } from './directorData'
import type { LabelValue, ManagerDashboard } from '../../api/dashboard'

function useMgrTooltip() {
  const { show, hide, tip } = useTooltip('.dsh-chart-host')
  const node: ReactNode = tip
    ? <div className="dsh-tooltip" style={{ left: tip.x, top: tip.y }} role="presentation">{tip.content}</div>
    : null
  return { show, hide, node }
}

const Legend = ({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) => <ul className="dsh-legend">
  {items.map((item) => <li key={item.label}>
    <i style={item.dashed ? { borderTop: `2px dashed ${item.color}` } : { background: item.color }}
      className={item.dashed ? 'dsh-legend-line' : ''} aria-hidden="true" />
    {item.label}
  </li>)}
</ul>

// --------------------------------------------------------------------------- //
// 1. Répartition des tâches (barre empilée horizontale)                        //
// --------------------------------------------------------------------------- //

export function TaskSplitChart({ data, caption }: { data: LabelValue[]; caption: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const tooltip = useMgrTooltip()

  return <div className="dsh-chart-host">
    <Legend items={data.map((item, index) => ({ label: item.label, color: DIR_PALETTE[index % DIR_PALETTE.length] }))} />
    {total === 0
      ? <p className="dsh-subhead">Aucune donnée sur la période.</p>
      : <span className="dsh-stack dsh-stack-lg" role="img" aria-label={`${caption} : ${data.map((item) => `${item.label} ${item.value}`).join(', ')}.`}>
        {data.map((item, index) => item.value > 0 && <i
          key={item.label}
          style={{ flex: item.value, background: DIR_PALETTE[index % DIR_PALETTE.length] }}
          onMouseMove={(event: MouseEvent<HTMLElement>) => tooltip.show(event, <><strong>{item.label}</strong><span>{item.value} · {Math.round((item.value / total) * 100)} %</span></>)}
          onMouseLeave={tooltip.hide}
        >{item.value}</i>)}
      </span>}
    {tooltip.node}
    <ChartTable caption={caption} columns={['Catégorie', 'Nombre', 'Part']}
      rows={data.map((item) => [item.label, item.value, total ? `${Math.round((item.value / total) * 100)} %` : '0 %'])} />
  </div>
}

// --------------------------------------------------------------------------- //
// 2. Tendance des tâches (créées vs livrées par mois)                          //
// --------------------------------------------------------------------------- //

export function TasksTrendChart({ data }: { data: ManagerDashboard['tasks_trend'] }) {
  const tooltip = useMgrTooltip()
  const W = 720, H = 240, PL = 40, PR = 18, PT = 18, PB = 34
  const plotW = W - PL - PR, plotH = H - PT - PB
  const max = niceMax(Math.max(1, ...data.map((point) => Math.max(point.created, point.done))))
  const slot = plotW / Math.max(1, data.length)
  const barWidth = Math.min(18, slot * 0.28)
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const step = labelStep(data.length)

  return <div className="dsh-chart-host">
    <Legend items={[
      { label: 'Tâches créées', color: DIR_COLORS.slate },
      { label: 'Tâches livrées', color: DIR_COLORS.green },
    ]} />
    <svg viewBox={`0 0 ${W} ${H}`} className="dsh-svg" role="img"
      aria-label={`Tendance des tâches : ${data.reduce((s, p) => s + p.done, 0)} livrées et ${data.reduce((s, p) => s + p.created, 0)} créées au total.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="dsh-grid" />
          <text x={PL - 8} y={y(value) + 4} className="dsh-axis" textAnchor="end">{Math.round(value)}</text>
        </g>
      })}
      {data.map((point, index) => {
        const cx = PL + slot * index + slot / 2
        return <g key={point.label}>
          <rect x={cx - barWidth - 1} y={y(point.created)} width={barWidth} height={Math.max(0, PT + plotH - y(point.created))} fill={DIR_COLORS.slate} rx="2" />
          <rect x={cx + 1} y={y(point.done)} width={barWidth} height={Math.max(0, PT + plotH - y(point.done))} fill={DIR_COLORS.green} rx="2" />
          {index % step === 0 && <text x={cx} y={H - PB + 18} className="dsh-axis" textAnchor="middle">{point.label}</text>}
          <rect x={PL + slot * index} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="dsh-hit"
            aria-label={`${point.label} : ${point.created} créées, ${point.done} livrées.`}
            onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <>
              <strong>{point.label}</strong>
              <span><i style={{ background: DIR_COLORS.slate }} />Créées : {point.created}</span>
              <span><i style={{ background: DIR_COLORS.green }} />Livrées : {point.done}</span>
            </>)}
            onFocus={(event) => tooltip.show(focusPoint(event), <strong>{point.label} · {point.done} livrées</strong>)}
            onBlur={tooltip.hide}
            onMouseLeave={tooltip.hide}
          />
        </g>
      })}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="dsh-axis-line" />
    </svg>
    {tooltip.node}
    <ChartTable caption="Tâches créées et livrées par mois" columns={['Mois', 'Créées', 'Livrées']}
      rows={data.map((point) => [point.label, point.created, point.done])} />
  </div>
}

// --------------------------------------------------------------------------- //
// 3. Charge par collaborateur (heures staffées vs capacité)                    //
// --------------------------------------------------------------------------- //

export function WorkloadChart({ data }: { data: ManagerDashboard['workload'] }) {
  const max = Math.max(1, ...data.map((row) => Math.max(row.hours, row.capacity)))

  return <div className="dsh-chart-host">
    <Legend items={[
      { label: 'Heures staffées', color: DIR_COLORS.primary },
      { label: 'Capacité mensuelle', color: DIR_COLORS.slate, dashed: true },
    ]} />
    <ul className="dsh-teams" aria-label="Charge par collaborateur">
      {data.map((row) => {
        const rate = Math.round((row.hours / row.capacity) * 100)
        return <li key={row.label}>
          <span className="dsh-teams-head"><b>{row.label}</b><em className={rate > 100 ? 'dsh-bad' : rate > 85 ? 'dsh-warn' : 'dsh-good'}>{rate} %</em></span>
          <span className="dsh-track">
            <i style={{ width: `${Math.min(100, (row.hours / max) * 100)}%`, background: rate > 100 ? DIR_COLORS.red : DIR_COLORS.primary }} />
            <b>{row.hours} h</b>
          </span>
        </li>
      })}
      {data.length === 0 && <li><p className="dsh-subhead">Aucun collaborateur staffé.</p></li>}
    </ul>
    <ChartTable caption="Charge par collaborateur" columns={['Collaborateur', 'Heures staffées', 'Capacité', 'Taux']}
      rows={data.map((row) => [row.label, row.hours, row.capacity, `${Math.round((row.hours / row.capacity) * 100)} %`])} />
  </div>
}

// --------------------------------------------------------------------------- //
// 4. Consommation EHS par mois (barres)                                        //
// --------------------------------------------------------------------------- //

export function EhsTrendChart({ data }: { data: LabelValue[] }) {
  const tooltip = useMgrTooltip()
  const W = 720, H = 220, PL = 44, PR = 18, PT = 16, PB = 32
  const plotW = W - PL - PR, plotH = H - PT - PB
  const max = niceMax(Math.max(1, ...data.map((point) => point.value)))
  const slot = plotW / Math.max(1, data.length)
  const barWidth = Math.min(34, slot * 0.5)
  const y = (value: number) => PT + plotH - (value / max) * plotH
  const step = labelStep(data.length)

  return <div className="dsh-chart-host">
    <svg viewBox={`0 0 ${W} ${H}`} className="dsh-svg" role="img"
      aria-label={`Consommation EHS par mois : ${data.reduce((s, p) => s + p.value, 0).toLocaleString('fr-FR')} EHS au total.`}>
      {Array.from({ length: 5 }, (_, i) => {
        const value = (max / 4) * i
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(value)} y2={y(value)} className="dsh-grid" />
          <text x={PL - 8} y={y(value) + 4} className="dsh-axis" textAnchor="end">{Math.round(value)}</text>
        </g>
      })}
      {data.map((point, index) => {
        const x = PL + slot * index + (slot - barWidth) / 2
        return <g key={point.label}>
          <rect x={x} y={y(point.value)} width={barWidth} height={Math.max(0, PT + plotH - y(point.value))} fill={DIR_COLORS.teal} rx="3" />
          {index % step === 0 && <text x={x + barWidth / 2} y={H - PB + 18} className="dsh-axis" textAnchor="middle">{point.label}</text>}
          <rect x={PL + slot * index} y={PT} width={slot} height={plotH} fill="transparent" tabIndex={0} role="button" className="dsh-hit"
            aria-label={`${point.label} : ${point.value.toLocaleString('fr-FR')} EHS.`}
            onMouseMove={(event: MouseEvent<SVGRectElement>) => tooltip.show(event, <><strong>{point.label}</strong><span>{point.value.toLocaleString('fr-FR')} EHS</span></>)}
            onFocus={(event) => tooltip.show(focusPoint(event), <strong>{point.label} · {point.value.toLocaleString('fr-FR')} EHS</strong>)}
            onBlur={tooltip.hide}
            onMouseLeave={tooltip.hide}
          />
        </g>
      })}
      <line x1={PL} x2={W - PR} y1={PT + plotH} y2={PT + plotH} className="dsh-axis-line" />
    </svg>
    {tooltip.node}
    <ChartTable caption="Consommation EHS par mois" columns={['Mois', 'EHS consommés']}
      rows={data.map((point) => [point.label, point.value])} />
  </div>
}
