# Translation Guide + Info Icon (plain English)

## The problem

ADKAR, Kotter, and Lewin use different words for overlapping ideas. Users get confused when they switch frameworks or work with people trained in a different model.

## The solution: ⓘ info icon

Next to every phase label and widget label, we show a small ⓘ symbol.

Hovering (or tapping on mobile, or focusing with keyboard) opens a tooltip with:

1. A one-line plain-English definition of what this is
2. What it's called in the other two frameworks

## Examples

- **Barrier Analysis ⓘ**
  Tooltip: "Shows which ADKAR element is blocking each group. Kotter: Barrier removal under 'Enable Action'. Lewin: Readiness gaps in 'Unfreeze'."

- **Awareness ⓘ**
  Tooltip: "People understand why the change is needed. Kotter: Create urgency + Form vision. Lewin: Unfreeze."

- **Quick Wins Log ⓘ**
  Tooltip: "Early successes logged and communicated. ADKAR: Proof of Ability and Reinforcement. Lewin: Momentum in Change."

## Design rules

- Icon sits to the right of the label, muted color, 16px
- Keyboard-focusable for accessibility
- Tooltip never blocks the underlying number — it appears above or to the side
- In Custom mode, the tooltip still works — it shows translations for whatever framework the widget came from

## Where translations live

- Phases: each phase in `/frameworks/*.json` has an `info_icon.tooltip` field
- Widgets: each widget in `/widgets/registry.json` has an `info_icon` map with per-framework translations

This keeps translations in config, not hardcoded, so we can refine wording without touching code.
