import InfoIcon from '../components/InfoIcon.jsx'

function Card({ title, tooltip, children, footer }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
      <div className="text-sm font-medium text-white/90 mb-3">
        {title}
        <InfoIcon tooltip={tooltip} />
      </div>
      {children}
      {footer && <div className="mt-2 text-xs text-teal-300/80">{footer}</div>}
    </div>
  )
}

export function AdoptionRate({ data, tooltip }) {
  return (
    <Card title="Adoption Rate" tooltip={tooltip} footer={data.delta}>
      <div className="text-4xl font-bold">{data.value}%</div>
      <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-teal-400/80 rounded-full" style={{ width: `${data.value}%` }} />
      </div>
    </Card>
  )
}

export function TrainingCompletion({ data, tooltip }) {
  return (
    <Card title="Training Completion" tooltip={tooltip} footer={data.delta}>
      <div className="text-4xl font-bold">{data.value}%</div>
      <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-400/80 rounded-full" style={{ width: `${data.value}%` }} />
      </div>
    </Card>
  )
}

export function CommunicationsSent({ data, tooltip }) {
  return (
    <Card title={`Communications Sent`} tooltip={tooltip} footer={`${data.pending} pending`}>
      <div className="text-4xl font-bold">{data.sent}<span className="text-lg text-white/50">/{data.total}</span></div>
    </Card>
  )
}

export function OpenRisks({ data, tooltip }) {
  return (
    <Card title="Open Risks" tooltip={tooltip} footer={`${data.highPriority} high priority`}>
      <div className="text-4xl font-bold">{data.percent}%</div>
    </Card>
  )
}

export function StakeholderEngagement({ groups, tooltip }) {
  return (
    <Card title="Stakeholder Engagement" tooltip={tooltip} footer="Overall engagement +6% this month">
      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.group}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/80">{g.group}</span>
              <span className="text-white/60">{g.percent}% • {g.engaged} engaged</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-400 to-indigo-400 rounded-full" style={{ width: `${g.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function SponsorCoalitionHealth({ data, tooltip }) {
  const dot = s => s === 'Active' ? 'bg-emerald-400' : s === 'At Risk' ? 'bg-amber-400' : 'bg-white/30'
  return (
    <Card title="Sponsor Coalition Health" tooltip={tooltip} footer={`${data.score}% health`}>
      <div className="text-4xl font-bold mb-3">{data.score}%</div>
      <div className="space-y-2">
        {data.sponsors.map(s => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${dot(s.status)}`} />
            <span className="text-white/85">{s.name}</span>
            <span className="text-white/40">• {s.role}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function BarrierAnalysis({ data, tooltip }) {
  const min = Math.min(...data.map(d => d.percent))
  const barrier = data.find(d => d.percent === min).stage
  return (
    <Card title="Barrier Analysis" tooltip={tooltip} footer={`Biggest barrier: ${barrier}`}>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.stage}>
            <div className="flex justify-between text-xs mb-1">
              <span className={d.percent === min ? 'text-amber-300 font-medium' : 'text-white/75'}>{d.stage}</span>
              <span className="text-white/50">{d.percent}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${d.percent === min ? 'bg-amber-400/90' : 'bg-teal-400/70'}`} style={{ width: `${d.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function QuickWinsLog({ data, tooltip }) {
  return (
    <Card title="Quick Wins Log" tooltip={tooltip} footer={`${data.length} wins logged`}>
      <div className="space-y-2.5">
        {data.map((w, i) => (
          <div key={i} className="text-xs">
            <div className="text-white/85">✓ {w.title}</div>
            <div className="text-white/40 mt-0.5">{w.date} • {w.impact} impact</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ReadinessScore({ data, tooltip }) {
  return (
    <Card title="Readiness Score" tooltip={tooltip} footer={data.note}>
      <div className="text-4xl font-bold">{data.value}%</div>
      <div className="mt-3 space-y-1.5">
        {data.dimensions.map(d => (
          <div key={d.label} className="flex justify-between text-xs">
            <span className="text-white/55">{d.label}</span>
            <span className="text-white/85">{d.value}%</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function SustainmentHealth({ data, tooltip }) {
  return (
    <Card title="Sustainment Health" tooltip={tooltip} footer={data.trend}>
      <div className="text-4xl font-bold">{data.value}%</div>
      <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-400/80 rounded-full" style={{ width: `${data.value}%` }} />
      </div>
      <div className="mt-2 text-xs text-white/50">Reversion rate: {data.reversionRate}%</div>
    </Card>
  )
}

export function Milestones({ data, tooltip }) {
  const pill = s => s === 'Scheduled'
    ? 'bg-teal-400/15 text-teal-200'
    : s === 'In Progress'
      ? 'bg-indigo-400/15 text-indigo-200'
      : 'bg-white/10 text-white/60'
  return (
    <Card title="Milestones" tooltip={tooltip}>
      <div className="space-y-3">
        {data.map((m, i) => (
          <div key={i} className="text-xs">
            <div className="text-white/85 font-medium">{m.title}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-white/40">{m.date}</span>
              <span className={`px-2 py-0.5 rounded-full ${pill(m.status)}`}>{m.status}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function RecentActivity({ data, tooltip }) {
  const dot = t => ({
    purple: 'bg-purple-400', teal: 'bg-teal-400',
    yellow: 'bg-amber-400', green: 'bg-emerald-400'
  }[t] || 'bg-white/40')
  return (
    <Card title="Recent Activity" tooltip={tooltip} footer="Last 24 hours">
      <div className="space-y-2.5">
        {data.map((a, i) => (
          <div key={i} className="flex gap-2.5 text-xs">
            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${dot(a.tone)}`} />
            <div>
              <div className="text-white/85">{a.text}</div>
              <div className="text-white/40 mt-0.5">{a.meta}</div>
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
      <div className="text-sm text-white/60">{body}</div>
    </Card>
  )
}
