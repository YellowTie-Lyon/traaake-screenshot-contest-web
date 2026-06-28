import { NextResponse } from 'next/server'
import { buildDiscordOAuthUrl } from '@/services/discord/client'

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://traaake.netlify.app'
  const redirectUri = `${base}/api/auth/discord/callback`
  const url = buildDiscordOAuthUrl(redirectUri)
  return NextResponse.redirect(url)
}
