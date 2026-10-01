// DashboardEngine: routes between the Dashboard home (reporting hub)
// and the five modality tabs. The framework toggle is gone from here —
// widgets are organized by modality, and the framework control is now a
// terminology lens applied at render time (see FrameworkLens).
import DashboardHome from './DashboardHome.jsx'
import ModalityView from './ModalityView.jsx'
import TaskManager from './TaskManager.jsx'
import { MODALITIES, modalityById, widgetsForModality, guidedWidgetsForModality } from '../lib/modalities.js'

export default function DashboardEngine({
  tab, data, registry, mode, lens, onSelectModality,
  customWidgetIds, onToggleCustomWidget, onResetCustomWidgets,
  campaignId, onApplyTemplate, source,
}) {
  if (tab === 'dashboard') {
    return (
      <DashboardHome
        data={data}
        registry={registry}
        mode={mode}
        lens={lens}
        onSelectModality={onSelectModality}
        customWidgetIds={customWidgetIds}
        onToggleCustomWidget={onToggleCustomWidget}
        onResetCustomWidgets={onResetCustomWidgets}
        campaignId={campaignId}
        onApplyTemplate={onApplyTemplate}
      />
    )
  }

  const modality = modalityById(tab)
  if (tab === 'tasks') {
    return <TaskManager campaignId={campaignId} live={source === 'supabase'} />
  }
  if (!modality) return null
  const stepIndex = MODALITIES.findIndex(m => m.id === tab) + 1
  const widgetIds = mode === 'guided'
    ? guidedWidgetsForModality(tab)
    : widgetsForModality(tab)

  return (
    <ModalityView
      modality={modality}
      widgetIds={widgetIds}
      registry={registry}
      data={data}
      lens={lens}
      mode={mode}
      stepIndex={stepIndex}
      campaignId={campaignId}
      live={source === 'supabase'}
    />
  )
}

// DashboardHome needs a way to jump to a modality tab; App wires it.
export { MODALITIES }
