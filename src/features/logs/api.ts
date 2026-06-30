import { supabase } from '@/lib/supabase/client'

export type LogLevel = 'info' | 'warn' | 'error'

export type LogAction =
  | 'contest_opened'
  | 'contest_closed'
  | 'contest_no_entries'
  | 'tiebreak_started'
  | 'tiebreak_resolved'
  | 'contest_ban'
  | 'contest_unban'
  | 'participation_submitted'
  | 'duplicate_submission_blocked'
  | 'banned_user_blocked'
  | 'points_adjusted'
  | 'participation_insert_failed'
  | 'participant_upsert_failed'

export interface BotLog {
  id: string
  guild_id: string
  action: string
  details: Record<string, unknown> | null
  level: LogLevel
  created_at: string
}

export interface GetLogsParams {
  guildId?: string
  level?: LogLevel | null
  action?: string | null
  page?: number
  pageSize?: number
}

export async function getLogs(params: GetLogsParams = {}): Promise<{ data: BotLog[]; count: number }> {
  if (!supabase) return { data: [], count: 0 }

  const { level, action, page = 0, pageSize = 50 } = params

  let query = supabase
    .from('bot_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (level) query = query.eq('level', level)
  if (action) query = query.eq('action', action)

  const { data, count } = await query
  return { data: (data ?? []) as BotLog[], count: count ?? 0 }
}
