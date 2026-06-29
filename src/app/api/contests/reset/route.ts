import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { environmentId } = await request.json()
    if (!environmentId || typeof environmentId !== 'string') {
      return NextResponse.json({ error: 'Missing environmentId' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Delete points_ledger entries for this environment's contests
    const { error: e1 } = await admin
      .from('points_ledger')
      .delete()
      .in('contest_id', admin.from('contests').select('id').eq('environment_id', environmentId) as unknown as string[])
    if (e1) {
      // Fallback: fetch contest ids first
      const { data: contests } = await admin.from('contests').select('id').eq('environment_id', environmentId)
      const ids = (contests ?? []).map((c: { id: string }) => c.id)
      if (ids.length > 0) {
        await admin.from('points_ledger').delete().in('contest_id', ids)
      }
    }

    // Fetch contest ids for cascading deletes
    const { data: contests } = await admin.from('contests').select('id').eq('environment_id', environmentId)
    const contestIds = (contests ?? []).map((c: { id: string }) => c.id)

    // 2. Delete participations
    if (contestIds.length > 0) {
      await admin.from('participations').delete().in('contest_id', contestIds)
    }

    // 3. Delete all participants
    await admin.from('participants').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 4. Close active contest
    await admin
      .from('contests')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('environment_id', environmentId)
      .in('status', ['active', 'tiebreak'])

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
