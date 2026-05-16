'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicShow } from '@/lib/public-events'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function formatCardDate(show: Pick<PublicShow, 'date' | 'start_time'>) {
  const dt = new Date(`${show.date}T${show.start_time}`)
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`
}

function formatCardTime(show: Pick<PublicShow, 'start_time'>) {
  return show.start_time?.slice(0, 5) ?? ''
}

function formatDateLabel(d: Date) {
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  shows: PublicShow[]
  userCountry?: string
}

export function EventsGridClient({ shows, userCountry = 'hele norge' }: Props) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [initialSet, setInitialSet] = useState(false)

  useEffect(() => {
    if (!initialSet && shows.length > 0) {
      const today = new Date()
      const hasToday = shows.some((s) => {
        const d = new Date(s.date)
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        )
      })
      if (hasToday) setDate(today)
      setInitialSet(true)
    }
  }, [shows, initialSet])

  const filtered = shows.filter((s) => {
    if (!date) return true
    const d = new Date(s.date)
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    )
  })

  return (
    <section id="events-section" className="px-4 md:px-8 pb-16 pt-6 md:pt-16">
      <div>
        <div className="flex flex-wrap items-center gap-0 mb-6 md:mb-8 animate-fade-in" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
          <h2 className="text-base md:text-lg lg:text-xl font-normal w-full sm:w-auto mb-2 sm:mb-0">
            Utforsk eventer i
          </h2>
          <span className="text-base md:text-lg lg:text-xl font-normal border border-black px-2 py-1 sm:ml-2">
            {userCountry}
          </span>

          {/* Mobile/tablet date picker */}
          <div className="lg:hidden">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'text-base md:text-lg lg:text-xl font-normal border border-l-0 border-black px-2 py-1 flex items-center bg-white hover:bg-gray-50 transition-colors',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDateLabel(date) : <span>Pick a date</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 mt-8 md:mt-16">
          {/* Desktop calendar */}
          <div
            className="hidden lg:block animate-fade-in lg:sticky lg:top-24 self-start"
            style={{ animationDelay: '0.9s', animationFillMode: 'both' }}
          >
            <Calendar mode="single" selected={date} onSelect={setDate} className="mx-auto" />
          </div>

          {/* Event grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:col-start-2 gap-5">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-12">
                {date
                  ? `Ingen eventer funnet for ${date.toLocaleDateString('nb-NO', { weekday: 'long', month: 'long', day: 'numeric' })}`
                  : 'Ingen eventer funnet.'}
              </div>
            ) : (
              filtered.map((show, index) => (
                <div
                  key={show.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${1.0 + index * 0.1}s`, animationFillMode: 'both' }}
                >
                  <EventCard show={show} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function EventCard({ show }: { show: PublicShow }) {
  return (
    <Link href={`/events/${show.slug ?? show.id}`} className="relative cursor-pointer group block">
      <div className="overflow-hidden mb-3">
        <div className="aspect-square bg-gray-300 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110 relative">
          {show.poster_url ? (
            <Image
              src={show.poster_url}
              alt={show.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900" />
          )}
        </div>
      </div>
      <div className="absolute top-4 left-4 flex flex-col gap-0">
        <div className="bg-white border border-black px-3 h-[23px] flex items-center">
          <div className="text-[11px] font-medium uppercase leading-none">{formatCardDate(show)}</div>
        </div>
        <div className="bg-white border border-t-0 border-black px-3 h-[23px] flex items-center">
          <div className="text-[11px] font-medium leading-none">{formatCardTime(show)}</div>
        </div>
      </div>
      <h3 className="text-lg font-medium">{show.title}</h3>
      <p className="text-sm text-gray-500 mt-1">{show.venue_name ?? show.venue_address ?? ''}</p>
    </Link>
  )
}
