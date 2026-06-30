import { supabase } from '@/lib/supabase/client'

export interface Member {
  id: string
  discord_user_id: string
  discord_username: string | null
  discord_display_name: string | null
  avatar_url: string | null
  win_count: number
  participation_count: number
}

export interface ParticipationDetail {
  id: string
  image_url: string | null
  vote_count: number
  submitted_at: string
  contest_title: string | null
  contest_started_at: string | null
}

export interface MemberProfile extends Member {
  total_points: number
  participations: ParticipationDetail[]
}

export async function getMembers(): Promise<Member[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('participants')
    .select('id, discord_user_id, discord_username, discord_display_name, avatar_url, win_count, participation_count')
    .order('win_count', { ascending: false })
  return (data ?? []) as Member[]
}

export async function getMemberProfile(participantId: string): Promise<MemberProfile | null> {
  if (!supabase) return null

  const [memberRes, partsRes, seasonRes] = await Promise.all([
    supabase
      .from('participants')
      .select('id, discord_user_id, discord_username, discord_display_name, avatar_url, win_count, participation_count')
      .eq('id', participantId)
      .single(),
    supabase
      .from('participations')
      .select('id, image_url, vote_count, submitted_at, contest:contest_id(title, started_at)')
      .eq('participant_id', participantId)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single(),
  ])

  if (!memberRes.data) return null
  const member = memberRes.data as Member

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participations: ParticipationDetail[] = (partsRes.data ?? []).map((p: any) => ({
    id: p.id,
    image_url: p.image_url ?? null,
    vote_count: p.vote_count ?? 0,
    submitted_at: p.submitted_at,
    contest_title: p.contest?.title ?? null,
    contest_started_at: p.contest?.started_at ?? null,
  }))

  // Compute total points for active season
  let total_points = member.win_count ?? 0
  const seasonId = seasonRes.data?.id
  if (seasonId) {
    const { data: seasonContests } = await supabase
      .from('contests')
      .select('id')
      .eq('season_id', seasonId)
    const contestIds = (seasonContests ?? []).map(c => c.id)

    let pts = 0
    if (contestIds.length > 0) {
      const { data: cPts } = await supabase
        .from('points_ledger')
        .select('points')
        .eq('participant_id', participantId)
        .in('contest_id', contestIds)
      pts += (cPts ?? []).reduce((s, r) => s + (r.points ?? 0), 0)
    }
    const { data: manualPts } = await supabase
      .from('points_ledger')
      .select('points')
      .eq('participant_id', participantId)
      .is('contest_id', null)
    pts += (manualPts ?? []).reduce((s, r) => s + (r.points ?? 0), 0)

    if (pts > 0) total_points = pts
  }

  return { ...member, total_points, participations }
}
