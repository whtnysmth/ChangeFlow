// TaskManager: Monday-style task board for the change practitioner.
// Groups (To-Do / Completed / custom), Monday-like column model, per-task files.
// Data: tasks + task_columns + task_groups + task_files, Supabase first,
// localStorage fallback — same discipline as the rest of the app.
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  getTasks, createTask, updateTask, deleteTask,
  getTaskColumns, createTaskColumn, deleteTaskColumn, TASK_COLUMN_TYPES,
  getTaskGroups, createTaskGroup, deleteTaskGroup,
  getTaskFiles, getTaskFileCounts, attachTaskFile, deleteTaskFile,
  getDocumentUrl, MAX_FILE_BYTES, TASK_STATUSES, TASK_PRIORITIES,
} from '../lib/data.js'
import { MODALITIES } from '../lib/modalities.js'

const STATUS_META = {
  todo:        { label: 'To do',         pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress: { label: 'Working on it', pill: 'bg-amber-100 text-amber-700 border-amber-200' },
  stuck:       { label: 'Stuck',         pill: 'bg-rose-100 text-rose-700 border-rose-200' },
  done:        { label: 'Done',          pill: 'bg-[#c9f3dc] text-[#00854d] border-[#9ae6b8]' },
}

const PRIORITY_META = {
  low:    { label: 'Low',    pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', pill: 'bg-amber-100 text-amber-700 border-amber-200' },
  high:   { label: 'High',   pill: 'bg-rose-100 text-rose-700 border-rose-200' },
}

const BUILTIN_GROUP_COLORS = { 'To-Do': '#0073ea', 'Completed': '#00c875' }
const CUSTOM_GROUP_PALETTE = ['#0073ea', '#a253ff', '#fdab3d', '#e2445c', '#0085ff', '#4eccc6', '#ffcb00', '#784bd1']

const COLUMN_TYPE_META = [
  { type: 'status',   label: 'Status',   dot: 'bg-[#00c875]' },
  { type: 'text',     label: 'Text',     dot: 'bg-amber-400' },
  { type: 'people',   label: 'People',   dot: 'bg-[#4d97ec]' },
  { type: 'date',     label: 'Date',     dot: 'bg-violet-500' },
  { type: 'numbers',  label: 'Numbers',  dot: 'bg-amber-300' },
  { type: 'files',    label: 'Files',    dot: 'bg-rose-400' },
  { type: 'checkbox', label: 'Checkbox', dot: 'bg-orange-400' },
  { type: 'priority', label: 'Priority', dot: 'bg-yellow-400' },
]

const STATUS_BAR_COLORS = {
  todo: '#0085ff', in_progress: '#fdab3d', stuck: '#e2445c', done: '#00c875',
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return '—'
  }
}

const fmtSize = (bytes) => {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isOverdue = (task) =>
  task.due_date && task.status !== 'done' && task.due_date < todayStr()

const inputCls =
  'px-2 py-1 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-[#0085ff]'

// --- Click-to-edit text cell -----------------------------------------------
function EditableText({ value, onCommit, placeholder = '—', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const commit = () => {
    setEditing(false)
    const clean = draft.trim()
    if (clean !== (value || '')) onCommit(clean)
  }
  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value || ''); setEditing(true) }}
        className={`block w-full text-left rounded px-1 -mx-1 hover:bg-slate-100 transition truncate ${className}`}
        title="Click to edit"
      >
        {value || <span className="text-slate-300">{placeholder}</span>}
      </button>
    )
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      className="w-full px-1.5 py-0.5 text-xs rounded border border-[#0085ff] outline-none text-slate-900 bg-white"
    />
  )
}

// --- Status / priority pills ------------------------------------------------
function StatusPill({ value, onChange }) {
  const meta = STATUS_META[value] || STATUS_META.todo
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-[11px] font-medium rounded-full px-2.5 py-1 border outline-none cursor-pointer appearance-none ${meta.pill}`}
    >
      {TASK_STATUSES.map(s => (
        <option key={s} value={s}>{STATUS_META[s].label}</option>
      ))}
    </select>
  )
}

function PriorityPill({ value, onChange }) {
  const meta = PRIORITY_META[value] || PRIORITY_META.medium
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-[11px] font-medium rounded-full px-2.5 py-1 border outline-none cursor-pointer appearance-none ${meta.pill}`}
    >
      {TASK_PRIORITIES.map(p => (
        <option key={p} value={p}>{PRIORITY_META[p].label}</option>
      ))}
    </select>
  )
}

