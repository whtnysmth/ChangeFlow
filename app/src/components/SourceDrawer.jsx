// Source drill-down (Assess pilot): a slide-over panel that shows where a
// widget's numbers come from and lets the user edit them in-app.
// Stakeholder engagement -> the stakeholder group rows.
// Readiness score -> the overall score plus its breakdown dimensions.
import { useState, Fragment } from 'react'

function Shell({ title, explainer, onClose, onSave, saving, error, children }) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{explainer}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {children}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          {error && <p className="mr-auto text-sm text-rose-600">{error}</p>}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#0073ea] rounded-lg hover:bg-[#0060c9] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0073ea]/40 focus:border-[#0073ea]'

function EditableTable({ columns, rows, setRows, addLabel }) {
  const update = (i, key, val) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, [key]: val } : r)))
  const remove = (i) => setRows(rs => rs.filter((_, j) => j !== i))
  const add = () =>
    setRows(rs => [
      ...rs,
      { id: `local-${Date.now()}-${rs.length}`, ...Object.fromEntries(columns.map(c => [c.key, c.type === 'number' ? 0 : ''])) }
    ])

  return (
    <div>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              {columns.map(c => (
                <th key={c.key} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {c.label}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i} className="border-t border-slate-100">
                {columns.map(c => (
                  <td key={c.key} className="px-3 py-2">
                    <input
                      type={c.type === 'number' ? 'number' : 'text'}
                      value={r[c.key] ?? ''}
                      min={c.min}
                      max={c.max}
                      placeholder={c.placeholder}
                      onChange={e => update(i, c.key, e.target.value)}
                      className={inputCls}
                    />
                  </td>
                ))}
                <td className="pr-2">
                  <button
                    onClick={() => remove(i)}
                    className="w-7 h-7 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Remove row"
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t border-slate-100">
                <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-sm text-slate-400">
                  No rows yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={add}
        className="mt-2 text-sm font-medium text-[#0060c9] hover:underline"
      >
        + {addLabel}
      </button>
    </div>
  )
}

// One readiness dimension: label + score row, expandable to reveal (and
// edit) what the dimension measures and how to score it. This is how an
// end user learns what information determines the number.
function DimensionEditor({ rows, setRows }) {
  const [openId, setOpenId] = useState(null)
  const update = (i, key, val) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, [key]: val } : r)))
  const remove = (i) => setRows(rs => rs.filter((_, j) => j !== i))
  const add = () =>
    setRows(rs => [...rs, { id: `dim-${Date.now()}`, label: '', value: 0, description: '', guidance: '' }])

  return (
    <div>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dimension</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">Score %</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const open = openId === (r.id || i)
              return (
                <Fragment key={r.id || i}>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={r.label || ''}
                        placeholder="e.g. Sponsor alignment"
                        onChange={e => update(i, 'label', e.target.value)}
                        className={inputCls}
                      />
                      {(r.description || r.guidance) && !open && (
                        <p className="mt-1 text-xs text-slate-500 leading-snug line-clamp-1">{r.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={r.value ?? ''}
                        onChange={e => update(i, 'value', e.target.value)}
                        className={inputCls}
                      />
                    </td>
                    <td className="pr-2 whitespace-nowrap">
                      <button
                        onClick={() => setOpenId(open ? null : (r.id || i))}
                        className={`w-7 h-7 rounded-full text-xs font-medium ${open ? 'bg-[#e8f1fd] text-[#0060c9]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        title={open ? 'Hide scoring help' : 'What is this? How do I score it?'}
                        aria-label="Toggle scoring help"
                      >
                        ?
                      </button>
                      <button
                        onClick={() => remove(i)}
                        className="w-7 h-7 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Remove dimension"
                        aria-label="Remove dimension"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-t border-slate-100 bg-slate-50/60">
                      <td colSpan={3} className="px-3 py-3 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                            What this measures
                          </label>
                          <textarea
                            value={r.description || ''}
                            placeholder="One line: what does this dimension tell us?"
                            onChange={e => update(i, 'description', e.target.value)}
                            rows={2}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                            How to score it
                          </label>
                          <textarea
                            value={r.guidance || ''}
                            placeholder="What information should the score be based on? What does high vs low look like?"
                            onChange={e => update(i, 'guidance', e.target.value)}
                            rows={3}
                            className={inputCls}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {rows.length === 0 && (
              <tr className="border-t border-slate-100">
                <td colSpan={3} className="px-3 py-6 text-center text-sm text-slate-400">
                  No dimensions yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={add}
        className="mt-2 text-sm font-medium text-[#0060c9] hover:underline"
      >
        + Add dimension
      </button>
    </div>
  )
}

function StakeholderEditor({ data, onSave, onClose }) {
  const [rows, setRows] = useState(() =>
    (data.stakeholderGroups || []).map((g, i) => ({
      id: g.id || `local-${Date.now()}-${i}`,
      group: g.group || '',
      percent: g.percent ?? 0,
      engaged: g.engaged ?? 0
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave('stakeholder_engagement', rows)
      onClose()
    } catch (e) {
      setError(e.message || 'Could not save. Your edits are kept in this panel.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell
      title="Stakeholder engagement — source data"
      explainer="Each row is a stakeholder group saved for this campaign. The bars in the widget are drawn directly from these rows, and the Assess health ring uses the average engagement across all groups."
      onClose={onClose}
      onSave={save}
      saving={saving}
      error={error}
    >
      <EditableTable
        columns={[
          { key: 'group', label: 'Group', type: 'text', placeholder: 'e.g. Frontline staff' },
          { key: 'percent', label: 'Engagement %', type: 'number', min: 0, max: 100 },
          { key: 'engaged', label: 'Engaged', type: 'number', min: 0 }
        ]}
        rows={rows}
        setRows={setRows}
        addLabel="Add group"
      />
    </Shell>
  )
}

function ReadinessEditor({ data, onSave, onClose }) {
  const current = data.readinessScore || { value: 0, note: '', dimensions: [] }
  const [value, setValue] = useState(current.value ?? 0)
  const [note, setNote] = useState(current.note || '')
  const [rows, setRows] = useState(() =>
    (current.dimensions || []).map((d, i) => ({
      id: `dim-${i}`,
      label: d.label || '',
      value: d.value ?? 0,
      description: d.description || '',
      guidance: d.guidance || ''
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const setToAverage = () => {
    if (!rows.length) return
    const avg = Math.round(rows.reduce((a, r) => a + (Number(r.value) || 0), 0) / rows.length)
    setValue(avg)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave('readiness_score', { value, note, dimensions: rows })
      onClose()
    } catch (e) {
      setError(e.message || 'Could not save. Your edits are kept in this panel.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell
      title="Readiness score — source data"
      explainer="The score is stored with this campaign's metrics. The dimensions below break down what feeds the number — editing them doesn't move the score on its own. Use “Set to average” if you want the score to match the dimensions' average."
      onClose={onClose}
      onSave={save}
      saving={saving}
      error={error}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Readiness score %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={e => setValue(e.target.value)}
            className={inputCls}
          />
          <button onClick={setToAverage} className="mt-1.5 text-xs font-medium text-[#0060c9] hover:underline">
            Set to average of dimensions
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Note
          </label>
          <input
            type="text"
            value={note}
            placeholder="e.g. Assessed Oct 1, pre-launch"
            onChange={e => setNote(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Dimensions
        </div>
        <DimensionEditor rows={rows} setRows={setRows} />
      </div>
    </Shell>
  )
}

export function AssessSourceDrawer({ widgetId, data, onClose, onSave }) {
  if (widgetId === 'stakeholder_engagement') {
    return <StakeholderEditor data={data} onSave={onSave} onClose={onClose} />
  }
  if (widgetId === 'readiness_score') {
    return <ReadinessEditor data={data} onSave={onSave} onClose={onClose} />
  }
  return null
}
