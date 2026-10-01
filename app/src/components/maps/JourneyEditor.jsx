// Journey map editor: horizontal stage cards (default Before / During /
// After), each with "What's happening", "Pain points", and "Opportunities".
// Stages can be added, renamed, and removed. No drag-and-drop.
import { useState } from 'react'
import { inputCls, SectionTitle, Field, ConfirmButton, uid } from './shared.jsx'

const DEFAULT_STAGES = () => ([
  { id: uid(), name: 'Before', happening: '', pains: '', opportunities: '' },
  { id: uid(), name: 'During', happening: '', pains: '', opportunities: '' },
  { id: uid(), name: 'After', happening: '', pains: '', opportunities: '' },
])

export default function JourneyEditor({ content, onChange }) {
  const stages = content?.stages?.length ? content.stages : DEFAULT_STAGES()
  const [newName, setNewName] = useState('')

  const setStages = (next) => onChange({ ...(content || {}), stages: next })

  const patchStage = (id, patch) =>
    setStages(stages.map(s => (s.id === id ? { ...s, ...patch } : s)))

  const addStage = () => {
    if (!newName.trim()) return
    setStages([...stages, { id: uid(), name: newName.trim(), happening: '', pains: '', opportunities: '' }])
    setNewName('')
  }

  const moveStage = (id, dir) => {
    const i = stages.findIndex(s => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= stages.length) return
    const next = [...stages]
    ;[next[i], next[j]] = [next[j], next[i]]
    setStages(next)
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Journey stages ({stages.length})</SectionTitle>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((s, i) => (
          <div key={s.id} className="shrink-0 w-72 bg-white border border-slate-200 rounded-xl shadow-sm p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={s.name}
                onChange={e => patchStage(s.id, { name: e.target.value })}
                className="flex-1 px-2 py-1 text-sm font-semibold rounded-lg border border-transparent hover:border-slate-200 focus:border-[#0085ff] outline-none text-slate-900"
                placeholder="Stage name"
              />
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => moveStage(s.id, -1)}
                  disabled={i === 0}
                  className="px-1.5 py-0.5 text-slate-400 hover:text-[#0060c9] disabled:opacity-25 text-sm"
                  title="Move left"
                >←</button>
                <button
                  onClick={() => moveStage(s.id, 1)}
                  disabled={i === stages.length - 1}
                  className="px-1.5 py-0.5 text-slate-400 hover:text-[#0060c9] disabled:opacity-25 text-sm"
                  title="Move right"
                >→</button>
                <ConfirmButton
                  onConfirm={() => setStages(stages.filter(x => x.id !== s.id))}
                  label="×"
                  className="text-sm px-1"
                />
              </div>
            </div>
            <Field label="What's happening">
              <textarea
                value={s.happening || ''}
                onChange={e => patchStage(s.id, { happening: e.target.value })}
                rows={2}
                placeholder="What people experience in this stage…"
                className={inputCls}
              />
            </Field>
            <Field label="Pain points">
              <textarea
                value={s.pains || ''}
                onChange={e => patchStage(s.id, { pains: e.target.value })}
                rows={2}
                placeholder="Frictions, worries, blockers…"
                className={`${inputCls} border-rose-200 focus:border-rose-400`}
              />
            </Field>
            <Field label="Opportunities">
              <textarea
                value={s.opportunities || ''}
                onChange={e => patchStage(s.id, { opportunities: e.target.value })}
                rows={2}
                placeholder="Moments to support, delight, or win…"
                className={`${inputCls} border-[#9ae6b8] focus:border-[#33d17a]`}
              />
            </Field>
          </div>
        ))}

        <div className="shrink-0 w-48 flex items-start justify-center pt-8">
          <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 space-y-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addStage() }}
              placeholder="New stage name"
              className={inputCls}
            />
            <button
              onClick={addStage}
              disabled={!newName.trim()}
              className="w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0073ea] text-white hover:bg-[#0060c9] transition disabled:opacity-40"
            >
              + Add stage
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
