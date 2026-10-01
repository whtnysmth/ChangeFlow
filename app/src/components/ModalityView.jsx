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
          <h2 className="text-xl font-semibold">
            {mode === 'guided' && <span className="text-teal-300">Phase {stepIndex}: </span>}
            {modality.label}
          </h2>
          <span className="text-sm text-white/50">{modality.tagline}</span>
        </div>
        {mode === 'guided' && (
          <div className="mt-3 p-4 rounded-xl bg-teal-400/[0.06] border border-teal-300/20 text-sm text-white/75 leading-relaxed">
            <span className="text-teal-200 font-medium">Why this matters: </span>
            {modality.coaching}
          </div>
        )}
        {lensNote && (
          <div className="mt-2 text-xs text-white/40">{lensNote}</div>
        )}
      </div>

      {widgetIds.length === 0 ? (
        <div className="text-sm text-white/40 border border-dashed border-white/15 rounded-xl p-8 text-center">
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
