-- ChangeFlow Supabase schema v1
-- Matches docs/data-model.md. Run in the Supabase SQL editor.
-- RLS is enabled with open anon policies for solo-dev MVP.
-- Hardening (auth + scoped RLS) is a later step before any shared launch.

-- Campaigns: the change you're trying to make
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'On Track',
  state text not null default 'Active',
  framework text not null default 'adkar',
  start_date date,
  target_date date,
  created_at timestamptz default now()
);

-- Stakeholder groups: who is impacted
create table if not exists stakeholder_groups (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  group_name text not null,
  engagement_percent int not null,
  engaged_count int not null default 0
);

-- Metrics: numbers tracked over time (adoption_rate, training_completion, ...)
create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  metric_key text not null,
  value numeric,
  delta_text text,
  extra jsonb default '{}',
  recorded_at timestamptz default now()
);

-- Milestones: key dates
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  title text not null,
  milestone_date date,
  status text not null default 'Planned'
);

-- Activity: feed of what happened
create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  text text not null,
  meta text,
  tone text default 'teal',
  created_at timestamptz default now()
);

-- Risks / issues
create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  title text not null,
  severity text not null default 'medium',
  status text not null default 'open'
);

-- Wins: proof it's working
create table if not exists wins (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  title text not null,
  win_date date,
  impact text
);

-- Sponsors / coalition members
create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  name text not null,
  role text,
  status text default 'Active'
);

-- Dashboard templates: saved Custom layouts
create table if not exists dashboard_templates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  name text not null,
  widget_ids text[] not null,
  is_org_template boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security: open for anon in solo-dev MVP.
-- Tighten before sharing the app with anyone else.
do $$
declare t text;
begin
  foreach t in array array[
    'campaigns','stakeholder_groups','metrics','milestones',
    'activity','risks','wins','sponsors','dashboard_templates'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'drop policy if exists "mvp open access" on %I', t
    );
    execute format(
      'create policy "mvp open access" on %I for all using (true) with check (true)',
      t
    );
  end loop;
end $$;
