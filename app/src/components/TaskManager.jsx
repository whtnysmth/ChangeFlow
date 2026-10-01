// TaskManager: Monday-lite task list for the change practitioner.
// Deliberately not PMO software: no subtasks, no dependencies, no Gantt.
// Tracks who owns what, when it's due, and where it's stuck.
import { useState, useEffect, useMemo } from 'react'
import { MODALITIES } from '../lib/modalities.js'
import {
  getTasks, createTask, updateTask, deleteTask,
  TASK_STATUSES, TASK_PRIORITIES,
} from '../lib/data.js'

const STATUS_META = {
  todo: { label: 'To do', pill: 'bg-white/10 text-white/70 border-white/15' },
  in_progress: { label: 'In progress', pill: 'bg-blue-400/15 text-blue-200 border-blue-300/30' },
  stuck: { label: 'Stuck', pill: 'bg-rose-400/15 text-rose-200 border-rose-300/30' },
  done: { label: 'Done', pill: 'bg-teal-400/15 text-teal-200 border-teal-300/30' },
}

const PRIORITY_META = {
  low: { label: 'Low', pill: 'bg-white/5 text-white/50 border-white/10' },
  medium: { label: 'Medium', pill: 'bg-amber-400/15 text-amber-200 border-amber-300/30' },
  high: { label: 'High', pill: 'bg-rose-400/15 text-rose-200 border-rose-300/30' },
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isOverdue = (task) =>
  task.due_date && task.status !== 'done' && task.due_date < todayStr()

export default function TaskManager({ campaignId, live }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Add-task form
  const [title, setTitle] = useState('')
  const [phase, setPhase] = useState('')
  const [owner, setOwner] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [saving, setSaving] = useState(false)

  // Inline title editing
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTasks(campaignId)
      .then(({ items }) => { if (!cancelled) setItems(items) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [campaignId])

  const sorted = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return (a.created_at || '').localeCompare(b.created_at || '')
    })
    return arr
  }, [items])

  const visible = useMemo(() => sorted.filter(t =>
    (phaseFilter === 'all' || (t.modality || 'none') === phaseFilter) &&
    (statusFilter === 'all' || t.status === statusFilter)
  ), [sorted, phaseFilter, statusFilter])

  const openCount = items.filter(t => t.status !== 'done').length
  const overdueCount = items.filter(isOverdue).length

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const item = await createTask({
        campaignId,
        title,
        modality: phase || null,
        owner,
        dueDate: dueDate || null,
        priority,
      })
      setItems(prev => [...prev, item])
      setTitle('')
      setPhase('')
      setOwner('')
      setDueDate('')
      setPriority('medium')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleField = async (task, patch) => {
    try {
      const updated = await updateTask({ campaignId, id: task.id, patch })
      if (updated) setItems(prev => prev.map(t => (t.id === task.id ? updated : t)))
    } catch (err) {
      setError(err.message)
    }
  }

  const startEditTitle = (task) => {
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  const commitEditTitle = async (task) => {
    setEditingId(null)
    const clean = editingTitle.trim()
    if (clean && clean !== task.title) {
      await handleField(task, { title: clean })
    }
  }

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    try {
      await deleteTask({ campaignId, id: task.id })
      setItems(prev => prev.filter(t => t.id !== task.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const inputCls =
    'px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-teal-300/40'

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="text-lg font-bold">Task manager</h2>
        <div className="text-xs text-white/40">
          {openCount} open{overdueCount > 0 && (
            <span className="text-rose-300"> · {overdueCount} overdue</span>
          )}
          {!live && <span className="text-amber-200/70"> · Sample data — tasks save on this device</span>}
        </div>
      </div>
      <p className="text-sm text-white/55 mb-6">
        The practitioner's action list — who owns what, when it's due, where it's stuck.
        Not a project plan; just the work that keeps the change moving.
      </p>

      {/* Add task */}
      <form onSubmit={handleAdd} className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-4">
        <div className="text-[11px] uppercase tracking-widest text-white/35 mb-2">Add a task</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task — e.g. Confirm sponsor kickoff date"
            className={`${inputCls} lg:col-span-2`}
          />
          <select value={phase} onChange={e => setPhase(e.target.value)} className={`${inputCls} text-white/70`}>
            <option value="">Phase: none</option>
            {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <input
            value={owner}
            onChange={e => setOwner(e.target.value)}
            placeholder="Owner"
            className={inputCls}
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className={`${inputCls} text-white/70`}
          />
          <div className="flex gap-2">
            <select value={priority} onChange={e => setPriority(e.target.value)} className={`${inputCls} flex-1 text-white/70`}>
              {TASK_PRIORITIES.map(p => (
                <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)} priority</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs rounded-lg bg-teal-400/20 text-teal-200 border border-teal-300/30 disabled:opacity-40 hover:bg-teal-400/30 transition"
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)} className={`${inputCls} text-white/70`}>
          <option value="all">All phases</option>
          <option value="none">No phase</option>
          {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${inputCls} text-white/70`}>
          <option value="all">All statuses</option>
          {TASK_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
      </div>

      {/* Task table */}
      {loading ? (
        <p className="text-xs text-white/40">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
          <p className="text-sm text-white/60 mb-1">
            {items.length === 0 ? 'No tasks yet.' : 'Nothing matches these filters.'}
          </p>
          <p className="text-xs text-white/40">
            {items.length === 0
              ? 'Add the first one above — a sponsor follow-up, a training slot to book, a comms draft to review. Small tasks, moved steadily, are what carry a change.'
              : 'Try clearing the filters to see everything.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-white/35 border-b border-white/10">
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Task</th>
                  <th className="px-3 py-2.5 font-medium">Phase</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Due</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(task => {
                  const overdue = isOverdue(task)
                  const done = task.status === 'done'
                  return (
                    <tr
                      key={task.id}
                      className={`border-b border-white/5 last:border-0 ${overdue ? 'bg-rose-400/[0.07]' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <select
                          value={task.status}
                          onChange={e => handleField(task, { status: e.target.value })}
                          className={`text-[11px] rounded-full px-2 py-1 border outline-none cursor-pointer appearance-none ${STATUS_META[task.status]?.pill || STATUS_META.todo.pill}`}
                        >
                          {TASK_STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 min-w-0">
                        {editingId === task.id ? (
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onBlur={() => commitEditTitle(task)}
                            onKeyDown={e => { if (e.key === 'Enter') commitEditTitle(task); if (e.key === 'Escape') setEditingId(null) }}
                            className={`${inputCls} w-full`}
                          />
                        ) : (
                          <button
                            onClick={() => startEditTitle(task)}
                            className={`text-left hover:text-teal-200 transition ${done ? 'line-through text-white/35' : 'text-white/85'}`}
                            title="Click to edit"
                          >
                            {task.title}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={task.modality || ''}
                          onChange={e => handleField(task, { modality: e.target.value || null })}
                          className={`${inputCls} !py-1 text-[11px] text-white/70`}
                        >
                          <option value="">—</option>
                          {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          defaultValue={task.owner || ''}
                          placeholder="—"
                          onBlur={e => { if (e.target.value !== (task.owner || '')) handleField(task, { owner: e.target.value.trim() || null }) }}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                          className={`${inputCls} !py-1 !px-2 text-[11px] w-28`}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="date"
                          value={task.due_date || ''}
                          onChange={e => handleField(task, { due_date: e.target.value || null })}
                          className={`${inputCls} !py-1 !px-2 text-[11px] ${overdue ? 'text-rose-200 border-rose-300/40' : 'text-white/70'}`}
                        />
                        {overdue && (
                          <div className="text-[10px] text-rose-300 mt-0.5">Overdue · due {fmtDate(task.due_date)}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={task.priority}
                          onChange={e => handleField(task, { priority: e.target.value })}
                          className={`text-[11px] rounded-full px-2 py-1 border outline-none cursor-pointer appearance-none ${PRIORITY_META[task.priority]?.pill || PRIORITY_META.medium.pill}`}
                        >
                          {TASK_PRIORITIES.map(p => (
                            <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleDelete(task)}
                          className="text-white/35 hover:text-red-300 text-xs"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
