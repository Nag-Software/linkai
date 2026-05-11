import Link from 'next/link'
import { ArtistHeader } from '@/components/artist/artist-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatMoney, getCurrentArtist } from '@/lib/artist-portal'
import { createClient } from '@/lib/supabase/server'

export default async function ArtistDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <ArtistAuthLanding />

  const { artist, db } = await getCurrentArtist()
  const today = new Date().toISOString().slice(0, 10)

  const [offersResult, spotsResult, availabilityResult] = await Promise.all([
    db.from('booking_offers').select('*').eq('artist_id', artist.id).eq('status', 'sent').order('created_at', { ascending: false }),
    db.from('confirmed_spots').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
    db.from('artist_availability').select('*').eq('artist_id', artist.id).gte('available_date', today).order('available_date'),
  ])

  const offers = offersResult.data ?? []
  const spots = spotsResult.data ?? []
  const availability = availabilityResult.data ?? []
  const relevantShowIds = [...new Set([...offers.map((offer) => offer.show_id), ...spots.map((spot) => spot.show_id)])]
  const { data: shows } = relevantShowIds.length > 0
    ? await db.from('shows').select('id, title, date, start_time, venue_name').in('id', relevantShowIds)
    : { data: [] }
  const showMap = new Map((shows ?? []).map((show) => [show.id, show]))
  const upcomingSpots = spots
    .filter((spot) => {
      const show = showMap.get(spot.show_id)
      return spot.status === 'confirmed' && (!show?.date || show.date >= today)
    })
    .sort((a, b) => (showMap.get(a.show_id)?.date ?? '').localeCompare(showMap.get(b.show_id)?.date ?? ''))
    .slice(0, 3)
  const nextOffer = offers[0]
  const nextOfferShow = nextOffer ? showMap.get(nextOffer.show_id) : null
  const isBookable = artist.status === 'approved' && (artist.admin_score ?? 0) >= 6

  return (
    <>
      <ArtistHeader title="Oversikt" description={artist.stage_name ?? artist.full_name} />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Status" value={isBookable ? 'Klar for booking' : 'Under vurdering'} tone={isBookable ? 'success' : 'warning'} />
          <StatCard title="Aktive tilbud" value={offers.length.toString()} />
          <StatCard title="Bookinger" value={spots.filter((spot) => spot.status === 'confirmed').length.toString()} />
          <StatCard title="Prioriterte datoer" value={`${availability.length}/3`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Neste handling</CardTitle>
              <CardDescription>{nextOffer ? 'Svar på tilbudet for å sikre plassen.' : 'Du er ajour.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextOffer ? (
                <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="font-medium">{nextOfferShow?.title ?? 'Bookingtilbud'}</div>
                    <div className="text-sm text-muted-foreground">{nextOfferShow?.date ? formatDate(nextOfferShow.date) : 'Dato kommer'} {nextOfferShow?.venue_name ? `· ${nextOfferShow.venue_name}` : ''}</div>
                    <div className="mt-2 text-sm font-medium">{formatMoney(nextOffer.fee_amount, nextOffer.currency)}</div>
                  </div>
                  <Button asChild><Link href={`/booking-offers/${nextOffer.token}`}>Svar nå</Link></Button>
                </div>
              ) : (
                <EmptyLine text={isBookable ? 'Nye tilbud vises her når du matcher et show.' : 'Profilen må godkjennes før du kan bookes.'} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prioriterte datoer</CardTitle>
              <CardDescription>Datoer du velger prioriteres i automatisk matching.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availability.map((item) => <div key={item.id} className="rounded-lg border p-3 font-medium">{formatDate(item.available_date)}</div>)}
              {availability.length === 0 && <EmptyLine text="Ingen prioriterte datoer valgt." />}
              <Button asChild variant="outline" className="w-full"><Link href="/artist-app/available-dates">Administrer datoer</Link></Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Kommende bookinger</CardTitle>
              <CardDescription>Bekreftede oppdrag du skal møte på.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSpots.length === 0 ? (
                <EmptyLine text="Ingen kommende bookinger ennå." />
              ) : upcomingSpots.map((spot) => {
                const show = showMap.get(spot.show_id)
                return (
                  <div key={spot.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{show?.title ?? 'Booking'}</div>
                      <div className="text-sm text-muted-foreground">{show?.date ? formatDate(show.date) : 'Dato kommer'} {show?.venue_name ? `· ${show.venue_name}` : ''}</div>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm">{formatMoney(spot.fee_amount, spot.currency)}</span>
                  </div>
                )
              })}
              <Button asChild variant="outline" className="w-full"><Link href="/artist-app/bookings">Alle bookinger</Link></Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  )
}

function ArtistAuthLanding() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Artistportal</CardTitle>
          <CardDescription>Logg inn eller registrer artistprofil for å komme i gang.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button asChild><Link href="/artist-app/login">Logg inn</Link></Button>
          <Button asChild variant="outline"><Link href="/artist-app/signup">Registrer profil</Link></Button>
        </CardContent>
      </Card>
    </main>
  )
}

function StatCard({ title, value, tone }: { title: string; value: string; tone?: 'success' | 'warning' }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className={tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : undefined}>{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{text}</div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}