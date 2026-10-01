// One modality tab: coaching banner (Guided), lens terminology note,
// and the modality's widgets. Modes are views over the same data model.
// Assess pilot: the stakeholder engagement and readiness widgets expose a
// "Source" action that opens the source-data drawer for in-app editing.
import { useState } from 'react'
import WidgetRenderer from '../widgets/WidgetRenderer.jsx'
import PhaseDocuments from './PhaseDocuments.jsx'
import PhaseHeader from './PhaseHeader.jsx'
import CoachTip from './CoachTip.jsx'
import { AssessSourceDrawer } from './SourceDrawer.jsx'
import { saveStakeholderGroups, saveReadinessScore } from '../lib/data.js'

export default function ModalityView({ modality, widgetIds, registry, data, lens, mode, stepIndex, campaignId, live, onRefreshData, onJumpPhase }) {
  const [sourceId, setSourceId] = useState(null)

  const handleSourceSave = async (widgetId, payload) => {
    if (widgetId === 'stakeholder_engagement') {
      await saveStakeholderGroups(campaignId, payload)
    } else if (widgetId === 'readiness_score') {
      await saveReadinessScore(campaignId, payload)
    }
    if (onRefreshData) await onRefreshData()
  }

  return (
    <div className="space-y-5">
      <PhaseHeader
        modality={modality}
        currentId={modality.id}
        onJumpPhase={onJumpPhase}
        tipNode={mode === 'guided' ? <CoachTip modalityId={modality.id} coaching={modality.coaching} /> : null}
      />

      {widgetIds.length === 0 ? (
        <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl p-8 text-center">
          No widgets assigned to this modality yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {widgetIds.map(id => (
            <WidgetRenderer key={id} id={id} registry={registry} data={data} lens={lens} onSource={setSourceId} />
          ))}
        </div>
      )}

      <PhaseDocuments campaignId={campaignId} modality={modality} live={live} />

      {sourceId && (
        <AssessSourceDrawer
          widgetId={sourceId}
          data={data}
          onClose={() => setSourceId(null)}
          onSave={handleSourceSave}
        />
      )}
    </div>
  )
}
