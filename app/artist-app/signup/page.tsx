import { PublicHeader } from '@/components/public/public-header'
import { ArtistSignupForm } from '@/components/artist/artist-signup-form'

export const metadata = { title: 'Registrer artistprofil — humor.events' }

export default async function ArtistSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>
}) {
  const { status, error } = await searchParams

  return (
    <main className="min-h-svh bg-[#f3ead9] text-zinc-950">
      <section className="relative isolate overflow-hidden border-b-2 border-zinc-950 bg-[#f3ead9] text-zinc-950">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
          }}
        />

        <PublicHeader transparent tone="light" />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 md:px-6 md:pb-10 md:pt-10 lg:px-8">
          <div className="mb-5 inline-flex border border-zinc-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">
            Portal / humor.events
          </div>
          <h1 className="max-w-[760px] text-[clamp(2.75rem,6.8vw,5.6rem)] font-black uppercase leading-[0.82] tracking-[-0.035em]">
            Registrer komikerprofil
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium text-zinc-700 md:text-base">
            Send inn profil, video og kontaktinfo så bookingteamet kan vurdere deg til kommende kvelder hos humor.events.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        <ArtistSignupForm
          action="/artist-app/signup/submit"
          successMessage={status === 'submitted' ? 'Profilen er sendt til vurdering.' : undefined}
          errorMessage={
            error === 'email_exists'
              ? 'E-postadressen er allerede registrert. Prøv å logge inn.'
              : error === 'invalid_password'
                ? 'Passordet må være minst 8 tegn.'
                : error === 'invalid_email'
                  ? 'Ugyldig e-postadresse.'
                  : error === 'invalid_youtube'
                    ? 'Legg inn en gyldig lenke til en YouTube-video.'
                    : error === 'missing'
                      ? 'Fyll ut alle obligatoriske felt før du sender inn.'
                      : error === 'unconfirmed'
                        ? 'Kontoen er ikke aktiv ennå. Registrer artistprofil på nytt eller kontakt oss.'
                        : error === 'failed'
                          ? 'Kunne ikke opprette profilen. Prøv igjen.'
                          : undefined
          }
        />
      </section>
    </main>
  )
}