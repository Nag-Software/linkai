'use client'

import { QuickCloneModal } from '@/components/admin/quick-clone-modal'
import type { Show } from '@/types/database'
import { useState, useEffect } from 'react'

export function CloneButton({ show }: { show: Show }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Klon show (Ctrl+K / Cmd+K)"
      >
        🔄 Klon
      </button>
      <QuickCloneModal show={show} isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
