'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function approvePayoutAction(formData: FormData) {
  const payoutId = formData.get('payout_id') as string
  const db = createAdminClient()
  await db.from('artist_payouts').update({ status: 'approved' }).eq('id', payoutId)
  revalidatePath('/admin-app/artist-economy')
}

export async function markPayoutPaidAction(formData: FormData) {
  const payoutId = formData.get('payout_id') as string
  const db = createAdminClient()
  await db.from('artist_payouts').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
  }).eq('id', payoutId)
  revalidatePath('/admin-app/artist-economy')
}

export async function savePayoutNoteAction(formData: FormData) {
  const payoutId = formData.get('payout_id') as string
  const notes = formData.get('notes') as string
  const db = createAdminClient()
  await db.from('artist_payouts').update({ notes }).eq('id', payoutId)
  revalidatePath('/admin-app/artist-economy')
}
