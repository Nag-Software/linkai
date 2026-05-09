import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import type { ShowStatus } from '@/types/database'

const statusColors: Record<ShowStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  booking: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  fullbooked: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const db = createAdminClient()

  let query = db
    .from('shows')
    .select('id, title, date, venue_name, venue_address, status, capacity, ticket_price, currency, published_at, slug')
    .order('date', { ascending: true })
    .limit(200)

  if (status) query = query.eq('status', status as ShowStatus)

  const { data: shows } = await query

  const statuses: ShowStatus[] = ['draft', 'booking', 'fullbooked', 'published', 'completed', 'cancelled']

  return (
    <div>
      <AdminHeader
        title="Show"
        description={`${shows?.length ?? 0} show`}
        actions={
          <Link
            href="/admin-app/shows/new"
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            + Nytt show
          </Link>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin-app/shows"
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!status ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>
            Alle
          </Link>
          {statuses.map((s) => (
            <Link key={s} href={`/admin-app/shows?status=${s}`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${status === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>
              {s}
            </Link>
          ))}
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Tittel</th>
                <th className="text-left px-4 py-2.5 font-medium">Dato</th>
                <th className="text-left px-4 py-2.5 font-medium">Sted</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-center px-4 py-2.5 font-medium">Kapasitet</th>
                <th className="text-left px-4 py-2.5 font-medium">Pris</th>
              </tr>
            </thead>
            <tbody>
              {(shows ?? []).map((show) => (
                <tr key={show.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin-app/shows/${show.id}`} className="font-medium hover:underline">
                      {show.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(show.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{show.venue_name ?? show.venue_address ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[show.status]}`}>
                      {show.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{show.capacity ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {show.ticket_price
                      ? new Intl.NumberFormat('nb-NO', { style: 'currency', currency: show.currency, maximumFractionDigits: 0 }).format(show.ticket_price / 100)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shows?.length && (
            <p className="text-center py-12 text-muted-foreground text-sm">Ingen show funnet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
