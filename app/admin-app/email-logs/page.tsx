import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function EmailLogsPage() {
  const db = createAdminClient()
  const { data: logs } = await db
    .from('email_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(500)

  const statusColors: Record<string, string> = {
    sent: 'bg-emerald-100 text-emerald-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    bounced: 'bg-orange-100 text-orange-700',
    pending: 'bg-amber-100 text-amber-700',
  }

  return (
    <div>
      <AdminHeader title="Email Logs" description={`${logs?.length ?? 0} e-poster`} />
      <div className="p-6">
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Mottaker</th>
                <th className="text-left px-4 py-2.5 font-medium">Template</th>
                <th className="text-left px-4 py-2.5 font-medium">Emne</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Resend ID</th>
                <th className="text-left px-4 py-2.5 font-medium">Feil</th>
                <th className="text-left px-4 py-2.5 font-medium">Tidspunkt</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs">{log.recipient_email}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.template_name}</td>
                  <td className="px-4 py-3 text-xs max-w-[200px] truncate">{log.subject ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[log.status] ?? ''}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.resend_email_id ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-[180px] truncate">{log.error_message ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {log.sent_at ? new Date(log.sent_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs?.length && (
            <p className="text-center py-12 text-muted-foreground text-sm">Ingen e-poster logget ennå.</p>
          )}
        </div>
      </div>
    </div>
  )
}
