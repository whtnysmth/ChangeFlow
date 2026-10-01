// Process map editor: two side-by-side columns — Current state and Future
// state — each an ordered list of steps (step, owner, notes) with add,
// remove, and up/down reordering. No drag-and-drop.
import { useState } from 'react'
import { inputCls, SectionTitle, ConfirmButton, uid } from './shared.jsx'

function StepColumn({ title, accent, steps, onSteps }) {
  const [draft, setDraft] = useState('')
  const [draftOwner, setDraftOwner] = useState('')

  const addStep = () => {
    if (!draft.trim()) return
    onSteps([...steps, { id: uid(), step: draft.trim(), owner: draftOwner.trim(), notes: '' }])
    setDraft('')
    setDraftOwner('')
  }

  const patch = (id, p) => onSteps(steps.map(s => (s.id === id ? { ...s, ...p } : s)))

  const move = (id, dir) => {
    const i = steps.findIndex(s => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[i], next[j]] = [next[j], next[i]]
    onSteps(next)
  }

  return (
    <div className={`flex-1 min-w-0 rounded-xl border p-3 ${accent}`}>
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">{title}</div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.id} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  value={s.step}
                  onChange={e => patch(s.id, { step: e.target.value })}
                  placeholder="Step description"
                  className="w-full px-2 py-1 text-xs font-medium rounded-lg border border-transparent hover:border-slate-200 focus:border-[#0085ff] outline-none text-slate-900"
                />
                <div className="flex gap-1.5">
                  <input
                    value={s.owner || ''}
                    onChange={e => patch(s.id, { owner: e.target.value })}
                    placeholder="Owner"
                    className={`${inputCls} !py-1`}
                  />
                  <input
                    value={s.notes || ''}
                    onChange={e => patch(s.id, { notes: e.target.value })}
                    placeholder="Notes"
                    className={`${inputCls} !py-1`}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <button onClick={() => move(s.id, -1)} disabled={i === 0} className="text-slate-400 hover:text-[#0060c9] disabled:opacity-25 text-xs px-1" title="Move up">↑</button>
                <button onClick={() => move(s.id, 1)} disabled={i === steps.length - 1} className="text-slate-400 hover:text-[#0060c9] disabled:opacity-25 text-xs px-1" title="Move down">↓</button>
                <ConfirmButton onConfirm={() => onSteps(steps.filter(x => x.id !== s.id))} label="×" className="text-sm px-1" />
              </div>
            </div>
          </li>
        ))}
      </ol>
      {steps.length === 0 && (
        <p className="text-[11px] text-slate-400 italic mb-2">No steps yet — add the first below.</p>
      )}
      <div className="mt-2 space-y-1.5">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addStep() }}
          placeholder="+ Add a step — press Enter"
          className={inputCls}
        />
        <input
          value={draftOwner}
          onChange={e => setDraftOwner(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addStep() }}
          placeholder="Owner (optional)"
          className={inputCls}
        />
      </div>
    </div>
  )
}

export default function ProcessEditor({ content, onChange }) {
  const current = content?.current || []
  const future = content?.future || []

  return (
    <div className="space-y-4">
      <SectionTitle>Process steps</SectionTitle>
      <div className="flex flex-col lg:flex-row gap-3">
        <StepColumn
          title="Current state"
          accent="bg-slate-50 border-slate-200"
          steps={current}
          onSteps={next => onChange({ ...(content || {}), current: next })}
        />
        <div className="hidden lg:flex items-center">
          <span className="text-[#0073ea] text-xl font-bold">→</span>
        </div>
        <StepColumn
          title="Future state"
          accent="bg-[#e8f1fd]/60 border-[#a9ccf7]"
          steps={future}
          onSteps={next => onChange({ ...(content || {}), future: next })}
        />
      </div>
    </div>
  )
}
