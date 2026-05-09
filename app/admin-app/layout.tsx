import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export const metadata = { title: 'Booking-center — humor.events' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers()
  const pathname = headerStore.get('x-humor-pathname') ?? ''
  const hostname = headerStore.get('x-humor-hostname') ?? headerStore.get('host')?.split(':')[0] ?? ''
  const adminPrefix = hostname === 'admin.localhost' || hostname.startsWith('admin.') ? '' : '/admin-app'

  if (pathname.startsWith('/admin-app/login')) {
    return children
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`${adminPrefix}/login`)
  }

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role, full_name, email')
    .eq('auth_user_id', user.id)
    .single()

  const sidebarUser = {
    email: profile?.email ?? user.email ?? 'admin@humor.events',
    name: profile?.full_name ?? profile?.email ?? user.email ?? 'Admin',
    role: profile?.role ?? 'admin',
  }

  const allowed: string[] = ['owner', 'admin', 'staff']
  if (!profile || !allowed.includes(profile.role)) {
    redirect(`${adminPrefix}/login?error=unauthorized`)
  }

  return (
    <SidebarProvider>
      <AdminSidebar user={sidebarUser} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
