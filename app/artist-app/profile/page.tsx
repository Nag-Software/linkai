import Image from 'next/image'
import { ArtistHeader } from '@/components/artist/artist-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToastActionForm } from '@/components/toast-action-form'
import { updateArtistProfileAction } from '../actions'
import { getCurrentArtist } from '@/lib/artist-portal'

export default async function ArtistProfilePage() {
  const { artist } = await getCurrentArtist()
  const links = artist.social_links ?? {}

  return (
    <>
      <ArtistHeader title="Profil" description="Offentlig artistprofil" />
      <main className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Profilinformasjon</CardTitle>
            <CardDescription>Feltene brukes i booking og offentlig presentasjon.</CardDescription>
          </CardHeader>
          <CardContent>
            <ToastActionForm action={updateArtistProfileAction} encType="multipart/form-data" className="grid gap-4" successMessage="Profilen er lagret.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fullt navn"><Input name="full_name" defaultValue={artist.full_name} required /></Field>
                <Field label="Scenenavn"><Input name="stage_name" defaultValue={artist.stage_name ?? ''} /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Telefon"><Input name="phone" type="tel" defaultValue={artist.phone ?? ''} /></Field>
                <Field label="Profilbilde"><Input name="profile_image_file" type="file" accept="image/png,image/jpeg,image/webp" /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kategori"><Select name="category" defaultValue={artist.category ?? 'Standup'} options={['Standup', 'Impro', 'Musikk', 'Revy', 'Sketsj', 'Annet']} /></Field>
                <Field label="Språk"><Select name="language" defaultValue={artist.language ?? 'Norsk'} options={['Norsk', 'Engelsk', 'Begge']} /></Field>
              </div>
              <Field label="Bio">
                <textarea name="bio" defaultValue={artist.bio ?? ''} rows={7} className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Instagram"><Input name="instagram" type="url" defaultValue={links.instagram ?? ''} placeholder="https://" /></Field>
                <Field label="TikTok"><Input name="tiktok" type="url" defaultValue={links.tiktok ?? ''} placeholder="https://" /></Field>
                <Field label="YouTube"><Input name="youtube" type="url" defaultValue={links.youtube ?? ''} placeholder="https://" /></Field>
                <Field label="Facebook"><Input name="facebook" type="url" defaultValue={links.facebook ?? ''} placeholder="https://" /></Field>
                <Field label="Nettside"><Input name="website" type="url" defaultValue={links.website ?? ''} placeholder="https://" /></Field>
              </div>
              <Button type="submit" className="w-fit">Lagre profil</Button>
            </ToastActionForm>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          {artist.profile_image_url && (
            <Card>
              <div className="relative aspect-square w-full overflow-hidden">
                <Image src={artist.profile_image_url} alt={artist.stage_name ?? artist.full_name} fill className="object-cover" />
              </div>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Bookingstatus</CardTitle>
              <CardDescription>Dette avgjør om profilen kan matches automatisk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ReadOnly label="Status" value={artist.status === 'approved' ? 'Godkjent' : 'Under vurdering'} />
              <ReadOnly label="Kan bookes" value={artist.status === 'approved' && (artist.admin_score ?? 0) >= 6 ? 'Ja' : 'Ikke ennå'} />
            </CardContent>
          </Card>
        </aside>
      </main>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium"><span>{label}</span>{children}</label>
}

function Select({ name, defaultValue, options }: { name: string; defaultValue: string; options: string[] }) {
  return <select name={name} defaultValue={defaultValue} className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">{options.map((option) => <option key={option}>{option}</option>)}</select>
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"><span className="text-muted-foreground">{label}</span><strong>{value}</strong></div>
}