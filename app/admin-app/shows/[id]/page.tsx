import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import { ToastActionForm } from '@/components/toast-action-form'
import { ManualSpotForm } from './manual-spot-form'
import { DeleteButton } from '@/components/admin/delete-button'
import {
  addRequirementAction,
  deleteRequirementAction,
  deleteShowAction,
  generatePosterAction,
  removeSpotAction,
  updateShowDetailsAction,
  updateRequirementAction,
} from '../actions'
import Image from 'next/image'

type ShowTab = 'overview' | 'requirements' | 'booking' | 'lineup' | 'marketing' | 'tickets'
type LineupMode = 'auto' | 'manual'

export default async function ShowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: ShowTab; mode?: LineupMode }>
}) {
  const { id } = await params
  const { tab = 'overview', mode = 'auto' } = await searchParams
  const lineupMode: LineupMode = mode === 'manual' ? 'manual' : 'auto'
  const db = createAdminClient()
  const shouldLoadTickets = tab === 'tickets'
  const shouldLoadMarketingTasks = tab === 'marketing'
  const shouldLoadRelatedArtists = tab === 'booking' || tab === 'lineup' || tab === 'marketing'
  const shouldLoadLineupRequirements = tab === 'lineup'
  const shouldLoadSelectableArtists = tab === 'lineup'

  const [
    { data: show },
    { data: requirements },
    { data: offers },
    { data: lineup },
    { data: tickets },
    { data: marketingTasks },
  ] = await Promise.all([
    db.from('shows').select('*').eq('id', id).single(),
    db.from('show_requirements').select('*').eq('show_id', id).order('created_at'),
    db.from('booking_offers').select('*').eq('show_id', id).order('created_at', { ascending: false }),
    db.from('confirmed_spots').select('*').eq('show_id', id),
    shouldLoadTickets
      ? db.from('tickets').select('id, ticket_code, status, customer_id').eq('show_id', id).limit(500)
      : Promise.resolve({ data: [] as Array<{ id: string; ticket_code: string; status: string; customer_id: string | null }> }),
    shouldLoadMarketingTasks
      ? db.from('marketing_tasks').select('*').eq('show_id', id).order('created_at')
      : Promise.resolve({ data: [] as Array<{ id: string; show_id: string; task_key: string; label: string | null; is_completed: boolean; created_at: string }> }),
  ])

  if (!show) notFound()

  // Fetch related artist/requirement data (split queries — no Relationships in DB types)
  const offerArtistIds = [...new Set((offers ?? []).map(o => o.artist_id))]
  const lineupArtistIds = [...new Set((lineup ?? []).map(s => s.artist_id))]
  const allArtistIds = [...new Set([...offerArtistIds, ...lineupArtistIds])]
  const lineupReqIds = [...new Set((lineup ?? []).map(s => s.show_requirement_id).filter((x): x is string => !!x))]

  const [{ data: artistRows }, { data: reqRows }, { data: selectableArtists }] = await Promise.all([
    shouldLoadRelatedArtists && allArtistIds.length
      ? db.from('artists').select('id, full_name, stage_name, email, profile_image_url, admin_score, admin_energy_level').in('id', allArtistIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; stage_name: string | null; email: string; profile_image_url: string | null; admin_score: number | null; admin_energy_level: string | null }> }),
    shouldLoadLineupRequirements && lineupReqIds.length
      ? db.from('show_requirements').select('id, role_name').in('id', lineupReqIds)
      : Promise.resolve({ data: [] as Array<{ id: string; role_name: string }> }),
    shouldLoadSelectableArtists
      ? db.from('artists')
        .select('id, full_name, stage_name, email, admin_score, admin_energy_level, admin_tags')
        .eq('status', 'approved')
        .order('full_name')
        .limit(250)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; stage_name: string | null; email: string; admin_score: number | null; admin_energy_level: string | null; admin_tags: string[] | null }> }),
  ])
  const artistMap = Object.fromEntries((artistRows ?? []).map(a => [a.id, a]))
  const reqMap = Object.fromEntries((reqRows ?? []).map(r => [r.id, r]))

  // Compute fill status per requirement
  const activeLineup = (lineup ?? []).filter(s => ['confirmed', 'completed', 'paid'].includes(s.status))
  const reqFillStatus = (requirements ?? []).map(r => {
    const filled = activeLineup.filter(s => s.show_requirement_id === r.id).length
    const pendingOffers = (offers ?? []).filter(o => o.show_requirement_id === r.id && o.status === 'sent').length
    return { ...r, filled, pendingOffers, isFull: filled >= r.quantity }
  })
  const allSlotsFilled = reqFillStatus.length > 0 && reqFillStatus.every(r => r.isFull)
  const totalSlots = reqFillStatus.reduce((s, r) => s + r.quantity, 0)
  const totalFilled = reqFillStatus.reduce((s, r) => s + Math.min(r.filled, r.quantity), 0)
  const activeArtistIds = new Set(activeLineup.map(spot => spot.artist_id))
  const manualSelectableArtists = (selectableArtists ?? []).filter(artist => !activeArtistIds.has(artist.id))
  const manualOpenRequirements = reqFillStatus
    .filter(req => req.filled < req.quantity)
    .map(req => ({ id: req.id, role_name: req.role_name, quantity: req.quantity, filled: req.filled }))

  const offerStats = {
    total: (offers ?? []).length,
    sent: (offers ?? []).filter(o => o.status === 'sent').length,
    accepted: (offers ?? []).filter(o => o.status === 'accepted').length,
    declined: (offers ?? []).filter(o => o.status === 'declined').length,
  }

  const TABS: { key: ShowTab; label: string; badge?: number }[] = [
    { key: 'overview', label: 'Oversikt' },
    { key: 'requirements', label: 'Krav' },
    { key: 'booking', label: 'Tilbud', badge: offerStats.sent || undefined },
    { key: 'lineup', label: 'Lineup', badge: activeLineup.length || undefined },
    { key: 'marketing', label: 'Markedsføring' },
    { key: 'tickets', label: 'Billetter' },
  ]

  const STATUS_COLORS: Record<string, string> = {
    sent: 'bg-amber-100 text-amber-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-zinc-100 text-zinc-500',
    filled_by_other: 'bg-orange-100 text-orange-700',
    cancelled: 'bg-zinc-100 text-zinc-400',
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-sky-100 text-sky-700',
    paid: 'bg-purple-100 text-purple-700',
    valid: 'bg-emerald-100 text-emerald-700',
    used: 'bg-zinc-100 text-zinc-500',
    refunded: 'bg-orange-100 text-orange-700',
  }

  const SHOW_STATUS_COLORS: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-600',
    booking: 'bg-amber-100 text-amber-700',
    fullbooked: 'bg-purple-100 text-purple-700',
    published: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-sky-100 text-sky-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const SHOW_STATUS_LABELS: Record<string, string> = {
    draft: 'Utkast', booking: 'Booker', fullbooked: 'Lineup klar',
    published: 'Publisert', completed: 'Gjennomført', cancelled: 'Kansellert',
  }

  const showLocation = show.venue_address ?? show.venue_name

  return (
    <div>
      <AdminHeader
        title={show.title}
        description={[show.date, showLocation].filter(Boolean).join(' · ')}
        actions={
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${SHOW_STATUS_COLORS[show.status]}`}>
              {SHOW_STATUS_LABELS[show.status] ?? show.status}
            </span>
            <Link href="/admin-app/shows" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Tilbake
            </Link>
            <DeleteButton
              action={deleteShowAction}
              id={show.id}
              idField="show_id"
              confirmMessage={`Slett showen "${show.title}"? Dette kan ikke angres.`}
            />
          </div>
        }
      />

      {/* Tab nav */}
      <div className="flex gap-0 border-b px-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin-app/shows/${id}?tab=${t.key}`}
            className={`relative px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {t.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="p-6">

        {/* ══════════════════ OVERVIEW ══════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {totalSlots > 0 && (
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm">fremgang</h2>
                  <span className="text-sm font-bold tabular-nums">{totalFilled}/{totalSlots} plasser fylt</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round((totalFilled / totalSlots) * 100)}%` }} />
                </div>
                <div className="grid gap-2">
                  {reqFillStatus.map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-32 truncate">{r.role_name}</span>
                      <div className="flex gap-1">
                        {Array.from({ length: r.quantity }).map((_, i) => (
                          <div key={i} className={`size-5 rounded-sm border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                            i < r.filled ? 'bg-emerald-500 border-emerald-500 text-white'
                              : i < r.filled + r.pendingOffers ? 'bg-amber-100 border-amber-400 text-amber-700'
                              : 'bg-muted border-muted-foreground/20'
                          }`}>
                            {i < r.filled ? '✓' : i < r.filled + r.pendingOffers ? '?' : ''}
                          </div>
                        ))}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-auto ${r.isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.isFull ? 'Fylt' : `${r.filled}/${r.quantity}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <h2 className="font-semibold text-sm">Tilbud sendt</h2>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Totalt', value: offerStats.total, color: 'text-foreground' },
                    { label: 'Venter', value: offerStats.sent, color: 'text-amber-600' },
                    { label: 'Akseptert', value: offerStats.accepted, color: 'text-emerald-600' },
                  ].map(s => (
                    <div key={s.label} className="text-center rounded-lg bg-muted p-2">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 space-y-2">
                <h2 className="font-semibold text-sm">Info</h2>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Dato</dt><dd className="font-medium">{show.date}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Tid</dt><dd className="font-medium">{show.start_time ?? '—'}{show.end_time ? `–${show.end_time}` : ''}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Sted</dt><dd className="font-medium">{showLocation ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Kapasitet</dt><dd className="font-medium">{show.capacity ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Pris</dt><dd className="font-medium">{show.ticket_price ? `${show.ticket_price / 100} ${show.currency}` : '—'}</dd></div>
                </dl>
              </div>

              <div className="rounded-xl border bg-card p-5 space-y-3">
                <h2 className="font-semibold text-sm">Automatikk</h2>
                <div className="space-y-2">
                  {show.status === 'draft' && (requirements ?? []).length === 0 && (
                    <Link href={`/admin-app/shows/${id}?tab=requirements`} className="block w-full text-center text-sm px-3 py-2 rounded-md border border-dashed text-muted-foreground hover:text-foreground transition-colors">
                      + Legg til krav først
                    </Link>
                  )}
                  {['draft', 'booking'].includes(show.status) && (requirements ?? []).length > 0 && !allSlotsFilled && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                      Tilbud sendes automatisk når krav lagres og når nye artister godkjennes. Plasser fylles først når artister godkjenner tilbudet.
                    </div>
                  )}
                  {allSlotsFilled && show.status !== 'published' && (
                    <div className="rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-300/50 px-3 py-2 text-xs text-purple-700 dark:text-purple-400">
                      Lineup er fylt. Systemet genererer plakat og publiserer automatisk.
                    </div>
                  )}
                  {show.status === 'published' && (
                    <Link href={`/events/${show.slug}`} target="_blank" className="block w-full text-center text-sm px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium">
                      🔗 Vis eventside
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <ToastActionForm action={updateShowDetailsAction} className="rounded-xl border bg-card p-5 space-y-4">
              <input type="hidden" name="show_id" value={show.id} />
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-sm">Rediger show</h2>
                <button type="submit" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                  Lagre endringer
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Tittel</span>
                  <input name="title" required defaultValue={show.title} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Slug</span>
                  <input name="slug" required defaultValue={show.slug} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Dato</span>
                  <input name="date" type="date" required defaultValue={show.date} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Start</span>
                  <input name="start_time" type="time" defaultValue={(show.start_time ?? '').slice(0, 5)} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Slutt</span>
                  <input name="end_time" type="time" defaultValue={(show.end_time ?? '').slice(0, 5)} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Kapasitet</span>
                  <input name="capacity" type="number" min={0} defaultValue={show.capacity ?? ''} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="space-y-1 md:col-span-4">
                  <span className="text-xs font-medium text-muted-foreground">Sted / adresse</span>
                  <input name="venue_address" defaultValue={show.venue_address ?? ''} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Pris</span>
                  <input name="ticket_price" type="number" min={0} step="0.01" defaultValue={show.ticket_price ? show.ticket_price / 100 : ''} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Valuta</span>
                  <input name="currency" defaultValue={show.currency} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </label>
              </div>
              <label className="space-y-1 block">
                <span className="text-xs font-medium text-muted-foreground">Beskrivelse</span>
                <textarea name="description" defaultValue={show.description ?? ''} rows={4} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
            </ToastActionForm>

            {show.poster_url && (
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-sm">Plakat</h2>
                  <ToastActionForm action={generatePosterAction} successMessage="Plakatgenerering er startet.">
                    <input type="hidden" name="show_id" value={show.id} />
                    <button type="submit" className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
                      Regenerer
                    </button>
                  </ToastActionForm>
                </div>
                <img src={show.poster_url} alt={`Plakat for ${show.title}`} className="max-h-96 rounded-lg object-contain border" />
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ REQUIREMENTS ══════════════════ */}
        {tab === 'requirements' && (
          <div className="space-y-6 max-w-3xl">
            {reqFillStatus.length > 0 && (
              <div className="space-y-3">
                {reqFillStatus.map((r) => (
                  <div key={r.id} className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${r.isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.isFull ? '✓ Fylt' : `${r.filled}/${r.quantity}`}
                        </span>
                        <span className="text-xs text-muted-foreground">{r.pendingOffers} ventende tilbud</span>
                      </div>
                      <ToastActionForm action={deleteRequirementAction}>
                        <input type="hidden" name="show_id" value={show.id} />
                        <input type="hidden" name="req_id" value={r.id} />
                        <button type="submit" className="text-xs text-destructive hover:underline">Slett krav</button>
                      </ToastActionForm>
                    </div>
                    <ToastActionForm action={updateRequirementAction} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <input type="hidden" name="show_id" value={show.id} />
                      <input type="hidden" name="req_id" value={r.id} />
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">Rolle</span>
                        <input name="role_name" required defaultValue={r.role_name} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Antall</span>
                        <input name="quantity" type="number" min={1} defaultValue={r.quantity} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Min score</span>
                        <input name="min_score" type="number" min={1} max={10} defaultValue={r.min_score ?? ''} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                      </label>
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">Energi</span>
                        <select name="energy_level" defaultValue={r.energy_level} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="any">Alle</option>
                          <option value="high">Høy energi</option>
                          <option value="low">Lav energi</option>
                          <option value="uncertain">Usikker</option>
                        </select>
                      </label>
                      <label className="space-y-1 md:col-span-5">
                        <span className="text-xs font-medium text-muted-foreground">Tags</span>
                        <input name="required_tags" defaultValue={(r.required_tags ?? []).join(', ')} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                      </label>
                      <div className="flex items-end">
                        <button type="submit" className="w-full px-3 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors">Lagre</button>
                      </div>
                    </ToastActionForm>
                  </div>
                ))}
              </div>
            )}

            {['draft', 'booking', 'fullbooked'].includes(show.status) && (
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <h2 className="font-semibold text-sm">Legg til bookingbehov</h2>
                <ToastActionForm action={addRequirementAction} className="space-y-3">
                  <input type="hidden" name="show_id" value={show.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Rolle *</label>
                      <input name="role_name" required placeholder="headliner, support, opener…"
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Antall</label>
                      <input name="quantity" type="number" min={1} defaultValue={1}
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Min score (1–10)</label>
                      <input name="min_score" type="number" min={1} max={10} placeholder="7"
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Energinivå</label>
                      <select name="energy_level"
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="any">Alle</option>
                        <option value="high">Høy energi</option>
                        <option value="low">Lav energi</option>
                        <option value="uncertain">Usikker</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Tags (kommaseparert)</label>
                    <input name="required_tags" placeholder="jazz, folk, electro"
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    Legg til krav
                  </button>
                </ToastActionForm>
              </div>
            )}

            {(requirements ?? []).length > 0 && ['draft', 'booking'].includes(show.status) && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Booking starter automatisk når krav lagres. Nye godkjente artister matches også automatisk mot åpne show.
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ BOOKING OFFERS ══════════════════ */}
        {tab === 'booking' && (
          <div className="space-y-6">
            {(requirements ?? []).map(req => {
              const reqOffers = (offers ?? []).filter(o => o.show_requirement_id === req.id)
              const fill = reqFillStatus.find(r => r.id === req.id)
              return (
                <div key={req.id} className="rounded-xl border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{req.role_name}</span>
                      <span className="text-xs text-muted-foreground">{fill?.filled}/{req.quantity} fylt</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { key: 'sent', label: 'Venter', color: 'bg-amber-100 text-amber-700' },
                        { key: 'accepted', label: 'Akseptert', color: 'bg-emerald-100 text-emerald-700' },
                        { key: 'declined', label: 'Avslått', color: 'bg-red-100 text-red-700' },
                      ].map(({ key, label, color }) => {
                        const n = reqOffers.filter(o => o.status === key).length
                        if (!n) return null
                        return <span key={key} className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{n} {label}</span>
                      })}
                    </div>
                  </div>
                  {reqOffers.length > 0 ? (
                    <table className="w-full text-sm">
                      <tbody>
                        {reqOffers.map(o => {
                          const artist = artistMap[o.artist_id]
                          return (
                            <tr key={o.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 w-10">
                                {artist?.profile_image_url ? (
                                  <Image src={artist.profile_image_url} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
                                ) : (
                                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                    {(artist?.full_name ?? '?').charAt(0)}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-3">
                                <div className="font-medium">{artist?.full_name ?? '—'}</div>
                                <div className="text-xs text-muted-foreground">{artist?.email}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}`}>
                                  {o.status.replaceAll('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                Sendt {o.sent_at ? new Date(o.sent_at).toLocaleDateString('nb-NO') : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {o.responded_at && `Svart ${new Date(o.responded_at).toLocaleDateString('nb-NO')}`}
                              </td>
                              <td className="px-4 py-3 text-right text-xs text-muted-foreground">Auto</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-muted-foreground px-4 py-6">Ingen tilbud for denne rollen ennå.</p>
                  )}
                </div>
              )
            })}
            {!(offers ?? []).length && (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground text-sm">
                Ingen tilbud sendt ennå.
                {show.status === 'draft' && (
                  <div className="mt-3">
                    <Link href={`/admin-app/shows/${id}?tab=requirements`} className="text-primary underline-offset-2 hover:underline text-sm">
                      Sett opp krav og start booking
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ LINEUP ══════════════════ */}
        {tab === 'lineup' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Lineup-modus</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Auto er standard. Bruk manuell modus når admin selv vil fylle eller justere lineup.
                </p>
              </div>
              <div className="flex rounded-md border bg-muted/40 p-1">
                <Link
                  href={`/admin-app/shows/${id}?tab=lineup&mode=auto`}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${lineupMode === 'auto' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Auto
                </Link>
                <Link
                  href={`/admin-app/shows/${id}?tab=lineup&mode=manual`}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${lineupMode === 'manual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Manuell
                </Link>
              </div>
            </div>

            {reqFillStatus.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {reqFillStatus.map(r => (
                  <div key={r.id} className={`rounded-xl border p-3 text-center ${r.isFull ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                    <div className={`text-2xl font-bold ${r.isFull ? 'text-emerald-700' : 'text-amber-700'}`}>{r.filled}/{r.quantity}</div>
                    <div className="text-xs font-medium mt-0.5">{r.role_name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.isFull ? 'Fylt' : `${r.pendingOffers} venter svar`}</div>
                  </div>
                ))}
              </div>
            )}

            {lineupMode === 'auto' && (requirements ?? []).length > 0 && (
              <div className="rounded-xl border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-sm">Automatisk lineup</h2>
                  <span className="text-xs text-muted-foreground">{selectableArtists?.length ?? 0} godkjente artister</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Systemet sender tilbud til matchende artister. Lineup fylles når artister godkjenner tilbudet.
                </p>
              </div>
            )}

            {lineupMode === 'manual' && (
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-semibold text-sm">Legg til artist manuelt</h2>
                    <p className="text-sm text-muted-foreground">Manuell lineup bruker samme sikkerhetsregler: én artist per show og bare åpne roller kan fylles.</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{manualSelectableArtists.length} tilgjengelige artister</span>
                </div>
                {manualOpenRequirements.length > 0 ? (
                  <ManualSpotForm
                    showId={show.id}
                    currency={show.currency}
                    artists={manualSelectableArtists}
                    requirements={manualOpenRequirements}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Alle krav er fylt. Øk antall på et krav hvis du vil legge til flere.</div>
                )}
              </div>
            )}

            {allSlotsFilled && show.status === 'booking' && (
              <div className="rounded-xl border-2 border-purple-300 bg-purple-50/50 dark:bg-purple-950/20 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-purple-900 dark:text-purple-300">Lineup er klar! 🎉</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-400 mt-0.5">
                      Alle plasser er fylt. Systemet genererer lineup-plakat med profilbilder, publiserer eventside og starter markedsføring automatisk.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeLineup.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeLineup.map(spot => {
                  const artist = artistMap[spot.artist_id]
                  const req = spot.show_requirement_id ? reqMap[spot.show_requirement_id] : null
                  return (
                    <div key={spot.id} className="rounded-xl border bg-card overflow-hidden">
                      <div className="flex items-center gap-3 p-4">
                        {artist?.profile_image_url ? (
                          <img src={artist.profile_image_url} alt="" className="size-14 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="size-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground shrink-0">
                            {(artist?.full_name ?? '?').charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{artist?.full_name ?? '—'}</div>
                          <div className="text-xs text-muted-foreground truncate">{artist?.email}</div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {req && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{req.role_name}</span>}
                            {artist?.admin_score != null && <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-bold">⭐ {artist.admin_score}</span>}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[spot.status] ?? ''}`}>{spot.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 px-4 pb-4 text-xs text-muted-foreground">
                        <span>{spot.fee_amount ? `Fee: ${spot.fee_amount / 100} ${spot.currency}` : 'Fee ikke satt'}</span>
                        {lineupMode === 'manual' && (
                          <ToastActionForm action={removeSpotAction}>
                            <input type="hidden" name="spot_id" value={spot.id} />
                            <input type="hidden" name="show_id" value={show.id} />
                            <button type="submit" className="rounded-md border px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10">
                              Fjern
                            </button>
                          </ToastActionForm>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground text-sm">
                Ingen bekreftet lineup ennå.
                {show.status === 'draft' && (
                  <div className="mt-3">
                    <Link href={`/admin-app/shows/${id}?tab=requirements`} className="text-primary underline-offset-2 hover:underline text-sm">
                      Start bookingprosessen
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ MARKETING ══════════════════ */}
        {tab === 'marketing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm">Lineup-plakat</h2>
                  <ToastActionForm action={generatePosterAction} successMessage="Plakatgenerering er startet.">
                    <input type="hidden" name="show_id" value={show.id} />
                    <button type="submit" className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
                      {show.poster_url ? 'Regenerer' : 'Generer'}
                    </button>
                  </ToastActionForm>
                </div>
                {show.poster_url ? (
                  <div className="space-y-2">
                    <img src={show.poster_url} alt={`Plakat for ${show.title}`} className="w-full rounded-lg object-contain border max-h-80" />
                    <a href={show.poster_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline block">
                      Åpne i ny fane
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/30 h-48 flex items-center justify-center text-sm text-muted-foreground">
                    {show.status === 'draft' ? 'Plakat genereres når lineup er bekreftet.' : 'Ingen plakat generert ennå.'}
                  </div>
                )}
              </div>

              {(marketingTasks ?? []).length > 0 && (
                <div className="rounded-xl border bg-card divide-y">
                  <div className="px-4 py-2.5 font-semibold text-sm border-b bg-muted/20">Sjekkliste</div>
                  {(marketingTasks ?? []).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`size-5 rounded border-2 shrink-0 flex items-center justify-center text-[10px] ${task.is_completed ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                        {task.is_completed && '✓'}
                      </div>
                      <span className={`text-sm ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>{task.label ?? task.task_key}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-5 space-y-2">
                <h2 className="font-semibold text-sm">Facebook-tekst</h2>
                <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-sans select-all leading-relaxed">{[
                  `🎭 ${show.title}`,
                  ``,
                  `📅 ${show.date}${show.start_time ? ` kl. ${show.start_time}` : ''}`,
                  `📍 ${showLocation ?? 'Sted TBA'}`,
                  ``,
                  activeLineup.length > 0 ? `Lineup:\n${activeLineup.map(s => `• ${artistMap[s.artist_id]?.full_name ?? '?'}`).join('\n')}` : null,
                  ``,
                  `🎟️ Billetter: ${process.env.APP_URL ?? 'https://humor.events'}/events/${show.slug}`,
                ].filter(Boolean).join('\n')}</pre>
              </div>

              <div className="rounded-xl border bg-card p-5 space-y-2">
                <h2 className="font-semibold text-sm">E-posttekst</h2>
                <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-sans select-all leading-relaxed">{[
                  `Emne: ${show.title} – ${show.date}`,
                  ``,
                  `Hei!`,
                  ``,
                  `Vi inviterer til ${show.title}${showLocation ? ` på ${showLocation}` : ''}, ${show.date}${show.start_time ? ` kl. ${show.start_time}` : ''}.`,
                  ``,
                  activeLineup.length > 0 ? `Lineup:\n${activeLineup.map(s => `• ${artistMap[s.artist_id]?.full_name ?? '?'}`).join('\n')}\n` : null,
                  `Kjøp billetter her:`,
                  `${process.env.APP_URL ?? 'https://humor.events'}/events/${show.slug}`,
                ].filter(Boolean).join('\n')}</pre>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TICKETS ══════════════════ */}
        {tab === 'tickets' && (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Ticket code</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(tickets ?? []).map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{t.ticket_code}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? ''}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tickets?.length && (
              <p className="text-center py-12 text-muted-foreground text-sm">Ingen billetter solgt ennå.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
