'use client'

import { useEffect } from 'react'

export function ShowDetailKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        const url = new URL(window.location.href)
        url.searchParams.set('tab', 'lineup')
        window.history.replaceState({}, '', url)
        window.location.reload()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        const url = new URL(window.location.href)
        url.searchParams.set('tab', 'publish')
        window.history.replaceState({}, '', url)
        window.location.reload()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return null
}
