'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentArtist } from '@/lib/artist-portal'
import { canonicalRoleValues } from '@/lib/artist-roles'

const MIN_BOOKABLE_SCORE = 6

export async function updateArtistProfileAction(formData: FormData) {
  const { artist, db } = await getCurrentArtist()
  const imageFile = formData.get('profile_image_file')
  let profileImageUrl = artist.profile_image_url

  if (imageFile instanceof File && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop() ?? 'jpg'
    const path = `${artist.auth_user_id ?? artist.id}/profile.${ext}`
    const { error } = await db.storage.from('artist-images').upload(path, imageFile, { upsert: true })
    if (error) throw new Error('Profilbildet kunne ikke lastes opp akkurat nå.')
    const { data } = db.storage.from('artist-images').getPublicUrl(path)
    profileImageUrl = data.publicUrl
  }

  const socialLinks = socialLinksFromForm(formData)
  const categoryValues = canonicalRoleValues(formData.getAll('category').map((value) => String(value)))

  await db.from('artists').update({
    full_name: textValue(formData.get('full_name')) ?? artist.full_name,
    stage_name: textValue(formData.get('stage_name')) ?? null,
    phone: textValue(formData.get('phone')) ?? null,
    profile_image_url: profileImageUrl,
    bio: textValue(formData.get('bio')) ?? null,
    category: categoryValues.length > 0 ? categoryValues : null,
    language: textValue(formData.get('language')) ?? null,
    social_links: socialLinks,
  }).eq('id', artist.id)

  revalidatePath('/artist-app/profile')
}

export async function toggleAvailabilityAction(formData: FormData) {
  const { artist, db } = await getCurrentArtist()
  const date = textValue(formData.get('available_date'))
  if (!date) throw new Error('Dato mangler.')
  if (artist.status !== 'approved') throw new Error('Profilen din må være godkjent før du kan velge datoer.')
  if ((artist.admin_score ?? 0) < MIN_BOOKABLE_SCORE) throw new Error('Du må ha score 6 eller høyere for å velge ledige bookingdatoer.')

  const { data: existing } = await db
    .from('artist_availability')
    .select('id')
    .eq('artist_id', artist.id)
    .eq('available_date', date)
    .single()

  if (existing) {
    await db.from('artist_availability').delete().eq('id', existing.id)
  } else {
    const { count } = await db
      .from('artist_availability')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artist.id)
      .gte('available_date', new Date().toISOString().slice(0, 10))

    if ((count ?? 0) >= 3) throw new Error('Du kan maksimalt velge tre kommende datoer.')
    await db.from('artist_availability').insert({ artist_id: artist.id, available_date: date })
  }

  revalidatePath('/artist-app/available-dates')
}

export async function acceptOfferAction(formData: FormData) {
  const { artist, db } = await getCurrentArtist()
  const token = textValue(formData.get('token'))
  if (!token) throw new Error('Bookingtilbudet mangler token.')

  const { data: offer } = await db
    .from('booking_offers')
    .select('artist_id')
    .eq('token', token)
    .single()

  if (!offer || offer.artist_id !== artist.id) redirect('/artist-app/booking-offers?status=denied')

  const { acceptBookingOffer } = await import('@/lib/actions/booking')
  const result = await acceptBookingOffer(token)
  redirect(`/artist-app/booking-offers?status=${result.result}`)
}

export async function declineOfferAction(formData: FormData) {
  const { artist, db } = await getCurrentArtist()
  const token = textValue(formData.get('token'))
  if (!token) throw new Error('Bookingtilbudet mangler token.')

  const { data: offer } = await db
    .from('booking_offers')
    .select('artist_id')
    .eq('token', token)
    .single()

  if (!offer || offer.artist_id !== artist.id) redirect('/artist-app/booking-offers?status=denied')

  const { declineBookingOffer } = await import('@/lib/actions/booking')
  await declineBookingOffer(token)
  redirect('/artist-app/booking-offers?status=declined')
}

function textValue(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : undefined
}

function socialLinksFromForm(formData: FormData) {
  const links = {
    instagram: textValue(formData.get('instagram')),
    tiktok: textValue(formData.get('tiktok')),
    youtube: textValue(formData.get('youtube')),
    facebook: textValue(formData.get('facebook')),
    website: textValue(formData.get('website')),
  }
  const entries = Object.entries(links).filter((entry): entry is [string, string] => Boolean(entry[1]))
  return entries.length > 0 ? Object.fromEntries(entries) : null
}