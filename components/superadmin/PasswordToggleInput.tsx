"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"

interface PasswordToggleInputProps {
  name: string
  placeholder?: string
  minLength?: number
  required?: boolean
}

export function PasswordToggleInput({
  name,
  placeholder,
  minLength,
  required,
}: PasswordToggleInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
        tabIndex={-1}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
      </button>
    </div>
  )
}
