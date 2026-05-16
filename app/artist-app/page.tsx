import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { PublicHeader } from '@/components/public/public-header'
import { formatMoney, getCurrentArtist } from '@/lib/artist-portal'
import { createClient } from '@/lib/supabase/server'

export default async function ArtistDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <ArtistAuthLanding />

  const { artist, db } = await getCurrentArtist()
  const today = new Date().toISOString().slice(0, 10)

  const [offersResult, spotsResult] = await Promise.all([
    db.from('booking_offers').select('*').eq('artist_id', artist.id).eq('status', 'sent').order('created_at', { ascending: false }),
    db.from('confirmed_spots').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }),
  ])

  const offers = offersResult.data ?? []
  const spots = spotsResult.data ?? []
  const relevantShowIds = [...new Set([...offers.map((offer) => offer.show_id), ...spots.map((spot) => spot.show_id)])]
  const { data: shows } = relevantShowIds.length > 0
    ? await db.from('shows').select('id, title, date, start_time, venue_name').in('id', relevantShowIds)
    : { data: [] }
  const showMap = new Map((shows ?? []).map((show) => [show.id, show]))
  const nextSpot = spots
    .filter((spot) => {
      const show = showMap.get(spot.show_id)
      return spot.status === 'confirmed' && (!show?.date || show.date >= today)
    })
    .sort((a, b) => (showMap.get(a.show_id)?.date ?? '').localeCompare(showMap.get(b.show_id)?.date ?? ''))
    [0]
  const previousSpots = spots
    .filter((spot) => {
      const show = showMap.get(spot.show_id)
      return spot.status !== 'cancelled' && show?.date != null && show.date < today
    })
    .sort((a, b) => (showMap.get(b.show_id)?.date ?? '').localeCompare(showMap.get(a.show_id)?.date ?? ''))
    .slice(0, 3)
  const featuredShow = nextSpot ? showMap.get(nextSpot.show_id) : null

  return (
    <div>
      <section className="border-b border-black/10">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-10 pt-8 md:grid-cols-[minmax(0,0.95fr)_320px] md:items-end md:gap-14 md:px-6 md:pb-14 md:pt-10 lg:px-8">
          <div>
            <div className="mb-5 inline-flex border border-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">
              Portal / humor.events
            </div>
            <h1 className="max-w-[760px] text-[clamp(2.75rem,6.6vw,5.4rem)] font-medium leading-[0.9] tracking-tight">
              Komikerportal
            </h1>
            <p className="mt-4 max-w-xl text-sm text-zinc-600 md:text-base">
              Hei, {artist.stage_name ?? artist.full_name}. Her ser du neste show, aktive tilbud og profilen bookingteamet jobber fra.
            </p>

            {featuredShow ? (
              <div className="mt-8 grid border-y border-black/10 md:grid-cols-[128px_1fr]">
                <div className="grid content-center border-b border-black/10 px-4 py-4 md:border-b-0 md:border-r md:border-r-black/10">
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                    {formatDateMonth(featuredShow.date ?? today)}
                  </span>
                  <span className="text-6xl font-medium leading-none tracking-tight">
                    {formatDateDay(featuredShow.date ?? today)}
                  </span>
                </div>
                <div className="grid gap-4 px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">Neste show</p>
                  <Link
                    href="/artist-app/bookings"
                    className="group inline-flex w-fit items-start gap-2 text-3xl font-medium leading-none tracking-tight transition hover:text-[#ff6bff] md:text-4xl"
                  >
                    {featuredShow.title ?? 'Neste booking'}
                    <ArrowUpRight className="mt-1 size-5 opacity-60 transition group-hover:translate-x-0.5" />
                  </Link>
                  <p className="text-sm text-zinc-600">
                    {featuredShow.date ? formatDate(featuredShow.date) : 'Dato kommer'}
                    {featuredShow.venue_name ? ` · ${featuredShow.venue_name}` : ''}
                    {nextSpot ? ` · ${formatMoney(nextSpot.fee_amount, nextSpot.currency)}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                      href="/artist-app/bookings"
                      className="inline-flex h-11 items-center gap-2 border border-black bg-black px-5 text-sm font-medium text-white transition hover:bg-[#ff6bff] hover:text-black hover:border-[#ff6bff]"
                    >
                      Se bookinger
                    </Link>
                    <Link href="/artist-app/profile" className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-[#ff6bff]">
                      Åpne profil <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-7 max-w-md border-y border-black/10 py-5 text-sm text-zinc-600">
                Ingen kommende show akkurat nå. Nye bookinger og tilbud dukker opp her først.
              </div>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
            <div className="border border-black bg-white p-5 shadow-[6px_6px_0_black/8] transition hover:shadow-[3px_3px_0_black/10]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Artistprofil</p>
              <div className="mt-8 border-b border-black/10 pb-4">
                <p className="text-3xl font-medium leading-none tracking-tight">
                  {artist.stage_name ?? artist.full_name}
                </p>
                <p className="mt-2 text-sm text-zinc-500">{artist.email}</p>
              </div>
              <div className="grid gap-3 pt-4 text-sm">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span className="font-bold uppercase tracking-[0.16em] text-zinc-500">Status</span>
                  <span className="font-medium">{artist.status === 'approved' ? 'Godkjent' : 'Vurderes'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span className="font-bold uppercase tracking-[0.16em] text-zinc-500">Tilbud</span>
                  <span className="font-medium">{offers.length}</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="font-bold uppercase tracking-[0.16em] text-zinc-500">Tidligere show</span>
                  <span className="font-medium">{previousSpots.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border-t border-black/10 bg-[#ff6bff]">
          <div
            className="flex items-center py-3 text-[10px] font-black uppercase tracking-[0.34em] text-black will-change-transform"
            style={{ animation: 'marquee 42s linear infinite' }}
          >
            {[0, 1].map((i) => (
              <span key={i} className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={i > 0}>
                <span>Komikerportal</span><span>·</span>
                <span>Tilbud</span><span>·</span>
                <span>Bookinger</span><span>·</span>
                <span>Profil</span><span>·</span>
                <span>humor.events</span><span>·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-black/10 pb-3">
          <div>
            <h2 className="text-2xl font-medium">Aktive tilbud</h2>
            <p className="mt-0.5 text-sm text-zinc-500">Tilbud som venter på svar.</p>
          </div>
          <Link href="/artist-app/booking-offers" className="inline-flex items-center gap-1.5 border border-black bg-transparent px-3 py-2 text-sm font-medium transition hover:bg-black hover:text-white">
            Alle tilbud <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {offers.length === 0 ? (
          <EmptyPanel text="Ingen aktive tilbud akkurat nå." />
        ) : (
          <ul className="divide-y divide-black/10 border-y border-black/10">
            {offers.slice(0, 3).map((offer) => {
              const show = showMap.get(offer.show_id)
              return (
                <li key={offer.id}>
                  <div className="grid items-stretch sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0 px-4 py-4">
                      <p className="truncate text-base font-medium tracking-tight">{show?.title ?? 'Bookingtilbud'}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {show?.date ? formatDate(show.date) : 'Dato kommer'}
                        {show?.venue_name ? ` · ${show.venue_name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center border-t border-black/10 px-4 py-3 sm:border-l sm:border-t-0">
                      <Link
                        href={`/artist-app/booking-offers/${offer.token}`}
                        className="inline-flex items-center gap-2 border border-black bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-[#ff6bff] hover:text-black hover:border-[#ff6bff]"
                      >
                        Svar nå
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="border-y border-black/10">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[minmax(0,1.15fr)_320px] md:px-6 lg:px-8">
          <div>
            <div className="mb-5 border-b border-black/10 pb-3">
              <h2 className="text-2xl font-medium">Tidligere show</h2>
              <p className="mt-0.5 text-sm text-zinc-500">Dine siste gjennomførte opptredener.</p>
            </div>
            {previousSpots.length === 0 ? (
              <EmptyPanel text="Ingen tidligere show ennå." />
            ) : (
              <ul className="divide-y divide-black/10 border-y border-black/10">
                {previousSpots.map((spot) => {
                  const show = showMap.get(spot.show_id)
                  return (
                    <li key={spot.id} className="grid grid-cols-[88px_1fr] items-stretch">
                      <div className="grid place-items-center border-r border-black/10 px-3 py-3 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {formatDateMonth(show?.date ?? today)}
                        </span>
                        <span className="text-3xl font-medium leading-none tracking-tight">{formatDateDay(show?.date ?? today)}</span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="font-medium tracking-tight">{show?.title ?? 'Show'}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {show?.date ? formatDate(show.date) : 'Dato kommer'}
                          {show?.venue_name ? ` · ${show.venue_name}` : ''}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <aside className="border border-black/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">Profil</p>
            <h2 className="mt-3 text-2xl font-medium">Hold profilen oppdatert</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Bookingteamet bruker profilen din når vi matcher deg mot nye kvelder og konsepter.
            </p>
            <div className="mt-6 space-y-3 border-t border-black/10 pt-4 text-sm text-zinc-700">
              <p>E-post: {artist.email}</p>
              <p>Status: {artist.status === 'approved' ? 'Godkjent for booking' : 'Under vurdering'}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/artist-app/profile"
                className="inline-flex items-center justify-center gap-2 border border-black bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#ff6bff] hover:text-black hover:border-[#ff6bff]"
              >
                Åpne profil
              </Link>
              <Link href="/artist-app/bookings" className="inline-flex items-center justify-center gap-2 border border-black bg-transparent px-4 py-2.5 text-sm font-medium transition hover:bg-black hover:text-white">
                Se alle bookinger
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function ArtistAuthLanding() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="border-b border-black/10">
        <PublicHeader transparent tone="light" />
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-10 pt-28 md:grid-cols-[minmax(0,0.95fr)_320px] md:items-end md:gap-14 md:px-6 md:pb-14 lg:px-8">
          <div>
            <div className="mb-5 inline-flex border border-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">
              Portal / humor.events
            </div>
            <h1 className="max-w-[760px] text-[clamp(2.75rem,6.8vw,5.6rem)] font-medium leading-[0.9] tracking-tight">
              Komikerportal
            </h1>
            <p className="mt-5 max-w-xl text-sm text-zinc-600 md:text-base">
              Logg inn eller registrer komikerprofil for å bli vurdert til kommende kvelder hos humor.events.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/artist-app/login" className="inline-flex h-11 items-center gap-2 border border-black bg-black px-5 text-sm font-medium text-white transition hover:bg-[#ff6bff] hover:text-black hover:border-[#ff6bff]">
                Logg inn
              </Link>
              <Link href="/artist-app/signup" className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-[#ff6bff]">
                Registrer profil <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
            <div className="border border-black bg-white p-5 shadow-[6px_6px_0_black/8]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">humor.events</p>
              <div className="mt-8 border-b border-black/10 pb-4">
                <p className="text-3xl font-medium leading-none tracking-tight">Stand-up</p>
                <p className="text-3xl font-medium leading-none tracking-tight">Bookinger</p>
                <p className="text-3xl font-medium leading-none tracking-tight">Tilbud</p>
              </div>
              <p className="pt-4 text-sm text-zinc-600">
                Alt samlet på ett sted: tilbud, kommende show og profilen arrangørene ser.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="grid min-h-32 place-items-center border border-dashed border-black/20 p-6 text-center text-sm text-zinc-500">{text}</div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatDateDay(value: string) {
  return new Date(value).getDate()
}

function formatDateMonth(value: string) {
  return new Date(value).toLocaleDateString('nb-NO', { month: 'short' })
}