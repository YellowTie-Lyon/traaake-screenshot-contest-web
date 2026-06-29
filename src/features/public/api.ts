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

  const { data } = await supabase
    .from('points_ledger')
    .select(`
      points,
      participant:participant_id (
        id,
        discord_user_id,
        discord_username,
        discord_display_name,
        avatar_url
      )
    `)
    .eq('season_id', sid)

  if (!data) return []

  // Aggregate by participant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, { p: any; points: number; wins: number; parts: number }>()
  for (const row of data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = row.participant as any
    if (!p?.id) continue
    const existing = map.get(p.id)
    if (existing) {
      existing.points += row.points
    } else {
      map.set(p.id, { p, points: row.points, wins: 0, parts: 0 })
    }
  }

  // Get wins count from contests where this participant won
  const { data: closedContests } = await supabase
    .from('contests')
    .select('winner_participation_id, participations!inner(participant_id)')
    .eq('season_id', sid)
    .eq('status', 'closed')
    .not('winner_participation_id', 'is', null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (closedContests ?? []) as any[]) {
    const winnerParticipantId = c.participations?.[0]?.participant_id
    if (winnerParticipantId && map.has(winnerParticipantId)) {
      map.get(winnerParticipantId)!.wins++
    }
  }

  // Get participation counts
  const participantIds = [...map.keys()]
  if (participantIds.length > 0) {
    const { data: partCounts } = await supabase
      .from('participations')
      .select('participant_id')
      .in('participant_id', participantIds)
    for (const row of partCounts ?? []) {
      const entry = map.get(row.participant_id)
      if (entry) entry.parts++
    }
  }

  const entries = [...map.values()].map(({ p, points, wins, parts }) => ({
    rank: 0,
    discord_user_id: p.discord_user_id ?? p.id,
    discord_username: p.discord_username ?? null,
    discord_display_name: p.discord_display_name ?? null,
    avatar_url: p.avatar_url ?? null,
    total_points: points,
    participations: parts,
    wins,
  }))

  entries.sort((a, b) => b.total_points - a.total_points)
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
    .select('id, title, status, started_at, ends_at, total_participations, total_votes, environment_id')
    .in('status', ['active', 'tiebreak'])
    .order('started_at', { ascending: false })
    .limit(1)
  if (environmentId) query = query.eq('environment_id', environmentId)
  const { data } = await query.single()
  return data ?? null
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
