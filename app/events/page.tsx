import Link from 'next/link'
import { ArrowLeft, CalendarDays, MapPin, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicEventCard } from '@/components/public/public-event-card'
import { getUpcomingPublishedShows, remainingTickets } from '@/lib/public-events'

export const metadata = {
  title: 'Events — LinkAI Live',
  description: 'Alle publiserte kommende LinkAI-show med plakater, pris og billetter.',
}

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const shows = await getUpcomingPublishedShows()
  const venueCount = new Set(shows.map((show) => show.venue_name ?? show.venue_address).filter(Boolean)).size
  const cappedShows = shows.filter((show) => show.capacity !== null)
  const openTickets = cappedShows.reduce((total, show) => total + (remainingTickets(show) ?? 0), 0)

  return (
    <main className="min-h-svh bg-background">
      <section className="relative overflow-hidden border-b bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#09090b_0%,#18181b_50%,#7f1d1d_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 lg:px-8">
          <Button asChild variant="ghost" className="mb-6 px-0 text-white hover:bg-white/10 hover:text-white"><Link href="/"><ArrowLeft className="size-4" /> Til forsiden</Link></Button>
          <div className="relative grid gap-8 md:grid-cols-[1fr_380px] md:items-end">
            <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold md:text-5xl">Kommende events</h1>
            <p className="mt-3 text-white/70">Kun publiserte show fra i dag og fremover vises her.</p>
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/15 bg-white/10 text-sm backdrop-blur">
              <EventMetric icon={<CalendarDays className="size-4" />} value={shows.length.toString()} label="show" />
              <EventMetric icon={<Ticket className="size-4" />} value={cappedShows.length ? openTickets.toString() : 'Åpent'} label="billetter" />
              <EventMetric icon={<MapPin className="size-4" />} value={venueCount.toString()} label="scener" />
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((show, index) => <PublicEventCard key={show.id} show={show} priority={index < 3} />)}
        </div>
        {shows.length === 0 && (
          <div className="overflow-hidden rounded-lg border border-dashed bg-[linear-gradient(135deg,#fafafa,#f4f4f5)] p-10 text-center">
            <div className="mx-auto mb-4 grid h-24 max-w-sm grid-cols-3 gap-2">
              <div className="rounded-md bg-zinc-950" />
              <div className="rounded-md bg-rose-800" />
              <div className="rounded-md bg-amber-500" />
            </div>
            <p className="text-muted-foreground">Ingen publiserte kommende events.</p>
          </div>
        )}
      </section>
    </main>
  )
}

function EventMetric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="border-r border-white/10 px-4 py-3 last:border-r-0">
      <div className="mb-3 text-white/65">{icon}</div>
      <div className="text-2xl font-semibold leading-none">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-white/55">{label}</div>
    </div>
  )
}