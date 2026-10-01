import {
  AdoptionRate, TrainingCompletion, CommunicationsSent, OpenRisks,
  StakeholderEngagement, SponsorCoalitionHealth, BarrierAnalysis,
  QuickWinsLog, ReadinessScore, SustainmentHealth, Milestones,
  RecentActivity, GenericWidget
} from './widgets.jsx'
import { lensWidgetLabel } from '../lib/modalities.js'

// Renders a widget by ID. `data` is the dashboard bundle (Supabase or mock);
// the ⓘ tooltip shows a plain-language definition of the principle the widget
// represents (registry `plain_english`). Framework translations stay in the
// registry for later but are no longer shown — principles first.
export default function WidgetRenderer({ id, registry, data, lens = 'adkar', onSource }) {
  const meta = registry?.widgets?.find(w => w.id === id)
  const tooltip = meta?.plain_english || undefined
  const title = lensWidgetLabel(id, lens)
  const hm = data.healthMetrics
  // Assess pilot: these two widgets expose their source data for
  // inspection and editing. Other widgets stay read-only for now.
  const sourceAction = (label) => onSource ? { label, onClick: () => onSource(id) } : null

  switch (id) {
    case 'adoption_rate':
      return <AdoptionRate data={hm.adoptionRate} tooltip={tooltip} title={title} />
    case 'training_completion':
      return <TrainingCompletion data={hm.trainingCompletion} tooltip={tooltip} title={title} />
    case 'communications_sent':
      return <CommunicationsSent data={hm.communicationsSent} tooltip={tooltip} title={title} />
    case 'open_risks':
      return <OpenRisks data={hm.openRisks} tooltip={tooltip} title={title} />
    case 'stakeholder_engagement':
      return <StakeholderEngagement groups={data.stakeholderGroups} tooltip={tooltip} title={title} sourceAction={sourceAction(`Source: ${data.stakeholderGroups.length} groups`)} />
    case 'sponsor_coalition_health':
      return <SponsorCoalitionHealth data={data.sponsorCoalition} tooltip={tooltip} title={title} />
    case 'barrier_analysis':
      return <BarrierAnalysis data={data.barrierAnalysis} tooltip={tooltip} title={title} />
    case 'quick_wins_log':
      return <QuickWinsLog data={data.quickWins} tooltip={tooltip} title={title} />
    case 'readiness_score':
      return <ReadinessScore data={data.readinessScore} tooltip={tooltip} title={title} sourceAction={sourceAction(`Source: ${data.readinessScore.dimensions.length} dimensions`)} />
    case 'sustainment_health':
      return <SustainmentHealth data={data.sustainmentHealth} tooltip={tooltip} title={title} />
    case 'milestones':
      return <Milestones data={data.milestones} tooltip={tooltip} title={title} />
    case 'recent_activity':
      return <RecentActivity data={data.recentActivity} tooltip={tooltip} title={title} />
    default:
      return <GenericWidget title={title} tooltip={tooltip} />
  }
}
