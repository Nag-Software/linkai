'use server'

import { redirect } from 'next/navigation'
import { acceptBookingOffer, declineBookingOffer } from '@/lib/actions/booking'

export async function publicAcceptOfferAction(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!token) redirect('/')

  let result: string
  try {
    const res = await acceptBookingOffer(token)
    result = res.result
  } catch {
    result = 'error'
  }
  redirect(`/booking-offer/${token}?result=${result}`)
}

export async function publicDeclineOfferAction(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!token) redirect('/')

  try {
    await declineBookingOffer(token)
  } catch {
    // Offer may already be declined
  }
  redirect(`/booking-offer/${token}?result=declined`)
}
