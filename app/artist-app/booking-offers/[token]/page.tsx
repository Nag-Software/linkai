import { notFound } from 'next/navigation'
import { ArtistHeader } from '@/components/artist/artist-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney, getCurrentArtist } from '@/lib/artist-portal'
import { OfferButtons } from '../page'

export default async function BookingOfferTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { artist, db } = await getCurrentArtist()
  const { data: offer } = await db.from('booking_offers').select('*').eq('token', token).single()
  if (!offer || offer.artist_id !== artist.id) notFound()

  const { data: show } = await db.from('shows').select('title, date, start_time, venue_name, venue_address').eq('id', offer.show_id).single()

  return (
    <>
      <ArtistHeader title="Booking Offer" description={offer.status.replaceAll('_', ' ')} />
      <main className="p-4 md:p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{show?.title ?? 'Show'}</CardTitle>
            <CardDescription>{show?.date ? formatDate(show.date) : 'Dato kommer'} {show?.start_time ? `· ${show.start_time}` : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Honorar" value={formatMoney(offer.fee_amount, offer.currency)} />
              <Info label="Status" value={offer.status.replaceAll('_', ' ')} />
              <Info label="Sted" value={show?.venue_name ?? 'Ikke satt'} />
              <Info label="Adresse" value={show?.venue_address ?? 'Ikke satt'} />
            </div>
            {offer.status === 'sent' && (
              <div className="flex flex-wrap gap-2 rounded-lg border bg-muted p-3">
                <OfferButtons token={offer.token} />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}