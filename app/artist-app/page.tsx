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
      <section className="relative isolate overflow-hidden border-b-2 border-zinc-950">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 pb-10 pt-8 md:grid-cols-[minmax(0,0.95fr)_320px] md:items-end md:gap-14 md:px-6 md:pb-14 md:pt-10 lg:px-8">
          <div>
            <div className="mb-5 inline-flex border border-zinc-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">
              Portal / humor.events
            </div>
            <h1 className="max-w-[760px] text-[clamp(2.75rem,6.6vw,5.4rem)] font-black uppercase leading-[0.84] tracking-[-0.035em]">
              Komikerportal
            </h1>
            <p className="mt-4 max-w-xl text-sm font-medium text-zinc-700 md:text-base">
              Hei, {artist.stage_name ?? artist.full_name}. Her ser du neste show, aktive tilbud og profilen bookingteamet jobber fra.
            </p>

            {featuredShow ? (
              <div className="mt-8 grid border-y-2 border-zinc-950 md:grid-cols-[128px_1fr]">
                <div className="grid content-center border-b-2 border-zinc-950 px-4 py-4 md:border-b-0 md:border-r-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                    {formatDateMonth(featuredShow.date ?? today)}
                  </span>
                  <span className="text-6xl font-black leading-none tracking-[-0.06em]">
                    {formatDateDay(featuredShow.date ?? today)}
                  </span>
                </div>
                <div className="grid gap-4 px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">Neste show</p>
                  <Link
                    href="/artist-app/bookings"
                    className="group inline-flex w-fit items-start gap-2 text-3xl font-black leading-none tracking-tight transition hover:text-[#b83224] md:text-4xl"
                  >
                    {featuredShow.title ?? 'Neste booking'}
                    <ArrowUpRight className="mt-1 size-5 opacity-60 transition group-hover:translate-x-0.5" />
                  </Link>
                  <p className="text-sm font-medium text-zinc-700">
                    {featuredShow.date ? formatDate(featuredShow.date) : 'Dato kommer'}
                    {featuredShow.venue_name ? ` · ${featuredShow.venue_name}` : ''}
                    {nextSpot ? ` · ${formatMoney(nextSpot.fee_amount, nextSpot.currency)}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                      href="/artist-app/bookings"
                      className="inline-flex h-11 items-center gap-2 rounded-none border-2 border-zinc-950 bg-[#b83224] px-5 text-sm font-bold text-white shadow-[4px_4px_0_#18181b] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#9f2d21] hover:shadow-[2px_2px_0_#18181b]"
                    >
                      Se bookinger
                    </Link>
                    <Link href="/artist-app/profile" className="inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4 hover:text-[#b83224]">
                      Åpne profil <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-7 max-w-md border-y-2 border-zinc-950 py-5 text-sm font-medium text-zinc-700">
                Ingen kommende show akkurat nå. Nye bookinger og tilbud dukker opp her først.
              </div>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
            <div className="rotate-[-1.5deg] border-2 border-zinc-950 bg-[#fbf7ec] p-5 shadow-[10px_10px_0_rgba(24,24,27,0.2)] transition hover:rotate-0 hover:shadow-[6px_6px_0_rgba(24,24,27,0.28)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Artistprofil</p>
              <div className="mt-8 border-b-2 border-zinc-950 pb-4">
                <p className="text-3xl font-black uppercase leading-none tracking-[-0.05em]">
                  {artist.stage_name ?? artist.full_name}
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-600">{artist.email}</p>
              </div>
              <div className="grid gap-3 pt-4 text-sm">
                <div className="flex items-center justify-between border-b border-zinc-950/15 pb-2">
                  <span className="font-bold uppercase tracking-[0.16em] text-zinc-500">Status</span>
                  <span className="font-black text-zinc-950">{artist.status === 'approved' ? 'Godkjent' : 'Vurderes'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-950/15 pb-2">
                  <span className="font-bold uppercase tracking-[0.16em] text-zinc-500">Tilbud</span>
                  <span className="font-black text-zinc-950">{offers.length}</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="font-bold uppercase tracking-[0.16em] text-zinc-500">Tidligere show</span>
                  <span className="font-black text-zinc-950">{previousSpots.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border-t-2 border-zinc-950 bg-[#b83224] text-white">
          <div
            className="flex items-center py-3 text-[10px] font-black uppercase tracking-[0.34em] will-change-transform"
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
        <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-zinc-950 pb-3">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Aktive tilbud</h2>
            <p className="mt-0.5 text-sm font-medium text-zinc-600">Tilbud som venter på svar.</p>
          </div>
          <Link href="/artist-app/booking-offers" className="inline-flex items-center gap-1.5 border-2 border-zinc-950 bg-transparent px-3 py-2 text-sm font-bold transition hover:bg-zinc-950 hover:text-white">
            Alle tilbud <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {offers.length === 0 ? (
          <EmptyPanel text="Ingen aktive tilbud akkurat nå." />
        ) : (
          <ul className="divide-y-2 divide-zinc-950 border-y-2 border-zinc-950 bg-[#f8f0df]/70">
            {offers.slice(0, 3).map((offer) => {
              const show = showMap.get(offer.show_id)
              return (
                <li key={offer.id}>
                  <div className="grid items-stretch sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0 px-4 py-4">
                      <p className="truncate text-base font-black tracking-tight">{show?.title ?? 'Bookingtilbud'}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-zinc-600">
                        {show?.date ? formatDate(show.date) : 'Dato kommer'}
                        {show?.venue_name ? ` · ${show.venue_name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center border-t-2 border-zinc-950 px-4 py-3 sm:border-l-2 sm:border-t-0">
                      <Link
                        href={`/artist-app/booking-offers/${offer.token}`}
                        className="inline-flex items-center gap-2 border-2 border-zinc-950 bg-[#b83224] px-4 py-2 text-sm font-bold text-white shadow-[4px_4px_0_#18181b] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#9f2d21] hover:shadow-[2px_2px_0_#18181b]"
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

      <section className="border-y-2 border-zinc-950 bg-[#fbf7ec]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[minmax(0,1.15fr)_320px] md:px-6 lg:px-8">
          <div>
            <div className="mb-5 border-b-2 border-zinc-950 pb-3">
              <h2 className="text-2xl font-black uppercase tracking-tight">Tidligere show</h2>
              <p className="mt-0.5 text-sm font-medium text-zinc-600">Dine siste gjennomførte opptredener.</p>
            </div>
            {previousSpots.length === 0 ? (
              <EmptyPanel text="Ingen tidligere show ennå." />
            ) : (
              <ul className="divide-y-2 divide-zinc-950 border-y-2 border-zinc-950 bg-white/50">
                {previousSpots.map((spot) => {
                  const show = showMap.get(spot.show_id)
                  return (
                    <li key={spot.id} className="grid grid-cols-[88px_1fr] items-stretch">
                      <div className="grid place-items-center border-r-2 border-zinc-950 px-3 py-3 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {formatDateMonth(show?.date ?? today)}
                        </span>
                        <span className="text-3xl font-black leading-none tracking-[-0.05em]">{formatDateDay(show?.date ?? today)}</span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="font-black tracking-tight">{show?.title ?? 'Show'}</p>
                        <p className="mt-0.5 text-xs font-medium text-zinc-600">
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

          <aside className="border-2 border-zinc-950 bg-[#f3ead9] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">Profil</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">Hold profilen oppdatert</h2>
            <p className="mt-2 text-sm font-medium text-zinc-600">
              Bookingteamet bruker profilen din når vi matcher deg mot nye kvelder og konsepter.
            </p>
            <div className="mt-6 space-y-3 border-t-2 border-zinc-950 pt-4 text-sm font-medium text-zinc-700">
              <p>E-post: {artist.email}</p>
              <p>Status: {artist.status === 'approved' ? 'Godkjent for booking' : 'Under vurdering'}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/artist-app/profile"
                className="inline-flex items-center justify-center gap-2 border-2 border-zinc-950 bg-[#b83224] px-4 py-2.5 text-sm font-bold text-white shadow-[4px_4px_0_#18181b] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#9f2d21] hover:shadow-[2px_2px_0_#18181b]"
              >
                Åpne profil
              </Link>
              <Link href="/artist-app/bookings" className="inline-flex items-center justify-center gap-2 border-2 border-zinc-950 bg-transparent px-4 py-2.5 text-sm font-bold transition hover:bg-zinc-950 hover:text-white">
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
    <main className="min-h-svh bg-[#f3ead9] text-zinc-950">
      <section className="relative isolate overflow-hidden border-b-2 border-zinc-950 bg-[#f3ead9] text-zinc-950">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
          }}
        />

        <PublicHeader transparent tone="light" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 pb-10 pt-8 md:grid-cols-[minmax(0,0.95fr)_320px] md:items-end md:gap-14 md:px-6 md:pb-14 md:pt-10 lg:px-8">
          <div>
            <div className="mb-5 inline-flex border border-zinc-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">
              Portal / humor.events
            </div>
            <h1 className="max-w-[760px] text-[clamp(2.75rem,6.8vw,5.6rem)] font-black uppercase leading-[0.82] tracking-[-0.035em]">
              Komikerportal
            </h1>
            <p className="mt-5 max-w-xl text-sm font-medium text-zinc-700 md:text-base">
              Logg inn eller registrer komikerprofil for å bli vurdert til kommende kvelder hos humor.events.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/artist-app/login" className="inline-flex h-11 items-center gap-2 rounded-none border-2 border-zinc-950 bg-[#b83224] px-5 text-sm font-bold text-white shadow-[4px_4px_0_#18181b] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#9f2d21] hover:shadow-[2px_2px_0_#18181b]">
                Logg inn
              </Link>
              <Link href="/artist-app/signup" className="inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4 hover:text-[#b83224]">
                Registrer profil <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
            <div className="rotate-[-1.5deg] border-2 border-zinc-950 bg-[#fbf7ec] p-5 shadow-[10px_10px_0_rgba(24,24,27,0.2)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">humor.events</p>
              <div className="mt-8 border-b-2 border-zinc-950 pb-4">
                <p className="text-3xl font-black uppercase leading-none tracking-[-0.05em]">Stand-up</p>
                <p className="text-3xl font-black uppercase leading-none tracking-[-0.05em]">Bookinger</p>
                <p className="text-3xl font-black uppercase leading-none tracking-[-0.05em]">Tilbud</p>
              </div>
              <p className="pt-4 text-sm font-medium text-zinc-600">
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
  return <div className="grid min-h-32 place-items-center border-2 border-dashed border-zinc-950 bg-[#fbf7ec] p-6 text-center text-sm font-medium text-zinc-600">{text}</div>
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