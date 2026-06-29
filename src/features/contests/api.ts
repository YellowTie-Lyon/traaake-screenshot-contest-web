import { supabase } from '@/lib/supabase/client'
import type { DbContest, ContestStatus } from '@/lib/supabase/types'

export async function getActiveContest(environmentId: string): Promise<DbContest | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('contests')
    .select('*')
    .eq('environment_id', environmentId)
    .in('status', ['open', 'paused', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function getContestHistory(environmentId: string): Promise<DbContest[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('contests')
    .select('*')
    .eq('environment_id', environmentId)
    .in('status', ['closed', 'archived'])
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

export async function updateContestStatus(id: string, status: ContestStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const updates: Partial<DbContest> = { status, updated_at: new Date().toISOString() }
  if (status === 'open') updates.started_at = new Date().toISOString()
  if (status === 'closed') updates.closed_at = new Date().toISOString()
  const { error } = await supabase.from('contests').update(updates).eq('id', id)
  if (error) throw error
}

export async function createContest(environmentId: string, title: string): Promise<DbContest> {
  if (!supabase) throw new Error('Supabase not configured')

  // Get or create active season
  let seasonId: string | null = null
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single()

  if (season) {
    seasonId = season.id
  } else {
    const now = new Date()
    const { data: newSeason, error: seasonErr } = await supabase
      .from('seasons')
      .insert({ name: `Saison ${now.getFullYear()}`, is_active: true, starts_at: now.toISOString() })
      .select()
      .single()
    if (seasonErr) throw seasonErr
    seasonId = newSeason.id
  }

  const { data, error } = await supabase
    .from('contests')
    .insert({ environment_id: environmentId, season_id: seasonId, title, status: 'draft' })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface Participation {
  id: string
  image_url: string | null
  vote_count: number
  submitted_at: string
  participant: { discord_username: string | null; discord_display_name: string | null; discord_avatar_url: string | null } | null
}

export async function getContestParticipations(contestId: string): Promise<Participation[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('participations')
    .select('id, image_url, vote_count, submitted_at, participant:participant_id(discord_username, discord_display_name, discord_avatar_url)')
    .eq('contest_id', contestId)
    .order('vote_count', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any as Participation[]
}
