-- ============================================================================
-- Migration 008: surveys + survey_responses tables (Surveys hub tab —
-- link live surveys, import CSV responses)
-- ============================================================================
--
-- RUN THIS IN THE SUPABASE SQL EDITOR (copy everything below this header):
--
--   create table if not exists surveys (
--     id uuid primary key default gen_random_uuid(),
--     campaign_id uuid references campaigns(id) on delete cascade,
--     title text not null,
--     description text,
--     source text not null check (source in ('link','csv')),
--     url text,
--     tool text check (tool in ('google_forms','ms_forms','surveymonkey','typeform','other')),
--     modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
--     response_count int not null default 0,
--     created_at timestamptz default now(),
--     updated_at timestamptz default now()
--   );
--
--   create index if not exists surveys_campaign_created_idx
--     on surveys (campaign_id, created_at desc);
--
--   create table if not exists survey_responses (
--     id uuid primary key default gen_random_uuid(),
--     survey_id uuid references surveys(id) on delete cascade,
--     campaign_id uuid references campaigns(id) on delete cascade,
--     respondent text,
--     answers jsonb not null default '{}'::jsonb,
--     submitted_at timestamptz default now()
--   );
--
--   create index if not exists survey_responses_survey_submitted_idx
--     on survey_responses (survey_id, submitted_at);
--
--   alter table surveys enable row level security;
--   drop policy if exists "mvp open access" on surveys;
--   create policy "mvp open access" on surveys
--     for all using (true) with check (true);
--
--   alter table survey_responses enable row level security;
--   drop policy if exists "mvp open access" on survey_responses;
--   create policy "mvp open access" on survey_responses
--     for all using (true) with check (true);
--
-- Expected result: "Success. No rows returned."
-- ============================================================================

create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  title text not null,
  description text,
  source text not null check (source in ('link','csv')),
  url text,
  tool text check (tool in ('google_forms','ms_forms','surveymonkey','typeform','other')),
  modality text check (modality in ('assess','mobilize','enable','adopt','sustain')),
  response_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists surveys_campaign_created_idx
  on surveys (campaign_id, created_at desc);

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references surveys(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  respondent text,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz default now()
);

create index if not exists survey_responses_survey_submitted_idx
  on survey_responses (survey_id, submitted_at);

-- Row Level Security: open for anon in solo-dev MVP, mirroring schema.sql and
-- migrations 002–007.
-- !!! LOCK DOWN BEFORE ANY EXTERNAL USER: replace with org/user-scoped
-- policies in the auth phase (Phase 3). Do not ship multi-user access on this.
alter table surveys enable row level security;
drop policy if exists "mvp open access" on surveys;
create policy "mvp open access" on surveys
  for all using (true) with check (true);

alter table survey_responses enable row level security;
drop policy if exists "mvp open access" on survey_responses;
create policy "mvp open access" on survey_responses
  for all using (true) with check (true);
