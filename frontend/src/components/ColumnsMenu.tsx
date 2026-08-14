import { useState } from 'react'
import { ChevronDown, Columns3 } from 'lucide-react'
import './ColumnsMenu.css'

export interface ColumnDef<Id extends string = string> {
  id: Id
  label: string
  group?: string
}

export interface HeaderCell {
  key: string
  label: string
  colSpan: number
  isGroup: boolean
}

export function useColumnVisibility<Id extends string>(columns: ColumnDef<Id>[]) {
  const [hiddenColumns, setHiddenColumns] = useState<Set<Id>>(new Set())

  const toggleColumn = (id: Id) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleColumns = columns.filter((c) => !hiddenColumns.has(c.id))

  const headerCells: HeaderCell[] = (() => {
    const cells: HeaderCell[] = []
    let i = 0
    while (i < columns.length) {
      const col = columns[i]
      if (hiddenColumns.has(col.id)) { i++; continue }
      if (!col.group) {
        cells.push({ key: col.id, label: col.label, colSpan: 1, isGroup: false })
        i++
        continue
      }
      const groupName = col.group
      let count = 0
      while (i < columns.length && columns[i].group === groupName) {
        if (!hiddenColumns.has(columns[i].id)) count++
        i++
      }
      if (count > 0) cells.push({ key: groupName, label: groupName, colSpan: count, isGroup: true })
    }
    return cells
  })()

  return { hiddenColumns, toggleColumn, visibleColumns, headerCells }
}

export function ColumnsMenu<Id extends string>({ columns, hiddenColumns, onToggle, buttonClassName = 'cols-menu-btn' }: {
  columns: ColumnDef<Id>[]
  hiddenColumns: Set<Id>
  onToggle: (id: Id) => void
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="cols-menu-wrap">
      <button type="button" className={buttonClassName} onClick={() => setOpen((o) => !o)}>
        <Columns3 size={14} />Colonnes<ChevronDown size={12} />
      </button>
      {open && (
        <div className="cols-menu" onMouseLeave={() => setOpen(false)}>
          {columns.map((c) => (
            <label key={c.id} className="cols-menu-item">
              <input type="checkbox" checked={!hiddenColumns.has(c.id)} onChange={() => onToggle(c.id)} />
              {c.group ? `${c.group} — ${c.label}` : c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
