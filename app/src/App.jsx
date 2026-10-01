import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
// Framework lens hidden 2026-09-30 per Whitney ("hide for now — simplify").
// To restore: uncomment the import and the <FrameworkLens> element in the header.
// import FrameworkLens from './components/FrameworkLens.jsx'
import DashboardEngine from './components/DashboardEngine.jsx'
import { getDashboardData } from './lib/data.js'

import registry from '../../widgets/registry.json'

const MODE_KEY = 'changeflow_mode'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
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
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm bg-white">
        Loading ChangeFlow…
      </div>
    )
  }

  const campaign = data.campaign
  const sourceBadge = source === 'supabase'
    ? <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#cfe3fb] text-[#0060c9] border border-[#a9ccf7]">● Live data</span>
    : <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">○ Mock data</span>

  return (
    <div className="min-h-screen flex bg-white text-slate-900">
      <Sidebar activeTab={activeTab} onTab={setActiveTab} mode={mode} onMode={handleMode} />

      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto p-6">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <span>{campaign.name}</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#c9f3dc] text-[#00854d] border border-[#9ae6b8]">
                  • {campaign.status}
                </span>
                {sourceBadge}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {campaign.type || 'Campaign'} • {campaign.state} • Started {campaign.start} • Target: {campaign.target}
              </div>
            </div>
            {/* Framework lens hidden 2026-09-30 — restore: <FrameworkLens lens={lens} onChange={setLens} /> */}
          </header>

          <div className="no-print text-xs text-slate-600 mb-6">
            Hover any ⓘ for a plain-English explanation of what each measure means.
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
            source={source}
          />

          <footer className="mt-10 text-xs text-slate-500">
            ChangeFlow — {source === 'supabase' ? 'Connected to Supabase.' : 'Mock data — connect Supabase to go live.'} Free-first stack: Vite + React + Tailwind + Supabase.
          </footer>
        </div>
      </div>
    </div>
  )
}
