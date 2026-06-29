import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, discord_bot_token, discord_app_id } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing environment id' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('environments')
      .update({ discord_bot_token, discord_app_id })
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
