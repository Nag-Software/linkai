import { AdminHeader } from '@/components/admin/admin-header'
import { ToastActionForm } from '@/components/toast-action-form'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { cloneShowAction, createShowAction } from '../actions'
import { ARTIST_ROLE_LABEL_OPTIONS, canonicalRoleLabel } from '@/lib/artist-roles'
import type { ShowRequirement } from '@/types/database'

export default async function NewShowPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  if (from) {
    const db = createAdminClient()
    const [{ data: template }, { data: requirements }] = await Promise.all([
      db.from('shows').select('*').eq('id', from).single(),
      db.from('show_requirements').select('*').eq('show_id', from).order('lineup_position').order('created_at'),
    ])

    if (template) {
      return (
        <div>
          <AdminHeader
            title="Nytt event fra mal"
            description={`Kloner: ${template.title}`}
            actions={
              <Link href="/admin-app/shows/new" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Velg annen mal
              </Link>
            }
          />
          <div className="mx-auto max-w-4xl px-6 py-6 md:px-8 md:py-8">
            <ToastActionForm action={cloneShowAction} className="space-y-6">
              <input type="hidden" name="template_id" value={template.id} />

              {/* Show details */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
                <div className="mb-5 space-y-1">
                  <h2 className="font-semibold text-sm">Eventdetaljer</h2>
                  <p className="text-sm text-muted-foreground">Juster navn, dato og praktiske detaljer før eventet opprettes.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field name="title" label="Tittel *" required defaultValue={template.title} />
                  <Field name="slug" label="Slug *" required placeholder={`${template.slug}-2`} />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field name="date" label="Dato *" type="date" required />
                  <Field name="start_time" label="Start" type="time" defaultValue={(template.start_time ?? '').slice(0, 5)} />
                  <Field name="end_time" label="Slutt" type="time" defaultValue={(template.end_time ?? '').slice(0, 5)} />
                </div>
                <div className="mt-4">
                  <Field name="venue_address" label="Sted / adresse" defaultValue={template.venue_address ?? ''} />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field name="capacity" label="Kapasitet" type="number" min={1} defaultValue={template.capacity?.toString() ?? ''} />
                  <Field name="ticket_price" label="Billettpris (kr)" type="number" min={0} step={0.01}
                    defaultValue={template.ticket_price ? String(template.ticket_price / 100) : ''} />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Valuta</label>
                    <select name="currency" defaultValue={template.currency}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="NOK">NOK</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Requirements / lineup */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold text-sm">Line-up krav</h2>
                    <p className="text-sm text-muted-foreground">Eksisterende roller fra malen blir med videre og kan finjusteres senere.</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{requirements?.length ?? 0} roller</span>
                </div>
                {(requirements ?? []).length > 0 ? (
                  <div className="space-y-3">
                    {(requirements as ShowRequirement[]).map((req, i) => (
                      <RequirementRow key={req.id} req={req} index={i} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ingen krav definert på malen.</p>
                )}
              </div>

              <button type="submit"
                className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Book event →
              </button>
            </ToastActionForm>
          </div>
        </div>
      )
    }
  }

  // Template picker + blank option
  const db = createAdminClient()
  const { data: shows } = await db
    .from('shows')
    .select('id, title, date, venue_address, venue_name')
    .order('date', { ascending: false })
    .limit(30)

  return (
    <div>
      <AdminHeader
        title="Nytt show"
        description="Velg en mal eller start blankt"
        actions={
          <Link href="/admin-app/shows" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Tilbake
          </Link>
        }
      />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6 md:px-8 md:py-8">
        {/* Blank show */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 space-y-1">
            <h2 className="font-semibold text-sm">Blank show</h2>
            <p className="text-sm text-muted-foreground">Start fra bunnen av med de viktigste detaljene først.</p>
          </div>
          <ToastActionForm action={createShowAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field name="title" label="Tittel *" required />
              <Field name="slug" label="Slug *" required placeholder="mitt-show-2026" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field name="date" label="Dato *" type="date" required />
              <Field name="start_time" label="Start" type="time" />
              <Field name="end_time" label="Slutt" type="time" />
            </div>
            <Field name="venue_address" label="Sted / adresse" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field name="capacity" label="Kapasitet" type="number" min={1} />
              <Field name="ticket_price" label="Billettpris (kr)" type="number" min={0} step={0.01} placeholder="199" />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Valuta</label>
                <select name="currency" defaultValue="NOK"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="NOK">NOK</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <button type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Opprett show
            </button>
          </ToastActionForm>
        </div>

        {/* Template picker */}
        {(shows ?? []).length > 0 && (
          <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-5 space-y-1">
              <h2 className="font-semibold text-sm">Klon fra eksisterende show</h2>
              <p className="text-sm text-muted-foreground">Bruk et tidligere show som utgangspunkt for å spare tid.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(shows ?? []).map(s => (
                <Link
                  key={s.id}
                  href={`/admin-app/shows/new?from=${s.id}`}
                  className="group rounded-xl border bg-background/80 p-4 transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.date}{(s.venue_address ?? s.venue_name) ? ` · ${s.venue_address ?? s.venue_name}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RequirementRow({ req, index }: { req: ShowRequirement; index: number }) {
  const prefix = `req_${index}`
  return (
    <div className="grid grid-cols-1 items-end gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-6">
      <input type="hidden" name={`${prefix}_id`} value={req.id} />
      <input type="hidden" name={`${prefix}_lineup_position`} value={req.lineup_position} />
      <input type="hidden" name={`${prefix}_compensation_type`} value={req.compensation_type ?? ''} />
      <input type="hidden" name={`${prefix}_compensation_amount`} value={req.compensation_amount != null ? String(req.compensation_amount / 100) : ''} />
      <input type="hidden" name={`${prefix}_compensation_percent`} value={req.compensation_percent != null ? String(req.compensation_percent) : ''} />
      <div className="space-y-1.5 md:col-span-2">
        <label className="text-xs font-medium text-muted-foreground">Rolle</label>
        <select name={`${prefix}_role_name`} defaultValue={canonicalRoleLabel(req.role_name) ?? ARTIST_ROLE_LABEL_OPTIONS[0]}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {ARTIST_ROLE_LABEL_OPTIONS.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Antall</label>
        <input name={`${prefix}_quantity`} type="number" min={1} defaultValue={req.quantity}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Energi</label>
        <select name={`${prefix}_energy_level`} defaultValue={req.energy_level}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="any">Alle</option>
          <option value="high">Høy</option>
          <option value="low">Lav</option>
          <option value="uncertain">Usikker</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Score</label>
        <input name={`${prefix}_min_score`} type="number" min={1} max={10} defaultValue={req.min_score ?? ''}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Kjønn</label>
        <select name={`${prefix}_required_gender`} defaultValue={req.required_gender}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="any">Alle</option>
          <option value="male">Mann</option>
          <option value="female">Dame</option>
        </select>
      </div>
    </div>
  )
}

function Field({ name, label, required, type = 'text', placeholder, min, step, defaultValue }: {
  name: string; label: string; required?: boolean; type?: string
  placeholder?: string; min?: number; step?: number; defaultValue?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input name={name} type={type} required={required} placeholder={placeholder}
        min={min} step={step} defaultValue={defaultValue}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  )
}
