# Phase 3 Plan — Dashboard Engine + Widget Library

## Goal

Build a working, clickable ChangeFlow dashboard that can toggle between ADKAR, Kotter, Lewin, and Custom without losing data. No real integrations yet — we use mock data.

## Why this phase matters

This is where ChangeFlow stops being docs and starts being software. If the engine works, adding a 4th framework later is just config. If it doesn't, we're stuck rebuilding UI for every framework.

## Architecture (free-first)

- **Vite + React + Tailwind** — free, open source, fast. Hosted later on Vercel free tier.
- **No backend yet** — mock data in `/src/data/mockData.js`. Supabase comes in Phase 5 for real persistence.
- **One engine, not three dashboards** — `DashboardEngine.jsx` reads the active framework JSON and renders phases + widgets dynamically.

## Components to build

### 1. Framework loader
Reads from `/frameworks/*.json`. Returns phases, default widgets, terminology, metrics. Single source of truth.

### 2. DashboardEngine.jsx
Core component. Takes `framework` + `customLayout` as props. Renders:
- Header: campaign name, status, date range, framework toggle
- Phase tracker: horizontal stepper showing phases for active framework
- Widget grid: renders widgets from default layout or custom layout
- All labels go through terminology map

### 3. FrameworkToggle.jsx
Dropdown or pill toggle: ADKAR | Kotter | Lewin | Custom. Switching updates engine state, preserves all data, shows a brief "mapped 2 milestones" notice if anything doesn't translate cleanly.

### 4. InfoIcon.jsx
Reusable ⓘ component. Props: `tooltip` text. Behavior: hover on desktop, tap on mobile, focusable for keyboard. Used next to every phase label and widget title. Pulls tooltip text from framework JSON or widget registry.

### 5. Widget components (12)
Each widget is a standalone React component in `/src/widgets/`:
- AdoptionRate, TrainingCompletion, CommunicationsSent, OpenRisks
- StakeholderEngagement, SponsorCoalitionHealth, BarrierAnalysis
- QuickWinsLog, ReadinessScore, SustainmentHealth
- Milestones, RecentActivity

Each widget: title + ⓘ, visualization (donut, bar, list, feed), mock data, plain-English footer.

### 6. Custom builder
Panel to add/remove widgets from the library. State: `customLayout` array of widget IDs. Actions: add, remove, reset to framework default, save as template (localStorage for now, Supabase later).

### 7. Mock data layer
`src/data/mockData.js` — mirrors the Q4 Platform Migration mockup: 78% adoption, 64% training, 152/200 comms, stakeholder groups, milestones, recent activity. Structured to match `docs/data-model.md`.

## File structure

```
app/
  package.json
  vite.config.js
  index.html
  src/
    main.jsx
    App.jsx
    components/
      DashboardEngine.jsx
      FrameworkToggle.jsx
      InfoIcon.jsx
      PhaseTracker.jsx
      CustomBuilder.jsx
    widgets/
      (12 widget components)
      WidgetRenderer.jsx
    data/
      mockData.js
```

Framework JSONs are imported from `../frameworks/` — single source, no duplication.

## Build steps

1. Scaffold Vite app structure + install Tailwind (CDN for speed in MVP, proper build later)
2. Build InfoIcon + FrameworkToggle (small, testable)
3. Build DashboardEngine + PhaseTracker (reads framework JSON)
4. Build 4 core widgets first (AdoptionRate, TrainingCompletion, StakeholderEngagement, OpenRisks), then the remaining 8
5. Build CustomBuilder (add/remove/save)
6. Wire mock data through everything, verify toggle preserves data

## Done looks like

- You can open the app, see the Q4 Platform Migration dashboard
- Toggle ADKAR → Kotter → Lewin and watch phases, widgets, and language change, data stays
- Hover any ⓘ and see cross-framework translation
- In Custom mode, remove a widget, add a different one, save as template
- No console errors, works on mobile width

## Out of scope for Phase 3

- Real backend / Supabase persistence (Phase 5)
- Real integrations: HRIS, LMS, Slack, Google (Phase 5)
- AI layer: predictive risk, auto-drafted comms (Phase 6)
- Auth, multi-user, permissions (later)
- Pixel-perfect styling — clean and usable, not final design

## Risks

- Scope creep: 12 widgets is a lot. Mitigation: build 4 core first, stub the rest with simple cards.
- Over-abstracting the engine too early. Mitigation: hardcode as little as possible, but don't build a plugin system yet.
