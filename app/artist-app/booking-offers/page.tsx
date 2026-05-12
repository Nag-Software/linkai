import Link from 'next/link'
import { ArtistHeader } from '@/components/artist/artist-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToastActionForm } from '@/components/toast-action-form'
import { acceptOfferAction, declineOfferAction } from '../actions'
import { formatMoney, getCurrentArtist } from '@/lib/artist-portal'
import { BookingOfferStatusToast } from './status-toast'

export default async function BookingOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const { artist, db } = await getCurrentArtist()
  const { data: offers } = await db.from('booking_offers').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false })
  const showIds = [...new Set((offers ?? []).map((offer) => offer.show_id))]
  const { data: shows } = showIds.length > 0
    ? await db.from('shows').select('id, title, date, venue_name, status').in('id', showIds)
    : { data: [] }
  const showMap = new Map((shows ?? []).map((show) => [show.id, show]))

  return (
    <>
      <BookingOfferStatusToast status={status} />
      <ArtistHeader title="Booking Offers" description="Tilbud er først bekreftet når du aksepterer og plassen fortsatt er ledig." />
      <main className="space-y-6 p-4 md:p-6">
        {status && <StatusMessage status={status} />}
        <Card>
          <CardHeader>
            <CardTitle>Tilbud</CardTitle>
            <CardDescription>Aksepterte tilbud kan bli fylt av andre hvis showet allerede er fullt.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(offers ?? []).map((offer) => {
              const show = showMap.get(offer.show_id)
              const today = new Date().toISOString().slice(0, 10)
              const showPast = show?.date ? show.date < today : false
              const active = offer.status === 'sent' && !showPast
              return (
                <div key={offer.id} className={`grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_auto] lg:items-center${showPast ? ' opacity-50' : ''}`}>
                  <div>
                    <div className="font-medium">{show?.title ?? 'Show'}</div>
                    <div className="text-sm text-muted-foreground">{show?.date ? formatDate(show.date) : 'Dato kommer'} {show?.venue_name ? `· ${show.venue_name}` : ''}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-1">{offer.status.replaceAll('_', ' ')}</span>
                      <span className="rounded-full bg-muted px-2 py-1">{formatMoney(offer.fee_amount, offer.currency)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline"><Link href={`/booking-offers/${offer.token}`}>Åpne</Link></Button>
                    {active && <OfferButtons token={offer.token} />}
                  </div>
                </div>
              )
            })}
            {(offers ?? []).length === 0 && <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Ingen bookingtilbud ennå.</div>}
          </CardContent>
        </Card>
      </main>
    </>
  )
}

export function OfferButtons({ token }: { token: string }) {
  return (
    <>
      <ToastActionForm action={acceptOfferAction}><input type="hidden" name="token" value={token} /><Button type="submit">Aksepter</Button></ToastActionForm>
      <ToastActionForm action={declineOfferAction}><input type="hidden" name="token" value={token} /><Button type="submit" variant="outline">Avslå</Button></ToastActionForm>
    </>
  )
}

function StatusMessage({ status }: { status: string }) {
  const text = status === 'accepted'
    ? 'Du er bekreftet på showet. Detaljer ligger under Confirmed Bookings.'
    : status === 'filled_by_other'
      ? 'Takk for rask respons. Plassen ble fylt av en annen artist før du rakk å bekrefte.'
      : status === 'already_booked'
        ? 'Du er allerede bekreftet på dette showet. En artist kan bare ha én spot per lineup.'
        : status === 'declined'
          ? 'Takk for svaret. Tilbudet er avslått.'
          : status === 'denied'
            ? 'Dette tilbudet tilhører ikke artistkontoen din.'
            : 'Status er oppdatert.'
  return <div className="rounded-lg border bg-muted p-4 text-sm font-medium">{text}</div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}