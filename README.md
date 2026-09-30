# ChangeFlow

The most optimized Change Management Software — beyond project management.

ChangeFlow incorporates the fundamental frameworks of change management and project management, with an optimized, customizable dashboard to understand every outcome, status, risk, opportunity, win, timeline, event, and key finding.

## Vision

Projects end. Change has to sustain. ChangeFlow is the system of record for *adoption*, not just delivery.

## Framework Toggle

Top 3 models supported, each with its own interface:
- **Prosci ADKAR** — Awareness, Desire, Knowledge, Ability, Reinforcement
- **Kotter 8-Step** — Urgency, Coalition, Vision, Volunteers, Action, Wins, Acceleration, Institute
- **Lewin** — Unfreeze, Change, Refreeze

Plus **Custom** mode: start from any framework and add/remove dashboard widgets. Save as org template.

See `/frameworks/` for definitions.

## Info Icon Translation

Any phase or widget label with an ⓘ shows a hover tooltip translating that concept across the other frameworks. Example: hovering ⓘ next to "Barrier Analysis" in ADKAR shows what it's called in Kotter and Lewin.

See `docs/translation-guide.md`.

## Free-First Stack (solo founder stage)

- Code: GitHub free, VS Code
- Frontend: Vite + React + Tailwind (open source)
- Backend: Supabase free tier (Postgres + Auth + Realtime)
- Hosting: Vercel free tier
- Design: Figma free, Excalidraw free

No paid services required for MVP.

## Repo Layout

- `/frameworks/` — adkar.json, kotter.json, lewin.json (phases, default widgets, metrics, artifacts, terminology)
- `/widgets/` — registry.json (full widget library + info-icon translations)
- `/docs/` — data-model.md, framework-toggle.md, translation-guide.md

## Status

Phase 1 planning complete. Phase 2 scaffold in progress.
