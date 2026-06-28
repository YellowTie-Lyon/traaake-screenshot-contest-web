import { supabase } from '@/lib/supabase/client'
import type { DbEnvironment, DbContestSettings } from '@/lib/supabase/types'

export async function getEnvironments(): Promise<DbEnvironment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('environments')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
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

  return { environment: env, settings: settings ?? null }
}

export async function setActiveEnvironment(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  await supabase.from('environments').update({ is_active: false }).neq('id', id)
  const { error } = await supabase.from('environments').update({ is_active: true }).eq('id', id)
  if (error) throw error
}
