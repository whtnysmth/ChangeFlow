import { supabase } from './supabase.js'
import * as mock from '../data/mockData.js'

// The bundle shape every widget expects. Supabase rows are reshaped
// to match mockData.js exactly, so widgets never care where data came from.
function mockBundle() {
  return {
    campaign: mock.campaign,
    healthMetrics: mock.healthMetrics,
    stakeholderGroups: mock.stakeholderGroups,
    milestones: mock.milestones,
    recentActivity: mock.recentActivity,
    sponsorCoalition: mock.sponsorCoalition,
    barrierAnalysis: mock.barrierAnalysis,
    quickWins: mock.quickWins,
    readinessScore: mock.readinessScore,
    sustainmentHealth: mock.sustainmentHealth
  }
}

async function supabaseBundle() {
  const { data: camp, error: campErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('state', 'Active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (campErr) throw campErr
  if (!camp) throw new Error('No active campaign found')

  const cid = camp.id
  const [
    { data: groups }, { data: metrics }, { data: miles },
    { data: acts }, { data: winRows }, { data: sponsorRows }
  ] = await Promise.all([
    supabase.from('stakeholder_groups').select('*').eq('campaign_id', cid),
    supabase.from('metrics').select('*').eq('campaign_id', cid),
    supabase.from('milestones').select('*').eq('campaign_id', cid).order('milestone_date'),
    supabase.from('activity').select('*').eq('campaign_id', cid).order('created_at', { ascending: false }),
    supabase.from('wins').select('*').eq('campaign_id', cid).order('win_date'),
    supabase.from('sponsors').select('*').eq('campaign_id', cid)
  ])

  const m = Object.fromEntries((metrics || []).map(r => [r.metric_key, r]))
  const extra = (k) => m[k]?.extra || {}

  const activeSponsors = (sponsorRows || []).filter(s => s.status === 'Active').length
  const sponsorScore = sponsorRows?.length
    ? Math.round((activeSponsors / sponsorRows.length) * 100)
    : 0

  return {
    campaign: {
      name: camp.name,
      status: camp.status,
      state: camp.state,
      start: camp.start_date,
      target: camp.target_date
    },
    healthMetrics: {
      adoptionRate: { value: Number(m.adoption_rate?.value), delta: m.adoption_rate?.delta_text },
      trainingCompletion: { value: Number(m.training_completion?.value), delta: m.training_completion?.delta_text },
      communicationsSent: {
        sent: Number(m.communications_sent?.value),
        total: extra('communications_sent').total,
        pending: extra('communications_sent').pending
      },
      openRisks: {
        percent: Number(m.open_risks?.value),
        highPriority: extra('open_risks').high_priority
      }
    },
    stakeholderGroups: (groups || []).map(g => ({
      name: g.group_name, percent: g.engagement_percent, count: g.engaged_count
    })),
    milestones: (miles || []).map(x => ({
      title: x.title, date: x.milestone_date, status: x.status
    })),
    recentActivity: (acts || []).map(a => ({
      text: a.text, meta: a.meta, tone: a.tone
    })),
    sponsorCoalition: {
      score: sponsorScore,
      sponsors: (sponsorRows || []).map(s => ({
        name: s.name, role: s.role, status: s.status
      }))
    },
    barrierAnalysis: extra('barrier_analysis').stages || [],
    quickWins: (winRows || []).map(w => ({
      title: w.title, date: w.win_date, impact: w.impact
    })),
    readinessScore: {
      value: Number(m.readiness_score?.value),
      note: m.readiness_score?.delta_text,
      dimensions: extra('readiness_score').dimensions || []
    },
    sustainmentHealth: {
      value: Number(m.sustainment_health?.value),
      trend: m.sustainment_health?.delta_text,
      reversionRate: extra('sustainment_health').reversion_rate
    },
    campaignId: cid
  }
}

export async function getDashboardData() {
  if (!supabase) return { source: 'mock', bundle: mockBundle(), campaignId: null }
  try {
    const bundle = await supabaseBundle()
    return { source: 'supabase', bundle, campaignId: bundle.campaignId }
  } catch (err) {
    console.warn('Supabase unreachable, falling back to mock data:', err.message)
    return { source: 'mock', bundle: mockBundle(), campaignId: null }
  }
}

// ---------------------------------------------------------------------------
// Phase documents: per-modality notes + file attachments.
// Same Supabase-then-fallback discipline as the dashboard bundle: live rows
// when reachable, localStorage notes-only when in mock mode (files need the
// live database + the changeflow-documents storage bucket).
// ---------------------------------------------------------------------------

export const DOCS_BUCKET = 'changeflow-documents'
export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB per file (bucket budget: 1 GB on free tier)

const docsKey = (campaignId, modality) =>
  `changeflow:phase-docs:${campaignId || 'mock'}:${modality}`

function readLocalDocs(campaignId, modality) {
  try {
    return JSON.parse(localStorage.getItem(docsKey(campaignId, modality)) || '[]')
  } catch {
    return []
  }
}

function writeLocalDocs(campaignId, modality, items) {
  try {
    localStorage.setItem(docsKey(campaignId, modality), JSON.stringify(items))
  } catch (err) {
    console.warn('Could not persist phase documents locally:', err.message)
  }
}

function localId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

const sanitizeFileName = (name) =>
  (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)

export async function getPhaseDocuments(campaignId, modality) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('phase_documents')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('modality', modality)
        .order('created_at', { ascending: false })
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('phase_documents unreachable, using local notes:', err.message)
    }
  }
  return { items: readLocalDocs(campaignId, modality), live: false }
}

