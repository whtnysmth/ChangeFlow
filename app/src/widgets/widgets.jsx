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

export function GenericWidget({ title, tooltip, body = 'Widget content goes here.' }) {
  return (
    <Card title={title} tooltip={tooltip}>
      <div className="text-sm text-white/60">{body}</div>
    </Card>
  )
}
