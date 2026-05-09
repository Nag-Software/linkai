import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { createClient } from '@/lib/supabase/server'

export default async function ArtistLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(next || '/')

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          title="Artistportal"
          description="Logg inn med artistkonto"
          action="/login/submit"
          errorMessage={error === 'invalid' ? 'Feil e-post eller passord.' : undefined}
          nextPath={next}
        />
      </div>
    </div>
  )
}