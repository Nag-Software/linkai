import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Betaling avbrutt — humor.events' }

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event } = await searchParams
  const eventHref = event ? `/events/${event}` : '/events'

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <section className="w-full max-w-lg rounded-lg border bg-card p-8 text-center shadow-sm">
        <XCircle className="mx-auto size-12 text-amber-600" />
        <h1 className="mt-5 text-3xl font-semibold">Betalingen ble avbrutt.</h1>
        <p className="mt-2 text-muted-foreground">Du kan gå tilbake til eventet og prøve igjen.</p>
        <div className="mt-7 flex justify-center gap-2">
          <Button asChild><Link href={eventHref}>Tilbake til eventet</Link></Button>
          <Button asChild variant="outline"><Link href="/events">Alle events</Link></Button>
        </div>
      </section>
    </main>
  )
}