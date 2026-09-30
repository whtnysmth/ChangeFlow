# ChangeFlow Data Model (plain English)

Core idea: the data never changes. Only the lens changes.

## Building blocks

- **Campaign**: The change you are trying to make. Example: "Q4 Platform Migration." Has a start date, target date, status, and a framework choice (ADKAR, Kotter, Lewin, or Custom).

- **People / Stakeholder Groups**: Who is impacted. Groups like Leadership, Managers, Employees, Contractors. Each person belongs to a group. We track engagement per group.

- **Actions (Interventions)**: Things you do to drive change. Types: communication, training, event, sponsor action. Each action links to a campaign and optionally to a framework phase.

- **Metrics**: Numbers we track over time. Adoption Rate, Training Completion, Engagement %, Readiness Score, Sustainment Health. Each metric has a source: manual entry for now, API later (HRIS, LMS, product telemetry).

- **Risks / Issues**: What could go wrong. Has severity, owner, status. High-priority risks surface on the dashboard.

- **Wins**: Proof it's working. Especially important for Kotter, useful for all.

- **Milestones**: Key dates. Each milestone maps to a framework phase.

- **Activity**: Feed of what happened. Meetings, feedback, completions, risks logged.

## Why this works for the toggle

ADKAR, Kotter, and Lewin all talk about the same underlying reality — people, actions, and outcomes — they just slice it differently. So we store the reality once, and each framework defines how to *view* it.

Example: A training completion is stored once. In ADKAR it feeds Knowledge/Ability. In Kotter it feeds Enable Action. In Lewin it feeds Change. Same data, different label via the framework definition.
