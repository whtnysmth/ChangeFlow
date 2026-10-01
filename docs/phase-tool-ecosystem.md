# Phase Tool Ecosystem Analysis

What practitioners actually use in each phase, what data feeds ChangeFlow's metrics,
and where integrations should plug in. Free-first lens throughout.

## The headline finding

**Excel/CSV is the universal adapter.** Nearly every tool below exports CSV. That makes
CSV import not a stopgap but the integration strategy covering ~80% of practitioners
on day one. Native API integrations follow for the highest-pull tools per phase.

## ASSESS — readiness, stakeholder analysis, impact

| Work | Tools practitioners use | Data feeding ChangeFlow |
|---|---|---|
| Readiness surveys | Microsoft Forms, Google Forms, SurveyMonkey, Qualtrics | readiness_score, dimensions |
| Stakeholder mapping | Miro, Mural, whiteboards, Excel stakeholder matrices | stakeholder_engagement % |
| Impact assessment | Excel impact matrices, interviews, Jira/ServiceNow (IT changes) | impact notes |

Free-first: Google Forms → Sheets → CSV. Microsoft Forms for M365 shops.

## MOBILIZE — sponsorship, communications planning

| Work | Tools practitioners use | Data feeding ChangeFlow |
|---|---|---|
| Sponsor tracking | Excel, PowerPoint sponsor decks, 15Five/Lattice check-ins | sponsor_coalition_health |
| Comms planning | Excel comms calendars, Smartsheet, Monday.com, Asana | communications_sent (planned vs sent) |
| RACI / accountability | Excel, Miro | — |

Free-first: CSV from Sheets/Excel; Monday.com has a free tier.

## ENABLE — training, communications delivery

| Work | Tools practitioners use | Data feeding ChangeFlow |
|---|---|---|
| Training delivery | **LMS:** Cornerstone, Workday Learning, SuccessFactors, Docebo, TalentLMS (free tier), Moodle (open source) | training_completion % (SCORM/xAPI completion exports) |
| Comms delivery | SharePoint/intranet, Teams/Slack, Outlook/Gmail, Mailchimp | communications_sent |
| Scheduling | Outlook, Google Calendar | — |

Free-first: CSV completion exports from any LMS; Moodle and TalentLMS have APIs
worth integrating natively later.

## ADOPT — barriers & resistance, adoption rate, quick wins

| Work | Tools practitioners use | Data feeding ChangeFlow |
|---|---|---|
| Usage analytics | **Digital Adoption Platforms:** WalkMe, Pendo, Whatfix; M365 usage analytics; Salesforce/system login reports | adoption_rate |
| Resistance signals | Pulse surveys, ServiceNow tickets, focus groups | barrier_analysis |
| Quick wins | Excel, Monday.com | quick_wins_log |

Free-first: CSV usage exports; DAP APIs (Pendo/WalkMe) are the highest-value
native integrations in this phase long-term.

## SUSTAIN — sustainment health, risks, reinforcement

| Work | Tools practitioners use | Data feeding ChangeFlow |
|---|---|---|
| Risk registers | Excel, Jira, ServiceNow | open_risks |
| Reinforcement | Bonusly, Achievers (recognition); ongoing pulse surveys | sustainment_health |
| Sustainment audits | Microsoft/Google Forms checklists | sustainment dimensions |
| Outcome dashboards | Power BI, Tableau | — |

Free-first: CSV risk registers; Jira has a free tier with an API.

## Cross-cutting (all phases)

- **Excel** — the de facto system of record for most practitioners today.
- **SharePoint / Google Drive** — where change documents actually live (decentralized).
  ChangeFlow's per-phase Notes & Documents directly competes here: one home instead
  of scattered drives.
- **Teams / Slack** — comms channel and future nudge surface.

## Integration roadmap (free-first)

1. **CSV import** — universal; every tool above exports it. Highest leverage, build first.
2. **Native document upload** (Supabase Storage, 1 GB free tier) — per-phase Notes &
   Documents; attacks the scattered-drive problem directly.
3. **Google Workspace** — Drive (documents) + Sheets (metric data).
4. **Slack** — comms signals, practitioner nudges.
5. **Microsoft 365** — Forms, SharePoint, Teams. Enterprise-heavy; later.
6. **LMS APIs** — Moodle / TalentLMS first (free/open); then Cornerstone/Docebo.
7. **DAP APIs** — Pendo / WalkMe for adoption telemetry (Adopt phase).

## Notes

- Pricing/tiers change; treat "free tier" claims as directional and re-verify
  before committing to a native integration.
- The Notes & Documents feature (Phase 2 build) is itself an integration play:
  it pulls document gravity into ChangeFlow instead of leaving it in Drive/SharePoint.
