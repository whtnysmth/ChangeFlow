// DocumentLibrary: central document library aggregating every file in the app —
// library_documents (direct uploads) + phase_documents (per-phase uploads) +
// task_files (board attachments). Library, not a file manager: no folders,
// no versioning, no previews.
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  getAllDocuments, getLibraryDocuments, createLibraryDocument, deleteLibraryDocument,
  deletePhaseDocument, deleteTaskFile, getDocumentUrl, getTasks, MAX_FILE_BYTES,
} from '../lib/data.js'
import { MODALITIES, modalityById } from '../lib/modalities.js'

const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return '—'
  }
}

const fmtSize = (bytes) => {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const TYPE_META = {
  pdf:  { label: 'PDF',  cls: 'bg-rose-100 text-rose-700' },
  doc:  { label: 'DOC',  cls: 'bg-blue-100 text-blue-700' },
  xls:  { label: 'XLS',  cls: 'bg-[#c9f3dc] text-[#00854d]' },
  ppt:  { label: 'PPT',  cls: 'bg-amber-100 text-amber-700' },
  img:  { label: 'IMG',  cls: 'bg-violet-100 text-violet-700' },
  txt:  { label: 'TXT',  cls: 'bg-slate-200 text-slate-600' },
  zip:  { label: 'ZIP',  cls: 'bg-slate-200 text-slate-600' },
  file: { label: 'FILE', cls: 'bg-[#cfe3fb] text-[#0060c9]' },
}

function typeOf(doc) {
  const n = (doc.name || '').toLowerCase()
  const ext = n.includes('.') ? n.split('.').pop() : ''
  if (ext === 'pdf') return TYPE_META.pdf
  if (['doc', 'docx', 'pages', 'odt'].includes(ext)) return TYPE_META.doc
  if (['xls', 'xlsx', 'csv', 'numbers', 'ods'].includes(ext)) return TYPE_META.xls
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) return TYPE_META.ppt
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(ext)) return TYPE_META.img
  if (['txt', 'md', 'rtf'].includes(ext)) return TYPE_META.txt
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return TYPE_META.zip
  return TYPE_META.file
}

function sourceBadge(doc) {
  const phaseLabel = doc.modality ? modalityById(doc.modality)?.label : null
  if (doc.source === 'phase') {
    return { text: phaseLabel ? `${phaseLabel} phase` : 'Phase', cls: 'bg-[#e6d9ff] text-[#6e2fd6]' }
  }
  if (doc.source === 'task') {
    return { text: `Task: ${doc.taskTitle}`, cls: 'bg-amber-100 text-amber-800' }
  }
  if (doc.taskTitle) {
    return { text: `Task: ${doc.taskTitle}`, cls: 'bg-amber-100 text-amber-800' }
  }
  if (phaseLabel) {
    return { text: `${phaseLabel} phase`, cls: 'bg-[#e6d9ff] text-[#6e2fd6]' }
  }
  return { text: 'General', cls: 'bg-slate-200 text-slate-600' }
}

function deleteConfirmText(doc) {
  if (doc.source === 'phase') {
    const label = doc.modality ? modalityById(doc.modality)?.label : 'phase'
    return `Remove "${doc.name}" from the ${label} phase section? The file will be permanently deleted.`
  }
  if (doc.source === 'task') {
    return `Remove the attachment "${doc.name}" from the task "${doc.taskTitle}"? The file will be permanently deleted.`
  }
  return `Remove "${doc.name}" from the document library? The file will be permanently deleted.`
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  ...MODALITIES.map(m => ({ id: `phase:${m.id}`, label: m.label })),
  { id: 'tasks', label: 'Tasks' },
]

