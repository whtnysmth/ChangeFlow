// Modality health rings for the Dashboard home / reporting hub.
// SVG ring metrics in the approved mockup's visual language.
import { MODALITIES, modalityHealth, healthBand } from '../lib/modalities.js'

const BAND_STROKE = { teal: '#2dd4bf', amber: '#fbbf24', rose: '#fb7185', white: '#ffffff' }

export function Ring({ value, size = 120, stroke = 10, color = '#2dd4bf', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export default function ModalityRings({ data, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {MODALITIES.map((m, i) => {
        const score = modalityHealth(m.id, data)
        const band = healthBand(score)
        const stroke = BAND_STROKE[band.color] || '#fff'
        return (
          <button
            key={m.id}
            onClick={() => onSelect && onSelect(m.id)}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-5 flex flex-col items-center gap-2 hover:border-white/20 transition text-center"
            title={`${m.label}: ${band.label}${score != null ? ` (${score}%)` : ''} — open ${m.label} tab`}
          >
            <Ring value={score} color={stroke}>
              <span className="text-3xl font-bold">{score != null ? `${score}%` : '–'}</span>
            </Ring>
            <div className="text-sm font-medium text-white/90">{i + 1}. {m.label}</div>
            <div
              className={`text-xs px-2 py-0.5 rounded-full border ${
                band.color === 'teal'
                  ? 'bg-teal-400/15 text-teal-200 border-teal-300/30'
                  : band.color === 'amber'
                    ? 'bg-amber-400/15 text-amber-200 border-amber-300/30'
                    : band.color === 'rose'
                      ? 'bg-rose-400/15 text-rose-200 border-rose-300/30'
                      : 'bg-white/10 text-white/50 border-white/10'
              }`}
            >
              {band.label}
            </div>
          </button>
        )
      })}
    </div>
  )
}
