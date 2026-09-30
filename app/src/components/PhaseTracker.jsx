import InfoIcon from './InfoIcon.jsx'

export default function PhaseTracker({ phases }) {
  if (!phases?.length) return null
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {phases.map((p, i) => (
        <div key={p.id} className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
            <span className="text-white/40 mr-1">{i + 1}.</span>
            {p.label}
            <InfoIcon tooltip={p.info_icon?.tooltip} />
          </div>
          {i < phases.length - 1 && <span className="text-white/20">→</span>}
        </div>
      ))}
    </div>
  )
}
