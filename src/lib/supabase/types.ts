export type EnvironmentName = 'test' | 'production'
// Bot statuses: active | tiebreak | closed. suspended/archived are admin-only overrides.
export type ContestStatus = 'active' | 'tiebreak' | 'suspended' | 'closed' | 'archived'
export type UserRole = 'owner' | 'administrator' | 'moderator' | 'viewer'

export interface DbEnvironment {
  id: string
  name: EnvironmentName
  label: string
  is_active: boolean
  discord_bot_token: string | null
  discord_app_id: string | null
  created_at: string
  updated_at: string
}

export interface DbContestSettings {
  id: string
  environment_id: string
  is_active: boolean
  contest_title: string | null
  guild_id: string | null
  contest_channel_id: string | null
  admin_role_id: string | null
  photographer_role_id: string | null
  announcement_message: string | null
  allowed_reaction: string
  // Points
  points_1st: number
  points_2nd: number
  points_3rd: number
  participation_points: number
  // Schedules
  auto_mode_enabled: boolean
  open_day: string
  open_time: string
  close_day: string
  close_time: string
  timezone: string
  // Reminders
  reminder_day: number
  reminder_hour: number
  reminder_message: string | null
  // Tiebreak & closing
  tiebreak_duration_hours: number
  warning_minutes: number
  // Participation
  promo_interval: number
  // Toggles
  allow_text: boolean
  allow_videos: boolean
  delete_invalid_messages: boolean
  delete_invalid_reactions: boolean
  created_at: string
  updated_at: string
}

export interface DbContest {
  id: string
  environment_id: string
  season_id: string | null
  status: ContestStatus
  title: string | null
  theme: string | null
  started_at: string | null
  ends_at: string | null
  closed_at: string | null
  winner_participation_id: string | null
  opening_message_id: string | null
  rules_message_id: string | null
  tiebreak_message_id: string | null
  // Denormalized counters — may not be up to date, prefer live queries
  total_participations: number
  total_votes: number
  created_at: string
  updated_at: string
}

export interface DbSeason {
  id: string
  name: string
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
}

export interface DbParticipant {
  id: string
  discord_user_id: string
  discord_username: string | null
  discord_display_name: string | null
  avatar_url: string | null
  win_count: number
  participation_count: number
  updated_at: string
}

export interface DbContestBan {
  id: string
  environment_id: string
  discord_user_id: string
  discord_username: string
  reason: string | null
  banned_by: string
  banned_at: string
  expires_at: string | null
}

export interface DbParticipation {
  id: string
  participant_id: string
  contest_id: string
  image_url: string | null
  message_id: string | null
  vote_count: number
  submitted_at: string
}

export type TabSlug = 'dashboard' | 'concours' | 'membres' | 'bans' | 'discord' | 'reglages' | 'historique' | 'logs' | 'utilisateurs'

export const ALL_TABS: { slug: TabSlug; label: string }[] = [
  { slug: 'dashboard', label: 'Dashboard' },
  { slug: 'concours', label: 'Concours' },
  { slug: 'membres', label: 'Membres' },
  { slug: 'bans', label: 'Bans' },
  { slug: 'discord', label: 'Intégration Discord' },
  { slug: 'reglages', label: 'Réglages' },
  { slug: 'historique', label: 'Historique' },
  { slug: 'logs', label: 'Logs bot' },
]

export interface DbUserProfile {
  id: string
  role: UserRole
  display_name: string | null
  allowed_tabs: TabSlug[]
  discord_id: string | null
  discord_username: string | null
  discord_display_name: string | null
  discord_avatar_url: string | null
  discord_guilds: DiscordGuild[] | null
  discord_last_sync: string | null
  created_at: string
  updated_at: string
}

export interface DbDiscordGuildConfig {
  id: string
  environment_id: string
  guild_id: string
  guild_name: string | null
  guild_icon_url: string | null
  guild_member_count: number | null
  contest_channel_id: string | null
  contest_channel_name: string | null
  log_channel_id: string | null
  admin_role_id: string | null
  admin_role_name: string | null
  photographer_role_id: string | null
  photographer_role_name: string | null
  bot_present: boolean
  last_sync: string | null
  created_at: string
  updated_at: string
}

export interface GuildChannel {
  guild_id: string
  channel_id: string
  channel_name: string
  channel_type: 'text' | 'announcement'
  updated_at: string
}

export interface GuildRole {
  guild_id: string
  role_id: string
  role_name: string
  role_color: number
  position: number
  updated_at: string
}

export interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
  approximate_member_count?: number
}

export interface DiscordChannel {
  id: string
  name: string
  type: number
}

export interface DiscordRole {
  id: string
  name: string
  color: number
  position: number
}
