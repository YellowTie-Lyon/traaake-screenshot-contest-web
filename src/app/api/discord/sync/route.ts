import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getDiscordGuilds } from '@/services/discord/client'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('discord_access_token')
    .eq('id', user.id)
    .single()

  if (!profile?.discord_access_token) {
    return NextResponse.json({ error: 'Discord not connected' }, { status: 400 })
  }

  const guilds = await getDiscordGuilds(profile.discord_access_token)

  await admin.from('user_profiles').update({
    discord_guilds: guilds,
    discord_last_sync: new Date().toISOString(),
  }).eq('id', user.id)

  return NextResponse.json({ ok: true, count: guilds.length })
}
