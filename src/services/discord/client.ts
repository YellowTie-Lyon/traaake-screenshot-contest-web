import type { DiscordGuild, DiscordChannel, DiscordRole } from '@/lib/supabase/types'

const DISCORD_API = 'https://discord.com/api/v10'

// Permissions flag for Administrator
const ADMINISTRATOR_PERMISSION = BigInt(0x8)

function hasAdminPermission(permissions: string): boolean {
  try {
    return (BigInt(permissions) & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION
  } catch {
    return false
  }
}

export function buildDiscordOAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
  })
  return `https://discord.com/oauth2/authorize?${params}`
}

export function buildBotInviteUrl(guildId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID ?? process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
    permissions: '8', // Administrator
    scope: 'bot applications.commands',
    guild_id: guildId,
  })
  return `https://discord.com/oauth2/authorize?${params}`
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status}`)
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
  }>
}

export async function getDiscordUser(accessToken: string) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Discord user fetch failed: ${res.status}`)
  return res.json() as Promise<{
    id: string
    username: string
    global_name: string | null
    avatar: string | null
  }>
}

export async function getDiscordGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds?with_counts=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Discord guilds fetch failed: ${res.status}`)
  const guilds: DiscordGuild[] = await res.json()
  // Filter to guilds where user is owner or has Administrator permission
  return guilds.filter(g => g.owner || hasAdminPermission(g.permissions))
}

export function getDiscordAvatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=128`
}

export function getGuildIconUrl(guildId: string, iconHash: string | null): string | null {
  if (!iconHash) return null
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.webp?size=128`
}

// Bot-token calls — requires DISCORD_BOT_TOKEN env var
async function botFetch(path: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) throw new Error('DISCORD_BOT_TOKEN not configured')
  const res = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bot ${botToken}` },
  })
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) return null
    throw new Error(`Discord bot fetch failed: ${res.status}`)
  }
  return res.json()
}

export async function getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const data = await botFetch(`/guilds/${guildId}/channels`)
  if (!data) return []
  // Only text channels (type 0)
  return (data as DiscordChannel[]).filter(c => c.type === 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const data = await botFetch(`/guilds/${guildId}/roles`)
  if (!data) return []
  return (data as DiscordRole[])
    .filter(r => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
}

export async function isBotInGuild(guildId: string): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) return false
  const data = await botFetch(`/guilds/${guildId}`)
  return data !== null
}
