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

// Active contest leaderboard — ordered by votes, valid entries only
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
    .eq('is_valid', true)
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

const POINTS: Record<number, number> = { 1: 100, 2: 60, 3: 30 }
const PARTICIPATION_POINTS = 20

// Season leaderboard — points computed from participations.final_rank
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

  // All closed contests for this season
  const { data: seasonContests } = await supabase
    .from('contests')
    .select('id')
    .eq('season_id', sid)
    .eq('status', 'closed')
  const contestIds = (seasonContests ?? []).map(c => c.id)
  if (contestIds.length === 0) return []

  // All valid participations with participant info
  const { data: parts } = await supabase
    .from('participations')
    .select(`
      participant_id,
      final_rank,
      is_winner,
      participant:participant_id (
        discord_user_id,
        discord_username,
        discord_display_name,
        avatar_url
      )
    `)
    .in('contest_id', contestIds)
    .eq('is_valid', true)

  if (!parts || parts.length === 0) return []

  // Aggregate points per participant
  const agg = new Map<string, { points: number; wins: number; participations: number; meta: unknown }>()
  for (const row of parts as any[]) {
    const pid = row.participant_id
    const cur = agg.get(pid) ?? { points: 0, wins: 0, participations: 0, meta: row.participant }
    const pts = row.final_rank != null ? (POINTS[row.final_rank] ?? PARTICIPATION_POINTS) : PARTICIPATION_POINTS
    agg.set(pid, {
      points: cur.points + pts,
      wins: cur.wins + (row.is_winner ? 1 : 0),
      participations: cur.participations + 1,
      meta: cur.meta ?? row.participant,
    })
  }

  const entries: LeaderboardEntry[] = Array.from(agg.entries()).map(([, d]) => {
    const p = d.meta as any
    return {
      rank: 0,
      discord_user_id: p?.discord_user_id ?? '',
      discord_username: p?.discord_username ?? null,
      discord_display_name: p?.discord_display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
      total_points: d.points,
      participations: d.participations,
      wins: d.wins,
    }
  })

  entries.sort((a, b) =>
    b.total_points !== a.total_points ? b.total_points - a.total_points :
    b.wins !== a.wins ? b.wins - a.wins :
    b.participations - a.participations
  )
  entries.forEach((e, i) => { e.rank = i + 1 })
  return entries
}

function mapWinners(data: unknown[]): WinnerEntry[] {
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

const WINNERS_SELECT = `
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
`

export async function getRecentWinners(environmentId: string, limit = 10): Promise<WinnerEntry[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('contests')
    .select(WINNERS_SELECT)
    .eq('status', 'closed')
    .eq('environment_id', environmentId)
    .not('winner_participation_id', 'is', null)
    .order('closed_at', { ascending: false })
    .limit(limit)
  return data ? mapWinners(data) : []
}

export async function getWinnersBySeason(environmentId: string, seasonId: string): Promise<WinnerEntry[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('contests')
    .select(WINNERS_SELECT)
    .eq('status', 'closed')
    .eq('environment_id', environmentId)
    .eq('season_id', seasonId)
    .not('winner_participation_id', 'is', null)
    .order('closed_at', { ascending: false })
  return data ? mapWinners(data) : []
}

export interface Season {
  id: string
  name: string
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
}

export async function getSeasons(): Promise<Season[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('seasons')
    .select('id, name, is_active, starts_at, ends_at')
    .order('starts_at', { ascending: false })
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
    .select('id, title, status, started_at, ends_at, closed_at, environment_id')
    .in('status', ['active', 'tiebreak'])
    .order('started_at', { ascending: false })
    .limit(1)
  if (environmentId) query = query.eq('environment_id', environmentId)
  const { data } = await query.single()
  return data ?? null
}

export async function getSeasonStats(seasonId: string): Promise<{ activePilots: number; totalParticipations: number; uniqueWinners: number }> {
  if (!supabase) return { activePilots: 0, totalParticipations: 0, uniqueWinners: 0 }

  const { data: contestIds } = await supabase
    .from('contests')
    .select('id')
    .eq('season_id', seasonId)
    .eq('status', 'closed')

  const ids = (contestIds ?? []).map(c => c.id)
  if (ids.length === 0) return { activePilots: 0, totalParticipations: 0, uniqueWinners: 0 }

  const { data } = await supabase
    .from('participations')
    .select('participant_id, is_winner')
    .in('contest_id', ids)
    .eq('is_valid', true)

  if (!data) return { activePilots: 0, totalParticipations: 0, uniqueWinners: 0 }

  const pilots = new Set(data.map(r => r.participant_id))
  const winners = new Set(data.filter(r => r.is_winner).map(r => r.participant_id))

  return {
    activePilots: pilots.size,
    totalParticipations: data.length,
    uniqueWinners: winners.size,
  }
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
