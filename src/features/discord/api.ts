import { supabase } from '@/lib/supabase/client'
import type { DbDiscordGuildConfig, DiscordChannel, DiscordRole } from '@/lib/supabase/types'

export async function getGuildConfigs(environmentId: string): Promise<DbDiscordGuildConfig[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('discord_guild_configs')
    .select('*')
    .eq('environment_id', environmentId)
    .order('created_at')
  return data ?? []
}

export async function upsertGuildConfig(
  environmentId: string,
  config: Partial<DbDiscordGuildConfig> & { guild_id: string }
): Promise<DbDiscordGuildConfig> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('discord_guild_configs')
    .upsert({ ...config, environment_id: environmentId }, { onConflict: 'environment_id,guild_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteGuildConfig(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('discord_guild_configs').delete().eq('id', id)
  if (error) throw error
}

// Client → our API routes (keeps Discord tokens server-side)
export async function fetchGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const res = await fetch(`/api/discord/guilds/${guildId}/channels`)
  if (!res.ok) throw new Error('Failed to fetch channels')
  return res.json()
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const res = await fetch(`/api/discord/guilds/${guildId}/roles`)
  if (!res.ok) throw new Error('Failed to fetch roles')
  return res.json()
}

export async function checkBotPresence(guildId: string): Promise<boolean> {
  const res = await fetch(`/api/discord/guilds/${guildId}/bot-check`)
  if (!res.ok) return false
  const data = await res.json()
  return data.present ?? false
}

export async function syncDiscord(): Promise<void> {
  const res = await fetch('/api/discord/sync', { method: 'POST' })
  if (!res.ok) throw new Error('Discord sync failed')
}
