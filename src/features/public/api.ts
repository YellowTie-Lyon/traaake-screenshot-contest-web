import { supabase } from '@/lib/supabase/client'

export interface LeaderboardEntry {
  rank: number
  discord_id: string
  discord_username: string | null
  discord_display_name: string | null
  discord_avatar_url: string | null
  total_points: number
  participations: number
  wins: number
}

export interface WinnerEntry {
  id: string
  contest_title: string | null
  closed_at: string | null
  total_votes: number
  winner_name: string | null
  winner_avatar: string | null
  winner_discord_id: string | null
  image_url: string | null
  vote_count: number
}

export async function getLeaderboard(seasonId?: string): Promise<LeaderboardEntry[]> {
  if (!supabase) return []

  // Get active season if not provided
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
    .select('points, participant:participant_id(id, discord_id, discord_username, discord_display_name, discord_avatar_url)')
    .eq('season_id', sid)

  if (!data) return []

  // Aggregate by participant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, { participant: any; points: number }>()
  for (const row of data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = row.participant as unknown as { id: string; discord_id: string; discord_username: string | null; discord_display_name: string | null; discord_avatar_url: string | null } | null
    if (!p) continue
    const existing = map.get(p.id)
    if (existing) {
      existing.points += row.points
    } else {
      map.set(p.id, { participant: p, points: row.points })
    }
  }

  // Get wins and participations counts
  const participantIds = [...map.keys()]
  const { data: partData } = await supabase
    .from('participations')
    .select('participant_id, contest:contest_id(winner_participation_id)')
    .in('participant_id', participantIds)

  const winsMap = new Map<string, number>()
  const partCountMap = new Map<string, number>()
  for (const row of partData ?? []) {
    const pid = row.participant_id
    partCountMap.set(pid, (partCountMap.get(pid) ?? 0) + 1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contest = row.contest as any
    if (contest?.winner_participation_id === row.participant_id) {
      winsMap.set(pid, (winsMap.get(pid) ?? 0) + 1)
    }
  }

  const entries = [...map.entries()].map(([id, { participant, points }]) => ({
    rank: 0,
    discord_id: participant.discord_id ?? id,
    discord_username: participant.discord_username,
    discord_display_name: participant.discord_display_name,
    discord_avatar_url: participant.discord_avatar_url,
    total_points: points,
    participations: partCountMap.get(id) ?? 0,
    wins: winsMap.get(id) ?? 0,
  }))

  entries.sort((a, b) => b.total_points - a.total_points)
  entries.forEach((e, i) => { e.rank = i + 1 })

  return entries
}

export async function getRecentWinners(limit = 10): Promise<WinnerEntry[]> {
  if (!supabase) return []

  const { data } = await supabase
    .from('contests')
    .select(`
      id,
      title,
      closed_at,
      total_votes,
      winner_participation:winner_participation_id(
        id,
        image_url,
        vote_count,
        participant:participant_id(discord_display_name, discord_username, discord_avatar_url, discord_id)
      )
    `)
    .eq('status', 'closed')
    .not('winner_participation_id', 'is', null)
    .order('closed_at', { ascending: false })
    .limit(limit)

  if (!data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((c: any) => {
    const wp = c.winner_participation
    const participant = wp?.participant
    return {
      id: c.id,
      contest_title: c.title,
      closed_at: c.closed_at,
      total_votes: c.total_votes,
      winner_name: participant?.discord_display_name ?? participant?.discord_username ?? null,
      winner_avatar: participant?.discord_avatar_url ?? null,
      winner_discord_id: participant?.discord_id ?? null,
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

export async function getActiveContestPublic() {
  if (!supabase) return null
  const { data } = await supabase
    .from('contests')
    .select('id, title, status, started_at, ends_at, total_participations, total_votes')
    .eq('status', 'open')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}
