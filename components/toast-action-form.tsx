'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type ToastActionFormProps = Omit<React.ComponentProps<'form'>, 'action' | 'onSubmit'> & {
  action: (formData: FormData) => Promise<unknown>
  successMessage?: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return 'Noe gikk galt. Prøv igjen.'
}

function isNextControlFlowError(error: unknown) {
  const digest = typeof error === 'object' && error !== null && 'digest' in error
    ? String((error as { digest?: unknown }).digest ?? '')
    : ''

  return digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND')
}

export function ToastActionForm({ action, successMessage, children, ...props }: ToastActionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const formRef = React.useRef<HTMLFormElement>(null)

  return (
    <form
      {...props}
      ref={formRef}
      data-pending={isPending ? '' : undefined}
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const formData = new FormData(form)
        const submitter = (event.nativeEvent as SubmitEvent).submitter

        if (
          submitter instanceof HTMLButtonElement ||
          submitter instanceof HTMLInputElement
        ) {
          if (submitter.name && !submitter.disabled) {
            formData.append(submitter.name, submitter.value)
          }
        }

        startTransition(async () => {
          try {
            await action(formData)
            if (successMessage) toast.success(successMessage)
            router.refresh()
          } catch (error) {
            if (isNextControlFlowError(error)) throw error
            toast.error(getErrorMessage(error))
          }
        })
      }}
    >
      <fieldset disabled={isPending} className="contents disabled:pointer-events-none disabled:opacity-70">
        {children}
      </fieldset>
    </form>
  )
}