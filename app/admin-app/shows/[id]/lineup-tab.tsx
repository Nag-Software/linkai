'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { shouldBypassImageOptimization } from '@/lib/utils'
import {
  removeSpotAndReopenAction,
  moveSpotAction,
  swapArtistAction,
  addArtistToRequirementAction,
  cancelOfferAction,
  updateOfferStatusAction,
} from '../actions'

type Artist = {
  id: string
  full_name: string
  stage_name: string | null
  email: string
  profile_image_url: string | null
  admin_score: number | null
  admin_energy_level: string | null
}

type SelectableArtist = {
  id: string
  full_name: string
  stage_name: string | null
  email: string
  admin_score: number | null
  admin_energy_level: string | null
}

type Requirement = {
  id: string
  role_name: string
  quantity: number
  lineup_position: number
}

type ConfirmedSpot = {
  id: string
  artist_id: string
  show_requirement_id: string
  status: string
  fee_amount: number | null
  currency: string | null
}

type BookingOffer = {
  id: string
  artist_id: string
  show_requirement_id: string | null
  status: string
  sent_at: string | null
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-sky-100 text-sky-700',
  paid: 'bg-purple-100 text-purple-700',
}

export function LineupTab({
  showId,
  showStatus,
  showCurrency,
  requirements,
  confirmedSpots,
  allOffers,
  artistMap,
  selectableArtists,
  allSlotsFilled,
}: {
  showId: string
  showStatus: string
  showCurrency: string
  requirements: Requirement[]
  confirmedSpots: ConfirmedSpot[]
  allOffers: BookingOffer[]
  artistMap: Record<string, Artist>
  selectableArtists: SelectableArtist[]
  allSlotsFilled: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // "Legg til" panel per requirement
  const [openAddReqId, setOpenAddReqId] = useState<string | null>(null)
  const [addArtistId, setAddArtistId] = useState('')

  // "Bytt komiker" panel per spot
  const [swapSpotId, setSwapSpotId] = useState<string | null>(null)
  const [swapArtistId, setSwapArtistId] = useState('')

  // Drag state
  const [draggingSpotId, setDraggingSpotId] = useState<string | null>(null)
  const [dragOverReqId, setDragOverReqId] = useState<string | null>(null)

  const activeSpots = confirmedSpots.filter(s =>
    ['confirmed', 'completed', 'paid'].includes(s.status)
  )

  function handleRemoveSpot(spotId: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('spot_id', spotId)
      fd.set('show_id', showId)
      try {
        await removeSpotAndReopenAction(fd)
        toast.success('Artist fjernet. Ny tilbudsrunde starter automatisk.')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Noe gikk galt')
      }
    })
  }

  function handleAddArtist(reqId: string) {
    if (!addArtistId) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('show_id', showId)
      fd.set('artist_id', addArtistId)
      fd.set('show_requirement_id', reqId)
      fd.set('currency', showCurrency)
      try {
        await addArtistToRequirementAction(fd)
        toast.success('Artist lagt til i lineupen.')
        setOpenAddReqId(null)
        setAddArtistId('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Noe gikk galt')
      }
    })
  }

  function handleSwapArtist(spotId: string) {
    if (!swapArtistId) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('spot_id', spotId)
      fd.set('new_artist_id', swapArtistId)
      fd.set('show_id', showId)
      try {
        await swapArtistAction(fd)
        toast.success('Artist byttet.')
        setSwapSpotId(null)
        setSwapArtistId('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Noe gikk galt')
      }
    })
  }

  function handleCancelOffer(offerId: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('offer_id', offerId)
      try {
        await cancelOfferAction(fd)
        toast.success('Tilbud trukket tilbake.')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Noe gikk galt')
      }
    })
  }

  function handleApproveOffer(offerId: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('offer_id', offerId)
      fd.set('show_id', showId)
      fd.set('status', 'accepted')
      try {
        await updateOfferStatusAction(fd)
        toast.success('Artist godkjent og lagt til i lineup.')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Noe gikk galt')
      }
    })
  }

  function handleDragStart(e: React.DragEvent, spotId: string) {
    e.dataTransfer.effectAllowed = 'move'
    setDraggingSpotId(spotId)
  }

  function handleDragEnd() {
    setDraggingSpotId(null)
    setDragOverReqId(null)
  }

  function handleDragOver(e: React.DragEvent, reqId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverReqId(reqId)
  }

  function handleDragLeave(e: React.DragEvent) {
    // only clear if leaving the card entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverReqId(null)
    }
  }

  function handleDrop(e: React.DragEvent, reqId: string) {
    e.preventDefault()
    const spotId = draggingSpotId
    setDraggingSpotId(null)
    setDragOverReqId(null)
    if (!spotId) return

    const spot = activeSpots.find(s => s.id === spotId)
    if (!spot || spot.show_requirement_id === reqId) return

    startTransition(async () => {
      const fd = new FormData()
      fd.set('spot_id', spotId)
      fd.set('show_requirement_id', reqId)
      fd.set('show_id', showId)
      try {
        await moveSpotAction(fd)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Noe gikk galt')
      }
    })
  }

  const unassignedOffers = allOffers.filter(o => !o.show_requirement_id && o.status === 'sent')

  return (
    <div className="space-y-5">
      {requirements.map(req => {
        const reqSpots = activeSpots.filter(s => s.show_requirement_id === req.id)
        const reqPending = allOffers.filter(
          o => o.show_requirement_id === req.id && o.status === 'sent'
        )
        const isLocked = reqSpots.length >= req.quantity
        const isDragOver = dragOverReqId === req.id

        return (
          <div
            key={req.id}
            className={`rounded-xl border bg-card overflow-hidden transition-all ${isDragOver && !isLocked ? 'ring-2 ring-primary border-primary' : ''}`}
            onDragOver={e => handleDragOver(e, req.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, req.id)}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className={`size-2 rounded-full shrink-0 ${isLocked ? 'bg-emerald-500' : reqPending.length > 0 ? 'bg-amber-400' : 'bg-muted-foreground/30'}`} />
                <span className="font-semibold text-sm">{req.role_name}</span>
                {isLocked && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Låst</span>
                )}
                {!isLocked && reqPending.length > 0 && (
                  <span className="text-xs text-amber-600 font-medium">
                    {reqPending.length} venter svar
                  </span>
                )}
              </div>
              {!isLocked && (
                <button
                  onClick={() => {
                    setOpenAddReqId(openAddReqId === req.id ? null : req.id)
                    setAddArtistId('')
                  }}
                  disabled={isPending}
                  className="text-xs font-medium px-2.5 py-1 rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  + Legg til
                </button>
              )}
            </div>

            {/* Confirmed spots */}
            {reqSpots.map(spot => {
              const artist = artistMap[spot.artist_id]
              const isSwapping = swapSpotId === spot.id
              const isDraggingThis = draggingSpotId === spot.id

              return (
                <div key={spot.id}>
                  <div
                    draggable={!isSwapping && !isPending}
                    onDragStart={e => handleDragStart(e, spot.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-4 py-3 border-l-2 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 transition-opacity ${isDraggingThis ? 'opacity-30' : ''} ${!isSwapping && !isPending ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    {/* Avatar */}
                    {artist?.profile_image_url ? (
                      <Image
                        src={artist.profile_image_url}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized={shouldBypassImageOptimization(artist.profile_image_url)}
                        className="size-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-9 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                        {(artist?.full_name ?? '?').charAt(0)}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin-app/artists/${spot.artist_id}`}
                          className="font-semibold text-sm truncate hover:underline underline-offset-2"
                        >
                          {artist?.full_name ?? '—'}
                        </Link>
                        {artist?.admin_score != null && (
                          <span className="text-xs text-muted-foreground shrink-0">⭐ {artist.admin_score}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{artist?.email}</div>
                    </div>

                    {/* Status */}
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[spot.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {spot.status}
                    </span>

                    {/* Fee */}
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums min-w-[60px] text-right">
                      {spot.fee_amount ? `${spot.fee_amount / 100} ${spot.currency ?? showCurrency}` : '—'}
                    </span>

                    {/* 3-dot menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="shrink-0 rounded p-1.5 hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
                          disabled={isPending}
                          aria-label="Handlinger"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                            <circle cx="8" cy="3" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="8" cy="13" r="1.5" />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => {
                            setSwapSpotId(isSwapping ? null : spot.id)
                            setSwapArtistId('')
                          }}
                        >
                          Bytt komiker
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleRemoveSpot(spot.id)}
                        >
                          Fjern
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Inline swap panel */}
                  {isSwapping && (
                    <div className="border-t bg-muted/10 px-4 py-3 flex flex-wrap items-center gap-2">
                      <select
                        value={swapArtistId}
                        onChange={e => setSwapArtistId(e.target.value)}
                        disabled={isPending}
                        className="flex-1 min-w-48 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      >
                        <option value="">Velg ny komiker...</option>
                        {selectableArtists
                          .filter(a => a.id !== spot.artist_id)
                          .map(a => (
                            <option key={a.id} value={a.id}>
                              {a.stage_name ?? a.full_name}{a.admin_score != null ? ` · ⭐${a.admin_score}` : ''}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleSwapArtist(spot.id)}
                        disabled={!swapArtistId || isPending}
                        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-opacity"
                      >
                        Bekreft
                      </button>
                      <button
                        onClick={() => { setSwapSpotId(null); setSwapArtistId('') }}
                        className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Avbryt
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pending offers (only shown when not locked) */}
            {!isLocked && reqPending.length > 0 && (
              <div className="divide-y">
                {reqPending.map(offer => {
                  const artist = artistMap[offer.artist_id]
                  return (
                    <div key={offer.id} className="flex items-center gap-3 px-4 py-2.5 border-l-2 border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                      {artist?.profile_image_url ? (
                        <Image
                          src={artist.profile_image_url}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized={shouldBypassImageOptimization(artist.profile_image_url)}
                          className="size-9 rounded-full object-cover shrink-0 opacity-70"
                        />
                      ) : (
                        <div className="size-9 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-sm font-bold text-amber-600 dark:text-amber-300 shrink-0">
                          {(artist?.full_name ?? '?').charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin-app/artists/${offer.artist_id}`}
                            className="text-sm truncate text-muted-foreground hover:underline underline-offset-2"
                          >
                            {artist?.full_name ?? '—'}
                          </Link>
                          {artist?.admin_score != null && (
                            <span className="text-xs text-muted-foreground/60 shrink-0">⭐ {artist.admin_score}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground/60 truncate">{artist?.email}</div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        Venter svar
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {offer.sent_at ? new Date(offer.sent_at).toLocaleDateString('nb-NO') : '—'}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="shrink-0 rounded p-1.5 hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
                            disabled={isPending}
                            aria-label="Handlinger"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                              <circle cx="8" cy="3" r="1.5" />
                              <circle cx="8" cy="8" r="1.5" />
                              <circle cx="8" cy="13" r="1.5" />
                            </svg>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleApproveOffer(offer.id)}>
                            Godkjenn
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleCancelOffer(offer.id)}
                          >
                            Trekk ut
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {reqSpots.length === 0 && reqPending.length === 0 && (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                {showStatus === 'draft'
                  ? 'Start booking for å sende tilbud til artister.'
                  : 'Ingen aktive tilbud eller bekreftede artister ennå.'}
              </p>
            )}

            {/* Add artist panel */}
            {openAddReqId === req.id && !isLocked && (
              <div className="border-t bg-muted/10 px-4 py-3 flex flex-wrap items-center gap-2">
                <select
                  value={addArtistId}
                  onChange={e => setAddArtistId(e.target.value)}
                  disabled={isPending}
                  className="flex-1 min-w-48 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value="">Velg komiker...</option>
                  {selectableArtists.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.stage_name ?? a.full_name}{a.admin_score != null ? ` · ⭐${a.admin_score}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleAddArtist(req.id)}
                  disabled={!addArtistId || isPending}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-opacity"
                >
                  Legg til
                </button>
                <button
                  onClick={() => { setOpenAddReqId(null); setAddArtistId('') }}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Avbryt
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Unassigned offers */}
      {unassignedOffers.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
            <span className="font-semibold text-sm">Øvrige tilbud</span>
            <span className="text-xs text-muted-foreground">Ikke tilknyttet krav</span>
          </div>
          <div className="divide-y">
            {unassignedOffers.map(o => {
              const artist = artistMap[o.artist_id]
              return (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 text-sm font-medium">{artist?.full_name ?? '—'}</div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Venter svar
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {o.sent_at ? new Date(o.sent_at).toLocaleDateString('nb-NO') : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {requirements.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground text-sm">
          Ingen krav definert ennå.
          <div className="mt-3">
            <Link
              href={`/admin-app/shows/${showId}?tab=requirements`}
              className="text-primary underline-offset-2 hover:underline text-sm"
            >
              Sett opp bookingkrav
            </Link>
          </div>
        </div>
      )}

      {/* All-filled celebration */}
      {allSlotsFilled && showStatus === 'booking' && (
        <div className="rounded-xl border-2 border-purple-300 bg-purple-50/50 dark:bg-purple-950/20 p-5">
          <h3 className="font-bold text-purple-900 dark:text-purple-300">Lineup er klar! 🎉</h3>
          <p className="text-sm text-purple-700 dark:text-purple-400 mt-0.5">
            Alle plasser er fylt. Systemet genererer lineup-plakat, publiserer eventside og starter markedsføring automatisk.
          </p>
        </div>
      )}
    </div>
  )
}
