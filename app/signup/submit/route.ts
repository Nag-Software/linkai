import { NextResponse } from 'next/server'
import { registerArtist } from '@/lib/actions/artist'
import { canonicalRoleValues } from '@/lib/artist-roles'
import type { ArtistGender } from '@/types/database'

export async function POST(request: Request) {
  const origin = `${request.headers.get('x-forwarded-proto') ?? 'http'}://${request.headers.get('host') ?? new URL(request.url).host}`
  const pathname = new URL(request.url).pathname
  const isArtistAppSignup = pathname.startsWith('/artist-app/')
  const signupPath = isArtistAppSignup ? '/artist-app/signup' : '/signup'
  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  try {
    if (isArtistAppSignup) validateSignupForm(formData)

    await registerArtist({
      email,
      password: String(formData.get('password') ?? ''),
      full_name: String(formData.get('full_name') ?? ''),
      stage_name: optionalString(formData.get('stage_name')),
      phone: optionalString(formData.get('phone')),
      bio: optionalString(formData.get('bio')),
      category: categories(formData),
      language: optionalString(formData.get('language')),
      gender: gender(formData.get('gender')),
      social_links: socialLinks(formData),
      profile_image_file: fileOrUndefined(formData.get('profile_image_file')),
    })

    return NextResponse.redirect(new URL(`${signupPath}?status=submitted`, origin), 303)
  } catch (error) {
    console.error(error)
    const code = toSignupErrorCode(error)
    return NextResponse.redirect(new URL(`${signupPath}?error=${code}`, origin), 303)
  }
}

function toSignupErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('already') || message.includes('duplicate')) return 'email_exists'
  if (message.includes('password')) return 'invalid_password'
  if (message.includes('email')) return 'invalid_email'
  if (message.includes('youtube')) return 'invalid_youtube'
  if (message.includes('required')) return 'missing'
  return 'failed'
}

function validateSignupForm(formData: FormData) {
  const requiredTextFields = ['full_name', 'stage_name', 'email', 'password', 'phone', 'language', 'gender']
  const hasMissingText = requiredTextFields.some((field) => !optionalString(formData.get(field)))
  const hasImage = Boolean(fileOrUndefined(formData.get('profile_image_file')))
  const hasCategory = formData.getAll('category').some((value) => optionalString(value))
  const youtube = optionalString(formData.get('youtube'))

  if (hasMissingText || !hasImage || !hasCategory || !youtube) {
    throw new Error('Required fields missing')
  }

  if (!isYouTubeUrl(youtube)) {
    throw new Error('Invalid YouTube URL')
  }
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : undefined
}

function categories(formData: FormData) {
  const values = formData
    .getAll('category')
    .map((value) => optionalString(value))
    .filter((value): value is string => Boolean(value))
  const normalized = canonicalRoleValues(values)
  return normalized.length > 0 ? normalized : undefined
}

function gender(value: FormDataEntryValue | null): ArtistGender | undefined {
  const text = optionalString(value)
  if (text === 'male' || text === 'female' || text === 'other') return text
  return undefined
}

function socialLinks(formData: FormData): Record<string, string> | undefined {
  const links = {
    instagram: optionalString(formData.get('instagram')),
    tiktok: optionalString(formData.get('tiktok')),
    youtube: optionalString(formData.get('youtube')),
    facebook: optionalString(formData.get('facebook')),
    website: optionalString(formData.get('website')),
  }
  const entries = Object.entries(links).filter((entry): entry is [string, string] => Boolean(entry[1]))
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function isYouTubeUrl(value: string) {
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com'
  } catch {
    return false
  }
}

function fileOrUndefined(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : undefined
}