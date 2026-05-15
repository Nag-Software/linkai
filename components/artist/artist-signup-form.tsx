"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AtSign,
  BadgeCheck,
  Camera,
  Clapperboard,
  Globe2,
  ImagePlus,
  Lock,
  Phone,
  User,
  Video,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ARTIST_ROLE_LABEL_OPTIONS } from '@/lib/artist-roles'
import { Label } from "../ui/label"

const categories = ARTIST_ROLE_LABEL_OPTIONS

const requiredFields = [
  { id: "full_name", label: "Navn" },
  { id: "stage_name", label: "Scenenavn" },
  { id: "email", label: "E-post" },
  { id: "password", label: "Passord" },
  { id: "profile_image_file", label: "Profilbilde" },
  { id: "phone", label: "Telefon" },
  { id: "language", label: "Språk" },
  { id: "gender", label: "Kjønn" },
  { id: "category", label: "Kategori" },
  { id: "youtube", label: "YouTube-video" },
] as const

type RequiredFieldId = (typeof requiredFields)[number]["id"]

const fieldClassName = 'h-11 rounded-none border-2 border-zinc-950 bg-white/70 shadow-none'
const selectClassName = 'h-11 w-full rounded-none border-2 border-zinc-950 bg-white/70 px-3 text-sm outline-none transition-colors focus-visible:border-zinc-950 focus-visible:ring-0'
const textareaClassName = 'min-h-28 w-full rounded-none border-2 border-zinc-950 bg-white/70 px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-500 focus-visible:border-zinc-950 focus-visible:ring-0'

