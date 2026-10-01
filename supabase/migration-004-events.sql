-- ============================================================================
-- Migration 004: events table (Calendar tab — practitioner events)
-- ============================================================================
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (copy everything below this header):
--
--   create table if not exists events (
--     id uuid primary key default gen_random_uuid(),
--     campaign_id uuid references campaigns(id) on delete cascade,
--     modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
--     title text not null,
--     description text,
--     starts_at timestamptz not null,
--     ends_at timestamptz,
--     created_at timestamptz default now()
--   );
--
--   create index if not exists events_campaign_starts_idx
--     on events (campaign_id, starts_at);
--
--   alter table events enable row level security;
--   drop policy if exists "mvp open access" on events;
--   create policy "mvp open access" on events
--     for all using (true) with check (true);
--
-- Expected result: "Success. No rows returned."
-- ============================================================================

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists events_campaign_starts_idx
  on events (campaign_id, starts_at);

-- Row Level Security: open for anon in solo-dev MVP, mirroring schema.sql and
-- migrations 002/003.
-- !!! LOCK DOWN BEFORE ANY EXTERNAL USER: replace with org/user-scoped
-- policies in the auth phase (Phase 3). Do not ship multi-user access on this.
alter table events enable row level security;
drop policy if exists "mvp open access" on events;
create policy "mvp open access" on events
  for all using (true) with check (true);
