// PhaseHeader: journey-trail header for a phase page. The trail orients
// (where am I, what's done, what's next) and navigates between phases; the
// title is a single confident color; the tagline is a serif-italic standfirst.
// The dismissed-tip reopen ("Why this matters") docks in the header row via
// tipNode instead of dangling below the title.
import { Fragment } from 'react'
import { MODALITIES } from '../lib/modalities.js'

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PhaseHeader({ modality, currentId, onJumpPhase, tipNode }) {
  const currentIdx = MODALITIES.findIndex(m => m.id === currentId)

  return (
    <div>
      <nav aria-label="Change phases" className="no-print flex items-start max-w-xl mb-4">
        {MODALITIES.map((m, i) => {
          const done = i < currentIdx
          const cur = i === currentIdx
          const dot = done
            ? 'bg-[#dbeafe] text-[#0060c9]'
            : cur
              ? 'bg-[#0073ea] text-white font-bold ring-4 ring-[#0073ea]/15'
              : 'bg-white border-[1.5px] border-slate-300 text-slate-400 font-bold group-hover:border-[#7db3f2] group-hover:text-[#0060c9]'
          const label = done || cur
            ? 'text-slate-700 font-semibold'
            : 'text-slate-400 group-hover:text-slate-600'
          return (
            <Fragment key={m.id}>
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`flex-1 h-0.5 mt-[11px] rounded ${i <= currentIdx ? 'bg-[#93c5fd]' : 'bg-slate-200'}`}
                />
              )}
              <button
                onClick={() => onJumpPhase && onJumpPhase(m.id)}
                className="flex flex-col items-center gap-1.5 min-w-[64px] group"
                aria-current={cur ? 'step' : undefined}
                title={m.label}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition ${dot}`}>
                  {done ? <Check /> : i + 1}
                </span>
                <span className={`text-[11px] whitespace-nowrap transition ${label}`}>{m.label}</span>
              </button>
            </Fragment>
          )
        })}
      </nav>

      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{modality.label}</h2>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-1">
        <p className="font-fredoka text-[17px] text-slate-600">
          {modality.tagline}
        </p>
        {tipNode}
      </div>
    </div>
  )
}
