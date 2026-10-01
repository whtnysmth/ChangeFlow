// Shared bits for the native map editors: styling, ids, small controls.
import { useState } from 'react'

export const inputCls =
  'px-2 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:border-teal-500 w-full'

export const btnPrimary =
  'px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed'

export const btnGhost =
  'px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:border-teal-500 hover:text-teal-700 transition'

export function uid() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{children}</h4>
      {action}
    </div>
  )
}

// Small labeled field used across editors.
export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

// Inline confirm-delete button: first click arms, second click fires.
export function ConfirmButton({ onConfirm, label = 'Delete', className = '' }) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button
        onClick={() => setArmed(true)}
        onBlur={() => setArmed(false)}
        className={`text-[11px] text-slate-400 hover:text-rose-600 transition ${className}`}
      >
        {label}
      </button>
    )
  }
  return (
    <button
      onClick={onConfirm}
      className={`text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition ${className}`}
    >
      Confirm?
    </button>
  )
}
