-- Migration: Auth & Discord integration
-- TraaaKe Concours Screenshot — Phase 2.5

-- ─── user_profiles ───────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-level role and Discord connection
create table user_profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  role                     text not null default 'viewer', -- owner|administrator|moderator|viewer
  display_name             text,
  -- Discord connection (nullable until user connects Discord)
  discord_id               text unique,
  discord_username         text,
  discord_display_name     text,
  discord_avatar_url       text,
  -- Tokens stored server-side only, never exposed to client
  discord_access_token     text,
  discord_refresh_token    text,
  discord_token_expires_at timestamptz,
  -- Cached guild list (refreshed on sync)
  discord_guilds           jsonb,
  discord_last_sync        timestamptz,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ─── discord_guild_configs ───────────────────────────────────────────────────
-- Per-guild Discord configuration (channels, roles) — replaces manual ID entry
create table discord_guild_configs (
  id                   uuid primary key default uuid_generate_v4(),
  environment_id       uuid references environments(id) on delete cascade,
  guild_id             text not null,
  guild_name           text,
  guild_icon_url       text,
  guild_member_count   integer,
  -- Selected channel/role IDs (set via dropdowns after fetching from Discord)
  contest_channel_id   text,
  contest_channel_name text,
  admin_role_id        text,
  admin_role_name      text,
  photographer_role_id text,
  photographer_role_name text,
  bot_present          boolean default false,
  last_sync            timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique (environment_id, guild_id)
);

-- ─── Triggers ────────────────────────────────────────────────────────────────
create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at();

create trigger discord_guild_configs_updated_at
  before update on discord_guild_configs
  for each row execute function update_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table user_profiles        enable row level security;
alter table discord_guild_configs enable row level security;

-- user_profiles: each user can only read/update their own profile
create policy "users_own_profile" on user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- discord_guild_configs: authenticated users can read; only owner/admin can write
-- Phase 2.5: permissive for authenticated users — tighten in Phase 3
create policy "authenticated_read_guild_configs" on discord_guild_configs
  for select using (auth.role() = 'authenticated');

create policy "authenticated_write_guild_configs" on discord_guild_configs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ─── Auto-create profile on signup ───────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
