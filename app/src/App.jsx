import { useState } from 'react'
import FrameworkToggle from './components/FrameworkToggle.jsx'
import DashboardEngine from './components/DashboardEngine.jsx'
import CustomBuilder from './components/CustomBuilder.jsx'
import { campaign } from './data/mockData.js'

import adkar from '../../frameworks/adkar.json'
import kotter from '../../frameworks/kotter.json'
import lewin from '../../frameworks/lewin.json'
import registry from '../../widgets/registry.json'

const FRAMEWORKS = { adkar, kotter, lewin }

export default function App() {
  const [frameworkId, setFrameworkId] = useState('adkar')
  const [customIds, setCustomIds] = useState(null)

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

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold">
            <span>ChangeFlow</span>
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
              • {campaign.status}
            </span>
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

      <DashboardEngine frameworkDef={frameworkDef} widgetIds={activeIds} registry={registry} />

      {isCustom && (
        <CustomBuilder
          registry={registry}
          activeIds={activeIds}
          onToggle={toggleWidget}
          onReset={() => setCustomIds(defaultIds)}
        />
      )}

      <footer className="mt-10 text-xs text-white/30">
        ChangeFlow MVP — Phase 3. Mock data only. Free-first stack: Vite + React + Tailwind.
      </footer>
    </div>
  )
}
