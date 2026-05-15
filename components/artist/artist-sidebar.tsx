'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  User,
  BadgeCheck,
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
  { label: 'Oversikt', href: '/', icon: LayoutDashboard, exact: true },
  { label: 'Profil', href: '/profile', icon: User },
  { label: 'Tilgjengelighet', href: '/available-dates', icon: CalendarCheck },
  { label: 'Tilbud', href: '/booking-offers', icon: ClipboardList },
  { label: 'Bookinger', href: '/bookings', icon: BadgeCheck },
]

export function ArtistSidebar({ user }: { user: { email: string; name: string; status: string } }) {
  const rawPathname = usePathname()
  const pathPrefix = '/artist-app'
  const pathname = rawPathname.replace(/^\/artist-app/, '') || '/'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={pathPrefix}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <User className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Komikerportal</span>
                  <span className="text-xs text-muted-foreground capitalize">{user.status.replace('_', ' ')}</span>
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
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              const href = item.href === '/' ? pathPrefix : `${pathPrefix}${item.href}`
              return (
                <SidebarMenuItem key={item.href}>
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
              <form action="/artist-app/logout" method="post">
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