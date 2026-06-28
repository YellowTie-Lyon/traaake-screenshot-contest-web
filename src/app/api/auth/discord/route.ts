import { NextResponse } from 'next/server'
import { buildDiscordOAuthUrl } from '@/services/discord/client'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/discord/callback`
  const url = buildDiscordOAuthUrl(redirectUri)
  return NextResponse.redirect(url)
}
