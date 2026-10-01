-- ============================================================================
-- Migration 006: library_documents table (Documents tab — direct uploads)
-- ============================================================================
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (copy everything below this header):
--
--   create table if not exists library_documents (
--     id uuid primary key default gen_random_uuid(),
--     campaign_id uuid references campaigns(id) on delete cascade,
--     title text,
--     file_name text not null,
--     file_path text not null,
--     file_size int,
--     mime_type text,
--     modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
--     task_id uuid references tasks(id) on delete set null,
--     created_at timestamptz default now()
--   );
--
--   create index if not exists library_documents_campaign_created_idx
--     on library_documents (campaign_id, created_at desc);
--
--   alter table library_documents enable row level security;
--   drop policy if exists "mvp open access" on library_documents;
--   create policy "mvp open access" on library_documents
--     for all using (true) with check (true);
--
-- Expected result: "Success. No rows returned."
-- ============================================================================

create table if not exists library_documents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  title text,
  file_name text not null,
  file_path text not null,
  file_size int,
  mime_type text,
  modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists library_documents_campaign_created_idx
  on library_documents (campaign_id, created_at desc);

-- Row Level Security: open for anon in solo-dev MVP, mirroring schema.sql and
-- migrations 002–005.
-- !!! LOCK DOWN BEFORE ANY EXTERNAL USER: replace with org/user-scoped
-- policies in the auth phase (Phase 3). Do not ship multi-user access on this.
alter table library_documents enable row level security;
drop policy if exists "mvp open access" on library_documents;
create policy "mvp open access" on library_documents
  for all using (true) with check (true);
