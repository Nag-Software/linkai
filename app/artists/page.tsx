import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { formatArtistRoleSummary } from '@/lib/artist-roles'
import { artistDisplayName, artistInitials, getPublicArtists } from '@/lib/public-artists'
import { shouldBypassImageOptimization } from '@/lib/utils'
import { PublicHeader } from '@/components/public/public-header'

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
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold underline decoration-2 underline-offset-4 hover:text-[#b83224]"><ArrowLeft className="size-4" /> Forsiden</Link>
          <div className="grid gap-8 md:grid-cols-[1fr_420px] md:items-end">
            <div>
              <div className="mb-5 inline-flex border border-zinc-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">Lineup</div>
              <h1 className="max-w-3xl text-[clamp(3rem,8vw,6.8rem)] font-black uppercase leading-[0.82] tracking-[-0.04em]">Våre Komikere</h1>
            </div>
            <div className="grid grid-cols-3 border-2 border-zinc-950 bg-[#fbf7ec] shadow-[6px_6px_0_rgba(24,24,27,0.14)]">
              <Metric value={artists.length.toString()} label="godkjente" />
              <Metric value={highEnergy.toString()} label="høy energi" />
              <Metric value={languages.toString()} label="språk" />
            </div>
          </div>
        </div>
        <div className="overflow-hidden border-t-2 border-zinc-950 bg-[#b83224] text-white">
          <div className="flex py-3 text-[10px] font-black uppercase tracking-[0.34em]" style={{ animation: 'marquee 42s linear infinite' }}>
            {[0, 1].map((index) => (
              <span key={index} className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={index > 0}>
                <span>Komikere</span><span>·</span><span>Lineup</span><span>·</span><span>Scene</span><span>·</span><span>Oslo</span><span>·</span><span>humor.events</span><span>·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-zinc-950 pb-3">
          <h2 className="text-2xl font-black uppercase tracking-tight">Alle artister</h2>
          <Link href="/events" className="inline-flex items-center gap-1.5 text-sm font-bold hover:text-[#b83224]">Events <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link key={artist.id} href={`/artists/${artist.id}`} className="group border-2 border-zinc-950 bg-[#fbf7ec] shadow-[6px_6px_0_rgba(24,24,27,0.14)] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(24,24,27,0.22)]">
              <div className="relative aspect-[4/3] border-b-2 border-zinc-950 bg-zinc-200">
                {artist.profile_image_url ? (
                  <Image src={artist.profile_image_url} alt={artistDisplayName(artist)} fill sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 31vw" unoptimized={shouldBypassImageOptimization(artist.profile_image_url)} className="object-contain p-2 grayscale-[10%] transition group-hover:grayscale-0" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#b83224] text-5xl font-black text-white">
                    {artistInitials(artist)}
                  </div>
                )}
              </div>
              <div className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{formatArtistRoleSummary(artist.category, 'Komiker')}{artist.admin_score != null ? ` · score ${artist.admin_score}` : ''}</p>
                    <h2 className="text-xl font-black leading-tight tracking-tight">{artistDisplayName(artist)}</h2>
                    {artist.stage_name && <p className="text-sm font-medium text-zinc-600">{artist.full_name}</p>}
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-zinc-500 transition group-hover:text-[#b83224]" />
                </div>
                {artist.bio && <p className="line-clamp-3 text-sm text-zinc-600">{artist.bio}</p>}
              </div>
            </Link>
          ))}
        </div>
        {artists.length === 0 && (
          <div className="border-2 border-dashed border-zinc-950 bg-[#fbf7ec] p-10 text-center text-sm font-medium text-zinc-600">Ingen godkjente artister ennå.</div>
        )}
      </section>
    </main>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r-2 border-zinc-950 px-4 py-4 last:border-r-0">
      <div className="text-3xl font-black leading-none tracking-[-0.05em]">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  )
}
