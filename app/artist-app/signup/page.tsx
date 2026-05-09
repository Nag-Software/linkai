import { SignupForm } from '@/components/signup-form'

export const metadata = { title: 'Registrer artistprofil — LinkAI' }

export default async function ArtistSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>
}) {
  const { status, error } = await searchParams

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-xl">
        <SignupForm
          action="/signup/submit"
          successMessage={status === 'submitted' ? 'Profilen er sendt til vurdering.' : undefined}
          errorMessage={error === 'failed' ? 'Kunne ikke opprette profilen. Prøv igjen.' : undefined}
        />
      </div>
    </div>
  )
}