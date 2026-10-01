import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
// Framework lens hidden 2026-09-30 per Whitney ("hide for now — simplify").
// To restore: uncomment the import and the <FrameworkLens> element in the header.
// import FrameworkLens from './components/FrameworkLens.jsx'
import DashboardEngine from './components/DashboardEngine.jsx'
import CampaignStrip from './components/CampaignStrip.jsx'
import { getDashboardData, listCampaigns, createCampaign, renameCampaign, getStoredCampaignId, setStoredCampaignId } from './lib/data.js'
import { softTap } from './lib/feedback.js'

import registry from '../../widgets/registry.json'

const MODE_KEY = 'changeflow_mode'
const DARK_KEY = 'changeflow:dark-mode'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem(DARK_KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    try { localStorage.setItem(DARK_KEY, darkMode ? '1' : '0') } catch { /* private mode */ }
  }, [darkMode])
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) || 'guided' } catch { return 'guided' }
  })
  const [lens, setLens] = useState('adkar')
  const [customHomeIds, setCustomHomeIds] = useState([])
  const [data, setData] = useState(null)
  const [source, setSource] = useState('loading')
  const [campaignId, setCampaignId] = useState(null)
  const [campaigns, setCampaigns] = useState([])

  // Click feedback: a soft tap sound + light haptic on every clickable
  // element (buttons, links, selects, checkboxes). One delegated listener.
  useEffect(() => {
    const onClick = (e) => {
      if (e.target && e.target.closest &&
          e.target.closest('button, a, select, input[type="checkbox"], [role="button"]')) {
        softTap()
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

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

  // Rename the active campaign. The name is a single record, so saving here
  // updates it everywhere it appears (strip, campaign cards, switcher).
  const handleRenameCampaign = async (name) => {
    const id = source === 'supabase' && campaignId ? campaignId : 'mock'
    await renameCampaign(id, name)
    const list = await listCampaigns()
    setCampaigns(list)
    await reloadData()
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm bg-[#edf1f7]">
        Loading ChangeFlow…
      </div>
    )
  }

  const campaign = data.campaign
  const sourceBadge = source === 'supabase'
    ? <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#cfe3fb] text-[#0060c9] border border-[#a9ccf7]">● Live data</span>
    : <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">○ Mock data</span>

  return (
    <div className="min-h-screen flex bg-[#edf1f7] text-slate-900">
      <Sidebar activeTab={activeTab} onTab={setActiveTab} mode={mode} onMode={handleMode} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(v => !v)} />

      <div className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto p-6">
          {/* Framework lens hidden 2026-09-30 — restore: <FrameworkLens lens={lens} onChange={setLens} /> */}
          <CampaignStrip
            campaign={campaign}
            campaignId={campaignId}
            campaigns={campaigns}
            source={source}
            sourceBadge={sourceBadge}
            onSelectCampaign={selectCampaign}
            onJumpTab={setActiveTab}
            onRename={handleRenameCampaign}
            data={data}
          />

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
