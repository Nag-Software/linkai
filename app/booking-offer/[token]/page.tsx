import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { publicAcceptOfferAction, publicDeclineOfferAction } from './actions'

export default async function PublicBookingOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ result?: string }>
}) {
  const { token } = await params
  const { result } = await searchParams

  const db = createAdminClient()
  const { data: offer } = await db
    .from('booking_offers')
    .select('id, status, fee_amount, currency, expires_at, show_id, show_requirement_id')
    .eq('token', token)
    .single()

  if (!offer) notFound()

  const [{ data: show }, { data: req }] = await Promise.all([
    db.from('shows').select('title, date, start_time, venue_name, venue_address').eq('id', offer.show_id).single(),
    db.from('show_requirements').select('role_name').eq('id', offer.show_requirement_id).single(),
  ])

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(
      new Date(`${value}T12:00:00`),
    )

  const formatMoney = (amount: number | null, currency: string) => {
    if (amount == null) return 'Ikke satt'
    return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: currency || 'NOK', maximumFractionDigits: 0 }).format(amount)
  }

  if (result === 'accepted') {
    return (
      <ResultPage
        icon="✓"
        title="Du er bekreftet!"
        message="Du er booket på showet. Du vil motta en bekreftelse på e-post med mer informasjon."
        variant="success"
      />
    )
  }
  if (result === 'filled_by_other') {
    return (
      <ResultPage
        icon="!"
        title="Spotten ble fylt av en annen"
        message="Takk for rask respons. Denne spotten ble dessverre akkurat fylt av en annen artist. Du vil fortsatt få nye tilbud i fremtiden."
        variant="neutral"
      />
    )
  }
  if (result === 'declined') {
    return (
      <ResultPage
        icon="✓"
        title="Takk for svaret"
        message="Du vil fortsatt få tilbud i fremtiden selv om denne datoen ikke passet."
        variant="neutral"
      />
    )
  }
  if (result === 'expired') {
    return (
      <ResultPage
        icon="!"
        title="Tilbudet er utløpt"
        message="Dette bookingtilbudet er ikke lenger aktivt."
        variant="neutral"
      />
    )
  }
  if (result === 'error') {
    return (
      <ResultPage
        icon="✗"
        title="Noe gikk galt"
        message="Tilbudet kan allerede ha blitt besvart eller er utløpt. Kontakt oss hvis du trenger hjelp."
        variant="error"
      />
    )
  }

  const isExpired = offer.expires_at ? new Date(offer.expires_at) < new Date() : false
  const canRespond = offer.status === 'sent' && !isExpired

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Bookingtilbud</h1>
          <p className="text-muted-foreground text-sm">Du har mottatt et tilbud om å opptre</p>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-6 py-4 border-b">
            <h2 className="font-semibold text-lg">{show?.title ?? 'Show'}</h2>
            {show?.date && (
              <p className="text-muted-foreground text-sm capitalize">{formatDate(show.date)}</p>
            )}
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <InfoCell label="Rolle" value={req?.role_name ?? 'Ikke satt'} />
            <InfoCell label="Honorar" value={formatMoney(offer.fee_amount, offer.currency)} />
            <InfoCell label="Tidspunkt" value={show?.start_time?.slice(0, 5) ?? 'Kommer'} />
            <InfoCell label="Sted" value={show?.venue_name ?? show?.venue_address ?? 'Ikke satt'} />
          </div>
        </div>

        {canRespond && (
          <div className="space-y-3">
            <form action={publicAcceptOfferAction}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 px-4 hover:bg-primary/90 transition-colors"
              >
                Ja, jeg tar spotten
              </button>
            </form>
            <form action={publicDeclineOfferAction}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-lg border bg-background font-medium py-3 px-4 hover:bg-muted transition-colors text-sm"
              >
                Nei, det passer ikke
              </button>
            </form>
          </div>
        )}

        {!canRespond && !result && (
          <div className="rounded-lg border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            {isExpired ? 'Dette tilbudet er utløpt.' : `Status: ${offer.status.replaceAll('_', ' ')}`}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Spørsmål? Kontakt oss på{' '}
          <a href="mailto:hei@humor.events" className="underline underline-offset-2">
            hei@humor.events
          </a>
        </p>
      </div>
    </main>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  )
}

function ResultPage({
  icon,
  title,
  message,
  variant,
}: {
  icon: string
  title: string
  message: string
  variant: 'success' | 'neutral' | 'error'
}) {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    neutral: 'bg-muted border-border text-foreground',
    error: 'bg-red-50 border-red-200 text-red-800',
  }
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className={`w-full max-w-sm rounded-xl border p-8 text-center space-y-3 ${colors[variant]}`}>
        <div className="text-4xl">{icon}</div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm opacity-80">{message}</p>
      </div>
    </main>
  )
}
