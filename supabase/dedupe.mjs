// Removes duplicate campaigns from double-running seed.sql, keeping the newest.
// Child rows cascade. Reads credentials from app/.env (never committed).
import { readFileSync } from 'fs'
import { createClient } from '../app/node_modules/@supabase/supabase-js/dist/index.mjs'

const env = Object.fromEntries(
  readFileSync(new URL('../app/.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const { data: campaigns, error } = await supabase
  .from('campaigns').select('id,name,created_at').order('created_at', { ascending: true })
if (error) throw error

if (campaigns.length <= 1) { console.log('No duplicates found.'); process.exit(0) }

const keep = campaigns[campaigns.length - 1]
const drop = campaigns.slice(0, -1)
console.log(`Keeping newest: "${keep.name}" (${keep.id})`)
for (const c of drop) {
  const { error: delErr } = await supabase.from('campaigns').delete().eq('id', c.id)
  if (delErr) throw delErr
  console.log(`Deleted duplicate: "${c.name}" (${c.id}) — child rows cascaded`)
}

const tables = ['campaigns','stakeholder_groups','metrics','milestones','activity','risks','wins','sponsors']
for (const t of tables) {
  const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
  console.log(`${t}: ${count} row(s)`)
}
