import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, MapPin, Ticket, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PublicShow } from '@/lib/public-events'
import { formatShortDate, formatShowTime, formatTicketPrice, remainingTickets, ticketFillPercent } from '@/lib/public-events'
import { startCheckoutAction } from '@/app/events/actions'

export function PublicEventCard({ show, priority = false }: { show: PublicShow; priority?: boolean }) {
  const remaining = remainingTickets(show)
  const soldOut = remaining === 0
  const fillPercent = ticketFillPercent(show)
  const [day, month] = formatShortDate(show.date).split(' ')
  const showLocation = show.venue_name ?? show.venue_address

  return (
    <article className="group overflow-hidden rounded-lg border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/events/${show.slug}`} className="group block">
        <div className="relative aspect-[4/5] bg-zinc-950 text-white">
          {show.poster_url ? (
            <Image src={show.poster_url} alt={show.title} fill priority={priority} className="object-fit transition-transform duration-500 group-hover:scale-101" />
          ) : (
            <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,#111827_0%,#be123c_58%,#f59e0b_118%)] p-5">
              <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wide">humor.events</span>
              <strong className="max-w-[13rem] text-3xl leading-none">{show.title}</strong>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute left-3 top-3 rounded-md bg-background/95 px-3 py-2 text-center text-foreground shadow-sm">
            <div className="text-lg font-bold leading-none">{day}</div>
            <div className="text-xs uppercase text-muted-foreground">{month}</div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs font-medium">
            <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{formatTicketPrice(show)}</span>
            <span className="rounded-full bg-white px-3 py-1 text-zinc-950">{soldOut ? 'Utsolgt' : remaining !== null ? `${remaining} igjen` : 'Billetter'}</span>
          </div>
        </div>
      </Link>
      <div className="grid gap-4 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{formatShowTime(show)}</span>
            <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-foreground" />
          </div>
          <h3 className="min-h-12 text-lg font-semibold leading-tight">{show.title}</h3>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><CalendarDays className="size-4" />{formatShortDate(show.date)}</span>
            <span className="flex items-center gap-2"><MapPin className="size-4" />{showLocation ?? 'Sted kommer'}</span>
            <span className="flex items-center gap-2"><Ticket className="size-4" />{formatTicketPrice(show)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="size-3.5" /> Kapasitet</span>
            <span>{show.capacity ? `${show.soldTickets}/${show.capacity}` : 'Åpent'}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#18181b,#be123c,#f59e0b)]" style={{ width: `${fillPercent}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline"><Link href={`/events/${show.slug}`}>Les mer <ArrowUpRight className="size-4" /></Link></Button>
          <form action={startCheckoutAction}>
            <input type="hidden" name="show_id" value={show.id} />
            <input type="hidden" name="slug" value={show.slug} />
            <Button type="submit" className="w-full" disabled={soldOut}>{soldOut ? 'Utsolgt' : 'Kjøp billett'}</Button>
          </form>
        </div>
      </div>
    </article>
  )
}