-- Migration: Initial schema
-- TraaaKe Concours Screenshot — Phase 2

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── environments ───────────────────────────────────────────────────────────
create table environments (
  id         uuid primary key default uuid_generate_v4(),
  name       text unique not null,          -- 'test' | 'production'
  label      text not null,
  is_active  boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── contest_settings ───────────────────────────────────────────────────────
create table contest_settings (
  id                       uuid primary key default uuid_generate_v4(),
  environment_id           uuid references environments(id) on delete cascade,
  guild_id                 text,
  contest_channel_id       text,
  admin_role_id            text,
  photographer_role_id     text,
  announcement_message     text,
  allowed_reaction         text    default '❤️',
  auto_mode_enabled        boolean default true,
  open_day                 text    default 'wednesday',
  open_time                text    default '18:00',
  close_day                text    default 'wednesday',
  close_time               text    default '18:00',
  timezone                 text    default 'Europe/Paris',
  max_entries_per_user     integer default 1,
  allow_text               boolean default false,
  allow_video              boolean default false,
  delete_invalid_messages  boolean default true,
  delete_invalid_reactions boolean default true,
  participation_points     integer default 5,
  top_3_points             integer default 15,
  winner_points            integer default 50,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ─── seasons ────────────────────────────────────────────────────────────────
create table seasons (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  starts_at  timestamptz,
  ends_at    timestamptz,
  is_active  boolean default false,
  created_at timestamptz default now()
);

-- ─── contests ───────────────────────────────────────────────────────────────
create table contests (
  id                              uuid primary key default uuid_generate_v4(),
  environment_id                  uuid references environments(id),
  season_id                       uuid references seasons(id),
  status                          text default 'draft', -- draft|open|paused|closed|archived
  title                           text,
  discord_announcement_message_id text,
  started_at                      timestamptz,
  ends_at                         timestamptz,
  closed_at                       timestamptz,
  winner_discord_user_id          text,
  winner_participation_id         uuid,                 -- FK added after participations
  total_participations            integer default 0,
  total_votes                     integer default 0,
  created_at                      timestamptz default now(),
  updated_at                      timestamptz default now()
);

-- ─── participants ────────────────────────────────────────────────────────────
create table participants (
  id                   uuid primary key default uuid_generate_v4(),
  discord_user_id      text unique not null,
  discord_username     text,
  discord_display_name text,
  avatar_url           text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ─── participations ──────────────────────────────────────────────────────────
create table participations (
  id                 uuid primary key default uuid_generate_v4(),
  contest_id         uuid references contests(id),
  participant_id     uuid references participants(id),
  discord_message_id text,
  image_url          text,
  vote_count         integer default 0,
  final_rank         integer,
  is_winner          boolean default false,
  is_valid           boolean default true,
  submitted_at       timestamptz default now(),
  created_at         timestamptz default now()
);

-- FK deferred: contests → participations
alter table contests
  add constraint contests_winner_participation_id_fkey
  foreign key (winner_participation_id) references participations(id);

-- ─── points_ledger ───────────────────────────────────────────────────────────
create table points_ledger (
  id             uuid primary key default uuid_generate_v4(),
  environment_id uuid references environments(id),
  season_id      uuid references seasons(id),
  contest_id     uuid references contests(id),
  participant_id uuid references participants(id),
  reason         text not null,
  points         integer not null,
  created_at     timestamptz default now()
);

-- ─── bot_logs ────────────────────────────────────────────────────────────────
create table bot_logs (
  id             uuid primary key default uuid_generate_v4(),
  environment_id uuid references environments(id),
  level          text default 'info',  -- info|warn|error
  message        text not null,
  metadata       jsonb,
  created_at     timestamptz default now()
);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger environments_updated_at
  before update on environments
  for each row execute function update_updated_at();

create trigger contest_settings_updated_at
  before update on contest_settings
  for each row execute function update_updated_at();

create trigger contests_updated_at
  before update on contests
  for each row execute function update_updated_at();

create trigger participants_updated_at
  before update on participants
  for each row execute function update_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Phase 2: permissive (no auth yet). Tighten in Phase 3 with Discord OAuth.

alter table environments      enable row level security;
alter table contest_settings  enable row level security;
alter table seasons            enable row level security;
alter table contests           enable row level security;
alter table participants       enable row level security;
alter table participations     enable row level security;
alter table points_ledger      enable row level security;
alter table bot_logs           enable row level security;

create policy "phase2_allow_all" on environments      for all using (true) with check (true);
create policy "phase2_allow_all" on contest_settings  for all using (true) with check (true);
create policy "phase2_allow_all" on seasons            for all using (true) with check (true);
create policy "phase2_allow_all" on contests           for all using (true) with check (true);
create policy "phase2_allow_all" on participants       for all using (true) with check (true);
create policy "phase2_allow_all" on participations     for all using (true) with check (true);
create policy "phase2_allow_all" on points_ledger      for all using (true) with check (true);
create policy "phase2_allow_all" on bot_logs           for all using (true) with check (true);
