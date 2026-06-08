"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type" | "disabled">

export function SubmitButton({ children, className, onClick, ...props }: SubmitButtonProps) {
  const [pending, setPending] = useState(false)

  return (
    <Button
      type="submit"
      disabled={pending}
      className={cn("gap-2", className)}
      onClick={(e) => {
        setPending(true)
        if (typeof onClick === "function") onClick(e)
      }}
      {...props}
    >
      {pending && <Loader2 size={13} strokeWidth={2} className="animate-spin" />}
      {children}
    </Button>
  )
}
