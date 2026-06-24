"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"

interface PasswordToggleInputProps {
  name: string
  placeholder?: string
  minLength?: number
  required?: boolean
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function PasswordToggleInput({
  name,
  placeholder,
  minLength,
  required,
  value,
  onChange,
}: PasswordToggleInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      name={name}
      type={visible ? "text" : "password"}
      placeholder={placeholder}
      required={required}
      size="small"
      fullWidth
      value={value}
      onChange={onChange}
      slotProps={{
        htmlInput: { minLength },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                tabIndex={-1}
                size="small"
                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setVisible((v) => !v)}
                edge="end"
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                {visible
                  ? <EyeOff size={14} strokeWidth={2} />
                  : <Eye    size={14} strokeWidth={2} />
                }
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
