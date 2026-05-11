import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function OrdersPage() {
  const db = createAdminClient()
  const { data: orders } = await db
    .from('orders')
    .select('id, show_id, stripe_checkout_session_id, amount_total, currency, status, buyer_email, buyer_name, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const showIds = [...new Set((orders ?? []).filter(o => o.show_id).map(o => o.show_id as string))]
  const { data: showRows } = showIds.length
    ? await db.from('shows').select('id, title').in('id', showIds)
    : { data: [] as Array<{ id: string; title: string }> }
  const showMap = Object.fromEntries((showRows ?? []).map(s => [s.id, s]))

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    paid: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-zinc-100 text-zinc-400',
  }

  return (
    <div>
      <AdminHeader title="Orders" description={`${orders?.length ?? 0} ordre`} />
      <div className="p-6">
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Kjøper</th>
                <th className="text-left px-4 py-2.5 font-medium">Show</th>
                <th className="text-left px-4 py-2.5 font-medium">Beløp</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Stripe session</th>
                <th className="text-left px-4 py-2.5 font-medium">Tidspunkt</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => {
                const show = o.show_id ? showMap[o.show_id] : null
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.buyer_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{o.buyer_email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{show?.title ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">
                      {o.amount_total
                        ? new Intl.NumberFormat('nb-NO', { style: 'currency', currency: o.currency, maximumFractionDigits: 0 }).format(o.amount_total / 100)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] ?? ''}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {o.stripe_checkout_session_id?.slice(0, 16) ?? '—'}…
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(o.created_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!orders?.length && (
            <p className="text-center py-12 text-muted-foreground text-sm">Ingen ordre ennå.</p>
          )}
        </div>
      </div>
    </div>
  )
}
