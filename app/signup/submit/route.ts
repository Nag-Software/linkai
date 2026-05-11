import { NextResponse } from 'next/server'
import { registerArtist } from '@/lib/actions/artist'

export async function POST(request: Request) {
  const origin = `${request.headers.get('x-forwarded-proto') ?? 'http'}://${request.headers.get('host') ?? new URL(request.url).host}`
  const pathname = new URL(request.url).pathname
  const signupPath = pathname.startsWith('/artist-app/') ? '/artist-app/signup' : '/signup'
  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  try {
    await registerArtist({
      email,
      password: String(formData.get('password') ?? ''),
      full_name: String(formData.get('full_name') ?? ''),
      stage_name: optionalString(formData.get('stage_name')),
      phone: optionalString(formData.get('phone')),
      bio: optionalString(formData.get('bio')),
      category: optionalString(formData.get('category')),
      language: optionalString(formData.get('language')),
      social_links: socialLinks(formData),
      consent_ai_research: formData.get('consent_ai_research') === 'true',
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
  return 'failed'
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : undefined
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

function fileOrUndefined(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : undefined
}