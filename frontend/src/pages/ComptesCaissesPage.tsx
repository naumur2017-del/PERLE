import { useState } from 'react'
import {
  BadgeCheck, Briefcase, Download, Edit2, Info, Landmark, Plus, Receipt, RefreshCw, Search,
  Smartphone, Trash2, UploadCloud, Wallet, Wallet2,
} from 'lucide-react'
import './ComptesCaissesPage.css'

interface Compte {
  numero: number
  nom: string
  sousLibelle: string
  type: 'Bancaire' | 'Caisse' | 'Mobile Money' | 'Projet'
  categorie: string
  reference: string
  solde: number
  derniereMaj: string
}

const COMPTES: Compte[] = [
  { numero: 1, nom: 'BGFI Bank - Compte Principal', sousLibelle: 'Compte bancaire', type: 'Bancaire', categorie: 'Compte opérationnel', reference: 'CMR1234567890', solde: 42350000, derniereMaj: '04/08/2025 11:25' },
  { numero: 2, nom: 'Ecobank - Compte Opérationnel', sousLibelle: 'Compte bancaire', type: 'Bancaire', categorie: 'Compte opérationnel', reference: 'CMR9876543210', solde: 18600000, derniereMaj: '04/08/2025 10:40' },
  { numero: 3, nom: 'Caisse Principale', sousLibelle: 'Caisse', type: 'Caisse', categorie: 'Caisse interne', reference: 'CAIS-001', solde: 4250000, derniereMaj: '04/08/2025 09:15' },
  { numero: 4, nom: 'Caisse Secondaire', sousLibelle: 'Caisse', type: 'Caisse', categorie: 'Caisse interne', reference: 'CAIS-002', solde: 2670000, derniereMaj: '04/08/2025 09:10' },
  { numero: 5, nom: 'MTN Mobile Money', sousLibelle: 'Mobile Money', type: 'Mobile Money', categorie: 'Mobile Money', reference: '237650123456', solde: 4200000, derniereMaj: '04/08/2025 11:05' },
  { numero: 6, nom: 'Orange Money', sousLibelle: 'Mobile Money', type: 'Mobile Money', categorie: 'Mobile Money', reference: '237680987654', solde: 3300000, derniereMaj: '04/08/2025 11:05' },
  { numero: 7, nom: 'Compte Projet PADESCE', sousLibelle: 'Compte projet', type: 'Projet', categorie: 'Projet', reference: 'PROJ-PADESCE', solde: 1250000, derniereMaj: '04/08/2025 10:20' },
  { numero: 8, nom: 'Compte Projet PANSFI', sousLibelle: 'Compte projet', type: 'Projet', categorie: 'Projet', reference: 'PROJ-PANSFI', solde: 850000, derniereMaj: '04/08/2025 10:20' },
  { numero: 9, nom: 'Compte Projet MIDER', sousLibelle: 'Compte projet', type: 'Projet', categorie: 'Projet', reference: 'PROJ-MIDER', solde: 400000, derniereMaj: '04/08/2025 10:20' },
  { numero: 10, nom: 'Compte Dépôt Garantie', sousLibelle: 'Compte bancaire', type: 'Bancaire', categorie: 'Compte de garantie', reference: 'BGFI-DG-001', solde: 2000000, derniereMaj: '04/08/2025 09:50' },
]

const KPIS = [
  { icon: Wallet, tone: 'purple', label: 'Solde total tous comptes', value: '85 370 000', sub: 'Mise à jour : 04/08/2025 11:30' },
  { icon: Landmark, tone: 'green', label: 'Total comptes bancaires', value: '68 450 000', sub: '4 comptes' },
  { icon: Wallet2, tone: 'orange', label: 'Total caisses', value: '6 920 000', sub: '2 caisses' },
  { icon: Smartphone, tone: 'blue', label: 'Total Mobile Money', value: '7 500 000', sub: '2 comptes Mobile Money' },
  { icon: Briefcase, tone: 'indigo', label: 'Total comptes projets', value: '2 500 000', sub: '3 comptes projets' },
]

const typeClass = (type: Compte['type']) => {
  if (type === 'Bancaire') return 'bancaire'
  if (type === 'Caisse') return 'caisse'
  if (type === 'Mobile Money') return 'mobile'
  return 'projet'
}

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

