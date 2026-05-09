import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

interface StapeEvent {
  event_name: string
  event_id: string
  event_source_url?: string
  show_id?: string
  payload: Record<string, unknown>
}

type InitiateCheckoutContext = {
  sourceUrl?: string
  userAgent?: string
  ipAddress?: string
  fbp?: string
  fbc?: string
}

async function sendToStape(event: StapeEvent): Promise<void> {
  const endpoint = process.env.STAPE_CAPI_ENDPOINT
  const token = process.env.STAPE_CAPI_TOKEN
  const admin = createAdminClient()

  // Log as pending
  const { data: logEntry } = await admin
    .from('tracking_events')
    .insert({
      show_id: event.show_id ?? null,
      event_name: event.event_name,
      event_id: event.event_id,
      event_source_url: event.event_source_url ?? null,
      payload: event.payload,
      status: 'pending',
    })
    .select('id')
    .single()

  try {
    if (!endpoint || !token) {
      throw new Error('Stape CAPI not configured')
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: [
          {
            event_name: event.event_name,
            event_id: event.event_id,
            event_source_url: event.event_source_url,
            ...event.payload,
          },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(`Stape responded with ${res.status}`)
    }

    if (logEntry?.id) {
      await admin
        .from('tracking_events')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', logEntry.id)
    }
  } catch (err) {
    if (logEntry?.id) {
      await admin
        .from('tracking_events')
        .update({ status: 'failed' })
        .eq('id', logEntry.id)
    }
    // Re-throw so the caller can decide to log it
    throw err
  }
}

// ─────────────────────────────────────────────────────────────
// 6.10 trackInitiateCheckout
// ─────────────────────────────────────────────────────────────
export async function trackInitiateCheckout(showId: string, context: InitiateCheckoutContext = {}) {
  const admin = createAdminClient()
  const { data: show } = await admin
    .from('shows')
    .select('title, ticket_price, currency')
    .eq('id', showId)
    .single()

  const eventId = randomUUID()
  const eventTime = Math.floor(Date.now() / 1000)

  await sendToStape({
    event_name: 'InitiateCheckout',
    event_id: eventId,
    event_source_url: context.sourceUrl,
    show_id: showId,
    payload: {
      show_id: showId,
      show_title: show?.title ?? '',
      ticket_price: show?.ticket_price ?? null,
      currency: show?.currency ?? 'NOK',
      event_time: eventTime,
      event_source_url: context.sourceUrl,
      action_source: 'website',
      user_data: {
        client_user_agent: context.userAgent,
        client_ip_address: context.ipAddress,
        fbp: context.fbp,
        fbc: context.fbc,
      },
      custom_data: {
        content_ids: [showId],
        content_name: show?.title ?? '',
        show_id: showId,
        show_title: show?.title ?? '',
        ticket_price: show?.ticket_price ?? null,
        value: show?.ticket_price ? show.ticket_price / 100 : undefined,
        currency: show?.currency ?? 'NOK',
      },
    },
  })
}

// ─────────────────────────────────────────────────────────────
// 6.10 trackPurchase
// ─────────────────────────────────────────────────────────────
export async function trackPurchase(orderId: string) {
  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('show_id, amount_total, currency, buyer_email, stripe_checkout_session_id')
    .eq('id', orderId)
    .single()

  if (!order) return

  const showTitle = order.show_id
    ? (await admin.from('shows').select('title').eq('id', order.show_id).single()).data?.title ?? ''
    : ''
  const eventId = randomUUID()
  const eventTime = Math.floor(Date.now() / 1000)

  await sendToStape({
    event_name: 'Purchase',
    event_id: eventId,
    show_id: order.show_id ?? undefined,
    payload: {
      show_id: order.show_id,
      show_title: showTitle,
      amount_total: order.amount_total ?? null,
      currency: order.currency ?? 'NOK',
      order_id: orderId,
      stripe_checkout_session_id: order.stripe_checkout_session_id,
      user_data: order.buyer_email
        ? { em: order.buyer_email }
        : undefined,
      event_time: eventTime,
      action_source: 'website',
      custom_data: {
        content_ids: [order.show_id],
        content_name: showTitle,
        show_id: order.show_id,
        show_title: showTitle,
        amount_total: order.amount_total ?? null,
        value: order.amount_total ? order.amount_total / 100 : undefined,
        currency: order.currency ?? 'NOK',
        order_id: orderId,
        stripe_checkout_session_id: order.stripe_checkout_session_id,
      },
    },
  })
}
