// One modality tab: coaching banner (Guided), lens terminology note,
// and the modality's widgets. Modes are views over the same data model.
import WidgetRenderer from '../widgets/WidgetRenderer.jsx'
import PhaseDocuments from './PhaseDocuments.jsx'
import { lensModalityNote } from '../lib/modalities.js'

export default function ModalityView({ modality, widgetIds, registry, data, lens, mode, stepIndex, campaignId, live }) {
  const lensNote = lensModalityNote(modality.id, lens)
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
          <div className="mt-3 p-4 rounded-xl bg-white border border-[#a9ccf7] shadow-sm text-sm text-slate-700 leading-relaxed">
            <span className="text-[#0060c9] font-medium">Why this matters: </span>
            {modality.coaching}
          </div>
        )}
        {lensNote && (
          <div className="mt-2 text-xs text-slate-500">{lensNote}</div>
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
