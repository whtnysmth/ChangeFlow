import InfoIcon from '../components/InfoIcon.jsx'

function Card({ title, tooltip, children, footer, sourceAction }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
      <div className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
        <span className="flex-1 min-w-0">
          {title}
          <InfoIcon tooltip={tooltip} />
        </span>
        {sourceAction && (
          <button
            onClick={sourceAction.onClick}
            className="no-print shrink-0 text-xs font-normal text-[#0060c9] hover:underline"
            title="See where this data comes from — and edit it"
          >
            {sourceAction.label} ↗
          </button>
        )}
      </div>
      {children}
      {footer && <div className="mt-2 text-xs text-[#0060c9]">{footer}</div>}
    </div>
  )
}

export function AdoptionRate({ data, tooltip, title }) {
  return (
    <Card title={title || "Adoption Rate"} tooltip={tooltip} footer={data.delta}>
      <div className="text-4xl font-bold text-slate-900">{data.value}%</div>
      <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-[#0085ff] rounded-full" style={{ width: `${data.value}%` }} />
      </div>
    </Card>
  )
}

export function TrainingCompletion({ data, tooltip, title }) {
  return (
    <Card title={title || "Training Completion"} tooltip={tooltip} footer={data.delta}>
      <div className="text-4xl font-bold text-slate-900">{data.value}%</div>
      <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-[#8a3ffc] rounded-full" style={{ width: `${data.value}%` }} />
      </div>
    </Card>
  )
}

export function CommunicationsSent({ data, tooltip, title }) {
  return (
    <Card title={title || "Communications Sent"} tooltip={tooltip} footer={`${data.pending} pending`}>
      <div className="text-4xl font-bold text-slate-900">{data.sent}<span className="text-lg text-slate-400">/{data.total}</span></div>
    </Card>
  )
}

export function OpenRisks({ data, tooltip, title }) {
  return (
    <Card title={title || "Open Risks"} tooltip={tooltip} footer={`${data.highPriority} high priority`}>
      <div className="text-4xl font-bold text-slate-900">{data.percent}%</div>
    </Card>
  )
}

export function StakeholderEngagement({ groups, tooltip, title, sourceAction }) {
  return (
    <Card title={title || "Stakeholder Engagement"} tooltip={tooltip} footer="Overall engagement +6% this month" sourceAction={sourceAction}>
      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.group}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-700">{g.group}</span>
              <span className="text-slate-500">{g.percent}% • {g.engaged} engaged</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0085ff] to-[#8a3ffc] rounded-full" style={{ width: `${g.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function SponsorCoalitionHealth({ data, tooltip, title }) {
  const dot = s => s === 'Active' ? 'bg-[#33d17a]' : s === 'At Risk' ? 'bg-amber-400' : 'bg-slate-300'
  return (
    <Card title={title || "Sponsor Coalition Health"} tooltip={tooltip} footer={`${data.score}% health`}>
      <div className="text-4xl font-bold text-slate-900 mb-3">{data.score}%</div>
      <div className="space-y-2">
        {data.sponsors.map(s => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${dot(s.status)}`} />
            <span className="text-slate-800">{s.name}</span>
            <span className="text-slate-500">• {s.role}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function BarrierAnalysis({ data, tooltip, title }) {
  const min = Math.min(...data.map(d => d.percent))
  const barrier = data.find(d => d.percent === min).stage
  return (
    <Card title={title || "Barrier Analysis"} tooltip={tooltip} footer={`Biggest barrier: ${barrier}`}>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.stage}>
            <div className="flex justify-between text-xs mb-1">
              <span className={d.percent === min ? 'text-amber-600 font-medium' : 'text-slate-700'}>{d.stage}</span>
              <span className="text-slate-500">{d.percent}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${d.percent === min ? 'bg-amber-500' : 'bg-[#0085ff]'}`} style={{ width: `${d.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function QuickWinsLog({ data, tooltip, title }) {
  return (
    <Card title={title || "Quick Wins Log"} tooltip={tooltip} footer={`${data.length} wins logged`}>
      <div className="space-y-2.5">
        {data.map((w, i) => (
          <div key={i} className="text-xs">
            <div className="text-slate-800">✓ {w.title}</div>
            <div className="text-slate-500 mt-0.5">{w.date} • {w.impact} impact</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ReadinessScore({ data, tooltip, title, sourceAction }) {
  return (
    <Card title={title || "Readiness Score"} tooltip={tooltip} footer={data.note} sourceAction={sourceAction}>
      <div className="text-4xl font-bold text-slate-900">{data.value}%</div>
      <div className="mt-3 space-y-1.5">
        {data.dimensions.map(d => (
          <div key={d.label} className="flex justify-between text-xs">
            <span className="text-slate-500">{d.label}</span>
            <span className="text-slate-800">{d.value}%</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function SustainmentHealth({ data, tooltip, title }) {
  return (
    <Card title={title || "Sustainment Health"} tooltip={tooltip} footer={data.trend}>
      <div className="text-4xl font-bold text-slate-900">{data.value}%</div>
      <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-[#00c875] rounded-full" style={{ width: `${data.value}%` }} />
      </div>
      <div className="mt-2 text-xs text-slate-500">Reversion rate: {data.reversionRate}%</div>
    </Card>
  )
}

export function Milestones({ data, tooltip, title }) {
  const pill = s => s === 'Scheduled'
    ? 'bg-[#cfe3fb] text-[#0060c9]'
    : s === 'In Progress'
      ? 'bg-[#e6d9ff] text-[#6e2fd6]'
      : 'bg-slate-100 text-slate-500'
  return (
    <Card title={title || "Milestones"} tooltip={tooltip}>
      <div className="space-y-3">
        {data.map((m, i) => (
          <div key={i} className="text-xs">
            <div className="text-slate-800 font-medium">{m.title}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-slate-500">{m.date}</span>
              <span className={`px-2 py-0.5 rounded-full ${pill(m.status)}`}>{m.status}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function RecentActivity({ data, tooltip, title }) {
  const dot = t => ({
    purple: 'bg-purple-400', teal: 'bg-[#4d97ec]',
    yellow: 'bg-amber-400', green: 'bg-[#33d17a]'
  }[t] || 'bg-slate-300')
  return (
    <Card title={title || "Recent Activity"} tooltip={tooltip} footer="Last 24 hours">
      <div className="space-y-2.5">
        {data.map((a, i) => (
          <div key={i} className="flex gap-2.5 text-xs">
            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${dot(a.tone)}`} />
            <div>
              <div className="text-slate-800">{a.text}</div>
              <div className="text-slate-500 mt-0.5">{a.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function GenericWidget({ title, tooltip, body = 'Widget content goes here.' }) {
  return (
    <Card title={title} tooltip={tooltip}>
      <div className="text-sm text-slate-600">{body}</div>
    </Card>
  )
}
