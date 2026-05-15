import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, CalendarDays, Clock, MapPin, Ticket, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToastActionForm } from '@/components/toast-action-form'
import { startCheckoutAction } from '../actions'
import { formatShowDate, formatShowTime, formatTicketPrice, getPublicLineup, getPublishedShowBySlug, remainingTickets, ticketFillPercent } from '@/lib/public-events'
import { shouldBypassImageOptimization } from '@/lib/utils'
import { PublicHeader } from '@/components/public/public-header'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const show = await getPublishedShowBySlug(slug)
  if (!show) return { title: 'Event ikke funnet — humor.events' }
  const description = show.description ?? `${show.title} på ${show.venue_name ?? show.venue_address ?? 'humor.events'} ${formatShowDate(show.date)}.`
  const canonical = `/events/${show.slug}`

  return {
    title: `${show.title} — humor.events`,
    description,
    alternates: { canonical },
    openGraph: {
      title: show.title,
      description,
      type: 'website',
      url: canonical,
      images: show.poster_url ? [{ url: show.poster_url, alt: show.title }] : undefined,
    },
    other: {
      'event:start_time': show.date,
    },
  }
}

export default async function EventDetailPage({ params, searchParams }: Props) {
  const [{ slug }, { error }] = await Promise.all([params, searchParams])
  const show = await getPublishedShowBySlug(slug)
  if (!show) notFound()

  const lineup = await getPublicLineup(show.id)
  const remaining = remainingTickets(show)
  const soldOut = remaining === 0
  const fillPercent = ticketFillPercent(show)
  const showLocation = show.venue_name ?? show.venue_address
  const ticketWarning = soldOut
    ? 'Utsolgt'
    : fillPercent >= 80
      ? 'Få plasser igjen'
      : fillPercent >= 50
        ? 'Over halvparten solgt'
        : null

  return (
    <main className="min-h-svh bg-[#f3ead9] text-zinc-950">
      <PublicHeader transparent tone="light" />
        <section className="relative overflow-hidden border-b-2 border-zinc-950 bg-[#f3ead9]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 md:grid-cols-[360px_1fr] md:items-end md:px-6 md:pb-14 lg:px-8">
          <div className="border-2 border-zinc-950 shadow-[10px_10px_0_rgba(24,24,27,0.18)]">
            <div className="relative aspect-[3/4] bg-zinc-200">
            {show.poster_url ? (
              <Image src={show.poster_url} alt={show.title} fill priority sizes="(max-width: 768px) 92vw, 360px" className="object-contain grayscale-[10%]" />
            ) : (
              <div className="flex h-full flex-col justify-between bg-[#b83224] p-6 text-white">
                <span className="text-xs font-black uppercase tracking-widest">humor.events</span>
                <strong className="text-5xl font-black uppercase leading-none">{show.title}</strong>
              </div>
            )}
            </div>
            <div className="border-t-2 border-zinc-950 bg-[#fbf7ec] p-3 text-zinc-950">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                <span>{formatTicketPrice(show)}</span>
                <span>{ticketWarning ?? 'Billetter'}</span>
              </div>
              {ticketWarning && <div className="mt-2 text-xs font-bold uppercase tracking-widest text-[#b83224]">{ticketWarning}</div>}
            </div>
          </div>
          <div className="flex flex-col justify-center py-4">
            <Button asChild variant="ghost" className="mb-5 w-fit rounded-none px-0 font-bold hover:bg-transparent hover:text-[#b83224]"><Link href="/events"><ArrowLeft className="size-4" /> Alle events</Link></Button>
            <h1 className="text-[clamp(3rem,7vw,6.4rem)] font-black uppercase leading-[0.82] tracking-[-0.04em]">{show.title}</h1>
            <div className="mt-7 grid border-y-2 border-zinc-950 sm:grid-cols-2">
              <Info icon={<CalendarDays className="size-5" />} label="Dato" text={formatShowDate(show.date)} />
              <Info icon={<Clock className="size-5" />} label="Tid" text={formatShowTime(show)} />
              <Info icon={<MapPin className="size-5" />} text={showLocation ?? 'Sted kommer'} />
              <Info icon={<Ticket className="size-5" />} text={`${formatTicketPrice(show)}`} />
            </div>
            {error === 'sold-out' && <div className="mt-6 border-2 border-zinc-950 bg-[#fbf7ec] px-4 py-3 text-sm font-bold">Dette showet er utsolgt.</div>}
            {error === 'checkout' && <div className="mt-6 border-2 border-zinc-950 bg-[#fbf7ec] px-4 py-3 text-sm font-bold">Checkout kunne ikke åpnes akkurat nå.</div>}
            <ToastActionForm action={startCheckoutAction} className="mt-8">
              <input type="hidden" name="show_id" value={show.id} />
              <input type="hidden" name="slug" value={show.slug} />
              <Button type="submit" size="lg" disabled={soldOut} className="rounded-none border-2 border-zinc-950 bg-[#b83224] font-bold text-white shadow-[4px_4px_0_#18181b] hover:bg-[#9f2d21]">{soldOut ? 'Dette showet er utsolgt' : 'Kjøp billett'}</Button>
            </ToastActionForm>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_340px] md:px-6 lg:px-8">
        <div className="space-y-10">
          <div className="border-2 border-zinc-950 bg-[#fbf7ec] p-5 shadow-[6px_6px_0_rgba(24,24,27,0.12)]">
            <h2 className="text-2xl font-black uppercase tracking-tight">Om showet</h2>
            <p className="mt-3 whitespace-pre-wrap text-zinc-700">{show.description ?? 'Mer informasjon kommer snart.'}</p>
          </div>
          <div>
            <h2 className="border-b-2 border-zinc-950 pb-3 text-2xl font-black uppercase tracking-tight">Lineup</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {lineup.map((item) => (
                <Link key={item.spot.id} href={item.artist ? `/artists/${item.artist.id}` : '#'} className="group grid grid-cols-[80px_1fr] border-2 border-zinc-950 bg-[#fbf7ec] shadow-[5px_5px_0_rgba(24,24,27,0.12)] transition hover:-translate-y-0.5">
                  <div className="relative size-20 border-r-2 border-zinc-950 bg-zinc-200">
                    {item.artist?.profile_image_url ? <Image src={item.artist.profile_image_url} alt={item.artist.stage_name ?? item.artist.full_name} fill sizes="80px" unoptimized={shouldBypassImageOptimization(item.artist.profile_image_url)} className="object-contain p-1 grayscale-[10%] transition group-hover:grayscale-0" /> : null}
                  </div>
                  <div className="min-w-0 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{item.role?.role_name ?? 'Artist'}</div>
                    <h3 className="truncate font-black tracking-tight group-hover:text-[#b83224]">{item.artist?.stage_name ?? item.artist?.full_name ?? 'Artist'}</h3>
                    {item.artist?.bio && <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{item.artist.bio}</p>}
                  </div>
                </Link>
              ))}
              {lineup.length === 0 && <div className="border-2 border-dashed border-zinc-950 bg-[#fbf7ec] p-6 text-sm font-medium text-zinc-600">Lineup annonseres snart.</div>}
            </div>
          </div>
        </div>
        <aside className="h-fit border-2 border-zinc-950 bg-[#fbf7ec] p-5 shadow-[6px_6px_0_rgba(24,24,27,0.12)] md:sticky md:top-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pris</div>
          <div className="mt-1 text-4xl font-black tracking-[-0.05em]">{formatTicketPrice(show)}</div>
          {ticketWarning && <div className="mt-4 border-2 border-zinc-950 bg-[#f3ead9] px-3 py-2 text-sm font-black uppercase tracking-widest text-[#b83224]">{ticketWarning}</div>}
          <div className="mt-5 space-y-2 border-y-2 border-zinc-950 py-4 text-sm font-medium text-zinc-700">
            <div>{formatShowDate(show.date)}</div>
            <div>{formatShowTime(show)}</div>
            <div>{showLocation ?? 'Sted kommer'}</div>
          </div>
          <ToastActionForm action={startCheckoutAction} className="mt-6">
            <input type="hidden" name="show_id" value={show.id} />
            <input type="hidden" name="slug" value={show.slug} />
            <Button type="submit" className="w-full rounded-none border-2 border-zinc-950 bg-[#b83224] font-bold text-white hover:bg-[#9f2d21]" disabled={soldOut}>{soldOut ? 'Utsolgt' : 'Kjøp billett'}</Button>
          </ToastActionForm>
        </aside>
      </section>
    </main>
  )
}

function Info({ icon, text, label }: { icon: React.ReactNode; text: string; label?: string }) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-zinc-950 p-3 text-sm last:border-b-0 sm:border-r-2 sm:even:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="text-zinc-500">{icon}</span>
      <span>
        {label && <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>}
        <span className="font-bold text-zinc-800">{text}</span>
      </span>
    </div>
  )
}