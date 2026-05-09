'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

const statusMessages: Record<string, { type: 'success' | 'error' | 'info'; message: string }> = {
  accepted: { type: 'success', message: 'Du er bekreftet på showet.' },
  filled_by_other: { type: 'error', message: 'Plassen ble fylt av en annen artist før du rakk å bekrefte.' },
  already_booked: { type: 'error', message: 'Du er allerede bekreftet på dette showet.' },
  declined: { type: 'info', message: 'Tilbudet er avslått.' },
  denied: { type: 'error', message: 'Dette tilbudet tilhører ikke artistkontoen din.' },
  expired: { type: 'error', message: 'Tilbudet er utløpt.' },
  cancelled: { type: 'error', message: 'Tilbudet er kansellert.' },
}

export function BookingOfferStatusToast({ status }: { status?: string }) {
  useEffect(() => {
    if (!status) return
    const toastData = statusMessages[status] ?? { type: 'info' as const, message: 'Status er oppdatert.' }
    toast[toastData.type](toastData.message)
  }, [status])

  return null
}