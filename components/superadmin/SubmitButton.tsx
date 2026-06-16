"use client"

import { useState } from "react"
import type { ComponentProps } from "react"
import { Loader2 } from "lucide-react"
import Button from "@mui/material/Button"

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type" | "disabled">

export function SubmitButton({ children, onClick, sx, ...props }: SubmitButtonProps) {
  const [pending, setPending] = useState(false)

  return (
    <Button
      type="submit"
      disabled={pending}
      startIcon={
        pending
          ? <Loader2 size={13} strokeWidth={2} style={{ animation: "spin 0.8s linear infinite" }} />
          : undefined
      }
      onClick={(e) => {
        setPending(true)
        if (typeof onClick === "function") onClick(e)
      }}
      sx={{ gap: 0.5, ...sx }}
      {...props}
    >
      {children}
    </Button>
  )
}
