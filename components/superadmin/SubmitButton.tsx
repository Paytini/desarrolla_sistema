"use client"

import type { ComponentProps } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import Button from "@mui/material/Button"

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type" | "disabled">

function Inner({ children, sx, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      startIcon={
        pending
          ? <Loader2 size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
          : undefined
      }
      sx={{ gap: 0.5, ...sx }}
      {...props}
    >
      {children}
    </Button>
  )
}

export function SubmitButton(props: SubmitButtonProps) {
  return <Inner {...props} />
}
