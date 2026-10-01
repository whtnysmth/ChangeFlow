// Mock data mirroring the ChangeFlow dashboard mockup
// Structured to match docs/data-model.md

export const campaign = {
  name: 'Q4 Platform Migration — Change Management',
  status: 'On Track',
  start: 'Oct 1, 2024',
  target: 'Jan 31, 2025',
  type: 'Campaign',
  state: 'Active'
}

export const healthMetrics = {
  adoptionRate: { value: 78, delta: '+8% vs last month' },
  trainingCompletion: { value: 64, delta: '+12% vs last month' },
  communicationsSent: { sent: 152, total: 200, pending: 48 },
  openRisks: { percent: 25, highPriority: 2 }
}

export const stakeholderGroups = [
  { group: 'Leadership', percent: 92, engaged: 12 },
  { group: 'Managers', percent: 74, engaged: 28 },
  { group: 'Employees', percent: 58, engaged: 134 },
  { group: 'Contractors', percent: 42, engaged: 21 }
]

export const milestones = [
  { title: 'Training Cohort 3 Launch', date: 'Nov 15, 2024', status: 'Scheduled' },
  { title: 'Go-Live Readiness Review', date: 'Nov 25, 2024', status: 'In Progress' },
  { title: 'Comms: Executive Announcement Email', date: 'Nov 18, 2024', status: 'Planned' }
]

export const recentActivity = [
  { text: 'Sponsor coalition meeting completed', meta: 'Posted by Sarah K. • 2h ago', tone: 'purple' },
  { text: 'New feedback from IT department added', meta: '3 comments • 5h ago', tone: 'teal' },
  { text: 'Risk logged: Vendor onboarding delay', meta: 'Risk #R-023 • 8h ago', tone: 'yellow' },
  { text: '24 employees completed training module', meta: 'Training Plan • 12h ago', tone: 'green' }
]

export const sponsorCoalition = {
  score: 88,
  sponsors: [
    { name: 'Sarah K.', role: 'Executive Sponsor', status: 'Active' },
    { name: 'David M.', role: 'IT Lead', status: 'Active' },
    { name: 'Priya R.', role: 'Ops Lead', status: 'At Risk' },
    { name: 'James L.', role: 'Comms Lead', status: 'Active' }
  ]
}

export const barrierAnalysis = [
  { stage: 'Awareness', percent: 85 },
  { stage: 'Desire', percent: 72 },
  { stage: 'Knowledge', percent: 64 },
  { stage: 'Ability', percent: 55 },
  { stage: 'Reinforcement', percent: 41 }
]

export const quickWins = [
  { title: 'Pilot team fully migrated', date: 'Oct 28', impact: 'High' },
  { title: 'Training completion hit 60%', date: 'Nov 4', impact: 'Medium' },
  { title: 'Support tickets down 18%', date: 'Nov 10', impact: 'High' }
]

export const readinessScore = {
  value: 74,
  note: 'Assessed Oct 1, pre-launch',
  dimensions: [
    {
      label: 'Leadership alignment',
      value: 88,
      description: 'Whether leaders visibly agree on why the change is happening and what success looks like.',
      guidance: 'Score from sponsor interviews or alignment sessions. 90+: sponsors give the same answer unprompted. 70–89: mostly aligned with a few holdouts. Below 70: leaders are sending mixed signals.'
    },
    {
      label: 'Team capacity',
      value: 66,
      description: 'Whether the people doing the work have the time and bandwidth to absorb the change.',
      guidance: 'Score from workload review or manager input. 90+: teams have slack for change work. 70–89: tight but manageable. Below 70: people are already overloaded — the change will slip.'
    },
    {
      label: 'Tech readiness',
      value: 71,
      description: 'Whether the systems, tools, and data are ready to support the change.',
      guidance: 'Score from IT assessment or systems review. 90+: tested and ready. 70–89: ready with known gaps. Below 70: major blockers unresolved.'
    }
  ]
}

export const sustainmentHealth = {
  value: 68,
  trend: '+4% this month',
  reversionRate: 6
}
