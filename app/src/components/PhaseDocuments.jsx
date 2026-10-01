// Notes & Documents: per-modality practitioner workspace.
// Notes save to Supabase (live) or this device (mock/offline); file uploads
// need the live database + the changeflow-documents storage bucket.
import { useState, useEffect, useRef } from 'react'
import {
  getPhaseDocuments, createPhaseDocument, deletePhaseDocument,
  getDocumentUrl, MAX_FILE_BYTES,
} from '../lib/data.js'

const fmtSize = (bytes) => {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const fmtDateTime = (iso) => {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function PhaseDocuments({ campaignId, modality, live }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getPhaseDocuments(campaignId, modality.id)
      .then(({ items }) => { if (!cancelled) setItems(items) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [campaignId, modality.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const item = await createPhaseDocument({
        campaignId, modality: modality.id,
        title, notes, file: live ? file : null,
      })
      setItems(prev => [item, ...prev])
      setTitle('')
      setNotes('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?${item.file_name ? ' Its attached file will be deleted too.' : ''}`)) return
    try {
      await deletePhaseDocument({
        campaignId, modality: modality.id, id: item.id, filePath: item.file_path,
      })
      setItems(prev => prev.filter(d => d.id !== item.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDownload = async (item) => {
    setDownloadingId(item.id)
    try {
      const url = await getDocumentUrl(item.file_path)
      if (url) window.open(url, '_blank', 'noopener')
      else setError('Could not prepare the download link. Try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const maxMB = MAX_FILE_BYTES / 1024 / 1024

  return (
    <section className="mt-8 rounded-xl bg-white/[0.08] border border-white/20 p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-semibold text-white/90">Notes &amp; Documents</h3>
        {!live && (
          <span className="text-[11px] text-amber-200/70">Sample data — notes save on this device; file upload needs the live database.</span>
        )}
      </div>
      {modality.docsHint && (
        <p className="text-xs text-white/40 mb-4">{modality.docsHint}</p>
      )}

      {loading ? (
        <p className="text-xs text-white/40">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-white/40 border border-dashed border-white/15 rounded-lg p-4 text-center mb-4">
          Nothing filed here yet. Capture meeting notes, upload the artifacts this phase produces — keep the evidence with the work.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {items.map(item => (
            <li key={item.id} className="flex items-start justify-between gap-3 bg-white/[0.05] border border-white/15 rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm text-white/85 font-medium truncate">{item.title}</div>
                {item.notes && (
                  <p className="text-xs text-white/55 mt-1 whitespace-pre-wrap break-words">{item.notes}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span className="text-[11px] text-white/35">{fmtDateTime(item.created_at)}</span>
                  {item.local && (
                    <span className="text-[11px] text-amber-200/70">on this device</span>
                  )}
                  {item.file_name && (
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={downloadingId === item.id}
                      className="text-[11px] text-teal-200/90 hover:text-teal-100 underline disabled:opacity-50"
                      title={item.file_path || ''}
                    >
                      {downloadingId === item.id ? 'Preparing…' : `📎 ${item.file_name}`}{item.file_size != null ? ` (${fmtSize(item.file_size)})` : ''}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(item)}
                className="text-white/35 hover:text-red-300 text-xs shrink-0 mt-0.5"
                title="Delete"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="border-t border-white/10 pt-4">
        <div className="text-[11px] uppercase tracking-widest text-white/35 mb-2">Add a note or document</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title — e.g. Sponsor sync 9/30, Training deck v2"
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-teal-300/40"
          />
          <input
            ref={fileRef}
            type="file"
            disabled={!live}
            onChange={e => setFile(e.target.files?.[0] || null)}
            title={live ? 'Attach a file' : 'File upload needs the live database'}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/60 outline-none file:mr-2 file:px-2 file:py-1 file:text-[11px] file:rounded file:border-0 file:bg-teal-400/20 file:text-teal-200 disabled:opacity-40"
          />
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes — decisions, follow-ups, context the next person needs…"
          rows={2}
          className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-teal-300/40 resize-y"
        />
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-white/35">
            {maxMB} MB max per file · 1 GB total storage on the free plan.
            {!live && ' File upload unlocks when connected to the live database.'}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 text-xs rounded-lg bg-teal-400/20 text-teal-200 border border-teal-300/30 disabled:opacity-40 hover:bg-teal-400/30 transition"
          >
            {saving ? 'Saving…' : live ? 'Save note / upload' : 'Save note'}
          </button>
        </div>
      </form>
    </section>
  )
}
