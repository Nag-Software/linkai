'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { approveArtist } from '@/lib/actions/artist'
import { runArtistAiAssessment } from '@/lib/actions/ai'
import { runAfterResponse } from '@/lib/background'
import type { Artist, EnergyLevel, ArtistStatus } from '@/types/database'

export async function saveArtistAdminReview(formData: FormData) {
  const artistId = formData.get('artist_id') as string
  const db = createAdminClient()

  const tagsRaw = (formData.get('admin_tags') as string ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const energyRaw = ((formData.get('admin_energy_level') as string) || null) as EnergyLevel | null
  const statusRaw = (formData.get('status') as string) as ArtistStatus

  await db.from('artists').update({
    admin_score: formData.get('admin_score') ? Number(formData.get('admin_score')) : null,
    admin_energy_level: energyRaw,
    admin_tags: tagsRaw.length ? tagsRaw : null,
    admin_notes: (formData.get('admin_notes') as string) || null,
    status: statusRaw,
    is_flagged: formData.get('is_flagged') === 'true',
    flag_reason: (formData.get('flag_reason') as string) || null,
  }).eq('id', artistId)

  revalidatePath(`/admin-app/artists/${artistId}`)
}

export async function approveArtistAction(formData: FormData) {
  const artistId = formData.get('artist_id') as string
  const score = Number(formData.get('admin_score') ?? 0)
  const energy = (((formData.get('admin_energy_level') as string) || 'uncertain') as EnergyLevel)
  await approveArtist(artistId, { admin_score: score, admin_energy_level: energy })
  revalidatePath(`/admin-app/artists/${artistId}`)
}

export async function rejectArtistAction(formData: FormData) {
  const artistId = formData.get('artist_id') as string
  const db = createAdminClient()
  await db.from('artists').update({ status: 'rejected' }).eq('id', artistId)
  revalidatePath(`/admin-app/artists/${artistId}`)
}

export async function rerunAiAction(formData: FormData) {
  const artistId = formData.get('artist_id') as string
  const db = createAdminClient()
  await db.from('artist_ai_assessments').upsert({
    artist_id: artistId,
    ai_status: 'pending',
    ai_last_checked_at: new Date().toISOString(),
  }, { onConflict: 'artist_id', ignoreDuplicates: false })
  runAfterResponse(`artist-ai-${artistId}`, async () => {
    await runArtistAiAssessment(artistId)
    revalidatePath(`/admin-app/artists/${artistId}`)
  })
  revalidatePath(`/admin-app/artists/${artistId}`)
}

export async function applyAiSuggestion(formData: FormData) {
  const artistId = formData.get('artist_id') as string
  const db = createAdminClient()
  const { data: ai } = await db
    .from('artist_ai_assessments')
    .select('ai_score_suggestion, ai_energy_suggestion, ai_tags_suggestion')
    .eq('artist_id', artistId)
    .single()
  if (ai) {
    await db.from('artists').update({
      admin_score: ai.ai_score_suggestion,
      admin_energy_level: ai.ai_energy_suggestion,
      admin_tags: ai.ai_tags_suggestion,
    }).eq('id', artistId)
  }
  revalidatePath(`/admin-app/artists/${artistId}`)
}

export async function updateArtistProfile(formData: FormData) {
  const artistId = formData.get('artist_id') as string
  if (!artistId) throw new Error('Mangler artist_id')
  const db = createAdminClient()

  const socialLinksRaw = formData.get('social_links') as string | null
  let social_links: Record<string, string> | null = null
  if (socialLinksRaw) {
    try { social_links = JSON.parse(socialLinksRaw) } catch { social_links = null }
  }

  const update: Partial<Artist> = {}
  if (formData.has('full_name')) update.full_name = (formData.get('full_name') as string).trim()
  if (formData.has('stage_name')) update.stage_name = (formData.get('stage_name') as string).trim() || null
  if (formData.has('email')) update.email = (formData.get('email') as string).trim()
  if (formData.has('phone')) update.phone = (formData.get('phone') as string).trim() || null
  if (formData.has('category')) update.category = (formData.get('category') as string).trim() || null
  if (formData.has('language')) update.language = (formData.get('language') as string).trim() || null
  if (formData.has('bio')) update.bio = (formData.get('bio') as string).trim() || null
  if (formData.has('consent_ai_research')) update.consent_ai_research = formData.get('consent_ai_research') === 'true'
  if (formData.has('social_links')) update.social_links = social_links

  await db.from('artists').update(update).eq('id', artistId)
  revalidatePath(`/admin-app/artists/${artistId}`)
}

export async function deleteArtistAction(formData: FormData) {
  const artistId = formData.get('artist_id') as string
  const db = createAdminClient()
  await db.from('artists').delete().eq('id', artistId)
  revalidatePath('/admin-app/artists')
  redirect('/admin-app/artists')
}
