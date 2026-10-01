import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
// Framework lens hidden 2026-09-30 per Whitney ("hide for now — simplify").
// To restore: uncomment the import and the <FrameworkLens> element in the header.
// import FrameworkLens from './components/FrameworkLens.jsx'
import DashboardEngine from './components/DashboardEngine.jsx'
import { getDashboardData, listCampaigns, createCampaign, getStoredCampaignId, setStoredCampaignId } from './lib/data.js'

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
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let list = []
      try {
        list = await listCampaigns()
      } catch {
        list = []
      }
      if (cancelled) return
      const real = list.filter(c => c.id !== 'mock')
      setCampaigns(list)
      const stored = getStoredCampaignId()
      const pick = real.find(c => c.id === stored) || real[0]
      const { source, bundle, campaignId } = await getDashboardData(pick ? pick.id : undefined)
      if (cancelled) return
      setData(bundle)
      setSource(source)
      setCampaignId(campaignId)
      if (source === 'supabase' && campaignId) setStoredCampaignId(campaignId)
    })()
    return () => { cancelled = true }
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

  const selectCampaign = async (id) => {
    if (!id || id === campaignId) return
    setStoredCampaignId(id)
    setActiveTab('home')
    const { source, bundle, campaignId: cid } = await getDashboardData(id === 'mock' ? undefined : id)
    setData(bundle)
    setSource(source)
    setCampaignId(cid)
  }

  // Re-fetch the dashboard bundle (e.g. after source-data edits).
  const reloadData = async () => {
    const { source, bundle, campaignId: cid } = await getDashboardData(campaignId || undefined)
    setData(bundle)
    setSource(source)
    setCampaignId(cid)
  }

  const handleCreateCampaign = async (fields) => {
    const row = await createCampaign(fields)
    const list = await listCampaigns()
    setCampaigns(list)
    await selectCampaign(row.id)
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
                {source === 'supabase' && campaigns.length > 0 ? (
                  <select
                    value={campaignId || ''}
                    onChange={e => selectCampaign(e.target.value)}
                    className="max-w-md truncate text-xl font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 hover:border-[#7db3f2] focus:outline-none focus:ring-2 focus:ring-[#0073ea]/40 cursor-pointer"
                    title="Switch campaign"
                  >
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <span>{campaign.name}</span>
                )}
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#c9f3dc] text-[#00854d] border border-[#9ae6b8]">
                  • {campaign.status}
                </span>
                {sourceBadge}
              </div>
              <div className="mt-2 inline-block text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                {campaign.type || 'Campaign'} • {campaign.state} • Started {campaign.start} • Target: {campaign.target}
              </div>
            </div>
            {/* Framework lens hidden 2026-09-30 — restore: <FrameworkLens lens={lens} onChange={setLens} /> */}
          </header>

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
            campaigns={campaigns}
            onSelectCampaign={selectCampaign}
            onCreateCampaign={handleCreateCampaign}
            onRefreshData={reloadData}
          />

          <footer className="mt-10 text-xs text-slate-500">
            ChangeFlow — {source === 'supabase' ? 'Connected to Supabase.' : 'Mock data — connect Supabase to go live.'} Free-first stack: Vite + React + Tailwind + Supabase.
          </footer>
        </div>
      </div>
    </div>
  )
}
