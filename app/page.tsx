import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, Radio, Sparkles, Ticket, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicEventCard } from '@/components/public/public-event-card'
import { PublicHeader } from '@/components/public/public-header'
import { formatShortDate, formatShowDate, formatShowTime, getUpcomingPublishedShows, remainingTickets } from '@/lib/public-events'

export const metadata = {
  title: 'humor.events — kommende show',
  description: 'Se kommende show og kjøp billetter til humor.events-arrangementer.',
}

export const dynamic = 'force-dynamic'

export default async function Page() {
  const shows = await getUpcomingPublishedShows(3)
  const featured = shows[0]
  const venueCount = new Set(shows.map((show) => show.venue_name ?? show.venue_address).filter(Boolean)).size
  const limitedCapacityShows = shows.filter((show) => show.capacity !== null)
  const openTickets = limitedCapacityShows.reduce((total, show) => total + (remainingTickets(show) ?? 0), 0)

  return (
    <main className="min-h-svh bg-background">
      <section className="relative overflow-hidden border-b bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(130deg,#09090b_0%,#111827_42%,#7f1d1d_78%,#f59e0b_130%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
        <PublicHeader transparent />
        <div className="relative mx-auto grid min-h-[62svh] max-w-6xl gap-8 px-4 pb-12 pt-6 md:grid-cols-[1fr_360px] md:items-end md:px-6 lg:px-8">
          <div className="max-w-3xl pb-4">
            <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/15">
              <Radio className="size-3.5" /> Livekalenderen er åpen
            </div>
            <h1 className="text-4xl font-semibold leading-[0.95] md:text-5xl">Kommende show, lineup og billetter på ett sted.</h1>
            <p className="mt-4 max-w-xl text-base text-white/72">Velg kveld, se hvem som står på scenen og sikre plass før kapasiteten fylles opp.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild className="bg-white text-zinc-950 hover:bg-white/85"><Link href="/events">Se kommende show <ArrowRight className="size-4" /></Link></Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20"><Link href="/artists">Se artister</Link></Button>
              {featured && <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20"><Link href={`/events/${featured.slug}`}>Kjøp billetter</Link></Button>}
            </div>
            <div className="mt-8 grid max-w-lg grid-cols-3 overflow-hidden rounded-lg border border-white/15 bg-white/10 text-sm backdrop-blur">
              <HeroMetric value={shows.length.toString()} label="events" />
              <HeroMetric value={limitedCapacityShows.length ? openTickets.toString() : 'Åpent'} label="billetter" />
              <HeroMetric value={venueCount.toString()} label="scener" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-white/60">
                <span>Neste show</span>
                <Sparkles className="size-3.5 text-amber-200" />
              </div>
              {featured ? (
                <>
                  <div className="mt-3 text-2xl font-semibold leading-tight">{featured.title}</div>
                  <div className="mt-4 grid gap-2 text-sm text-white/75">
                    <span className="flex items-center gap-2"><CalendarDays className="size-3.5" /> {formatShowDate(featured.date)} · {formatShowTime(featured)}</span>
                    <span className="flex items-center gap-2"><MapPin className="size-3.5" /> {featured.venue_name ?? featured.venue_address ?? 'Sted kommer'}</span>
                    <span className="flex items-center gap-2"><Users className="size-3.5" /> {remainingTickets(featured) ?? 'Åpent'} plasser tilgjengelig</span>
                  </div>
                  <Button asChild size="sm" className="mt-5 w-full bg-white text-zinc-950 hover:bg-white/85"><Link href={`/events/${featured.slug}`}>Åpne event <ArrowRight className="size-3.5" /></Link></Button>
                </>
              ) : (
                <div className="mt-4 grid gap-3">
                  <div className="h-20 rounded-md border border-dashed border-white/25 bg-white/5" />
                  <div className="text-xs text-white/70">Ingen publiserte show akkurat nå.</div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs text-white/70">
              {shows.map((show) => <Link key={show.id} href={`/events/${show.slug}`} className="rounded-md border border-white/15 bg-white/10 px-2 py-2.5 hover:bg-white/15">{formatShortDate(show.date)}</Link>)}
              {shows.length === 0 && ['Dato', 'Lineup', 'Billett'].map((item) => <span key={item} className="rounded-md border border-white/15 bg-white/10 px-2 py-2.5">{item}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Kommende events</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Publiserte show med billetter tilgjengelig.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/events">Alle events <ArrowRight className="size-3.5" /></Link></Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {shows.map((show, index) => <PublicEventCard key={show.id} show={show} priority={index === 0} />)}
        </div>
        {shows.length === 0 && <EmptyEventState label="Ingen publiserte kommende show ennå." />}
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <div>
            <h2 className="text-xl font-semibold">Klar for neste kveld?</h2>
            <p className="text-sm text-muted-foreground">Gå rett til eventlisten og sikre plass.</p>
          </div>
          <Button asChild><Link href="/events"><Ticket className="size-4" /> Kjøp billetter</Link></Button>
        </div>
      </section>

      <footer className="border-t bg-zinc-950 py-6 text-center text-sm text-white/40">
        <span className="font-medium tracking-tight text-white/60">humor.events</span>™
      </footer>
    </main>
  )
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-white/10 px-3 py-2.5 last:border-r-0">
      <div className="text-xl font-semibold leading-none">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-white/55">{label}</div>
    </div>
  )
}

function EmptyEventState({ label }: { label: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-dashed bg-[linear-gradient(135deg,#fafafa,#f4f4f5)] p-8 text-center">
      <div className="mx-auto grid max-w-md gap-2 text-left">
        <div className="grid grid-cols-[72px_1fr] gap-3 rounded-md border bg-background p-3 shadow-sm">
          <div className="grid place-items-center rounded-md bg-zinc-950 text-white"><CalendarDays className="size-6" /></div>
          <div className="space-y-2 py-1">
            <div className="h-3 w-2/3 rounded-full bg-muted" />
            <div className="h-3 w-1/2 rounded-full bg-muted" />
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
