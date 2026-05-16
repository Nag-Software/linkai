import Link from 'next/link'

export function PublicHeader({ transparent, tone = 'dark' }: { transparent?: boolean; tone?: 'dark' | 'light' }) {
  void transparent
  void tone
  return (
    <nav className="fixed top-8 left-4 md:left-8 z-[2000] flex items-center gap-0 animate-fade-in" style={{ animationFillMode: 'both' }}>
      {/* Logo */}
      <Link href="/" className="flex items-stretch h-[34px] border border-black flex-shrink-0 group">
        <div className="w-[34px] bg-black flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" className="w-[15px] h-[15px] text-white">
            <g id="smiley-smirk">
              <path
                id="Subtract"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.5"
                fillRule="evenodd"
                d="M1.83645 1.83645C3.06046 0.612432 4.82797 0 7 0s3.9395 0.612432 5.1636 1.83645C13.3876 3.06046 14 4.82797 14 7s-0.6124 3.9395-1.8364 5.1636C10.9395 13.3876 9.17203 14 7 14s-3.93954-0.6124-5.16355-1.8364C0.612432 10.9395 0 9.17203 0 7s0.612432-3.93954 1.83645-5.16355ZM5.0769 4.98816c0-0.34518-0.27982-0.625-0.625-0.625-0.34517 0-0.625 0.27982-0.625 0.625v0.7c0 0.34518 0.27983 0.625 0.625 0.625 0.34518 0 0.625-0.27982 0.625-0.625v-0.7Zm5.0962 0c0-0.34518-0.27983-0.625-0.625-0.625-0.34518 0-0.625 0.27982-0.625 0.625v0.7c0 0.34518 0.27982 0.625 0.625 0.625 0.34517 0 0.625-0.27982 0.625-0.625v-0.7Zm0.1787 2.42929c0.3217 0.12505 0.4812 0.48724 0.3561 0.80897-0.2805 0.72182-0.75537 1.29603-1.40641 1.68306-0.64416 0.38292-1.4264 0.56282-2.30149 0.56282-0.34518 0-0.625-0.2798-0.625-0.62501 0-0.34518 0.27982-0.625 0.625-0.625 0.7083 0 1.25628-0.14564 1.66273-0.38728 0.39956-0.23753 0.69571-0.58697 0.88012-1.06143 0.12505-0.32173 0.48725-0.48117 0.80895-0.35613Z"
                clipRule="evenodd"
              />
            </g>
          </svg>
        </div>
        <div className="pr-2 bg-black flex items-center border-l border-black/15 transition-colors">
          <span className="text-[12px] font-semibold tracking-[0.08em] text-white transition-colors">humor.events</span>
        </div>
      </Link>]
      <Link
        href="/events"
        className="relative overflow-hidden bg-white text-black h-[34px] px-3 flex items-center text-[11px] font-medium uppercase border-l-0 border border-black leading-none group"
      >
        <span className="relative z-10">EVENTER</span>
        <span className="absolute inset-0 bg-[#FA76FF] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
      </Link>
      <Link
        href="/artists"
        className="relative overflow-hidden bg-white text-black h-[34px] px-3 flex items-center text-[11px] font-medium uppercase border-l-0 border border-black leading-none group"
      >
        <span className="relative z-10">KOMIKERE</span>
        <span className="absolute inset-0 bg-[#FA76FF] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
      </Link>
      <Link
        href="/artist-app/login"
        className="relative overflow-hidden bg-white text-black h-[34px] px-3 flex items-center text-[11px] font-medium uppercase border-l-0 border border-black leading-none group"
      >
        <span className="relative z-10">PORTAL</span>
        <span className="absolute inset-0 bg-[#FA76FF] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
      </Link>
    </nav>
  )
}
