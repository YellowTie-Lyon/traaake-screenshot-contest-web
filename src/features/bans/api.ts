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

export interface CreateBanParams {
  environmentId: string
  discordUserId: string
  discordUsername: string
  reason?: string
  bannedBy: string
  durationDays?: number
}

export async function createBan(params: CreateBanParams): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const expiresAt = params.durationDays
    ? new Date(Date.now() + params.durationDays * 86400_000).toISOString()
    : null
  const { error } = await supabase.from('contest_bans').insert({
    environment_id: params.environmentId,
    discord_user_id: params.discordUserId,
    discord_username: params.discordUsername,
    reason: params.reason ?? null,
    banned_by: params.bannedBy,
    banned_at: new Date().toISOString(),
    expires_at: expiresAt,
  })
  if (error) throw error
}

export async function getActiveBanForMember(
  environmentId: string,
  discordUserId: string
): Promise<DbContestBan | null> {
  if (!supabase) return null
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('contest_bans')
    .select('*')
    .eq('environment_id', environmentId)
    .eq('discord_user_id', discordUserId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('banned_at', { ascending: false })
    .limit(1)
    .single()
  return (data as DbContestBan | null) ?? null
}
