// One modality tab: coaching banner (Guided), lens terminology note,
// and the modality's widgets. Modes are views over the same data model.
import WidgetRenderer from '../widgets/WidgetRenderer.jsx'
import PhaseDocuments from './PhaseDocuments.jsx'
import CoachTip from './CoachTip.jsx'

export default function ModalityView({ modality, widgetIds, registry, data, lens, mode, stepIndex, campaignId, live }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'guided' && <span className="text-[#0073ea]">Phase {stepIndex}: </span>}
            {modality.label}
          </h2>
          <span className="text-sm text-slate-500">{modality.tagline}</span>
        </div>
        {mode === 'guided' && (
          <CoachTip modalityId={modality.id} coaching={modality.coaching} />
        )}
      </div>

      {widgetIds.length === 0 ? (
        <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl p-8 text-center">
          No widgets assigned to this modality yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {widgetIds.map(id => (
            <WidgetRenderer key={id} id={id} registry={registry} data={data} lens={lens} />
          ))}
        </div>
      )}

      <PhaseDocuments campaignId={campaignId} modality={modality} live={live} />
    </div>
  )
}
