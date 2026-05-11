import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const origin = `${request.headers.get('x-forwarded-proto') ?? 'http'}://${request.headers.get('host') ?? new URL(request.url).host}`
  const artistPrefix = '/artist-app'
  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const nextPath = normalizeNext(String(formData.get('next') ?? artistPrefix))

  if (!email || !password) {
    return NextResponse.redirect(new URL(`${artistPrefix}/login?error=invalid&next=${encodeURIComponent(nextPath)}`, origin), 303)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    const errorCode = error?.message.toLowerCase().includes('email not confirmed') ? 'unconfirmed' : 'invalid'
    if (errorCode === 'unconfirmed') {
      return NextResponse.redirect(new URL(`${artistPrefix}/signup?error=unconfirmed`, origin), 303)
    }
    return NextResponse.redirect(new URL(`${artistPrefix}/login?error=invalid&next=${encodeURIComponent(nextPath)}`, origin), 303)
  }

  const db = createAdminClient()
  const { data: artist } = await db
    .from('artists')
    .select('id')
    .eq('auth_user_id', data.user.id)
    .single()

  if (!artist) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL(`${artistPrefix}/signup?error=missing`, origin), 303)
  }

  return NextResponse.redirect(new URL(nextPath, origin), 303)
}

function normalizeNext(value: string) {
  return value.startsWith('/artist-app') ? value : '/artist-app'
}