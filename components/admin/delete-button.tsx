'use client'

import { useRef } from 'react'
import { Trash2 } from 'lucide-react'

export function DeleteButton({
  action,
  id,
  idField,
  label = 'Slett',
  confirmMessage,
}: {
  action: (formData: FormData) => Promise<void>
  id: string
  idField: string
  label?: string
  confirmMessage: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name={idField} value={id} />
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          if (window.confirm(confirmMessage)) {
            formRef.current?.requestSubmit()
          }
        }}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
        {label}
      </button>
    </form>
  )
}
