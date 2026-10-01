// Executive summary: auto-generated narrative for the reporting hub.
// Data-driven sentences only — no claims beyond what the bundle contains.
import { MODALITIES, modalityHealth, healthBand } from '../lib/modalities.js'

export default function ExecutiveSummary({ data }) {
  if (!data) return null
  const hm = data.healthMetrics || {}
  const lines = []

  const healths = MODALITIES.map(m => ({ ...m, score: modalityHealth(m.id, data) }))
    .filter(h => h.score != null)
  const onTrack = healths.filter(h => healthBand(h.score).color === 'teal').length
  if (healths.length) {
    lines.push(
      `${onTrack} of ${healths.length} change modalities are on track. ` +
      (onTrack === healths.length
        ? 'The transformation is holding across the lifecycle.'
        : `Focus attention on ${healths.filter(h => healthBand(h.score).color !== 'teal').map(h => h.label).join(', ')}.`)
    )
  }

  if (hm.adoptionRate?.value != null) {
    lines.push(
      `Adoption is at ${hm.adoptionRate.value}%${hm.adoptionRate.delta ? ` (${hm.adoptionRate.delta.toLowerCase()})` : ''} — ` +
      (hm.adoptionRate.value >= 75 ? 'the new way of working is taking hold.' : 'below the 75% target; barriers deserve a look.')
    )
  }

  if (hm.openRisks?.highPriority) {
    lines.push(`${hm.openRisks.highPriority} high-priority risk${hm.openRisks.highPriority === 1 ? ' is' : 's are'} open and need ownership.`)
  }

  if (hm.trainingCompletion?.value != null && hm.trainingCompletion.value < 75) {
    lines.push(`Training completion trails at ${hm.trainingCompletion.value}% — capability gaps will show up as adoption drag.`)
  }

  const sh = data.sustainmentHealth
  if (sh?.value != null) {
    lines.push(
      `Sustainment health is ${sh.value}%${sh.reversionRate != null ? ` with a ${sh.reversionRate}% reversion rate` : ''} — ` +
      (sh.value >= 75 ? 'the change is sticking after go-live.' : 'watch for backsliding after go-live.')
    )
  }

  const upcoming = (data.milestones || []).filter(m => m.status === 'In Progress' || m.status === 'Scheduled')
  if (upcoming.length) {
    const next = upcoming[0]
    lines.push(`Next milestone: ${next.title} (${next.date}) — ${next.status.toLowerCase()}.`)
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
      <div className="text-sm font-medium text-slate-900 mb-3">Executive summary</div>
      <ul className="space-y-2">
        {lines.map((l, i) => (
          <li key={i} className="text-sm text-slate-600 leading-relaxed flex gap-2">
            <span className="text-teal-600 mt-0.5">▸</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
