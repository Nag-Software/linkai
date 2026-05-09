import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { stripe } from '@/lib/stripe'
import { finalizeCheckoutSession } from '@/lib/checkout/finalize'

export const metadata = { title: 'Takk for kjøpet — humor.events' }

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  const session = session_id ? await getSession(session_id) : null
  const completion = session ? await finalizeCheckoutSession(session) : null

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <section className="w-full max-w-lg rounded-lg border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h1 className="mt-5 text-3xl font-semibold">Takk for kjøpet!</h1>
        <p className="mt-2 text-muted-foreground">
          {completion?.result === 'created'
            ? completion.emailSent
              ? 'Billetten din er sendt på e-post.'
              : 'Betalingen er godkjent, men billett-eposten kunne ikke sendes automatisk.'
            : completion?.result === 'duplicate'
              ? 'Billetten er allerede opprettet og sendt tidligere.'
              : 'Billetten din sendes på e-post.'}
        </p>
        {session && (
          <div className="mt-6 grid gap-2 rounded-lg bg-muted p-4 text-left text-sm">
            <div><span className="text-muted-foreground">Show:</span> {session.metadata?.show_title ?? 'humor.events'}</div>
            {session.metadata?.show_date && <div><span className="text-muted-foreground">Dato:</span> {session.metadata.show_date}</div>}
            <div><span className="text-muted-foreground">E-post:</span> {session.customer_details?.email ?? session.customer_email ?? 'Ikke tilgjengelig'}</div>
            {completion?.ticketCode && <div><span className="text-muted-foreground">Billettkode:</span> <span className="font-mono">{completion.ticketCode}</span></div>}
          </div>
        )}
        <div className="mt-7 flex justify-center gap-2">
          <Button asChild><Link href="/events">Se flere events</Link></Button>
          <Button asChild variant="outline"><Link href="/">Forsiden</Link></Button>
        </div>
      </section>
    </main>
  )
}

async function getSession(sessionId: string) {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    console.error('[Checkout Success] Could not retrieve session:', error)
    return null
  }
}