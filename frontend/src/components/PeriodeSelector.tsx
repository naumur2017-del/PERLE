import DatePicker from './DatePicker'
import { anneesDisponibles, pad2, type Granularite, type PeriodeEtat } from '../utils/periodes'

// Sélecteur de période commun : mensuelle, trimestrielle, annuelle ou dates de début et de fin.
export default function PeriodeSelector({ etat, onChange, libelle }: {
  etat: PeriodeEtat
  onChange: (next: PeriodeEtat) => void
  libelle: string
}) {
  const set = (patch: Partial<PeriodeEtat>) => onChange({ ...etat, ...patch })
  const annees = anneesDisponibles()

  return (
    <div className="periode-selector">
      <label>Période
        <select value={etat.granularite} onChange={(e) => set({ granularite: e.target.value as Granularite })}>
          <option value="mois">Mensuelle</option>
          <option value="trimestre">Trimestrielle</option>
          <option value="annee">Annuelle</option>
          <option value="personnalisee">Date de début et de fin</option>
        </select>
      </label>
      {etat.granularite === 'mois' && (
        <label>Mois
          <input type="month" value={`${etat.annee}-${pad2(etat.mois)}`} onChange={(e) => {
            const [y, m] = e.target.value.split('-').map(Number)
            if (y && m) set({ annee: y, mois: m })
          }} />
        </label>
      )}
      {etat.granularite === 'trimestre' && (
        <>
          <label>Trimestre
            <select value={etat.trimestre} onChange={(e) => set({ trimestre: Number(e.target.value) })}>
              <option value={1}>T1 (janvier – mars)</option>
              <option value={2}>T2 (avril – juin)</option>
              <option value={3}>T3 (juillet – septembre)</option>
              <option value={4}>T4 (octobre – décembre)</option>
            </select>
          </label>
          <label>Année
            <select value={etat.annee} onChange={(e) => set({ annee: Number(e.target.value) })}>
              {annees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </>
      )}
      {etat.granularite === 'annee' && (
        <label>Année
          <select value={etat.annee} onChange={(e) => set({ annee: Number(e.target.value) })}>
            {annees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      )}
      {etat.granularite === 'personnalisee' && (
        <>
          <DatePicker label="Date de début" value={etat.debutPerso} onChange={(v) => set({ debutPerso: v })} />
          <DatePicker label="Date de fin" value={etat.finPerso} min={etat.debutPerso || undefined} onChange={(v) => set({ finPerso: v })} />
        </>
      )}
      <span className="periode-selector-libelle">{libelle}</span>
    </div>
  )
}
