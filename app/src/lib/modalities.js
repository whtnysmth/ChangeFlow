import registry from '../../../widgets/registry.json'

// ---------------------------------------------------------------------------
// Modalities: the organizing principle of the ChangeFlow dashboard.
// Frameworks (ADKAR / Kotter / Lewin) describe the same underlying work in
// different vocabularies; the work itself is the constant. Each modality owns
// a set of widgets (see each widget's `modality` field in registry.json).
// The framework control is a *lens* over this structure — it adjusts
// terminology, never which widgets appear or what the data says.
// ---------------------------------------------------------------------------

export const MODALITIES = [
  {
    id: 'assess',
    label: 'Assess',
    tagline: 'Know where you stand',
    coaching:
      'Before you change anything, understand what the change will ask of each group. ' +
      'Readiness and stakeholder insight keep you from flying blind.',
    docsHint:
      'e.g. readiness interview notes, stakeholder maps, impact assessment drafts',
  },
  {
    id: 'mobilize',
    label: 'Mobilize',
    tagline: 'Line up backing',
    coaching:
      'Change needs visible backing. Get sponsors active and communications planned ' +
      'before the rollout starts — this is the most skipped step in failed transformations.',
    docsHint:
      'e.g. sponsor meeting notes, comms plans, stakeholder messaging drafts',
  },
  {
    id: 'enable',
    label: 'Enable',
    tagline: 'Build capability',
    coaching:
      "People can't adopt what they can't do. Training and clear communication turn the plan into ability.",
    docsHint:
      'e.g. training decks, how-to guides, session recordings, comms sent',
  },
  {
    id: 'adopt',
    label: 'Adopt',
    tagline: 'Make it real',
    coaching:
      'This is where the change lives or dies. Watch where people get stuck, and make early wins visible to build momentum.',
    docsHint:
      'e.g. resistance logs, barrier analysis write-ups, quick-win evidence',
  },
  {
    id: 'sustain',
    label: 'Sustain',
    tagline: 'Make it stick',
    coaching:
      "Go-live isn't the finish line. Track whether the new way of working holds — and catch backsliding early.",
    docsHint:
      'e.g. sustainment checklists, risk reviews, reinforcement plans',
  },
]

// Widgets per modality, derived from registry.json (single source of truth).
export function widgetsForModality(modalityId) {
  return (registry.widgets || [])
    .filter(w => w.modality === modalityId)
    .map(w => w.id)
}

// Guided mode shows a curated subset per modality. The one principled cut:
// barrier_analysis is Expert-only because its stages are literally ADKAR
// terms (Awareness / Desire / Knowledge / Ability / Reinforcement) —
// framework jargon a first-time user shouldn't have to decode on day one.
const GUIDED_EXCLUDE = new Set(['barrier_analysis'])

export function guidedWidgetsForModality(modalityId) {
  return widgetsForModality(modalityId).filter(id => !GUIDED_EXCLUDE.has(id))
}

export function modalityById(id) {
  return MODALITIES.find(m => m.id === id)
}

// ---------------------------------------------------------------------------
// Framework lens terminology. Switching the lens re-labels a handful of
// widgets and adds a one-line "in {framework} terms" note per modality.
// It never changes data or widget visibility. Labels below are drawn from
// the cross-framework translation layer (docs/translation-guide.md,
// registry.json info_icon entries, frameworks/*.json phase names).
// ---------------------------------------------------------------------------

export const LENSES = [
  { id: 'adkar', label: 'ADKAR' },
  { id: 'kotter', label: 'Kotter 8-Step' },
  { id: 'lewin', label: 'Lewin' },
  { id: 'none', label: 'None' },
]

const LENS_WIDGET_LABELS = {
  sponsor_coalition_health: { kotter: 'Guiding Coalition Health', lewin: 'Champion Network Health' },
  barrier_analysis: { kotter: 'Barrier Removal', lewin: 'Readiness Gaps' },
  sustainment_health: { lewin: 'Refreeze Health' },
  readiness_score: { lewin: 'Unfreeze Readiness' },
  quick_wins_log: { kotter: 'Short-Term Wins' },
}

export function lensWidgetLabel(widgetId, lens) {
  const base = registry.widgets?.find(w => w.id === widgetId)?.label || widgetId
  if (!lens || lens === 'none' || lens === 'adkar') return base
  return LENS_WIDGET_LABELS[widgetId]?.[lens] || base
}

