import { supabase } from './supabase.js'

// Custom dashboard templates. Uses Supabase when configured,
// localStorage as the always-available fallback (and offline cache).
const LS_KEY = 'changeflow_templates'

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') }
  catch { return [] }
}

function writeLocal(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export async function loadTemplates(campaignId) {
  const local = readLocal()
  if (!supabase) return local
  try {
    let q = supabase.from('dashboard_templates').select('*')
      .order('created_at', { ascending: false })
    if (campaignId) q = q.eq('campaign_id', campaignId)
    const { data, error } = await q
    if (error) throw error
    return data
  } catch {
    return local
  }
}

export async function saveTemplate(campaignId, name, widgetIds) {
  const tpl = {
    id: 'local-' + Date.now(),
    campaign_id: campaignId,
    name,
    widget_ids: widgetIds,
    is_org_template: false,
    created_at: new Date().toISOString()
  }
  writeLocal([tpl, ...readLocal()])
  if (!supabase) return tpl
  try {
    const { data, error } = await supabase
      .from('dashboard_templates')
      .insert({ campaign_id: campaignId, name, widget_ids: widgetIds })
      .select()
      .single()
    if (error) throw error
    return data
  } catch {
    return tpl
  }
}

export async function deleteTemplate(id) {
  writeLocal(readLocal().filter(t => String(t.id) !== String(id)))
  if (!supabase || String(id).startsWith('local-')) return
  try {
    await supabase.from('dashboard_templates').delete().eq('id', id)
  } catch { /* local copy already removed */ }
}
