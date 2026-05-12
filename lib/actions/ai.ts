'use server'

import { toFile, type Uploadable } from 'openai'
import sharp from 'sharp'
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

type PosterReferencePhoto = {
  artist: PosterArtist & { profileImageUrl: string }
  buffer: Buffer
  contentType: string
  file: Uploadable
}

type PosterReferencePackage = {
  images: Uploadable[]
  identityLines: string[]
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
    const posterPlan = createPosterPlan(showId, opts.title, opts.date, sorted.length)
    const referencePackage = await buildPosterReferences(sorted)
    const referenceImages = referencePackage.images

    const headlinerNames = headliners.map(a => a.name).join(' og ')
    const supportNames   = supporting.map(a => a.name).join(', ')
    const allNames       = sorted.map(a => a.name).join(', ')
    const referenceList = referencePackage.identityLines.length > 0
      ? referencePackage.identityLines.join('\n')
      : sorted.map((artist) => `${artist.name}${artist.roleName ? ` (${artist.roleName})` : ''} - no reference photo`).join('\n')

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
      `REFERENCE PHOTOS AND FACE RULES:`,
      referenceList,
      referenceImages.length > 0
        ? `Input image 1 is a labeled IDENTITY MAP. The name printed directly under each face is the canonical mapping. Match every face to that exact printed name. Input images 2 and onward are the original Supabase profile photos in the exact same numbered order as the identity list above. Use those artist profile photos as the source of truth for the comedians. Preserve identity, face geometry, skin tone, expression, hair, glasses, beard, and distinctive features with high fidelity. Do not invent replacement faces, do not beautify, do not age-change, do not caricature, and do not merge faces. Use the supplied photos as authentic press/profile imagery in the poster composition.`
        : `No artist reference photos were supplied. Avoid prominent generated faces; lean on typography and stage atmosphere.`,
      ``,
      `POSTER PLAN FOR THIS SPECIFIC SHOW:`,
      `- Concept: ${posterPlan.concept}`,
      `- Composition: ${posterPlan.composition}`,
      `- Photo treatment: ${posterPlan.photoTreatment}`,
      `- Palette: ${posterPlan.palette}`,
      `- Typography: ${posterPlan.typography}`,
      `- Texture/detail: ${posterPlan.texture}`,
      ``,
      `DESIGN REQUIREMENTS:`,
      `- Make this poster visually distinct from other humor.events posters; follow the show-specific plan above.`,
      `- Norwegian comedy poster quality: credible enough for Latter, Stand Up Norge, venue posters, and ticketing pages.`,
      `- Title "${opts.title}" must be the dominant readable text.`,
      `- Include date and venue clearly, with a small footer: "BILLETTER · HUMOR.EVENTS".`,
      `- Keep faces crisp, undistorted, and recognizable. Authenticity is more important than stylization.`,
      `- The visible artist name next to or above each portrait must match the face according to the labeled IDENTITY MAP. Never swap names between faces.`,
      `- Do not copy the IDENTITY MAP layout, numbers, grid, or reference labels into the final poster; use it only to map each name to the correct face.`,
      `- No fake names, no extra comedians, no malformed faces, no duplicated people.`,
    ].filter(Boolean).join('\n')

    const openai = getOpenAI()
    const response = referenceImages.length > 0
      ? await openai.images.edit({
        model: 'gpt-image-1.5',
        image: referenceImages,
        prompt,
        n: 1,
        size: '1024x1536',
        quality: 'high',
        input_fidelity: 'high',
        output_format: 'png',
      })
      : await openai.images.generate({
        model: 'gpt-image-1.5',
        prompt,
        n: 1,
        size: '1024x1536',
        quality: 'high',
        output_format: 'png',
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
  const seen = new Set<string>()
  return input
    .map((artist) => typeof artist === 'string'
      ? { name: artist, profileImageUrl: null, roleName: null }
      : { name: artist.name, profileImageUrl: artist.profile_image_url ?? null, roleName: artist.role_name ?? null })
    .filter((artist) => {
      const key = artist.name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function isHeadlinerRole(roleName: string | null) {
  const normalized = roleName?.toLowerCase() ?? ''
  return normalized.includes('headliner') || normalized.includes('headline') || normalized.includes('hoved') || normalized.includes('top')
}

async function buildPosterReferences(artists: PosterArtist[]): Promise<PosterReferencePackage> {
  const referencePhotos = await fetchPosterReferencePhotos(artists)
  if (!referencePhotos.length) return { images: [], identityLines: [] }

  const identityMap = await createIdentityMap(referencePhotos)
  const originalFiles = referencePhotos.map((photo) => photo.file)
  const identityLines = referencePhotos.map((photo, index) => (
    `${index + 1}. ${photo.artist.name}${photo.artist.roleName ? ` (${photo.artist.roleName})` : ''} - Supabase profile photo supplied as input image ${index + 2}`
  ))

  return { images: [identityMap, ...originalFiles], identityLines }
}

async function fetchPosterReferencePhotos(artists: PosterArtist[]): Promise<PosterReferencePhoto[]> {
  const artistsWithImages = artists
    .filter((artist): artist is PosterArtist & { profileImageUrl: string } => Boolean(artist.profileImageUrl))
    .slice(0, 15)

  const photos: PosterReferencePhoto[] = []
  for (const [index, artist] of artistsWithImages.entries()) {
    try {
      const response = await fetch(artist.profileImageUrl, { cache: 'no-store' })
      if (!response.ok) {
        console.warn(`[Poster] Could not fetch reference image for ${artist.name}: ${response.status}`)
        continue
      }

      const contentType = response.headers.get('content-type') ?? 'image/jpeg'
      if (!contentType.startsWith('image/')) {
        console.warn(`[Poster] Reference URL for ${artist.name} is not an image: ${contentType}`)
        continue
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
      const safeName = artist.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || `artist-${index + 1}`
      photos.push({
        artist,
        buffer,
        contentType,
        file: await toFile(buffer, `${index + 1}-${safeName}.${extension}`, { type: contentType }),
      })
    } catch (error) {
      console.warn(`[Poster] Failed to prepare reference image for ${artist.name}:`, error)
    }
  }

  return photos
}

async function createIdentityMap(photos: PosterReferencePhoto[]): Promise<Uploadable> {
  const tileWidth = 300
  const photoHeight = 300
  const labelHeight = 72
  const tileHeight = photoHeight + labelHeight
  const columns = Math.min(4, photos.length)
  const rows = Math.ceil(photos.length / columns)
  const headerHeight = 88
  const width = columns * tileWidth
  const height = headerHeight + rows * tileHeight

  const composites: sharp.OverlayOptions[] = [
    {
      input: Buffer.from(`
        <svg width="${width}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#111111"/>
          <text x="24" y="34" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#ffffff">IDENTITY MAP - DO NOT SWAP NAMES</text>
          <text x="24" y="62" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#f4f4f5">Each profile photo below is labeled with the exact artist name.</text>
        </svg>
      `),
      left: 0,
      top: 0,
    },
  ]

  for (const [index, photo] of photos.entries()) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const left = column * tileWidth
    const top = headerHeight + row * tileHeight
    const image = await sharp(photo.buffer)
      .resize({ width: tileWidth, height: photoHeight, fit: 'contain', background: '#ffffff' })
      .png()
      .toBuffer()
    const label = Buffer.from(`
      <svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="0" y="0" width="100%" height="1" fill="#d4d4d8"/>
        <text x="14" y="29" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="800" fill="#111111">${index + 1}. ${escapeSvgText(photo.artist.name)}</text>
        ${photo.artist.roleName ? `<text x="14" y="54" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#52525b">${escapeSvgText(photo.artist.roleName)}</text>` : ''}
      </svg>
    `)

    composites.push({ input: image, left, top })
    composites.push({ input: label, left, top: top + photoHeight })
  }

  const sheet = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#f4f4f5',
    },
  })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toBuffer()

  return toFile(sheet, '00-identity-map-names-and-faces.jpg', { type: 'image/jpeg' })
}

function escapeSvgText(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function createPosterPlan(showId: string, title: string, date: string, artistCount: number) {
  const plans = [
    {
      concept: 'premium black-box theatre premiere, cinematic and elegant',
      composition: artistCount > 3 ? 'clean ensemble row with the headliner slightly larger, title anchored at the bottom' : 'large central portrait with supporting artists in smaller side columns',
      photoTreatment: 'authentic photo cutouts with subtle rim light, natural skin, no illustration filter',
      palette: 'black, warm ivory, restrained gold accents',
      typography: 'tall condensed sans-serif names at top, expressive serif title at bottom',
      texture: 'fine stage haze, soft spotlight gradients, thin gold divider lines',
    },
    {
      concept: 'bright Norwegian comedy gala poster with magazine-cover energy',
      composition: artistCount > 4 ? 'stacked group collage with overlapping portrait cutouts' : 'three-quarter portrait collage with dynamic diagonals',
      photoTreatment: 'clean press-photo cutouts, exact faces, light studio shadow behind each comedian',
      palette: 'off-white, black, burgundy, metallic champagne',
      typography: 'bold editorial sans-serif headline with compact credit blocks',
      texture: 'paper grain, subtle halftone shadows, ticket-stub footer',
    },
    {
      concept: 'retro 1970s comedy special with colorful graphic shapes',
      composition: 'large circular or arched portrait windows around the title, balanced like a festival poster',
      photoTreatment: 'profile photos placed as crisp photo inserts, not redrawn; warm studio color grade only',
      palette: 'coral, teal, ochre, cream, deep brown text',
      typography: 'chunky rounded display title with small clean venue/date text',
      texture: 'screenprint grain and layered poster shapes',
    },
    {
      concept: 'minimal typographic club poster, sharp and modern',
      composition: 'oversized title typography with exact artist portraits in a neat grid or strip',
      photoTreatment: 'small but crisp unchanged portrait crops with clear eyes and faces',
      palette: 'white, black, signal red, one accent color',
      typography: 'Swiss grid sans-serif, strong hierarchy, lots of breathing room',
      texture: 'clean print layout with tiny registration marks and rules',
    },
    {
      concept: 'playful smiley-pattern comedy poster with strong ticket-sales energy',
      composition: 'one hero comedian photo against a repeated graphic motif, other comedians as smaller badges',
      photoTreatment: 'source-photo cutouts preserved exactly, crisp edges, no cartooning',
      palette: 'yellow, black, white, small red accents',
      typography: 'heavy block title, compact date pill, bold footer callout',
      texture: 'sticker edges, light photocopy grain, venue-poster roughness',
    },
    {
      concept: 'Nordic outdoor summer comedy poster, fresh and unexpected',
      composition: 'artist photos arranged as natural editorial portraits over a scenic but graphic backdrop',
      photoTreatment: 'realistic source-photo integration, natural daylight grade, exact faces',
      palette: 'forest green, sky blue, white, warm yellow',
      typography: 'large friendly sans-serif title with clean festival-style info blocks',
      texture: 'soft film grain, organic shapes, subtle sun flare',
    },
    {
      concept: 'tabloid-premiere poster with big confidence and humor',
      composition: 'tight crop portrait collage, oversized title across the middle like a headline',
      photoTreatment: 'unchanged profile faces, high-contrast editorial press lighting',
      palette: 'black, white, red, saturated gold',
      typography: 'bold newspaper headline mixed with compact sans-serif credits',
      texture: 'newsprint grain, torn-paper accents, sticker-like date mark',
    },
    {
      concept: 'clean pink/cream solo-special style with retro broadcast graphics',
      composition: 'single strong hero portrait if one headliner, otherwise stacked cameo portraits around the title',
      photoTreatment: 'profile photos as exact photographic inserts with very light color matching only',
      palette: 'soft pink, cream, orange, burgundy, muted blue',
      typography: 'friendly chunky display title with tidy uppercase metadata',
      texture: 'soft paper grain, simple abstract rings, vintage TV warmth',
    },
  ]

  const index = stableHash(`${showId}:${title}:${date}`) % plans.length
  return plans[index]
}

function stableHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
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
