'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendBookingOfferEmail,
  sendBookingConfirmedEmail,
  sendSpotFilledEmail,
} from '@/lib/email/mailer'
import { generateShowPoster } from '@/lib/actions/ai'
import type { MarketingTaskKey } from '@/types/database'

const MIN_BOOKABLE_SCORE = 6
const ACTIVE_BOOKING_STATUSES = ['draft', 'booking'] as const

function publicAppUrl() {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

function formatShowDateTime(show: { date: string; start_time?: string | null }) {
  return `${show.date}${show.start_time ? ` kl. ${show.start_time.slice(0, 5)}` : ''}`
}

async function postShowToFacebook(opts: {
  title: string
  slug: string
  date: string
  start_time?: string | null
  venue_name?: string | null
  poster_url?: string | null
  artist_names: string[]
}) {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !accessToken) return { posted: false, reason: 'missing_credentials' as const }

  const eventUrl = `${publicAppUrl()}/events/${opts.slug}`
  const message = [
    opts.title,
    '',
    formatShowDateTime(opts),
    opts.venue_name ? `Sted: ${opts.venue_name}` : null,
    opts.artist_names.length > 0 ? `Lineup: ${opts.artist_names.join(', ')}` : null,
    '',
    `Billetter: ${eventUrl}`,
  ].filter(Boolean).join('\n')

  const params = new URLSearchParams({ access_token: accessToken })
  let endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`

  if (opts.poster_url) {
    endpoint = `https://graph.facebook.com/v20.0/${pageId}/photos`
    params.set('url', opts.poster_url)
    params.set('caption', message)
  } else {
    params.set('message', message)
    params.set('link', eventUrl)
  }

  try {
    const response = await fetch(endpoint, { method: 'POST', body: params })
    if (!response.ok) {
      console.error('[BookingAutomation] Facebook post failed:', response.status, await response.text())
      return { posted: false, reason: 'request_failed' as const }
    }
    return { posted: true as const }
  } catch (error) {
    console.error('[BookingAutomation] Facebook post failed:', error)
    return { posted: false, reason: 'request_failed' as const }
  }
}

/**
 * 6.5 Book show
 * Finds matching artists per requirement, creates booking offers, sends emails.
 */
