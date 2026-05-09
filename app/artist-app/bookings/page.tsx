import Link from 'next/link'
import { ArtistHeader } from '@/components/artist/artist-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatMoney, getCurrentArtist } from '@/lib/artist-portal'

export default async function ConfirmedBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view = 'upcoming' } = await searchParams
  const { artist, db } = await getCurrentArtist()
  const { data: spots } = await db.from('confirmed_spots').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false })
  const showIds = [...new Set((spots ?? []).map((spot) => spot.show_id))]
  const { data: shows } = showIds.length > 0 ? await db.from('shows').select('id, title, date, start_time, venue_name').in('id', showIds) : { data: [] }
  const showMap = new Map((shows ?? []).map((show) => [show.id, show]))
  const today = new Date().toISOString().slice(0, 10)
  const filtered = (spots ?? []).filter((spot) => {
    const show = showMap.get(spot.show_id)
    if (view === 'cancelled') return spot.status === 'cancelled'
    if (view === 'previous') return spot.status !== 'cancelled' && show?.date && show.date < today
    return spot.status !== 'cancelled' && (!show?.date || show.date >= today)
  })

  return (
    <>
      <ArtistHeader title="Confirmed Bookings" description={`${filtered.length} bookinger`} />
      <main className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap gap-2">
          <Tab href="/bookings?view=upcoming" active={view === 'upcoming'}>Kommende</Tab>
          <Tab href="/bookings?view=previous" active={view === 'previous'}>Tidligere</Tab>
          <Tab href="/bookings?view=cancelled" active={view === 'cancelled'}>Kansellerte</Tab>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Bookinger</CardTitle>
            <CardDescription>Bekreftede oppdrag, honorar og status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {filtered.map((spot) => {
              const show = showMap.get(spot.show_id)
              return (
                <div key={spot.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="font-medium">{show?.title ?? 'Show'}</div>
                    <div className="text-sm text-muted-foreground">{show?.date ? formatDate(show.date) : 'Dato kommer'} {show?.venue_name ? `· ${show.venue_name}` : ''}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-muted px-3 py-1">{spot.status}</span>
                    <span className="rounded-full bg-muted px-3 py-1">{formatMoney(spot.fee_amount, spot.currency)}</span>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Ingen bookinger i denne visningen.</div>}
          </CardContent>
        </Card>
      </main>
    </>
  )
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Button asChild variant={active ? 'default' : 'outline'} size="sm"><Link href={href}>{children}</Link></Button>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}