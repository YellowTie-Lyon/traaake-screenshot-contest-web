export interface DbEnvironment {
  id: string
  name: string
  label: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbContest {
  id: string
  environment_id: string
  status: string
  title: string | null
  theme: string | null
  started_at: string | null
  ends_at: string | null
  closed_at: string | null
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

export interface DbParticipation {
  id: string
  participant_id: string
  contest_id: string
  image_url: string | null
  message_id: string | null
  vote_count: number
  submitted_at: string
}
