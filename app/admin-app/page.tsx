import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  UserCheck, BrainCircuit,
  Ticket, CreditCard, Wallet, Clock, AlertCircle,
  ArrowRight, ChevronRight, MapPin,
} from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Utkast',
  booking: 'Booker',
  fullbooked: 'Lineup klar',
  published: 'Publisert',
  completed: 'Gjennomført',
  cancelled: 'Kansellert',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  booking: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  fullbooked: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

async function getDashboardData() {
  const db = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const [
    { count: pendingArtists },
    { count: aiPending },
    { count: pendingPayouts },
    { count: pendingOffers },
    { count: approvedArtists },
    { count: soldTickets },
    ordersResult,
    showsResult,
    { count: draftShows },
    { count: bookingShows },
    { count: fullbookedShows },
    { count: publishedShows },
  ] = await Promise.all([
    db.from('artists').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    db.from('artist_ai_assessments').select('id', { count: 'exact', head: true }).eq('ai_status', 'pending'),
    db.from('artist_payouts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('booking_offers').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
    db.from('artists').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('tickets').select('id', { count: 'exact', head: true }).in('status', ['valid', 'used']),
    db.from('orders').select('amount_total').eq('status', 'paid'),
    db.from('shows')
      .select('id, title, date, capacity, status, venue_address, venue_name')
      .gte('date', today)
      .in('status', ['draft', 'booking', 'fullbooked', 'published'])
      .order('date', { ascending: true })
      .limit(12),
    db.from('shows').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    db.from('shows').select('id', { count: 'exact', head: true }).eq('status', 'booking'),
    db.from('shows').select('id', { count: 'exact', head: true }).eq('status', 'fullbooked'),
    db.from('shows').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ])

  const totalRevenue = (ordersResult.data ?? []).reduce((sum, o) => sum + (o.amount_total ?? 0), 0)
  const upcomingShows = showsResult.data ?? []
  const showIds = upcomingShows.map(s => s.id)

  const ticketCounts: Record<string, number> = {}
  if (showIds.length > 0) {
    const { data: tickets } = await db
      .from('tickets')
      .select('show_id')
      .in('show_id', showIds)
      .in('status', ['valid', 'used'])
    for (const t of tickets ?? []) {
      ticketCounts[t.show_id] = (ticketCounts[t.show_id] ?? 0) + 1
    }
  }

  return {
    pendingArtists: pendingArtists ?? 0,
    aiPending: aiPending ?? 0,
    pendingPayouts: pendingPayouts ?? 0,
    pendingOffers: pendingOffers ?? 0,
    approvedArtists: approvedArtists ?? 0,
    soldTickets: soldTickets ?? 0,
    totalRevenue,
    upcomingShows,
    ticketCounts,
    pipeline: {
      draft: draftShows ?? 0,
      booking: bookingShows ?? 0,
      fullbooked: fullbookedShows ?? 0,
      published: publishedShows ?? 0,
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const data = await getDashboardData()

  const formatNOK = (ore: number) =>
    new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(ore / 100)

  const actions = [
    { label: 'Venter godkjenning', value: data.pendingArtists, href: '/admin-app/artists', icon: Clock },
    { label: 'AI-vurdering pending', value: data.aiPending, href: '/admin-app/artists', icon: BrainCircuit },
    { label: 'Tilbud uten svar', value: data.pendingOffers, href: '/admin-app/bookings', icon: AlertCircle },
    { label: 'Artistutbetaling venter', value: data.pendingPayouts, href: '/admin-app/artist-economy', icon: Wallet },
  ]

  const pipeline = [
    { label: 'Utkast', count: data.pipeline.draft, bar: 'bg-zinc-300 dark:bg-zinc-600', dot: 'bg-zinc-400', text: 'text-zinc-500 dark:text-zinc-400' },
    { label: 'Booker', count: data.pipeline.booking, bar: 'bg-amber-300 dark:bg-amber-700', dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
    { label: 'Lineup klar', count: data.pipeline.fullbooked, bar: 'bg-purple-300 dark:bg-purple-700', dot: 'bg-purple-400', text: 'text-purple-600 dark:text-purple-400' },
    { label: 'Publisert', count: data.pipeline.published, bar: 'bg-emerald-400 dark:bg-emerald-600', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  ]
  const pipelineTotal = pipeline.reduce((s, p) => s + p.count, 0)

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        description={new Intl.DateTimeFormat('nb-NO', { dateStyle: 'long' }).format(new Date())}
      />
      <div className="p-6 space-y-5">

        {/* ── Action items ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`group rounded-xl border p-4 flex items-start gap-3 transition-colors hover:bg-muted/40 ${a.value > 0 ? 'border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20' : 'bg-card'}`}
            >
              <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${a.value > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                <a.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tabular-nums">{a.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{a.label}</p>
              </div>
              <ArrowRight className="shrink-0 size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Upcoming shows with capacity bars ── */}
          <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b">
              <h2 className="font-semibold text-sm">Kommende show</h2>
              <Link href="/admin-app/shows" className="text-xs text-primary hover:underline">Se alle</Link>
            </div>
            {data.upcomingShows.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">Ingen kommende show</div>
            ) : (
              <ul className="divide-y">
                {data.upcomingShows.map((show) => {
                  const sold = data.ticketCounts[show.id] ?? 0
                  const cap = show.capacity
                  const fill = cap ? Math.min(Math.round((sold / cap) * 100), 100) : null
                  const remaining = cap ? cap - sold : null
                  const fillBar =
                    fill === null ? '' :
                    fill >= 100 ? 'bg-red-500' :
                    fill >= 75 ? 'bg-amber-400' :
                    'bg-emerald-500'
                  const location = show.venue_address ?? show.venue_name

                  return (
                    <li key={show.id}>
                      <Link
                        href={`/admin-app/shows/${show.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                      >
                        {/* Date column */}
                        <div className="shrink-0 text-center w-9">
                          <div className="text-base font-bold leading-none tabular-nums">
                            {new Intl.DateTimeFormat('nb-NO', { day: 'numeric' }).format(new Date(show.date))}
                          </div>
                          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">
                            {new Intl.DateTimeFormat('nb-NO', { month: 'short' }).format(new Date(show.date))}
                          </div>
                        </div>

                        {/* Info column */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-medium text-sm truncate">{show.title}</span>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLOR[show.status] ?? ''}`}>
                              {STATUS_LABEL[show.status] ?? show.status}
                            </span>
                          </div>

                          {cap !== null ? (
                            <div className="space-y-1">
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${fillBar}`}
                                  style={{ width: `${fill}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>{sold} / {cap} solgt</span>
                                <span className={
                                  fill === 100 ? 'text-red-500 font-medium' :
                                  fill !== null && fill >= 75 ? 'text-amber-600 font-medium' :
                                  'text-emerald-600 font-medium'
                                }>
                                  {fill === 100 ? 'Utsolgt' : `${remaining} ledig`}
                                </span>
                              </div>
                            </div>
                          ) : (
                            location ? (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="size-3 shrink-0" />
                                <span className="truncate">{location}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Ingen kapasitetsgrense satt</span>
                            )
                          )}
                        </div>

                        <ChevronRight className="shrink-0 size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Pipeline */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-sm">Show-pipeline</h2>
              {pipelineTotal === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen aktive show</p>
              ) : (
                <>
                  <div className="h-2.5 rounded-full overflow-hidden flex gap-0.5">
                    {pipeline.filter(p => p.count > 0).map(p => (
                      <div
                        key={p.label}
                        className={`${p.bar} transition-all`}
                        style={{ width: `${Math.round((p.count / pipelineTotal) * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {pipeline.map(p => (
                      <div key={p.label} className="flex items-center gap-2">
                        <div className={`size-2 rounded-full shrink-0 ${p.dot}`} />
                        <span className="text-xs text-muted-foreground truncate">{p.label}</span>
                        <span className={`ml-auto text-xs font-bold tabular-nums ${p.text}`}>{p.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Summary stats */}
            <div className="rounded-xl border bg-card divide-y overflow-hidden">
              {[
                { icon: UserCheck, label: 'Godkjente artister', value: data.approvedArtists },
                { icon: Ticket, label: 'Solgte billetter', value: data.soldTickets },
                { icon: CreditCard, label: 'Total inntekt', value: formatNOK(data.totalRevenue) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <span className="text-sm text-muted-foreground flex-1">{label}</span>
                  <span className="text-sm font-bold tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
