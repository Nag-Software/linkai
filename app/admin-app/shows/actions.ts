'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createShow, updateShowStatus } from '@/lib/actions/shows'
import { acceptBookingOfferById, automateFullbookedShow, bookShow, cancelConfirmedSpotForOffer, runAutomaticBookingForShow, sendFallbackOffersForShow } from '@/lib/actions/booking'
import { generateShowPoster } from '@/lib/actions/ai'
import { runAfterResponse } from '@/lib/background'
import type { BookingOfferStatus, ConfirmedSpotStatus, RequirementEnergy, RequirementGender, ShowStatus } from '@/types/database'

export type ManualSpotActionState = {
  status: 'idle' | 'success' | 'error'
  message: string | null
  submittedAt: number | null
}

function manualSpotState(status: ManualSpotActionState['status'], message: string): ManualSpotActionState {
  return { status, message, submittedAt: Date.now() }
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function optionalInteger(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? Number(text) : null
}

function optionalMoneyToMinor(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim().replace(',', '.')
  return text.length > 0 ? Math.round(Number(text) * 100) : null
}

function tagsFromForm(value: FormDataEntryValue | null) {
  const tags = String(value ?? '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)

  return tags.length > 0 ? tags : null
}

function scheduleShowAutomation(showId: string, reason: string) {
  runAfterResponse(`show-automation-${reason}-${showId}`, async () => {
    await runAutomaticBookingForShow(showId)
    revalidatePath(`/admin-app/shows/${showId}`)
    revalidatePath('/admin-app/bookings')
    revalidatePath('/admin-app')
  })
}

function scheduleFullbookedAutomation(showId: string, reason: string) {
  runAfterResponse(`fullbooked-automation-${reason}-${showId}`, async () => {
    await automateFullbookedShow(showId)
    revalidatePath(`/admin-app/shows/${showId}`)
    revalidatePath('/admin-app/marketing')
    revalidatePath('/admin-app')
  })
}

export async function createShowAction(formData: FormData) {
  const input = {
    title: formData.get('title') as string,
    slug: formData.get('slug') as string,
    description: (formData.get('description') as string) || undefined,
    date: formData.get('date') as string,
    start_time: (formData.get('start_time') as string) || undefined,
    end_time: (formData.get('end_time') as string) || undefined,
    venue_address: (formData.get('venue_address') as string) || undefined,
    capacity: formData.get('capacity') ? Number(formData.get('capacity')) : undefined,
    ticket_price: formData.get('ticket_price') ? Math.round(Number(formData.get('ticket_price')) * 100) : undefined,
    currency: (formData.get('currency') as string) || 'NOK',
  }

  const show = await createShow(input)
  redirect(`/admin-app/shows/${show.id}`)
}

export async function cloneShowAction(formData: FormData) {
  const templateId = formData.get('template_id') as string
  const db = createAdminClient()

  // Create the new show
  const show = await createShow({
    title: formData.get('title') as string,
    slug: formData.get('slug') as string,
    date: formData.get('date') as string,
    start_time: optionalText(formData.get('start_time')) ?? undefined,
    end_time: optionalText(formData.get('end_time')) ?? undefined,
    venue_address: optionalText(formData.get('venue_address')) ?? undefined,
    capacity: optionalInteger(formData.get('capacity')) ?? undefined,
    ticket_price: optionalMoneyToMinor(formData.get('ticket_price')) ?? undefined,
    currency: optionalText(formData.get('currency')) ?? 'NOK',
  })

  // Collect requirements from indexed form fields (req_0_*, req_1_*, …)
  const newReqs: Array<{
    show_id: string
    role_name: string
    quantity: number
    min_score: number | null
    energy_level: RequirementEnergy
    required_gender: RequirementGender
    required_tags: string[] | null
  }> = []

  let i = 0
  while (formData.has(`req_${i}_role_name`)) {
    const roleName = String(formData.get(`req_${i}_role_name`) ?? '').trim()
    if (roleName) {
      newReqs.push({
        show_id: show.id,
        role_name: roleName,
        quantity: Math.max(1, Number(formData.get(`req_${i}_quantity`) ?? 1)),
        min_score: optionalInteger(formData.get(`req_${i}_min_score`)),
        energy_level: ((formData.get(`req_${i}_energy_level`) as RequirementEnergy | null) ?? 'any'),
        required_gender: ((formData.get(`req_${i}_required_gender`) as RequirementGender | null) ?? 'any'),
        required_tags: tagsFromForm(formData.get(`req_${i}_required_tags`)),
      })
    }
    i++
  }

  // If no requirements in form, copy from template
  if (newReqs.length === 0) {
    const { data: templateReqs } = await db
      .from('show_requirements')
      .select('role_name, quantity, min_score, energy_level, required_gender, required_tags')
      .eq('show_id', templateId)
    for (const r of templateReqs ?? []) {
      newReqs.push({
        show_id: show.id,
        role_name: r.role_name,
        quantity: r.quantity,
        min_score: r.min_score,
        energy_level: r.energy_level as RequirementEnergy,
        required_gender: ((r as { required_gender?: string }).required_gender as RequirementGender | undefined) ?? 'any',
        required_tags: r.required_tags,
      })
    }
  }

  if (newReqs.length > 0) {
    await db.from('show_requirements').insert(newReqs)
  }

  scheduleShowAutomation(show.id, 'clone-book')
  redirect(`/admin-app/shows/${show.id}?tab=lineup`)
}

export async function addRequirementAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  const db = createAdminClient()
  await db.from('show_requirements').insert({
    show_id: showId,
    role_name: formData.get('role_name') as string,
    quantity: Math.max(1, Number(formData.get('quantity') ?? 1)),
    min_score: optionalInteger(formData.get('min_score')),
    energy_level: ((formData.get('energy_level') as RequirementEnergy | null) ?? 'any'),
    required_gender: ((formData.get('required_gender') as RequirementGender | null) ?? 'any'),
    required_tags: tagsFromForm(formData.get('required_tags')),
  })
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function startBookingAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  scheduleShowAutomation(showId, 'manual-start')
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function sendFallbackOffersAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  runAfterResponse(`fallback-offers-${showId}`, async () => {
    await sendFallbackOffersForShow(showId)
    revalidatePath(`/admin-app/shows/${showId}`)
    revalidatePath('/admin-app/bookings')
  })
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function updateShowDetailsAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  const db = createAdminClient()

  const { error } = await db.from('shows').update({
    title: String(formData.get('title') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim(),
    description: optionalText(formData.get('description')),
    date: String(formData.get('date') ?? '').trim(),
    start_time: optionalText(formData.get('start_time')),
    end_time: optionalText(formData.get('end_time')),
    venue_name: null,
    venue_address: optionalText(formData.get('venue_address')),
    capacity: optionalInteger(formData.get('capacity')),
    ticket_price: optionalMoneyToMinor(formData.get('ticket_price')),
    currency: optionalText(formData.get('currency')) ?? 'NOK',
  }).eq('id', showId)

  if (error) throw new Error(error.message)
  scheduleShowAutomation(showId, 'update-show')
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function updateRequirementAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  const reqId = formData.get('req_id') as string
  const db = createAdminClient()

  const { error } = await db.from('show_requirements').update({
    role_name: String(formData.get('role_name') ?? '').trim(),
    quantity: Math.max(1, Number(formData.get('quantity') ?? 1)),
    min_score: optionalInteger(formData.get('min_score')),
    energy_level: ((formData.get('energy_level') as RequirementEnergy | null) ?? 'any'),
    required_gender: ((formData.get('required_gender') as RequirementGender | null) ?? 'any'),
    required_tags: tagsFromForm(formData.get('required_tags')),
  }).eq('id', reqId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function deleteRequirementAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  const reqId = formData.get('req_id') as string
  const db = createAdminClient()
  await db.from('show_requirements').delete().eq('id', reqId)
  scheduleFullbookedAutomation(showId, 'delete-requirement')
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function bookShowAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  const result = await bookShow(showId)
  if (result.offersCreated === 0) {
    throw new Error(result.candidatesMatched === 0
      ? 'Fant ingen godkjente artister som matcher score-, energi- og tagkravene.'
      : 'Ingen nye bookingtilbud ble sendt. Matchende artister har allerede fått tilbud eller er i lineupen.')
  }
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function publishShowAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  const db = createAdminClient()
  await db.from('shows').update({
    status: 'published',
    published_at: new Date().toISOString(),
  }).eq('id', showId)
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function updateShowStatusAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  const status = formData.get('status') as ShowStatus
  await updateShowStatus(showId, status)
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function updateOfferStatusAction(formData: FormData) {
  const offerId = formData.get('offer_id') as string
  const showId = formData.get('show_id') as string
  const status = formData.get('status') as BookingOfferStatus
  const db = createAdminClient()

  if (status === 'accepted') {
    await acceptBookingOfferById(offerId)
    revalidatePath(`/admin-app/shows/${showId}`)
    return
  }

  await cancelConfirmedSpotForOffer(offerId)

  const { error } = await db.from('booking_offers').update({
    status,
    responded_at: status === 'sent' ? null : new Date().toISOString(),
  }).eq('id', offerId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function cancelOfferAction(formData: FormData) {
  const offerId = formData.get('offer_id') as string
  const showId = formData.get('show_id') as string
  const db = createAdminClient()
  await db.from('booking_offers').update({ status: 'cancelled' }).eq('id', offerId)
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function removeSpotAction(formData: FormData) {
  const spotId = formData.get('spot_id') as string
  const showId = formData.get('show_id') as string
  const db = createAdminClient()
  await db.from('confirmed_spots').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', spotId)
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function addManualSpotAction(_prevState: ManualSpotActionState, formData: FormData): Promise<ManualSpotActionState> {
  const showId = formData.get('show_id') as string
  const artistId = formData.get('artist_id') as string
  const requirementId = formData.get('show_requirement_id') as string
  const feeAmount = optionalMoneyToMinor(formData.get('fee_amount'))
  const currency = optionalText(formData.get('currency')) ?? 'NOK'
  const db = createAdminClient()

  if (!showId || !artistId || !requirementId) {
    return manualSpotState('error', 'Velg artist og rolle før du legger til i lineup.')
  }

  const { data: existingSpot } = await db
    .from('confirmed_spots')
    .select('id')
    .eq('show_id', showId)
    .eq('artist_id', artistId)
    .in('status', ['confirmed', 'completed', 'paid'])
    .maybeSingle()

  if (existingSpot) return manualSpotState('error', 'Denne artisten er allerede i lineupen.')

  const [{ count: filled }, { data: requirement }] = await Promise.all([
    db.from('confirmed_spots')
      .select('*', { count: 'exact', head: true })
      .eq('show_requirement_id', requirementId)
      .in('status', ['confirmed', 'completed', 'paid']),
    db.from('show_requirements')
      .select('quantity')
      .eq('id', requirementId)
      .single(),
  ])

  if (requirement && (filled ?? 0) >= requirement.quantity) {
    return manualSpotState('error', 'Denne rollen er allerede fylt. Øk antall plasser eller fjern en artist først.')
  }

  const { data: spot, error } = await db.from('confirmed_spots').insert({
    show_id: showId,
    artist_id: artistId,
    show_requirement_id: requirementId,
    fee_amount: feeAmount,
    currency,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  }).select('id').single()

  if (error) return manualSpotState('error', error.message)

  if (spot && feeAmount !== null) {
    await db.from('artist_payouts').insert({
      artist_id: artistId,
      confirmed_spot_id: spot.id,
      show_id: showId,
      amount: feeAmount,
      currency,
      status: 'pending',
    })
  }

  await db.from('shows').update({ status: 'booking' }).eq('id', showId).in('status', ['draft'])
  scheduleFullbookedAutomation(showId, 'manual-spot')
  revalidatePath(`/admin-app/shows/${showId}`)
  return manualSpotState('success', 'Artisten ble lagt til i lineupen.')
}

export async function updateSpotAction(formData: FormData) {
  const spotId = formData.get('spot_id') as string
  const showId = formData.get('show_id') as string
  const status = formData.get('status') as ConfirmedSpotStatus
  const feeAmount = optionalMoneyToMinor(formData.get('fee_amount'))
  const db = createAdminClient()

  const { error } = await db.from('confirmed_spots').update({
    show_requirement_id: formData.get('show_requirement_id') as string,
    fee_amount: feeAmount,
    currency: optionalText(formData.get('currency')) ?? 'NOK',
    status,
    cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
    confirmed_at: status === 'confirmed' ? new Date().toISOString() : undefined,
  }).eq('id', spotId)

  if (error) throw new Error(error.message)
  scheduleFullbookedAutomation(showId, 'update-spot')
  revalidatePath(`/admin-app/shows/${showId}`)
}

export async function generatePosterAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  runAfterResponse(`generate-poster-${showId}`, async () => {
    await generatePosterForShow(showId)
    revalidatePath(`/admin-app/shows/${showId}`)
    revalidatePath('/admin-app/marketing')
  })
  revalidatePath(`/admin-app/shows/${showId}`)
}

async function generatePosterForShow(showId: string) {
  const db = createAdminClient()

  const [{ data: show }, { data: spots }] = await Promise.all([
    db.from('shows').select('title, date, start_time, venue_name, venue_address').eq('id', showId).single(),
    db.from('confirmed_spots').select('artist_id, show_requirement_id').eq('show_id', showId).in('status', ['confirmed', 'completed', 'paid']),
  ])

  const spotRows = spots ?? []
  const artistIds = [...new Set(spotRows.map(spot => spot.artist_id))]
  const requirementIds = [...new Set(spotRows.map(spot => spot.show_requirement_id))]
  const [{ data: artists }, { data: requirements }] = await Promise.all([
    artistIds.length > 0
      ? db.from('artists').select('id, full_name, stage_name, profile_image_url').in('id', artistIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; stage_name: string | null; profile_image_url: string | null }> }),
    requirementIds.length > 0
      ? db.from('show_requirements').select('id, role_name').in('id', requirementIds)
      : Promise.resolve({ data: [] as Array<{ id: string; role_name: string }> }),
  ])
  const artistById = new Map((artists ?? []).map(artist => [artist.id, artist]))
  const requirementById = new Map((requirements ?? []).map(requirement => [requirement.id, requirement.role_name]))

  if (!show) throw new Error('Show not found')

  const posterUrl = await generateShowPoster(showId, {
    title: show.title,
    date: show.date,
    startTime: show.start_time,
    venue: show.venue_address ?? show.venue_name ?? '',
    artists: spotRows.flatMap(spot => {
      const artist = artistById.get(spot.artist_id)
      if (!artist) return []
      return [{
        name: artist.stage_name ?? artist.full_name,
        profile_image_url: artist.profile_image_url,
        role_name: requirementById.get(spot.show_requirement_id) ?? null,
      }]
    }),
  })

  if (!posterUrl) throw new Error('Kunne ikke generere plakat akkurat nå.')

  await db.from('marketing_tasks').upsert({
    show_id: showId,
    task_key: 'upload_poster',
    label: 'Lineup-plakat generert',
    is_completed: true,
  }, { onConflict: 'show_id,task_key', ignoreDuplicates: false })
}

export async function completeMarketingTask(formData: FormData) {
  const taskId = formData.get('task_id') as string
  const showId = formData.get('show_id') as string
  const isCompleted = formData.get('is_completed') === 'true'
  const db = createAdminClient()
  await db.from('marketing_tasks').update({ is_completed: !isCompleted }).eq('id', taskId)
  revalidatePath(`/admin-app/shows/${showId}`)
}

/**
 * Confirm the show lineup:
 * 1. Verify all requirement slots are filled
 * 2. Generate lineup poster from artist profile images
 * 3. Create marketing tasks
 * 4. Redirect to marketing tab
 */
export async function confirmLineupAction(formData: FormData) {
  const showId = formData.get('show_id') as string

  const result = await automateFullbookedShow(showId)
  if (!result.fullbooked) {
    throw new Error(result.message ?? 'Lineupen er ikke fullbooket ennå.')
  }

  revalidatePath(`/admin-app/shows/${showId}`)
  redirect(`/admin-app/shows/${showId}?tab=marketing`)
}

export async function deleteShowAction(formData: FormData) {
  const showId = formData.get('show_id') as string
  const db = createAdminClient()
  await db.from('shows').delete().eq('id', showId)
  revalidatePath('/admin-app/shows')
  redirect('/admin-app/shows')
}
