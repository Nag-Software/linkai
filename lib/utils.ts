import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shouldBypassImageOptimization(src: string | null | undefined) {
  if (!src) return false

  try {
    const { hostname } = new URL(src)
    return hostname === 'upload.wikimedia.org'
  } catch {
    return false
  }
}