export async function bookShow(showId: string) {
  const admin = createAdminClient()
  let offersCreated = 0
  let candidatesMatched = 0
  let datePreferenceMatches = 0

  // Fetch show
  const { data: show, error: showError } = await admin
    .from('shows')
    .select('id, title, date, status')
    .eq('id', showId)
    .single()
  if (showError || !show) throw new Error('Show not found')
  if (!ACTIVE_BOOKING_STATUSES.includes(show.status as (typeof ACTIVE_BOOKING_STATUSES)[number])) {
    return { offersCreated, candidatesMatched, datePreferenceMatches }
  }

  // Fetch requirements
  const { data: requirements, error: reqError } = await admin
    .from('show_requirements')
    .select('*')
    .eq('show_id', showId)
  if (reqError) throw new Error(reqError.message)
  if (!requirements?.length) return { offersCreated, candidatesMatched, datePreferenceMatches }

  for (const req of requirements ?? []) {
    const { count: filledCount } = await admin
      .from('confirmed_spots')
      .select('*', { count: 'exact', head: true })
      .eq('show_requirement_id', req.id)
      .in('status', ['confirmed', 'completed', 'paid'])

    if ((filledCount ?? 0) >= req.quantity) continue

    const { data: availableRows } = await admin
      .from('artist_availability')
      .select('artist_id')
      .eq('available_date', show.date)

    const availableArtistIds = [...new Set((availableRows ?? []).map((row) => row.artist_id))]
    const availableArtistSet = new Set(availableArtistIds)

    // Artists who selected this date are prioritized, but not required.
    let query = admin
      .from('artists')
      .select('id, email, full_name, admin_score')
      .eq('status', 'approved')
      .eq('is_flagged', false)

    query = query.gte('admin_score', Math.max(req.min_score ?? MIN_BOOKABLE_SCORE, MIN_BOOKABLE_SCORE))

    if (req.energy_level !== 'any') {
      query = query.eq('admin_energy_level', req.energy_level)
    }
    if (req.required_tags && req.required_tags.length > 0) {
      query = query.overlaps('admin_tags', req.required_tags)
    }

    const { data: candidates } = await query
      .order('admin_score', { ascending: false })
      .order('full_name', { ascending: true })
    candidatesMatched += candidates?.length ?? 0
    datePreferenceMatches += (candidates ?? []).filter((artist) => availableArtistSet.has(artist.id)).length
    const sortedCandidates = [...(candidates ?? [])].sort((a, b) => {
      const aAvailable = availableArtistSet.has(a.id) ? 1 : 0
      const bAvailable = availableArtistSet.has(b.id) ? 1 : 0
      if (aAvailable !== bAvailable) return bAvailable - aAvailable
      return (b.admin_score ?? 0) - (a.admin_score ?? 0)
    })

    for (const artist of sortedCandidates) {
      const [{ data: existingOffer }, { data: existingSpot }] = await Promise.all([
        admin
          .from('booking_offers')
          .select('id')
          .eq('artist_id', artist.id)
          .eq('show_id', showId)
          .in('status', ['sent', 'accepted'])
          .maybeSingle(),
        admin
          .from('confirmed_spots')
          .select('id')
          .eq('artist_id', artist.id)
          .eq('show_id', showId)
          .in('status', ['confirmed', 'completed', 'paid'])
          .maybeSingle(),
      ])

      if (existingOffer || existingSpot) continue

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
      offersCreated += 1

      await sendBookingOfferEmail({
        email: artist.email,
        full_name: artist.full_name,
        show_title: show.title,
        show_date: show.date,
        token: offer.token,
        response_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/booking-offer/${offer.token}`,
      })
    }
  }

  // Set show to booking status
  await admin.from('shows').update({ status: 'booking' }).eq('id', showId).in('status', ['draft'])
  return { offersCreated, candidatesMatched, datePreferenceMatches }
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

  const artistNames = (artistRows ?? []).map((artist) => artist.stage_name ?? artist.full_name)
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

  const { data: existingTasks } = await admin
    .from('marketing_tasks')
    .select('task_key, is_completed')
    .eq('show_id', showId)

  const alreadyPostedToFacebook = (existingTasks ?? []).some((task) => task.task_key === 'create_facebook_event' && task.is_completed)
  const facebookPost = alreadyPostedToFacebook
    ? { posted: true as const }
    : await postShowToFacebook({
      title: show.title,
      slug: show.slug,
      date: show.date,
      start_time: show.start_time,
      venue_name: show.venue_name ?? show.venue_address,
      poster_url: posterUrl,
      artist_names: artistNames,
    })

  const marketingTasks: Array<{ show_id: string; task_key: MarketingTaskKey; label: string; is_completed: boolean }> = [
    { show_id: showId, task_key: 'publish_event_page', label: 'Publiser eventside', is_completed: false },
    { show_id: showId, task_key: 'activate_ticket_sales', label: 'Aktiver billettsalg', is_completed: false },
    { show_id: showId, task_key: 'upload_poster', label: 'Lineup-plakat generert automatisk', is_completed: Boolean(posterUrl) },
    { show_id: showId, task_key: 'create_facebook_event', label: facebookPost.posted ? 'Facebook-post publisert automatisk' : 'Facebook-post venter på API-oppsett', is_completed: facebookPost.posted },
    { show_id: showId, task_key: 'share_facebook_groups', label: 'Deling i Facebook-grupper venter på gruppeintegrasjon', is_completed: false },
    { show_id: showId, task_key: 'send_calendar_partners', label: 'Send eventinfo til digitale kalendere', is_completed: false },
    { show_id: showId, task_key: 'schedule_email', label: 'Planlegg e-post til kundeliste 10 dager før show', is_completed: false },
  ]

  await admin.from('marketing_tasks').upsert(marketingTasks, { onConflict: 'show_id,task_key', ignoreDuplicates: false })
  // Set show to fullbooked — admin publishes manually via the marketing checklist
  await admin.from('shows').update({
    status: 'fullbooked',
    ...(posterUrl ? { poster_url: posterUrl } : {}),
  }).eq('id', showId).in('status', ['draft', 'booking'])
  // Only update poster if already fullbooked/published, don't downgrade status
  if (posterUrl) {
    await admin.from('shows').update({ poster_url: posterUrl })
      .eq('id', showId).in('status', ['fullbooked', 'published'])
  }

  return { fullbooked: true, posterUrl, facebookPosted: facebookPost.posted }
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

  if (offer.fee_amount !== null) {
    await admin.from('artist_payouts').insert({
      artist_id: offer.artist_id,
      confirmed_spot_id: spot.id,
      show_id: offer.show_id,
      amount: offer.fee_amount,
      currency: offer.currency,
      status: 'pending',
    })
  }

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
