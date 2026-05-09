import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { finalizeCheckoutSession } from '@/lib/checkout/finalize'

/**
 * 6.9 Stripe webhook endpoint: /api/webhooks/stripe
 * Handles: checkout.session.completed, payment_intent.payment_failed, charge.refunded
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
      break
    case 'charge.refunded':
      await handleRefund(event.data.object as Stripe.Charge)
      break
    default:
      // Unhandled event type — ignore
      break
  }

  return NextResponse.json({ received: true })
}

// ─────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  await finalizeCheckoutSession(session)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const admin = createAdminClient()
  await admin
    .from('orders')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id)
}

async function handleRefund(charge: Stripe.Charge) {
  const admin = createAdminClient()
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : null
  if (!paymentIntentId) return

  // Update order
  const { data: order } = await admin
    .from('orders')
    .update({ status: 'refunded' })
    .eq('stripe_payment_intent_id', paymentIntentId)
    .select('id')
    .single()

  if (order) {
    // Mark tickets as refunded
    await admin
      .from('tickets')
      .update({ status: 'refunded' })
      .eq('order_id', order.id)
  }
}
