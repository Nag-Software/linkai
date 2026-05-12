import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import type { BookingOffer, BookingOfferStatus } from '@/types/database'

type BookingOfferRow = Pick<BookingOffer, 'id' | 'show_id' | 'artist_id' | 'status' | 'fee_amount' | 'currency' | 'sent_at' | 'responded_at' | 'expires_at' | 'created_at'>
type BookingArtistRow = { id: string; full_name: string; email: string }
type BookingShowRow = { id: string; title: string; date: string; status: string }

const statusColors: Record<BookingOfferStatus, string> = {
  sent: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-zinc-100 text-zinc-500',
  filled_by_other: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-zinc-100 text-zinc-400',
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ past?: string }>
}) {
  const { past } = await searchParams
  const showPast = past === '1'
  const db = createAdminClient()
  const { data: offers } = await db
    .from('booking_offers')
    .select('id, show_id, artist_id, status, fee_amount, currency, sent_at, responded_at, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(250)

  const artistIds = [...new Set((offers ?? []).map(o => o.artist_id))]
  const showIds = [...new Set((offers ?? []).map(o => o.show_id))]
  const [{ data: artistRows }, { data: showRows }] = await Promise.all([
    artistIds.length
      ? db.from('artists').select('id, full_name, email').in('id', artistIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; email: string }> }),
    showIds.length
      ? db.from('shows').select('id, title, date, status').in('id', showIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; date: string; status: string }> }),
  ])
  const artistMap = Object.fromEntries((artistRows ?? []).map(a => [a.id, a]))
  const showMap = Object.fromEntries((showRows ?? []).map(s => [s.id, s]))

  const today = new Date().toISOString().slice(0, 10)

  const activeOffers = (offers ?? []).filter(o => {
    const show = showMap[o.show_id]
    return show && show.status !== 'cancelled'
  })

  const upcomingOffers = activeOffers.filter(o => (showMap[o.show_id]?.date ?? '') >= today)
  const pastOffers = activeOffers.filter(o => (showMap[o.show_id]?.date ?? '') < today)

  return (
    <div>
      <AdminHeader title="Booking Offers" description={`${activeOffers.length} tilbud`} />
      <div className="p-6 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Kommende ({upcomingOffers.length})
          </h2>
          <OffersTable rows={upcomingOffers} artistMap={artistMap} showMap={showMap} />
        </section>
        <section>
          {showPast ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Tidligere ({pastOffers.length})
                </h2>
                <Link href="/admin-app/bookings" className="text-xs text-muted-foreground hover:text-foreground underline">
                  Skjul
                </Link>
              </div>
              <OffersTable rows={pastOffers} artistMap={artistMap} showMap={showMap} />
            </>
          ) : (
            <Link
              href="/admin-app/bookings?past=1"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Vis tidligere tilbud ({pastOffers.length})
            </Link>
          )}
        </section>
      </div>
    </div>
  )
}

function OffersTable({
  rows,
  artistMap,
  showMap,
}: {
  rows: BookingOfferRow[]
  artistMap: Record<string, BookingArtistRow>
  showMap: Record<string, BookingShowRow>
}) {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
            <th className="text-left px-4 py-2.5 font-medium">Show</th>
            <th className="text-left px-4 py-2.5 font-medium">Artist</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
            <th className="text-left px-4 py-2.5 font-medium">Sendt</th>
            <th className="text-left px-4 py-2.5 font-medium">Svart</th>
            <th className="text-left px-4 py-2.5 font-medium">Utløper</th>
            <th className="text-left px-4 py-2.5 font-medium">Fee</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const artist = artistMap[o.artist_id]
            const show = showMap[o.show_id]
            return (
              <tr key={o.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{show?.title ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{show?.date}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{artist?.full_name ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{artist?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] ?? ''}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {o.sent_at ? new Date(o.sent_at).toLocaleDateString('nb-NO') : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {o.responded_at ? new Date(o.responded_at).toLocaleDateString('nb-NO') : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {o.expires_at ? new Date(o.expires_at).toLocaleDateString('nb-NO') : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {o.fee_amount ? `${o.fee_amount / 100} ${o.currency}` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {!rows.length && (
        <p className="text-center py-8 text-muted-foreground text-sm">Ingen tilbud.</p>
      )}
    </div>
  )
}
