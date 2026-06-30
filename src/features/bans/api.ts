import { supabase } from '@/lib/supabase/client'
import type { DbContestBan } from '@/lib/supabase/types'

export type { DbContestBan }

export async function getActiveBans(environmentId: string): Promise<DbContestBan[]> {
  if (!supabase) return []
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('contest_bans')
    .select('*')
    .eq('environment_id', environmentId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('banned_at', { ascending: false })
  return (data ?? []) as DbContestBan[]
}

export async function getAllBans(environmentId: string): Promise<DbContestBan[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('contest_bans')
    .select('*')
    .eq('environment_id', environmentId)
    .order('banned_at', { ascending: false })
  return (data ?? []) as DbContestBan[]
}

export async function liftBan(banId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('contest_bans')
    .delete()
    .eq('id', banId)
  if (error) throw error
}