export async function createPhaseDocument({ campaignId, modality, title, notes, file }) {
  if (file && file.size > MAX_FILE_BYTES) {
    throw new Error(`File is too large — the limit is ${MAX_FILE_BYTES / 1024 / 1024} MB per file.`)
  }
  const cleanTitle = (title || '').trim()
  if (!cleanTitle) throw new Error('Give this item a title.')

  // Live path: upload the file to storage, then insert the row.
  if (supabase) {
    let file_name = null, file_path = null, file_size = null, mime_type = null
    if (file) {
      file_name = file.name
      file_size = file.size
      mime_type = file.type || null
      file_path = `${campaignId}/${modality}/${localId()}-${sanitizeFileName(file.name)}`
      const { error: upErr } = await supabase.storage
        .from(DOCS_BUCKET)
        .upload(file_path, file)
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
    }
    const { data, error } = await supabase
      .from('phase_documents')
      .insert({
        campaign_id: campaignId,
        modality,
        title: cleanTitle,
        notes: (notes || '').trim() || null,
        file_name, file_path, file_size, mime_type,
      })
      .select()
      .single()
    if (error) {
      // Roll back the orphaned file so storage doesn't fill with unlinked uploads.
      if (file_path) await supabase.storage.from(DOCS_BUCKET).remove([file_path]).catch(() => {})
      throw new Error(`Could not save: ${error.message}`)
    }
    return data
  }

  // Mock/offline path: notes-only, persisted on this device.
  const item = {
    id: localId(),
    campaign_id: campaignId,
    modality,
    title: cleanTitle,
    notes: (notes || '').trim() || null,
    file_name: null, file_path: null, file_size: null, mime_type: null,
    created_at: new Date().toISOString(),
    local: true,
  }
  const items = readLocalDocs(campaignId, modality)
  writeLocalDocs(campaignId, modality, [item, ...items])
  return item
}

export async function deletePhaseDocument({ campaignId, modality, id, filePath }) {
  if (supabase) {
    if (filePath) {
      await supabase.storage.from(DOCS_BUCKET).remove([filePath]).catch(() => {})
    }
    const { error } = await supabase.from('phase_documents').delete().eq('id', id)
    if (error) throw new Error(`Could not delete: ${error.message}`)
    return
  }
  writeLocalDocs(campaignId, modality,
    readLocalDocs(campaignId, modality).filter(d => d.id !== id))
}

// Signed download URL for a private-bucket file (1-hour expiry).
export async function getDocumentUrl(filePath) {
  if (!supabase || !filePath) return null
  const { data, error } = await supabase.storage
    .from(DOCS_BUCKET)
    .createSignedUrl(filePath, 3600)
  if (error) {
    console.warn('Could not create download link:', error.message)
    return null
  }
  return data.signedUrl
}

// ---------------------------------------------------------------------------
// Tasks: lightweight task manager (Monday-lite) for the change practitioner.
// Same Supabase-then-localStorage discipline as phase documents: live rows
// when reachable, local-only items in mock mode. Graceful when the table
// doesn't exist yet (Whitney runs migration-003 in the SQL editor).
// ---------------------------------------------------------------------------

const tasksKey = (campaignId) => `changeflow:tasks:${campaignId || 'mock'}`

function readLocalTasks(campaignId) {
  try {
    return JSON.parse(localStorage.getItem(tasksKey(campaignId)) || '[]')
  } catch {
    return []
  }
}

