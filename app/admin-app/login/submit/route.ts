import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const origin = `${request.headers.get('x-forwarded-proto') ?? 'http'}://${request.headers.get('host') ?? new URL(request.url).host}`
  const adminPrefix = '/admin-app'
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.redirect(new URL(`${adminPrefix}/login?error=invalid`, origin), 303)
  }

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('auth_user_id', data.user.id)
    .single()

  const allowed = ['owner', 'admin', 'staff']
  if (!profile || !allowed.includes(profile.role)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL(`${adminPrefix}/login?error=unauthorized`, origin), 303)
  }

  return NextResponse.redirect(new URL(adminPrefix, origin), 303)
}
