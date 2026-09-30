import {
  AdoptionRate, TrainingCompletion, CommunicationsSent, OpenRisks,
  StakeholderEngagement, SponsorCoalitionHealth, BarrierAnalysis,
  QuickWinsLog, ReadinessScore, SustainmentHealth, Milestones,
  RecentActivity, GenericWidget
} from './widgets.jsx'
import {
  healthMetrics, stakeholderGroups, milestones, recentActivity,
  sponsorCoalition, barrierAnalysis, quickWins, readinessScore,
  sustainmentHealth
} from '../data/mockData.js'

// Renders a widget by ID, pulling tooltip translations from registry
export default function WidgetRenderer({ id, registry }) {
  const meta = registry?.widgets?.find(w => w.id === id)
  const tooltip = meta?.info_icon
    ? `ADKAR: ${meta.info_icon.adkar} | Kotter: ${meta.info_icon.kotter} | Lewin: ${meta.info_icon.lewin}`
    : undefined
  const title = meta?.label || id

  switch (id) {
    case 'adoption_rate':
      return <AdoptionRate data={healthMetrics.adoptionRate} tooltip={tooltip} />
    case 'training_completion':
      return <TrainingCompletion data={healthMetrics.trainingCompletion} tooltip={tooltip} />
    case 'communications_sent':
      return <CommunicationsSent data={healthMetrics.communicationsSent} tooltip={tooltip} />
    case 'open_risks':
      return <OpenRisks data={healthMetrics.openRisks} tooltip={tooltip} />
    case 'stakeholder_engagement':
      return <StakeholderEngagement groups={stakeholderGroups} tooltip={tooltip} />
    case 'sponsor_coalition_health':
      return <SponsorCoalitionHealth data={sponsorCoalition} tooltip={tooltip} />
    case 'barrier_analysis':
      return <BarrierAnalysis data={barrierAnalysis} tooltip={tooltip} />
    case 'quick_wins_log':
      return <QuickWinsLog data={quickWins} tooltip={tooltip} />
    case 'readiness_score':
      return <ReadinessScore data={readinessScore} tooltip={tooltip} />
    case 'sustainment_health':
      return <SustainmentHealth data={sustainmentHealth} tooltip={tooltip} />
    case 'milestones':
      return <Milestones data={milestones} tooltip={tooltip} />
    case 'recent_activity':
      return <RecentActivity data={recentActivity} tooltip={tooltip} />
    default:
      return <GenericWidget title={title} tooltip={tooltip} />
  }
}
