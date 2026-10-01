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
