// Modality health rings for the Dashboard home / reporting hub.
// SVG ring metrics in the approved mockup's visual language.
import { MODALITIES, modalityHealth, healthBand } from '../lib/modalities.js'

const BAND_STROKE = { teal: '#0d9488', amber: '#f59e0b', rose: '#f43f5e', white: '#94a3b8' }

export function Ring({ value, size = 120, stroke = 10, color = '#0d9488', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
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
            className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col items-center gap-2 hover:border-teal-300 transition text-center"
            title={`${m.label}: ${band.label}${score != null ? ` (${score}%)` : ''} — open ${m.label} tab`}
          >
            <Ring value={score} color={stroke}>
              <span className="text-3xl font-bold text-slate-900">{score != null ? `${score}%` : '–'}</span>
            </Ring>
            <div className="text-sm font-medium text-slate-900">{i + 1}. {m.label}</div>
            <div
              className={`text-xs px-2 py-0.5 rounded-full border ${
                band.color === 'teal'
                  ? 'bg-teal-100 text-teal-700 border-teal-200'
                  : band.color === 'amber'
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : band.color === 'rose'
                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
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
