// CampaignStrip: the campaign header as a status bar. It answers "am I okay?"
// at a glance: live countdown, next milestone, risk signal, computed health.
// Rule: everything on the strip is live data or a link. Static facts
// (type, state, dates) live in the campaign-name tooltip.
import { useState } from 'react'

const COMPLETE = new Set(['complete', 'completed', 'done', 'closed'])

function parseDate(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtLong(v) {
  const d = parseDate(v)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : v
}

// Health is computed from delivery signals, not hand-set. Rules:
// At Risk = 1+ overdue milestones or 3+ high-priority risks;
// Needs Attention = 1+ high-priority risks; otherwise On Track.
export function campaignHealth(milestones, highPriority) {
  const today = startOfDay(new Date())
  const overdue = (milestones || []).filter(m => {
    const d = parseDate(m.date)
    return d && startOfDay(d) < today && !COMPLETE.has(String(m.status || '').toLowerCase())
  })
  const hp = Number(highPriority) || 0
  let level = 'on-track'
  let label = 'On Track'
  if (overdue.length >= 1 || hp >= 3) {
    level = 'at-risk'
    label = 'At Risk'
  } else if (hp >= 1) {
    level = 'needs-attention'
    label = 'Needs Attention'
  }
  const parts = []
  if (overdue.length) parts.push(`${overdue.length} overdue milestone${overdue.length === 1 ? '' : 's'}`)
  if (hp) parts.push(`${hp} high-priority risk${hp === 1 ? '' : 's'}`)
  return { level, label, detail: parts.join(' · ') || 'No overdue milestones or high-priority risks' }
}

const HEALTH_PILL = {
  'on-track': 'bg-[#c9f3dc] text-[#00854d] border-[#9ae6b8]',
  'needs-attention': 'bg-[#fef3c7] text-[#b45309] border-[#fcd34d]',
  'at-risk': 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]',
}

const VITAL =
  'text-[13px] text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 hover:border-[#7db3f2] hover:text-[#0060c9] transition whitespace-nowrap'
const VITAL_WARN =
  'text-[13px] text-[#b45309] bg-[#fef9e7] border border-[#f5d76e] rounded-full px-3 py-1 hover:border-[#d97706] transition whitespace-nowrap'

export default function CampaignStrip({
  campaign, campaignId, campaigns, source, sourceBadge,
  onSelectCampaign, onJumpTab, onRename, data,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const milestones = data?.milestones || []
  const highPriority = data?.healthMetrics?.openRisks?.highPriority || 0
  const health = campaignHealth(milestones, highPriority)
  const stateLower = String(campaign.state || 'active').toLowerCase()
  const showHealth = stateLower === 'active'

  const targetDate = parseDate(campaign.target)
  const daysLeft = targetDate
    ? Math.round((startOfDay(targetDate) - startOfDay(new Date())) / 86400000)
    : null

  const today = startOfDay(new Date())
  const upcoming = milestones
    .map(m => ({ ...m, d: parseDate(m.date) }))
    .filter(m => m.d && startOfDay(m.d) >= today && !COMPLETE.has(String(m.status || '').toLowerCase()))
    .sort((a, b) => a.d - b.d)[0]

  const nameTitle = [
    campaign.type || 'Campaign',
    campaign.state,
    campaign.start && `Started ${fmtLong(campaign.start)}`,
    campaign.target && `Target: ${fmtLong(campaign.target)}`,
  ].filter(Boolean).join(' • ')

  const startRename = () => {
    setDraft(campaign.name || '')
    setError('')
    setEditing(true)
  }
  const save = async () => {
    const clean = draft.trim()
    if (!clean) {
      setError('Name cannot be empty.')
      return
    }
    try {
      await onRename(clean)
      setEditing(false)
    } catch (e) {
      setError(e.message || 'Could not rename campaign.')
    }
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
        {editing ? (
          <span className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') setEditing(false)
              }}
              className="text-lg font-bold text-slate-900 bg-white border border-[#7db3f2] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0073ea]/40 max-w-md"
              aria-label="Campaign name"
            />
            <button
              onClick={save}
              className="no-print w-7 h-7 rounded-full bg-[#0073ea] text-white text-sm hover:bg-[#0060c9]"
              title="Save name"
              aria-label="Save campaign name"
            >
              ✓
            </button>
            <button
              onClick={() => setEditing(false)}
              className="no-print w-7 h-7 rounded-full text-slate-500 hover:bg-slate-100 text-sm"
              title="Cancel"
              aria-label="Cancel rename"
            >
              ×
            </button>
          </span>
        ) : (
          <>
            {source === 'supabase' && campaigns.length > 0 ? (
              <select
                value={campaignId || ''}
                onChange={e => onSelectCampaign(e.target.value)}
                className="max-w-md truncate text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 hover:border-[#7db3f2] focus:outline-none focus:ring-2 focus:ring-[#0073ea]/40 cursor-pointer"
                title={nameTitle}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-lg font-bold text-slate-900" title={nameTitle}>
                {campaign.name}
              </span>
            )}
            <button
              onClick={startRename}
              className="no-print text-slate-400 hover:text-[#0060c9] text-base leading-none px-0.5 -scale-x-100"
              title="Rename campaign"
              aria-label="Rename campaign"
            >
              ✎
            </button>
          </>
        )}

        {showHealth ? (
          <button
            onClick={() => onJumpTab('dashboard')}
            title={health.detail}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${HEALTH_PILL[health.level]}`}
          >
            ● {health.label}
          </button>
        ) : (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
            {campaign.state}
          </span>
        )}

        <span className="hidden sm:block w-px self-stretch bg-slate-200" aria-hidden="true" />

        {daysLeft !== null && (
          <button
            onClick={() => onJumpTab('calendar')}
            title={`Target: ${fmtLong(campaign.target)}`}
            className={daysLeft < 0 ? VITAL_WARN : VITAL}
          >
            {daysLeft > 0 && <><b className="font-bold text-slate-900">{daysLeft}</b> days left</>}
            {daysLeft === 0 && <>Target today</>}
            {daysLeft < 0 && <><b className="font-bold">{Math.abs(daysLeft)}</b>d past target</>}
          </button>
        )}

        {upcoming ? (
          <button
            onClick={() => onJumpTab('sustain')}
            title={`${upcoming.title} • ${fmtLong(upcoming.date)}`}
            className={VITAL}
          >
            Next: <b className="font-bold text-slate-900">{upcoming.title}</b> · {fmtShort(upcoming.d)}
          </button>
        ) : (
          <button onClick={() => onJumpTab('sustain')} className={VITAL}>
            No upcoming milestones
          </button>
        )}

        <button
          onClick={() => onJumpTab('sustain')}
          title="Open the risk register"
          className={highPriority > 0 ? VITAL_WARN : VITAL}
        >
          <b className="font-bold">{highPriority}</b> high-priority risk{highPriority === 1 ? '' : 's'}
        </button>

        <span className="ml-auto">{sourceBadge}</span>
      </div>
      {editing && error && (
        <div className="text-xs text-rose-600 mt-1">{error}</div>
      )}
    </div>
  )
}
