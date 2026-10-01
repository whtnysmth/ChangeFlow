// Framework lens: a subtle header dropdown that adjusts terminology only.
// It never changes which widgets appear or what the data says — data is
// preserved across lens switches by construction (the lens is presentational).
import { LENSES } from '../lib/modalities.js'

export default function FrameworkLens({ lens, onChange }) {
  return (
    <label className="no-print inline-flex items-center gap-2 text-xs text-slate-600">
      <span>Framework lens</span>
      <select
        value={lens}
        onChange={e => onChange(e.target.value)}
        className="bg-white border border-slate-300 rounded-full px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#0085ff] cursor-pointer [&>option]:bg-white"
        aria-label="Framework lens — adjusts terminology only"
      >
        {LENSES.map(l => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </label>
  )
}
