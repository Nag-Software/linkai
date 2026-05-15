'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendBookingOfferEmail,
  sendBookingConfirmedEmail,
  sendSpotFilledEmail,
  sendSpotAvailableEmail,
} from '@/lib/email/mailer'
import { generateShowPoster } from '@/lib/actions/ai'
import { artistMatchesRole } from '@/lib/artist-roles'

const MIN_BOOKABLE_SCORE = 6
const ACTIVE_BOOKING_STATUSES = ['draft', 'booking'] as const

function publicAppUrl() {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}



/**
 * 6.5 Book show
 *
 * Sends offers to ALL strictly qualified candidates simultaneously.
 * Global dedup: each artist gets at most ONE offer across all requirements.
 * Hardest-to-fill requirements (fewest candidates) get first pick of shared artists.
 * Fallback candidates (non-strict) are NOT invited here — use sendFallbackOffersForShow().
 */
export async function bookShow(showId: string) {
  const admin = createAdminClient()
  let offersCreated = 0
  let candidatesMatched = 0

  // Fetch show
  const { data: show, error: showError } = await admin
    .from('shows')
    .select('id, title, date, status')
    .eq('id', showId)
    .single()
  if (showError || !show) throw new Error('Show not found')
  if (!ACTIVE_BOOKING_STATUSES.includes(show.status as (typeof ACTIVE_BOOKING_STATUSES)[number])) {
    return { offersCreated, candidatesMatched }
  }

  // Fetch requirements
  const { data: requirements, error: reqError } = await admin
    .from('show_requirements')
    .select('*')
    .eq('show_id', showId)
  if (reqError) throw new Error(reqError.message)
  if (!requirements?.length) return { offersCreated, candidatesMatched }

  // Artists who marked this date available (tie-breaker)
  const { data: availableRows } = await admin
    .from('artist_availability')
    .select('artist_id')
    .eq('available_date', show.date)
  const availableSet = new Set((availableRows ?? []).map(r => r.artist_id))

  // Last confirmed booking date per artist (for recency priority)
  const { data: recentSpotRows } = await admin
    .from('confirmed_spots')
    .select('artist_id, show_id')
    .in('status', ['confirmed', 'completed', 'paid'])
  const spotShowIds = [...new Set((recentSpotRows ?? []).map(s => s.show_id))]
  const spotShowDatesResult = spotShowIds.length
    ? await admin.from('shows').select('id, date').in('id', spotShowIds)
    : { data: [] as Array<{ id: string; date: string }> }
  const showDateMap = Object.fromEntries((spotShowDatesResult.data ?? []).map((s: { id: string; date: string }) => [s.id, s.date]))
  const lastBookedMap = new Map<string, string>()
  for (const row of recentSpotRows ?? []) {
    const d = showDateMap[row.show_id]
    if (!d) continue
    const existing = lastBookedMap.get(row.artist_id)
    if (!existing || d > existing) lastBookedMap.set(row.artist_id, d)
  }

  // Load all approved, non-flagged artists once
  const { data: allArtists } = await admin
    .from('artists')
    .select('id, email, full_name, admin_score, admin_energy_level, gender, admin_type, category')
    .eq('status', 'approved')
    .eq('is_flagged', false)

  if (!allArtists) return { sent: 0 }

  // Artists already involved in this show
  const [{ data: existingOffers }, { data: existingSpots }] = await Promise.all([
    admin.from('booking_offers').select('artist_id').eq('show_id', showId).in('status', ['sent', 'accepted']),
    admin.from('confirmed_spots').select('artist_id').eq('show_id', showId).in('status', ['confirmed', 'completed', 'paid']),
  ])
  const alreadyInvolved = new Set([
    ...(existingOffers ?? []).map(o => o.artist_id),
    ...(existingSpots ?? []).map(s => s.artist_id),
  ])

  type Artist = {
    id: string
    email: string
    full_name: string
    admin_score: number | null
    admin_energy_level: string | null
    gender: string | null
    admin_type: string[] | null
    category: string[] | null
  }
  const today = new Date().toISOString().slice(0, 10)
  function recencyBonus(artistId: string): number {
    const lastDate = lastBookedMap.get(artistId)
    if (!lastDate) return 50 // never booked → max bonus
    const days = Math.max(0, Math.floor((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000))
    return Math.min(days, 90) / 90 * 50
  }
  function rankScore(a: Artist, roleName: string) {
    return (availableSet.has(a.id) ? 1000 : 0) + (a.admin_score ?? 0) + recencyBonus(a.id) + (artistMatchesRole(roleName, a) ? 25 : 0)
  }

  // Build strict candidate lists per requirement
  type ReqGroup = { req: typeof requirements[number]; slotsNeeded: number; strictCandidates: typeof allArtists }
  const groups: ReqGroup[] = []

  for (const req of requirements) {
    const { count: filled } = await admin
      .from('confirmed_spots')
      .select('*', { count: 'exact', head: true })
      .eq('show_requirement_id', req.id)
      .in('status', ['confirmed', 'completed', 'paid'])

    const slotsNeeded = req.quantity - (filled ?? 0)
    if (slotsNeeded <= 0) continue

    const minScore = Math.max(req.min_score ?? MIN_BOOKABLE_SCORE, MIN_BOOKABLE_SCORE)
    const strictCandidates = allArtists
      .filter(a => {
        if (alreadyInvolved.has(a.id)) return false
        if ((a.admin_score ?? 0) < minScore) return false
        if (req.energy_level !== 'any' && a.admin_energy_level !== req.energy_level) return false
        if (req.required_gender && req.required_gender !== 'any' && a.gender !== req.required_gender) return false
        return true
      })
      .sort((a, b) => rankScore(b, req.role_name) - rankScore(a, req.role_name))

    groups.push({ req, slotsNeeded, strictCandidates })
  }

  if (!groups.length) return { offersCreated, candidatesMatched }

  // Hardest-to-fill first (fewest candidates) → gets priority in artist dedup
  groups.sort((a, b) => a.strictCandidates.length - b.strictCandidates.length)

  // Global dedup: each artist assigned to exactly one requirement
  const artistReqAssignment = new Map<string, typeof requirements[number]>()
  for (const group of groups) {
    for (const artist of group.strictCandidates) {
      if (!artistReqAssignment.has(artist.id)) {
        artistReqAssignment.set(artist.id, group.req)
      }
    }
  }
  candidatesMatched = artistReqAssignment.size

  // Send offers — one per artist, to all strict candidates
  for (const [artistId, req] of artistReqAssignment) {
    const artist = allArtists.find(a => a.id === artistId)!
    const { data: offer, error: offerError } = await admin
      .from('booking_offers')
      .insert({
        show_id: showId,
        artist_id: artist.id,
        show_requirement_id: req.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single()

    if (offerError || !offer) continue
    offersCreated++

    await sendBookingOfferEmail({
      email: artist.email,
      full_name: artist.full_name,
      show_title: show.title,
      show_date: show.date,
      token: offer.token,
      response_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/booking-offer/${offer.token}`,
    })
  }

  // Set show to booking status
  await admin.from('shows').update({ status: 'booking' }).eq('id', showId).in('status', ['draft'])
  return { offersCreated, candidatesMatched }
}

/**
 * Sends fallback offers: for requirements that still need artists and have no pending sent offers,
 * invites the best non-strict (fallback) candidates. One offer per artist globally.
 */
export async function sendFallbackOffersForShow(showId: string) {
  const admin = createAdminClient()
  let offersCreated = 0

  const { data: show } = await admin
    .from('shows')
    .select('id, title, date, status')
    .eq('id', showId)
    .single()
  if (!show) throw new Error('Show not found')
  if (!ACTIVE_BOOKING_STATUSES.includes(show.status as (typeof ACTIVE_BOOKING_STATUSES)[number])) {
    return { offersCreated }
  }

  const { data: requirements } = await admin
    .from('show_requirements')
    .select('*')
    .eq('show_id', showId)
  if (!requirements?.length) return { offersCreated }

  const { data: availableRows } = await admin
    .from('artist_availability')
    .select('artist_id')
    .eq('available_date', show.date)
  const availableSet = new Set((availableRows ?? []).map(r => r.artist_id))

  const { data: allArtists } = await admin
    .from('artists')
    .select('id, email, full_name, admin_score, admin_energy_level, gender, admin_type, category')
        .eq('status', 'approved')
        .eq('is_flagged', false)
  if (!allArtists?.length) return { offersCreated }

  const [{ data: existingOffers }, { data: existingSpots }] = await Promise.all([
    admin.from('booking_offers').select('artist_id').eq('show_id', showId).in('status', ['sent', 'accepted']),
    admin.from('confirmed_spots').select('artist_id').eq('show_id', showId).in('status', ['confirmed', 'completed', 'paid']),
  ])
  const alreadyInvolved = new Set([
    ...(existingOffers ?? []).map(o => o.artist_id),
    ...(existingSpots ?? []).map(s => s.artist_id),
  ])

  // Last confirmed booking date per artist (for recency priority)
  const { data: recentSpotRowsFb } = await admin
    .from('confirmed_spots')
    .select('artist_id, show_id')
    .in('status', ['confirmed', 'completed', 'paid'])
  const fbSpotShowIds = [...new Set((recentSpotRowsFb ?? []).map(s => s.show_id))]
  const fbSpotShowDatesResult = fbSpotShowIds.length
    ? await admin.from('shows').select('id, date').in('id', fbSpotShowIds)
    : { data: [] as Array<{ id: string; date: string }> }
  const fbShowDateMap = Object.fromEntries((fbSpotShowDatesResult.data ?? []).map((s: { id: string; date: string }) => [s.id, s.date]))
  const fbLastBookedMap = new Map<string, string>()
  for (const row of recentSpotRowsFb ?? []) {
    const d = fbShowDateMap[row.show_id]
    if (!d) continue
    const existing = fbLastBookedMap.get(row.artist_id)
    if (!existing || d > existing) fbLastBookedMap.set(row.artist_id, d)
  }

  type Artist = {
    id: string
    email: string
    full_name: string
    admin_score: number | null
    admin_energy_level: string | null
    gender: string | null
    admin_type: string[] | null
    category: string[] | null
  }
  const todayFb = new Date().toISOString().slice(0, 10)
  function recencyBonusFb(artistId: string): number {
    const lastDate = fbLastBookedMap.get(artistId)
    if (!lastDate) return 50
    const days = Math.max(0, Math.floor((new Date(todayFb).getTime() - new Date(lastDate).getTime()) / 86400000))
    return Math.min(days, 90) / 90 * 50
  }
  function rankScore(a: Artist, roleName: string) {
    return (availableSet.has(a.id) ? 1000 : 0) + (a.admin_score ?? 0) + recencyBonusFb(a.id) + (artistMatchesRole(roleName, a) ? 25 : 0)
  }

  // Build fallback groups for requirements still needing artists
  type ReqGroup = { req: typeof requirements[number]; slotsNeeded: number; fallbackCandidates: typeof allArtists }
  const groups: ReqGroup[] = []

  for (const req of requirements) {
    const { count: filled } = await admin
      .from('confirmed_spots')
      .select('*', { count: 'exact', head: true })
      .eq('show_requirement_id', req.id)
      .in('status', ['confirmed', 'completed', 'paid'])

    const slotsNeeded = req.quantity - (filled ?? 0)
    if (slotsNeeded <= 0) continue

    const minScore = Math.max(req.min_score ?? MIN_BOOKABLE_SCORE, MIN_BOOKABLE_SCORE)

    // Only non-strict candidates (would be excluded by strict criteria)
    const fallbackCandidates = allArtists
      .filter(a => {
        if (alreadyInvolved.has(a.id)) return false
        // Passes if it FAILS at least one strict criterion
        const failsScore = (a.admin_score ?? 0) < minScore
        const failsEnergy = req.energy_level !== 'any' && a.admin_energy_level !== req.energy_level
        return failsScore || failsEnergy
      })
      .sort((a, b) => rankScore(b, req.role_name) - rankScore(a, req.role_name))

    if (fallbackCandidates.length > 0) {
      groups.push({ req, slotsNeeded, fallbackCandidates })
    }
  }

  if (!groups.length) return { offersCreated }

  // Hardest-to-fill first
  groups.sort((a, b) => a.fallbackCandidates.length - b.fallbackCandidates.length)

  // Global dedup
  const artistReqAssignment = new Map<string, typeof requirements[number]>()
  for (const group of groups) {
    for (const artist of group.fallbackCandidates) {
      if (!artistReqAssignment.has(artist.id)) {
        artistReqAssignment.set(artist.id, group.req)
      }
    }
  }

  for (const [artistId, req] of artistReqAssignment) {
    const artist = allArtists.find(a => a.id === artistId)!
    const { data: offer, error: offerError } = await admin
      .from('booking_offers')
      .insert({
        show_id: showId,
        artist_id: artist.id,
        show_requirement_id: req.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single()

    if (offerError || !offer) continue
    offersCreated++

    await sendBookingOfferEmail({
      email: artist.email,
      full_name: artist.full_name,
      show_title: show.title,
      show_date: show.date,
      token: offer.token,
      response_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/booking-offer/${offer.token}`,
    })
  }

  return { offersCreated }
}

export async function runAutomaticBookingForShow(showId: string) {
  const booking = await bookShow(showId)
  const fullbooked = await automateFullbookedShow(showId)
  return { booking, fullbooked }
}

export async function runAutomaticBookingForOpenShows() {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data: shows } = await admin
    .from('shows')
    .select('id')
    .in('status', [...ACTIVE_BOOKING_STATUSES])
    .gte('date', today)
    .order('date', { ascending: true })

  const results = []
  for (const show of shows ?? []) {
    results.push(await runAutomaticBookingForShow(show.id))
  }
  return results
}

export async function automateFullbookedShow(showId: string) {
  const admin = createAdminClient()

  const { data: requirements } = await admin
    .from('show_requirements')
    .select('id, role_name, quantity')
    .eq('show_id', showId)

  if (!requirements?.length) return { fullbooked: false, reason: 'no_requirements' as const }

  for (const req of requirements) {
    const { count } = await admin
      .from('confirmed_spots')
      .select('*', { count: 'exact', head: true })
      .eq('show_requirement_id', req.id)
      .in('status', ['confirmed', 'completed', 'paid'])

    if ((count ?? 0) < req.quantity) {
      return {
        fullbooked: false,
        reason: 'requirements_not_filled' as const,
        message: `Krav "${req.role_name}" er ikke fylt (${count ?? 0}/${req.quantity})`,
      }
    }
  }

  const { data: show } = await admin
    .from('shows')
    .select('title, slug, date, start_time, venue_name, venue_address, poster_url, published_at')
    .eq('id', showId)
    .single()

  if (!show) return { fullbooked: false, reason: 'show_not_found' as const }

  const { data: spots } = await admin
    .from('confirmed_spots')
    .select('artist_id, show_requirement_id')
    .eq('show_id', showId)
    .in('status', ['confirmed', 'completed', 'paid'])

  const artistIds = [...new Set((spots ?? []).map((spot) => spot.artist_id))]
  const { data: artistRows } = artistIds.length > 0
    ? await admin.from('artists').select('id, full_name, stage_name, profile_image_url').in('id', artistIds)
    : { data: [] as Array<{ id: string; full_name: string; stage_name: string | null; profile_image_url: string | null }> }
  const artistById = new Map((artistRows ?? []).map((artist) => [artist.id, artist]))
  const requirementById = new Map((requirements ?? []).map((requirement) => [requirement.id, requirement.role_name]))

  let posterUrl = show.poster_url ?? null

  if (!posterUrl) {
    posterUrl = await generateShowPoster(showId, {
      title: show.title,
      date: show.date,
      startTime: show.start_time,
      venue: show.venue_name ?? show.venue_address ?? '',
      artists: (spots ?? []).flatMap((spot) => {
        const artist = artistById.get(spot.artist_id)
        if (!artist) return []
        return [{
          name: artist.stage_name ?? artist.full_name,
          profile_image_url: artist.profile_image_url,
          role_name: requirementById.get(spot.show_requirement_id) ?? null,
        }]
      }),
    })
  }

  const alreadyPublished = Boolean(show.published_at)
  const publishedAt = show.published_at ?? new Date().toISOString()

  // Publish show and set poster. Transitions from any pre-published status.
  await admin.from('shows').update({
    status: 'published',
    published_at: publishedAt,
    ...(posterUrl ? { poster_url: posterUrl } : {}),
  }).eq('id', showId).in('status', ['draft', 'booking', 'fullbooked'])

  // If already published, still keep poster in sync without touching status/published_at
  if (posterUrl && alreadyPublished) {
    await admin.from('shows').update({ poster_url: posterUrl })
      .eq('id', showId).eq('status', 'published')
  }

  return { fullbooked: true, posterUrl, published: true, publishedAt }
}

/**
 * 6.6 Accept booking offer (transactional via DB function-level logic)
 */
export async function acceptBookingOffer(token: string) {
  const admin = createAdminClient()

  const { data: accepted, error } = await admin
    .rpc('accept_booking_offer', { p_token: token })
    .single()

  if (error || !accepted) throw new Error(error?.message ?? 'Offer not found or already responded')

  if (accepted.should_notify && accepted.result === 'filled_by_other') {
    const { data: artist } = await admin
      .from('artists')
      .select('email, full_name')
      .eq('id', accepted.artist_id)
      .single()

    if (artist) await sendSpotFilledEmail({ email: artist.email, full_name: artist.full_name })
  }

  if (accepted.should_notify && accepted.result === 'accepted') {
    const [{ data: artist }, { data: show }] = await Promise.all([
      admin.from('artists').select('email, full_name').eq('id', accepted.artist_id).single(),
      admin.from('shows').select('title, date').eq('id', accepted.show_id).single(),
    ])

    if (artist) {
      await sendBookingConfirmedEmail({
        email: artist.email,
        full_name: artist.full_name,
        show_title: show?.title ?? '',
        show_date: show?.date ?? '',
      })
    }
  }

  if (accepted.result === 'accepted') {
    await automateFullbookedShow(accepted.show_id)
  }

  return { result: accepted.result as 'accepted' | 'filled_by_other' | 'already_booked' | 'declined' | 'expired' | 'cancelled' }
}

export async function acceptBookingOfferById(offerId: string) {
  const admin = createAdminClient()

  const { data: offer, error: offerError } = await admin
    .from('booking_offers')
    .select('id, show_id, artist_id, show_requirement_id, token, status, fee_amount, currency')
    .eq('id', offerId)
    .single()

  if (offerError || !offer) throw new Error(offerError?.message ?? 'Bookingtilbudet finnes ikke.')

  const { data: existingOfferSpot } = await admin
    .from('confirmed_spots')
    .select('id')
    .eq('booking_offer_id', offer.id)
    .in('status', ['confirmed', 'completed', 'paid'])
    .maybeSingle()

  if (existingOfferSpot) {
    await admin
      .from('booking_offers')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', offer.id)
    await automateFullbookedShow(offer.show_id)
    return { result: 'accepted' as const, confirmedSpotId: existingOfferSpot.id, repaired: false }
  }

  const { data: existingArtistSpot } = await admin
    .from('confirmed_spots')
    .select('id')
    .eq('show_id', offer.show_id)
    .eq('artist_id', offer.artist_id)
    .in('status', ['confirmed', 'completed', 'paid'])
    .maybeSingle()

  if (existingArtistSpot) {
    await admin
      .from('booking_offers')
      .update({ status: 'cancelled', responded_at: new Date().toISOString() })
      .eq('id', offer.id)
    throw new Error('Denne artisten er allerede i lineupen for dette showet.')
  }

  const [{ data: requirement }, { count: filled }] = await Promise.all([
    admin
      .from('show_requirements')
      .select('quantity, role_name')
      .eq('id', offer.show_requirement_id)
      .single(),
    admin
      .from('confirmed_spots')
      .select('*', { count: 'exact', head: true })
      .eq('show_requirement_id', offer.show_requirement_id)
      .in('status', ['confirmed', 'completed', 'paid']),
  ])

  if (requirement && (filled ?? 0) >= requirement.quantity) {
    await admin
      .from('booking_offers')
      .update({ status: 'filled_by_other', responded_at: new Date().toISOString() })
      .eq('id', offer.id)
    throw new Error(`Rollen "${requirement.role_name}" er allerede fylt.`)
  }

  const { data: spot, error: spotError } = await admin
    .from('confirmed_spots')
    .insert({
      show_id: offer.show_id,
      artist_id: offer.artist_id,
      show_requirement_id: offer.show_requirement_id,
      booking_offer_id: offer.id,
      fee_amount: offer.fee_amount,
      currency: offer.currency,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (spotError || !spot) throw new Error(spotError?.message ?? 'Kunne ikke opprette lineup-spot.')

  await admin
    .from('booking_offers')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', offer.id)

  const { count: nowFilled } = await admin
    .from('confirmed_spots')
    .select('*', { count: 'exact', head: true })
    .eq('show_requirement_id', offer.show_requirement_id)
    .in('status', ['confirmed', 'completed', 'paid'])

  if (requirement && (nowFilled ?? 0) >= requirement.quantity) {
    await admin
      .from('booking_offers')
      .update({ status: 'filled_by_other' })
      .eq('show_requirement_id', offer.show_requirement_id)
      .eq('status', 'sent')
      .neq('id', offer.id)
  }

  await admin
    .from('booking_offers')
    .update({ status: 'cancelled' })
    .eq('show_id', offer.show_id)
    .eq('artist_id', offer.artist_id)
    .eq('status', 'sent')
    .neq('id', offer.id)

  await automateFullbookedShow(offer.show_id)
  return { result: 'accepted' as const, confirmedSpotId: spot.id, repaired: true }
}

export async function cancelConfirmedSpotForOffer(offerId: string) {
  const admin = createAdminClient()
  await admin
    .from('confirmed_spots')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('booking_offer_id', offerId)
    .in('status', ['confirmed', 'completed', 'paid'])
}

export async function createManualBookingOffer(formData: FormData) {
  const showId = formData.get('show_id') as string
  const artistId = formData.get('artist_id') as string
  const requirementId = formData.get('requirement_id') as string
  const feeRaw = formData.get('fee_amount') as string

  if (!showId || !artistId || !requirementId) throw new Error('Manglende felt')

  const admin = createAdminClient()

  const [{ data: show }, { data: artist }] = await Promise.all([
    admin.from('shows').select('id, title, date').eq('id', showId).single(),
    admin.from('artists').select('id, email, full_name').eq('id', artistId).single(),
  ])

  if (!show || !artist) throw new Error('Show eller artist ikke funnet')

  const { data: offer, error } = await admin
    .from('booking_offers')
    .insert({
      show_id: showId,
      artist_id: artistId,
      show_requirement_id: requirementId,
      status: 'sent',
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...(feeRaw ? { fee_amount: Math.round(parseFloat(feeRaw) * 100), currency: 'NOK' } : {}),
    })
    .select('token')
    .single()

  if (error || !offer) throw new Error(error?.message ?? 'Kunne ikke opprette tilbud')

  await sendBookingOfferEmail({
    email: artist.email,
    full_name: artist.full_name,
    show_title: show.title,
    show_date: show.date,
    token: offer.token,
    response_url: `${publicAppUrl()}/booking-offer/${offer.token}`,
  })

  revalidatePath('/admin-app/bookings')
}

export async function cancelBookingOffer(formData: FormData) {
  const offerId = formData.get('offer_id') as string
  if (!offerId) throw new Error('Mangler offer_id')

  const admin = createAdminClient()
  await admin
    .from('booking_offers')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('id', offerId)
    .eq('status', 'sent')

  revalidatePath('/admin-app/bookings')
}

/**
 * 6.7 Decline booking offer
 */
export async function declineBookingOffer(token: string) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('booking_offers')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('token', token)
    .eq('status', 'sent')

  if (error) throw new Error(error.message)
  return { result: 'declined' as const }
}

/**
 * Sends new booking offers for a specific requirement that just had its spot removed.
 * Uses "Ledig spot" email instead of the standard booking offer email.
 */
export async function sendOffersForReopenedRequirement(showId: string, requirementId: string) {
  const admin = createAdminClient()

  const [{ data: show }, { data: requirement }] = await Promise.all([
    admin.from('shows').select('id, title, date, status').eq('id', showId).single(),
    admin.from('show_requirements').select('*').eq('id', requirementId).single(),
  ])

  if (!show || !requirement) return
  if (!ACTIVE_BOOKING_STATUSES.includes(show.status as (typeof ACTIVE_BOOKING_STATUSES)[number])) return

  // Check the slot is actually open
  const { count: filled } = await admin
    .from('confirmed_spots')
    .select('*', { count: 'exact', head: true })
    .eq('show_requirement_id', requirementId)
    .in('status', ['confirmed', 'completed', 'paid'])

  if ((filled ?? 0) >= requirement.quantity) return

  // Artists already with active sent offers or confirmed spots for this show
  const [{ data: existingOffers }, { data: existingSpots }] = await Promise.all([
    admin.from('booking_offers').select('artist_id').eq('show_id', showId).eq('status', 'sent'),
    admin.from('confirmed_spots').select('artist_id').eq('show_id', showId).in('status', ['confirmed', 'completed', 'paid']),
  ])
  const alreadyInvolved = new Set([
    ...(existingOffers ?? []).map(o => o.artist_id),
    ...(existingSpots ?? []).map(s => s.artist_id),
  ])

  const { data: allArtists } = await admin
    .from('artists')
    .select('id, email, full_name, admin_score, admin_energy_level, gender')
    .eq('status', 'approved')
    .eq('is_flagged', false)

  if (!allArtists?.length) return

  const minScore = Math.max(requirement.min_score ?? MIN_BOOKABLE_SCORE, MIN_BOOKABLE_SCORE)
  const candidates = allArtists
    .filter(a => {
      if (alreadyInvolved.has(a.id)) return false
      if ((a.admin_score ?? 0) < minScore) return false
      if (requirement.energy_level !== 'any' && a.admin_energy_level !== requirement.energy_level) return false
      if (requirement.required_gender && requirement.required_gender !== 'any' && a.gender !== requirement.required_gender) return false
      return true
    })
    .sort((a, b) => (b.admin_score ?? 0) - (a.admin_score ?? 0))

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  for (const artist of candidates) {
    const { data: offer, error } = await admin
      .from('booking_offers')
      .insert({
        show_id: showId,
        artist_id: artist.id,
        show_requirement_id: requirementId,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('token')
      .single()

    if (error || !offer) continue

    await sendSpotAvailableEmail({
      email: artist.email,
      full_name: artist.full_name,
      show_title: show.title,
      show_date: show.date,
      token: offer.token,
      response_url: `${baseUrl}/booking-offer/${offer.token}`,
    })
  }
}
