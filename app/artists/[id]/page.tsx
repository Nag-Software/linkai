import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowUpRight, CalendarDays, Languages, MapPin, Mic2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { artistDisplayName, artistInitials, getPublicArtistById, getPublicArtistShows } from '@/lib/public-artists'
import { shouldBypassImageOptimization } from '@/lib/utils'
import { PublicHeader } from '@/components/public/public-header'
import { formatShortDate, formatShowTime } from '@/lib/public-events'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const artist = await getPublicArtistById(id)
  if (!artist) return { title: 'Artist ikke funnet — humor.events' }
  const name = artistDisplayName(artist)

  return {
    title: `${name} — humor.events`,
    description: artist.bio ?? `${name} i humor.events-lineupen.`,
    openGraph: {
      title: name,
      description: artist.bio ?? `${name} i humor.events-lineupen.`,
      images: artist.profile_image_url ? [{ url: artist.profile_image_url, alt: name }] : undefined,
    },
  }
}

export default async function ArtistDetailPage({ params }: Props) {
  const { id } = await params
  const artist = await getPublicArtistById(id)
  if (!artist) notFound()

  const shows = await getPublicArtistShows(artist.id)
  const name = artistDisplayName(artist)
  const socials = Object.entries(artist.social_links ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))

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
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 md:grid-cols-[340px_1fr] md:items-end md:px-6 md:pb-14 lg:px-8">
          <div className="relative aspect-[4/5] overflow-hidden border-2 border-zinc-950 bg-zinc-200 p-2 shadow-[10px_10px_0_rgba(24,24,27,0.18)]">
            {artist.profile_image_url ? (
              <Image src={artist.profile_image_url} alt={name} fill priority sizes="(max-width: 768px) 92vw, 340px" unoptimized={shouldBypassImageOptimization(artist.profile_image_url)} className="object-contain p-2 grayscale-[10%]" />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#b83224] text-6xl font-black text-white">
                {artistInitials(artist)}
              </div>
            )}
            <div className="absolute inset-x-2 bottom-2 border-t-2 border-zinc-950 bg-[#fbf7ec] p-3 text-zinc-950">
              <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-widest">
                <span>{artist.category ?? 'Artist'}</span>
                {artist.admin_score != null && <span>Score {artist.admin_score}</span>}
              </div>
            </div>
          </div>
          <div className="py-4">
            <Button asChild variant="ghost" className="mb-5 w-fit rounded-none px-0 font-bold hover:bg-transparent hover:text-[#b83224]"><Link href="/artists"><ArrowLeft className="size-4" /> Alle artister</Link></Button>
            <div className="mb-5 inline-flex w-fit border border-zinc-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">Artist</div>
            <h1 className="text-[clamp(3rem,8vw,7rem)] font-black uppercase leading-[0.82] tracking-[-0.04em]">{name}</h1>
            {artist.stage_name && <p className="mt-3 text-lg font-medium text-zinc-700">{artist.full_name}</p>}
            <div className="mt-7 grid border-y-2 border-zinc-950 sm:grid-cols-2">
              <Info icon={<Mic2 className="size-5" />} label="Kategori" text={artist.category ?? 'Artist'} />
              <Info icon={<Languages className="size-5" />} label="Språk" text={artist.language ?? 'Ikke satt'} />
              <Info icon={<Star className="size-5" />} label="Score" text={artist.admin_score != null ? `${artist.admin_score}/10` : 'Ikke satt'} />
              <Info icon={<CalendarDays className="size-5" />} label="Shows" text={shows.length.toString()} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_320px] md:px-6 lg:px-8">
        <div className="space-y-10">
          <div className="border-2 border-zinc-950 bg-[#fbf7ec] p-5 shadow-[6px_6px_0_rgba(24,24,27,0.12)]">
            <h2 className="text-2xl font-black uppercase tracking-tight">Om artisten</h2>
            <p className="mt-3 whitespace-pre-wrap text-zinc-700">{artist.bio ?? 'Mer informasjon kommer snart.'}</p>
          </div>

          <div>
            <h2 className="border-b-2 border-zinc-950 pb-3 text-2xl font-black uppercase tracking-tight">Kommende events</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {shows.map((show) => (
                <Link key={show.id} href={`/events/${show.slug}`} className="group border-2 border-zinc-950 bg-[#fbf7ec] shadow-[5px_5px_0_rgba(24,24,27,0.12)] transition hover:-translate-y-0.5">
                  <div className="relative aspect-[16/10] border-b-2 border-zinc-950 bg-[#111111]">
                    {show.poster_url ? (
                      <Image src={show.poster_url} alt={show.title} fill sizes="(max-width: 768px) 92vw, 45vw" className="object-contain grayscale-[10%] transition group-hover:grayscale-0" />
                    ) : (
                      <div className="flex h-full flex-col justify-between bg-[#b83224] p-4 text-white">
                        <span className="text-xs font-black uppercase tracking-widest">humor.events</span>
                        <strong className="text-2xl font-black uppercase leading-none">{show.title}</strong>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-black leading-tight tracking-tight">{show.title}</h3>
                      <ArrowUpRight className="size-4 shrink-0 text-zinc-500 transition group-hover:text-[#b83224]" />
                    </div>
                    <div className="mt-3 grid gap-1 text-sm font-medium text-zinc-600">
                      <span className="flex items-center gap-2"><CalendarDays className="size-4" />{formatShortDate(show.date)} · {formatShowTime(show)}</span>
                      <span className="flex items-center gap-2"><MapPin className="size-4" />{show.venue_name ?? 'Sted kommer'}</span>
                    </div>
                  </div>
                </Link>
              ))}
              {shows.length === 0 && <div className="border-2 border-dashed border-zinc-950 bg-[#fbf7ec] p-6 text-sm font-medium text-zinc-600">Ingen publiserte kommende events.</div>}
            </div>
          </div>
        </div>

        <aside className="h-fit border-2 border-zinc-950 bg-[#fbf7ec] p-5 shadow-[6px_6px_0_rgba(24,24,27,0.12)] md:sticky md:top-6">
          <h2 className="font-black uppercase tracking-tight">Profil</h2>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(artist.admin_tags ?? []).map((tag) => <span key={tag} className="border border-zinc-950/30 px-2 py-1 text-xs font-medium text-zinc-600">{tag}</span>)}
          </div>
          {socials.length > 0 && (
            <div className="mt-6 space-y-2">
              {socials.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between border-2 border-zinc-950 px-3 py-2 text-sm font-bold transition hover:bg-zinc-950 hover:text-white">
                  <span className="capitalize">{label}</span>
                  <ArrowUpRight className="size-4" />
                </a>
              ))}
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}

function Info({ icon, text, label }: { icon: React.ReactNode; text: string; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-zinc-950 p-3 text-sm last:border-b-0 sm:border-r-2 sm:even:border-r-0">
      <span className="text-zinc-500">{icon}</span>
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
        <span className="font-bold text-zinc-800">{text}</span>
      </span>
    </div>
  )
}
