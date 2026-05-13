'use client'

import { useState, useEffect } from 'react'
import { useTransition } from 'react'
import { cloneShowAction } from '@/app/admin-app/shows/actions'
import type { Show } from '@/types/database'

export function QuickCloneModal({
  show,
  isOpen,
  onClose,
}: {
  show: Show
  isOpen: boolean
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    title: `${show.title} - ${new Date().getFullYear()}`,
    date: '',
    slug: '',
    copyRequirements: true,
    copyPricing: true,
  })
  const [isPending, startTransition] = useTransition()

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setFormData(prev => ({
      ...prev,
      title: newTitle,
      slug: newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, date: e.target.value }))
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, slug: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const fd = new FormData()
    fd.set('template_id', show.id)
    fd.set('title', formData.title)
    fd.set('date', formData.date)
    fd.set('slug', formData.slug)
    fd.set('start_time', show.start_time ?? '')
    fd.set('end_time', show.end_time ?? '')
    fd.set('venue_address', show.venue_address ?? '')
    fd.set('capacity', show.capacity?.toString() ?? '')
    fd.set('ticket_price', show.ticket_price ? (show.ticket_price / 100).toString() : '')
    fd.set('currency', show.currency)
    
    startTransition(async () => {
      await cloneShowAction(fd)
      onClose()
    })
  }

  return (
    <>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
            <div className="rounded-xl border bg-card p-6 shadow-lg space-y-4">
              <div>
                <h2 className="font-semibold text-lg">🔄 Klon show</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Lag en kopi av "{show.title}" med nye detaljer
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Ny tittel *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={handleTitleChange}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Comedy Night - 2026"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Dato *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={handleDateChange}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={handleSlugChange}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="comedy-night-2026"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.copyRequirements}
                      onChange={(e) => setFormData(prev => ({ ...prev, copyRequirements: e.target.checked }))}
                      className="rounded border border-input"
                    />
                    <span className="text-sm">Kopier roller & krav</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.copyPricing}
                      onChange={(e) => setFormData(prev => ({ ...prev, copyPricing: e.target.checked }))}
                      className="rounded border border-input"
                    />
                    <span className="text-sm">Kopier pris & venue</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isPending}
                    className="flex-1 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Kloner...' : 'Klon →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
