import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, BadgeCheck, Languages, Mic2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { artistDisplayName, artistInitials, getPublicArtists } from '@/lib/public-artists'

export const metadata = {
  title: 'Artister — humor.events',
  description: 'Se godkjente komikere og artister i humor.events-lineupen.',
}

export const dynamic = 'force-dynamic'

export default async function ArtistsPage() {
  const artists = await getPublicArtists()
  const highEnergy = artists.filter((artist) => artist.admin_energy_level === 'high').length
  const languages = new Set(artists.map((artist) => artist.language).filter(Boolean)).size

  return (
    <main className="min-h-svh bg-background">
      <section className="relative overflow-hidden border-b bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#09090b_0%,#18181b_48%,#7f1d1d_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:px-6 lg:px-8">
          <Button asChild variant="ghost" className="mb-6 px-0 text-white hover:bg-white/10 hover:text-white"><Link href="/"><ArrowLeft className="size-4" /> Forsiden</Link></Button>
          <div className="grid gap-8 md:grid-cols-[1fr_390px] md:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/75 ring-1 ring-white/15"><Mic2 className="size-4" /> humor.events lineup</div>
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">Komikere og artister</h1>
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/15 bg-white/10 text-sm backdrop-blur">
              <Metric icon={<BadgeCheck className="size-4" />} value={artists.length.toString()} label="godkjente" />
              <Metric icon={<Sparkles className="size-4" />} value={highEnergy.toString()} label="høy energi" />
              <Metric icon={<Languages className="size-4" />} value={languages.toString()} label="språk" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link key={artist.id} href={`/artists/${artist.id}`} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] bg-zinc-950 text-white">
                {artist.profile_image_url ? (
                  <Image src={artist.profile_image_url} alt={artistDisplayName(artist)} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#111827_0%,#be123c_58%,#f59e0b_118%)] text-5xl font-semibold">
                    {artistInitials(artist)}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-950">{artist.category ?? 'Artist'}</span>
                    {artist.admin_score != null && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">Score {artist.admin_score}</span>}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">{artistDisplayName(artist)}</h2>
                    {artist.stage_name && <p className="text-sm text-muted-foreground">{artist.full_name}</p>}
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                </div>
                {artist.bio && <p className="line-clamp-3 text-sm text-muted-foreground">{artist.bio}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {(artist.admin_tags ?? []).slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{tag}</span>)}
                </div>
              </div>
            </Link>
          ))}
        </div>
        {artists.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Ingen godkjente artister ennå.</div>
        )}
      </section>
    </main>
  )
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="border-r border-white/10 px-4 py-3 last:border-r-0">
      <div className="mb-3 text-white/65">{icon}</div>
      <div className="text-2xl font-semibold leading-none">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-white/55">{label}</div>
    </div>
  )
}
