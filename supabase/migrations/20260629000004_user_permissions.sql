-- Add allowed_tabs to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS allowed_tabs text[] NOT NULL DEFAULT '{}';

-- Owner always has all tabs — enforce via app logic, not DB constraint

-- Trigger: auto-create user_profiles on new auth user (from invite metadata)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name, allowed_tabs)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'allowed_tabs')),
      '{}'::text[]
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
