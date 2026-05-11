import { redirect } from 'next/navigation'

export default async function ArtistSettingsPage() {
  redirect('/artist-app/profile')
}