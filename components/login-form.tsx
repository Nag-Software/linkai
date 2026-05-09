"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  title = "Login to your account",
  description = "Enter your email below to login to your account",
  action = "#",
  errorMessage,
  showSignupLink = true,
  nextPath,
  ...props
}: React.ComponentProps<"div"> & {
  title?: string
  description?: string
  action?: string
  errorMessage?: string
  showSignupLink?: boolean
  nextPath?: string
}) {
  useEffect(() => {
    if (errorMessage) toast.error(errorMessage)
  }, [errorMessage])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} method="post">
            <FieldGroup>
              {nextPath && <input type="hidden" name="next" value={nextPath} />}
              {errorMessage && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="email">E-post</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Passord</FieldLabel>
                </div>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </Field>
              <Field>
                <Button type="submit">Logg inn</Button>
                {showSignupLink && (
                  <FieldDescription className="text-center">
                    Ny artist? <a href="/signup">Registrer artistprofil</a>
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
