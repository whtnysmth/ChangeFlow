-- ============================================================================
-- Migration 003: tasks table (lightweight Task Manager tab)
-- ============================================================================
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (copy everything below this header):
--
--   create table if not exists tasks (
--     id uuid primary key default gen_random_uuid(),
--     campaign_id uuid references campaigns(id) on delete cascade,
--     modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
--     title text not null,
--     status text not null default 'todo'
--       check (status in ('todo','in_progress','stuck','done')),
--     owner text,
--     due_date date,
--     priority text not null default 'medium'
--       check (priority in ('low','medium','high')),
--     notes text,
--     created_at timestamptz default now()
--   );
--
--   create index if not exists tasks_campaign_status_due_idx
--     on tasks (campaign_id, status, due_date);
--
--   alter table tasks enable row level security;
--   drop policy if exists "mvp open access" on tasks;
--   create policy "mvp open access" on tasks
--     for all using (true) with check (true);
--
-- Expected result: "Success. No rows returned."
-- ============================================================================

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
  title text not null,
  status text not null default 'todo'
    check (status in ('todo','in_progress','stuck','done')),
  owner text,
  due_date date,
  priority text not null default 'medium'
    check (priority in ('low','medium','high')),
  notes text,
  created_at timestamptz default now()
);

create index if not exists tasks_campaign_status_due_idx
  on tasks (campaign_id, status, due_date);

-- Row Level Security: open for anon in solo-dev MVP, mirroring schema.sql and
-- migration-002.
-- !!! LOCK DOWN BEFORE ANY EXTERNAL USER: replace with org/user-scoped
-- policies in the auth phase (Phase 3). Do not ship multi-user access on this.
alter table tasks enable row level security;
drop policy if exists "mvp open access" on tasks;
create policy "mvp open access" on tasks
  for all using (true) with check (true);
