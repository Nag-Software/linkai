'use client'

import { useState } from 'react'
import Image from 'next/image'

type NaturalPosterImageProps = {
  src: string
  alt: string
  priority?: boolean
  sizes: string
  className?: string
}

export function NaturalPosterImage({ src, alt, priority = false, sizes, className }: NaturalPosterImageProps) {
  const [ratio, setRatio] = useState<number | null>(null)

  return (
    <div className={className} style={{ aspectRatio: ratio ?? 3 / 4 }}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain"
        onLoad={(event) => {
          const image = event.currentTarget
          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            setRatio(image.naturalWidth / image.naturalHeight)
          }
        }}
      />
    </div>
  )
}
