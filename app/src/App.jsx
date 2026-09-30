import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import FrameworkLens from './components/FrameworkLens.jsx'
import DashboardEngine from './components/DashboardEngine.jsx'
import { getDashboardData } from './lib/data.js'

import registry from '../../widgets/registry.json'

const MODE_KEY = 'changeflow_mode'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) || 'guided' } catch { return 'guided' }
  })
  const [lens, setLens] = useState('adkar')
  const [customHomeIds, setCustomHomeIds] = useState([])
  const [data, setData] = useState(null)
  const [source, setSource] = useState('loading')
  const [campaignId, setCampaignId] = useState(null)

  useEffect(() => {
    getDashboardData().then(({ source, bundle, campaignId }) => {
      setData(bundle)
      setSource(source)
      setCampaignId(campaignId)
    })
  }, [])

  const handleMode = (m) => {
    setMode(m)
    try { localStorage.setItem(MODE_KEY, m) } catch { /* private mode */ }
  }

  const toggleCustomWidget = (id) => {
    setCustomHomeIds(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50 text-sm">
        Loading ChangeFlow…
      </div>
    )
  }

  const campaign = data.campaign
  const sourceBadge = source === 'supabase'
    ? <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30">● Live data</span>
    : <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10">○ Mock data</span>

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      <Sidebar activeTab={activeTab} onTab={setActiveTab} mode={mode} onMode={handleMode} />

      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto p-6">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 text-xl font-bold">
                <span>{campaign.name}</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  • {campaign.status}
                </span>
                {sourceBadge}
              </div>
              <div className="text-sm text-white/60 mt-1">
                {campaign.type || 'Campaign'} • {campaign.state} • Started {campaign.start} • Target: {campaign.target}
              </div>
            </div>
            <FrameworkLens lens={lens} onChange={setLens} />
          </header>

          <div className="no-print text-xs text-white/40 mb-6">
            {mode === 'guided'
              ? 'Guided mode: plain language, step-by-step. Switch to Expert in the sidebar for the full practitioner view.'
              : 'Expert mode: full widget library and framework terminology.'}
            {' '}The framework lens only adjusts terminology — your data never moves.
            Hover any ⓘ for cross-framework translations.
          </div>

          <DashboardEngine
            tab={activeTab}
            data={data}
            registry={registry}
            mode={mode}
            lens={lens}
            onSelectModality={setActiveTab}
            customWidgetIds={customHomeIds}
            onToggleCustomWidget={toggleCustomWidget}
            onResetCustomWidgets={() => setCustomHomeIds([])}
            campaignId={campaignId}
            onApplyTemplate={setCustomHomeIds}
          />

          <footer className="mt-10 text-xs text-white/30">
            ChangeFlow — {source === 'supabase' ? 'Connected to Supabase.' : 'Mock data — connect Supabase to go live.'} Free-first stack: Vite + React + Tailwind + Supabase.
          </footer>
        </div>
      </div>
    </div>
  )
}
