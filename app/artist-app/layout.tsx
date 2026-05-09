import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArtistSidebar } from '@/components/artist/artist-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { visibleArtistPath } from '@/lib/artist-portal'

export const metadata = { title: 'Artistportal — humor.events' }

export default async function ArtistLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-humor-pathname') ?? ''
  const isPublicRoute = pathname.startsWith('/artist-app/login') || pathname.startsWith('/artist-app/signup')

  if (isPublicRoute) return children

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (pathname === '/artist-app' || pathname === '/artist-app/') return children
    redirect(`/login?next=${encodeURIComponent(visibleArtistPath(pathname))}`)
  }

  const db = createAdminClient()
  const { data: artist } = await db
    .from('artists')
    .select('full_name, stage_name, email, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!artist) redirect('/signup?error=missing')

  return (
    <SidebarProvider>
      <ArtistSidebar user={{
        email: artist.email,
        name: artist.stage_name ?? artist.full_name,
        status: artist.status,
      }} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}