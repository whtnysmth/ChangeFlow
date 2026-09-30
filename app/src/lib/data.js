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
