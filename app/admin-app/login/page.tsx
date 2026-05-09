import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/login-form'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const headerStore = await headers()
  const hostname = headerStore.get('x-humor-hostname') ?? headerStore.get('host')?.split(':')[0] ?? ''
  const adminPrefix = hostname === 'admin.localhost' || hostname.startsWith('admin.') ? '' : '/admin-app'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(adminPrefix || '/')

  const errorMessage = error === 'unauthorized'
    ? 'Du har ikke tilgang til admin-panelet.'
    : error === 'invalid'
      ? 'Feil e-post eller passord.'
      : undefined

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          title="Booking-center"
          description="Logg inn med admin-konto"
          action={`${adminPrefix}/login/submit`}
          errorMessage={errorMessage}
          showSignupLink={false}
        />
      </div>
    </div>
  )
}
