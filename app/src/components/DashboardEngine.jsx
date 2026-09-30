import PhaseTracker from './PhaseTracker.jsx'
import WidgetRenderer from '../widgets/WidgetRenderer.jsx'

export default function DashboardEngine({ frameworkDef, widgetIds, registry }) {
  return (
    <div>
      <PhaseTracker phases={frameworkDef.phases} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {widgetIds.map(id => (
          <WidgetRenderer key={id} id={id} registry={registry} />
        ))}
      </div>
    </div>
  )
}
