'use client'

import { useEffect, useState } from 'react'

const CITIES = ['Bergen', 'Oslo', 'Trondheim', 'Drammen', 'Stavanger']

export function CityTicker() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % CITIES.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <span
      key={index}
      className="absolute inset-0 flex items-center justify-center animate-city-drop"
    >
      {CITIES[index]}
    </span>
  )
}
