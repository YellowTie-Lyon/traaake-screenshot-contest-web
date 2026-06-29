import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import type { TabSlug, UserRole } from '@/lib/supabase/types'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only owner can invite
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, role, display_name, allowed_tabs } = await request.json() as {
      email: string
      role: UserRole
      display_name?: string
      allowed_tabs: TabSlug[]
    }

    if (!email || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { role, display_name: display_name ?? '', allowed_tabs },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
      },
    })

    if (error) throw error

    return NextResponse.json({ link: data.properties?.action_link ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()
    const { data: { users }, error } = await admin.auth.admin.listUsers()
    if (error) throw error

    // Get profiles
    const { data: profiles } = await supabase.from('user_profiles').select('*')
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      last_sign_in_at: u.last_sign_in_at,
      created_at: u.created_at,
      profile: profileMap.get(u.id) ?? null,
    }))

    return NextResponse.json({ users: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
