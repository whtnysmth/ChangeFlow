// Stakeholder map editor: add people with influence/interest, rendered on a
// classic 2x2 grid (Manage closely / Keep satisfied / Keep informed / Monitor).
// No drag-and-drop — click a person to edit or remove them.
import { useState } from 'react'
import { inputCls, btnGhost, SectionTitle, Field, ConfirmButton, uid } from './shared.jsx'

const LEVELS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
]

const QUADRANTS = [
  { influence: 'high', interest: 'high', title: 'Manage closely', hint: 'High influence · High interest', cls: 'bg-teal-50 border-teal-200' },
  { influence: 'high', interest: 'low', title: 'Keep satisfied', hint: 'High influence · Low interest', cls: 'bg-amber-50 border-amber-200' },
  { influence: 'low', interest: 'high', title: 'Keep informed', hint: 'Low influence · High interest', cls: 'bg-sky-50 border-sky-200' },
  { influence: 'low', interest: 'low', title: 'Monitor', hint: 'Low influence · Low interest', cls: 'bg-slate-50 border-slate-200' },
]

const norm = v => (v === 'high' || v === 'low' ? v : 'medium')
const quadOf = p => (norm(p.influence) === 'high' ? 0 : 2) + (norm(p.interest) === 'high' ? 0 : 1)
// Medium influence/interest lands in the nearest quadrant by the rule above
// (medium counts as low for placement, but the person's real level is kept).

function PersonForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [group, setGroup] = useState(initial?.group || '')
  const [influence, setInfluence] = useState(initial?.influence || 'medium')
  const [interest, setInterest] = useState(initial?.interest || 'medium')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) { setError('Give this person a name.'); return }
    onSubmit({
      id: initial?.id || uid(),
      name: name.trim(),
      group: group.trim(),
      influence, interest,
      notes: notes.trim(),
    })
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dana Reyes" className={inputCls} />
        </Field>
        <Field label="Group / role">
          <input value={group} onChange={e => setGroup(e.target.value)} placeholder="e.g. Frontline staff" className={inputCls} />
        </Field>
        <Field label="Influence">
          <select value={influence} onChange={e => setInfluence(e.target.value)} className={inputCls}>
            {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </Field>
        <Field label="Interest">
          <select value={interest} onChange={e => setInterest(e.target.value)} className={inputCls}>
            {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="What do they need? What worries them?" className={inputCls} />
      </Field>
      <div className="flex gap-2">
        <button onClick={submit} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition">
          {initial ? 'Save' : 'Add person'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:border-slate-400 transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function StakeholderEditor({ content, onChange }) {
  const items = content?.items || []
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const setItems = (next) => onChange({ ...(content || {}), items: next })

  const addPerson = (p) => { setItems([...items, p]); setAdding(false) }
  const savePerson = (p) => { setItems(items.map(i => (i.id === p.id ? p : i))); setEditingId(null) }
  const removePerson = (id) => { setItems(items.filter(i => i.id !== id)); setEditingId(null) }

  const editing = editingId ? items.find(i => i.id === editingId) : null

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          !adding && (
            <button onClick={() => setAdding(true)} className="text-xs font-medium text-teal-700 hover:text-teal-800">
              + Add person
            </button>
          )
        }
      >
        Stakeholders ({items.length})
      </SectionTitle>

      {adding && <PersonForm onSubmit={addPerson} onCancel={() => setAdding(false)} />}

      {/* 2x2 influence × interest grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {QUADRANTS.map((q, qi) => {
          const people = items.filter(p => quadOf(p) === qi)
          return (
            <div key={q.title} className={`rounded-xl border p-3 min-h-[140px] ${q.cls}`}>
              <div className="text-xs font-semibold text-slate-700">{q.title}</div>
              <div className="text-[10px] text-slate-500 mb-2">{q.hint}</div>
              <div className="flex flex-wrap gap-1.5">
                {people.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setEditingId(p.id)}
                    className="text-left px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-teal-400 transition max-w-full"
                    title={p.notes || p.name}
                  >
                    <div className="text-xs font-medium text-slate-900 truncate">{p.name}</div>
                    {p.group && <div className="text-[10px] text-slate-500 truncate">{p.group}</div>}
                  </button>
                ))}
                {people.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">No one here yet</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">Editing {editing.name}</div>
          <PersonForm
            initial={editing}
            onSubmit={savePerson}
            onCancel={() => setEditingId(null)}
          />
          <div className="mt-2">
            <ConfirmButton onConfirm={() => removePerson(editing.id)} label="Remove this person" />
          </div>
        </div>
      )}

      {!adding && !editing && items.length > 0 && (
        <p className="text-[11px] text-slate-400">Tip: click a person on the grid to edit or remove them.</p>
      )}
    </div>
  )
}