export default function DocumentLibrary({ campaignId, live }) {
  const [docs, setDocs] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [upFile, setUpFile] = useState(null)
  const [upTitle, setUpTitle] = useState('')
  const [upModality, setUpModality] = useState('')
  const [upTaskId, setUpTaskId] = useState('')
  const [upError, setUpError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [confirmDoc, setConfirmDoc] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    const [all, t] = await Promise.all([
      getAllDocuments(campaignId),
      getTasks(campaignId).catch(() => ({ items: [] })),
    ])
    setDocs(all)
    setTasks(t.items || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [campaignId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter(d => {
      if (q && !(d.name || '').toLowerCase().includes(q)) return false
      if (filter === 'all') return true
      if (filter === 'general') {
        return d.source === 'library' && !d.modality && !d.taskTitle
      }
      if (filter === 'tasks') {
        return d.source === 'task' || (d.source === 'library' && !!d.taskTitle)
      }
      if (filter.startsWith('phase:')) {
        return d.modality === filter.slice(6)
      }
      return true
    })
  }, [docs, search, filter])

  const handleDownload = async (doc) => {
    if (!doc.path) return
    setBusy(true)
    try {
      const url = await getDocumentUrl(doc.path)
      if (url) window.open(url, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    const doc = confirmDoc
    if (!doc) return
    setBusy(true)
    try {
      if (doc.source === 'library') {
        await deleteLibraryDocument({ campaignId, id: doc.id, filePath: doc.path })
      } else if (doc.source === 'phase') {
        await deletePhaseDocument({ campaignId, modality: doc.modality, id: doc.id, filePath: doc.path })
      } else {
        await deleteTaskFile({ id: doc.id, filePath: doc.path })
      }
      setDocs(prev => prev.filter(d => d.key !== doc.key))
    } finally {
      setBusy(false)
      setConfirmDoc(null)
    }
  }

  const handleUpload = async () => {
    setUpError('')
    if (!upFile) { setUpError('Choose a file first.'); return }
    setUploading(true)
    try {
      await createLibraryDocument({
        campaignId,
        file: upFile,
        title: upTitle,
        modality: upModality || null,
        taskId: upTaskId || null,
      })
      setUpFile(null); setUpTitle(''); setUpModality(''); setUpTaskId('')
      if (fileRef.current) fileRef.current.value = ''
      setUploadOpen(false)
      load()
    } catch (err) {
      setUpError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-[#0085ff]'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Documents</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {docs.length} {docs.length === 1 ? 'document' : 'documents'} across phases, tasks, and uploads
          </p>
        </div>
        <button
          onClick={() => live && setUploadOpen(v => !v)}
          disabled={!live}
          title={live ? 'Upload a document' : 'Upload needs the live database'}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0073ea] text-white hover:bg-[#0060c9] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Upload
        </button>
      </div>

      {!live && (
        <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          You're viewing local data — upload needs the live database connection.
        </div>
      )}

      {uploadOpen && live && (
        <div className="mb-4 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <input
                ref={fileRef}
                type="file"
                onChange={e => setUpFile(e.target.files?.[0] || null)}
                className="text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#e8f1fd] file:text-[#0060c9] hover:file:bg-[#cfe3fb]"
              />
              <p className="text-[11px] text-slate-400 mt-1">Max {MAX_FILE_BYTES / 1024 / 1024} MB per file.</p>
            </div>
            <input
              value={upTitle}
              onChange={e => setUpTitle(e.target.value)}
              placeholder="Title (optional — defaults to the file name)"
              className={inputCls}
            />
            <select
              value={upModality}
              onChange={e => setUpModality(e.target.value)}
              className={inputCls}
            >
              <option value="">Phase tag (optional)</option>
              {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <select
              value={upTaskId}
              onChange={e => setUpTaskId(e.target.value)}
              className={`${inputCls} sm:col-span-2`}
            >
              <option value="">Link to a task (optional)</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          {upError && <p className="text-xs text-rose-600 mt-2">{upError}</p>}
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setUploadOpen(false); setUpError('') }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#0073ea] text-white hover:bg-[#0060c9] disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload document'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-[#0085ff] w-52"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition ${
                  filter === f.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-xs text-slate-400">Loading documents…</p>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-500">No documents here yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Files you upload to phases and tasks appear here automatically.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map(doc => {
              const t = typeOf(doc)
              const badge = sourceBadge(doc)
              return (
                <li key={doc.key} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
                  <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold ${t.cls}`}>
                    {t.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.text}
                      </span>
                      {doc.size != null && (
                        <span className="text-[11px] text-slate-400">{fmtSize(doc.size)}</span>
                      )}
                      <span className="text-[11px] text-slate-400">{fmtDateTime(doc.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={!doc.path || busy}
                    className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:border-[#0085ff] hover:text-[#0060c9] transition disabled:opacity-40"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setConfirmDoc(doc)}
                    className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-400 hover:border-rose-400 hover:text-rose-600 transition"
                  >
                    Delete
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {confirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => !busy && setConfirmDoc(null)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 p-5 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Delete this file?</h3>
            <p className="text-xs text-slate-600 mb-4">{deleteConfirmText(confirmDoc)}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDoc(null)}
                disabled={busy}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
