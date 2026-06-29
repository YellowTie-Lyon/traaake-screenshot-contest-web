-- Align schema with bot implementation

-- contest_settings: add points columns + bot-facing fields
ALTER TABLE contest_settings
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contest_title text,
  ADD COLUMN IF NOT EXISTS points_1st integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS points_2nd integer NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS points_3rd integer NOT NULL DEFAULT 50;

-- contests: add warning_sent flag used by bot reminder cron
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS warning_sent boolean NOT NULL DEFAULT false;

-- participants: the bot writes discord_user_id + avatar_url (not discord_id/discord_avatar_url)
-- Create table if it doesn't exist with the right shape, or add missing columns
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS discord_user_id text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Unique constraint on discord_user_id for upsert
CREATE UNIQUE INDEX IF NOT EXISTS participants_discord_user_id_key
  ON participants (discord_user_id)
  WHERE discord_user_id IS NOT NULL;

-- participations: add message_id for vote tracking
ALTER TABLE participations
  ADD COLUMN IF NOT EXISTS message_id text;

-- contests: align status enum — bot uses 'active', 'tiebreak', 'closed'
-- If the column is already text, just update existing values
UPDATE contests SET status = 'active' WHERE status = 'open';
UPDATE contests SET status = 'closed' WHERE status IN ('paused', 'archived', 'draft');