export default function ComptesCaissesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')
  const [compteChoisi, setCompteChoisi] = useState('')
  const [montant, setMontant] = useState('')

  return (
    <section className="cc-page">
      <nav className="cc-subtabs">
        <button onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Demandes de paiement</button>
        <button onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Paiements exécutés</button>
        <button className="active" onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et caisses</button>
        <button onClick={() => navigateTo('tresorerie-rapports')}><Receipt size={14} />Rapports financiers</button>
      </nav>

      <div className="cc-top">
        <div className="cc-kpis">
          {KPIS.map((kpi) => (
            <article key={kpi.label} className={`cc-kpi cc-kpi-${kpi.tone}`}>
              <span className="cc-kpi-icon"><kpi.icon size={17} /></span>
              <div>
                <strong>{kpi.value} <small>FCFA</small></strong>
                <span>{kpi.label}</span>
                <small>{kpi.sub}</small>
              </div>
            </article>
          ))}
        </div>
        <button type="button" className="cc-btn-primary"><Plus size={14} />Nouveau compte</button>
      </div>

      <div className="cc-filters">
        <label className="cc-search">
          <Search size={14} />
          <input placeholder="Rechercher un compte (nom, numéro, type...)" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>Type de compte<select defaultValue="Tous"><option>Tous les types</option></select></label>
        <button type="button" className="cc-btn-outline"><RefreshCw size={14} />Actualiser</button>
        <button type="button" className="cc-btn-primary"><Download size={14} />Exporter</button>
      </div>

      <div className="cc-main">
        <div className="cc-table-panel">
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>N°</th><th>Nom du compte</th><th>Type de compte</th><th>Catégorie</th>
                  <th>Numéro / Référence</th><th>Solde actuel (FCFA)</th><th>Dernière mise à jour</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {COMPTES.map((compte) => (
                  <tr key={compte.numero}>
                    <td>{compte.numero}</td>
                    <td className="cc-name"><strong>{compte.nom}</strong><small>{compte.sousLibelle}</small></td>
                    <td><span className={`cc-type cc-type-${typeClass(compte.type)}`}>{compte.type}</span></td>
                    <td>{compte.categorie}</td>
                    <td className="cc-ref">{compte.reference}</td>
                    <td className="cc-solde">{fmtMontant(compte.solde)}</td>
                    <td>{compte.derniereMaj}</td>
                    <td><span className="cc-pill">Actif</span></td>
                    <td>
                      <div className="cc-actions">
                        <button type="button" className="cc-approvisionner"><Plus size={12} />Approvisionner</button>
                        <button type="button" className="cc-row-action" aria-label="Modifier"><Edit2 size={13} /></button>
                        <button type="button" className="cc-row-action danger" aria-label="Supprimer"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cc-table-foot">
            <span>Affichage de 1 à {COMPTES.length} sur {COMPTES.length} comptes</span>
            <label className="cc-page-size">
              <select defaultValue={10}><option value={10}>10</option><option value={25}>25</option></select>
            </label>
            <nav className="cc-pagination" aria-label="Pagination">
              <button type="button" disabled>«</button>
              <button type="button" disabled>‹</button>
              <button type="button" className="is-active">1</button>
              <button type="button" disabled>›</button>
              <button type="button" disabled>»</button>
            </nav>
          </div>
        </div>

        <aside className="cc-side">
          <div className="cc-panel">
            <h3>Approvisionner un compte</h3>
            <form className="cc-form" onSubmit={(event) => event.preventDefault()}>
              <label>Sélectionner un compte
                <select value={compteChoisi} onChange={(event) => setCompteChoisi(event.target.value)}>
                  <option value="">-- Choisir un compte --</option>
                  {COMPTES.map((compte) => <option key={compte.numero} value={compte.nom}>{compte.nom}</option>)}
                </select>
              </label>
              <label>Montant (FCFA)
                <input type="number" min={0} placeholder="Saisir le montant" value={montant} onChange={(event) => setMontant(event.target.value)} />
              </label>
              <label>Justificatif
                <div className="cc-dropzone">
                  <UploadCloud size={22} />
                  <span>Cliquez pour ajouter un justificatif</span>
                  <small>PDF, JPG, PNG (Max. 5 Mo)</small>
                </div>
              </label>
              <label>Description (optionnel)
                <textarea rows={3} placeholder="Ajouter une description..." />
              </label>
              <button type="submit" className="cc-btn-primary cc-form-submit">Valider l’approvisionnement</button>
            </form>
          </div>

          <div className="cc-note">
            <Info size={16} />
            <div>
              <strong>Informations importantes</strong>
              <ul>
                <li>L’approvisionnement ajoute des fonds au solde du compte.</li>
                <li>Un justificatif est obligatoire pour toute opération.</li>
                <li>Les comptes ne peuvent pas avoir un solde négatif.</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
