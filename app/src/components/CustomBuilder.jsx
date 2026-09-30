import { useState, useEffect } from 'react'
import { loadTemplates, saveTemplate, deleteTemplate } from '../lib/templates.js'

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
    const tpl = await saveTemplate(campaignId, trimmed, activeIds)
    setTemplates(prev => [tpl, ...prev])
    setName('')
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await deleteTemplate(id)
    setTemplates(prev => prev.filter(t => String(t.id) !== String(id)))
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Custom dashboard builder</div>
        <button onClick={onReset} className="text-xs text-white/60 hover:text-white underline">
          Reset to framework default
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {registry.widgets.map(w => {
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
                onClick={() => onApplyTemplate(t.widget_ids)}
                className="text-white/80 hover:text-white text-left"
              >
                {t.name} <span className="text-white/35">• {t.widget_ids.length} widgets</span>
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
