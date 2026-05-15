import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, CalendarDays, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicEventCard } from '@/components/public/public-event-card'
import { PublicHeader } from '@/components/public/public-header'
import { startCheckoutAction } from '@/app/events/actions'
import { formatShowTime, formatTicketPrice, getUpcomingPublishedShows, remainingTickets, ticketFillPercent } from '@/lib/public-events'

export const metadata = {
  title: 'humor.events — norges morsomste kvelder',
  description: 'Se kommende show og kjøp billetter til humor.events-arrangementer.',
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const shows = await getUpcomingPublishedShows(6)
  const featured = shows[0]
  const secondaryShows = shows.slice(1, 4)
  const featuredRemaining = featured ? remainingTickets(featured) : null
  const featuredSoldOut = featuredRemaining === 0
  const featuredFillPercent = featured ? ticketFillPercent(featured) : 0
  const featuredLocation = featured?.venue_name ?? featured?.venue_address

  return (
    <main className="min-h-svh bg-[#f3ead9] text-zinc-950">
      <section className="relative isolate mb-3 overflow-hidden border-zinc-950 bg-[#f3ead9] text-zinc-950 sm:mb-4">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
          }}
        />
        {/*}    
        <div className="absolute inset-x-0 top-[76px] hidden border-y border-zinc-950/10 py-1 text-center text-[10px] uppercase tracking-[0.45em] text-zinc-950/35 md:block">
          Stand-up · comedy · scene · billetter · Oslo
        </div>
        */}

        <PublicHeader transparent tone="light" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-5 px-4 pb-8 pt-4 sm:gap-7 sm:pb-10 sm:pt-6 md:grid-cols-[minmax(0,0.95fr)_340px] md:items-end md:gap-14 md:px-6 md:pb-14 md:pt-10 lg:px-8">
          <div className="mt-0 md:mt-5">
            <h1 className="max-w-[760px] text-5xl font-black uppercase leading-[0.86] tracking-normal sm:text-6xl md:text-7xl lg:text-8xl">
              Norges morsomste kvelder
            </h1>

            {featured ? (
              <div className="mt-5 grid border-y-2 border-zinc-950 sm:mt-7 md:grid-cols-[128px_1fr]">
                <div className="grid grid-cols-[auto_1fr] items-center gap-3 border-b-2 border-zinc-950 px-4 py-3 md:block md:border-b-0 md:border-r-2 md:py-4">
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                    {new Date(featured.date).toLocaleDateString('nb-NO', { month: 'short' })}
                  </span>
                  <span className="text-5xl font-black leading-none tracking-normal md:text-6xl">
                    {new Date(featured.date).getDate()}
                  </span>
                </div>
                <div className="grid gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">Neste show</p>
                  <Link
                    href={`/events/${featured.slug}`}
                    className="group inline-flex w-fit items-start gap-2 text-2xl font-black leading-none tracking-normal transition hover:text-[#b83224] sm:text-3xl md:text-4xl"
                  >
                    {featured.title}
                    <ArrowUpRight className="mt-1 size-5 opacity-60 transition group-hover:translate-x-0.5" />
                  </Link>
                  <p className="text-sm font-medium text-zinc-700">
                    {formatShowTime(featured)} · {featuredLocation ?? 'Sted kommer'} · {formatTicketPrice(featured)}
                  </p>
                  {featuredSoldOut ? (
                    <p className="text-lg font-black uppercase tracking-widest text-[#b83224]">SOLD OUT</p>
                  ) : featuredFillPercent >= 80 ? (
                    <p className="text-sm font-bold text-[#b83224]">Få plasser igjen</p>
                  ) : featuredFillPercent >= 50 ? (
                    <p className="text-sm font-bold text-zinc-600">Over halvparten solgt</p>
                  ) : null}
                  <div className="grid gap-3 pt-1 sm:flex sm:flex-wrap sm:items-center">
                    <form action={startCheckoutAction} className="w-full sm:w-auto">
                      <input type="hidden" name="show_id" value={featured.id} />
                      <input type="hidden" name="slug" value={featured.slug} />
                      <Button
                        type="submit"
                        size="lg"
                        disabled={featuredSoldOut}
                        className="h-11 w-full rounded-none border-2 border-zinc-950 bg-[#b83224] px-5 text-white shadow-[4px_4px_0_#18181b] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#9f2d21] hover:shadow-[2px_2px_0_#18181b] sm:w-auto"
                      >
                        <Ticket className="size-4" /> {featuredSoldOut ? 'Utsolgt' : 'Kjøp billett'}
                      </Button>
                    </form>
                    <Link href="/events" className="inline-flex min-h-11 items-center justify-center gap-1.5 border-2 border-zinc-950 bg-[#fbf7ec] px-4 text-sm font-bold hover:bg-zinc-950 hover:text-white sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:underline sm:decoration-2 sm:underline-offset-4 sm:hover:bg-transparent sm:hover:text-[#b83224]">
                      Alle show <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-7 max-w-md text-zinc-700">Nye show legges ut fortløpende. Kom tilbake snart.</p>
            )}

            {secondaryShows.length > 0 && (
              <ul className="mt-4 divide-y-2 divide-zinc-950 border-y-2 border-zinc-950 bg-[#f8f0df]/70 sm:mt-5">
                {secondaryShows.map((show) => (
                  <li key={show.id}>
                    <Link href={`/events/${show.slug}`} className="group grid grid-cols-[76px_1fr] items-stretch transition hover:bg-white/50 sm:grid-cols-[90px_1fr_auto]">
                      <div className="grid place-items-center border-r-2 border-zinc-950 px-3 py-3 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {new Date(show.date).toLocaleDateString('nb-NO', { month: 'short' })}
                        </span>
                        <span className="text-3xl font-black leading-none tracking-normal">{new Date(show.date).getDate()}</span>
                      </div>
                      <div className="min-w-0 px-4 py-3">
                        <p className="truncate text-base font-black tracking-normal group-hover:text-[#b83224]">{show.title}</p>
                        <p className="mt-0.5 truncate text-xs font-medium text-zinc-600">{show.venue_name ?? show.venue_address ?? 'Sted kommer'}</p>
                      </div>
                      <div className="hidden items-center border-l-2 border-zinc-950 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 sm:flex">
                        Info
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] md:max-w-none">
            {featured ? (
              <Link href={`/events/${featured.slug}`} className="group block border-2 border-zinc-950 bg-[#fbf7ec] p-2 shadow-[6px_6px_0_rgba(24,24,27,0.2)] transition hover:shadow-[4px_4px_0_rgba(24,24,27,0.28)] sm:rotate-[-1.5deg] sm:shadow-[10px_10px_0_rgba(24,24,27,0.2)] sm:hover:rotate-0 sm:hover:shadow-[6px_6px_0_rgba(24,24,27,0.28)]">
                <div className="relative aspect-[3/4] overflow-hidden bg-zinc-200">
                  {featured.poster_url ? (
                    <Image
                      src={featured.poster_url}
                      alt={featured.title}
                      fill
                      priority
                      sizes="(max-width: 768px) 84vw, 340px"
                      className="object-contain grayscale-[12%] transition duration-500 group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="flex h-full flex-col justify-between bg-[#b83224] p-6 text-white">
                      <span className="text-xs font-bold uppercase tracking-widest">humor.events</span>
                      <strong className="text-4xl font-black uppercase leading-none">{featured.title}</strong>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 border-t-2 border-zinc-950 px-1 pt-2 text-xs font-black uppercase tracking-widest">
                  <span>Hovedshow</span>
                  <span>{formatTicketPrice(featured)}</span>
                </div>
              </Link>
            ) : (
              <div className="grid aspect-[3/4] place-items-center border-2 border-dashed border-zinc-950 bg-[#fbf7ec] p-6 text-center text-sm font-medium text-zinc-600">
                Ingen publiserte show akkurat nå.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:py-8 md:px-6 lg:px-8">
        <div className="mb-4 grid gap-3 border-b-2 border-zinc-950 pb-3 sm:mb-5 sm:flex sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-normal">Kommende events</h2>
            <p className="mt-0.5 text-sm font-medium text-zinc-600">Publiserte show med billetter tilgjengelig.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full rounded-none border-2 border-zinc-950 bg-transparent font-bold hover:bg-zinc-950 hover:text-white sm:w-auto"><Link href="/events">Alle events <ArrowRight className="size-3.5" /></Link></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {shows.map((show, index) => <PublicEventCard key={show.id} show={show} priority={index === 0} />)}
        </div>
        {shows.length === 0 && <EmptyEventState label="Ingen publiserte kommende show ennå." />}
      </section>

      <section className="border-y-2 border-zinc-950 bg-[#fbf7ec]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-7 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <div>
            <h2 className="text-xl font-black uppercase tracking-normal">Klar for neste kveld?</h2>
            <p className="text-sm font-medium text-zinc-600">Gå rett til eventlisten og sikre plass.</p>
          </div>
          <Button asChild className="w-full rounded-none border-2 border-zinc-950 bg-[#b83224] font-bold text-white shadow-[4px_4px_0_#18181b] hover:bg-[#9f2d21] sm:w-auto"><Link href="/events"><Ticket className="size-4" /> Kjøp billetter</Link></Button>
        </div>
      </section>

      <footer className="border-t-2 border-zinc-950 bg-[#f3ead9] py-6 text-center text-sm font-bold text-zinc-500">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 px-4">
          <span className="tracking-normal text-zinc-950">humor.events</span>™
          <span className="mx-2 text-zinc-400">|</span>
          <span className="text-zinc-500">Norges morsomste kvelder</span>
        </div>
        <Link href="/artist-app/login" className="">Komikerportalen</Link>
      </footer>
    </main>
  )
}

function EmptyEventState({ label }: { label: string }) {
  return (
    <div className="overflow-hidden border-2 border-dashed border-zinc-950 bg-[#fbf7ec] p-8 text-center">
      <div className="mx-auto grid max-w-md gap-2 text-left">
        <div className="grid grid-cols-[72px_1fr] gap-3 border-2 border-zinc-950 bg-[#f3ead9] p-3">
          <div className="grid place-items-center bg-zinc-950 text-white"><CalendarDays className="size-6" /></div>
          <div className="space-y-2 py-1">
            <div className="h-3 w-2/3 bg-zinc-950/15" />
            <div className="h-3 w-1/2 bg-zinc-950/15" />
          </div>
        </div>
        <p className="text-center text-sm font-medium text-zinc-600">{label}</p>
      </div>
    </div>
  )
}
