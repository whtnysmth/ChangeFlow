import { useState, useEffect } from 'react'
import FrameworkToggle from './components/FrameworkToggle.jsx'
import DashboardEngine from './components/DashboardEngine.jsx'
import CustomBuilder from './components/CustomBuilder.jsx'
import { getDashboardData } from './lib/data.js'

import adkar from '../../frameworks/adkar.json'
import kotter from '../../frameworks/kotter.json'
import lewin from '../../frameworks/lewin.json'
import registry from '../../widgets/registry.json'

const FRAMEWORKS = { adkar, kotter, lewin }

export default function App() {
  const [frameworkId, setFrameworkId] = useState('adkar')
  const [customIds, setCustomIds] = useState(null)
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

  const isCustom = frameworkId === 'custom'
  const baseId = isCustom ? 'adkar' : frameworkId
  const frameworkDef = FRAMEWORKS[baseId]
  const defaultIds = frameworkDef.default_widgets

  const activeIds = isCustom ? (customIds || defaultIds) : defaultIds

  const handleFrameworkChange = (id) => {
    setFrameworkId(id)
    if (id === 'custom' && !customIds) setCustomIds(defaultIds)
  }

  const toggleWidget = (id) => {
    setCustomIds(prev => {
      const cur = prev || defaultIds
      return cur.includes(id) ? cur.filter(w => w !== id) : [...cur, id]
    })
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
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold">
            <span>ChangeFlow</span>
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
              • {campaign.status}
            </span>
            {sourceBadge}
          </div>
          <div className="text-sm text-white/60 mt-1">
            {campaign.name} • {campaign.state} • Started {campaign.start} • Target: {campaign.target}
          </div>
        </div>
        <FrameworkToggle active={frameworkId} onChange={handleFrameworkChange} />
      </header>

      <div className="text-xs text-white/40 mb-4">
        Viewing as: <span className="text-white/70 font-medium">{isCustom ? 'Custom (based on ADKAR)' : frameworkDef.name}</span>
        {' '}— data is preserved when you toggle. Hover any ⓘ for cross-framework translations.
      </div>

      <DashboardEngine frameworkDef={frameworkDef} widgetIds={activeIds} registry={registry} data={data} />

      {isCustom && (
        <CustomBuilder
          registry={registry}
          activeIds={activeIds}
          onToggle={toggleWidget}
          onReset={() => setCustomIds(defaultIds)}
          campaignId={campaignId}
          onApplyTemplate={(ids) => setCustomIds(ids)}
        />
      )}

      <footer className="mt-10 text-xs text-white/30">
        ChangeFlow MVP — Phase 5 (backend). {source === 'supabase' ? 'Connected to Supabase.' : 'Mock data — connect Supabase to go live.'} Free-first stack: Vite + React + Tailwind + Supabase.
      </footer>
    </div>
  )
}
