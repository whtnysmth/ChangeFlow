export default function CustomBuilder({ registry, activeIds, onToggle, onReset }) {
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
      <div className="mt-2 text-xs text-white/40">
        Add or remove widgets. Layout saves automatically for this session.
      </div>
    </div>
  )
}
