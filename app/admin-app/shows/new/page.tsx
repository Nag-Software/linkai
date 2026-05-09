import { AdminHeader } from '@/components/admin/admin-header'
import { ToastActionForm } from '@/components/toast-action-form'
import Link from 'next/link'
import { createShowAction } from '../actions'

export default function NewShowPage() {
  return (
    <div>
      <AdminHeader
        title="Opprett show"
        actions={
          <Link href="/admin-app/shows" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Tilbake
          </Link>
        }
      />
      <div className="p-6 max-w-2xl">
        <ToastActionForm action={createShowAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field name="title" label="Tittel *" required />
            <Field name="slug" label="Slug *" required placeholder="mitt-show-2026" />
          </div>
          <Textarea name="description" label="Beskrivelse" rows={3} />
          <div className="grid grid-cols-3 gap-4">
            <Field name="date" label="Dato *" type="date" required />
            <Field name="start_time" label="Start" type="time" />
            <Field name="end_time" label="Slutt" type="time" />
          </div>
          <Field name="venue_address" label="Sted / adresse" />
          <div className="grid grid-cols-3 gap-4">
            <Field name="capacity" label="Kapasitet" type="number" min={1} />
            <Field name="ticket_price" label="Billettpris (kr)" type="number" min={0} step={0.01} placeholder="199" />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Valuta</label>
              <select name="currency" defaultValue="NOK"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="NOK">NOK</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <button type="submit"
            className="px-4 py-2 mt-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Opprett show
          </button>
        </ToastActionForm>
      </div>
    </div>
  )
}

function Field({ name, label, required, type = 'text', placeholder, min, step }: {
  name: string; label: string; required?: boolean; type?: string
  placeholder?: string; min?: number; step?: number
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input name={name} type={type} required={required} placeholder={placeholder}
        min={min} step={step}
        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  )
}

function Textarea({ name, label, rows }: { name: string; label: string; rows?: number }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <textarea name={name} rows={rows ?? 3}
        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  )
}
