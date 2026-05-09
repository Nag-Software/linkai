import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import { ToastActionForm } from '@/components/toast-action-form'
import { approvePayoutAction, markPayoutPaidAction } from './actions'

export default async function ArtistEconomyPage() {
  const db = createAdminClient()

  const [{ data: payouts }, { data: invoices }] = await Promise.all([
    db.from('artist_payouts').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('artist_invoices').select('*').order('created_at', { ascending: false }).limit(200),
  ])

  const allArtistIds = [...new Set([
    ...(payouts ?? []).map(p => p.artist_id),
    ...(invoices ?? []).map(i => i.artist_id),
  ])]
  const allShowIds = [...new Set([
    ...(payouts ?? []).filter(p => p.show_id).map(p => p.show_id as string),
    ...(invoices ?? []).filter(i => i.show_id).map(i => i.show_id as string),
  ])]
  const [{ data: artistRows }, { data: showRows }] = await Promise.all([
    allArtistIds.length
      ? db.from('artists').select('id, full_name, email').in('id', allArtistIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; email: string }> }),
    allShowIds.length
      ? db.from('shows').select('id, title').in('id', allShowIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
  ])
  const artistMap = Object.fromEntries((artistRows ?? []).map(a => [a.id, a]))
  const showMap = Object.fromEntries((showRows ?? []).map(s => [s.id, s]))

  const sections: { label: string; status: string; color: string }[] = [
    { label: 'Pending utbetalinger', status: 'pending', color: 'bg-amber-100 text-amber-700' },
    { label: 'Godkjente utbetalinger', status: 'approved', color: 'bg-purple-100 text-purple-700' },
    { label: 'Betalte utbetalinger', status: 'paid', color: 'bg-emerald-100 text-emerald-700' },
  ]

  const invoiceColors: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-500',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-purple-100 text-purple-700',
    paid: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <AdminHeader title="Artist Economy" />
      <div className="p-6 space-y-8">
        {sections.map((section) => {
          const filtered = (payouts ?? []).filter(p => p.status === section.status)
          return (
            <section key={section.status}>
              <h2 className="text-sm font-semibold mb-3">{section.label} <span className="text-muted-foreground font-normal">({filtered.length})</span></h2>
              {filtered.length > 0 ? (
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Artist</th>
                        <th className="text-left px-4 py-2.5 font-medium">Show</th>
                        <th className="text-left px-4 py-2.5 font-medium">Beløp</th>
                        <th className="text-left px-4 py-2.5 font-medium">Metode</th>
                        <th className="text-left px-4 py-2.5 font-medium">Notat</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const artist = artistMap[p.artist_id]
                        const show = p.show_id ? showMap[p.show_id] : null
                        return (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="px-4 py-3">
                              <div className="font-medium">{artist?.full_name ?? '—'}</div>
                              <div className="text-xs text-muted-foreground">{artist?.email}</div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{show?.title ?? '—'}</td>
                            <td className="px-4 py-3 font-medium">
                              {new Intl.NumberFormat('nb-NO', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.amount / 100)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{p.payout_method ?? '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{p.notes ?? '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {p.status === 'pending' && (
                                  <ToastActionForm action={approvePayoutAction}>
                                    <input type="hidden" name="payout_id" value={p.id} />
                                    <button type="submit" className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
                                      Godkjenn
                                    </button>
                                  </ToastActionForm>
                                )}
                                {p.status === 'approved' && (
                                  <ToastActionForm action={markPayoutPaidAction}>
                                    <input type="hidden" name="payout_id" value={p.id} />
                                    <button type="submit" className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                                      Marker betalt
                                    </button>
                                  </ToastActionForm>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">Ingen i denne kategorien.</p>
              )}
            </section>
          )
        })}

        {/* Invoices */}
        <section>
          <h2 className="text-sm font-semibold mb-3">Fakturaer <span className="text-muted-foreground font-normal">({invoices?.length ?? 0})</span></h2>
          {(invoices ?? []).length > 0 ? (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium">Artist</th>
                    <th className="text-left px-4 py-2.5 font-medium">Show</th>
                    <th className="text-left px-4 py-2.5 font-medium">Fakturanr.</th>
                    <th className="text-left px-4 py-2.5 font-medium">Beløp</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Fil</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoices ?? []).map((inv) => {
                    const artist = artistMap[inv.artist_id]
                    const show = inv.show_id ? showMap[inv.show_id] : null
                    return (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{artist?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{show?.title ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number ?? '—'}</td>
                        <td className="px-4 py-3">{inv.amount ? `${inv.amount / 100} ${inv.currency}` : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${invoiceColors[inv.status] ?? ''}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {inv.file_url ? (
                            <a href={inv.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary underline underline-offset-2">
                              Se fil
                            </a>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Ingen fakturaer.</p>
          )}
        </section>
      </div>
    </div>
  )
}
