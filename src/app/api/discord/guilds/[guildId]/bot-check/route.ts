import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isBotInGuild } from '@/services/discord/client'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { guildId } = await params
  const present = await isBotInGuild(guildId)
  return NextResponse.json({ present })
}
