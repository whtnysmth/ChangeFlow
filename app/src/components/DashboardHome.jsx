// Dashboard home = the reporting hub.
// Fixed sections: modality health rings, executive summary, Recent Activity,
// Milestones, Export/Print. In Expert mode, custom widgets (via CustomBuilder)
// can be appended below — custom layouts are modality-based home widgets now,
// not framework-based dashboard overrides.
import ModalityRings from './ModalityRings.jsx'
import ExecutiveSummary from './ExecutiveSummary.jsx'
import WidgetRenderer from '../widgets/WidgetRenderer.jsx'
import CustomBuilder from './CustomBuilder.jsx'

export default function DashboardHome({
  data, registry, onSelectModality, mode, lens,
  customWidgetIds, onToggleCustomWidget, onResetCustomWidgets,
  campaignId, onApplyTemplate,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Campaign Health Overview</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="no-print text-sm text-[#0060c9] hover:text-[#0053a6] underline underline-offset-4"
          >
            View full report →
          </button>
          <button
            onClick={() => window.print()}
            className="no-print px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 transition"
          >
            Export / Print
          </button>
        </div>
      </div>

      <ModalityRings data={data} onSelect={onSelectModality} />

      <ExecutiveSummary data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetRenderer id="recent_activity" registry={registry} data={data} />
        <WidgetRenderer id="milestones" registry={registry} data={data} />
      </div>

      {mode === 'expert' && (
        <div className="space-y-4">
          {customWidgetIds.length > 0 && (
            <div>
              <div className="text-sm font-medium text-slate-700 mb-3">Custom widgets</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {customWidgetIds.map(id => (
                  <WidgetRenderer key={id} id={id} registry={registry} data={data} lens={lens} />
                ))}
              </div>
            </div>
          )}
          <CustomBuilder
            registry={registry}
            activeIds={customWidgetIds}
            onToggle={onToggleCustomWidget}
            onReset={onResetCustomWidgets}
            campaignId={campaignId}
            onApplyTemplate={onApplyTemplate}
          />
        </div>
      )}
    </div>
  )
}
