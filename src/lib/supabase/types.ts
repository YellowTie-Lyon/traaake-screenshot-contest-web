export type EnvironmentName = 'test' | 'production'
export type ContestStatus = 'draft' | 'open' | 'paused' | 'closed' | 'archived'
export type UserRole = 'owner' | 'administrator' | 'moderator' | 'viewer'

export interface DbEnvironment {
  id: string
  name: EnvironmentName
  label: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbContestSettings {
  id: string
  environment_id: string
  guild_id: string | null
  contest_channel_id: string | null
  admin_role_id: string | null
  photographer_role_id: string | null
  announcement_message: string | null
  allowed_reaction: string
  auto_mode_enabled: boolean
  open_day: string
  open_time: string
  close_day: string
  close_time: string
  timezone: string
  max_entries_per_user: number
  allow_text: boolean
  allow_video: boolean
  delete_invalid_messages: boolean
  delete_invalid_reactions: boolean
  participation_points: number
  top_3_points: number
  winner_points: number
  created_at: string
  updated_at: string
}

export interface DbContest {
  id: string
  environment_id: string
  season_id: string | null
  status: ContestStatus
  title: string | null
  discord_announcement_message_id: string | null
  started_at: string | null
  ends_at: string | null
  closed_at: string | null
  winner_discord_user_id: string | null
  winner_participation_id: string | null
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

export interface DbUserProfile {
  id: string
  role: UserRole
  display_name: string | null
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
  admin_role_id: string | null
  admin_role_name: string | null
  photographer_role_id: string | null
  photographer_role_name: string | null
  bot_present: boolean
  last_sync: string | null
  created_at: string
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
