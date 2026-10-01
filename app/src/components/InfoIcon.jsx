import { useState } from 'react'

// ⓘ Info icon with hover / tap / keyboard tooltip
// Shows a plain-language definition of the principle the labeled thing represents.
export default function InfoIcon({ tooltip }) {
  const [open, setOpen] = useState(false)
  if (!tooltip) return null
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        type="button"
        aria-label="More info"
        className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-500 text-[10px] hover:bg-slate-300 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
      >
        i
      </button>
      {open && (
        <span className="absolute z-20 w-64 p-3 text-xs leading-relaxed bg-slate-800 border border-white/10 rounded-lg shadow-xl -top-2 left-6 text-white/90">
          {tooltip}
        </span>
      )}
    </span>
  )
}