// --- Files cell: count badge + popover list/download/attach -----------------
function FilesCell({ task, columnId = null, live, fileCount = 0, onFilesChanged }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const load = async () => setFiles(await getTaskFiles(task.id, columnId))

  const toggle = () => {
    if (!open) load()
    setErr('')
    setOpen(o => !o)
  }

  const handlePick = async (e) => {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setUploading(true)
    setErr('')
    try {
      await attachTaskFile({ campaignId: task.campaign_id, taskId: task.id, columnId, file })
      await load()
      onFilesChanged?.()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (f) => {
    try {
      await deleteTaskFile({ id: f.id, filePath: f.file_path })
      await load()
      onFilesChanged?.()
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const handleDownload = async (f) => {
    const url = await getDocumentUrl(f.file_path)
    if (url) window.open(url, '_blank', 'noopener')
    else setErr('Could not prepare the download link.')
  }

  return (
    <>
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-slate-400 hover:text-[#0060c9] transition"
        title={live ? 'View files' : 'File upload needs the live database'}
      >
        <span className="text-sm">📎</span>
        {fileCount > 0 && (
          <span className="min-w-[18px] text-center px-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-medium">
            {fileCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 left-1/2 top-1/4 -translate-x-1/2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl p-2.5">
            <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-1.5 px-1">
              Files · {task.title}
            </div>
            {files.length === 0 ? (
              <p className="text-[11px] text-slate-400 px-1 py-2">No files attached yet.</p>
            ) : (
              files.map(f => (
                <div key={f.id} className="flex items-center justify-between gap-2 px-1 py-1.5 border-b border-slate-100 last:border-0">
                  <button
                    onClick={() => handleDownload(f)}
                    className="text-left text-[11px] text-[#0060c9] hover:underline truncate"
                    title="Download"
                  >
                    📎 {f.file_name}{f.file_size != null ? ` (${fmtSize(f.file_size)})` : ''}
                  </button>
                  <button
                    onClick={() => handleDelete(f)}
                    className="text-slate-300 hover:text-red-500 text-sm leading-none shrink-0"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
            {err && <p className="text-[11px] text-red-600 px-1 mt-1">{err}</p>}
            <input ref={fileRef} type="file" className="hidden" onChange={handlePick} />
            <button
              disabled={!live || uploading}
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full px-2 py-1.5 text-[11px] rounded-lg bg-[#0073ea]/10 text-[#0060c9] border border-[#0073ea]/20 disabled:opacity-40 hover:bg-[#0073ea]/20 transition"
            >
              {uploading ? 'Uploading…' : '+ Attach file'}
            </button>
            {!live && (
              <p className="text-[10px] text-amber-600 px-1 mt-1.5">File upload needs the live database.</p>
            )}
            <p className="text-[10px] text-slate-400 px-1 mt-1">
              {MAX_FILE_BYTES / 1024 / 1024} MB max per file · 1 GB total storage on the free plan.
            </p>
          </div>
        </>
      )}
    </>
  )
}

// --- Custom column cell, by column type --------------------------------------
function CustomCell({ col, task, live, fileCount, onPatch, onFilesChanged }) {
  const val = (task.custom || {})[col.id]
  switch (col.type) {
    case 'status':
      return <StatusPill value={val || 'todo'} onChange={v => onPatch({ [col.id]: v })} />
    case 'priority':
      return <PriorityPill value={val || 'medium'} onChange={v => onPatch({ [col.id]: v })} />
    case 'text':
    case 'people':
      return <EditableText value={val || ''} onCommit={v => onPatch({ [col.id]: v })} className="text-slate-600" />
    case 'date':
      return (
        <input
          type="date"
          value={val || ''}
          onChange={e => onPatch({ [col.id]: e.target.value || null })}
          className={`${inputCls} !py-0.5 text-slate-600`}
        />
      )
    case 'numbers':
      return (
        <input
          type="number"
          value={val ?? ''}
          onChange={e => onPatch({ [col.id]: e.target.value === '' ? null : Number(e.target.value) })}
          className={`${inputCls} !py-0.5 text-slate-600 w-24`}
        />
      )
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={!!val}
          onChange={e => onPatch({ [col.id]: e.target.checked })}
          className="h-4 w-4 accent-[#0073ea] cursor-pointer"
        />
      )
    case 'files':
      return (
        <FilesCell task={task} columnId={col.id} live={live} fileCount={fileCount} onFilesChanged={onFilesChanged} />
      )
    default:
      return null
  }
}

// --- "+ add column" picker ---------------------------------------------------
function AddColumnPicker({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const ready = name.trim().length > 0
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 left-1/2 top-1/4 -translate-x-1/2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl p-3">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Search or describe your column"
          className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-[#0085ff]"
        />
        <div className="text-[11px] uppercase tracking-widest text-slate-400 mt-3 mb-1 px-1">Column types</div>
        <div className="grid grid-cols-2 gap-1">
          {COLUMN_TYPE_META.map(t => (
            <button
              key={t.type}
              disabled={!ready}
              onClick={() => onAdd(name.trim(), t.type)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-left disabled:opacity-40 transition"
            >
              <span className={`h-5 w-5 rounded ${t.dot} shrink-0`} />
              <span className="text-xs text-slate-700">{t.label}</span>
            </button>
          ))}
        </div>
        {!ready && (
          <p className="text-[10px] text-slate-400 mt-2 px-1">Name the column first, then pick a type.</p>
        )}
      </div>
    </>
  )
}

// --- One task group: header, table, quick-add row, footer summary ------------
function GroupSection({
  group, color, tasks, columns, collapsed, onToggleCollapse,
  onDeleteGroup, selectable, onToggleSelect, onToggleSelectAll,
  onField, onStatus, onCustom, onDeleteTask,
  quickAddOpen, quickTitle, setQuickTitle, onQuickAddOpen, onQuickAddSubmit, onQuickAddCancel,
  pickerOpen, onPickerOpen, onAddColumn, onDeleteColumn,
  live, fileCounts, onFilesChanged, fileCountFor,
}) {
  const allSelected = tasks.length > 0 && tasks.every(t => selectable[t.id])
  const someSelected = tasks.some(t => selectable[t.id])

  // Footer summary: stacked status bar + due-date range pill.
  const statusCounts = { todo: 0, in_progress: 0, stuck: 0, done: 0 }
  tasks.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1 })
  const total = tasks.length
  const dueDates = tasks.map(t => t.due_date).filter(Boolean).sort()
  const dateRange = dueDates.length === 0
    ? '—'
    : dueDates.length === 1
      ? fmtDate(dueDates[0])
      : `${fmtDate(dueDates[0])} - ${fmtDate(dueDates[dueDates.length - 1])}`

  return (
    <section
      className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 mb-4 overflow-hidden"
      style={{ borderLeftColor: color }}
    >
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-slate-600 transition text-sm leading-none"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▸' : '▾'}
        </button>
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
        <h3 className="font-semibold text-[15px]" style={{ color }}>{group.name}</h3>
        <span className="text-xs text-slate-400">{total} {total === 1 ? 'task' : 'tasks'}</span>
        {!group.builtin && !group.orphan && (
          <button
            onClick={onDeleteGroup}
            className="ml-1 text-slate-300 hover:text-red-500 text-xs transition"
            title={`Delete group "${group.name}" (its tasks move to To-Do)`}
          >
            Delete group
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-200">
                  <th className="w-10 px-3 py-2 font-medium">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = !allSelected && someSelected }}
                      onChange={onToggleSelectAll}
                      className="h-4 w-4 accent-[#0073ea] cursor-pointer"
                      title="Select all in group"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium min-w-[200px]">Task</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Due date</th>
                  <th className="px-3 py-2 font-medium min-w-[140px]">Notes</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Phase</th>
                  <th className="px-3 py-2 font-medium">Files</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Last updated</th>
                  {columns.map(col => (
                    <th key={col.id} className="px-3 py-2 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-slate-500">
                        {col.name}
                        <button
                          onClick={() => onDeleteColumn(col)}
                          className="text-slate-300 hover:text-red-500 text-xs leading-none"
                          title={`Remove column "${col.name}"`}
                        >
                          ×
                        </button>
                      </span>
                    </th>
                  ))}
                  <th className="w-12 px-2 py-2">
                    <button
                      onClick={onPickerOpen}
                      className="h-6 w-6 rounded-full border border-slate-200 text-slate-400 hover:text-[#0073ea] hover:border-[#0085ff] transition text-sm leading-none"
                      title="Add column"
                    >
                      +
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={11 + columns.length} className="px-4 py-6 text-center">
                      <p className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg py-4">
                        Nothing here yet — add the first task below.
                      </p>
                    </td>
                  </tr>
                ) : tasks.map(task => {
                  const overdue = isOverdue(task)
                  const done = task.status === 'done'
                  return (
                    <tr key={task.id} className={`border-b border-slate-100 last:border-0 ${overdue ? 'bg-rose-50' : ''}`}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!!selectable[task.id]}
                          onChange={() => onToggleSelect(task.id)}
                          className="h-4 w-4 accent-[#0073ea] cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <EditableText
                          value={task.title}
                          onCommit={v => onField(task, { title: v })}
                          className={`font-medium ${done ? 'line-through text-slate-400' : 'text-slate-900'}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <EditableText
                          value={task.owner || ''}
                          onCommit={v => onField(task, { owner: v })}
                          className="text-slate-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill value={task.status} onChange={v => onStatus(task, v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="date"
                          value={task.due_date || ''}
                          onChange={e => onField(task, { due_date: e.target.value || null })}
                          className={`${inputCls} !py-0.5 ${overdue ? '!border-rose-300 text-rose-600' : 'text-slate-600'}`}
                        />
                        {overdue && (
                          <div className="text-[10px] text-rose-600 mt-0.5">Overdue</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <EditableText
                          value={task.notes || ''}
                          onCommit={v => onField(task, { notes: v })}
                          className="text-slate-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <PriorityPill value={task.priority} onChange={v => onField(task, { priority: v })} />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={task.modality || ''}
                          onChange={e => onField(task, { modality: e.target.value || null })}
                          className="text-[11px] rounded-full px-2 py-1 border outline-none cursor-pointer appearance-none bg-[#e8f1fd] text-[#0060c9] border-[#a9ccf7]"
                          title="Phase"
                        >
                          <option value="">—</option>
                          {MODALITIES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <FilesCell
                          task={task}
                          live={live}
                          fileCount={fileCountFor(task.id, null)}
                          onFilesChanged={onFilesChanged}
                        />
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                        {fmtDateTime(task.updated_at || task.created_at)}
                      </td>
                      {columns.map(col => (
                        <td key={col.id} className="px-3 py-2">
                          <CustomCell
                            col={col}
                            task={task}
                            live={live}
                            fileCount={fileCountFor(task.id, col.id)}
                            onPatch={patch => onCustom(task, patch)}
                            onFilesChanged={onFilesChanged}
                          />
                        </td>
                      ))}
                      <td className="w-10 px-2">
                        <button
                          onClick={() => onDeleteTask(task)}
                          className="text-slate-300 hover:text-red-500 text-xs transition"
                          title="Delete task"
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

          {/* Quick-add row */}
          <div className="px-4 py-2 border-t border-slate-100">
            {quickAddOpen ? (
              <input
                autoFocus
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                onBlur={() => { if (!quickTitle.trim()) onQuickAddCancel() }}
                onKeyDown={e => {
                  if (e.key === 'Enter') onQuickAddSubmit()
                  if (e.key === 'Escape') onQuickAddCancel()
                }}
                placeholder={`+ Add a task to ${group.name} — press Enter`}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#0085ff] outline-none text-slate-900 placeholder-slate-400"
              />
            ) : (
              <button
                onClick={onQuickAddOpen}
                className="text-xs text-slate-400 hover:text-[#0060c9] transition"
              >
                + Add task
              </button>
            )}
          </div>

          {/* Group footer summary */}
          <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-100 bg-slate-50/60">
            <div className="flex h-2 w-44 rounded-full overflow-hidden bg-slate-200">
              {total === 0 ? (
                <div className="h-full w-full bg-slate-200" />
              ) : (
                TASK_STATUSES.map(s => {
                  const n = statusCounts[s] || 0
                  if (!n) return null
                  return (
                    <div
                      key={s}
                      className="h-full"
                      style={{ width: `${(n / total) * 100}%`, background: STATUS_BAR_COLORS[s] }}
                      title={`${STATUS_META[s].label}: ${n}`}
                    />
                  )
                })
              )}
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-medium">
              {dateRange}
            </span>
          </div>
        </>
      )}
    </section>
  )
}

// --- Board ------------------------------------------------------------------
export default function TaskManager({ campaignId, live }) {
  const [tasks, setTasks] = useState([])
  const [columns, setColumns] = useState([])
  const [customGroups, setCustomGroups] = useState([])
  const [fileCounts, setFileCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [collapsed, setCollapsed] = useState({})
  const [selected, setSelected] = useState({})
  const [quickAddFor, setQuickAddFor] = useState(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const reload = async () => {
    const [t, c, g, counts] = await Promise.all([
      getTasks(campaignId),
      getTaskColumns(campaignId),
      getTaskGroups(campaignId),
      getTaskFileCounts(campaignId),
    ])
    setTasks(t.items)
    setColumns(c.items)
    setCustomGroups(g.items)
    setFileCounts(counts)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    reload()
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [campaignId])

  const fileCountFor = (taskId, columnId) =>
    fileCounts[`${taskId}:${columnId || ''}`] || 0

  const refreshCounts = async () => setFileCounts(await getTaskFileCounts(campaignId))

  // Groups: To-Do, custom (in position order), Completed — plus any orphan
  // group_name values found on tasks (defensive; shouldn't normally happen).
  const groups = useMemo(() => {
    const list = [
      { name: 'To-Do', builtin: true },
      ...customGroups.map(g => ({ name: g.name, id: g.id, builtin: false })),
      { name: 'Completed', builtin: true },
    ]
    const known = new Set(list.map(g => g.name))
    for (const t of tasks) {
      const gn = t.group_name || 'To-Do'
      if (!known.has(gn)) {
        known.add(gn)
        list.splice(list.length - 1, 0, { name: gn, builtin: false, orphan: true })
      }
    }
    return list
  }, [customGroups, tasks])

  const groupColor = (name) => {
    if (BUILTIN_GROUP_COLORS[name]) return BUILTIN_GROUP_COLORS[name]
    const idx = groups.findIndex(g => g.name === name)
    return CUSTOM_GROUP_PALETTE[Math.max(0, idx - 1) % CUSTOM_GROUP_PALETTE.length]
  }

  const matchesFilters = (t) => {
    if (search && !(t.title || '').toLowerCase().includes(search.toLowerCase())) return false
    if (ownerFilter !== 'all' && (t.owner || '') !== ownerFilter) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    return true
  }

  const tasksFor = (groupName) => tasks
    .filter(t => (t.group_name || 'To-Do') === groupName && matchesFilters(t))
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return (a.created_at || '').localeCompare(b.created_at || '')
    })

  const owners = useMemo(() => {
    const s = new Set()
    tasks.forEach(t => { if (t.owner) s.add(t.owner) })
    return [...s].sort()
  }, [tasks])

  const openCount = tasks.filter(t => t.status !== 'done').length
  const overdueCount = tasks.filter(isOverdue).length
  const selectedIds = Object.keys(selected).filter(id => selected[id])

  // --- Mutations -------------------------------------------------------------
  const handleField = async (task, patch) => {
    try {
      const updated = await updateTask({ campaignId, id: task.id, patch })
      if (updated) setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)))
    } catch (err) {
      setError(err.message)
    }
  }

  // Built-in Status column: Done auto-moves to Completed; reopening a done
  // task moves it back to To-Do.
  const handleStatus = async (task, status) => {
    let group_name = task.group_name || 'To-Do'
    if (status === 'done' && group_name !== 'Completed') group_name = 'Completed'
    else if (status !== 'done' && task.status === 'done' && group_name === 'Completed') group_name = 'To-Do'
    await handleField(task, { status, group_name })
  }

  const handleCustom = (task, patch) => {
    handleField(task, { custom: { ...(task.custom || {}), ...patch } })
  }

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? Its attached files will be deleted too.`)) return
    try {
      await deleteTask({ campaignId, id: task.id })
      setTasks(prev => prev.filter(t => t.id !== task.id))
      setSelected(prev => { const n = { ...prev }; delete n[task.id]; return n })
      refreshCounts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected tasks? Their attached files will be deleted too.`)) return
    try {
      for (const id of selectedIds) {
        await deleteTask({ campaignId, id })
      }
      setTasks(prev => prev.filter(t => !selected[t.id]))
      setSelected({})
      refreshCounts()
    } catch (err) {
      setError(err.message)
    }
  }

  const submitQuickAdd = async (groupName) => {
    const title = quickTitle.trim()
    if (!title) { setQuickAddFor(null); return }
    try {
      const item = await createTask({ campaignId, title, groupName })
      setTasks(prev => [...prev, item])
    } catch (err) {
      setError(err.message)
    } finally {
      setQuickAddFor(null)
      setQuickTitle('')
    }
  }

  const handleAddColumn = async (name, type) => {
    try {
      const col = await createTaskColumn({ campaignId, name, type })
      setColumns(prev => [...prev, col])
      setPickerOpen(false)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteColumn = async (col) => {
    if (!window.confirm(`Remove the "${col.name}" column? Values stored in it will no longer show.`)) return
    try {
      await deleteTaskColumn({ campaignId, id: col.id })
      setColumns(prev => prev.filter(c => c.id !== col.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const submitNewGroup = async () => {
    const name = newGroupName.trim()
    if (!name) { setAddingGroup(false); return }
    try {
      const g = await createTaskGroup({ campaignId, name })
      setCustomGroups(prev => [...prev, g])
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingGroup(false)
      setNewGroupName('')
    }
  }

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete the "${group.name}" group? Its tasks move to To-Do.`)) return
    try {
      await deleteTaskGroup({ campaignId, id: group.id, name: group.name })
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleSelect = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleSelectAll = (groupTasks) => {
    const all = groupTasks.length > 0 && groupTasks.every(t => selected[t.id])
    setSelected(prev => {
      const next = { ...prev }
      groupTasks.forEach(t => { if (all) delete next[t.id]; else next[t.id] = true })
      return next
    })
  }

  // --- Render -----------------------------------------------------------------
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="text-lg font-bold text-slate-900">Task manager</h2>
        <div className="text-xs text-slate-500">
          {openCount} open{overdueCount > 0 && (
            <span className="text-rose-600 font-medium"> · {overdueCount} overdue</span>
          )}
          {!live && <span className="text-amber-600"> · Sample data — tasks save on this device</span>}
        </div>
      </div>
      <p className="text-sm text-slate-600 mb-5">
        The practitioner's action list — who owns what, when it's due, where it's stuck.
        Mark a task Done and it moves to Completed on its own.
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => { setQuickAddFor('To-Do'); setQuickTitle('') }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0073ea] text-white hover:bg-[#0060c9] transition"
        >
          New task
        </button>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search"
          className={`${inputCls} w-40`}
        />
        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className={`${inputCls} text-slate-600`}>
          <option value="all">Person: all</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${inputCls} text-slate-600`}>
          <option value="all">Status: all</option>
          {TASK_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600/10 text-rose-700 border border-rose-600/20 hover:bg-rose-600/20 transition"
          >
            Delete ({selectedIds.length})
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : (
        <>
          {groups.map(group => (
            <GroupSection
              key={group.name}
              group={group}
              color={groupColor(group.name)}
              tasks={tasksFor(group.name)}
              columns={columns}
              collapsed={!!collapsed[group.name]}
              onToggleCollapse={() => setCollapsed(prev => ({ ...prev, [group.name]: !prev[group.name] }))}
              onDeleteGroup={() => handleDeleteGroup(group)}
              selectable={selected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={() => toggleSelectAll(tasksFor(group.name))}
              onField={handleField}
              onStatus={handleStatus}
              onCustom={handleCustom}
              onDeleteTask={handleDeleteTask}
              quickAddOpen={quickAddFor === group.name}
              quickTitle={quickTitle}
              setQuickTitle={setQuickTitle}
              onQuickAddOpen={() => { setQuickAddFor(group.name); setQuickTitle('') }}
              onQuickAddSubmit={() => submitQuickAdd(group.name)}
              onQuickAddCancel={() => { setQuickAddFor(null); setQuickTitle('') }}
              pickerOpen={pickerOpen}
              onPickerOpen={() => setPickerOpen(true)}
              onAddColumn={handleAddColumn}
              onDeleteColumn={handleDeleteColumn}
              live={live}
              fileCounts={fileCounts}
              onFilesChanged={refreshCounts}
              fileCountFor={fileCountFor}
            />
          ))}

          {/* Add new group */}
          <div className="mt-2">
            {addingGroup ? (
              <input
                autoFocus
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onBlur={() => { if (!newGroupName.trim()) setAddingGroup(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitNewGroup()
                  if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
                }}
                placeholder="Group name — press Enter"
                className="px-3 py-1.5 text-xs rounded-lg border border-[#0085ff] outline-none text-slate-900 placeholder-slate-400 bg-white w-64"
              />
            ) : (
              <button
                onClick={() => { setAddingGroup(true); setNewGroupName('') }}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600 hover:border-[#0085ff] hover:text-[#0060c9] transition bg-white"
              >
                + Add new group
              </button>
            )}
          </div>
        </>
      )}

      {pickerOpen && (
        <AddColumnPicker onAdd={handleAddColumn} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}
