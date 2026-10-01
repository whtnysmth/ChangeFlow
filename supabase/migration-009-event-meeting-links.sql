-- Migration 009: meeting links on calendar events (Zoom / Google Meet / Teams)
-- Paste into the Supabase SQL editor. Expect "Success. No rows returned."

alter table events add column if not exists meeting_url text;
