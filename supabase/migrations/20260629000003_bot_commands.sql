CREATE TABLE IF NOT EXISTS bot_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid REFERENCES environments(id) ON DELETE CASCADE,
  command text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_manage_bot_commands"
  ON bot_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bot_commands;
