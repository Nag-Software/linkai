import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function TrackingPage() {
  const db = createAdminClient()
  const { data: events } = await db
    .from('tracking_events')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(500)

  const statusColors: Record<string, string> = {
    sent: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    skipped: 'bg-zinc-100 text-zinc-500',
  }

  return (
    <div>
      <AdminHeader title="Tracking Events" description={`${events?.length ?? 0} events`} />
      <div className="p-6">
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Event</th>
                <th className="text-left px-4 py-2.5 font-medium">Show ID</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Source URL</th>
                <th className="text-left px-4 py-2.5 font-medium">Payload</th>
                <th className="text-left px-4 py-2.5 font-medium">Tidspunkt</th>
              </tr>
            </thead>
            <tbody>
              {(events ?? []).map((ev) => (
                <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{ev.event_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ev.show_id ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ev.status] ?? ''}`}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {ev.event_source_url ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <details className="cursor-pointer">
                      <summary className="text-xs text-primary">Vis</summary>
                      <pre className="text-xs bg-muted rounded mt-1 p-2 max-w-xs overflow-auto whitespace-pre-wrap">
                        {ev.payload ? JSON.stringify(ev.payload, null, 2) : '—'}
                      </pre>
                    </details>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {ev.sent_at ? new Date(ev.sent_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events?.length && (
            <p className="text-center py-12 text-muted-foreground text-sm">Ingen tracking events ennå.</p>
          )}
        </div>
      </div>
    </div>
  )
}
