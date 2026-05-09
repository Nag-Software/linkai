'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Ticket,
  Wallet,
  Megaphone,
  Mail,
  Radar,
  Settings,
  LogOut,
  Music2,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, exact: true },
  { label: 'Artists', href: '/artists', icon: Users },
  { label: 'Shows', href: '/shows', icon: CalendarDays },
  { label: 'Bookings', href: '/bookings', icon: BookOpen },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Tickets', href: '/tickets', icon: Ticket },
  { label: 'Artist Economy', href: '/artist-economy', icon: Wallet },
  { label: 'Marketing', href: '/marketing', icon: Megaphone },
  { label: 'Email Logs', href: '/email-logs', icon: Mail },
  { label: 'Tracking', href: '/tracking', icon: Radar },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface AdminSidebarProps {
  user: { email: string; name: string; role: string }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const rawPathname = usePathname()
  const pathPrefix = rawPathname.startsWith('/admin-app') ? '/admin-app' : ''
  const pathname = rawPathname.replace(/^\/admin-app/, '') || '/'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={pathPrefix || '/'}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Music2 className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Booking-center</span>
                  <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigasjon</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href || pathname === '/'
                : pathname.startsWith(item.href)
              const href = item.href === '/' ? pathPrefix || '/' : `${pathPrefix}${item.href}`
              return (
                <SidebarMenuItem key={item.href + item.label}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                    <Link href={href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Logg ut">
              <form action={`${pathPrefix}/logout`} method="post">
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="size-4" />
                  <span>Logg ut</span>
                </button>
              </form>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
