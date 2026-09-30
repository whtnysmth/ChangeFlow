import { useState, useEffect } from 'react'
import { loadTemplates, saveTemplate, deleteTemplate } from '../lib/templates.js'
import { MODALITIES } from '../lib/modalities.js'

// Custom home widgets (Expert mode only). Custom layouts are modality-based:
// chips are grouped by modality and there is no framework base to reset to.
// Saved layouts persist the same way as before (Supabase dashboard_templates
// with localStorage fallback); legacy layouts saved under the old
// framework-based system are still valid widget-id lists — unknown IDs are
// filtered on apply, so they migrate cleanly to home widgets.
function validIds(ids, registry) {
  const known = new Set((registry.widgets || []).map(w => w.id))
  return (ids || []).filter(id => known.has(id))
}

export default function CustomBuilder({ registry, activeIds, onToggle, onReset, campaignId, onApplyTemplate }) {
  const [templates, setTemplates] = useState([])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTemplates(campaignId).then(setTemplates)
  }, [campaignId])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const tpl = await saveTemplate(campaignId, trimmed, validIds(activeIds, registry))
    setTemplates(prev => [tpl, ...prev])
    setName('')
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await deleteTemplate(id)
    setTemplates(prev => prev.filter(t => String(t.id) !== String(id)))
  }

  const byModality = MODALITIES.map(m => ({
    ...m,
    widgets: (registry.widgets || []).filter(w => w.modality === m.id),
  }))
  const unassigned = (registry.widgets || []).filter(w => !w.modality)

  const renderChips = (widgets) => (
    <div className="flex flex-wrap gap-2">
      {widgets.map(w => {
        const on = activeIds.includes(w.id)
        return (
          <button
            key={w.id}
            onClick={() => onToggle(w.id)}
            className={`px-3 py-1.5 text-xs rounded-full border transition ${
              on
                ? 'bg-teal-400/20 text-teal-200 border-teal-300/30'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
            }`}
          >
            {on ? '✓ ' : '+ '}{w.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="no-print mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/10">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium">Custom home widgets <span className="text-white/40 font-normal">• Expert</span></div>
        <button onClick={onReset} className="text-xs text-white/60 hover:text-white underline">
          Clear custom widgets
        </button>
      </div>
      <p className="text-xs text-white/40 mb-4">
        Add any widgets below your reporting sections on the Dashboard home. Layouts are organized by change modality — no framework base.
      </p>

      {byModality.map(m => (
        <div key={m.id} className="mb-3">
          <div className="text-[11px] uppercase tracking-widest text-white/35 mb-1.5">{m.label}</div>
          {renderChips(m.widgets)}
        </div>
      ))}
      {unassigned.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] uppercase tracking-widest text-white/35 mb-1.5">General</div>
          {renderChips(unassigned)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="Name this layout (e.g. Exec view)"
          className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-teal-300/40 w-52"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="px-3 py-1.5 text-xs rounded-lg bg-teal-400/20 text-teal-200 border border-teal-300/30 disabled:opacity-40 hover:bg-teal-400/30 transition"
        >
          {saving ? 'Saving…' : 'Save layout'}
        </button>
      </div>

      {templates.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-xs text-white/40">Saved layouts</div>
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/10 rounded-lg px-3 py-1.5">
              <button
                onClick={() => onApplyTemplate(validIds(t.widget_ids, registry))}
                className="text-white/80 hover:text-white text-left"
              >
                {t.name} <span className="text-white/35">• {validIds(t.widget_ids, registry).length} widgets</span>
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-white/35 hover:text-white/80 ml-3"
                title="Delete layout"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 text-xs text-white/40">
        Layouts persist {campaignId ? 'to the database' : 'in this browser'} and can be reapplied anytime.
      </div>
    </div>
  )
}
