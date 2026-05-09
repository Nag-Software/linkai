import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import { ToastActionForm } from '@/components/toast-action-form'
import {
  saveArtistAdminReview,
  approveArtistAction,
  rejectArtistAction,
  rerunAiAction,
  applyAiSuggestion,
} from './actions'

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const [{ data: artist }, { data: ai }] = await Promise.all([
    db.from('artists').select('*').eq('id', id).single(),
    db.from('artist_ai_assessments').select('*').eq('artist_id', id).single(),
  ])

  if (!artist) notFound()

  const scoreOptions = Array.from({ length: 10 }, (_, i) => i + 1)

  return (
    <div>
      <AdminHeader
        title={artist.full_name}
        description={artist.stage_name ?? artist.email}
        actions={
          <Link href="/admin-app/artists" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Tilbake
          </Link>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Profile + AI ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile card */}
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-sm">Innsendt profil</h2>
            <div className="flex flex-col gap-4 sm:flex-row">
              {artist.profile_image_url && (
                <img
                  src={artist.profile_image_url}
                  alt={artist.full_name}
                  className="h-64 w-full rounded-xl object-cover sm:h-56 sm:w-44 lg:h-72 lg:w-56 shrink-0"
                />
              )}
              <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm flex-1 sm:grid-cols-2">
                <ProfileField label="Fullt navn" value={artist.full_name} />
                <ProfileField label="Scenenavn" value={artist.stage_name} />
                <ProfileField label="E-post" value={artist.email} />
                <ProfileField label="Telefon" value={artist.phone} />
                <ProfileField label="Kategori" value={artist.category} />
                <ProfileField label="Språk" value={artist.language} />
                <ProfileField label="AI-samtykke" value={artist.consent_ai_research ? 'Ja' : 'Nei'} />
              </div>
            </div>
            {artist.bio && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bio</p>
                <p className="text-sm whitespace-pre-wrap">{artist.bio}</p>
              </div>
            )}
            {artist.social_links && Object.keys(artist.social_links).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sosiale lenker</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(artist.social_links).map(([k, v]) => (
                    <a key={k} href={v} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary underline underline-offset-2">
                      {k}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* AI assessment card */}
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">AI-vurdering</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                ai?.ai_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                ai?.ai_status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {ai?.ai_status ?? 'ikke kjørt'}
              </span>
            </div>

            <div className="rounded-md border border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Dette er et veiledende AI-forslag. Admin bestemmer alltid.
            </div>

            {ai && ai.ai_status === 'completed' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <AiBadge label="Score" value={ai.ai_score_suggestion ?? '—'} />
                  <AiBadge label="Energi" value={ai.ai_energy_suggestion ?? '—'} />
                  <AiBadge label="Erfaring" value={ai.ai_experience_level ?? '—'} />
                  <AiBadge label="Confidence" value={ai.ai_confidence ?? '—'} />
                </div>
                {ai.ai_tags_suggestion && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Foreslåtte tags</p>
                    <div className="flex flex-wrap gap-1">
                      {ai.ai_tags_suggestion.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded bg-muted text-xs">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {ai.ai_summary && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Oppsummering</p>
                    <p className="text-sm">{ai.ai_summary}</p>
                  </div>
                )}
                {ai.ai_reasoning && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Begrunnelse</summary>
                    <p className="mt-2 text-muted-foreground">{ai.ai_reasoning}</p>
                  </details>
                )}
                {ai.ai_uncertainties && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Usikkerheter</summary>
                    <p className="mt-2 text-muted-foreground">{ai.ai_uncertainties}</p>
                  </details>
                )}

                {/* AI action buttons */}
                <div className="flex gap-2 pt-1">
                  <ToastActionForm action={applyAiSuggestion}>
                    <input type="hidden" name="artist_id" value={artist.id} />
                    <button type="submit" className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      Bruk AI-forslag
                    </button>
                  </ToastActionForm>
                  <ToastActionForm action={rerunAiAction}>
                    <input type="hidden" name="artist_id" value={artist.id} />
                    <button type="submit" className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
                      Kjør AI på nytt
                    </button>
                  </ToastActionForm>
                </div>
              </>
            )}

            {(!ai || ai.ai_status !== 'completed') && (
              <ToastActionForm action={rerunAiAction}>
                <input type="hidden" name="artist_id" value={artist.id} />
                <button type="submit" className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
                  Kjør AI-vurdering
                </button>
              </ToastActionForm>
            )}
          </section>
        </div>

        {/* ── Right: Admin review form ── */}
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-sm">Admin-vurdering</h2>

            <ToastActionForm action={saveArtistAdminReview} className="space-y-4" successMessage="Vurderingen er lagret.">
              <input type="hidden" name="artist_id" value={artist.id} />

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select name="status" defaultValue={artist.status}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="pending_review">pending_review</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="inactive">inactive</option>
                  <option value="flagged">flagged</option>
                </select>
              </div>

              {/* Score */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Admin score (1–10)</label>
                <select name="admin_score" defaultValue={artist.admin_score ?? ''}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— ingen —</option>
                  {scoreOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Energy */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Energinivå</label>
                <select name="admin_energy_level" defaultValue={artist.admin_energy_level ?? ''}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— ingen —</option>
                  <option value="high">high</option>
                  <option value="low">low</option>
                  <option value="uncertain">uncertain</option>
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tags (kommaseparert)</label>
                <input
                  name="admin_tags"
                  defaultValue={(artist.admin_tags ?? []).join(', ')}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="jazz, vocals, electro"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Notater</label>
                <textarea
                  name="admin_notes"
                  defaultValue={artist.admin_notes ?? ''}
                  rows={3}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Interne notater..."
                />
              </div>

              {/* Flag */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Flagget</label>
                <select name="is_flagged" defaultValue={artist.is_flagged ? 'true' : 'false'}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="false">Nei</option>
                  <option value="true">Ja — flagget</option>
                </select>
              </div>

              {artist.is_flagged && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Årsak til flagging</label>
                  <input
                    name="flag_reason"
                    defaultValue={artist.flag_reason ?? ''}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              <button type="submit"
                className="w-full bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                Lagre
              </button>
            </ToastActionForm>

            {/* Quick actions */}
            <div className="flex gap-2 pt-1 border-t">
              <ToastActionForm action={approveArtistAction} className="flex-1">
                <input type="hidden" name="artist_id" value={artist.id} />
                <input type="hidden" name="admin_score" value={artist.admin_score ?? 7} />
                <button type="submit"
                  className="w-full text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                  ✓ Godkjenn
                </button>
              </ToastActionForm>
              <ToastActionForm action={rejectArtistAction} className="flex-1">
                <input type="hidden" name="artist_id" value={artist.id} />
                <button type="submit"
                  className="w-full text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                  ✕ Avvis
                </button>
              </ToastActionForm>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value ?? '—'}</p>
    </div>
  )
}

function AiBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-sm mt-0.5">{value}</p>
    </div>
  )
}
