import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
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
  const availabilityText = soldOut ? 'Utsolgt' : 'Billetter tilgjengelig'
  const ticketWarning = soldOut
    ? 'Utsolgt'
    : fillPercent >= 80
      ? 'Få plasser igjen'
      : null

  return (
    <main className="min-h-screen bg-white text-black">
      <PublicHeader transparent tone="light" />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-8 md:pt-32">
        <Link href="/events" className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[#ff6bff]">
          <ArrowLeft className="size-4" /> Alle events
        </Link>

        <div className="grid gap-10 md:grid-cols-2 md:items-start">

          {/* LEFT — poster + lineup */}
          <div className="space-y-8 md:sticky md:top-24">

            {/* Poster */}
            <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
              {show.poster_url ? (
                <Image src={show.poster_url} alt={show.title} fill priority sizes="(max-width: 768px) 92vw, 50vw" className="object-contain" />
              ) : (
                <div className="flex h-full flex-col justify-between bg-black p-6 text-white">
                  <span className="text-xs font-medium uppercase tracking-widest text-[#ff6bff]">humor.events</span>
                  <strong className="text-5xl font-medium leading-none">{show.title}</strong>
                </div>
              )}
            </div>

            {/* Lineup */}
            <div>
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 className="text-base font-medium uppercase tracking-widest text-zinc-400">Lineup</h2>
                <span className="text-sm font-medium text-zinc-400">{lineup.length} artist{lineup.length === 1 ? '' : 'er'}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                {lineup.map((item) => (
                  <Link
                    key={item.spot.id}
                    href={item.artist ? `/artists/${item.artist.id}` : '#'}
                    className="group grid grid-cols-[56px_1fr] border-b border-black/10 transition hover:bg-zinc-50"
                  >
                    <div className="relative size-14 flex-shrink-0 bg-zinc-100">
                      {item.artist?.profile_image_url ? (
                        <Image
                          src={item.artist.profile_image_url}
                          alt={item.artist.stage_name ?? item.artist.full_name}
                          fill
                          sizes="56px"
                          unoptimized={shouldBypassImageOptimization(item.artist.profile_image_url)}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-black text-lg font-medium text-white">
                          {(item.artist?.stage_name ?? item.artist?.full_name ?? '?')[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 p-3">
                      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">{item.role?.role_name ?? 'Artist'}</div>
                      <h3 className="truncate font-medium transition-colors group-hover:text-[#ff6bff]">{item.artist?.stage_name ?? item.artist?.full_name ?? 'Artist'}</h3>
                    </div>
                  </Link>
                ))}
                {lineup.length === 0 && (
                  <p className="pt-2 text-sm font-medium text-zinc-400">Lineup annonseres snart.</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — title, info, buy, description */}
          <div className="flex flex-col gap-7">
            <div>
              {ticketWarning && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-medium uppercase tracking-widest ${soldOut ? 'bg-red-600 text-white' : 'bg-[#ff6bff] text-black'}`}>{ticketWarning}</span>
                </div>
              )}
              <h1 className="text-4xl font-medium leading-tight md:text-5xl lg:text-6xl">{show.title}</h1>
            </div>

            <div className="border-y border-black/10 divide-y divide-black/10">
              <Info label="Dato" text={formatShowDate(show.date)} />
              <Info label="Tid" text={formatShowTime(show)} />
              <Info label="Sted" text={showLocation ?? 'Sted kommer'} />
              <Info label="Kapasitet" text={availabilityText} tone={soldOut ? 'danger' : ticketWarning ? 'accent' : 'default'} />
            </div>

            <div>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400">Pris</div>
                  <div className="text-4xl font-medium leading-none">{formatTicketPrice(show)}</div>
                </div>
                {ticketWarning && <div className={`text-sm font-medium ${soldOut ? 'text-red-600' : 'text-[#ff6bff]'}`}>{ticketWarning}</div>}
              </div>

              {error === 'sold-out' && <p className="mb-3 text-sm font-medium text-red-600">Dette showet er utsolgt.</p>}
              {error === 'checkout' && <p className="mb-3 text-sm font-medium text-zinc-500">Checkout kunne ikke åpnes akkurat nå.</p>}
              <ToastActionForm action={startCheckoutAction}>
                <input type="hidden" name="show_id" value={show.id} />
                <input type="hidden" name="slug" value={show.slug} />
                <button
                  type="submit"
                  disabled={soldOut}
                  className="w-full border border-black bg-black px-10 py-4 text-sm font-medium text-white transition-colors hover:border-[#ff6bff] hover:bg-[#ff6bff] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {soldOut ? 'Utsolgt' : 'Kjøp billett'}
                </button>
              </ToastActionForm>
              <p className="mt-3 text-xs text-zinc-400">{show.ticket_url ? 'Du sendes videre til ekstern billettside.' : 'Betaling åpnes i sikker checkout.'}</p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-medium uppercase tracking-widest text-zinc-400">Om showet</h2>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-600">{show.description ?? 'Mer informasjon kommer snart.'}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function Info({ text, label, tone = 'default' }: { text: string; label?: string; tone?: 'default' | 'accent' | 'danger' }) {
  const valueClassName = tone === 'danger' ? 'text-red-600' : tone === 'accent' ? 'text-[#ff6bff]' : 'text-black'

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      {label && <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 shrink-0">{label}</span>}
      <span className={`text-base font-medium text-right ${valueClassName}`}>{text}</span>
    </div>
  )
}