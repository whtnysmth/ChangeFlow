-- ============================================================================
-- Migration 005: task board (groups, custom columns, files, last updated)
-- ============================================================================
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (copy everything below this header):
--
--   alter table tasks add column if not exists updated_at timestamptz default now();
--   update tasks set updated_at = now() where updated_at is null;
--   alter table tasks add column if not exists group_name text default 'To-Do';
--   update tasks set group_name = 'Completed' where status = 'done';
--   alter table tasks add column if not exists custom jsonb default '{}'::jsonb;
--
--   create table if not exists task_columns (
--     id uuid primary key default gen_random_uuid(),
--     campaign_id uuid references campaigns(id) on delete cascade,
--     name text not null,
--     type text not null check (type in ('status','text','people','date','numbers','files','checkbox','priority')),
--     options jsonb default '{}'::jsonb,
--     position int default 0,
--     created_at timestamptz default now()
--   );
--   create index if not exists task_columns_campaign_position_idx
--     on task_columns (campaign_id, position);
--   alter table task_columns enable row level security;
--   drop policy if exists "mvp open access" on task_columns;
--   create policy "mvp open access" on task_columns
--     for all using (true) with check (true);
--
--   create table if not exists task_groups (
--     id uuid primary key default gen_random_uuid(),
--     campaign_id uuid references campaigns(id) on delete cascade,
--     name text not null,
--     position int default 0,
--     created_at timestamptz default now(),
--     unique (campaign_id, name)
--   );
--   create index if not exists task_groups_campaign_position_idx
--     on task_groups (campaign_id, position);
--   alter table task_groups enable row level security;
--   drop policy if exists "mvp open access" on task_groups;
--   create policy "mvp open access" on task_groups
--     for all using (true) with check (true);
--
--   create table if not exists task_files (
--     id uuid primary key default gen_random_uuid(),
--     campaign_id uuid references campaigns(id) on delete cascade,
--     task_id uuid references tasks(id) on delete cascade,
--     column_id text,
--     file_name text not null,
--     file_path text not null,
--     file_size int,
--     mime_type text,
--     created_at timestamptz default now()
--   );
--   create index if not exists task_files_task_idx on task_files (task_id);
--   alter table task_files enable row level security;
--   drop policy if exists "mvp open access" on task_files;
--   create policy "mvp open access" on task_files
--     for all using (true) with check (true);
--
-- Expected result: "Success. No rows returned."
--
-- Note: task files reuse the changeflow-documents storage bucket created in
-- migration-002, whose bucket-wide storage policies already allow the app to
-- upload/download there — no new storage policy is needed.
-- ============================================================================

alter table tasks add column if not exists updated_at timestamptz default now();
update tasks set updated_at = now() where updated_at is null;
alter table tasks add column if not exists group_name text default 'To-Do';
update tasks set group_name = 'Completed' where status = 'done';
alter table tasks add column if not exists custom jsonb default '{}'::jsonb;

create table if not exists task_columns (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  name text not null,
  type text not null check (type in ('status','text','people','date','numbers','files','checkbox','priority')),
  options jsonb default '{}'::jsonb,
  position int default 0,
  created_at timestamptz default now()
);
create index if not exists task_columns_campaign_position_idx
  on task_columns (campaign_id, position);

create table if not exists task_groups (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  name text not null,
  position int default 0,
  created_at timestamptz default now(),
  unique (campaign_id, name)
);
create index if not exists task_groups_campaign_position_idx
  on task_groups (campaign_id, position);

create table if not exists task_files (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  column_id text,
  file_name text not null,
  file_path text not null,
  file_size int,
  mime_type text,
  created_at timestamptz default now()
);
create index if not exists task_files_task_idx on task_files (task_id);

-- Row Level Security: open for anon in solo-dev MVP, mirroring earlier migrations.
-- !!! LOCK DOWN BEFORE ANY EXTERNAL USER: replace with org/user-scoped
-- policies in the auth phase (Phase 3). Do not ship multi-user access on this.
alter table task_columns enable row level security;
drop policy if exists "mvp open access" on task_columns;
create policy "mvp open access" on task_columns
  for all using (true) with check (true);

alter table task_groups enable row level security;
drop policy if exists "mvp open access" on task_groups;
create policy "mvp open access" on task_groups
  for all using (true) with check (true);

alter table task_files enable row level security;
drop policy if exists "mvp open access" on task_files;
create policy "mvp open access" on task_files
  for all using (true) with check (true);
