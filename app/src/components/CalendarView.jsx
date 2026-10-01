// CalendarView: month calendar for the change practitioner.
// Manual events (Supabase table `events`, local fallback) plus read-only
// overlays: task due dates, milestones, and Google Calendar (read-only,
// client-side OAuth — see lib/externalCalendars.js). M365 plugs in later.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { MODALITIES } from '../lib/modalities.js'
import {
  getEvents, createEvent, deleteEvent, getTasks,
} from '../lib/data.js'
import {
  GOOGLE_CLIENT_ID, getGoogleStatus, connectGoogle, disconnectGoogle, listGoogleEvents,
} from '../lib/externalCalendars.js'

// Local YYYY-MM-DD key for bucketing.
const dateKey = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const keyOf = (iso) => {
  if (!iso) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  return isNaN(d) ? null : dateKey(d)
}

const fmtTime = (iso) => {
  if (!iso || /^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

const fmtMonthYear = (d) =>
  d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

const fmtDayHeader = (d) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

// 42 cells (6x7), weeks starting Sunday.
function monthCells(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

const CHIP = {
  manual: 'bg-teal-100 text-teal-800 border-teal-200',
  task: 'bg-amber-100 text-amber-800 border-amber-200',
  milestone: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  google: 'bg-blue-100 text-blue-800 border-blue-200',
}

const LEGEND = [
  { id: 'manual', label: 'My events', cls: 'bg-teal-500' },
  { id: 'task', label: 'Task due dates', cls: 'bg-amber-500' },
  { id: 'milestone', label: 'Milestones', cls: 'bg-indigo-500' },
  { id: 'google', label: 'Google Calendar', cls: 'bg-blue-500' },
]

const inputCls =
  'px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-teal-500'

export default function CalendarView({ campaignId, live, milestones = [], onSelectModality }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [manualEvents, setManualEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [gcalEvents, setGcalEvents] = useState([])
  const [gStatus, setGStatus] = useState('disconnected')
  const [gError, setGError] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))
  const [error, setError] = useState('')

  // Add-event form
  const [fTitle, setFTitle] = useState('')
  const [fDate, setFDate] = useState(() => dateKey(new Date()))
  const [fStart, setFStart] = useState('')
  const [fEnd, setFEnd] = useState('')
  const [fPhase, setFPhase] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor])
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1), [cursor])

  // Manual events + tasks for the visible month.
  useEffect(() => {
    let cancelled = false
    getEvents(campaignId, monthStart.toISOString(), monthEnd.toISOString())
      .then(({ items }) => { if (!cancelled) setManualEvents(items) })
      .catch(() => { if (!cancelled) setManualEvents([]) })
    getTasks(campaignId)
      .then(({ items }) => { if (!cancelled) setTasks(items) })
      .catch(() => { if (!cancelled) setTasks([]) })
    return () => { cancelled = true }
  }, [campaignId, monthStart, monthEnd])

  const fetchGcal = useCallback(async () => {
    try {
      const items = await listGoogleEvents({ timeMin: monthStart, timeMax: monthEnd })
      setGcalEvents(items)
      setGError('')
      setGStatus('connected')
    } catch (err) {
      if (err.code === 'expired' || err.code === 'not-connected') {
        setGStatus(err.code === 'expired' ? 'expired' : 'disconnected')
        setGError(err.message)
      } else {
        setGError(err.message)
      }
      setGcalEvents([])
    }
  }, [monthStart, monthEnd])

  // On mount / month change: if Google was connected, refresh its events.
  useEffect(() => {
    const s = getGoogleStatus()
    setGStatus(s)
    if (s === 'connected') fetchGcal()
    else setGcalEvents([])
  }, [fetchGcal])

  const handleConnect = async () => {
    setGError('')
    setGStatus('connecting')
    try {
      await connectGoogle()
      await fetchGcal()
    } catch (err) {
      setGError(err.message)
      setGStatus(getGoogleStatus())
    }
  }

  const handleDisconnect = async () => {
    await disconnectGoogle()
    setGcalEvents([])
    setGStatus('disconnected')
    setGError('')
  }

  // Bucket everything by local date key.
  const byDay = useMemo(() => {
    const map = {}
    const push = (k, item) => { if (k) (map[k] = map[k] || []).push(item) }
    manualEvents.forEach(e => push(keyOf(e.starts_at), { kind: 'manual', ...e }))
    tasks.forEach(t => {
      if (t.due_date && t.status !== 'done') push(t.due_date, { kind: 'task', id: t.id, title: t.title })
    })
    ;(milestones || []).forEach((m, i) => push(keyOf(m.date), { kind: 'milestone', id: `ms-${i}`, title: m.title, status: m.status }))
    gcalEvents.forEach(e => push(keyOf(e.start), { kind: 'google', id: e.id, title: e.title, start: e.start, end: e.end, allDay: e.allDay }))
    return map
  }, [manualEvents, tasks, milestones, gcalEvents])

  const cells = useMemo(() => monthCells(cursor), [cursor])
  const todayKey = dateKey(new Date())
  const selectedItems = byDay[selectedDay] || []

  const openDay = (d) => {
    const k = dateKey(d)
    setSelectedDay(k)
    setFDate(k)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    const cleanTitle = fTitle.trim()
    if (!cleanTitle) { setError('Give this event a title.'); return }
    if (!fDate) { setError('Pick a date for this event.'); return }
    const startsAt = fStart
      ? new Date(`${fDate}T${fStart}`).toISOString()
      : new Date(`${fDate}T00:00:00`).toISOString()
    let endsAt = null
    if (fEnd) {
      endsAt = new Date(`${fDate}T${fEnd}`).toISOString()
      if (endsAt <= startsAt) { setError('End time must be after the start time.'); return }
    }
    setSaving(true)
    try {
      const item = await createEvent({
        campaignId,
        title: cleanTitle,
        modality: fPhase || null,
        description: fDesc,
        startsAt,
        endsAt,
      })
      setManualEvents(prev => [...prev, item].sort((a, b) => (a.starts_at || '').localeCompare(b.starts_at || '')))
      setFTitle(''); setFStart(''); setFEnd(''); setFPhase(''); setFDesc('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    try {
      await deleteEvent({ campaignId, id: item.id })
      setManualEvents(prev => prev.filter(e => e.id !== item.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const goMonth = (delta) =>
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  const goToday = () => {
    const d = new Date()
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
    openDay(d)
  }

  const modalityLabel = (id) => MODALITIES.find(m => m.id === id)?.label || ''

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Calendar</h2>
          <p className="text-sm text-slate-600">
            Change dates at a glance — your events, task due dates, and milestones in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gStatus === 'unconfigured' ? (
            <button
              onClick={() => setShowHelp(v => !v)}
              className="px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-teal-500 transition"
            >
              {showHelp ? 'Hide setup steps' : 'Set up Google Calendar'}
            </button>
          ) : gStatus === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-teal-500 transition"
              title="Disconnect Google Calendar"
            >
              Disconnect Google
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={gStatus === 'connecting'}
              className="px-3 py-1.5 text-xs rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {gStatus === 'connecting' ? 'Connecting…' : gStatus === 'expired' ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
            </button>
          )}
        </div>
      </div>

      {(gStatus === 'unconfigured' && showHelp) && (
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 mb-4 text-xs text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-900">Connect your Google Calendar (read-only, ~10 minutes, free)</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <span className="font-medium text-slate-800">console.cloud.google.com</span> and create a project (any name).</li>
            <li>Enable the <span className="font-medium text-slate-800">Google Calendar API</span> (APIs &amp; Services → Library).</li>
            <li>Configure the <span className="font-medium text-slate-800">OAuth consent screen</span> (External, add your email as a test user).</li>
            <li>Create credentials → <span className="font-medium text-slate-800">OAuth client ID</span> → type <span className="font-medium text-slate-800">Web application</span>; add this site's origin (e.g. https://change-flow-beige.vercel.app) as an <span className="font-medium text-slate-800">Authorized JavaScript origin</span>.</li>
            <li>In Vercel: project Settings → Environment Variables → add <span className="font-mono text-slate-800">VITE_GOOGLE_CLIENT_ID</span> with the client ID → redeploy.</li>
          </ol>
          <p>After redeploying, this button becomes "Connect Google Calendar". Outlook / M365 sync comes later.</p>
        </div>
      )}
      {gError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{gError}</p>
      )}
      {!live && (
        <p className="text-[11px] text-amber-700 mb-3">Sample data — events save on this device until the live database is connected.</p>
      )}

      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button onClick={() => goMonth(-1)} className="px-2.5 py-1.5 text-sm rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-teal-500 transition" title="Previous month">←</button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-teal-500 transition">Today</button>
          <button onClick={() => goMonth(1)} className="px-2.5 py-1.5 text-sm rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-teal-500 transition" title="Next month">→</button>
        </div>
        <h3 className="text-base font-semibold text-slate-900">{fmtMonthYear(cursor)}</h3>
        <div className="w-24" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-[11px] text-slate-600">
        {LEGEND.map(l => (
          <span key={l.id} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Month grid */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="px-2 py-2 text-[11px] uppercase tracking-widest text-slate-500 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const k = dateKey(d)
            const inMonth = d.getMonth() === cursor.getMonth()
            const items = byDay[k] || []
            const isToday = k === todayKey
            const isSelected = k === selectedDay
            return (
              <button
                key={i}
                onClick={() => openDay(d)}
                className={`min-h-[88px] p-1.5 text-left border-b border-r border-slate-100 align-top transition hover:bg-teal-50/50 ${
                  (i % 7 === 6) ? 'border-r-0' : ''
                } ${!inMonth ? 'bg-slate-50/60' : ''} ${isSelected ? 'bg-teal-50' : ''}`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                  isToday
                    ? 'bg-teal-600 text-white font-semibold'
                    : inMonth ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {d.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map(item => (
                    <span
                      key={`${item.kind}-${item.id}`}
                      className={`block truncate text-[10px] leading-4 px-1.5 py-0.5 rounded border ${CHIP[item.kind]}`}
                      title={item.title}
                    >
                      {item.kind !== 'manual' && fmtTime(item.start) ? `${fmtTime(item.start)} ` : ''}{item.title}
                    </span>
                  ))}
                  {items.length > 3 && (
                    <span className="block text-[10px] text-slate-500 px-1.5">+{items.length - 3} more</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail + add form */}
      <div className="mt-4 rounded-xl bg-white border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">{fmtDayHeader(new Date(selectedDay + 'T12:00:00'))}</h3>

        {selectedItems.length === 0 ? (
          <p className="text-xs text-slate-500 mb-4">Nothing scheduled this day.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {selectedItems.map(item => (
              <li
                key={`${item.kind}-${item.id}`}
                className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2 border ${CHIP[item.kind]} bg-opacity-40`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">
                    {item.kind !== 'manual' && fmtTime(item.start) ? `${fmtTime(item.start)} — ` : ''}
                    {item.title}
                  </div>
                  {item.kind === 'manual' && (
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {[fmtTime(item.starts_at), item.ends_at ? `– ${fmtTime(item.ends_at)}` : '', item.modality ? modalityLabel(item.modality) : '']
                        .filter(Boolean).join(' · ')}
                      {item.description && <div className="mt-0.5 whitespace-pre-wrap">{item.description}</div>}
                    </div>
                  )}
                  {item.kind === 'task' && (
                    <button
                      onClick={() => onSelectModality && onSelectModality('tasks')}
                      className="text-[11px] underline opacity-80 hover:opacity-100"
                    >
                      Open in Tasks →
                    </button>
                  )}
                  {item.kind === 'milestone' && item.status && (
                    <div className="text-[11px] opacity-80">{item.status}</div>
                  )}
                  {item.kind === 'google' && (
                    <div className="text-[11px] opacity-80">
                      {item.allDay ? 'All day' : [fmtTime(item.start), item.end ? `– ${fmtTime(item.end)}` : ''].filter(Boolean).join(' ')} · Google Calendar (read-only)
                    </div>
                  )}
                </div>
                {item.kind === 'manual' && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-[11px] text-slate-500 hover:text-red-600 shrink-0"
                    title="Delete event"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="border-t border-slate-200 pt-4">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Add an event</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              value={fTitle}
              onChange={e => setFTitle(e.target.value)}
              placeholder="Title — e.g. Training cohort 3 kickoff"
              className={`${inputCls} md:col-span-2`}
            />
            <select value={fPhase} onChange={e => setFPhase(e.target.value)} className={`${inputCls} text-slate-600`}>
              <option value="">Phase: none</option>
              {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className={`${inputCls} text-slate-700`} />
            <input type="time" value={fStart} onChange={e => setFStart(e.target.value)} className={`${inputCls} text-slate-700`} title="Start time (optional)" />
            <input type="time" value={fEnd} onChange={e => setFEnd(e.target.value)} className={`${inputCls} text-slate-700`} title="End time (optional)" />
          </div>
          <textarea
            value={fDesc}
            onChange={e => setFDesc(e.target.value)}
            placeholder="Description (optional)…"
            rows={2}
            className={`${inputCls} mt-2 w-full resize-y`}
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {saving ? 'Adding…' : 'Add event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
