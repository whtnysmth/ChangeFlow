import {
  AdoptionRate, TrainingCompletion, CommunicationsSent, OpenRisks,
  StakeholderEngagement, SponsorCoalitionHealth, BarrierAnalysis,
  QuickWinsLog, ReadinessScore, SustainmentHealth, Milestones,
  RecentActivity, GenericWidget
} from './widgets.jsx'

// Renders a widget by ID. `data` is the dashboard bundle (Supabase or mock);
// tooltip translations come from the widget registry.
export default function WidgetRenderer({ id, registry, data }) {
  const meta = registry?.widgets?.find(w => w.id === id)
  const tooltip = meta?.info_icon
    ? `ADKAR: ${meta.info_icon.adkar} | Kotter: ${meta.info_icon.kotter} | Lewin: ${meta.info_icon.lewin}`
    : undefined
  const title = meta?.label || id
  const hm = data.healthMetrics

  switch (id) {
    case 'adoption_rate':
      return <AdoptionRate data={hm.adoptionRate} tooltip={tooltip} />
    case 'training_completion':
      return <TrainingCompletion data={hm.trainingCompletion} tooltip={tooltip} />
    case 'communications_sent':
      return <CommunicationsSent data={hm.communicationsSent} tooltip={tooltip} />
    case 'open_risks':
      return <OpenRisks data={hm.openRisks} tooltip={tooltip} />
    case 'stakeholder_engagement':
      return <StakeholderEngagement groups={data.stakeholderGroups} tooltip={tooltip} />
    case 'sponsor_coalition_health':
      return <SponsorCoalitionHealth data={data.sponsorCoalition} tooltip={tooltip} />
    case 'barrier_analysis':
      return <BarrierAnalysis data={data.barrierAnalysis} tooltip={tooltip} />
    case 'quick_wins_log':
      return <QuickWinsLog data={data.quickWins} tooltip={tooltip} />
    case 'readiness_score':
      return <ReadinessScore data={data.readinessScore} tooltip={tooltip} />
    case 'sustainment_health':
      return <SustainmentHealth data={data.sustainmentHealth} tooltip={tooltip} />
    case 'milestones':
      return <Milestones data={data.milestones} tooltip={tooltip} />
    case 'recent_activity':
      return <RecentActivity data={data.recentActivity} tooltip={tooltip} />
    default:
      return <GenericWidget title={title} tooltip={tooltip} />
  }
}
