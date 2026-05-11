import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getCurrentArtist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/artist-app/login')

  const db = createAdminClient()
  const { data: artist } = await db
    .from('artists')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!artist) {
    await supabase.auth.signOut()
    redirect('/artist-app/signup?error=missing')
  }

  return { user, artist, db }
}

export function visibleArtistPath(pathname: string) {
  const path = pathname.replace(/^\/artist-app/, '') || '/'
  return path.startsWith('/') ? path : `/${path}`
}

export function formatMoney(amount: number | null | undefined, currency = 'NOK') {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((amount ?? 0) / 100)
}