const LENS_MODALITY_NOTES = {
  assess: {
    adkar: 'In ADKAR terms: building Awareness of the need for change.',
    kotter: 'In Kotter terms: creating urgency (step 1).',
    lewin: 'In Lewin terms: Unfreeze — surfacing why change is needed.',
  },
  mobilize: {
    adkar: 'In ADKAR terms: building Desire to participate and support the change.',
    kotter: 'In Kotter terms: building the coalition and communicating the vision (steps 2–4).',
    lewin: 'In Lewin terms: Unfreeze — mobilizing people behind the change.',
  },
  enable: {
    adkar: 'In ADKAR terms: Knowledge + Ability.',
    kotter: 'In Kotter terms: enabling action and empowering volunteers (step 5).',
    lewin: 'In Lewin terms: Change — building new capability.',
  },
  adopt: {
    adkar: 'In ADKAR terms: Ability + Reinforcement taking hold.',
    kotter: 'In Kotter terms: generating wins and sustaining acceleration (steps 6–7).',
    lewin: 'In Lewin terms: Change — new behaviors taking hold.',
  },
  sustain: {
    adkar: 'In ADKAR terms: Reinforcement.',
    kotter: 'In Kotter terms: instituting change (step 8).',
    lewin: 'In Lewin terms: Refreeze — making the new way stick.',
  },
}

export function lensModalityNote(modalityId, lens) {
  if (!lens || lens === 'none') return null
  return LENS_MODALITY_NOTES[modalityId]?.[lens] || null
}

// ---------------------------------------------------------------------------
// Modality health: a normalized 0–100 score per modality, computed as the
// mean of its widgets' headline numbers. Formula (documented for the team):
//
//   assess:    mean(readinessScore.value, mean(stakeholderGroups[].percent))
//   mobilize:  mean(sponsorCoalition.score, 100 * communicationsSent.sent / total)
//   enable:    trainingCompletion.value
//   adopt:     mean(adoptionRate.value, mean(barrierAnalysis[].percent))
//   sustain:   mean(sustainmentHealth.value, 100 - openRisks.percent,
//                   milestonesOnTrackPct)
//   milestonesOnTrackPct = 100 * (# milestones whose status is NOT one of
//                   Delayed/Blocked/At Risk/Cancelled/Overdue) / total milestones
//                   (a milestone that is merely planned still counts as on track;
//                    only explicitly troubled statuses count against it)
//
// Missing components are skipped (mean of what's available); every value is
// clamped to 0–100 and rounded. Health bands: ≥75 On track, 50–74 Needs
// attention, <50 At risk.
// ---------------------------------------------------------------------------

const clamp100 = v => Math.max(0, Math.min(100, v))
const mean = arr => {
  const xs = arr.filter(v => typeof v === 'number' && !Number.isNaN(v))
  if (!xs.length) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function modalityHealth(modalityId, data) {
  if (!data) return null
  const hm = data.healthMetrics || {}
  let score = null

  switch (modalityId) {
    case 'assess': {
      const groupAvg = mean((data.stakeholderGroups || []).map(g => g.percent))
      score = mean([data.readinessScore?.value, groupAvg])
      break
    }
    case 'mobilize': {
      const c = hm.communicationsSent || {}
      const commsRate = c.total ? (100 * c.sent) / c.total : null
      score = mean([data.sponsorCoalition?.score, commsRate])
      break
    }
    case 'enable':
      score = hm.trainingCompletion?.value ?? null
      break
    case 'adopt': {
      const barrierAvg = mean((data.barrierAnalysis || []).map(d => d.percent))
      score = mean([hm.adoptionRate?.value, barrierAvg])
      break
    }
    case 'sustain': {
      const miles = data.milestones || []
      const TROUBLED = new Set(['Delayed', 'Blocked', 'At Risk', 'Cancelled', 'Overdue'])
      const onTrack = miles.length
        ? (100 * miles.filter(m => !TROUBLED.has(m.status)).length) / miles.length
        : null
      score = mean([
        data.sustainmentHealth?.value,
        hm.openRisks?.percent != null ? 100 - hm.openRisks.percent : null,
        onTrack,
      ])
      break
    }
    default:
      score = null
  }
  return score == null ? null : Math.round(clamp100(score))
}

export function healthBand(score) {
  if (score == null) return { label: 'No data', color: 'white' }
  if (score >= 75) return { label: 'On track', color: 'teal' }
  if (score >= 50) return { label: 'Needs attention', color: 'amber' }
  return { label: 'At risk', color: 'rose' }
}