export function ArtistSignupForm({
  className,
  action = "/artist-app/signup/submit",
  errorMessage,
  successMessage,
  ...props
}: React.ComponentProps<"div"> & {
  action?: string
  errorMessage?: string
  successMessage?: string
}) {
  const [values, setValues] = useState<Record<RequiredFieldId, boolean>>({
    full_name: false,
    stage_name: false,
    email: false,
    password: false,
    profile_image_file: false,
    phone: false,
    language: false,
    gender: false,
    category: false,
    youtube: false,
  })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [imageName, setImageName] = useState<string | null>(null)

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage)
    if (successMessage) toast.success(successMessage)
  }, [errorMessage, successMessage])

  const completed = useMemo(
    () => requiredFields.filter((field) => values[field.id]).length,
    [values]
  )
  const progress = Math.round((completed / requiredFields.length) * 100)
  const missing = requiredFields.filter((field) => !values[field.id])

  function updateTextField(field: RequiredFieldId, value: string) {
    setValues((prev) => ({
      ...prev,
      [field]: field === "password" ? value.length >= 8 : value.trim().length > 0,
    }))
  }

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
      setValues((current) => ({ ...current, category: next.length > 0 }))
      return next
    })
  }

  return (
    <div className={cn('mx-auto max-w-6xl border-2 border-zinc-950 bg-[#fbf7ec] shadow-[8px_8px_0_rgba(24,24,27,0.14)]', className)} {...props}>
      <div className="grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b-2 border-zinc-950 bg-[#f3ead9] p-6 lg:border-b-0 lg:border-r-2">
          <div className="lg:sticky lg:top-6">
            <Link href="/" className="inline-flex border border-zinc-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-950">humor.events</Link>
            <h1 className="mt-6 text-3xl font-black uppercase leading-none tracking-tight">Søknad</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">
              Søknaden sendes til booking-teamet for vurdering.
            </p>

            <div className="mt-6 border-2 border-zinc-950 bg-white/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-bold uppercase tracking-[0.16em] text-zinc-500">Registrering</span>
                <span className="font-black text-zinc-950">{completed}/{requiredFields.length}</span>
              </div>
              <div className="h-2 overflow-hidden border border-zinc-950 bg-[#f3ead9]">
                <div
                  className="h-full bg-[#b83224] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs font-medium leading-5 text-zinc-600">
                {missing.length === 0
                  ? "Alt obligatorisk er fylt ut."
                  : `Mangler: ${missing.map((field) => field.label).slice(0, 3).join(", ")}${missing.length > 3 ? ` +${missing.length - 3}` : ""}`}
              </p>
            </div>
          </div>
        </aside>

        <form action={action} method="post" encType="multipart/form-data" className="space-y-8 p-6 md:p-8">
          {successMessage && (
            <div className="border-2 border-zinc-950 bg-white px-3 py-2 text-sm font-medium text-zinc-950">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="border-2 border-[#b83224] bg-white px-3 py-2 text-sm font-medium text-[#b83224]">
              {errorMessage}
            </div>
          )}

          <section className="space-y-4">
            <SectionHeader icon={User} title="Identitet" />
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput icon={User} id="full_name" name="full_name" label="Fullt navn" autoComplete="name" onValue={(value) => updateTextField("full_name", value)} required />
              <LabeledInput icon={Clapperboard} id="stage_name" name="stage_name" label="Scenenavn" autoComplete="organization-title" onValue={(value) => updateTextField("stage_name", value)} required />
              <LabeledInput icon={AtSign} id="email" name="email" label="E-post" type="email" placeholder="navn@eksempel.no" autoComplete="email" onValue={(value) => updateTextField("email", value)} required />
              <LabeledInput icon={Lock} id="password" name="password" label="Passord" type="password" minLength={8} autoComplete="new-password" onValue={(value) => updateTextField("password", value)} required />
              <LabeledInput icon={Phone} id="phone" name="phone" label="Telefon" type="tel" autoComplete="tel" onValue={(value) => updateTextField("phone", value)} required />
              <div className="space-y-2">
                <label htmlFor="language" className="text-sm font-medium">Språk</label>
                <select
                  id="language"
                  name="language"
                  required
                  defaultValue=""
                  onChange={(event) => updateTextField("language", event.target.value)}
                  className={selectClassName}
                >
                  <option value="" disabled>Velg språk</option>
                  <option>Norsk</option>
                  <option>Engelsk</option>
                  <option>Norsk og engelsk</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader icon={Camera} title="Profil" />
            <label htmlFor="profile_image_file" className="flex cursor-pointer items-center gap-4 border-2 border-dashed border-zinc-950 bg-[#f3ead9] p-4 transition-colors hover:bg-white/60">
              <div className="flex size-12 items-center justify-center border-2 border-zinc-950 bg-white/70 text-zinc-500">
                <ImagePlus className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-500">Profilbilde</p>
                <p className="truncate text-sm font-medium text-zinc-700">{imageName ?? "PNG, JPG eller WebP"}</p>
              </div>
              <span className="border-2 border-zinc-950 bg-white px-3 py-1.5 text-sm font-bold">Velg bilde</span>
              <input
                id="profile_image_file"
                name="profile_image_file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  setImageName(file?.name ?? null)
                  setValues((prev) => ({ ...prev, profile_image_file: Boolean(file) }))
                }}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="gender" className="text-sm font-medium">Kjønn</label>
                <select
                  id="gender"
                  name="gender"
                  required
                  defaultValue=""
                  onChange={(event) => updateTextField("gender", event.target.value)}
                  className={selectClassName}
                >
                  <option value="" disabled>Velg kjønn</option>
                  <option value="male">Mann</option>
                  <option value="female">Kvinne</option>
                  <option value="other">Annet</option>
                </select>
              </div>
              <div className="space-y-2">
                <LabeledInput icon={Video} id="youtube" name="youtube" label="YouTube-video" type="url" placeholder="https://youtube.com/watch?v=..." onValue={(value) => updateTextField("youtube", value)} required />
                <Label className="text-xs text-muted-foreground">
                    Vi benytter denne videoen til å vurdere ditt sceneutrykk, og den vil ikke bli publisert utenfor vårt interne system.
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Kategori</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const checked = selectedCategories.includes(category)
                  return (
                    <label
                      key={category}
                      className={cn(
                        'cursor-pointer border-2 px-3 py-1.5 text-sm font-bold transition-colors',
                        checked ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-950 bg-white/70 text-zinc-950 hover:bg-[#f3ead9]'
                      )}
                    >
                      <input
                        type="checkbox"
                        name="category"
                        value={category}
                        checked={checked}
                        onChange={() => toggleCategory(category)}
                        className="sr-only"
                      />
                      {category}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium">Kort bio</label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                className={textareaClassName}
                placeholder="Fortell kort om sceneerfaring, stil og type show."
              />
            </div>
          </section>

          <section className="space-y-4 border-t-2 border-zinc-950 pt-6">
            <SectionHeader icon={Globe2} title="SoMe-lenker" aside="valgfritt" />
            <div className="grid gap-4 md:grid-cols-2">
              <Input id="instagram" name="instagram" type="url" placeholder="Instagram URL" className={fieldClassName} />
              <Input id="tiktok" name="tiktok" type="url" placeholder="TikTok URL" className={fieldClassName} />
              <Input id="facebook" name="facebook" type="url" placeholder="Facebook URL" className={fieldClassName} />
              <Input id="website" name="website" type="url" placeholder="Nettside URL" className={fieldClassName} />
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t-2 border-zinc-950 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-zinc-600">
              {missing.length === 0 ? "Alt klart." : `${missing.length} felt mangler før innsending.`}
            </p>
            <Button
              type="submit"
              className="h-11 rounded-none border-2 border-zinc-950 bg-[#b83224] px-5 font-bold text-white shadow-[4px_4px_0_#18181b] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#9f2d21] hover:shadow-[2px_2px_0_#18181b] disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none sm:min-w-48"
              disabled={missing.length > 0}
            >
              <BadgeCheck className="size-4" />
              Registrer artistprofil
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  aside,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  aside?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-950/15 pb-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center border border-zinc-950 bg-white/70 text-zinc-500">
          <Icon className="size-4" />
        </div>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">{title}</h2>
      </div>
      {aside && <span className="text-xs font-medium text-zinc-500">{aside}</span>}
    </div>
  )
}

function LabeledInput({
  icon: Icon,
  label,
  onValue,
  ...props
}: React.ComponentProps<typeof Input> & {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onValue: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={props.id} className="text-sm font-medium text-zinc-800">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input {...props} className={cn(fieldClassName, 'pl-9', props.className)} onChange={(event) => onValue(event.target.value)} />
      </div>
    </div>
  )
}