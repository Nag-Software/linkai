'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { approveArtist } from '@/lib/actions/artist'
import { runArtistAiAssessment } from '@/lib/actions/ai'
import type { EnergyLevel, ArtistStatus } from '@/types/database'

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
  await runArtistAiAssessment(artistId)
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
