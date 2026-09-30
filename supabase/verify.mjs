// Verifies the ChangeFlow Supabase connection and seed data.
// Reads credentials from app/.env (never committed). Run: node supabase/verify.mjs
import { readFileSync } from 'fs'
import { createClient } from '../app/node_modules/@supabase/supabase-js/dist/index.mjs'

const env = Object.fromEntries(
  readFileSync(new URL('../app/.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const checks = [
  ['campaigns', 'name'],
  ['stakeholder_groups', 'group_name'],
  ['metrics', 'metric_key'],
  ['milestones', 'title'],
  ['activity', 'text'],
  ['risks', 'title'],
  ['wins', 'title'],
  ['sponsors', 'name']
]

let ok = true
for (const [table] of checks) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) { console.log(`FAIL ${table}: ${error.message}`); ok = false }
  else console.log(`OK   ${table}: ${count} row(s)`)
}

const { data: camp } = await supabase.from('campaigns').select('name,status').limit(1).maybeSingle()
console.log(camp ? `\nCampaign: "${camp.name}" [${camp.status}]` : '\nNo campaign found — seed.sql may not have run yet.')
console.log(ok && camp ? '\nLIVE CONNECTION VERIFIED' : '\nVERIFICATION INCOMPLETE')
process.exit(ok && camp ? 0 : 1)
