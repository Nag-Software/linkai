import Link from 'next/link'

export function PublicHeader({ transparent, tone = 'dark' }: { transparent?: boolean; tone?: 'dark' | 'light' }) {
  const isLight = transparent && tone === 'light'

  return (
    <header className={transparent ? 'relative px-4 md:px-6 lg:px-8' : 'bg-zinc-950 px-4 md:px-6 lg:px-8'}>
      <div className="mx-auto flex max-w-6xl items-center justify-between py-4">
        <Link href="/" className={`text-xl font-bold tracking-tight ${isLight ? 'text-zinc-950' : 'text-white'}`}>
          humor.events
        </Link>
        <nav className={`flex items-center gap-5 text-sm ${isLight ? 'text-zinc-600' : 'text-white/55'}`}>
          <Link href="/events" className={`transition-colors ${isLight ? 'hover:text-zinc-950' : 'hover:text-white'}`}>Eventer</Link>
          <Link href="/artists" className={`transition-colors ${isLight ? 'hover:text-zinc-950' : 'hover:text-white'}`}>Komikere</Link>
        </nav>
      </div>
    </header>
  )
}