function writeLocalTasks(campaignId, items) {
  try {
    localStorage.setItem(tasksKey(campaignId), JSON.stringify(items))
  } catch (err) {
    console.warn('Could not persist tasks locally:', err.message)
  }
}

export const TASK_STATUSES = ['todo', 'in_progress', 'stuck', 'done']
export const TASK_PRIORITIES = ['low', 'medium', 'high']

export async function getTasks(campaignId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('tasks unreachable, using local tasks:', err.message)
    }
  }
  return { items: readLocalTasks(campaignId), live: false }
}

export async function createTask({ campaignId, title, modality, status, owner, dueDate, priority, notes, groupName }) {
  const cleanTitle = (title || '').trim()
  if (!cleanTitle) throw new Error('Give this task a title.')
  const row = {
    title: cleanTitle,
    modality: modality || null,
    status: TASK_STATUSES.includes(status) ? status : 'todo',
    owner: (owner || '').trim() || null,
    due_date: dueDate || null,
    priority: TASK_PRIORITIES.includes(priority) ? priority : 'medium',
    notes: (notes || '').trim() || null,
    group_name: groupName || 'To-Do',
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ campaign_id: campaignId, ...row })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('tasks insert failed, saving locally:', err.message)
    }
  }

  const item = {
    id: localId(),
    campaign_id: campaignId,
    ...row,
    custom: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    local: true,
  }
  const items = readLocalTasks(campaignId)
  writeLocalTasks(campaignId, [...items, item])
  return item
}

export async function updateTask({ campaignId, id, patch }) {
  const allowed = ['title', 'modality', 'status', 'owner', 'due_date', 'priority', 'notes', 'group_name', 'custom']
  const clean = {}
  for (const k of allowed) {
    if (patch[k] !== undefined) clean[k] = patch[k] === '' ? null : patch[k]
  }
  if (clean.title !== undefined && !(clean.title || '').trim()) {
    throw new Error('Give this task a title.')
  }
  // Last updated is automatic: every edit stamps the row.
  clean.updated_at = new Date().toISOString()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(clean)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('tasks update failed, applying locally:', err.message)
    }
  }

  const items = readLocalTasks(campaignId)
  const next = items.map(t => (t.id === id ? { ...t, ...clean } : t))
  writeLocalTasks(campaignId, next)
  return next.find(t => t.id === id)
}

export async function deleteTask({ campaignId, id }) {
  if (supabase) {
    // Remove attached files from storage first (task_files rows cascade).
    try {
      const { data: files } = await supabase
        .from('task_files')
        .select('file_path')
        .eq('task_id', id)
      const paths = (files || []).map(f => f.file_path).filter(Boolean)
      if (paths.length) {
        await supabase.storage.from(DOCS_BUCKET).remove(paths).catch(() => {})
      }
    } catch {
      // task_files may not exist yet (pre-migration-005) — still delete the row.
    }
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      return
    } catch (err) {
      console.warn('tasks delete failed, deleting locally:', err.message)
    }
  }
  writeLocalTasks(campaignId, readLocalTasks(campaignId).filter(t => t.id !== id))
}

// Move every task in one group to another (used when deleting a custom group).
export async function moveGroupTasks({ campaignId, from, to }) {
  const stamp = new Date().toISOString()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ group_name: to, updated_at: stamp })
        .eq('campaign_id', campaignId)
        .eq('group_name', from)
      if (error) throw error
      return
    } catch (err) {
      console.warn('moveGroupTasks failed remotely, applying locally:', err.message)
    }
  }
  writeLocalTasks(campaignId,
    readLocalTasks(campaignId).map(t =>
      t.group_name === from ? { ...t, group_name: to, updated_at: stamp } : t))
}

// ---------------------------------------------------------------------------
// Task board: custom columns, custom groups, task file attachments.
// Same Supabase-then-localStorage discipline. Graceful when migration-005
// hasn't been run yet (Whitney runs it in the SQL editor).
// ---------------------------------------------------------------------------

export const TASK_COLUMN_TYPES = ['status', 'text', 'people', 'date', 'numbers', 'files', 'checkbox', 'priority']

const taskColsKey = (campaignId) => `changeflow:task-columns:${campaignId || 'mock'}`

function readLocalTaskCols(campaignId) {
  try {
    return JSON.parse(localStorage.getItem(taskColsKey(campaignId)) || '[]')
  } catch {
    return []
  }
}

function writeLocalTaskCols(campaignId, items) {
  try {
    localStorage.setItem(taskColsKey(campaignId), JSON.stringify(items))
  } catch (err) {
    console.warn('Could not persist task columns locally:', err.message)
  }
}

