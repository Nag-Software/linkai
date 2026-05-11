import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function signOutAndRedirect(request: Request) {
  const origin = `${request.headers.get('x-forwarded-proto') ?? 'http'}://${request.headers.get('host') ?? new URL(request.url).host}`
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', origin))
}

export async function GET(request: Request) {
  return signOutAndRedirect(request)
}

export async function POST(request: Request) {
  return signOutAndRedirect(request)
}