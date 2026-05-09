import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import { Button } from '@/components/ui/button'
import { TicketCheck } from 'lucide-react'

export default async function TicketsPage() {
  const db = createAdminClient()
  const { data: tickets } = await db
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)

  const ticketShowIds = [...new Set((tickets ?? []).map(t => t.show_id))]
  const ticketOrderIds = [...new Set((tickets ?? []).map(t => t.order_id))]
  const [{ data: showRows }, { data: orderRows }] = await Promise.all([
    ticketShowIds.length
      ? db.from('shows').select('id, title').in('id', ticketShowIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    ticketOrderIds.length
      ? db.from('orders').select('id, buyer_name, buyer_email').in('id', ticketOrderIds)
      : Promise.resolve({ data: [] as Array<{ id: string; buyer_name: string | null; buyer_email: string | null }> }),
  ])
  const showMap = Object.fromEntries((showRows ?? []).map(s => [s.id, s]))
  const orderMap = Object.fromEntries((orderRows ?? []).map(o => [o.id, o]))

  const statusColors: Record<string, string> = {
    valid: 'bg-emerald-100 text-emerald-700',
    used: 'bg-zinc-100 text-zinc-500',
    refunded: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <AdminHeader
        title="Tickets"
        description={`${tickets?.length ?? 0} billetter`}
        actions={(
          <Button asChild variant="outline" size="sm">
            <Link href="/admin-app/tickets/verify"><TicketCheck className="size-4" /> Verifiser</Link>
          </Button>
        )}
      />
      <div className="p-6">
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Ticket code</th>
                <th className="text-left px-4 py-2.5 font-medium">Show</th>
                <th className="text-left px-4 py-2.5 font-medium">Kunde</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(tickets ?? []).map((t) => {
                const show = showMap[t.show_id]
                const order = orderMap[t.order_id]
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{t.ticket_code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{show?.title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{order?.buyer_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{order?.buyer_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] ?? ''}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!tickets?.length && (
            <p className="text-center py-12 text-muted-foreground text-sm">Ingen billetter ennå.</p>
          )}
        </div>
      </div>
    </div>
  )
}
