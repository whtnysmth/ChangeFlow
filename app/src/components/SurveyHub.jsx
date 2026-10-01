// SurveyHub: top-level hub for surveys. Two capabilities, no native builder:
//  1) link live surveys from external tools (Google Forms, MS Forms, ...)
//  2) import responses via CSV with a simple per-question results view.
// Supabase first, localStorage fallback — same discipline as the rest of the app.
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  getSurveys, createSurvey, updateSurvey, deleteSurvey,
  getSurveyResponses, importSurveyResponses, replaceSurveyResponses,
  parseCSV, SURVEY_TOOL_LABELS,
} from '../lib/data.js'
import { MODALITIES, modalityById } from '../lib/modalities.js'

const inputCls =
  'px-2 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-[#0085ff] w-full'
const btnPrimary =
  'px-4 py-2 text-sm font-medium rounded-lg bg-[#0073ea] text-white hover:bg-[#0060c9] transition disabled:opacity-40 disabled:cursor-not-allowed'
const btnGhost =
  'px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:border-[#0085ff] hover:text-[#0060c9] transition'

const MAX_CSV_BYTES = 5 * 1024 * 1024

function uid() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function phaseLabel(modality) {
  return modality ? (modalityById(modality)?.label || modality) : null
}

// Inline confirm: first click arms, second click fires.
function ConfirmButton({ onConfirm, label = 'Delete', className = '' }) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button
        onClick={() => setArmed(true)}
        onBlur={() => setArmed(false)}
        className={`text-[11px] text-slate-400 hover:text-rose-600 transition ${className}`}
      >
        {label}
      </button>
    )
  }
  return (
    <button
      onClick={onConfirm}
      className={`text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition ${className}`}
    >
      Confirm {label.toLowerCase()}?
    </button>
  )
}

function SourceBadge({ survey }) {
  if (survey.source === 'link') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f3edff] text-[#6e2fd6] border border-[#cdb0ff]">
        Live link
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e8f1fd] text-[#0060c9] border border-[#a9ccf7]">
        CSV import
      </span>
  )
}

