import {
  AdoptionRate, TrainingCompletion, CommunicationsSent, OpenRisks,
  StakeholderEngagement, GenericWidget
} from './widgets.jsx'
import { healthMetrics, stakeholderGroups, milestones, recentActivity } from '../data/mockData.js'

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
    case 'milestones':
      return <GenericWidget title={title} tooltip={tooltip} body={milestones.map(m => `${m.title} — ${m.date} (${m.status})`).join(' • ')} />
    case 'recent_activity':
      return <GenericWidget title={title} tooltip={tooltip} body={recentActivity.map(a => a.text).join(' • ')} />
    default:
      return <GenericWidget title={title} tooltip={tooltip} />
  }
}
