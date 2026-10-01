import { supabase } from './supabase.js'
import * as mock from '../data/mockData.js'

const MOCK_NAME_KEY = 'changeflow:mock-campaign-name'

export function getMockCampaignName() {
  try { return localStorage.getItem(MOCK_NAME_KEY) || null } catch { return null }
}

// The bundle shape every widget expects. Supabase rows are reshaped
// to match mockData.js exactly, so widgets never care where data came from.
function mockBundle() {
  return {
    campaign: { ...mock.campaign, name: getMockCampaignName() || mock.campaign.name },
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

async function supabaseBundle(campaignId) {
  let camp, campErr
  if (campaignId) {
    ;({ data: camp, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle())
  } else {
    ;({ data: camp, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('state', 'Active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle())
  }
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
      id: g.id, group: g.group_name, percent: g.engagement_percent, engaged: g.engaged_count
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

export async function getDashboardData(campaignId) {
  if (!supabase) {
    const bundle = mockBundle()
    return { source: 'mock', bundle: applyOverrides(bundle, 'mock'), campaignId: null }
  }
  try {
    const bundle = await supabaseBundle(campaignId)
    const key = bundle.campaignId || 'mock'
    return { source: 'supabase', bundle: applyOverrides(bundle, key), campaignId: bundle.campaignId }
  } catch (err) {
    console.warn('Supabase unreachable, falling back to mock data:', err.message)
    const bundle = mockBundle()
    return { source: 'mock', bundle: applyOverrides(bundle, 'mock'), campaignId: null }
  }
}

// ---------------------------------------------------------------------------
// Assess pilot: source-data editing. Widgets are no longer read-only — the
// stakeholder groups and readiness score behind the Assess widgets can be
// inspected and edited in-app. Writes go to Supabase when live; a
// localStorage override is written first so edits survive offline and are
// applied on top of the bundle at load. The override clears once the
// Supabase write succeeds.
// ---------------------------------------------------------------------------
const OVERRIDES_KEY = 'changeflow:data-overrides'

function readOverrides() {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeOverride(campaignKey, key, value) {
  try {
    const o = readOverrides()
    o[campaignKey] = { ...(o[campaignKey] || {}), [key]: value }
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o))
  } catch { /* private mode */ }
}

function clearOverride(campaignKey, key) {
  try {
    const o = readOverrides()
    if (o[campaignKey]) {
      delete o[campaignKey][key]
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o))
    }
  } catch { /* private mode */ }
}

function applyOverrides(bundle, campaignKey) {
  const o = readOverrides()[campaignKey] || {}
  if (o.stakeholderGroups) bundle.stakeholderGroups = o.stakeholderGroups
  if (o.readinessScore) bundle.readinessScore = o.readinessScore
  return bundle
}

export async function saveStakeholderGroups(campaignId, groups) {
  const key = campaignKeyOf(campaignId)
  const clean = groups
    .map((g, i) => ({
      id: g.id || `local-${Date.now()}-${i}`,
      group: String(g.group || '').trim(),
      percent: Math.max(0, Math.min(100, Number(g.percent) || 0)),
      engaged: Math.max(0, Math.round(Number(g.engaged) || 0))
    }))
    .filter(g => g.group)
  writeOverride(key, 'stakeholderGroups', clean)
  if (supabase && campaignId) {
    const { error: delErr } = await supabase.from('stakeholder_groups').delete().eq('campaign_id', campaignId)
    if (delErr) throw delErr
    if (clean.length) {
      const { error: insErr } = await supabase.from('stakeholder_groups').insert(
        clean.map(g => ({
          campaign_id: campaignId,
          group_name: g.group,
          engagement_percent: g.percent,
          engaged_count: g.engaged
        }))
      )
      if (insErr) throw insErr
    }
    clearOverride(key, 'stakeholderGroups')
  }
  return clean
}

export async function saveReadinessScore(campaignId, { value, note, dimensions }) {
  const key = campaignKeyOf(campaignId)
  const clean = {
    value: Math.max(0, Math.min(100, Number(value) || 0)),
    note: String(note || '').trim(),
    dimensions: (dimensions || [])
      .map(d => ({
        label: String(d.label || '').trim(),
        value: Math.max(0, Math.min(100, Number(d.value) || 0)),
        description: String(d.description || '').trim(),
        guidance: String(d.guidance || '').trim()
      }))
      .filter(d => d.label)
  }
  writeOverride(key, 'readinessScore', clean)
  if (supabase && campaignId) {
    const row = {
      campaign_id: campaignId,
      metric_key: 'readiness_score',
      value: clean.value,
      delta_text: clean.note,
      extra: { dimensions: clean.dimensions }
    }
    const { data: existing } = await supabase
      .from('metrics')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('metric_key', 'readiness_score')
      .maybeSingle()
    const { error } = existing
      ? await supabase.from('metrics').update(row).eq('id', existing.id)
      : await supabase.from('metrics').insert(row)
    if (error) throw error
    clearOverride(key, 'readinessScore')
  }
  return clean
}

function campaignKeyOf(campaignId) {
  return campaignId || 'mock'
}

// ---------------------------------------------------------------------------
// Campaign workspace: list, create, and remember the active campaign.
// Every tab in the app re-scopes to the active campaign via campaign_id.
// ---------------------------------------------------------------------------

const ACTIVE_CAMPAIGN_KEY = 'changeflow:active-campaign'

export function getStoredCampaignId() {
  try {
    return localStorage.getItem(ACTIVE_CAMPAIGN_KEY)
  } catch {
    return null
  }
}

export function setStoredCampaignId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_CAMPAIGN_KEY, id)
    else localStorage.removeItem(ACTIVE_CAMPAIGN_KEY)
  } catch {
    /* private mode */
  }
}

export async function listCampaigns() {
  if (!supabase) {
    return [
      {
        id: 'mock',
        name: getMockCampaignName() || mock.campaign.name,
        status: mock.campaign.status,
        state: 'Active',
        start_date: null,
        target_date: null,
      },
    ]
  }
  const { data, error } = await supabase
    .from('campaigns')
    .select('id,name,status,state,start_date,target_date,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createCampaign({ name, status, start_date, target_date }) {
  if (!supabase) throw new Error('Connect Supabase to create campaigns.')
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name: name.trim(),
      status: status || 'On Track',
      state: 'Active',
      start_date: start_date || null,
      target_date: target_date || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Rename a campaign. The name is a single record, so every surface that
// shows it (header, campaign cards, switcher) updates from one write.
// Supabase when live; a localStorage override for the mock campaign.
export async function renameCampaign(campaignId, name) {
  const clean = String(name || '').trim()
  if (!clean) throw new Error('Campaign name cannot be empty.')
  if (supabase && campaignId && campaignId !== 'mock') {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ name: clean })
      .eq('id', campaignId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  try { localStorage.setItem(MOCK_NAME_KEY, clean) } catch { /* private mode */ }
  return { id: 'mock', name: clean }
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

export async function createEvent({ campaignId, title, modality, description, startsAt, endsAt, meetingUrl }) {
  const cleanTitle = (title || '').trim()
  if (!cleanTitle) throw new Error('Give this event a title.')
  if (!startsAt) throw new Error('Pick a date for this event.')
  const cleanLink = (meetingUrl || '').trim()
  const row = {
    title: cleanTitle,
    modality: modality || null,
    description: (description || '').trim() || null,
    meeting_url: cleanLink ? (/^https?:\/\//i.test(cleanLink) ? cleanLink : `https://${cleanLink}`) : null,
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

// ---------------------------------------------------------------------------
// Library documents: direct uploads for the Documents tab (central library).
// Same Supabase-then-localStorage discipline. File upload needs the live
// database; metadata falls back to localStorage in mock mode.
// ---------------------------------------------------------------------------

const libraryDocsKey = (campaignId) => `changeflow:library-docs:${campaignId || 'mock'}`

function readLocalLibraryDocs(campaignId) {
  try {
    return JSON.parse(localStorage.getItem(libraryDocsKey(campaignId)) || '[]')
  } catch {
    return []
  }
}

function writeLocalLibraryDocs(campaignId, items) {
  try {
    localStorage.setItem(libraryDocsKey(campaignId), JSON.stringify(items))
  } catch (err) {
    console.warn('Could not persist library documents locally:', err.message)
  }
}

export async function getLibraryDocuments(campaignId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('library_documents')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('library_documents unreachable, using local library:', err.message)
    }
  }
  return { items: readLocalLibraryDocs(campaignId), live: false }
}

export async function createLibraryDocument({ campaignId, file, title, modality, taskId }) {
  if (!supabase) throw new Error('File upload needs the live database.')
  if (!file) throw new Error('Choose a file first.')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File is too large — the limit is ${MAX_FILE_BYTES / 1024 / 1024} MB per file.`)
  }
  const file_path = `${campaignId}/library/${localId()}-${sanitizeFileName(file.name)}`
  const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(file_path, file)
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
  const { data, error } = await supabase
    .from('library_documents')
    .insert({
      campaign_id: campaignId,
      title: (title || '').trim() || file.name,
      file_name: file.name,
      file_path,
      file_size: file.size,
      mime_type: file.type || null,
      modality: modality || null,
      task_id: taskId || null,
    })
    .select()
    .single()
  if (error) {
    // Roll back the orphaned file so storage doesn't fill with unlinked uploads.
    await supabase.storage.from(DOCS_BUCKET).remove([file_path]).catch(() => {})
    throw new Error(`Could not save document: ${error.message}`)
  }
  return data
}

export async function deleteLibraryDocument({ campaignId, id, filePath }) {
  if (supabase) {
    if (filePath) {
      await supabase.storage.from(DOCS_BUCKET).remove([filePath]).catch(() => {})
    }
    const { error } = await supabase.from('library_documents').delete().eq('id', id)
    if (error) throw new Error(`Could not delete: ${error.message}`)
    return
  }
  writeLocalLibraryDocs(campaignId,
    readLocalLibraryDocs(campaignId).filter(d => d.id !== id))
}

// All documents in the app, normalized into one list for the Documents tab.
// Sources: library_documents (direct uploads) + phase_documents (per-phase
// notes uploads, files only) + task_files (board attachments). Newest first.
export async function getAllDocuments(campaignId) {
  const docs = []
  if (supabase) {
    // Phase documents (only rows that actually have a file attached).
    try {
      const { data, error } = await supabase
        .from('phase_documents')
        .select('*')
        .eq('campaign_id', campaignId)
        .not('file_path', 'is', null)
      if (error) throw error
      for (const r of data || []) {
        docs.push({
          key: `phase:${r.id}`, source: 'phase', id: r.id,
          name: r.title || r.file_name, size: r.file_size, mime: r.mime_type,
          path: r.file_path, modality: r.modality, taskTitle: null,
          createdAt: r.created_at, campaignId,
        })
      }
    } catch (err) {
      console.warn('phase_documents unavailable for library:', err.message)
    }
    // Task files (join the task title for the source badge).
    try {
      const { data, error } = await supabase
        .from('task_files')
        .select('*, tasks(title)')
        .eq('campaign_id', campaignId)
      if (error) throw error
      for (const r of data || []) {
        docs.push({
          key: `task:${r.id}`, source: 'task', id: r.id,
          name: r.file_name, size: r.file_size, mime: r.mime_type,
          path: r.file_path, modality: null,
          taskTitle: r.tasks?.title || 'a task',
          createdAt: r.created_at, campaignId,
        })
      }
    } catch (err) {
      console.warn('task_files unavailable for library:', err.message)
    }
    // Library documents.
    try {
      const { data, error } = await supabase
        .from('library_documents')
        .select('*, tasks(title)')
        .eq('campaign_id', campaignId)
      if (error) throw error
      for (const r of data || []) {
        docs.push({
          key: `library:${r.id}`, source: 'library', id: r.id,
          name: r.title || r.file_name, size: r.file_size, mime: r.mime_type,
          path: r.file_path, modality: r.modality,
          taskTitle: r.tasks?.title || null,
          createdAt: r.created_at, campaignId,
        })
      }
    } catch (err) {
      console.warn('library_documents unavailable:', err.message)
    }
  } else {
    // Mock/offline mode: only local library metadata is known. File upload
    // is disabled offline, so local rows carry no downloadable file.
    for (const r of readLocalLibraryDocs(campaignId)) {
      docs.push({
        key: `library:${r.id}`, source: 'library', id: r.id,
        name: r.title || r.file_name, size: r.file_size, mime: r.mime_type,
        path: r.file_path, modality: r.modality, taskTitle: r.taskTitle || null,
        createdAt: r.created_at, campaignId,
      })
    }
  }
  docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  return docs
}

// ---------------------------------------------------------------------------
// Maps: the Mapping tab — stakeholder / journey / process / impact maps.
// Each map is a link (live board URL), an upload (snapshot image/PDF), or
// native (created in ChangeFlow with a structured editor). Same
// Supabase-then-localStorage discipline as the rest of the app. Graceful
// when the table doesn't exist yet (Whitney runs migration-007 in the SQL
// editor).
// ---------------------------------------------------------------------------

export const MAP_TYPES = ['stakeholder', 'journey', 'process', 'impact']
export const MAP_SOURCES = ['link', 'upload', 'native']

const mapsKey = (campaignId) => `changeflow:maps:${campaignId || 'mock'}`

function readLocalMaps(campaignId) {
  try {
    return JSON.parse(localStorage.getItem(mapsKey(campaignId)) || '[]')
  } catch {
    return []
  }
}

function writeLocalMaps(campaignId, items) {
  try {
    localStorage.setItem(mapsKey(campaignId), JSON.stringify(items))
  } catch { /* private mode */ }
}

export async function getMaps(campaignId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('maps unreachable, using local maps:', err.message)
    }
  }
  return { items: readLocalMaps(campaignId), live: false }
}

const ALLOWED_MAP_FIELDS = [
  'title', 'map_type', 'source', 'url',
  'file_name', 'file_path', 'file_size', 'mime_type',
  'modality', 'description', 'content',
]

function cleanMapPatch(patch) {
  const clean = {}
  for (const k of ALLOWED_MAP_FIELDS) {
    if (patch[k] !== undefined) clean[k] = patch[k] === '' ? null : patch[k]
  }
  if (clean.title !== undefined && !(clean.title || '').trim()) {
    throw new Error('Give this map a title.')
  }
  return clean
}

export async function createMap({ campaignId, title, mapType, source, url, file, modality, description, content }) {
  if (!title || !title.trim()) throw new Error('Give this map a title.')
  if (!MAP_TYPES.includes(mapType)) throw new Error('Pick a map type.')
  if (!MAP_SOURCES.includes(source)) throw new Error('Pick how this map is created.')

  const now = new Date().toISOString()
  const row = {
    campaign_id: campaignId,
    title: title.trim(),
    map_type: mapType,
    source,
    url: source === 'link' ? (url || '').trim() || null : null,
    modality: modality || null,
    description: (description || '').trim() || null,
    content: content || {},
    created_at: now,
    updated_at: now,
  }

  // Uploads need the live connection; link/native maps work offline.
  if (source === 'upload') {
    if (!supabase) throw new Error('File upload needs the live database.')
    if (!file) throw new Error('Choose a file first.')
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`File is too large — the limit is ${MAX_FILE_BYTES / 1024 / 1024} MB per file.`)
    }
    const file_path = `${campaignId}/maps/${localId()}-${sanitizeFileName(file.name)}`
    const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(file_path, file)
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
    row.file_name = file.name
    row.file_path = file_path
    row.file_size = file.size
    row.mime_type = file.type || null
    try {
      const { data, error } = await supabase.from('maps').insert(row).select().single()
      if (error) throw error
      return data
    } catch (err) {
      // Roll back the orphaned file so storage doesn't fill with unlinked uploads.
      await supabase.storage.from(DOCS_BUCKET).remove([file_path]).catch(() => {})
      throw new Error(`Could not save map: ${err.message}`)
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('maps').insert(row).select().single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('maps insert failed, saving locally:', err.message)
    }
  }

  const local = { ...row, id: localId() }
  const items = readLocalMaps(campaignId)
  items.unshift(local)
  writeLocalMaps(campaignId, items)
  return local
}

export async function updateMap({ campaignId, id, patch }) {
  const clean = cleanMapPatch(patch)
  clean.updated_at = new Date().toISOString()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('maps')
        .update(clean)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('maps update failed, applying locally:', err.message)
    }
  }

  const items = readLocalMaps(campaignId)
  const next = items.map(m => (m.id === id ? { ...m, ...clean } : m))
  writeLocalMaps(campaignId, next)
  return next.find(m => m.id === id)
}

export async function deleteMap({ campaignId, id, filePath }) {
  if (supabase) {
    if (filePath) {
      await supabase.storage.from(DOCS_BUCKET).remove([filePath]).catch(() => {})
    }
    const { error } = await supabase.from('maps').delete().eq('id', id)
    if (error) throw new Error(`Could not delete map: ${error.message}`)
    return
  }
  writeLocalMaps(campaignId, readLocalMaps(campaignId).filter(m => m.id !== id))
}

// ============================================================================
// Surveys hub: link live surveys, import CSV responses.
// Supabase first, localStorage fallback — same discipline as the rest of the app.
// ============================================================================

export const SURVEY_SOURCES = ['link', 'csv']
export const SURVEY_TOOLS = ['google_forms', 'ms_forms', 'surveymonkey', 'typeform', 'other']

export const SURVEY_TOOL_LABELS = {
  google_forms: 'Google Forms',
  ms_forms: 'Microsoft Forms',
  surveymonkey: 'SurveyMonkey',
  typeform: 'Typeform',
  other: 'Other',
}

const surveysKey = (campaignId) => `changeflow:surveys:${campaignId || 'mock'}`
const surveyResponsesKey = (surveyId) => `changeflow:survey-responses:${surveyId}`

function readLocalSurveys(campaignId) {
  try {
    return JSON.parse(localStorage.getItem(surveysKey(campaignId)) || '[]')
  } catch { return [] }
}

function writeLocalSurveys(campaignId, items) {
  localStorage.setItem(surveysKey(campaignId), JSON.stringify(items))
}

function readLocalResponses(surveyId) {
  try {
    return JSON.parse(localStorage.getItem(surveyResponsesKey(surveyId)) || '[]')
  } catch { return [] }
}

function writeLocalResponses(surveyId, items) {
  localStorage.setItem(surveyResponsesKey(surveyId), JSON.stringify(items))
}

export async function getSurveys(campaignId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('surveys unreachable, using local surveys:', err.message)
    }
  }
  return { items: readLocalSurveys(campaignId), live: false }
}

export async function createSurvey({ campaignId, title, description, source, url, tool, modality }) {
  const cleanTitle = (title || '').trim()
  if (!cleanTitle) throw new Error('Give this survey a title.')
  if (!SURVEY_SOURCES.includes(source)) throw new Error('Pick a survey source.')
  const row = {
    title: cleanTitle,
    description: (description || '').trim() || null,
    source,
    url: (url || '').trim() || null,
    tool: SURVEY_TOOLS.includes(tool) ? tool : null,
    modality: modality || null,
    response_count: 0,
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .insert({ campaign_id: campaignId, ...row })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('survey create failed, saving locally:', err.message)
    }
  }

  const now = new Date().toISOString()
  const local = { id: localId(), campaign_id: campaignId, ...row, created_at: now, updated_at: now }
  const items = readLocalSurveys(campaignId)
  items.unshift(local)
  writeLocalSurveys(campaignId, items)
  return local
}

const ALLOWED_SURVEY_FIELDS = ['title', 'description', 'url', 'tool', 'modality']

export async function updateSurvey({ campaignId, id, patch }) {
  const clean = {}
  for (const k of ALLOWED_SURVEY_FIELDS) {
    if (patch[k] !== undefined) clean[k] = patch[k] === '' ? null : patch[k]
  }
  if (clean.title !== undefined && !(clean.title || '').trim()) {
    throw new Error('Give this survey a title.')
  }
  clean.updated_at = new Date().toISOString()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .update(clean)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('survey update failed, applying locally:', err.message)
    }
  }

  const items = readLocalSurveys(campaignId)
  const next = items.map(s => (s.id === id ? { ...s, ...clean } : s))
  writeLocalSurveys(campaignId, next)
  return next.find(s => s.id === id)
}

export async function deleteSurvey({ campaignId, id }) {
  if (supabase) {
    const { error } = await supabase.from('surveys').delete().eq('id', id)
    if (error) throw new Error(`Could not delete survey: ${error.message}`)
    return
  }
  writeLocalSurveys(campaignId, readLocalSurveys(campaignId).filter(s => s.id !== id))
  try { localStorage.removeItem(surveyResponsesKey(id)) } catch { /* noop */ }
}

async function setSurveyResponseCount({ campaignId, surveyId, count }) {
  const stamp = new Date().toISOString()
  if (supabase) {
    try {
      await supabase.from('surveys').update({ response_count: count, updated_at: stamp }).eq('id', surveyId)
    } catch (err) {
      console.warn('response count update failed:', err.message)
    }
  }
  const items = readLocalSurveys(campaignId)
  writeLocalSurveys(campaignId, items.map(s => (s.id === surveyId ? { ...s, response_count: count, updated_at: stamp } : s)))
}

export async function getSurveyResponses({ campaignId, surveyId }) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: true })
      if (error) throw error
      return { items: data || [], live: true }
    } catch (err) {
      console.warn('survey responses unreachable, using local:', err.message)
    }
  }
  return { items: readLocalResponses(surveyId), live: false }
}

// rows: array of plain objects (answers keyed by column header, values as strings).
// Appends to existing responses and refreshes response_count.
export async function importSurveyResponses({ campaignId, surveyId, rows }) {
  if (!rows.length) throw new Error('No rows to import.')
  const now = new Date().toISOString()
  const payload = rows.map(r => ({
    survey_id: surveyId,
    campaign_id: campaignId,
    respondent: (r.respondent || '').trim() || null,
    answers: r.answers || {},
    submitted_at: now,
  }))

  if (supabase) {
    try {
      const { error } = await supabase.from('survey_responses').insert(payload)
      if (error) throw error
      const { count } = await supabase
        .from('survey_responses')
        .select('id', { count: 'exact', head: true })
        .eq('survey_id', surveyId)
      await setSurveyResponseCount({ campaignId, surveyId, count: count || 0 })
      return { imported: rows.length, live: true }
    } catch (err) {
      console.warn('response import failed, saving locally:', err.message)
    }
  }

  const items = readLocalResponses(surveyId)
  const next = [...items, ...payload.map(p => ({ id: localId(), ...p }))]
  writeLocalResponses(surveyId, next)
  await setSurveyResponseCount({ campaignId, surveyId, count: next.length })
  return { imported: rows.length, live: false }
}

// Deletes all existing responses for the survey, then imports the new rows.
export async function replaceSurveyResponses({ campaignId, surveyId, rows }) {
  if (!rows.length) throw new Error('No rows to import.')
  if (supabase) {
    try {
      const { error } = await supabase.from('survey_responses').delete().eq('survey_id', surveyId)
      if (error) throw error
    } catch (err) {
      console.warn('response replace (delete) failed, replacing locally:', err.message)
    }
  }
  writeLocalResponses(surveyId, [])
  return importSurveyResponses({ campaignId, surveyId, rows })
}

// Small, dependency-free CSV parser: handles quoted fields, escaped quotes,
// commas inside quotes, and CRLF/LF line endings. Returns { headers, rows }
// where rows are arrays of strings aligned to headers.
export function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { rows.push(row); row = [] }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      pushField()
    } else if (c === '\r') {
      // skip; \n handles the break
    } else if (c === '\n') {
      pushField(); pushRow()
    } else {
      field += c
    }
  }
  // trailing field/row without a final newline
  if (field !== '' || row.length > 0) { pushField(); pushRow() }

  // drop fully-empty rows (blank lines)
  const nonEmpty = rows.filter(r => r.some(cell => (cell || '').trim() !== ''))
  if (!nonEmpty.length) return { headers: [], rows: [] }
  const headers = nonEmpty[0].map(h => (h || '').trim())
  const dataRows = nonEmpty.slice(1).map(r =>
    headers.map((_, idx) => (r[idx] !== undefined ? String(r[idx]).trim() : ''))
  )
  return { headers, rows: dataRows }
}
