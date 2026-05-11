import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { PublicEventCard } from '@/components/public/public-event-card'
import { PublicHeader } from '@/components/public/public-header'
import { getUpcomingPublishedShows, remainingTickets } from '@/lib/public-events'

export const metadata = {
  title: 'Events — humor.events',
  description: 'Alle publiserte kommende humor.events-show med plakater, pris og billetter.',
}

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const shows = await getUpcomingPublishedShows()
  const venueCount = new Set(shows.map((show) => show.venue_name ?? show.venue_address).filter(Boolean)).size
  const cappedShows = shows.filter((show) => show.capacity !== null)
  const openTickets = cappedShows.reduce((total, show) => total + (remainingTickets(show) ?? 0), 0)

  return (
    <main className="min-h-svh bg-[#f3ead9] text-zinc-950">
      <section className="relative overflow-hidden border-b-2 border-zinc-950 bg-[#f3ead9]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
          }}
        />
        <PublicHeader transparent tone="light" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 md:px-6 md:pb-14 lg:px-8">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold underline decoration-2 underline-offset-4 hover:text-[#b83224]"><ArrowLeft className="size-4" /> Til forsiden</Link>
          <div className="grid gap-8 md:grid-cols-[1fr_420px] md:items-end">
            <div>
              <div className="mb-5 inline-flex border border-zinc-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">Program</div>
              <h1 className="max-w-3xl text-[clamp(3rem,8vw,6.8rem)] font-black uppercase leading-[0.82] tracking-[-0.04em]">Kommende events</h1>
              <p className="mt-4 max-w-xl text-base font-medium text-zinc-700">Publiserte show, scener og billetter fra i dag og fremover.</p>
            </div>
            <div className="grid grid-cols-3 border-2 border-zinc-950 bg-[#fbf7ec] shadow-[6px_6px_0_rgba(24,24,27,0.14)]">
              <EventMetric value={shows.length.toString()} label="show" />
              <EventMetric value={cappedShows.length ? openTickets.toString() : 'åpent'} label="billetter" />
              <EventMetric value={venueCount.toString()} label="scener" />
            </div>
          </div>
        </div>
        <div className="overflow-hidden border-t-2 border-zinc-950 bg-[#b83224] text-white">
          <div className="flex py-3 text-[10px] font-black uppercase tracking-[0.34em]" style={{ animation: 'marquee 42s linear infinite' }}>
            {[0, 1].map((index) => (
              <span key={index} className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={index > 0}>
                <span>Program</span><span>·</span><span>Stand-up</span><span>·</span><span>Oslo</span><span>·</span><span>Billetter</span><span>·</span><span>humor.events</span><span>·</span>
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-zinc-950 pb-3">
          <h2 className="text-2xl font-black uppercase tracking-tight">Alle show</h2>
          <Link href="/artists" className="inline-flex items-center gap-1.5 text-sm font-bold hover:text-[#b83224]">Artister <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show, index) => <PublicEventCard key={show.id} show={show} priority={index < 3} />)}
        </div>
        {shows.length === 0 && (
          <div className="border-2 border-dashed border-zinc-950 bg-[#fbf7ec] p-10 text-center">
            <div className="mx-auto mb-4 grid h-24 max-w-sm grid-cols-3 gap-2 border-2 border-zinc-950 p-2">
              <div className="bg-zinc-950" />
              <div className="bg-[#b83224]" />
              <div className="bg-[#d8b56d]" />
            </div>
            <p className="font-medium text-zinc-600">Ingen publiserte kommende events.</p>
          </div>
        )}
      </section>
    </main>
  )
}

function EventMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r-2 border-zinc-950 px-4 py-4 last:border-r-0">
      <div className="text-3xl font-black leading-none tracking-[-0.05em]">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  )
}