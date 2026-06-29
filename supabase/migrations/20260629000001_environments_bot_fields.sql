-- Add bot credentials columns to environments table
-- discord_bot_token is written by the dashboard (admin client only) and read by the bot via service role
-- Never exposed to the browser (excluded from anon key selects)
ALTER TABLE environments
  ADD COLUMN IF NOT EXISTS discord_bot_token text,
  ADD COLUMN IF NOT EXISTS discord_app_id text;

-- Ensure only one environment can be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS environments_one_active
  ON environments (is_active)
  WHERE is_active = true;
