'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getOpenAI } from '@/lib/openai'

type PosterArtistInput = string | {
  name: string
  profile_image_url?: string | null
  role_name?: string | null
}

type PosterArtist = {
  name: string
  profileImageUrl: string | null
  roleName: string | null
}

export async function generateShowPoster(showId: string, opts: {
  title: string
  date: string
  startTime?: string | null
  venue: string
  artists: PosterArtistInput[]
}): Promise<string | null> {
  const admin = createAdminClient()

  try {
    const artists = normalizePosterArtists(opts.artists)
    const headliners = artists.filter(a => isHeadlinerRole(a.roleName))
    const supporting = artists.filter(a => !isHeadlinerRole(a.roleName))
    const sorted = [...headliners, ...supporting]

    const dateText = formatPosterDate(opts.date)
    const timeText = opts.startTime ? `kl. ${opts.startTime.slice(0, 5)}` : ''
    const venue = opts.venue || 'humor.events'

    const headlinerNames = headliners.map(a => a.name).join(' og ')
    const supportNames   = supporting.map(a => a.name).join(', ')
    const allNames       = sorted.map(a => a.name).join(', ')

    const prompt = [
      `Create a professional Norwegian standup comedy show poster in portrait format (2:3 ratio).`,
      ``,
      `SHOW DETAILS:`,
      `- Title: "${opts.title}"`,
      `- Headliner comedian(s): ${headlinerNames || allNames}`,
      supporting.length > 0 ? `- Supporting comedians: ${supportNames}` : null,
      `- Date: ${dateText}${timeText ? `, ${timeText}` : ''}`,
      `- Venue: ${venue}`,
      ``,
      `DESIGN STYLE (match Norwegian standup posters like Latter/Stand Up Norge):`,
      `- Dark, dramatic background — near-black or deep navy`,
      `- Comedian names at the TOP in clean white sans-serif (stacked, centered, like movie credits)`,
      `- Large, golden metallic serif or display title text at the BOTTOM for the show name "${opts.title}" — this should be the biggest visual element`,
      `- Date and venue in smaller white text below the title`,
      `- A thin gold decorative rule or divider separating sections`,
      `- Footer strip at the very bottom with "BILLETTER · HUMOR.EVENTS" in small white text on black`,
      `- Photographic or illustrated comedian figure(s) in the middle — posed confidently, dramatic stage lighting`,
      `- The overall feel: premium, theatrical, gold-and-black color palette`,
      `- No clipart, no cartoons — photorealistic editorial style`,
    ].filter(Boolean).join('\n')

    const response = await getOpenAI().images.generate({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1536',
      quality: 'high',
    })

    const imageBase64 = response.data?.[0]?.b64_json
    if (!imageBase64) {
      console.error('[Poster] No image returned by model')
      return null
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const fileName = `${showId}/poster-${Date.now()}.png`
    const { error: uploadError } = await admin.storage
      .from('generated-posters')
      .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true })

    if (uploadError) {
      console.error('[Poster] Upload failed:', uploadError)
      return null
    }

    const { data: { publicUrl } } = admin.storage
      .from('generated-posters')
      .getPublicUrl(fileName)

    await admin.from('shows').update({ poster_url: publicUrl }).eq('id', showId)
    return publicUrl
  } catch (err) {
    console.error('[Poster] Generation failed:', err)
    return null
  }
}

function normalizePosterArtists(input: PosterArtistInput[]): PosterArtist[] {
  return input.map((artist) => typeof artist === 'string'
    ? { name: artist, profileImageUrl: null, roleName: null }
    : { name: artist.name, profileImageUrl: artist.profile_image_url ?? null, roleName: artist.role_name ?? null })
}

function isHeadlinerRole(roleName: string | null) {
  const normalized = roleName?.toLowerCase() ?? ''
  return normalized.includes('headliner') || normalized.includes('headline') || normalized.includes('hoved') || normalized.includes('top')
}

function formatPosterDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'short' }).format(date)
}

/**
 * 6.2 Run AI artist assessment
 * Fetches artist data, calls OpenAI, saves results.
 * AI never approves or rejects — it only suggests.
 */
export async function runArtistAiAssessment(artistId: string) {
  const admin = createAdminClient()

  // Fetch artist
  const { data: artist, error: artistError } = await admin
    .from('artists')
    .select('full_name, stage_name, bio, category, language, social_links')
    .eq('id', artistId)
    .single()

  if (artistError || !artist) {
    await admin.from('artist_ai_assessments').update({ ai_status: 'failed' }).eq('artist_id', artistId)
    return
  }

  const nameQuery = [artist.stage_name, artist.full_name].filter(Boolean).join(' / ')

  const systemPrompt = `
Du er en spesialist på norsk standupkomedie og live comedy-bransjen. Evaluer følgende artist og returner en strukturert JSON-vurdering.
Du må aldri godkjenne eller avvise artisten — bare gi forslag og informasjon.
Scoreingskala: 1-3 = ny/uerfaren, 4-6 = fremvoksende, 7-8 = etablert, 9-10 = headliner-nivå.
Returner bare gyldig JSON, ingen markdown, ingen prosatekst.
`.trim()

  const userPrompt = `
Artistnavn: ${nameQuery}
Kategori: ${artist.category ?? 'ukjent'}
Språk: ${artist.language ?? 'ukjent'}
Bio: ${artist.bio ?? 'ikke oppgitt'}
Sosiale lenker: ${JSON.stringify(artist.social_links ?? {})}

Basert på offentlig tilgjengelig informasjon og dataene over, gi:
{
  "ai_score_suggestion": <heltall 1-10>,
  "ai_energy_suggestion": <"high"|"low"|"uncertain">,
  "ai_experience_level": <"new"|"emerging"|"established"|"headliner"|"uncertain">,
  "ai_confidence": <"low"|"medium"|"high">,
  "ai_tags_suggestion": [<array med relevante sjanger/stil-tagger>],
  "ai_summary": "<2-3 setningers oppsummering>",
  "ai_reasoning": "<detaljert begrunnelse for scoren>",
  "ai_uncertainties": "<hva som er uklart eller uverifiserbart>",
  "ai_sources": [{"url": "<kilde>", "description": "<hva som ble funnet>"}]
}
`.trim()

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('Empty OpenAI response')

    const result = JSON.parse(content)

    await admin.from('artist_ai_assessments').update({
      ai_score_suggestion: result.ai_score_suggestion ?? null,
      ai_energy_suggestion: result.ai_energy_suggestion ?? null,
      ai_experience_level: result.ai_experience_level ?? null,
      ai_confidence: result.ai_confidence ?? null,
      ai_tags_suggestion: result.ai_tags_suggestion ?? null,
      ai_summary: result.ai_summary ?? null,
      ai_reasoning: result.ai_reasoning ?? null,
      ai_uncertainties: result.ai_uncertainties ?? null,
      ai_sources: result.ai_sources ?? null,
      ai_status: 'completed',
      ai_last_checked_at: new Date().toISOString(),
    }).eq('artist_id', artistId)
  } catch (err) {
    console.error('[AI Assessment] Failed:', err)
    await admin.from('artist_ai_assessments').update({
      ai_status: 'failed',
      ai_last_checked_at: new Date().toISOString(),
    }).eq('artist_id', artistId)
  }
}
