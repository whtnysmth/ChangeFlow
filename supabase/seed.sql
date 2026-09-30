-- ChangeFlow seed: Q4 Platform Migration campaign
-- Run AFTER schema.sql in the Supabase SQL editor.

do $$
declare cid uuid;
begin
  insert into campaigns (name, status, state, framework, start_date, target_date)
  values (
    'Q4 Platform Migration — Change Management',
    'On Track', 'Active', 'adkar',
    '2024-10-01', '2025-01-31'
  )
  returning id into cid;

  insert into stakeholder_groups (campaign_id, group_name, engagement_percent, engaged_count)
  values
    (cid, 'Leadership', 92, 12),
    (cid, 'Managers', 74, 28),
    (cid, 'Employees', 58, 134),
    (cid, 'Contractors', 42, 21);

  insert into metrics (campaign_id, metric_key, value, delta_text, extra)
  values
    (cid, 'adoption_rate', 78, '+8% vs last month', '{}'),
    (cid, 'training_completion', 64, '+12% vs last month', '{}'),
    (cid, 'communications_sent', 152, '48 pending',
      '{"total": 200, "pending": 48}'),
    (cid, 'open_risks', 25, '2 high priority',
      '{"high_priority": 2}'),
    (cid, 'readiness_score', 74, 'Assessed Oct 1, pre-launch',
      '{"dimensions": [{"label": "Leadership alignment", "value": 88}, {"label": "Team capacity", "value": 66}, {"label": "Tech readiness", "value": 71}]}'),
    (cid, 'sustainment_health', 68, '+4% this month',
      '{"reversion_rate": 6}');

  -- ADKAR barrier detail lives on the adoption metric for now
  insert into metrics (campaign_id, metric_key, value, delta_text, extra)
  values
    (cid, 'barrier_analysis', 41, 'Biggest barrier: Reinforcement',
      '{"stages": [{"stage": "Awareness", "percent": 85}, {"stage": "Desire", "percent": 72}, {"stage": "Knowledge", "percent": 64}, {"stage": "Ability", "percent": 55}, {"stage": "Reinforcement", "percent": 41}]}');

  insert into milestones (campaign_id, title, milestone_date, status)
  values
    (cid, 'Training Cohort 3 Launch', '2024-11-15', 'Scheduled'),
    (cid, 'Go-Live Readiness Review', '2024-11-25', 'In Progress'),
    (cid, 'Comms: Executive Announcement Email', '2024-11-18', 'Planned');

  insert into activity (campaign_id, text, meta, tone)
  values
    (cid, 'Sponsor coalition meeting completed', 'Posted by Sarah K. • 2h ago', 'purple'),
    (cid, 'New feedback from IT department added', '3 comments • 5h ago', 'teal'),
    (cid, 'Risk logged: Vendor onboarding delay', 'Risk #R-023 • 8h ago', 'yellow'),
    (cid, '24 employees completed training module', 'Training Plan • 12h ago', 'green');

  insert into risks (campaign_id, title, severity, status)
  values
    (cid, 'Vendor onboarding delay', 'high', 'open'),
    (cid, 'Contractor training capacity', 'high', 'open'),
    (cid, 'Executive comms timing', 'medium', 'open');

  insert into wins (campaign_id, title, win_date, impact)
  values
    (cid, 'Pilot team fully migrated', '2024-10-28', 'High'),
    (cid, 'Training completion hit 60%', '2024-11-04', 'Medium'),
    (cid, 'Support tickets down 18%', '2024-11-10', 'High');

  insert into sponsors (campaign_id, name, role, status)
  values
    (cid, 'Sarah K.', 'Executive Sponsor', 'Active'),
    (cid, 'David M.', 'IT Lead', 'Active'),
    (cid, 'Priya R.', 'Ops Lead', 'At Risk'),
    (cid, 'James L.', 'Comms Lead', 'Active');
end $$;
