import { supabase } from '@/lib/supabase/client'
import type { DbContestSettings } from '@/lib/supabase/types'

export async function getSettingsByEnvironment(environmentId: string): Promise<DbContestSettings | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('contest_settings')
    .select('*')
    .eq('environment_id', environmentId)
    .single()
  if (error) return null
  return data
}

export async function updateSettings(id: string, updates: Partial<DbContestSettings>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('contest_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function upsertSettings(environmentId: string, updates: Partial<DbContestSettings>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('contest_settings')
    .upsert({ ...updates, environment_id: environmentId, updated_at: new Date().toISOString() }, { onConflict: 'environment_id' })
  if (error) throw error
}
