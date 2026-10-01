-- ============================================================================
-- Migration 002: phase_documents table + changeflow-documents storage bucket
-- ============================================================================
--
-- MANUAL STEP — create the storage bucket (Supabase dashboard):
--   1. Open the Supabase dashboard for this project.
--   2. Go to Storage in the left sidebar.
--   3. Click "New bucket".
--   4. Name: changeflow-documents
--   5. Public bucket: OFF (keep it private; the app uses signed URLs for downloads).
--   6. Click "Create bucket".
--
-- Alternative (SQL editor, run as a privileged role):
--   insert into storage.buckets (id, name, public)
--   values ('changeflow-documents', 'changeflow-documents', false)
--   on conflict (id) do nothing;
--
-- After the bucket exists, run the rest of this file in the SQL editor to
-- create the table and its policies. Table + storage policies are in one file
-- so a fresh project gets the whole feature from a single run.
-- ============================================================================

create table if not exists phase_documents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  modality text not null check (modality in ('assess','mobilize','enable','adopt','sustain')),
  title text not null,
  notes text,
  file_name text,
  file_path text,
  file_size int,
  mime_type text,
  created_at timestamptz default now()
);

create index if not exists phase_documents_campaign_modality_idx
  on phase_documents (campaign_id, modality, created_at desc);

-- Row Level Security: open for anon in solo-dev MVP, mirroring schema.sql.
-- !!! LOCK DOWN BEFORE ANY EXTERNAL USER: replace with org/user-scoped
-- policies in the auth phase (Phase 3). Do not ship multi-user access on this.
alter table phase_documents enable row level security;
drop policy if exists "mvp open access" on phase_documents;
create policy "mvp open access" on phase_documents
  for all using (true) with check (true);

-- Storage policies for the private changeflow-documents bucket.
-- Same MVP posture as the table above: anon can read/write while Whitney is
-- the only user. Replace with authenticated, user-scoped policies in Phase 3.
drop policy if exists "mvp open storage access" on storage.objects;
create policy "mvp open storage access" on storage.objects
  for all
  using (bucket_id = 'changeflow-documents')
  with check (bucket_id = 'changeflow-documents');
