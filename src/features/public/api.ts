import { supabase } from '@/lib/supabase/client'

export interface LeaderboardEntry {
  rank: number
  discord_user_id: string
  discord_username: string | null
  discord_display_name: string | null
  avatar_url: string | null
  total_points: number
  participations: number
  wins: number
}

export interface CurrentContestEntry {
  rank: number
  discord_display_name: string | null
  discord_username: string | null
  avatar_url: string | null
  vote_count: number
  image_url: string | null
  participation_id: string
}

export interface WinnerEntry {
  id: string
  contest_title: string | null
  started_at: string | null
  closed_at: string | null
  winner_name: string | null
  winner_avatar: string | null
  image_url: string | null
  vote_count: number
}

// Active contest leaderboard — ordered by votes
export async function getActiveContestLeaderboard(environmentId: string): Promise<CurrentContestEntry[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('participations')
    .select(`
      id,
      vote_count,
      image_url,
      participant:participant_id (
        discord_user_id,
        discord_display_name,
        discord_username,
        avatar_url
      ),
      contest:contest_id!inner (
        status,
        environment_id
      )
    `)
    .in('contest.status', ['active', 'tiebreak'])
    .eq('contest.environment_id', environmentId)
    .order('vote_count', { ascending: false })

  if (!data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row, i) => ({
    rank: i + 1,
    discord_display_name: row.participant?.discord_display_name ?? null,
    discord_username: row.participant?.discord_username ?? null,
    avatar_url: row.participant?.avatar_url ?? null,
    vote_count: row.vote_count,
    image_url: row.image_url,
    participation_id: row.id,
  }))
}

// Season leaderboard — cumulated points
export async function getSeasonLeaderboard(seasonId?: string): Promise<LeaderboardEntry[]> {
  if (!supabase) return []

  let sid = seasonId
  if (!sid) {
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single()
    sid = season?.id
  }
  if (!sid) return []

  // Base: all participants with historical win/participation counts
  const { data: participants } = await supabase
    .from('participants')
    .select('id, discord_user_id, discord_username, discord_display_name, avatar_url, win_count, participation_count')
    .gt('participation_count', 0)

  if (!participants || participants.length === 0) return []

  // Points from ledger for this season (may be empty for historical seasons)
  const { data: ledger } = await supabase
    .from('points_ledger')
    .select('participant_id, points')
    .eq('season_id', sid)

  // Aggregate ledger points by participant
  const pointsMap = new Map<string, number>()
  for (const row of ledger ?? []) {
    pointsMap.set(row.participant_id, (pointsMap.get(row.participant_id) ?? 0) + row.points)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: LeaderboardEntry[] = (participants as any[]).map(p => ({
    rank: 0,
    discord_user_id: p.discord_user_id ?? p.id,
    discord_username: p.discord_username ?? null,
    discord_display_name: p.discord_display_name ?? null,
    avatar_url: p.avatar_url ?? null,
    // Fall back to win_count when no ledger points exist yet (historical data)
    total_points: pointsMap.get(p.id) ?? (p.win_count ?? 0),
    participations: p.participation_count ?? 0,
    wins: p.win_count ?? 0,
  }))

  // Sort: points first, then wins, then participations
  entries.sort((a, b) =>
    b.total_points !== a.total_points ? b.total_points - a.total_points :
    b.wins !== a.wins ? b.wins - a.wins :
    b.participations - a.participations
  )
  entries.forEach((e, i) => { e.rank = i + 1 })
  return entries
}

export async function getRecentWinners(environmentId: string, limit = 10): Promise<WinnerEntry[]> {
  if (!supabase) return []

  const { data } = await supabase
    .from('contests')
    .select(`
      id,
      title,
      started_at,
      closed_at,
      winner_participation:winner_participation_id (
        id,
        image_url,
        vote_count,
        participant:participant_id (
          discord_display_name,
          discord_username,
          avatar_url
        )
      )
    `)
    .eq('status', 'closed')
    .eq('environment_id', environmentId)
    .not('winner_participation_id', 'is', null)
    .order('closed_at', { ascending: false })
    .limit(limit)

  if (!data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(c => {
    const wp = c.winner_participation
    const participant = wp?.participant
    return {
      id: c.id,
      contest_title: c.title,
      started_at: c.started_at,
      closed_at: c.closed_at,
      winner_name: participant?.discord_display_name ?? participant?.discord_username ?? null,
      winner_avatar: participant?.avatar_url ?? null,
      image_url: wp?.image_url ?? null,
      vote_count: wp?.vote_count ?? 0,
    }
  })
}

export interface Season {
  id: string
  name: string
  is_active: boolean
  started_at: string | null
  ended_at: string | null
}

export async function getSeasons(): Promise<Season[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('seasons')
    .select('id, name, is_active, started_at, ended_at')
    .order('started_at', { ascending: false })
  return (data ?? []) as Season[]
}

export async function getActiveSeason() {
  if (!supabase) return null
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .single()
  return data ?? null
}

export async function getActiveContestPublic(environmentId?: string) {
  if (!supabase) return null
  let query = supabase
    .from('contests')
    .select('id, title, status, started_at, ends_at, closed_at, total_participations, total_votes, environment_id')
    .in('status', ['active', 'tiebreak'])
    .order('started_at', { ascending: false })
    .limit(1)
  if (environmentId) query = query.eq('environment_id', environmentId)
  const { data } = await query.single()
  return data ?? null
}

export async function getSeasonParticipantStats(): Promise<{ totalParticipations: number; uniqueWinners: number }> {
  if (!supabase) return { totalParticipations: 0, uniqueWinners: 0 }
  const { data } = await supabase
    .from('participants')
    .select('participation_count, win_count')
  if (!data) return { totalParticipations: 0, uniqueWinners: 0 }
  return {
    totalParticipations: data.reduce((s, r) => s + (r.participation_count ?? 0), 0),
    uniqueWinners: data.filter(r => (r.win_count ?? 0) > 0).length,
  }
}

export async function getSeasonTotalVotes(seasonId?: string): Promise<number> {
  if (!supabase) return 0
  let sid = seasonId
  if (!sid) {
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single()
    sid = season?.id
  }
  if (!sid) return 0

  const { data } = await supabase
    .from('participations')
    .select('vote_count, contest:contest_id!inner(season_id)')
    .eq('contest.season_id', sid)

  if (!data) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).reduce((sum, r) => sum + (r.vote_count ?? 0), 0)
}

export async function getSeasonTotalParticipations(seasonId?: string): Promise<number> {
  if (!supabase) return 0
  let sid = seasonId
  if (!sid) {
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single()
    sid = season?.id
  }
  if (!sid) return 0

  const { count } = await supabase
    .from('participations')
    .select('id, contest:contest_id!inner(season_id)', { count: 'exact', head: true })
    .eq('contest.season_id', sid)

  return count ?? 0
}

export async function getActiveEnvironment() {
  if (!supabase) return null
  const { data } = await supabase
    .from('environments')
    .select('id, name, label')
    .eq('is_active', true)
    .single()
  return data ?? null
}