function withScheme(url) {
  const u = (url || '').trim()
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

// --- Results ---------------------------------------------------------------

function isNumericColumn(values) {
  const nonEmpty = values.filter(v => v !== '')
  if (!nonEmpty.length) return false
  return nonEmpty.every(v => Number.isFinite(Number(v)))
}

function QuestionCard({ header, values }) {
  const [expanded, setExpanded] = useState(false)
  const nonEmpty = values.filter(v => v !== '')
  const numeric = isNumericColumn(values)

  let summary
  if (numeric) {
    const nums = nonEmpty.map(Number)
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    summary = (
      <div className="flex flex-wrap gap-4 text-xs">
        <span><span className="text-slate-400">Avg</span> <span className="font-semibold text-slate-900">{avg.toFixed(1)}</span></span>
        <span><span className="text-slate-400">Min</span> <span className="font-semibold text-slate-900">{Math.min(...nums)}</span></span>
        <span><span className="text-slate-400">Max</span> <span className="font-semibold text-slate-900">{Math.max(...nums)}</span></span>
        <span><span className="text-slate-400">n</span> <span className="font-semibold text-slate-900">{nums.length}</span></span>
      </div>
    )
  } else {
    const shown = expanded ? nonEmpty : nonEmpty.slice(0, 50)
    summary = (
      <div>
        <div className="text-xs text-slate-500 mb-2">{nonEmpty.length} response{nonEmpty.length === 1 ? '' : 's'}</div>
        {nonEmpty.length === 0 ? (
          <div className="text-xs text-slate-400 italic">No answers yet.</div>
        ) : (
          <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {shown.map((v, i) => (
              <li key={i} className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">{v}</li>
            ))}
          </ul>
        )}
        {nonEmpty.length > 50 && (
          <button onClick={() => setExpanded(v => !v)} className="mt-2 text-[11px] text-[#0060c9] hover:text-[#0053a6] font-medium">
            {expanded ? 'Show less' : `Show all ${nonEmpty.length}`}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-900">{header}</h4>
        {numeric && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">numeric</span>
        )}
      </div>
      {summary}
    </div>
  )
}

function ResultsView({ responses }) {
  const [showRaw, setShowRaw] = useState(false)
  const headers = useMemo(() => {
    const set = []
    for (const r of responses) {
      for (const k of Object.keys(r.answers || {})) {
        if (!set.includes(k)) set.push(k)
      }
    }
    return set
  }, [responses])

  if (!responses.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 text-center">
        <p className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg py-4">
          No responses yet — import a CSV to see results here.
        </p>
      </div>
    )
  }

  const rawRows = responses.slice(0, 100)

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        <span className="text-2xl font-bold text-slate-900">{responses.length}</span>{' '}
        response{responses.length === 1 ? '' : 's'}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {headers.map(h => (
          <QuestionCard
            key={h}
            header={h}
            values={responses.map(r => (r.answers || {})[h] ?? '')}
          />
        ))}
      </div>
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
        <button
          onClick={() => setShowRaw(v => !v)}
          className="text-xs font-semibold text-slate-700 hover:text-[#0060c9] transition"
        >
          {showRaw ? '▾ Hide raw responses' : '▸ Show raw responses'}
        </button>
        {showRaw && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  {headers.map(h => (
                    <th key={h} className="text-left px-2 py-1.5 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.map((r, i) => (
                  <tr key={r.id || i} className="border-b border-slate-100 last:border-0">
                    {headers.map(h => (
                      <td key={h} className="px-2 py-1.5 text-slate-700 max-w-[220px] truncate" title={(r.answers || {})[h] || ''}>
                        {(r.answers || {})[h] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {responses.length > 100 && (
              <p className="mt-2 text-[11px] text-slate-400">Showing 100 of {responses.length} rows.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- CSV import ------------------------------------------------------------

function CsvImport({ survey, campaignId, live, onDone, onCancel, mode = 'initial' }) {
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState(null) // { headers, rows }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const pickFile = (f) => {
    setError('')
    setParsed(null)
    if (!f) return
    if (f.size > MAX_CSV_BYTES) {
      setError('That file is over the 5 MB import cap.')
      return
    }
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = parseCSV(String(reader.result || ''))
        if (!result.headers.length) {
          setError('Could not find any data in that file — is it a CSV with a header row?')
          return
        }
        setParsed(result)
      } catch (e) {
        setError(`Could not parse that file: ${e.message}`)
      }
    }
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(f)
  }

  const doImport = async (replace) => {
    if (!parsed || busy) return
    setBusy(true)
    setError('')
    try {
      const rows = parsed.rows.map(cells => ({
        answers: Object.fromEntries(parsed.headers.map((h, i) => [h, cells[i] || ''])),
      }))
      if (replace) {
        await replaceSurveyResponses({ campaignId, surveyId: survey.id, rows })
      } else {
        await importSurveyResponses({ campaignId, surveyId: survey.id, rows })
      }
      onDone()
    } catch (e) {
      setError(e.message || 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {mode === 'replace' ? 'Replace responses' : mode === 'append' ? 'Import more responses' : 'Import responses'}
        </h3>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>

      {mode === 'replace' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          This will delete the {survey.response_count || 0} existing response{(survey.response_count || 0) === 1 ? '' : 's'} and import the new file instead.
        </p>
      )}

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => pickFile(e.target.files?.[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 hover:border-[#4d97ec] rounded-xl px-4 py-6 text-center transition"
        >
          <div className="text-xs font-medium text-slate-700">{fileName || 'Choose a CSV file'}</div>
          <div className="text-[11px] text-slate-400 mt-1">First row should be the question headers · 5 MB max</div>
        </button>
      </div>

      {parsed && (
        <div>
          <div className="text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-900">{parsed.rows.length}</span> rows · {parsed.headers.length} questions detected
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {parsed.headers.map(h => (
                    <th key={h} className="text-left px-2 py-1.5 font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((cells, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    {parsed.headers.map((h, j) => (
                      <td key={j} className="px-2 py-1.5 text-slate-600 max-w-[180px] truncate" title={cells[j]}>
                        {cells[j] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Previewing first 5 rows. Imported answers are stamped with today's date.</p>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button onClick={() => doImport(mode === 'replace')} disabled={!parsed || busy} className={btnPrimary}>
          {busy ? 'Importing…' : mode === 'replace' ? 'Replace responses' : `Import ${parsed ? parsed.rows.length : ''} responses`.trim()}
        </button>
        {!live && (
          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            Offline — responses stay on this device
          </span>
        )}
      </div>
    </div>
  )
}

// --- Detail ----------------------------------------------------------------

function SurveyDetail({ survey, campaignId, live, onBack, onChanged, onDeleted }) {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(survey.title)
  const [description, setDescription] = useState(survey.description || '')
  const [modality, setModality] = useState(survey.modality || '')
  const [saving, setSaving] = useState(false)
  const [importMode, setImportMode] = useState(null) // null | 'append' | 'replace'
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      if (survey.source === 'csv') {
        const { items } = await getSurveyResponses({ campaignId, surveyId: survey.id })
        setResponses(items)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [survey.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveEdits = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateSurvey({
        campaignId, id: survey.id,
        patch: { title, description, modality: modality || null },
      })
      setEditing(false)
      onChanged(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    await deleteSurvey({ campaignId, id: survey.id })
    onDeleted()
  }

  const pl = phaseLabel(survey.modality)

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-slate-500 hover:text-[#0060c9] transition">← All surveys</button>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {editing ? (
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls + ' !text-sm font-semibold'} />
            ) : (
              <h2 className="text-lg font-bold text-slate-900">{survey.title}</h2>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <SourceBadge survey={survey} />
              {survey.source === 'link' && survey.tool && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {SURVEY_TOOL_LABELS[survey.tool] || survey.tool}
                </span>
              )}
              {pl && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e8f1fd] text-[#0060c9] border border-[#a9ccf7]">
                  {pl} phase
                </span>
              )}
              <span className="text-[11px] text-slate-400">Updated {fmtDateTime(survey.updated_at)}</span>
            </div>
            {editing ? (
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="What is this survey for?"
                className={inputCls + ' mt-3'}
              />
            ) : survey.description ? (
              <p className="text-xs text-slate-600 mt-2">{survey.description}</p>
            ) : null}
            {editing && (
              <select value={modality} onChange={e => setModality(e.target.value)} className={inputCls + ' mt-2 max-w-[220px]'}>
                <option value="">No phase tag</option>
                {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {editing ? (
              <>
                <button onClick={saveEdits} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(false)} className={btnGhost}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className={btnGhost}>Edit</button>
            )}
            <ConfirmButton onConfirm={remove} label="Delete" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      </div>

      {survey.source === 'link' ? (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            This survey lives in {SURVEY_TOOL_LABELS[survey.tool] || 'an external tool'}. Responses stay there — link it here so the team can find it.
          </div>
          {survey.url && (
            <a href={withScheme(survey.url)} target="_blank" rel="noreferrer" className={btnPrimary + ' no-underline'}>
              Open survey ↗
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button onClick={() => setImportMode(importMode === 'append' ? null : 'append')} className={btnGhost}>
              Import more responses
            </button>
            <ConfirmButton
              onConfirm={() => setImportMode('replace')}
              label="Replace responses"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:border-rose-400 hover:!text-rose-600 transition"
            />
          </div>
          {importMode && (
            <CsvImport
              survey={survey}
              campaignId={campaignId}
              live={live}
              mode={importMode}
              onCancel={() => setImportMode(null)}
              onDone={() => { setImportMode(null); load(); onChanged({ ...survey, response_count: survey.response_count }); }}
            />
          )}
          {loading ? (
            <p className="text-xs text-slate-400">Loading responses…</p>
          ) : (
            <ResultsView responses={responses} />
          )}
          {responses.length > 0 && (
            <p className="text-[11px] text-slate-400">Answers are stamped with their import date — CSV exports rarely carry timestamps.</p>
          )}
        </>
      )}
    </div>
  )
}

// --- Add forms ---------------------------------------------------------------

function AddLinkForm({ campaignId, onDone, onCancel }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [tool, setTool] = useState('google_forms')
  const [modality, setModality] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const survey = await createSurvey({
        campaignId, title, description, source: 'link',
        url: withScheme(url), tool, modality: modality || null,
      })
      onDone(survey)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-3 max-w-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Link a live survey</h3>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Readiness pulse — Wave 1" className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Survey URL</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Tool</label>
          <select value={tool} onChange={e => setTool(e.target.value)} className={inputCls}>
            <option value="google_forms">Google Forms</option>
            <option value="ms_forms">Microsoft Forms</option>
            <option value="surveymonkey">SurveyMonkey</option>
            <option value="typeform">Typeform</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Phase</label>
          <select value={modality} onChange={e => setModality(e.target.value)} className={inputCls}>
            <option value="">No phase tag</option>
            {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Description <span className="text-slate-300">(optional)</span></label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls} />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Add survey'}</button>
    </div>
  )
}

function AddCsvForm({ campaignId, live, onDone, onCancel }) {
  const [title, setTitle] = useState('')
  const [modality, setModality] = useState('')
  const [description, setDescription] = useState('')
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const survey = await createSurvey({
        campaignId, title, description, source: 'csv',
        url: null, tool: null, modality: modality || null,
      })
      setDraft(survey)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (draft) {
    return (
      <CsvImport
        survey={draft}
        campaignId={campaignId}
        live={live}
        mode="initial"
        onCancel={onCancel}
        onDone={() => onDone(draft)}
      />
    )
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-3 max-w-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">New CSV survey</h3>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
      <p className="text-xs text-slate-500">Name the survey first — you'll upload the response file next.</p>
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Adoption pulse — March" className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Phase</label>
        <select value={modality} onChange={e => setModality(e.target.value)} className={inputCls}>
          <option value="">No phase tag</option>
          {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">Description <span className="text-slate-300">(optional)</span></label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls} />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button onClick={create} disabled={busy} className={btnPrimary}>{busy ? 'Creating…' : 'Continue to upload'}</button>
    </div>
  )
}

// --- Hub ---------------------------------------------------------------------

export default function SurveyHub({ campaignId, live }) {
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('library') // library | add-link | add-csv | detail
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { items } = await getSurveys(campaignId)
      setSurveys(items)
    } catch (e) {
      setError(e.message || 'Could not load surveys.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setView('library')
    setActiveId(null)
    load()
  }, [campaignId]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = surveys.find(s => s.id === activeId) || null

  const filtered = surveys.filter(s => {
    if (phaseFilter !== 'all' && s.modality !== phaseFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!`${s.title} ${s.description || ''}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const openDetail = (survey) => {
    setActiveId(survey.id)
    setView('detail')
  }

  if (view === 'add-link') {
    return <AddLinkForm campaignId={campaignId} onCancel={() => setView('library')} onDone={(s) => { load(); openDetail(s) }} />
  }
  if (view === 'add-csv') {
    return <AddCsvForm campaignId={campaignId} live={live} onCancel={() => setView('library')} onDone={(s) => { load(); openDetail(s) }} />
  }
  if (view === 'detail' && active) {
    return (
      <SurveyDetail
        survey={active}
        campaignId={campaignId}
        live={live}
        onBack={() => { setView('library'); setActiveId(null) }}
        onChanged={(updated) => {
          setSurveys(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)))
          load()
        }}
        onDeleted={() => { setView('library'); setActiveId(null); load() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Surveys</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Link live surveys from your tools, or import response CSVs — {surveys.length} survey{surveys.length === 1 ? '' : 's'}
            {!live && <span className="text-amber-700"> · offline mode</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('add-link')} className={btnGhost}>+ Link survey</button>
          <button onClick={() => setView('add-csv')} className={btnPrimary}>+ Import CSV</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search surveys…"
          className={inputCls + ' !w-56'}
        />
        <div className="flex flex-wrap gap-1.5">
          {[{ id: 'all', label: 'All' }, ...MODALITIES.map(m => ({ id: m.id, label: m.label }))].map(f => (
            <button
              key={f.id}
              onClick={() => setPhaseFilter(f.id)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition ${
                phaseFilter === f.id
                  ? 'bg-[#0073ea] text-white border-[#0073ea]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-[#4d97ec]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-xs text-slate-400">Loading surveys…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No surveys yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Link a live survey from Google Forms, Microsoft Forms, SurveyMonkey, or Typeform —
            or import a response CSV from any of them to see results here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(s => {
            const pl = phaseLabel(s.modality)
            return (
              <button
                key={s.id}
                onClick={() => openDetail(s)}
                className="text-left bg-white border border-slate-200 shadow-sm rounded-xl p-4 hover:border-[#4d97ec] hover:shadow transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">{s.title}</h3>
                  <SourceBadge survey={s} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {s.source === 'link' && s.tool && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {SURVEY_TOOL_LABELS[s.tool] || s.tool}
                    </span>
                  )}
                  {pl && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e8f1fd] text-[#0060c9] border border-[#a9ccf7]">
                      {pl}
                    </span>
                  )}
                  {s.source === 'csv' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {s.response_count || 0} response{(s.response_count || 0) === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {s.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{s.description}</p>}
                <p className="text-[11px] text-slate-400 mt-2">Updated {fmtDateTime(s.updated_at)}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
