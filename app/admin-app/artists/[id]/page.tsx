import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/admin-header'
import { ToastActionForm } from '@/components/toast-action-form'
import { EditableArtistProfile } from '@/components/admin/editable-artist-profile'
import {
  saveArtistAdminReview,
  approveArtistAction,
  rejectArtistAction,
  rerunAiAction,
  applyAiSuggestion,
  deleteArtistAction,
} from './actions'
import { DeleteButton } from '@/components/admin/delete-button'
import { TagInput } from '@/components/admin/tag-input'

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
          <div className="flex items-center gap-2">
            <Link href="/admin-app/artists" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Tilbake
            </Link>
            <DeleteButton
              action={deleteArtistAction}
              id={artist.id}
              idField="artist_id"
              confirmMessage={`Slett komikeren "${artist.full_name}"? Dette kan ikke angres.`}
            />
          </div>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Profile + AI ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile card — inline editable */}
          <EditableArtistProfile artist={artist} />

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
          <section className="rounded-xl border bg-card p-5 space-y-5">
            <h2 className="font-semibold text-sm">Admin-vurdering</h2>

            <ToastActionForm action={saveArtistAdminReview} className="space-y-5" successMessage="Vurderingen er lagret.">
              <input type="hidden" name="artist_id" value={artist.id} />

              {/* Kjønn */}
              <AdminChipGroup
                label="Kjønn"
                name="gender"
                current={artist.gender ?? ''}
                chips={[
                  { value: 'male', label: 'Mann' },
                  { value: 'female', label: 'Kvinne' },
                ]}
              />

              {/* Energinivå */}
              <AdminChipGroup
                label="Energinivå"
                name="admin_energy_level"
                current={artist.admin_energy_level ?? ''}
                chips={[
                  { value: 'high', label: 'Høy' },
                  { value: 'medium', label: 'Middels' },
                  { value: 'low', label: 'Lav' },
                ]}
              />

              {/* Score */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Score</p>
                <div className="flex flex-wrap gap-1.5">
                  {scoreOptions.map((n) => (
                    <label key={n} className="cursor-pointer">
                      <input
                        type="radio"
                        name="admin_score"
                        value={n}
                        defaultChecked={artist.admin_score === n}
                        className="sr-only peer"
                      />
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-colors peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary hover:bg-muted select-none">
                        {n}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Type — multi-select */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: 'headliner', label: 'Headliner' },
                    { value: 'konferansier', label: 'Konferansier' },
                    { value: 'klubbkomiker', label: 'Klubbkomiker' },
                    { value: 'open_mic', label: 'Open Mic' },
                  ].map((chip) => (
                    <label key={chip.value} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name="admin_type"
                        value={chip.value}
                        defaultChecked={(artist.admin_type ?? []).includes(chip.value as never)}
                        className="sr-only peer"
                      />
                      <span className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium transition-colors select-none peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary hover:bg-muted">
                        {chip.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select name="status" defaultValue={artist.status}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="pending_review">Til vurdering</option>
                  <option value="approved">Godkjent</option>
                  <option value="rejected">Avvist</option>
                  <option value="inactive">Inaktiv</option>
                  <option value="flagged">Flagget</option>
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                <TagInput
                  name="admin_tags"
                  initialTags={artist.admin_tags ?? []}
                  placeholder="Skriv og trykk Enter…"
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

function AiBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-sm mt-0.5">{value}</p>
    </div>
  )
}

function AdminChipGroup({ label, name, current, chips }: {
  label: string
  name: string
  current: string  // single-select (radio)
  chips: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(chip => (
          <label key={chip.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={chip.value}
              defaultChecked={current === chip.value}
              className="sr-only peer"
            />
            <span className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium transition-colors select-none peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary hover:bg-muted">
              {chip.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
