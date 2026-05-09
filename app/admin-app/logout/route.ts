import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const origin = `${request.headers.get('x-forwarded-proto') ?? 'http'}://${request.headers.get('host') ?? new URL(request.url).host}`
  const hostname = request.headers.get('x-humor-hostname') ?? request.headers.get('host')?.split(':')[0] ?? ''
  const adminPrefix = hostname === 'admin.localhost' || hostname.startsWith('admin.') ? '' : '/admin-app'
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL(`${adminPrefix}/login`, origin))
}
