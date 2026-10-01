-- ============================================================================
-- Migration 007: maps table (Mapping tab — stakeholder / journey /
-- process / impact maps)
-- ============================================================================
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (copy everything below this header):
--
--   create table if not exists maps (
--     id uuid primary key default gen_random_uuid(),
--     campaign_id uuid references campaigns(id) on delete cascade,
--     title text not null,
--     map_type text not null check (map_type in ('stakeholder','journey','process','impact')),
--     source text not null check (source in ('link','upload','native')),
--     url text,
--     file_name text,
--     file_path text,
--     file_size int,
--     mime_type text,
--     modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
--     description text,
--     content jsonb default '{}'::jsonb,
--     created_at timestamptz default now(),
--     updated_at timestamptz default now()
--   );
--
--   create index if not exists maps_campaign_type_idx
--     on maps (campaign_id, map_type);
--
--   alter table maps enable row level security;
--   drop policy if exists "mvp open access" on maps;
--   create policy "mvp open access" on maps
--     for all using (true) with check (true);
--
-- Expected result: "Success. No rows returned."
-- ============================================================================

create table if not exists maps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  title text not null,
  map_type text not null check (map_type in ('stakeholder','journey','process','impact')),
  source text not null check (source in ('link','upload','native')),
  url text,
  file_name text,
  file_path text,
  file_size int,
  mime_type text,
  modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
  description text,
  content jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists maps_campaign_type_idx
  on maps (campaign_id, map_type);

-- Row Level Security: open for anon in solo-dev MVP, mirroring schema.sql and
-- migrations 002–006.
-- !!! LOCK DOWN BEFORE ANY EXTERNAL USER: replace with org/user-scoped
-- policies in the auth phase (Phase 3). Do not ship multi-user access on this.
alter table maps enable row level security;
drop policy if exists "mvp open access" on maps;
create policy "mvp open access" on maps
  for all using (true) with check (true);
