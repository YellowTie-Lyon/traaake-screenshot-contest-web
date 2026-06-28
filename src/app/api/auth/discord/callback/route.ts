import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  exchangeCodeForTokens,
  getDiscordUser,
  getDiscordGuilds,
  getDiscordAvatarUrl,
} from '@/services/discord/client'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/discord?error=no_code`)
  }

  try {
    const redirectUri = `${origin}/api/auth/discord/callback`
    const tokens = await exchangeCodeForTokens(code, redirectUri)
    const discordUser = await getDiscordUser(tokens.access_token)
    const guilds = await getDiscordGuilds(tokens.access_token)

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/auth/login`)

    const admin = createAdminClient()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await admin.from('user_profiles').update({
      discord_id: discordUser.id,
      discord_username: discordUser.username,
      discord_display_name: discordUser.global_name ?? discordUser.username,
      discord_avatar_url: getDiscordAvatarUrl(discordUser.id, discordUser.avatar),
      discord_access_token: tokens.access_token,
      discord_refresh_token: tokens.refresh_token,
      discord_token_expires_at: expiresAt,
      discord_guilds: guilds,
      discord_last_sync: new Date().toISOString(),
    }).eq('id', user.id)

    return NextResponse.redirect(`${origin}/admin/discord?connected=true`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Discord OAuth callback error:', message)
    return NextResponse.redirect(`${origin}/admin/discord?error=oauth_failed&reason=${encodeURIComponent(message)}`)
  }
}