export async function getTaskColumns(campaignId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('task_columns')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: true })
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('task_columns unreachable, using local:', err.message)
    }
  }
  return { items: readLocalTaskCols(campaignId), live: false }
}

export async function createTaskColumn({ campaignId, name, type }) {
  const cleanName = (name || '').trim()
  if (!cleanName) throw new Error('Name this column.')
  if (!TASK_COLUMN_TYPES.includes(type)) throw new Error('Unknown column type.')

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('task_columns')
        .select('position')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: false })
        .limit(1)
      const position = existing && existing.length ? (existing[0].position || 0) + 1 : 0
      const { data, error } = await supabase
        .from('task_columns')
        .insert({ campaign_id: campaignId, name: cleanName, type, position })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('task_columns insert failed, saving locally:', err.message)
    }
  }

  const items = readLocalTaskCols(campaignId)
  const item = {
    id: localId(),
    campaign_id: campaignId,
    name: cleanName,
    type,
    options: {},
    position: items.length,
    created_at: new Date().toISOString(),
    local: true,
  }
  writeLocalTaskCols(campaignId, [...items, item])
  return item
}

export async function deleteTaskColumn({ campaignId, id }) {
  if (supabase) {
    try {
      const { error } = await supabase.from('task_columns').delete().eq('id', id)
      if (error) throw error
      return
    } catch (err) {
      console.warn('task_columns delete failed, deleting locally:', err.message)
    }
  }
  writeLocalTaskCols(campaignId, readLocalTaskCols(campaignId).filter(c => c.id !== id))
}

const taskGroupsKey = (campaignId) => `changeflow:task-groups:${campaignId || 'mock'}`

function readLocalTaskGroups(campaignId) {
  try {
    return JSON.parse(localStorage.getItem(taskGroupsKey(campaignId)) || '[]')
  } catch {
    return []
  }
}

function writeLocalTaskGroups(campaignId, items) {
  try {
    localStorage.setItem(taskGroupsKey(campaignId), JSON.stringify(items))
  } catch (err) {
    console.warn('Could not persist task groups locally:', err.message)
  }
}

export async function getTaskGroups(campaignId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('task_groups')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: true })
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('task_groups unreachable, using local:', err.message)
    }
  }
  return { items: readLocalTaskGroups(campaignId), live: false }
}

export async function createTaskGroup({ campaignId, name }) {
  const cleanName = (name || '').trim()
  if (!cleanName) throw new Error('Name this group.')
  if (['To-Do', 'Completed'].includes(cleanName)) {
    throw new Error('That group already exists.')
  }

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('task_groups')
        .select('position')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: false })
        .limit(1)
      const position = existing && existing.length ? (existing[0].position || 0) + 1 : 0
      const { data, error } = await supabase
        .from('task_groups')
        .insert({ campaign_id: campaignId, name: cleanName, position })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('task_groups insert failed, saving locally:', err.message)
    }
  }

  const items = readLocalTaskGroups(campaignId)
  if (items.some(g => g.name === cleanName)) throw new Error('That group already exists.')
  const item = {
    id: localId(),
    campaign_id: campaignId,
    name: cleanName,
    position: items.length,
    created_at: new Date().toISOString(),
    local: true,
  }
  writeLocalTaskGroups(campaignId, [...items, item])
  return item
}

export async function deleteTaskGroup({ campaignId, id, name }) {
  // Its tasks fall back to To-Do rather than being deleted.
  await moveGroupTasks({ campaignId, from: name, to: 'To-Do' })
  if (supabase) {
    try {
      const { error } = await supabase.from('task_groups').delete().eq('id', id)
      if (error) throw error
      return
    } catch (err) {
      console.warn('task_groups delete failed, deleting locally:', err.message)
    }
  }
  writeLocalTaskGroups(campaignId, readLocalTaskGroups(campaignId).filter(g => g.id !== id))
}

// ---------------------------------------------------------------------------
// Task file attachments. Files live in the changeflow-documents bucket under
// {campaignId}/tasks/{taskId}/… and are downloaded via signed URLs.
// In mock mode file upload is unavailable (needs the live database).
// ---------------------------------------------------------------------------

export async function getTaskFiles(taskId, columnId = null) {
  if (!supabase || !taskId) return []
  try {
    let q = supabase
      .from('task_files')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    q = columnId ? q.eq('column_id', columnId) : q.is('column_id', null)
    const { data, error } = await q
    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('task_files unreachable:', err.message)
    return []
  }
}

