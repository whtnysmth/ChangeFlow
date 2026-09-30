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
