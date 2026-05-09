import { ArtistHeader } from '@/components/artist/artist-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToastActionForm } from '@/components/toast-action-form'
import { toggleAvailabilityAction } from '../actions'
import { getCurrentArtist } from '@/lib/artist-portal'

export default async function AvailableDatesPage() {
  const { artist, db } = await getCurrentArtist()
  const canChooseDates = artist.status === 'approved' && (artist.admin_score ?? 0) >= 6
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: shows }, { data: availability }] = await Promise.all([
    db.from('shows').select('id, title, date, venue_name, status').gte('date', today).in('status', ['booking', 'published']).order('date'),
    db.from('artist_availability').select('*').eq('artist_id', artist.id).gte('available_date', today).order('available_date'),
  ])

  const selected = new Set((availability ?? []).map((item) => item.available_date))
  const selectedCount = selected.size

  return (
    <>
      <ArtistHeader title="Tilgjengelighet" description={`${selectedCount}/3 prioriterte datoer`} />
      <main className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Prioriterte showdatoer</CardTitle>
            <CardDescription>Velg opptil tre datoer du helst vil bookes på.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(shows ?? []).map((show) => {
              const checked = selected.has(show.date)
              const disabled = !canChooseDates || (!checked && selectedCount >= 3)
              return (
                <ToastActionForm key={show.id} action={toggleAvailabilityAction} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <input type="hidden" name="available_date" value={show.date} />
                  <div>
                    <div className="font-medium">{formatDate(show.date)}</div>
                    <div className="text-sm text-muted-foreground">{show.title} {show.venue_name ? `· ${show.venue_name}` : ''}</div>
                  </div>
                  <Button type="submit" variant={checked ? 'default' : 'outline'} disabled={disabled}>{checked ? 'Valgt' : 'Velg'}</Button>
                </ToastActionForm>
              )
            })}
            {(shows ?? []).length === 0 && <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Ingen kommende showdatoer er åpne for booking.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Regler</CardTitle>
            <CardDescription>{canChooseDates ? 'Du kan velge datoer.' : 'Profilen må være godkjent med score 6 eller høyere.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg bg-muted p-3">Maks 3 fremtidige datoer kan prioriteres samtidig.</div>
            <div className="rounded-lg bg-muted p-3">Systemet prioriterer valgte datoer, men kan fortsatt sende tilbud hvis du matcher et show.</div>
            <div className="rounded-lg bg-muted p-3">Godkjenn kun datoer som passer. Hvis du takker ja og senere dropper, kan profilen flagges og nedprioriteres.</div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}