'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendArtistRegisteredEmail } from '@/lib/email/mailer'
import { runArtistAiAssessment } from '@/lib/actions/ai'
import { runAutomaticBookingForOpenShows } from '@/lib/actions/booking'
import { runAfterResponse } from '@/lib/background'

export interface RegisterArtistInput {
  email: string
  password: string
  full_name: string
  stage_name?: string
  phone?: string
  bio?: string
  category?: string
  language?: string
  social_links?: Record<string, string>
  consent_ai_research: boolean
  profile_image_file?: File
}

/**
 * 6.1 Artist registration
 * Creates Auth user → profile → artist → AI assessment → sends email → triggers AI job
 */
export async function registerArtist(input: RegisterArtistInput) {
  const admin = createAdminClient()
  const normalizedEmail = input.email.trim().toLowerCase()

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: input.password,
    // We do not run a separate email verification flow in MVP.
    email_confirm: true,
  })
  if (authError || !authData.user) {
    throw new Error(authError?.message ?? 'Failed to create auth user')
  }
  const authUserId = authData.user.id

  try {
    // 2. Create profile with role = artist
    const { error: profileError } = await admin.from('profiles').insert({
      auth_user_id: authUserId,
      email: normalizedEmail,
      full_name: input.full_name,
      role: 'artist',
    })
    if (profileError) throw new Error(profileError.message)

    // 3. Upload profile image if provided
    let profile_image_url: string | undefined
    if (input.profile_image_file) {
      const ext = input.profile_image_file.name.split('.').pop()
      const path = `${authUserId}/profile.${ext}`
      const { error: uploadError } = await admin.storage
        .from('artist-images')
        .upload(path, input.profile_image_file, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = admin.storage.from('artist-images').getPublicUrl(path)
        profile_image_url = urlData.publicUrl
      }
    }

    // 4. Create artist with status = pending_review
    const { data: artist, error: artistError } = await admin.from('artists').insert({
      auth_user_id: authUserId,
      full_name: input.full_name,
      stage_name: input.stage_name ?? null,
      email: normalizedEmail,
      phone: input.phone ?? null,
      profile_image_url: profile_image_url ?? null,
      bio: input.bio ?? null,
      category: input.category ?? null,
      language: input.language ?? null,
      social_links: input.social_links ?? null,
      consent_ai_research: input.consent_ai_research,
      status: 'pending_review',
    }).select('id').single()
    if (artistError || !artist) throw new Error(artistError?.message ?? 'Failed to create artist')

    // 5. Create AI assessment with status = pending
    const { error: assessError } = await admin.from('artist_ai_assessments').insert({
      artist_id: artist.id,
      ai_status: 'pending',
    })
    if (assessError) throw new Error(assessError.message)

    // 6. Send registration confirmation email
    await sendArtistRegisteredEmail({ email: normalizedEmail, full_name: input.full_name })

    // 7. Trigger AI research (fire-and-forget — do not await)
    if (input.consent_ai_research) {
      runArtistAiAssessment(artist.id).catch(console.error)
    }

    return { artistId: artist.id }
  } catch (err) {
    // Clean up auth user if later steps fail
    await admin.auth.admin.deleteUser(authUserId)
    throw err
  }
}

/**
 * 6.3 Approve artist
 */
export async function approveArtist(
  artistId: string,
  opts: {
    admin_score: number
    admin_energy_level: 'high' | 'low' | 'uncertain'
    admin_tags?: string[]
    admin_notes?: string
  }
) {
  const { sendArtistApprovedEmail } = await import('@/lib/email/mailer')
  const admin = createAdminClient()

  const { data: artist, error } = await admin
    .from('artists')
    .update({
      status: 'approved',
      admin_score: opts.admin_score,
      admin_energy_level: opts.admin_energy_level,
      admin_tags: opts.admin_tags ?? null,
      admin_notes: opts.admin_notes ?? null,
    })
    .eq('id', artistId)
    .select('email, full_name, admin_score')
    .single()

  if (error || !artist) throw new Error(error?.message ?? 'Artist not found')

  if ((artist.admin_score ?? 0) > 6) {
    const artistAppUrl = process.env.ARTIST_APP_URL ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/artist-app`
    runAfterResponse(`approve-artist-${artistId}`, async () => {
      await sendArtistApprovedEmail({
        email: artist.email,
        full_name: artist.full_name,
        portal_url: `${artistAppUrl.replace(/\/$/, '')}/available-dates`,
      })

      try {
        await runAutomaticBookingForOpenShows()
      } catch (bookingError) {
        console.error('[BookingAutomation] Failed after artist approval:', bookingError)
      }
    })
  }
}
