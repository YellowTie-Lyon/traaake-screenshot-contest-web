import { supabase } from '@/lib/supabase/client'
import type { DbContest, ContestStatus } from '@/lib/supabase/types'

export async function getActiveContest(environmentId: string): Promise<DbContest | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('contests')
    .select('*')
    .eq('environment_id', environmentId)
    .in('status', ['active', 'tiebreak', 'suspended'])
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
    .order('closed_at', { ascending: false })
    .limit(20)
  return data ?? []
}

export async function updateContestStatus(id: string, status: ContestStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const updates: Partial<DbContest> & { updated_at: string } = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'active') updates.started_at = new Date().toISOString()
  if (status === 'closed') updates.closed_at = new Date().toISOString()
  const { error } = await supabase.from('contests').update(updates).eq('id', id)
  if (error) throw error
}

// Returns the ISO string of the next Wednesday at 18:00 Europe/Paris
function nextWednesdayAt18(): string {
  const now = new Date()
  // Get current day in Paris time
  const paris = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(now)

  const dayName = paris.find(p => p.type === 'weekday')?.value ?? ''
  const isWednesday = dayName.startsWith('mer')
  const parisHour = parseInt(paris.find(p => p.type === 'hour')?.value ?? '0', 10)

  // Days until next Wednesday (Wednesday = 3 in JS, but we compute via name)
  const jsDay = now.getDay() // 0=Sun, 3=Wed
  let daysUntilWed = (3 - jsDay + 7) % 7
  if (daysUntilWed === 0 && !(isWednesday && parisHour < 18)) {
    daysUntilWed = 7 // already past 18h Wednesday → next week
  }

  const target = new Date(now)
  target.setDate(target.getDate() + daysUntilWed)
  // Set to 18:00 Paris — use a UTC offset approximation (CET+1 or CEST+2)
  // We'll use the Intl API to find the exact UTC equivalent
  const targetDateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
  // Try 18:00 Paris = 16:00 or 17:00 UTC depending on DST
  const candidate = new Date(`${targetDateStr}T16:00:00Z`)
  const parisCandidateHour = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit',
  }).formatToParts(candidate).find(p => p.type === 'hour')?.value
  const offset = parisCandidateHour === '17' ? 1 : 2 // CEST=+2 → 18-2=16UTC, CET=+1 → 18-1=17UTC
  return new Date(`${targetDateStr}T${String(18 - offset).padStart(2, '0')}:00:00Z`).toISOString()
}

export async function openContest(environmentId: string, title: string, theme?: string): Promise<DbContest> {
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
      .insert({
        name: `Saison ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        is_active: true,
        starts_at: now.toISOString(),
      })
      .select()
      .single()
    if (seasonErr) throw seasonErr
    seasonId = newSeason.id
  }

  const { data, error } = await supabase
    .from('contests')
    .insert({
      environment_id: environmentId,
      season_id: seasonId,
      title,
      ...(theme ? { theme } : {}),
      status: 'active',
      started_at: new Date().toISOString(),
      ends_at: nextWednesdayAt18(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface Participation {
  id: string
  image_url: string | null
  message_id: string | null
  vote_count: number
  submitted_at: string
  participant: {
    discord_username: string | null
    discord_display_name: string | null
    avatar_url: string | null
  } | null
}

export async function getContestParticipations(contestId: string): Promise<Participation[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('participations')
    .select('id, image_url, message_id, vote_count, submitted_at, participant:participant_id(discord_username, discord_display_name, avatar_url)')
    .eq('contest_id', contestId)
    .order('vote_count', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any as Participation[]
}
