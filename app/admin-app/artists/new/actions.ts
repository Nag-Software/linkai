'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { registerArtist } from '@/lib/actions/artist'
import { runArtistAiAssessment } from '@/lib/actions/ai'
import { sendArtistRegisteredEmail } from '@/lib/email/mailer'

export async function createArtistAction(formData: FormData) {
  const email = (formData.get('email') as string).trim()
  const password = (formData.get('password') as string).trim()
  const full_name = (formData.get('full_name') as string).trim()
  const stage_name = (formData.get('stage_name') as string).trim() || undefined
  const phone = (formData.get('phone') as string).trim() || undefined
  const bio = (formData.get('bio') as string).trim() || undefined
  const category = (formData.get('category') as string).trim() || undefined
  const language = (formData.get('language') as string).trim() || undefined
  const consent_ai_research = formData.get('consent_ai_research') === 'true'

  if (!email || !full_name) throw new Error('E-post og navn er påkrevd')

  const admin = createAdminClient()

  // Check if a user with this email already exists in Supabase Auth
  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existingAuthUser = existingUsers?.users?.find(u => u.email === email)

  let artistId: string

  if (existingAuthUser) {
    // User already exists in Auth — create only the artist record
    const { data: artist, error: artistError } = await admin.from('artists').insert({
      auth_user_id: existingAuthUser.id,
      full_name,
      stage_name: stage_name ?? null,
      email,
      phone: phone ?? null,
      bio: bio ?? null,
      category: category ?? null,
      language: language ?? null,
      consent_ai_research,
      status: 'pending_review',
    }).select('id').single()

    if (artistError || !artist) throw new Error(artistError?.message ?? 'Kunne ikke opprette artist')
    artistId = artist.id

    // Ensure there's an AI assessment row
    await admin.from('artist_ai_assessments').upsert({
      artist_id: artistId,
      ai_status: 'pending',
    }, { onConflict: 'artist_id', ignoreDuplicates: true })

    await sendArtistRegisteredEmail({ email, full_name })

    if (consent_ai_research) {
      runArtistAiAssessment(artistId).catch(console.error)
    }
  } else {
    if (!password) throw new Error('Passord er påkrevd for ny bruker')
    const result = await registerArtist({
      email,
      password,
      full_name,
      stage_name,
      phone,
      bio,
      category,
      language,
      consent_ai_research,
    })
    artistId = result.artistId
  }

  revalidatePath('/admin-app/artists')
  redirect(`/admin-app/artists/${artistId}`)
}
