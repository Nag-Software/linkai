'use client'

import Image from 'next/image'

interface Props {
  text: string
  onClick?: () => void
  showIcon?: boolean
  icon?: React.ReactNode
  className?: string
}

export function RotatingBadge({ text, onClick, showIcon = false, icon, className = 'fixed top-4 right-4 md:top-8 md:right-8' }: Props) {
  const getRepetitions = (t: string) => {
    if (t.length <= 4) return 8
    if (t.length <= 6) return 6
    return 5
  }

  const reps = getRepetitions(text)
  const offset = 100 / reps

  return (
    <div
      className={`${className} w-[60px] h-[60px] md:w-[72px] md:h-[72px] lg:w-[154px] lg:h-[154px] z-40 animate-fade-in ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
      onClick={onClick}
    >
      <div className="w-full h-full relative" style={{ animation: 'spin 20s linear infinite' }}>
        <Image src="/badge.png" alt="Badge" fill className="object-contain" />
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
          <defs>
            <path id="circlePath" d="M 100, 30 a 70,70 0 1,1 0,140 a 70,70 0 1,1 0,-140" />
          </defs>
          {Array.from({ length: reps }).map((_, i) => (
            <text key={i} className="text-[16px] font-bold uppercase" fill="black">
              <textPath href="#circlePath" startOffset={`${i * offset}%`}>
                {text}
              </textPath>
            </text>
          ))}
        </svg>
      </div>
      {showIcon && icon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {icon}
        </div>
      )}
    </div>
  )
}
