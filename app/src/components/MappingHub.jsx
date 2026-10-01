// MappingHub: the home for change-management maps. Practitioners either
// link a live board (Miro/Mural/Lucid…), upload a snapshot (image/PDF), or
// create a simple native map in ChangeFlow — for four types: stakeholder,
// journey, process, impact. No canvas rebuild, no drag-and-drop.
import { useState, useEffect } from 'react'
import {
  getMaps, createMap, updateMap, deleteMap, getDocumentUrl, MAX_FILE_BYTES,
} from '../lib/data.js'
import { MODALITIES, modalityById } from '../lib/modalities.js'
import StakeholderEditor from './maps/StakeholderEditor.jsx'
import JourneyEditor from './maps/JourneyEditor.jsx'
import ProcessEditor from './maps/ProcessEditor.jsx'
import ImpactEditor from './maps/ImpactEditor.jsx'
import { inputCls, btnPrimary, ConfirmButton } from './maps/shared.jsx'

const TYPE_META = {
  stakeholder: { label: 'Stakeholder', desc: 'Influence × interest grid — who needs what attention', badge: 'bg-teal-100 text-teal-700 border-teal-200' },
  journey: { label: 'Journey', desc: 'What people experience before, during, after', badge: 'bg-sky-100 text-sky-700 border-sky-200' },
  process: { label: 'Process', desc: 'Current-state vs future-state workflows', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  impact: { label: 'Impact', desc: 'Which groups are touched by which changes', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
}

const SOURCE_META = {
  link: { label: 'Live board', desc: 'Link out to Miro, Mural, Lucid, FigJam…' },
  upload: { label: 'Upload snapshot', desc: 'PNG, JPG, or PDF export of the map' },
  native: { label: 'Create in ChangeFlow', desc: 'A simple structured map, built here' },
}

const fmtDateTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

const phaseLabel = (modality) => (modality ? modalityById(modality)?.label : null)

// --- New map chooser: pick type → pick source → details -----------------------
function NewMapChooser({ campaignId, live, onCreate, onCancel }) {
  const [mapType, setMapType] = useState(null)
  const [source, setSource] = useState(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [modality, setModality] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit =
    title.trim() &&
    (source !== 'link' || url.trim()) &&
    (source !== 'upload' || file)

  const submit = async () => {
    setError('')
    let finalUrl = (url || '').trim()
    if (source === 'link' && finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`
    }
    setSaving(true)
    try {
      const map = await createMap({
        campaignId, title, mapType, source,
        url: finalUrl, file,
        modality: modality || null,
        description, content: {},
      })
      onCreate(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">New map</h3>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
      </div>

      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">1 · What kind of map?</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
        {Object.entries(TYPE_META).map(([id, m]) => (
          <button
            key={id}
            onClick={() => setMapType(id)}
            className={`text-left p-3 rounded-xl border transition ${mapType === id ? 'border-teal-500 ring-1 ring-teal-500 bg-teal-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
          >
            <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${m.badge}`}>{m.label}</span>
            <p className="text-[11px] text-slate-500 mt-1.5">{m.desc}</p>
          </button>
        ))}
      </div>

      {mapType && (
        <>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">2 · Where does it live?</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
            {Object.entries(SOURCE_META).map(([id, m]) => {
              const disabled = id === 'upload' && !live
              return (
                <button
                  key={id}
                  disabled={disabled}
                  onClick={() => setSource(id)}
                  title={disabled ? 'Upload needs the live database' : m.desc}
                  className={`text-left p-3 rounded-xl border transition ${source === id ? 'border-teal-500 ring-1 ring-teal-500 bg-teal-50/50' : 'border-slate-200 bg-white'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-300'}`}
                >
                  <div className="text-xs font-semibold text-slate-800">{m.label}</div>
                  <p className="text-[11px] text-slate-500 mt-1">{disabled ? 'Needs the live database' : m.desc}</p>
                </button>
              )
            })}
          </div>
        </>
      )}

      {mapType && source && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">3 · Details</div>
          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <label className="block">
            <span className="block text-[11px] font-medium text-slate-500 mb-1">Title</span>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`e.g. ${TYPE_META[mapType].label} map — Wave 1`} className={inputCls} />
          </label>
          {source === 'link' && (
            <label className="block">
              <span className="block text-[11px] font-medium text-slate-500 mb-1">Board URL</span>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://miro.com/app/board/…" className={inputCls} />
            </label>
          )}
          {source === 'upload' && (
            <label className="block">
              <span className="block text-[11px] font-medium text-slate-500 mb-1">Snapshot file (PNG, JPG, or PDF — max {MAX_FILE_BYTES / 1024 / 1024} MB)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:text-xs file:font-medium file:rounded-lg file:border-0 file:bg-teal-600 file:text-white hover:file:bg-teal-700"
              />
            </label>
          )}
          <label className="block">
            <span className="block text-[11px] font-medium text-slate-500 mb-1">Phase (optional)</span>
            <select value={modality} onChange={e => setModality(e.target.value)} className={inputCls}>
              <option value="">No phase</option>
              {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] font-medium text-slate-500 mb-1">Description (optional)</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What is this map for?" className={inputCls} />
          </label>
          <div>
            <button onClick={submit} disabled={!canSubmit || saving} className={btnPrimary}>
              {saving ? 'Creating…' : 'Create map'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Map detail view -----------------------------------------------------------
function MapDetail({ map, campaignId, onBack, onSaved, onDeleted }) {
  const [title, setTitle] = useState(map.title)
  const [description, setDescription] = useState(map.description || '')
  const [modality, setModality] = useState(map.modality || '')
  const [urlDraft, setUrlDraft] = useState(map.url || '')
  const [content, setContent] = useState(map.content || {})
  const [signedUrl, setSignedUrl] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const dirty =
    title !== map.title ||
    (description || '') !== (map.description || '') ||
    (modality || '') !== (map.modality || '') ||
    (urlDraft || '') !== (map.url || '') ||
    JSON.stringify(content || {}) !== JSON.stringify(map.content || {})

  useEffect(() => {
    let cancelled = false
    if (map.source === 'upload' && map.file_path) {
      getDocumentUrl(map.file_path).then(u => { if (!cancelled) setSignedUrl(u) })
    }
    return () => { cancelled = true }
  }, [map.id, map.file_path, map.source])

  const save = async () => {
    setError('')
    setSaving(true)
    try {
      const updated = await updateMap({
        campaignId, id: map.id,
        patch: {
          title,
          description,
          modality: modality || null,
          url: map.source === 'link' ? urlDraft.trim() || null : map.url,
          content,
        },
      })
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setError('')
    try {
      await deleteMap({ campaignId, id: map.id, filePath: map.file_path })
      onDeleted(map.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const typeMeta = TYPE_META[map.map_type] || TYPE_META.stakeholder
  const isImage = (map.mime_type || '').startsWith('image/')

  return (
    <div className="space-y-4 max-w-5xl">
      <button onClick={onBack} className="text-xs text-slate-500 hover:text-teal-700">← All maps</button>

      {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeMeta.badge}`}>{typeMeta.label}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {SOURCE_META[map.source]?.label || map.source}
          </span>
          {phaseLabel(map.modality) && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {phaseLabel(map.modality)} phase
            </span>
          )}
          <span className="text-[11px] text-slate-400 ml-auto">Updated {fmtDateTime(map.updated_at)}</span>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full text-lg font-semibold text-slate-900 bg-transparent border border-transparent hover:border-slate-200 focus:border-teal-500 rounded-lg px-2 py-1 outline-none"
        />

        <label className="block max-w-xs">
          <span className="block text-[11px] font-medium text-slate-500 mb-1">Phase</span>
          <select value={modality} onChange={e => setModality(e.target.value)} className={inputCls}>
            <option value="">No phase</option>
            {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] font-medium text-slate-500 mb-1">Description</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What is this map for?" className={inputCls} />
        </label>

        {map.source === 'link' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block">
              <span className="block text-[11px] font-medium text-slate-500 mb-1">Board URL</span>
              <input value={urlDraft} onChange={e => setUrlDraft(e.target.value)} placeholder="https://miro.com/app/board/…" className={inputCls} />
            </label>
            {map.url && (
              <a
                href={map.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
              >
                Open board ↗
              </a>
            )}
          </div>
        )}

        {map.source === 'upload' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            {isImage && signedUrl ? (
              <img src={signedUrl} alt={map.title} className="max-h-[480px] rounded-lg border border-slate-200 mx-auto" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-600">
                  {map.file_name} {map.file_size ? `· ${(map.file_size / 1024).toFixed(0)} KB` : ''}
                </div>
                {signedUrl && (
                  <a href={signedUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-700 hover:text-teal-800">
                    Download / view
                  </a>
                )}
              </div>
            )}
            {!signedUrl && <p className="text-[11px] text-slate-400 mt-2">Preparing preview…</p>}
          </div>
        )}

        {map.source === 'native' && (
          <div className="border-t border-slate-100 pt-4">
            {map.map_type === 'stakeholder' && <StakeholderEditor content={content} onChange={setContent} />}
            {map.map_type === 'journey' && <JourneyEditor content={content} onChange={setContent} />}
            {map.map_type === 'process' && <ProcessEditor content={content} onChange={setContent} />}
            {map.map_type === 'impact' && <ImpactEditor content={content} onChange={setContent} />}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={!dirty || saving || !title.trim()} className={btnPrimary}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {dirty && <span className="text-[11px] text-amber-600">Unsaved changes</span>}
          <span className="ml-auto">
            <ConfirmButton onConfirm={remove} label="Delete map" />
          </span>
        </div>
      </div>
    </div>
  )
}

// --- Library view --------------------------------------------------------------
export default function MappingHub({ campaignId, live }) {
  const [maps, setMaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('library') // library | chooser | detail
  const [selectedId, setSelectedId] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    getMaps(campaignId).then(({ items }) => {
      setMaps(items)
      setLoading(false)
    })
  }, [campaignId])

  const selected = maps.find(m => m.id === selectedId) || null

  const filtered = maps.filter(m =>
    (typeFilter === 'all' || m.map_type === typeFilter) &&
    (phaseFilter === 'all' || (m.modality || 'none') === phaseFilter)
  )

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Mapping</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every map in one place — link a live board, upload a snapshot, or build it here.
            {!live && <span className="text-amber-600"> Uploads need the live database.</span>}
          </p>
        </div>
        {view === 'library' && (
          <button onClick={() => setView('chooser')} className={btnPrimary}>+ New map</button>
        )}
      </div>

      {view === 'chooser' && (
        <NewMapChooser
          campaignId={campaignId}
          live={live}
          onCancel={() => setView('library')}
          onCreate={(map) => {
            setMaps(prev => [map, ...prev])
            setSelectedId(map.id)
            setView('detail')
          }}
        />
      )}

      {view === 'detail' && selected && (
        <MapDetail
          map={selected}
          campaignId={campaignId}
          onBack={() => setView('library')}
          onSaved={(updated) => setMaps(prev => prev.map(m => (m.id === updated.id ? updated : m)))}
          onDeleted={(id) => {
            setMaps(prev => prev.filter(m => m.id !== id))
            setView('library')
          }}
        />
      )}

      {view === 'library' && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {['all', 'stakeholder', 'journey', 'process', 'impact'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${typeFilter === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {t === 'all' ? 'All' : TYPE_META[t].label}
              </button>
            ))}
            <select
              value={phaseFilter}
              onChange={e => setPhaseFilter(e.target.value)}
              className="ml-2 text-xs rounded-full px-3 py-1.5 border border-slate-200 bg-white text-slate-600 outline-none"
            >
              <option value="all">All phases</option>
              {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              <option value="none">No phase</option>
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading maps…</p>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
              <p className="text-sm text-slate-600 font-medium">No maps yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Link a Miro or Mural board, upload a snapshot, or build a map right here.
              </p>
              <button onClick={() => setView('chooser')} className={btnPrimary}>+ New map</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(m => {
                const tm = TYPE_META[m.map_type] || TYPE_META.stakeholder
                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedId(m.id); setView('detail') }}
                    className="text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-teal-400 hover:shadow transition"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tm.badge}`}>{tm.label}</span>
                      <span className="text-[10px] text-slate-400">{SOURCE_META[m.source]?.label || m.source}</span>
                      {phaseLabel(m.modality) && (
                        <span className="text-[10px] text-teal-700 ml-auto">{phaseLabel(m.modality)}</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">{m.title}</div>
                    {m.description && <div className="text-[11px] text-slate-500 truncate mt-0.5">{m.description}</div>}
                    <div className="text-[10px] text-slate-400 mt-2">Updated {fmtDateTime(m.updated_at)}</div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
