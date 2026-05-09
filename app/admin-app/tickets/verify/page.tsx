import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { CheckCircle2, CircleAlert, Search, TicketCheck, XCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToastActionForm } from '@/components/toast-action-form'

type SearchParams = {
  code?: string
  checked?: string
}

async function checkInTicketAction(formData: FormData) {
  'use server'

  const code = String(formData.get('code') ?? '').trim()
  if (!code) redirect('/admin-app/tickets/verify')

  const db = createAdminClient()
  await db
    .from('tickets')
    .update({ status: 'used', checked_in_at: new Date().toISOString() })
    .eq('ticket_code', code)
    .eq('status', 'valid')

  revalidatePath('/admin-app/tickets')
  revalidatePath('/admin-app/tickets/verify')
  redirect(`/admin-app/tickets/verify?code=${encodeURIComponent(code)}&checked=1`)
}

export default async function VerifyTicketPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { code = '', checked } = await searchParams
  const normalizedCode = code.trim()
  const ticketData = normalizedCode ? await getTicketData(normalizedCode) : null

  return (
    <div>
      <AdminHeader title="Verifiser billett" description="Scan QR-kode eller søk opp billettkode" />
      <main className="p-6">
        <section className="mx-auto grid max-w-3xl gap-5">
          <form action="/admin-app/tickets/verify" className="flex gap-2 rounded-lg border bg-card p-3 shadow-sm">
            <Input name="code" defaultValue={normalizedCode} placeholder="Billettkode" className="font-mono" />
            <Button type="submit" variant="outline"><Search className="size-4" /> Søk</Button>
          </form>

          {!normalizedCode && (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              <TicketCheck className="mx-auto size-10 text-muted-foreground/70" />
              <p className="mt-3 text-sm">Scan QR-koden på billetten, eller lim inn billettkoden manuelt.</p>
            </div>
          )}

          {normalizedCode && !ticketData && (
            <TicketStatusCard
              tone="danger"
              icon={<XCircle className="size-10" />}
              title="Billetten ble ikke funnet"
              description="Kontroller at QR-koden eller billettkoden er riktig."
              code={normalizedCode}
            />
          )}

          {ticketData && (
            <TicketDetails data={ticketData} checked={checked === '1'} />
          )}
        </section>
      </main>
    </div>
  )
}

async function getTicketData(code: string) {
  const db = createAdminClient()
  const { data: ticket } = await db
    .from('tickets')
    .select('id, ticket_code, status, checked_in_at, created_at, show_id, order_id')
    .eq('ticket_code', code)
    .maybeSingle()

  if (!ticket) return null

  const [{ data: show }, { data: order }] = await Promise.all([
    db
      .from('shows')
      .select('title, date, start_time, venue_name, venue_address')
      .eq('id', ticket.show_id)
      .maybeSingle(),
    db
      .from('orders')
      .select('buyer_name, buyer_email, amount_total, currency, status')
      .eq('id', ticket.order_id)
      .maybeSingle(),
  ])

  return { ticket, show, order }
}

function TicketDetails({
  data,
  checked,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getTicketData>>>
  checked: boolean
}) {
  const { ticket, show, order } = data
  const isValid = ticket.status === 'valid'
  const isUsed = ticket.status === 'used'
  const isBlocked = ticket.status === 'refunded' || ticket.status === 'cancelled'
  const statusLabel = isValid ? 'Gyldig billett' : isUsed ? 'Allerede brukt' : isBlocked ? 'Ikke gyldig' : ticket.status

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className={`${isValid ? 'bg-emerald-600' : isUsed ? 'bg-zinc-700' : 'bg-red-600'} p-6 text-white`}>
        <div className="flex items-start gap-4">
          {isValid ? <CheckCircle2 className="size-11" /> : isUsed ? <CircleAlert className="size-11" /> : <XCircle className="size-11" />}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-white/75">{statusLabel}</p>
            <h2 className="mt-1 text-3xl font-semibold">{show?.title ?? 'Ukjent arrangement'}</h2>
            {checked && <p className="mt-2 text-sm text-white/85">Billetten ble nettopp sjekket inn.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-[1fr_220px]">
        <div className="grid gap-4">
          <Info label="Billettkode" value={ticket.ticket_code} mono />
          <Info label="Kunde" value={order?.buyer_name || order?.buyer_email || 'Ikke registrert'} />
          <Info label="E-post" value={order?.buyer_email ?? 'Ikke registrert'} />
          <Info label="Dato" value={formatDate(show?.date)} />
          <Info label="Tid" value={show?.start_time?.slice(0, 5) ?? 'Tid kommer'} />
          <Info label="Sted" value={[show?.venue_name, show?.venue_address].filter(Boolean).join(', ') || 'Sted kommer'} />
          {ticket.checked_in_at && <Info label="Sjekket inn" value={formatDateTime(ticket.checked_in_at)} />}
        </div>

        <aside className="rounded-lg border bg-muted/40 p-4">
          <div className="text-sm font-medium">Innsjekk</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isValid
              ? 'Bekreft når gjesten står i døren.'
              : isUsed
                ? 'Denne billetten er allerede brukt.'
                : 'Denne billetten skal ikke slippes inn.'}
          </p>
          <ToastActionForm action={checkInTicketAction} className="mt-4">
            <input type="hidden" name="code" value={ticket.ticket_code} />
            <Button type="submit" className="w-full" disabled={!isValid}>
              <TicketCheck className="size-4" /> Sjekk inn
            </Button>
          </ToastActionForm>
        </aside>
      </div>
    </div>
  )
}

function TicketStatusCard({
  tone,
  icon,
  title,
  description,
  code,
}: {
  tone: 'danger'
  icon: React.ReactNode
  title: string
  description: string
  code: string
}) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
      <div className={tone === 'danger' ? 'text-red-600' : 'text-muted-foreground'}>{icon}</div>
      <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 rounded-lg bg-muted p-3 font-mono text-sm break-all">{code}</div>
    </div>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? 'mt-1 font-mono text-sm break-all' : 'mt-1 text-sm font-medium'}>{value}</div>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return 'Dato kommer'
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}