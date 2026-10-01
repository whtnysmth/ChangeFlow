// Floating "Why this matters" coaching tip, styled like a speech-bubble popup.
// Dismissible per phase; dismissal persists in localStorage. A subtle
// reopen link appears in the phase header once dismissed.
// Every phase shows its translation in all three frameworks (ADKAR, Kotter,
// Lewin) below the divider.
import { useState } from 'react'
import { lensModalityNote } from '../lib/modalities.js'

const LENSES = ['adkar', 'kotter', 'lewin']

export function CoachTipReopen({ onReopen }) {
  return (
    <button
      onClick={onReopen}
      className="no-print text-xs font-semibold text-[#0060c9] bg-[#f0f7ff] border border-[#cfe3fb] rounded-full px-3 py-1 hover:bg-[#e0efff]"
    >
      Why this matters
    </button>
  )
}

export default function CoachTip({ modalityId, coaching }) {
  const key = `changeflow:coachtip:${modalityId}`
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })

  const notes = LENSES.map(l => lensModalityNote(modalityId, l)).filter(Boolean)

  const dismiss = () => {
    try {
      localStorage.setItem(key, '1')
    } catch {}
    setDismissed(true)
  }
  const reopen = () => {
    try {
      localStorage.removeItem(key)
    } catch {}
    setDismissed(false)
  }

  if (dismissed) return <CoachTipReopen onReopen={reopen} />

  return (
    <div className="no-print fixed right-4 lg:right-10 top-36 z-30 flex items-center max-w-[calc(100vw-2rem)]">
      <img src="/bird.png" alt="" className="bird-pulse h-20 w-auto mr-1 shrink-0 drop-shadow-md" />
      <div className="relative bg-white rounded-2xl border border-[#cfe3fb] shadow-xl max-w-md p-5">
        {/* speech-bubble pointer */}
        <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-l border-b border-[#cfe3fb] rotate-45" />
        <div className="absolute left-[-21px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#0073ea] border-[3px] border-white shadow" />
        <button
          onClick={dismiss}
          aria-label="Dismiss tip"
          className="absolute top-2.5 right-3.5 text-slate-400 hover:text-slate-600 text-2xl leading-none"
        >
          ×
        </button>
        <p className="font-fredoka text-[16px] text-slate-800 leading-relaxed pr-6">
          <span className="text-[#0073ea] font-semibold">Why this matters: </span>
          {coaching}
        </p>
        {notes.length > 0 && (
          <>
            <hr className="my-3 border-slate-200" />
            <div className="space-y-1.5">
              {notes.map((note, i) => (
                <p key={i} className="font-fredoka text-[14px] text-slate-500 leading-relaxed">{note}</p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
