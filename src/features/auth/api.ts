import { supabase } from '@/lib/supabase/client'
import type { DbUserProfile, UserRole } from '@/lib/supabase/types'
import type { User } from '@supabase/supabase-js'

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, displayName: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPassword(email: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  })
  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function getUser(): Promise<User | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(): Promise<DbUserProfile | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data ?? null
}

export async function updateUserProfile(updates: Partial<Pick<DbUserProfile, 'display_name' | 'role'>>) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
  if (error) throw error
}

export { type UserRole }
