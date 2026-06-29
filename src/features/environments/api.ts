import { supabase } from '@/lib/supabase/client'
import type { DbEnvironment, DbContestSettings } from '@/lib/supabase/types'

export async function getEnvironments(): Promise<DbEnvironment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('environments')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []) as DbEnvironment[]
}

export async function getEnvironmentWithSettings(envName: string): Promise<{
  environment: DbEnvironment
  settings: DbContestSettings | null
} | null> {
  if (!supabase) return null
  const { data: env, error: envError } = await supabase
    .from('environments')
    .select('*')
    .eq('name', envName)
    .single()
  if (envError || !env) return null

  const { data: settings } = await supabase
    .from('contest_settings')
    .select('*')
    .eq('environment_id', env.id)
    .single()

  return { environment: env as DbEnvironment, settings: settings ?? null }
}

// Uses server-side API route with admin client — never sends discord_bot_token to browser
export async function setActiveEnvironment(id: string): Promise<void> {
  const res = await fetch('/api/environments/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? 'Activation failed')
  }
}

export async function saveBotCredentials(id: string, discord_bot_token: string, discord_app_id: string): Promise<void> {
  const res = await fetch('/api/environments/bot-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, discord_bot_token, discord_app_id }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? 'Save failed')
  }
}
