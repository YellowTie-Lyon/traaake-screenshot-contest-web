import { supabase } from '@/lib/supabase/client'
import type { DbDiscordGuildConfig } from '@/lib/supabase/types'

export interface DashboardData {
  contest: {
    id: string
    status: string
    title: string | null
    started_at: string | null
    total_participations: number
    total_votes: number
  } | null
  guildConfig: DbDiscordGuildConfig | null
  leader: {
    discord_display_name: string | null
    discord_username: string | null
    avatar_url: string | null
    total_points: number
    wins: number
    participations: number
  } | null
}

export async function getDashboardData(environmentId: string): Promise<DashboardData> {
  if (!supabase) return { contest: null, guildConfig: null, leader: null }

  const [contestRes, guildRes, seasonRes] = await Promise.all([
    supabase
      .from('contests')
      .select('id, status, title, started_at, total_participations, total_votes')
      .eq('environment_id', environmentId)
      .in('status', ['active', 'tiebreak', 'suspended'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('discord_guild_configs')
      .select('*')
      .eq('environment_id', environmentId)
      .single(),
    supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single(),
  ])

  const contest = contestRes.data ?? null
  const guildConfig = (guildRes.data ?? null) as DbDiscordGuildConfig | null
  const seasonId = seasonRes.data?.id ?? null

  let leader: DashboardData['leader'] = null

  if (seasonId) {
    const { data: ledger } = await supabase
      .from('points_ledger')
      .select('points, participant:participant_id(id, discord_display_name, discord_username, discord_user_id, avatar_url)')
      .eq('season_id', seasonId)

    if (ledger && ledger.length > 0) {
      // Aggregate points by participant
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, { p: any; points: number }>()
      for (const row of ledger) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = row.participant as any
        if (!p?.id) continue
        const existing = map.get(p.id)
        if (existing) {
          existing.points += row.points
        } else {
          map.set(p.id, { p, points: row.points })
        }
      }

      // Get participations + wins
      const participantIds = [...map.keys()]
      const { data: parts } = await supabase
        .from('participations')
        .select('participant_id, id, contest:contest_id(winner_participation_id)')
        .in('participant_id', participantIds)

      const partCountMap = new Map<string, number>()
      const winsMap = new Map<string, number>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (parts ?? []) as any[]) {
        const pid = row.participant_id
        partCountMap.set(pid, (partCountMap.get(pid) ?? 0) + 1)
        if (row.contest?.winner_participation_id === row.id) {
          winsMap.set(pid, (winsMap.get(pid) ?? 0) + 1)
        }
      }

      // Find top participant
      let topId = ''
      let topPoints = -1
      for (const [id, { points }] of map) {
        if (points > topPoints) { topPoints = points; topId = id }
      }

      if (topId) {
        const { p } = map.get(topId)!
        leader = {
          discord_display_name: p.discord_display_name ?? null,
          discord_username: p.discord_username ?? null,
          avatar_url: p.avatar_url ?? null,
          total_points: topPoints,
          wins: winsMap.get(topId) ?? 0,
          participations: partCountMap.get(topId) ?? 0,
        }
      }
    }
  }

  return { contest, guildConfig, leader }
}

export function isBotOnline(guildConfig: DbDiscordGuildConfig | null): boolean {
  if (!guildConfig?.bot_present) return false
  if (!guildConfig.last_sync) return false
  const lastSync = new Date(guildConfig.last_sync).getTime()
  return Date.now() - lastSync < 10 * 60 * 1000 // 10 minutes
}

export async function sendBotCommand(environmentId: string, command: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('bot_commands').insert({ environment_id: environmentId, command })
  if (error) throw error
}
