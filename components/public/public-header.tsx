import Link from 'next/link'

export function PublicHeader({ transparent }: { transparent?: boolean }) {
  return (
    <header className={transparent ? 'relative px-4 md:px-6 lg:px-8' : 'bg-zinc-950 px-4 md:px-6 lg:px-8'}>
      <div className="mx-auto flex max-w-6xl items-center justify-between py-4">
        <Link href="/" className={`text-xl font-bold tracking-tight ${transparent ? 'text-white' : 'text-white'}`}>
          humor.events
        </Link>
        <nav className={`flex items-center gap-5 text-sm ${transparent ? 'text-white/60' : 'text-white/55'}`}>
          <Link href="/events" className="transition-colors hover:text-white">Events</Link>
          <Link href="/artists" className="transition-colors hover:text-white">Artister</Link>
        </nav>
      </div>
    </header>
  )
}
