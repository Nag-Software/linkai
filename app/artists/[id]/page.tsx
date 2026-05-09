import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowUpRight, CalendarDays, Languages, MapPin, Mic2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { artistDisplayName, artistInitials, getPublicArtistById, getPublicArtistShows } from '@/lib/public-artists'
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
    <main className="min-h-svh bg-background">
      <PublicHeader />
      <section className="relative overflow-hidden border-b bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(125deg,#09090b_0%,#18181b_48%,#7f1d1d_88%,#f59e0b_135%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[380px_1fr] md:items-end md:px-6 lg:px-8">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-900 shadow-2xl">
            {artist.profile_image_url ? (
              <Image src={artist.profile_image_url} alt={name} fill priority className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#111827_0%,#be123c_58%,#f59e0b_118%)] text-6xl font-semibold">
                {artistInitials(artist)}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16">
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full bg-white px-3 py-1 text-zinc-950">{artist.category ?? 'Artist'}</span>
                {artist.admin_score != null && <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">Score {artist.admin_score}</span>}
              </div>
            </div>
          </div>
          <div className="py-4">
            <Button asChild variant="ghost" className="mb-5 w-fit px-0 text-white hover:bg-white/10 hover:text-white"><Link href="/artists"><ArrowLeft className="size-4" /> Alle artister</Link></Button>
            <h1 className="text-5xl font-semibold leading-none md:text-7xl">{name}</h1>
            {artist.stage_name && <p className="mt-3 text-lg text-white/65">{artist.full_name}</p>}
            <div className="mt-7 grid gap-3 text-white/78 sm:grid-cols-2">
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
          <div>
            <h2 className="text-2xl font-semibold">Om artisten</h2>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{artist.bio ?? 'Mer informasjon kommer snart.'}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">Kommende events</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {shows.map((show) => (
                <Link key={show.id} href={`/events/${show.slug}`} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[16/10] bg-zinc-950 text-white">
                    {show.poster_url ? (
                      <Image src={show.poster_url} alt={show.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,#111827_0%,#be123c_58%,#f59e0b_118%)] p-4">
                        <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wide">humor.events</span>
                        <strong className="text-2xl leading-none">{show.title}</strong>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-16">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-950">{show.role_name ?? 'Lineup'}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold leading-tight">{show.title}</h3>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                    </div>
                    <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2"><CalendarDays className="size-4" />{formatShortDate(show.date)} · {formatShowTime(show)}</span>
                      <span className="flex items-center gap-2"><MapPin className="size-4" />{show.venue_name ?? 'Sted kommer'}</span>
                    </div>
                  </div>
                </Link>
              ))}
              {shows.length === 0 && <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Ingen publiserte kommende events.</div>}
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-lg border bg-card p-5 shadow-sm md:sticky md:top-6">
          <h2 className="font-semibold">Profil</h2>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(artist.admin_tags ?? []).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{tag}</span>)}
          </div>
          {socials.length > 0 && (
            <div className="mt-6 space-y-2">
              {socials.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-muted">
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
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-3 text-sm backdrop-blur">
      <span className="text-white/70">{icon}</span>
      <span>
        <span className="block text-xs uppercase tracking-wide text-white/45">{label}</span>
        <span className="text-white/88">{text}</span>
      </span>
    </div>
  )
}
