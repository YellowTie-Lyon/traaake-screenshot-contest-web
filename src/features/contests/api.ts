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

export async function createContest(environmentId: string, seasonId: string, title: string): Promise<DbContest> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('contests')
    .insert({ environment_id: environmentId, season_id: seasonId, title, status: 'draft' })
    .select()
    .single()
  if (error) throw error
  return data
}
