# Supabase Setup (free tier)

ChangeFlow runs on mock data until you connect Supabase. Once connected,
the dashboard reads live from Postgres and Custom layouts save to the database.

## 1. Create the free project

1. Go to https://supabase.com and sign up (GitHub login is fastest).
2. Create a new project — name it `changeflow`. Free tier, any region near you.
3. Wait ~2 minutes for provisioning.

## 2. Create the tables

1. Open your project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/schema.sql` and click **Run**.
3. Open a new query, paste `supabase/seed.sql`, click **Run**.
   This loads the Q4 Platform Migration campaign so the dashboard has real rows.

## 3. Get the credentials

1. Go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.

## 4. Wire the app

Option A — Gigi wires it: paste the URL and anon key in chat. The anon key is
designed to live in client-side code (it's protected by Row Level Security),
so sharing it here is low-risk.

Option B — do it yourself: copy `app/.env.example` to `app/.env` and fill in
the two values. `.env` is gitignored and never committed.

Then run:

```bash
cd app && npm run dev
```

The header badge switches from "○ Mock data" to "● Live data" when connected.

## Notes

- The anon key is safe to expose in a frontend; the **service_role** key is not.
  Never paste the service_role key anywhere in this app.
- RLS policies are wide open for solo development (`supabase/schema.sql`).
  Before sharing the app with anyone else, add auth and tighten the policies —
  that's a planned pre-launch step.
- If Supabase is unreachable, the app silently falls back to mock data.
