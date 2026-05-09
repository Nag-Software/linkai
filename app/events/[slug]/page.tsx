import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, CalendarDays, Clock, MapPin, Ticket, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToastActionForm } from '@/components/toast-action-form'
import { startCheckoutAction } from '../actions'
import { formatShowDate, formatShowTime, formatTicketPrice, getPublicLineup, getPublishedShowBySlug, remainingTickets, ticketFillPercent } from '@/lib/public-events'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const show = await getPublishedShowBySlug(slug)
  if (!show) return { title: 'Event ikke funnet — LinkAI Live' }
  const description = show.description ?? `${show.title} på ${show.venue_name ?? show.venue_address ?? 'LinkAI Live'} ${formatShowDate(show.date)}.`
  const canonical = `/events/${show.slug}`

  return {
    title: `${show.title} — LinkAI Live`,
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

  return (
    <main className="min-h-svh bg-background">
      <section className="relative overflow-hidden border-b bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(125deg,#09090b_0%,#18181b_48%,#7f1d1d_88%,#f59e0b_135%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[430px_1fr] md:px-6 lg:px-8">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-900 shadow-2xl">
            {show.poster_url ? (
              <Image src={show.poster_url} alt={show.title} fill priority className="object-cover" />
            ) : (
              <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,#111827_0%,#be123c_58%,#f59e0b_118%)] p-6">
                <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wide">LinkAI Live</span>
                <strong className="text-5xl leading-none">{show.title}</strong>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16">
              <div className="flex items-center justify-between text-sm">
                <span>{formatTicketPrice(show)}</span>
                <span>{soldOut ? 'Utsolgt' : remaining !== null ? `${remaining} igjen` : 'Billetter'}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${fillPercent}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center py-4">
            <Button asChild variant="ghost" className="mb-5 w-fit px-0 text-white hover:bg-white/10 hover:text-white"><Link href="/events"><ArrowLeft className="size-4" /> Alle events</Link></Button>
            <h1 className="text-5xl font-semibold leading-none md:text-6xl">{show.title}</h1>
            <div className="mt-7 grid gap-3 text-white/78 sm:grid-cols-2">
              <Info icon={<CalendarDays className="size-5" />} label="Dato" text={formatShowDate(show.date)} />
              <Info icon={<Clock className="size-5" />} label="Tid" text={formatShowTime(show)} />
              <Info icon={<MapPin className="size-5" />} text={showLocation ?? 'Sted kommer'} />
              <Info icon={<Ticket className="size-5" />} text={`${formatTicketPrice(show)}${remaining !== null ? ` · ${remaining} billetter igjen` : ''}`} />
              <Info icon={<Users className="size-5" />} text={`${lineup.length} artister i lineup`} />
            </div>
            {error === 'sold-out' && <div className="mt-6 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-950">Dette showet er utsolgt.</div>}
            {error === 'checkout' && <div className="mt-6 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-950">Checkout kunne ikke åpnes akkurat nå.</div>}
            <ToastActionForm action={startCheckoutAction} className="mt-8">
              <input type="hidden" name="show_id" value={show.id} />
              <input type="hidden" name="slug" value={show.slug} />
              <Button type="submit" size="lg" disabled={soldOut} className="bg-white text-zinc-950 hover:bg-white/85">{soldOut ? 'Dette showet er utsolgt' : 'Kjøp billett'}</Button>
            </ToastActionForm>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_340px] md:px-6 lg:px-8">
        <div className="space-y-10">
          <div>
            <h2 className="text-2xl font-semibold">Om showet</h2>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{show.description ?? 'Mer informasjon kommer snart.'}</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Lineup</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {lineup.map((item) => (
                <Link key={item.spot.id} href={item.artist ? `/artists/${item.artist.id}` : '#'} className="group flex gap-4 rounded-lg border bg-card p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.artist?.profile_image_url ? <Image src={item.artist.profile_image_url} alt={item.artist.stage_name ?? item.artist.full_name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{item.role?.role_name ?? 'Artist'}</div>
                    <h3 className="font-semibold underline-offset-4 group-hover:underline">{item.artist?.stage_name ?? item.artist?.full_name ?? 'Artist'}</h3>
                    {item.artist?.bio && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.artist.bio}</p>}
                  </div>
                </Link>
              ))}
              {lineup.length === 0 && <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Lineup annonseres snart.</div>}
            </div>
          </div>
        </div>
        <aside className="h-fit rounded-lg border bg-card p-5 shadow-sm md:sticky md:top-6">
          <div className="text-sm text-muted-foreground">Pris</div>
          <div className="mt-1 text-3xl font-semibold">{formatTicketPrice(show)}</div>
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Kapasitet</span>
              <span>{show.capacity ? `${show.soldTickets}/${show.capacity}` : 'Åpent'}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#18181b,#be123c,#f59e0b)]" style={{ width: `${fillPercent}%` }} />
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div>{formatShowDate(show.date)}</div>
            <div>{formatShowTime(show)}</div>
            <div>{showLocation ?? 'Sted kommer'}</div>
          </div>
          <ToastActionForm action={startCheckoutAction} className="mt-6">
            <input type="hidden" name="show_id" value={show.id} />
            <input type="hidden" name="slug" value={show.slug} />
            <Button type="submit" className="w-full" disabled={soldOut}>{soldOut ? 'Utsolgt' : 'Kjøp billett'}</Button>
          </ToastActionForm>
        </aside>
      </section>
    </main>
  )
}

function Info({ icon, text, label }: { icon: React.ReactNode; text: string; label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-3 text-sm backdrop-blur">
      <span className="text-white/70">{icon}</span>
      <span>
        {label && <span className="block text-xs uppercase tracking-wide text-white/45">{label}</span>}
        <span className="text-white/88">{text}</span>
      </span>
    </div>
  )
}