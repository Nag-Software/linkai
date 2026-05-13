import Link from 'next/link'
import { AdminHeader } from '@/components/admin/admin-header'
import { ToastActionForm } from '@/components/toast-action-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createArtistAction } from './actions'

export default function NewArtistPage() {
  return (
    <div>
      <AdminHeader
        title="Ny komiker"
        description="Opprett en ny komikerkonto manuelt"
        actions={
          <Link href="/admin-app/artists" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Tilbake
          </Link>
        }
      />
      <div className="p-6 max-w-xl">
        <section className="rounded-xl border bg-card p-6">
          <ToastActionForm action={createArtistAction} className="space-y-4" successMessage="Komiker opprettet!">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Fullt navn *</Label>
                <Input id="full_name" name="full_name" required placeholder="Kari Nordmann" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stage_name">Scenenavn</Label>
                <Input id="stage_name" name="stage_name" placeholder="Kari" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-post *</Label>
              <Input id="email" name="email" type="email" required placeholder="kari@eksempel.no" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Passord</Label>
              <Input id="password" name="password" type="password" placeholder="La stå tom hvis bruker finnes fra før" />
              <p className="text-xs text-muted-foreground">Påkrevd kun for nye brukere. Eksisterende auth-brukere kan knyttes uten passord.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" placeholder="+47 900 00 000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language">Språk</Label>
                <Input id="language" name="language" placeholder="Norsk" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Kategori</Label>
              <Input id="category" name="category" placeholder="Stand-up / improv / TV-komedie..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                placeholder="Kort artistbeskrivelse..."
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="consent_ai_research">AI-samtykke</Label>
              <select
                id="consent_ai_research"
                name="consent_ai_research"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="false">Nei</option>
                <option value="true">Ja</option>
              </select>
            </div>

            <Button type="submit" className="w-full">Opprett artist</Button>
          </ToastActionForm>
        </section>
      </div>
    </div>
  )
}
