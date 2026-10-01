// Impact map editor: a matrix of impacted groups (rows) × change elements
// (columns). Row/column labels are editable (add/rename/remove); each cell
// is a color-coded impact level with an optional note.
import { useState } from 'react'
import { inputCls, SectionTitle, Field, ConfirmButton } from './shared.jsx'

const LEVELS = [
  { id: 'none', label: 'None', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  { id: 'low', label: 'Low', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'medium', label: 'Medium', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'high', label: 'High', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
]

const cellKey = (g, e) => `${g}||${e}`

export default function ImpactEditor({ content, onChange }) {
  const groups = content?.groups || []
  const elements = content?.elements || []
  const cells = content?.cells || {}
  const [selCell, setSelCell] = useState(null) // {g, e} for the note panel
  const [newGroup, setNewGroup] = useState('')
  const [newElement, setNewElement] = useState('')

  const setContent = (patch) => onChange({ ...(content || {}), ...patch })

  const renameGroup = (oldName, name) => {
    const nextCells = { ...cells }
    for (const e of elements) {
      const k = cellKey(oldName, e)
      if (nextCells[k] !== undefined) {
        nextCells[cellKey(name, e)] = nextCells[k]
        delete nextCells[k]
      }
    }
    setContent({ groups: groups.map(g => (g === oldName ? name : g)), cells: nextCells })
    if (selCell?.g === oldName) setSelCell({ ...selCell, g: name })
  }

  const renameElement = (oldName, name) => {
    const nextCells = { ...cells }
    for (const g of groups) {
      const k = cellKey(g, oldName)
      if (nextCells[k] !== undefined) {
        nextCells[cellKey(g, name)] = nextCells[k]
        delete nextCells[k]
      }
    }
    setContent({ elements: elements.map(e => (e === oldName ? name : e)), cells: nextCells })
    if (selCell?.e === oldName) setSelCell({ ...selCell, e: name })
  }

  const removeGroup = (name) => {
    const nextCells = { ...cells }
    for (const k of Object.keys(nextCells)) {
      if (k.startsWith(`${name}||`)) delete nextCells[k]
    }
    setContent({ groups: groups.filter(g => g !== name), cells: nextCells })
    if (selCell?.g === name) setSelCell(null)
  }

  const removeElement = (name) => {
    const nextCells = { ...cells }
    for (const k of Object.keys(nextCells)) {
      if (k.endsWith(`||${name}`)) delete nextCells[k]
    }
    setContent({ elements: elements.filter(e => e !== name), cells: nextCells })
    if (selCell?.e === name) setSelCell(null)
  }

  const setLevel = (g, e, level) =>
    setContent({ cells: { ...cells, [cellKey(g, e)]: { ...(cells[cellKey(g, e)] || {}), level } } })

  const setNote = (g, e, notes) =>
    setContent({ cells: { ...cells, [cellKey(g, e)]: { ...(cells[cellKey(g, e)] || {}), notes } } })

  const levelOf = (g, e) => cells[cellKey(g, e)]?.level || 'none'
  const metaOf = (level) => LEVELS.find(l => l.id === level) || LEVELS[0]

  return (
    <div className="space-y-4">
      <SectionTitle>Impact matrix</SectionTitle>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-left w-44">
                <span className="text-[10px] uppercase tracking-widest text-slate-400">Groups ↓ · Changes →</span>
              </th>
              {elements.map(e => (
                <th key={e} className="p-1 min-w-[120px]">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <input
                      value={e}
                      onChange={ev => renameElement(e, ev.target.value)}
                      className="flex-1 min-w-0 text-[11px] font-semibold text-slate-700 bg-transparent outline-none"
                    />
                    <ConfirmButton onConfirm={() => removeElement(e)} label="×" className="text-sm shrink-0" />
                  </div>
                </th>
              ))}
              <th className="p-1 w-40">
                <div className="flex gap-1">
                  <input
                    value={newElement}
                    onChange={e => setNewElement(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newElement.trim()) { setContent({ elements: [...elements, newElement.trim()] }); setNewElement('') } }}
                    placeholder="+ Change element"
                    className={`${inputCls} !py-1`}
                  />
                  <button
                    onClick={() => { if (newElement.trim()) { setContent({ elements: [...elements, newElement.trim()] }); setNewElement('') } }}
                    disabled={!newElement.trim()}
                    className="px-2 py-1 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-40 shrink-0"
                  >
                    Add
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g}>
                <td className="p-1">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                    <input
                      value={g}
                      onChange={e => renameGroup(g, e.target.value)}
                      className="flex-1 min-w-0 text-[11px] font-semibold text-slate-700 bg-transparent outline-none"
                    />
                    <ConfirmButton onConfirm={() => removeGroup(g)} label="×" className="text-sm shrink-0" />
                  </div>
                </td>
                {elements.map(e => {
                  const meta = metaOf(levelOf(g, e))
                  const note = cells[cellKey(g, e)]?.notes
                  const selected = selCell?.g === g && selCell?.e === e
                  return (
                    <td key={e} className="p-1">
                      <button
                        onClick={() => setSelCell(selected ? null : { g, e })}
                        className={`w-full rounded-lg border px-2 py-1.5 text-left transition ${meta.cls} ${selected ? 'ring-2 ring-teal-500' : ''}`}
                        title={note || 'Click to add a note'}
                      >
                        <select
                          value={levelOf(g, e)}
                          onClick={ev => ev.stopPropagation()}
                          onChange={ev => setLevel(g, e, ev.target.value)}
                          className="w-full bg-transparent text-[11px] font-semibold outline-none cursor-pointer"
                        >
                          {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                        {note && <div className="text-[10px] opacity-70 truncate mt-0.5">📝 {note}</div>}
                      </button>
                    </td>
                  )
                })}
                <td />
              </tr>
            ))}
            <tr>
              <td className="p-1">
                <div className="flex gap-1">
                  <input
                    value={newGroup}
                    onChange={e => setNewGroup(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newGroup.trim()) { setContent({ groups: [...groups, newGroup.trim()] }); setNewGroup('') } }}
                    placeholder="+ Impacted group"
                    className={`${inputCls} !py-1.5`}
                  />
                  <button
                    onClick={() => { if (newGroup.trim()) { setContent({ groups: [...groups, newGroup.trim()] }); setNewGroup('') } }}
                    disabled={!newGroup.trim()}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-40 shrink-0"
                  >
                    Add
                  </button>
                </div>
              </td>
              {elements.map(e => <td key={e} />)}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {groups.length === 0 || elements.length === 0 ? (
        <p className="text-[11px] text-slate-400">
          Add at least one impacted group and one change element to start rating impact.
        </p>
      ) : (
        <p className="text-[11px] text-slate-400">Tip: click a cell to add a note about that impact.</p>
      )}

      {selCell && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <Field label={`Note — ${selCell.g} × ${selCell.e}`}>
            <textarea
              value={cells[cellKey(selCell.g, selCell.e)]?.notes || ''}
              onChange={e => setNote(selCell.g, selCell.e, e.target.value)}
              rows={2}
              placeholder="Why this level? What's the specific impact?"
              className={inputCls}
            />
          </Field>
        </div>
      )}
    </div>
  )
}
