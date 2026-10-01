// Home: the app's front door. Answers three questions, top to bottom:
// "What needs my attention right now?", "How healthy is this transformation?",
// "Where did I leave off?" The Dashboard tab remains the reporting hub (untouched).
import { useState, useEffect } from 'react'
import ModalityRings from './ModalityRings.jsx'
import {
  getTasks, getEvents, getAllDocuments, getMaps, getPhaseDocuments,
} from '../lib/data.js'
import { MODALITIES, modalityById } from '../lib/modalities.js'

const MAP_TYPE_LABELS = {
  stakeholder: 'Stakeholder map',
  journey: 'Journey map',
  process: 'Process map',
  impact: 'Impact map',
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(base, n) {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function relTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtDate(ymd) {
  if (!ymd) return ''
  const d = new Date(ymd.length <= 10 ? ymd + 'T00:00:00' : ymd)
  if (Number.isNaN(d.getTime())) return ymd
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function phaseLabel(id) {
  const m = modalityById(id)
  return m ? `${m.label} phase` : 'General'
}

export default function Home({ campaignId, bundle, onSelectModality }) {
  const [attention, setAttention] = useState(null)
  const [recent, setRecent] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const today = todayStr()
      const weekOut = addDays(today, 7)
      const now = new Date()
      const weekISO = new Date(now.getTime() + 7 * 864e5).toISOString()

      const [tasksRes, eventsRes, docsRes, mapsRes, ...notesRes] = await Promise.all([
        getTasks(campaignId).catch(() => ({ items: [] })),
        getEvents(campaignId, now.toISOString(), weekISO).catch(() => ({ items: [] })),
        getAllDocuments(campaignId).catch(() => []),
        getMaps(campaignId).catch(() => ({ items: [] })),
        ...MODALITIES.map(m =>
          getPhaseDocuments(campaignId, m.id)
            .then(r => ({ modality: m.id, items: r.items || [] }))
            .catch(() => ({ modality: m.id, items: [] }))
        ),
      ])
      if (cancelled) return

      const tasks = tasksRes.items || []
      const open = tasks.filter(t => t.status !== 'done')
      const items = []
      open.filter(t => t.due_date && t.due_date < today).forEach(t =>
        items.push({ key: `od-${t.id}`, tone: 'rose', title: t.title, sub: `Overdue since ${fmtDate(t.due_date)}${t.modality ? ` · ${phaseLabel(t.modality)}` : ''}`, tab: 'tasks' })
      )
      open.filter(t => t.status === 'stuck').forEach(t =>
        items.push({ key: `st-${t.id}`, tone: 'amber', title: t.title, sub: `Stuck${t.modality ? ` · ${phaseLabel(t.modality)}` : ''}`, tab: 'tasks' })
      )
      open.filter(t => t.due_date && t.due_date >= today && t.due_date <= weekOut).forEach(t =>
        items.push({ key: `ds-${t.id}`, tone: 'amber', title: t.title, sub: `Due ${fmtDate(t.due_date)}${t.modality ? ` · ${phaseLabel(t.modality)}` : ''}`, tab: 'tasks' })
      )
      ;(bundle?.milestones || [])
        .filter(m => m.date && m.date >= today && m.date <= weekOut)
        .forEach((m, i) =>
          items.push({ key: `ms-${i}`, tone: 'indigo', title: m.title, sub: `Milestone · ${fmtDate(m.date)}`, tab: 'dashboard' })
        )
      ;(eventsRes.items || []).forEach(e =>
        items.push({ key: `ev-${e.id}`, tone: 'teal', title: e.title, sub: `Event · ${fmtDate(e.starts_at)}${e.modality ? ` · ${phaseLabel(e.modality)}` : ''}`, tab: 'calendar' })
      )
      setAttention(items)

      const feed = []
      tasks.forEach(t => feed.push({
        key: `t-${t.id}`, kind: 'Task', label: t.title,
        detail: t.modality ? phaseLabel(t.modality) : (t.status || ''), 
        at: t.updated_at || t.created_at, tab: 'tasks',
      }))
      ;(Array.isArray(docsRes) ? docsRes : []).forEach(d => feed.push({
        key: d.key || `d-${d.id}`, kind: 'Document', label: d.name,
        detail: d.modality ? phaseLabel(d.modality) : (d.taskTitle ? `Task: ${d.taskTitle}` : 'General'),
        at: d.createdAt, tab: 'documents',
      }))
      ;(mapsRes.items || []).forEach(m => feed.push({
        key: `m-${m.id}`, kind: 'Map', label: m.title,
        detail: MAP_TYPE_LABELS[m.map_type] || 'Map',
        at: m.updated_at || m.created_at, tab: 'mapping',
      }))
      notesRes.forEach(({ modality, items: notes }) =>
        (notes || []).forEach(n => feed.push({
          key: `n-${n.id}`, kind: 'Note', label: n.title || (n.note || '').slice(0, 60) || 'Note',
          detail: phaseLabel(modality), at: n.created_at, tab: modality,
        }))
      )
      feed.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
      setRecent(feed.slice(0, 8))
    })()
    return () => { cancelled = true }
  }, [campaignId])

  const TONE = {
    rose: 'border-rose-300 bg-rose-50',
    amber: 'border-amber-300 bg-amber-50',
    indigo: 'border-[#b183ff] bg-[#f3edff]',
    teal: 'border-[#7db3f2] bg-[#e8f1fd]',
  }
  const KIND_PILL = {
    Task: 'bg-amber-100 text-amber-700',
    Document: 'bg-[#cfe3fb] text-[#0060c9]',
    Map: 'bg-violet-100 text-violet-700',
    Note: 'bg-[#cfe3fb] text-[#0060c9]',
  }

  return (
    <div className="space-y-6">
      {/* 1 — Needs your attention */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Needs your attention</h2>
        <p className="text-xs text-slate-500 mb-4">Overdue, stuck, and due in the next 7 days.</p>
        {attention === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : attention.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing needs your attention.</p>
        ) : (
          <ul className="space-y-2">
            {attention.map(a => (
              <li key={a.key}>
                <button
                  onClick={() => onSelectModality(a.tab)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg border ${TONE[a.tone]} hover:shadow-sm transition`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-slate-900 truncate">{a.title}</span>
                    <span className="block text-xs text-slate-500">{a.sub}</span>
                  </span>
                  <span className="text-slate-400 text-sm shrink-0">→</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2 — Transformation health */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">How healthy is this transformation?</h2>
        <p className="text-xs text-slate-500 mb-4">Phase health across the five modalities.</p>
        <ModalityRings data={bundle} onSelect={onSelectModality} />
      </section>

      {/* 3 — Where you left off */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Where you left off</h2>
        <p className="text-xs text-slate-500 mb-4">Recently touched across tasks, documents, maps, and notes.</p>
        {recent === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing here yet — add a task, upload a document, or jot a note to get started.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map(r => (
              <li key={r.key}>
                <button
                  onClick={() => onSelectModality(r.tab)}
                  className="w-full text-left flex items-center gap-3 py-2.5 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition"
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${KIND_PILL[r.kind] || 'bg-slate-100 text-slate-600'}`}>
                    {r.kind}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-slate-900 truncate">{r.label}</span>
                    {r.detail && <span className="block text-xs text-slate-500 truncate">{r.detail}</span>}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{relTime(r.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