export async function getTaskFileCounts(campaignId) {
  if (!supabase) return {}
  try {
    const { data, error } = await supabase
      .from('task_files')
      .select('task_id, column_id')
      .eq('campaign_id', campaignId)
    if (error) throw error
    // Keyed `${taskId}:${columnId || ''}` so built-in and custom Files
    // columns each show their own count badge.
    const counts = {}
    for (const r of data || []) {
      const k = `${r.task_id}:${r.column_id || ''}`
      counts[k] = (counts[k] || 0) + 1
    }
    return counts
  } catch {
    return {}
  }
}

export async function attachTaskFile({ campaignId, taskId, columnId = null, file }) {
  if (!supabase) throw new Error('File upload needs the live database.')
  if (!file) throw new Error('Choose a file first.')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File is too large — the limit is ${MAX_FILE_BYTES / 1024 / 1024} MB per file.`)
  }
  const file_path = `${campaignId}/tasks/${taskId}/${localId()}-${sanitizeFileName(file.name)}`
  const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(file_path, file)
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
  const { data, error } = await supabase
    .from('task_files')
    .insert({
      campaign_id: campaignId,
      task_id: taskId,
      column_id: columnId,
      file_name: file.name,
      file_path,
      file_size: file.size,
      mime_type: file.type || null,
    })
    .select()
    .single()
  if (error) {
    // Roll back the orphaned file so storage doesn't fill with unlinked uploads.
    await supabase.storage.from(DOCS_BUCKET).remove([file_path]).catch(() => {})
    throw new Error(`Could not save file: ${error.message}`)
  }
  return data
}

export async function deleteTaskFile({ id, filePath }) {
  if (supabase) {
    if (filePath) {
      await supabase.storage.from(DOCS_BUCKET).remove([filePath]).catch(() => {})
    }
    const { error } = await supabase.from('task_files').delete().eq('id', id)
    if (error) throw new Error(`Could not delete file: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Events: practitioner calendar events for the Calendar tab.
// Same Supabase-then-localStorage discipline as tasks: live rows when
// reachable, local-only items in mock mode. Graceful when the table
// doesn't exist yet (Whitney runs migration-004 in the SQL editor).
// ---------------------------------------------------------------------------

const eventsKey = (campaignId) => `changeflow:events:${campaignId || 'mock'}`

function readLocalEvents(campaignId) {
  try {
    return JSON.parse(localStorage.getItem(eventsKey(campaignId)) || '[]')
  } catch {
    return []
  }
}

function writeLocalEvents(campaignId, items) {
  try {
    localStorage.setItem(eventsKey(campaignId), JSON.stringify(items))
  } catch (err) {
    console.warn('Could not persist events locally:', err.message)
  }
}

export async function getEvents(campaignId, startISO, endISO) {
  if (supabase) {
    try {
      let q = supabase
        .from('events')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('starts_at', { ascending: true })
      if (startISO) q = q.gte('starts_at', startISO)
      if (endISO) q = q.lt('starts_at', endISO)
      const { data, error } = await q
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('events unreachable, using local events:', err.message)
    }
  }
  const items = readLocalEvents(campaignId)
    .filter(e => (!startISO || e.starts_at >= startISO) && (!endISO || e.starts_at < endISO))
    .sort((a, b) => (a.starts_at || '').localeCompare(b.starts_at || ''))
  return { items, live: false }
}

export async function createEvent({ campaignId, title, modality, description, startsAt, endsAt }) {
  const cleanTitle = (title || '').trim()
  if (!cleanTitle) throw new Error('Give this event a title.')
  if (!startsAt) throw new Error('Pick a date for this event.')
  const row = {
    title: cleanTitle,
    modality: modality || null,
    description: (description || '').trim() || null,
    starts_at: startsAt,
    ends_at: endsAt || null,
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({ campaign_id: campaignId, ...row })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('events insert failed, saving locally:', err.message)
    }
  }

  const item = {
    id: localId(),
    campaign_id: campaignId,
    ...row,
    created_at: new Date().toISOString(),
    local: true,
  }
  const items = readLocalEvents(campaignId)
  writeLocalEvents(campaignId, [...items, item])
  return item
}

export async function deleteEvent({ campaignId, id }) {
  if (supabase) {
    try {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
      return
    } catch (err) {
      console.warn('events delete failed, deleting locally:', err.message)
    }
  }
  writeLocalEvents(campaignId, readLocalEvents(campaignId).filter(e => e.id !== id))
}
