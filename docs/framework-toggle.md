# Framework Toggle Logic (plain English)

## How it works

Each campaign has one setting: `framework` = adkar, kotter, lewin, or custom.

When you pick a framework, ChangeFlow loads that framework's definition file from `/frameworks/`. That file tells the dashboard:

- What phases to show and what to call them
- Which widgets to show by default
- Which numbers matter most
- What checklists to suggest
- What words to use (sponsor coalition vs guiding coalition vs champions)

## What changes vs what stays

- **Changes**: phase labels, default dashboard layout, suggested artifacts, terminology.
- **Stays the same**: your campaigns, people, actions, metrics, risks, wins, milestones, activity. Nothing is deleted.

## Switching mid-campaign

You can switch frameworks at any time.

- We keep all your data.
- We map what we can: e.g., ADKAR "Awareness" progress informs Kotter "Create Urgency" progress.
- We flag what doesn't translate cleanly and show you a short summary: "2 milestones don't have a direct Kotter equivalent — review them."
- You confirm before the view changes.

## Custom mode

Custom starts from whichever framework you like as a base, then you add/remove widgets from the library in `/widgets/registry.json`. The layout is saved per campaign and can be saved as an org template for reuse.
