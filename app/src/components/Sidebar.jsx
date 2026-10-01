// Sidebar navigation: Dashboard + the five change modalities.
// Dark navy panel with teal/purple accents, per the approved mockup.
import { MODALITIES } from '../lib/modalities.js'

const ICONS = {
  home: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path d="M3 10.5 10 3.5l7 7" />
      <path d="M5.5 9.5V16.5h9V9.5" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" />
    </svg>
  ),
  assess: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="10" r="3.5" />
      <circle cx="10" cy="10" r="0.8" fill="currentColor" />
    </svg>
  ),
  mobilize: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <circle cx="5" cy="10" r="2.5" />
      <circle cx="15" cy="5" r="2.5" />
      <circle cx="15" cy="15" r="2.5" />
      <path d="M7.2 8.8l5.6-2.6M7.2 11.2l5.6 2.6" />
    </svg>
  ),
  enable: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path d="M3 5.5h14M3 5.5v4l2-1.5M17 5.5v4l-2-1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 13.5h6l-3 3-3-3z" strokeLinejoin="round" />
    </svg>
  ),
  adopt: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sustain: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path d="M10 2.5l6 2.5v5c0 4-2.7 6.8-6 7.5-3.3-.7-6-3.5-6-7.5V5l6-2.5z" strokeLinejoin="round" />
      <path d="M7.5 10l1.8 1.8L12.8 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
      <path d="M6 3.5v3M6 8.5v3M6 13.5v3" strokeLinecap="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" strokeLinecap="round" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path d="M5.5 2.5h6.5L16 6.5v11H5.5v-15z" strokeLinejoin="round" />
      <path d="M11.5 2.5v4H16" strokeLinejoin="round" />
      <path d="M8 11h4.5M8 13.75h4.5" strokeLinecap="round" />
    </svg>
  ),
  mapping: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="14" cy="6" r="2.5" />
      <circle cx="10" cy="14" r="2.5" />
      <path d="M8.2 7.2l1.1 4M11.8 7.2l-1.1 4M8.5 6h3" strokeLinecap="round" />
    </svg>
  ),
  surveys: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <rect x="5" y="2.5" width="10" height="15" rx="2" />
      <path d="M8 6.5h4M8 9.5h4M8 12.5h2.5" strokeLinecap="round" />
    </svg>
  ),
}

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'dashboard', label: 'Dashboard' },
  ...MODALITIES.map((m, i) => ({ id: m.id, label: m.label, step: i + 1 })),
  { id: 'tasks', label: 'Tasks' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'documents', label: 'Documents' },
  { id: 'mapping', label: 'Mapping' },
  { id: 'surveys', label: 'Surveys' },
]

export default function Sidebar({ activeTab, onTab, mode, onMode }) {
  return (
    <aside className="no-print w-60 shrink-0 min-h-screen bg-[#0b1120] border-r border-white/10 flex flex-col sticky top-0 h-screen">
      <div className="px-5 pt-6 pb-5">
        <img src="/logo.png" alt="ChangeFlow" className="h-11 w-auto" />
      </div>

      <div className="px-3 text-[11px] uppercase tracking-widest text-white/35 px-5 mb-2">Campaign</div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {TABS.map(t => {
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[17px] font-bold transition border ${
                active
                  ? 'tab-neon bg-[#4d97ec]/15 text-white'
                  : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={active ? 'text-[#7db3f2]' : 'text-white/40'}>{ICONS[t.id]}</span>
              <span className="flex-1 text-left">{t.label}</span>
              {mode === 'guided' && t.step && (
                <span className="text-[10px] text-white/30">Phase {t.step}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Mode switch hidden 2026-09-30 per Whitney ("hide for now — simplify").
          Restore the block below to re-enable Guided/Expert switching.
      <div className="p-4 border-t border-white/10">
        <div className="text-[11px] uppercase tracking-widest text-white/35 mb-2">Mode</div>
        <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
          {[
            { id: 'guided', label: 'Guided' },
            { id: 'expert', label: 'Expert' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => onMode(m.id)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-full transition ${
                mode === m.id
                  ? 'bg-[#a253ff]/25 text-[#e6d9ff] border border-[#b183ff]/30'
                  : 'text-white/50 hover:text-white'
              }`}
              title={m.id === 'guided' ? 'Plain-language, phase-by-phase' : 'Full practitioner depth'}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-white/35 leading-snug">
          {mode === 'guided'
            ? 'Guided: plain language, coached phases.'
            : 'Expert: full library, framework terms.'}
        </div>
      </div>
      */}
    </aside>
  )
}
