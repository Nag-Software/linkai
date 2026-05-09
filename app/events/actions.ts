'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCheckoutSession } from '@/lib/actions/checkout'
import { trackInitiateCheckout } from '@/lib/tracking/stape'

export async function startCheckoutAction(formData: FormData) {
  const showId = String(formData.get('show_id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const headerStore = await headers()
  const cookieStore = await cookies()
  const host = headerStore.get('host') ?? 'localhost:3000'
  const protocol = headerStore.get('x-forwarded-proto') ?? 'http'
  const sourceUrl = `${protocol}://${host}/events/${slug}`

  trackInitiateCheckout(showId, {
    sourceUrl,
    userAgent: headerStore.get('user-agent') ?? undefined,
    ipAddress: headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headerStore.get('x-real-ip') ?? undefined,
    fbp: cookieStore.get('_fbp')?.value,
    fbc: cookieStore.get('_fbc')?.value,
  }).catch((error) => console.error('[Stape] InitiateCheckout failed:', error))

  // Check for external ticket URL — if set, redirect directly
  const db = createAdminClient()
  const { data: show } = await db.from('shows').select('ticket_url').eq('id', showId).single()
  if (show?.ticket_url) redirect(show.ticket_url)

  let checkoutUrl: string
  try {
    const session = await createCheckoutSession(showId, sourceUrl)
    checkoutUrl = session.url
  } catch (error) {
    const message = error instanceof Error ? error.message : 'checkout_failed'
    if (message === 'Show is sold out') throw new Error('Dette showet er utsolgt.')
    if (message === 'Show is no longer available for purchase') throw new Error('Dette showet er ikke lenger tilgjengelig for kjøp.')
    if (message === 'Show is not available for purchase') throw new Error('Dette showet er ikke tilgjengelig for kjøp ennå.')
    throw new Error('Checkout kunne ikke åpnes akkurat nå.')
  }

  redirect(checkoutUrl)
}
