import { supabase } from '@/lib/supabase/client'

export interface DashboardData {
  contest: {
    id: string
    status: string
    title: string | null
    theme: string | null
    started_at: string | null
    ends_at: string | null
    participationCount: number
    voteCount: number
  } | null
  leader: {
    discord_display_name: string | null
    discord_username: string | null
    avatar_url: string | null
    total_points: number
    wins: number
    participations: number
  } | null
}

async function getSeasonPoints(seasonId: string): Promise<Map<string, number>> {
  if (!supabase) return new Map()

  // Get all contest IDs for this season
  const { data: seasonContests } = await supabase
    .from('contests')
    .select('id')
    .eq('season_id', seasonId)

  const contestIds = (seasonContests ?? []).map(c => c.id)
  const pointsMap = new Map<string, number>()

  // Points from season contests
  if (contestIds.length > 0) {
    const { data: contestPoints } = await supabase
      .from('points_ledger')
      .select('participant_id, points')
      .in('contest_id', contestIds)
    for (const r of contestPoints ?? []) {
      pointsMap.set(r.participant_id, (pointsMap.get(r.participant_id) ?? 0) + r.points)
    }
  }

  // Manual adjustments (contest_id IS NULL — included in all seasons)
  const { data: manualPoints } = await supabase
    .from('points_ledger')
    .select('participant_id, points')
    .is('contest_id', null)
  for (const r of manualPoints ?? []) {
    pointsMap.set(r.participant_id, (pointsMap.get(r.participant_id) ?? 0) + r.points)
  }

  return pointsMap
}

export async function getDashboardData(environmentId: string): Promise<DashboardData> {
  if (!supabase) return { contest: null, leader: null }

  const [contestRes, seasonRes] = await Promise.all([
    supabase
      .from('contests')
      .select('id, status, title, theme, started_at, ends_at')
      .eq('environment_id', environmentId)
      .in('status', ['active', 'tiebreak'])
      .order('started_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single(),
  ])

  const contestRow = contestRes.data ?? null
  const seasonId = seasonRes.data?.id ?? null

  // Live participation/vote counts from participations table
  let participationCount = 0
  let voteCount = 0
  let contest: DashboardData['contest'] = null

  if (contestRow) {
    const { data: parts } = await supabase
      .from('participations')
      .select('vote_count')
      .eq('contest_id', contestRow.id)
    participationCount = (parts ?? []).length
    voteCount = (parts ?? []).reduce((s, r) => s + (r.vote_count ?? 0), 0)

    contest = {
      id: contestRow.id,
      status: contestRow.status,
      title: contestRow.title,
      theme: contestRow.theme ?? null,
      started_at: contestRow.started_at,
      ends_at: contestRow.ends_at,
      participationCount,
      voteCount,
    }
  }

  // Leader: participant with highest total_points this season
  let leader: DashboardData['leader'] = null
  if (seasonId) {
    const [pointsMap, participantsRes] = await Promise.all([
      getSeasonPoints(seasonId),
      supabase
        .from('participants')
        .select('id, discord_display_name, discord_username, avatar_url, win_count, participation_count')
        .gt('participation_count', 0),
    ])

    let topId = ''
    let topPoints = -1
    for (const [id, pts] of pointsMap) {
      if (pts > topPoints) { topPoints = pts; topId = id }
    }

    // Fallback: if no ledger data, use win_count
    if (!topId && (participantsRes.data ?? []).length > 0) {
      const sorted = [...(participantsRes.data ?? [])].sort((a, b) => (b.win_count ?? 0) - (a.win_count ?? 0))
      topId = sorted[0]?.id ?? ''
      topPoints = sorted[0]?.win_count ?? 0
    }

    if (topId) {
      const p = (participantsRes.data ?? []).find(x => x.id === topId)
      if (p) {
        leader = {
          discord_display_name: p.discord_display_name ?? null,
          discord_username: p.discord_username ?? null,
          avatar_url: p.avatar_url ?? null,
          total_points: topPoints > 0 ? topPoints : (p.win_count ?? 0),
          wins: p.win_count ?? 0,
          participations: p.participation_count ?? 0,
        }
      }
    }
  }

  return { contest, leader }
}
